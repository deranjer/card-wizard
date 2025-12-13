package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"

	"card_wizard/internal/cards"
	"card_wizard/internal/deck"
	"card_wizard/internal/game"
	"card_wizard/internal/pdf"
)

// ExcelSelection represents a selected Excel file and its sheets
type ExcelSelection struct {
	FilePath string   `json:"filePath"`
	Sheets   []string `json:"sheets"`
}

// App struct
type App struct {
	ctx             context.Context
	cardsSvc        *cards.Service
	currentGamePath string // Path to the currently loaded/saved game file
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		cardsSvc: cards.NewService(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// SampleDeck returns sample card data sourced from the card service.
func (a *App) SampleDeck() []cards.Card {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	return a.cardsSvc.SampleDeck(ctx)
}

// SelectExcelFile opens a file dialog and returns the path and list of sheets
func (a *App) SelectExcelFile() (*ExcelSelection, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Excel File",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files", Pattern: "*.xlsx;*.xls"},
		},
	})
	if err != nil {
		return nil, err
	}
	if selection == "" {
		return nil, nil // User cancelled
	}

	f, err := excelize.OpenFile(selection)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	return &ExcelSelection{
		FilePath: selection,
		Sheets:   f.GetSheetList(),
	}, nil
}

// GetExcelHeaders returns the headers from the first row of a specific sheet
func (a *App) GetExcelHeaders(filePath string, sheetName string) ([]string, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	if len(rows) < 1 {
		return nil, fmt.Errorf("sheet is empty")
	}

	return rows[0], nil
}

// ImportCardsWithMapping imports cards using a specific column mapping
func (a *App) ImportCardsWithMapping(filePath string, sheetName string, mapping map[string]string) ([]deck.Card, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	if len(rows) < 2 {
		return nil, fmt.Errorf("file is empty or missing header")
	}

	headers := rows[0]
	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[h] = i
	}

	var cards []deck.Card

	// Compile regex for slugification inside the function or package level
	// For simplicity, we'll do it here or use a helper if we had one.
	slugRegex := regexp.MustCompile(`[^a-z0-9]+`)

	for i, row := range rows {
		if i == 0 {
			continue
		}

		// Helper to safely get cell value
		getCell := func(colName string) string {
			if colName == "" {
				return ""
			}
			idx, ok := headerMap[colName]
			if !ok || idx >= len(row) {
				return ""
			}
			return row[idx]
		}

		var id string

		// Generate from column if specified
		if mapping["generateIdFrom"] != "" {
			raw := getCell(mapping["generateIdFrom"])
			if raw != "" {
				// Slugify: lowercase, replace non-alphanum with dash, trim dashes
				slug := strings.ToLower(raw)
				slug = slugRegex.ReplaceAllString(slug, "-")
				slug = strings.Trim(slug, "-")
				id = slug
			}
		}

		// Fallback
		if id == "" {
			id = fmt.Sprintf("card-%d", i)
		}

		countStr := getCell(mapping["count"])
		count := 1
		if countStr != "" {
			fmt.Sscanf(countStr, "%d", &count)
		}

		card := deck.Card{
			ID:           id,
			Count:        count,
			FrontStyleID: getCell(mapping["frontStyle"]),
			BackStyleID:  getCell(mapping["backStyle"]),
			Data:         make(map[string]interface{}),
		}

		// Map everything else to Data, excluding the mapped system columns
		systemCols := map[string]bool{
			mapping["count"]:      true,
			mapping["frontStyle"]: true,
			mapping["backStyle"]:  true,
		}
		// NOTE: We explicilty DO NOT add mapping["generateIdFrom"] to systemCols
		// because the user wants to preserve that column in the data.

		for j, cell := range row {
			if j < len(headers) {
				header := headers[j]
				if !systemCols[header] {
					card.Data[header] = cell
				}
			}
		}

		cards = append(cards, card)
	}

	return cards, nil
}

// ExportXLSX exports the current deck data to an Excel file
func (a *App) ExportXLSX(cards []deck.Card, fields []deck.FieldDefinition) error {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export Excel File",
		DefaultFilename: "deck_export.xlsx",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return err
	}
	if selection == "" {
		return nil // User cancelled
	}

	f := excelize.NewFile()
	sheetName := "Sheet1"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return err
	}
	f.SetActiveSheet(index)

	// Define standard columns
	stdHeaders := []string{"ID", "Count", "Front Style", "Back Style"}

	// Combine standard headers with custom fields
	var allHeaders []string
	allHeaders = append(allHeaders, stdHeaders...)
	for _, field := range fields {
		allHeaders = append(allHeaders, field.Name)
	}

	// Write headers to first row
	for i, header := range allHeaders {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Write Data
	for i, card := range cards {
		rowNum := i + 2

		// Write Standard Columns
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), card.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), card.Count)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), card.FrontStyleID) // This is ID, ideally we export Name if we had access to Deck, but ID is better for roundtrip if it's "style-1"
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", rowNum), card.BackStyleID)

		// Write Custom Fields
		for j, field := range fields {
			// Offset by len(stdHeaders)
			colNum := j + 1 + len(stdHeaders)
			cell, _ := excelize.CoordinatesToCellName(colNum, rowNum)
			val := card.Data[field.Name]
			f.SetCellValue(sheetName, cell, val)
		}
	}

	if err := f.SaveAs(selection); err != nil {
		return err
	}

	return nil
}

// ExportGameXLSX exports all decks in a game to a single XLSX file with multiple sheets
func (a *App) ExportGameXLSX(g game.Game) error {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Export Game to Excel",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files", Pattern: "*.xlsx"},
		},
		DefaultFilename: fmt.Sprintf("%s.xlsx", g.Name),
	})
	if err != nil || selection == "" {
		return err
	}

	f := excelize.NewFile()
	defer f.Close()

	// Delete the default Sheet1
	f.DeleteSheet("Sheet1")

	// Create a sheet for each deck
	for deckIdx, d := range g.Decks {
		sheetName := d.Name
		if sheetName == "" {
			sheetName = fmt.Sprintf("Deck %d", deckIdx+1)
		}

		// Ensure unique sheet name (Excel has 31 char limit and no duplicates)
		if len(sheetName) > 31 {
			sheetName = sheetName[:31]
		}

		// Create sheet
		index, err := f.NewSheet(sheetName)
		if err != nil {
			return fmt.Errorf("failed to create sheet %s: %w", sheetName, err)
		}

		// If this is the first sheet, set it as active
		if deckIdx == 0 {
			f.SetActiveSheet(index)
		}

		// Write headers
		stdHeaders := []string{"ID", "Count", "Front Style", "Back Style"}
		var allHeaders []string
		allHeaders = append(allHeaders, stdHeaders...)
		for _, field := range d.Fields {
			allHeaders = append(allHeaders, field.Name)
		}

		for i, header := range allHeaders {
			cell, _ := excelize.CoordinatesToCellName(i+1, 1)
			f.SetCellValue(sheetName, cell, header)
		}

		// Write card data
		for i, card := range d.Cards {
			rowNum := i + 2

			// Write standard columns
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), card.ID)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), card.Count)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), card.FrontStyleID)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", rowNum), card.BackStyleID)

			// Write custom fields
			for j, field := range d.Fields {
				colNum := j + 1 + len(stdHeaders)
				cell, _ := excelize.CoordinatesToCellName(colNum, rowNum)
				val := card.Data[field.Name]
				f.SetCellValue(sheetName, cell, val)
			}
		}
	}

	if err := f.SaveAs(selection); err != nil {
		return err
	}

	return nil
}

// SaveGame saves the current game to a JSON file
func (a *App) SaveGame(g game.Game) error {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save Game",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
		DefaultFilename: "game.json",
	})
	if err != nil {
		return err
	}
	if selection == "" {
		return nil // User cancelled
	}

	// Store the game path for relative path resolution
	a.currentGamePath = selection

	// Convert absolute image paths to relative paths before saving
	gameDir := filepath.Dir(selection)
	for i := range g.Decks {
		g.Decks[i] = a.convertPathsToRelative(g.Decks[i], gameDir)
	}

	data, err := json.MarshalIndent(g, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(selection, data, 0644)
}

// LoadGame loads a game from a JSON file
func (a *App) LoadGame() (*game.Game, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Load Game",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})
	if err != nil {
		return nil, err
	}
	if selection == "" {
		return nil, nil // User cancelled
	}

	// Store the game path for relative path resolution
	a.currentGamePath = selection

	data, err := os.ReadFile(selection)
	if err != nil {
		return nil, err
	}

	var g game.Game
	if err := json.Unmarshal(data, &g); err != nil {
		// Fallback: Try to load as a single Deck and wrap it in a Game
		var d deck.Deck
		if err2 := json.Unmarshal(data, &d); err2 == nil {
			// It's a deck!
			if d.ID == "" {
				d.ID = "deck-1" // Assign a default ID
			}
			g = game.Game{
				Name:  d.Name,
				Decks: []deck.Deck{d},
			}
		} else {
			return nil, err // Return original error
		}
	}

	return &g, nil
}

// NewGame resets the current game path, effectively starting a new project
func (a *App) NewGame() {
	a.currentGamePath = ""
}

// GeneratePDF generates a PDF for the deck
func (a *App) GeneratePDF(d deck.Deck) error {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save PDF",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF Files", Pattern: "*.pdf"},
		},
		DefaultFilename: "deck.pdf",
	})
	if err != nil {
		return err
	}
	if selection == "" {
		return nil // User cancelled
	}

	gen := pdf.NewGenerator()
	return gen.Generate(d, selection)
}

// SelectImageFile opens a file dialog to select an image
func (a *App) SelectImageFile() (string, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Image",
		Filters: []runtime.FileFilter{
			{DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.webp"},
		},
	})
	return selection, err
}

// AddProjectImage copies an image to the project's "images" directory
func (a *App) AddProjectImage(srcPath string) (string, error) {
	if a.currentGamePath == "" {
		return "", fmt.Errorf("no game loaded")
	}

	gameDir := filepath.Dir(a.currentGamePath)
	imagesDir := filepath.Join(gameDir, "images")

	// Create images directory if it doesn't exist
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create images directory: %w", err)
	}

	// Get filename from source path
	fileName := filepath.Base(srcPath)
	destPath := filepath.Join(imagesDir, fileName)

	// Check if file already exists
	// If it does, we generate a unique name to avoid overwriting accidentally on "Add"
	// For "Replace", we will have a specific method
	ext := filepath.Ext(fileName)
	name := strings.TrimSuffix(fileName, ext)
	counter := 1
	for {
		if _, err := os.Stat(destPath); os.IsNotExist(err) {
			break
		}
		// File exists, try next counter
		fileName = fmt.Sprintf("%s_%d%s", name, counter, ext)
		destPath = filepath.Join(imagesDir, fileName)
		counter++
	}

	input, err := os.ReadFile(srcPath)
	if err != nil {
		return "", err
	}

	if err := os.WriteFile(destPath, input, 0644); err != nil {
		return "", err
	}

	// Return relative path using forward slashes
	return filepath.ToSlash(filepath.Join("images", fileName)), nil
}

// SelectImageFiles opens a file dialog to select multiple images
func (a *App) SelectImageFiles() ([]string, error) {
	selection, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Images",
		Filters: []runtime.FileFilter{
			{DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.webp"},
		},
	})
	return selection, err
}

// AddProjectImages adds multiple images to the project
func (a *App) AddProjectImages(srcPaths []string) ([]string, error) {
	var addedPaths []string
	var errs []string

	for _, srcPath := range srcPaths {
		path, err := a.AddProjectImage(srcPath)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", filepath.Base(srcPath), err))
		} else {
			addedPaths = append(addedPaths, path)
		}
	}

	if len(errs) > 0 {
		return addedPaths, fmt.Errorf("some images failed to import: %s", strings.Join(errs, "; "))
	}

	return addedPaths, nil
}

// ListProjectImages returns a list of filenames in the project's "images" directory
func (a *App) ListProjectImages() ([]string, error) {
	if a.currentGamePath == "" {
		return nil, fmt.Errorf("no game loaded")
	}

	gameDir := filepath.Dir(a.currentGamePath)
	imagesDir := filepath.Join(gameDir, "images")

	// Create images directory if it doesn't exist (just in case)
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return nil, nil // Return empty if we can't create it, or error? Let's return empty.
	}

	files, err := os.ReadDir(imagesDir)
	if err != nil {
		return nil, err
	}

	var images []string
	for _, file := range files {
		if !file.IsDir() {
			// Filter for image extensions if needed, but for now assuming mostly images
			ext := strings.ToLower(filepath.Ext(file.Name()))
			if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".gif" || ext == ".webp" {
				images = append(images, file.Name())
			}
		}
	}

	return images, nil
}

// DeleteProjectImage deletes an image from the project's "images" directory
func (a *App) DeleteProjectImage(filename string) error {
	if a.currentGamePath == "" {
		return fmt.Errorf("no game loaded")
	}

	gameDir := filepath.Dir(a.currentGamePath)
	imagePath := filepath.Join(gameDir, "images", filename)

	return os.Remove(imagePath)
}

// ReplaceProjectImage overwrites a project image with a new file
func (a *App) ReplaceProjectImage(targetFilename string, srcPath string) error {
	if a.currentGamePath == "" {
		return fmt.Errorf("no game loaded")
	}

	gameDir := filepath.Dir(a.currentGamePath)
	destPath := filepath.Join(gameDir, "images", targetFilename)

	input, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}

	return os.WriteFile(destPath, input, 0644)
}

// SelectFontFile opens a file dialog to select a font
func (a *App) SelectFontFile() (string, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Font",
		Filters: []runtime.FileFilter{
			{DisplayName: "Fonts", Pattern: "*.ttf;*.otf;*.woff;*.woff2"},
		},
	})
	return selection, err
}

// LoadImageAsDataURL reads a local image file and returns base64 content
func (a *App) LoadImageAsDataURL(path string) (string, error) {
	// Resolve relative paths against the deck directory
	resolvedPath := a.ResolveImagePath(path)

	data, err := os.ReadFile(resolvedPath)
	if err != nil {
		return "", err
	}

	mimeType := "image/png" // default
	return fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(data)), nil
}

// GetPDFLayout returns the layout configuration for the PDF
func (a *App) GetPDFLayout(d deck.Deck) (deck.PDFLayout, error) {
	return pdf.CalculateLayout(d), nil
}

// SaveImages saves a map of filename:base64content to the user's computer
func (a *App) SaveImages(images map[string]string) error {
	selection, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Folder to Save Images",
	})
	if err != nil {
		return err
	}
	if selection == "" {
		return nil // User cancelled
	}

	for filename, b64Data := range images {
		// Data URI: "data:image/png;base64,..."
		parts := strings.Split(b64Data, ",")
		if len(parts) != 2 {
			continue // Skip invalid data
		}

		dec, err := base64.StdEncoding.DecodeString(parts[1])
		if err != nil {
			return fmt.Errorf("failed to decode image %s: %w", filename, err)
		}

		path := filepath.Join(selection, filename)
		if err := os.WriteFile(path, dec, 0644); err != nil {
			return fmt.Errorf("failed to save image %s: %w", filename, err)
		}
	}

	return nil
}

// ResolveImagePath resolves a potentially relative image path to an absolute path
func (a *App) ResolveImagePath(path string) string {
	// If already absolute, return as-is
	if filepath.IsAbs(path) {
		return path
	}

	// If no game is loaded, return path as-is (will likely fail, but that's expected)
	if a.currentGamePath == "" {
		return path
	}

	// Resolve relative to game directory
	gameDir := filepath.Dir(a.currentGamePath)
	return filepath.Join(gameDir, path)
}

// convertPathsToRelative converts all absolute image paths in a deck to relative paths
func (a *App) convertPathsToRelative(d deck.Deck, deckDir string) deck.Deck {
	// Convert paths in card data
	for i := range d.Cards {
		d.Cards[i].Data = a.convertMapPathsToRelative(d.Cards[i].Data, deckDir)
	}

	return d
}

// convertMapPathsToRelative converts absolute paths in a map to relative paths
func (a *App) convertMapPathsToRelative(data map[string]interface{}, deckDir string) map[string]interface{} {
	result := make(map[string]interface{})

	for key, value := range data {
		if strValue, ok := value.(string); ok {
			// Check if this looks like a file path (contains path separators or drive letters)
			if strings.Contains(strValue, string(filepath.Separator)) || strings.Contains(strValue, "/") || strings.Contains(strValue, ":\\") {
				// Try to make it relative
				if filepath.IsAbs(strValue) {
					relPath, err := filepath.Rel(deckDir, strValue)
					if err == nil {
						// Successfully made relative - use forward slashes for cross-platform compatibility
						relPath = filepath.ToSlash(relPath)
						result[key] = relPath
						continue
					}
				}
			}
		}
		// Keep value as-is if not a convertible path
		result[key] = value
	}

	return result
}

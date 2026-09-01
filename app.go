package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"

	"card_wizard/internal/archive"
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
	ctx        context.Context
	workingDir string // Path to the temporary working directory where the game is being edited
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.NewGame() // Initialize a working directory on startup
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
		// NOTE: We explicitly DO NOT add mapping["generateIdFrom"] to systemCols
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

func (a *App) SaveGame(g game.Game) error {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save Game",
		Filters: []runtime.FileFilter{
			{DisplayName: "Card Wizard Game", Pattern: "*.cwiz"},
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
		DefaultFilename: g.Name,
	})
	if err != nil {
		return err
	}
	if selection == "" {
		return nil // User cancelled
	}

	// Ensure extension
	ext := strings.ToLower(filepath.Ext(selection))
	if ext == "" {
		selection += ".cwiz"
		ext = ".cwiz"
	}

	// Convert paths to relative based on working dir
	for i := range g.Decks {
		g.Decks[i] = a.convertPathsToRelative(g.Decks[i], a.workingDir)
	}

	g.Stamp() // record the schema version we're writing

	// Always save game.json to working directory first
	data, err := json.MarshalIndent(g, "", "  ")
	if err != nil {
		return err
	}
	gameJsonPath := filepath.Join(a.workingDir, "game.json")
	if err := os.WriteFile(gameJsonPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write game.json to working dir: %w", err)
	}

	// If saving as cwiz, zip the working directory
	if ext == ".cwiz" {
		return archive.ZipDir(a.workingDir, selection)
	}

	// Legacy JSON saving logic
	return os.WriteFile(selection, data, 0644)
}

// LoadGame loads a game from a file
func (a *App) LoadGame() (*game.Game, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Load Game",
		Filters: []runtime.FileFilter{
			{DisplayName: "Supported Files", Pattern: "*.cwiz;*.json"},
		},
	})
	if err != nil {
		return nil, err
	}
	if selection == "" {
		return nil, nil // User cancelled
	}

	ext := strings.ToLower(filepath.Ext(selection))
	if ext == ".cwiz" {
		// Create a new fresh working directory
		a.NewGame() // Sets up a new a.workingDir

		// Unzip the file
		if err := archive.Unzip(selection, a.workingDir); err != nil {
			return nil, fmt.Errorf("failed to extract .cwiz file: %w", err)
		}

		// Read the extracted game.json
		data, err := os.ReadFile(filepath.Join(a.workingDir, "game.json"))
		if err != nil {
			return nil, fmt.Errorf("failed to read game.json from archive: %w", err)
		}

		g, err := game.Load(data)
		if err != nil {
			return nil, fmt.Errorf("failed to parse game.json: %w", err)
		}
		return &g, nil
	}

	// Legacy JSON loading: just read it, and set working directory to its folder
	a.workingDir = filepath.Dir(selection)
	data, err := os.ReadFile(selection)
	if err != nil {
		return nil, err
	}

	g, err := game.Load(data)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

// NewGame resets the current game path and creates a new temporary working directory
func (a *App) NewGame() {
	// Create a new temp directory
	tempDir, err := os.MkdirTemp("", "cardwizard_*")
	if err != nil {
		fmt.Printf("Failed to create temp directory: %v\n", err)
		return
	}

	a.workingDir = tempDir

	// Pre-create images directory
	if err := os.MkdirAll(filepath.Join(a.workingDir, "images"), 0755); err != nil {
		fmt.Printf("Failed to create images directory: %v\n", err)
	}
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

// AddProjectImage copies an image to the project's "images" working directory
func (a *App) AddProjectImage(srcPath string) (string, error) {
	if a.workingDir == "" {
		// Fallback if not initialized
		a.NewGame()
	}

	imagesDir := filepath.Join(a.workingDir, "images")

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
	if a.workingDir == "" {
		return nil, nil
	}

	imagesDir := filepath.Join(a.workingDir, "images")

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
	if a.workingDir == "" {
		return fmt.Errorf("no working directory")
	}

	imagePath := filepath.Join(a.workingDir, "images", filename)

	return os.Remove(imagePath)
}

// ReplaceProjectImage overwrites a project image with a new file
func (a *App) ReplaceProjectImage(targetFilename string, srcPath string) error {
	if a.workingDir == "" {
		return fmt.Errorf("no working directory")
	}

	destPath := filepath.Join(a.workingDir, "images", targetFilename)

	input, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}

	return os.WriteFile(destPath, input, 0644)
}

// OpenAssetFolder opens the temporary working directory's "images" folder in the OS file explorer
func (a *App) OpenAssetFolder() error {
	if a.workingDir == "" {
		a.NewGame() // fallback
	}

	imagesDir := filepath.Join(a.workingDir, "images")

	// Create it if it doesn't exist
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return fmt.Errorf("failed to create images directory: %w", err)
	}

	// Open the folder
	// We use standard runtime environment to open folder natively
	// (Wails has runtime.Environment() but it's easier to just use exec for OS specific)
	// For windows: `explorer`
	// For macOS: `open`
	// For linux: `xdg-open`

	// We can cheat by using wails BrowserOpenURL but on a file:// scheme,
	// or standard library exec. We'll use exec to be safe since it's desktop.

	var cmd string
	var args []string

	switch runtime.Environment(a.ctx).Platform {
	case "windows":
		cmd = "explorer"
		args = []string{imagesDir}
	case "darwin":
		cmd = "open"
		args = []string{imagesDir}
	case "linux":
		cmd = "xdg-open"
		args = []string{imagesDir}
	default:
		return fmt.Errorf("unsupported platform")
	}

	c := exec.Command(cmd, args...)
	return c.Start()
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

// LoadImageAsDataURL reads a local image file and returns it as a base64 data
// URL with a MIME type derived from the extension (falling back to content
// sniffing), rather than always claiming image/png.
func (a *App) LoadImageAsDataURL(path string) (string, error) {
	resolvedPath := a.ResolveImagePath(path)

	data, err := os.ReadFile(resolvedPath)
	if err != nil {
		return "", err
	}

	mimeType := imageMIME(resolvedPath, data)
	return fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(data)), nil
}

// imageMIME picks a MIME type for an image, preferring the file extension and
// falling back to sniffing the first bytes.
func imageMIME(path string, data []byte) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".svg":
		return "image/svg+xml"
	}
	if ct := http.DetectContentType(data); strings.HasPrefix(ct, "image/") {
		return ct
	}
	return "application/octet-stream"
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

	// If no working dir, return path as-is
	if a.workingDir == "" {
		return path
	}

	// Resolve relative to working directory
	return filepath.Join(a.workingDir, path)
}

// convertPathsToRelative rewrites absolute paths stored in a deck's image
// fields to be relative to deckDir.
func (a *App) convertPathsToRelative(d deck.Deck, deckDir string) deck.Deck {
	imageFields := make(map[string]bool)
	for _, f := range d.Fields {
		if f.Type == "image" {
			imageFields[f.Name] = true
		}
	}
	for i := range d.Cards {
		d.Cards[i].Data = relativizeImagePaths(d.Cards[i].Data, imageFields, deckDir)
	}
	return d
}

// relativizeImagePaths converts absolute paths held in image-typed fields to
// forward-slashed paths relative to deckDir. Non-image fields are left as-is so
// ordinary text that happens to contain a slash is never mangled (the old
// "contains a separator" heuristic rewrote those too).
func relativizeImagePaths(data map[string]any, imageFields map[string]bool, deckDir string) map[string]any {
	if len(data) == 0 {
		return data
	}
	out := make(map[string]any, len(data))
	for key, value := range data {
		out[key] = value
		if !imageFields[key] {
			continue
		}
		s, ok := value.(string)
		if !ok || !filepath.IsAbs(s) {
			continue
		}
		if rel, err := filepath.Rel(deckDir, s); err == nil {
			out[key] = filepath.ToSlash(rel)
		}
	}
	return out
}

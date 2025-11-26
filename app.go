package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"

	"card_wizard/internal/cards"
	"card_wizard/internal/deck"
	"card_wizard/internal/pdf"
)

// App struct
type App struct {
	ctx             context.Context
	cardsSvc        *cards.Service
	currentDeckPath string // Path to the currently loaded/saved deck file
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

// ImportXLSX opens a file dialog and imports card data from an Excel file
func (a *App) ImportXLSX() ([]deck.Card, error) {
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

	// Get all rows in the first sheet.
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	if len(rows) < 2 {
		return nil, fmt.Errorf("file is empty or missing header")
	}

	headers := rows[0]
	var cards []deck.Card

	for i, row := range rows {
		if i == 0 {
			continue
		}
		data := make(map[string]interface{})
		for j, cell := range row {
			if j < len(headers) {
				data[headers[j]] = cell
			}
		}
		cards = append(cards, deck.Card{
			ID:   fmt.Sprintf("card-%d", i),
			Data: data,
		})
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

	// Write Headers (custom fields only)
	headers := make([]string, len(fields))
	for i, field := range fields {
		headers[i] = field.Name
	}

	// Write headers to first row
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Write Data
	for i, card := range cards {
		rowNum := i + 2
		for j, field := range fields {
			cell, _ := excelize.CoordinatesToCellName(j+1, rowNum)
			val := card.Data[field.Name]
			f.SetCellValue(sheetName, cell, val)
		}
	}

	if err := f.SaveAs(selection); err != nil {
		return err
	}

	return nil
}

// SaveDeck saves the current deck to a JSON file
func (a *App) SaveDeck(d deck.Deck) error {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save Deck",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
		DefaultFilename: "deck.json",
	})
	if err != nil {
		return err
	}
	if selection == "" {
		return nil // User cancelled
	}

	// Store the deck path for relative path resolution
	a.currentDeckPath = selection

	// Convert absolute image paths to relative paths before saving
	deckDir := filepath.Dir(selection)
	d = a.convertPathsToRelative(d, deckDir)

	data, err := json.MarshalIndent(d, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(selection, data, 0644)
}

// LoadDeck loads a deck from a JSON file
func (a *App) LoadDeck() (*deck.Deck, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Load Deck",
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

	// Store the deck path for relative path resolution
	a.currentDeckPath = selection

	data, err := os.ReadFile(selection)
	if err != nil {
		return nil, err
	}

	var d deck.Deck
	if err := json.Unmarshal(data, &d); err != nil {
		return nil, err
	}

	return &d, nil
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
	resolvedPath := a.resolveImagePath(path)

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

// resolveImagePath resolves a potentially relative image path to an absolute path
func (a *App) resolveImagePath(path string) string {
	// If already absolute, return as-is
	if filepath.IsAbs(path) {
		return path
	}

	// If no deck is loaded, return path as-is (will likely fail, but that's expected)
	if a.currentDeckPath == "" {
		return path
	}

	// Resolve relative to deck directory
	deckDir := filepath.Dir(a.currentDeckPath)
	return filepath.Join(deckDir, path)
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

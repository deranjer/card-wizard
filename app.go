package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"

	"card_wizard/internal/archive"
	"card_wizard/internal/assets"
	"card_wizard/internal/deck"
	"card_wizard/internal/game"
	"card_wizard/internal/pdf"
	"card_wizard/internal/project"
	"card_wizard/internal/xlsx"
)

// ExcelSelection represents a selected Excel file and its sheets
type ExcelSelection struct {
	FilePath string   `json:"filePath"`
	Sheets   []string `json:"sheets"`
}

// App struct
type App struct {
	ctx context.Context
	ws  *project.Workspace
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{ws: &project.Workspace{}}
}

// currentWorkingDir returns the working dir, or "" if none has been created.
func (a *App) currentWorkingDir() string { return a.ws.Dir() }

// resetWorkingDir discards the current temp dir and creates a fresh one.
func (a *App) resetWorkingDir() error { return a.ws.Reset() }

// images returns a manager confined to the working dir's images/ folder.
func (a *App) images() (*assets.Manager, error) { return a.ws.Images() }

// projectImagePath resolves a frontend-supplied asset name to an absolute path
// inside the working dir's images/ folder.
func (a *App) projectImagePath(name string) (string, error) {
	m, err := a.images()
	if err != nil {
		return "", err
	}
	return m.Path(name)
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := a.ws.Reset(); err != nil {
		slog.Error("startup: could not create working dir", "err", err)
	}
	go project.SweepStale(a.currentWorkingDir())
}

// shutdown is wired to Wails' OnShutdown; it removes the working directory so
// temp dirs don't accumulate between runs.
func (a *App) shutdown(context.Context) {
	if err := a.ws.Cleanup(); err != nil {
		slog.Warn("shutdown: could not remove working dir", "err", err)
	}
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
			if n, err := strconv.Atoi(strings.TrimSpace(countStr)); err == nil {
				count = n
			}
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

	f, err := xlsx.BuildWorkbook([]xlsx.Sheet{{Name: "Sheet1", Fields: fields, Cards: cards}})
	if err != nil {
		return err
	}
	defer f.Close()

	return f.SaveAs(selection)
}

// ExportGameXLSX exports all decks in a game to a single XLSX file with one
// sheet per deck.
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

	sheets := make([]xlsx.Sheet, len(g.Decks))
	for i, d := range g.Decks {
		sheets[i] = xlsx.Sheet{Name: d.Name, Fields: d.Fields, Cards: d.Cards}
	}

	f, err := xlsx.BuildWorkbook(sheets)
	if err != nil {
		return err
	}
	defer f.Close()

	return f.SaveAs(selection)
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

	workingDir, err := a.ws.Ensure()
	if err != nil {
		return err
	}

	// Convert paths to relative based on working dir
	for i := range g.Decks {
		g.Decks[i] = a.convertPathsToRelative(g.Decks[i], workingDir)
	}

	g.Stamp() // record the schema version we're writing
	if err := game.Validate(g); err != nil {
		return fmt.Errorf("invalid game: %w", err)
	}

	// Always save game.json to working directory first
	data, err := json.MarshalIndent(g, "", "  ")
	if err != nil {
		return err
	}
	gameJsonPath := filepath.Join(workingDir, "game.json")
	if err := os.WriteFile(gameJsonPath, data, 0o644); err != nil {
		return fmt.Errorf("failed to write game.json to working dir: %w", err)
	}

	// If saving as cwiz, zip the working directory
	if ext == ".cwiz" {
		return archive.ZipDir(workingDir, selection)
	}

	// Legacy JSON saving logic
	return os.WriteFile(selection, data, 0o644)
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
		if err := a.ws.Reset(); err != nil {
			return nil, err
		}
		workingDir := a.currentWorkingDir()

		if err := archive.Unzip(selection, workingDir); err != nil {
			return nil, fmt.Errorf("failed to extract .cwiz file: %w", err)
		}

		data, err := os.ReadFile(filepath.Join(workingDir, "game.json"))
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
	if err := a.ws.Adopt(filepath.Dir(selection)); err != nil {
		return nil, err
	}
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

// NewGame starts a fresh project in a new working directory, discarding the
// previous one.
func (a *App) NewGame() error {
	return a.ws.Reset()
}

// GeneratePDF generates a PDF for the deck. The rasterised card faces are
// passed alongside the deck rather than embedded in it, so they never end up
// persisted in game.json.
func (a *App) GeneratePDF(d deck.Deck, rendered []deck.RenderedCard) error {
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
	return gen.Generate(d, rendered, selection)
}

// SelectImageFile opens a file dialog to select an image
func (a *App) SelectImageFile() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Image",
		Filters: []runtime.FileFilter{
			{DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.webp"},
		},
	})
}

// SelectImageFiles opens a file dialog to select multiple images
func (a *App) SelectImageFiles() ([]string, error) {
	return runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Images",
		Filters: []runtime.FileFilter{
			{DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.webp"},
		},
	})
}

// AddProjectImage copies an image into the project's images/ working directory
// and returns its project-relative reference.
func (a *App) AddProjectImage(srcPath string) (string, error) {
	m, err := a.images()
	if err != nil {
		return "", err
	}
	return m.Add(srcPath)
}

// AddProjectImages adds multiple images to the project.
func (a *App) AddProjectImages(srcPaths []string) ([]string, error) {
	m, err := a.images()
	if err != nil {
		return nil, err
	}
	return m.AddMany(srcPaths)
}

// ListProjectImages returns the filenames in the project's images/ directory.
func (a *App) ListProjectImages() ([]string, error) {
	if a.currentWorkingDir() == "" {
		return nil, nil
	}
	m, err := a.images()
	if err != nil {
		return nil, err
	}
	return m.List()
}

// DeleteProjectImage deletes an image from the project's images/ directory.
func (a *App) DeleteProjectImage(filename string) error {
	if a.currentWorkingDir() == "" {
		return nil
	}
	m, err := a.images()
	if err != nil {
		return err
	}
	return m.Delete(filename)
}

// ReplaceProjectImage overwrites a project image with a new file.
func (a *App) ReplaceProjectImage(targetFilename string, srcPath string) error {
	m, err := a.images()
	if err != nil {
		return err
	}
	return m.Replace(targetFilename, srcPath)
}

// OpenAssetFolder opens the working directory's images/ folder in the OS file
// explorer.
func (a *App) OpenAssetFolder() error {
	m, err := a.images()
	if err != nil {
		return err
	}
	imagesDir := m.Dir()
	if err := os.MkdirAll(imagesDir, 0o755); err != nil {
		return fmt.Errorf("failed to create images directory: %w", err)
	}

	var cmd string
	var args []string
	switch runtime.Environment(a.ctx).Platform {
	case "windows":
		cmd, args = "explorer", []string{imagesDir}
	case "darwin":
		cmd, args = "open", []string{imagesDir}
	case "linux":
		cmd, args = "xdg-open", []string{imagesDir}
	default:
		return fmt.Errorf("unsupported platform")
	}

	return exec.Command(cmd, args...).Start()
}

// SelectFontFile opens a file dialog to select a font, copies it into the
// working dir's fonts/ folder, and returns its project-relative reference so
// the /local-font endpoint can stay confined to the working directory.
func (a *App) SelectFontFile() (string, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Font",
		Filters: []runtime.FileFilter{
			{DisplayName: "Fonts", Pattern: "*.ttf;*.otf;*.woff;*.woff2"},
		},
	})
	if err != nil {
		return "", err
	}
	if selection == "" {
		return "", nil // User cancelled
	}

	m, err := a.ws.Fonts()
	if err != nil {
		return "", err
	}
	return m.Add(selection)
}

// LoadImageAsDataURL reads a local image file and returns it as a base64 data
// URL with a MIME type derived from the extension (falling back to content
// sniffing), rather than always claiming image/png.
func (a *App) LoadImageAsDataURL(path string) (string, error) {
	resolvedPath := a.ResolveImagePath(path)
	if resolvedPath == "" {
		return "", fmt.Errorf("image not found")
	}

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

		// filename comes from card ids, which the user can edit — keep only the
		// base name so it cannot write outside the chosen folder. Normalise
		// backslashes too so the guard holds on Linux, where "\" is an ordinary
		// filename character that filepath.Base would not strip.
		base := path.Base(strings.ReplaceAll(filepath.ToSlash(filename), `\`, "/"))
		if base == "." || base == ".." || base == "/" || base == "" {
			return fmt.Errorf("invalid image name %q", filename)
		}
		if err := os.WriteFile(filepath.Join(selection, base), dec, 0o644); err != nil {
			return fmt.Errorf("failed to save image %s: %w", base, err)
		}
	}

	return nil
}

// ResolveImagePath turns a stored image reference into an absolute path,
// constrained to the working directory. It returns "" if the path is missing,
// there is no working dir, or the path would escape it — callers must treat ""
// as "not found" rather than serving an arbitrary file.
func (a *App) ResolveImagePath(path string) string {
	return a.ws.Resolve(path)
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

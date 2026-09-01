package main

import (
	"embed"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var embeddedAssets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "card_wizard",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: embeddedAssets,
			Middleware: func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if strings.HasPrefix(r.URL.Path, "/local-image") {
						serveLocalImage(w, r, app)
						return
					}
					if strings.HasPrefix(r.URL.Path, "/local-font") {
						serveLocalFont(w, r, app)
						return
					}
					next.ServeHTTP(w, r)
				})
			},
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		WindowStartState: options.Maximised,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		panic(err)
	}
}

// serveLocalImage streams a project image. The path is resolved through the app,
// which constrains it to the working directory; anything else is a 404.
func serveLocalImage(w http.ResponseWriter, r *http.Request, app *App) {
	q := r.URL.Query().Get("path")
	if q == "" {
		http.Error(w, "no path", http.StatusBadRequest)
		return
	}
	resolved := app.ResolveImagePath(q)
	if resolved == "" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, resolved)
}

var fontContentType = map[string]string{
	".ttf":   "font/ttf",
	".otf":   "font/otf",
	".woff":  "font/woff",
	".woff2": "font/woff2",
}

// serveLocalFont streams a custom font from the project's fonts/ folder.
// SelectFontFile copies the chosen file into the working directory, so this
// endpoint resolves paths through the app (confining them to the working dir)
// exactly like /local-image, and additionally requires a real font extension.
func serveLocalFont(w http.ResponseWriter, r *http.Request, app *App) {
	q := r.URL.Query().Get("path")
	if q == "" {
		http.Error(w, "no path", http.StatusBadRequest)
		return
	}
	ct, ok := fontContentType[strings.ToLower(filepath.Ext(q))]
	if !ok {
		http.Error(w, "not a font", http.StatusBadRequest)
		return
	}
	resolved := app.ResolveImagePath(q)
	if resolved == "" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", ct)
	http.ServeFile(w, r, resolved)
}

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
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "card_wizard",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
			Middleware: func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if strings.HasPrefix(r.URL.Path, "/local-image") {
						serveLocalImage(w, r, app)
						return
					}
					if strings.HasPrefix(r.URL.Path, "/local-font") {
						serveLocalFont(w, r)
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

// serveLocalFont streams a user-selected font file. Fonts are picked via a
// native dialog and may legitimately live anywhere on disk, so this is not
// confined to the working dir; it is limited to real font extensions.
// TODO(hardening): copy chosen fonts into the working dir on selection so this
// endpoint can be confined like /local-image.
func serveLocalFont(w http.ResponseWriter, r *http.Request) {
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
	w.Header().Set("Content-Type", ct)
	http.ServeFile(w, r, filepath.Clean(q))
}

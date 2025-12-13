package main

import (
	"embed"

	"net/http"
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
						path := r.URL.Query().Get("path")
						if path != "" {
							// Resolve path relative to game if needed
							resolvedPath := app.ResolveImagePath(path)
							http.ServeFile(w, r, resolvedPath)
							return
						}
						http.Error(w, "No path specified", http.StatusBadRequest)
						return
					}
					if strings.HasPrefix(r.URL.Path, "/local-font") {
						path := r.URL.Query().Get("path")
						if path != "" {
							// Set appropriate content type for fonts
							if strings.HasSuffix(strings.ToLower(path), ".ttf") {
								w.Header().Set("Content-Type", "font/ttf")
							} else if strings.HasSuffix(strings.ToLower(path), ".otf") {
								w.Header().Set("Content-Type", "font/otf")
							}
							http.ServeFile(w, r, path)
							return
						}
						http.Error(w, "No path specified", http.StatusBadRequest)
						return
					}
					next.ServeHTTP(w, r)
				})
			},
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		WindowStartState: options.Maximised,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		panic(err)
	}
}

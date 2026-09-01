// Package project owns the temporary working directory a game is edited in.
// Wails dispatches every bound call on its own goroutine, so all state is
// guarded by a mutex. The working directory holds game.json plus images/ and
// fonts/ subdirectories; saving a .cwiz simply zips it.
package project

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"card_wizard/internal/assets"
)

const (
	tempPrefix = "cardwizard_"
	imagesDir  = "images"
	fontsDir   = "fonts"
)

// staleAfter is how old a leftover temp dir must be before SweepStale removes
// it, so a second running instance is left alone.
const staleAfter = 24 * time.Hour

// Workspace is the working directory for the current game. The zero value is
// usable and starts with no directory.
type Workspace struct {
	mu  sync.RWMutex
	dir string
}

// Dir returns the current working directory, or "" if none has been created.
func (w *Workspace) Dir() string {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.dir
}

// Ensure returns the working directory, creating a fresh temp one on first use.
func (w *Workspace) Ensure() (string, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.dir == "" {
		if err := w.createLocked(); err != nil {
			return "", err
		}
	}
	return w.dir, nil
}

// Reset discards the current directory (if we own it) and creates a fresh temp
// one.
func (w *Workspace) Reset() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	old := w.dir
	if err := w.createLocked(); err != nil {
		return err
	}
	if old != "" && old != w.dir && IsTemp(old) {
		if err := os.RemoveAll(old); err != nil {
			return fmt.Errorf("remove previous working dir %s: %w", old, err)
		}
	}
	return nil
}

// Adopt points the workspace at an existing directory (the legacy .json load,
// whose images live next to the file). A temp directory it replaces is removed;
// a non-temp one is left untouched.
func (w *Workspace) Adopt(dir string) error {
	w.mu.Lock()
	old := w.dir
	w.dir = dir
	w.mu.Unlock()
	if old != "" && old != dir && IsTemp(old) {
		if err := os.RemoveAll(old); err != nil {
			return fmt.Errorf("remove previous working dir %s: %w", old, err)
		}
	}
	return nil
}

// Cleanup removes the working directory if we own it (a temp dir). Adopted
// non-temp directories are left in place.
func (w *Workspace) Cleanup() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.dir == "" || !IsTemp(w.dir) {
		return nil
	}
	err := os.RemoveAll(w.dir)
	w.dir = ""
	return err
}

// createLocked makes a fresh temp directory with an images/ subdir and points
// the workspace at it. Callers must hold w.mu.
func (w *Workspace) createLocked() error {
	dir, err := os.MkdirTemp("", tempPrefix+"*")
	if err != nil {
		return fmt.Errorf("create working dir: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(dir, imagesDir), 0o755); err != nil {
		return fmt.Errorf("create images dir: %w", err)
	}
	w.dir = dir
	return nil
}

// Images returns a manager confined to the working dir's images/ folder,
// creating the working dir on first use.
func (w *Workspace) Images() (*assets.Manager, error) {
	dir, err := w.Ensure()
	if err != nil {
		return nil, err
	}
	return assets.NewManager(filepath.Join(dir, imagesDir), imagesDir,
		".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"), nil
}

// Fonts returns a manager confined to the working dir's fonts/ folder,
// creating the working dir on first use.
func (w *Workspace) Fonts() (*assets.Manager, error) {
	dir, err := w.Ensure()
	if err != nil {
		return nil, err
	}
	return assets.NewManager(filepath.Join(dir, fontsDir), fontsDir,
		".ttf", ".otf", ".woff", ".woff2"), nil
}

// Resolve turns a stored reference into an absolute path constrained to the
// working directory. It returns "" when path is empty, there is no working
// dir, or the result would escape it — callers must treat "" as "not found".
func (w *Workspace) Resolve(path string) string {
	root := w.Dir()
	if path == "" || root == "" {
		return ""
	}
	root = filepath.Clean(root)

	var abs string
	if filepath.IsAbs(path) {
		abs = filepath.Clean(path)
	} else {
		abs = filepath.Clean(filepath.Join(root, filepath.FromSlash(path)))
	}
	if abs != root && !strings.HasPrefix(abs, root+string(filepath.Separator)) {
		return ""
	}
	return abs
}

// IsTemp reports whether dir is one of our temp working directories, i.e. a
// direct child of the OS temp dir named cardwizard_*.
func IsTemp(dir string) bool {
	return filepath.Dir(dir) == filepath.Clean(os.TempDir()) &&
		strings.HasPrefix(filepath.Base(dir), tempPrefix)
}

// SweepStale removes leftover cardwizard_* temp dirs from previous runs, other
// than keep, that are older than staleAfter. Best effort.
func SweepStale(keep string) {
	entries, err := os.ReadDir(os.TempDir())
	if err != nil {
		return
	}
	cutoff := time.Now().Add(-staleAfter)
	for _, e := range entries {
		if !e.IsDir() || !strings.HasPrefix(e.Name(), tempPrefix) {
			continue
		}
		full := filepath.Join(os.TempDir(), e.Name())
		if full == keep {
			continue
		}
		if info, err := e.Info(); err == nil && info.ModTime().Before(cutoff) {
			_ = os.RemoveAll(full)
		}
	}
}

package project

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureCreatesTempWithImagesDir(t *testing.T) {
	var w Workspace
	dir, err := w.Ensure()
	if err != nil {
		t.Fatalf("Ensure: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	if !strings.HasPrefix(filepath.Base(dir), tempPrefix) {
		t.Errorf("dir %q lacks %q prefix", dir, tempPrefix)
	}
	if fi, err := os.Stat(filepath.Join(dir, imagesDir)); err != nil || !fi.IsDir() {
		t.Errorf("images/ subdir missing: %v", err)
	}
	if again, _ := w.Ensure(); again != dir {
		t.Errorf("Ensure not idempotent: %q then %q", dir, again)
	}
}

func TestResetReplacesAndRemovesTemp(t *testing.T) {
	var w Workspace
	first, _ := w.Ensure()
	if err := w.Reset(); err != nil {
		t.Fatalf("Reset: %v", err)
	}
	second := w.Dir()
	t.Cleanup(func() { _ = os.RemoveAll(second) })

	if first == second {
		t.Fatal("Reset did not replace the directory")
	}
	if _, err := os.Stat(first); !os.IsNotExist(err) {
		t.Errorf("previous temp dir not removed: %v", err)
	}
}

func TestAdoptDoesNotDeleteNonTempDir(t *testing.T) {
	var w Workspace
	temp, _ := w.Ensure()

	userDir := t.TempDir() // not a cardwizard_* temp dir
	if err := w.Adopt(userDir); err != nil {
		t.Fatalf("Adopt: %v", err)
	}
	if _, err := os.Stat(temp); !os.IsNotExist(err) {
		t.Errorf("old temp dir should have been removed on Adopt: %v", err)
	}

	// Resetting away from an adopted user dir must not delete it.
	if err := w.Reset(); err != nil {
		t.Fatalf("Reset after Adopt: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(w.Dir()) })
	if _, err := os.Stat(userDir); err != nil {
		t.Errorf("adopted user dir was deleted by Reset: %v", err)
	}
}

func TestCleanupOnlyRemovesTemp(t *testing.T) {
	var w Workspace
	temp, _ := w.Ensure()
	if err := w.Cleanup(); err != nil {
		t.Fatalf("Cleanup: %v", err)
	}
	if _, err := os.Stat(temp); !os.IsNotExist(err) {
		t.Errorf("Cleanup left temp dir: %v", err)
	}

	userDir := t.TempDir()
	_ = w.Adopt(userDir)
	if err := w.Cleanup(); err != nil {
		t.Fatalf("Cleanup (adopted): %v", err)
	}
	if _, err := os.Stat(userDir); err != nil {
		t.Errorf("Cleanup removed adopted user dir: %v", err)
	}
}

func TestResolveConfinedToWorkingDir(t *testing.T) {
	var w Workspace
	dir, _ := w.Ensure()
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	if got := w.Resolve("images/a.png"); got != filepath.Join(dir, "images", "a.png") {
		t.Errorf("relative resolve = %q", got)
	}
	if got := w.Resolve("../../../etc/passwd"); got != "" {
		t.Errorf("traversal not rejected: %q", got)
	}
	outside := filepath.Join(os.TempDir(), "somewhere-else.png")
	if got := w.Resolve(outside); got != "" {
		t.Errorf("absolute path outside working dir not rejected: %q", got)
	}
	inside := filepath.Join(dir, "fonts", "f.ttf")
	if got := w.Resolve(inside); got != inside {
		t.Errorf("absolute path inside working dir rejected: %q", got)
	}
}

func TestResolveNoWorkingDir(t *testing.T) {
	var w Workspace
	if got := w.Resolve("images/a.png"); got != "" {
		t.Errorf("Resolve with no working dir = %q, want \"\"", got)
	}
}

func TestIsTemp(t *testing.T) {
	if !IsTemp(filepath.Join(os.TempDir(), tempPrefix+"abc")) {
		t.Error("expected cardwizard_ temp dir to be recognised")
	}
	if IsTemp(filepath.Join(os.TempDir(), "something-else")) {
		t.Error("unrelated temp dir misidentified as ours")
	}
	if IsTemp("/home/user/projects/cards") {
		t.Error("arbitrary path misidentified as ours")
	}
}

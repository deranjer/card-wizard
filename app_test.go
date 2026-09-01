package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newTestApp(t *testing.T) *App {
	t.Helper()
	a := NewApp()
	if err := a.resetWorkingDir(); err != nil {
		t.Fatalf("resetWorkingDir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(a.currentWorkingDir()) })
	return a
}

func TestProjectImagePathRejectsTraversal(t *testing.T) {
	a := newTestApp(t)
	imagesDir := filepath.Join(a.currentWorkingDir(), "images")

	for _, name := range []string{"card.png", "images/card.png", "../../card.png", "..\\..\\x"} {
		got, err := a.projectImagePath(name)
		if err != nil {
			t.Fatalf("projectImagePath(%q): %v", name, err)
		}
		if filepath.Dir(got) != imagesDir {
			t.Errorf("projectImagePath(%q) = %q, escaped %q", name, got, imagesDir)
		}
	}

	for _, bad := range []string{"..", ".", ""} {
		if _, err := a.projectImagePath(bad); err == nil {
			t.Errorf("projectImagePath(%q) should have errored", bad)
		}
	}
}

func TestResolveImagePathConfinedToWorkingDir(t *testing.T) {
	a := newTestApp(t)
	wd := a.currentWorkingDir()

	if got := a.ResolveImagePath("images/a.png"); got != filepath.Join(wd, "images", "a.png") {
		t.Errorf("relative path = %q", got)
	}
	if got := a.ResolveImagePath("../../../etc/passwd"); got != "" {
		t.Errorf("traversal not rejected: %q", got)
	}
	outside := filepath.Join(os.TempDir(), "not-the-working-dir.png")
	if got := a.ResolveImagePath(outside); got != "" {
		t.Errorf("absolute path outside working dir not rejected: %q", got)
	}
	if got := a.ResolveImagePath(filepath.Join(wd, "images", "ok.png")); got == "" {
		t.Errorf("absolute path inside working dir was rejected")
	}
}

func TestResetWorkingDirRemovesOld(t *testing.T) {
	a := newTestApp(t)
	first := a.currentWorkingDir()

	if err := a.resetWorkingDir(); err != nil {
		t.Fatalf("resetWorkingDir: %v", err)
	}
	second := a.currentWorkingDir()

	if first == second {
		t.Fatal("working dir was not replaced")
	}
	if _, err := os.Stat(first); !os.IsNotExist(err) {
		t.Errorf("previous working dir was not removed: %v", err)
	}
	if !strings.HasPrefix(filepath.Base(second), "cardwizard_") {
		t.Errorf("unexpected working dir name %q", second)
	}
	t.Cleanup(func() { _ = os.RemoveAll(second) })
}

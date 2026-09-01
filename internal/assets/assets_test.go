package assets

import (
	"os"
	"path/filepath"
	"testing"
)

func writeFile(t *testing.T, dir, name, body string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
		t.Fatalf("write %s: %v", p, err)
	}
	return p
}

func newImages(t *testing.T) (*Manager, string) {
	t.Helper()
	root := t.TempDir()
	return NewManager(filepath.Join(root, "images"), "images", ".png", ".jpg"), root
}

func TestAddReturnsRefAndDedupes(t *testing.T) {
	m, root := newImages(t)
	src := writeFile(t, root, "card.png", "one")

	ref, err := m.Add(src)
	if err != nil {
		t.Fatalf("Add: %v", err)
	}
	if ref != "images/card.png" {
		t.Fatalf("ref = %q, want images/card.png", ref)
	}

	ref2, err := m.Add(src)
	if err != nil {
		t.Fatalf("Add (2): %v", err)
	}
	if ref2 != "images/card_1.png" {
		t.Fatalf("second ref = %q, want images/card_1.png", ref2)
	}
}

func TestAddRejectsUnlistedExtension(t *testing.T) {
	m, root := newImages(t)
	src := writeFile(t, root, "notes.txt", "nope")
	if _, err := m.Add(src); err == nil {
		t.Fatal("Add(.txt) should have failed")
	}
}

func TestPathStaysInsideDir(t *testing.T) {
	m, _ := newImages(t)
	want := filepath.Join(m.Dir(), "card.png")
	for _, name := range []string{"card.png", "images/card.png", "../../card.png", `..\..\card.png`} {
		got, err := m.Path(name)
		if err != nil {
			t.Fatalf("Path(%q): %v", name, err)
		}
		if got != want {
			t.Errorf("Path(%q) = %q, want %q", name, got, want)
		}
	}
	for _, bad := range []string{"", ".", ".."} {
		if _, err := m.Path(bad); err == nil {
			t.Errorf("Path(%q) should have errored", bad)
		}
	}
}

func TestListFiltersAndDelete(t *testing.T) {
	m, root := newImages(t)
	a, _ := m.Add(writeFile(t, root, "a.png", "a"))
	if _, err := m.Add(writeFile(t, root, "b.jpg", "b")); err != nil {
		t.Fatalf("Add b.jpg: %v", err)
	}
	// Drop a stray non-image directly into the managed dir.
	writeFile(t, m.Dir(), "readme.md", "x")

	names, err := m.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(names) != 2 {
		t.Fatalf("List = %v, want 2 image files", names)
	}

	if err := m.Delete(a); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := os.Stat(filepath.Join(m.Dir(), "a.png")); !os.IsNotExist(err) {
		t.Errorf("a.png still present after Delete")
	}
}

func TestListMissingDirIsEmpty(t *testing.T) {
	m, _ := newImages(t)
	names, err := m.List()
	if err != nil || names != nil {
		t.Fatalf("List on missing dir = (%v, %v), want (nil, nil)", names, err)
	}
}

func TestAddManyAggregatesFailures(t *testing.T) {
	m, root := newImages(t)
	ok := writeFile(t, root, "ok.png", "ok")
	bad := writeFile(t, root, "bad.gif", "bad")

	refs, err := m.AddMany([]string{ok, bad})
	if err == nil {
		t.Fatal("AddMany should report the .gif failure")
	}
	if len(refs) != 1 || refs[0] != "images/ok.png" {
		t.Errorf("refs = %v, want [images/ok.png]", refs)
	}
}

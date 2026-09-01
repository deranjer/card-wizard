package archive

import (
	"archive/zip"
	"os"
	"path/filepath"
	"testing"
)

func TestZipUnzipRoundTrip(t *testing.T) {
	src := t.TempDir()
	mustWrite(t, filepath.Join(src, "game.json"), `{"name":"x"}`)
	if err := os.MkdirAll(filepath.Join(src, "images"), 0o755); err != nil {
		t.Fatal(err)
	}
	mustWrite(t, filepath.Join(src, "images", "a.png"), "PNGDATA")

	zipPath := filepath.Join(t.TempDir(), "out.cwiz")
	if err := ZipDir(src, zipPath); err != nil {
		t.Fatalf("ZipDir: %v", err)
	}

	dst := t.TempDir()
	if err := Unzip(zipPath, dst); err != nil {
		t.Fatalf("Unzip: %v", err)
	}

	if got := readFile(t, filepath.Join(dst, "game.json")); got != `{"name":"x"}` {
		t.Errorf("game.json = %q", got)
	}
	if got := readFile(t, filepath.Join(dst, "images", "a.png")); got != "PNGDATA" {
		t.Errorf("images/a.png = %q", got)
	}
}

func TestZipDirMissingSource(t *testing.T) {
	err := ZipDir(filepath.Join(t.TempDir(), "does-not-exist"), filepath.Join(t.TempDir(), "x.zip"))
	if err == nil {
		t.Fatal("expected an error zipping a missing directory")
	}
}

func TestUnzipRejectsZipSlip(t *testing.T) {
	zipPath := filepath.Join(t.TempDir(), "evil.cwiz")
	zf, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	zw := zip.NewWriter(zf)
	for _, name := range []string{"game.json", "../escape.txt"} {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write([]byte("pwned"))
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	zf.Close()

	dst := filepath.Join(t.TempDir(), "extract")
	if err := Unzip(zipPath, dst); err == nil {
		t.Fatal("expected Unzip to reject the ../ entry")
	}

	if _, err := os.Stat(filepath.Join(filepath.Dir(dst), "escape.txt")); !os.IsNotExist(err) {
		t.Fatalf("zip-slip file was written outside destDir")
	}
}

func mustWrite(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

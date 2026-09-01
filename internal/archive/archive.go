// Package archive reads and writes the .cwiz save format: a plain deflate zip
// of a game's working directory (game.json plus an images/ folder).
package archive

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// maxDecompressedFile caps a single extracted entry (256 MiB) as a zip-bomb
// guard. Card art is well under this.
const maxDecompressedFile = 256 << 20

// ZipDir writes a deflate zip of sourceDir's contents to destZip. It fails
// (rather than silently truncating) if any file cannot be read or if the
// archive cannot be finalised.
func ZipDir(sourceDir, destZip string) (err error) {
	sourceDir = filepath.Clean(sourceDir)

	zipFile, err := os.Create(destZip)
	if err != nil {
		return fmt.Errorf("create %s: %w", destZip, err)
	}
	defer func() {
		if cerr := zipFile.Close(); cerr != nil && err == nil {
			err = fmt.Errorf("close %s: %w", destZip, cerr)
		}
	}()

	w := zip.NewWriter(zipFile)

	walkErr := filepath.WalkDir(sourceDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}

		info, err := d.Info()
		if err != nil {
			return err
		}
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(rel)
		if d.IsDir() {
			header.Name += "/"
		} else {
			header.Method = zip.Deflate
		}

		fw, err := w.CreateHeader(header)
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		_, err = io.Copy(fw, f)
		return err
	})
	if walkErr != nil {
		w.Close() // best effort; we're returning the real error
		return fmt.Errorf("zip %s: %w", sourceDir, walkErr)
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("finalise archive: %w", err)
	}
	return nil
}

// Unzip extracts sourceZip into destDir. Entries whose path escapes destDir
// ("zip slip") are rejected, extracted files/dirs get fixed sane permissions,
// and a single oversized entry aborts the extraction.
func Unzip(sourceZip, destDir string) error {
	reader, err := zip.OpenReader(sourceZip)
	if err != nil {
		return fmt.Errorf("open %s: %w", sourceZip, err)
	}
	defer reader.Close()

	destDir = filepath.Clean(destDir)
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return err
	}
	prefix := destDir + string(os.PathSeparator)

	for _, file := range reader.File {
		target := filepath.Join(destDir, file.Name)
		if target != destDir && !strings.HasPrefix(target, prefix) {
			return fmt.Errorf("unsafe path in archive: %q", file.Name)
		}

		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		if err := extractFile(file, target); err != nil {
			return err
		}
	}
	return nil
}

func extractFile(file *zip.File, target string) error {
	dst, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer dst.Close()

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	n, err := io.CopyN(dst, src, maxDecompressedFile+1)
	if err != nil && err != io.EOF {
		return err
	}
	if n > maxDecompressedFile {
		return fmt.Errorf("%s exceeds the %d byte limit", file.Name, maxDecompressedFile)
	}
	return nil
}

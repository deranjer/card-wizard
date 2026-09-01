package archive

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// ZipDir archives the contents of the given directory to the specified destination zip file.
func ZipDir(sourceDir, destZip string) error {
	zipFile, err := os.Create(destZip)
	if err != nil {
		return fmt.Errorf("could not create zip file: %w", err)
	}
	defer zipFile.Close()

	archive := zip.NewWriter(zipFile)
	defer archive.Close()

	filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		// Ensure we use forward slashes for zip paths
		header.Name = filepath.ToSlash(strings.TrimPrefix(path, sourceDir+string(filepath.Separator)))

		if info.IsDir() {
			header.Name += "/"
		} else {
			header.Method = zip.Deflate
		}

		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		return err
	})

	return nil
}

// Unzip extracts the contents of the given zip file to the specified destination directory.
func Unzip(sourceZip, destDir string) error {
	reader, err := zip.OpenReader(sourceZip)
	if err != nil {
		return fmt.Errorf("could not open zip file: %w", err)
	}
	defer reader.Close()

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}

	for _, file := range reader.File {
		path := filepath.Join(destDir, file.Name)

		// Create directory if it's a dir
		if file.FileInfo().IsDir() {
			os.MkdirAll(path, os.ModePerm)
			continue
		}

		// Ensure parent dir exists
		if err := os.MkdirAll(filepath.Dir(path), os.ModePerm); err != nil {
			return err
		}

		destFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			return err
		}

		srcFile, err := file.Open()
		if err != nil {
			destFile.Close()
			return err
		}

		_, err = io.Copy(destFile, srcFile)
		destFile.Close()
		srcFile.Close()

		if err != nil {
			return err
		}
	}

	return nil
}

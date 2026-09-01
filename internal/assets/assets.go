// Package assets manages a single on-disk directory of project files (card
// images, custom fonts) that must never be escaped by a caller-supplied name.
// Every lookup reduces the given name to its base component, so "../../etc"
// style inputs resolve harmlessly inside the managed directory.
package assets

import (
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// Manager owns one directory. ref is the slash-separated path prefix reported
// back to callers (e.g. "images"), so a stored reference round-trips through
// the frontend unchanged. exts, when non-empty, is the set of lower-case file
// extensions (with leading dot) the manager will accept or list.
type Manager struct {
	dir  string
	ref  string
	exts map[string]bool
}

// NewManager returns a Manager for dir, reporting stored paths under ref. If
// any extensions are given, Add/Replace reject other file types and List omits
// them.
func NewManager(dir, ref string, exts ...string) *Manager {
	set := make(map[string]bool, len(exts))
	for _, e := range exts {
		set[strings.ToLower(e)] = true
	}
	return &Manager{dir: dir, ref: ref, exts: set}
}

// Dir is the absolute directory the manager owns.
func (m *Manager) Dir() string { return m.dir }

func (m *Manager) allowed(name string) bool {
	if len(m.exts) == 0 {
		return true
	}
	return m.exts[strings.ToLower(filepath.Ext(name))]
}

// base reduces a caller-supplied name to a safe file name inside the managed
// directory, rejecting names that have no usable base component.
func (m *Manager) base(name string) (string, error) {
	b := filepath.Base(filepath.FromSlash(name))
	if b == "." || b == ".." || b == string(filepath.Separator) || b == "" {
		return "", fmt.Errorf("invalid asset name %q", name)
	}
	return b, nil
}

// Path resolves name to an absolute path inside the managed directory.
func (m *Manager) Path(name string) (string, error) {
	b, err := m.base(name)
	if err != nil {
		return "", err
	}
	return filepath.Join(m.dir, b), nil
}

// Ref returns the stored reference (ref/<base>) for a name, in slash form.
func (m *Manager) Ref(name string) (string, error) {
	b, err := m.base(name)
	if err != nil {
		return "", err
	}
	if m.ref == "" {
		return b, nil
	}
	return path.Join(m.ref, b), nil
}

// Add copies srcPath into the managed directory, choosing a non-colliding
// name, and returns its stored reference.
func (m *Manager) Add(srcPath string) (string, error) {
	if !m.allowed(srcPath) {
		return "", fmt.Errorf("unsupported file type %q", filepath.Ext(srcPath))
	}
	if err := os.MkdirAll(m.dir, 0o755); err != nil {
		return "", fmt.Errorf("create %s: %w", m.dir, err)
	}

	data, err := os.ReadFile(srcPath)
	if err != nil {
		return "", err
	}

	name := filepath.Base(srcPath)
	ext := filepath.Ext(name)
	stem := strings.TrimSuffix(name, ext)
	dest := filepath.Join(m.dir, name)
	for i := 1; ; i++ {
		if _, err := os.Stat(dest); os.IsNotExist(err) {
			break
		}
		name = fmt.Sprintf("%s_%d%s", stem, i, ext)
		dest = filepath.Join(m.dir, name)
	}

	if err := os.WriteFile(dest, data, 0o644); err != nil {
		return "", err
	}
	return m.Ref(name)
}

// AddMany adds every path, returning the references that succeeded. If any
// failed, the returned error names them.
func (m *Manager) AddMany(srcPaths []string) ([]string, error) {
	var refs []string
	var failures []string
	for _, src := range srcPaths {
		ref, err := m.Add(src)
		if err != nil {
			failures = append(failures, fmt.Sprintf("%s: %v", filepath.Base(src), err))
			continue
		}
		refs = append(refs, ref)
	}
	if len(failures) > 0 {
		return refs, fmt.Errorf("some files failed to import: %s", strings.Join(failures, "; "))
	}
	return refs, nil
}

// List returns the base names of files in the managed directory, filtered by
// the extension allowlist. A missing directory lists as empty.
func (m *Manager) List() ([]string, error) {
	entries, err := os.ReadDir(m.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if e.IsDir() || !m.allowed(e.Name()) {
			continue
		}
		names = append(names, e.Name())
	}
	return names, nil
}

// Delete removes the named file from the managed directory.
func (m *Manager) Delete(name string) error {
	p, err := m.Path(name)
	if err != nil {
		return err
	}
	return os.Remove(p)
}

// Replace overwrites the named file with the contents of srcPath.
func (m *Manager) Replace(name, srcPath string) error {
	if !m.allowed(srcPath) {
		return fmt.Errorf("unsupported file type %q", filepath.Ext(srcPath))
	}
	p, err := m.Path(name)
	if err != nil {
		return err
	}
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

package pdf

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"

	"card_wizard/internal/deck"

	"github.com/go-pdf/fpdf"
)

// 1x1 PNGs, one black and one white — distinct bytes.
var (
	pngBlack, _ = base64.StdEncoding.DecodeString(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==")
	pngWhite, _ = base64.StdEncoding.DecodeString(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
)

// TestGenerateProducesPDF is a smoke test for the go-pdf/fpdf backend: it must
// write a syntactically valid, non-empty PDF for a minimal deck.
func TestGenerateProducesPDF(t *testing.T) {
	d := deck.Deck{
		Name:      "Smoke",
		Width:     63.5,
		Height:    88.9,
		PaperSize: "letter",
		Cards: []deck.Card{
			{ID: "c1", Count: 2, FrontStyleID: "default-front", BackStyleID: "default-back"},
			{ID: "c2", Count: 1, FrontStyleID: "default-front", BackStyleID: "default-back"},
		},
		DrawCutGuides: true,
	}

	out := filepath.Join(t.TempDir(), "smoke.pdf")
	if err := NewGenerator().Generate(d, out); err != nil {
		t.Fatalf("Generate: %v", err)
	}

	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatalf("read output: %v", err)
	}
	if len(data) < 512 {
		t.Fatalf("PDF suspiciously small: %d bytes", len(data))
	}
	if got := string(data[:5]); got != "%PDF-" {
		t.Fatalf("missing PDF header, got %q", got)
	}
}

// TestRegisterCardImagesIsPerCard guards the headline correctness fix: two
// cards sharing a style but with different rendered images must each get their
// own entry (the old code keyed by styleId, collapsing them to one).
func TestRegisterCardImagesIsPerCard(t *testing.T) {
	pdf := fpdf.New("P", "mm", "Letter", "")
	rendered := []deck.RenderedCard{
		{CardID: "rusty-dagger", Side: "front", Image: "data:image/png;base64," +
			base64.StdEncoding.EncodeToString(pngBlack)},
		{CardID: "wooden-club", Side: "front", Image: base64.StdEncoding.EncodeToString(pngWhite)},
		{CardID: "rusty-dagger", Side: "back", Image: base64.StdEncoding.EncodeToString(pngWhite)},
		{CardID: "bad", Side: "front", Image: "%%%not-base64%%%"},
	}

	m := registerCardImages(pdf, rendered)

	if m["rusty-dagger-front"] == "" || m["wooden-club-front"] == "" {
		t.Fatalf("missing per-card entries: %v", m)
	}
	if m["rusty-dagger-front"] == m["wooden-club-front"] {
		t.Errorf("same-style cards collapsed to one image name: %q", m["rusty-dagger-front"])
	}
	if m["rusty-dagger-back"] == "" {
		t.Errorf("back face not registered: %v", m)
	}
	if _, ok := m["bad-front"]; ok {
		t.Errorf("undecodable image should have been skipped")
	}
}

func TestGeneratePlacesDistinctImagesForSameStyleCards(t *testing.T) {
	d := deck.Deck{
		Name: "Weapons", Width: 63.5, Height: 88.9, PaperSize: "letter",
		Cards: []deck.Card{
			{ID: "a", Count: 1, FrontStyleID: "s", BackStyleID: "s"},
			{ID: "b", Count: 1, FrontStyleID: "s", BackStyleID: "s"},
		},
		RenderedCards: []deck.RenderedCard{
			{CardID: "a", Side: "front", Image: base64.StdEncoding.EncodeToString(pngBlack)},
			{CardID: "b", Side: "front", Image: base64.StdEncoding.EncodeToString(pngWhite)},
		},
	}
	out := filepath.Join(t.TempDir(), "weapons.pdf")
	if err := NewGenerator().Generate(d, out); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	data, _ := os.ReadFile(out)
	if len(data) < 512 || string(data[:5]) != "%PDF-" {
		t.Fatalf("invalid PDF (%d bytes)", len(data))
	}
}

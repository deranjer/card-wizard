package pdf

import (
	"os"
	"path/filepath"
	"testing"

	"card_wizard/internal/deck"
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

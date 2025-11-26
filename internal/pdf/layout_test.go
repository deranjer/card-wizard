package pdf

import (
	"card_wizard/internal/deck"
	"testing"
)

func TestCalculateLayout(t *testing.T) {
	tests := []struct {
		name        string
		deck        deck.Deck
		wantCols    int
		wantRows    int
		wantSpacing float64
	}{
		{
			name: "Standard Poker on Letter (3x3)",
			deck: deck.Deck{
				Width:     63.5,
				Height:    88.9,
				PaperSize: "letter",
			},
			wantCols: 3,
			wantRows: 3,
		},
		{
			name: "Standard Poker on A4 (3x3)",
			deck: deck.Deck{
				Width:     63.5,
				Height:    88.9,
				PaperSize: "a4",
			},
			wantCols: 3,
			wantRows: 3,
		},
		{
			name: "Jumbo Cards on Letter (2x2)",
			deck: deck.Deck{
				Width:     88.9,
				Height:    127.0,
				PaperSize: "letter",
			},
			wantCols: 2,
			wantRows: 2,
		},
		{
			name: "Mini Cards on Letter (4x4)",
			deck: deck.Deck{
				Width:     44.45,
				Height:    63.5,
				PaperSize: "letter",
			},
			wantCols: 4,
			wantRows: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateLayout(tt.deck)

			if got.CardsPerRow != tt.wantCols {
				t.Errorf("CalculateLayout() CardsPerRow = %v, want %v", got.CardsPerRow, tt.wantCols)
			}
			if got.CardsPerCol != tt.wantRows {
				t.Errorf("CalculateLayout() CardsPerCol = %v, want %v", got.CardsPerCol, tt.wantRows)
			}

			// Verify margins are positive
			if got.MarginLeft < 0 {
				t.Errorf("CalculateLayout() MarginLeft is negative: %v", got.MarginLeft)
			}
			if got.MarginTop < 0 {
				t.Errorf("CalculateLayout() MarginTop is negative: %v", got.MarginTop)
			}

			// Verify content fits on page
			totalW := (float64(got.CardsPerRow) * got.CardWidth) + (float64(got.CardsPerRow-1) * got.Spacing) + (2 * got.MarginLeft)
			if totalW > got.PageWidth+0.1 { // Allow small float error
				t.Errorf("CalculateLayout() Total Width %v exceeds Page Width %v", totalW, got.PageWidth)
			}
		})
	}
}

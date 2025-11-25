package pdf

import (
	"card_wizard/internal/deck"
)

// CalculateLayout determines the optimal layout for the given deck and paper size
func CalculateLayout(d deck.Deck) deck.PDFLayout {
	// Determine paper size
	paperSize := d.PaperSize
	if paperSize == "" {
		paperSize = "letter"
	}

	var pageWidth, pageHeight float64
	if paperSize == "a4" {
		pageWidth = 210.0
		pageHeight = 297.0
	} else {
		// Letter
		pageWidth = 215.9
		pageHeight = 279.4
	}

	cardWidth := d.Width
	cardHeight := d.Height

	// Target: Fit 9 cards (3x3) for standard poker size on Letter/A4
	// Strategy:
	// 1. Try with ideal spacing (2mm) and safe margins (10mm)
	// 2. If < 9 cards, try reducing margins (min 5mm)
	// 3. If still < 9, try reducing spacing (min 0mm)
	// 4. Calculate final margins to CENTER the grid

	// Configuration
	minMargin := 5.0
	idealMargin := 10.0
	idealSpacing := 2.0

	// Helper to calculate count
	calc := func(margin, spacing float64) (int, int, int) {
		printableW := pageWidth - (2 * margin)
		printableH := pageHeight - (2 * margin)

		// Solve for Cols: Cols(W+S) - S <= PrintableW -> Cols(W+S) <= PrintableW + S
		cols := int((printableW + spacing) / (cardWidth + spacing))
		rows := int((printableH + spacing) / (cardHeight + spacing))

		if cols < 1 {
			cols = 1
		}
		if rows < 1 {
			rows = 1
		}

		return cols, rows, cols * rows
	}

	// 1. Try Ideal
	cols, rows, count := calc(idealMargin, idealSpacing)

	finalSpacing := idealSpacing

	// If we want 9 cards but didn't get them (assuming standard poker size approx)
	// Poker size is ~63x88. 3x3 = 9.
	if count < 9 {
		// 2. Try Reduced Margins
		c, r, n := calc(minMargin, idealSpacing)
		if n > count {
			cols, rows, count = c, r, n
			finalSpacing = idealSpacing
		}

		// 3. If still < 9, Try Reduced Spacing + Reduced Margins
		if count < 9 {
			c, r, n := calc(minMargin, 0)
			if n > count {
				cols, rows, count = c, r, n
				finalSpacing = 0
			}
		}
	}

	// 4. Calculate Centering Margins
	// Total Width = (Cols * CardW) + ((Cols - 1) * Spacing)
	totalGridWidth := (float64(cols) * cardWidth) + (float64(cols-1) * finalSpacing)
	totalGridHeight := (float64(rows) * cardHeight) + (float64(rows-1) * finalSpacing)

	marginLeft := (pageWidth - totalGridWidth) / 2
	marginTop := (pageHeight - totalGridHeight) / 2

	// Ensure non-negative margins (shouldn't happen due to calc logic, but safe guard)
	if marginLeft < 0 {
		marginLeft = 0
	}
	if marginTop < 0 {
		marginTop = 0
	}

	return deck.PDFLayout{
		PageWidth:   pageWidth,
		PageHeight:  pageHeight,
		CardsPerRow: cols,
		CardsPerCol: rows,
		CardWidth:   cardWidth,
		CardHeight:  cardHeight,
		Spacing:     finalSpacing,
		MarginLeft:  marginLeft,
		MarginTop:   marginTop,
	}
}

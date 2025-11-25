package pdf

import (
	"fmt"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"

	"card_wizard/internal/deck"
)

type Generator struct{}

func NewGenerator() *Generator {
	return &Generator{}
}

func (g *Generator) Generate(d deck.Deck, outputPath string) error {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithLeftMargin(10).
		WithTopMargin(10).
		WithRightMargin(10).
		WithBottomMargin(10).
		Build()

	m := maroto.New(cfg)

	// Calculate cards per page
	// A4 is 210mm x 297mm
	// Margins are 10mm
	// Printable area: 190mm x 277mm

	printableHeight := 277.0
	rowHeight := 40.0
	headerHeight := 10.0

	m.AddRow(headerHeight,
		text.NewCol(12, "Deck: "+d.Name, props.Text{
			Top:   3,
			Style: fontstyle.Bold,
			Align: align.Center,
		}),
	)

	// Expand cards based on Count
	var expandedCards []deck.Card
	for _, card := range d.Cards {
		count := card.Count
		if count < 1 {
			count = 1
		}
		for i := 0; i < count; i++ {
			expandedCards = append(expandedCards, card)
		}
	}

	cardsPerRow := 3
	var currentRow []core.Col

	// Calculate rows per page based on height
	// First page has header
	rowsFirstPage := int((printableHeight - headerHeight) / rowHeight)
	rowsOtherPages := int(printableHeight / rowHeight)

	// For simplicity, let's use a fixed batch size that fits on the first page
	// and use spacers to force breaks.
	rowsPerBatch := rowsFirstPage
	if rowsPerBatch > rowsOtherPages {
		rowsPerBatch = rowsOtherPages
	}
	// Let's be conservative
	rowsPerBatch = 6

	cardsPerPage := cardsPerRow * rowsPerBatch

	for i := 0; i < len(expandedCards); i += cardsPerPage {
		end := i + cardsPerPage
		if end > len(expandedCards) {
			end = len(expandedCards)
		}

		pageCards := expandedCards[i:end]

		// Track height used in this page
		currentHeight := 0.0
		if i == 0 {
			currentHeight += headerHeight
		}

		// 1. Render Fronts
		rowsInBatch := (len(pageCards) + cardsPerRow - 1) / cardsPerRow

		for j, card := range pageCards {
			// Get Front Style
			styleID := card.FrontStyleID
			if styleID == "" {
				styleID = "default-front"
			}
			layout, ok := d.FrontStyles[styleID]
			if !ok {
				// Fallback or empty
				layout = deck.CardLayout{Elements: []deck.LayoutElement{}}
			}

			// Create a column for the card
			cardContent := fmt.Sprintf("%s\n", card.ID)
			for _, el := range layout.Elements {
				if el.Type == "text" {
					if el.StaticText != "" {
						cardContent += fmt.Sprintf("%s\n", el.StaticText)
					} else if val, ok := card.Data[el.Field]; ok {
						cardContent += fmt.Sprintf("%v\n", val)
					}
				}
				// Image support in PDF is tricky with Maroto v2 text cols, skipping for now or needs ImageCol
			}

			col := text.NewCol(12/cardsPerRow, cardContent, props.Text{
				Size:  10,
				Top:   5,
				Align: align.Left,
			})

			currentRow = append(currentRow, col)

			if len(currentRow) == cardsPerRow || j == len(pageCards)-1 {
				// Fill remaining columns if last row
				for len(currentRow) < cardsPerRow {
					currentRow = append(currentRow, text.NewCol(12/cardsPerRow, "", props.Text{}))
				}
				m.AddRow(rowHeight, currentRow...)
				currentHeight += rowHeight
				currentRow = []core.Col{}
			}
		}

		// 2. Always do Backs page for double-sided consistency
		// (Or check if any back style is non-empty?)
		// For now, let's assume we always want backs if we have fronts.

		// Force Page Break
		spacer := printableHeight - currentHeight - 1 // -1 for safety
		if spacer > 0 {
			m.AddRow(spacer, text.NewCol(12, " ", props.Text{}))
		}

		// Render Backs
		currentHeight = 0.0 // New page

		for r := 0; r < rowsInBatch; r++ {
			startIdx := r * cardsPerRow
			endIdx := startIdx + cardsPerRow
			if endIdx > len(pageCards) {
				endIdx = len(pageCards)
			}

			rowCards := pageCards[startIdx:endIdx]

			var backCols []core.Col

			// Reverse for mirroring
			for k := len(rowCards) - 1; k >= 0; k-- {
				card := rowCards[k]

				styleID := card.BackStyleID
				if styleID == "" {
					styleID = "default-back"
				}
				layout, ok := d.BackStyles[styleID]
				if !ok {
					layout = deck.CardLayout{Elements: []deck.LayoutElement{}}
				}

				backContent := ""
				for _, el := range layout.Elements {
					if el.Type == "text" {
						if el.StaticText != "" {
							backContent += fmt.Sprintf("%s\n", el.StaticText)
						} else if val, ok := card.Data[el.Field]; ok {
							backContent += fmt.Sprintf("%v\n", val)
						}
					}
				}

				col := text.NewCol(12/cardsPerRow, backContent, props.Text{
					Size:  10,
					Top:   5,
					Align: align.Center,
					Style: fontstyle.Italic,
				})
				backCols = append(backCols, col)
			}

			// Pad
			for len(backCols) < cardsPerRow {
				backCols = append([]core.Col{text.NewCol(12/cardsPerRow, "", props.Text{})}, backCols...)
			}

			m.AddRow(rowHeight, backCols...)
			currentHeight += rowHeight
		}

		// If there are more cards coming, we need to finish this Backs page too
		if end < len(expandedCards) {
			spacer := printableHeight - currentHeight - 1
			if spacer > 0 {
				m.AddRow(spacer, text.NewCol(12, " ", props.Text{}))
			}
		}
	}

	document, err := m.Generate()
	if err != nil {
		return err
	}

	return document.Save(outputPath)
}

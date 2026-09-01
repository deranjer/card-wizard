package pdf

import (
	"encoding/base64"
	"fmt"
	"strings"

	"card_wizard/internal/deck"

	"github.com/go-pdf/fpdf"
)

type GeneratorNew struct{}

func NewGenerator() *GeneratorNew {
	return &GeneratorNew{}
}

// cardImageKey is the lookup key for a rendered card face. Keyed per card so
// two cards that share a style but differ in data get their own image.
func cardImageKey(cardID, side string) string {
	return cardID + "-" + side
}

// registerCardImages decodes and registers every rendered card face with the
// PDF and returns a map from cardImageKey to the registered image name. Entries
// that fail to decode are skipped.
func registerCardImages(pdf *fpdf.Fpdf, rendered []deck.RenderedCard) map[string]string {
	imageMap := make(map[string]string, len(rendered))
	for i, rc := range rendered {
		imageData := rc.Image
		if idx := strings.Index(imageData, ","); strings.HasPrefix(imageData, "data:") && idx >= 0 {
			imageData = imageData[idx+1:]
		}
		decoded, err := base64.StdEncoding.DecodeString(imageData)
		if err != nil {
			continue
		}
		name := fmt.Sprintf("card_%s_%s_%d", rc.CardID, rc.Side, i)
		pdf.RegisterImageOptionsReader(
			name,
			fpdf.ImageOptions{ImageType: "PNG", ReadDpi: true},
			strings.NewReader(string(decoded)),
		)
		imageMap[cardImageKey(rc.CardID, rc.Side)] = name
	}
	return imageMap
}

// Generate creates a PDF with precise positioning using gofpdf
// Pages are interleaved: front1, back1, front2, back2, etc. for duplex printing
func (g *GeneratorNew) Generate(d deck.Deck, outputPath string) error {
	// Calculate layout
	layout := CalculateLayout(d)

	pageType := "Letter"
	if layout.PageWidth == 210.0 {
		pageType = "A4"
	}

	pdf := fpdf.New("P", "mm", pageType, "")
	pdf.SetMargins(0, 0, 0) // We handle margins manually
	pdf.SetAutoPageBreak(false, 0)

	// Register every supplied card image; imageMap maps "<cardId>-<side>" to the
	// name it was registered under.
	imageMap := registerCardImages(pdf, d.RenderedCards)

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

	cardsPerPage := layout.CardsPerRow * layout.CardsPerCol

	// Render pages with fronts and backs interleaved for duplex printing
	for i := 0; i < len(expandedCards); i += cardsPerPage {
		end := i + cardsPerPage
		if end > len(expandedCards) {
			end = len(expandedCards)
		}

		pageCards := expandedCards[i:end]

		// Render FRONTS page
		pdf.AddPage()

		for j, card := range pageCards {
			row := j / layout.CardsPerRow
			col := j % layout.CardsPerRow

			x := layout.MarginLeft + float64(col)*(layout.CardWidth+layout.Spacing)
			y := layout.MarginTop + float64(row)*(layout.CardHeight+layout.Spacing)

			if imageName, ok := imageMap[cardImageKey(card.ID, "front")]; ok {
				pdf.Image(imageName, x, y, layout.CardWidth, layout.CardHeight, false, "", 0, "")
			} else {
				// Fallback: draw a border if image not found
				pdf.SetDrawColor(200, 200, 200)
				pdf.Rect(x, y, layout.CardWidth, layout.CardHeight, "D")
			}

			// Draw cut guides if enabled
			if d.DrawCutGuides {
				pdf.SetDrawColor(150, 150, 150)        // Light gray
				pdf.SetDashPattern([]float64{1, 1}, 0) // Dashed line
				pdf.Rect(x, y, layout.CardWidth, layout.CardHeight, "D")
				pdf.SetDashPattern([]float64{}, 0) // Reset dash
			}
		}

		// Render BACKS page (immediately after fronts for duplex)
		pdf.AddPage()

		for j := 0; j < len(pageCards); j++ {
			row := j / layout.CardsPerRow
			col := j % layout.CardsPerRow

			// Mirror columns for standard duplex printing (Back of Left is Right)
			mirroredCol := layout.CardsPerRow - 1 - col

			x := layout.MarginLeft + float64(mirroredCol)*(layout.CardWidth+layout.Spacing)
			y := layout.MarginTop + float64(row)*(layout.CardHeight+layout.Spacing)

			card := pageCards[j]

			if imageName, ok := imageMap[cardImageKey(card.ID, "back")]; ok {
				pdf.Image(imageName, x, y, layout.CardWidth, layout.CardHeight, false, "", 0, "")
			} else {
				// Fallback: draw a border if image not found
				pdf.SetDrawColor(200, 200, 200)
				pdf.Rect(x, y, layout.CardWidth, layout.CardHeight, "D")
			}

			// Draw cut guides if enabled
			if d.DrawCutGuides {
				pdf.SetDrawColor(150, 150, 150)        // Light gray
				pdf.SetDashPattern([]float64{1, 1}, 0) // Dashed line
				pdf.Rect(x, y, layout.CardWidth, layout.CardHeight, "D")
				pdf.SetDashPattern([]float64{}, 0) // Reset dash
			}
		}
	}

	return pdf.OutputFileAndClose(outputPath)
}

package pdf

import (
	"encoding/base64"
	"fmt"
	"strings"

	"card_wizard/internal/deck"

	"github.com/jung-kurt/gofpdf"
)

type GeneratorNew struct{}

func NewGenerator() *GeneratorNew {
	return &GeneratorNew{}
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

	pdf := gofpdf.New("P", "mm", pageType, "")
	pdf.SetMargins(0, 0, 0) // We handle margins manually
	pdf.SetAutoPageBreak(false, 0)

	// Register rendered card images
	imageMap := make(map[string]string) // key: styleId-side, value: image name in PDF

	for i, renderedCard := range d.RenderedCards {
		// Decode base64 image
		imageData := renderedCard.Image
		if strings.HasPrefix(imageData, "data:image/png;base64,") {
			imageData = strings.TrimPrefix(imageData, "data:image/png;base64,")
		}

		decoded, err := base64.StdEncoding.DecodeString(imageData)
		if err != nil {
			continue
		}

		// Register image with gofpdf
		imageName := fmt.Sprintf("card_%s_%s_%d", renderedCard.StyleID, renderedCard.Side, i)
		imageOpts := gofpdf.ImageOptions{
			ImageType: "PNG",
			ReadDpi:   true,
		}

		pdf.RegisterImageOptionsReader(imageName, imageOpts, strings.NewReader(string(decoded)))

		key := fmt.Sprintf("%s-%s", renderedCard.StyleID, renderedCard.Side)
		imageMap[key] = imageName
	}

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

			// Get card image
			styleID := card.FrontStyleID
			if styleID == "" {
				styleID = "default-front"
			}

			key := fmt.Sprintf("%s-front", styleID)
			if imageName, ok := imageMap[key]; ok {
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

			// Get card image
			styleID := card.BackStyleID
			if styleID == "" {
				styleID = "default-back"
			}

			key := fmt.Sprintf("%s-back", styleID)
			if imageName, ok := imageMap[key]; ok {
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

package deck

type FieldDefinition struct {
	Name string `json:"name"`
	Type string `json:"type"` // "text" or "image"
}

type CardBack struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Type    string `json:"type"`    // "color" or "image"
	Content string `json:"content"` // Hex color or image path
}

// Point is a normalized (0-1) coordinate relative to an element's width/height,
// used to describe the vertices of a shape element.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type LayoutElement struct {
	ID             string  `json:"id"`
	Name           string  `json:"name,omitempty"`
	Type           string  `json:"type"`
	Field          string  `json:"field"`
	StaticText     string  `json:"staticText,omitempty"`
	X              float64 `json:"x"`
	Y              float64 `json:"y"`
	Width          float64 `json:"width"`
	Height         float64 `json:"height"`
	FontSize       float64 `json:"fontSize,omitempty"`
	Color          string  `json:"color,omitempty"`
	FontFamily     string  `json:"fontFamily,omitempty"`
	ObjectFit      string  `json:"objectFit,omitempty"`
	TextAlign      string  `json:"textAlign,omitempty"`      // "left", "center", "right"
	VerticalAlign  string  `json:"verticalAlign,omitempty"`  // "top", "middle", "bottom"
	FontWeight     string  `json:"fontWeight,omitempty"`     // "normal", "bold"
	FontStyle      string  `json:"fontStyle,omitempty"`      // "normal", "italic"
	TextDecoration string  `json:"textDecoration,omitempty"` // "none", "underline"

	// Shape properties (Type == "shape")
	Points      []Point `json:"points,omitempty"` // normalized 0-1 vertices
	FillColor   string  `json:"fillColor,omitempty"`
	StrokeColor string  `json:"strokeColor,omitempty"`
	StrokeWidth float64 `json:"strokeWidth,omitempty"`
}

type CustomFont struct {
	Name   string `json:"name"`
	Path   string `json:"path"`
	Family string `json:"family"`
}

type CardLayout struct {
	Name     string          `json:"name"`
	Elements []LayoutElement `json:"elements"`
}

type Card struct {
	ID           string                 `json:"id"`
	Data         map[string]interface{} `json:"data"`
	Count        int                    `json:"count"`
	FrontStyleID string                 `json:"frontStyleId"`
	BackStyleID  string                 `json:"backStyleId"`
}

type Deck struct {
	ID                  string                `json:"id"`
	Name                string                `json:"name"`
	Width               float64               `json:"width"`
	Height              float64               `json:"height"`
	Cards               []Card                `json:"cards"`
	Fields              []FieldDefinition     `json:"fields"`
	FrontStyles         map[string]CardLayout `json:"frontStyles"`
	BackStyles          map[string]CardLayout `json:"backStyles"`
	DefaultFrontStyleID string                `json:"defaultFrontStyleId"`
	DefaultBackStyleID  string                `json:"defaultBackStyleId"`
	CustomFonts         []CustomFont          `json:"customFonts,omitempty"` // User-supplied font files
	PaperSize           string                `json:"paperSize"`             // "letter" or "a4"
	DrawCutGuides       bool                  `json:"drawCutGuides"`         // Draw borders around cards
}

// RenderedCard is one pre-rasterised card face supplied by the frontend for
// PDF generation. It is passed as a separate argument to GeneratePDF rather
// than stored on the Deck, so these (large, base64) payloads never reach
// game.json. Keyed per card (not per style) so that two cards sharing a style
// but carrying different field data print differently.
type RenderedCard struct {
	CardID string `json:"cardId"`
	Side   string `json:"side"`  // "front" or "back"
	Image  string `json:"image"` // data URL or bare base64 PNG
}

type PDFLayout struct {
	PageWidth   float64 `json:"pageWidth"`
	PageHeight  float64 `json:"pageHeight"`
	CardsPerRow int     `json:"cardsPerRow"`
	CardsPerCol int     `json:"cardsPerCol"`
	CardWidth   float64 `json:"cardWidth"`
	CardHeight  float64 `json:"cardHeight"`
	Spacing     float64 `json:"spacing"`
	MarginLeft  float64 `json:"marginLeft"`
	MarginTop   float64 `json:"marginTop"`
}

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
	PaperSize           string                `json:"paperSize"`     // "letter" or "a4"
	DrawCutGuides       bool                  `json:"drawCutGuides"` // Draw borders around cards
	RenderedCards       []RenderedCard        `json:"renderedCards"` // Pre-rendered card images for PDF
}

type RenderedCard struct {
	StyleID string `json:"styleId"`
	Side    string `json:"side"`  // "front" or "back"
	Image   string `json:"image"` // base64 encoded PNG
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

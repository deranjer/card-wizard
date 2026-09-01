package deck

import (
	"encoding/json"
	"testing"
)

// TestShapeAndFontRoundTrip guards against the regression where shape geometry and
// custom fonts were silently dropped on Save because the Go structs lacked the fields.
// The frontend sends these keys; a JSON round-trip through the Go model must preserve them.
func TestShapeAndFontRoundTrip(t *testing.T) {
	original := Deck{
		ID:     "deck-1",
		Name:   "Round Trip",
		Width:  63.5,
		Height: 88.9,
		FrontStyles: map[string]CardLayout{
			"default-front": {
				Name: "Default Front",
				Elements: []LayoutElement{
					{
						ID:   "el-shape",
						Type: "shape",
						Points: []Point{
							{X: 0.5, Y: 0},
							{X: 1, Y: 1},
							{X: 0, Y: 1},
						},
						FillColor:   "#cccccc",
						StrokeColor: "#000000",
						StrokeWidth: 2,
					},
				},
			},
		},
		BackStyles: map[string]CardLayout{
			"default-back": {Name: "Default Back"},
		},
		CustomFonts: []CustomFont{
			{Name: "My Font", Path: "/fonts/my-font.ttf", Family: "font-123"},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored Deck
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	el := restored.FrontStyles["default-front"].Elements[0]
	if len(el.Points) != 3 {
		t.Fatalf("shape points lost: got %d, want 3 (json: %s)", len(el.Points), data)
	}
	if el.Points[0] != (Point{X: 0.5, Y: 0}) {
		t.Errorf("shape point 0 = %+v, want {0.5 0}", el.Points[0])
	}
	if el.FillColor != "#cccccc" || el.StrokeColor != "#000000" || el.StrokeWidth != 2 {
		t.Errorf("shape style lost: fill=%q stroke=%q width=%v", el.FillColor, el.StrokeColor, el.StrokeWidth)
	}

	if len(restored.CustomFonts) != 1 {
		t.Fatalf("custom fonts lost: got %d, want 1 (json: %s)", len(restored.CustomFonts), data)
	}
	if restored.CustomFonts[0] != (CustomFont{Name: "My Font", Path: "/fonts/my-font.ttf", Family: "font-123"}) {
		t.Errorf("custom font mangled: %+v", restored.CustomFonts[0])
	}
}

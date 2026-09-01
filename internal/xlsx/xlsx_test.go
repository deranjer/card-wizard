package xlsx

import (
	"testing"

	"card_wizard/internal/deck"
)

func TestBuildWorkbookWritesHeadersAndRows(t *testing.T) {
	fields := []deck.FieldDefinition{{Name: "Title", Type: "text"}, {Name: "Art", Type: "image"}}
	cards := []deck.Card{
		{ID: "c1", Count: 3, FrontStyleID: "f", BackStyleID: "b", Data: map[string]any{"Title": "Ace", "Art": "images/ace.png"}},
		{ID: "c2", Count: 1, Data: map[string]any{"Title": "King"}},
	}

	f, err := BuildWorkbook([]Sheet{{Name: "Heroes", Fields: fields, Cards: cards}})
	if err != nil {
		t.Fatalf("BuildWorkbook: %v", err)
	}
	defer f.Close()

	if got := f.GetSheetList(); len(got) != 1 || got[0] != "Heroes" {
		t.Fatalf("sheet list = %v, want [Heroes]", got)
	}

	want := map[string]string{
		"A1": "ID", "B1": "Count", "C1": "Front Style", "D1": "Back Style", "E1": "Title", "F1": "Art",
		"A2": "c1", "B2": "3", "C2": "f", "D2": "b", "E2": "Ace", "F2": "images/ace.png",
		"A3": "c2", "B3": "1", "E3": "King", "F3": "",
	}
	for cell, exp := range want {
		got, err := f.GetCellValue("Heroes", cell)
		if err != nil {
			t.Fatalf("GetCellValue(%s): %v", cell, err)
		}
		if got != exp {
			t.Errorf("cell %s = %q, want %q", cell, got, exp)
		}
	}
}

func TestBuildWorkbookOneSheetPerDeckNoDefault(t *testing.T) {
	f, err := BuildWorkbook([]Sheet{{Name: "A"}, {Name: "B"}})
	if err != nil {
		t.Fatalf("BuildWorkbook: %v", err)
	}
	defer f.Close()

	got := f.GetSheetList()
	if len(got) != 2 || got[0] != "A" || got[1] != "B" {
		t.Fatalf("sheet list = %v, want [A B] with no Sheet1", got)
	}
}

func TestBuildWorkbookSheetNameSanitising(t *testing.T) {
	longName := "This deck name is definitely longer than thirty-one characters"
	f, err := BuildWorkbook([]Sheet{
		{Name: ""},
		{Name: "Bad:/\\[]*?Name"},
		{Name: longName},
		{Name: longName},
	})
	if err != nil {
		t.Fatalf("BuildWorkbook: %v", err)
	}
	defer f.Close()

	got := f.GetSheetList()
	if len(got) != 4 {
		t.Fatalf("want 4 sheets, got %v", got)
	}
	if got[0] != "Sheet 1" {
		t.Errorf("empty name -> %q, want %q", got[0], "Sheet 1")
	}
	if got[1] != "BadName" {
		t.Errorf("forbidden chars -> %q, want %q", got[1], "BadName")
	}
	for i, name := range got {
		if len(name) > maxSheetNameLen {
			t.Errorf("sheet %d name %q exceeds %d chars", i, name, maxSheetNameLen)
		}
	}
	if got[2] == got[3] {
		t.Errorf("duplicate long names not disambiguated: %q", got[2])
	}
}

func TestBuildWorkbookKeepsSheetNamedSheet1(t *testing.T) {
	f, err := BuildWorkbook([]Sheet{{Name: "Sheet1", Cards: []deck.Card{{ID: "x", Count: 1}}}})
	if err != nil {
		t.Fatalf("BuildWorkbook: %v", err)
	}
	defer f.Close()

	if got := f.GetSheetList(); len(got) != 1 || got[0] != "Sheet1" {
		t.Fatalf("sheet list = %v, want [Sheet1]", got)
	}
	v, err := f.GetCellValue("Sheet1", "A2")
	if err != nil || v != "x" {
		t.Errorf("A2 = %q (err %v), want %q", v, err, "x")
	}
}

func TestBuildWorkbookEmpty(t *testing.T) {
	f, err := BuildWorkbook(nil)
	if err != nil {
		t.Fatalf("BuildWorkbook(nil): %v", err)
	}
	defer f.Close()
	if got := f.GetSheetList(); len(got) != 1 {
		t.Errorf("empty workbook sheet list = %v, want one default sheet", got)
	}
}

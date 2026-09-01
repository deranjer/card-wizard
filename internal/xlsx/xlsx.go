// Package xlsx builds the Excel workbooks card-wizard exports. It centralises
// the header/row layout that ExportXLSX (one deck) and ExportGameXLSX (a whole
// game, one sheet per deck) previously duplicated, and it checks every excelize
// call so a failed cell write surfaces as an error instead of being dropped.
package xlsx

import (
	"fmt"
	"strings"

	"github.com/xuri/excelize/v2"

	"card_wizard/internal/deck"
)

// stdHeaders are the fixed columns written before a deck's custom fields.
var stdHeaders = []string{"ID", "Count", "Front Style", "Back Style"}

// invalidSheetChars are the characters Excel forbids in a worksheet name.
const invalidSheetChars = `[]:*?/\`

// maxSheetNameLen is Excel's worksheet-name length limit.
const maxSheetNameLen = 31

// Sheet is one deck's worth of tabular data destined for a single worksheet.
type Sheet struct {
	Name   string
	Fields []deck.FieldDefinition
	Cards  []deck.Card
}

// BuildWorkbook returns a workbook with one worksheet per sheet, in order. The
// first sheet is made active. Sheet names are sanitised for Excel (length
// limit, forbidden characters, uniqueness); an empty name becomes "Sheet N".
// With no sheets the default "Sheet1" is left in place so the file is valid.
func BuildWorkbook(sheets []Sheet) (*excelize.File, error) {
	f := excelize.NewFile()
	const defaultSheet = "Sheet1"

	used := make(map[string]bool, len(sheets))
	for i, s := range sheets {
		name := uniqueSheetName(s.Name, i, used)

		idx, err := f.NewSheet(name)
		if err != nil {
			return nil, fmt.Errorf("create sheet %q: %w", name, err)
		}
		if i == 0 {
			f.SetActiveSheet(idx)
		}
		if err := writeSheet(f, name, s.Fields, s.Cards); err != nil {
			return nil, err
		}
	}

	// Drop the auto-created default sheet unless a deck legitimately claimed
	// that name (in which case it now holds real data).
	if len(sheets) > 0 && !used[defaultSheet] {
		if err := f.DeleteSheet(defaultSheet); err != nil {
			return nil, fmt.Errorf("remove default sheet: %w", err)
		}
	}
	return f, nil
}

// writeSheet writes the header row and one row per card onto an existing sheet.
func writeSheet(f *excelize.File, sheet string, fields []deck.FieldDefinition, cards []deck.Card) error {
	headers := make([]any, 0, len(stdHeaders)+len(fields))
	for _, h := range stdHeaders {
		headers = append(headers, h)
	}
	for _, field := range fields {
		headers = append(headers, field.Name)
	}
	if err := writeRow(f, sheet, 1, headers); err != nil {
		return err
	}

	for i, card := range cards {
		row := make([]any, 0, len(stdHeaders)+len(fields))
		row = append(row, card.ID, card.Count, card.FrontStyleID, card.BackStyleID)
		for _, field := range fields {
			row = append(row, card.Data[field.Name])
		}
		if err := writeRow(f, sheet, i+2, row); err != nil {
			return err
		}
	}
	return nil
}

// writeRow writes values across rowNum starting at column A.
func writeRow(f *excelize.File, sheet string, rowNum int, values []any) error {
	for col, v := range values {
		cell, err := excelize.CoordinatesToCellName(col+1, rowNum)
		if err != nil {
			return fmt.Errorf("sheet %q cell (%d,%d): %w", sheet, col+1, rowNum, err)
		}
		if err := f.SetCellValue(sheet, cell, v); err != nil {
			return fmt.Errorf("sheet %q cell %s: %w", sheet, cell, err)
		}
	}
	return nil
}

// uniqueSheetName sanitises name for Excel and guarantees uniqueness within
// used, recording the result there.
func uniqueSheetName(name string, index int, used map[string]bool) string {
	base := sanitiseSheetName(name)
	if base == "" {
		base = fmt.Sprintf("Sheet %d", index+1)
	}

	candidate := base
	for n := 2; used[candidate]; n++ {
		suffix := fmt.Sprintf(" (%d)", n)
		trimmed := base
		if len(trimmed)+len(suffix) > maxSheetNameLen {
			trimmed = trimmed[:maxSheetNameLen-len(suffix)]
		}
		candidate = trimmed + suffix
	}
	used[candidate] = true
	return candidate
}

// sanitiseSheetName strips characters Excel rejects and clamps the length.
func sanitiseSheetName(name string) string {
	cleaned := strings.Map(func(r rune) rune {
		if strings.ContainsRune(invalidSheetChars, r) {
			return -1
		}
		return r
	}, name)
	cleaned = strings.TrimSpace(cleaned)
	if len(cleaned) > maxSheetNameLen {
		cleaned = strings.TrimSpace(cleaned[:maxSheetNameLen])
	}
	return cleaned
}

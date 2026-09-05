package game

import (
	_ "embed"
	"fmt"
	"strings"
)

// SchemaV1 is the versioned JSON Schema for game.json. It is embedded so
// callers that distribute the Go binary can expose the exact format contract
// without relying on a separate installed file.
//
//go:embed game-v1.schema.json
var SchemaV1 []byte

// Validate checks the invariants expressed by the current project schema.
// json.Unmarshal performs the field type checks; this function owns the
// cross-field and required-value checks that are meaningful after migrations.
func Validate(g Game) error {
	if g.SchemaVersion != CurrentSchemaVersion {
		return fmt.Errorf("unsupported schema version %d (expected %d)", g.SchemaVersion, CurrentSchemaVersion)
	}
	if strings.TrimSpace(g.Name) == "" {
		return fmt.Errorf("game name is required")
	}
	if len(g.Decks) == 0 {
		return fmt.Errorf("at least one deck is required")
	}
	for i, d := range g.Decks {
		if strings.TrimSpace(d.ID) == "" {
			return fmt.Errorf("decks[%d].id is required", i)
		}
		if strings.TrimSpace(d.Name) == "" {
			return fmt.Errorf("decks[%d].name is required", i)
		}
	}
	return nil
}

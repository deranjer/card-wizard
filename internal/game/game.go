package game

import (
	"encoding/json"
	"fmt"

	"card_wizard/internal/deck"
)

// CurrentSchemaVersion is the schema version written by this build. Bump it
// whenever game.json's shape changes and add a case to migrate().
const CurrentSchemaVersion = 1

type Game struct {
	SchemaVersion int         `json:"schemaVersion"`
	Name          string      `json:"name"`
	Decks         []deck.Deck `json:"decks"`
}

// Stamp marks the game with the current schema version. Call before saving.
func (g *Game) Stamp() {
	g.SchemaVersion = CurrentSchemaVersion
}

// Load parses game.json bytes into a Game, running migrations for older
// schema versions. A document with a non-empty "decks" array is a Game; one
// without is treated as a bare Deck (the pre-1.0 save format) and wrapped in a
// single-deck game.
func Load(data []byte) (Game, error) {
	var versionProbe struct {
		SchemaVersion int `json:"schemaVersion"`
	}
	if err := json.Unmarshal(data, &versionProbe); err != nil {
		return Game{}, fmt.Errorf("invalid game.json: %w", err)
	}
	if versionProbe.SchemaVersion > CurrentSchemaVersion {
		return Game{}, fmt.Errorf("game.json uses newer schema version %d; this build supports up to %d", versionProbe.SchemaVersion, CurrentSchemaVersion)
	}

	var probe struct {
		Decks json.RawMessage `json:"decks"`
	}
	if err := json.Unmarshal(data, &probe); err != nil {
		return Game{}, fmt.Errorf("invalid game.json: %w", err)
	}

	if len(probe.Decks) > 0 && string(probe.Decks) != "null" {
		var g Game
		if err := json.Unmarshal(data, &g); err != nil {
			return Game{}, fmt.Errorf("invalid game.json: %w", err)
		}
		g = migrate(g)
		if err := Validate(g); err != nil {
			return Game{}, fmt.Errorf("invalid game.json: %w", err)
		}
		return g, nil
	}

	// No decks -> bare Deck document.
	var d deck.Deck
	if err := json.Unmarshal(data, &d); err != nil {
		return Game{}, fmt.Errorf("not a game or deck document: %w", err)
	}
	if d.ID == "" {
		d.ID = "deck-1"
	}
	g := migrate(Game{Name: d.Name, Decks: []deck.Deck{d}})
	if err := Validate(g); err != nil {
		return Game{}, fmt.Errorf("invalid deck document: %w", err)
	}
	return g, nil
}

// migrate brings a decoded game up to CurrentSchemaVersion. Each case falls
// through to the next so a very old file walks every step.
func migrate(g Game) Game {
	switch {
	case g.SchemaVersion < 1:
		// v0 (pre-versioning) -> v1: no structural change; backfill deck ids
		// that some early saves lacked.
		for i := range g.Decks {
			if g.Decks[i].ID == "" {
				g.Decks[i].ID = fmt.Sprintf("deck-%d", i+1)
			}
		}
		g.SchemaVersion = 1
		fallthrough
	default:
		// Already current.
	}
	return g
}

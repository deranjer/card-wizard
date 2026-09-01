package game

import (
	"encoding/json"
	"testing"

	"card_wizard/internal/deck"
)

func TestLoadCurrentVersionRoundTrips(t *testing.T) {
	orig := Game{
		SchemaVersion: CurrentSchemaVersion,
		Name:          "My Game",
		Decks:         []deck.Deck{{ID: "d1", Name: "Deck 1"}, {ID: "d2", Name: "Deck 2"}},
	}
	data, _ := json.Marshal(orig)

	got, err := Load(data)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got.Name != "My Game" || len(got.Decks) != 2 || got.SchemaVersion != CurrentSchemaVersion {
		t.Fatalf("round trip mismatch: %+v", got)
	}
}

func TestLoadMigratesUnversionedGame(t *testing.T) {
	// A pre-versioning save: no schemaVersion, one deck missing its id.
	raw := `{"name":"Old","decks":[{"name":"A"},{"id":"keep","name":"B"}]}`

	g, err := Load([]byte(raw))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if g.SchemaVersion != CurrentSchemaVersion {
		t.Errorf("schema not stamped: %d", g.SchemaVersion)
	}
	if g.Decks[0].ID != "deck-1" {
		t.Errorf("missing deck id not backfilled: %q", g.Decks[0].ID)
	}
	if g.Decks[1].ID != "keep" {
		t.Errorf("existing deck id clobbered: %q", g.Decks[1].ID)
	}
}

func TestLoadWrapsBareDeck(t *testing.T) {
	raw := `{"id":"solo","name":"Just A Deck","cards":[],"frontStyles":{},"backStyles":{}}`

	g, err := Load([]byte(raw))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(g.Decks) != 1 || g.Decks[0].ID != "solo" || g.Name != "Just A Deck" {
		t.Fatalf("bare deck not wrapped: %+v", g)
	}
	if g.SchemaVersion != CurrentSchemaVersion {
		t.Errorf("wrapped deck not stamped: %d", g.SchemaVersion)
	}
}

func TestLoadRejectsGarbage(t *testing.T) {
	if _, err := Load([]byte(`not json at all`)); err == nil {
		t.Fatal("expected error for non-JSON input")
	}
}

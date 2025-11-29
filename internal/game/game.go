package game

import "card_wizard/internal/deck"

type Game struct {
	Name  string      `json:"name"`
	Decks []deck.Deck `json:"decks"`
}

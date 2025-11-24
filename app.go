package main

import (
	"context"
	"fmt"

	"card_wizard/internal/cards"
)

// App struct
type App struct {
	ctx      context.Context
	cardsSvc *cards.Service
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		cardsSvc: cards.NewService(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// SampleDeck returns sample card data sourced from the card service.
func (a *App) SampleDeck() []cards.Card {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	return a.cardsSvc.SampleDeck(ctx)
}

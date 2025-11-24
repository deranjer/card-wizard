package cards

import "context"

// Card represents a single printable card definition.
type Card struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Copies      int    `json:"copies"`
}

// Service manages card definitions and orchestrates import/export logic.
type Service struct{}

// NewService creates a new card service instance.
func NewService() *Service {
	return &Service{}
}

// SampleDeck returns placeholder data so the UI can render while the XLSX pipeline is built.
func (s *Service) SampleDeck(_ context.Context) []Card {
	return []Card{
		{
			ID:          "card-1",
			Name:        "Sample Attack",
			Description: "Demonstrates backend → frontend binding.",
			Copies:      2,
		},
		{
			ID:          "card-2",
			Name:        "Sample Defense",
			Description: "Replace with data imported from spreadsheets soon.",
			Copies:      2,
		},
	}
}

import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, it, expect, vi } from 'vitest';
import { SpreadsheetView } from './SpreadsheetView';
import { makeDefaultDeck } from '../types';
import type { Card, Deck } from '../types';

vi.mock('../../wailsjs/go/main/App', () => ({
  SelectImageFile: vi.fn(),
  AddProjectImage: vi.fn(),
}));

const card = (id: string, data: Record<string, unknown> = {}): Card => ({
  id,
  data,
  count: 1,
  frontStyleId: 'default-front',
  backStyleId: 'default-back',
});

function renderView(deck: Deck) {
  const setDeck = vi.fn();
  render(
    <MantineProvider>
      <SpreadsheetView deck={deck} setDeck={setDeck} />
    </MantineProvider>
  );
  return { setDeck };
}

describe('SpreadsheetView', () => {
  it('edits a single cell without touching sibling card references', () => {
    const deck = makeDefaultDeck({
      fields: [{ name: 'Title', type: 'text' }],
      cards: [card('a', { Title: 'Alpha' }), card('b', { Title: 'Bravo' })],
    });
    const { setDeck } = renderView(deck);

    const alphaInput = screen.getByDisplayValue('Alpha');
    fireEvent.change(alphaInput, { target: { value: 'Alpha!' } });
    fireEvent.blur(alphaInput); // text cells commit on blur (or after a debounce)

    expect(setDeck).toHaveBeenCalledTimes(1);
    const next: Deck = setDeck.mock.calls[0][0];
    expect(next.cards[0].data.Title).toBe('Alpha!');
    // Untouched row keeps its exact object reference -> memoised row won't re-render.
    expect(next.cards[1]).toBe(deck.cards[1]);
  });

  it('rejects a duplicate id and does not commit', () => {
    const deck = makeDefaultDeck({ cards: [card('a'), card('b')] });
    const { setDeck } = renderView(deck);

    const idInput = screen.getByDisplayValue('b');
    fireEvent.change(idInput, { target: { value: 'a' } });
    fireEvent.blur(idInput);

    // Rejected by the uniqueness check: nothing committed to the parent.
    expect(setDeck).not.toHaveBeenCalled();
  });

  it('renders one header cell per field', () => {
    const deck = makeDefaultDeck({
      fields: [
        { name: 'Cost', type: 'text' },
        { name: 'Art', type: 'image' },
      ],
      cards: [card('a')],
    });
    renderView(deck);
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Art')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, it, expect, vi } from 'vitest';
import { StyleEditor } from './StyleEditor';
import { makeDefaultDeck } from '../types';
import type { Deck } from '../types';

vi.mock('../../wailsjs/go/main/App', () => ({
  LoadImageAsDataURL: vi.fn(),
}));

function renderEditor(deck: Deck) {
  const setDeck = vi.fn();
  render(
    <MantineProvider>
      <StyleEditor deck={deck} setDeck={setDeck} />
    </MantineProvider>
  );
  return { setDeck };
}

describe('StyleEditor', () => {
  it('renders the three panels for a deck with a default style', () => {
    renderEditor(makeDefaultDeck());
    expect(screen.getByText('Layers')).toBeInTheDocument();
    expect(screen.getByText('Add Elements')).toBeInTheDocument();
    expect(screen.getByText('Live Preview Overlay')).toBeInTheDocument();
  });

  it('adding a text element pushes an updated deck to the parent exactly once', () => {
    const { setDeck } = renderEditor(makeDefaultDeck());

    fireEvent.click(screen.getByText('Add Text'));

    expect(setDeck).toHaveBeenCalledTimes(1);
    const next: Deck = setDeck.mock.calls[0][0];
    expect(next.frontStyles['default-front'].elements).toHaveLength(1);
    expect(next.frontStyles['default-front'].elements[0].type).toBe('text');
  });

  it('does not echo the parent deck straight back on mount', () => {
    const { setDeck } = renderEditor(makeDefaultDeck());
    // The old bidirectional sync fired setExternalDeck on mount; it must not now.
    expect(setDeck).not.toHaveBeenCalled();
  });
});

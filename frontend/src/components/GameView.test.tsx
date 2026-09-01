import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { createStore, Provider } from 'jotai';
import { describe, it, expect, vi } from 'vitest';
import { GameView } from './GameView';
import { gameAtom, activeDeckIdAtom } from '../store/game';
import { makeDefaultGame } from '../types';

// Wails bindings hit window.go.* which does not exist under jsdom. They are only
// invoked on user actions, not on render, but stub the namespace defensively.
vi.mock('../../wailsjs/go/main/App', () => ({
  SaveGame: vi.fn(),
  LoadGame: vi.fn(),
  NewGame: vi.fn(),
  SaveImages: vi.fn(),
  ExportGameXLSX: vi.fn(),
}));

describe('GameView', () => {
  it('renders the shell wired to the game store', () => {
    const store = createStore();
    const game = makeDefaultGame();
    store.set(gameAtom, game);

    render(
      <MantineProvider>
        <Provider store={store}>
          <GameView />
        </Provider>
      </MantineProvider>
    );

    expect(screen.getByText('Deck Details')).toBeInTheDocument();
    expect(screen.getByText('Card Design')).toBeInTheDocument();
    // Active deck id resolves from the store even without an explicit selection.
    expect(store.get(activeDeckIdAtom)).toBe(game.decks[0].id);
  });
});

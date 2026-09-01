import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { createStore, Provider } from 'jotai';
import { describe, it, expect, vi } from 'vitest';
import { GameView } from './GameView';
import { gameAtom, activeDeckIdAtom } from '../store/game';
import { makeDefaultGame } from '../types';

// Wails bindings hit window.go.* which does not exist under jsdom. GameView
// mounts every tab panel, so stub the whole namespace with no-op promises.
vi.mock('../../wailsjs/go/main/App', () => {
  const noop = () => vi.fn(() => Promise.resolve());
  return {
    AddProjectImage: noop(),
    AddProjectImages: noop(),
    DeleteProjectImage: noop(),
    ExportGameXLSX: noop(),
    ExportXLSX: noop(),
    GeneratePDF: noop(),
    GetExcelHeaders: noop(),
    GetPDFLayout: noop(),
    ImportCardsWithMapping: noop(),
    ListProjectImages: noop(),
    LoadGame: noop(),
    LoadImageAsDataURL: noop(),
    NewGame: noop(),
    OpenAssetFolder: noop(),
    ReplaceProjectImage: noop(),
    ResolveImagePath: noop(),
    SaveGame: noop(),
    SaveImages: noop(),
    SelectExcelFile: noop(),
    SelectFontFile: noop(),
    SelectImageFile: noop(),
    SelectImageFiles: noop(),
  };
});

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

import { atom } from 'jotai';
import type { Deck, Game } from '../types';
import { makeDefaultDeck, makeDefaultGame } from '../types';

/**
 * The whole game document — the single source of truth for the app.
 *
 * Components subscribe to narrow slices (`activeDeckAtom`, per-field selectors)
 * rather than the whole object, so an edit in one place only re-renders the
 * components that actually depend on what changed.
 */
export const gameAtom = atom<Game>(makeDefaultGame());

/** Which top-level tab is visible. */
export const activeTabAtom = atom<string | null>('details');

// Internal primitive; `null` means "no explicit selection yet".
const explicitActiveDeckId = atom<string | null>(null);

/**
 * Id of the deck shown in the tab panels. Reads always resolve to a real id:
 * the explicit selection when set, otherwise the first deck.
 */
export const activeDeckIdAtom = atom(
  (get) => get(explicitActiveDeckId) ?? get(gameAtom).decks[0]?.id ?? '',
  (_get, set, id: string) => set(explicitActiveDeckId, id)
);

/**
 * The active deck resolved against the game. Falls back to the first deck when
 * the id is stale (right after a load or a delete).
 */
export const activeDeckAtom = atom((get) => {
  const game = get(gameAtom);
  const id = get(activeDeckIdAtom);
  return game.decks.find((d) => d.id === id) ?? game.decks[0];
});

/** Replace one deck (matched by id) in the game. */
export const updateDeckAtom = atom(null, (get, set, updated: Deck) => {
  const game = get(gameAtom);
  set(gameAtom, {
    ...game,
    decks: game.decks.map((d) => (d.id === updated.id ? updated : d)),
  });
});

/** Rename the game. */
export const renameGameAtom = atom(null, (get, set, name: string) => {
  set(gameAtom, { ...get(gameAtom), name });
});

/** Append a fresh deck and make it active. */
export const addDeckAtom = atom(null, (get, set) => {
  const game = get(gameAtom);
  const deck = makeDefaultDeck({ name: `New Deck ${game.decks.length + 1}` });
  set(gameAtom, { ...game, decks: [...game.decks, deck] });
  set(activeDeckIdAtom, deck.id);
});

/**
 * Remove a deck by id. No-op (returns false) when it is the last remaining
 * deck; when the removed deck was active, selection moves to the first deck.
 */
export const deleteDeckAtom = atom(null, (get, set, id: string): boolean => {
  const game = get(gameAtom);
  if (game.decks.length <= 1) return false;
  const decks = game.decks.filter((d) => d.id !== id);
  set(gameAtom, { ...game, decks });
  if (get(activeDeckIdAtom) === id) set(activeDeckIdAtom, decks[0].id);
  return true;
});

/** Replace the entire game (new game / loaded game) and reset the selection. */
export const setGameAtom = atom(null, (_get, set, game: Game) => {
  set(gameAtom, game);
  set(activeDeckIdAtom, game.decks[0]?.id ?? '');
});

/** Convenience for "File → New Game". */
export const resetGameAtom = atom(null, (_get, set) => {
  set(setGameAtom, makeDefaultGame());
  set(activeTabAtom, 'details');
});

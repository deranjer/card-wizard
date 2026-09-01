import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { makeDefaultDeck } from '../types';
import {
  gameAtom,
  activeDeckIdAtom,
  activeDeckAtom,
  updateDeckAtom,
  renameGameAtom,
  addDeckAtom,
  deleteDeckAtom,
  setGameAtom,
} from './game';

describe('makeDefaultDeck', () => {
  it('returns brand-new nested objects each call (no shared mutable state)', () => {
    const a = makeDefaultDeck();
    const b = makeDefaultDeck();
    expect(a.id).not.toBe(b.id);
    expect(a.frontStyles).not.toBe(b.frontStyles);
    expect(a.backStyles).not.toBe(b.backStyles);
    expect(a.cards).not.toBe(b.cards);
    expect(a.fields).not.toBe(b.fields);

    // Mutating one must not affect the other.
    a.cards.push({ id: 'x', data: {}, count: 1, frontStyleId: '', backStyleId: '' });
    expect(b.cards).toHaveLength(0);
  });

  it('applies overrides', () => {
    expect(makeDefaultDeck({ name: 'Custom', width: 100 })).toMatchObject({
      name: 'Custom',
      width: 100,
    });
  });
});

describe('game store', () => {
  it('activeDeckAtom falls back to the first deck when the id is stale', () => {
    const store = createStore();
    const first = store.get(gameAtom).decks[0];
    store.set(activeDeckIdAtom, 'does-not-exist');
    expect(store.get(activeDeckAtom)).toBe(first);
  });

  it('updateDeckAtom replaces only the targeted deck', () => {
    const store = createStore();
    store.set(addDeckAtom);
    const [d1, d2] = store.get(gameAtom).decks;

    store.set(updateDeckAtom, { ...d2, name: 'Renamed' });

    const decks = store.get(gameAtom).decks;
    expect(decks[0]).toBe(d1); // untouched reference
    expect(decks[1].name).toBe('Renamed');
  });

  it('addDeckAtom appends and activates the new deck', () => {
    const store = createStore();
    store.set(addDeckAtom);
    const decks = store.get(gameAtom).decks;
    expect(decks).toHaveLength(2);
    expect(store.get(activeDeckIdAtom)).toBe(decks[1].id);
  });

  it('deleteDeckAtom refuses the last deck and reassigns selection otherwise', () => {
    const store = createStore();
    expect(store.set(deleteDeckAtom, store.get(gameAtom).decks[0].id)).toBe(false);

    store.set(addDeckAtom);
    const [d1, d2] = store.get(gameAtom).decks;
    store.set(activeDeckIdAtom, d2.id);

    expect(store.set(deleteDeckAtom, d2.id)).toBe(true);
    expect(store.get(gameAtom).decks).toEqual([d1]);
    expect(store.get(activeDeckIdAtom)).toBe(d1.id);
  });

  it('setGameAtom swaps the document and resets selection', () => {
    const store = createStore();
    const fresh = { name: 'Loaded', decks: [makeDefaultDeck(), makeDefaultDeck()] };
    store.set(setGameAtom, fresh);
    expect(store.get(gameAtom)).toBe(fresh);
    expect(store.get(activeDeckIdAtom)).toBe(fresh.decks[0].id);
  });

  it('renameGameAtom updates only the name', () => {
    const store = createStore();
    const decks = store.get(gameAtom).decks;
    store.set(renameGameAtom, 'My Game');
    expect(store.get(gameAtom).name).toBe('My Game');
    expect(store.get(gameAtom).decks).toBe(decks);
  });
});

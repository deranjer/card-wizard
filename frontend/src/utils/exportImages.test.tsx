import { describe, it, expect, vi } from 'vitest';
import { makeDefaultDeck } from '../types';
import type { Card } from '../types';

// html2canvas-pro touches canvas APIs jsdom lacks; stub it and the React root.
vi.mock('html2canvas-pro', () => ({
  default: vi.fn(async () => ({ toDataURL: () => 'data:image/png;base64,STUB' })),
}));
vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: vi.fn(), unmount: vi.fn() }),
}));

const card = (id: string): Card => ({
  id,
  data: {},
  count: 1,
  frontStyleId: 'default-front',
  backStyleId: 'default-back',
});

describe('exportDecksToImages', () => {
  it('emits a front and back PNG per card', async () => {
    const { exportDecksToImages } = await import('./exportImages');
    const deck = makeDefaultDeck({ cards: [card('a'), card('b')] });

    const images = await exportDecksToImages([deck]);

    expect(Object.keys(images).sort()).toEqual([
      'a-back.png',
      'a-front.png',
      'b-back.png',
      'b-front.png',
    ]);
    expect(images['a-front.png']).toBe('data:image/png;base64,STUB');
  });

  it('prefixes filenames with the deck name for multi-deck exports', async () => {
    const { exportDecksToImages } = await import('./exportImages');
    const d1 = makeDefaultDeck({ name: 'Heroes', cards: [card('x')] });
    const d2 = makeDefaultDeck({ name: 'Villains', cards: [card('x')] });

    const images = await exportDecksToImages([d1, d2], { prefixWithDeckName: true });

    expect(Object.keys(images).sort()).toEqual([
      'Heroes-x-back.png',
      'Heroes-x-front.png',
      'Villains-x-back.png',
      'Villains-x-front.png',
    ]);
  });
});

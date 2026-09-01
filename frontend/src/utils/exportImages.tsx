import type { Deck } from '../types';
import { CardRender } from '../components/CardRender';

interface ExportOptions {
  /** Prefix each filename with the deck name (used for multi-deck exports). */
  prefixWithDeckName?: boolean;
  /** html2canvas output scale. */
  scale?: number;
}

/**
 * Rasterise every card (front and back) of the given decks to PNG data URLs.
 *
 * Each card side is mounted off-screen with its own React root, captured with
 * html2canvas-pro, then unmounted. Runs sequentially to keep peak memory
 * bounded. Returns `{ "<name>.png": "data:image/png;base64,..." }`.
 *
 * Previously this loop was copy-pasted in three places (GameView twice,
 * DeckExport once); this is the single implementation.
 */
export async function exportDecksToImages(
  decks: Deck[],
  { prefixWithDeckName = false, scale = 2 }: ExportOptions = {}
): Promise<Record<string, string>> {
  const { createRoot } = await import('react-dom/client');
  const html2canvas = (await import('html2canvas-pro')).default;

  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:fit-content';
  document.body.appendChild(container);

  const images: Record<string, string> = {};

  const capture = async (deck: Deck, card: Deck['cards'][number], side: 'front' | 'back') => {
    const host = document.createElement('div');
    container.appendChild(host);
    const root = createRoot(host);
    try {
      await new Promise<void>((resolve) => {
        root.render(
          <div style={{ width: 'fit-content', height: 'fit-content', background: 'white' }}>
            <CardRender deck={deck} card={card} mode={side} scale={1} />
          </div>
        );
        // Give React a commit + the browser a layout pass before capture.
        setTimeout(resolve, 100);
      });
      const canvas = await html2canvas(host.firstChild as HTMLElement, {
        backgroundColor: null,
        logging: false,
        useCORS: true,
        scale,
      });
      const prefix = prefixWithDeckName ? `${deck.name}-` : '';
      images[`${prefix}${card.id}-${side}.png`] = canvas.toDataURL('image/png');
    } finally {
      root.unmount();
      container.removeChild(host);
    }
  };

  try {
    for (const deck of decks) {
      for (const card of deck.cards) {
        await capture(deck, card, 'front');
        await capture(deck, card, 'back');
      }
    }
  } finally {
    document.body.removeChild(container);
  }

  return images;
}

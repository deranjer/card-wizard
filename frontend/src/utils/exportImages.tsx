import type { Deck } from '../types';
import { CardRender } from '../components/CardRender';

export interface RenderedFace {
  deckName: string;
  cardId: string;
  side: 'front' | 'back';
  dataUrl: string;
}

interface RenderOptions {
  /** html2canvas output scale. */
  scale?: number;
  /** Called after each face is captured, for progress UI. */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Rasterise every card face (front + back) of the given decks to PNG data URLs.
 *
 * Each face is mounted off-screen with its own React root, captured with
 * html2canvas-pro, then unmounted. Runs sequentially to keep peak memory
 * bounded. This is the single implementation shared by the image export and
 * the print preview (which previously kept an always-mounted hidden render
 * tree and rendered one sample card *per style*, so cards sharing a style but
 * with different data all printed identically).
 */
export async function renderDeckFaces(
  decks: Deck[],
  { scale = 2, onProgress }: RenderOptions = {}
): Promise<RenderedFace[]> {
  const { createRoot } = await import('react-dom/client');
  const html2canvas = (await import('html2canvas-pro')).default;

  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:fit-content';
  document.body.appendChild(container);

  const total = decks.reduce((n, d) => n + d.cards.length * 2, 0);
  const faces: RenderedFace[] = [];
  let done = 0;

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
      faces.push({
        deckName: deck.name,
        cardId: card.id,
        side,
        dataUrl: canvas.toDataURL('image/png'),
      });
    } finally {
      root.unmount();
      container.removeChild(host);
      onProgress?.(++done, total);
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

  return faces;
}

/**
 * Convenience wrapper for "save every card as a PNG file": returns a
 * `{ "<name>.png": dataURL }` map ready for the `SaveImages` binding.
 */
export async function exportDecksToImages(
  decks: Deck[],
  { prefixWithDeckName = false, scale = 2 }: { prefixWithDeckName?: boolean; scale?: number } = {}
): Promise<Record<string, string>> {
  const faces = await renderDeckFaces(decks, { scale });
  const images: Record<string, string> = {};
  for (const f of faces) {
    const prefix = prefixWithDeckName ? `${f.deckName}-` : '';
    images[`${prefix}${f.cardId}-${f.side}.png`] = f.dataUrl;
  }
  return images;
}

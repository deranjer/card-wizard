import { memo, type CSSProperties } from 'react';
import { Card as CardType, Deck, CardLayout, LayoutElement } from '../types';
import { ImageLoader } from './ImageLoader';

interface CardRenderProps {
  card: CardType;
  deck: Deck;
  mode: 'front' | 'back';
  scale?: number;
  border?: boolean;
  className?: string;
}

const MM_TO_PX = 3.7795275591;

function resolveLayout(deck: Deck, card: CardType, mode: 'front' | 'back'): CardLayout {
  const styles = mode === 'front' ? deck.frontStyles : deck.backStyles;
  let id = mode === 'front' ? card.frontStyleId : card.backStyleId;

  if (!id || !styles[id]) {
    const defaultId =
      mode === 'front'
        ? deck.defaultFrontStyleId || 'default-front'
        : deck.defaultBackStyleId || 'default-back';
    id = styles[defaultId] ? defaultId : Object.keys(styles)[0];
  }
  return styles[id] || { name: 'default', elements: [] };
}

function elementStyle(el: LayoutElement, scale: number): CSSProperties {
  return {
    position: 'absolute',
    left: el.x * MM_TO_PX * scale,
    top: el.y * MM_TO_PX * scale,
    width: el.width * MM_TO_PX * scale,
    height: el.height * MM_TO_PX * scale,
    fontSize: (el.fontSize || 12) * scale,
    color: el.color || '#000000',
    fontFamily: el.fontFamily || 'Arial, sans-serif',
    fontWeight: el.fontWeight || 'normal',
    fontStyle: el.fontStyle || 'normal',
    textDecoration: el.textDecoration || 'none',
    display: 'flex',
    alignItems:
      el.verticalAlign === 'top'
        ? 'flex-start'
        : el.verticalAlign === 'bottom'
          ? 'flex-end'
          : 'center',
    justifyContent:
      el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center',
    textAlign: el.textAlign || 'center',
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
  };
}

function CardRenderImpl({
  card,
  deck,
  mode,
  scale = 1,
  border = true,
  className,
}: CardRenderProps) {
  const layout = resolveLayout(deck, card, mode);

  return (
    <div
      className={className}
      style={{
        width: deck.width * MM_TO_PX * scale,
        height: deck.height * MM_TO_PX * scale,
        border: border ? '1px solid #ccc' : 'none',
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {layout.elements.map((el) => (
        <div key={el.id} style={elementStyle(el, scale)}>
          {el.type === 'image' ? (
            el.field && card.data[el.field] ? (
              <ImageLoader
                path={card.data[el.field]}
                style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'contain' }}
              />
            ) : el.staticText ? (
              <ImageLoader
                path={el.staticText}
                style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'contain' }}
              />
            ) : null
          ) : el.type === 'shape' && el.points ? (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <polygon
                points={el.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                fill={el.fillColor || '#cccccc'}
                stroke={el.strokeColor || 'none'}
                strokeWidth={el.strokeWidth || 0}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : el.field ? (
            card.data[el.field]
          ) : (
            el.staticText
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders a card face as positioned DOM. Memoised: in the preview grid (and the
 * style-editor overlay) the parent re-renders for reasons unrelated to a given
 * card — a modal opening, a zoom slider — and a plain function component would
 * re-reconcile every element of every card each time.
 */
export const CardRender = memo(CardRenderImpl);

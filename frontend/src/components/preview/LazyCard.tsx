import { memo, useEffect, useRef, useState } from 'react';
import { Text } from '@mantine/core';
import type { Deck } from '../../types';
import { CardRender } from '../CardRender';

const MM_TO_PX = 3.7795275591;

interface LazyCardProps {
  card: Deck['cards'][number];
  deck: Deck;
  mode: 'front' | 'back';
  index: number;
  onClick: (index: number) => void;
}

/**
 * A grid cell that only mounts its (relatively expensive) `<CardRender>` once
 * it scrolls near the viewport, and keeps it mounted afterwards. Lets the
 * preview grid hold hundreds of cards without rendering — or firing the image
 * requests for — all of them up front.
 */
export const LazyCard = memo(function LazyCard({
  card,
  deck,
  mode,
  index,
  onClick,
}: LazyCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} onClick={() => onClick(index)} style={{ cursor: 'pointer' }}>
      <div
        style={{
          minHeight: deck.height * MM_TO_PX,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {visible ? (
          <CardRender card={card} deck={deck} mode={mode} scale={1} />
        ) : (
          <div
            style={{
              width: deck.width * MM_TO_PX,
              background: '#f1f3f5',
              flex: '0 0 auto',
              height: '100%',
            }}
          />
        )}
      </div>
      <Text size="xs" ta="center" mt={4} c="dimmed">
        {card.id} (x{card.count || 1})
      </Text>
    </div>
  );
});

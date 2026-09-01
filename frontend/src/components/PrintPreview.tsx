import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Box,
  LoadingOverlay,
  Button,
  Stack,
  Checkbox,
  SegmentedControl,
  ActionIcon,
} from '@mantine/core';
import { Deck, PDFLayout } from '../types';
import { GetPDFLayout, GeneratePDF } from '../../wailsjs/go/main/App';
import { notifications } from '@mantine/notifications';
import { IconHelp } from '@tabler/icons-react';

interface PrintPreviewProps {
  deck: Deck;
  onNavigateToHelp?: (section: string) => void;
}

interface RenderedCardImage {
  cardId: string;
  side: 'front' | 'back';
  image: string;
}

const MM_TO_PX = 3.7795275591;

export function PrintPreview({ deck, onNavigateToHelp }: PrintPreviewProps) {
  const [layout, setLayout] = useState<PDFLayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const [showCutGuides, setShowCutGuides] = useState(false);
  const [previewMode, setPreviewMode] = useState<'front' | 'back'>('front');
  const [renderedImages, setRenderedImages] = useState<RenderedCardImage[]>([]);

  // The Go layout calc only reads size + paper, so don't re-fetch on unrelated
  // deck edits (it used to fire on every keystroke while this tab was open).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    GetPDFLayout(deck as any)
      .then((result) => {
        if (!cancelled) setLayout(result);
      })
      .catch((error) => console.error('Failed to get PDF layout:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.width, deck.height, deck.paperSize]);

  // Invalidate a stale preview when the cards or styles change.
  useEffect(() => {
    setPreviewGenerated(false);
    setRenderedImages([]);
  }, [deck.cards, deck.frontStyles, deck.backStyles]);

  const handleGeneratePreview = async () => {
    setGenerating(true);
    notifications.show({
      id: 'print-preview',
      title: 'Rendering',
      message: 'Rendering cards…',
      loading: true,
      autoClose: false,
    });
    try {
      const { renderDeckFaces } = await import('../utils/exportImages');
      const faces = await renderDeckFaces([deck], {
        onProgress: (done, total) =>
          notifications.update({
            id: 'print-preview',
            title: 'Rendering',
            message: `Rendering cards… ${done}/${total}`,
            loading: true,
            autoClose: false,
          }),
      });
      setRenderedImages(faces.map((f) => ({ cardId: f.cardId, side: f.side, image: f.dataUrl })));
      setPreviewGenerated(true);
      notifications.update({
        id: 'print-preview',
        title: 'Success',
        message: 'Preview generated',
        color: 'green',
        loading: false,
        autoClose: 2500,
      });
    } catch (err) {
      console.error('Preview generation error:', err);
      notifications.update({
        id: 'print-preview',
        title: 'Error',
        message: 'Failed to generate preview',
        color: 'red',
        loading: false,
        autoClose: 3000,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!previewGenerated || renderedImages.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please generate preview first',
        color: 'red',
      });
      return;
    }
    try {
      await GeneratePDF({
        ...deck,
        renderedCards: renderedImages,
        drawCutGuides: showCutGuides,
      } as any);
      notifications.show({ title: 'Success', message: 'PDF generated successfully' });
    } catch (err) {
      console.error('PDF generation error:', err);
      notifications.show({ title: 'Error', message: 'Failed to generate PDF', color: 'red' });
    }
  };

  if (!layout || loading) {
    return <LoadingOverlay visible={true} />;
  }

  const previewScale = 0.8;
  const totalCards = deck.cards.reduce((sum, card) => sum + (card.count || 1), 0);
  const cardsPerPage = layout.cardsPerRow * layout.cardsPerCol;
  const totalPages = Math.ceil(totalCards / cardsPerPage) * 2;

  // Expand by count, then take the first page's worth.
  const pageCards: Deck['cards'] = [];
  for (const card of deck.cards) {
    for (let i = 0; i < (card.count || 1) && pageCards.length < cardsPerPage; i++) {
      pageCards.push(card);
    }
    if (pageCards.length >= cardsPerPage) break;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group>
          <div>
            <Title order={2}>Print Preview</Title>
            <Text size="sm" c="dimmed">
              {layout.cardsPerRow} × {layout.cardsPerCol} cards per page • {totalPages} total pages
            </Text>
          </div>
          {onNavigateToHelp && (
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={() => onNavigateToHelp('print')}
              title="Help for this tab"
            >
              <IconHelp size={18} />
            </ActionIcon>
          )}
        </Group>
        <Group>
          {!previewGenerated && (
            <Button onClick={handleGeneratePreview} loading={generating} size="lg">
              Generate Preview
            </Button>
          )}
          {previewGenerated && (
            <Button onClick={handleGeneratePDF} size="lg" color="green">
              Generate PDF
            </Button>
          )}
        </Group>
      </Group>

      {previewGenerated && (
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <Title order={3}>Layout Preview</Title>
              <Checkbox
                label="Show cut guides"
                checked={showCutGuides}
                onChange={(e) => setShowCutGuides(e.currentTarget.checked)}
              />
            </Group>
            <SegmentedControl
              value={previewMode}
              onChange={(value) => setPreviewMode(value as 'front' | 'back')}
              data={[
                { label: 'Front Page', value: 'front' },
                { label: 'Back Page', value: 'back' },
              ]}
            />
          </Group>

          <Group mb="lg">
            <Text size="sm">Paper: {deck.paperSize === 'a4' ? 'A4' : 'Letter'}</Text>
            <Text size="sm">
              Cards per page: {cardsPerPage} ({layout.cardsPerRow} × {layout.cardsPerCol})
            </Text>
            <Text size="sm">
              Card Size: {deck.width}mm × {deck.height}mm
            </Text>
            <Text size="sm">
              Margins: {layout.marginLeft.toFixed(1)}mm x {layout.marginTop.toFixed(1)}mm
            </Text>
            <Text size="sm">Spacing: {layout.spacing}mm</Text>
            <Text size="sm" c="blue">
              Duplex: Long-edge
            </Text>
          </Group>

          <Box
            style={{
              width: '100%',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#f1f3f5',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: layout.pageWidth * MM_TO_PX * previewScale,
                height: layout.pageHeight * MM_TO_PX * previewScale,
                backgroundColor: 'white',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: layout.marginLeft * MM_TO_PX * previewScale,
                  top: layout.marginTop * MM_TO_PX * previewScale,
                  right: layout.marginLeft * MM_TO_PX * previewScale,
                  bottom: layout.marginTop * MM_TO_PX * previewScale,
                  border: '1px dashed #dee2e6',
                  pointerEvents: 'none',
                }}
              />

              {pageCards.map((card, index) => {
                const row = Math.floor(index / layout.cardsPerRow);
                const col = index % layout.cardsPerRow;
                const displayCol = previewMode === 'back' ? layout.cardsPerRow - 1 - col : col;

                const x =
                  (layout.marginLeft + displayCol * (layout.cardWidth + layout.spacing)) *
                  MM_TO_PX *
                  previewScale;
                const y =
                  (layout.marginTop + row * (layout.cardHeight + layout.spacing)) *
                  MM_TO_PX *
                  previewScale;

                const rendered = renderedImages.find(
                  (img) => img.cardId === card.id && img.side === previewMode
                );

                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: y,
                      width: layout.cardWidth * MM_TO_PX * previewScale,
                      height: layout.cardHeight * MM_TO_PX * previewScale,
                      border: showCutGuides ? '1px dashed #999' : '1px solid #eee',
                      backgroundColor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {rendered ? (
                      <img
                        src={rendered.image}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        alt={card.id}
                      />
                    ) : (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    )}
                  </div>
                );
              })}
            </div>
          </Box>
        </Paper>
      )}
    </Stack>
  );
}

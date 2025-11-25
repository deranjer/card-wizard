import { useState, useEffect, useRef } from 'react';
import { Paper, Title, Text, Group, Box, LoadingOverlay, Button, Stack, Checkbox, SegmentedControl, ActionIcon } from '@mantine/core';
import { Deck, PDFLayout } from '../types';
import { GetPDFLayout, GeneratePDF } from '../../wailsjs/go/main/App';
import { notifications } from '@mantine/notifications';
import { CardRender } from './CardRender';
import { renderCardToImage } from '../utils/cardRenderer';
import { IconHelp } from '@tabler/icons-react';

interface PrintPreviewProps {
  deck: Deck;
  onNavigateToHelp?: (section: string) => void;
}

interface RenderedCardImage {
  styleId: string;
  side: 'front' | 'back';
  image: string;
}

export function PrintPreview({ deck, onNavigateToHelp }: PrintPreviewProps) {
  const [layout, setLayout] = useState<PDFLayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const [showCutGuides, setShowCutGuides] = useState(false);
  const [previewMode, setPreviewMode] = useState<'front' | 'back'>('front');
  const [renderedImages, setRenderedImages] = useState<RenderedCardImage[]>([]);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch layout on mount
  useEffect(() => {
    const fetchLayout = async () => {
      setLoading(true);
      try {
        const result = await GetPDFLayout(deck as any);
        setLayout(result);
      } catch (error) {
        console.error("Failed to get PDF layout:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLayout();
  }, [deck]);

  // Reset preview when deck changes
  useEffect(() => {
    setPreviewGenerated(false);
    setRenderedImages([]);
  }, [deck.cards, deck.frontStyles, deck.backStyles]);

  const handleGeneratePreview = async () => {
    setGenerating(true);
    try {
      const images: RenderedCardImage[] = [];
      
      // Collect unique styles
      const frontStyles = new Set(deck.cards.map(c => c.frontStyleId || 'default-front'));
      const backStyles = new Set(deck.cards.map(c => c.backStyleId || 'default-back'));
      
      // Render front cards
      for (const styleId of frontStyles) {
       const sampleCard = deck.cards.find(c => (c.frontStyleId || 'default-front') === styleId) || deck.cards[0];
        const refKey = `front-${styleId}`;
        const element = cardRefs.current.get(refKey);
        
        if (element) {
          const MM_TO_PX = 3.7795275591;
          const image = await renderCardToImage(element, deck.width * MM_TO_PX, deck.height * MM_TO_PX);
          images.push({ styleId, side: 'front', image });
        }
      }
      
      // Render back cards
      for (const styleId of backStyles) {
        const sampleCard = deck.cards.find(c => (c.backStyleId || 'default-back') === styleId) || deck.cards[0];
        const refKey = `back-${styleId}`;
        const element = cardRefs.current.get(refKey);
        
        if (element) {
          const MM_TO_PX = 3.7795275591;
          const image = await renderCardToImage(element, deck.width * MM_TO_PX, deck.height * MM_TO_PX);
          images.push({ styleId, side: 'back', image });
        }
      }
      
      setRenderedImages(images);
      setPreviewGenerated(true);
      notifications.show({ title: 'Success', message: 'Preview generated successfully' });
    } catch (err) {
      console.error('Preview generation error:', err);
      notifications.show({ title: 'Error', message: 'Failed to generate preview', color: 'red' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!previewGenerated || renderedImages.length === 0) {
      notifications.show({ title: 'Error', message: 'Please generate preview first', color: 'red' });
      return;
    }

    try {
      const deckWithImages = {
        ...deck,
        renderedCards: renderedImages,
        drawCutGuides: showCutGuides,
      };
      
      await GeneratePDF(deckWithImages as any);
      notifications.show({ title: 'Success', message: 'PDF generated successfully' });
    } catch (err) {
      console.error('PDF generation error:', err);
      notifications.show({ title: 'Error', message: 'Failed to generate PDF', color: 'red' });
    }
  };

  if (!layout || loading) {
    return <LoadingOverlay visible={true} />;
  }

  const MM_TO_PX = 3.7795275591;
  const previewScale = 0.8;
  const totalCards = deck.cards.reduce((sum, card) => sum + (card.count || 1), 0);
  const cardsPerPage = layout.cardsPerRow * layout.cardsPerCol;
  const totalPages = Math.ceil(totalCards / cardsPerPage) * 2;

  // Generate cards for the first page
  const pageCards: any[] = [];
  let currentCount = 0;
  for (const card of deck.cards) {
    const count = card.count || 1;
    for (let i = 0; i < count; i++) {
      if (currentCount < cardsPerPage) {
        pageCards.push(card);
        currentCount++;
      } else {
        break;
      }
    }
    if (currentCount >= cardsPerPage) break;
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
            <Text size="sm">Cards per page: {cardsPerPage} ({layout.cardsPerRow} × {layout.cardsPerCol})</Text>
            <Text size="sm">Card Size: {deck.width}mm × {deck.height}mm</Text>
            <Text size="sm">Margins: {layout.marginLeft.toFixed(1)}mm x {layout.marginTop.toFixed(1)}mm</Text>
            <Text size="sm">Spacing: {layout.spacing}mm</Text>
            <Text size="sm" c="blue">Duplex: Long-edge</Text>
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
              {/* Draw Margins Guide */}
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
                
                // Mirror columns for back page (Standard Duplex)
                const displayCol = previewMode === 'back' ? (layout.cardsPerRow - 1 - col) : col;
                
                const x = (layout.marginLeft + displayCol * (layout.cardWidth + layout.spacing)) * MM_TO_PX * previewScale;
                const y = (layout.marginTop + row * (layout.cardHeight + layout.spacing)) * MM_TO_PX * previewScale;

                // Find rendered image
                const styleId = previewMode === 'front' ? (card.frontStyleId || 'default-front') : (card.backStyleId || 'default-back');
                const renderedImage = renderedImages.find(img => img.styleId === styleId && img.side === previewMode);

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
                    {renderedImage ? (
                      <img 
                        src={renderedImage.image} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        alt="card"
                      />
                    ) : (
                      <Text size="xs" c="dimmed">Loading...</Text>
                    )}
                  </div>
                );
              })}
            </div>
          </Box>
        </Paper>
      )}

      {/* Hidden card renderers for PDF generation */}
      <div style={{ position: 'absolute', left: '-99999px', top: '-99999px' }}>
        {Array.from(new Set(deck.cards.map(c => c.frontStyleId || 'default-front'))).map(styleId => {
          const sampleCard = deck.cards.find(c => (c.frontStyleId || 'default-front') === styleId) || deck.cards[0];
          return (
            <div
              key={`front-${styleId}`}
              ref={(el) => {
                if (el) cardRefs.current.set(`front-${styleId}`, el);
              }}
            >
              <CardRender 
                card={sampleCard} 
                deck={deck} 
                mode="front" 
                scale={1} 
                border={false} 
              />
            </div>
          );
        })}
        {Array.from(new Set(deck.cards.map(c => c.backStyleId || 'default-back'))).map(styleId => {
          const sampleCard = deck.cards.find(c => (c.backStyleId || 'default-back') === styleId) || deck.cards[0];
          return (
            <div
              key={`back-${styleId}`}
              ref={(el) => {
                if (el) cardRefs.current.set(`back-${styleId}`, el);
              }}
            >
              <CardRender 
                card={sampleCard} 
                deck={deck} 
                mode="back" 
                scale={1} 
                border={false} 
              />
            </div>
          );
        })}
      </div>
    </Stack>
  );
}

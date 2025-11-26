import { Container, SimpleGrid, Card, Image, Text, Modal, Group, Slider, Stack, Button, SegmentedControl, ActionIcon, Title } from '@mantine/core';
import { Deck, CardLayout } from '../types';
import { useState } from 'react';
import { IconZoomIn, IconZoomOut, IconX, IconChevronLeft, IconChevronRight, IconHelp } from '@tabler/icons-react';
import { ImageLoader } from './ImageLoader';

interface DeckPreviewProps {
  deck: Deck;
  onNavigateToHelp?: (section: string) => void;
}

export function DeckPreview({ deck, onNavigateToHelp }: DeckPreviewProps) {
  const [opened, setOpened] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [previewMode, setPreviewMode] = useState<'front' | 'back'>('front');

  const getCardStyle = (card: any, mode: 'front' | 'back') => {
      const styleId = mode === 'front' ? card.frontStyleId : card.backStyleId;
      const styles = mode === 'front' ? deck.frontStyles : deck.backStyles;
      return styles[styleId] || { elements: [] };
  };

  const getImageSrc = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `/local-image?path=${encodeURIComponent(path)}`;
  };

  const MM_TO_PX = 3.7795275591;

  const renderCard = (card: any, mode: 'front' | 'back', scale: number, border: boolean = true) => {
    const layout = getCardStyle(card, mode);

    return (
    <div
      style={{
        width: deck.width * MM_TO_PX * scale,
        height: deck.height * MM_TO_PX * scale,
        border: border ? '1px solid #ccc' : 'none',
        borderRadius: 8 * scale,
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: border ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {layout.elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: el.x * MM_TO_PX * scale,
            top: el.y * MM_TO_PX * scale,
            width: el.width * MM_TO_PX * scale,
            height: el.height * MM_TO_PX * scale,
            fontSize: (el.fontSize || 12) * scale,
            color: el.color || '#000000',
            fontFamily: el.fontFamily || 'Arial, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center', // Default center for static text
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
            {el.type === 'image' ? (
                 el.field && card.data[el.field] ? (
                    <ImageLoader
                        path={card.data[el.field]}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: (el.objectFit as any) || 'contain'
                        }}
                    />
                 ) : null
            ) : (
                el.field ? card.data[el.field] : el.staticText
            )}
        </div>
      ))}
    </div>
  )};

  const handleCardClick = (index: number) => {
    setSelectedCardIndex(index);
    setOpened(true);
    setZoom(1);
  };

  const nextCard = () => {
      if (selectedCardIndex !== null && selectedCardIndex < deck.cards.length - 1) {
          setSelectedCardIndex(selectedCardIndex + 1);
      }
  };

  const prevCard = () => {
      if (selectedCardIndex !== null && selectedCardIndex > 0) {
          setSelectedCardIndex(selectedCardIndex - 1);
      }
  };

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Group>
            <Title order={3}>Preview</Title>
            {onNavigateToHelp && (
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={() => onNavigateToHelp('preview')}
                title="Help for this tab"
              >
                <IconHelp size={18} />
              </ActionIcon>
            )}
          </Group>
          <SegmentedControl
              value={previewMode}
              onChange={(val) => setPreviewMode(val as 'front' | 'back')}
              data={[{ label: 'Fronts', value: 'front' }, { label: 'Backs', value: 'back' }]}
          />
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
            {deck.cards.map((card, index) => (
            <div key={card.id} onClick={() => handleCardClick(index)} style={{ cursor: 'pointer' }}>
                {renderCard(card, previewMode, 1)}
                <Text size="xs" ta="center" mt={4} c="dimmed">{card.id} (x{card.count || 1})</Text>
            </div>
            ))}
        </SimpleGrid>
      </Stack>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        size="100%"
        padding={0}
        withCloseButton={false}
        styles={{
            body: { height: '100vh', display: 'flex', flexDirection: 'column' },
            content: { height: '100vh' }
        }}
      >
        {/* Toolbar */}
        <Group justify="space-between" p="md" style={{ borderBottom: '1px solid #eee' }}>
            <Group>
                <Text fw={700}>{selectedCardIndex !== null ? deck.cards[selectedCardIndex].id : ''}</Text>
                <SegmentedControl
                    value={previewMode}
                    onChange={(val) => setPreviewMode(val as 'front' | 'back')}
                    data={[{ label: 'Front', value: 'front' }, { label: 'Back', value: 'back' }]}
                />
            </Group>
            <Group>
                <IconZoomOut onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} style={{ cursor: 'pointer' }} />
                <Slider
                    value={zoom}
                    onChange={setZoom}
                    min={0.5}
                    max={3}
                    step={0.1}
                    w={200}
                    label={(val) => `${Math.round(val * 100)}%`}
                />
                <IconZoomIn onClick={() => setZoom(Math.min(3, zoom + 0.1))} style={{ cursor: 'pointer' }} />
                <ActionIcon variant="subtle" color="gray" onClick={() => setOpened(false)} ml="md">
                    <IconX />
                </ActionIcon>
            </Group>
        </Group>

        {/* Preview Area */}
        <div style={{ flex: 1, backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {selectedCardIndex !== null && (
                <>
                    <ActionIcon
                        variant="filled"
                        radius="xl"
                        size="xl"
                        style={{ position: 'absolute', left: 20, zIndex: 10 }}
                        onClick={(e) => { e.stopPropagation(); prevCard(); }}
                        disabled={selectedCardIndex === 0}
                    >
                        <IconChevronLeft />
                    </ActionIcon>

                    <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}>
                        {renderCard(deck.cards[selectedCardIndex], previewMode, 3, false)}
                    </div>

                    <ActionIcon
                        variant="filled"
                        radius="xl"
                        size="xl"
                        style={{ position: 'absolute', right: 20, zIndex: 10 }}
                        onClick={(e) => { e.stopPropagation(); nextCard(); }}
                        disabled={selectedCardIndex === deck.cards.length - 1}
                    >
                        <IconChevronRight />
                    </ActionIcon>
                </>
            )}
        </div>
      </Modal>
    </>
  );
}

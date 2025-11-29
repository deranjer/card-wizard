import { SimpleGrid, Text, Modal, Group, Slider, Stack, SegmentedControl, ActionIcon, Title } from '@mantine/core';
import { Deck } from '../types';
import { useState } from 'react';
import { CardRender } from './CardRender';
import { IconZoomIn, IconZoomOut, IconX, IconChevronLeft, IconChevronRight, IconHelp } from '@tabler/icons-react';

interface DeckPreviewProps {
  deck: Deck;
  onNavigateToHelp?: (section: string) => void;
}

export function DeckPreview({ deck, onNavigateToHelp }: DeckPreviewProps) {
  const [opened, setOpened] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [previewMode, setPreviewMode] = useState<'front' | 'back'>('front');

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
                <CardRender card={card} deck={deck} mode={previewMode} scale={1} />
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
                        <CardRender
                            card={deck.cards[selectedCardIndex]}
                            deck={deck}
                            mode={previewMode}
                            scale={3}
                            border={false}
                        />
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

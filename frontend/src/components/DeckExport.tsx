import { Container, Stack, Paper, Text, Button, Group } from '@mantine/core';
import { IconTable, IconPhoto } from '@tabler/icons-react';
import { Deck } from '../types';
import { ExportXLSX, SaveImages } from '../../wailsjs/go/main/App';
import { notifications } from '@mantine/notifications';
import { CardRender } from './CardRender';

interface DeckExportProps {
  deck: Deck;
}

export function DeckExport({ deck }: DeckExportProps) {
  const handleExportXLSX = async () => {
    try {
      await ExportXLSX(deck.cards as any, deck.fields);
      notifications.show({ title: 'Success', message: 'Deck exported to Excel' });
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleExportImages = async () => {
    try {
      notifications.show({
        title: 'Exporting',
        message: 'Generating images, please wait...',
        loading: true,
        autoClose: false,
        id: 'export-images'
      });

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = 'fit-content';
      document.body.appendChild(container);

      const images: Record<string, string> = {};
      const { createRoot } = await import('react-dom/client');
      const html2canvas = (await import('html2canvas')).default;

      for (const card of deck.cards) {
        // Render Front
        const frontDiv = document.createElement('div');
        container.appendChild(frontDiv);
        const frontRoot = createRoot(frontDiv);

        await new Promise<void>((resolve) => {
          frontRoot.render(
            <div style={{ width: 'fit-content', height: 'fit-content', background: 'white' }}>
              <CardRender
                deck={deck}
                card={card}
                mode="front"
                scale={1}
              />
            </div>
          );
          setTimeout(resolve, 100);
        });

        const frontCanvas = await html2canvas(frontDiv.firstChild as HTMLElement, {
          backgroundColor: null,
          logging: false,
          useCORS: true,
          scale: 2
        });
        images[`${card.id}-front.png`] = frontCanvas.toDataURL('image/png');
        frontRoot.unmount();
        container.removeChild(frontDiv);

        // Render Back
        const backDiv = document.createElement('div');
        container.appendChild(backDiv);
        const backRoot = createRoot(backDiv);

        await new Promise<void>((resolve) => {
          backRoot.render(
            <div style={{ width: 'fit-content', height: 'fit-content', background: 'white' }}>
              <CardRender
                deck={deck}
                card={card}
                mode="back"
                scale={1}
              />
            </div>
          );
          setTimeout(resolve, 100);
        });

        const backCanvas = await html2canvas(backDiv.firstChild as HTMLElement, {
          backgroundColor: null,
          logging: false,
          useCORS: true,
          scale: 2
        });
        images[`${card.id}-back.png`] = backCanvas.toDataURL('image/png');
        backRoot.unmount();
        container.removeChild(backDiv);
      }

      document.body.removeChild(container);
      await SaveImages(images);

      notifications.update({
        id: 'export-images',
        title: 'Success',
        message: 'Images exported successfully',
        color: 'green',
        loading: false,
        autoClose: 3000
      });

    } catch (error) {
      console.error(error);
      notifications.update({
        id: 'export-images',
        title: 'Error',
        message: 'Failed to export images',
        color: 'red',
        loading: false,
        autoClose: 3000
      });
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="lg" fw={600} mb="xs">Export to Excel</Text>
                <Text size="sm" c="dimmed">
                  Export all cards and their data to an XLSX spreadsheet file.
                </Text>
              </div>
              <Button
                leftSection={<IconTable size={16} />}
                onClick={handleExportXLSX}
                variant="light"
              >
                Export XLSX
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="lg" fw={600} mb="xs">Export as Images</Text>
                <Text size="sm" c="dimmed">
                  Export all cards as PNG images (front and back for each card).
                </Text>
              </div>
              <Button
                leftSection={<IconPhoto size={16} />}
                onClick={handleExportImages}
                variant="light"
              >
                Export Images
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

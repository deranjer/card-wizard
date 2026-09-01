import { Container, Stack, Paper, Text, Button, Group } from '@mantine/core';
import { IconTable, IconPhoto } from '@tabler/icons-react';
import { Deck } from '../types';
import { ExportXLSX, SaveImages } from '../../wailsjs/go/main/App';
import { notifications } from '@mantine/notifications';

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
        id: 'export-images',
      });

      const { exportDecksToImages } = await import('../utils/exportImages');
      await SaveImages(await exportDecksToImages([deck]));

      notifications.update({
        id: 'export-images',
        title: 'Success',
        message: 'Images exported successfully',
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error(error);
      notifications.update({
        id: 'export-images',
        title: 'Error',
        message: 'Failed to export images',
        color: 'red',
        loading: false,
        autoClose: 3000,
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
                <Text size="lg" fw={600} mb="xs">
                  Export to Excel
                </Text>
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
                <Text size="lg" fw={600} mb="xs">
                  Export as Images
                </Text>
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

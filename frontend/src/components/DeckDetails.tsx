import { Container, Title, TextInput, NumberInput, Group, Button, Stack, Paper, Text, Select, Tabs, ActionIcon, Modal, Anchor, Menu, Switch } from '@mantine/core';
import { Deck } from '../types';
import { ImportXLSX, ExportXLSX, SaveDeck, LoadDeck, SelectFontFile } from '../../wailsjs/go/main/App';
import { notifications } from '@mantine/notifications';
import { SpreadsheetView } from './SpreadsheetView';
import { IconTable, IconSettings, IconPlus, IconTrash, IconDownload, IconHelp, IconEye } from '@tabler/icons-react';
import { useState } from 'react';

interface DeckDetailsProps {
  deck: Deck;
  setDeck: (deck: Deck) => void;
  onDeckLoad?: () => void;
  onNavigateToHelp?: (section: string) => void;
}

const CARD_PRESETS = [
  { label: 'Poker Card (2.5" x 3.5")', value: 'poker', width: 63.5, height: 88.9 },
  { label: 'Bridge Card (2.25" x 3.5")', value: 'bridge', width: 57.15, height: 88.9 },
  { label: 'Mini Playing Cards (1.75" x 2.5")', value: 'mini', width: 44.45, height: 63.5 },
  { label: 'Jumbo Playing Cards (3.5" x 5")', value: 'jumbo', width: 88.9, height: 127 },
  { label: 'Tarot Cards (2.75" x 4.75")', value: 'tarot', width: 70, height: 120 },
  { label: 'Square Playing Cards (3" x 3")', value: 'square', width: 76.2, height: 76.2 },
];

export function DeckDetails({ deck, setDeck, onDeckLoad, onNavigateToHelp }: DeckDetailsProps) {
  const [clearModalOpened, setClearModalOpened] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [fullWidth, setFullWidth] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  const handleImport = async () => {
    try {
      const cards = await ImportXLSX();
      if (cards) {
        // When importing, we might need to infer fields if none exist
        let fields = deck.fields;
        if (fields.length === 0 && cards.length > 0) {
            fields = Object.keys(cards[0].data).map(key => ({ name: key, type: 'text' }));
        }
        setDeck({ ...deck, cards: cards as any, fields });
        onDeckLoad?.();
        notifications.show({ title: 'Success', message: `Imported ${cards.length} cards` });
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleExport = async () => {
    try {
      await ExportXLSX(deck.cards as any, deck.fields);
      notifications.show({ title: 'Success', message: 'Deck exported to Excel' });
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleSave = async () => {
    try {
      await SaveDeck(deck as any);
      notifications.show({ title: 'Success', message: 'Deck saved' });
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleLoad = async () => {
    try {
      const loadedDeck = await LoadDeck();
      if (loadedDeck) {
        // Ensure fields exist for legacy decks
        let fields = loadedDeck.fields || [];
        if (fields.length === 0 && loadedDeck.cards.length > 0) {
             fields = Object.keys(loadedDeck.cards[0].data).map(key => ({ name: key, type: 'text' }));
        }
        // Ensure styles exist (migration)
        const frontStyles = loadedDeck.frontStyles || { 'default-front': { name: 'Default Front', elements: [] } };
        const backStyles = loadedDeck.backStyles || { 'default-back': { name: 'Default Back', elements: [] } };

        setDeck({ ...loadedDeck, fields, frontStyles, backStyles } as any);
        onDeckLoad?.();
        notifications.show({ title: 'Success', message: 'Deck loaded' });
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handlePresetChange = (value: string | null) => {
    const preset = CARD_PRESETS.find(p => p.value === value);
    if (preset) {
      setDeck({ ...deck, width: preset.width, height: preset.height });
      onDeckLoad?.();
    }
  };

  const mmToInches = (mm: number) => (mm / 25.4).toFixed(2);

  const handleAddFont = async () => {
    try {
      const path = await SelectFontFile();
      if (path) {
          // Extract filename as default name
          const filename = path.split(/[\\/]/).pop() || 'Custom Font';
          const name = filename.split('.')[0];
          const family = `font-${Date.now()}`; // Unique family name to avoid collisions

          const newFont = { name, path, family };
          const currentFonts = deck.customFonts || [];

          setDeck({
              ...deck,
              customFonts: [...currentFonts, newFont]
          });
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to select font', color: 'red' });
    }
  };

  const removeFont = (index: number) => {
      const currentFonts = [...(deck.customFonts || [])];
      currentFonts.splice(index, 1);
      setDeck({ ...deck, customFonts: currentFonts });
  };

  const handleClearDeck = () => {
      setClearModalOpened(true);
      setClearConfirmText('');
  };

  const handleConfirmClear = () => {
    if (clearConfirmText === 'CLEAR') {
      setDeck({
        name: 'New Deck',
        width: 63.5,
        height: 88.9,
        cards: [],
        fields: [],
        frontStyles: {
          'default-front': { name: 'Default Front', elements: [] }
        },
        backStyles: {
          'default-back': { name: 'Default Back', elements: [] }
        },
        customFonts: deck.customFonts || [], // Preserve custom fonts
        paperSize: 'letter',
      });
      setClearModalOpened(false);
      setClearConfirmText('');
      notifications.show({ title: 'Success', message: 'Deck cleared', color: 'green' });
    } else {
      notifications.show({ title: 'Error', message: 'Please type CLEAR to confirm', color: 'red' });
    }
  };

  return (
    <Container size="xl" fluid={fullWidth}>
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
             <Group>
               <Title order={2}>Deck Manager</Title>
               {onNavigateToHelp && (
                 <ActionIcon
                   variant="subtle"
                   color="blue"
                   onClick={() => onNavigateToHelp('deck-details')}
                   title="Help for this tab"
                 >
                   <IconHelp size={18} />
                 </ActionIcon>
               )}
             </Group>
             <Group>
                 <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <Button variant="light" leftSection={<IconEye size={16} />}>View Options</Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Label>Layout</Menu.Label>
                        <Menu.Item
                            closeMenuOnClick={false}
                            rightSection={<Switch size="xs" checked={fullWidth} onChange={(e) => setFullWidth(e.currentTarget.checked)} />}
                        >
                            Full Width
                        </Menu.Item>
                        <Menu.Item
                            closeMenuOnClick={false}
                            rightSection={<Switch size="xs" checked={compactMode} onChange={(e) => setCompactMode(e.currentTarget.checked)} />}
                        >
                            Compact Mode
                        </Menu.Item>
                    </Menu.Dropdown>
                 </Menu>
                 <Button variant="outline" onClick={handleImport}>Import XLSX</Button>
                 <Button variant="outline" onClick={handleExport}>Export XLSX</Button>
                 <Button variant="outline" onClick={handleLoad}>Load Deck</Button>
                 <Button onClick={handleSave}>Save Deck</Button>
                 <Button color="red" variant="outline" onClick={handleClearDeck}>Clear Deck</Button>
             </Group>
          </Group>

          <Tabs defaultValue="spreadsheet">
            <Tabs.List>
              <Tabs.Tab value="spreadsheet" leftSection={<IconTable size={14} />}>
                Spreadsheet
              </Tabs.Tab>
              <Tabs.Tab value="settings" leftSection={<IconSettings size={14} />}>
                Deck Settings
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="spreadsheet" pt="xs">
              <SpreadsheetView deck={deck} setDeck={setDeck} compact={compactMode} />
            </Tabs.Panel>

            <Tabs.Panel value="settings" pt="xs">
              <Stack gap="md" maw={600}>
                  <TextInput
                    label="Deck Name"
                    value={deck.name}
                    onChange={(e) => setDeck({ ...deck, name: e.currentTarget.value })}
                  />

                  <Select
                    label="Card Size Preset"
                    placeholder="Select a standard size"
                    data={CARD_PRESETS.map(p => ({ label: p.label, value: p.value }))}
                    onChange={handlePresetChange}
                    clearable
                  />

                  <Group grow>
                    <NumberInput
                      label="Card Width (mm)"
                      value={deck.width}
                      onChange={(val) => setDeck({ ...deck, width: Number(val) })}
                      description={`${mmToInches(deck.width)}"`}
                    />
                    <NumberInput
                      label="Card Height (mm)"
                      value={deck.height}
                      onChange={(val) => setDeck({ ...deck, height: Number(val) })}
                      description={`${mmToInches(deck.height)}"`}
                    />
                  </Group>

                  <Select
                    label="Paper Size"
                    description="Paper size for PDF generation"
                    value={deck.paperSize || 'letter'}
                    onChange={(val) => setDeck({ ...deck, paperSize: (val as 'letter' | 'a4') || 'letter' })}
                    data={[
                      { value: 'letter', label: 'Letter (8.5" × 11")' },
                      { value: 'a4', label: 'A4 (210mm × 297mm)' },
                    ]}
                  />

                  <Text size="sm" c="dimmed">
                    Current Card Count: {deck.cards.length}
                  </Text>

                  <Paper withBorder p="sm">
                      <Group justify="space-between" mb="xs">
                        <Text fw={500}>Custom Fonts</Text>
                        <Button size="xs" variant="light" onClick={handleAddFont} leftSection={<IconPlus size={12} />}>Add Font</Button>
                      </Group>
                      <Stack gap="xs">
                          {(deck.customFonts || []).length === 0 ? (
                              <Text size="sm" c="dimmed">No custom fonts added.</Text>
                          ) : (
                              (deck.customFonts || []).map((font, i) => (
                                  <Group key={i} justify="space-between">
                                      <Stack gap={0}>
                                          <Text size="sm">{font.name}</Text>
                                          <Text size="xs" c="dimmed" truncate w={200}>{font.path}</Text>
                                      </Stack>
                                      <ActionIcon color="red" variant="subtle" size="sm" onClick={() => removeFont(i)}>
                                          <IconTrash size={14} />
                                      </ActionIcon>
                                  </Group>
                              ))
                          )}
                      </Stack>
                  </Paper>

                  <Paper withBorder p="sm">
                      <Text fw={500} mb="xs">Defined Styles</Text>
                      <Group align="flex-start" grow>
                          <Stack gap="xs">
                              <Text size="sm" c="dimmed">Fronts ({Object.keys(deck.frontStyles).length})</Text>
                              <Stack gap={4}>
                                  {Object.values(deck.frontStyles).map((s, i) => (
                                      <Text key={i} size="xs">• {s.name}</Text>
                                  ))}
                              </Stack>
                          </Stack>
                          <Stack gap="xs">
                              <Text size="sm" c="dimmed">Backs ({Object.keys(deck.backStyles).length})</Text>
                              <Stack gap={4}>
                                  {Object.values(deck.backStyles).map((s, i) => (
                                      <Text key={i} size="xs">• {s.name}</Text>
                                  ))}
                              </Stack>
                          </Stack>
                      </Group>
                  </Paper>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Paper>

      <Modal
        opened={clearModalOpened}
        onClose={() => {
          setClearModalOpened(false);
          setClearConfirmText('');
        }}
        title="Confirm Clear Deck"
        centered
      >
        <Stack>
          <Text size="sm">
            This action cannot be undone. All cards, fields, and styles will be permanently deleted.
          </Text>
          <Text size="sm" fw={700}>
            Type <Text span c="red">CLEAR</Text> to confirm:
          </Text>
          <TextInput
            value={clearConfirmText}
            onChange={(e) => setClearConfirmText(e.currentTarget.value)}
            placeholder="Type CLEAR"
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => {
              setClearModalOpened(false);
              setClearConfirmText('');
            }}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmClear}>
              Clear Deck
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

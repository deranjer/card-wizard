import { Container, Title, TextInput, NumberInput, Group, Button, Stack, Paper, Text, Select, Tabs, ActionIcon, Modal, Anchor, Menu, Switch } from '@mantine/core';
import { Deck } from '../types';
import { ExportXLSX, SelectFontFile, SelectExcelFile, GetExcelHeaders, ImportCardsWithMapping } from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import { notifications } from '@mantine/notifications';
import { SpreadsheetView } from './SpreadsheetView';
import { IconTable, IconSettings, IconPlus, IconTrash, IconHelp, IconEye, IconDatabase } from '@tabler/icons-react';
import { useState } from 'react';

interface DeckDetailsProps {
  deck: Deck;
  setDeck: (deck: Deck) => void;
  onDeckLoad?: () => void;
  onNavigateToHelp?: (section: string) => void;
  onDeleteDeck?: () => void;
}

const CARD_PRESETS = [
  { label: 'Poker Card (2.5" x 3.5")', value: 'poker', width: 63.5, height: 88.9 },
  { label: 'Bridge Card (2.25" x 3.5")', value: 'bridge', width: 57.15, height: 88.9 },
  { label: 'Mini Playing Cards (1.75" x 2.5")', value: 'mini', width: 44.45, height: 63.5 },
  { label: 'Jumbo Playing Cards (3.5" x 5")', value: 'jumbo', width: 88.9, height: 127 },
  { label: 'Tarot Cards (2.75" x 4.75")', value: 'tarot', width: 70, height: 120 },
  { label: 'Square Playing Cards (3" x 3")', value: 'square', width: 76.2, height: 76.2 },
];

export function DeckDetails({ deck, setDeck, onDeckLoad, onNavigateToHelp, onDeleteDeck }: DeckDetailsProps) {
  const [fullWidth, setFullWidth] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showRawValues, setShowRawValues] = useState(false);

  const [sheetSelection, setSheetSelection] = useState<main.ExcelSelection | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetModalOpen, setSheetModalOpen] = useState(false);


  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
      generateIdFrom: '',
      count: '',
      frontStyle: '',
      backStyle: ''
  });
  const [importTarget, setImportTarget] = useState<{path: string, sheet: string} | null>(null);


  const handleImportClick = async () => {
    try {
      const selection = await SelectExcelFile();
      if (selection && selection.sheets.length > 0) {
          if (selection.sheets.length === 1) {
              await startMappingProcess(selection.filePath, selection.sheets[0]);
          } else {
              setSheetSelection(selection);
              setSelectedSheet(selection.sheets[0]);
              setSheetModalOpen(true);
          }
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const confirmSheetSelection = async () => {
    setSheetModalOpen(false);
    if (sheetSelection && selectedSheet) {
        await startMappingProcess(sheetSelection.filePath, selectedSheet);
        setSheetSelection(null);
    }
  };

  const startMappingProcess = async (path: string, sheet: string) => {
      try {
          const headers = await GetExcelHeaders(path, sheet);
          setExcelHeaders(headers);
          setImportTarget({ path, sheet });

          // Auto-guess mapping
          const mapping = { generateIdFrom: '', count: '', frontStyle: '', backStyle: '' };
          const lowerHeaders = headers.map(h => h.toLowerCase());

          const findHeader = (keywords: string[]) => {
              for (const kw of keywords) {
                  const idx = lowerHeaders.indexOf(kw.toLowerCase());
                  if (idx !== -1) return headers[idx];
              }
              // Partial match
               for (const kw of keywords) {
                  const idx = lowerHeaders.findIndex(h => h.includes(kw.toLowerCase()));
                  if (idx !== -1) return headers[idx];
              }
              return '';
          };

          mapping.count = findHeader(['count', 'qty', 'quantity', 'amount']);
          mapping.frontStyle = findHeader(['front style', 'front_style', 'front', 'front style id']);
          mapping.backStyle = findHeader(['back style', 'back_style', 'back', 'back style id']);

          mapping.generateIdFrom = findHeader(['name', 'card name', 'title', 'id', 'identifier']); // Added 'id' keywords here as fallback since we removed specific ID column logic

          setColumnMapping(mapping);
          setMappingModalOpen(true);

      } catch (err) {
          notifications.show({ title: 'Error reading headers', message: String(err), color: 'red' });
      }
  };

  const performImport = async () => {
      if (!importTarget) return;
      setMappingModalOpen(false);

      try {
          const cards = await ImportCardsWithMapping(importTarget.path, importTarget.sheet, columnMapping);
          if (cards) {
             // Style Reconciliation
             let newFrontStyles = { ...deck.frontStyles };
             let newBackStyles = { ...deck.backStyles };
             let stylesChanged = false;

             const resolveStyle = (styleNameOrId: string, type: 'front' | 'back') => {
                if (!styleNameOrId) return type === 'front' ? 'default-front' : 'default-back';

                const styles = type === 'front' ? newFrontStyles : newBackStyles;

                // 1. Check if it matches an existing ID
                if (styles[styleNameOrId]) return styleNameOrId;

                // 2. Check if it matches an existing Name (case insensitive?)
                const foundEntry = Object.entries(styles).find(([_, s]) => s.name.toLowerCase() === styleNameOrId.toLowerCase());
                if (foundEntry) return foundEntry[0];

                // 3. Create New Style
                const newId = `${type}-style-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const newStyle = { name: styleNameOrId, elements: [] };

                if (type === 'front') {
                    newFrontStyles = { ...newFrontStyles, [newId]: newStyle };
                } else {
                    newBackStyles = { ...newBackStyles, [newId]: newStyle };
                }
                stylesChanged = true;
                return newId;
             };

             const reconciledCards = cards.map(c => ({
                 ...c,
                 frontStyleId: resolveStyle(c.frontStyleId, 'front'),
                 backStyleId: resolveStyle(c.backStyleId, 'back')
             }));

             // Infer Fields
             let fields = deck.fields;
             if (reconciledCards.length > 0) {
                 const allKeys = new Set<string>();
                 deck.fields.forEach(f => allKeys.add(f.name));

                 reconciledCards.forEach(c => Object.keys(c.data).forEach(k => allKeys.add(k)));

                 // Update fields list if new fields found
                 if (allKeys.size > deck.fields.length) {
                     fields = Array.from(allKeys).map(k => {
                         const existing = deck.fields.find(f => f.name === k);
                         return existing || { name: k, type: 'text' };
                     });
                 }
             }

             setDeck({
                 ...deck,
                 frontStyles: stylesChanged ? newFrontStyles : deck.frontStyles,
                 backStyles: stylesChanged ? newBackStyles : deck.backStyles,
                 cards: reconciledCards as any,
                 fields
             });

             notifications.show({ title: 'Success', message: `Imported ${reconciledCards.length} cards` });
          }
      } catch (err) {
          notifications.show({ title: 'Import Failed', message: String(err), color: 'red' });
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
                        <Menu.Item
                            closeMenuOnClick={false}
                            rightSection={<Switch size="xs" checked={showRawValues} onChange={(e) => setShowRawValues(e.currentTarget.checked)} />}
                        >
                            Show Raw Values
                        </Menu.Item>
                    </Menu.Dropdown>
                 </Menu>
                 <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <Button variant="outline" leftSection={<IconDatabase size={16} />}>Data</Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Label>Excel</Menu.Label>
                        <Menu.Item leftSection={<IconPlus size={14} />} onClick={handleImportClick}>Import XLSX</Menu.Item>
                        <Menu.Item leftSection={<IconTable size={14} />} onClick={handleExport}>Export XLSX</Menu.Item>
                    </Menu.Dropdown>
                 </Menu>
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
              <SpreadsheetView deck={deck} setDeck={setDeck} compact={compactMode} showRawValues={showRawValues} />
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

                  {onDeleteDeck && (
                      <Paper withBorder p="sm" style={{ borderColor: 'red' }}>
                          <Title order={5} c="red" mb="xs">Danger Zone</Title>
                          <Text size="sm" mb="md">Once you delete a deck, there is no going back. Please be certain.</Text>
                          <Button color="red" variant="outline" onClick={onDeleteDeck} leftSection={<IconTrash size={16} />}>
                              Delete Deck
                          </Button>
                      </Paper>
                  )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Paper>


      <Modal opened={sheetModalOpen} onClose={() => setSheetModalOpen(false)} title="Select Sheet to Import">
        <Stack>
            <Select
                label="Sheet"
                data={sheetSelection?.sheets || []}
                value={selectedSheet}
                onChange={(val) => setSelectedSheet(val || '')}
            />
            <Group justify="flex-end">
                <Button variant="default" onClick={() => setSheetModalOpen(false)}>Cancel</Button>
                <Button onClick={confirmSheetSelection}>Import</Button>
            </Group>
        </Stack>
      </Modal>


      <Modal opened={mappingModalOpen} onClose={() => setMappingModalOpen(false)} title="Map Columns" size="lg">
          <Stack>
              <Text size="sm" c="dimmed">Map your Excel columns to the required Card Wizard fields.</Text>

              <Group grow>
                <Select
                    label="Auto-generate ID from"
                    placeholder="Select column to slugify"
                    data={excelHeaders}
                    value={columnMapping.generateIdFrom}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, generateIdFrom: val || '' }))}
                    searchable
                    clearable
                />
                <Select
                    label="Count Column"
                    placeholder="Select column for Count"
                    data={excelHeaders}
                    value={columnMapping.count}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, count: val || '' }))}
                    searchable
                    clearable
                />
              </Group>

              <Group grow>
                <Select
                    label="Front Style Column"
                    placeholder="Select column for Front Style"
                    data={excelHeaders}
                    value={columnMapping.frontStyle}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, frontStyle: val || '' }))}
                    searchable
                    clearable
                />
                <Select
                    label="Back Style Column"
                    placeholder="Select column for Back Style"
                    data={excelHeaders}
                    value={columnMapping.backStyle}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, backStyle: val || '' }))}
                    searchable
                    clearable
                />
              </Group>

              <Text size="xs" c="dimmed" mt="sm">
                  * Unmapped columns will be imported as data fields automatically.
              </Text>

              <Group justify="flex-end" mt="md">
                  <Button variant="default" onClick={() => setMappingModalOpen(false)}>Cancel</Button>
                  <Button onClick={performImport}>Import Cards</Button>
              </Group>
          </Stack>
      </Modal>

    </Container>
  );
}

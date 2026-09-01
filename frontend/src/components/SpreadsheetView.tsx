import {
  Table,
  TextInput,
  Button,
  Group,
  ActionIcon,
  Select,
  Stack,
  Text,
  Modal,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { Deck, Card, FieldDefinition } from '../types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { SelectImageFile, AddProjectImage } from '../../wailsjs/go/main/App';
import { ResizableHeaderCell } from './spreadsheet/ResizableHeaderCell';
import { SheetRow } from './spreadsheet/SheetRow';

interface SpreadsheetViewProps {
  deck: Deck;
  setDeck: (deck: Deck) => void;
  compact?: boolean;
  showRawValues?: boolean;
}

type ColumnWidths = Record<string, number>;

const DEFAULT_WIDTHS: ColumnWidths = { id: 100, count: 80, frontStyle: 150, backStyle: 150 };
const fieldKey = (name: string) => `field_${name}`;

export function SpreadsheetView({
  deck,
  setDeck,
  compact = false,
  showRawValues = false,
}: SpreadsheetViewProps) {
  // Keep the latest deck reachable from stable callbacks so the per-row
  // handlers never need to be re-created (which would defeat SheetRow's memo).
  const deckRef = useRef(deck);
  deckRef.current = deck;

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<string | null>('text');
  const [isAddingField, setIsAddingField] = useState(false);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);
  const [resizing, setResizing] = useState<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // --- column resize -------------------------------------------------------
  const widthsRef = useRef(columnWidths);
  widthsRef.current = columnWidths;

  const handleResizeStart = useCallback((column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing({ column, startX: e.clientX, startWidth: widthsRef.current[column] || 150 });
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.max(50, resizing.startWidth + (e.clientX - resizing.startX));
      setColumnWidths((prev) => ({ ...prev, [resizing.column]: next }));
    };
    const onUp = () => setResizing(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  // --- mutations (all id-keyed and referentially stable) ------------------
  const replaceCards = useCallback(
    (cards: Card[]) => setDeck({ ...deckRef.current, cards }),
    [setDeck]
  );

  const patchCard = useCallback(
    (cardId: string, patch: (c: Card) => Card) => {
      replaceCards(deckRef.current.cards.map((c) => (c.id === cardId ? patch(c) : c)));
    },
    [replaceCards]
  );

  const onChangeId = useCallback(
    (cardId: string, nextId: string) => {
      if (nextId !== '' && deckRef.current.cards.some((c) => c.id !== cardId && c.id === nextId)) {
        notifications.show({ title: 'Error', message: 'Card ID must be unique', color: 'red' });
        return;
      }
      patchCard(cardId, (c) => ({ ...c, id: nextId }));
    },
    [patchCard]
  );

  const onChangeMeta = useCallback(
    (cardId: string, field: keyof Card, value: unknown) =>
      patchCard(cardId, (c) => ({ ...c, [field]: value })),
    [patchCard]
  );

  const onChangeData = useCallback(
    (cardId: string, field: string, value: unknown) =>
      patchCard(cardId, (c) => ({ ...c, data: { ...c.data, [field]: value } })),
    [patchCard]
  );

  const onRemove = useCallback(
    (cardId: string) => replaceCards(deckRef.current.cards.filter((c) => c.id !== cardId)),
    [replaceCards]
  );

  const onSelectImage = useCallback(
    async (cardId: string, field: string) => {
      try {
        const path = await SelectImageFile();
        if (!path) return;
        try {
          onChangeData(cardId, field, await AddProjectImage(path));
        } catch (copyErr) {
          console.error('Failed to copy image to project:', copyErr);
          notifications.show({
            title: 'Warning',
            message: 'Could not copy image to project folder. Using absolute path.',
            color: 'yellow',
          });
          onChangeData(cardId, field, path);
        }
      } catch (err) {
        console.error(err);
        notifications.show({ title: 'Error', message: 'Failed to select image', color: 'red' });
      }
    },
    [onChangeData]
  );

  const addCard = () => {
    const n = deck.cards.length + 1;
    const newCard: Card = {
      id: `card-${n}`,
      data: {},
      count: 1,
      frontStyleId: 'default-front',
      backStyleId: 'default-back',
    };
    setDeck({ ...deck, cards: [...deck.cards, newCard] });
  };

  const addField = () => {
    if (!newFieldName) return;
    if (deck.fields.some((f) => f.name === newFieldName)) {
      notifications.show({ title: 'Error', message: 'Field already exists', color: 'red' });
      return;
    }
    const newField: FieldDefinition = {
      name: newFieldName,
      type: (newFieldType as 'text' | 'image') || 'text',
    };
    setDeck({ ...deck, fields: [...deck.fields, newField] });
    setNewFieldName('');
    setIsAddingField(false);
  };

  const removeField = useCallback(
    (name: string) => {
      if (!confirm(`Are you sure you want to delete the field "${name}"? Data will be lost.`))
        return;
      const d = deckRef.current;
      setDeck({
        ...d,
        fields: d.fields.filter((f) => f.name !== name),
        cards: d.cards.map((card) => {
          const data = { ...card.data };
          delete data[name];
          return { ...card, data };
        }),
      });
    },
    [setDeck]
  );

  // --- derived (stable across cell edits) --------------------------------
  const frontStyleOptions = useMemo(() => {
    const id = deck.defaultFrontStyleId || 'default-front';
    const name = deck.frontStyles[id]?.name || 'Default Front';
    return [
      { value: '', label: `Default - (${name})` },
      ...Object.keys(deck.frontStyles).map((k) => ({ value: k, label: deck.frontStyles[k].name })),
    ];
  }, [deck.frontStyles, deck.defaultFrontStyleId]);

  const backStyleOptions = useMemo(() => {
    const id = deck.defaultBackStyleId || 'default-back';
    const name = deck.backStyles[id]?.name || 'Default Back';
    return [
      { value: '', label: `Default - (${name})` },
      ...Object.keys(deck.backStyles).map((k) => ({ value: k, label: deck.backStyles[k].name })),
    ];
  }, [deck.backStyles, deck.defaultBackStyleId]);

  const tableVerticalSpacing = compact ? 2 : 'xs';

  return (
    <Stack>
      <Group justify="space-between">
        <Button leftSection={<IconPlus size={16} />} onClick={addCard}>
          Add Card
        </Button>
        <Button variant="outline" onClick={() => setIsAddingField(true)}>
          Add Column
        </Button>
      </Group>

      <div style={{ overflowX: 'auto' }}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          verticalSpacing={tableVerticalSpacing}
        >
          <Table.Thead>
            <Table.Tr>
              <ResizableHeaderCell
                columnKey="id"
                width={columnWidths.id || 100}
                active={resizing?.column === 'id'}
                onResizeStart={handleResizeStart}
              >
                ID
              </ResizableHeaderCell>
              <ResizableHeaderCell
                columnKey="count"
                width={columnWidths.count || 80}
                active={resizing?.column === 'count'}
                onResizeStart={handleResizeStart}
              >
                Count
              </ResizableHeaderCell>
              <ResizableHeaderCell
                columnKey="frontStyle"
                width={columnWidths.frontStyle || 150}
                active={resizing?.column === 'frontStyle'}
                onResizeStart={handleResizeStart}
              >
                Front Style
              </ResizableHeaderCell>
              <ResizableHeaderCell
                columnKey="backStyle"
                width={columnWidths.backStyle || 150}
                active={resizing?.column === 'backStyle'}
                onResizeStart={handleResizeStart}
              >
                Back Style
              </ResizableHeaderCell>
              {deck.fields.map((field) => (
                <ResizableHeaderCell
                  key={field.name}
                  columnKey={fieldKey(field.name)}
                  width={columnWidths[fieldKey(field.name)] || 150}
                  active={resizing?.column === fieldKey(field.name)}
                  onResizeStart={handleResizeStart}
                >
                  <Group gap={4} wrap="nowrap">
                    <Text size="sm" fw={500}>
                      {field.name}
                    </Text>
                    <ActionIcon
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() => removeField(field.name)}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Group>
                </ResizableHeaderCell>
              ))}
              <Table.Th style={{ width: 50 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* Keyed by position, not card.id: the id cell is editable, so an
                id-based key would remount the row on every keystroke. SheetRow
                holds no internal state, so positional keys are safe here. */}
            {deck.cards.map((card, index) => (
              <SheetRow
                key={index}
                card={card}
                fields={deck.fields}
                frontStyleOptions={frontStyleOptions}
                backStyleOptions={backStyleOptions}
                compact={compact}
                showRawValues={showRawValues}
                onChangeId={onChangeId}
                onChangeMeta={onChangeMeta}
                onChangeData={onChangeData}
                onSelectImage={onSelectImage}
                onRemove={onRemove}
              />
            ))}
          </Table.Tbody>
        </Table>
      </div>

      <Modal opened={isAddingField} onClose={() => setIsAddingField(false)} title="Add New Column">
        <Stack>
          <TextInput
            label="Field Name"
            placeholder="e.g., Cost, Description, Image"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.currentTarget.value)}
            data-autofocus
          />
          <Select
            label="Field Type"
            data={[
              { value: 'text', label: 'Text' },
              { value: 'image', label: 'Image' },
            ]}
            value={newFieldType}
            onChange={setNewFieldType}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsAddingField(false)}>
              Cancel
            </Button>
            <Button onClick={addField}>Add Field</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

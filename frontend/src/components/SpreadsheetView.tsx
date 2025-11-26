import { Table, TextInput, Button, Group, ActionIcon, Select, FileInput, Image, Stack, Text, Modal, NumberInput } from '@mantine/core';
import { IconTrash, IconPlus, IconPhoto, IconFolder } from '@tabler/icons-react';
import { Deck, Card, FieldDefinition } from '../types';
import { useState, useRef, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { SelectImageFile } from '../../wailsjs/go/main/App';
import { ImageLoader } from './ImageLoader';

interface SpreadsheetViewProps {
  deck: Deck;
  setDeck: (deck: Deck) => void;
  compact?: boolean;
}

interface ColumnWidths {
  [key: string]: number;
}

export function SpreadsheetView({ deck, setDeck, compact = false }: SpreadsheetViewProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<string | null>('text');
  const [isAddingField, setIsAddingField] = useState(false);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    id: 100,
    count: 80,
    frontStyle: 150,
    backStyle: 150,
  });
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);

  // Column resizing handlers
  const handleResizeStart = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    const currentWidth = columnWidths[column] || 150;
    setResizing({ column, startX: e.clientX, startWidth: currentWidth });
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizing) return;
    const delta = e.clientX - resizing.startX;
    const newWidth = Math.max(50, resizing.startWidth + delta);
    setColumnWidths(prev => ({ ...prev, [resizing.column]: newWidth }));
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  // Add/remove global mouse event listeners for resizing
  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing]);


  const addField = () => {
    if (!newFieldName) return;
    if (deck.fields.some(f => f.name === newFieldName)) {
      notifications.show({ title: 'Error', message: 'Field already exists', color: 'red' });
      return;
    }

    const newField: FieldDefinition = {
      name: newFieldName,
      type: (newFieldType as 'text' | 'image') || 'text',
    };

    setDeck({
      ...deck,
      fields: [...deck.fields, newField],
    });
    setNewFieldName('');
    setIsAddingField(false);
  };

  const removeField = (fieldName: string) => {
    if (confirm(`Are you sure you want to delete the field "${fieldName}"? Data will be lost.`)) {
      const updatedCards = deck.cards.map(card => {
        const newData = { ...card.data };
        delete newData[fieldName];
        return { ...card, data: newData };
      });

      setDeck({
        ...deck,
        fields: deck.fields.filter(f => f.name !== fieldName),
        cards: updatedCards,
      });
    }
  };

  const addCard = () => {
    const newCard: Card = {
      id: `card-${deck.cards.length + 1}`,
      data: {},
      count: 1,
      frontStyleId: 'default-front',
      backStyleId: 'default-back',
    };
    setDeck({
      ...deck,
      cards: [...deck.cards, newCard],
    });
  };

  const removeCard = (index: number) => {
    const newCards = [...deck.cards];
    newCards.splice(index, 1);
    setDeck({ ...deck, cards: newCards });
  };

  const updateCardData = (index: number, field: string, value: any) => {
    const newCards = [...deck.cards];
    newCards[index] = {
      ...newCards[index],
      data: {
        ...newCards[index].data,
        [field]: value,
      },
    };
    setDeck({ ...deck, cards: newCards });
  };

  const updateCardMeta = (index: number, field: keyof Card, value: any) => {
    const newCards = [...deck.cards];
    newCards[index] = {
      ...newCards[index],
      [field]: value,
    };
    setDeck({ ...deck, cards: newCards });
  };

  const handleSelectImage = async (index: number, fieldName: string) => {
    try {
      const path = await SelectImageFile();
      if (path) {
        updateCardData(index, fieldName, path);
      }
    } catch (err) {
      console.error(err);
      notifications.show({ title: 'Error', message: 'Failed to select image', color: 'red' });
    }
  };

  // Ensure we have at least one field to show something
  if (deck.fields.length === 0 && deck.cards.length > 0) {
    // Auto-discover fields from first card if fields are empty (migration)
    const discoveredFields = Object.keys(deck.cards[0].data).map(key => ({
      name: key,
      type: 'text' as const,
    }));
    if (discoveredFields.length > 0) {
        // We can't update state during render, so this is a bit tricky.
        // Ideally, this should be done on load. For now, let's just render them.
    }
  }

  const frontStyleOptions = Object.keys(deck.frontStyles).map(id => ({ value: id, label: deck.frontStyles[id].name }));
  const backStyleOptions = Object.keys(deck.backStyles).map(id => ({ value: id, label: deck.backStyles[id].name }));

  const getImageSrc = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `/local-image?path=${encodeURIComponent(path)}`;
  };

  const inputSize = compact ? 'xs' : 'sm';
  const tableVerticalSpacing = compact ? 2 : 'xs';

  return (
    <Stack>
      <Group justify="space-between">
        <Button leftSection={<IconPlus size={16} />} onClick={addCard}>Add Card</Button>
        <Button variant="outline" onClick={() => setIsAddingField(true)}>Add Column</Button>
      </Group>

      <div style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing={tableVerticalSpacing}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: columnWidths.id || 100, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  ID
                  <div
                    onMouseDown={(e) => handleResizeStart('id', e)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      cursor: 'col-resize',
                      userSelect: 'none',
                      backgroundColor: resizing?.column === 'id' ? '#228be6' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#228be6'}
                    onMouseLeave={(e) => {
                      if (resizing?.column !== 'id') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  />
                </div>
              </Table.Th>
              <Table.Th style={{ width: columnWidths.count || 80, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Count
                  <div
                    onMouseDown={(e) => handleResizeStart('count', e)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      cursor: 'col-resize',
                      userSelect: 'none',
                      backgroundColor: resizing?.column === 'count' ? '#228be6' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#228be6'}
                    onMouseLeave={(e) => {
                      if (resizing?.column !== 'count') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  />
                </div>
              </Table.Th>
              <Table.Th style={{ width: columnWidths.frontStyle || 150, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Front Style
                  <div
                    onMouseDown={(e) => handleResizeStart('frontStyle', e)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      cursor: 'col-resize',
                      userSelect: 'none',
                      backgroundColor: resizing?.column === 'frontStyle' ? '#228be6' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#228be6'}
                    onMouseLeave={(e) => {
                      if (resizing?.column !== 'frontStyle') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  />
                </div>
              </Table.Th>
              <Table.Th style={{ width: columnWidths.backStyle || 150, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Back Style
                  <div
                    onMouseDown={(e) => handleResizeStart('backStyle', e)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      cursor: 'col-resize',
                      userSelect: 'none',
                      backgroundColor: resizing?.column === 'backStyle' ? '#228be6' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#228be6'}
                    onMouseLeave={(e) => {
                      if (resizing?.column !== 'backStyle') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  />
                </div>
              </Table.Th>
              {deck.fields.map(field => {
                const fieldKey = `field_${field.name}`;
                return (
                  <Table.Th key={field.name} style={{ width: columnWidths[fieldKey] || 150, position: 'relative' }}>
                    <Group justify="space-between" wrap="nowrap" style={{ position: 'relative' }}>
                      <Text size="sm" fw={500}>{field.name}</Text>
                      <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeField(field.name)}>
                        <IconTrash size={12} />
                      </ActionIcon>
                      <div
                        onMouseDown={(e) => handleResizeStart(fieldKey, e)}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: -8,
                          bottom: -8,
                          width: 5,
                          cursor: 'col-resize',
                          userSelect: 'none',
                          backgroundColor: resizing?.column === fieldKey ? '#228be6' : 'transparent',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#228be6'}
                        onMouseLeave={(e) => {
                          if (resizing?.column !== fieldKey) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      />
                    </Group>
                  </Table.Th>
                );
              })}
              <Table.Th style={{ width: 50 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {deck.cards.map((card, index) => (
              <Table.Tr key={card.id}>
                <Table.Td>
                  <TextInput
                    value={card.id}
                    onChange={(e) => {
                      const newId = e.currentTarget.value;
                      // Check for duplicate IDs
                      const isDuplicate = deck.cards.some((c, i) => i !== index && c.id === newId);
                      if (isDuplicate && newId !== '') {
                        notifications.show({
                          title: 'Error',
                          message: 'Card ID must be unique',
                          color: 'red'
                        });
                        return;
                      }
                      updateCardMeta(index, 'id', newId);
                    }}
                    variant="unstyled"
                    size={inputSize}
                    styles={{ input: { paddingLeft: compact ? 4 : undefined, paddingRight: compact ? 4 : undefined } }}
                  />
                </Table.Td>
                <Table.Td>
                    <NumberInput
                        value={card.count || 1}
                        onChange={(val) => updateCardMeta(index, 'count', Number(val))}
                        min={1}
                        size={inputSize}
                        variant="unstyled"
                        styles={{ input: { paddingLeft: compact ? 4 : undefined, paddingRight: compact ? 4 : undefined } }}
                    />
                </Table.Td>
                <Table.Td>
                    <Select
                        data={frontStyleOptions}
                        value={card.frontStyleId || 'default-front'}
                        onChange={(val) => updateCardMeta(index, 'frontStyleId', val)}
                        size={inputSize}
                        variant="unstyled"
                        styles={{ input: { paddingLeft: compact ? 4 : undefined, paddingRight: compact ? 4 : undefined } }}
                    />
                </Table.Td>
                <Table.Td>
                    <Select
                        data={backStyleOptions}
                        value={card.backStyleId || 'default-back'}
                        onChange={(val) => updateCardMeta(index, 'backStyleId', val)}
                        size={inputSize}
                        variant="unstyled"
                        styles={{ input: { paddingLeft: compact ? 4 : undefined, paddingRight: compact ? 4 : undefined } }}
                    />
                </Table.Td>
                {deck.fields.map(field => (
                  <Table.Td key={`${card.id}-${field.name}`}>
                    {field.type === 'text' ? (
                      <TextInput
                        value={card.data[field.name] || ''}
                        onChange={(e) => updateCardData(index, field.name, e.currentTarget.value)}
                        variant="unstyled"
                        size={inputSize}
                        styles={{ input: { paddingLeft: compact ? 4 : undefined, paddingRight: compact ? 4 : undefined } }}
                      />
                    ) : (
                      <Group wrap="nowrap" gap="xs">
                         {card.data[field.name] && (
                            <ImageLoader
                                path={card.data[field.name]}
                                style={{
                                    width: compact ? 24 : 30,
                                    height: compact ? 24 : 30,
                                    borderRadius: 4,
                                    objectFit: 'cover'
                                }}
                            />
                         )}
                         <TextInput
                            placeholder="Image URL/Path"
                            value={card.data[field.name] || ''}
                            onChange={(e) => updateCardData(index, field.name, e.currentTarget.value)}
                            variant="unstyled"
                            size={inputSize}
                            style={{ flex: 1 }}
                            styles={{ input: { paddingLeft: compact ? 4 : undefined, paddingRight: compact ? 4 : undefined } }}
                         />
                         <ActionIcon variant="subtle" color="gray" onClick={() => handleSelectImage(index, field.name)} size={inputSize}>
                            <IconFolder size={compact ? 12 : 14} />
                         </ActionIcon>
                      </Group>
                    )}
                  </Table.Td>
                ))}
                <Table.Td>
                  <ActionIcon color="red" variant="subtle" onClick={() => removeCard(index)} size={inputSize}>
                    <IconTrash size={compact ? 14 : 16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
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
            <Button variant="default" onClick={() => setIsAddingField(false)}>Cancel</Button>
            <Button onClick={addField}>Add Field</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

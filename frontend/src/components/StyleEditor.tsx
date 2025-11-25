import { Stack, Group, Button, Text, Paper, Select, ColorInput, NumberInput, TextInput, ActionIcon, ScrollArea, SegmentedControl, Center } from '@mantine/core';
import { Deck, CardLayout, LayoutElement } from '../types';
import { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { IconPlus, IconTrash, IconGripVertical } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface StyleEditorProps {
  deck: Deck;
  setDeck: (deck: Deck) => void;
}

const MM_TO_PX = 3.7795275591;

export function StyleEditor({ deck, setDeck }: StyleEditorProps) {
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [renderKey, setRenderKey] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);

  // Use callback ref to detect when canvas is mounted/remounted
  const setCanvasRef = (node: HTMLDivElement | null) => {
    console.log("setCanvasRef called with node:", node);
    if (node) {
      // Use requestAnimationFrame to wait for browser layout
      requestAnimationFrame(() => {
        const width = node.offsetWidth;
        const height = node.offsetHeight;
        console.log("Canvas dimensions in callback:", width, "x", height);
        
        // Only mark as ready when canvas has non-zero dimensions
        if (width > 0 && height > 0) {
          console.log("Setting canvasReady to TRUE");
          setCanvasReady(true);
        } else {
          console.log("Setting canvasReady to FALSE (zero dimensions)");
          setCanvasReady(false);
        }
      });
    } else {
      console.log("Setting canvasReady to FALSE (node is null)");
      setCanvasReady(false);
    }
  };

  // Initialize selection when tab changes or deck is loaded
  useEffect(() => {
    const styles = activeTab === 'front' ? deck.frontStyles : deck.backStyles;
    const ids = Object.keys(styles);
    if (ids.length > 0 && (!selectedStyleId || !styles[selectedStyleId])) {
      setSelectedStyleId(ids[0]);
    }
  }, [activeTab, deck.frontStyles, deck.backStyles]);

  // Force re-render when selectedStyleId changes
  useEffect(() => {
    if (selectedStyleId) {
      setRenderKey(prev => prev + 1);
    }
  }, [selectedStyleId]);

  const currentStyle = selectedStyleId 
    ? (activeTab === 'front' ? deck.frontStyles[selectedStyleId] : deck.backStyles[selectedStyleId])
    : null;

  const handleStyleChange = (newLayout: CardLayout) => {
    if (!selectedStyleId) return;
    
    if (activeTab === 'front') {
        setDeck({
            ...deck,
            frontStyles: { ...deck.frontStyles, [selectedStyleId]: newLayout }
        });
    } else {
        setDeck({
            ...deck,
            backStyles: { ...deck.backStyles, [selectedStyleId]: newLayout }
        });
    }
  };

  const addElement = (type: 'text' | 'image') => {
    if (!currentStyle) return;
    const newElement: LayoutElement = {
      id: `el-${Date.now()}`,
      type,
      x: 10, // mm
      y: 10, // mm
      width: type === 'text' ? 40 : 20, // mm
      height: type === 'text' ? 10 : 20, // mm
      staticText: type === 'text' ? 'New Text' : undefined,
      fontSize: 12,
      color: '#000000',
    };
    handleStyleChange({
      ...currentStyle,
      elements: [...currentStyle.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<LayoutElement>) => {
    if (!currentStyle) return;
    handleStyleChange({
      ...currentStyle,
      elements: currentStyle.elements.map(el => el.id === id ? { ...el, ...updates } : el),
    });
  };

  const removeElement = (id: string) => {
    if (!currentStyle) return;
    handleStyleChange({
      ...currentStyle,
      elements: currentStyle.elements.filter(el => el.id !== id),
    });
    setSelectedElementId(null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !currentStyle) return;

    const items = Array.from(currentStyle.elements);
    // We display in reverse order (top layer first), so we manipulate the reversed array
    const reversedItems = [...items].reverse();
    const [reorderedItem] = reversedItems.splice(result.source.index, 1);
    reversedItems.splice(result.destination.index, 0, reorderedItem);

    // Reverse back to storage order (bottom layer first)
    const newElements = reversedItems.reverse();
    
    handleStyleChange({ ...currentStyle, elements: newElements });
  };

  const addNewStyle = () => {
      const id = `${activeTab}-style-${Date.now()}`;
      const newStyle: CardLayout = {
          name: `New ${activeTab === 'front' ? 'Front' : 'Back'}`,
          elements: []
      };
      
      if (activeTab === 'front') {
          setDeck({ ...deck, frontStyles: { ...deck.frontStyles, [id]: newStyle } });
      } else {
          setDeck({ ...deck, backStyles: { ...deck.backStyles, [id]: newStyle } });
      }
      setSelectedStyleId(id);
  };

  const renameStyle = (name: string) => {
      if (!currentStyle) return;
      handleStyleChange({ ...currentStyle, name });
  };

  const deleteStyle = () => {
      if (!selectedStyleId) return;
      
      const styles = activeTab === 'front' ? deck.frontStyles : deck.backStyles;
      const styleIds = Object.keys(styles);
      
      if (styleIds.length <= 1) {
          notifications.show({ title: 'Error', message: 'Cannot delete the last style.', color: 'red' });
          return;
      }
      
      if (!confirm('Are you sure you want to delete this style?')) return;

      const newStyles = { ...styles };
      delete newStyles[selectedStyleId];
      
      // Fallback ID for cards using this style
      const fallbackId = styleIds.find(id => id !== selectedStyleId) || '';

      // Update cards
      const newCards = deck.cards.map(card => {
          if (activeTab === 'front' && card.frontStyleId === selectedStyleId) {
              return { ...card, frontStyleId: fallbackId };
          }
          if (activeTab === 'back' && card.backStyleId === selectedStyleId) {
              return { ...card, backStyleId: fallbackId };
          }
          return card;
      });

      if (activeTab === 'front') {
          setDeck({ ...deck, frontStyles: newStyles, cards: newCards });
      } else {
          setDeck({ ...deck, backStyles: newStyles, cards: newCards });
      }
      
      setSelectedStyleId(fallbackId);
  };

  if (!currentStyle) return <Text>No styles defined.</Text>;

  const selectedElement = currentStyle.elements.find(el => el.id === selectedElementId);

  // Calculate scaled dimensions
  const scale = zoom;
  const cardWidthPx = deck.width * MM_TO_PX * scale;
  const cardHeightPx = deck.height * MM_TO_PX * scale;

  console.log("Render - canvasReady:", canvasReady, "selectedStyleId:", selectedStyleId);

  return (
    <Group align="flex-start" h="calc(100vh - 140px)" gap={0}>
      {/* Left Sidebar: Style & Element Properties */}
      <Stack w={300} h="100%" style={{ borderRight: '1px solid #eee' }} p="md">
        <SegmentedControl 
            value={activeTab} 
            onChange={(val) => setActiveTab(val as 'front' | 'back')} 
            data={[{ label: 'Fronts', value: 'front' }, { label: 'Backs', value: 'back' }]}
        />
        
        <Group>
            <Select 
                label="Select Style" 
                data={Object.keys(activeTab === 'front' ? deck.frontStyles : deck.backStyles).map(id => ({
                    value: id,
                    label: (activeTab === 'front' ? deck.frontStyles[id].name : deck.backStyles[id].name)
                }))}
                value={selectedStyleId}
                onChange={setSelectedStyleId}
                style={{ flex: 1 }}
            />
            <ActionIcon variant="light" onClick={addNewStyle} mt={25}><IconPlus size={16} /></ActionIcon>
        </Group>

        <Group align="flex-end">
            <TextInput 
                label="Style Name" 
                value={currentStyle.name} 
                onChange={(e) => renameStyle(e.currentTarget.value)} 
                style={{ flex: 1 }}
            />
            <ActionIcon color="red" variant="light" onClick={deleteStyle} mb={4} title="Delete Style">
                <IconTrash size={16} />
            </ActionIcon>
        </Group>

        <Text fw={500} mt="md">Add Elements</Text>
        <Group>
          <Button size="xs" onClick={() => addElement('text')}>Add Text</Button>
          <Button size="xs" onClick={() => addElement('image')}>Add Image</Button>
        </Group>

        {selectedElement && (
          <Paper p="xs" withBorder mt="md">
            <Stack gap="xs">
              <Text size="sm" fw={500}>Properties</Text>
              <Select
                label="Data Field"
                placeholder="Static Text"
                data={[{ value: '', label: 'Static Text' }, ...deck.fields.map(f => ({ value: f.name, label: f.name }))]}
                value={selectedElement.field || ''}
                onChange={(val) => updateElement(selectedElement.id, { field: val || undefined })}
              />
              {!selectedElement.field && selectedElement.type === 'text' && (
                <TextInput
                  label="Static Text"
                  value={selectedElement.staticText || ''}
                  onChange={(e) => updateElement(selectedElement.id, { staticText: e.currentTarget.value })}
                />
              )}
              {selectedElement.type === 'text' && (
                <>
                  <Select
                    label="Font Family"
                    data={[
                        { group: 'Standard Fonts', items: [
                            { value: 'Arial, sans-serif', label: 'Arial' },
                            { value: 'Verdana, sans-serif', label: 'Verdana' },
                            { value: 'Helvetica, sans-serif', label: 'Helvetica' },
                            { value: 'Times New Roman, serif', label: 'Times New Roman' },
                            { value: 'Courier New, monospace', label: 'Courier New' },
                            { value: 'Georgia, serif', label: 'Georgia' },
                        ]},
                        { group: 'Custom Fonts', items: (deck.customFonts || []).map(f => ({ value: f.family, label: f.name })) }
                    ]}
                    value={selectedElement.fontFamily || 'Arial, sans-serif'}
                    onChange={(val) => updateElement(selectedElement.id, { fontFamily: val || undefined })}
                    searchable
                  />
                  <NumberInput
                    label="Font Size"
                    value={selectedElement.fontSize}
                    onChange={(val) => updateElement(selectedElement.id, { fontSize: Number(val) })}
                  />
                  <ColorInput
                    label="Color"
                    value={selectedElement.color}
                    onChange={(val) => updateElement(selectedElement.id, { color: val })}
                  />
                </>
              )}
              {selectedElement.type === 'image' && (
                  <Select
                    label="Image Fit"
                    data={[
                        { value: 'contain', label: 'Fit (Contain)' },
                        { value: 'cover', label: 'Crop (Cover)' },
                        { value: 'fill', label: 'Stretch (Fill)' },
                    ]}
                    value={selectedElement.objectFit || 'contain'}
                    onChange={(val) => updateElement(selectedElement.id, { objectFit: val as any })}
                  />
              )}
              <Button color="red" size="xs" onClick={() => removeElement(selectedElement.id)}>Remove</Button>
            </Stack>
          </Paper>
        )}
      </Stack>

      {/* Center Canvas */}
      <ScrollArea style={{ flex: 1, height: '100%', backgroundColor: '#f0f0f0' }}>
        <Center py={50} style={{ minHeight: '100%' }}>
            <div
                ref={setCanvasRef}
                key={`canvas-${selectedStyleId}-${activeTab}-${renderKey}`}
                style={{
                    width: cardWidthPx,
                    height: cardHeightPx,
                    backgroundColor: 'white',
                    position: 'relative',
                    boxShadow: '0 0 20px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                }}
                onClick={() => setSelectedElementId(null)}
            >
                {canvasReady && currentStyle.elements.map(el => {
                    const elementWidth = el.width * MM_TO_PX * scale;
                    const elementHeight = el.height * MM_TO_PX * scale;
                    const elementX = el.x * MM_TO_PX * scale;
                    const elementY = el.y * MM_TO_PX * scale;
                    
                    return (
                    <Rnd
                        key={el.id}
                        default={{
                            x: elementX,
                            y: elementY,
                            width: elementWidth,
                            height: elementHeight
                        }}
                        onDragStop={(e, d) => {
                            updateElement(el.id, { 
                                x: d.x / scale / MM_TO_PX, 
                                y: d.y / scale / MM_TO_PX 
                            });
                        }}
                        onResizeStop={(e, direction, ref, delta, position) => {
                            updateElement(el.id, {
                                width: parseInt(ref.style.width) / scale / MM_TO_PX,
                                height: parseInt(ref.style.height) / scale / MM_TO_PX,
                                x: position.x / scale / MM_TO_PX,
                                y: position.y / scale / MM_TO_PX,
                            });
                        }}
                        bounds="parent"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setSelectedElementId(el.id);
                        }}
                        style={{
                            border: selectedElementId === el.id ? '1px solid #228be6' : '1px dashed #ccc',
                            cursor: 'move',
                            zIndex: selectedElementId === el.id ? 1000 : 'auto', // Bring selected to front temporarily
                        }}
                    >
                        <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            overflow: 'hidden',
                            color: el.color,
                            fontSize: (el.fontSize || 12) * scale,
                            fontFamily: el.fontFamily || 'Arial, sans-serif',
                            pointerEvents: 'none',
                        }}>
                            {el.type === 'image' ? (
                                <div style={{ width: '100%', height: '100%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {el.field ? (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                            <Text size="xs" c="dimmed">Image: {el.field}</Text>
                                            <Text size="xs" c="dimmed">({el.objectFit || 'contain'})</Text>
                                        </div>
                                    ) : <Text size="xs" c="dimmed">Image Placeholder</Text>}
                                </div>
                            ) : (
                                el.field ? `{${el.field}}` : el.staticText
                            )}
                        </div>
                    </Rnd>
                    );
                })}
            </div>
        </Center>
      </ScrollArea>

      {/* Right Sidebar: Layers */}
      <Stack w={250} h="100%" style={{ borderLeft: '1px solid #eee' }} p="md">
          <Text fw={500}>Layers</Text>
          <ScrollArea style={{ flex: 1 }}>
              <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="layers">
                      {(provided) => (
                          <Stack gap="xs" {...provided.droppableProps} ref={provided.innerRef}>
                              {/* Render in reverse order so top layers are at the top of the list */}
                              {[...currentStyle.elements].reverse().map((el, index) => (
                                  <Draggable key={el.id} draggableId={el.id} index={index}>
                                      {(provided, snapshot) => (
                                          <Paper 
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            p="xs" 
                                            withBorder 
                                            style={{ 
                                                ...provided.draggableProps.style,
                                                cursor: 'pointer',
                                                backgroundColor: selectedElementId === el.id ? '#e7f5ff' : 'white',
                                                borderColor: selectedElementId === el.id ? '#228be6' : '#eee',
                                                boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                            }}
                                            onClick={() => setSelectedElementId(el.id)}
                                          >
                                              <Group justify="space-between" wrap="nowrap">
                                                  <div {...provided.dragHandleProps} style={{ display: 'flex', alignItems: 'center', cursor: 'grab' }}>
                                                      <IconGripVertical size={14} color="#adb5bd" />
                                                  </div>
                                                  <Text size="sm" fw={600} c="dark.4" truncate style={{ flex: 1 }}>
                                                      {el.type === 'image' ? 'Image' : (el.staticText || `{${el.field}}`)}
                                                  </Text>
                                                  <ActionIcon color="red" size="sm" variant="subtle" onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}>
                                                      <IconTrash size={14} />
                                                  </ActionIcon>
                                              </Group>
                                          </Paper>
                                      )}
                                  </Draggable>
                              ))}
                              {provided.placeholder}
                          </Stack>
                      )}
                  </Droppable>
              </DragDropContext>
              
              {currentStyle.elements.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center" py="xl">No elements</Text>
              )}
          </ScrollArea>
      </Stack>
    </Group>
  );
}

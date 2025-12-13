import { Stack, Group, Button, Text, Paper, Select, ColorInput, NumberInput, TextInput, ActionIcon, ScrollArea, SegmentedControl, Center, Switch, Slider } from '@mantine/core';
import { Deck, CardLayout, LayoutElement } from '../types';
import { CardRender } from './CardRender';
import { ImageLoader } from './ImageLoader';
import { BottomControlBar } from './BottomControlBar';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { IconPlus, IconTrash, IconGripVertical, IconBold, IconItalic, IconUnderline, IconAlignLeft, IconAlignCenter, IconAlignRight, IconArrowBarUp, IconArrowBarDown, IconArrowsVertical, IconPolygon } from '@tabler/icons-react';
import { PRESET_SHAPES } from '../utils/Shapes';
import { Menu } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface StyleEditorProps {
  deck: Deck;
  setDeck: (deck: Deck) => void;
}

const MM_TO_PX = 3.7795275591;

// Undo/Redo Hook
function useHistory<T>(initialPresent: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const newPresent = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture([present, ...future]);
    setPresent(newPresent);
    setPast(newPast);
    return newPresent;
  }, [past, present, future, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const newPresent = future[0];
    const newFuture = future.slice(1);

    setPast([...past, present]);
    setPresent(newPresent);
    setFuture(newFuture);
    return newPresent;
  }, [past, present, future, canRedo]);

  const set = useCallback((newPresent: T) => {
    if (newPresent === present) return;
    setPast([...past, present]);
    setPresent(newPresent);
    setFuture([]);
  }, [past, present]);

  // Special setter that doesn't push to history (for initial sync or minor updates)
  const setSilent = useCallback((newPresent: T) => {
      setPresent(newPresent);
  }, []);

  return { present, set, setSilent, undo, redo, canUndo, canRedo, past, future };
}

export function StyleEditor({ deck: externalDeck, setDeck: setExternalDeck }: StyleEditorProps) {
  // We use local history state, and sync to external when it changes
  const { present: deck, set: setDeckHistory, setSilent: setDeckSilent, undo, redo, canUndo, canRedo } = useHistory(externalDeck);

  // Sync external changes (e.g. from other tabs) to local state
  // This is critical: if the deck is updated elsewhere (e.g. XLSX import in Deck Details),
  // we need to update our local history state, otherwise we'll overwrite with stale data
  useEffect(() => {
      // Only update if the external deck is actually different (deep comparison would be ideal, but reference check is safer)
      // We use setSilent to avoid creating history entries for external updates
      if (externalDeck !== deck) {
          setDeckSilent(externalDeck);
      }
  }, [externalDeck]);

  // Propagate local changes to parent
  useEffect(() => {
      setExternalDeck(deck);
  }, [deck]);

  // Hotkeys
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) {
                  redo();
              } else {
                  undo();
              }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
              e.preventDefault();
              redo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Wrapper for setDeck to use history
  const setDeck = setDeckHistory;

  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [renderKey, setRenderKey] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<{ elementId: string, pointIndex: number } | null>(null);



  const [tempStyleId, setTempStyleId] = useState('');

  // Sync local state when selectedStyleId changes
  useEffect(() => {
    if (selectedStyleId) {
        setTempStyleId(selectedStyleId);
    }
  }, [selectedStyleId]);

  // Live Preview State
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewOpacity, setPreviewOpacity] = useState(0.5);

  const observerRef = useRef<ResizeObserver | null>(null);

  const setCanvasRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      // Create new observer
      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setCanvasReady(true);
          } else {
            setCanvasReady(false);
          }
        }
      });

      observerRef.current.observe(node);
    } else {
      setCanvasReady(false);
    }
  }, []);

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

  // Clear preview if selected card doesn't match current style
  useEffect(() => {
      if (previewCardId && selectedStyleId) {
          const card = deck.cards.find(c => c.id === previewCardId);
          if (card) {
              let cardStyleId = activeTab === 'front' ? card.frontStyleId : card.backStyleId;
              const styles = activeTab === 'front' ? deck.frontStyles : deck.backStyles;

               // Fallback logic matching CardRender
              if (!cardStyleId || !styles[cardStyleId]) {
                  const defaultId = activeTab === 'front'
                    ? (deck.defaultFrontStyleId || 'default-front')
                    : (deck.defaultBackStyleId || 'default-back');
                  if (styles[defaultId]) {
                      cardStyleId = defaultId;
                  } else {
                      const allIds = Object.keys(styles);
                      if (allIds.length > 0) {
                          cardStyleId = allIds[0];
                      }
                  }
              }

              if (cardStyleId !== selectedStyleId) {
                  setPreviewCardId(null);
              }
          }
      }
  }, [selectedStyleId, activeTab, previewCardId, deck.cards, deck.frontStyles, deck.backStyles]);

  const currentStyle = selectedStyleId
    ? (activeTab === 'front' ? deck.frontStyles[selectedStyleId] : deck.backStyles[selectedStyleId])
    : null;

  const handleStyleChange = (newLayout: CardLayout) => {
    if (!selectedStyleId) return;

    if (activeTab === 'front') {
        const newDeck = {
            ...deck,
            frontStyles: { ...deck.frontStyles, [selectedStyleId]: newLayout }
        };
        setDeck(newDeck);
    } else {
        const newDeck = {
            ...deck,
            backStyles: { ...deck.backStyles, [selectedStyleId]: newLayout }
        };
        setDeck(newDeck);
    }
  };

  const addElement = (type: 'text' | 'image' | 'shape', shapePreset?: string) => {
    if (!currentStyle) return;

    let points = undefined;
    if (type === 'shape' && shapePreset) {
        points = PRESET_SHAPES.find(p => p.name === shapePreset)?.points;
    }

    // Auto-detect field for images
    let defaultField = undefined;
    if (type === 'image') {
        const imageField = deck.fields.find(f => f.type === 'image');
        if (imageField) defaultField = imageField.name;
    }

    const newElement: LayoutElement = {
      id: `el-${Date.now()}`,
      name: type === 'shape' && shapePreset ? shapePreset : (type === 'text' ? 'New Text' : 'New Image'),
      type,
      x: 10, // mm
      y: 10, // mm
      width: type === 'text' ? 40 : 20, // mm
      height: type === 'text' ? 10 : 20, // mm
      staticText: type === 'text' ? 'New Text' : undefined,
      field: defaultField,
      fontSize: 12,
      color: '#000000',
      points: points ? [...points] : undefined,
      fillColor: type === 'shape' ? '#cccccc' : undefined,
      strokeWidth: type === 'shape' ? 0 : undefined,
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

  const duplicateElement = (elementId: string, targetStyleIds: string[]) => {
      if (!selectedStyleId) return;
      const elToCopy = deck.frontStyles[selectedStyleId]?.elements.find((e: LayoutElement) => e.id === elementId)
                    || deck.backStyles[selectedStyleId]?.elements.find((e: LayoutElement) => e.id === elementId);

      if (!elToCopy) return;

      const newDeck = { ...deck };

      targetStyleIds.forEach(targetId => {
          const targetStyle = newDeck.frontStyles[targetId] || newDeck.backStyles[targetId];
          if (targetStyle) {
              const newEl = { ...elToCopy, id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
              targetStyle.elements = [...targetStyle.elements, newEl];
          }
      });

      setDeck(newDeck);
      notifications.show({ title: 'Success', message: `Copied element to ${targetStyleIds.length} styles` });
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

  const renameStyleId = (newId: string) => {
      if (!selectedStyleId || !currentStyle) return;
      if (newId === selectedStyleId) return;

      // Basic validation
      if (!/^[a-z0-9-_]+$/.test(newId)) {
           notifications.show({ title: 'Error', message: 'ID can only contain lowercase letters, numbers, dashes and underscores.', color: 'red' });
           return;
      }

      const styles = activeTab === 'front' ? deck.frontStyles : deck.backStyles;
      if (styles[newId]) {
          notifications.show({ title: 'Error', message: 'Style with this ID already exists.', color: 'red' });
          return;
      }

      const newStyles = { ...styles };
      newStyles[newId] = newStyles[selectedStyleId];
      delete newStyles[selectedStyleId];

      const newCards = deck.cards.map(card => {
          if (activeTab === 'front' && card.frontStyleId === selectedStyleId) {
                return { ...card, frontStyleId: newId };
          }
          if (activeTab === 'back' && card.backStyleId === selectedStyleId) {
                return { ...card, backStyleId: newId };
          }
          return card;
      });

      // Update defaults
      let newDeck = { ...deck, cards: newCards };
      if (activeTab === 'front') {
            newDeck.frontStyles = newStyles;
             // Check against current implicit or explicit default
            const currentDefault = deck.defaultFrontStyleId || 'default-front';
            if (currentDefault === selectedStyleId) {
                newDeck.defaultFrontStyleId = newId;
            }
      } else {
            newDeck.backStyles = newStyles;
            const currentDefault = deck.defaultBackStyleId || 'default-back';
             if (currentDefault === selectedStyleId) {
                newDeck.defaultBackStyleId = newId;
            }
      }

      setDeck(newDeck);
      setSelectedStyleId(newId);
  };

  // Alignment Helpers
  const alignSelected = (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (!selectedElementId || !currentStyle) return;

      const element = currentStyle.elements.find(el => el.id === selectedElementId);
      if (!element) return;

      let updates: Partial<LayoutElement> = {};

      // Assuming deck dimensions are in mm, card mock is probably scaled?
      // Actually the layout stores raw values (mm usually).
      // deck.width / deck.height are the reference.

      switch (direction) {
          case 'left':
              updates.x = 0;
              break;
          case 'center':
              updates.x = (deck.width - element.width) / 2;
              break;
          case 'right':
              updates.x = deck.width - element.width;
              break;
          case 'top':
              updates.y = 0;
              break;
          case 'middle':
              updates.y = (deck.height - element.height) / 2;
              break;
          case 'bottom':
              updates.y = deck.height - element.height;
              break;
      }
      updateElement(selectedElementId, updates);
  };

  const deleteSelectedElement = () => {
      if (selectedElementId) {
          removeElement(selectedElementId);
      }
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

  // Temp points for dragging to avoid history spam
  const [tempPoints, setTempPoints] = useState<{ id: string, points: { x: number, y: number }[] } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!draggedPoint || !currentStyle || !canvasReady) return;
        const el = currentStyle.elements.find(e => e.id === draggedPoint.elementId);
        if (!el || !el.points) return;

        const canvas = document.querySelector('.card-editor-canvas') as HTMLElement;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        const scale = zoom;

        // Use temp points if they exist, otherwise source
        const currentPoints = (tempPoints && tempPoints.id === el.id) ? tempPoints.points : el.points;

        const elX = el.x * MM_TO_PX * scale;
        const elY = el.y * MM_TO_PX * scale;
        const elW = el.width * MM_TO_PX * scale;
        const elH = el.height * MM_TO_PX * scale;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newX = (mouseX - elX) / elW;
        const newY = (mouseY - elY) / elH;

        const newPoints = [...currentPoints];
        newPoints[draggedPoint.pointIndex] = { x: newX, y: newY };

        // Update temp state only
        setTempPoints({ id: el.id, points: newPoints });
    };

    const handleMouseUp = () => {
        if (draggedPoint && tempPoints && tempPoints.id === draggedPoint.elementId) {
             // Commit final state to deck (history)
             updateElement(draggedPoint.elementId, { points: tempPoints.points });
        }
        setDraggedPoint(null);
        setTempPoints(null);
    };

    if (draggedPoint) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedPoint, currentStyle, zoom, canvasReady, deck, tempPoints]); // Added tempPoints dependency


  if (!currentStyle) return <Text>No styles defined.</Text>;

  const selectedElement = currentStyle.elements.find(el => el.id === selectedElementId);

  // Calculate scaled dimensions
  const scale = zoom;
  const cardWidthPx = deck.width * MM_TO_PX * scale;
  const cardHeightPx = deck.height * MM_TO_PX * scale;

  const filteredCards = deck.cards.filter(c => {
      if (!selectedStyleId) return true;

      const styles = activeTab === 'front' ? deck.frontStyles : deck.backStyles;
      let cardStyleId = activeTab === 'front' ? c.frontStyleId : c.backStyleId;

      // Fallback logic matching CardRender
      if (!cardStyleId || !styles[cardStyleId]) {
          const defaultId = activeTab === 'front'
            ? (deck.defaultFrontStyleId || 'default-front')
            : (deck.defaultBackStyleId || 'default-back');
          if (styles[defaultId]) {
              cardStyleId = defaultId;
          } else {
              const allIds = Object.keys(styles);
              if (allIds.length > 0) {
                  cardStyleId = allIds[0];
              }
          }
      }

      return cardStyleId === selectedStyleId;
  });

  return (
    <>
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
            <Stack gap="xs" style={{ flex: 1 }}>
                <TextInput
                    label="Style Name"
                    value={currentStyle.name}
                    onChange={(e) => renameStyle(e.currentTarget.value)}
                />
                <TextInput
                    label="Style ID"
                    value={tempStyleId}
                    onChange={(e) => setTempStyleId(e.currentTarget.value)}
                    onBlur={() => renameStyleId(tempStyleId)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            renameStyleId(tempStyleId);
                            e.currentTarget.blur();
                        }
                    }}
                    description="Lowercase, numbers, dashes only"
                />
            </Stack>
            <ActionIcon color="red" variant="light" onClick={deleteStyle} mb={4} title="Delete Style">
                <IconTrash size={16} />
            </ActionIcon>
        </Group>

        <Paper withBorder p="xs" mt="md">
            <Text size="sm" fw={500} mb="xs">Live Preview Overlay</Text>
            <Stack gap="xs">
                <Select
                    placeholder="Select Card to Preview"
                    data={filteredCards.map(c => ({
                        value: c.id,
                        label: c.data.name || c.id
                    }))}
                    value={previewCardId}
                    onChange={setPreviewCardId}
                    searchable
                    clearable
                />
                <Group justify="space-between">
                    <Text size="sm">Show Overlay</Text>
                    <Switch
                        checked={showPreview}
                        onChange={(e) => setShowPreview(e.currentTarget.checked)}
                        disabled={!previewCardId}
                    />
                </Group>
                <Stack gap={0}>
                    <Text size="xs">Opacity: {Math.round(previewOpacity * 100)}%</Text>
                    <Slider
                        value={previewOpacity}
                        onChange={setPreviewOpacity}
                        min={0}
                        max={1}
                        step={0.1}
                        disabled={!showPreview}
                    />
                </Stack>
            </Stack>
        </Paper>

        <Paper withBorder p="xs" mt="md">
            <Text size="sm" fw={500} mb="xs">Element Control</Text>
            <Stack gap="xs">
                {/* Alignment Tools */}
                <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <Button variant="light" size="xs" fullWidth leftSection={<IconAlignLeft size={14} />} disabled={!selectedElementId}>
                            Align Element
                        </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Label>Horizontal</Menu.Label>
                        <Menu.Item leftSection={<IconAlignLeft size={14} />} onClick={() => alignSelected('left')}>
                            Align Left
                        </Menu.Item>
                        <Menu.Item leftSection={<IconAlignCenter size={14} />} onClick={() => alignSelected('center')}>
                            Align Center
                        </Menu.Item>
                        <Menu.Item leftSection={<IconAlignRight size={14} />} onClick={() => alignSelected('right')}>
                            Align Right
                        </Menu.Item>

                        <Menu.Divider />

                        <Menu.Label>Vertical</Menu.Label>
                        <Menu.Item leftSection={<IconArrowBarUp size={14} />} onClick={() => alignSelected('top')}>
                            Align Top
                        </Menu.Item>
                        <Menu.Item leftSection={<IconArrowsVertical size={14} />} onClick={() => alignSelected('middle')}>
                            Align Middle
                        </Menu.Item>
                        <Menu.Item leftSection={<IconArrowBarDown size={14} />} onClick={() => alignSelected('bottom')}>
                            Align Bottom
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                {/* Undo/Redo */}
                <Button.Group>
                    <Button variant="default" size="xs" onClick={undo} disabled={!canUndo} style={{ flex: 1 }}>Undo</Button>
                    <Button variant="default" size="xs" onClick={redo} disabled={!canRedo} style={{ flex: 1 }}>Redo</Button>
                </Button.Group>

                {/* Delete Element */}
                <Button variant="light" size="xs" color="red" fullWidth leftSection={<IconTrash size={14} />} onClick={deleteSelectedElement} disabled={!selectedElementId}>
                    Delete Element
                </Button>
            </Stack>
        </Paper>

        <Text fw={500} mt="md">Add Elements</Text>
        <Group>
          <Button size="xs" onClick={() => addElement('text')}>Add Text</Button>
          <Button size="xs" onClick={() => addElement('image')}>Add Image</Button>
          <Menu shadow="md" width={200}>
            <Menu.Target>
                <Button size="xs" rightSection={<IconPolygon size={14} />}>Add Shape</Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>Presets</Menu.Label>
                {PRESET_SHAPES.map(shape => (
                    <Menu.Item key={shape.name} onClick={() => addElement('shape', shape.name)}>
                        {shape.label}
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
          </Menu>
        </Group>


      </Stack>

      {/* Center Canvas */}
      <Stack style={{ flex: 1, height: '100%' }} gap={0}>
      <ScrollArea style={{ flex: 1, backgroundColor: '#f0f0f0' }}>
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
                    overflow: 'visible', // Allow handles to show outside
                }}
                className="card-editor-canvas"
                onClick={() => setSelectedElementId(null)}
            >
                {/* Live Preview Overlay */}
                {canvasReady && showPreview && previewCardId && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 1500,
                        opacity: previewOpacity,
                        pointerEvents: 'none',
                    }}>
                        <CardRender
                            card={deck.cards.find(c => c.id === previewCardId)!}
                            deck={deck}
                            mode={activeTab}
                            scale={scale}
                            border={false}
                        />
                    </div>
                )}

                {canvasReady && currentStyle.elements.map(el => {
                    const elementWidth = el.width * MM_TO_PX * scale;
                    const elementHeight = el.height * MM_TO_PX * scale;
                    const elementX = el.x * MM_TO_PX * scale;
                    const elementY = el.y * MM_TO_PX * scale;

                    return (
                    <Rnd
                        key={el.id}
                        position={{
                            x: elementX,
                            y: elementY
                        }}
                        size={{
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
                            overflow: 'hidden',
                            color: el.color,
                            fontSize: (el.fontSize || 12) * scale,
                            fontFamily: el.fontFamily || 'Arial, sans-serif',
                            fontWeight: el.fontWeight || 'normal',
                            fontStyle: el.fontStyle || 'normal',
                            textDecoration: el.textDecoration || 'none',
                            textAlign: el.textAlign || 'center',
                            alignItems: el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center',
                            justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center',
                            whiteSpace: 'pre-wrap',
                            pointerEvents: 'none',
                        }}>
                            {el.type === 'image' ? (
                                <div style={{ width: '100%', height: '100%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {el.field ? (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                            <Text size="xs" c="dimmed">Image: {el.field}</Text>
                                            <Text size="xs" c="dimmed">({el.objectFit || 'contain'})</Text>
                                        </div>
                                    ) : el.staticText ? (
                                        <ImageLoader
                                            path={el.staticText}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: (el.objectFit as any) || 'contain',
                                            }}
                                        />
                                    ) : (
                                        <div style={{ padding: 4, textAlign: 'center' }}>
                                            <Text size="xs" c="red" fw={500}>No Data Source</Text>
                                            <Text size="xs" c="dimmed">Select field below</Text>
                                        </div>
                                    )}
                                </div>
                             ) : el.type === 'shape' && el.points ? (
                     <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{ overflow: 'visible' }}
                     >
                       <polygon
                          points={((tempPoints && tempPoints.id === el.id) ? tempPoints.points : el.points).map(p => `${p.x * 100},${p.y * 100}`).join(' ')}
                          fill={el.fillColor || '#cccccc'}
                          stroke={el.strokeColor || 'none'}
                          strokeWidth={el.strokeWidth || 0}
                          vectorEffect="non-scaling-stroke"
                       />
                       {/* Render Resize Handles for Points */}
                       {selectedElementId === el.id && ((tempPoints && tempPoints.id === el.id) ? tempPoints.points : el.points).map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x * 100}
                            cy={p.y * 100}
                            r={3}
                            fill="red"
                            style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggedPoint({ elementId: el.id, pointIndex: i });
                            }}
                          />
                       ))}
                     </svg>
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
        <BottomControlBar
            selectedElement={selectedElement}
            updateElement={updateElement}
            removeElement={removeElement}
            duplicateElement={duplicateElement}
            deck={deck}
            currentStyleId={selectedStyleId || ''}
        />
      </Stack>

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
                                                  <Text
                                                    size="sm"
                                                    fw={el.fontWeight === 'bold' ? 700 : 400}
                                                    fs={el.fontStyle === 'italic' ? 'italic' : 'normal'}
                                                    td={el.textDecoration === 'underline' ? 'underline' : 'none'}
                                                    c="dark.4"
                                                    truncate
                                                    style={{ flex: 1, textAlign: el.textAlign || 'left' }}
                                                  >
                                                      {el.name || (el.type === 'image' ? 'Image' : (el.staticText || `{${el.field}}`))}
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
    </>
  );
}

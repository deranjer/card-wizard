import { Paper, Group, Stack, Text, Select, TextInput, NumberInput, ColorInput, SegmentedControl, Center, ActionIcon, Button, Modal, Checkbox } from '@mantine/core';
import { IconBold, IconItalic, IconUnderline, IconAlignLeft, IconAlignCenter, IconAlignRight, IconArrowBarUp, IconArrowBarDown, IconArrowsVertical, IconTrash, IconCopy } from '@tabler/icons-react';
import { LayoutElement, Deck } from '../types';
import { useState } from 'react';

interface BottomControlBarProps {
    selectedElement: LayoutElement | null | undefined;
    updateElement: (id: string, updates: Partial<LayoutElement>) => void;
    removeElement: (id: string) => void;
    duplicateElement: (elementId: string, targetStyleIds: string[]) => void;
    deck: Deck;
    currentStyleId: string;
}

export function BottomControlBar({ selectedElement, updateElement, removeElement, duplicateElement, deck, currentStyleId }: BottomControlBarProps) {
    const [copyModalOpen, setCopyModalOpen] = useState(false);
    const [selectedTargetStyles, setSelectedTargetStyles] = useState<string[]>([]);

    if (!selectedElement) return null;

    const allStyles = [
        ...Object.entries(deck.frontStyles).map(([id, s]) => ({ ...s, id, type: 'Front' })),
        ...Object.entries(deck.backStyles).map(([id, s]) => ({ ...s, id, type: 'Back' }))
    ].filter(s => s.id !== currentStyleId); // Exclude current style

    const handleCopy = () => {
        duplicateElement(selectedElement.id, selectedTargetStyles);
        setCopyModalOpen(false);
        setSelectedTargetStyles([]);
    };

    return (
        <Paper
            p="md"
            shadow="xs"
            style={{
                zIndex: 100,
                backgroundColor: 'rgba(27, 38, 54, 1)',
                borderTop: '1px solid #333',
                height: '180px',
                width: '100%',
            }}
        >
            <Group align="flex-start" h="100%">
                {/* Common Properties */}
                {/* Common Properties - Layer Name */}
                <Stack gap="xs" style={{ width: 150 }}>
                    <Text size="sm" fw={500}>Layer Name</Text>
                    <TextInput
                        placeholder="Layer Name"
                        value={selectedElement.name || ''}
                        onChange={(e) => updateElement(selectedElement.id, { name: e.currentTarget.value })}
                        size="xs"
                    />
                </Stack>

                {/* Common Properties - Data Source */}
                {selectedElement.type !== 'shape' && (
                <Stack gap="xs" style={{ width: 200 }}>
                    <Text size="sm" fw={500}>Data Source</Text>
                     <Select
                        placeholder="Static Text"
                        data={[{ value: '', label: 'Static Text' }, ...deck.fields.map(f => ({ value: f.name, label: f.name }))]}
                        value={selectedElement.field || ''}
                        onChange={(val) => updateElement(selectedElement.id, { field: val || undefined })}
                        size="xs"
                    />
                    {!selectedElement.field && selectedElement.type === 'text' && (
                        <TextInput
                            placeholder="Current Text"
                            value={selectedElement.staticText || ''}
                            onChange={(e) => updateElement(selectedElement.id, { staticText: e.currentTarget.value })}
                            size="xs"
                        />
                    )}
                </Stack>
                )}

                {/* Text Properties */}
                {selectedElement.type === 'text' && (
                    <>
                         <Stack gap="xs" style={{ width: 220 }}>
                            <Text size="sm" fw={500}>Font</Text>
                            <Select
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
                                size="xs"
                            />
                            <Group gap="xs" grow>
                                <NumberInput
                                    value={selectedElement.fontSize}
                                    onChange={(val) => updateElement(selectedElement.id, { fontSize: Number(val) })}
                                    size="xs"
                                    min={1}
                                />
                                <ColorInput
                                    value={selectedElement.color}
                                    onChange={(val) => updateElement(selectedElement.id, { color: val })}
                                    size="xs"
                                />
                            </Group>
                        </Stack>

                        <Stack gap="xs" style={{ width: 120 }}>
                            <Text size="sm" fw={500}>Alignment</Text>
                            <SegmentedControl
                                value={selectedElement.textAlign || 'center'}
                                onChange={(val) => updateElement(selectedElement.id, { textAlign: val as any })}
                                size="xs"
                                data={[
                                    { value: 'left', label: <Center><IconAlignLeft size={12} /></Center> },
                                    { value: 'center', label: <Center><IconAlignCenter size={12} /></Center> },
                                    { value: 'right', label: <Center><IconAlignRight size={12} /></Center> },
                                ]}
                            />
                             <SegmentedControl
                                value={selectedElement.verticalAlign || 'center'}
                                onChange={(val) => updateElement(selectedElement.id, { verticalAlign: val as any })}
                                size="xs"
                                data={[
                                    { value: 'top', label: <Center><IconArrowBarUp size={12} /></Center> },
                                    { value: 'middle', label: <Center><IconArrowsVertical size={12} /></Center> },
                                    { value: 'bottom', label: <Center><IconArrowBarDown size={12} /></Center> },
                                ]}
                            />
                        </Stack>

                         <Stack gap="xs">
                            <Text size="sm" fw={500}>Style</Text>
                            <Group gap="xs">
                                <ActionIcon
                                    variant={selectedElement.fontWeight === 'bold' ? 'filled' : 'default'}
                                    onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                >
                                    <IconBold size={16} />
                                </ActionIcon>
                                <ActionIcon
                                    variant={selectedElement.fontStyle === 'italic' ? 'filled' : 'default'}
                                    onClick={() => updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                >
                                    <IconItalic size={16} />
                                </ActionIcon>
                                <ActionIcon
                                    variant={selectedElement.textDecoration === 'underline' ? 'filled' : 'default'}
                                    onClick={() => updateElement(selectedElement.id, { textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })}
                                >
                                    <IconUnderline size={16} />
                                </ActionIcon>
                            </Group>
                        </Stack>
                    </>
                )}

                {/* Image Properties */}
                 {selectedElement.type === 'image' && (
                    <Stack gap="xs" style={{ width: 150 }}>
                        <Text size="sm" fw={500}>Image Fit</Text>
                        <Select
                            data={[
                                { value: 'contain', label: 'Fit (Contain)' },
                                { value: 'cover', label: 'Crop (Cover)' },
                                { value: 'fill', label: 'Stretch (Fill)' },
                            ]}
                            value={selectedElement.objectFit || 'contain'}
                            onChange={(val) => updateElement(selectedElement.id, { objectFit: val as any })}
                            size="xs"
                        />
                    </Stack>
                )}

                {/* Shape Properties */}
                {selectedElement.type === 'shape' && (
                    <Stack gap="xs" style={{ width: 250 }}>
                        <Text size="sm" fw={500}>Appearance</Text>
                        <Group gap="xs" grow>
                             <ColorInput
                                label="Fill"
                                value={selectedElement.fillColor || '#cccccc'}
                                onChange={(val) => updateElement(selectedElement.id, { fillColor: val })}
                                size="xs"
                            />
                            <ColorInput
                                label="Stroke"
                                value={selectedElement.strokeColor || ''}
                                onChange={(val) => updateElement(selectedElement.id, { strokeColor: val })}
                                size="xs"
                                placeholder="None"
                            />
                        </Group>
                         <NumberInput
                            label="Stroke Width"
                            value={selectedElement.strokeWidth || 0}
                            onChange={(val) => updateElement(selectedElement.id, { strokeWidth: Number(val) })}
                            size="xs"
                            min={0}
                        />
                    </Stack>
                )}

                <Stack justify="flex-end" h="100%" style={{ marginLeft: 'auto' }}>
                     <Button
                        leftSection={<IconCopy size={16}/>}
                        variant="default"
                        onClick={() => setCopyModalOpen(true)}
                        disabled={allStyles.length === 0}
                     >
                        Copy to...
                     </Button>
                     <Button color="red" leftSection={<IconTrash size={16}/>} onClick={() => removeElement(selectedElement.id)}>
                        Remove Content
                     </Button>
                </Stack>
            </Group>

            <Modal opened={copyModalOpen} onClose={() => setCopyModalOpen(false)} title="Copy Element to Other Styles">
                <Stack>
                    <Text size="sm">Select styles to copy this element to:</Text>

                    {allStyles.length === 0 && <Text c="dimmed">No other styles available.</Text>}

                    {allStyles.length > 0 && (
                        <>
                            <Checkbox
                                label="Select All"
                                checked={selectedTargetStyles.length === allStyles.length}
                                indeterminate={selectedTargetStyles.length > 0 && selectedTargetStyles.length < allStyles.length}
                                onChange={(e) => setSelectedTargetStyles(e.currentTarget.checked ? allStyles.map(s => s.id) : [])}
                            />
                            <Stack gap="xs" mt="xs" mah={300} style={{ overflowY: 'auto' }}>
                                {allStyles.map(style => (
                                    <Checkbox
                                        key={style.id}
                                        label={`${style.name} (${style.type})`}
                                        checked={selectedTargetStyles.includes(style.id)}
                                        onChange={(e) => {
                                            if (e.currentTarget.checked) {
                                                setSelectedTargetStyles([...selectedTargetStyles, style.id]);
                                            } else {
                                                setSelectedTargetStyles(selectedTargetStyles.filter(id => id !== style.id));
                                            }
                                        }}
                                    />
                                ))}
                            </Stack>
                        </>
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setCopyModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCopy} disabled={selectedTargetStyles.length === 0}>Copy</Button>
                    </Group>
                </Stack>
            </Modal>
        </Paper>
    );
}

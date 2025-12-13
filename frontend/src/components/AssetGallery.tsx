import { useState, useEffect, useRef } from 'react';
import { SimpleGrid, Card, Image, Text, Group, Button, Stack, ActionIcon, FileButton, Modal, LoadingOverlay } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconTrash, IconReplace, IconRefresh } from '@tabler/icons-react';
import { ListProjectImages, AddProjectImage, DeleteProjectImage, ReplaceProjectImage, SelectImageFile, LoadImageAsDataURL, SelectImageFiles, AddProjectImages } from '../../wailsjs/go/main/App';

interface AssetGalleryProps {
    onNavigateToHelp?: (section: string) => void;
    onSelect?: (filename: string) => void;
}

export function AssetGallery({ onNavigateToHelp, onSelect }: AssetGalleryProps) {
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [imageDataUrls, setImageDataUrls] = useState<Record<string, string>>({});

    const loadImages = async () => {
        setLoading(true);
        try {
            const list = await ListProjectImages();
            setImages(list || []);

            // Load thumbnails
            const urls: Record<string, string> = {};
            if (list) {
                // If list is huge, this might be slow. Optimization: Load on demand or pagination.
                // For now, simple loop is fine.
                for (const img of list) {
                    try {
                        const url = await LoadImageAsDataURL(`images/${img}`);
                        urls[img] = url;
                    } catch (e) {
                        console.error(`Failed to load thumbnail for ${img}`, e);
                    }
                }
            }
            setImageDataUrls(urls);
        } catch (error: any) {
            console.error(error);
            // Suppress the error notification if it's just "no game loaded" on startup
            if (error !== "no game loaded" && !error.toString().includes("no game loaded")) {
                 notifications.show({ title: 'Error', message: 'Failed to load images', color: 'red' });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only load if the component is mounted and we expect to have a game context.
        // Since AssetGallery is now part of the tabs, we might want to lazy load it or catch the error gracefully.
        // For now, let's catch the error silently if it's "no game loaded" which naturally happens on startup before LoadGame.
        loadImages();
    }, []);

    const handleUpload = async (file: File | null) => {
        // ... (Not used directly, but kept if we switch to Dropzone later)
    };

    const handleAddImage = async () => {
        try {
            const paths = await SelectImageFiles();
            if (paths && paths.length > 0) {
                setLoading(true);
                await AddProjectImages(paths);
                notifications.show({ title: 'Success', message: `Added ${paths.length} images` });
                await loadImages();
            }
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to add images', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}? This might break cards using it.`)) return;

        try {
            setLoading(true);
            await DeleteProjectImage(filename);
            notifications.show({ title: 'Success', message: 'Image deleted' });
            await loadImages();
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to delete image', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleReplace = async (targetFilename: string) => {
        try {
            const srcPath = await SelectImageFile();
            if (srcPath) {
                if (!confirm(`Replace content of ${targetFilename} with ${srcPath}?`)) return;

                setLoading(true);
                await ReplaceProjectImage(targetFilename, srcPath);
                notifications.show({ title: 'Success', message: 'Image replaced' });
                await loadImages(); // Reload to refresh thumbnail potentially (though URL might be cached in browser)
                // Force reload thumbnail?
                 try {
                    const url = await LoadImageAsDataURL(`images/${targetFilename}`);
                    setImageDataUrls(prev => ({ ...prev, [targetFilename]: url }));
                } catch (e) { console.error(e); }
            }
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to replace image', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack h="100%" p="md">
            <Group justify="space-between">
                <Text size="xl" fw={700}>{onSelect ? 'Select Image' : 'Asset Gallery'}</Text>
                <Group>
                    <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={loadImages} loading={loading}>Refresh</Button>
                    <Button leftSection={<IconUpload size={16} />} onClick={handleAddImage} loading={loading}>Add Image</Button>
                </Group>
            </Group>

            <div style={{ position: 'relative', flex: 1, minHeight: 200 }}>
                <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

                {images.length === 0 ? (
                    <Text c="dimmed" ta="center" mt="xl">No images in gallery. Click "Add Image" to get started.</Text>
                ) : (
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
                        {images.map(img => (
                            <Card
                                key={img}
                                shadow="sm"
                                padding="xs"
                                radius="md"
                                withBorder
                                style={{
                                    cursor: onSelect ? 'pointer' : 'default',
                                    borderColor: onSelect ? '#228be6' : undefined
                                }}
                                onClick={() => onSelect && onSelect(img)}
                            >
                                <Card.Section>
                                    <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', padding: 10 }}>
                                        <Image
                                            src={imageDataUrls[img]}
                                            height={140}
                                            fit="contain"
                                            fallbackSrc="https://placehold.co/200x200?text=No+Image"
                                            style={{ pointerEvents: 'none' }}
                                        />
                                    </div>
                                </Card.Section>

                                <Group justify="space-between" mt="xs" wrap="nowrap">
                                    <Text fw={500} size="sm" truncate title={img} style={{ flex: 1 }}>
                                        {img}
                                    </Text>
                                    {!onSelect && (
                                    <Group gap={4} onClick={(e) => e.stopPropagation()}>
                                        <ActionIcon variant="subtle" color="blue" onClick={() => handleReplace(img)} title="Replace Content">
                                            <IconReplace size={16} />
                                        </ActionIcon>
                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(img)} title="Delete">
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                    )}
                                </Group>
                            </Card>
                        ))}
                    </SimpleGrid>
                )}
            </div>
        </Stack>
    );
}

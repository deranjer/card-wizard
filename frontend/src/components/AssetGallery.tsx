import { memo, useEffect, useState } from 'react';
import {
  SimpleGrid,
  Card,
  Text,
  Group,
  Button,
  Stack,
  ActionIcon,
  LoadingOverlay,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUpload,
  IconTrash,
  IconReplace,
  IconRefresh,
  IconFolderOpen,
} from '@tabler/icons-react';
import {
  ListProjectImages,
  DeleteProjectImage,
  ReplaceProjectImage,
  SelectImageFile,
  SelectImageFiles,
  AddProjectImages,
  OpenAssetFolder,
} from '../../wailsjs/go/main/App';

interface AssetGalleryProps {
  // Accepted for parity with the other tab panels; the gallery has no help
  // affordance yet, so it is currently unused.
  onNavigateToHelp?: (section: string) => void;
  onSelect?: (filename: string) => void;
}

const NOOP = () => {};

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="%23f1f3f5"/><text x="50%" y="50%" fill="%23adb5bd" font-family="sans-serif" font-size="12" text-anchor="middle" dominant-baseline="middle">no image</text></svg>'
  );

interface TileProps {
  filename: string;
  /** Cache-bust token; bumped when assets are added/replaced. */
  version: number;
  selectable: boolean;
  onSelect: (filename: string) => void;
  onReplace: (filename: string) => void;
  onDelete: (filename: string) => void;
}

const AssetTile = memo(function AssetTile({
  filename,
  version,
  selectable,
  onSelect,
  onReplace,
  onDelete,
}: TileProps) {
  const src = `/local-image?path=${encodeURIComponent(`images/${filename}`)}&_v=${version}`;
  return (
    <Card
      shadow="sm"
      padding="xs"
      radius="md"
      withBorder
      style={{
        cursor: selectable ? 'pointer' : 'default',
        borderColor: selectable ? 'var(--mantine-color-blue-6)' : undefined,
      }}
      onClick={() => selectable && onSelect(filename)}
    >
      <Card.Section>
        <div
          style={{
            height: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            padding: 10,
          }}
        >
          <img
            src={src}
            alt={filename}
            loading="lazy"
            style={{
              maxHeight: 140,
              maxWidth: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </div>
      </Card.Section>

      <Group justify="space-between" mt="xs" wrap="nowrap">
        <Text fw={500} size="sm" truncate title={filename} style={{ flex: 1 }}>
          {filename}
        </Text>
        {!selectable && (
          <Group gap={4} onClick={(e) => e.stopPropagation()}>
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={() => onReplace(filename)}
              title="Replace Content"
            >
              <IconReplace size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onDelete(filename)}
              title="Delete"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        )}
      </Group>
    </Card>
  );
});

export function AssetGallery({ onSelect }: AssetGalleryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Bumped whenever the on-disk assets change so <img> URLs bypass the cache.
  const [version, setVersion] = useState(0);

  const loadImages = async () => {
    setLoading(true);
    try {
      const list = await ListProjectImages();
      setImages(list || []);
    } catch (error: any) {
      console.error(error);
      // "no game loaded" happens on first paint before a game exists — ignore it.
      if (!String(error).includes('no game loaded')) {
        notifications.show({ title: 'Error', message: 'Failed to load images', color: 'red' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const refresh = async (bust = false) => {
    if (bust) setVersion((v) => v + 1);
    await loadImages();
  };

  const handleAddImage = async () => {
    try {
      const paths = await SelectImageFiles();
      if (!paths || paths.length === 0) return;
      setLoading(true);
      await AddProjectImages(paths);
      notifications.show({ title: 'Success', message: `Added ${paths.length} images` });
      await refresh(true);
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Error', message: 'Failed to add images', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}? This might break cards using it.`))
      return;
    try {
      setLoading(true);
      await DeleteProjectImage(filename);
      notifications.show({ title: 'Success', message: 'Image deleted' });
      await refresh();
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
      if (!srcPath) return;
      if (!confirm(`Replace content of ${targetFilename} with ${srcPath}?`)) return;
      setLoading(true);
      await ReplaceProjectImage(targetFilename, srcPath);
      notifications.show({ title: 'Success', message: 'Image replaced' });
      await refresh(true); // bust the cache so the new content shows
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Error', message: 'Failed to replace image', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssetFolder = async () => {
    try {
      await OpenAssetFolder();
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Error', message: 'Failed to open folder', color: 'red' });
    }
  };

  return (
    <Stack h="100%" p="md">
      <Group justify="space-between">
        <Text size="xl" fw={700}>
          {onSelect ? 'Select Image' : 'Asset Gallery'}
        </Text>
        <Group>
          <Button
            leftSection={<IconFolderOpen size={16} />}
            variant="light"
            color="indigo"
            onClick={handleOpenAssetFolder}
          >
            Open Asset Folder
          </Button>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={() => refresh(true)}
            loading={loading}
          >
            Refresh
          </Button>
          <Button leftSection={<IconUpload size={16} />} onClick={handleAddImage} loading={loading}>
            Add Image
          </Button>
        </Group>
      </Group>

      <div style={{ position: 'relative', flex: 1, minHeight: 200 }}>
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

        {images.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">
            No images in gallery. Click "Add Image" to get started.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
            {images.map((img) => (
              <AssetTile
                key={img}
                filename={img}
                version={version}
                selectable={!!onSelect}
                onSelect={onSelect ?? NOOP}
                onReplace={handleReplace}
                onDelete={handleDelete}
              />
            ))}
          </SimpleGrid>
        )}
      </div>
    </Stack>
  );
}

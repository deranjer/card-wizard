import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Button,
  TextInput,
  ActionIcon,
  Menu,
  Tabs,
  Drawer,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  IconPlus,
  IconDeviceFloppy,
  IconFolderOpen,
  IconTrash,
  IconCards,
  IconHelp,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconChartBar,
  IconChevronDown,
  IconFileTypePdf,
  IconPhoto,
  IconTable,
  IconFilePlus,
} from '@tabler/icons-react';
import { Game } from '../types';
import {
  gameAtom,
  activeTabAtom,
  activeDeckIdAtom,
  activeDeckAtom,
  updateDeckAtom,
  renameGameAtom,
  addDeckAtom,
  deleteDeckAtom,
  setGameAtom,
  resetGameAtom,
} from '../store/game';
import { DeckDetails } from './DeckDetails';
import { StyleEditor } from './StyleEditor';
import { DeckPreview } from './DeckPreview';
import { PrintPreview } from './PrintPreview';
import { Help } from './Help';
import { AssetGallery } from './AssetGallery';
import { DeckExport } from './DeckExport';
import { KeyStatsModal } from './KeyStatsModal';
import { SaveGame, LoadGame, NewGame, SaveImages, ExportGameXLSX } from '../../wailsjs/go/main/App';
import { notifications } from '@mantine/notifications';

export function GameView() {
  const game = useAtomValue(gameAtom);
  const activeDeck = useAtomValue(activeDeckAtom);
  const [activeDeckId, setActiveDeckId] = useAtom(activeDeckIdAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);

  const updateDeck = useSetAtom(updateDeckAtom);
  const renameGame = useSetAtom(renameGameAtom);
  const addDeck = useSetAtom(addDeckAtom);
  const deleteDeck = useSetAtom(deleteDeckAtom);
  const setGame = useSetAtom(setGameAtom);
  const resetGame = useSetAtom(resetGameAtom);

  const [opened, { toggle }] = useDisclosure();
  const [sidebarCollapsed, { toggle: toggleSidebar }] = useDisclosure(false);
  const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  const [statsOpened, { open: openStats, close: closeStats }] = useDisclosure(false);
  const [helpSection, setHelpSection] = useState<string | undefined>();

  const navigateToHelp = (section: string) => {
    setHelpSection(section);
    openHelp();
  };

  // Inject @font-face rules for the active deck's custom fonts.
  useEffect(() => {
    const styleId = 'custom-fonts';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = (activeDeck.customFonts || [])
      .map(
        (font) => `
          @font-face {
            font-family: '${font.family}';
            src: url('/local-font?path=${encodeURIComponent(font.path)}');
          }
        `
      )
      .join('\n');
  }, [activeDeck.customFonts]);

  const handleSaveGame = async () => {
    try {
      await SaveGame(game as any);
      notifications.show({ title: 'Success', message: 'Game saved' });
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleNewGame = async () => {
    if (window.confirm('Do you want to save your current game before starting a new one?')) {
      await handleSaveGame();
    }
    try {
      await NewGame();
      resetGame();
      notifications.show({ title: 'Success', message: 'Started new game' });
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleLoadGame = async () => {
    try {
      const loadedGame = await LoadGame();
      if (loadedGame) {
        // Ensure IDs exist (migration for older saves).
        const decks = (loadedGame.decks || []).map((d: any, i: number) => ({
          ...d,
          id: d.id || `deck-${Date.now().toString(36)}-${i}`,
        }));
        setGame({ ...loadedGame, decks } as Game);
        notifications.show({ title: 'Success', message: 'Game loaded' });
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleDeleteDeck = (id: string) => {
    if (!deleteDeck(id)) {
      notifications.show({ title: 'Error', message: 'Cannot delete the last deck', color: 'red' });
    }
  };

  const handleExportAllDecksImages = async () => {
    try {
      notifications.show({
        title: 'Exporting',
        message: 'Generating images for all decks, please wait...',
        loading: true,
        autoClose: false,
        id: 'export-all-images',
      });

      const { exportDecksToImages } = await import('../utils/exportImages');
      await SaveImages(await exportDecksToImages(game.decks, { prefixWithDeckName: true }));

      notifications.update({
        id: 'export-all-images',
        title: 'Success',
        message: 'All decks exported as images successfully',
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error(error);
      notifications.update({
        id: 'export-all-images',
        title: 'Error',
        message: 'Failed to export images',
        color: 'red',
        loading: false,
        autoClose: 3000,
      });
    }
  };

  const handleExportAllDecksXLSX = async () => {
    try {
      await ExportGameXLSX(game as any);
      notifications.show({
        title: 'Success',
        message: 'Game exported to Excel with multiple sheets',
        color: 'green',
      });
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
    }
  };

  const handleExportAllDecksPDF = () => {
    notifications.show({
      title: 'Info',
      message: 'Use the Print tab to generate PDFs.',
      color: 'blue',
    });
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: sidebarCollapsed ? 80 : 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header style={{ zIndex: 100 }}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <ActionIcon variant="subtle" onClick={toggleSidebar} visibleFrom="sm">
              {sidebarCollapsed ? (
                <IconLayoutSidebarLeftExpand size={20} />
              ) : (
                <IconLayoutSidebarLeftCollapse size={20} />
              )}
            </ActionIcon>
            <IconCards size={30} />
            <TextInput
              value={game.name}
              onChange={(e) => renameGame(e.currentTarget.value)}
              variant="unstyled"
              size="lg"
              fw={700}
            />
          </Group>
          <Group>
            <Button
              variant="default"
              leftSection={<IconFilePlus size={16} />}
              onClick={handleNewGame}
            >
              New Game
            </Button>
            <Button
              variant="default"
              leftSection={<IconFolderOpen size={16} />}
              onClick={handleLoadGame}
            >
              Load Game
            </Button>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button variant="light" rightSection={<IconChevronDown size={14} />}>
                  Export Game
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Export All Decks</Menu.Label>
                <Menu.Item
                  leftSection={<IconFileTypePdf size={14} />}
                  onClick={handleExportAllDecksPDF}
                >
                  Export as PDF
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPhoto size={14} />}
                  onClick={handleExportAllDecksImages}
                >
                  Export as Images
                </Menu.Item>
                <Menu.Item leftSection={<IconTable size={14} />} onClick={handleExportAllDecksXLSX}>
                  Export to Excel
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveGame}>
              Save Game
            </Button>
            <ActionIcon variant="subtle" size="lg" onClick={openStats} title="Game Statistics">
              <IconChartBar size={24} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="lg" onClick={openHelp} title="Help">
              <IconHelp size={24} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Group justify={sidebarCollapsed ? 'center' : 'space-between'} mb="md">
          {!sidebarCollapsed && <Text fw={500}>Decks</Text>}
          <ActionIcon variant="light" onClick={() => addDeck()} title="Add Deck">
            <IconPlus size={16} />
          </ActionIcon>
        </Group>
        {game.decks.map((deck) => (
          <NavLink
            key={deck.id}
            label={!sidebarCollapsed ? deck.name : null}
            leftSection={<IconCards size={16} />}
            active={deck.id === activeDeckId}
            onClick={() => setActiveDeckId(deck.id)}
            rightSection={
              !sidebarCollapsed &&
              game.decks.length > 1 && (
                <ActionIcon
                  size="xs"
                  color="red"
                  variant="subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${deck.name}"?`)) {
                      handleDeleteDeck(deck.id);
                    }
                  }}
                >
                  <IconTrash size={12} />
                </ActionIcon>
              )
            }
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="details">Deck Details</Tabs.Tab>
            <Tabs.Tab value="design">Card Design</Tabs.Tab>
            <Tabs.Tab value="gallery">Asset Gallery</Tabs.Tab>
            <Tabs.Tab value="export">Export</Tabs.Tab>
            <Tabs.Tab value="preview">Preview</Tabs.Tab>
            <Tabs.Tab value="print">Print</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="details">
            <DeckDetails
              key={activeDeck.id} // Re-mount on deck switch to reset internal state
              deck={activeDeck}
              setDeck={updateDeck}
              onNavigateToHelp={navigateToHelp}
              onDeleteDeck={() => {
                if (window.confirm('Are you sure you want to delete this deck?')) {
                  handleDeleteDeck(activeDeck.id);
                }
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="design">
            <StyleEditor key={activeDeck.id} deck={activeDeck} setDeck={updateDeck} />
          </Tabs.Panel>

          <Tabs.Panel value="gallery">
            <AssetGallery onNavigateToHelp={navigateToHelp} />
          </Tabs.Panel>

          <Tabs.Panel value="preview">
            <DeckPreview key={activeDeck.id} deck={activeDeck} onNavigateToHelp={navigateToHelp} />
          </Tabs.Panel>

          <Tabs.Panel value="export">
            <DeckExport key={activeDeck.id} deck={activeDeck} />
          </Tabs.Panel>

          <Tabs.Panel value="print">
            <PrintPreview key={activeDeck.id} deck={activeDeck} onNavigateToHelp={navigateToHelp} />
          </Tabs.Panel>
        </Tabs>
      </AppShell.Main>

      <Drawer
        opened={helpOpened}
        onClose={closeHelp}
        title="Card Wizard Help"
        position="right"
        size="xl"
        padding="md"
      >
        <Help section={helpSection} />
      </Drawer>

      <KeyStatsModal game={game} opened={statsOpened} onClose={closeStats} />
    </AppShell>
  );
}

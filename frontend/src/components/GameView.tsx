import { AppShell, Burger, Group, NavLink, Text, Button, TextInput, ActionIcon, Menu, Tabs, Drawer } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import { IconPlus, IconDeviceFloppy, IconFolderOpen, IconTrash, IconCards, IconHelp, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconChartBar, IconChevronDown, IconFileTypePdf, IconPhoto, IconTable, IconFilePlus } from '@tabler/icons-react';
import { Game, Deck, DEFAULT_DECK } from '../types';
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
import { CardRender } from './CardRender';

export function GameView() {

    const handleExportImages = async () => {
        if (!activeDeckId || !game) return;
        const deck = game.decks.find(d => d.id === activeDeckId);
        if (!deck) return;

        try {
            notifications.show({ title: 'Exporting', message: 'Generating images, please wait...', loading: true, autoClose: false, id: 'export-images' });

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.width = 'fit-content';
            document.body.appendChild(container);

            const images: Record<string, string> = {};
            const { createRoot } = await import('react-dom/client');
            const html2canvas = (await import('html2canvas')).default;

            for (const card of deck.cards) {
                // Render Front
                const frontDiv = document.createElement('div');
                container.appendChild(frontDiv);
                const frontRoot = createRoot(frontDiv);

                await new Promise<void>((resolve) => {
                    frontRoot.render(
                        <div style={{ width: 'fit-content', height: 'fit-content', background: 'white' }}>
                            <CardRender
                                deck={deck}
                                card={card}
                                mode="front"
                                scale={1}
                            />
                        </div>
                    );
                    setTimeout(resolve, 100);
                });

                const frontCanvas = await html2canvas(frontDiv.firstChild as HTMLElement, {
                    backgroundColor: null,
                    logging: false,
                    useCORS: true,
                    scale: 2
                });
                images[`${card.id}-front.png`] = frontCanvas.toDataURL('image/png');
                frontRoot.unmount();
                container.removeChild(frontDiv);

                // Render Back
                const backDiv = document.createElement('div');
                container.appendChild(backDiv);
                const backRoot = createRoot(backDiv);

                await new Promise<void>((resolve) => {
                    backRoot.render(
                        <div style={{ width: 'fit-content', height: 'fit-content', background: 'white' }}>
                            <CardRender
                                deck={deck}
                                card={card}
                                mode="back"
                                scale={1}
                            />
                        </div>
                    );
                    setTimeout(resolve, 100);
                });

                const backCanvas = await html2canvas(backDiv.firstChild as HTMLElement, {
                     backgroundColor: null,
                     logging: false,
                     useCORS: true,
                     scale: 2
                });
                images[`${card.id}-back.png`] = backCanvas.toDataURL('image/png');
                backRoot.unmount();
                container.removeChild(backDiv);
            }

            document.body.removeChild(container);
            await SaveImages(images);

            notifications.update({ id: 'export-images', title: 'Success', message: 'Images exported successfully', color: 'green', loading: false, autoClose: 3000 });

        } catch (error) {
            console.error(error);
            notifications.update({ id: 'export-images', title: 'Error', message: 'Failed to export images', color: 'red', loading: false, autoClose: 3000 });
        }
    };

    const handleExportPDF = async () => {
        // ... (Existing or new implementation)
        // For now, let's assuming PrintPreview handles it or we call backend direct
        // Since we didn't implement backend direct PDF from JSON easily without frontend layout,
        // usually PrintPreview is the way. But here let's just show notification or link to Print tab.
        notifications.show({ title: 'Info', message: 'Use the Print tab to generate PDFs.', color: 'blue' });
    };

    const handleExportAllDecksImages = async () => {
        try {
            notifications.show({
                title: 'Exporting',
                message: 'Generating images for all decks, please wait...',
                loading: true,
                autoClose: false,
                id: 'export-all-images'
            });

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.width = 'fit-content';
            document.body.appendChild(container);

            const images: Record<string, string> = {};
            const { createRoot } = await import('react-dom/client');
            const html2canvas = (await import('html2canvas')).default;

            // Loop through all decks
            for (const deck of game.decks) {
                for (const card of deck.cards) {
                    // Render Front
                    const frontDiv = document.createElement('div');
                    container.appendChild(frontDiv);
                    const frontRoot = createRoot(frontDiv);

                    await new Promise<void>((resolve) => {
                        frontRoot.render(
                            <div style={{ width: 'fit-content', height: 'fit-content', background: 'white' }}>
                                <CardRender
                                    deck={deck}
                                    card={card}
                                    mode="front"
                                    scale={1}
                                />
                            </div>
                        );
                        setTimeout(resolve, 100);
                    });

                    const frontCanvas = await html2canvas(frontDiv.firstChild as HTMLElement, {
                        backgroundColor: null,
                        logging: false,
                        useCORS: true,
                        scale: 2
                    });
                    images[`${deck.name}-${card.id}-front.png`] = frontCanvas.toDataURL('image/png');
                    frontRoot.unmount();
                    container.removeChild(frontDiv);

                    // Render Back
                    const backDiv = document.createElement('div');
                    container.appendChild(backDiv);
                    const backRoot = createRoot(backDiv);

                    await new Promise<void>((resolve) => {
                        backRoot.render(
                            <div style={{ width: 'fit-content', height: 'fit-content', background: 'white' }}>
                                <CardRender
                                    deck={deck}
                                    card={card}
                                    mode="back"
                                    scale={1}
                                />
                            </div>
                        );
                        setTimeout(resolve, 100);
                    });

                    const backCanvas = await html2canvas(backDiv.firstChild as HTMLElement, {
                        backgroundColor: null,
                        logging: false,
                        useCORS: true,
                        scale: 2
                    });
                    images[`${deck.name}-${card.id}-back.png`] = backCanvas.toDataURL('image/png');
                    backRoot.unmount();
                    container.removeChild(backDiv);
                }
            }

            document.body.removeChild(container);
            await SaveImages(images);

            notifications.update({
                id: 'export-all-images',
                title: 'Success',
                message: 'All decks exported as images successfully',
                color: 'green',
                loading: false,
                autoClose: 3000
            });

        } catch (error) {
            console.error(error);
            notifications.update({
                id: 'export-all-images',
                title: 'Error',
                message: 'Failed to export images',
                color: 'red',
                loading: false,
                autoClose: 3000
            });
        }
    };

    const handleExportAllDecksXLSX = async () => {
        try {
            await ExportGameXLSX(game as any);
            notifications.show({
                title: 'Success',
                message: 'Game exported to Excel with multiple sheets',
                color: 'green'
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: String(err),
                color: 'red'
            });
        }
    };

    const handleExportAllDecksPDF = async () => {
         // Placeholder for Excel export integration if needed here
         notifications.show({ title: 'Info', message: 'Excel export available in Spreadsheet view.', color: 'blue' });
    };

    const handleNewGame = async () => {
        if (window.confirm('Do you want to save your current game before starting a new one?')) {
            await handleSaveGame();
        }

        try {
            await NewGame();
            setGame({
                name: 'New Game',
                decks: [{ ...DEFAULT_DECK, id: `deck-${Date.now()}` }]
            });
             // Reset active deck and tab
             const newDeckId = `deck-${Date.now()}`;
             // Note: setGame is async, but we are setting safe defaults.
             // Ideally we construct the object first.
             const newGame: Game = {
                 name: 'New Game',
                 decks: [{ ...DEFAULT_DECK, id: newDeckId }]
             };
             setGame(newGame);
             setActiveDeckId(newGame.decks[0].id);
             setActiveTab('details');

            notifications.show({ title: 'Success', message: 'Started new game' });
        } catch (err) {
            notifications.show({ title: 'Error', message: String(err), color: 'red' });
        }
    };

    const [opened, { toggle }] = useDisclosure();
    const [sidebarCollapsed, { toggle: toggleSidebar }] = useDisclosure(false);
    const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
    const [statsOpened, { open: openStats, close: closeStats }] = useDisclosure(false);
    const [game, setGame] = useState<Game>({
        name: 'New Game',
        decks: [{ ...DEFAULT_DECK, id: `deck-${Date.now()}` }]
    });
    const [activeDeckId, setActiveDeckId] = useState<string>(game.decks[0].id);
    const [activeTab, setActiveTab] = useState<string | null>('details');
    const [helpSection, setHelpSection] = useState<string | undefined>();

    const activeDeck = game.decks.find(d => d.id === activeDeckId) || game.decks[0];

    const navigateToHelp = (section: string) => {
        setHelpSection(section);
        openHelp();
    };

    useEffect(() => {
        // Clean up old styles
        const styleId = 'custom-fonts';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }

        const css = (activeDeck.customFonts || []).map(font => `
          @font-face {
            font-family: '${font.family}';
            src: url('/local-font?path=${encodeURIComponent(font.path)}');
          }
        `).join('\n');

        styleEl.textContent = css;
      }, [activeDeck.customFonts]);

    const handleAddDeck = () => {
        const newDeck = { ...DEFAULT_DECK, id: `deck-${Date.now()}`, name: `New Deck ${game.decks.length + 1}` };
        setGame({ ...game, decks: [...game.decks, newDeck] });
        setActiveDeckId(newDeck.id);
    };

    const handleDeleteDeck = (id: string) => {
        if (game.decks.length <= 1) {
            notifications.show({ title: 'Error', message: 'Cannot delete the last deck', color: 'red' });
            return;
        }
        const newDecks = game.decks.filter(d => d.id !== id);
        setGame({ ...game, decks: newDecks });
        if (activeDeckId === id) {
            setActiveDeckId(newDecks[0].id);
        }
    };

    const updateDeck = (updatedDeck: Deck) => {
        const newDecks = game.decks.map(d => d.id === updatedDeck.id ? updatedDeck : d);
        setGame({ ...game, decks: newDecks });
    };

    const handleSaveGame = async () => {
        try {
            await SaveGame(game as any);
            notifications.show({ title: 'Success', message: 'Game saved' });
        } catch (err) {
            notifications.show({ title: 'Error', message: String(err), color: 'red' });
        }
    };

    const handleLoadGame = async () => {
        try {
            const loadedGame = await LoadGame();
            if (loadedGame) {
                // Ensure IDs exist (migration)
                const decks = (loadedGame.decks || []).map((d: any, i: number) => ({
                    ...d,
                    id: d.id || `deck-${Date.now()}-${i}`
                }));
                setGame({ ...loadedGame, decks } as Game);
                setActiveDeckId(decks[0].id);
                notifications.show({ title: 'Success', message: 'Game loaded' });
            }
        } catch (err) {
            notifications.show({ title: 'Error', message: String(err), color: 'red' });
        }
    };

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: sidebarCollapsed ? 80 : 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened }
            }}
            padding="md"
        >
            <AppShell.Header style={{ zIndex: 100 }}>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <ActionIcon variant="subtle" onClick={toggleSidebar} visibleFrom="sm">
                            {sidebarCollapsed ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}
                        </ActionIcon>
                        <IconCards size={30} />
                        <TextInput
                            value={game.name}
                            onChange={(e) => setGame({ ...game, name: e.currentTarget.value })}
                            variant="unstyled"
                            size="lg"
                            fw={700}
                        />
                    </Group>
                    <Group>
                        <Button variant="default" leftSection={<IconFilePlus size={16} />} onClick={handleNewGame}>New Game</Button>
                        <Button variant="default" leftSection={<IconFolderOpen size={16} />} onClick={handleLoadGame}>Load Game</Button>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <Button variant="light" rightSection={<IconChevronDown size={14} />}>Export Game</Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Export All Decks</Menu.Label>
                                <Menu.Item leftSection={<IconFileTypePdf size={14} />} onClick={() => handleExportAllDecksPDF()}>
                                    Export as PDF
                                </Menu.Item>
                                <Menu.Item leftSection={<IconPhoto size={14} />} onClick={() => handleExportAllDecksImages()}>
                                    Export as Images
                                </Menu.Item>
                                <Menu.Item leftSection={<IconTable size={14} />} onClick={() => handleExportAllDecksXLSX()}>
                                    Export to Excel
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveGame}>Save Game</Button>
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
                <Group justify={sidebarCollapsed ? "center" : "space-between"} mb="md">
                    {!sidebarCollapsed && <Text fw={500}>Decks</Text>}
                    <ActionIcon variant="light" onClick={handleAddDeck} title="Add Deck">
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
                            !sidebarCollapsed && game.decks.length > 1 && (
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
                            key={activeDeck.id} // Force re-mount on deck switch to reset internal state if needed
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
                <Help section={helpSection} />
            </Drawer>

            <KeyStatsModal
                game={game}
                opened={statsOpened}
                onClose={closeStats}
            />
        </AppShell>
    );
}

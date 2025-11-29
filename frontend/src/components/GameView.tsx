import { AppShell, Burger, Group, NavLink, Text, Button, TextInput, ActionIcon, Menu, Tabs, Drawer } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import { IconPlus, IconDeviceFloppy, IconFolderOpen, IconTrash, IconCards, IconHelp, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { Game, Deck, DEFAULT_DECK } from '../types';
import { DeckDetails } from './DeckDetails';
import { StyleEditor } from './StyleEditor';
import { DeckPreview } from './DeckPreview';
import { PrintPreview } from './PrintPreview';
import { Help } from './Help';
import { SaveGame, LoadGame } from '../../wailsjs/go/main/App';
import { notifications } from '@mantine/notifications';

export function GameView() {
    const [opened, { toggle }] = useDisclosure();
    const [sidebarCollapsed, { toggle: toggleSidebar }] = useDisclosure(false);
    const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
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
            <AppShell.Header>
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
                        <Button variant="default" leftSection={<IconFolderOpen size={16} />} onClick={handleLoadGame}>Load Game</Button>
                        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveGame}>Save Game</Button>
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
                                        handleDeleteDeck(deck.id);
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
                        <Tabs.Tab value="preview">Preview</Tabs.Tab>
                        <Tabs.Tab value="print">Print</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="details">
                        <DeckDetails
                            key={activeDeck.id} // Force re-mount on deck switch to reset internal state if needed
                            deck={activeDeck}
                            setDeck={updateDeck}
                            onNavigateToHelp={navigateToHelp}
                        />
                    </Tabs.Panel>

                    <Tabs.Panel value="design">
                        <StyleEditor key={activeDeck.id} deck={activeDeck} setDeck={updateDeck} />
                    </Tabs.Panel>

                    <Tabs.Panel value="preview">
                        <DeckPreview key={activeDeck.id} deck={activeDeck} onNavigateToHelp={navigateToHelp} />
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
        </AppShell>
    );
}

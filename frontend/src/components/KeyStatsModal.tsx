import { Modal, Group, Stack, Text, Paper, SimpleGrid, Title, Table, RingProgress, Center } from '@mantine/core';
import { Game } from '../types';
import { IconCards, IconLayoutBoard, IconPhoto } from '@tabler/icons-react';

interface KeyStatsModalProps {
    game: Game;
    opened: boolean;
    onClose: () => void;
}

export function KeyStatsModal({ game, opened, onClose }: KeyStatsModalProps) {
    // Calculate global stats
    const totalCards = game.decks.reduce((sum, deck) => sum + deck.cards.length, 0);
    const totalCardCopies = game.decks.reduce((sum, deck) =>
        sum + deck.cards.reduce((cSum, card) => cSum + (card.count || 1), 0), 0
    );
    const totalFronts = game.decks.reduce((sum, deck) => sum + Object.keys(deck.frontStyles).length, 0);
    const totalBacks = game.decks.reduce((sum, deck) => sum + Object.keys(deck.backStyles).length, 0);

    const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) => (
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
                <div>
                    <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        {title}
                    </Text>
                    <Text fw={700} fz="xl">
                        {value}
                    </Text>
                </div>
                <Icon size={28} color={color} stroke={1.5} />
            </Group>
        </Paper>
    );

    return (
        <Modal opened={opened} onClose={onClose} title="Game Statistics" size="lg">
            <Stack gap="xl">
                {/* Summary Cards */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <StatCard title="Total Cards (Unique)" value={totalCards} icon={IconCards} color="blue" />
                    <StatCard title="Total Copies" value={totalCardCopies} icon={IconCards} color="cyan" />
                    <StatCard title="Total Styles" value={totalFronts + totalBacks} icon={IconLayoutBoard} color="violet" />
                </SimpleGrid>

                {/* Deck Breakdown */}
                <div>
                    <Title order={4} mb="md">Deck Breakdown</Title>
                    <Table stickyHeader striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Deck Name</Table.Th>
                                <Table.Th>Cards</Table.Th>
                                <Table.Th>Front Styles</Table.Th>
                                <Table.Th>Back Styles</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {game.decks.map(deck => (
                                <Table.Tr key={deck.id}>
                                    <Table.Td fw={500}>{deck.name}</Table.Td>
                                    <Table.Td>{deck.cards.length} ({deck.cards.reduce((s, c) => s + (c.count || 1), 0)} copies)</Table.Td>
                                    <Table.Td>{Object.keys(deck.frontStyles).length}</Table.Td>
                                    <Table.Td>{Object.keys(deck.backStyles).length}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </div>
            </Stack>
        </Modal>
    );
}

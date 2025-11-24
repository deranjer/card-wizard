import {useEffect, useState} from 'react'
import {
    AppShell,
    Badge,
    Button,
    Container,
    Group,
    Stack,
    Table,
    Text,
    Title,
} from '@mantine/core'
import {notifications} from '@mantine/notifications'
import {SampleDeck as sampleDeckBinding} from '../wailsjs/go/main/App'

declare global {
    interface Window {
        go?: Record<string, any>
    }
}

type Card = {
    id: string
    name: string
    description: string
    copies: number
}

const fetchSampleDeck = async (): Promise<Card[]> => {
    const binding = (window.go?.main?.App?.SampleDeck ?? sampleDeckBinding) as
        | (() => Promise<Card[]>)
        | undefined

    if (!binding) {
        throw new Error('Wails backend bridge not available. Launch via "wails dev" or the packaged binary.')
    }

    return binding()
}

function App() {
    const [cards, setCards] = useState<Card[]>([])
    const [loading, setLoading] = useState(false)

    const loadDeck = async () => {
        setLoading(true)

        try {
            const data = await fetchSampleDeck()
            setCards(data)
            notifications.show({
                title: 'Deck synced',
                message: 'Loaded placeholder cards from the Go backend.',
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            notifications.show({
                color: 'red',
                title: 'Failed to fetch cards',
                message,
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadDeck()
    }, [])

    return (
        <AppShell header={{height: 60}} padding="md">
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Title order={3}>Card Wizard</Title>
                    <Button variant="light" loading={loading} onClick={() => void loadDeck()}>
                        Reload Sample Deck
                    </Button>
                </Group>
            </AppShell.Header>
            <AppShell.Main>
                <Container size="lg">
                    <Stack gap="md">
                        <div>
                            <Title order={2}>Prototype Deck</Title>
                            <Text c="dimmed">
                                Cards originate from Go via Wails bindings. Import spreadsheets next.
                            </Text>
                        </div>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Name</Table.Th>
                                    <Table.Th>Description</Table.Th>
                                    <Table.Th ta="right">Copies</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {cards.map((card) => (
                                    <Table.Tr key={card.id}>
                                        <Table.Td>{card.name}</Table.Td>
                                        <Table.Td>{card.description}</Table.Td>
                                        <Table.Td ta="right">
                                            <Badge variant="filled">{card.copies}</Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                {cards.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={3}>
                                            <Text c="dimmed">No cards yet. Import a spreadsheet to begin.</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    )
}

export default App

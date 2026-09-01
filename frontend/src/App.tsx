import { GameView } from './components/GameView'
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

function App() {
    return (
        <MantineProvider defaultColorScheme="dark">
            <Notifications />
            <GameView />
        </MantineProvider>
    )
}

export default App

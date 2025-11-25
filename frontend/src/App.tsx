import { Layout } from './components/Layout'
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

function App() {
    return (
        <MantineProvider>
            <Notifications />
            <Layout />
        </MantineProvider>
    )
}

export default App

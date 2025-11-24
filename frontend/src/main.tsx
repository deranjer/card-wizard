import React from 'react'
import {createRoot} from 'react-dom/client'
import {MantineProvider} from '@mantine/core'
import {Notifications} from '@mantine/notifications'
import './style.css'
import App from './App'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <MantineProvider defaultColorScheme="dark">
            <Notifications/>
            <App/>
        </MantineProvider>
    </React.StrictMode>
)

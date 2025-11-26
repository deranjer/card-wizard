import { useState, useEffect } from 'react';
import { AppShell, Tabs, Text } from '@mantine/core';
import { DeckDetails } from './DeckDetails';
import { StyleEditor } from './StyleEditor';
import { DeckPreview } from './DeckPreview';
import { PrintPreview } from './PrintPreview';
import { Help } from './Help';
import { Deck, DEFAULT_DECK } from '../types';

export function Layout() {
  const [activeTab, setActiveTab] = useState<string | null>('details');
  const [deck, setDeck] = useState<Deck>(DEFAULT_DECK);
  const [loadId, setLoadId] = useState(0);
  const [helpSection, setHelpSection] = useState<string | undefined>();

  const navigateToHelp = (section: string) => {
    setActiveTab('help');
    setHelpSection(section);
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

    const css = (deck.customFonts || []).map(font => `
      @font-face {
        font-family: '${font.family}';
        src: url('/local-font?path=${encodeURIComponent(font.path)}');
      }
    `).join('\n');

    styleEl.textContent = css;
  }, [deck.customFonts]);

  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="details">Deck Details</Tabs.Tab>
            <Tabs.Tab value="design">Card Design</Tabs.Tab>
            <Tabs.Tab value="preview">Preview</Tabs.Tab>
            <Tabs.Tab value="print">Print</Tabs.Tab>
            <Tabs.Tab value="help">Help</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="details">
            <DeckDetails
              deck={deck}
              setDeck={setDeck}
              onDeckLoad={() => setLoadId(prev => prev + 1)}
              onNavigateToHelp={navigateToHelp}
            />
          </Tabs.Panel>

          <Tabs.Panel value="design">
            <StyleEditor key={loadId} deck={deck} setDeck={setDeck} />
          </Tabs.Panel>

          <Tabs.Panel value="preview">
            <DeckPreview key={loadId} deck={deck} onNavigateToHelp={navigateToHelp} />
          </Tabs.Panel>

          <Tabs.Panel value="print">
            <PrintPreview key={loadId} deck={deck} onNavigateToHelp={navigateToHelp} />
          </Tabs.Panel>

          <Tabs.Panel value="help">
            <Help section={helpSection} />
          </Tabs.Panel>
        </Tabs>
      </AppShell.Main>
    </AppShell>
  );
}

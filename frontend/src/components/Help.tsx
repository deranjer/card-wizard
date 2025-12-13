import { Container, Title, Text, Stack, Paper, List, Anchor, Code, Button, Group } from '@mantine/core';
import { IconCopy, IconRobot } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

interface HelpProps {
  section?: string;
}

export function Help({ section }: HelpProps) {
  useEffect(() => {
    if (section) {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [section]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Card Wizard Help</Title>
          <Text c="dimmed" mt="xs">
            Learn how to use Card Wizard to create custom playing cards
          </Text>
        </div>

        {/* Deck Details Section */}
        <Paper id="deck-details" withBorder p="md" shadow="sm">
          <Title order={2} mb="md">Deck Details</Title>
          <Stack gap="md">
            <div>
              <Title order={3} size="h4">Getting Started</Title>
              <Text>
                Card Wizard organizes your work into <strong>Games</strong>. A Game can contain multiple <strong>Decks</strong> (e.g., a Poker deck, a Mini deck, etc.).
                The Deck Details tab is where you manage the currently selected deck's information and card data.
              </Text>
            </div>

            <div>
              <Title order={4} size="h5">Import/Export Cards</Title>
              <Text mb="xs">
                  Use the <strong>Data</strong> dropdown menu to import or export data for the active deck.
              </Text>
              <List>
                <List.Item>
                  <strong>Import XLSX:</strong> Import card data from an Excel spreadsheet. The first row should contain column headers, and each subsequent row represents a card.
                </List.Item>
                <List.Item>
                  <strong>Export XLSX:</strong> Export your current deck to an Excel file for editing or backup.
                </List.Item>
                <List.Item>
                  Exporting your current deck to XLSX will <strong>only export the non-default columns. JSON export will export all data.</strong>
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Save/Load Game</Title>
              <List>
                <List.Item>
                  <strong>Save Game:</strong> Save your entire game (all decks, settings, styles, and fonts) to a JSON file.
                </List.Item>
                <List.Item>
                  <strong>Load Game:</strong> Load a previously saved game file.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Deck Management</Title>
              <Text mb="xs">
                  Use the sidebar to manage multiple decks within your game:
              </Text>
              <List>
                <List.Item>
                  <strong>Add Deck:</strong> Click the <strong>+</strong> icon to create a new deck.
                </List.Item>
                <List.Item>
                  <strong>Switch Decks:</strong> Click on a deck name in the sidebar to switch to it.
                </List.Item>
                <List.Item>
                  <strong>Delete Deck:</strong> Click the trash icon next to a deck name to remove it (you cannot delete the last deck).
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Spreadsheet View</Title>
              <Text mb="xs">
                The spreadsheet view allows you to manage your card data:
              </Text>
              <List>
                <List.Item>
                  <strong>Add/Remove Columns:</strong> Define custom fields for your cards (text or image fields).
                </List.Item>
                <List.Item>
                  <strong>Edit Cells:</strong> Click any cell to edit its value. For image fields, you can select image files.
                </List.Item>
                <List.Item>
                  <strong>Add/Delete Rows:</strong> Add new cards or remove existing ones.
                </List.Item>
                <List.Item>
                  <strong>Card Count:</strong> Set how many copies of each card to print.
                </List.Item>
                <List.Item>
                  <strong>Styles:</strong> Assign front and back styles to each card.
                </List.Item>
                <List.Item>
                  <strong>Resize Columns:</strong> Drag the column borders to adjust width.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Deck Settings</Title>
              <List>
                <List.Item>
                  <strong>Deck Name:</strong> Give your deck a descriptive name.
                </List.Item>
                <List.Item>
                  <strong>Card Size Preset:</strong> Choose from standard card sizes (Poker, Bridge, Tarot, etc.) or set custom dimensions.
                </List.Item>
                <List.Item>
                  <strong>Card Dimensions:</strong> Set custom width and height in millimeters. Inch equivalents are shown automatically.
                </List.Item>
                <List.Item>
                  <strong>Paper Size:</strong> Choose Letter or A4 for PDF generation.
                </List.Item>
                <List.Item>
                  <strong>Custom Fonts:</strong> Add TTF or OTF font files to use in your card designs.
                </List.Item>
              </List>
            </div>
          </Stack>
        </Paper>

        {/* Card Design Section */}
        <Paper id="card-design" withBorder p="md" shadow="sm">
          <Title order={2} mb="md">Card Design</Title>
          <Stack gap="md">
            <div>
              <Title order={3} size="h4">Creating Card Styles</Title>
              <Text>
                Card styles define the layout and appearance of your cards. Each card can have different front and back styles.
              </Text>
            </div>

            <div>
              <Title order={4} size="h5">Asset Gallery</Title>
              <Text mb="xs">
                  The Asset Gallery allows you to manage images for your project:
              </Text>
              <List>
                <List.Item>
                  <strong>Add Images:</strong> Upload images to the project-specific gallery.
                </List.Item>
                <List.Item>
                  <strong>Replace Images:</strong> Update an image's content without breaking existing links in your styles.
                </List.Item>
                <List.Item>
                   <strong>Usage:</strong> When adding an Image element, you can select "Static Image" and choose from the gallery.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Managing Styles</Title>
              <List>
                <List.Item>
                  <strong>Add Style:</strong> Create a new front or back style with a unique name.
                </List.Item>
                <List.Item>
                  <strong>Duplicate Style:</strong> Copy an existing style as a starting point for a new design.
                </List.Item>
                <List.Item>
                  <strong>Delete Style:</strong> Remove unused styles.
                </List.Item>
                <List.Item>
                  <strong>Default Styles:</strong> Each deck has a default front and back style. You can rename the ID of these styles (e.g. from <code>default-front</code> to <code>standard-front</code>) in the Style Editor, and they will remain the default.
                </List.Item>
                <List.Item>
                  <strong>Style IDs:</strong> You can rename the internal ID of a style to something more readable (e.g., <code>bronze-back</code>).
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Adding Elements</Title>
              <Text mb="xs">
                Elements are the building blocks of your card design:
              </Text>
              <List>
                <List.Item>
                  <strong>Text Elements:</strong> Display static text or dynamic data from your spreadsheet fields.
                </List.Item>
                <List.Item>
                  <strong>Image Elements:</strong> Display images from your spreadsheet or static images.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Editing Elements</Title>
              <List>
                <List.Item>
                  <strong>Position & Size:</strong> Drag elements to reposition them, or use the property panel for precise values.
                </List.Item>
                <List.Item>
                  <strong>Text Properties:</strong> Set font size, color, and font family (including custom fonts).
                </List.Item>
                <List.Item>
                  <strong>Image Properties:</strong> Choose how images fit (contain, cover, or fill).
                </List.Item>
                <List.Item>
                  <strong>Data Binding:</strong> Link elements to spreadsheet fields to show dynamic content.
                </List.Item>
                <List.Item>
                  <strong>Static Content:</strong> Set fixed text or images that don't change between cards.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Tips</Title>
              <List>
                <List.Item>
                  All measurements are in millimeters, matching your card dimensions.
                </List.Item>
                <List.Item>
                  Use the preview card on the right to see how your design looks with actual data.
                </List.Item>
                <List.Item>
                  Elements are layered - later elements in the list appear on top.
                </List.Item>
              </List>
            </div>
          </Stack>
        </Paper>

        {/* Preview Section */}
        <Paper id="preview" withBorder p="md" shadow="sm">
          <Title order={2} mb="md">Preview</Title>
          <Stack gap="md">
            <div>
              <Title order={3} size="h4">Viewing Your Cards</Title>
              <Text>
                The Preview tab shows all your cards with their assigned styles and data.
              </Text>
            </div>

            <div>
              <Title order={4} size="h5">Preview Features</Title>
              <List>
                <List.Item>
                  <strong>Card Grid:</strong> See all your cards at once in a scrollable grid.
                </List.Item>
                <List.Item>
                  <strong>Front/Back Toggle:</strong> Switch between viewing card fronts and backs.
                </List.Item>
                <List.Item>
                  <strong>Card Count:</strong> Each card is shown according to its count value.
                </List.Item>
                <List.Item>
                  <strong>Style Application:</strong> Cards display with their assigned front and back styles.
                </List.Item>
                <List.Item>
                  <strong>Live Preview Overlay:</strong> In the Style Editor, you can select a specific card to overlay on the canvas. Use the opacity slider to check alignment against regular card data.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">What to Check</Title>
              <List>
                <List.Item>
                  Verify that all text is readable and properly positioned.
                </List.Item>
                <List.Item>
                  Check that images are loading and displaying correctly.
                </List.Item>
                <List.Item>
                  Ensure fonts are rendering as expected.
                </List.Item>
                <List.Item>
                  Confirm that the correct styles are applied to each card.
                </List.Item>
              </List>
            </div>
          </Stack>
        </Paper>

        {/* Print Section */}
        <Paper id="print" withBorder p="md" shadow="sm">
          <Title order={2} mb="md">Print</Title>
          <Stack gap="md">
            <div>
              <Title order={3} size="h4">Generating Print-Ready PDFs</Title>
              <Text>
                The Print tab creates a PDF file optimized for printing your cards.
              </Text>
            </div>

            <div>
              <Title order={4} size="h5">Print Options</Title>
              <List>
                <List.Item>
                  <strong>Draw Cut Guides:</strong> Add lines showing where to cut each card.
                </List.Item>
                <List.Item>
                  <strong>Generate PDF:</strong> Create a PDF with all cards laid out on pages according to your paper size.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Print Layout</Title>
              <Text mb="xs">
                Cards are automatically arranged on pages:
              </Text>
              <List>
                <List.Item>
                  The layout maximizes the number of cards per page based on your card and paper sizes.
                </List.Item>
                <List.Item>
                  Fronts and backs are on separate pages for easy printing.
                </List.Item>
                <List.Item>
                  Cut guides (if enabled) help you cut cards accurately.
                </List.Item>
              </List>
            </div>

            <div>
              <Title order={4} size="h5">Printing Tips</Title>
              <List>
                <List.Item>
                  Use cardstock (200-300 GSM) for best results.
                </List.Item>
                <List.Item>
                  Print fronts first, then flip the paper and print backs.
                </List.Item>
                <List.Item>
                  Test with regular paper first to ensure alignment.
                </List.Item>
                <List.Item>
                  Use a paper cutter or craft knife with cut guides for clean edges.
                </List.Item>
              </List>
            </div>
          </Stack>
        </Paper>

        {/* Quick Start Section */}
        <Paper id="quick-start" withBorder p="md" shadow="sm">
          <Title order={2} mb="md">Quick Start Guide</Title>
          <Stack gap="md">
            <div>
              <Title order={3} size="h4">Creating Your First Deck</Title>
              <List type="ordered">
                <List.Item>
                  <strong>Set up your deck:</strong> Go to Deck Details → Deck Settings and choose a card size.
                </List.Item>
                <List.Item>
                  <strong>Add card data:</strong> Either import an XLSX file or manually add fields and cards in the Spreadsheet view.
                </List.Item>
                <List.Item>
                  <strong>Design your cards:</strong> Go to Card Design and create front/back styles by adding text and image elements.
                </List.Item>
                <List.Item>
                  <strong>Assign styles:</strong> Back in Deck Details → Spreadsheet, assign your styles to each card.
                </List.Item>
                <List.Item>
                  <strong>Preview:</strong> Check the Preview tab to see how your cards look.
                </List.Item>
                <List.Item>
                  <strong>Generate PDF:</strong> Go to Print and generate your PDF for printing.
                </List.Item>
              </List>
            </div>
          </Stack>
        </Paper>

        {/* Troubleshooting Section */}
        <Paper id="troubleshooting" withBorder p="md" shadow="sm">
          <Title order={2} mb="md">Troubleshooting</Title>
          <Stack gap="md">
            <div>
              <Title order={4} size="h5">Common Issues</Title>
              <List>
                <List.Item>
                  <strong>Images not showing:</strong> Ensure image paths are correct and files exist. Try re-selecting the image.
                </List.Item>
                <List.Item>
                  <strong>Fonts not appearing:</strong> Make sure you've added the font file in Deck Settings → Custom Fonts, then select it in the element properties.
                </List.Item>
                <List.Item>
                  <strong>Text cut off:</strong> Increase the element's width or height, or reduce the font size.
                </List.Item>
                <List.Item>
                  <strong>PDF generation fails:</strong> Check that all cards have valid styles assigned and all images are accessible.
                </List.Item>
                <List.Item>
                  <strong>Spreadsheet changes not showing:</strong> Make sure you've saved your edits by clicking outside the cell or pressing Enter.
                </List.Item>
              </List>
            </div>
          </Stack>
        </Paper>

        {/* AI Import Guide */}
        <Paper id="ai-import" withBorder p="md" shadow="sm">
            <Title order={2} mb="md">AI Import Guide</Title>
            <Stack gap="md">
                <div>
                    <Title order={3} size="h4">Generate Cards with AI</Title>
                    <Text>
                        You can use AI tools like ChatGPT or Gemini to convert your spreadsheet data or ideas into a compatible JSON format for Card Wizard.
                    </Text>
                </div>

                <div>
                    <Title order={4} size="h5">Prompt Template</Title>
                    <Text mb="sm">
                        Copy the prompt below and paste it into your AI tool, along with your card data.
                    </Text>
                    <Paper withBorder p="md" bg="dark.7" style={{ position: 'relative' }}>
                        <Code block style={{ whiteSpace: 'pre-wrap', color: '#fff' }}>
{`I have a card game idea / spreadsheet data. Please generate a JSON object representing a deck for the "Card Wizard" application.

The JSON should have the following structure:
{
  "name": "My AI Deck",
  "fields": [
    { "name": "Name", "type": "text" },
    { "name": "Description", "type": "text" },
    { "name": "Cost", "type": "text" }
  ],
  "cards": [
    {
      "id": "card-1",
      "count": 1,
      "frontStyleId": "default-front",
      "backStyleId": "default-back",
      "data": {
        "Name": "Example Card",
        "Description": "Card description here",
        "Cost": "1"
      }
    }
  ]
}

Please generate at least 5 cards based on this theme: [INSERT THEME HERE]`}
                        </Code>
                        <Button
                            leftSection={<IconCopy size={16} />}
                            size="xs"
                            variant="light"
                            style={{ position: 'absolute', top: 10, right: 10 }}
                            onClick={() => {
                                const prompt = `I have a card game idea / spreadsheet data. Please generate a JSON object representing a deck for the "Card Wizard" application.\n\nThe JSON should have the following structure:\n{\n  "name": "My AI Deck",\n  "fields": [\n    { "name": "Name", "type": "text" },\n    { "name": "Description", "type": "text" },\n    { "name": "Cost", "type": "text" }\n  ],\n  "cards": [\n    {\n      "id": "card-1",\n      "count": 1,\n      "frontStyleId": "default-front",\n      "backStyleId": "default-back",\n      "data": {\n        "Name": "Example Card",\n        "Description": "Card description here",\n        "Cost": "1"\n      }\n    }\n  ]\n}\n\nPlease generate at least 5 cards based on this theme: [INSERT THEME HERE]`;
                                navigator.clipboard.writeText(prompt);
                                notifications.show({ title: 'Copied', message: 'Prompt copied to clipboard' });
                            }}
                        >
                            Copy Prompt
                        </Button>
                    </Paper>
                </div>

                 <div>
                    <Title order={4} size="h5">How to Use</Title>
                    <List type="ordered">
                        <List.Item>Copy the prompt above.</List.Item>
                        <List.Item>Paste it into an AI chat (ChatGPT, Gemini, Claude).</List.Item>
                        <List.Item>Replace <strong>[INSERT THEME HERE]</strong> with your game idea (e.g., "Fantasy RPG items", "Space combat ships").</List.Item>
                        <List.Item>The AI will generate JSON code.</List.Item>
                        <List.Item>Save that JSON code to a file (e.g., <code>my-deck.json</code>).</List.Item>
                        <List.Item>Use <strong>Load Game</strong> (for full structure) or convert it to XLSX for import.</List.Item>
                    </List>
                    <Text size="sm" c="dimmed" mt="xs">
                        Note: Direct JSON import for decks is not fully supported yet in the UI, but you can convert the "data" part of the JSON to CSV/XLSX for easier import.
                    </Text>
                </div>
            </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

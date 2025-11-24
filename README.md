# Card Wizard

Playing card creator built with Wails + React. Authors define decks in spreadsheets (XLSX/Google Sheets export) and generate duplex-friendly PDFs ready for print.

## Tech Stack

- Go backend via Wails, targeting Wails v3 APIs once stable
- React 18 + Vite with Mantine UI 7 for the desktop shell
- `github.com/xuri/excelize/v2` planned for spreadsheet ingestion
- `github.com/go-pdf/fpdf` powering print-perfect PDF exports

## Getting Started

```bash
# 1. Install frontend dependencies once
cd frontend && npm install

# 2. Run the app with hot reload (from repo root)
wails dev
```

The dev server launches the Go backend and Vite frontend together. Use `wails build` for production binaries.

## Current Status

- Mantine-driven shell displaying placeholder cards supplied by the Go backend
- `internal/cards.Service` stub returns starter data and will soon parse XLSX uploads
- `SampleDeck` binding exercises backend ⇄ frontend communication

## Next Steps

1. Implement workbook parsing with Excelize and surface validation feedback to the UI
2. Design card layout primitives and PDF sheet generation with go-pdf/fpdf
3. Add file picker workflow in the frontend and persist deck definitions for later export

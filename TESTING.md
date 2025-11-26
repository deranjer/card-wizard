# Testing Strategy

As **Card Wizard** moves into Alpha, we are establishing a testing framework to ensure stability and prevent regressions. This document outlines our current and future testing strategies.

## 1. Backend Testing (Go)

The Go backend handles critical logic like PDF generation, file I/O, and data processing.

*   **Tool**: Standard Go `testing` package.
*   **Scope**:
    *   **Unit Tests**: Focus on `internal/` packages.
        *   `deck`: Test parsing, validation, and data structure manipulation.
        *   `pdf`: Test layout calculations and PDF generation logic (checking output file structure or using a mock PDF surface).
    *   **Integration Tests**: Test interactions between the App struct and internal services.

### Running Backend Tests
```bash
go test ./...
```

### Pre-commit Hooks

We use the [pre-commit](https://pre-commit.com/) framework to ensure code quality and prevent broken commits. This is the same tool used across many languages (Python, Go, JavaScript, etc.).

**Installation:**

1. Install the pre-commit tool (one-time):
   ```bash
   # Using pip
   pip install pre-commit

   # Or using pipx (isolated)
   pipx install pre-commit

   # Or using Homebrew (macOS/Linux)
   brew install pre-commit
   ```

2. Install the git hooks in this repository:
   ```bash
   pre-commit install
   ```

**What runs on every commit:**

The `.pre-commit-config.yaml` file configures the following checks:

**Go checks:**
- `go-fmt` - Format code
- `go-vet` - Lint code
- `go-imports` - Organize imports
- `go-unit-tests` - Run all tests
- `go-build` - Ensure code compiles
- `go-mod-tidy` - Clean dependencies

**Frontend checks:**
- Frontend tests (`npm test`)
- TypeScript type checking (`tsc --noEmit`)

**General checks:**
- Remove trailing whitespace
- Ensure files end with newline
- Validate YAML/JSON syntax
- Check for merge conflicts
- Prevent large files

**Manual execution:**

Run all hooks without committing:
```bash
pre-commit run --all-files
```

Run specific hook:
```bash
pre-commit run go-unit-tests
```

**Bypass (not recommended):**
```bash
git commit --no-verify
```

## 2. Frontend Testing (React)

The frontend contains complex UI logic, especially in the `StyleEditor` and `SpreadsheetView`.

*   **Tools**:
    *   **Vitest**: Fast unit test runner, compatible with Vite.
    *   **React Testing Library**: For testing components in a user-centric way.
*   **Scope**:
    *   **Unit Tests**: Utility functions (e.g., unit conversions).
    *   **Component Tests**:
        *   `SpreadsheetView`: Verify adding/removing rows/columns updates state correctly.
        *   `StyleEditor`: Verify element addition/selection logic.
        *   **Note**: We will mock the Wails runtime (`window.runtime`) to test components in isolation without the Go backend.

### Running Frontend Tests
```bash
cd frontend
npm test
```

Vitest and React Testing Library are already configured and ready to use. Tests are located alongside their components with the `.test.tsx` extension.

## 3. End-to-End (E2E) Testing

Testing the full Wails application automatically is challenging because it runs in a native webview container.

*   **Current Strategy (Alpha)**: **Manual QA**.
    *   Follow the "Release Checklist" below before tagging a release.
*   **Future Strategy**:
    *   **Web-Only E2E**: Build the frontend as a standard web app (mocking all backend calls) and test it with **Playwright**. This covers 90% of the UI logic.
    *   **Native E2E**: Explore tools that can drive the native OS window (e.g., specialized Wails testing drivers if available, or OS-level automation tools), but this is low priority.

## ✅ Release Checklist (Manual QA)

Before releasing a new version:

1.  **Clean Install**: `wails build` and run the fresh executable.
2.  **Spreadsheet**:
    *   Import an Excel file.
    *   Add a new column manually.
    *   Add a new card manually.
3.  **Design**:
    *   Create a Front style.
    *   Add a Text element (mapped to a field).
    *   Add an Image element.
    *   Switch tabs and ensure canvas renders.
4.  **Preview**:
    *   Check that cards render correctly.
5.  **Export**:
    *   Generate a PDF.
    *   Open PDF and verify:
        *   Margins are correct.
        *   Fronts and Backs are interleaved correctly (page 1 front, page 2 back).
        *   Images are rendered.
6.  **Save/Load**:
    *   Save the deck.
    *   Restart app.
    *   Load the deck and verify all data persists.

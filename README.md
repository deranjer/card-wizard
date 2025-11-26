# Card Wizard 🧙‍♂️

> [!WARNING]
> **Alpha Status**: This project is currently in **ALPHA**. Features may change, and bugs are expected. Please report any issues you encounter!

**Card Wizard** is a powerful desktop application designed for game designers and hobbyists to create, manage, and print custom playing cards and game components. It bridges the gap between spreadsheet data and print-ready PDFs, offering a visual design interface and robust export options.

## ✨ Features

- **Spreadsheet Integration**: Import card data directly from Excel (`.xlsx`) files or edit data within the app using the built-in spreadsheet view.
- **Visual Style Editor**: Design your card layouts using a drag-and-drop interface. Create unique styles for different card types (e.g., "Unit", "Spell", "Event").
- **Dynamic Rendering**: Map spreadsheet columns to text and image elements on your cards.
- **Real-time Preview**: See exactly how your deck will look before printing.
- **Print-Ready PDF Export**: Generate high-quality PDFs with:
  - Configurable page sizes (A4, Letter).
  - Automatic duplex layout (fronts and backs aligned).
  - Cut lines and safe margins.
- **Custom Fonts**: Load and use your own font files.
- **Cross-Platform**: Built with Wails, running natively on Windows (Mac/Linux support planned).

## 🛠️ Tech Stack

Card Wizard is built using a modern hybrid stack, combining the performance of Go with the flexibility of web technologies:

- **Backend**: [Go](https://go.dev/) (Golang)
  - Framework: [Wails v2](https://wails.io/)
  - PDF Generation: `gofpdf`
  - Excel Processing: `excelize`
- **Frontend**:
  - [React 18](https://react.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/)
  - [Mantine UI v7](https://mantine.dev/)
  - [React-Rnd](https://github.com/bokuweb/react-rnd) for canvas interactions

## 👨‍💻 Developer Guide

We welcome contributions! If you want to add features or fix bugs, follow these steps to get started.

### Prerequisites

- **Go**: Version 1.21 or later.
- **Node.js**: Version 18 or later (npm included).
- **Wails CLI**: Install via `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Setup & Running

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/card-wizard.git
    cd card-wizard
    ```

2.  **Install dependencies**:
    ```bash
    # The Wails dev command handles frontend dependency installation automatically,
    # but you can run it manually if needed:
    cd frontend && npm install && cd ..
    ```

3.  **Run in Development Mode**:
    ```bash
    wails dev
    ```
    This command will:
    - Compile the Go backend.
    - Start the Vite dev server for the frontend.
    - Launch the application window.
    - Enable hot-reloading for both Go and React code.

### Testing

Card Wizard has comprehensive test coverage for both backend and frontend code.

#### Running Tests

**Backend (Go) Tests:**
```bash
go test ./...
```

**Frontend (React) Tests:**
```bash
cd frontend
npm test
```

**Run All Tests:**
```bash
# Backend
go test ./...

# Frontend
cd frontend && npm test && cd ..
```

#### Pre-commit Hooks

We use [pre-commit](https://pre-commit.com/) to run automated checks before each commit. This ensures code quality and prevents broken commits.

**Installation:**

1. Install pre-commit (one-time setup):
   ```bash
   # Using uv (recommended)
   uv tool install pre-commit

   # Or using Homebrew (macOS/Linux)
   brew install pre-commit
   ```

2. Install the git hooks:
   ```bash
   pre-commit install
   ```

3. Install golang requirements (non-exhaustive):
   ```bash
   go install golang.org/x/tools/cmd/goimports@latest
   ```

**What it does:**

Once installed, every `git commit` will automatically run:
- ✅ **Go formatting** (`go fmt`)
- ✅ **Go linting** (`go vet`)
- ✅ **Go imports** (organize imports)
- ✅ **Go tests** (`go test ./...`)
- ✅ **Go build** (ensure code compiles)
- ✅ **Go mod tidy** (clean up dependencies)
- ✅ **Frontend tests** (`npm test`)
- ✅ **Frontend type checking** (`tsc --noEmit`)
- ✅ **File checks** (trailing whitespace, YAML/JSON validation, etc.)

**Manual run:**

To run all hooks manually without committing:
```bash
pre-commit run --all-files
```

**Bypass (emergency only):**

If you need to skip hooks in an emergency:
```bash
git commit --no-verify
```

> [!TIP]
> The `.pre-commit-config.yaml` file defines all hooks. You can customize which checks run by editing this file.

For more details on our testing strategy, see [TESTING.md](TESTING.md).

### Building for Production

To create a standalone executable:

```bash
wails build
```

The output binary will be located in the `build/bin` directory.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## 📄 License

[MIT License](LICENSE)

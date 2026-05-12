# Flow Aggregate – Web UI

React + TypeScript + Vite frontend for the Flow Aggregate platform.

## Quick Start

```bash
npm install
npm run dev          # Start dev server (default: http://localhost:5173)
npm run build        # Production bundle
npm run lint         # ESLint check
npm run preview      # Preview prod build locally
```

## Configuration

Set `src/web-ui/.env`:
```env
VITE_API_BASE_URL=http://localhost:5050/api
```

## Project Structure

- **`src/api/`** – HTTP clients (Axios), token refresh logic
- **`src/features/`** – Feature modules (auth, parsers, analytics)
- **`src/components/`** – Reusable UI components
- **`src/store/`** – Zustand state (auth, parsers, UI)
- **`src/theme/`** – MUI theme config, design tokens, component overrides
- **`src/types/`** – TypeScript interfaces

## Learn More

- **[Architecture & Auth Flow](./src/README.md)** – Authentication, state management
- **[Design System](./src/theme/README.md)** – Theme contract, tokens, component guidelines
- **[MUI X Charts](https://mui.com/x/react-charts/)** – Analytics visualizations
- **[Zustand](https://github.com/pmndrs/zustand)** – State management

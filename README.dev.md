# Developer Guide

This repo is a Tauri (Rust) + React + TypeScript desktop app.

## Prerequisites

- Node.js
- pnpm
- Rust toolchain
- Tauri prerequisites for your OS (see the official Tauri docs)

## Getting Started

From the repo root:

```bash
pnpm install
pnpm tauri dev
```

Useful scripts:

- `pnpm dev` (Vite dev server)
- `pnpm build` (TypeScript + Vite build)
- `pnpm tauri dev` (run the desktop app in dev)

## Theming (Light / Dark Mode)

Chanterelle supports light and dark themes.

How it works:
- We use Tailwind's `dark` class strategy (see `tailwind.config.js`).
- A `ThemeProvider` (`src/contexts/ThemeContext.tsx`) tracks the current theme (`light` or `dark`).
- User preference is stored in `localStorage` (`chanterelle.theme`).
- On first load we fall back to the OS preference (`prefers-color-scheme`).
- An inline script in `index.html` applies the correct class early to avoid a flash of the wrong theme (FOUC).

Usage:
- Use `dark:` utility variants in class names (e.g. `bg-white dark:bg-slate-800`).
- For base colors you can also rely on the CSS variables defined in `App.css` (`--color-bg`, `--color-text`).

Adding new themed styles:
1. Add standard (light) Tailwind classes.
2. Add `dark:` counterparts for adjustments (colors, borders, shadows, etc.).
3. If you need custom values for both modes, define a new CSS variable in `App.css` and override it under `.dark:root`.

Programmatic theme access:
```tsx
import { useTheme } from '../contexts/ThemeContext';
const { theme, toggleTheme, setTheme } = useTheme();
```

Future improvements (open for contribution):
- Optional auto-sync toggle (re-apply system theme changes in real time)
- Additional themes (high contrast, sepia)
- Persist theme in backend user profile when auth arrives

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
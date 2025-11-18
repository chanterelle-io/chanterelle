# Project Chanterelle
Chanterelle is a desktop application to make easy user interfaces about your ML models.
Check out the documentation: https://chanterelle.io
# Theming (Light / Dark Mode)
Chanterelle now supports light and dark themes.

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

# Contribution
**Development Stack**:
Tauri + React + Typescript
**Recommended IDE Setup**:
- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
**Start development**:
```bash
cd "chanterelle\src-tauri"
npm run tauri dev
```
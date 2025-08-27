# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React application source (components, pages, contexts, utils, theme, routes). Entry is `src/index.js`, app shell in `src/App.js`.
- `src/components/base/`: App-standardized base UI primitives (Button, Input, Select, Switch, Card, Modal). New shared primitives live here and export via `index.ts`.
- `public/`: Static assets and favicons. App serves from here; do not import code from `public`.
- `public/assets/`: Project images/icons; prefer importing from `src` when tree‑shaking matters.
- Config: `package.json` (scripts/deps), `tsconfig.json` (JS/TS opts), `.prettierrc` (format), `.eslintignore`.

### TypeScript Defaults (Net‑New Files)
- New modules use TypeScript: components/pages `*.tsx`; hooks/utils `*.ts`.
- Keep incremental migration: existing JS may remain, but prefer TS for all new code.
- Avoid `any`; prefer specific types or `unknown` with narrowings. Export shared types from `src/types/` when broadly useful.
- Props/state types: define `ComponentNameProps` and reuse across variants; colocate the type with the component file.
- Tests for TS files use `*.test.ts` or `*.test.tsx` alongside the module.

## Build, Test, and Development Commands
- `npm start`: Start local dev server (CRA, port 3000 by default).
- `npm run build`: Production build to `build/` with minification and hashing.
- `npm test`: Run Jest tests in watch mode (CRA defaults). No tests exist yet—see Testing Guidelines.
- `npm run lint`: Lint `src/` with ESLint. Use `npm run lint:fix` to auto‑fix.
- Utilities: `npm run clear-all` (remove `build/` and `node_modules/`), `npm run re-start` (clean, install, start).

## Coding Style & Naming Conventions
- Formatting: Prettier enforced (120 char width, 2 spaces, single quotes, trailing commas `es5`).
- Linting: ESLint extends `react-app`. Keep components functional with hooks.
- Naming: Components `PascalCase` (e.g., `UserListHead.tsx`), variables/functions `camelCase`, constants `SCREAMING_SNAKE_CASE`.
- Files: Collocate tests and styles with the component when practical.

### Reusable Component Guidance
- Composition first: build small primitives that compose via `children` and clear slots over tightly‑coupled monoliths.
- Props surface: keep minimal and generic (e.g., `variant`, `size` unions), avoid one‑off booleans; expose `className`, `style`, and `...rest` to allow extension.
- Types: define explicit `Props` interfaces; prefer discriminated unions for variants; type events/handlers precisely (`(e: React.ChangeEvent<HTMLInputElement>) => void`).
- Accessibility: forward refs when appropriate (`React.forwardRef`), set proper ARIA roles/labels, and ensure keyboard interaction.
- Control model: prefer controlled components; if supporting uncontrolled usage, document defaults and emit `onChange` consistently.
- Theming: consume shared tokens/utilities from `src/theme/`; avoid hardcoded colors/sizes.
- Testing: add smoke tests for render and critical interactions; mock network/Amplify calls.

### Style Guide Page
- Admin-only component gallery at `/dashboard/style-guide` (see `src/pages/UIStyleGuidePage.tsx`) to preview and QA base primitives in one place.
- When adding a new base component, add simple examples to the style guide to exercise variants, sizes, and states.

## Testing Guidelines
- Framework: CRA’s Jest + React Testing Library. Place tests as `*.test.js` next to modules (e.g., `Component.test.js`).
- File patterns: prefer `*.test.ts` / `*.test.tsx` for TypeScript modules.
- Scope: Add smoke tests for key pages, utilities, and hooks. Mock network and Amplify calls.
- Run: `npm test` for watch; `CI=true npm test -- --coverage` to collect coverage.

## Commit & Pull Request Guidelines
- Commits: Short, imperative subject (≤72 chars), meaningful body when needed (e.g., rationale, tradeoffs). Example: `Fix auth title handling`.
- Branching: Feature branches off `dev`; open PRs into `dev` unless release hotfix.
- PRs: Include description, linked issues (`Fixes #123`), screenshots for UI changes, and checklist (builds, lint passes, tests updated).

## Security & Configuration Tips
- Environment: CRA uses `REACT_APP_*`. Common keys: `REACT_APP_USER_BRANCH`, `REACT_APP_VERSION`. Store in `.env.local` (never commit secrets).
- AWS Amplify: Endpoints configured in `src/index.js`. Avoid hardcoding secrets; prefer env and Amplify config.

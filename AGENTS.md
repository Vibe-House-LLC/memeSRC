# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React application source (components, pages, contexts, utils, theme, routes). Entry is `src/index.js`, app shell in `src/App.js`.
- `public/`: Static assets and favicons. App serves from here; do not import code from `public`.
- `public/assets/`: Project images/icons; prefer importing from `src` when tree‑shaking matters.
- Config: `package.json` (scripts/deps), `tsconfig.json` (JS/TS opts), `.prettierrc` (format), `.eslintignore`.

## Build, Test, and Development Commands
- `npm start`: Start local dev server (CRA, port 3000 by default).
- `npm run build`: Production build to `build/` with minification and hashing.
- `npm test`: Run Jest tests in watch mode (CRA defaults). No tests exist yet—see Testing Guidelines.
- `npm run lint`: Lint `src/` with ESLint. Use `npm run lint:fix` to auto‑fix.
- Utilities: `npm run clear-all` (remove `build/` and `node_modules/`), `npm run re-start` (clean, install, start).

## Coding Style & Naming Conventions
- Formatting: Prettier enforced (120 char width, 2 spaces, single quotes, trailing commas `es5`).
- Linting: ESLint extends `react-app`. Keep components functional with hooks.
- Naming: Components `PascalCase` (e.g., `UserListHead.js`), variables/functions `camelCase`, constants `SCREAMING_SNAKE_CASE`.
- Files: Collocate tests and styles with the component when practical.

## Testing Guidelines
- Framework: CRA’s Jest + React Testing Library. Place tests as `*.test.js` next to modules (e.g., `Component.test.js`).
- Scope: Add smoke tests for key pages, utilities, and hooks. Mock network and Amplify calls.
- Run: `npm test` for watch; `CI=true npm test -- --coverage` to collect coverage.

## Commit & Pull Request Guidelines
- Commits: Short, imperative subject (≤72 chars), meaningful body when needed (e.g., rationale, tradeoffs). Example: `Fix auth title handling`.
- Branching: Feature branches off `dev`; open PRs into `dev` unless release hotfix.
- PRs: Include description, linked issues (`Fixes #123`), screenshots for UI changes, and checklist (builds, lint passes, tests updated).

## Security & Configuration Tips
- Environment: CRA uses `REACT_APP_*`. Common keys: `REACT_APP_USER_BRANCH`, `REACT_APP_VERSION`. Store in `.env.local` (never commit secrets).
- AWS Amplify: Endpoints configured in `src/index.js`. Avoid hardcoding secrets; prefer env and Amplify config.


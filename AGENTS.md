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

## Reusable Component Guidelines
- **Single responsibility**: Keep components focused. If it does more than one clear thing, split it.
- **Composition first**: Prefer `children` and small composable parts over dozens of config props.
- **Props API**: Support `className`, `style`, `sx` (for MUI), and forward `...other` props to the root element.
- **Ref forwarding**: Use `forwardRef` when the root is focusable/measureable. Expose imperative handles sparingly via `useImperativeHandle`.
- **Controlled/uncontrolled**: For inputs, support both: `value` + `onChange` (controlled) and `defaultValue` (uncontrolled). Mirror for `checked/defaultChecked`, `open/defaultOpen`.
- **Theming**: Use Emotion/MUI theme tokens (`useTheme`, `sx`, `styled`) and avoid hardcoded colors, spacing, and typography.
- **Accessibility**: Keyboard support and ARIA labels/roles by default. Ensure focus management and label association; avoid div-only interactivity.
- **MUI interop**: When wrapping MUI, re-expose common props (`component`, `sx`, `variant`, `color`) and don’t block MUI system props.
- **Data-agnostic**: Accept data via props; do not fetch inside reusable components. Put I/O in pages/hooks and pass results down.
- **No global coupling**: Don’t import app-specific contexts (auth, router) in primitives. Accept callbacks/values via props instead.
- **Stable contracts**: Use PropTypes for runtime validation; document defaults and edge cases in the component JSDoc.

### Minimal Component Template (JS)
```jsx
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled'; // or: `import { styled } from '@mui/material/styles'`

// If using Emotion styled:
// const Root = styled('div')(({ theme }) => ({ display: 'flex' }));

const MyComponent = forwardRef(function MyComponent(
  { className, sx, style, children, ...other },
  ref
) {
  return (
    <div ref={ref} className={className} style={style} {...other}>
      {children}
    </div>
  );
});

MyComponent.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  sx: PropTypes.object,
  children: PropTypes.node,
};

export default MyComponent;
```

### File Structure
- **Location**: Place under `src/components/FeatureName/` when part of a feature; primitives under `src/components/`.
- **Collocation**: Keep `Component.js`, `Component.test.js`, and `Component.styles.js` (if any) together. Re-export via `index.js` for clean imports.

### PR Reusability Checklist
- [ ] Single, clear responsibility and name.
- [ ] Accepts `className`, `style`, `sx`, forwards `...other` props.
- [ ] `forwardRef` used when applicable; ref reaches the interactive root.
- [ ] Controlled/uncontrolled pattern supported for inputs (`value`/`defaultValue`, etc.).
- [ ] A11y: Keyboard + ARIA covered; labels and roles correct.
- [ ] Theme-aware: No hardcoded colors/spacing; uses MUI/Emotion tokens.
- [ ] No data fetching, routing, or app-specific context inside.
- [ ] PropTypes defined with sensible defaults and docs in JSDoc.
- [ ] Tests: Render smoke test and at least one behavior test (RTL). Mocks for network/Amplify if needed.
- [ ] Story/sandbox optional but encouraged if complex API (can use a simple page under `pages/dev/` during development; do not commit).

### Patterns To Prefer
- **Compound components** for complex UIs (`<Tabs><Tabs.List/><Tabs.Panel/></Tabs>`), wired via minimal context internal to the component.
- **Render props** only when children content needs dynamic control and composition fits poorly.
- **Small hooks** extracted for reusable logic (`useXyz`) placed in `src/hooks/` and unit tested separately.

### Anti-patterns
- Hardcoded copy or product logic inside primitives.
- Styling via inline literals instead of theme/system props.
- Swallowing/overwriting consumer props (`className`, `onClick`, `sx`).
- One-off variants baked into the component instead of composition.

# Proposed Source Directory Structure

This project contains a growing number of pages and components. To keep things organised going forward we will follow these conventions:

```
src/
  pages/           # top level route pages. Each page gets its own folder.
    collage/       # /collage related pages
      CollagePage.js
      CollagePageLegacy.js
      index.js     # optional re-exports for convenience
    ...
  components/      # reusable UI components organised by feature
  contexts/        # React context providers and hooks
  hooks/           # shared custom hooks
  utils/           # generic utility helpers
  constants/       # constant data definitions
  layouts/         # layout wrappers used by pages
  theme/           # MUI theme setup
```

**Notes**
- Page folders may contain page specific helpers, small components and tests.
- Shared utilities should live under `src/utils` so they can be reused across pages.
- When moving files remember to update import paths and keep exports the same to avoid functional changes.
- Try to keep page components small by extracting helpers and sub components.
```

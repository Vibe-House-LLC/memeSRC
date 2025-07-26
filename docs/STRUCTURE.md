# Source Directory Guidelines

This project contains legacy code with many pages and components in the same folders. To keep things maintainable we follow a feature based structure.

```
src/
  features/
    <feature-name>/
      pages/        # React pages for this feature
      components/   # Components specific to the feature
      hooks/        # Custom hooks for the feature
      utils/        # Shared helpers used by the feature
      config/       # Configuration or constant data
      styled/       # styled components or styling helpers
  pages/            # High level pages not yet migrated
  components/       # Reusable generic components
  contexts/         # React contexts shared across features
  hooks/            # Reusable hooks
  utils/            # Shared utility functions
  layouts/          # Layout components
  theme/            # MUI theme files
```

Features should live under `src/features`. Each feature keeps its internal files organised so pages import relative paths like `../components`. Common utilities across multiple features belong in `src/utils`.

When moving existing files, update import paths accordingly but keep functionality identical.

### Goal

Split the monolithic collage library code into reusable pieces that can be:
- embedded in the Collage page,
- reused later on a standalone `/library` page,
- dropped into other tools as a generic image picker.

No behavior changes for the Collage flow; just reorganize and clean boundaries.

### Constraints
- No new deps; use CRA + MUI v5 + Amplify v1 only.
- No Auth calls inside the new library code. Parent passes `isAdmin` and `userSub`.
- SSR safe: guard all `window`/`document` reads.
- A11y: ensure tiles/buttons/dialogs have appropriate aria labels and relationships.
- Replace confirm/errors with MUI `Dialog`/`Snackbar`.

### New file layout (use existing top-level folders)

```
src/
  components/
    library/
      ActionBar.jsx          // sticky bottom actions (e.g., “Make Collage”)
      LibraryBrowser.jsx     // high-level container that composes everything
      LibraryGrid.jsx        // stateless grid
      LibraryTile.jsx        // one tile (loading, selected, favorite badge)
      PreviewDialog.jsx      // image preview + actions
      UploadTile.jsx         // dashed upload with progress + retry
      index.js               // barrel export
  hooks/
    library/
      useLibraryData.js      // data (Amplify Storage), paging, favorites
      useSelection.js        // single/multi selection model
  utils/
    library/
      storage.js             // thin Amplify Storage wrapper (list/get/put/remove)
      resizeImage.js         // canvas resize (keep current logic; TODO: EXIF)
      saveImageToLibrary.js  // (Blob | dataURL) -> key (uses storage.js)
```

### Contracts

#### components/library/LibraryBrowser.jsx
- **Props**
  - `multiple?: boolean` (default `true`)
  - `pageSize?: number` (default `10`)
  - `onSelect(items)` → array of collage-ready objects: `{ originalUrl, displayUrl, metadata: { isFromLibrary: true, libraryKey } }`
  - `onError?(err)`
  - `uploadEnabled?: boolean` (default `true`)
  - `deleteEnabled?: boolean` (default `true`)
  - `favoriteEnabled?: boolean` (default `true`)
  - `storageLevel?: 'private' | 'protected'` (default `'protected'`)
  - `refreshTrigger?: any`
  - `userSub?: string` (namespacing favorites)
  - `isAdmin?: boolean` (no Auth inside)
  - `sx?: SxProps`
- **Behavior**
  - Uses `useLibraryData` + `useSelection`.
  - Renders `UploadTile`, `LibraryGrid` (with `LibraryTile`), `PreviewDialog`, and `ActionBar`.
  - On select: downloads selected S3 objects, converts to data URLs, emits collage-ready objects with `metadata.isFromLibrary` and `metadata.libraryKey` so the existing collage auto-save logic continues to skip duplicates.

#### hooks/library/useLibraryData.js
- Owns Amplify calls via `utils/library/storage.js`.
- Returns: `{ items, loading, loadMore, reload, upload, remove, toggleFavorite, favorites }`.
- Accepts config `{ pageSize, storageLevel, refreshToken, userSub }`.
- Persist favorites in `localStorage` under `libraryFavorites:${userSub || 'anon'}`. Value is a map `{ [key]: lastFavoritedTs }` for sort-by-recent.

#### hooks/library/useSelection.js
- API: `{ selectedKeys, isSelected, toggle, clear, count }`.
- Accepts `{ multiple }`.

#### utils/library/saveImageToLibrary.js
- Accepts `Blob | dataURL` and optional `filename`; returns S3 key string.
- Avoids the `fetch(dataURL)` roundtrip when a `Blob` is provided.
- Uses `resizeImage` internally; keeps current output quality and max size.

### Replace current usages

1) **Collage integration**
- File: `src/components/collage/components/BulkUploadSection.js`
- Replace legacy import:
  ```js
  import { LibraryBrowser } from '../../library';
  ```
- Replace usage (keep existing `isAdmin` and `libraryRefreshTrigger` wiring):
  ```jsx
  {isAdmin && (
    <LibraryBrowser
      isAdmin
      multiple
      refreshTrigger={libraryRefreshTrigger}
      userSub={user?.attributes?.sub || user?.username}
      onSelect={(items) => handleLibrarySelect(items)}
    />
  )}
  ```
- IMPORTANT: Update `handleLibrarySelect` to accept an array of collage-ready objects (not URLs) and pass them straight into `addMultipleImages(items)` so `metadata.isFromLibrary` is preserved. Keep the existing panel mapping logic, but use `items.length` where count is needed.
- Delete `src/components/collage/components/MyLibrary.js`.

2) **Auto-save utility**
- File: `src/components/collage/hooks/useCollageState.js`
- Change import to:
  ```js
  import { saveImageToLibrary } from '../../../utils/library/saveImageToLibrary';
  ```

3) **Frame page save**
- File: `src/pages/V2FramePage.js`
- Change import to:
  ```js
  import { saveImageToLibrary } from '../utils/library/saveImageToLibrary';
  ```
- Prefer `canvas.toBlob` and pass the `Blob` to `saveImageToLibrary`.

### Implementation notes
- **Admin gating**: No `Auth.currentSession()` or similar. Parent passes `isAdmin` and `userSub` (from `UserContext`).
- **SSR safety**: Guard reads, e.g., `const width = typeof window !== 'undefined' ? window.innerWidth : 1024`.
- **A11y**: Add `aria-label` for upload tile and all actionable `IconButton`s; set `PreviewDialog` `aria-labelledby` to its title element.
- **Dialogs/snackbars**: Replace `window.confirm` and silent `console.error` with MUI `Dialog` and `Snackbar` hooks within `LibraryBrowser`.
- **Image orientation TODO**: Keep current resize behavior; add a TODO about EXIF orientation.

### Acceptance criteria
- App builds/runs.
- Collage page (admin) keeps identical behavior: upload, favorite, select, delete, preview, bottom action bar; `refreshTrigger` still reloads.
- `V2FramePage` “Save to Library” still works via the new util.
- Favorites persist per user (`libraryFavorites:${userSub}`).
- No Auth calls in `components/hooks/utils` under `library/`.

### Minimal commit plan
1. Add `utils/library/` (`storage`, `resizeImage`, `saveImageToLibrary`).
2. Add `hooks/library/` (`useLibraryData`, `useSelection`).
3. Add `components/library/` (presentational + `LibraryBrowser` + `index.js`).
4. Integrate into Collage: swap into `BulkUploadSection`, delete `MyLibrary`, update imports in `useCollageState` + `V2FramePage`.
5. Replace confirms/errors with MUI components, add a11y labels, ensure SSR guards.
6. Smoke test: upload, load more, favorite, delete, select, “Make Collage”, save frame.

### Technical details and behaviors to carry over
- Storage paths: keep `library/` prefix and `level: 'protected'` defaults.
- Sorting: list newest first, but prioritize favorites on initial page where possible.
- Concurrency: cap concurrent `Storage.get` when building previews to avoid UI jank.
- Upload: resize on client before `Storage.put`; show per-item progress and placeholders; finalize tile once signed URL is available.
- Selection model: single/multi selection; action bar appears when selection is non-empty (admin).
- Emitted items: when selecting for collage, emit the same data structure as today, including `metadata.isFromLibrary` and `metadata.libraryKey`.

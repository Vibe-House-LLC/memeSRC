# Collage Refactor Proposal (Incremental, Low-Risk)

## Why this exists

The collage feature set is concentrated in a few very large files. This proposal breaks the work into small phases that can ship safely, with stable behavior and lower regression risk.

Primary goal:
- Reduce oversized files and improve maintainability.

Secondary goals:
- Increase shared utility reuse.
- Increase test coverage on high-risk state and mapping logic.
- Keep user-visible behavior stable during refactor.

Non-goals:
- Redesigning the collage UX.
- Rewriting all collage code at once.

## Baseline (Current Hotspots)

Top files by line count (collage-relevant):

| File | LoC |
| --- | ---: |
| `src/components/collage/components/CanvasCollagePreview.js` | 6779 |
| `src/pages/CollagePage.js` | 3863 |
| `src/pages/V2FramePage.js` | 3783 |
| `src/components/collage/steps/CollageSettingsStep.js` | 1974 |
| `src/components/collage/components/CaptionEditor.js` | 1790 |
| `src/pages/CollagePageLegacy.js` | 1463 |
| `src/components/collage/components/CollagePreview.js` | 1241 |
| `src/components/collage/components/CollageFrameSearchModal.tsx` | 1159 |
| `src/components/collage/components/BulkUploadSection.js` | 1138 |
| `src/components/collage/hooks/useCollageState.js` | 1128 |

Observed duplication to address early:
- Layout and geometry helpers duplicated between:
  - `src/components/collage/components/CanvasCollagePreview.js`
  - `src/components/collage/utils/renderThumbnailFromSnapshot.js`
- Repeated image ingestion helpers (`toDataUrl`, blob URL tracking, frame yielding) across:
  - `src/components/collage/components/BulkUploadSection.js`
  - `src/components/collage/components/CollagePreview.js`
  - `src/components/collage/steps/CollageImagesStep.js`
- Similar "add to collage project" flow logic duplicated in:
  - `src/pages/V2FramePage.js`
  - `src/pages/V2EditorPage.js`

## Guardrails (Apply to Every Phase)

- Keep external behavior/API stable until a dedicated behavior-change phase exists.
- One major seam per PR.
- Add tests before or with extraction when feasible.
- Prefer extract-and-adapt over rewrite.
- Keep old entrypoints exporting same names when splitting modules.
- If regressions appear, revert only the latest phase PR; do not stack risky rewrites.

## Testing Strategy (Per PR)

Required for each phase PR:
- `npm run lint`
- Targeted tests for touched pure utilities/state logic.
- Manual smoke pass for collage core flow.

Manual smoke checklist:
- Create collage from library.
- Create collage from device upload.
- Replace image in an occupied panel.
- Add/remove panel and verify mapping stays correct.
- Add/edit/delete caption text.
- Add/move/remove sticker.
- Change border width and color.
- Save and reload project.
- Generate/export collage.
- Mobile sheet open/close and panel actions.
- V2 frame page "Add to collage" flow.
- V2 editor page "Add to collage" flow.

## Phased Plan

### Phase 0: Baseline Safety Harness

Scope:
- Document current behavior and establish lightweight regression harness.

Changes:
- Add this proposal doc.
- Add/expand tests around existing pure utilities:
  - `src/components/collage/utils/projects.test.js`
  - new tests for `snapshotEditing.ts` and `panelId.ts`.

Risk:
- Low.

Exit criteria:
- Baseline tests pass.
- Manual smoke checklist documented and runnable.

---

### Phase 1: Extract Shared Pure Utilities

Scope:
- Remove obvious duplicate pure logic first (lowest-risk wins).

Changes:
- Add:
  - `src/components/collage/utils/layoutGeometry.ts`
  - `src/components/collage/utils/textLayout.ts`
  - `src/components/collage/utils/imagePipeline.ts`
- Migrate callers in:
  - `src/components/collage/components/CanvasCollagePreview.js`
  - `src/components/collage/utils/renderThumbnailFromSnapshot.js`
  - `src/components/collage/components/CollagePreview.js`
  - `src/components/collage/components/BulkUploadSection.js`
  - `src/components/collage/steps/CollageImagesStep.js`

Risk:
- Low to medium (cross-file usage, but pure logic extraction).

Regression controls:
- Unit tests for utility modules.
- Compare rendered output for representative snapshots before/after.

Exit criteria:
- Duplicate helper blocks removed.
- Existing behavior unchanged.

---

### Phase 2: Split Template Data Layer (No Behavior Change)

Scope:
- Decompose `templates.ts` while keeping the current exported API stable.

Changes:
- Split:
  - `src/components/collage/utils/templates.ts`
- Into:
  - `src/components/collage/utils/templates/index.ts`
  - `src/components/collage/utils/templates/cache.ts`
  - `src/components/collage/utils/templates/api.ts`
  - `src/components/collage/utils/templates/subscriptions.ts`

Risk:
- Medium (API/subscription flow).

Regression controls:
- Keep `index.ts` exports backward-compatible.
- Add tests for cache/update/remove behavior with mocked API calls.

Exit criteria:
- All existing imports continue to work unchanged.
- Template CRUD/subscription smoke flow passes.

---

### Phase 3: Refactor `useCollageState` Into Reducer + Ops Modules

Scope:
- Reduce hook complexity and centralize mapping math.

Changes:
- Add:
  - `src/components/collage/state/collageStateReducer.ts`
  - `src/components/collage/state/panelMappingOps.ts`
- Refactor:
  - `src/components/collage/hooks/useCollageState.js` (or migrate to `useCollageState.ts`)

Risk:
- Medium (state transition regressions possible).

Regression controls:
- Unit tests for panel insert/remove mapping, image index shifts, subtitle auto-assignment.
- Keep public hook return shape stable.

Exit criteria:
- Reducer-backed state updates pass tests.
- No behavior change in panel/image mapping flow.

---

### Phase 4: Decompose `CollageSettingsStep`

Scope:
- Split large settings UI into smaller section components.

Changes:
- Refactor:
  - `src/components/collage/steps/CollageSettingsStep.js`
- Add:
  - `src/components/collage/steps/settings/AspectLayoutSection.tsx`
  - `src/components/collage/steps/settings/BordersSection.tsx`
  - `src/components/collage/steps/settings/StickersPanelsSection.tsx`
  - optional shared `settings/shared.ts` for small helpers/types.

Risk:
- Medium (UI wiring regressions).

Regression controls:
- Keep existing props contract from `CollagePage`.
- Manual desktop/mobile settings checks.

Exit criteria:
- `CollageSettingsStep` becomes thin orchestrator.
- Visual parity on settings interactions.

---

### Phase 5: Decompose `CaptionEditor`

Scope:
- Isolate formatting state logic and toolbar controls.

Changes:
- Refactor:
  - `src/components/collage/components/CaptionEditor.js`
- Add:
  - `src/components/collage/components/caption/useInlineCaptionFormatting.ts`
  - `src/components/collage/components/caption/InlineFormattingToolbar.tsx`
  - `src/components/collage/components/caption/CaptionSliders.tsx`

Risk:
- Medium (selection/formatting edge cases).

Regression controls:
- Add tests for inline formatting serialization/toggle edge cases.
- Manual tests for selection preservation and style toggles.

Exit criteria:
- Inline formatting behavior remains stable.
- `CaptionEditor` LoC materially reduced.

---

### Phase 6: Refactor `CollagePreview` + `BulkUploadSection` + Shared Panel Source Flow

Scope:
- Centralize panel-source selection/upload/import behavior.

Changes:
- Add:
  - `src/components/collage/hooks/usePanelSourceSelector.ts`
- Refactor:
  - `src/components/collage/components/CollagePreview.js`
  - `src/components/collage/components/BulkUploadSection.js`
  - `src/components/collage/steps/CollageImagesStep.js`
- Consolidate repeated image ingestion through `imagePipeline.ts`.

Risk:
- Medium.

Regression controls:
- Keep existing panel action entry points and callback contract.
- Manual tests for device/library/search flows.

Exit criteria:
- File upload/source flow logic no longer duplicated across these files.

---

### Phase 7: Extract Shared "Add to Collage Project" Service Used by V2 Pages

Scope:
- Remove duplicated project append/replace logic in V2 pages.

Changes:
- Add:
  - `src/components/collage/hooks/useAddToCollageProject.ts`
  - or `src/components/collage/services/addToCollageProject.ts`
- Refactor callers:
  - `src/pages/V2FramePage.js`
  - `src/pages/V2EditorPage.js`

Risk:
- Medium.

Regression controls:
- Keep existing page-level UI states and dialogs.
- Test new/existing project add flows and replace-at-capacity flow.

Exit criteria:
- Shared add/replace project logic exists in one place.
- Both V2 pages retain current behavior.

---

### Phase 8: Decompose `CollagePage` (Orchestrator Hooks)

Scope:
- Split page orchestration from presentational composition.

Changes:
- Refactor:
  - `src/pages/CollagePage.js`
- Add:
  - `src/components/collage/hooks/useCollageAutosave.ts`
  - `src/components/collage/hooks/useCollageProjectLifecycle.ts`
  - `src/components/collage/hooks/useCollagePanelActions.ts`
  - `src/components/collage/hooks/useCollageMobileUI.ts`

Risk:
- Medium to high (many effects/callback interactions).

Regression controls:
- Do not couple with Canvas internal refactor in same PR.
- Keep `settingsStepProps` and `imagesStepProps` shape stable.

Exit criteria:
- `CollagePage` acts as a thin composition layer.

---

### Phase 9: Decompose `CanvasCollagePreview` Last

Scope:
- Split the largest/highest-risk file only after shared foundations and tests exist.

Changes:
- Refactor:
  - `src/components/collage/components/CanvasCollagePreview.js`
- Add:
  - `src/components/collage/canvas/CanvasCollagePreview.tsx`
  - `src/components/collage/canvas/useCanvasInteractions.ts`
  - `src/components/collage/canvas/useLayerEditing.ts`
  - `src/components/collage/canvas/drawCanvasScene.ts`
  - `src/components/collage/canvas/exportCanvasBlob.ts`

Risk:
- High (core interaction/render surface).

Regression controls:
- Keep export path and draw path behavior-locked.
- Run full manual checklist on desktop and mobile.
- Ship behind short-lived internal flag if needed.

Exit criteria:
- No single canvas module > ~1800 lines.
- Existing gesture/edit/export behavior preserved.

## Recommended PR Sequence

1. Phase 1 (utilities extraction)
2. Phase 2 (templates split)
3. Phase 3 (`useCollageState` reducer split)
4. Phase 4 (`CollageSettingsStep` decomposition)
5. Phase 5 (`CaptionEditor` decomposition)
6. Phase 6 (`CollagePreview` + `BulkUploadSection` flow consolidation)
7. Phase 7 (shared add-to-collage service for V2 pages)
8. Phase 8 (`CollagePage` orchestration hooks)
9. Phase 9 (`CanvasCollagePreview` decomposition)

This order front-loads lower-risk utility and data-layer work, then climbs toward highest-risk rendering/interaction code once coverage and seams exist.

## Suggested End-State Targets

Not strict, but useful guidance:
- No collage module > ~1800 lines.
- Most modules in the 200-900 line range.
- Shared pure helpers moved to `src/components/collage/utils`.
- Feature flows reused across pages via hooks/services, not duplicated.

## Rollback Plan

Per phase:
- Keep each phase in isolated PR(s).
- If a phase regresses behavior, revert that phase PR only.
- Avoid mixing high-risk and low-risk refactors in the same PR.

## Definition of Done (Overall)

- Core collage files are modularized with stable behavior.
- Critical state/geometry logic has tests.
- Manual smoke checklist passes across desktop and mobile.
- Team can add features without reopening 3k-7k line files.

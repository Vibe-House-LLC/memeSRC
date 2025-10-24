# Collage Recommendations Progress

## ML Readiness Milestones
| Milestone | Status | Notes |
| --- | --- | --- |
| 1k events captured | Blocked | Phase 1.2 instrumentation shipped; awaiting production event volume |
| Accept rate >25% | Blocked | Need to observe new `collage_seed_*` events before measuring acceptance |
| Feature vector schema locked | Not started | Blocked on downstream analytics model design |

## Implementation Log
### 2024-05-19 — Phase 1.1 frameRef plumbing
- Summary: Normalized library metadata to include `frameRef`, propagated it through save/load flows, and kept collage preloads show-aware. Lint passes with existing unrelated warnings.
- Commands: `npm run lint`
- Updated files:
  - `src/utils/library/metadata.ts:22`
  - `src/utils/library/metadata.ts:38`
  - `src/utils/library/metadata.ts:82`
  - `src/utils/library/metadata.ts:100`
  - `src/utils/library/saveImageToLibrary.ts:32`
  - `src/pages/V2FramePage.js:240`
  - `src/pages/V2FramePage.js:276`
  - `src/components/library/LibraryBrowser.jsx:64`
  - `src/components/library/LibraryBrowser.jsx:91`
  - `src/components/library/LibraryBrowser.jsx:134`
  - `src/components/library/LibraryBrowser.jsx:185`
  - `src/components/library/LibraryBrowser.jsx:231`
  - `src/pages/LibraryPage.js:64`
  - `src/components/library/PreviewDialog.jsx:10`
  - `src/pages/CollagePage.js:403`
  - `README_RECS_PLAN.md:12`
- Outstanding questions: None at this stage.

---

### 2024-05-20 — Phase 1.2 seed telemetry
- Summary: Added dedicated analytics helpers, instrumented collage state mutations to emit `collage_seed_*` events, captured user feedback on removals, and logged bulk preload seeds for navigation hand-offs.
- Commands: _(not run — analytics wiring only)_
- Updated files:
  - `src/utils/analytics/collageEvents.ts`
  - `src/components/collage/hooks/useCollageState.js`
  - `src/components/collage/components/BulkUploadSection.js`
  - `src/components/collage/steps/CollageSettingsStep.js`
  - `src/pages/CollagePage.js`
  - `README_RECS_PLAN.md`
- Outstanding questions: None.

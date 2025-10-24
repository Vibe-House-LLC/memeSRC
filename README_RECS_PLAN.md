# Collage Recommendation Implementation Plan

## Objectives
- Recommend show-aware collage templates that feel like smart starting points and evolve with usage.
- Capture the implicit training data already flowing through search, frame browsing, library saves, and the collage editor.
- Lay down a repeatable workflow so future Codex sessions can resume implementation without losing context.

---

## Phase 1 — Telemetry & Context Baseline
**Goal:** make every collage interaction carry show-aware metadata and land in analytics so we can trust downstream heuristics/ML.

- **1.1 Normalize frame metadata everywhere images move**
  - Update `src/utils/library/metadata.ts` and `src/utils/library/saveImageToLibrary.ts` so `LibraryMetadata` stores a `frameRef` object `{ cid, season, episode, frame, fineTuningIndex? }` alongside the existing tags/caption fields; persist it when saving in `saveImageToLibrary`.
  - When saving a frame (`src/pages/V2FramePage.js`) populate that `frameRef` plus the show title in `metadata.tags`; ensure `trackUsageEvent('add_to_library', …)` includes the same `frameRef`.
  - When loading library items (`src/components/library/LibraryBrowser.jsx` + `src/hooks/library/useLibraryData.ts` if needed) merge the fetched metadata into `items` so selections forwarded to `/collage` already include `metadata.frameRef`.
  - Propagate that metadata through `LibraryPage.js` navigation state and the collage preload branch in `src/pages/CollagePage.js` so `selectedImages[].metadata.frameRef` survives into the editor state.

- **1.2 Track collage seed activity explicitly**
  - Wrap the add/remove/update helpers in `src/components/collage/hooks/useCollageState.js` so they call a new helper `trackCollageSeedEvent` (place it in `src/utils/analytics/collageEvents.ts`) whenever a frame with `metadata.frameRef` is added, swapped, or removed. Emit `collage_seed_add`, `collage_seed_replace`, and `collage_seed_remove` with payload `{ cid, season, episode, frame, templateId?, panelIndex?, source, sessionContext, schemaVersion: '1.0' }`.
  - For removals and dismissals, surface a lightweight popover/modal that lets users optionally tag a `userFeedbackReason` (`'not_relevant'|'wrong_style'|'duplicate'|'other'` plus free-text when `other`). Include that string in the emitted analytics payload so later ML runs have qualitative labels.
  - Log the auto-assignment that happens in `CollagePage.js` when navigation state preloads multiple images; emit a batched `collage_seed_bulk_add` that lists all frame refs so we retain order fidelity and includes the same `schemaVersion` field.

- **1.3 Capture template exploration and generation context**
  - Instrument `src/components/collage/steps/CollageSettingsStep.js` so any template change (manual select, auto switch after panel count change, or recommendation click) fires `collage_template_select`. Include `{ templateId, panelCount, aspectRatioId, reason: 'manual'|'auto'|'suggested', sourceComponent, schemaVersion: '1.0' }` and let users optionally supply `userFeedbackReason` when abandoning a suggested template.
  - Extend the existing `trackUsageEvent('collage_generate', …)` call in `src/pages/CollagePage.js` to attach the active `sessionContext` (next bullet), the list of `panelImageMapping` frame refs in render order, and the `schemaVersion`. Guard against missing metadata by skipping entries without `frameRef`.
  - Document `collage_seed_*`, `collage_template_select`, and the enriched `collage_generate` payloads in `README_EVENTS.md` with representative samples so the analytics/ML folks know what to expect.

- **1.4 Maintain a session context object**
  - Add a utility `deriveCollageSessionContext` under `src/utils/analytics/collageSession.ts` that inspects `location.state`, `UserContext`, and `SearchContext` to build `{ cid?, searchTerm?, sourceEventType?, sourceEventId?, recentSearches?, triggeredBy?, userIdHash?, recentCollageCount?, sessionStartedAt }`. Hash the internal user identifier with a salt so it stays anonymous, and pull `recentCollageCount` from the most recent 30-day activity in `UserContext`.
  - Ingress points (`V2SearchPage.js` share-to-collage button, any `/frame` CTA, `LibraryPage.js` bulk action) should pass this context via `navigate('/collage', { state: { … } })`.
  - Store the resolved context in a new `useRef` inside `src/pages/CollagePage.js` so later events (template selects, generate, seed edits) can include a stable `sessionId` and `contextHash`.
  - Expose a helper that future work can reuse (`export type CollageSessionContext` under `src/types/collage.ts`).

---

## Phase 2 — Candidate Generation & Storage
**Goal:** turn raw events into ranked starter sets per show that we can serve quickly and iterate on.

- **2.1 Transform usage events into frame co-occurrence signals**
  - Create `src/managers/recommendations/eventTransforms.ts` that reuses the JSON parsing logic from `AdminPopularFramesPage.tsx` to map `UsageEventRecord` → `{ frameRef, eventType, timestamp, searchTerm, source, outcome?: 'generated'|'shared' }`.
  - Build `buildShowTimeline(events: FrameEvent[])` helper that clusters interactions by `sessionId` (use the anonymous ID logic in `src/utils/trackUsageEvent.ts`) and extracts ordered lists of frames the user interacted with within a configurable window (e.g., 8 minutes), tagging each sequence with recency buckets (e.g., `<1h`, `<24h`, `7d+`).
  - Generate edge weights for frame pairs (`cid`-scoped) using signals from `collage_seed_*`, `collage_template_select`, `add_to_library`, and `save_intent_image`. Apply recency decay (e.g., half-life of 14 days) and boost weights when the sequence culminated in `collage_generate` or `collage_recommendation_accept`. Store them in a `Map<string /* frameKey */, Map<string /* coFrameKey */, CoFrameStats>>` where `CoFrameStats` keeps raw counts, decayed score, lastSeen timestamp, accept/dismiss deltas, and the accumulating feature vector.

- **2.2 Produce recommendation snapshots**
  - Add a script module `scripts/buildCollageRecommendationSnapshot.ts` (TypeScript) that:
    1. Calls `usageEventsByType` for the relevant event types (paginate with the pattern in `AdminPopularFramesPage.tsx`).
    2. Pipes the result through the transforms above.
    3. Emits JSON objects like `{ cid, templateId, seedFrameKeys[], modelVersion, scoreBreakdown, signals, supportingEvents[] }` where `signals` is a feature vector (`{ co_occurrence_count, decayed_score, accept_rate, dismiss_rate, avg_session_duration, search_overlap }`).
  - Wire an npm script `"build:collage-recs": "ts-node scripts/buildCollageRecommendationSnapshot.ts"` so analysts can run it manually; also add `"build:collage-recs:lambda"` that bundles it for Lambda (use esbuild).
  - Provision an AWS Lambda + EventBridge rule that runs the snapshot daily and another path that can be invoked with a `showCid` payload for on-demand regeneration. Persist outputs to S3 under `analytics/collage-recs/v1/{YYYY}/{MM}/{DD}/snapshot.json` for versioned rollbacks and append metadata (runId, generatedBy) to an audit log table.
  - Reuse the storage helper in `src/utils/library/storage.ts` or add a lightweight AWS SDK wrapper if direct S3 access is needed; make sure the Lambda IAM role only needs read access to the analytics bucket and write access to the `collage-recs` prefix.

- **2.3 Surface and store curated recommendation sets**
  - Update `amplify/backend/api/memesrc/schema.graphql` with a new `type CollageRecommendation @model @key(name: "byCid", fields: ["cid"], queryField: "collageRecommendationsByCid")` containing:
    - `cid: ID!`, `templateId: String!`, `frameKeys: [String!]!`, `score: Float!`, `modelVersion: String!`, `signals: AWSJSON`, `generatedAt: AWSDateTime!`, `isManuallyPinned: Boolean`, `notes: String`.
  - Generate resolvers via `amplify status`/`amplify push` after schema change; ensure the GraphQL client (`src/graphql/queries.js`) gains `collageRecommendationsByCid` and new mutations for upserts.
  - Extend the snapshot script to upsert the top-N candidates per show via a new mutation `createCollageRecommendation`/`updateCollageRecommendation`, stamping `modelVersion` based on the heuristic recipe (`'heuristic_v1.1'` etc.).
  - Build an admin review surface `src/pages/AdminCollageRecommendationsPage.tsx` (pattern it after `AdminPopularFramesPage.tsx`) where we list per-show recommendations, show supporting signals, accept/dismiss counts, and expose:
    - A "Regenerate for Show" button that triggers the Lambda with the show’s CID.
    - Controls to pin/unpin and to jot reviewer notes that get stored on the record.

---

## Phase 3 — Client Surfacing & Feedback Loop
**Goal:** show relevant templates in the collage UI, capture interactions, and keep the dataset improving.

- **3.1 Fetch and cache recommendations in the client**
  - Add `src/hooks/useCollageRecommendations.ts` that accepts `{ sessionContext, seedFrameRefs, panelCount }` and:
    1. Prefers the GraphQL API (`collageRecommendationsByCid`) filtered by `cid`.
    2. Falls back to local heuristics that sample from the top 20 popular frames (weighted random + diversity constraints so we avoid recommending the same episode twice) when the API misses or the show isn’t recognized.
    3. Memoizes results per `sessionId` using `sessionStorage` with a 24-hour TTL so daily Lambda updates flow through quickly while the user sees stable suggestions during a session.
  - Inject the hook into `src/pages/CollagePage.js` and pass its output into a new tray component (`src/components/collage/recommendations/RecommendationsTray.tsx`).

- **3.2 Apply recommendations gracefully**
  - Implement `RecommendationsTray` as a horizontal list that previews candidate collages (use `renderLayoutGrid` from `CollageConfig` to render thumbnails with placeholders). Add a subtle success toast ("Applied recommendation—feel free to tweak!") after the state update to reinforce experimentation.
  - On impression, fire `collage_recommendation_impression` with `{ recommendationId, cid, templateId, seedFrames, rank, sessionContext, schemaVersion: '1.0' }`.
  - On click, call `applyRecommendation` helper that:
    - Loads any missing frames via the library API if not already in state.
    - Sets `panelCount`, `selectedTemplate`, `panelImageMapping`, and `selectedImages` in one transaction (use the existing state setters in `useCollageState`).
    - Emits `collage_recommendation_accept` with an `acceptedAt` timestamp, derived coverage stats (how many seeds already present), optional `userFeedbackReason`, and the `schemaVersion`.
  - Provide a dismiss control per card that logs `collage_recommendation_dismiss` with dismiss reason + schema version and hides the card for the session.

- **3.3 Close the loop with analytics & admin tooling**
  - Feed the new recommendation events into the Phase 2 snapshot script so accepted/dismissed counts adjust future weights (e.g., `accept` += 1, `dismiss` -= 0.5, `applied_without_edits` += 0.25) and roll the results into the stored feature vectors.
  - Extend `src/pages/AdminPopularFramesPage.tsx` (or the new admin page) with a mini dashboard summarizing recommendation impressions → accepts per show/template, reporting diversity metrics (unique episodes surfaced, Gini coefficient) and flagging shows with stale data (>7 days since `generatedAt`).
  - Add automated verification:
    - Jest test `src/components/collage/recommendations/RecommendationsTray.test.tsx` to ensure apply/dismiss flows call the correct handlers.
    - Integration smoke test `scripts/__tests__/collageRecSnapshot.e2e.ts` that seeds fake events, runs the snapshot builder, hits the GraphQL layer, and asserts recommendations update accordingly.
  - Schedule follow-up work item to wire this dataset into whatever downstream ML pipeline is planned (leave a TODO section in the admin page linking to the S3 snapshot output and the stored feature schema).

---

## Notes for Future Codex Rounds
- Maintain an implementation log at `docs/collage-recs-progress.md`. Every time you touch this feature, append:
  - Date, short summary, commands run, outstanding questions.
  - Explicit pointers to updated files with `path:line`.
- After completing a sub-task, update this plan in place (mark steps as ✅ / 🚧) so future sessions know what’s done. Keep the historical context—don’t delete completed steps.
- When adding new events, always refresh `README_EVENTS.md` in the same PR so analytics stays in sync.
- Prefer creating thin helper modules (`src/utils/analytics/*`, `src/managers/recommendations/*`) instead of sprinkling logic across pages; that keeps the work chunkable for successive Codex sessions.
- Add an "ML readiness milestones" table to `docs/collage-recs-progress.md` (e.g., `1k events captured`, `accept rate >25%`, `feature vector schema locked`) and update it alongside major deployments so the team knows when to invest in a trained model (SageMaker, AWS Personalize, or BigQuery export).
- When iterating on heuristics, bump `modelVersion` and keep older snapshots in S3 so future Codex runs can compare before/after performance without recomputing.

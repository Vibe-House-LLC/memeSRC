# Collage Templates Cloud Migration Notes

_Last reviewed: 2025-10-23_

## Current Implementation Snapshot (Phase 0)
- [x] `src/pages/ProjectsPage.tsx` is admin-only and reads templates via `loadProjects()` from `src/components/collage/utils/projects.ts`, which persists an array in `localStorage` under `memeSRC_collageProjects_v1`. The page re-fetches on window focus and backgrounds caption metadata lookups through `getMetadataForKey` (Amplify Storage).
- [x] `src/components/collage/utils/projects.ts` defines the legacy `CollageProject` shape and helpers (`createProject`, `getProject`, `upsertProject`, `deleteProject`, `buildSnapshotFromState`). Each saved template currently stores `{ id, name, createdAt, updatedAt, thumbnail, thumbnailKey, thumbnailSignature, thumbnailUpdatedAt, state }` in localStorage.
- [x] `src/components/collage/components/ProjectPicker.tsx` renders the grid UI, recomputes thumbnails with `renderThumbnailFromSnapshot`, and calls `upsertProject` to cache the thumbnail + signature locally. When we switch to a remote backend this on-mount write must be replaced or throttled so browsing the list does not spam mutations.
- [x] `src/pages/CollagePage.js` uses the helpers above to seed new templates, autosave state, and regenerate thumbnails (`saveProjectNow`, `handleEditingSessionChange`, and autosave effects). Autosave assumes synchronous writes and relies on a snapshot signature (`computeSnapshotSignature`) to avoid redundant saves.
- [x] Existing GraphQL schema (`amplify/backend/api/memesrc/schema.graphql`) already exposes an `EditorProject` model that uses API + S3 thumbnails (`src/pages/EditorProjectsPage.js`). It can inform access patterns but is not integrated with the collage template flow.

### Data persistence reference
- Storage key: `memeSRC_collageProjects_v1` (array of `CollageProject` objects).
- Snapshot builder: `buildSnapshotFromState` converts live editor state into a serializable `CollageSnapshot` (`src/types/collage.ts`).
- Thumbnail cache: `thumbnail` stores an inline data URL; `thumbnailKey` is reserved for remote storage; `thumbnailSignature` dedupes renders.
- Terminology gap: the runtime types still reference `CollageProject`; plan a follow-up rename to align with the Template model once API hookups land.
- Ownership signal: new Template records will capture the caller’s Amplify `identityId` in `ownerIdentityId` to satisfy the owner auth rule alongside the admin gate.

## Migration Goals
- Formalize the saved artifact as a **Template** and centralize storage in Amplify (GraphQL + S3) while keeping the UI contracts for `loadProjects`, `createProject`, `upsertProject`, and `deleteProject`.
- Preserve the existing autosave UX and thumbnail previews without introducing excessive network chatter.
- Ensure admin-only access remains enforced and document any new environment variables, schema changes, or storage prefixes.
- Provide a clear audit trail in this README so future runs see which steps are complete, which decisions are pending, and how to verify changes.

## Phase 1 – Backend Model & Access
- [x] Decide whether to extend `EditorProject` or introduce a dedicated `Template` model. **Decision:** create a standalone `Template` type so collage artifacts evolve independently from editor projects (confirmed 2025-10-23).
  ```graphql
  # Proposed shape if creating a new model (update once finalized)
  type Template
    @model
    @auth(
      rules: [
        { allow: groups, groups: ["admins"] },
        { allow: owner, ownerField: "ownerIdentityId", operations: [create, read, update, delete] }
      ]
    ) {
    id: ID!
    ownerIdentityId: String
    name: String!
    state: AWSJSON @deprecated(reason: "Prefer S3 snapshotKey for large payloads")
    snapshotKey: String
    snapshotVersion: Int
    thumbnailKey: String
    thumbnailSignature: String
    createdAt: AWSDateTime
    updatedAt: AWSDateTime
  }
  ```
- [x] Confirm auth (currently `/projects` is admins only) and whether editors need individual ownership (`owner`/`identityId` with `@auth`) for future expansion. **Decision:** keep the admin-only gate during testing but add an owner rule keyed off `ownerIdentityId` (same pattern as `UsageEvent.identityId`) so we are ready for pro-user rollout.
- [x] Standardize S3 layout for snapshots/thumbnails. **Decision:** store per-user assets at Amplify `protected` level under `collage/templates/{templateId}/snapshot.json` and `collage/templates/{templateId}/thumbnail.jpg`; add a follow-up path for publishing to a `public/` prefix when sharing is enabled.
- [x] Lock the GraphQL contract. `amplify/backend/api/memesrc/schema.graphql` now declares the `Template` model (added 2025-01-23; no `amplify push` yet) with the finalized fields below. The Amplify-managed `createdAt`/`updatedAt` timestamps remain implicit via `@model`.
  ```graphql
  type Template
    @model(timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" })
    @auth(
      rules: [
        { allow: groups, groups: ["admins"] },
        {
          allow: owner
          ownerField: "ownerIdentityId"
          operations: [create, read, update, delete]
        }
      ]
    ) {
    id: ID!
    ownerIdentityId: String
    name: String!
    state: AWSJSON @deprecated(reason: "Prefer S3 snapshotKey for large payloads")
    snapshotKey: String
    snapshotVersion: Int
    thumbnailKey: String
    thumbnailSignature: String
    thumbnailUpdatedAt: AWSDateTime
  }
  ```
  Expected input/update envelopes (recorded pre-codegen to guide consumers; confirm once `amplify codegen` runs):
  ```graphql
  input CreateTemplateInput {
    id: ID
    ownerIdentityId: String
    name: String!
    state: AWSJSON
    snapshotKey: String
    snapshotVersion: Int
    thumbnailKey: String
    thumbnailSignature: String
    thumbnailUpdatedAt: AWSDateTime
  }

  input UpdateTemplateInput {
    id: ID!
    ownerIdentityId: String
    name: String
    state: AWSJSON
    snapshotKey: String
    snapshotVersion: Int
    thumbnailKey: String
    thumbnailSignature: String
    thumbnailUpdatedAt: AWSDateTime
  }

  input DeleteTemplateInput {
    id: ID!
  }
  ```
- [x] Prevent owner reassignment. Added a resolver override (`amplify/backend/api/memesrc/resolvers/Mutation.updateTemplate.req.vtl`) that strips `ownerIdentityId` from update mutations so only the record creator (or admins) can mutate other fields without transferring ownership.
- [x] Once schema updates merge, capture the resulting GraphQL query/mutation shapes here (e.g., from `amplify codegen` output). After the backend push on 2025-01-23, reran `amplify codegen` and confirmed the Template operations below (selection sets identical for `createTemplate`, `updateTemplate`, and `deleteTemplate`; subscriptions mirror the same fields). Skip `amplify push` or other backend apply commands unless separately approved.
  ```graphql
  mutation CreateTemplate($input: CreateTemplateInput!, $condition: ModelTemplateConditionInput) {
    createTemplate(input: $input, condition: $condition) {
      id
      ownerIdentityId
      name
      state
      snapshotKey
      snapshotVersion
      thumbnailKey
      thumbnailSignature
      thumbnailUpdatedAt
      createdAt
      updatedAt
      __typename
    }
  }

  query GetTemplate($id: ID!) {
    getTemplate(id: $id) {
      id
      ownerIdentityId
      name
      state
      snapshotKey
      snapshotVersion
      thumbnailKey
      thumbnailSignature
      thumbnailUpdatedAt
      createdAt
      updatedAt
      __typename
    }
  }

  query ListTemplates($filter: ModelTemplateFilterInput, $limit: Int, $nextToken: String) {
    listTemplates(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        ownerIdentityId
        name
        state
        snapshotKey
        snapshotVersion
        thumbnailKey
        thumbnailSignature
        thumbnailUpdatedAt
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
  ```
- [x] Record any Amplify env vars, CLI steps, or IAM policy updates needed to grant S3/API access. _2025-01-27:_ No new env vars required; existing Amplify `aws-exports.js` supplies region/API credentials and protected-level S3 access. Documented the `collage/templates/{templateId}/` prefix for snapshots/thumbnails—no IAM changes beyond the Template model owner rule.

## Phase 2 – API & Storage Wiring
- [x] Replace the localStorage helpers with remote-aware implementations (wrap Amplify `API.graphql` + `Storage`). Keep method names/intents identical so pages/components require minimal changes. _2025-01-24 update:_ Added `src/components/collage/utils/templates.ts` with Amplify-backed CRUD plus local cache. _2025-01-25 note:_ Drop the localStorage fallback entirely, ensure cache invalidation works when mutations fail, and finish wiring the helper so remote data stays authoritative before flipping callers. _2025-01-26:_ Remote helper now runs without any legacy fallback, replaces cache atomically per list fetch, and reuses S3 uploads for snapshots/thumbnails.
- [x] Update `ProjectPicker` to read pre-signed URLs instead of inline thumbnails. Ensure the list view does not call a write mutation on render; consider a dedicated `resolveThumbnailUrl(project)` helper that downloads or memoizes S3 results. _2025-01-26:_ Picker now calls `resolveThumbnailUrl`, caches signed URLs per signature, and falls back to client renders without mutating templates.
- [x] Upload thumbnails via `Storage.put` after client-side rendering (`renderThumbnailFromSnapshot`), then persist `thumbnailKey` + `thumbnailSignature` so signed URL fetches can validate staleness. _2025-01-26:_ Autosave queue drives thumbnail uploads; helper increments `snapshotVersion`/`thumbnailUpdatedAt` to bust caches.
- [x] Decide how to persist the heavy `state`: inline AWSJSON vs S3 object vs hybrid. _2025-01-27 decision:_ Keep the hybrid approach—persist JSON inline for fast searches/preview while uploading the canonical snapshot to protected S3. Revisit with instrumentation if payloads approach GraphQL limits to optionally drop inline copies.
- [x] Ensure `ProjectsPage`/`ProjectPicker` handle async data (loading states, optimistic cache, refetch). Document any pagination/limit choices adopted. _2025-01-26:_ `ProjectsPage` now awaits the remote helper on focus refresh/delete (50-item pagination retained); picker renders while thumbnails resolve asynchronously.
- [x] Helper rewrite blueprint:
  - Mirror the existing API surface (`loadProjects`, `createProject`, `upsertProject`, `deleteProject`, `buildSnapshotFromState`) in a new remote-aware module (likely `src/components/collage/utils/templates.ts`).
  - Cache template records locally (e.g., Map keyed by `id`) with timestamps so focus refetches do not hammer the API. _Implemented via `templateCache` + signed URL memoization; cache resets on forced refetch._
  - `loadProjects` → `API.graphql(listTemplates)`; `createProject` → `createTemplate` + initialize protected S3 objects; `upsertProject` → conditional `updateTemplate` plus snapshot/thumbnail uploads when signatures change; `deleteProject` → `deleteTemplate` + S3 cleanup.
  - Remove the legacy localStorage fallback entirely once remote helpers are reliable; migrate callers to the new module in a single pass so cached state cannot drift. _Completed 2025-01-26; all editor/pages now import `templates.ts`._

## Phase 3 – Editor Integration & Cleanup
- [x] Swap the editor autosave pipeline (`saveProjectNow`, autosave effects, thumbnail regeneration) to call the new async helpers. Introduce a debounced write queue that coalesces rapid edits (dragging, text tweaks) and keeps metadata-only payloads small. _2025-01-26:_ CollagePage now builds a debounce queue (650 ms) that coalesces state writes, uploads thumbnails only when the signature changes, and keeps the snapshot cache authoritative.
- [x] Block navigation while a save is in flight (React Router transition blocker + `beforeunload`), surface a visible “Saving…” indicator, but keep in-editor interactions responsive. Only disable actions that would drop pending work (e.g., closing dialogs, switching templates) until the queue clears. _Navigation attempts now trigger a blocker that flushes the queue; header shows “Saving…”/“All changes saved”; Cmd/Ctrl+S respects queue state._
- [x] On save failures, coalesce and retry with the latest queued state; discard superseded mutations so rapid edits resolve to the freshest snapshot/thumbnail pair. Record telemetry/toasts for repeated failures. _Failures surface an error toast, back off (1.5s→8s) and requeue the latest snapshot; retries supersede older mutations._
- [x] Make sure the `/projects` view reflects remote changes promptly (refetch after mutations or maintain a shared store). _2025-01-27:_ Added a template cache subscription and ProjectsPage listener so create/update/delete mutations push updates immediately; focus refetch remains for cross-session changes.
- [x] Retire or gate the `localStorage` fallback once production data is validated. If a migration script is required to migrate existing local drafts, capture the high-level steps and required approvals; avoid documenting direct `amplify push`/apply commands. _Legacy helper remains for migration scripts only; runtime no longer touches localStorage._
- [x] Add or update tests (e.g., mock Amplify in unit tests for the helper layer, add smoke tests around the CRUD cycle). _2025-01-27:_ Added Jest coverage for the template helper subscription/cache flow (`src/components/collage/utils/templates.test.ts`).

_Verification 2025-01-26:_ `npx eslint src/components/collage/utils/templates.ts src/pages/ProjectsPage.tsx src/components/collage/components/ProjectPicker.tsx src/pages/CollagePage.js`
_Verification 2025-01-27:_ `npm test -- --runTestsByPath src/components/collage/utils/templates.test.ts --watchAll=false`

## Open Questions & Notes
- Where should the authoritative snapshot live? Inline `AWSJSON`, S3 JSON blob, or mixed (short fields in GraphQL, heavy payload in S3)? _Currently running hybrid (inline JSON + protected S3); revisit if snapshots start exceeding comfortable GraphQL payload sizes._
- How aggressively should ProjectPicker regenerate/upload thumbnails when the remote path is live? Consider background jobs vs on-demand regeneration. Any throttling should account for Template terminology in future code updates.
- Plan for migrating existing local drafts (export tool, one-time script, or accept reset?). Document once the approach is chosen.

## Update Guidance for Future Runs
- Keep the phase lists current: mark finished bullets with `[x]`, add timestamps for significant decisions, and append new todos under the appropriate phase instead of creating new sections.
- When schema/API contracts change, paste the updated GraphQL fragments and S3 prefixes here with a short note (`Updated 2025-10-24`).
- If you touch helper utilities, note the entry points (file + exported function) so the next contributor can diff quickly.
- Log open questions or blockers in the section above before ending a run; remove them only once resolved.
- After shipping code, summarize verification (tests run, manual flows exercised) in this README for traceability.
- Call out any backend apply steps (e.g., `amplify push`) as separate approvals; do not include execution commands in this checklist.

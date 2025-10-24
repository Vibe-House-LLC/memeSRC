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
- [ ] Record any Amplify env vars, CLI steps, or IAM policy updates needed to grant S3/API access.

## Phase 2 – API & Storage Wiring
- [ ] Replace the localStorage helpers with remote-aware implementations (wrap Amplify `API.graphql` + `Storage`). Keep method names/intents identical so pages/components require minimal changes.
- [ ] Update `ProjectPicker` to read pre-signed URLs instead of inline thumbnails. Ensure the list view does not call a write mutation on render; consider a dedicated `resolveThumbnailUrl(project)` helper that downloads or memoizes S3 results.
- [ ] Upload thumbnails via `Storage.put` after client-side rendering (`renderThumbnailFromSnapshot`), then persist `thumbnailKey` + `thumbnailSignature` so signed URL fetches can validate staleness.
- [ ] Decide how to persist the heavy `state`: inline AWSJSON vs S3 object vs hybrid. Note the decision (with rationale) in this section once made.
- [ ] Ensure `ProjectsPage`/`ProjectPicker` handle async data (loading states, optimistic cache, refetch). Document any pagination/limit choices adopted.
- [ ] Helper rewrite blueprint:
  - Mirror the existing API surface (`loadProjects`, `createProject`, `upsertProject`, `deleteProject`, `buildSnapshotFromState`) in a new remote-aware module (likely `src/components/collage/utils/templates.ts`).
  - Cache template records locally (e.g., Map keyed by `id`) with timestamps so focus refetches do not hammer the API.
  - `loadProjects` → `API.graphql(listTemplates)`; `createProject` → `createTemplate` + initialize protected S3 objects; `upsertProject` → conditional `updateTemplate` plus snapshot/thumbnail uploads when signatures change; `deleteProject` → `deleteTemplate` + S3 cleanup.
  - Keep a feature flag or fallback path to the current localStorage implementation during rollout, and note decommission steps once remote sync stabilizes.

## Phase 3 – Editor Integration & Cleanup
- [ ] Swap the editor autosave pipeline (`saveProjectNow`, autosave effects, thumbnail regeneration) to call the new async helpers. Introduce debouncing or a write queue to avoid overlapping mutations and to coalesce thumbnail + state updates.
- [ ] Make sure the `/projects` view reflects remote changes promptly (refetch after mutations or maintain a shared store). Currently `ProjectsPage` reloads on window focus; adjust or supplement as needed. Consider renaming UI copy (“Your Memes”) once Templates are end-user visible.
- [ ] Retire or gate the `localStorage` fallback once production data is validated. If a migration script is required to migrate existing local drafts, capture the high-level steps and required approvals; avoid documenting direct `amplify push`/apply commands.
- [ ] Add or update tests (e.g., mock Amplify in unit tests for the helper layer, add smoke tests around the CRUD cycle). Track gaps here until implemented.

## Open Questions & Notes
- Where should the authoritative snapshot live? Inline `AWSJSON`, S3 JSON blob, or mixed (short fields in GraphQL, heavy payload in S3)?
- How aggressively should ProjectPicker regenerate/upload thumbnails when the remote path is live? Consider background jobs vs on-demand regeneration. Any throttling should account for Template terminology in future code updates.
- Plan for migrating existing local drafts (export tool, one-time script, or accept reset?). Document once the approach is chosen.

## Update Guidance for Future Runs
- Keep the phase lists current: mark finished bullets with `[x]`, add timestamps for significant decisions, and append new todos under the appropriate phase instead of creating new sections.
- When schema/API contracts change, paste the updated GraphQL fragments and S3 prefixes here with a short note (`Updated 2025-10-24`).
- If you touch helper utilities, note the entry points (file + exported function) so the next contributor can diff quickly.
- Log open questions or blockers in the section above before ending a run; remove them only once resolved.
- After shipping code, summarize verification (tests run, manual flows exercised) in this README for traceability.
- Call out any backend apply steps (e.g., `amplify push`) as separate approvals; do not include execution commands in this checklist.

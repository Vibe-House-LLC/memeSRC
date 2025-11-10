# Project Visibility Action Plan

## Phase 1 — Schema & Data Layer
- Add `TemplateVisibility` enum (`PRIVATE`, `PROTECTED`, `PUBLIC`) and extend `Template` with `visibility` (default `PRIVATE`), `publicSlug`, `protectedShareTokenHash`, `shareTokenIssuedAt`, `publishedAt`, and `approvedAt`.
- Create GSIs for `(visibility, updatedAt)` and `protectedShareTokenHash` to support public listings and protected-link lookups.
- Assume legacy templates remain `PRIVATE` until their owners change visibility; generate slugs/tokens on demand when a template leaves the private state.

## Phase 2 — API & Authorization
- Regenerate Amplify GraphQL operations after schema updates so mutations/queries expose the new fields.
- Keep owner/admin control on the core `Template` model but add resolvers for:
  - `templateByShareToken(token)` that hashes the token, matches `protectedShareTokenHash`, asserts `visibility === PROTECTED`, and returns a read-only payload plus temporary S3 access.
  - `templatesByVisibility(visibility, nextToken)` that only returns rows where `visibility === PUBLIC` and `approvedAt` is set, optionally filtered by `publicSlug` or owner handle for profile queries.
- Ensure protected/public resolvers never expose private-only fields (state JSON, drafts) and record basic access telemetry.

## Phase 3 — Frontend Data Plumbing
- Update `src/types/collage.ts` and any shared template types to include the new visibility and moderation fields.
- Extend `src/components/collage/utils/templates.ts` to normalize `visibility`, `publicSlug`, token metadata, and pass them through `createProject`, `upsertProject`, and subscriptions.
- Add helpers for generating/regenerating share tokens, hashing client-side payloads before sending to the resolver, and formatting share/public URLs.
- Refresh any local caches/selectors so visibility changes broadcast correctly to connected components.

## Phase 4 — UI & Routing
- Add visibility controls to `/projects` creation/editing flows with inline copy that reflects the clarified requirements.
- Provide explicit actions for copying protected links, regenerating tokens, and toggling between `PRIVATE`, `PROTECTED`, and `PUBLIC`.
- Build read-only surfaces: `/templates/:publicSlug` for public templates and `/u/:username` for profile pages listing approved public templates with basic owner info.
- Update navigation/search to source public templates via the moderated query and indicate pending approval states for owners/admins.

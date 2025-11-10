# Project Visibility & Sharing Plan

## Main Goals
- Introduce per-template `visibility` with `private`, `protected`, and `public` states so `/projects` can surface owner-only drafts, shareable links, and broadly discoverable templates.
- Extend backend schema, API payloads, and persistence to store the new visibility enum, defaulting existing templates to `private` to avoid unintended exposure.
- Support protected templates with shareable links (tokenized URLs) that grant read access without authentication changes; links should be revocable/regenerable by the owner.
- Expose public templates site-wide: include discoverability in search, public user profiles, and direct links; ensure profile pages list only the owner’s public templates.
- Update `/projects` UI and any template editors/forms so creators can set and update visibility, with clear copy explaining each option.
- Ensure permissions enforcement across frontend and backend: only owners can edit/delete, protected links gate read-only access, and public templates remain viewable by all.
- Add analytics/logging hooks (if available) to monitor visibility changes and shared link usage for future iteration.

## Next Action Items
- **Clarify requirements** (resolved)
  - Protected links remain valid indefinitely unless the owner switches the template back to private, which revokes access; no authentication, expiration, or regeneration UX needed.
  - Public templates must clear a moderation/approval step before they appear in global search.
  - Public profiles should live at `/u/:username` and display the user's public templates plus display name, avatar, and optional short bio.
  - Visibility copy can stay lightweight via inline helper text or tooltips describing “Private,” “Protected link,” and “Public,” plus confirmation prompts when changing visibility.
- **Backend investigations**
  - Template records live in `amplify/backend/api/memesrc/schema.graphql:316-340` under the `Template` model. We need to introduce a `TemplateVisibility` enum plus new fields on this type: `visibility` (defaults to `private`), `publicSlug` (clean identifier for `/templates/:slug`), `protectedShareTokenHash` (store a hashed token for protected links), `shareTokenIssuedAt`, and moderation-related timestamps (`publishedAt`, `approvedAt`). Add secondary indexes for `visibility` + `updatedAt` and `protectedShareTokenHash` so lookups for public search and protected links stay efficient.
  - The React app talks to templates exclusively through Amplify-generated GraphQL operations (`createTemplate`/`updateTemplate` in `src/graphql/mutations.js:2089-2140`, `getTemplate`/`templatesByOwnerIdentityIdAndCreatedAt`/`listTemplates` in `src/graphql/queries.js:1213-1310`, and `onCreateTemplate`/`onUpdateTemplate`/`onDeleteTemplate` in `src/graphql/subscriptions.js:2008-2115`). `src/components/collage/utils/templates.ts` centralizes those calls, caches results, and uploads thumbnails/snapshots to the `protected` S3 level. Once `visibility` exists we need to (a) regenerate the GraphQL documents, (b) extend `CollageProject` and `normalizeTemplate` to include visibility metadata, and (c) thread the field through `createProject`, `upsertProject`, and subscription handlers so the UI can toggle and react to state changes.
  - Authorization today only allows admins or the Cognito identity owner to access `Template` records. To safely expose protected/public reads we should keep writes behind owner/admin rules but add dedicated read surfaces:
    - Add a `templateByShareToken(token: ID!)` query backed by a Lambda/AppSync resolver that validates `protectedShareTokenHash` and `visibility === protected` before returning a sanitized payload (and reads S3 snapshots on behalf of the caller so we don't have to move objects out of the `protected` bucket).
    - Add a `templatesByVisibility` query that only returns rows where `visibility === public` **and** `approvedAt` is set; this resolver can power global search and `/u/:username` while still withholding drafts/moderation-pending items.
    - Keep the base `Template` type restricted to owner/admin so private data (state JSON, thumbnails) isn't accidentally exposed; public/protected consumers will only hit the new resolvers that enforce the visibility checks.
- **Frontend investigations**
  - Locate the components powering `/projects`, template detail pages, and template creation/editing to understand current state management and API usage.
  - Assess where user profiles live today (if at all); if missing, scope the new public profile view for surfacing public templates.
  - Review routing and navigation so protected/public links can resolve to appropriate read-only pages.
- **Sharing & link handling**
  - Decide on URL structure for protected share links and public template pages; verify routing will handle tokens.
  - Plan UI affordances for copying/regenerating links and indicating when a template is protected vs. public.
- **General guidance**
  - Favor small, well-organized code changes that align with existing project structure; introduce new modules/types locally before wider refactors.
  - Document assumptions in PR descriptions when requirements remain open so downstream work stays traceable.

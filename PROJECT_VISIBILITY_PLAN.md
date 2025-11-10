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
  - Identify schema files/models (likely Amplify resources) that currently define templates and map out changes needed for a `visibility` field plus any share-link tokens.
  - Trace all API endpoints/mutations that create/update/fetch templates to ensure the new field is persisted, validated, and returned to the client.
  - Audit authorization rules to guarantee protected/public reads remain scoped correctly and that owners retain full control.
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

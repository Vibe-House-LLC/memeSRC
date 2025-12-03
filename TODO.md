Inline formatting rollout for collage caption editors

Action items
- Port the inline formatting helpers from `src/pages/V2EditorPage.js` (parseFormattedText, buildIndexMaps, resolveSelectionBounds, toggleStyleInRanges, serializeRangesToMarkup, getActiveFormatsFromRanges).
- Add selection caching (with TTL) so toggles work after blur: cache last focused selection, reuse it if recent/meaningful; otherwise fall back to whole-text selection when unfocused.
- Update the caption text editor (in `src/components/collage/components/CaptionEditor.js` / `CanvasCollagePreview.js` flow) to store raw text-with-tags per caption and apply styles to the rendered object/text state.
- Wire toolbar buttons in the collage caption editor (and shared `src/components/TextEditorControls.js` if reused) to call the inline toggle handler; keep active-state sync when selection/caret moves.
- Preserve focus behavior: if the field wasn’t focused, don’t steal focus after toggling; if focused, restore selection/caret.

Edge cases / behaviors to preserve
- Collapsed caret inside a formatted run should toggle that entire run (remove/add tags) instead of wrapping a single character.
- True selections should toggle only the selected range and keep the selection intact post-toggle.
- If no focus and no cached selection, treat the whole caption as selected for toggling (so bold applies to all).
- Avoid defaulting to whole-text when a recent, non-full selection exists (e.g., tap bold right after selecting, even if blur occurred).
- Normalize adjacent style ranges when serializing to avoid redundant tags; ensure tag order is stable (`b`, `i`, `u`).
- Keep underline handled via `<u>` and map `underlined` to `underline` where applicable in controls.
- Cross-browser selection capture (especially iOS Safari): add a `selectionchange` listener to refresh cached selection + active formats when a caption input is active; rely on cached selection when direct selectionStart/End reads are flaky.

Concept / approach
- Use the V2EditorPage helpers as the single source of truth: parse raw HTML-like markup into clean text + style ranges, toggle styles on ranges, then reserialize to markup and reapply to the rendered caption.
- Maintain a raw value per caption (with tags) plus applied styles on the displayed text. Keep active format state in sync via selection parsing.
- Add a small selection cache object `{start, end, timestamp, hadFocus}` per caption; TTL ~15s and treat non-full-range caches as meaningful.
- When toggling: derive selection (live or cached), resolve to plain-text bounds via index maps, toggle style, serialize, update text object, sync active formats, optionally restore selection if focused.

Verification pass (manual)
- Selection toggle on a subset: bold/italic/underline on/off; selection preserved.
- Caret inside formatted run: toggle removes that run; caret stays.
- No focus, hit toggle: whole text gains/loses style without stealing focus.
- Cached selection after blur (short delay): toggle still applies to that subset, not the whole text.

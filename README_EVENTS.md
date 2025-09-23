# Usage Event Reference

We send analytics through `trackUsageEvent(eventType, eventData)` across the app. Event payloads below reflect the shape of our current calls; fields marked as optional appear only when data is available.

## search
Triggered when a search form is submitted on the home page and the in-app search bar.

Example event data:
```json
{
  "index": "stooges",
  "searchTerm": "cream pies",
  "source": "HomePage"
}
```
Optional fields: `resolvedIndex` (shows the comma-separated list backing the `_favorites` filter).

## view_image
Logged when a frame renders on the V2 frame page, including navigation between frames.

```json
{
  "cid": "stooges",
  "season": "3",
  "episode": "5",
  "frame": "12345",
  "fineTuningIndex": "2",
  "source": "V2FramePage",
  "searchTerm": "cream pies"
}
```

## view_episode
Runs when the "View Episode" button is clicked from the frame page or advanced editor.

```json
{
  "source": "V2FramePage",
  "cid": "stooges",
  "season": "3",
  "episode": "5",
  "frame": "12345",
  "fineTuningIndex": "2",
  "searchTerm": "cream pies"
}
```
Optional fields: `editorProjectId` (when coming from the advanced editor).

## add_to_library
Sent after a frame successfully saves to a user's library.

```json
{
  "cid": "stooges",
  "season": "3",
  "episode": "5",
  "frame": "12345",
  "fineTuningIndex": "2",
  "source": "V2FramePage",
  "searchTerm": "cream pies"
}
```

## save_intent_image
Captures strong signals that a user intends to save or download an image. Emitted when save-related UI affordances trigger (context menu, long-press, drag gestures, or explicit actions such as copy/share in the advanced editor dialog).

```json
{
  "source": "V2SearchPage",
  "intentTarget": "SearchResultThumbnail",
  "trigger": "context_menu",
  "cid": "stooges",
  "season": "3",
  "episode": "5",
  "frame": 12340,
  "position": 4,
  "searchTerm": "cream pies"
}
```

Common `trigger` values include:
- `context_menu` — right-click or long-press context menu on an image surface
- `long_press` — pointer hold beyond ~600 ms on touch/pen devices
- `drag_start` — user begins a drag gesture on the image
- `share_button` / `share_button_error` — explicit share attempts from the advanced editor dialog
- `copy_button` — advanced editor copy-to-clipboard action

Representative `intentTarget` values:
- `SearchResultThumbnail` – search result posters and animated previews
- `FrameHeroImage` – primary frame detail hero image
- `SurroundingFrameThumbnail` – nearby frame previews on frame and editor pages
- `SaveDialogPreview` – image shown inside the editor’s save modal
- `SaveDialogAction` – explicit share/copy actions initiated from the modal
- `MagicResultOption` – AI variation previews displayed in the advanced editor dialog

Advanced editor payloads may also include fields such as `editorProjectId`, `generatedImageFilename`, `imageUploading`, `hasShareImageFile`, and `hasClipboardImage` to describe the save surface state.

## library_upload
Represents successful uploads into the user's library, whether from the library browser or admin collage tooling.

```json
{
  "source": "LibraryBrowser",
  "storageLevel": "private",
  "uploadedCount": 2,
  "batchSize": 3,
  "files": [
    {
      "key": "library/1700000000000-kfj2-photo.png",
      "fileName": "photo.png",
      "fileSize": 512341,
      "fileType": "image/png"
    },
    {
      "key": "library/1700000000001-2jd9-landscape.jpg",
      "fileName": "landscape.jpg",
      "fileSize": 413276,
      "fileType": "image/jpeg"
    }
  ]
}
```

## library_delete
Emitted after a delete request succeeds in removing items from the library.

```json
{
  "source": "LibraryBrowser",
  "storageLevel": "private",
  "deletedCount": 3,
  "keys": [
    "library/1700000000003-8as8-old-photo.png",
    "library/1700000000004-f9s0-background.png",
    "library/1700000000005-d9x4-meme.jpg"
  ]
}
```

## favorite_add / favorite_remove
Fired when a user toggles the favorite star for a show or movie.

```json
{
  "indexId": "stooges",
  "source": "FavoriteToggle",
  "nextIsFavorite": true,
  "favoritesCount": 6
}
```
`nextIsFavorite` is `true` for `favorite_add` and `false` for `favorite_remove`. `favoritesCount` is included when the updated list is available.

## random_frame
Recorded whenever the floating Random button loads a new frame.

```json
{
  "source": "FloatingActionButtons",
  "showCount": 12,
  "hasAd": false
}
```

## collage_generate
Tracks montage generation requests from the collage builder.

```json
{
  "source": "CollagePage",
  "panelCount": 4,
  "aspectRatio": "square",
  "imageCount": 4,
  "hasCustomLayout": false,
  "allPanelsHaveImages": true,
  "borderThickness": 1.5,
  "borderColor": "#000000",
  "canvasElementFound": true,
  "templateId": "baseline-2x2"
}
```
Optional fields: `projectId` (when editing an existing project).

## view_image_advanced
Captured when the V2 advanced editor loads a background image, whether from the catalog, a project, or a collage hand-off.

```json
{
  "source": "V2EditorPage",
  "cid": "stooges",
  "season": "3",
  "episode": "5",
  "frame": "12345",
  "fineTuningIndex": "2",
  "selectedFrameIndex": 7,
  "fid": "stooges-3-5-12345",
  "editorProjectId": "abc123",
  "fromCollage": false,
  "hasUploadedImage": false,
  "imageLoaded": true,
  "searchTerm": "cream pies"
}
```
When the editor is opened from a collage or upload, only the relevant fields (`fromCollage`, `hasUploadedImage`, etc.) populate.

## advanced_editor_save
Logged when the Save button is clicked inside the advanced editor dialog flow.

```json
{
  "source": "V2EditorPage",
  "cid": "stooges",
  "season": "3",
  "episode": "5",
  "frame": "12345",
  "fineTuningIndex": "2",
  "editorProjectId": "abc123",
  "fromCollage": false,
  "hasUploadedImage": false,
  "searchTerm": "cream pies"
}
```

## advanced_editor_add_text_layer
Fire when the advanced editor’s “Add text layer” control is used.

```json
{
  "source": "V2EditorPage",
  "cid": "stooges",
  "season": "3",
  "episode": "5",
  "frame": "12345",
  "fineTuningIndex": "2",
  "selectedFrameIndex": 7,
  "canvasObjectCount": 2,
  "nextCanvasObjectCount": 3,
  "searchTerm": "cream pies"
}
```
Optional fields: `editorProjectId` (when editing a saved project).

---

These examples mirror the structures currently emitted in code so backend/analytics consumers can plan their schemas and indexes confidently.

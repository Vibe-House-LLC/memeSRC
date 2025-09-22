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

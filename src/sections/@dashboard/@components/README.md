# FileBrowser Component

A comprehensive file browser component with viewers for videos, JSON, and CSV files.

## Features

- **Tree View Navigation**: Hierarchical file structure display
- **File Type Support**: 
  - Videos (.mp4, .mov) with HTML5 player
  - JSON files with syntax highlighting and formatting
  - CSV files with table display
- **S3 Integration**: Uses Amplify Storage with protected level access
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: User-friendly error messages and loading states

## Usage

```tsx
import { FileBrowser } from '../@components';

function MyComponent() {
    return (
        <FileBrowser 
            pathPrefix="src-extracted" 
            id="airplane" 
        />
    );
}
```

## Props

- `pathPrefix` (string): The S3 path prefix (without trailing slash)
- `id` (string): The ID to append to the path prefix

The component will list files from: `{pathPrefix}/{id}/`

## S3 Path Handling

The component correctly handles S3 paths with identity IDs:
- When you pass `pathPrefix="src-extracted"` and `id="airplane"`
- It will list files from the path `src-extracted/airplane/`
- File keys returned from S3 will be in format: `protected/us-east-1:identity-id/src-extracted/airplane/filename.ext`
- The component automatically parses these keys to extract the identity ID and actual file path for proper Storage.get() calls

## File Type Support

### Videos (.mp4, .mov)
- Native HTML5 video player with controls
- Supports both MP4 and QuickTime formats
- Uses signed URLs for secure streaming

### JSON Files
- Pretty-printed JSON with 2-space indentation
- Error handling for malformed JSON
- Syntax highlighting with monospace font

### CSV Files
- Table display with sticky headers
- Automatic CSV parsing (simple implementation)
- Shows row count in header
- Scrollable for large datasets

### Unsupported Files
- Shows file metadata (size, last modified)
- Displays helpful message about supported types

## Dependencies

- Material-UI v5 components
- AWS Amplify Storage
- React hooks for state management

## Custom Components

The component includes a custom TreeNode implementation since TreeView/TreeItem are not available in the older MUI version being used.

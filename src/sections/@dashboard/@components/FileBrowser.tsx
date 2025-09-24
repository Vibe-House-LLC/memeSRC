import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    styled,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    IconButton,
    TextField,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Popover,
    Tabs,
    Tab,
    Checkbox,
    FormControlLabel,
    FormGroup
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon,
    Folder as FolderIcon,
    InsertDriveFile as FileIcon,
    VideoFile as VideoIcon,
    DataObject as JsonIcon,
    TableChart as CsvIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Palette as PaletteIcon,
    Analytics as AnalyticsIcon,
    Visibility as VisibilityIcon,
    PlaylistAddCheck as EpisodeSelectIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { Storage } from 'aws-amplify';
import { ChromePicker } from 'react-color';
import { calculateFrameCountFromSubfolders } from '../../../utils/calculateFrameCountFromSubfolders';

// Configure Storage to use custom prefix (empty string for bucket root access)
Storage.configure({
    customPrefix: {
        public: '',
        protected: '',
        private: ''
    }
});

// Types
interface FileItem {
    key: string;
    lastModified: string;
    size: number;
    isDirectory: boolean;
    name: string;
    extension?: string;
    relativePath?: string;
}

interface FileNode {
    id: string;
    name: string;
    isDirectory: boolean;
    children?: FileNode[];
    fullPath: string;
}

interface DataSummary {
    seriesName: string;
    totalSubtitles: number;
    seasons: {
        [seasonNumber: string]: {
            folderExists: boolean;
            docsExists: boolean;
            subtitleCount: number;
            episodes: {
                [episodeNumber: string]: {
                    folderExists: boolean;
                    docsExists: boolean;
                    subtitleCount: number;
                    videoFileCount: number;
                };
            };
        };
    };
    issues: string[];
}

interface SubtitleEntry {
    season: string;
    episode: string;
    subtitleIndex: string;
    subtitleText: string;
    subtitleStart: string;
    subtitleEnd: string;
}

interface SpotCheckItem {
    subtitle: SubtitleEntry;
    videoFile: string;
    videoTimestamp: number;
    episodePath: string;
    contextSubtitles?: {
        before: SubtitleEntry[];
        after: SubtitleEntry[];
    };
}

interface SpotCheckData {
    [episodeKey: string]: SpotCheckItem[];
}

interface FileBrowserProps {
    pathPrefix: string;
    id: string;
    files?: FileItem[]; // Optional: if provided, use these instead of listing
    base64Columns?: string[]; // Optional: column names to decode from base64 in CSV files
    srcEditor?: boolean; // Optional: if true, show the src editor options
    onEpisodeSelectionChange?: (selectedEpisodes: { season: number; episode: number }[]) => void; // Optional: callback for episode selection
    refreshKey?: number; // Optional: when changed, triggers a refresh of the file list
}

// Custom TreeNode component
interface TreeNodeProps {
    node: FileNode;
    depth: number;
    expanded: string[];
    onToggle: (event: React.SyntheticEvent, nodeIds: string[]) => void;
    onFileSelect: (file: FileItem) => void;
    files: FileItem[];
    children?: React.ReactNode;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
    node, 
    depth, 
    expanded, 
    onToggle, 
    onFileSelect, 
    files, 
    children 
}) => {
    const isExpanded = expanded.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;

    const handleToggle = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (hasChildren) {
            const newExpanded = isExpanded 
                ? expanded.filter(id => id !== node.id)
                : [...expanded, node.id];
            onToggle(event, newExpanded);
        }
    };

    const handleClick = () => {
        const file = files.find(f => f.relativePath === node.fullPath);
        if (file && !file.isDirectory) {
            onFileSelect(file);
        } else if (hasChildren) {
            // Toggle folder when clicking on it
            const newExpanded = isExpanded 
                ? expanded.filter(id => id !== node.id)
                : [...expanded, node.id];
            onToggle({} as React.SyntheticEvent, newExpanded);
        }
    };

    return (
        <>
            <ListItem disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                    sx={{ 
                        pl: 2 + depth * 2,
                        py: 0.5,
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        }
                    }}
                    onClick={handleClick}
                >
                    {hasChildren && (
                        <IconButton
                            size="small"
                            onClick={handleToggle}
                            sx={{ mr: 0.5, p: 0.25 }}
                        >
                            {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                        </IconButton>
                    )}
                    {!hasChildren && <Box sx={{ width: 28 }} />}
                    
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        {getFileIcon(node.name, node.isDirectory)}
                    </ListItemIcon>
                    
                    <ListItemText 
                        primary={node.name}
                        primaryTypographyProps={{ 
                            variant: 'body2',
                            sx: { fontSize: '0.875rem' }
                        }}
                    />
                    
                    {!node.isDirectory && (
                        <Chip
                            label={getFileExtension(node.name).toUpperCase()}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                    )}
                </ListItemButton>
            </ListItem>
            
            {hasChildren && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {children}
                    </List>
                </Collapse>
            )}
        </>
    );
};

const VideoPlayer = styled('video')({
    width: '100%',
    maxHeight: '400px',
    borderRadius: '8px',
});

const JsonViewerContainer = styled('pre')({
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    overflow: 'auto',
    maxHeight: '500px',
    fontSize: '0.875rem',
    lineHeight: '1.4',
    border: '1px solid #333333',
});

// Helper functions
const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};

const isBase64 = (str: string): boolean => {
    // Check if string looks like base64 (at least 4 chars, valid base64 pattern)
    if (!str || str.length < 4) return false;
    
    // Basic base64 pattern check
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(str)) return false;
    
    // Must be divisible by 4 (with padding)
    if (str.length % 4 !== 0) return false;
    
    // Try to decode to see if it's valid
    try {
        // First decode the base64 to binary string
        const binaryString = atob(str);
        
        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Decode as UTF-8
        const decoded = new TextDecoder('utf-8').decode(bytes);
        
        // Check if decoded content is printable (basic heuristic for UTF-8 text)
        // Check for control characters except common whitespace
        const hasControlChars = [...decoded].some(char => {
            const code = char.charCodeAt(0);
            return (code >= 0 && code <= 8) || 
                   code === 11 || 
                   code === 12 || 
                   (code >= 14 && code <= 31) || 
                   code === 127;
        });
        return decoded.length > 0 && !hasControlChars;
    } catch (e) {
        return false;
    }
};

const decodeBase64Safe = (str: string): string => {
    try {
        // First decode the base64 to binary string
        const binaryString = atob(str);
        
        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Decode as UTF-8
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        return str; // Return original if decode fails
    }
};

const encodeBase64Safe = (str: string): string => {
    try {
        // Encode as UTF-8 first
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        
        // Convert Uint8Array to binary string
        let binaryString = '';
        for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }
        
        // Encode to base64
        return btoa(binaryString);
    } catch (e) {
        return str; // Return original if encode fails
    }
};

// Normalize text for tolerant searching: lowercased, no diacritics, punctuation removed, collapsed whitespace
const normalizeForSearch = (input: string): string => {
    if (!input) return '';
    const withoutDiacritics = input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // Keep only alphanumeric characters for matching (removes punctuation and spaces)
    return withoutDiacritics.replace(/[^a-z0-9]/gi, '');
};

const getFileIcon = (filename: string, isDirectory: boolean) => {
    if (isDirectory) return <FolderIcon color="primary" />;
    
    const extension = getFileExtension(filename);
    switch (extension) {
        case 'mp4':
        case 'mov':
            return <VideoIcon color="secondary" />;
        case 'json':
            return <JsonIcon color="success" />;
        case 'csv':
            return <CsvIcon color="warning" />;
        default:
            return <FileIcon />;
    }
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const buildFileTree = (files: FileItem[], basePath: string): FileNode[] => {
    const tree: { [key: string]: FileNode } = {};
    
    files.forEach(file => {
        // Use the relativePath property we added
        const relativePath = file.relativePath || '';
        if (!relativePath) return; // Skip if no relative path
        
        const pathParts = relativePath.split('/').filter(part => part.length > 0);
        let currentPath = '';
        
        pathParts.forEach((part, index) => {
            const parentPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            if (!tree[currentPath]) {
                tree[currentPath] = {
                    id: currentPath,
                    name: part,
                    isDirectory: index < pathParts.length - 1,
                    children: [],
                    fullPath: currentPath,
                };
            }
            
            if (parentPath && tree[parentPath]) {
                const parent = tree[parentPath];
                if (!parent.children!.find(child => child.id === currentPath)) {
                    parent.children!.push(tree[currentPath]);
                }
            }
        });
    });
    
    // Return only root level nodes (those without '/' in their id)
    return Object.values(tree).filter(node => !node.id.includes('/'));
};

// File viewers
const VideoViewer: React.FC<{ url: string; filename: string }> = ({ url, filename }) => (
    <Card>
        <CardContent>
            <Typography variant="h6" gutterBottom>
                Video: {filename}
            </Typography>
            <VideoPlayer key={url} controls autoPlay>
                <source src={url} type="video/mp4" />
                <source src={url} type="video/quicktime" />
                Your browser does not support the video tag.
            </VideoPlayer>
        </CardContent>
    </Card>
);

const JsonFileViewer: React.FC<{ 
    content: string; 
    filename: string; 
    onSave: (content: string) => void;
    srcEditor?: boolean;
    selectedFile?: FileItem | null;
    onUnsavedChanges?: (hasChanges: boolean) => void;
    selectedEpisodes?: { season: number; episode: number }[];
    pathPrefix?: string;
    seriesId?: string;
}> = ({ content, filename, onSave, srcEditor = false, selectedFile = null, onUnsavedChanges, selectedEpisodes = [], pathPrefix = '', seriesId = '' }) => {
    const [formattedJson, setFormattedJson] = useState<string>('');
    const [editedJson, setEditedJson] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [isUpdatingFrameCount, setIsUpdatingFrameCount] = useState<boolean>(false);
    const [isCopyingExistingData, setIsCopyingExistingData] = useState<boolean>(false);
    const [colorPickerAnchorEl, setColorPickerAnchorEl] = useState<HTMLElement | null>(null);
    const [currentColorProperty, setCurrentColorProperty] = useState<string>('');

    // Check if JSON contains frameCount key
    const hasFrameCount = useMemo(() => {
        try {
            const parsed = JSON.parse(editedJson || formattedJson);
            return 'frameCount' in parsed;
        } catch {
            return false;
        }
    }, [editedJson, formattedJson]);

    // Check if JSON contains color properties
    const colorProperties = useMemo(() => {
        try {
            const parsed = JSON.parse(editedJson || formattedJson);
            const colors: { [key: string]: string } = {};
            if ('colorMain' in parsed) colors.colorMain = parsed.colorMain;
            if ('colorSecondary' in parsed) colors.colorSecondary = parsed.colorSecondary;
            return colors;
        } catch {
            return {};
        }
    }, [editedJson, formattedJson]);

    const hasColorProperties = Object.keys(colorProperties).length > 0;

    // Check if this is an existing alias (srcPending path)
    const isExistingAlias = useMemo(() => {
        return pathPrefix.includes('protected/srcPending') && seriesId.trim() !== '';
    }, [pathPrefix, seriesId]);

    

    // Function to update frame count in JSON
    const updateFrameCount = useCallback(async () => {
        if (!hasFrameCount || !selectedFile) return;
        
        setIsUpdatingFrameCount(true);
        try {
            // Calculate frame count by analyzing MP4 durations
            const frameCount = await calculateFrameCountFromSubfolders(selectedFile.key, selectedEpisodes);
            if (frameCount === 0) {
                setEditError('Could not calculate frame count - no MP4 files found or unable to get video durations');
                return;
            }
            
            // Update JSON with new frame count
            try {
                const parsed = JSON.parse(editedJson);
                parsed.frameCount = frameCount;
                const updatedJson = JSON.stringify(parsed, null, 2);
                setEditedJson(updatedJson);
                setEditError(null);
                
                console.log(`🎯 Updated frameCount to ${frameCount.toLocaleString()}`);
            } catch (parseError) {
                setEditError('Invalid JSON format');
            }
        } catch (error) {
            console.error('Error updating frame count:', error);
            setEditError('Failed to update frame count');
        } finally {
            setIsUpdatingFrameCount(false);
        }
    }, [hasFrameCount, selectedFile, editedJson, selectedEpisodes]);

    // Function to copy existing data from protected/src
    const copyExistingData = useCallback(async () => {
        if (!isExistingAlias || !selectedFile || !seriesId) return;
        
        setIsCopyingExistingData(true);
        try {
            // Construct the path to the existing metadata in protected/src
            const existingSrcPath = `protected/src/${seriesId}/${filename}`;
            
            console.log('🔄 Copying existing data from:', existingSrcPath);
            
            // Try to get the existing JSON file from protected/src
            const result = await Storage.get(existingSrcPath, {
                level: 'public',
                download: true
            });
            
            if (result && typeof result === 'object' && result !== null && 'Body' in (result as any)) {
                const existingContent = await (result as any).Body.text();
                
                try {
                    // Validate that it's valid JSON
                    const parsed = JSON.parse(existingContent);
                    const formattedContent = JSON.stringify(parsed, null, 2);
                    
                    setEditedJson(formattedContent);
                    setEditError(null);
                    
                    // Mark as having changes
                    onUnsavedChanges?.(true);
                    
                    console.log('✅ Successfully copied existing metadata');
                } catch (parseError) {
                    setEditError('Existing data is not valid JSON format');
                    console.error('Parse error:', parseError);
                }
            } else {
                setEditError('Could not read existing data');
            }
        } catch (error) {
            console.error('Error copying existing data:', error);
            if (error instanceof Error && error.message.includes('NoSuchKey')) {
                setEditError(`No existing metadata found at protected/src/${seriesId}/${filename}`);
            } else {
                setEditError('Failed to copy existing data');
            }
        } finally {
            setIsCopyingExistingData(false);
        }
    }, [isExistingAlias, selectedFile, seriesId, filename, onUnsavedChanges]);

    // Color picker handlers
    const handleColorPickerOpen = useCallback((colorProperty: string, event: React.MouseEvent<HTMLElement>) => {
        setCurrentColorProperty(colorProperty);
        setColorPickerAnchorEl(event.currentTarget);
    }, []);

    const handleColorPickerClose = useCallback(() => {
        setColorPickerAnchorEl(null);
        setCurrentColorProperty('');
    }, []);

    const handleColorChange = useCallback((color: any) => {
        if (!currentColorProperty) return;
        
        try {
            const parsed = JSON.parse(editedJson);
            parsed[currentColorProperty] = color.hex;
            const updatedJson = JSON.stringify(parsed, null, 2);
            setEditedJson(updatedJson);
            setEditError(null);
            
            console.log(`🎨 Updated ${currentColorProperty} to ${color.hex}`);
        } catch (parseError) {
            setEditError('Invalid JSON format');
        }
        
        // Don't close the picker - let user continue adjusting colors
    }, [currentColorProperty, editedJson]);
    
    useEffect(() => {
        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);
            setFormattedJson(formatted);
            setEditedJson(formatted);
            setError(null);
        } catch (err) {
            setError('Invalid JSON format');
            setFormattedJson(content);
            setEditedJson(content);
        }
    }, [content]);

    const handleEdit = () => {
        setIsEditing(true);
        setEditError(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedJson(formattedJson);
        setEditError(null);
        onUnsavedChanges?.(false);
    };

    const handleSave = () => {
        try {
            // Validate JSON before saving
            JSON.parse(editedJson);
            setEditError(null);
            onSave(editedJson);
            setFormattedJson(editedJson);
            setIsEditing(false);
            onUnsavedChanges?.(false);
        } catch (err) {
            setEditError('Invalid JSON format. Please fix the syntax before saving.');
        }
    };

    const handleJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedJson(event.target.value);
        setEditError(null);
        
        // Check if content has changed from original
        const hasChanges = event.target.value !== formattedJson;
        onUnsavedChanges?.(hasChanges);
    };
    
    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                    JSON: {filename}
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {editError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {editError}
                    </Alert>
                )}
                {isEditing ? (
                    <TextField
                        multiline
                        fullWidth
                        value={editedJson}
                        onChange={handleJsonChange}
                        variant="outlined"
                        sx={{
                            '& .MuiInputBase-root': {
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                lineHeight: '1.4',
                            }
                        }}
                        minRows={10}
                        maxRows={30}
                    />
                ) : (
                    <JsonViewerContainer>{formattedJson}</JsonViewerContainer>
                )}

                {/* Tools Section - only show when editing, srcEditor is true, and has tools available */}
                {isEditing && srcEditor && (hasFrameCount || hasColorProperties) && (
                    <Box sx={{ 
                        mt: 2,
                        p: 2, 
                        border: 1, 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        backgroundColor: 'background.default'
                    }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                            Tools
                        </Typography>
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 1, 
                            flexWrap: 'wrap',
                            flexDirection: { xs: 'column', sm: 'row' }
                        }}>
                            {hasFrameCount && (
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={updateFrameCount}
                                    size="small"
                                    disabled={isUpdatingFrameCount}
                                    sx={{ 
                                        whiteSpace: 'nowrap',
                                        width: { xs: '100%', sm: 'auto' }
                                    }}
                                >
                                    {isUpdatingFrameCount ? 'Updating...' : 'Update Frame Count'}
                                </Button>
                            )}
                            {isExistingAlias && (
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={copyExistingData}
                                    size="small"
                                    disabled={isCopyingExistingData}
                                    sx={{ 
                                        whiteSpace: 'nowrap',
                                        width: { xs: '100%', sm: 'auto' }
                                    }}
                                >
                                    {isCopyingExistingData ? 'Copying...' : 'Copy Existing Data'}
                                </Button>
                            )}
                            {Object.entries(colorProperties).map(([property, currentColor]) => (
                                <Button
                                    key={property}
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<PaletteIcon />}
                                    onClick={(e) => handleColorPickerOpen(property, e)}
                                    size="small"
                                    sx={{ 
                                        whiteSpace: 'nowrap',
                                        width: { xs: '100%', sm: 'auto' },
                                        '& .MuiButton-startIcon': {
                                            color: currentColor || '#000000'
                                        }
                                    }}
                                >
                                    {property === 'colorMain' ? 'Main Color' : 'Secondary Color'}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Action buttons - moved inside CardContent so they're always scrollable */}
                <Box sx={{ 
                    mt: 2,
                    pt: 2,
                    borderTop: 1, 
                    borderColor: 'divider'
                }}>
                    {isEditing ? (
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 1,
                            flexDirection: { xs: 'column', sm: 'row' },
                            width: '100%'
                        }}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                size="small"
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                                Save
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={handleCancel}
                                size="small"
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                                Cancel
                            </Button>
                        </Box>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<EditIcon />}
                            onClick={handleEdit}
                            size="small"
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                            Edit
                        </Button>
                    )}
                </Box>
            </CardContent>
            
            {/* Color Picker Popover */}
            <Popover
                open={Boolean(colorPickerAnchorEl)}
                anchorEl={colorPickerAnchorEl}
                onClose={handleColorPickerClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 1 }}>
                    <ChromePicker
                        color={colorProperties[currentColorProperty] || '#000000'}
                        onChange={handleColorChange}
                        disableAlpha={false}
                    />
                </Box>
            </Popover>
        </Card>
    );
};

// Optimized cell display component to avoid expensive operations in main render loop
const CsvCellDisplay: React.FC<{
    cell: string;
    columnName: string;
    base64Columns: string[];
}> = React.memo(({ cell, columnName, base64Columns }) => {
    const shouldDecode = base64Columns.includes(columnName);
    const isBase64Encoded = shouldDecode && isBase64(cell);
    
    if (isBase64Encoded) {
        const displayValue = decodeBase64Safe(cell);
        return (
            <Box>
                <Typography variant="body2" component="div">
                    {displayValue}
                </Typography>
                <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontStyle: 'italic' }}
                >
                    (decoded from base64)
                </Typography>
            </Box>
        );
    }
    
    return <>{cell}</>;
});

    // Spot Check Video Player Component
const SpotCheckVideoPlayer: React.FC<{
    item: SpotCheckItem;
    fullPath: string;
    index: number;
    files: FileItem[];
}> = ({ item, fullPath, index, files }) => {
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Helper function to parse subtitle timing (local copy)
    const parseSubtitleTime = (timeStr: string): number => {
        try {
            // Handle different time formats
            if (timeStr.includes(':')) {
                // Format: HH:MM:SS.mmm or MM:SS.mmm
                const parts = timeStr.split(':');
                let seconds = 0;
                
                if (parts.length === 3) {
                    // HH:MM:SS.mmm
                    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
                } else if (parts.length === 2) {
                    // MM:SS.mmm
                    seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                }
                
                return seconds;
            } else {
                // Assume it's already in seconds
                return parseFloat(timeStr);
            }
        } catch (error) {
            console.warn('Error parsing subtitle time:', timeStr, error);
            return 0;
        }
    };

    // Calculate subtitle duration and loop boundaries
    // Note: item.videoTimestamp is already episode-relative from the spot check generation
    const subtitleStartTime = parseSubtitleTime(item.subtitle.subtitleStart);
    const subtitleEndTime = parseSubtitleTime(item.subtitle.subtitleEnd);
    const subtitleDuration = subtitleEndTime - subtitleStartTime;
    
    // Add some padding before and after the subtitle for context
    const PADDING_SECONDS = 1.0;
    const loopStart = Math.max(0, item.videoTimestamp - PADDING_SECONDS);
    const loopEnd = Math.min(25, item.videoTimestamp + subtitleDuration + PADDING_SECONDS); // 25s is max video length

    // Load video URL when component mounts
    useEffect(() => {
        const loadVideo = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Find the actual video file in the files array - EXACTLY like the file browser does
                const targetRelativePath = `${item.episodePath}/${item.videoFile}`;
                console.log(`🔍 Searching for video file with relativePath: "${targetRelativePath}"`);
                console.log(`📁 Episode path: "${item.episodePath}", Video file: "${item.videoFile}"`);
                
                const videoFileItem = files.find(f => 
                    f.relativePath === targetRelativePath && 
                    f.extension === 'mp4'
                );
                
                if (!videoFileItem) {
                    console.error('❌ Video file not found in files array');
                    console.error('Looking for relativePath:', `"${targetRelativePath}"`);
                    console.error('Available files in episode:', files.filter(f => 
                        f.relativePath?.startsWith(item.episodePath + '/')
                    ).map(f => ({ name: f.name, relativePath: f.relativePath, key: f.key, extension: f.extension })));
                    console.error('All video files:', files.filter(f => f.extension === 'mp4').map(f => ({ name: f.name, relativePath: f.relativePath, key: f.key })));
                    throw new Error(`Video file ${item.videoFile} not found in ${item.episodePath}`);
                }
                
                console.log(`\n🎥 VIDEO LOADING FOR SAMPLE #${index + 1}:`);
                console.log(`   Subtitle: "${item.subtitle.subtitleText.substring(0, 50)}..."`);
                console.log(`   Season: ${item.subtitle.season}, Episode: ${item.subtitle.episode}`);
                console.log(`   Episode path: ${item.episodePath}`);
                console.log(`   Video file: ${item.videoFile}`);
                console.log(`   Target relativePath: ${targetRelativePath}`);
                console.log(`   Found video file:`, videoFileItem);
                console.log(`   File key: ${videoFileItem.key}`);
                console.log(`   Video timestamp: ${item.videoTimestamp.toFixed(2)}s`);
                console.log(`   Loop range: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s (subtitle duration: ${subtitleDuration.toFixed(2)}s)`);
                
                // Use EXACTLY the same method as the existing file browser loadFileContent function
                const url = await Storage.get(videoFileItem.key, {
                    level: 'public',
                    expires: 3600
                });
                
                console.log(`✅ Video URL generated:`, url);
                setVideoUrl(url);
            } catch (err) {
                console.error('❌ Error loading video:', err);
                console.error('Video path attempted:', `${item.episodePath}/${item.videoFile}`);
                setError(`Failed to load video: ${item.videoFile} (${err instanceof Error ? err.message : 'Unknown error'})`);
            } finally {
                setLoading(false);
            }
        };
        
        loadVideo();
    }, [item, fullPath, files, loopStart, loopEnd, subtitleDuration]);

    // Set video to correct timestamp and start looping when loaded
    const handleVideoLoaded = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = loopStart;
            // videoRef.current.play().catch(err => {
            //     console.warn('Autoplay failed:', err);
            // });
            console.log(`⏰ Set video ${item.videoFile} to loop start: ${loopStart.toFixed(2)}s`);
        }
    };

    // Handle time updates to create looping effect
    const handleTimeUpdate = () => {
        if (videoRef.current && videoRef.current.currentTime >= loopEnd) {
            videoRef.current.currentTime = loopStart;
            console.log(`🔄 Looping video back to ${loopStart.toFixed(2)}s`);
        }
    };

    if (loading) {
        return (
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={20} />
                        <Typography>Loading video {item.videoFile}...</Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Alert severity="error">
                        <Typography variant="subtitle2" gutterBottom>
                            Sample #{index + 1} - Video Loading Failed
                        </Typography>
                        <Typography variant="body2">
                            {error}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Expected path: {fullPath}/{item.episodePath}/{item.videoFile}
                        </Typography>
                        <Paper sx={{ p: 1, mt: 1, backgroundColor: 'background.default' }}>
                            <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                Subtitle: "{item.subtitle.subtitleText}"
                            </Typography>
                        </Paper>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                Sample #{index + 1} - Video: {item.videoFile}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Timestamp: {item.videoTimestamp.toFixed(2)}s | 
                                Start: {item.subtitle.subtitleStart} | 
                                End: {item.subtitle.subtitleEnd}
                            </Typography>
                            
                            {/* Context Subtitles */}
                            <Box sx={{ mb: 2 }}>
                                {/* Before subtitles */}
                                {item.contextSubtitles?.before.map((beforeSub, idx) => (
                                    <Paper key={`before-${idx}`} sx={{ p: 1, mb: 0.5, backgroundColor: 'action.hover', opacity: 0.7 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {beforeSub.subtitleStart} - {beforeSub.subtitleEnd}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                            "{beforeSub.subtitleText}"
                                        </Typography>
                                    </Paper>
                                ))}
                                
                                {/* Current subtitle - highlighted */}
                                <Paper sx={{ p: 2, backgroundColor: 'primary.light', border: 2, borderColor: 'primary.main' }}>
                                    <Typography variant="caption" color="primary.contrastText" sx={{ fontWeight: 'bold' }}>
                                        TARGET: {item.subtitle.subtitleStart} - {item.subtitle.subtitleEnd}
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'primary.contrastText', fontWeight: 'bold' }}>
                                        "{item.subtitle.subtitleText}"
                                    </Typography>
                                </Paper>
                                
                                {/* After subtitles */}
                                {item.contextSubtitles?.after.map((afterSub, idx) => (
                                    <Paper key={`after-${idx}`} sx={{ p: 1, mt: 0.5, backgroundColor: 'action.hover', opacity: 0.7 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {afterSub.subtitleStart} - {afterSub.subtitleEnd}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                            "{afterSub.subtitleText}"
                                        </Typography>
                                    </Paper>
                                ))}
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Video Preview
                            </Typography>
                                            <VideoPlayer
                                                ref={videoRef}
                                                key={`${item.episodePath}-${item.videoFile}-${index}`}
                                                controls
                                                muted
                                                onLoadedData={handleVideoLoaded}
                                                onTimeUpdate={handleTimeUpdate}
                                                style={{ width: '100%', maxHeight: '200px' }}
                                            >
                                                <source src={videoUrl} type="video/mp4" />
                                                Your browser does not support the video tag.
                                            </VideoPlayer>
                                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                Looping: {loopStart.toFixed(2)}s - {loopEnd.toFixed(2)}s 
                                                (Subtitle at {item.videoTimestamp.toFixed(2)}s)
                                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

const CsvViewer: React.FC<{ 
    content: string; 
    filename: string; 
    onSave: (content: string) => void;
    base64Columns?: string[];
    onUnsavedChanges?: (hasChanges: boolean) => void;
}> = ({ content, filename, onSave, base64Columns = [], onUnsavedChanges }) => {
    const [csvLines, setCsvLines] = useState<string[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [visibleRowIndices, setVisibleRowIndices] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [editingDecodedData, setEditingDecodedData] = useState<string[]>([]);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const ROWS_PER_PAGE = 20; // Reduce to 20 rows for better performance
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper function to parse a single CSV line on-demand
    const parseCsvLine = useCallback((line: string): string[] => {
        return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    }, []);

    // Memoized helper function to get parsed row data for specific line indices
    const getParsedRows = useMemo(() => {
        return (lineIndices: number[]): string[][] => {
            return lineIndices.map(index => {
                if (index === 0) return headers; // Header row
                return parseCsvLine(csvLines[index] || '');
            });
        };
    }, [csvLines, headers, parseCsvLine]);

    
    useEffect(() => {
        try {
            const allLines = content.split('\n');
            const nonEmptyLines = allLines.filter(line => line.trim().length > 0);
            
            setCsvLines(allLines);
            setTotalRows(nonEmptyLines.length - 1); // Subtract header row
            
            // Parse only the header row initially
            if (nonEmptyLines.length > 0) {
                const headerRow = parseCsvLine(nonEmptyLines[0]);
                setHeaders(headerRow);
            }
            
            // Show first page of data
            setCurrentPage(0);
            const startIdx = 1; // Skip header
            const endIdx = Math.min(startIdx + ROWS_PER_PAGE, nonEmptyLines.length);
            const initialIndices = [0]; // Always include header
            for (let i = startIdx; i < endIdx; i++) {
                initialIndices.push(i);
            }
            setVisibleRowIndices(initialIndices);
            
            setError(null);
        } catch (err) {
            setError('Error parsing CSV');
        }
    }, [content, parseCsvLine, ROWS_PER_PAGE]);

    // Search effect - only searches visible rows for performance
    useEffect(() => {
        if (!debouncedSearchTerm.trim()) {
            // Show current page without search
            const startIdx = 1 + (currentPage * ROWS_PER_PAGE); // Skip header
            const endIdx = Math.min(startIdx + ROWS_PER_PAGE, totalRows + 1);
            const pageIndices = [0]; // Always include header
            for (let i = startIdx; i < endIdx; i++) {
                pageIndices.push(i);
            }
            setVisibleRowIndices(pageIndices);
            return;
        }

        // For search, we'll need to check more rows, but still limit for performance
        const maxSearchRows = 500; // Limit search to first 500 rows for performance
        const searchIndices = [0]; // Always include header
        let foundCount = 0;
        
        // Use normalized query for tolerant matching in the CSV viewer too
        const normalizedCsvQuery = normalizeForSearch(debouncedSearchTerm);

        for (let i = 1; i < Math.min(csvLines.length, maxSearchRows) && foundCount < ROWS_PER_PAGE; i++) {
            const line = csvLines[i];
            if (!line || line.trim().length === 0) continue;
            
            const row = parseCsvLine(line);
            const matchFound = row.some((cell, cellIndex) => {
                const columnName = headers[cellIndex];
                const shouldDecode = base64Columns.includes(columnName);
                
                // Search in both original and decoded values using tolerant matching
                const originalMatch = normalizeForSearch(cell).includes(normalizedCsvQuery);
                if (originalMatch) return true;
                
                if (shouldDecode && isBase64(cell)) {
                    const decodedValue = decodeBase64Safe(cell);
                    return normalizeForSearch(decodedValue).includes(normalizedCsvQuery);
                }
                return false;
            });
            
            if (matchFound) {
                searchIndices.push(i);
                foundCount++;
            }
        }
        
        setVisibleRowIndices(searchIndices);
    }, [debouncedSearchTerm, currentPage, totalRows, csvLines, headers, base64Columns, parseCsvLine, ROWS_PER_PAGE]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchTerm(value);
        
        // Debounce the actual search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchTerm(value);
        }, 300); // 300ms debounce
    };

    const handleClearSearch = useCallback(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        setSearchTerm('');
        setDebouncedSearchTerm('');
    }, []);

    // Helper function to find the original CSV line index for a visible row
    const findOriginalLineIndex = (visibleRowIndex: number): number => {
        // The visible row index corresponds to the actual CSV line index
        return visibleRowIndices[visibleRowIndex] || 0;
    };

    const handleEditRow = (visibleRowIndex: number) => {
        const actualLineIndex = findOriginalLineIndex(visibleRowIndex);
        const originalRowData = parseCsvLine(csvLines[actualLineIndex] || '');
        
        // Create decoded version for editing
        const decodedRowData = originalRowData.map((cell, cellIndex) => {
            const columnName = headers[cellIndex];
            const shouldDecode = base64Columns.includes(columnName);
            
            if (shouldDecode && isBase64(cell)) {
                return decodeBase64Safe(cell);
            }
            return cell;
        });
        
        setEditingRowIndex(actualLineIndex); // Store the actual CSV line index
        setEditingDecodedData(decodedRowData);
        onUnsavedChanges?.(true); // Mark as having unsaved changes when editing starts
    };

    const handleCancelRowEdit = () => {
        setEditingRowIndex(null);
        setEditingDecodedData([]);
        onUnsavedChanges?.(false); // Clear unsaved changes when canceling
    };

    const handleSaveRow = () => {
        if (editingRowIndex === null) return;
        
        // Re-encode any base64 columns from the decoded editing data
        const finalRowData = editingDecodedData.map((decodedCell, cellIndex) => {
            const columnName = headers[cellIndex];
            const shouldEncode = base64Columns.includes(columnName);
            
            if (shouldEncode) {
                // Always encode the decoded value back to base64
                return encodeBase64Safe(decodedCell);
            }
            return decodedCell;
        });
        
        // Create the new CSV line
        const newCsvLine = finalRowData.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
        
        // Replace only the specific line in the CSV
        const newLines = [...csvLines];
        newLines[editingRowIndex] = newCsvLine;
        
        // Join back to CSV content
        const newCsvContent = newLines.join('\n');
        
        // Save the updated content
        onSave(newCsvContent);
        
        // Update the local CSV lines for future edits
        setCsvLines(newLines);
        
        setEditingRowIndex(null);
        setEditingDecodedData([]);
        onUnsavedChanges?.(false); // Clear unsaved changes when saving
    };

    const handleCellChange = useCallback((cellIndex: number, value: string) => {
        // Update the decoded data (what the user is actually editing)
        // Use functional update to minimize re-renders
        setEditingDecodedData(prev => {
            // Only update if the value actually changed
            if (prev[cellIndex] === value) return prev;
            
            const newDecodedData = [...prev];
            newDecodedData[cellIndex] = value;
            return newDecodedData;
        });
    }, []);
    
    // Memoize the visible rows calculation to prevent unnecessary re-parsing
    const visibleRowsData = useMemo(() => {
        const rows = getParsedRows(visibleRowIndices);
        return {
            displayHeaders: rows[0] || [],
            displayRows: rows.slice(1),
            filteredRows: rows.length - 1
        };
    }, [visibleRowIndices, getParsedRows]);
    
    const { displayHeaders, displayRows, filteredRows } = visibleRowsData;

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        CSV: {filename}
                    </Typography>
                    <Alert severity="error">{error}</Alert>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardContent>
                <Box sx={{ mb: 2 }}>
                    {/* Title Section */}
                    <Box sx={{ mb: { xs: 2, md: 0 } }}>
                        <Typography variant="h6">
                            CSV: {filename} ({filteredRows} of {totalRows} rows shown)
                        </Typography>
                        {base64Columns.length > 0 && (
                            <Typography variant="caption" display="block" color="text.secondary">
                                Decoding columns: {base64Columns.join(', ')}
                            </Typography>
                        )}
                        {!debouncedSearchTerm && totalRows > ROWS_PER_PAGE && (
                            <Typography variant="caption" display="block" color="text.secondary">
                                Page {currentPage + 1} of {Math.ceil(totalRows / ROWS_PER_PAGE)}
                            </Typography>
                        )}
                    </Box>
                    
                    {/* Search Section - responsive layout */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: { xs: 'stretch', md: 'flex-end' },
                        alignItems: 'center',
                        mt: { xs: 0, md: -6 } // Negative margin on desktop to align with title
                    }}>
                        <TextField
                            size="small"
                            placeholder="Search CSV..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            sx={{ 
                                minWidth: { xs: 'auto', md: 200 },
                                width: { xs: '100%', md: 'auto' }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={handleClearSearch}
                                            edge="end"
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                </Box>
                
                <TableContainer component={Paper} sx={{ 
                    maxHeight: 400,
                    overflowX: 'auto',
                    '& .MuiTable-root': {
                        minWidth: { xs: 'max-content', md: 'auto' }
                    }
                }}>
                    <Table stickyHeader size="small" key={`csv-table-${base64Columns.join('-')}`}>
                        <TableHead>
                            <TableRow>
                                {displayHeaders.map((header, index) => (
                                    <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                                        {header}
                                    </TableCell>
                                ))}
                                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayRows.map((row, rowIndex) => {
                                const actualLineIndex = visibleRowIndices[rowIndex + 1]; // +1 to skip header
                                const isCurrentlyEditing = editingRowIndex === actualLineIndex;
                                const displayRow = isCurrentlyEditing ? editingDecodedData : row;
                                
                                return (
                                    <TableRow key={actualLineIndex} hover>
                                        {displayRow.map((cell, cellIndex) => {
                                            return (
                                                <TableCell key={cellIndex}>
                                                    {isCurrentlyEditing ? (
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            multiline={base64Columns.includes(displayHeaders[cellIndex])}
                                                            rows={base64Columns.includes(displayHeaders[cellIndex]) ? 4 : 1}
                                                            value={cell}
                                                            onChange={(e) => handleCellChange(cellIndex, e.target.value)}
                                                            variant="outlined"
                                                            sx={{ 
                                                                minWidth: base64Columns.includes(displayHeaders[cellIndex]) ? 300 : 100,
                                                                '& .MuiInputBase-root': {
                                                                    fontSize: base64Columns.includes(displayHeaders[cellIndex]) ? '0.875rem' : 'inherit'
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <CsvCellDisplay 
                                                            cell={cell}
                                                            columnName={displayHeaders[cellIndex]}
                                                            base64Columns={base64Columns}
                                                        />
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell>
                                            {isCurrentlyEditing ? (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={handleSaveRow}
                                                        title="Save changes"
                                                    >
                                                        <SaveIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={handleCancelRowEdit}
                                                        title="Cancel editing"
                                                    >
                                                        <CancelIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            ) : (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEditRow(rowIndex + 1)} // +1 to skip header in visibleRowIndices
                                                    title="Edit row"
                                                    disabled={editingRowIndex !== null}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                {displayRows.length === 0 && debouncedSearchTerm && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            No rows match "{debouncedSearchTerm}"
                        </Typography>
                    </Box>
                )}
                
                {/* Pagination Controls */}
                {!debouncedSearchTerm && totalRows > ROWS_PER_PAGE && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 2 }}>
                        <Button
                            size="small"
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            variant="outlined"
                        >
                            Previous
                        </Button>
                        <Typography variant="body2">
                            Page {currentPage + 1} of {Math.ceil(totalRows / ROWS_PER_PAGE)}
                        </Typography>
                        <Button
                            size="small"
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalRows / ROWS_PER_PAGE) - 1, prev + 1))}
                            disabled={currentPage >= Math.ceil(totalRows / ROWS_PER_PAGE) - 1}
                            variant="outlined"
                        >
                            Next
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

const FileBrowser: React.FC<FileBrowserProps> = ({ pathPrefix, id, files: providedFiles, base64Columns = [], srcEditor = false, onEpisodeSelectionChange, refreshKey }) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [fileUrl, setFileUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingContent, setLoadingContent] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string[]>([]);
    const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
    const [pendingSaveContent, setPendingSaveContent] = useState<string>('');
    const [discardChangesDialogOpen, setDiscardChangesDialogOpen] = useState<boolean>(false);
    const [pendingFileSelection, setPendingFileSelection] = useState<FileItem | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [dataSummaryDialogOpen, setDataSummaryDialogOpen] = useState<boolean>(false);
    const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
    const [loadingDataSummary, setLoadingDataSummary] = useState<boolean>(false);
    const [spotCheckDialogOpen, setSpotCheckDialogOpen] = useState<boolean>(false);
    const [spotCheckData, setSpotCheckData] = useState<SpotCheckData | null>(null);
    const [loadingSpotCheck, setLoadingSpotCheck] = useState<boolean>(false);
    const [spotCheckTab, setSpotCheckTab] = useState<number>(0); // 0 = Random Samples, 1 = Manual Search
    const [manualSearchQuery, setManualSearchQuery] = useState<string>('');
    const [manualSearchResults, setManualSearchResults] = useState<SpotCheckData | null>(null);
    const [loadingManualSearch, setLoadingManualSearch] = useState<boolean>(false);
    const [episodeSelectionDialogOpen, setEpisodeSelectionDialogOpen] = useState<boolean>(false);
    const [selectedEpisodes, setSelectedEpisodes] = useState<{ season: number; episode: number }[]>([]);
    const [availableSeasons, setAvailableSeasons] = useState<{ [season: number]: number[] }>({});

    const fullPath = `${pathPrefix}/${id}`;

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('Listing files from S3 bucket root path:', fullPath);
            
            // List files from S3 using pagination to retrieve all results
            const aggregatedResults: any[] = [];
            let nextToken: string | undefined = undefined;
            do {
                const page: any = await Storage.list(fullPath, {
                    level: 'public',
                    pageSize: 1000,
                    nextToken
                });
                const pageArray = (page?.results || page || []) as any[];
                aggregatedResults.push(...pageArray);
                nextToken = (page as any)?.nextToken as string | undefined;
            } while (nextToken);

            console.log('Storage.list aggregated results count:', aggregatedResults.length);

            const resultArray = aggregatedResults as any[];
            
            const fileItems: FileItem[] = resultArray.map((item: any) => {
                const key = item.key || '';
                // console.log('Processing file key:', key);
                
                // Extract just the relative path part for the file name and tree building
                // The key from Storage.list() should be like "src-extracted/airplane/file.mp4"
                // We want to remove the fullPath prefix to get just the relative part
                const relativePath = key.startsWith(fullPath + '/') 
                    ? key.substring(fullPath.length + 1) 
                    : key.replace(fullPath, '').replace(/^\//, '');
                const name = relativePath.split('/').pop() || relativePath;
                
                // console.log('Relative path:', relativePath, 'Name:', name);
                
                return {
                    key, // Keep the full key for Storage.get() calls
                    lastModified: item.lastModified || new Date().toISOString(),
                    size: item.size || 0,
                    isDirectory: key.endsWith('/'),
                    name,
                    extension: getFileExtension(name),
                    relativePath, // Add relative path for tree building
                };
            }).filter(item => item.key !== fullPath && item.key.length > fullPath.length); // Remove the root directory itself
            
            console.log('Final file items:', fileItems);
            
            setFiles(fileItems);
            setFileTree(buildFileTree(fileItems, fullPath));
        } catch (err) {
            console.error('Error loading files:', err);
            setError('Failed to load files from S3');
        } finally {
            setLoading(false);
        }
    }, [fullPath]);

    // Function to parse folder structure and extract seasons/episodes
    const parseSeasonEpisodeStructure = useCallback(() => {
        const seasons: { [season: number]: number[] } = {};
        
        files.forEach(file => {
            if (file.isDirectory) return; // Skip directories, we'll infer structure from file paths
            
            const pathParts = (file.relativePath || '').split('/').filter(part => part.length > 0);
            
            if (pathParts.length >= 2) {
                // Check if first part is a season number
                const seasonMatch = pathParts[0].match(/^(\d+)$/);
                // Check if second part is an episode number
                const episodeMatch = pathParts[1].match(/^(\d+)$/);
                
                if (seasonMatch && episodeMatch) {
                    const seasonNum = parseInt(seasonMatch[1], 10);
                    const episodeNum = parseInt(episodeMatch[1], 10);
                    
                    if (!seasons[seasonNum]) {
                        seasons[seasonNum] = [];
                    }
                    
                    if (!seasons[seasonNum].includes(episodeNum)) {
                        seasons[seasonNum].push(episodeNum);
                    }
                }
            }
        });
        
        // Sort episodes within each season
        Object.keys(seasons).forEach(seasonKey => {
            const seasonNum = parseInt(seasonKey, 10);
            seasons[seasonNum].sort((a, b) => a - b);
        });
        
        setAvailableSeasons(seasons);
    }, [files]);

    const loadFileContent = useCallback(async (file: FileItem) => {
        if (file.isDirectory) return;
        
        try {
            setLoadingContent(true);
            const extension = file.extension || '';
            
            console.log('Loading file content for:', file.key);
            
            if (['mp4', 'mov'].includes(extension)) {
                // For videos, get signed URL from bucket root using custom prefix
                const url = await Storage.get(file.key, {
                    level: 'public',
                    expires: 3600
                });
                console.log('Video URL:', url);
                setFileUrl(url);
                setFileContent('');
            } else if (['json', 'csv'].includes(extension)) {
                // For text files, download content from bucket root using custom prefix
                const result = await Storage.get(file.key, {
                    level: 'public',
                    download: true
                });
                
                console.log('Download result:', result);
                
                if (result) {
                    if (typeof result === 'object' && result !== null && 'Body' in (result as any)) {
                        const text = await (result as any).Body.text();
                        setFileContent(text);
                        setFileUrl('');
                    } else if (typeof result === 'string') {
                        setFileContent(result);
                        setFileUrl('');
                    }
                }
            }
        } catch (err) {
            console.error('Error loading file content:', err);
            setError(`Failed to load file: ${file.name}`);
        } finally {
            setLoadingContent(false);
        }
    }, []);

    useEffect(() => {
        loadFiles();
    }, [loadFiles, refreshKey]);

    useEffect(() => {
        if (selectedFile) {
            loadFileContent(selectedFile);
        }
    }, [selectedFile, loadFileContent]);

    // Parse season/episode structure when files change
    useEffect(() => {
        if (files.length > 0) {
            parseSeasonEpisodeStructure();
        }
    }, [files, parseSeasonEpisodeStructure]);

    const handleFileSelect = (file: FileItem) => {
        if (file.isDirectory) return;
        
        // If there are unsaved changes, show confirmation dialog
        if (hasUnsavedChanges) {
            setPendingFileSelection(file);
            setDiscardChangesDialogOpen(true);
            return;
        }
        
        // No unsaved changes, proceed with file selection
        setSelectedFile(file);
        setError(null);
        setHasUnsavedChanges(false);
    };

    const handleNodeToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
        setExpanded(nodeIds);
    };

    const handleFileSave = (content: string) => {
        setPendingSaveContent(content);
        setSaveDialogOpen(true);
    };

    const handleSaveConfirm = async () => {
        if (!selectedFile || !pendingSaveContent) return;
        
        try {
            setLoadingContent(true);
            
            // Upload the new content to S3
            await Storage.put(selectedFile.key, pendingSaveContent, {
                level: 'public',
                contentType: selectedFile.extension === 'json' ? 'application/json' : 'text/csv'
            });
            
            // Update the local file content
            setFileContent(pendingSaveContent);
            
            setSaveDialogOpen(false);
            setPendingSaveContent('');
            setError(null);
        } catch (err) {
            console.error('Error saving file:', err);
            setError(`Failed to save file: ${selectedFile.name}`);
        } finally {
            setLoadingContent(false);
        }
    };

    const handleSaveCancel = () => {
        setSaveDialogOpen(false);
        setPendingSaveContent('');
    };

    const handleDiscardChanges = () => {
        if (pendingFileSelection) {
            setSelectedFile(pendingFileSelection);
            setError(null);
        }
        setHasUnsavedChanges(false);
        setDiscardChangesDialogOpen(false);
        setPendingFileSelection(null);
    };

    const handleKeepEditing = () => {
        setDiscardChangesDialogOpen(false);
        setPendingFileSelection(null);
    };

    // Episode selection handlers
    const handleOpenEpisodeSelection = () => {
        setEpisodeSelectionDialogOpen(true);
    };

    const handleCloseEpisodeSelection = () => {
        setEpisodeSelectionDialogOpen(false);
    };

    const handleEpisodeToggle = (season: number, episode: number) => {
        const episodeKey = { season, episode };
        const isSelected = selectedEpisodes.some(ep => ep.season === season && ep.episode === episode);
        
        if (isSelected) {
            // Remove episode
            const newSelection = selectedEpisodes.filter(ep => !(ep.season === season && ep.episode === episode));
            setSelectedEpisodes(newSelection);
            if (onEpisodeSelectionChange) {
                onEpisodeSelectionChange(newSelection);
            }
        } else {
            // Add episode
            const newSelection = [...selectedEpisodes, episodeKey];
            setSelectedEpisodes(newSelection);
            if (onEpisodeSelectionChange) {
                onEpisodeSelectionChange(newSelection);
            }
        }
    };

    const handleSeasonToggle = (season: number) => {
        const episodes = availableSeasons[season] || [];
        const seasonEpisodes = episodes.map(ep => ({ season, episode: ep }));
        
        // Check if all episodes in this season are selected
        const allSelected = seasonEpisodes.every(ep => 
            selectedEpisodes.some(selected => selected.season === ep.season && selected.episode === ep.episode)
        );
        
        let newSelection: { season: number; episode: number }[];
        
        if (allSelected) {
            // Unselect all episodes in this season
            newSelection = selectedEpisodes.filter(ep => ep.season !== season);
        } else {
            // Select all episodes in this season
            const otherSeasonEpisodes = selectedEpisodes.filter(ep => ep.season !== season);
            newSelection = [...otherSeasonEpisodes, ...seasonEpisodes];
        }
        
        setSelectedEpisodes(newSelection);
        if (onEpisodeSelectionChange) {
            onEpisodeSelectionChange(newSelection);
        }
    };

    // Helper function to parse CSV content and count subtitles
    const parseCSVSubtitleCount = (csvContent: string): number => {
        try {
            const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
            return Math.max(0, lines.length - 1); // Subtract header row
        } catch (error) {
            console.warn('Error parsing CSV content:', error);
            return 0;
        }
    };

    // Helper function to parse CSV content and extract subtitle entries for comparison
    const parseCSVSubtitleEntries = (csvContent: string): Set<string> => {
        try {
            const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
            const entries = new Set<string>();
            
            // Skip header row (index 0)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    // Parse CSV line to get individual fields
                    const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
                    
                    // Create a unique identifier for this subtitle entry
                    // Expected format: season, episode, subtitle_index, subtitle_text, subtitle_start, subtitle_end
                    if (fields.length >= 6) {
                        const season = fields[0];
                        const episode = fields[1];
                        const subtitleIndex = fields[2];
                        const subtitleText = fields[3];
                        const subtitleStart = fields[4];
                        const subtitleEnd = fields[5];
                        
                        // Create a unique key for this subtitle entry
                        const entryKey = `${season}|${episode}|${subtitleIndex}|${subtitleText}|${subtitleStart}|${subtitleEnd}`;
                        entries.add(entryKey);
                    }
                }
            }
            
            return entries;
        } catch (error) {
            console.warn('Error parsing CSV entries:', error);
            return new Set();
        }
    };

    // Function to analyze data structure and generate summary
    const analyzeDataStructure = useCallback(async (): Promise<DataSummary> => {
        const summary: DataSummary = {
            seriesName: id,
            totalSubtitles: 0,
            seasons: {},
            issues: []
        };

        try {
            // Group files by structure (season/episode)
            const seasonFolders = new Set<string>();
            const episodeFolders: { [season: string]: Set<string> } = {};
            const csvFiles: { [path: string]: FileItem } = {};
            const videoFiles: { [path: string]: FileItem[] } = {};
            
            // Store CSV content for subset validation
            const csvContents: { [path: string]: string } = {};
            let seriesCSVContent: string | null = null;

            files.forEach(file => {
                const pathParts = (file.relativePath || '').split('/').filter(p => p.length > 0);
                
                if (pathParts.length >= 1) {
                    // Check if first part is a season number
                    const seasonMatch = pathParts[0].match(/^(\d+)$/);
                    if (seasonMatch) {
                        const seasonNumber = seasonMatch[1];
                        seasonFolders.add(seasonNumber);
                        
                        if (!episodeFolders[seasonNumber]) {
                            episodeFolders[seasonNumber] = new Set();
                        }
                        
                        if (pathParts.length >= 2) {
                            // Check if second part is an episode number
                            const episodeMatch = pathParts[1].match(/^(\d+)$/);
                            if (episodeMatch) {
                                const episodeNumber = episodeMatch[1];
                                episodeFolders[seasonNumber].add(episodeNumber);
                                
                                // Track video files in episodes
                                if (file.extension === 'mp4') {
                                    const episodePath = `${seasonNumber}/${episodeNumber}`;
                                    if (!videoFiles[episodePath]) {
                                        videoFiles[episodePath] = [];
                                    }
                                    videoFiles[episodePath].push(file);
                                }
                            }
                        }
                        
                        // Track CSV files
                        if (file.name === '_docs.csv') {
                            const csvPath = pathParts.join('/');
                            csvFiles[csvPath] = file;
                        }
                    }
                }
            });

            // Analyze each season
            for (const seasonNumber of Array.from(seasonFolders).sort((a, b) => parseInt(a) - parseInt(b))) {
                const seasonData = {
                    folderExists: true, // We found files in this season, so folder exists
                    docsExists: false,
                    subtitleCount: 0,
                    episodes: {} as { [episodeNumber: string]: any }
                };

                // Check for season-level _docs.csv
                const seasonDocsPath = `${seasonNumber}/_docs.csv`;
                if (csvFiles[seasonDocsPath]) {
                    seasonData.docsExists = true;
                    
                    // Load and parse the CSV to count subtitles
                    try {
                        const csvFile = csvFiles[seasonDocsPath];
                        const result = await Storage.get(csvFile.key, {
                            level: 'public',
                            download: true
                        });
                        
                        if (result && typeof result === 'object' && result !== null && 'Body' in (result as any)) {
                            const csvContent = await (result as any).Body.text();
                            seasonData.subtitleCount = parseCSVSubtitleCount(csvContent);
                            summary.totalSubtitles += seasonData.subtitleCount;
                            
                            // Store CSV content for subset validation
                            csvContents[seasonDocsPath] = csvContent;
                        }
                    } catch (error) {
                        console.warn(`Error loading season ${seasonNumber} _docs.csv:`, error);
                        summary.issues.push(`Could not load season ${seasonNumber} _docs.csv`);
                    }
                } else {
                    summary.issues.push(`Missing _docs.csv in season ${seasonNumber}`);
                }

                // Analyze episodes in this season
                const episodes = episodeFolders[seasonNumber] || new Set();
                for (const episodeNumber of Array.from(episodes).sort((a, b) => parseInt(a) - parseInt(b))) {
                    const episodeData = {
                        folderExists: true, // We found files in this episode, so folder exists
                        docsExists: false,
                        subtitleCount: 0,
                        videoFileCount: 0
                    };

                    // Check for episode-level _docs.csv
                    const episodeDocsPath = `${seasonNumber}/${episodeNumber}/_docs.csv`;
                    if (csvFiles[episodeDocsPath]) {
                        episodeData.docsExists = true;
                        
                        // Load and parse the CSV to count subtitles
                        try {
                            const csvFile = csvFiles[episodeDocsPath];
                            const result = await Storage.get(csvFile.key, {
                                level: 'public',
                                download: true
                            });
                            
                            if (result && typeof result === 'object' && result !== null && 'Body' in (result as any)) {
                                const csvContent = await (result as any).Body.text();
                                episodeData.subtitleCount = parseCSVSubtitleCount(csvContent);
                                
                                // Store CSV content for subset validation
                                csvContents[episodeDocsPath] = csvContent;
                            }
                        } catch (error) {
                            console.warn(`Error loading episode ${seasonNumber}/${episodeNumber} _docs.csv:`, error);
                            summary.issues.push(`Could not load episode ${seasonNumber}/${episodeNumber} _docs.csv`);
                        }
                    } else {
                        summary.issues.push(`Missing _docs.csv in season ${seasonNumber}, episode ${episodeNumber}`);
                    }

                    // Count video files in this episode
                    const episodePath = `${seasonNumber}/${episodeNumber}`;
                    episodeData.videoFileCount = videoFiles[episodePath]?.length || 0;
                    
                    if (episodeData.videoFileCount === 0) {
                        summary.issues.push(`No video files found in season ${seasonNumber}, episode ${episodeNumber}`);
                    }

                    seasonData.episodes[episodeNumber] = episodeData;
                }

                // Check if season has episodes
                if (Object.keys(seasonData.episodes).length === 0) {
                    summary.issues.push(`Season ${seasonNumber} has no episodes`);
                }

                summary.seasons[seasonNumber] = seasonData;
            }

            // Check for series-level _docs.csv
            const seriesDocsFile = files.find(f => f.name === '_docs.csv' && !f.relativePath?.includes('/'));
            if (!seriesDocsFile) {
                summary.issues.push('Missing series-level _docs.csv');
            } else {
                try {
                    const result = await Storage.get(seriesDocsFile.key, {
                        level: 'public',
                        download: true
                    });
                    
                    if (result && typeof result === 'object' && result !== null && 'Body' in (result as any)) {
                        const csvContent = await (result as any).Body.text();
                        seriesCSVContent = csvContent;
                        const seriesSubtitleCount = parseCSVSubtitleCount(csvContent);
                        
                        // Verify that series total matches sum of season totals
                        const calculatedTotal = Object.values(summary.seasons).reduce((sum, season) => sum + season.subtitleCount, 0);
                        if (seriesSubtitleCount !== calculatedTotal) {
                            summary.issues.push(`Series _docs.csv count (${seriesSubtitleCount}) doesn't match sum of season counts (${calculatedTotal})`);
                        }
                    }
                } catch (error) {
                    console.warn('Error loading series _docs.csv:', error);
                    summary.issues.push('Could not load series _docs.csv');
                }
            }

            // Perform subset validation if we have the series CSV content
            if (seriesCSVContent) {
                console.log('🔍 Performing subset validation...');
                const seriesEntries = parseCSVSubtitleEntries(seriesCSVContent);
                console.log(`📊 Series CSV contains ${seriesEntries.size} unique subtitle entries`);

                // Track validation results
                let totalCSVsValidated = 0;
                let validCSVs = 0;
                const initialIssueCount = summary.issues.length;

                // Validate season CSVs are subsets of series CSV
                for (const [seasonPath, seasonContent] of Object.entries(csvContents)) {
                    const pathParts = seasonPath.split('/');
                    if (pathParts.length === 2) { // Season-level CSV (e.g., "1/_docs.csv")
                        const seasonNumber = pathParts[0];
                        const seasonEntries = parseCSVSubtitleEntries(seasonContent);
                        console.log(`📊 Season ${seasonNumber} CSV contains ${seasonEntries.size} unique subtitle entries`);

                        // Check if all season entries exist in series
                        const invalidEntries: string[] = [];
                        for (const entry of seasonEntries) {
                            if (!seriesEntries.has(entry)) {
                                invalidEntries.push(entry);
                            }
                        }

                        totalCSVsValidated++;
                        if (invalidEntries.length > 0) {
                            summary.issues.push(`Season ${seasonNumber} CSV contains ${invalidEntries.length} entries not found in series CSV`);
                            console.warn(`❌ Season ${seasonNumber} has ${invalidEntries.length} invalid entries:`, invalidEntries.slice(0, 3));
                        } else {
                            validCSVs++;
                            console.log(`✅ Season ${seasonNumber} CSV is a valid subset of series CSV`);
                        }
                    }
                }

                // Validate episode CSVs are subsets of series CSV
                for (const [episodePath, episodeContent] of Object.entries(csvContents)) {
                    const pathParts = episodePath.split('/');
                    if (pathParts.length === 3) { // Episode-level CSV (e.g., "1/2/_docs.csv")
                        const seasonNumber = pathParts[0];
                        const episodeNumber = pathParts[1];
                        const episodeEntries = parseCSVSubtitleEntries(episodeContent);
                        console.log(`📊 Season ${seasonNumber}, Episode ${episodeNumber} CSV contains ${episodeEntries.size} unique subtitle entries`);

                        // Check if all episode entries exist in series
                        const invalidEntries: string[] = [];
                        for (const entry of episodeEntries) {
                            if (!seriesEntries.has(entry)) {
                                invalidEntries.push(entry);
                            }
                        }

                        totalCSVsValidated++;
                        if (invalidEntries.length > 0) {
                            summary.issues.push(`Season ${seasonNumber}, Episode ${episodeNumber} CSV contains ${invalidEntries.length} entries not found in series CSV`);
                            console.warn(`❌ Season ${seasonNumber}, Episode ${episodeNumber} has ${invalidEntries.length} invalid entries:`, invalidEntries.slice(0, 3));
                        } else {
                            validCSVs++;
                            console.log(`✅ Season ${seasonNumber}, Episode ${episodeNumber} CSV is a valid subset of series CSV`);
                        }

                        // Also validate episode CSV is subset of its season CSV (if season CSV exists)
                        const seasonPath = `${seasonNumber}/_docs.csv`;
                        if (csvContents[seasonPath]) {
                            const seasonEntries = parseCSVSubtitleEntries(csvContents[seasonPath]);
                            const invalidSeasonEntries: string[] = [];
                            
                            for (const entry of episodeEntries) {
                                if (!seasonEntries.has(entry)) {
                                    invalidSeasonEntries.push(entry);
                                }
                            }

                            if (invalidSeasonEntries.length > 0) {
                                summary.issues.push(`Season ${seasonNumber}, Episode ${episodeNumber} CSV contains ${invalidSeasonEntries.length} entries not found in season ${seasonNumber} CSV`);
                                console.warn(`❌ Episode ${seasonNumber}/${episodeNumber} has ${invalidSeasonEntries.length} entries not in season CSV:`, invalidSeasonEntries.slice(0, 3));
                            } else {
                                console.log(`✅ Season ${seasonNumber}, Episode ${episodeNumber} CSV is a valid subset of season ${seasonNumber} CSV`);
                            }
                        }
                    }
                }

                // Add success message if all CSVs passed validation
                const subsetIssuesFound = summary.issues.length - initialIssueCount;
                if (totalCSVsValidated > 0 && subsetIssuesFound === 0) {
                    // Insert success message at the beginning of issues array (so it appears first)
                    summary.issues.splice(initialIssueCount, 0, `✅ All ${totalCSVsValidated} CSV files are valid subsets of the series CSV`);
                    console.log(`🎉 SUCCESS: All ${totalCSVsValidated} CSV files passed subset validation!`);
                } else if (totalCSVsValidated > 0) {
                    console.log(`📊 Validation Summary: ${validCSVs}/${totalCSVsValidated} CSV files passed subset validation`);
                }

                console.log(`🏁 Subset validation complete. Found ${subsetIssuesFound} subset validation issues.`);
            } else {
                summary.issues.push('Cannot perform subset validation - series _docs.csv not available');
            }

            return summary;
        } catch (error) {
            console.error('Error analyzing data structure:', error);
            summary.issues.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return summary;
        }
    }, [files, id]);

    const handleViewDataSummary = async () => {
        setLoadingDataSummary(true);
        try {
            const summary = await analyzeDataStructure();
            setDataSummary(summary);
            setDataSummaryDialogOpen(true);
        } catch (error) {
            console.error('Error generating data summary:', error);
            setError('Failed to generate data summary');
        } finally {
            setLoadingDataSummary(false);
        }
    };

    // Helper function to parse subtitle timing (assumes format like "00:01:23.456" or seconds)
    const parseSubtitleTime = (timeStr: string): number => {
        try {
            // Handle different time formats
            if (timeStr.includes(':')) {
                // Format: HH:MM:SS.mmm or MM:SS.mmm
                const parts = timeStr.split(':');
                let seconds = 0;
                
                if (parts.length === 3) {
                    // HH:MM:SS.mmm
                    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
                } else if (parts.length === 2) {
                    // MM:SS.mmm
                    seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                }
                
                return seconds;
            } else {
                // Assume it's already in seconds
                return parseFloat(timeStr);
            }
        } catch (error) {
            console.warn('Error parsing subtitle time:', timeStr, error);
            return 0;
        }
    };

    // Function to calculate which video file and timestamp for a given subtitle time
    // const calculateVideoLocation = (subtitleStartTime: number): { videoIndex: number; videoTimestamp: number } => {
    //     const FPS = 10;
    //     const FRAMES_PER_VIDEO = 250; // 25 seconds × 10 fps
        
    //     // Convert time to frame number
    //     const frameNumber = Math.floor(subtitleStartTime * FPS);
        
    //     // Calculate which video contains this frame
    //     const videoIndex = Math.floor(frameNumber / FRAMES_PER_VIDEO);
        
    //     // Calculate timestamp within that video
    //     const frameWithinVideo = frameNumber % FRAMES_PER_VIDEO;
    //     const videoTimestamp = frameWithinVideo / FPS;
        
    //     return { videoIndex, videoTimestamp };
    // };

    // Function to generate spot check data
    const generateSpotCheckData = useCallback(async (): Promise<SpotCheckData> => {
        const spotCheckData: SpotCheckData = {};
        
        try {
            console.log('🎯 Generating spot check data...');
            
            // Find all episode CSV files
            const episodeCsvFiles: { [episodeKey: string]: FileItem } = {};
            
            files.forEach(file => {
                const pathParts = (file.relativePath || '').split('/').filter(p => p.length > 0);
                
                if (pathParts.length === 3 && file.name === '_docs.csv') {
                    // This is an episode CSV (season/episode/_docs.csv)
                    const seasonMatch = pathParts[0].match(/^(\d+)$/);
                    const episodeMatch = pathParts[1].match(/^(\d+)$/);
                    
                    if (seasonMatch && episodeMatch) {
                        const episodeKey = `S${seasonMatch[1]}E${episodeMatch[1]}`;
                        episodeCsvFiles[episodeKey] = file;
                    }
                }
            });

            console.log(`📂 Found ${Object.keys(episodeCsvFiles).length} episode CSV files`);

            // Process each episode
            for (const [episodeKey, csvFile] of Object.entries(episodeCsvFiles)) {
                try {
                    console.log(`\n🔍 PROCESSING ${episodeKey}:`);
                    console.log(`   CSV file: ${csvFile.key}`);
                    console.log(`   CSV relativePath: ${csvFile.relativePath}`);
                    
                    // Load the CSV content
                    const result = await Storage.get(csvFile.key, {
                        level: 'public',
                        download: true
                    });
                    
                    if (result && typeof result === 'object' && result !== null && 'Body' in (result as any)) {
                        const csvContent = await (result as any).Body.text();
                        const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
                        
                        // Parse subtitle entries (skip header)
                        const subtitles: SubtitleEntry[] = [];
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (line) {
                                const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
                                
                                if (fields.length >= 6) {
                                    // Decode subtitle text if it's base64 encoded
                                    let subtitleText = fields[3];
                                    if (isBase64(subtitleText)) {
                                        subtitleText = decodeBase64Safe(subtitleText);
                                    }
                                    
                                    subtitles.push({
                                        season: fields[0],
                                        episode: fields[1],
                                        subtitleIndex: fields[2],
                                        subtitleText: subtitleText,
                                        subtitleStart: fields[4],
                                        subtitleEnd: fields[5]
                                    });
                                }
                            }
                        }
                        
                        console.log(`📝 Found ${subtitles.length} subtitles in ${episodeKey}`);
                        
                        // Select 2 random subtitles
                        const selectedSubtitles: SubtitleEntry[] = [];
                        if (subtitles.length > 0) {
                            const shuffled = [...subtitles].sort(() => 0.5 - Math.random());
                            selectedSubtitles.push(...shuffled.slice(0, Math.min(2, subtitles.length)));
                        }
                        
                        // Create spot check items for selected subtitles
                        const spotCheckItems: SpotCheckItem[] = [];
                        const pathParts = csvFile.relativePath?.split('/') || [];
                        const seasonNumber = pathParts[0];
                        const episodeNumber = pathParts[1];
                        const episodePath = `${seasonNumber}/${episodeNumber}`;
                        
                        console.log(`📁 Episode path construction:`);
                        console.log(`   CSV relativePath: "${csvFile.relativePath}"`);
                        console.log(`   Path parts: [${pathParts.map(p => `"${p}"`).join(', ')}]`);
                        console.log(`   Season: "${seasonNumber}", Episode: "${episodeNumber}"`);
                        console.log(`   Constructed episode path: "${episodePath}"`);
                        
                        // Check what video files exist in this episode
                        const episodeVideoFiles = files.filter(f => 
                            f.relativePath?.startsWith(episodePath + '/') && 
                            f.extension === 'mp4'
                        ).map(f => f.name);
                        console.log(`🎬 Available video files in ${episodePath}:`, episodeVideoFiles);
                        
                        // Calculate episode-relative timing by finding the earliest subtitle time in this episode
                        const episodeStartTime = Math.min(...subtitles.map(s => parseSubtitleTime(s.subtitleStart)));
                        console.log(`📅 Episode ${episodeKey} starts at ${episodeStartTime.toFixed(2)}s (earliest subtitle)`);

                        // Sort subtitles by start time for context extraction
                        const sortedSubtitles = [...subtitles].sort((a, b) => 
                            parseSubtitleTime(a.subtitleStart) - parseSubtitleTime(b.subtitleStart)
                        );

                        for (const subtitle of selectedSubtitles) {
                            const absoluteStartTime = parseSubtitleTime(subtitle.subtitleStart);
                            // Convert to episode-relative time by subtracting the episode start time
                            const episodeRelativeTime = absoluteStartTime - episodeStartTime;
                            
                            // SIMPLE: Use subtitleStart directly as the frame number
                            const startFrame = parseInt(subtitle.subtitleStart);
                            
                            // SIMPLE: Which video file (0-based since files are 0.mp4, 1.mp4, etc.)
                            const videoFileNumber = Math.floor(startFrame / 250);
                            const videoFile = `${videoFileNumber}.mp4`;
                            
                            // SIMPLE: Calculate timestamp within that video
                            const frameWithinVideo = startFrame % 250;
                            const videoTimestamp = frameWithinVideo / 10;
                            
                            console.log(`\n📊 SUBTITLE ANALYSIS:`);
                            console.log(`   Text: "${subtitle.subtitleText.substring(0, 50)}..."`);
                            console.log(`   Season: ${subtitle.season}, Episode: ${subtitle.episode}`);
                            console.log(`   Subtitle Index: "${subtitle.subtitleIndex}" (type: ${typeof subtitle.subtitleIndex})`);
                            console.log(`   Absolute time: ${subtitle.subtitleStart} (${absoluteStartTime.toFixed(2)}s)`);
                            console.log(`   Episode start: ${episodeStartTime.toFixed(2)}s`);
                            console.log(`   Episode relative: ${episodeRelativeTime.toFixed(2)}s`);
                            console.log(`   Start frame: ${startFrame} (from subtitleStart: "${subtitle.subtitleStart}")`);
                            console.log(`   Video file: ⌊${startFrame} / 250⌋ = ${videoFileNumber} → ${videoFile}`);
                            console.log(`   Frame within video: ${startFrame} % 250 = ${frameWithinVideo}`);
                            console.log(`   Timestamp: ${frameWithinVideo} / 10 = ${videoTimestamp.toFixed(1)}s`);
                            console.log(`   Final result: ${videoFile} @ ${videoTimestamp.toFixed(1)}s`);
                            console.log(`   Episode path: ${episodePath}`);
                            
                            // Only add if the video file exists and episode relative time is valid
                            if (episodeRelativeTime >= 0 && episodeVideoFiles.includes(videoFile)) {
                                // Find context subtitles (2 before and 2 after)
                                const currentIndex = sortedSubtitles.findIndex(s => 
                                    s.subtitleIndex === subtitle.subtitleIndex && 
                                    s.subtitleStart === subtitle.subtitleStart
                                );
                                
                                const contextSubtitles = {
                                    before: currentIndex >= 0 ? sortedSubtitles.slice(Math.max(0, currentIndex - 2), currentIndex) : [],
                                    after: currentIndex >= 0 ? sortedSubtitles.slice(currentIndex + 1, currentIndex + 3) : []
                                };

                                spotCheckItems.push({
                                    subtitle,
                                    videoFile,
                                    videoTimestamp,
                                    episodePath,
                                    contextSubtitles
                                });
                                console.log(`✅ Video ${videoFile} exists, added to spot check with ${contextSubtitles.before.length} before + ${contextSubtitles.after.length} after`);
                            } else if (episodeRelativeTime < 0) {
                                console.warn(`⚠️ Episode relative time is negative (${episodeRelativeTime.toFixed(2)}s), skipping subtitle`);
                            } else {
                                console.warn(`⚠️ Video ${videoFile} not found, skipping subtitle`);
                            }
                        }
                        
                        spotCheckData[episodeKey] = spotCheckItems;
                        console.log(`✅ Generated ${spotCheckItems.length} spot check items for ${episodeKey}`);
                    }
                } catch (error) {
                    console.warn(`Error processing ${episodeKey}:`, error);
                }
            }
            
            console.log(`🎉 Spot check data generation complete! ${Object.keys(spotCheckData).length} episodes processed`);
            return spotCheckData;
            
        } catch (error) {
            console.error('Error generating spot check data:', error);
            return {};
        }
    }, [files]);

    const handleSpotCheck = async () => {
        setLoadingSpotCheck(true);
        try {
            const data = await generateSpotCheckData();
            setSpotCheckData(data);
            setSpotCheckDialogOpen(true);
        } catch (error) {
            console.error('Error performing spot check:', error);
            setError('Failed to generate spot check data');
        } finally {
            setLoadingSpotCheck(false);
        }
    };

    // Function to perform manual search for subtitles
    const performManualSearch = useCallback(async (searchQuery: string): Promise<SpotCheckData> => {
        const searchResults: SpotCheckData = {};
        
        if (!searchQuery.trim()) {
            return searchResults;
        }

        try {
            console.log(`🔍 Manual search for: "${searchQuery}" (limiting to 5 results)`);
            const normalizedQuery = normalizeForSearch(searchQuery);
            if (!normalizedQuery) {
                return searchResults;
            }
            
            // Find all episode CSV files
            const episodeCsvFiles: { [episodeKey: string]: FileItem } = {};
            
            files.forEach(file => {
                const pathParts = (file.relativePath || '').split('/').filter(p => p.length > 0);
                
                if (pathParts.length === 3 && file.name === '_docs.csv') {
                    // This is an episode CSV (season/episode/_docs.csv)
                    const seasonMatch = pathParts[0].match(/^(\d+)$/);
                    const episodeMatch = pathParts[1].match(/^(\d+)$/);
                    
                    if (seasonMatch && episodeMatch) {
                        const episodeKey = `S${seasonMatch[1]}E${episodeMatch[1]}`;
                        episodeCsvFiles[episodeKey] = file;
                    }
                }
            });

            let totalResultsFound = 0;
            const maxResults = 5;

            // Process each episode to find matching subtitles
            for (const [episodeKey, csvFile] of Object.entries(episodeCsvFiles)) {
                if (totalResultsFound >= maxResults) {
                    console.log(`🛑 Reached maximum of ${maxResults} results, stopping search`);
                    break;
                }

                try {
                    console.log(`🔍 Searching in ${episodeKey}...`);
                    
                    // Load the CSV content
                    const result = await Storage.get(csvFile.key, {
                        level: 'public',
                        download: true
                    });
                    
                    if (result && typeof result === 'object' && result !== null && 'Body' in (result as any)) {
                        const csvContent = await (result as any).Body.text();
                        const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
                        
                        // Parse subtitle entries and find matches
                        const matchingSubtitles: SubtitleEntry[] = [];
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (line) {
                                const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
                                
                                if (fields.length >= 6) {
                                    // Decode subtitle text if it's base64 encoded
                                    let subtitleText = fields[3];
                                    if (isBase64(subtitleText)) {
                                        subtitleText = decodeBase64Safe(subtitleText);
                                    }
                                    
                                    // Check if normalized subtitle text contains the normalized search query
                                    if (normalizeForSearch(subtitleText).includes(normalizedQuery)) {
                                        matchingSubtitles.push({
                                            season: fields[0],
                                            episode: fields[1],
                                            subtitleIndex: fields[2],
                                            subtitleText: subtitleText,
                                            subtitleStart: fields[4],
                                            subtitleEnd: fields[5]
                                        });
                                    }
                                }
                            }
                        }
                        
                        console.log(`📝 Found ${matchingSubtitles.length} matching subtitles in ${episodeKey}`);
                        
                        // Convert matching subtitles to spot check items
                        if (matchingSubtitles.length > 0) {
                            const spotCheckItems: SpotCheckItem[] = [];
                            const pathParts = csvFile.relativePath?.split('/') || [];
                            const seasonNumber = pathParts[0];
                            const episodeNumber = pathParts[1];
                            const episodePath = `${seasonNumber}/${episodeNumber}`;
                            
                            // Check what video files exist in this episode
                            const episodeVideoFiles = files.filter(f => 
                                f.relativePath?.startsWith(episodePath + '/') && 
                                f.extension === 'mp4'
                            ).map(f => f.name);
                            
                            // Sort all subtitles for context extraction
                            const allSubtitles: SubtitleEntry[] = [];
                            for (let i = 1; i < lines.length; i++) {
                                const line = lines[i].trim();
                                if (line) {
                                    const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
                                    if (fields.length >= 6) {
                                        let subtitleText = fields[3];
                                        if (isBase64(subtitleText)) {
                                            subtitleText = decodeBase64Safe(subtitleText);
                                        }
                                        allSubtitles.push({
                                            season: fields[0],
                                            episode: fields[1],
                                            subtitleIndex: fields[2],
                                            subtitleText: subtitleText,
                                            subtitleStart: fields[4],
                                            subtitleEnd: fields[5]
                                        });
                                    }
                                }
                            }
                            const sortedSubtitles = allSubtitles.sort((a, b) => 
                                parseInt(a.subtitleStart) - parseInt(b.subtitleStart)
                            );

                            for (const subtitle of matchingSubtitles) {
                                if (totalResultsFound >= maxResults) {
                                    break;
                                }

                                // Use subtitleStart directly as the frame number
                                const startFrame = parseInt(subtitle.subtitleStart);
                                
                                // Simple frame-to-video calculation
                                const videoFileNumber = Math.floor(startFrame / 250);
                                const videoFile = `${videoFileNumber}.mp4`;
                                
                                // Calculate timestamp within that video
                                const frameWithinVideo = startFrame % 250;
                                const videoTimestamp = frameWithinVideo / 10;
                                
                                // Only add if the video file exists
                                if (episodeVideoFiles.includes(videoFile)) {
                                    // Find context subtitles (2 before and 2 after)
                                    const currentIndex = sortedSubtitles.findIndex(s => 
                                        s.subtitleStart === subtitle.subtitleStart && 
                                        s.subtitleText === subtitle.subtitleText
                                    );
                                    
                                    const contextSubtitles = {
                                        before: currentIndex >= 0 ? sortedSubtitles.slice(Math.max(0, currentIndex - 2), currentIndex) : [],
                                        after: currentIndex >= 0 ? sortedSubtitles.slice(currentIndex + 1, currentIndex + 3) : []
                                    };

                                    spotCheckItems.push({
                                        subtitle,
                                        videoFile,
                                        videoTimestamp,
                                        episodePath,
                                        contextSubtitles
                                    });
                                    
                                    totalResultsFound++;
                                }
                            }
                            
                            if (spotCheckItems.length > 0) {
                                searchResults[episodeKey] = spotCheckItems;
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Error searching in ${episodeKey}:`, error);
                }
            }
            
            const totalMatches = Object.values(searchResults).reduce((sum, items) => sum + items.length, 0);
            console.log(`🎉 Manual search complete! Found ${totalMatches} matches (limited to ${maxResults}) across ${Object.keys(searchResults).length} episodes`);
            
            return searchResults;
            
        } catch (error) {
            console.error('Error performing manual search:', error);
            return {};
        }
    }, [files]);

    const handleManualSearch = async () => {
        if (!manualSearchQuery.trim()) return;
        
        setLoadingManualSearch(true);
        try {
            const results = await performManualSearch(manualSearchQuery);
            setManualSearchResults(results);
        } catch (error) {
            console.error('Error performing manual search:', error);
            setError('Failed to perform manual search');
        } finally {
            setLoadingManualSearch(false);
        }
    };

    const handleSearchKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleManualSearch();
        }
    };

    const renderTreeItems = (nodes: FileNode[], depth: number = 0): React.ReactElement[] => {
        return nodes.map((node) => (
            <TreeNode
                key={node.id}
                node={node}
                depth={depth}
                expanded={expanded}
                onToggle={handleNodeToggle}
                onFileSelect={handleFileSelect}
                files={files}
            >
                {node.children && node.children.length > 0 && renderTreeItems(node.children, depth + 1)}
            </TreeNode>
        ));
    };

    const renderFileViewer = () => {
        if (!selectedFile) {
            return (
                <Card>
                    <CardContent>
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                            Select a file to view its contents
                        </Typography>
                    </CardContent>
                </Card>
            );
        }

        if (loadingContent) {
            return (
                <Card>
                    <CardContent>
                        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                            <CircularProgress />
                            <Typography variant="body1" sx={{ ml: 2 }}>
                                Loading file...
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            );
        }

        const extension = selectedFile.extension || '';

        switch (extension) {
            case 'mp4':
            case 'mov':
                return <VideoViewer url={fileUrl} filename={selectedFile.name} />;
            case 'json':
                return <JsonFileViewer 
                    content={fileContent} 
                    filename={selectedFile.name} 
                    onSave={handleFileSave} 
                    srcEditor={srcEditor} 
                    selectedFile={selectedFile} 
                    onUnsavedChanges={setHasUnsavedChanges}
                    selectedEpisodes={selectedEpisodes}
                    pathPrefix={pathPrefix}
                    seriesId={id}
                />;
            case 'csv':
                return <CsvViewer 
                    content={fileContent} 
                    filename={selectedFile.name} 
                    onSave={handleFileSave} 
                    base64Columns={base64Columns}
                    onUnsavedChanges={setHasUnsavedChanges}
                />;
            default:
                return (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {selectedFile.name}
                            </Typography>
                            <Alert severity="info">
                                File type not supported for preview. Supported types: .mp4, .mov, .json, .csv
                            </Alert>
                            <Box mt={2}>
                                <Typography variant="body2" color="text.secondary">
                                    Size: {formatFileSize(selectedFile.size)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Modified: {new Date(selectedFile.lastModified).toLocaleString()}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                );
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                    Loading files...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '600px', display: 'flex', flexDirection: 'column', mb: 2 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                    File Browser: {fullPath}
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => loadFiles()}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Save Confirmation Dialog */}
            <Dialog
                open={saveDialogOpen}
                onClose={handleSaveCancel}
                aria-labelledby="save-dialog-title"
                aria-describedby="save-dialog-description"
            >
                <DialogTitle id="save-dialog-title">
                    Confirm Save
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="save-dialog-description">
                        Are you sure you want to save changes to "{selectedFile?.name}"? 
                        This will overwrite the existing file in S3 storage.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSaveCancel} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleSaveConfirm} color="primary" variant="contained" autoFocus>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Discard Changes Confirmation Dialog */}
            <Dialog
                open={discardChangesDialogOpen}
                onClose={handleKeepEditing}
                aria-labelledby="discard-dialog-title"
                aria-describedby="discard-dialog-description"
            >
                <DialogTitle id="discard-dialog-title">
                    Unsaved Changes
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="discard-dialog-description">
                        You have unsaved changes in "{selectedFile?.name}". 
                        Are you sure you want to discard these changes and switch to "{pendingFileSelection?.name}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleKeepEditing} color="primary">
                        Keep Editing
                    </Button>
                    <Button onClick={handleDiscardChanges} color="error" variant="contained" autoFocus>
                        Discard Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Data Summary Dialog */}
            <Dialog
                open={dataSummaryDialogOpen}
                onClose={() => setDataSummaryDialogOpen(false)}
                maxWidth="lg"
                fullWidth
                aria-labelledby="data-summary-dialog-title"
            >
                <DialogTitle id="data-summary-dialog-title">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AnalyticsIcon />
                        Data Summary: {dataSummary?.seriesName}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {dataSummary && (
                        <Box sx={{ mt: 1 }}>
                            {/* Summary Statistics */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Overview
                                    </Typography>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" color="primary">
                                                    {dataSummary.totalSubtitles.toLocaleString()}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Total Subtitles
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" color="primary">
                                                    {Object.keys(dataSummary.seasons).length}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Seasons
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" color="primary">
                                                    {Object.values(dataSummary.seasons).reduce((sum, season) => 
                                                        sum + Object.keys(season.episodes).length, 0
                                                    )}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Episodes
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" color={(() => {
                                                    const successCount = dataSummary.issues.filter(issue => issue.startsWith('✅')).length;
                                                    const errorCount = dataSummary.issues.length - successCount;
                                                    return errorCount === 0 && successCount > 0 ? "success" : errorCount > 0 ? "error" : "text.primary";
                                                })()}>
                                                    {(() => {
                                                        const successCount = dataSummary.issues.filter(issue => issue.startsWith('✅')).length;
                                                        const errorCount = dataSummary.issues.length - successCount;
                                                        return errorCount === 0 && successCount > 0 ? '✅' : errorCount;
                                                    })()}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {(() => {
                                                        const successCount = dataSummary.issues.filter(issue => issue.startsWith('✅')).length;
                                                        const errorCount = dataSummary.issues.length - successCount;
                                                        return errorCount === 0 && successCount > 0 ? 'All Valid' : 'Issues Found';
                                                    })()}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Issues Section */}
                            {dataSummary.issues.length > 0 && (
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Validation Results ({dataSummary.issues.length})
                                        </Typography>
                                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                            {dataSummary.issues.map((issue, index) => {
                                                const isSuccess = issue.startsWith('✅');
                                                return (
                                                    <Alert 
                                                        key={index} 
                                                        severity={isSuccess ? "success" : "warning"} 
                                                        sx={{ mb: 1 }}
                                                    >
                                                        {issue}
                                                    </Alert>
                                                );
                                            })}
                                        </Box>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Detailed Breakdown */}
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Detailed Breakdown
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>Season</strong></TableCell>
                                                    <TableCell><strong>Folder</strong></TableCell>
                                                    <TableCell><strong>_docs.csv</strong></TableCell>
                                                    <TableCell><strong>Subtitles</strong></TableCell>
                                                    <TableCell><strong>Episode</strong></TableCell>
                                                    <TableCell><strong>Folder</strong></TableCell>
                                                    <TableCell><strong>_docs.csv</strong></TableCell>
                                                    <TableCell><strong>Subtitles</strong></TableCell>
                                                    <TableCell><strong>Videos</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.entries(dataSummary.seasons)
                                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                                    .map(([seasonNumber, seasonData]) => {
                                                        const episodeEntries = Object.entries(seasonData.episodes)
                                                            .sort(([a], [b]) => parseInt(a) - parseInt(b));
                                                        
                                                        return episodeEntries.length > 0 ? (
                                                            episodeEntries.map(([episodeNumber, episodeData], episodeIndex) => (
                                                                <TableRow key={`${seasonNumber}-${episodeNumber}`}>
                                                                    {episodeIndex === 0 ? (
                                                                        <>
                                                                            <TableCell rowSpan={episodeEntries.length}>
                                                                                Season {seasonNumber}
                                                                            </TableCell>
                                                                            <TableCell rowSpan={episodeEntries.length}>
                                                                                <Chip 
                                                                                    label={seasonData.folderExists ? "✓" : "✗"} 
                                                                                    color={seasonData.folderExists ? "success" : "error"}
                                                                                    size="small"
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell rowSpan={episodeEntries.length}>
                                                                                <Chip 
                                                                                    label={seasonData.docsExists ? "✓" : "✗"} 
                                                                                    color={seasonData.docsExists ? "success" : "error"}
                                                                                    size="small"
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell rowSpan={episodeEntries.length}>
                                                                                {seasonData.subtitleCount.toLocaleString()}
                                                                            </TableCell>
                                                                        </>
                                                                    ) : null}
                                                                    <TableCell>Episode {episodeNumber}</TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            label={episodeData.folderExists ? "✓" : "✗"} 
                                                                            color={episodeData.folderExists ? "success" : "error"}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            label={episodeData.docsExists ? "✓" : "✗"} 
                                                                            color={episodeData.docsExists ? "success" : "error"}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {episodeData.subtitleCount.toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            label={episodeData.videoFileCount.toString()}
                                                                            color={episodeData.videoFileCount > 0 ? "success" : "error"}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow key={seasonNumber}>
                                                                <TableCell>Season {seasonNumber}</TableCell>
                                                                <TableCell>
                                                                    <Chip 
                                                                        label={seasonData.folderExists ? "✓" : "✗"} 
                                                                        color={seasonData.folderExists ? "success" : "error"}
                                                                        size="small"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip 
                                                                        label={seasonData.docsExists ? "✓" : "✗"} 
                                                                        color={seasonData.docsExists ? "success" : "error"}
                                                                        size="small"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    {seasonData.subtitleCount.toLocaleString()}
                                                                </TableCell>
                                                                <TableCell colSpan={5} sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                                                    No episodes found
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDataSummaryDialogOpen(false)} color="primary" variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Spot Check Dialog */}
            <Dialog
                open={spotCheckDialogOpen}
                onClose={() => setSpotCheckDialogOpen(false)}
                maxWidth="xl"
                fullWidth
                aria-labelledby="spot-check-dialog-title"
            >
                <DialogTitle id="spot-check-dialog-title">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VisibilityIcon />
                        Spot Check: Subtitle Validation
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={spotCheckTab} onChange={(e, newValue) => setSpotCheckTab(newValue)} aria-label="spot check tabs">
                            <Tab label="Random Samples" />
                            <Tab label="Manual Search" />
                        </Tabs>
                    </Box>

                    {/* Random Samples Tab */}
                    {spotCheckTab === 0 && spotCheckData && (
                        <Box>
                            {Object.entries(spotCheckData).map(([episodeKey, items]) => (
                                <Card key={episodeKey} sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {episodeKey} - {items.length} Random Samples
                                        </Typography>
                                        
                                        <Grid container spacing={2}>
                                            {items.map((item, index) => (
                                                <Grid item xs={12} key={index}>
                                                    <SpotCheckVideoPlayer
                                                        item={item}
                                                        fullPath={fullPath}
                                                        index={index}
                                                        files={files}
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}

                    {/* Manual Search Tab */}
                    {spotCheckTab === 1 && (
                        <Box>
                            <Box sx={{ mb: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Search for subtitles"
                                    placeholder="Type a subtitle or partial text to search for..."
                                    value={manualSearchQuery}
                                    onChange={(e) => setManualSearchQuery(e.target.value)}
                                    onKeyPress={handleSearchKeyPress}
                                    disabled={loadingManualSearch}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Button 
                                                    onClick={handleManualSearch}
                                                    disabled={loadingManualSearch || !manualSearchQuery.trim()}
                                                    size="small"
                                                >
                                                    {loadingManualSearch ? 'Searching...' : 'Search'}
                                                </Button>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Press Enter or click Search to find matching subtitles across all episodes
                                </Typography>
                            </Box>

                            {manualSearchResults && Object.keys(manualSearchResults).length > 0 && (
                                <Box>
                                    {Object.entries(manualSearchResults).map(([episodeKey, items]) => (
                                        <Card key={episodeKey} sx={{ mb: 3 }}>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    {episodeKey} - Match{items.length !== 1 ? 'es' : ''} for "{manualSearchQuery}" (limited to 5 results)
                                                </Typography>
                                                
                                                <Grid container spacing={2}>
                                                    {items.map((item, index) => (
                                                        <Grid item xs={12} key={index}>
                                                            <SpotCheckVideoPlayer
                                                                item={item}
                                                                fullPath={fullPath}
                                                                index={index}
                                                                files={files}
                                                            />
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            )}

                            {manualSearchResults && Object.keys(manualSearchResults).length === 0 && manualSearchQuery && !loadingManualSearch && (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        No matches found
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        No subtitles containing "{manualSearchQuery}" were found across all episodes.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSpotCheckDialogOpen(false)} color="primary" variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Episode Selection Dialog */}
            <Dialog
                open={episodeSelectionDialogOpen}
                onClose={handleCloseEpisodeSelection}
                maxWidth="md"
                fullWidth
                aria-labelledby="episode-selection-dialog-title"
            >
                <DialogTitle id="episode-selection-dialog-title">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EpisodeSelectIcon />
                        Select Episodes to Process
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Choose which episodes you want to include in the approval process. Season-level checkboxes will select/deselect all episodes in that season.
                    </Typography>
                    
                    {Object.keys(availableSeasons).length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No Episodes Found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                No season/episode folder structure detected. Make sure your files are organized in numbered season and episode folders.
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {Object.entries(availableSeasons)
                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                .map(([seasonStr, episodes]) => {
                                    const seasonNum = parseInt(seasonStr, 10);
                                    const seasonEpisodes = episodes.map(ep => ({ season: seasonNum, episode: ep }));
                                    const allSelected = seasonEpisodes.every(ep => 
                                        selectedEpisodes.some(selected => selected.season === ep.season && selected.episode === ep.episode)
                                    );
                                    const someSelected = seasonEpisodes.some(ep => 
                                        selectedEpisodes.some(selected => selected.season === ep.season && selected.episode === ep.episode)
                                    );

                                    return (
                                        <Card key={seasonStr} sx={{ mb: 2 }}>
                                            <CardContent>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={allSelected}
                                                            indeterminate={someSelected && !allSelected}
                                                            onChange={() => handleSeasonToggle(seasonNum)}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="h6">
                                                            Season {seasonNum} ({episodes.length} episode{episodes.length !== 1 ? 's' : ''})
                                                        </Typography>
                                                    }
                                                />
                                                
                                                <Box sx={{ ml: 4, mt: 1 }}>
                                                    <FormGroup>
                                                        <Grid container spacing={1}>
                                                            {episodes
                                                                .sort((a, b) => a - b)
                                                                .map(episodeNum => {
                                                                    const isSelected = selectedEpisodes.some(ep => 
                                                                        ep.season === seasonNum && ep.episode === episodeNum
                                                                    );
                                                                    
                                                                    return (
                                                                        <Grid item xs={6} sm={4} md={3} key={episodeNum}>
                                                                            <FormControlLabel
                                                                                control={
                                                                                    <Checkbox
                                                                                        checked={isSelected}
                                                                                        onChange={() => handleEpisodeToggle(seasonNum, episodeNum)}
                                                                                        size="small"
                                                                                    />
                                                                                }
                                                                                label={`Episode ${episodeNum}`}
                                                                            />
                                                                        </Grid>
                                                                    );
                                                                })
                                                            }
                                                        </Grid>
                                                    </FormGroup>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEpisodeSelection} color="primary">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCloseEpisodeSelection} 
                        color="primary" 
                        variant="contained"
                        disabled={selectedEpisodes.length === 0}
                    >
                        Apply Selection ({selectedEpisodes.length} episode{selectedEpisodes.length !== 1 ? 's' : ''})
                    </Button>
                </DialogActions>
            </Dialog>
            
            <Grid container spacing={2} sx={{ minHeight: 0, pb: 2 }}>
                {/* File Tree */}
                <Grid item xs={12} lg={4}>
                    {/* Data Summary and Spot Check Buttons - only show when srcEditor is true */}
                    {srcEditor && (
                        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AnalyticsIcon />}
                                onClick={handleViewDataSummary}
                                disabled={loadingDataSummary || loadingSpotCheck}
                                fullWidth
                                sx={{ textTransform: 'none' }}
                            >
                                {loadingDataSummary ? 'Analyzing Data...' : 'View Data Summary'}
                            </Button>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<VisibilityIcon />}
                                onClick={handleSpotCheck}
                                disabled={loadingSpotCheck || loadingDataSummary}
                                fullWidth
                                sx={{ textTransform: 'none' }}
                            >
                                {loadingSpotCheck ? 'Generating Samples...' : 'Spot Check'}
                            </Button>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<EpisodeSelectIcon />}
                                onClick={handleOpenEpisodeSelection}
                                disabled={Object.keys(availableSeasons).length === 0}
                                fullWidth
                                sx={{ textTransform: 'none' }}
                            >
                                Select Episodes ({selectedEpisodes.length})
                            </Button>
                        </Box>
                    )}
                    
                    <Paper sx={{ 
                        maxHeight: { xs: '300px', md: '400px' }, 
                        display: 'flex', 
                        flexDirection: 'column',
                        overflow: 'hidden',
                        mb: { xs: 2, lg: 0 }
                    }}>
                        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2">
                                Files ({files.length})
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                            {fileTree.length > 0 ? (
                                <List sx={{ py: 0 }}>
                                    {renderTreeItems(fileTree)}
                                </List>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                    No files found
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                
                {/* File Viewer */}
                <Grid item xs={12} lg={8}>
                    <Box sx={{ 
                        '& .MuiCard-root': {
                            height: 'fit-content',
                        },
                        '& .MuiCardContent-root': {
                            '&:last-child': {
                                paddingBottom: 2
                            }
                        }
                    }}>
                        {renderFileViewer()}
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default FileBrowser;

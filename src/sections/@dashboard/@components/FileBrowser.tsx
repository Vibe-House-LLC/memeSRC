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
    Popover
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
    Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { Storage } from 'aws-amplify';
import { ChromePicker } from 'react-color';

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

interface FileBrowserProps {
    pathPrefix: string;
    id: string;
    files?: FileItem[]; // Optional: if provided, use these instead of listing
    base64Columns?: string[]; // Optional: column names to decode from base64 in CSV files
    srcEditor?: boolean; // Optional: if true, show the src editor options
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
}> = ({ content, filename, onSave, srcEditor = false, selectedFile = null, onUnsavedChanges }) => {
    const [formattedJson, setFormattedJson] = useState<string>('');
    const [editedJson, setEditedJson] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [isUpdatingFrameCount, setIsUpdatingFrameCount] = useState<boolean>(false);
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


    // Helper function to get video duration
    const getVideoDuration = useCallback((videoUrl: string): Promise<number> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                resolve(video.duration);
            };
            
            video.onerror = () => {
                reject(new Error('Failed to load video metadata'));
            };
            
            // Set a timeout to avoid hanging
            setTimeout(() => {
                reject(new Error('Video metadata loading timeout'));
            }, 10000);
            
            video.src = videoUrl;
        });
    }, []);

    // Function to calculate frame count efficiently (25s per clip except last one per folder)
    const calculateFrameCountFromSubfolders = useCallback(async (): Promise<number> => {
        console.log('🎬 Starting optimized frame count calculation...');
        
        if (!selectedFile?.key) {
            console.log('❌ No selected file to determine directory');
            return 0;
        }
        
        try {
            // Get the directory path from the JSON file key
            const keyParts = selectedFile.key.split('/');
            keyParts.pop(); // Remove filename
            const directoryPath = keyParts.join('/');
            
            console.log('🔍 Searching for MP4 files in directory:', directoryPath);
            
            // List all files in the directory and subdirectories
            const result = await Storage.list(directoryPath, {
                level: 'public',
                pageSize: 1000
            });
            
            const resultArray = (result?.results || result || []) as any[];
            console.log(`📂 Found ${resultArray.length} total files/folders`);
            
            // Group MP4 files by folder
            const folderGroups: { [folder: string]: string[] } = {};
            
            resultArray.forEach((item: any) => {
                const key = item.key || '';
                const filename = key.split('/').pop() || '';
                const extension = getFileExtension(filename);
                
                if (extension === 'mp4') {
                    // Get the folder path (everything except the filename)
                    const folderPath = key.substring(0, key.lastIndexOf('/'));
                    
                    if (!folderGroups[folderPath]) {
                        folderGroups[folderPath] = [];
                    }
                    folderGroups[folderPath].push(key);
                    console.log('🎥 Found MP4:', key);
                }
            });
            
            if (Object.keys(folderGroups).length === 0) {
                console.log('❌ No MP4 files found');
                return 0;
            }
            
            console.log(`📁 Found MP4 files in ${Object.keys(folderGroups).length} folders`);
            
            let totalDuration = 0;
            let totalClips = 0;
            let lastClipsProcessed = 0;
            
            // Process each folder
            for (const [folderPath, mp4Files] of Object.entries(folderGroups)) {
                // Sort files numerically (assuming they're numbered)
                const sortedFiles = mp4Files.sort((a, b) => {
                    const aNum = parseInt(a.split('/').pop()?.replace(/\D/g, '') || '0');
                    const bNum = parseInt(b.split('/').pop()?.replace(/\D/g, '') || '0');
                    return aNum - bNum;
                });
                
                const clipCount = sortedFiles.length;
                totalClips += clipCount;
                
                if (clipCount === 0) continue;
                
                console.log(`📁 ${folderPath}: ${clipCount} clips`);
                
                if (clipCount === 1) {
                    // Only one clip - get its duration
                    const singleClipKey = sortedFiles[0];
                    try {
                        const videoUrl = await Storage.get(singleClipKey, {
                            level: 'public',
                            expires: 3600
                        });
                        
                        const clipDuration = await getVideoDuration(videoUrl);
                        totalDuration += clipDuration;
                        lastClipsProcessed++;
                        
                        console.log(`⏱️ Single clip ${singleClipKey}: ${clipDuration.toFixed(2)}s`);
                    } catch (error) {
                        console.warn(`⚠️ Could not get duration for single clip ${singleClipKey}, assuming 25s:`, error);
                        totalDuration += 25; // Fallback to 25 seconds
                    }
                } else {
                    // Multiple clips - check first and last, assume 25s for middle ones
                    const firstClipKey = sortedFiles[0];
                    const lastClipKey = sortedFiles[sortedFiles.length - 1];
                    const middleClipsCount = clipCount - 2; // Exclude first and last
                    
                    // Middle clips are 25 seconds each
                    const middleClipsDuration = middleClipsCount * 25;
                    totalDuration += middleClipsDuration;
                    
                    console.log(`⏱️ ${middleClipsCount} middle clips × 25s = ${middleClipsDuration}s`);
                    
                    // Get duration of the first clip (0.mp4)
                    try {
                        const firstVideoUrl = await Storage.get(firstClipKey, {
                            level: 'public',
                            expires: 3600
                        });
                        
                        const firstClipDuration = await getVideoDuration(firstVideoUrl);
                        totalDuration += firstClipDuration;
                        lastClipsProcessed++;
                        
                        console.log(`⏱️ First clip ${firstClipKey}: ${firstClipDuration.toFixed(2)}s`);
                    } catch (error) {
                        console.warn(`⚠️ Could not get duration for first clip ${firstClipKey}, assuming 25s:`, error);
                        totalDuration += 25; // Fallback to 25 seconds
                    }
                    
                    // Get duration of the last clip
                    try {
                        const lastVideoUrl = await Storage.get(lastClipKey, {
                            level: 'public',
                            expires: 3600
                        });
                        
                        const lastClipDuration = await getVideoDuration(lastVideoUrl);
                        totalDuration += lastClipDuration;
                        lastClipsProcessed++;
                        
                        console.log(`⏱️ Last clip ${lastClipKey}: ${lastClipDuration.toFixed(2)}s`);
                    } catch (error) {
                        console.warn(`⚠️ Could not get duration for last clip ${lastClipKey}, assuming 25s:`, error);
                        totalDuration += 25; // Fallback to 25 seconds
                    }
                }
            }
            
            // Calculate total frames (duration × 10 fps)
            const totalFrames = Math.round(totalDuration * 10);
            
            console.log(`✅ Processed ${totalClips} clips across ${Object.keys(folderGroups).length} folders`);
            console.log(`📊 ${totalClips - lastClipsProcessed} clips assumed 25s, ${lastClipsProcessed} edge clips measured`);
            console.log(`⏱️ Total duration: ${totalDuration.toFixed(2)} seconds`);
            console.log(`🎞️ Total frame count: ${totalFrames.toLocaleString()} (${totalDuration.toFixed(2)}s × 10 fps)`);
            
            return totalFrames;
        } catch (error) {
            console.error('❌ Error calculating frame count:', error);
            return 0;
        }
    }, [selectedFile, getVideoDuration]);

    // Function to update frame count in JSON
    const updateFrameCount = useCallback(async () => {
        if (!hasFrameCount || !selectedFile) return;
        
        setIsUpdatingFrameCount(true);
        try {
            // Calculate frame count by analyzing MP4 durations
            const frameCount = await calculateFrameCountFromSubfolders();
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
    }, [hasFrameCount, selectedFile, editedJson, calculateFrameCountFromSubfolders]);

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
        
        for (let i = 1; i < Math.min(csvLines.length, maxSearchRows) && foundCount < ROWS_PER_PAGE; i++) {
            const line = csvLines[i];
            if (!line || line.trim().length === 0) continue;
            
            const row = parseCsvLine(line);
            const matchFound = row.some((cell, cellIndex) => {
                const columnName = headers[cellIndex];
                const shouldDecode = base64Columns.includes(columnName);
                
                // Search in both original and decoded values
                const originalMatch = cell.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
                if (originalMatch) return true;
                
                if (shouldDecode && isBase64(cell)) {
                    const decodedValue = decodeBase64Safe(cell);
                    return decodedValue.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
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

const FileBrowser: React.FC<FileBrowserProps> = ({ pathPrefix, id, files: providedFiles, base64Columns = [], srcEditor = false }) => {
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

    const fullPath = `${pathPrefix}/${id}`;

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('Listing files from S3 bucket root path:', fullPath);
            
            // List files from S3 bucket root using custom prefix (empty string)
            const result = await Storage.list(fullPath, {
                level: 'public',
                pageSize: 1000
            });
            
            console.log('Storage.list result:', result);
            
            const resultArray = (result?.results || result || []) as any[];
            console.log('Result array:', resultArray);
            
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
    }, [loadFiles]);

    useEffect(() => {
        if (selectedFile) {
            loadFileContent(selectedFile);
        }
    }, [selectedFile, loadFileContent]);

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
            
            <Typography variant="h6" gutterBottom>
                File Browser: {fullPath}
            </Typography>

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
            
            <Grid container spacing={2} sx={{ minHeight: 0, pb: 2 }}>
                {/* File Tree */}
                <Grid item xs={12} lg={4}>
                    {/* Data Summary Button - only show when srcEditor is true */}
                    {srcEditor && (
                        <Box sx={{ mb: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AnalyticsIcon />}
                                onClick={handleViewDataSummary}
                                disabled={loadingDataSummary}
                                fullWidth
                                sx={{ textTransform: 'none' }}
                            >
                                {loadingDataSummary ? 'Analyzing Data...' : 'View Data Summary'}
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

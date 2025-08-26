import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Divider,
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
    InputAdornment
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
    Clear as ClearIcon
} from '@mui/icons-material';
import { Storage } from 'aws-amplify';

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

interface FileBrowserProps {
    pathPrefix: string;
    id: string;
    files?: FileItem[]; // Optional: if provided, use these instead of listing
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
        const decoded = atob(str);
        // Check if decoded content is printable (basic heuristic)
        return decoded.length > 0 && /^[\x20-\x7E\s]*$/.test(decoded);
    } catch (e) {
        return false;
    }
};

const decodeBase64Safe = (str: string): string => {
    try {
        return atob(str);
    } catch (e) {
        return str; // Return original if decode fails
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
            <VideoPlayer controls>
                <source src={url} type="video/mp4" />
                <source src={url} type="video/quicktime" />
                Your browser does not support the video tag.
            </VideoPlayer>
        </CardContent>
    </Card>
);

const JsonFileViewer: React.FC<{ content: string; filename: string }> = ({ content, filename }) => {
    const [formattedJson, setFormattedJson] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        try {
            const parsed = JSON.parse(content);
            setFormattedJson(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (err) {
            setError('Invalid JSON format');
            setFormattedJson(content);
        }
    }, [content]);
    
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    JSON: {filename}
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <JsonViewerContainer>{formattedJson}</JsonViewerContainer>
            </CardContent>
        </Card>
    );
};

const CsvViewer: React.FC<{ content: string; filename: string }> = ({ content, filename }) => {
    const [tableData, setTableData] = useState<string[][]>([]);
    const [filteredData, setFilteredData] = useState<string[][]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        try {
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            const data = lines.map(line => {
                // Simple CSV parsing - could be enhanced for complex CSVs
                return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
            });
            setTableData(data);
            setFilteredData(data);
            setError(null);
        } catch (err) {
            setError('Error parsing CSV');
        }
    }, [content]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredData(tableData);
            return;
        }

        const filtered = tableData.filter((row, index) => {
            // Skip header row from filtering, always include it
            if (index === 0) return true;
            
            return row.some(cell => {
                // Search in both original and decoded values
                const originalMatch = cell.toLowerCase().includes(searchTerm.toLowerCase());
                const decodedValue = isBase64(cell) ? decodeBase64Safe(cell) : cell;
                const decodedMatch = decodedValue.toLowerCase().includes(searchTerm.toLowerCase());
                return originalMatch || decodedMatch;
            });
        });
        
        setFilteredData(filtered);
    }, [searchTerm, tableData]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };
    
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
    
    const headers = filteredData[0] || [];
    const rows = filteredData.slice(1);
    const totalRows = tableData.length - 1; // Subtract header row
    const filteredRows = rows.length;
    
    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        CSV: {filename} ({filteredRows}{filteredRows !== totalRows ? ` of ${totalRows}` : ''} rows)
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search CSV..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        sx={{ minWidth: 200 }}
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
                
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {headers.map((header, index) => (
                                    <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                                        {header}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, rowIndex) => (
                                <TableRow key={rowIndex} hover>
                                    {row.map((cell, cellIndex) => {
                                        const isBase64Encoded = isBase64(cell);
                                        const displayValue = isBase64Encoded ? decodeBase64Safe(cell) : cell;
                                        
                                        return (
                                            <TableCell key={cellIndex}>
                                                {isBase64Encoded ? (
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
                                                ) : (
                                                    displayValue
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                {rows.length === 0 && searchTerm && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            No rows match "{searchTerm}"
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

const FileBrowser: React.FC<FileBrowserProps> = ({ pathPrefix, id, files: providedFiles }) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [fileUrl, setFileUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingContent, setLoadingContent] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string[]>([]);

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
                console.log('Processing file key:', key);
                
                // Extract just the relative path part for the file name and tree building
                // The key from Storage.list() should be like "src-extracted/airplane/file.mp4"
                // We want to remove the fullPath prefix to get just the relative part
                const relativePath = key.startsWith(fullPath + '/') 
                    ? key.substring(fullPath.length + 1) 
                    : key.replace(fullPath, '').replace(/^\//, '');
                const name = relativePath.split('/').pop() || relativePath;
                
                console.log('Relative path:', relativePath, 'Name:', name);
                
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
        if (!file.isDirectory) {
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleNodeToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
        setExpanded(nodeIds);
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
                return <JsonFileViewer content={fileContent} filename={selectedFile.name} />;
            case 'csv':
                return <CsvViewer content={fileContent} filename={selectedFile.name} />;
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
        <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            <Typography variant="h6" gutterBottom>
                File Browser: {fullPath}
            </Typography>
            
            <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                {/* File Tree */}
                <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                    <Paper sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        overflow: 'hidden'
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
                <Grid item xs={12} md={8} sx={{ height: '100%' }}>
                    <Box sx={{ 
                        height: '100%', 
                        overflow: 'auto',
                        '& .MuiCard-root': {
                            height: 'fit-content',
                            maxHeight: '100%'
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

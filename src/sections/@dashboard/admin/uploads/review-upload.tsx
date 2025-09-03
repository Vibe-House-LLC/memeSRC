
import {
    Typography,
    Box,
    Card,
    CardContent,
    List,
    CircularProgress,
    Alert,
    Autocomplete,
    TextField,
    Grid,
    Paper,
    Button
} from "@mui/material";
import {
    Save as SaveIcon
} from "@mui/icons-material";
import { Storage } from "aws-amplify";
import { SourceMediaFile } from "./types";
import { FileBrowser, FileCard } from "../../@components";
import type { FileCardData } from "../../@components";
import listAliases from "./functions/list-aliases";
import updateSourceMedia from "./functions/update-source-media";
import { useEffect, useState, useContext } from "react";
import { SnackbarContext } from "../../../../SnackbarContext";

// Placeholder component that mimics FileBrowser appearance
const FileBrowserPlaceholder = () => (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
            File Browser: Waiting for extraction...
        </Typography>
        
        <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            {/* File Tree Placeholder */}
            <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                <Paper sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2">
                            Files (0)
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ textAlign: 'center', p: 3 }}>
                            <CircularProgress size={40} sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                                Waiting for extraction...
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Grid>
            
            {/* File Viewer Placeholder */}
            <Grid item xs={12} md={8} sx={{ height: '100%' }}>
                <Paper sx={{ 
                    height: '100%', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No files to display
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Files will appear here once extraction is complete
                        </Typography>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    </Box>
);

interface AdminReviewUploadProps {
    files: SourceMediaFile[];
    loading: boolean;
    error: string | null;
    downloadingFiles: Set<string>;
    extractingFiles: Set<string>;
    setDownloadingFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
    setExtractingFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    sourceMediaId?: string;
    initialAlias?: string;
    filePathPrefix?: string;
}

export default function AdminReviewUpload({
    files,
    loading,
    error,
    downloadingFiles,
    extractingFiles,
    setDownloadingFiles,
    setExtractingFiles,
    setError,
    sourceMediaId,
    initialAlias = '',
}: AdminReviewUploadProps) {
    const [aliases, setAliases] = useState<string[]>([]);
    const [aliasesLoading, setAliasesLoading] = useState(false);
    const [pendingAlias, setPendingAlias] = useState<string>(initialAlias);
    const [savingAlias, setSavingAlias] = useState(false);
    const [savedAlias, setSavedAlias] = useState<string>(initialAlias);
    const [filePathPrefix, setFilePathPrefix] = useState<string>('');
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    
    // Snackbar context for success messages
    const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);

    useEffect(() => {
        if (!pendingAlias) {
            setSavedAlias(initialAlias);
            setPendingAlias(initialAlias);
        }
    }, [initialAlias]);

    // Load aliases on mount
    useEffect(() => {
        const loadAliases = async () => {
            setAliasesLoading(true);
            try {
                const aliasData = await listAliases();
                if (aliasData) {
                    const aliasIds = aliasData.map((alias: any) => alias.id).filter(Boolean);
                    setAliases(aliasIds);
                }
            } catch (err) {
                console.error('Failed to load aliases:', err);
                setError('Failed to load aliases');
            } finally {
                setAliasesLoading(false);
            }
        };
        loadAliases();
    }, [setError]);

    // Check if alias has changed from saved value
    const hasAliasChanged = pendingAlias !== savedAlias;
    const isAliasSaved = savedAlias.trim() !== '';
    const isNewAlias = savedAlias.trim() !== '' && !aliases.includes(savedAlias);

    const handleSaveAlias = async () => {
        if (!sourceMediaId || !hasAliasChanged) return;

        setSavingAlias(true);
        try {
            await updateSourceMedia(sourceMediaId, { pendingAlias });
            setSavedAlias(pendingAlias); // Update saved alias after successful save
            setError(null);
            
            // Show success message
            setSeverity('success');
            setMessage('Alias saved successfully!');
            setOpen(true);
        } catch (err) {
            console.error('Failed to save alias:', err);
            setError('Failed to save alias');
        } finally {
            setSavingAlias(false);
        }
    };

    const handleDownloadFile = async (fileKey: string, fileId: string) => {
        try {
            setDownloadingFiles(prev => new Set([...prev, fileId]));

            // Get the signed URL from Amplify Storage
            // The key contains the full S3 path, so we need to extract the actual file path
            // Format: "protected/us-east-1:USER_ID/protected/us-east-1:OWNER_ID/UUID/filename"
            const pathParts = fileKey.split('/');
            console.log('File key parts:', pathParts); // Debug log

            // Based on your example: "protected/us-east-1:589ad1a3.../56e331b8.../IMG_5785.zip"
            // Index 0: "protected"
            // Index 1: "us-east-1:589ad1a3..."
            // Index 2: "56e331b8..."
            // Index 3: "IMG_5785.zip"
            const originalIdentityId = pathParts[1]; // Extract identity ID
            const actualKey = pathParts.slice(2).join('/'); // Get the file path (UUID/filename)

            console.log('Identity ID:', originalIdentityId);
            console.log('Actual key:', actualKey);

            const url = await Storage.get(actualKey, {
                level: 'protected',
                expires: 300, // 5 minutes
                identityId: originalIdentityId
            });

            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = fileKey.split('/').pop() || fileKey; // Use filename from key
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error('Error downloading file:', err);
            setError(`Failed to download file: ${fileKey}`);
        } finally {
            setDownloadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
            });
        }
    };

    const handleExtractToStaging = async (fileKey: string, fileId: string) => {
       setSeverity('info');
       setMessage('Extracting to staging...');
       setOpen(true);
    };

    const handleError = (error: any) => {
        setSeverity('error');
        setMessage('Error starting extraction function.');
        setOpen(true);
    };

    const handleFileSelect = (fileId: string, unzippedPath: string | null) => {
        if (unzippedPath) {
            // If selecting a new file, update both selected file and path prefix
            setSelectedFileId(fileId);
            setFilePathPrefix(unzippedPath);
        } else {
            // If deselecting, clear both selected file and path prefix
            setSelectedFileId(null);
            setFilePathPrefix('');
        }
    };

    return (
        <>

            {loading && (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ ml: 2 }}>
                        Loading files...
                    </Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!loading && files.length > 0 && (
                <>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                                Alias
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Autocomplete
                                    freeSolo
                                    fullWidth
                                    options={aliases}
                                    value={pendingAlias}
                                    onChange={(event, newValue) => {
                                        setPendingAlias(typeof newValue === 'string' ? newValue : newValue || '');
                                    }}
                                    onInputChange={(event, newValue) => {
                                        setPendingAlias(newValue);
                                    }}
                                    loading={aliasesLoading}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select or enter alias"
                                            variant="outlined"
                                            size="small"
                                            placeholder="Enter alias name..."
                                        />
                                    )}
                                    sx={{ flex: 1 }}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={
                                        savingAlias ? (
                                            <CircularProgress size={16} />
                                        ) : (
                                            <SaveIcon />
                                        )
                                    }
                                    onClick={handleSaveAlias}
                                    disabled={!hasAliasChanged || savingAlias}
                                    sx={{ minWidth: 100 }}
                                >
                                    Save
                                </Button>
                            </Box>
                            {!isAliasSaved && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Please save an alias to enable file extraction.
                                </Alert>
                            )}
                            {isNewAlias && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    This alias does not exist. If you proceed, this alias will be created and linked after approval.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Files ({files.length})
                            </Typography>
                            <List>
                                {files.map((file, index) => {
                                    const isDownloading = downloadingFiles.has(file.id);
                                    const isExtracting = extractingFiles.has(file.id);
                                    const isSelected = selectedFileId === file.id;
                                    
                                    // Cast file to FileCardData to include unzippedPath
                                    const fileCardData: FileCardData = {
                                        ...file,
                                        unzippedPath: (file as any).unzippedPath || null
                                    };

                                    return (
                                        <FileCard
                                            key={file.id}
                                            file={fileCardData}
                                            isDownloading={isDownloading}
                                            isExtracting={isExtracting}
                                            isAliasSaved={isAliasSaved}
                                            isSelected={isSelected}
                                            onDownload={handleDownloadFile}
                                            onExtract={handleExtractToStaging}
                                            onError={handleError}
                                            onSelect={handleFileSelect}
                                            showDivider={index < files.length - 1}
                                        />
                                    );
                                })}
                            </List>
                        </CardContent>
                    </Card>
                </>
            )}
            <Box sx={{ my: 2 }}>
                {/* This is temporarily pointing to an existing show for testing until the extraction function is complete. */}
                {/* Currently the file browser does not allow for editing, but will once it's setup properly with extractions. */}
                {/* Generally, this component will be very reusable and I plan to give it an "edit" flag so it can be used as a safe file browser or a browser/editor. */}
                {filePathPrefix ? (
                    <FileBrowser pathPrefix={filePathPrefix} id={savedAlias} />
                ) : (
                    <FileBrowserPlaceholder />
                )}
            </Box>

            {!loading && files.length === 0 && !error && (
                <Card>
                    <CardContent>
                        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                            No files found for this source media.
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
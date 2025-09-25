
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
    Save as SaveIcon,
    CheckCircle as ApproveIcon,
    PublishedWithChanges as ReindexIcon
} from "@mui/icons-material";
import { Storage, API } from "aws-amplify";
import { SourceMediaFile } from "./types";
import { FileBrowser, FileCard } from "../../@components";
import type { FileCardData } from "../../@components";
import listAliases from "./functions/list-aliases";
import updateSourceMedia from "./functions/update-source-media";
import { useEffect, useState, useContext } from "react";
import { SnackbarContext } from "../../../../SnackbarContext";

// Custom subscription that only requests non-nullable fields to avoid GraphQL errors
const onUpdateSourceMedia = /* GraphQL */ `
  subscription OnUpdateSourceMedia($filter: ModelSubscriptionSourceMediaFilterInput) {
    onUpdateSourceMedia(filter: $filter) {
      id
      status
      pendingAlias
      __typename
    }
  }
`;

// Placeholder component that mimics FileBrowser appearance
const FileBrowserPlaceholder = ({ sourceMediaStatus, filePathPrefix }: { sourceMediaStatus?: string, filePathPrefix?: string }) => {
    // Determine the message based on the state
    let title = "File Browser";
    let message = "No uploaded files unzipped.";
    let subtitle = "Files will appear here once an alias is saved and files are unzipped";
    
    if (sourceMediaStatus && sourceMediaStatus.toLowerCase() !== 'uploaded') {
        title = "File Browser: Disabled";
        message = `File browser is disabled when source media status is "${sourceMediaStatus}".`;
        subtitle = "File browser will be available once the source media status is 'uploaded'.";
    } else if (!filePathPrefix) {
        message = "No uploaded files unzipped.";
        subtitle = "Files will appear here once an alias is saved";
    }

    return (
        <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
                {title}
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
                                <Typography variant="body2" color="text.secondary">
                                    {message}
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
                                {subtitle}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

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
    initialStatus?: string;
    filePathPrefix?: string;
    onStatusUpdate?: (status: string) => void;
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
    initialStatus = '',
    onStatusUpdate,
}: AdminReviewUploadProps) {
    const [aliases, setAliases] = useState<string[]>([]);
    const [aliasesLoading, setAliasesLoading] = useState(false);
    const [pendingAlias, setPendingAlias] = useState<string>(initialAlias);
    const [savingAlias, setSavingAlias] = useState(false);
    const [savedAlias, setSavedAlias] = useState<string>(initialAlias);
    const [filePathPrefix, setFilePathPrefix] = useState<string>('');
    const [fileStatuses, setFileStatuses] = useState<Record<string, string>>({});
    const [sourceMediaStatus, setSourceMediaStatus] = useState<string>(initialStatus);
    const [approvingUpload, setApprovingUpload] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [selectedEpisodes, setSelectedEpisodes] = useState<{ season: number; episode: number }[]>([]);
    const [fileBrowserRefreshKey, setFileBrowserRefreshKey] = useState<number>(0);
    
    // Snackbar context for success messages
    const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);

    useEffect(() => {
        if (!pendingAlias) {
            setSavedAlias(initialAlias);
            setPendingAlias(initialAlias);
        }
    }, [initialAlias]);

    useEffect(() => {
        if (initialStatus) {
            setSourceMediaStatus(initialStatus);
        }
    }, [initialStatus]);

    // Initialize file statuses when files change
    useEffect(() => {
        const initialStatuses: Record<string, string> = {};
        files.forEach(file => {
            initialStatuses[file.id] = file.status;
        });
        setFileStatuses(initialStatuses);
    }, [files]);

    // Set file path prefix based on alias status
    useEffect(() => {
        if (savedAlias?.trim()) {
            // If savedAlias exists in the aliases list, it's an existing alias -> use srcPending
            // If savedAlias doesn't exist in the aliases list, it's a new alias -> use src
            const isExistingAlias = aliases.includes(savedAlias);
            const pathPrefix = isExistingAlias ? 'protected/srcPending' : 'protected/src';
            setFilePathPrefix(pathPrefix);
        } else {
            // Clear filePathPrefix if no alias is saved
            setFilePathPrefix('');
        }
    }, [savedAlias, aliases]);

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

    // Subscribe to sourceMedia status changes
    useEffect(() => {
        let subscription: any;
        
        if (sourceMediaId) {
            subscription = (API.graphql({
                query: onUpdateSourceMedia,
                variables: { filter: { id: { eq: sourceMediaId } } },
            }) as any).subscribe({
                next: ({ value }) => {
                    console.log('SOURCE MEDIA STATUS UPDATED', value);
                    
                    // Add defensive checks for the subscription response
                    if (!value?.data?.onUpdateSourceMedia) {
                        console.warn('Invalid subscription response structure:', value);
                        return;
                    }
                    
                    const updatedSourceMedia = value.data.onUpdateSourceMedia;
                    console.log('Updated source media data:', updatedSourceMedia);
                    
                    // Check if status exists and update it
                    console.log('Current sourceMediaStatus state:', sourceMediaStatus);
                    console.log('Received status from subscription:', updatedSourceMedia?.status);
                    
                    if (updatedSourceMedia?.status !== undefined && updatedSourceMedia?.status !== null) {
                        console.log('Updating source media status to:', updatedSourceMedia.status);
                        setSourceMediaStatus(updatedSourceMedia.status);
                        // Call parent callback to update the status chip in parent component
                        if (onStatusUpdate) {
                            onStatusUpdate(updatedSourceMedia.status);
                        }
                        console.log('Status update called, new value should be:', updatedSourceMedia.status);
                    } else {
                        console.log('Status field is null or undefined:', updatedSourceMedia?.status);
                        // Still update the state to trigger re-render, even if it's empty
                        const statusValue = updatedSourceMedia?.status || '';
                        setSourceMediaStatus(statusValue);
                        // Call parent callback even for empty status
                        if (onStatusUpdate) {
                            onStatusUpdate(statusValue);
                        }
                    }
                    
                    // Check if pendingAlias exists and is different from saved alias
                    if (updatedSourceMedia?.pendingAlias && updatedSourceMedia.pendingAlias !== savedAlias) {
                        console.log('Updating pending alias to:', updatedSourceMedia.pendingAlias);
                        setSavedAlias(updatedSourceMedia.pendingAlias);
                        setPendingAlias(updatedSourceMedia.pendingAlias);
                    }
                },
                error: (error) => {
                    console.error('Source media subscription error:', error);
                }
            });
        }

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [sourceMediaId, savedAlias]);

    // Debug: Log when sourceMediaStatus changes
    useEffect(() => {
        console.log('sourceMediaStatus state changed to:', sourceMediaStatus);
    }, [sourceMediaStatus]);

    // Check if alias has changed from saved value
    const hasAliasChanged = pendingAlias !== savedAlias;
    const isAliasSaved = pendingAlias?.trim() !== '';
    const isNewAlias = pendingAlias?.trim() !== '' && !aliases?.includes(pendingAlias);
    
    // Check if any file has extracting or extracted status (should disable alias field)
    const hasExtractingOrExtractedFiles = Object.values(fileStatuses).some(status => 
        status === 'extracting' || status === 'extracted'
    );
    const isAliasDisabled = hasExtractingOrExtractedFiles;

    // Check if approve button should be enabled
    const hasExtractedFiles = Object.values(fileStatuses).some(status => status === 'extracted');
    const isSourceMediaUploaded = sourceMediaStatus.toLowerCase() === 'uploaded';
    const canApprove = isSourceMediaUploaded && hasExtractedFiles && isAliasSaved && !approvingUpload;

    // Debug: Log the enabling conditions
    console.log('Approve button conditions:', {
        sourceMediaStatus,
        isSourceMediaUploaded,
        fileStatuses,
        hasExtractedFiles,
        pendingAlias,
        isAliasSaved,
        approvingUpload,
        canApprove
    });

    const showIndexButton = ['awaitingindexing', 'published'].includes(sourceMediaStatus?.toLowerCase?.() || '');
    const indexButtonLabel = (sourceMediaStatus?.toLowerCase?.() || '') === 'published' ? 'Re-Index' : 'Index and Publish';

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


    const handleFileStatusUpdate = (fileId: string, newStatus: string) => {
        setFileStatuses(prev => ({
            ...prev,
            [fileId]: newStatus
        }));
        // Trigger a FileBrowser refresh whenever any file status changes
        setFileBrowserRefreshKey(prev => prev + 1);
    };

    const handleEpisodeSelectionChange = (episodes: { season: number; episode: number }[]) => {
        setSelectedEpisodes(episodes);
        console.log('Selected episodes updated:', episodes);
    };

    const handleApproveUpload = async () => {
        if (!sourceMediaId || !canApprove) return;

        setApprovingUpload(true);
        try {
            // Check if alias already exists and we have episode selection
            const isExistingAlias = aliases.includes(savedAlias);
            
            // Prepare the request body
            const requestBody: any = {
                sourceMediaId
            };
            
            // If the alias already exists and we have selected episodes, include them
            if (isExistingAlias && selectedEpisodes.length > 0) {
                requestBody.episodes = selectedEpisodes;
                console.log('Sending selected episodes to backend:', selectedEpisodes);
            }
            
            // Call the backend function to approve and start processing
            // This would typically trigger the indexing process
            await API.post('publicapi', '/sourceMedia/approve', {
                body: requestBody
            });
            
            setSeverity('success');
            setMessage(`Upload approved! Processing will begin shortly${isExistingAlias && selectedEpisodes.length > 0 ? ` for ${selectedEpisodes.length} selected episode${selectedEpisodes.length !== 1 ? 's' : ''}.` : '.'}`);
            setOpen(true);
        } catch (err) {
            console.error('Failed to approve upload:', err);
            setSeverity('error');
            setMessage('Failed to approve upload. Please try again.');
            setOpen(true);
        } finally {
            setApprovingUpload(false);
        }
    };

    const handleIndexAndPublish = async () => {
        if (!sourceMediaId) return;

        setIndexing(true);
        try {
            await API.post('publicapi', '/media/index', {
                body: { sourceMediaId }
            });

            setSeverity('success');
            setMessage('Indexing started. This may take a few minutes.');
            setOpen(true);
        } catch (err) {
            console.error('Failed to start indexing:', err);
            setSeverity('error');
            setMessage('Failed to start indexing. Please try again.');
            setOpen(true);
        } finally {
            setIndexing(false);
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
                    {/* Approve Upload Button */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'left' }}>
                        <Button
                            variant="contained"
                            size="medium"
                            startIcon={
                                approvingUpload ? (
                                    <CircularProgress size={20} color="inherit" />
                                ) : (
                                    <ApproveIcon />
                                )
                            }
                            onClick={handleApproveUpload}
                            disabled={!canApprove}
                            color="success"
                        >
                            {approvingUpload ? 'Approving...' : 'Approve Upload'}
                        </Button>
                        {showIndexButton && (
                            <Button
                                variant="contained"
                                size="medium"
                                sx={{ ml: 2 }}
                                startIcon={
                                    indexing ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : (
                                        <ReindexIcon />
                                    )
                                }
                                onClick={handleIndexAndPublish}
                                disabled={indexing}
                                color="primary"
                            >
                                {indexing ? 'Starting…' : indexButtonLabel}
                            </Button>
                        )}
                    </Box>

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
                                    disabled={isAliasDisabled}
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
                                    disabled={!hasAliasChanged || savingAlias || isAliasDisabled}
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
                            {isAliasDisabled && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Alias field is disabled because some files are currently being extracted or have been extracted.
                                </Alert>
                            )}
                            {pendingAlias && !isAliasDisabled && isNewAlias && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    This alias does not exist. If you proceed, this alias will be created and linked after approval.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Uploaded Files ({files.length})
                            </Typography>
                            <List>
                                {files.map((file, index) => {
                                    const isDownloading = downloadingFiles.has(file.id);
                                    const isExtracting = extractingFiles.has(file.id);
                                    
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
                                            onDownload={handleDownloadFile}
                                            onExtract={handleExtractToStaging}
                                            onError={handleError}
                                            onStatusUpdate={handleFileStatusUpdate}
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
                {/* FileBrowser automatically uses alias-based path: existing alias -> srcPending/, new alias -> src/ */}
                {/* Currently the file browser does not allow for editing, but will once it's setup properly with extractions. */}
                {/* Generally, this component will be very reusable and I plan to give it an "edit" flag so it can be used as a safe file browser or a browser/editor. */}
                {filePathPrefix && isSourceMediaUploaded ? (
                    <FileBrowser 
                        pathPrefix={filePathPrefix} 
                        id={savedAlias} 
                        base64Columns={['subtitle_text']} 
                        srcEditor 
                        refreshKey={fileBrowserRefreshKey}
                        onEpisodeSelectionChange={handleEpisodeSelectionChange}
                    />
                ) : (
                    <FileBrowserPlaceholder 
                        sourceMediaStatus={sourceMediaStatus} 
                        filePathPrefix={filePathPrefix} 
                    />
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
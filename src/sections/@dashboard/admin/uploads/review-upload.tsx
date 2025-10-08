
import {
    Typography,
    Box,
    Card,
    CardContent,
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
import { API } from "aws-amplify";
import { FileBrowser } from "../../@components";
import listAliases from "./functions/list-aliases";
import updateSourceMedia from "./functions/update-source-media";
import { useEffect, useState, useContext, useMemo, type Dispatch, type SetStateAction } from "react";
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
const FileBrowserPlaceholder = ({
    sourceMediaStatus,
    identityId,
    sourceMediaId,
    hasFiles
}: {
    sourceMediaStatus?: string;
    identityId?: string | null;
    sourceMediaId?: string | null;
    hasFiles: boolean;
}) => {
    let title = "File Browser";
    let message = "No files available for this source media.";
    let subtitle = "Files will appear here once the upload finishes processing.";

    if (sourceMediaStatus && sourceMediaStatus.toLowerCase() !== 'uploaded') {
        title = "File Browser: Disabled";
        message = `File browser is disabled when source media status is "${sourceMediaStatus}".`;
        subtitle = "File browser will be available once the source media status is 'uploaded'.";
    } else if (!identityId || !sourceMediaId) {
        message = "Missing identity information for this source media.";
        subtitle = "Ensure the upload completed successfully.";
    } else if (!hasFiles) {
        subtitle = "Files have not been linked to this upload yet.";
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
    loading: boolean;
    error: string | null;
    setError: Dispatch<SetStateAction<string | null>>;
    sourceMediaId?: string;
    initialAlias?: string;
    initialStatus?: string;
    identityId?: string | null;
    fileStatuses?: string[];
    hasFiles?: boolean;
    onStatusUpdate?: (status: string) => void;
}

export default function AdminReviewUpload({
    loading,
    error,
    setError,
    sourceMediaId,
    initialAlias = '',
    initialStatus = '',
    identityId = null,
    fileStatuses: initialFileStatuses = [],
    hasFiles: hasFilesProp = false,
    onStatusUpdate,
}: AdminReviewUploadProps) {
    const [aliases, setAliases] = useState<string[]>([]);
    const [aliasesLoading, setAliasesLoading] = useState(false);
    const [pendingAlias, setPendingAlias] = useState<string>(initialAlias);
    const [savingAlias, setSavingAlias] = useState(false);
    const [savedAlias, setSavedAlias] = useState<string>(initialAlias);
    const [sourceMediaStatus, setSourceMediaStatus] = useState<string>(initialStatus);
    const [approvingUpload, setApprovingUpload] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [selectedEpisodes, setSelectedEpisodes] = useState<{ season: number; episode: number }[]>([]);
    
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
    const normalizedPendingAlias = pendingAlias?.trim() || '';
    const normalizedSavedAlias = savedAlias?.trim() || '';
    const hasAliasChanged = pendingAlias !== savedAlias;
    const isAliasSaved = normalizedSavedAlias !== '';
    const isNewAlias = normalizedPendingAlias !== '' && !aliases.includes(normalizedPendingAlias);
    const aliasNameForBrowser = normalizedPendingAlias || normalizedSavedAlias;
    const isExistingAliasForBrowser = aliasNameForBrowser !== '' && aliases.includes(aliasNameForBrowser);

    const fileStatuses = useMemo(() => initialFileStatuses.filter(Boolean), [initialFileStatuses]);

    // Check if any file has extracting or extracted status (should disable alias field)
    const hasExtractingOrExtractedFiles = fileStatuses.some(status =>
        status === 'extracting' || status === 'extracted'
    );
    const isAliasDisabled = hasExtractingOrExtractedFiles;

    // Check if approve button should be enabled
    const resolvedIdentityId = identityId ?? '';
    const hasFiles = hasFilesProp;
    const normalizedStatus = sourceMediaStatus.toLowerCase();
    const isSourceMediaReady = normalizedStatus === 'uploaded' || normalizedStatus === 'failed';
    const hasSelectedEpisodes = selectedEpisodes.length > 0;
    const canApprove = isSourceMediaReady && hasFiles && isAliasSaved && hasSelectedEpisodes && !approvingUpload;
    const fileBrowserAvailable = Boolean(resolvedIdentityId && sourceMediaId && isSourceMediaReady && hasFiles);

    // Debug: Log the enabling conditions
    console.log('Approve button conditions:', {
        sourceMediaStatus,
        isSourceMediaReady,
        fileStatuses,
        hasFiles,
        hasSelectedEpisodes,
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

    const handleEpisodeSelectionChange = (episodes: { season: number; episode: number }[]) => {
        setSelectedEpisodes(episodes);
        console.log('Selected episodes updated:', episodes);
    };

    const handleApproveUpload = async () => {
        if (!sourceMediaId || !canApprove) return;

        setApprovingUpload(true);
        try {
            // Prepare the request body with the selected episodes
            const requestBody: any = {
                sourceMediaId,
                episodes: selectedEpisodes
            };

            console.log('Sending selected episodes to backend:', selectedEpisodes);
            
            // Call the backend function to approve and start processing
            // This would typically trigger the indexing process
            await API.post('publicapi', '/sourceMedia/approve', {
                body: requestBody
            });
            
            setSeverity('success');
            setMessage(`Upload approved! Processing will begin shortly${selectedEpisodes.length > 0 ? ` for ${selectedEpisodes.length} selected episode${selectedEpisodes.length !== 1 ? 's' : ''}.` : '.'}`);
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
                        Loading details...
                    </Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!loading && hasFiles && (
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
                        {!hasSelectedEpisodes && isSourceMediaReady && (
                            <Typography variant="body2" color="warning.main" sx={{ ml: 2, alignSelf: 'center' }}>
                                Choose seasons or episodes to approve
                            </Typography>
                        )}
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
                                    disabled={isAliasDisabled || !isSourceMediaReady}
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
                                    Please save an alias before approving the upload.
                                </Alert>
                            )}
                            {(isAliasDisabled || !isSourceMediaReady) && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Alias field is disabled after approval has been initiated.
                                </Alert>
                            )}
                            {pendingAlias && !isAliasDisabled && isNewAlias && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    This alias does not exist. If you proceed, this alias will be created and linked after approval and indexing..
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
            <Box sx={{ my: 2 }}>
                {fileBrowserAvailable ? (
                    <FileBrowser
                        pathPrefix={`protected/${resolvedIdentityId}`}
                        id={sourceMediaId || ''}
                        base64Columns={['subtitle_text']}
                        srcEditor
                        aliasName={aliasNameForBrowser}
                        isExistingAlias={isExistingAliasForBrowser}
                        onEpisodeSelectionChange={handleEpisodeSelectionChange}
                    />
                ) : (
                    <FileBrowserPlaceholder
                        sourceMediaStatus={sourceMediaStatus}
                        identityId={resolvedIdentityId}
                        sourceMediaId={sourceMediaId}
                        hasFiles={hasFiles}
                    />
                )}
            </Box>


            {!loading && !hasFiles && !error && (
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

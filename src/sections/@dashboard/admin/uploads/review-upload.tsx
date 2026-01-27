
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
    Button,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Checkbox,
    Stack
} from "@mui/material";
import {
    Save as SaveIcon,
    CheckCircle as ApproveIcon,
    PublishedWithChanges as ReindexIcon
} from "@mui/icons-material";
import { API, Auth } from "aws-amplify";
import { FileBrowser } from "../../@components";
import listAliases from "./functions/list-aliases";
import updateSourceMedia from "./functions/update-source-media";
import { useEffect, useState, useContext, useMemo, type Dispatch, type SetStateAction } from "react";
import { SnackbarContext } from "../../../../SnackbarContext";
import { SeasonEpisodeSelection, compareEpisodeIds, formatSeasonEpisodeLabel } from "../../../../types/episodes";

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

const sortEpisodeSelections = (episodes: SeasonEpisodeSelection[]): SeasonEpisodeSelection[] =>
    [...episodes].sort((a, b) => {
        if (a.season !== b.season) {
            return a.season - b.season;
        }
        return compareEpisodeIds(a.episode, b.episode);
    });

const formatEpisodeSelectionSummary = (episodes: SeasonEpisodeSelection[]): string => {
    if (!episodes.length) {
        return '';
    }

    return sortEpisodeSelections(episodes)
        .map(selection => formatSeasonEpisodeLabel(selection))
        .join(', ');
};

// Placeholder component that mimics FileBrowser appearance
const FileBrowserPlaceholder = ({
    sourceMediaStatus,
    identityId,
    sourceMediaId
}: {
    sourceMediaStatus?: string;
    identityId?: string | null;
    sourceMediaId?: string | null;
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
    const [selectedEpisodes, setSelectedEpisodes] = useState<SeasonEpisodeSelection[]>([]);
    const [openApproveDialog, setOpenApproveDialog] = useState(false);
    const [useEmailNotifications, setUseEmailNotifications] = useState(false);
    const [emailAddresses, setEmailAddresses] = useState<string[]>([]);
    
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

    useEffect(() => {
        let isMounted = true;

        Auth.currentUserInfo()
            .then((user) => {
                if (!isMounted) {
                    return;
                }

                const userEmail = user?.attributes?.email;
                if (userEmail) {
                    setEmailAddresses([userEmail]);
                }
            })
            .catch((authError) => {
                console.error('Failed to load current user email:', authError);
            });

        return () => {
            isMounted = false;
        };
    }, []);

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
    const normalizedStatus = sourceMediaStatus.toLowerCase();
    const isSourceMediaReady = normalizedStatus === 'uploaded' || normalizedStatus === 'failed';
    const isSourceMediaUploaded = normalizedStatus === 'uploaded';
    const hasSelectedEpisodes = selectedEpisodes.length > 0;
    const canApprove = isSourceMediaUploaded && isAliasSaved && hasSelectedEpisodes && !approvingUpload;
    const fileBrowserAvailable = Boolean(resolvedIdentityId && sourceMediaId && isSourceMediaUploaded);
    const isProcessingState = ['indexing', 'pending', 'processing'].includes(normalizedStatus);
    const shouldShowActions = ['uploaded', 'awaitingindexing', 'published', 'failed'].includes(normalizedStatus);

    // Debug: Log the enabling conditions
    console.log('Approve button conditions:', {
        sourceMediaStatus,
        isSourceMediaReady,
        fileStatuses,
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

    const handleOpenApproveDialog = () => {
        if (!canApprove) {
            return;
        }
        setOpenApproveDialog(true);
    };

    const handleCancelApproveDialog = () => {
        setOpenApproveDialog(false);
        setUseEmailNotifications(false);
    };

    const handleConfirmApprove = async () => {
        const emailsToSend = useEmailNotifications && emailAddresses.length > 0 ? emailAddresses : [];
        await handleApproveUpload(emailsToSend);
    };

    const handleEpisodeSelectionChange = (episodes: SeasonEpisodeSelection[]) => {
        setSelectedEpisodes(episodes);
        console.log('Selected episodes updated:', episodes);
    };

    const handleApproveUpload = async (emails: string[] = []) => {
        if (!sourceMediaId || !canApprove) return;

        setApprovingUpload(true);
        setOpenApproveDialog(false);
        try {
            // Prepare the request body with the selected episodes
            const requestBody: {
                sourceMediaId: string;
                episodes: SeasonEpisodeSelection[];
                emailAddresses?: string[];
            } = {
                sourceMediaId,
                episodes: selectedEpisodes
            };

            if (emails.length > 0) {
                requestBody.emailAddresses = emails;
            }

            console.log('Sending selected episodes to backend:', selectedEpisodes);
            
            // Call the backend function to approve and start processing
            // This would typically trigger the indexing process
            await API.post('publicapi', '/sourceMedia/approve', {
                body: requestBody
            });
            
            setSeverity('success');
            const summary = formatEpisodeSelectionSummary(selectedEpisodes);
            setMessage(
                summary
                    ? `Upload approved! Processing will begin shortly for ${summary}.`
                    : 'Upload approved! Processing will begin shortly.'
            );
            setOpen(true);
        } catch (err) {
            console.error('Failed to approve upload:', err);
            setSeverity('error');
            setMessage('Failed to approve upload. Please try again.');
            setOpen(true);
        } finally {
            setApprovingUpload(false);
            setUseEmailNotifications(false);
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

            {isProcessingState && (
                <Box sx={{ mb: 3 }}>
                    <LinearProgress color="primary" sx={{ borderRadius: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This process may take a few minutes...
                    </Typography>
                </Box>
            )}

            {!loading && shouldShowActions && (
                <>
                    {/* Approve Upload Button */}
                    <Box sx={{ mb: hasSelectedEpisodes ? 1 : 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'left', flexWrap: 'wrap', gap: 2 }}>
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
                                onClick={handleOpenApproveDialog}
                                disabled={!canApprove}
                                color="success"
                            >
                                {approvingUpload ? 'Approving...' : 'Approve Upload'}
                            </Button>
                            {!hasSelectedEpisodes && isSourceMediaReady && (
                                <Typography variant="body2" color="warning.main" sx={{ alignSelf: 'center' }}>
                                    Choose seasons or episodes to approve
                                </Typography>
                            )}
                            {showIndexButton && (
                                <Button
                                    variant="contained"
                                    size="medium"
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
                        {hasSelectedEpisodes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Selected episodes: {formatEpisodeSelectionSummary(selectedEpisodes)}
                            </Typography>
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
                        />
                )}
            </Box>

            <Dialog open={openApproveDialog} onClose={handleCancelApproveDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Send update notifications?</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant="body1">
                                Approving this upload will begin processing the selected episodes.
                            </Typography>
                            {selectedEpisodes.length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Episodes: {formatEpisodeSelectionSummary(selectedEpisodes)}
                                </Typography>
                            )}
                        </Box>
                        <Typography variant="body1">
                            Would you like to receive email updates while it runs?
                        </Typography>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={useEmailNotifications}
                                    onChange={() => setUseEmailNotifications((prev) => !prev)}
                                    color="primary"
                                    disabled={emailAddresses.length === 0}
                                />
                            }
                            label={
                                emailAddresses.length > 0
                                    ? `Send updates to ${emailAddresses.join(', ')}`
                                    : 'No email available for notifications'
                            }
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCancelApproveDialog} color="inherit" variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmApprove}
                        variant="contained"
                        color="success"
                        startIcon={approvingUpload ? <CircularProgress size={16} color="inherit" /> : <ApproveIcon />}
                        disabled={approvingUpload}
                    >
                        {approvingUpload ? 'Approving...' : 'Approve Upload'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button,
    Typography,
    Box,
    Chip,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert
} from "@mui/material";
import { API, graphqlOperation } from "aws-amplify";
import { DetailedSourceMedia } from "../types";
import getSourceMediaDetails from "../functions/get-source-media-details";

interface ListFilesForSourceMediaResponse {
    data?: {
        listFiles?: {
            items?: Array<{ id: string | null; status?: string | null }>;
            nextToken?: string | null;
        };
    };
}

const listFilesForSourceMediaQuery = /* GraphQL */ `
  query ListFilesForSourceMedia($filter: ModelFileFilterInput, $limit: Int, $nextToken: String) {
    listFiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        status
      }
      nextToken
    }
  }
`;

const FILES_PAGE_SIZE = 500;

interface StatusCount {
    key: string;
    label: string;
    count: number;
}

const formatStatusLabelForDisplay = (status: string): string => {
    const normalized = status
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2');

    return normalized
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ') || 'Unknown';
};

const buildStatusCounts = (items?: Array<{ status?: string | null }>): StatusCount[] => {
    const counts: Record<string, StatusCount> = {};

    (items ?? []).forEach(item => {
        const rawStatus = item?.status ?? 'Unknown';
        const key = rawStatus.toLowerCase();

        if (!counts[key]) {
            counts[key] = {
                key,
                label: rawStatus,
                count: 0,
            };
        }

        counts[key].count += 1;
    });

    return Object.values(counts).sort((a, b) =>
        formatStatusLabelForDisplay(a.label).localeCompare(formatStatusLabelForDisplay(b.label))
    );
};

interface SourceMediaDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    sourceMediaId: string | null;
}

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
        case 'extracted':
            return 'success';
        case 'extracting':
            return 'info';
        case 'extractionFailed':
            return 'error';
        case 'uploaded':
            return 'warning';
        case 'awaitingindexing':
            return 'warning';
        case 'indexing':
            return 'primary';
        case 'published':
            return 'success';
        case 'failed':
            return 'error';
        case 'completed':
            return 'success';
        case 'processing':
            return 'primary';
        case 'pending':
            return 'info';
        default:
            return 'default';
    }
};

const formatDate = (dateString: string): string => 
    new Date(dateString).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function SourceMediaDetailsDialog({ open, onClose, sourceMediaId }: SourceMediaDetailsDialogProps) {
    const navigate = useNavigate();
    const [sourceMedia, setSourceMedia] = useState<DetailedSourceMedia | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalFilesCount, setTotalFilesCount] = useState<number | null>(null);
    const [filesCountLoading, setFilesCountLoading] = useState(false);
    const [fileStatusCounts, setFileStatusCounts] = useState<StatusCount[]>([]);
    const fallbackStatusCounts = buildStatusCounts(sourceMedia?.files?.items);
    const fallbackFileCount = fallbackStatusCounts.reduce((total, status) => total + status.count, 0);

    const renderStatusCounts = (counts: StatusCount[]) => (
        counts.map(status => (
            <Box
                key={status.key}
                display="flex"
                alignItems="center"
                sx={{ mt: 1 }}
            >
                <Chip
                    label={formatStatusLabelForDisplay(status.label)}
                    color={getStatusColor(status.label)}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                />
                <Typography variant="body2">
                    {status.count.toLocaleString()} file{status.count === 1 ? '' : 's'}
                </Typography>
            </Box>
        ))
    );

    useEffect(() => {
        let isMounted = true;

        if (open && sourceMediaId) {
            setLoading(true);
            setError(null);
            setSourceMedia(null);
            setTotalFilesCount(null);
            setFileStatusCounts([]);

            const fetchDetails = async () => {
                try {
                    const data = await getSourceMediaDetails(sourceMediaId);
                    if (!isMounted) {
                        return;
                    }
                    setSourceMedia(data);
                } catch (err) {
                    if (!isMounted) {
                        return;
                    }
                    console.error('Error fetching source media details:', err);
                    setError('Failed to load source media details');
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            };

            const fetchFileCount = async () => {
                setFilesCountLoading(true);
                let nextToken: string | null | undefined;
                let count = 0;
                const statusItems: Array<{ status?: string | null }> = [];

                try {
                    do {
                        const response = await API.graphql<ListFilesForSourceMediaResponse>(
                            graphqlOperation(listFilesForSourceMediaQuery, {
                                filter: { sourceMediaFilesId: { eq: sourceMediaId } },
                                limit: FILES_PAGE_SIZE,
                                nextToken,
                            })
                        ) as ListFilesForSourceMediaResponse;

                        const connection = response.data?.listFiles;
                        const items = connection?.items ?? [];
                        count += items.filter(item => Boolean(item?.id)).length;
                        items.forEach(item => {
                            if (item?.id) {
                                statusItems.push({ status: item?.status });
                            }
                        });
                        nextToken = connection?.nextToken ?? null;
                    } while (nextToken);

                    if (!isMounted) {
                        return;
                    }
                    setTotalFilesCount(count);
                    setFileStatusCounts(buildStatusCounts(statusItems));
                } catch (err) {
                    if (!isMounted) {
                        return;
                    }
                    console.error('Error fetching file count:', err);
                    setError(current => current ?? 'Failed to load file count');
                } finally {
                    if (isMounted) {
                        setFilesCountLoading(false);
                    }
                }
            };

            fetchDetails();
            fetchFileCount();
        }

        return () => {
            isMounted = false;
        };
    }, [open, sourceMediaId]);

    const handleClose = () => {
        setSourceMedia(null);
        setError(null);
        setLoading(false);
        setTotalFilesCount(null);
        setFilesCountLoading(false);
        setFileStatusCounts([]);
        onClose();
    };

    const handleBeginReview = () => {
        navigate(`/dashboard/review-upload?sourceMediaId=${sourceMediaId}`);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Source Media Details
                {sourceMedia && (
                    <Chip
                        label={sourceMedia.status}
                        color={getStatusColor(sourceMedia.status)}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 2 }}
                    />
                )}
            </DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <CircularProgress />
                        <Typography variant="body1" sx={{ ml: 2 }}>
                            Loading details...
                        </Typography>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {sourceMedia && (
                    <Box>
                        {/* Files - Moved to top */}
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Files
                                        </Typography>
                                        {filesCountLoading ? (
                                            <Box display="flex" alignItems="center">
                                                <CircularProgress size={20} />
                                                <Typography variant="body2" sx={{ ml: 1 }}>
                                                    Counting files...
                                                </Typography>
                                            </Box>
                                        ) : totalFilesCount !== null ? (
                                            <Box>
                                                <Typography variant="body2">
                                                    {totalFilesCount.toLocaleString()} file{totalFilesCount === 1 ? '' : 's'}
                                                </Typography>
                                                {fileStatusCounts.length > 0 && renderStatusCounts(fileStatusCounts)}
                                            </Box>
                                        ) : fallbackFileCount > 0 ? (
                                            <Box>
                                                <Typography variant="body2">
                                                    {fallbackFileCount.toLocaleString()} file{fallbackFileCount === 1 ? '' : 's'} (partial list)
                                                </Typography>
                                                {renderStatusCounts(fallbackStatusCounts)}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                No files found
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Basic Info */}
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Basic Information
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            ID: {sourceMedia.id}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Identity ID: {sourceMedia.identityId}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Created:</strong> {formatDate(sourceMedia.createdAt)}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Updated:</strong> {formatDate(sourceMedia.updatedAt)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* User Info */}
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            User Information
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Username:</strong> {sourceMedia.user.username}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Email:</strong> {sourceMedia.user.email}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Status:</strong> {sourceMedia.user.status}
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Credits:</strong> {sourceMedia.user.credits}
                                        </Typography>
                                        {sourceMedia.user.subscriptionStatus && (
                                            <Typography variant="body2" gutterBottom>
                                                <strong>Subscription:</strong> {sourceMedia.user.subscriptionStatus}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Series Info */}
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Series Information
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={8}>
                                                <Typography variant="body1" gutterBottom>
                                                    <strong>{sourceMedia.series.name}</strong>
                                                    {sourceMedia.series.year && ` (${sourceMedia.series.year})`}
                                                </Typography>
                                                {sourceMedia.series.description && (
                                                    <Typography variant="body2" color="text.secondary" paragraph>
                                                        {sourceMedia.series.description}
                                                    </Typography>
                                                )}
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>Slug:</strong> {sourceMedia.series.slug}
                                                </Typography>
                                                {sourceMedia.series.tvdbid && (
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>TVDB ID:</strong> {sourceMedia.series.tvdbid}
                                                    </Typography>
                                                )}
                                                {sourceMedia.series.statusText && (
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>Status:</strong> {sourceMedia.series.statusText}
                                                    </Typography>
                                                )}
                                            </Grid>
                                            {sourceMedia.series.image && (
                                                <Grid item xs={12} md={4}>
                                                    <img
                                                        src={sourceMedia.series.image}
                                                        alt={sourceMedia.series.name}
                                                        style={{
                                                            width: '100%',
                                                            maxWidth: 200,
                                                            height: 'auto',
                                                            borderRadius: 8
                                                        }}
                                                    />
                                                </Grid>
                                            )}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
                <Button 
                    variant="contained" 
                    onClick={handleBeginReview}
                    sx={{ ml: 1 }}
                >
                    Begin Review
                </Button>
            </DialogActions>
        </Dialog>
    );
}

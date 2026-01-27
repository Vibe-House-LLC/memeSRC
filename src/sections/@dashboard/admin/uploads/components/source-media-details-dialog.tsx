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
import { DetailedSourceMedia } from "../types";
import getSourceMediaDetails from "../functions/get-source-media-details";

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

    useEffect(() => {
        let isMounted = true;

        if (open && sourceMediaId) {
            setLoading(true);
            setError(null);
            setSourceMedia(null);

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

            fetchDetails();
        }

        return () => {
            isMounted = false;
        };
    }, [open, sourceMediaId]);

    const handleClose = () => {
        setSourceMedia(null);
        setError(null);
        setLoading(false);
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
                        <Grid container spacing={3}>
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

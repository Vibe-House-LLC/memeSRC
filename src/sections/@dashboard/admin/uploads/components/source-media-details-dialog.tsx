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
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { Storage } from "aws-amplify";
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
    const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open && sourceMediaId) {
            setLoading(true);
            setError(null);
            setSourceMedia(null);
            
            getSourceMediaDetails(sourceMediaId)
                .then((data) => {
                    setSourceMedia(data);
                })
                .catch((err) => {
                    console.error('Error fetching source media details:', err);
                    setError('Failed to load source media details');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [open, sourceMediaId]);

    const handleClose = () => {
        setSourceMedia(null);
        setError(null);
        setDownloadingFiles(new Set());
        onClose();
    };

    const handleBeginReview = () => {
        navigate(`/dashboard/review-upload?sourceMediaId=${sourceMediaId}`);
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
                                            Files ({sourceMedia.files.items.length})
                                        </Typography>
                                        {sourceMedia.files.items.length > 0 ? (
                                            <List dense>
                                                {sourceMedia.files.items.map((file) => (
                                                    <ListItem 
                                                        key={file.id} 
                                                        divider
                                                        secondaryAction={
                                                            <Tooltip title="Download File">
                                                                <IconButton
                                                                    edge="end"
                                                                    onClick={() => handleDownloadFile(file.key, file.id)}
                                                                    disabled={downloadingFiles.has(file.id)}
                                                                    color="primary"
                                                                >
                                                                    {downloadingFiles.has(file.id) ? (
                                                                        <CircularProgress size={20} />
                                                                    ) : (
                                                                        <DownloadIcon />
                                                                    )}
                                                                </IconButton>
                                                            </Tooltip>
                                                        }
                                                    >
                                                        <ListItemText
                                                            primary={file.key}
                                                            secondary={
                                                                <Box>
                                                                    <Typography variant="caption" display="block">
                                                                        Status: 
                                                                        <Chip
                                                                            label={file.status}
                                                                            color={getStatusColor(file.status)}
                                                                            size="small"
                                                                            variant="outlined"
                                                                            sx={{ ml: 1, height: 16 }}
                                                                        />
                                                                    </Typography>
                                                                    <Typography variant="caption" display="block">
                                                                        Created: {formatDate(file.createdAt)}
                                                                    </Typography>
                                                                    <Typography variant="caption" display="block">
                                                                        Updated: {formatDate(file.updatedAt)}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
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
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, Button, Container, Typography, Chip, Alert } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import AdminReviewUpload from "src/sections/@dashboard/admin/uploads/review-upload";
import { SourceMediaFile, DetailedSourceMedia } from "src/sections/@dashboard/admin/uploads/types";
import { getAllSourceMediaFiles } from "src/sections/@dashboard/admin/uploads/functions/get-source-media-files";
import getSourceMediaDetails from "src/sections/@dashboard/admin/uploads/functions/get-source-media-details";

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'success';
        case 'processing':
            return 'info';
        case 'failed':
            return 'error';
        case 'uploaded':
            return 'warning';
        default:
            return 'default';
    }
};

export default function AdminFileReview() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sourceMediaId = searchParams.get('sourceMediaId');
    
    const [files, setFiles] = useState<SourceMediaFile[]>([]);
    const [sourceMedia, setSourceMedia] = useState<DetailedSourceMedia | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
    const [extractingFiles, setExtractingFiles] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!sourceMediaId) {
            setError('No source media ID provided');
            return;
        }

        setLoading(true);
        setError(null);

        Promise.all([
            getAllSourceMediaFiles(sourceMediaId),
            getSourceMediaDetails(sourceMediaId)
        ])
            .then(([filesData, sourceMediaData]) => {
                setFiles(filesData);
                setSourceMedia(sourceMediaData);
            })
            .catch((err) => {
                console.error('Error fetching data:', err);
                setError('Failed to load source media files');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [sourceMediaId]);

    const handleBack = () => {
        navigate('/dashboard/view-uploads');
    };

    if (!sourceMediaId) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">
                    No source media ID provided. Please select a source media to review.
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    sx={{ mb: 2 }}
                >
                    Back to Uploads
                </Button>

                <Typography variant="h4" gutterBottom>
                    Review Upload
                </Typography>

                {sourceMedia && (
                    <Box>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            {sourceMedia.series.name}
                            {sourceMedia.series.year && ` (${sourceMedia.series.year})`}
                        </Typography>
                        <Chip
                            label={sourceMedia.status}
                            color={getStatusColor(sourceMedia.status)}
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                )}
            </Box>
            
            <AdminReviewUpload 
                files={files}
                loading={loading}
                error={error}
                downloadingFiles={downloadingFiles}
                extractingFiles={extractingFiles}
                setDownloadingFiles={setDownloadingFiles}
                setExtractingFiles={setExtractingFiles}
                setError={setError}
            />
        </Container>
    );
}
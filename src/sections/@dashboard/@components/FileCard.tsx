import React, { useState } from 'react';
import {
    Box,
    ListItem,
    ListItemText,
    Button,
    Chip,
    Tooltip,
    CircularProgress,
    Typography,
    Divider
} from '@mui/material';
import {
    Download as DownloadIcon,
    CloudUpload as ExtractIcon,
    CheckCircle as SelectIcon,
    RadioButtonUnchecked as UnselectIcon
} from '@mui/icons-material';
import { SourceMediaFile } from '../admin/uploads/types';
import { API } from 'aws-amplify';

// Extended interface to include unzippedPath for file cards
export interface FileCardData extends SourceMediaFile {
    unzippedPath?: string | null;
}

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

const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export interface FileCardProps {
    file: FileCardData;
    isDownloading: boolean;
    isExtracting: boolean;
    isAliasSaved: boolean;
    isSelected?: boolean;
    onDownload: (fileKey: string, fileId: string) => void;
    onExtract: (fileKey: string, fileId: string) => void;
    onSelect?: (fileId: string, unzippedPath: string | null) => void;
    showDivider?: boolean;
}

export default function FileCard({
    file,
    isDownloading,
    isExtracting,
    isAliasSaved,
    isSelected = false,
    onDownload,
    onExtract,
    onSelect,
    showDivider = false
}: FileCardProps) {
    const fileName = file.key.split('/').pop() || file.key;
    const hasUnzippedPath = Boolean(file.unzippedPath);
    const [openExtractModal, setOpenExtractModal] = useState(false);
    const [useEmail, setUseEmail] = useState(false);
    const [emailAddresses, setEmailAddresses] = useState<string[]>([]);

    const handleSelectClick = () => {
        if (onSelect && hasUnzippedPath) {
            onSelect(file.id, isSelected ? null : file.unzippedPath || null);
        }
    };

    const handleExtractClick = async () => {
        setOpenExtractModal(true);
    };

    const handleExtract = async () => {
        if (!hasUnzippedPath) {
            await API.post('memesrcContentApi', '/sourceMedia/extract', {
                body: {
                    fileId: file.id,
                    emailAddresses: ['test@test.com']
                }
            });
        }
    };


    return (
        <Box key={file.id}>
            <ListItem
                sx={{
                    px: 0,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    backgroundColor: isSelected ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    border: isSelected ? 1 : 0,
                    borderColor: isSelected ? 'primary.main' : 'transparent'
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ListItemText
                        primary={
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {fileName}
                            </Typography>
                        }
                        secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Chip
                                    label={file.status}
                                    color={getStatusColor(file.status)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.75rem' }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Updated: {formatDate(file.updatedAt)}
                                </Typography>
                            </Box>
                        }
                    />
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {onSelect && (
                        <Tooltip title={hasUnzippedPath ? (isSelected ? "Deselect File" : "Select File") : "No extracted files available"}>
                            <Button
                                variant={isSelected ? "contained" : "outlined"}
                                size="small"
                                startIcon={
                                    isSelected ? (
                                        <SelectIcon />
                                    ) : (
                                        <UnselectIcon />
                                    )
                                }
                                onClick={handleSelectClick}
                                disabled={!hasUnzippedPath}
                                color={isSelected ? "primary" : "inherit"}
                                sx={{ minWidth: 80 }}
                            >
                                {isSelected ? "Selected" : "Select"}
                            </Button>
                        </Tooltip>
                    )}
                    
                    <Tooltip title="Download File">
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                                isDownloading ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <DownloadIcon />
                                )
                            }
                            onClick={() => onDownload(file.key, file.id)}
                            disabled={isDownloading}
                            sx={{ minWidth: 100 }}
                        >
                            Download
                        </Button>
                    </Tooltip>

                    <Tooltip title="Extract to Staging">
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                isExtracting ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <ExtractIcon />
                                )
                            }
                            onClick={() => handleExtractClick()}
                            disabled={isExtracting || !isAliasSaved || hasUnzippedPath}
                            sx={{ minWidth: 130 }}
                        >
                            Extract to Staging
                        </Button>
                    </Tooltip>
                </Box>
            </ListItem>
            {showDivider && <Divider />}
        </Box>
    );
}

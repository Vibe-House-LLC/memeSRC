import React, { useEffect, useState } from 'react';
import {
    Box,
    ListItem,
    ListItemText,
    Button,
    Chip,
    Tooltip,
    CircularProgress,
    Typography,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import {
    Download as DownloadIcon,
    CloudUpload as ExtractIcon,
    CheckCircle as SelectIcon,
    RadioButtonUnchecked as UnselectIcon
} from '@mui/icons-material';
import { SourceMediaFile } from '../admin/uploads/types';
import { API, Auth } from 'aws-amplify';

const onUpdateFile = /* GraphQL */ `
  subscription OnUpdateFile($filter: ModelSubscriptionFileFilterInput) {
    onUpdateFile(filter: $filter) {
      id
      key
      unzippedPath
      status
      __typename
    }
  }
`;

// Extended interface to include unzippedPath for file cards
export interface FileCardData extends SourceMediaFile {
    unzippedPath?: string | null;
}

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status?.toLowerCase()) {
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

export interface FileCardProps {
    file: FileCardData;
    isDownloading: boolean;
    isExtracting: boolean;
    isAliasSaved: boolean;
    isSelected?: boolean;
    onDownload: (fileKey: string, fileId: string) => void;
    onExtract: (fileKey: string, fileId: string) => void;
    onSelect?: (fileId: string, unzippedPath: string | null) => void;
    onError?: (error: any) => void;
    showDivider?: boolean;
}

export default function FileCard({
    file,
    isDownloading,
    isExtracting,
    isAliasSaved,
    isSelected = false,
    onDownload,
    onError,
    onExtract,
    onSelect,
    showDivider = false
}: FileCardProps) {
    const fileName = file.key.split('/').pop() || file.key;
    const hasUnzippedPath = Boolean(file.unzippedPath);
    const [startingExtraction, setStartingExtraction] = useState(false);
    const [openExtractModal, setOpenExtractModal] = useState(false);
    const [useEmail, setUseEmail] = useState(false);
    const [emailAddresses, setEmailAddresses] = useState<string[]>([]);
    const [fileStatus, setFileStatus] = useState(file.status);
    const [fileUpdatedAt, setFileUpdatedAt] = useState(file.updatedAt);
    const [unzippedPath, setUnzippedPath] = useState(file.unzippedPath);

    const useEmailAddress = () => {
        setUseEmail(!useEmail);
    }

    useEffect(() => {
        // TODO: Subscribe to file status changes
        let subscription: any;
        if (file?.id) {
            // Only subscribe if file has an id
            subscription = (API.graphql({
                query: onUpdateFile,
                variables: { filter: { id: { eq: file.id } } },
            }) as any).subscribe({
                next: ({ value }) => {
                    console.log('FILE STATUS UPDATED', value);
                    setFileStatus(value.data.onUpdateFile.status);
                    if (value.data.onUpdateFile.status === 'extractionFailed' || value.data.onUpdateFile.status === 'extracted') {
                        setStartingExtraction(false);
                    }
                    setFileUpdatedAt(new Date().toISOString());
                    if (value?.data?.onUpdateFile?.unzippedPath) {
                        setUnzippedPath(value.data.onUpdateFile.unzippedPath);
                        console.log('UNZIPPED PATH UPDATED', value.data.onUpdateFile.unzippedPath);
                    }
                },
                error: (error) => console.warn(error)
            });
        }
        return () => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        };
    }, [file]);

    useEffect(() => {
        Auth.currentUserInfo().then(user => {
            setEmailAddresses([user.attributes.email]);
        });
    }, [useEmail])

    const handleSelectClick = () => {
        if (onSelect && hasUnzippedPath) {
            onSelect(file.id, isSelected ? null : file.unzippedPath || null);
        }
    };

    const handleExtractClick = async () => {
        setOpenExtractModal(true);
    };

    const handleExtract = async () => {
        setStartingExtraction(true);
        setOpenExtractModal(false);
        
        if (!hasUnzippedPath) {
            await API.post('publicapi', '/sourceMedia/extract', {
                body: {
                    fileId: file.id,
                    emailAddresses: useEmail ? emailAddresses : []
                }
            }).then(() => {
                onExtract(file.key, file.id);
            }).catch((error) => {
                console.error('ERROR EXTRACTING FILE', error);
                setStartingExtraction(false);
                onError(error);
            })
            // console.log('FILE AND EMAIL ADDRESSES', file.id, useEmail ? emailAddresses : []);
            
            // setTimeout(() => {
            //     setStartingExtraction(false);
            // }, 2000);
        }
    };

    const handleCancelExtract = () => {
        setOpenExtractModal(false);
        setUseEmail(false);
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
                                    label={fileStatus}
                                    color={getStatusColor(fileStatus)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.75rem' }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Updated: {formatDate(fileUpdatedAt)}
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

                    <Tooltip title={hasUnzippedPath ? "File already extracted" : "Extract to Staging"}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                isExtracting || startingExtraction || fileStatus === 'extracting' ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <ExtractIcon />
                                )
                            }
                            onClick={() => handleExtractClick()}
                            disabled={isExtracting || !isAliasSaved || hasUnzippedPath || startingExtraction || fileStatus === 'extracting'}
                            sx={{ minWidth: 130 }}
                        >
                            {hasUnzippedPath ? 'Extracted' : (startingExtraction ? 'Starting...' : 'Extract to Staging')}
                        </Button>
                    </Tooltip>
                </Box>
            </ListItem>
            {showDivider && <Divider />}
            
            {/* Extraction Confirmation Modal */}
            <Dialog open={openExtractModal} onClose={handleCancelExtract} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Confirm File Extraction
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        Are you sure you want to extract <strong>{fileName}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This process may take several minutes depending on the file size.
                    </Typography>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={useEmail}
                                onChange={useEmailAddress}
                                color="primary"
                            />
                        }
                        label="Send me email notifications during extraction."
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={handleCancelExtract}
                        color="inherit"
                        variant="outlined"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExtract}
                        variant="contained"
                        color="primary"
                        disabled={startingExtraction}
                        startIcon={
                            startingExtraction ? (
                                <CircularProgress size={16} />
                            ) : (
                                <ExtractIcon />
                            )
                        }
                        sx={{ minWidth: 140 }}
                    >
                        {startingExtraction ? 'Starting...' : 'Start Extraction'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

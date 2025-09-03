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
    Checkbox,
    useTheme,
    useMediaQuery,
    Stack
} from '@mui/material';
import {
    Download as DownloadIcon,
    CloudUpload as ExtractIcon,
    CheckCircle as SelectIcon,
    RadioButtonUnchecked as UnselectIcon
} from '@mui/icons-material';
import { SourceMediaFile } from '../admin/uploads/types';
import { API, Auth, graphqlOperation } from 'aws-amplify';
import { getFile } from 'src/graphql/queries';

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
    onStatusUpdate?: (fileId: string, newStatus: string) => void;
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
    onStatusUpdate,
    showDivider = false
}: FileCardProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const fileName = file.key.split('/').pop() || file.key;
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
        // Subscribe to file status changes
        let subscription: any;
        
        // Only subscribe if file has an id and status is not already "extracted"
        if (file?.id && fileStatus !== 'extracted') {
            subscription = (API.graphql({
                query: onUpdateFile,
                variables: { filter: { id: { eq: file.id } } },
            }) as any).subscribe({
                next: ({ value }) => {
                    console.log('FILE STATUS UPDATED', value);
                    const newStatus = value.data.onUpdateFile.status;
                    setFileStatus(newStatus);
                    
                    // Notify parent component of status change
                    if (onStatusUpdate) {
                        onStatusUpdate(file.id, newStatus);
                    }
                    
                    if (newStatus === 'extractionFailed' || newStatus === 'extracted') {
                        setStartingExtraction(false);
                    }

                    if (newStatus === 'extracted') {
                        API.graphql<any>(
                            graphqlOperation(
                                getFile,
                                { id: file.id }
                            )
                        ).then((response) => {
                            setUnzippedPath(response.data.getFile.unzippedPath);
                        }).catch((error) => {
                            console.error('ERROR UPDATING FILE', error);
                        });
                    }

                    setFileUpdatedAt(new Date().toISOString());
                    if (value?.data?.onUpdateFile?.unzippedPath) {
                        setUnzippedPath(value.data.onUpdateFile.unzippedPath);
                        console.log('UNZIPPED PATH UPDATED', value.data.onUpdateFile.unzippedPath);
                    }
                    
                    // End subscription if status becomes "extracted"
                    if (newStatus === 'extracted' && subscription && typeof subscription.unsubscribe === 'function') {
                        console.log('Ending subscription for extracted file:', file.id);
                        subscription.unsubscribe();
                        subscription = null;
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
    }, [file, onStatusUpdate, fileStatus]);

    useEffect(() => {
        Auth.currentUserInfo().then(user => {
            setEmailAddresses([user.attributes.email]);
        });
    }, [useEmail])

    const handleSelectClick = () => {
        if (onSelect && unzippedPath) {
            onSelect(file.id, isSelected ? null : unzippedPath || null);
        }
    };

    const handleExtractClick = async () => {
        setOpenExtractModal(true);
    };

    const handleExtract = async () => {
        setStartingExtraction(true);
        setOpenExtractModal(false);
        
        if (!unzippedPath) {
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
                    px: isMobile ? 1 : 1.5,
                    py: isMobile ? 1.5 : 1.5,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? 1.5 : 2,
                    backgroundColor: isSelected ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    border: isSelected ? 1 : 0,
                    borderColor: isSelected ? 'primary.main' : 'transparent'
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                    <ListItemText
                        primary={
                            <Typography 
                                variant={isMobile ? "body2" : "body1"} 
                                sx={{ 
                                    fontWeight: 500,
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3
                                }}
                            >
                                {fileName}
                            </Typography>
                        }
                        secondary={
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1, 
                                mt: 0.5,
                                flexWrap: isMobile ? 'wrap' : 'nowrap'
                            }}>
                                <Chip
                                    label={fileStatus}
                                    color={getStatusColor(fileStatus)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                        height: isMobile ? 18 : 20, 
                                        fontSize: isMobile ? '0.7rem' : '0.75rem'
                                    }}
                                />
                                <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{ 
                                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                                        whiteSpace: isMobile ? 'normal' : 'nowrap'
                                    }}
                                >
                                    Updated: {formatDate(fileUpdatedAt)}
                                </Typography>
                            </Box>
                        }
                    />
                </Box>

                {/* Mobile: Stack buttons vertically, Desktop: Keep horizontal */}
                <Stack 
                    direction={isMobile ? "column" : "row"} 
                    spacing={isMobile ? 1 : 1}
                    sx={{ 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? 0 : 'auto'
                    }}
                >
                    {onSelect && (
                        <Tooltip title={unzippedPath ? (isSelected ? "Deselect File" : "Select File") : "No extracted files available"}>
                            {isMobile ? (
                                <Button
                                    variant={isSelected ? "contained" : "outlined"}
                                    size="medium"
                                    startIcon={
                                        isSelected ? (
                                            <SelectIcon />
                                        ) : (
                                            <UnselectIcon />
                                        )
                                    }
                                    onClick={handleSelectClick}
                                    disabled={!unzippedPath || fileStatus !== 'extracted'}
                                    color={isSelected ? "primary" : "inherit"}
                                    fullWidth
                                    sx={{ minHeight: 44 }}
                                >
                                    {isSelected ? "Selected" : "Select"}
                                </Button>
                            ) : (
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
                                    disabled={!unzippedPath || fileStatus !== 'extracted'}
                                    color={isSelected ? "primary" : "inherit"}
                                    sx={{ minWidth: 80 }}
                                >
                                    {isSelected ? "Selected" : "Select"}
                                </Button>
                            )}
                        </Tooltip>
                    )}
                    
                    <Tooltip title="Download File">
                        {isMobile ? (
                            <Button
                                variant="outlined"
                                size="medium"
                                startIcon={
                                    isDownloading ? (
                                        <CircularProgress size={20} />
                                    ) : (
                                        <DownloadIcon />
                                    )
                                }
                                onClick={() => onDownload(file.key, file.id)}
                                disabled={isDownloading}
                                fullWidth
                                sx={{ minHeight: 44 }}
                            >
                                Download
                            </Button>
                        ) : (
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
                        )}
                    </Tooltip>

                    <Tooltip title={fileStatus === 'extracted' ? "File already extracted" : "Extract to Staging"}>
                        {isMobile ? (
                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={
                                    isExtracting || startingExtraction || fileStatus === 'extracting' ? (
                                        <CircularProgress size={20} />
                                    ) : (
                                        <ExtractIcon />
                                    )
                                }
                                onClick={() => handleExtractClick()}
                                disabled={isExtracting || !isAliasSaved || fileStatus === 'extracted' || startingExtraction || fileStatus === 'extracting'}
                                fullWidth
                                sx={{ minHeight: 44 }}
                            >
                                {fileStatus === 'extracted' ? 'Extracted' : (startingExtraction ? fileStatus === 'extracting' ? 'Extracting...' : 'Starting...' : 'Extract')}
                            </Button>
                        ) : (
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
                                disabled={isExtracting || !isAliasSaved || fileStatus === 'extracted' || startingExtraction || fileStatus === 'extracting'}
                                sx={{ minWidth: 130 }}
                            >
                                {fileStatus === 'extracted' ? 'Extracted' : (startingExtraction ? fileStatus === 'extracting' ? 'Extracting...' : 'Starting...' : 'Extract to Staging')}
                            </Button>
                        )}
                    </Tooltip>
                </Stack>
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

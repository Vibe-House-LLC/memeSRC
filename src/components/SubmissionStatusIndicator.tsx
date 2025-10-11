import React, { useState } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  Stack,
  LinearProgress,
  Chip,
  Divider,
  Tooltip,
  alpha,
  useTheme,
  Button,
  CircularProgress,
} from '@mui/material';
import { 
  CloudUpload, 
  CheckCircle, 
  Error as ErrorIcon,
  PlayArrow,
  PauseCircleOutline,
  OpenInNew,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useActiveSubmissions } from '../hooks/useActiveSubmissions';

const isElectron = () => typeof window !== 'undefined' && window.process && window.process.type;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'processing':
      return '#3b82f6'; // blue
    case 'uploading':
      return '#8b5cf6'; // purple
    case 'uploaded':
      return '#10b981'; // green
    case 'processed':
      return '#10b981'; // green
    case 'error':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'processing':
      return 'Processing';
    case 'uploading':
      return 'Uploading';
    case 'uploaded':
      return 'Uploaded';
    case 'processed':
      return 'Processed';
    case 'error':
      return 'Error';
    default:
      return status;
  }
};

const SubmissionStatusIndicator: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { activeSubmissions, hasActiveSubmissions } = useActiveSubmissions();
  const theme = useTheme();
  const navigate = useNavigate();

  // Don't render if not in Electron
  if (!isElectron()) {
    return null;
  }

  // Get active IDs from sessionStorage to highlight current submission
  const getActiveProcessingId = () => {
    try {
      return sessionStorage.getItem('desktop-processing-active-job-id');
    } catch {
      return null;
    }
  };

  const getActiveUploadId = () => {
    try {
      return sessionStorage.getItem('desktop-upload-active-job-id');
    } catch {
      return null;
    }
  };

  const activeProcessingId = getActiveProcessingId();
  const activeUploadId = getActiveUploadId();

  // Filter out completed submissions and sort (active first, then newest)
  const inProgressSubmissions = activeSubmissions
    .filter(s => s.status !== 'uploaded' && s.status !== 'completed')
    .sort((a, b) => {
      // Active submission always first
      const aIsActive = a.id === activeProcessingId || a.id === activeUploadId;
      const bIsActive = b.id === activeProcessingId || b.id === activeUploadId;
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      
      // Otherwise sort by newest first (we don't have timestamps in the hook, so keep original order)
      return 0;
    });

  // Determine if there's an active submission
  const hasActiveSubmission = inProgressSubmissions.some(
    s => s.id === activeProcessingId || s.id === activeUploadId
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenSubmissionPage = () => {
    navigate('/desktop/process');
    handleClose();
  };

  const open = Boolean(anchorEl);
  const electronNoDragStyle = isElectron() ? { WebkitAppRegion: 'no-drag' as const } : {};

  return (
    <>
      <Tooltip title={inProgressSubmissions.length > 0 ? 'View submission status' : 'No active submissions'}>
        <IconButton
          onClick={handleClick}
          sx={{
            color: inProgressSubmissions.length > 0 ? theme.palette.primary.main : 'rgba(255,255,255,0.4)',
            ...electronNoDragStyle,
            transition: 'all 0.2s',
            '&:hover': {
              color: inProgressSubmissions.length > 0 ? theme.palette.primary.light : 'rgba(255,255,255,0.6)',
            },
          }}
          size="small"
        >
          <Badge
            badgeContent={inProgressSubmissions.length}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: theme.palette.primary.main,
                color: '#fff',
                animation: inProgressSubmissions.length > 0 ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': {
                    opacity: 1,
                  },
                  '50%': {
                    opacity: 0.7,
                  },
                },
              },
            }}
          >
            <CloudUpload />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            p: 0,
            mt: 1.5,
            ml: 0.75,
            minWidth: 400,
            maxWidth: 480,
            bgcolor: '#0a0a0a',
            backgroundImage: 'none',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
            border: '1px solid',
            borderColor: alpha(theme.palette.common.white, 0.26),
            borderRadius: 3,
          },
        }}
      >
        <Box sx={{ py: 2, px: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#fff',
              }}
            >
              Active Submissions
            </Typography>
            <Button
              size="small"
              endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
              onClick={handleOpenSubmissionPage}
              sx={{
                fontWeight: 600,
                fontSize: '0.7rem',
                textTransform: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#fff',
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                },
              }}
            >
              Open Page
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)' }} />

        <Box sx={{ p: 1.5 }}>

          {inProgressSubmissions.length === 0 ? (
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'rgba(139, 92, 246, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1.5,
                }}
              >
                <CloudUpload sx={{ fontSize: 32, color: '#8b5cf6', opacity: 0.5 }} />
              </Box>
              <Typography variant="body2" fontWeight={500} sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                No active submissions
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0.5} sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {inProgressSubmissions.map((submission, index) => {
                const isError = submission.status === 'error';
                const isActiveSubmission = submission.id === activeProcessingId || submission.id === activeUploadId;
                const isPaused = !isActiveSubmission && submission.status !== 'error' && submission.status !== 'processed';
                
                return (
                  <React.Fragment key={submission.id}>
                    {index > 0 && <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.06)', my: 0.5 }} />}
                    <Box
                      onClick={handleOpenSubmissionPage}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.02)',
                        border: 1,
                        borderColor: isActiveSubmission
                          ? 'rgba(139, 92, 246, 0.4)'
                          : isError
                            ? 'rgba(239, 68, 68, 0.3)'
                            : 'rgba(255, 255, 255, 0.08)',
                        boxShadow: isActiveSubmission 
                          ? '0 0 0 1px rgba(139, 92, 246, 0.2)'
                          : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.04)',
                          borderColor: isActiveSubmission
                            ? 'rgba(139, 92, 246, 0.6)'
                            : 'rgba(255, 255, 255, 0.15)',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {/* Status Icon */}
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: isActiveSubmission
                              ? 'rgba(139, 92, 246, 0.15)'
                              : isError
                                ? 'rgba(239, 68, 68, 0.15)'
                                : isPaused
                                  ? 'rgba(251, 146, 60, 0.15)'
                                  : 'rgba(139, 92, 246, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isActiveSubmission ? (
                            <CircularProgress size={20} thickness={3.5} sx={{ color: '#8b5cf6' }} />
                          ) : isError ? (
                            <ErrorIcon sx={{ fontSize: 20, color: '#ef4444' }} />
                          ) : isPaused ? (
                            <PauseCircleOutline sx={{ fontSize: 20, color: '#fb923c' }} />
                          ) : (
                            <PlayArrow sx={{ fontSize: 20, color: '#8b5cf6' }} />
                          )}
                        </Box>

                        {/* Info */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              mb: 0.25,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#fff',
                            }}
                          >
                            {submission.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.5)',
                              fontSize: '0.7rem',
                              display: 'block',
                            }}
                          >
                            {submission.seriesName}
                          </Typography>

                          {/* Progress */}
                          {!isError && typeof submission.progress === 'number' && (
                            <Box sx={{ mt: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.4}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  {getStatusLabel(submission.status)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: isActiveSubmission ? '#8b5cf6' : isPaused ? 'rgba(255, 255, 255, 0.4)' : '#8b5cf6',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {Math.round(submission.progress)}%
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={submission.progress}
                                sx={{
                                  height: 4,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: isActiveSubmission ? '#8b5cf6' : isPaused ? 'rgba(255, 255, 255, 0.2)' : '#8b5cf6',
                                    borderRadius: 1,
                                  },
                                }}
                              />
                            </Box>
                          )}

                          {/* Error */}
                          {submission.error && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#ef4444',
                                fontSize: '0.65rem',
                                display: 'block',
                                mt: 0.75,
                              }}
                            >
                              {submission.error}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  </React.Fragment>
                );
              })}
            </Stack>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default SubmissionStatusIndicator;


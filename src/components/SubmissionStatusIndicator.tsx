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
} from '@mui/material';
import { CloudUpload, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
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

  // Don't render if not in Electron
  if (!isElectron()) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const electronNoDragStyle = isElectron() ? { WebkitAppRegion: 'no-drag' as const } : {};

  return (
    <>
      <Tooltip title={hasActiveSubmissions ? 'View submission status' : 'No active submissions'}>
        <IconButton
          onClick={handleClick}
          sx={{
            color: hasActiveSubmissions ? '#8b5cf6' : 'rgba(255,255,255,0.4)',
            ...electronNoDragStyle,
            transition: 'all 0.2s',
            '&:hover': {
              color: hasActiveSubmissions ? '#a78bfa' : 'rgba(255,255,255,0.6)',
            },
          }}
          size="small"
        >
          <Badge
            badgeContent={activeSubmissions.filter(s => s.status !== 'uploaded').length}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#8b5cf6',
                color: '#fff',
                animation: hasActiveSubmissions ? 'pulse 2s infinite' : 'none',
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
        sx={{
          mt: 1.5,
          '& .MuiPopover-paper': {
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            minWidth: 380,
            maxWidth: 450,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#fff',
              mb: 2,
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Active Submissions
          </Typography>

          {!hasActiveSubmissions ? (
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <CloudUpload sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
              <Typography variant="body2">No active submissions</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {activeSubmissions.map((submission, index) => (
                <React.Fragment key={submission.id}>
                  {index > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#fff',
                            fontWeight: 500,
                            mb: 0.5,
                            fontSize: '0.875rem',
                          }}
                        >
                          {submission.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {submission.seriesName}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={getStatusLabel(submission.status)}
                        sx={{
                          backgroundColor: `${getStatusColor(submission.status)}20`,
                          color: getStatusColor(submission.status),
                          borderColor: getStatusColor(submission.status),
                          border: '1px solid',
                          fontSize: '0.7rem',
                          height: 22,
                          '& .MuiChip-label': {
                            px: 1,
                          },
                        }}
                      />
                    </Stack>

                    {submission.error ? (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#ef4444',
                            fontSize: '0.75rem',
                          }}
                        >
                          {submission.error}
                        </Typography>
                      </Stack>
                    ) : typeof submission.progress === 'number' ? (
                      <Box sx={{ mt: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.7rem',
                            }}
                          >
                            Progress
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: getStatusColor(submission.status),
                              fontWeight: 500,
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
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getStatusColor(submission.status),
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                    ) : null}
                  </Box>
                </React.Fragment>
              ))}
            </Stack>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default SubmissionStatusIndicator;


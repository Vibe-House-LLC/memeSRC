import { useState, useContext } from 'react';
import { 
  Box, 
  Button, 
  Collapse, 
  TextField, 
  Typography, 
  Checkbox,
  FormControlLabel,
  Paper,
  Chip,
  useMediaQuery,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ScienceIcon from '@mui/icons-material/Science';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';

// Utility function to hash username for localStorage
const hashString = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash * 33) - hash) + char;
    hash = Math.imul(hash, 1); // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
};

// Utility functions for localStorage preference management
const getCollagePreferenceKey = (user) => {
  if (!user?.userDetails?.email) return 'memeSRC-collage-preference-anonymous';
  const hashedUsername = hashString(user.userDetails.email);
  return `memeSRC-collage-preference-${hashedUsername}`;
};

const setCollagePreference = (user, preference) => {
  const key = getCollagePreferenceKey(user);
  localStorage.setItem(key, preference);
};

export default function EarlyAccessFeedback() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [expanded, setExpanded] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [emailConsent, setEmailConsent] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [emailConsentError, setEmailConsentError] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loadingSubmitStatus, setLoadingSubmitStatus] = useState(false);
  
  const { user } = useContext(UserContext);
  const { setOpen, setMessage: setSnackbarMessage, setSeverity } = useContext(SnackbarContext);

  // Handle reverting to legacy version
  const handleRevertToLegacy = () => {
    setCollagePreference(user, 'legacy');
    navigate('/collage-legacy?force=legacy');
  };

  // Close and reset
  const handleClose = () => {
    setExpanded(false);
    setMessageInput('');
    setEmailConsent(false);
    setFormSubmitted(false);
    setMessageError(false);
    setEmailConsentError(false);
  };

  const validateForm = () => {
    let isValid = true;

    if (messageInput.trim() === '') {
      setMessageError(true);
      isValid = false;
    } else {
      setMessageError(false);
    }

    if (!emailConsent) {
      setEmailConsentError(true);
      isValid = false;
    } else {
      setEmailConsentError(false);
    }

    return isValid;
  };

  const submitFeedback = async () => {
    setFormSubmitted(true);
    if (validateForm()) {
      setLoadingSubmitStatus(true);
      try {
        const feedbackMessage = `[COLLAGE TOOL FEEDBACK] ${messageInput}`;
        
        const response = await API.post('publicapi', '/user/update/proSupportMessage', {
          body: { message: feedbackMessage },
        });

        if (response.success) {
          setSnackbarMessage('Feedback submitted successfully! Thank you.');
          setSeverity('success');
          setOpen(true);
          handleClose();
        } else {
          setSnackbarMessage('Failed to submit feedback');
          setSeverity('error');
          setOpen(true);
        }
      } catch (error) {
        console.log(error);
        setSnackbarMessage(`${error}`);
        setSeverity('error');
        setOpen(true);
      }
      setLoadingSubmitStatus(false);
      setFormSubmitted(false);
    }
  };

  const handleMessageChange = (e) => {
    setMessageInput(e.target.value);
    if (formSubmitted) setMessageError(false);
  };

  const handleEmailConsentChange = (e) => {
    setEmailConsent(e.target.checked);
    if (formSubmitted) setEmailConsentError(false);
  };

  return (
    <Box sx={{ px: isMobile ? 1 : 0, mb: 2 }}>
      <Paper 
        elevation={6}
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          border: '1px solid rgba(255, 165, 0, 0.3)',
          boxShadow: '0 8px 32px rgba(255, 165, 0, 0.1)',
        }}
      >
        {/* Compact Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: isMobile ? 2 : 2.5,
          minHeight: 'auto',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 152, 0, 0.05)'
          }
        }}
        onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ScienceIcon sx={{ 
              fontSize: 28, 
              color: '#ff9800',
              filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.3))'
            }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 700, 
                  color: '#fff',
                  fontSize: isMobile ? '1.1rem' : '1.2rem'
                }}>
                  Early Access
                </Typography>
                <Chip 
                  label="BETA" 
                  size="small" 
                  sx={{ 
                    backgroundColor: '#ff9800',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.65rem',
                    height: 20
                  }} 
                />
              </Box>
              <Typography variant="body2" sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.8rem'
              }}>
                Still in progress. More to come!
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ 
            color: '#ff9800',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Typography variant="body2" sx={{ 
              color: '#ff9800',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              Options
            </Typography>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
        </Box>

        {/* Expanded Content */}
        <Collapse in={expanded}>
          <Box sx={{ 
            px: isMobile ? 2 : 2.5, 
            pb: isMobile ? 2 : 2.5,
            borderTop: '1px solid rgba(255, 165, 0, 0.2)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }}>
            {/* Quick Actions */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 2.5,
              pt: 2,
              flexWrap: 'wrap'
            }}>
              <Button
                onClick={handleRevertToLegacy}
                size="small"
                startIcon={<HistoryIcon />}
                sx={{ 
                  textTransform: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.8rem',
                  '&:hover': {
                    color: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Switch to classic version
              </Button>
            </Box>

            {/* Feedback Form */}
            <Box>
              <Typography variant="body2" sx={{ 
                color: '#fff', 
                mb: 1.5, 
                display: 'block',
                fontWeight: 600
              }}>
                Send Feedback
              </Typography>
              
              <TextField
                placeholder="Found a bug or have a suggestion?"
                multiline
                rows={2}
                value={messageInput}
                onChange={handleMessageChange}
                fullWidth
                size="small"
                sx={{ 
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 152, 0, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ff9800',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.6)',
                    opacity: 1,
                  },
                }}
                error={formSubmitted && messageError}
                helperText={formSubmitted && messageError ? 'Message required' : ''}
                FormHelperTextProps={{
                  sx: { color: '#ff5252' }
                }}
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailConsent}
                    onChange={handleEmailConsentChange}
                    size="small"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-checked': {
                        color: '#ff9800',
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.8rem'
                  }}>
                    OK to email me about this feedback
                  </Typography>
                }
                sx={{ mb: 1 }}
              />
              
              {formSubmitted && emailConsentError && (
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  mb: 1,
                  color: '#ff5252'
                }}>
                  Please consent to email contact
                </Typography>
              )}
              
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  onClick={handleClose}
                  size="small"
                  sx={{ 
                    textTransform: 'none', 
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Cancel
                </Button>
                <LoadingButton
                  loading={loadingSubmitStatus}
                  onClick={submitFeedback}
                  variant="contained"
                  size="small"
                  sx={{ 
                    textTransform: 'none',
                    backgroundColor: '#ff9800',
                    color: '#000',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#ffb74d',
                    },
                    '&:disabled': {
                      backgroundColor: 'rgba(255, 152, 0, 0.3)',
                    },
                  }}
                >
                  Send
                </LoadingButton>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
} 
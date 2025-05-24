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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
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
  
  // Switch feedback inline state
  const [showSwitchFeedback, setShowSwitchFeedback] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState('');
  const [switchEmailConsent, setSwitchEmailConsent] = useState(false);
  const [switchFormSubmitted, setSwitchFormSubmitted] = useState(false);
  const [switchLoadingSubmit, setSwitchLoadingSubmit] = useState(false);
  
  const { user } = useContext(UserContext);
  const { setOpen, setMessage: setSnackbarMessage, setSeverity } = useContext(SnackbarContext);

  // Handle reverting to legacy version
  const handleRevertToLegacy = () => {
    setShowSwitchFeedback(true);
  };

  const handleSwitchWithoutFeedback = () => {
    setCollagePreference(user, 'legacy');
    navigate('/collage-legacy?force=legacy');
  };

  const handleCancelSwitch = () => {
    setShowSwitchFeedback(false);
    setSwitchFeedback('');
    setSwitchEmailConsent(false);
    setSwitchFormSubmitted(false);
  };

  const submitSwitchFeedback = async () => {
    setSwitchFormSubmitted(true);
    
    if (switchFeedback.trim() !== '' && !switchEmailConsent) {
      // Show error for email consent if feedback is provided
      return;
    }
    
    setSwitchLoadingSubmit(true);
    
    try {
      if (switchFeedback.trim() !== '') {
        const feedbackMessage = `[SWITCHED TO CLASSIC] ${switchFeedback}`;
        
        await API.post('publicapi', '/user/update/proSupportMessage', {
          body: { message: feedbackMessage },
        });
      }
      
      // Switch to legacy regardless of feedback submission
      setCollagePreference(user, 'legacy');
      navigate('/collage-legacy?force=legacy');
      
    } catch (error) {
      console.log('Error submitting switch feedback:', error);
      // Still switch even if feedback fails
      setCollagePreference(user, 'legacy');
      navigate('/collage-legacy?force=legacy');
    }
    
    setSwitchLoadingSubmit(false);
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

    // Only require email consent if there's a message
    if (messageInput.trim() !== '' && !emailConsent) {
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
              {expanded ? 'Close' : 'Feedback'}
            </Typography>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
        </Box>

        {/* Expanded Content */}
        <Collapse in={expanded}>
          <Box sx={{ 
            borderTop: '1px solid rgba(255, 165, 0, 0.2)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}>
            {!showSwitchFeedback ? (
              <>
                {/* Quick Actions Section */}
                <Box sx={{ 
                  px: isMobile ? 2 : 2.5, 
                  py: 2,
                  borderBottom: '1px solid rgba(255, 165, 0, 0.1)'
                }}>
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    mb: 1.5,
                    fontWeight: 500,
                    fontSize: '0.85rem'
                  }}>
                    Quick Actions
                  </Typography>
                  <Button
                    onClick={handleRevertToLegacy}
                    size="small"
                    startIcon={<HistoryIcon />}
                    variant="outlined"
                    sx={{ 
                      textTransform: 'none',
                      borderColor: 'rgba(255, 152, 0, 0.5)',
                      color: '#ff9800',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      '&:hover': {
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        color: '#ffb74d'
                      }
                    }}
                  >
                    Switch to Classic Version
                  </Button>
                </Box>

                {/* Feedback Form Section */}
                <Box sx={{ 
                  px: isMobile ? 2 : 2.5, 
                  py: 2.5
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mb: 2 
                  }}>
                    <FeedbackIcon sx={{ 
                      fontSize: 20, 
                      color: '#ff9800' 
                    }} />
                    <Typography variant="body1" sx={{ 
                      color: '#fff', 
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}>
                      Send Feedback
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    mb: 2,
                    fontSize: '0.85rem',
                    lineHeight: 1.4
                  }}>
                    Help us improve by sharing bugs, suggestions, or feature requests.
                  </Typography>
                  
                  <TextField
                    placeholder="What would you like to tell us?"
                    multiline
                    rows={3}
                    value={messageInput}
                    onChange={handleMessageChange}
                    fullWidth
                    sx={{ 
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.25)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 152, 0, 0.6)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ff9800',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#fff',
                        fontSize: '0.9rem'
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                        opacity: 1,
                      },
                    }}
                    error={formSubmitted && messageError}
                    helperText={formSubmitted && messageError ? 'Please enter your feedback' : ''}
                    FormHelperTextProps={{
                      sx: { 
                        color: '#ff5252',
                        fontSize: '0.75rem'
                      }
                    }}
                  />
                  
                  {messageInput.trim() !== '' && (
                    <Box sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 2,
                      p: 1.5,
                      mb: 2,
                      border: emailConsentError ? '1px solid #ff5252' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={emailConsent}
                            onChange={handleEmailConsentChange}
                            size="small"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              '&.Mui-checked': {
                                color: '#ff9800',
                              },
                            }}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ 
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.85rem',
                            lineHeight: 1.4
                          }}>
                            I consent to being contacted via email about this feedback
                          </Typography>
                        }
                      />
                      
                      {formSubmitted && emailConsentError && (
                        <Typography variant="caption" sx={{ 
                          display: 'block', 
                          mt: 0.5,
                          color: '#ff5252',
                          fontSize: '0.75rem'
                        }}>
                          Email consent is required to submit feedback
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: isMobile ? 'stretch' : 'flex-end',
                    mt: 1
                  }}>
                    <LoadingButton
                      loading={loadingSubmitStatus}
                      onClick={submitFeedback}
                      variant="contained"
                      size="medium"
                      startIcon={<SendIcon />}
                      sx={{ 
                        textTransform: 'none',
                        backgroundColor: '#ff9800',
                        color: '#000',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        px: 3,
                        py: 1,
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                        minHeight: 42,
                        ...(isMobile ? { width: '100%' } : { minWidth: 140 }),
                        '&:hover': {
                          backgroundColor: '#ffb74d',
                          boxShadow: '0 6px 16px rgba(255, 152, 0, 0.4)',
                        },
                        '&:disabled': {
                          backgroundColor: 'rgba(255, 152, 0, 0.4)',
                          color: 'rgba(0, 0, 0, 0.6)',
                        },
                      }}
                    >
                      Send Feedback
                    </LoadingButton>
                  </Box>
                </Box>
              </>
            ) : (
              /* Switch to Classic Feedback Form */
              <Box sx={{ 
                px: isMobile ? 2 : 2.5, 
                py: 2
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 1.5 
                }}>
                  <HistoryIcon sx={{ 
                    fontSize: 20, 
                    color: '#ff9800' 
                  }} />
                  <Typography variant="body1" sx={{ 
                    color: '#fff', 
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}>
                    Switch to Classic Version
                  </Typography>
                </Box>
                
                <TextField
                  placeholder="What made you want to switch back? (optional)"
                  multiline
                  rows={3}
                  value={switchFeedback}
                  onChange={(e) => setSwitchFeedback(e.target.value)}
                  fullWidth
                  sx={{ 
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 152, 0, 0.6)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#ff9800',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: '#fff',
                      fontSize: '0.9rem'
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)',
                      opacity: 1,
                    },
                  }}
                />
                
                {switchFeedback.trim() !== '' && (
                  <Box sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 2,
                    p: 1.5,
                    mb: 1.5,
                    border: (switchFormSubmitted && switchFeedback.trim() !== '' && !switchEmailConsent) ? 
                      '1px solid #ff5252' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={switchEmailConsent}
                          onChange={(e) => setSwitchEmailConsent(e.target.checked)}
                          size="small"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            '&.Mui-checked': {
                              color: '#ff9800',
                            },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ 
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '0.85rem',
                          lineHeight: 1.4
                        }}>
                          I consent to being contacted via email about this feedback
                        </Typography>
                      }
                    />
                    
                    {switchFormSubmitted && switchFeedback.trim() !== '' && !switchEmailConsent && (
                      <Typography variant="caption" sx={{ 
                        display: 'block', 
                        mt: 0.5,
                        color: '#ff5252',
                        fontSize: '0.75rem'
                      }}>
                        Email consent is required when providing feedback
                      </Typography>
                    )}
                  </Box>
                )}
                
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  alignItems: 'center'
                }}>
                  <Button
                    onClick={handleCancelSwitch}
                    size="small"
                    startIcon={<ArrowBackIcon />}
                    sx={{ 
                      textTransform: 'none', 
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.8rem',
                      px: 1.5,
                      py: 0.5,
                      minWidth: 'auto',
                      '&:hover': {
                        color: '#fff',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    Back
                  </Button>
                  
                  <LoadingButton
                    loading={switchLoadingSubmit}
                    onClick={submitSwitchFeedback}
                    variant="contained"
                    size="medium"
                    sx={{ 
                      textTransform: 'none',
                      backgroundColor: '#ff9800',
                      color: '#000',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      px: 2.5,
                      py: 1,
                      borderRadius: 2,
                      boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                      flex: 1,
                      minHeight: 42,
                      '&:hover': {
                        backgroundColor: '#ffb74d',
                        boxShadow: '0 6px 16px rgba(255, 152, 0, 0.4)',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(255, 152, 0, 0.4)',
                        color: 'rgba(0, 0, 0, 0.6)',
                      },
                    }}
                  >
                    {switchFeedback.trim() === '' ? 'Skip & Switch' : 'Submit & Switch'}
                  </LoadingButton>
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
} 
import { useState, useContext } from 'react';
import { 
  Alert, 
  AlertTitle, 
  Box, 
  Button, 
  Collapse, 
  TextField, 
  Typography, 
  Checkbox,
  FormControlLabel,
  IconButton,
  Paper,
  Chip,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ScienceIcon from '@mui/icons-material/Science';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';

export default function EarlyAccessFeedback() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [expanded, setExpanded] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [emailConsent, setEmailConsent] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [emailConsentError, setEmailConsentError] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loadingSubmitStatus, setLoadingSubmitStatus] = useState(false);
  
  const { user } = useContext(UserContext);
  const { setOpen, setMessage: setSnackbarMessage, setSeverity } = useContext(SnackbarContext);

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
        // Append identifier to message to indicate it came from collage tool
        const feedbackMessage = `[COLLAGE TOOL FEEDBACK] ${messageInput}`;
        
        const response = await API.post('publicapi', '/user/update/proSupportMessage', {
          body: {
            message: feedbackMessage,
          },
        });

        if (response.success) {
          setSnackbarMessage('Collage feedback submitted successfully! Thank you for helping improve the tool.');
          setSeverity('success');
          setOpen(true);
          // Reset form
          setMessageInput('');
          setEmailConsent(false);
          setExpanded(false);
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
    if (formSubmitted) {
      setMessageError(false);
    }
  };

  const handleEmailConsentChange = (e) => {
    setEmailConsent(e.target.checked);
    if (formSubmitted) {
      setEmailConsentError(false);
    }
  };

  return (
    <Paper 
      elevation={6}
      sx={{ 
        mb: 3,
        borderRadius: 3,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        border: '1px solid rgba(255, 165, 0, 0.3)',
        boxShadow: '0 8px 32px rgba(255, 165, 0, 0.1)',
      }}
    >
      <Box sx={{ 
        p: isMobile ? 2 : 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '120px'
      }}>
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center', 
          justifyContent: 'space-between', 
          mb: expanded ? (isMobile ? 1.5 : 2) : 0,
          gap: isMobile ? 1.5 : 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScienceIcon sx={{ 
              fontSize: 38, 
              color: '#ff9800',
              filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.3))'
            }} />
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: isMobile ? '1.3rem' : '1.5rem'
              }}>
                Early Access
                <Chip 
                  label="BETA" 
                  size="small" 
                  sx={{ 
                    backgroundColor: '#ff9800',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }} 
                />
              </Typography>
              <Typography variant="body2" sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}>
                This is still in development. More to come!
              </Typography>
            </Box>
          </Box>
          
          <Button
            onClick={() => setExpanded(!expanded)}
            variant="outlined"
            size={isMobile ? "medium" : "small"}
            startIcon={<FeedbackIcon />}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            fullWidth={isMobile}
            sx={{
              color: '#ff9800',
              borderColor: '#ff9800',
              '&:hover': {
                borderColor: '#ffb74d',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
              },
              fontWeight: 600,
              borderRadius: 2,
              minWidth: isMobile ? 'auto' : 'fit-content',
              px: isMobile ? 2 : 3,
              py: isMobile ? 1 : 1.5,
            }}
          >
            Send Feedback
          </Button>
        </Box>

        {/* Feedback Form */}
        <Collapse in={expanded}>
          <Box sx={{ 
            mt: 3, 
            p: 3, 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 2,
            border: '1px solid rgba(255, 152, 0, 0.2)'
          }}>
            <Typography variant="subtitle1" sx={{ 
              color: '#fff', 
              mb: 2, 
              fontWeight: 600 
            }}>
              Help improve the Collage Tool
            </Typography>
            
            <TextField
              label="Your feedback"
              placeholder="Found a bug? Have a suggestion? Let know!"
              multiline
              rows={3}
              value={messageInput}
              onChange={handleMessageChange}
              fullWidth
              sx={{ 
                mb: 2,
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
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.8)',
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                },
              }}
              error={formSubmitted && messageError}
              helperText={formSubmitted && messageError ? 'Feedback message is required' : ''}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={emailConsent}
                  onChange={handleEmailConsentChange}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&.Mui-checked': {
                      color: '#ff9800',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  It's okay to email me about this feedback and my account
                </Typography>
              }
            />
            
            {formSubmitted && emailConsentError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                Email consent is required
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <LoadingButton
                loading={loadingSubmitStatus}
                onClick={submitFeedback}
                variant="contained"
                sx={{
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
                Submit Feedback
              </LoadingButton>
              
              <Button
                onClick={() => setExpanded(false)}
                variant="text"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
} 
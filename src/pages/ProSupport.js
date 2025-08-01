import { useContext, useState } from 'react';
import { API } from 'aws-amplify';
import { Helmet } from 'react-helmet-async';
import { Typography, Container, Grid, Stack, TextField, Button, Paper, Card, CardContent, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import LockIcon from '@mui/icons-material/Lock';
import { UserContext } from '../UserContext';
import { SnackbarContext } from '../SnackbarContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';
import { CURRENT_SALE } from '../constants/sales';

export default function ProSupport() {
  const [loadingSubmitStatus, setLoadingSubmitStatus] = useState();
  const { user } = useContext(UserContext);
  const { setOpen, setMessage: setSnackbarMessage, setSeverity } = useContext(SnackbarContext);
  const [messageInput, setMessageInput] = useState('');
  const [emailConsent, setEmailConsent] = useState(false);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [messageError, setMessageError] = useState(false);
  const [emailConsentError, setEmailConsentError] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const authorized = user?.userDetails?.magicSubscription === 'true';

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

  const submitSupportTicket = async () => {
    setFormSubmitted(true);
    if (validateForm()) {
      setLoadingSubmitStatus(true);
      try {
        const response = await API.post('publicapi', '/user/update/proSupportMessage', {
          body: {
            message: messageInput,
          },
        });
  
        if (response.success) {
          setSnackbarMessage('Pro support message submitted successfully');
          setSeverity('success');
          setOpen(true);
        } else {
          setSnackbarMessage('Failed to submit pro support message');
          setSeverity('error');
          setOpen(true);
        }
      } catch (error) {
        console.log(error);
        setSnackbarMessage(`${error}`);
        setSeverity('error');
        setOpen(true);
      }
      setMessageInput('');
      setEmailConsent(false);
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

  const handleFeedbackClick = (e) => {
    e.preventDefault();
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    window.open('https://forms.gle/8CETtVbwYoUmxqbi7', '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Helmet>
        <title> Pro Support • memeSRC </title>
      </Helmet>
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        {!authorized ? (
          <Grid container height="100%" justifyContent="center" alignItems="center" mt={6}>
            <Grid item>
              <Stack spacing={3} justifyContent="center">
                <img
                  src="/assets/memeSRC-white.svg"
                  alt="memeSRC logo"
                  loading="lazy"
                  style={{ height: 48, marginBottom: -15 }}
                />
                <Typography variant="h3" textAlign="center">
                  memeSRC&nbsp;Pro Support
                </Typography>
                <Typography variant="body" textAlign="center">
                  Pro Support is available for memeSRC&nbsp;Pro subscribers. Upgrade for personal assistance.
                </Typography>
              </Stack>
              <center>
                <LoadingButton
                  onClick={openSubscriptionDialog}
                  variant="contained"
                  size="large"
                  sx={{ 
                    mt: 5, 
                    fontSize: 17,
                    background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                    border: '1px solid #8b5cc7',
                    boxShadow: '0 0 20px rgba(107,66,161,0.5)',
                    color: '#fff',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                      boxShadow: '0 0 25px rgba(107,66,161,0.6)',
                    },
                  }}
                >
                  {CURRENT_SALE.isActive 
                    ? `Upgrade to Pro (${CURRENT_SALE.discountPercent}% off)`
                    : 'Upgrade to Pro'
                  }
                </LoadingButton>
              </center>
              <Typography variant="body1" textAlign="center" style={{ opacity: 0.7 }}>
                <br />
                <br />
                Or submit <b>anonymous feedback</b> using{' '}
                <a 
                  href="https://forms.gle/8CETtVbwYoUmxqbi7" 
                  style={{ color: 'white' }} 
                  onClick={handleFeedbackClick}
                >
                  <b>this form</b>
                </a>
                <Dialog 
                  open={openDialog} 
                  onClose={() => setOpenDialog(false)}
                  PaperProps={{
                    sx: {
                      borderRadius: 2,
                      minWidth: '350px',
                    }
                  }}
                >
                  <DialogTitle sx={{ 
                    pb: 1,
                    background: 'linear-gradient(90deg, #ff6900 0%, #ff8d0a 100%)',
                    color: 'black',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1
                  }}>
                    <LockIcon sx={{ fontSize: 20, color: 'black' }} />
                    Anonymous Feedback
                  </DialogTitle>
                  <DialogContent sx={{ pt: 3 }}>
                    <Typography>
                      We can't see who submits feedback using Google Forms.
                    </Typography>
                  </DialogContent>
                  <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button 
                      onClick={() => setOpenDialog(false)}
                      sx={{ color: 'text.secondary' }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleDialogClose} 
                      variant="contained"
                      sx={{ 
                        px: 3,
                        color: 'black',
                        background: 'linear-gradient(90deg, #ff6900 0%, #ff8d0a 100%)',
                        '&:hover': {
                          background: 'linear-gradient(90deg, #ff8d0a 0%, #ffa94d 100%)'
                        }
                      }}
                    >
                      Continue to Form
                    </Button>
                  </DialogActions>
                </Dialog>
              </Typography>
            </Grid>
          </Grid>
        ) : (
          <Grid container justifyContent="center" mt={6}>
            <Grid item xs={12} md={8} lg={6}>
              <Typography variant="h2" gutterBottom mb={4}>
                Need some help?
              </Typography>
              <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom mt={1} mb={2}>
                  As a Pro subscriber, you get access to Pro&nbsp;Support. Send us a message and we'll get back to you asap:
                </Typography>
                <TextField
                  label="Message"
                  multiline
                  rows={6}
                  value={messageInput}
                  onChange={handleMessageChange}
                  fullWidth
                  sx={{ mb: 2 }}
                  error={formSubmitted && messageError}
                  helperText={formSubmitted && messageError ? 'Message is required' : ''}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={emailConsent}
                      onChange={handleEmailConsentChange}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="subtitle2" style={{ fontWeight: 'bold' }}>
                      It's okay to email me about this message and my account
                    </Typography>
                  }
                />
                {formSubmitted && emailConsentError && (
                  <Typography variant="subtitle2" color="error">
                    (required)
                  </Typography>
                )}
                <LoadingButton
                  loading={loadingSubmitStatus}
                  onClick={submitSupportTicket}
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Submit
                </LoadingButton>
              </Paper>
              <Card sx={{ mt: 5, px: 1 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Thanks for being a Pro!
                  </Typography>
                  <Typography variant="body1">
                    We can't thank you enough for your support!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </>
  );
}

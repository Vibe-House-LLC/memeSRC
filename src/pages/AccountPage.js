import { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, Container, Divider, Grid, Card, TextField, List, ListItem, ListItemIcon, ListItemText, IconButton, Avatar, Chip, Skeleton, LinearProgress } from '@mui/material';
import { Receipt, Download, Edit, Save, Cancel, Block, SupportAgent, Bolt, AutoFixHighRounded } from '@mui/icons-material';
import { API, Auth, Storage } from 'aws-amplify';
import { LoadingButton } from '@mui/lab';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';
import { SnackbarContext } from '../SnackbarContext';

const AccountPage = () => {
  const userDetails = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [email, setEmail] = useState(userDetails?.user?.email || '');
  const [editingEmail, setEditingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(userDetails?.user?.profilePhoto || '');
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const { setOpen, setSeverity, setMessage } = useContext(SnackbarContext)

  useEffect(() => {
    fetchInvoices();
    fetchSubscription();
  }, [page]);

  useEffect(() => {
    setEmail(userDetails?.user?.userDetails?.email);
  }, [userDetails]);

  useEffect(() => {
    if (newPassword === confirmPassword) {
      setIsPasswordValid(newPassword.length >= 8);
      setPasswordError('');
    } else {
      setIsPasswordValid(false);
      setPasswordError('Passwords do not match');
    }
  }, [newPassword, confirmPassword]);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const lastInvoiceId = invoices.length > 0 ? invoices[invoices.length - 1].id : null;
      const response = await API.get('publicapi', '/user/update/listInvoices', {
        ...(hasMore && { body: { lastInvoice: lastInvoiceId } }),
      });
      console.log(response);
      setInvoices((prevInvoices) => [...prevInvoices, ...response.data]);
      setHasMore(response.data.has_more);
      setLoadingInvoices(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoadingInvoices(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      setLoadingSubscription(true);
      // Add your API call to fetch the current subscription
      // Example: const response = await API.get('publicapi', '/user/update/getSubscription');
      // Set the current subscription data based on the response
      setLoadingSubscription(false);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setLoadingSubscription(false);
    }
  };

  const handleLoadMore = () => {
    setPage((prevPage) => prevPage + 1);
  };

  const openInvoicePDF = (url) => {
    window.open(url, '_blank');
  };

  const handleUpdateEmail = async () => {
    try {
      // Make API call to update the user's email
      await API.post('publicapi', '/user/update/email', { body: { email } });
      setEditingEmail(false);
    } catch (error) {
      console.error('Error updating email:', error);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();

    if (!isPasswordValid) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setUpdatingPassword(true);
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError('Failed to update password. Please try again.');
      setMessage('Something went wrong. Please try again.')
      setSeverity('error')
      setOpen(true)
    } finally {
      setUpdatingPassword(false);
      setMessage('Your password has been updated!')
      setSeverity('success')
      setOpen(true)
    }
  };

  const handleProfilePhotoUpload = async (event) => {
    setUploadingProfilePhoto(true)
    console.log(userDetails)
    if (userDetails?.user?.sub) {
      const file = event.target.files[0];
      try {
        // Upload the profile photo to Storage
        const response = await Storage.put(`profilePictures/${userDetails?.user?.sub}`, file, {
          contentType: file.type, // contentType is optional
        });

        // Get the current authenticated user
        const userObj = await Auth.currentAuthenticatedUser();

        // Update the user's profile with the uploaded photo key
        const updatePictureResponse = await Auth.updateUserAttributes(userObj, {
          picture: response.key
        });

        const newProfilePicture = await Storage.get(response.key)
        userDetails?.setUser({
          ...userDetails.user,
          profilePhoto: newProfilePicture
        })
        console.log(newProfilePicture)

        console.log(updatePictureResponse);
        setUploadingProfilePhoto(false)
      } catch (error) {
        console.error('Error uploading profile photo:', error);
        setUploadingProfilePhoto(false)
      }
      console.log('Uploading profile photo:', file);
      setUploadingProfilePhoto(false)
    }
  };

  const isLoading = loadingInvoices || loadingSubscription;
  const recentPaidInvoice = invoices.find((invoice) => invoice.paid);
  const currentSubscription = recentPaidInvoice?.lines?.data?.[0]?.description
    ?.replace(/^1\s*×\s*/, '')
    ?.replace(/\s*\(memeSRC\)/i, '');

  return (
    <Container maxWidth="lg" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Account
      </Typography>
      <Divider sx={{ my: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, backgroundColor: 'background.paper' }}>
            <Typography variant="h5" gutterBottom>
              Subscription
            </Typography>
            <Box
              sx={{
                width: '100%',
                backgroundColor: userDetails?.user?.userDetails?.magicSubscription === 'true' ? 'success.main' : 'primary.main',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 3,
                mb: 3,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: userDetails?.user?.userDetails?.magicSubscription === 'true' ? 'black' : 'white', mb: 1 }}>
                  {userDetails?.user?.userDetails?.magicSubscription === 'true' ? 'memeSRC Pro' : 'Upgrade to memeSRC Pro'}
                </Typography>
                {isLoading ? (
                  <Box sx={{ width: '100%', mt: 1 }}>
                    <LinearProgress
                      sx={{
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(to right, red 0%, red 20%, orange 20%, orange 40%, yellow 40%, yellow 60%, green 60%, green 80%, blue 80%, blue 100%)',
                        },
                      }}
                    />
                  </Box>
                ) : userDetails?.user?.userDetails?.magicSubscription === 'true' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {currentSubscription ? (
                      <>
                        <Typography variant="body1" sx={{ color: 'black', mr: 1 }}>
                          {currentSubscription}
                        </Typography>
                        <Chip
                          label="Active"
                          color="success"
                          sx={{ fontWeight: 'bold', backgroundColor: 'common.white', color: 'black' }}
                        />
                      </>
                    ) : (
                      <Typography variant="body1" sx={{ color: 'black' }}>
                        No current subscription found.
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1" sx={{ color: 'white' }}>
                    Unlock enhanced features and benefits!
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Subscription Benefits:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Block sx={{ color: 'action.active', mr: 1 }} />
                <Typography variant="body2">No Ads</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SupportAgent sx={{ color: 'action.active', mr: 1 }} />
                <Typography variant="body2">Pro Support</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Bolt sx={{ color: 'action.active', mr: 1 }} />
                <Typography variant="body2">Early Access Features</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AutoFixHighRounded sx={{ color: 'action.active', mr: 1 }} />
                <Typography variant="body2">Magic Credits</Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              {userDetails?.user?.userDetails?.magicSubscription === 'true' ? (
                <Button variant="outlined" color="primary" onClick={openSubscriptionDialog}>
                  Manage Subscription
                </Button>
              ) : (
                <Button variant="contained" size="large" onClick={openSubscriptionDialog}>
                  Subscribe Now
                </Button>
              )}
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, backgroundColor: 'background.paper' }}>
            <Typography variant="h5" gutterBottom>
              Account Information
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: uploadingProfilePhoto ? 1 : 4 }}>
              <Avatar src={userDetails?.user?.profilePhoto || null} sx={{ width: 80, height: 80, mr: 3 }} />
              <Button variant="outlined" component="label" disabled={uploadingProfilePhoto}>
                Upload Photo
                <input type="file" hidden onChange={handleProfilePhotoUpload} accept="image/*" />
              </Button>
            </Box>
            {uploadingProfilePhoto &&
              <Box>
                <Typography textAlign='center' fontSize={14} mb={1}>
                  Uploading...
                </Typography>
                <LinearProgress sx={{ mb: 4 }} />
              </Box>
            }
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Email"
                autoComplete='off'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                disabled={!editingEmail}
                InputProps={{
                  endAdornment: editingEmail ? (
                    <>
                      <IconButton onClick={handleUpdateEmail}>
                        <Save />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setEmail(userDetails?.user?.userDetails?.email || '');
                          setEditingEmail(false);
                        }}
                      >
                        <Cancel />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton onClick={() => setEditingEmail(true)}>
                      <Edit />
                    </IconButton>
                  ),
                }}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <form onSubmit={handleUpdatePassword}>
                <TextField
                  label="Username"
                  type="text"
                  autoComplete="username"
                  value={userDetails?.user?.username}
                  fullWidth
                  disabled
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Current Password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                  error={!!passwordError}
                  helperText={passwordError}
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  error={!!passwordError}
                  helperText={passwordError}
                />
                <LoadingButton
                  type="submit"
                  variant="contained"
                  disabled={!isPasswordValid || updatingPassword}
                  sx={{ mt: 3 }}
                  loading={updatingPassword}
                >
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </LoadingButton>
              </form>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ p: 3, backgroundColor: 'background.paper' }}>
            <Typography variant="h5" gutterBottom>
              Invoices
            </Typography>
            <List>
              {invoices.map((invoice) => (
                <ListItem key={invoice.id} sx={{ backgroundColor: 'action.hover', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    <Receipt />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Invoice #${invoice.number}`}
                    secondary={`Period: ${new Date(invoice.period_start * 1000).toLocaleDateString()} - ${new Date(
                      invoice.period_end * 1000
                    ).toLocaleDateString()}`}
                  />
                  <IconButton onClick={() => openInvoicePDF(invoice.invoice_pdf)} disabled={!invoice.invoice_pdf}>
                    <Download />
                  </IconButton>
                </ListItem>
              ))}
            </List>
            {hasMore && !loadingInvoices && (
              <Button variant="outlined" onClick={handleLoadMore} sx={{ mt: 2 }}>
                Load More
              </Button>
            )}
            {loadingInvoices ? (
              <>
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} variant="rectangular" height={60} sx={{ borderRadius: 1, mb: 1 }} />
                ))}
              </>
            ) : (
              invoices.length === 0 && <Typography variant="body1">No invoices found.</Typography>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AccountPage;

import { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, Container, Divider, Grid, Card, TextField, List, ListItem, ListItemIcon, ListItemText, IconButton, Avatar, Chip } from '@mui/material';
import { Receipt, Download, Edit, Save, Cancel, Block, SupportAgent, Bolt, AutoFixHighRounded } from '@mui/icons-material';
import { API } from 'aws-amplify';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const AccountPage = () => {
  const userDetails = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [email, setEmail] = useState(userDetails?.user?.email || '');
  const [editingEmail, setEditingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(userDetails?.user?.profilePhoto || '');
  const [invoices, setInvoices] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchInvoices();
  }, [page]);

  useEffect(() => {
    setEmail(userDetails?.user?.userDetails?.email);
  }, [userDetails]);

  useEffect(() => {
    setIsPasswordValid(
      newPassword.length >= 8 && newPassword === confirmPassword
    );
  }, [newPassword, confirmPassword]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const lastInvoiceId = invoices.length > 0 ? invoices[invoices.length - 1].id : null;
      const response = await API.get('publicapi', '/user/update/listInvoices', {
        ...(hasMore && { body: { lastInvoice: lastInvoiceId } }),
      });
      console.log(response);
      setInvoices((prevInvoices) => [...prevInvoices, ...response.data]);
      setHasMore(response.data.has_more);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
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

  const handleUpdatePassword = async () => {
    try {
      // Make API call to update the user's password
      await API.post('publicapi', '/user/update/password', {
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
    }
  };

  const handleProfilePhotoUpload = (event) => {
    const file = event.target.files[0];
    // Logic to upload the profile photo and update the profilePhoto state
    // Make API calls to upload the photo and update the user's profile
    console.log('Uploading profile photo:', file);
  };

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
                <Typography variant="h4" sx={{ color: 'black', mb: 1 }}>
                  {userDetails?.user?.userDetails?.magicSubscription === 'true' ? 'memeSRC Pro' : 'Upgrade to memeSRC Pro'}
                </Typography>
                {userDetails?.user?.userDetails?.magicSubscription === 'true' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body1" sx={{ color: 'black', mr: 1 }}>
                      {currentSubscription || 'No current subscription found.'}
                    </Typography>
                    <Chip
                      label="Active"
                      color="success"
                      sx={{ fontWeight: 'bold', backgroundColor: 'common.white', color: 'black' }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body1" sx={{ color: 'common.white' }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={profilePhoto}
                sx={{ width: 80, height: 80, mr: 2 }}
              />
              <Button variant="outlined" component="label">
                Upload Photo
                <input type="file" hidden onChange={handleProfilePhotoUpload} accept="image/*" />
              </Button>
            </Box>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Email"
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
                      <IconButton onClick={() => {
                        setEmail(userDetails?.user?.userDetails?.email || '');
                        setEditingEmail(false);
                      }}>
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
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
              />
            </Box>
            <Button variant="contained" onClick={handleUpdatePassword} disabled={!isPasswordValid}>
              Update Password
            </Button>
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
                    secondary={`Period: ${new Date(invoice.period_start * 1000).toLocaleDateString()} - ${new Date(invoice.period_end * 1000).toLocaleDateString()}`}
                  />
                  <IconButton onClick={() => openInvoicePDF(invoice.invoice_pdf)} disabled={!invoice.invoice_pdf}>
                    <Download />
                  </IconButton>
                </ListItem>
              ))}
            </List>
            {hasMore && !loading && (
              <Button variant="outlined" onClick={handleLoadMore}>
                Load More
              </Button>
            )}
            {!loading && invoices.length === 0 && (
              <Typography variant="body1">No invoices found.</Typography>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AccountPage;

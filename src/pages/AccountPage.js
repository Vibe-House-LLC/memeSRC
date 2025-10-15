import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Stack,
  Chip,
  Alert,
  Card,
  Divider,
  Skeleton,
  alpha,
  Avatar,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import { API, Auth, Storage } from 'aws-amplify';
import { LoadingButton } from '@mui/lab';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';
import { getShowsWithFavorites } from '../utils/fetchShowsRevised';
import { safeRemoveItem, writeJSON } from '../utils/storage';
import ProfilePhotoCropper from '../components/ProfilePhotoCropper';
import { fetchProfilePhoto as fetchProfilePhotoUtil } from '../utils/profilePhoto';

const AccountPage = () => {
  const userDetails = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [invoices, setInvoices] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [latestSubscriptionStatus, setLatestSubscriptionStatus] = useState(null);
  const [hasLoadedSubscriptionData, setHasLoadedSubscriptionData] = useState(false);
  const [loadingPortalUrl, setLoadingPortalUrl] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const authUser = userDetails?.user;
  const hasUserDetails = Boolean(authUser && authUser !== false && authUser.userDetails);
  const isAuthLoading = authUser === null || typeof authUser === 'undefined';

  const hasInitializedDataRef = useRef(false);
  const isFetchingInvoicesRef = useRef(false);

  useEffect(() => {
    if (hasInitializedDataRef.current) {
      return;
    }

    if (isAuthLoading || !hasUserDetails) {
      return;
    }

    hasInitializedDataRef.current = true;
    fetchInvoices();
    fetchProfilePhoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, hasUserDetails]);

  const fetchInvoices = async () => {
    if (isFetchingInvoicesRef.current) {
      return;
    }

    isFetchingInvoicesRef.current = true;
    setLoadingInvoices(true);

    const lastInvoiceId = invoices.length > 0 ? invoices[invoices.length - 1].id : null;

    try {
      const response = await API.get('publicapi', '/user/update/listInvoices', {
        ...(lastInvoiceId ? { body: { lastInvoice: lastInvoiceId } } : {}),
      });
      if (typeof response.latestSubscriptionStatus !== 'undefined') {
        setLatestSubscriptionStatus(response.latestSubscriptionStatus);
      }

      const fetchedInvoices = response.data || [];
      setInvoices((prev) => (lastInvoiceId ? [...prev, ...fetchedInvoices] : fetchedInvoices));
      setHasMore(response.has_more || false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      isFetchingInvoicesRef.current = false;
      setHasLoadedSubscriptionData(true);
      setLoadingInvoices(false);
    }
  };

  const downloadInvoice = (url) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const fetchProfilePhoto = async () => {
    try {
      setLoadingPhoto(true);
      // Use the utility function which handles session storage caching
      const url = await fetchProfilePhotoUtil();
      setProfilePhotoUrl(url);
    } catch (error) {
      // No profile photo exists yet, or error fetching
      console.log('No profile photo found or error:', error);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 20MB for original - will be resized to 500x500)
    if (file.size > 20 * 1024 * 1024) {
      alert('Image size must be less than 20MB');
      return;
    }

    // Open cropper dialog
    setSelectedImageFile(file);
    setCropperOpen(true);
  };

  const handleCroppedPhoto = async (croppedBlob) => {
    try {
      setUploadingPhoto(true);
      setCropperOpen(false);
      
      // Upload to S3 with private access level
      const photoKey = 'profile-photo';
      await Storage.put(photoKey, croppedBlob, {
        level: 'private',
        contentType: 'image/jpeg',
      });

      // Fetch the new URL
      const url = await Storage.get(photoKey, { level: 'private' });
      setProfilePhotoUrl(url);
      
      // Update user context with new profile photo
      if (userDetails?.setUser && userDetails?.user) {
        const updatedUser = { ...userDetails.user, profilePhoto: url };
        userDetails.setUser(updatedUser);
        writeJSON('memeSRCUserDetails', updatedUser);
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Failed to upload profile photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      setSelectedImageFile(null);
    }
  };

  const handleCropperClose = () => {
    setCropperOpen(false);
    setSelectedImageFile(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    try {
      setDeletingPhoto(true);
      const photoKey = 'profile-photo';
      
      // Delete from S3
      await Storage.remove(photoKey, { level: 'private' });
      
      // Update local state
      setProfilePhotoUrl(null);
      
      // Update user context
      if (userDetails?.setUser && userDetails?.user) {
        const updatedUser = { ...userDetails.user };
        delete updatedUser.profilePhoto;
        userDetails.setUser(updatedUser);
        writeJSON('memeSRCUserDetails', updatedUser);
      }
    } catch (error) {
      console.error('Error deleting profile photo:', error);
      alert('Failed to delete profile photo. Please try again.');
    } finally {
      setDeletingPhoto(false);
    }
  };

  const openCustomerPortal = () => {
    setLoadingPortalUrl(true);
    const currentUrl = window.location.href;
    const portalUrl = new URL('/subscription-portal', window.location.origin);
    portalUrl.searchParams.set('returnUrl', currentUrl);

    const portalWindow = window.open(portalUrl.toString(), '_blank');

    if (portalWindow) {
      portalWindow.opener = null;
      portalWindow.focus?.();
    } else {
      alert('Please allow pop-ups from memeSRC to manage your subscription.');
    }

    setLoadingPortalUrl(false);
  };

  const handleLogout = () => {
    Auth.signOut()
      .then(() => {
        userDetails?.setUser(null);
        safeRemoveItem('memeSRCUserDetails');
        userDetails?.setDefaultShow('_universal');
        getShowsWithFavorites().then((loadedShows) => {
          writeJSON('memeSRCShows', loadedShows);
          userDetails?.setShows(loadedShows);
        });
      })
      .catch((err) => {
        alert(err);
      })
      .finally(() => {
        navigate('/');
      });
  };

  if (isAuthLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'common.black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  if (!hasUserDetails) {
    return <Navigate to="/login" replace />;
  }

  const accountDetails = authUser.userDetails;
  const accountEmail = accountDetails.email || 'N/A';
  const accountUsername = accountDetails.username || accountEmail;
  const isSubscriptionActive = latestSubscriptionStatus === 'active';
  const hasSubscription = Boolean(latestSubscriptionStatus && latestSubscriptionStatus !== 'canceled');
  const isPro = hasSubscription;
  const hasPaymentIssue = accountDetails.subscriptionStatus === 'failedPayment';
  const shouldShowSubscriptionWarning = hasSubscription && !isSubscriptionActive;

  const formatAmount = (invoice) => {
    const amount = invoice.amount_paid || invoice.total || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'usd',
    }).format(amount / 100);
  };

  const formatInvoiceDate = (invoice) => {
    const timestamp = invoice.created || invoice.period_start;
    if (!timestamp) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp * 1000));
  };

  const subscriptionStatusMeta = {
    incomplete: {
      severity: 'warning',
      message: 'Your subscription setup is incomplete. Update billing to finish getting access.',
    },
    incomplete_expired: {
      severity: 'error',
      message: 'Your subscription setup expired. Update billing to try again.',
    },
    trialing: {
      severity: 'warning',
      message: 'Your subscription is still in trial. Update billing to make sure you stay connected when it ends.',
    },
    past_due: {
      severity: 'error',
      message: 'Your payment is past due. Update billing to avoid losing access.',
    },
    unpaid: {
      severity: 'error',
      message: 'Your subscription payment failed. Update billing to restore access.',
    },
    paused: {
      severity: 'warning',
      message: 'Your subscription is paused. Update billing to get back in.',
    },
  };

  const subscriptionStatusLabelMap = {
    incomplete: 'Incomplete',
    incomplete_expired: 'Setup Expired',
    trialing: 'Trialing',
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    paused: 'Paused',
  };

  const subscriptionStatusLabel = latestSubscriptionStatus
    ? subscriptionStatusLabelMap[latestSubscriptionStatus] || latestSubscriptionStatus
    : null;
  const subscriptionStatusAlert = latestSubscriptionStatus
    ? subscriptionStatusMeta[latestSubscriptionStatus]
    : null;

  const planStatusLabel = (() => {
    if (!hasSubscription) {
      if (latestSubscriptionStatus === 'canceled') {
        return 'Canceled';
      }
      return 'Free';
    }
    if (hasPaymentIssue) return 'Payment Issue';
    if (isSubscriptionActive) return 'Active';
    if (subscriptionStatusLabel) return subscriptionStatusLabel;
    return 'Status Pending';
  })();

  const planStatusColor = (() => {
    if (!hasSubscription) return 'default';
    if (hasPaymentIssue) return 'error';
    if (isSubscriptionActive) return 'success';
    return subscriptionStatusAlert?.severity === 'error' ? 'error' : 'warning';
  })();

  const planStatusIcon = hasSubscription && !hasPaymentIssue && isSubscriptionActive ? <CheckCircleIcon /> : undefined;
  const manageSubscriptionButtonLabel = isSubscriptionActive ? 'Manage Subscription' : 'Update Billing';
  const shouldShowBillingHistory = hasSubscription || invoices.length > 0;
  const isSubscriptionDataLoading = !hasLoadedSubscriptionData;
  const planCardStyles = {
    borderRadius: 4,
    background: (theme) => hasSubscription
      ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.2)} 0%, ${alpha(theme.palette.secondary.dark, 0.4)} 100%)`
      : theme.palette.background.paper,
    border: (theme) => hasSubscription ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : undefined,
    position: 'relative',
    overflow: 'hidden',
    '&::before': hasSubscription ? {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    } : {},
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'common.black',
      }}
    >
      <Container 
        maxWidth="md" 
        sx={{ 
          px: { xs: 2, sm: 3 },
          py: { xs: 4, sm: 6 },
        }}
      >
        <Stack spacing={{ xs: 4, sm: 5 }}>
          {/* Profile Details Section */}
          <Card
            sx={{
              borderRadius: 4,
              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            }}
          >
            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 3,
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                  background: (theme) => `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.primary.light, 0.9)} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Account
              </Typography>
              
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={3} 
                alignItems={{ xs: 'center', sm: 'flex-start' }}
              >
                {/* Profile Photo */}
                <Box sx={{ position: 'relative' }}>
                  {loadingPhoto ? (
                    <Skeleton variant="circular" width={120} height={120} />
                  ) : (
                    <>
                      <Avatar
                        src={profilePhotoUrl}
                        alt={accountUsername}
                        sx={{
                          width: 120,
                          height: 120,
                          bgcolor: 'primary.main',
                          fontSize: '3rem',
                          fontWeight: 600,
                          border: (theme) => `4px solid ${alpha(theme.palette.common.white, 0.1)}`,
                        }}
                      >
                        {accountUsername.charAt(0).toUpperCase()}
                      </Avatar>
                      <IconButton
                        onClick={handlePhotoClick}
                        disabled={uploadingPhoto || deletingPhoto}
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          bgcolor: 'primary.main',
                          width: 40,
                          height: 40,
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          },
                          border: (theme) => `3px solid ${theme.palette.background.default}`,
                        }}
                      >
                        {uploadingPhoto ? (
                          <CircularProgress size={20} sx={{ color: 'common.white' }} />
                        ) : (
                          <CameraAltIcon sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                      {profilePhotoUrl && (
                        <IconButton
                          onClick={handleDeletePhoto}
                          disabled={uploadingPhoto || deletingPhoto}
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            bgcolor: 'error.main',
                            width: 40,
                            height: 40,
                            '&:hover': {
                              bgcolor: 'error.dark',
                            },
                            border: (theme) => `3px solid ${theme.palette.background.default}`,
                          }}
                        >
                          {deletingPhoto ? (
                            <CircularProgress size={20} sx={{ color: 'common.white' }} />
                          ) : (
                            <DeleteIcon sx={{ fontSize: 20 }} />
                          )}
                        </IconButton>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{ display: 'none' }}
                      />
                    </>
                  )}
                </Box>

                {/* User Details */}
                <Box flex={1} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 600,
                      mb: 0.5,
                      fontSize: { xs: '1.5rem', sm: '1.75rem' },
                    }}
                  >
                    {accountUsername}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: { xs: '0.9375rem', sm: '1rem' },
                      mb: 1.5,
                    }}
                  >
                    {accountEmail}
                  </Typography>
                  <Stack 
                    direction="row" 
                    spacing={1} 
                    flexWrap="wrap"
                    justifyContent={{ xs: 'center', sm: 'flex-start' }}
                  >
                    {isSubscriptionDataLoading ? (
                      <Skeleton variant="rounded" width={120} height={32} sx={{ borderRadius: 16 }} />
                    ) : (
                      <Chip
                        icon={isPro ? <StarIcon sx={{ fontSize: 16 }} /> : undefined}
                        label={isPro ? 'Pro Member' : 'Free Account'}
                        color={isPro ? 'primary' : 'default'}
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Card>

          {/* Payment Issue Alert */}
          {hasPaymentIssue && (
            <Alert 
              severity="error" 
              variant="filled"
              icon={<CreditCardIcon />}
              sx={{ 
                borderRadius: 3,
                fontWeight: 500,
              }}
            >
              Payment failed. Update your payment method to maintain Pro access.
            </Alert>
          )}

          {shouldShowSubscriptionWarning && (
            <Alert
              severity={subscriptionStatusAlert?.severity || 'warning'}
              variant="filled"
              icon={<CreditCardIcon />}
              action={
                <Button color="inherit" size="small" onClick={openCustomerPortal}>
                  Update Billing
                </Button>
              }
              sx={{
                borderRadius: 3,
                fontWeight: 500,
              }}
            >
              {subscriptionStatusAlert?.message || `Your subscription status is ${subscriptionStatusLabel || latestSubscriptionStatus}. Update billing to stay active.`}
            </Alert>
          )}

          {/* Plan Card - Premium Design */}
          {isSubscriptionDataLoading ? (
            <Card sx={planCardStyles}>
              <Box sx={{ p: { xs: 3, sm: 5 } }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                    <Box sx={{ width: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="text" width={80} height={32} sx={{ borderRadius: 1 }} />
                        <Skeleton variant="rounded" width={96} height={28} />
                      </Stack>
                      <Skeleton variant="text" width="80%" height={24} sx={{ borderRadius: 1 }} />
                      <Skeleton variant="text" width="60%" height={24} sx={{ borderRadius: 1, mt: 1 }} />
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Skeleton variant="rounded" height={48} sx={{ flex: 1, borderRadius: 2 }} />
                    <Skeleton variant="rounded" height={48} sx={{ flex: 1, borderRadius: 2 }} />
                    <Skeleton variant="rounded" height={48} sx={{ flex: 1, borderRadius: 2, display: { xs: 'none', sm: 'block' } }} />
                  </Stack>
                  <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
                </Stack>
              </Box>
            </Card>
          ) : (
            <Card sx={planCardStyles}>
              <Box sx={{ p: { xs: 3, sm: 5 } }}>
                <Stack spacing={3}>
                  {/* Plan Header */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                        {isPro && (
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 2,
                              bgcolor: 'success.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <StarIcon sx={{ fontSize: 20, color: 'common.black' }} />
                          </Box>
                        )}
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 700,
                            fontSize: { xs: '1.5rem', sm: '1.75rem' },
                          }}
                        >
                          {isPro ? 'Pro' : 'Free'}
                        </Typography>
                        <Chip
                          icon={planStatusIcon}
                          label={planStatusLabel}
                          color={planStatusColor}
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                          }}
                        />
                      </Stack>
                      <Typography 
                        variant="body1" 
                        color="text.secondary"
                        sx={{ 
                          fontSize: { xs: '0.9375rem', sm: '1rem' },
                          lineHeight: 1.6,
                          maxWidth: '500px',
                        }}
                      >
                        {isPro
                          ? 'Unlock the full power of memeSRC with ad-free browsing, priority support, and magic credits'
                          : 'Upgrade to Pro and unlock premium features, magic credits, and an ad-free experience'}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Features List for Pro */}
                  {isPro && (
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={2}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
                      }}
                    >
                      {[
                        'Ad-free experience',
                        'Magic credits',
                        'Priority support',
                      ].map((feature, idx) => (
                        <Stack key={idx} direction="row" alignItems="center" spacing={1} flex={1}>
                          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {feature}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  {/* Action Button */}
                  <Box>
                    {isPro ? (
                      <LoadingButton
                        variant="outlined"
                        loading={loadingPortalUrl}
                        onClick={openCustomerPortal}
                        size="large"
                        fullWidth
                        sx={{ 
                          py: 1.75,
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          borderRadius: 2,
                          borderWidth: 2,
                          '&:hover': {
                            borderWidth: 2,
                          }
                        }}
                      >
                        {manageSubscriptionButtonLabel}
                      </LoadingButton>
                    ) : (
                      <Button 
                        variant="contained" 
                        onClick={openSubscriptionDialog}
                        size="large"
                        fullWidth
                        sx={{ 
                          py: 1.75,
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          borderRadius: 2,
                          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          '&:hover': {
                            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.darker} 100%)`,
                          }
                        }}
                      >
                        Upgrade to Pro
                      </Button>
                    )}
                  </Box>
                </Stack>
              </Box>
            </Card>
          )}

          {/* Billing History */}
          {shouldShowBillingHistory && (
            <Box>
              <Stack 
                direction="row" 
                alignItems="center" 
                justifyContent="space-between" 
                sx={{ mb: 3 }}
              >
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  }}
                >
                  Billing History
                </Typography>
                {invoices.length > 0 && (
                  <Chip 
                    label={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>

              <Stack spacing={2}>
                {loadingInvoices && invoices.length === 0 ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <Card 
                        key={i}
                        sx={{ borderRadius: 3 }}
                      >
                        <Box sx={{ p: 3 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Skeleton variant="circular" width={48} height={48} />
                            <Box flex={1}>
                              <Skeleton width="60%" height={28} />
                              <Skeleton width="40%" height={20} sx={{ mt: 0.5 }} />
                            </Box>
                          </Stack>
                        </Box>
                      </Card>
                    ))}
                  </>
                ) : invoices.length > 0 ? (
                  <>
                    {invoices.map((invoice) => {
                      const invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf;
                      const handleClick = () => {
                        if (invoice.hosted_invoice_url) {
                          window.open(invoice.hosted_invoice_url, '_blank');
                        } else if (invoice.invoice_pdf) {
                          downloadInvoice(invoice.invoice_pdf);
                        }
                      };

                      return (
                        <Box 
                          key={invoice.id}
                          onClick={invoiceUrl ? handleClick : undefined}
                          sx={{ 
                            px: 2.5,
                            py: 1.75,
                            borderRadius: 2,
                            border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                            bgcolor: (theme) => alpha(theme.palette.common.white, 0.05),
                            cursor: invoiceUrl ? 'pointer' : 'default',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': invoiceUrl ? {
                              bgcolor: (theme) => alpha(theme.palette.common.white, 0.1),
                              borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
                              transform: 'translateY(-1px)',
                            } : {},
                          }}
                        >
                          <Stack 
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={2}
                          >
                            {/* Left: Date and Amount */}
                            <Box flex={1} minWidth={0}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: '0.9375rem',
                                  mb: 0.25,
                                }}
                                noWrap
                              >
                                {formatInvoiceDate(invoice)}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ fontSize: '0.875rem' }}
                              >
                                {formatAmount(invoice)}
                              </Typography>
                            </Box>

                            {/* Right: Status and Arrow */}
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Chip
                                icon={invoice.status === 'paid' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                                label={invoice.status === 'paid' ? 'Paid' : invoice.status}
                                color={invoice.status === 'paid' ? 'success' : 'default'}
                                size="small"
                                sx={{ 
                                  height: 22,
                                  fontWeight: 600,
                                  fontSize: '0.6875rem',
                                }}
                              />
                              {invoiceUrl && (
                                <ChevronRightIcon 
                                  sx={{ 
                                    fontSize: 20,
                                    color: 'text.secondary',
                                  }} 
                                />
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                    {hasMore && (
                      <Button
                        variant="outlined"
                        onClick={fetchInvoices}
                        disabled={loadingInvoices}
                        fullWidth
                        size="large"
                        sx={{ 
                          py: 1.5,
                          borderRadius: 2,
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                        }}
                      >
                        {loadingInvoices ? 'Loading...' : 'Load More Invoices'}
                      </Button>
                    )}
                  </>
                ) : (
                  isPro && (
                    <Card 
                      sx={{ 
                        borderRadius: 3,
                        border: (theme) => `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                        bgcolor: 'transparent',
                      }}
                    >
                      <Box sx={{ p: 6, textAlign: 'center' }}>
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 3,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                          }}
                        >
                          <ReceiptIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                        </Box>
                        <Typography 
                          variant="h6" 
                          sx={{ mb: 0.5, fontWeight: 600 }}
                        >
                          No invoices yet
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                        >
                          Your billing history will appear here
                        </Typography>
                      </Box>
                    </Card>
                  )
                )}
              </Stack>
            </Box>
          )}

          <Button
            variant="text"
            onClick={() => navigate('/support')}
            sx={{
              alignSelf: 'flex-start',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'primary.light',
              textTransform: 'none',
              px: 3,
              py: 0,
            }}
          >
            Need help? Click here.
          </Button>

          {/* Sign Out */}
          <Box sx={{ pt: 0 }}>
            <Divider sx={{ mb: 3 }} />
            <Button 
              variant="text" 
              color="error" 
              onClick={handleLogout}
              sx={{ 
                fontSize: '0.9375rem',
                fontWeight: 600,
                py: 1.25,
                px: 3,
              }}
            >
              Sign Out
            </Button>
          </Box>
        </Stack>
      </Container>

      {/* Profile Photo Cropper Dialog */}
      <ProfilePhotoCropper
        open={cropperOpen}
        imageFile={selectedImageFile}
        onClose={handleCropperClose}
        onCrop={handleCroppedPhoto}
      />
    </Box>
  );
};

export default AccountPage;

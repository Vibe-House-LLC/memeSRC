import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, Container, Grid, Card, List, ListItem, ListItemIcon, ListItemText, IconButton, Chip, Skeleton, CircularProgress } from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';
import Receipt from '@mui/icons-material/Receipt';
import Download from '@mui/icons-material/Download';
import Block from '@mui/icons-material/Block';
import SupportAgent from '@mui/icons-material/SupportAgent';
import Bolt from '@mui/icons-material/Bolt';
import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded';
import CreditCard from '@mui/icons-material/CreditCard';
import LockOpen from '@mui/icons-material/LockOpen';
import ContentCopy from '@mui/icons-material/ContentCopy';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { API, Auth } from 'aws-amplify';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';
import { getShowsWithFavorites } from '../utils/fetchShowsRevised';

const AccountPage = () => {
  const userDetails = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [invoices, setInvoices] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPortalUrl, setLoadingPortalUrl] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingCancelUrl, setLoadingCancelUrl] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const navigate = useNavigate();

  console.log('User Details:', userDetails?.user);

  useEffect(() => {
    fetchInvoices();
    fetchSubscription();
  }, [page]);

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
    if (url) {
      window.open(url, '_blank');
    }
  };

  const downloadInvoicePDF = (url) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openCustomerPortal = (isCancel = false) => {
    if (isCancel) {
      setLoadingCancelUrl(true);
    } else {
      setLoadingPortalUrl(true);
    }
    
    API.post('publicapi', '/user/update/getPortalLink', {
      body: {
        currentUrl: window.location.href
      }
    }).then(results => {
      console.log(results);
      if (isCancel) {
        setLoadingCancelUrl(false);
      } else {
        setLoadingPortalUrl(false);
      }
      window.location.href = results;
    }).catch(error => {
      console.log(error.response);
      if (isCancel) {
        setLoadingCancelUrl(false);
      } else {
        setLoadingPortalUrl(false);
      }
    });
  };

  const handleLogout = () => {
    Auth.signOut().then(() => {
      userDetails?.setUser(null);
      window.localStorage.removeItem('memeSRCUserDetails')
      userDetails?.setDefaultShow('_universal')
      getShowsWithFavorites().then(loadedShows => {
        window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows))
        userDetails?.setShows(loadedShows)
      })
    }).catch((err) => {
      alert(err)
    }).finally(() => {
      navigate('/')
    })
  };

  const isLoading = loadingInvoices || loadingSubscription;
  const recentPaidInvoice = invoices.find((invoice) => invoice.paid);
  console.log(recentPaidInvoice?.lines?.data?.[0])
  // Check if user is logged in
  if (!userDetails?.user?.userDetails) {
    return <Navigate to="/login" replace />;
  }

  const formatAmount = (amount, currency) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'usd',
      minimumFractionDigits: 2,
    }).format(amount / 100);

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            p: 3, 
            backgroundColor: 'background.paper',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Account Details
                </Typography>
                <Typography 
                  variant="body2" 
                  onClick={handleLogout}
                  sx={{ 
                    color: 'error.main',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Sign Out
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1,
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 2,
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Username</Typography>
                  <Typography variant="body2">{userDetails?.user?.userDetails?.username || 'N/A'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Email</Typography>
                  <Typography variant="body2">{userDetails?.user?.userDetails?.email || 'N/A'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Customer ID</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                    onClick={async () => {
                      if (userDetails?.user?.sub) {
                        try {
                          await navigator.clipboard.writeText(userDetails.user.sub);
                          setShowCopySuccess(true);
                          setTimeout(() => setShowCopySuccess(false), 2000); // Reset after 2 seconds
                          console.log('Copied:', userDetails.user.sub);
                        } catch (err) {
                          console.error('Failed to copy:', err);
                        }
                      }
                    }}
                  >
                    {showCopySuccess ? (
                      <CheckCircle sx={{ fontSize: 16, opacity: 0.7, color: 'success.main' }} />
                    ) : (
                      <ContentCopy sx={{ fontSize: 16, opacity: 0.7 }} />
                    )}
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {userDetails?.user?.sub 
                        ? `${userDetails?.user?.sub.slice(0, 4)}...${userDetails?.user?.sub.slice(-4)}`
                        : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            {isLoading ? (
              <Box sx={{ width: '100%', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Box
                  sx={{
                    width: '100%',
                    background: userDetails?.user?.userDetails?.magicSubscription === 'true'
                      ? 'linear-gradient(135deg, #6B46C1 0%, #9F7AEA 100%)'
                      : 'linear-gradient(135deg, #2D3748 0%, #4A5568 100%)',
                    borderRadius: 3,
                    p: 3,
                    mb: 3,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      right: -20,
                      top: -20,
                      width: 150,
                      height: 150,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      filter: 'blur(2px)',
                    }}
                  />
                  
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' }, 
                      gap: 2, 
                      mb: 4 
                    }}>
                      <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                        {userDetails?.user?.userDetails?.magicSubscription === 'true' ? 'memeSRC Pro' : 'Free'}
                      </Typography>
                      {userDetails?.user?.userDetails?.magicSubscription === 'true' && (
                        <Chip
                          label={userDetails?.user?.userDetails?.subscriptionStatus === 'failedPayment' ? 'Payment Failed' : 'Active'}
                          size="small"
                          sx={{
                            backgroundColor: userDetails?.user?.userDetails?.subscriptionStatus === 'failedPayment' 
                              ? '#EF4444'  // Red for failed payment
                              : '#4ADE80', // Green for active
                            color: userDetails?.user?.userDetails?.subscriptionStatus === 'failedPayment'
                              ? '#7F1D1D'  // Dark red text
                              : '#064E3B', // Dark green text
                            fontWeight: 600,
                            height: '24px',
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                    </Box>

                    {userDetails?.user?.userDetails?.subscriptionStatus === 'failedPayment' && (
                      <Box sx={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', // Light red background
                        borderRadius: 2,
                        p: 2,
                        mb: 3
                      }}>
                        <Typography sx={{ 
                          color: 'white',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <CreditCard sx={{ fontSize: 20 }} />
                          Your last payment failed. Please update your payment method to continue using Pro features.
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => openCustomerPortal()}
                          sx={{
                            mt: 2,
                            backgroundColor: 'white',
                            color: '#EF4444',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            },
                          }}
                        >
                          Update Payment Method
                        </Button>
                      </Box>
                    )}

                    {userDetails?.user?.userDetails?.magicSubscription === 'true' && recentPaidInvoice && (
                      <Box sx={{ 
                        color: 'white',
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }
                      }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography 
                            sx={{ 
                              fontSize: '0.875rem',
                              letterSpacing: '0.01em',
                              opacity: 0.85,
                              textTransform: 'uppercase'
                            }}
                          >
                            Last Payment
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
                              {formatAmount(recentPaidInvoice.lines.data[0].amount_excluding_tax - 
                                (recentPaidInvoice.lines.data[0].discount_amounts?.[0]?.amount || 0), 
                                recentPaidInvoice.currency
                              )}
                            </Typography>
                            <Typography sx={{ 
                              fontSize: '0.75rem',
                              opacity: 0.85,
                            }}>
                              {new Date(recentPaidInvoice.created * 1000).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {userDetails?.user?.userDetails?.magicSubscription !== 'true' && (
                      <Button
                        variant="contained"
                        size="large"
                        onClick={openSubscriptionDialog}
                        sx={{
                          mt: 2,
                          backgroundColor: 'white',
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          },
                        }}
                      >
                        Upgrade to Pro
                      </Button>
                    )}
                  </Box>
                </Box>
                {[
                  { icon: <Block />, text: 'Ad-Free Experience' },
                  { icon: <SupportAgent />, text: 'Priority Support' },
                  { icon: <Bolt />, text: 'Early Access to New Features' },
                  { icon: <AutoFixHighRounded />, text: 'Monthly Magic Credits' },
                ].map(({ icon, text }) => (
                  <Box 
                    key={text}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      opacity: userDetails?.user?.userDetails?.magicSubscription === 'true' ? 1 : 0.5,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: userDetails?.user?.userDetails?.magicSubscription === 'true' 
                          ? 'primary.main'
                          : 'grey.700',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      {React.cloneElement(icon, { sx: { color: 'common.white' } })}
                    </Box>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 500,
                        textDecoration: userDetails?.user?.userDetails?.magicSubscription === 'true' ? 'none' : 'line-through',
                      }}
                    >
                      {text}
                    </Typography>
                  </Box>
                ))}
                {userDetails?.user?.userDetails?.magicSubscription !== 'true' && (
                  <Box 
                    onClick={openSubscriptionDialog}
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      color: 'common.white',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    <LockOpen sx={{ fontSize: 20 }} />
                    <Typography 
                      variant="body1"
                      sx={{ 
                        fontWeight: 600
                      }}
                    >
                      Unlock these features
                    </Typography>
                  </Box>
                )}

                {userDetails?.user?.userDetails?.magicSubscription === 'true' && (
                  <Box 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: 3,
                    }}
                  >
                    <Typography 
                      onClick={() => openCustomerPortal(true)}
                      sx={{ 
                        color: 'error.main',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {loadingCancelUrl ? (
                        <CircularProgress size={16} color="error" />
                      ) : (
                        'Cancel Subscription'
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            p: 3, 
            backgroundColor: 'background.paper',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            mb: 2 
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center', 
              m: 3
            }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                Billing Settings
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.8 }}>
                Update payment methods or cancel your subscription
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => openCustomerPortal()}
                disabled={loadingPortalUrl}
                sx={{ 
                  minWidth: '200px',
                  borderRadius: 50,
                  py: 1.5,
                  px: 4,
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {loadingPortalUrl ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Open Settings'
                )}
              </Button>
            </Box>
          </Card>

          <Card sx={{ 
            p: 3, 
            backgroundColor: 'background.paper',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              Invoices
            </Typography>
            <List>
              {invoices.map((invoice) => (
                <ListItem
                  key={invoice.id}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    mb: 1.5,
                    borderRadius: 2,
                    cursor: invoice.invoice_pdf ? 'pointer' : 'default',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: invoice.invoice_pdf ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                      transform: invoice.invoice_pdf ? 'translateY(-1px)' : 'none',
                    },
                  }}
                  onClick={() => openInvoicePDF(invoice.hosted_invoice_url)}
                >
                  <ListItemIcon>
                    <Receipt />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Invoice #${invoice.number}`}
                    secondary={`Period: ${new Date(invoice.period_start * 1000).toLocaleDateString()} - ${new Date(
                      invoice.period_end * 1000
                    ).toLocaleDateString()}`}
                  />
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadInvoicePDF(invoice.invoice_pdf);
                    }}
                    disabled={!invoice.invoice_pdf}
                  >
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

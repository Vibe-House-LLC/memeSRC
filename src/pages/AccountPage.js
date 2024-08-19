import { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, Container, Divider, Grid, Card, List, ListItem, ListItemIcon, ListItemText, IconButton, Chip, Skeleton, LinearProgress, CircularProgress } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { Receipt, Download, Block, SupportAgent, Bolt, AutoFixHighRounded, CreditCard } from '@mui/icons-material';
import { API } from 'aws-amplify';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const AccountPage = () => {
  const userDetails = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [invoices, setInvoices] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPortalUrl, setLoadingPortalUrl] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

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

  const openCustomerPortal = () => {
    setLoadingPortalUrl(true);
    API.post('publicapi', '/user/update/getPortalLink', {
      body: {
        currentUrl: window.location.href
      }
    }).then(results => {
      console.log(results);
      setLoadingPortalUrl(false);
      window.location.href = results;
    }).catch(error => {
      console.log(error.response);
      setLoadingPortalUrl(false);
    });
  };

  const isLoading = loadingInvoices || loadingSubscription;
  const recentPaidInvoice = invoices.find((invoice) => invoice.paid);
  const currentSubscription = recentPaidInvoice?.lines?.data?.[0]?.description
    ?.replace(/^1\s*×\s*/, '')
    ?.replace(/\s*\(memeSRC\)/i, '');


  // Check if user is logged in
  if (!userDetails?.user?.userDetails) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Account
      </Typography>
      <Divider sx={{ my: 3 }} />

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, backgroundColor: 'background.paper'}}>
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
              {userDetails?.user?.userDetails?.magicSubscription !== 'true' && (
                <Button
                  variant="contained" 
                  size="large" 
                  onClick={openSubscriptionDialog}
                  sx={{ minWidth: '200px' }}
                >
                  Subscribe Now
                </Button>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, backgroundColor: 'background.paper', mb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', m: 5}}>
              <Typography variant="h4" gutterBottom>
                Billing Settings
              </Typography>
              <Typography variant="p">
                Update payment methods or cancel your subscription
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => openCustomerPortal()}
                disabled={loadingPortalUrl}
                sx={{ minWidth: '200px', m: 2 }}
              >
                {loadingPortalUrl ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Open Settings'
                )}
              </Button>
            </Box>
          </Card>
          <Card sx={{ p: 3, backgroundColor: 'background.paper' }}>
            <Typography variant="h5" gutterBottom>
              Invoices
            </Typography>
            <List>
              {invoices.map((invoice) => (
                <ListItem
                  key={invoice.id}
                  sx={{
                    backgroundColor: 'action.hover',
                    mb: 1,
                    borderRadius: 1,
                    cursor: invoice.invoice_pdf ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: invoice.invoice_pdf ? 'action.selected' : 'action.hover',
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

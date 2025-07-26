import { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, Container, LinearProgress, Chip, Card, Divider, Grid } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { API } from 'aws-amplify';
import Receipt from '@mui/icons-material/Receipt';
import { LoadingButton } from '@mui/lab';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const InvoiceListPage = () => {
  const userDetails = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [invoices, setInvoices] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingSubscriptionUrl, setLoadingSubscriptionUrl] = useState(false);

  const logIntoCustomerPortal = () => {
    setLoadingSubscriptionUrl(true)
    API.post('publicapi', '/user/update/getPortalLink', {
      body: {
        currentUrl: window.location.href
      }
    }).then(results => {
      console.log(results)
      setLoadingSubscriptionUrl(false)
      window.location.href = results
    }).catch(error => {
      setLoadingSubscriptionUrl(false)
      console.log(error.response)
    })
  }

  useEffect(() => {
    fetchInvoices();
  }, [page]);

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

  const columns = [
    { field: 'number', headerName: 'Invoice Number', width: 200, headerClassName: 'header', cellClassName: 'cell' },
    {
      field: 'period',
      headerName: 'Period',
      width: 300,
      headerClassName: 'header',
      cellClassName: 'cell',
      valueGetter: (params) =>
        `${new Date(params.row.period_start * 1000).toLocaleDateString()} - ${new Date(
          params.row.period_end * 1000
        ).toLocaleDateString()}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      headerClassName: 'header',
      cellClassName: 'cell',
      renderCell: (params) => {
        const status = params.value;
        let cleanStatus = ''
        let color = '';

        if (status === 'paid') {
          cleanStatus = 'Paid'
          color = 'success';
        } else if (status === 'open') {
          cleanStatus = 'Attempt Made'
          color = 'warning';
        } else {
          cleanStatus = status;
          color = 'default';
        }

        return <Chip label={cleanStatus} color={color} />;
      },
    },
    {
      field: 'actions',
      headerName: '',
      flex: 1,
      headerAlign: 'right',
      align: 'right',
      headerClassName: 'header',
      cellClassName: 'cell',
      renderCell: (params) => (
        <Button
          variant="contained"
          color="primary"
          onClick={() => openInvoicePDF(params.row.invoice_pdf)}
          disabled={!params.row.invoice_pdf}
          startIcon={<Receipt />}
        >
          Download PDF
        </Button>
      ),
    },
  ];

  const recentPaidInvoice = invoices.find((invoice) => invoice.paid);
  const currentSubscription = recentPaidInvoice?.lines?.data?.[0]?.description
    ?.replace(/^1\s*×\s*/, '')
    ?.replace(/\s*\(memeSRC\)/i, '');

  return (
    <Container maxWidth="lg" sx={{ mt: 5 }}>
      <Typography fontSize={37} fontWeight={700} gutterBottom>
        Subscription Management
      </Typography>
      <Divider sx={{ my: 3 }} />

      <Card sx={{ mb: 3, pb: 1 }}>
        <Grid container alignItems='center'>
          <Grid xs sx={{ p: 3 }}>
            <Typography variant="h3">
              Current Subscription
            </Typography>
            {userDetails?.user?.userDetails?.magicSubscription === 'true' ?
              <>
                {currentSubscription ? (
                  <Typography fontSize={18} fontWeight={700}>{currentSubscription}</Typography>
                ) : (
                  <>
                    {loading ? <LinearProgress sx={{ width: 300, py: 1, mt: 1.4 }} /> : <Typography>No current subscription found.</Typography>}
                  </>
                )}
              </>
              :
              <Typography>No current subscription found.</Typography>
            }

          </Grid>
          <Grid xs={12} md={4} sx={{ p: 3 }}>
            {userDetails?.user?.userDetails?.magicSubscription === 'true' ? (
              <LoadingButton
                loading={loadingSubscriptionUrl}
                onClick={() => { logIntoCustomerPortal(); }}
                variant="contained"
                size="large"
                fullWidth
              >
                Manage Subscription
              </LoadingButton>
            ) : (
              <>
                <LoadingButton
                  onClick={openSubscriptionDialog}
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{
                    backgroundColor: (theme) => theme.palette.success.main,
                    color: (theme) => theme.palette.common.black,
                    '&:hover': {
                      ...(!loadingSubscriptionUrl && {
                        backgroundColor: (theme) => theme.palette.success.dark,
                        color: (theme) => theme.palette.common.black,
                      }),
                    },
                  }}
                >
                  Get memeSRC Pro
                  {/* <Chip size='small' sx={{ ml: 1, backgroundColor: 'white', color: 'green' }} label="30% off" /> */}
                </LoadingButton>
                {/* <Typography
                                    variant="caption"
                                    display="block"
                                    gutterBottom
                                    align="center"
                                    sx={{ pt: 1, marginTop: 1, opacity: 0.8 }}
                                >
                                    69 credits/mo for <del>$6.00</del> $4.20. Cancel any time.
                                </Typography> */}
              </>
            )}
          </Grid>
        </Grid>

      </Card>
      <Card sx={{ p: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Invoices
          </Typography>
          <div style={{ width: '100%', height: '100%' }}>
            <DataGrid
              rows={invoices}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              loading={loading}
              autoHeight
              disableSelectionOnClick
              sx={{
                '& .header': {
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                },
                '& .cell': {
                  fontSize: '1.1rem',
                },
              }}
            />
          </div>
          {hasMore && !loading && (
            <Button variant="outlined" onClick={handleLoadMore}>
              Load More
            </Button>
          )}
        </Box>
      </Card>
    </Container>
  );
};

export default InvoiceListPage;
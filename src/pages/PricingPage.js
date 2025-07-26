import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Grid, Card, Typography, Stack, Divider, ToggleButtonGroup, ToggleButton, Link, } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Check from '@mui/icons-material/Check';


export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState('yearly');

  const toggleBillingPeriod = () => {
    setBillingPeriod(billingPeriod === 'yearly' ? 'monthly' : 'yearly')
  }

  return (
    <>
      <Helmet>
        <title> Pricing • memeSRC </title>
      </Helmet>
      <Container maxWidth="lg" sx={{ height: '100%', mt: { xs: 3, md: 5 } }}>
        <Grid container height="100%" justifyContent="center" alignItems="center" spacing={5}>
          <Grid item xs={12} my={5}>
            <center>
              <Typography variant='h2' fontWeight={700}>
                Purchase a subcription
              </Typography>
              <Typography variant='h5' mt={3}>
                Save 10% when choosing a annual subscription
              </Typography>
            </center>
          </Grid>
          <Grid item xs={12}>
            <center>
              <ToggleButtonGroup
                color='success'
                exclusive
                aria-label="Platform"
                size='large'
                value={billingPeriod}
                onChange={(event) => {
                  setBillingPeriod(event.target.value)
                }}
              >
                <ToggleButton
                  value="monthly"
                  sx={{
                    px: { xs: 3.6, md: 8 },
                    py: { xs: 1.3, md: 2 },
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                  }}
                >
                  Monthly Billing
                </ToggleButton>
                <ToggleButton
                  value="yearly"
                  sx={{
                    px: { xs: 3.6, md: 8 },
                    py: { xs: 1.3, md: 2 },
                    borderTopRightRadius: 16,
                    borderBottomRightRadius: 16,
                  }}
                >
                  Annual Billing
                </ToggleButton>
              </ToggleButtonGroup>
            </center>
          </Grid>
          <Grid item xs={12} sm={8.5} md={5.5} lg={5}>
            <Card sx={{ borderRadius: 4 }}>
              <Stack sx={{ px: { xs: 3, md: 8 }, pt: { xs: 3, md: 6 }, pb: 4, backgroundColor: (theme) => theme.palette.secondary.dark }}>
                <Typography variant='h4' fontWeight={400} color={(theme) => theme.palette.success.main} mb={3}>
                  Magic 69
                </Typography>
                <Typography component='span' variant='h2'>
                  {billingPeriod === 'yearly' ? '$5.40' : '$6'}
                  <Typography component='span' variant='subtitle1' fontWeight={400} color={(theme) => theme.palette.text.secondary}> / month</Typography>
                </Typography>
                <Typography variant='subtitle1'>
                  {billingPeriod === 'yearly' ? 'Billed Annually' : 'Billed Monthly'}
                </Typography>
                <LoadingButton variant='contained' fullWidth size='large' sx={{ mt: 4, fontWeight: 400, backgroundColor: (theme) => theme.palette.success.main, color: (theme) => theme.palette.common.black, '&:hover': { backgroundColor: (theme) => theme.palette.success.dark, color: (theme) => theme.palette.common.black } }}>
                  Subscribe
                </LoadingButton>
                <Stack direction='row' justifyContent='center' alignItems='center' mt={2}>
                  <Typography textAlign='center' variant='body2'>
                    <Link sx={{ color: theme => theme.palette.common.white, textUnderlineOffset: 4, textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }} onClick={toggleBillingPeriod}>
                      {billingPeriod === 'yearly' ? 'Switch To Monthly Billing' : 'Save 10% For Paying Annually'}
                    </Link>
                  </Typography>
                  <ArrowForward sx={{ ml: 0.5 }} fontSize='small' />
                </Stack>
              </Stack>
              <Stack sx={{ px: { xs: 3, md: 8 }, py: { xs: 3, md: 6 } }}>
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Use 69 Magic credits / month
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Access Magic Eraser & Magic Fill
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Early Access to experimental tools
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Optional credit top ups
                  </Typography>
                </Stack>
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} sm={8.5} md={5.5} lg={5}>
            <Card sx={{ borderRadius: 4 }}>
              <Stack sx={{ px: { xs: 3, md: 8 }, pt: { xs: 3, md: 6 }, pb: 4, backgroundColor: (theme) => theme.palette.secondary.dark }}>
                <Typography variant='h4' fontWeight={400} color={(theme) => theme.palette.success.main} mb={3}>
                  Magic 420
                </Typography>
                <Typography component='span' variant='h2'>
                  {billingPeriod === 'yearly' ? '$25.20' : '$28'}
                  <Typography component='span' variant='subtitle1' fontWeight={400} color={(theme) => theme.palette.text.secondary}> / month</Typography>
                </Typography>
                <Typography variant='subtitle1'>
                  {billingPeriod === 'yearly' ? 'Billed Annually' : 'Billed Monthly'}
                </Typography>
                <LoadingButton variant='contained' fullWidth size='large' sx={{ mt: 4, fontWeight: 400, backgroundColor: (theme) => theme.palette.success.main, color: (theme) => theme.palette.common.black, '&:hover': { backgroundColor: (theme) => theme.palette.success.dark, color: (theme) => theme.palette.common.black } }}>
                  Subscribe
                </LoadingButton>
                <Stack direction='row' justifyContent='center' alignItems='center' mt={2}>
                  <Typography textAlign='center' variant='body2'>
                    <Link sx={{ color: theme => theme.palette.common.white, textUnderlineOffset: 4, textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }} onClick={toggleBillingPeriod}>
                      {billingPeriod === 'yearly' ? 'Switch To Monthly Billing' : 'Save 10% For Paying Annually'}
                    </Link>
                  </Typography>
                  <ArrowForward sx={{ ml: 0.5 }} fontSize='small' />
                </Stack>
              </Stack>
              <Stack sx={{ px: { xs: 3, md: 8 }, py: { xs: 3, md: 6 } }}>
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Use 420 Magic credits / month
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Access Magic Eraser & Magic Fill
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Early Access to experimental tools
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyItems='start' py={2}>
                  <Check color='success' sx={{ mr: 1 }} />
                  <Typography variant='body1'>
                    Optional credit top ups
                  </Typography>
                </Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Container >
    </>
  );
}

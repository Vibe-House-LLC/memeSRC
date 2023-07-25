import { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Container, Grid, Stack, } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import { SnackbarContext } from '../SnackbarContext';



export default function ContributorRequest() {
  const [loadingContributorStatus, setloadingContributorStatus] = useState();
  const { user } = useContext(UserContext);
  const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)
  const [buttonText, setButtonText] = useState();
  const navigate = useNavigate()

  const becomeContributor = () => {
    if (user) {
      setloadingContributorStatus(true)
      API.get('publicapi', '/user/update/contributorStatus').then(response => {
        setMessage(response.message)
        setSeverity('success')
        setOpen(true)
        setButtonText('Thanks For Applying!')
        setloadingContributorStatus(false)
      }).catch(error => {
        console.log(error)
        setMessage('There was an error. Please try again.')
        setSeverity('success')
        setOpen(true)
        setloadingContributorStatus(false)
      })
    } else {
      navigate('/signup')
    }
  }

  useEffect(() => {
    if (user?.userDetails?.contributorAccessStatus) {
      setButtonText('Thanks For Applying!')
    }
  })

  return (
    <>
      <Helmet>
        <title> Contributor Request | memeSRC 2.0 </title>
      </Helmet>
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        <Grid container height='100%' justifyContent='center' alignItems='center'>
          <Grid item>
            <Stack spacing={3} justifyContent='center'>
              <Typography variant='h3' textAlign='center'>
                Want to become a contributor?
              </Typography>
              <Typography variant='h6' textAlign='center'>
                We are giving very limited access for <br /> users to contribute to the content on <b>memeSRC</b>.
              </Typography>
            </Stack>
            <center>
              <LoadingButton loading={loadingContributorStatus} disabled={buttonText || loadingContributorStatus} onClick={becomeContributor} variant='contained' size='large' sx={{ mt: 5, fontSize: 17 }}>
                {buttonText || 'Request Contributor Access'}
              </LoadingButton>
            </center>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

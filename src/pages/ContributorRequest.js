import { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Container, Grid, Stack, } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import { Link, useNavigate } from 'react-router-dom';
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
                Upload Something New
              </Typography>
              <Typography variant='body' textAlign='center'>
                We're testing new tools to make it easier for <br /> everyone to contribute new content.
              </Typography>
            </Stack>
            <center>
              <LoadingButton loading={loadingContributorStatus} disabled={buttonText || loadingContributorStatus} onClick={becomeContributor} variant='contained' size='large' sx={{ mt: 5, fontSize: 17 }}>
                {buttonText || 'Request Access'}
              </LoadingButton>
            </center>
            <Typography variant='body2' textAlign='center' style={{opacity: 0.7}}>
              <br /><br />
                Don't forget you can also <Link to='/vote' style={{color: 'white'}}>vote</Link> on requests, <br />or <a href='https://memesrc.com/donate' style={{color: 'white'}} target='_blank' rel="noreferrer">donate</a> to support <b>memeSRC</b>'s development.
              </Typography>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

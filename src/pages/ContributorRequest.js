import { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Typography, Container, Grid, Stack, FormControl, InputLabel, Select, MenuItem, } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API, graphqlOperation } from 'aws-amplify';
import { Link, useNavigate } from 'react-router-dom';
import UploadToSeriesPage from '../sections/@dashboard/series/UploadToSeriesPage';
import { listSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';
import { SnackbarContext } from '../SnackbarContext';



export default function ContributorRequest() {
  const [loadingContributorStatus, setloadingContributorStatus] = useState();
  const { user } = useContext(UserContext);
  const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)
  const [buttonText, setButtonText] = useState();
  const [seriesList, setSeriesList] = useState();
  const [series, setSeries] = useState();
  const navigate = useNavigate()

  const authorized = user?.['cognito:groups']?.some((element) => {
    return element === 'admins' || element === 'mods' || element === 'contributors';
  })

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

  async function listAllSeries(limit = 50, nextToken = null, result = []) {
    const listAllSeriesQuery = { limit, nextToken };

    const response = await API.graphql({
      query: listSeries,
      variables: listAllSeriesQuery,
      authMode: 'AMAZON_COGNITO_USER_POOLS',
    });

    const items = response.data.listSeries.items;
    result.push(...items);

    if (response.data.listSeries.nextToken) {
      return listAllSeries(limit, response.data.listSeries.nextToken, result);
      // eslint-disable-next-line no-else-return
    } else {
      setSeriesList(result.sort((a, b) => a.name.localeCompare(b.name)))
      return null
    }
  }

  const handleChooseSeries = (seriesId) => {
    setSeries(seriesId.target.value)
  }

  useEffect(() => {
    if (user?.userDetails?.contributorAccessStatus) {
      setButtonText('Thanks For Applying!')
    }
  })

  useEffect(() => {
    listAllSeries();
  }, [])

  return (
    <>
      <Helmet>
        <title> Contributor Request | memeSRC 2.0 </title>
      </Helmet>
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        {!authorized ?
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
              <Typography variant='body2' textAlign='center' style={{ opacity: 0.7 }}>
                <br /><br />
                Don't forget you can also <Link to='/vote' style={{ color: 'white' }}>vote</Link> on requests, <br />or <a href='https://memesrc.com/donate' style={{ color: 'white' }} target='_blank' rel="noreferrer">donate</a> to support <b>memeSRC</b>'s development.
              </Typography>
            </Grid>
          </Grid>
          :
          <Grid container justifyContent='center' mt={10}>
            <Grid item xs={12} md={8} lg={6}>
              <FormControl fullWidth sx={{mb: 3}}>
                <InputLabel id="demo-simple-select-label">{seriesList ? 'Choose Series' : 'Loading series...'}</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={series}
                  label={seriesList ? 'Choose Series' : 'Loading all series...'}
                  fullWidth
                  onChange={handleChooseSeries}
                  disabled={!seriesList}
                >
                  {seriesList && seriesList.map(seriesObj =>
                    <MenuItem key={seriesObj.id} value={seriesObj.id}>{seriesObj.name}</MenuItem>
                  )}
                </Select>
              </FormControl>
              {series &&
                <UploadToSeriesPage seriesId={series} />
              }
            </Grid>
          </Grid>
        }
      </Container>
    </>
  );
}

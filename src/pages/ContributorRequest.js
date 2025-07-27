import { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import { Link, useNavigate } from 'react-router-dom';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import UploadToSeriesPage from '../sections/@dashboard/series/UploadToSeriesPage';
import { listSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';
import { SnackbarContext } from '../SnackbarContext';

const headerMarkdownContent = `
  # Upload (early access)
  
  We're testing new tools to make it easier for everyone to upload new content. 
  
  ## Getting started
  
  You're in! You've been accepted to test an **extremely early version** of this feature, so expect a bit of confusion and beware of bugs. In order to index your data for search, memeSRC requires it be prepared in a particular way. These instructions will get you started, and feel free to reach out if you have questions.

  ## #1: Prepare your data

  For now, your data must be ready for indexing before uploading. This means all required media and matching subtitles are in sync, extracted, and adhere to the data structure requirements described below.
  
  ## #2: Structure your data

  You should upload a **zip file** containing 2 directories called \`media\` and \`subs\`: 

  1. **\`/media\`**: the source media files
      \`\`\`
      /media/1-1.mkv
      /media/1-1.mkv
      /media/1-3.mkv
      /media/2-1.mkv
      /media/2-2.mkv
      /media/2-3.mkv
      ...
      \`\`\`
  1. **\`/subs\`**: the source subtitle files
      \`\`\`
      /subs/1-1.srt
      /subs/1-1.srt
      /subs/1-3.srt
      /subs/2-1.srt
      /subs/2-2.srt
      /subs/2-3.srt
      ...
      \`\`\`


  The file naming structure is \`S-E.ext\` where \`S\` is the season number, \`E\` the episode number, and \`ext\` the file extension. All subtitles should be SRT files, but video file formats are more flexible.
  
  _**Note: These requirements will change over time as the process is refined.**_

  ## #3: Select an index

  Pick an index for your show. Generally, an index corresponds to a show, movie, or some other collection of searchable content. If your desired index does not yet exist, [submit a request](/vote).
  
`;

const bodyMarkdownContent = `
  ## #4: Upload your data

  Once you've selected your series, upload your zip file bundle. Your submission will be reviewed for data structure or inappropriate content. If approved, it will be processed and indexed to search and you'll receive a notification.

  ### Terms of Service

  By uploading content to memeSRC, you are acknowledging you have all necessary rights to utilize the content and agree to adhere to all applicable laws. By using this tool, you are agreeing to the memeSRC [**Terms of Service**](/termsofservice) and [**Privacy Policy**](/privacypolicy).
`;


export default function ContributorRequest() {
  const [loadingContributorStatus, setloadingContributorStatus] = useState();
  const { user } = useContext(UserContext);
  const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)
  const [buttonText, setButtonText] = useState();
  const [seriesList, setSeriesList] = useState();
  const [series, setSeries] = useState();
  const navigate = useNavigate()

  const authorized = user?.['cognito:groups']?.some((element) => element === 'admins' || element === 'contributors')

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

    const {items} = response.data.listSeries;
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
        <title> Upload • memeSRC </title>
      </Helmet>
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        {!authorized ? (
          <Grid container height="100%" justifyContent="center" alignItems="center">
            <Grid item>
              <Stack spacing={3} justifyContent="center">
                <Typography variant="h3" textAlign="center">
                  Upload Something New
                </Typography>
                <Typography variant="body" textAlign="center">
                  We're testing new tools to make it easier for <br /> everyone to contribute new content.
                </Typography>
              </Stack>
              <center>
                <LoadingButton
                  loading={loadingContributorStatus}
                  disabled={buttonText || loadingContributorStatus}
                  onClick={becomeContributor}
                  variant="contained"
                  size="large"
                  sx={{ mt: 5, fontSize: 17 }}
                >
                  {buttonText || 'Request Access'}
                </LoadingButton>
              </center>
              <Typography variant="body2" textAlign="center" style={{ opacity: 0.7 }}>
                <br />
                <br />
                Don't forget you can also{' '}
                <Link to="/vote" style={{ color: 'white' }}>
                  vote
                </Link>{' '}
                on requests, <br />
                or{' '}
                <a href="https://memesrc.com/donate" style={{ color: 'white' }} target="_blank" rel="noreferrer">
                  donate
                </a>{' '}
                to support <b>memeSRC</b>'s development.
              </Typography>
            </Grid>
          </Grid>
        ) : (
          <Grid container justifyContent="center" mt={10}>
            <Grid item xs={12} md={8} lg={6}>
              <Grid item>
                <ReactMarkdown>{headerMarkdownContent}</ReactMarkdown>
              </Grid>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="demo-simple-select-label">
                  {seriesList ? 'Choose Series' : 'Loading series...'}
                </InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={series}
                  label={seriesList ? 'Choose Series' : 'Loading all series...'}
                  fullWidth
                  onChange={handleChooseSeries}
                  disabled={!seriesList}
                >
                  {seriesList &&
                    seriesList.map((seriesObj) => (
                      <MenuItem key={seriesObj.id} value={seriesObj.id}>
                        {seriesObj.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {series && <UploadToSeriesPage seriesId={series} />}
              <Grid item>
                <ReactMarkdown>{bodyMarkdownContent}</ReactMarkdown>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Container>
    </>
  );
}

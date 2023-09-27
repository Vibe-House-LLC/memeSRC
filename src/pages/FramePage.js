import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { API } from 'aws-amplify';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Slider,
  CircularProgress,
  Stack,
  Tooltip,
  Skeleton,
  ListItem,
  ListItemIcon,
  Fab,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  useMediaQuery,
  Box,
} from '@mui/material';
import { Add, Close, ContentCopy, GpsFixed, GpsNotFixed, HistoryToggleOffRounded, Home, Menu } from '@mui/icons-material';
import useSearchDetails from '../hooks/useSearchDetails';

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMedia = styled('img')`
  width: 100%;
  height: auto;
  background-color: black;
`;

export default function FramePage({ shows = [] }) {
  const { setFrame } = useSearchDetails();
  const navigate = useNavigate();
  const { fid } = useParams();
  const [frameData, setFrameData] = useState({});
  const [surroundingFrames, setSurroundingFrames] = useState();
  const [sliderValue, setSliderValue] = useState(0);
  const [middleIndex, setMiddleIndex] = useState(0);
  const [displayImage, setDisplayImage] = useState(`https://memesrc.com/${fid.split('-')[0]}/img/${fid.split('-')[1]}/${fid.split('-')[2]}/${fid}.jpg`);
  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [showTitle, setShowTitle] = useState('');
  const [episodeDetails, setEpisodeDetails] = useState();

  const getCurrentQueryString = () => {
    const currentUrl = window.location.href;
    const queryStringStartIndex = currentUrl.indexOf('?');

    // Check if a query string is found; if not, return an empty string
    if (queryStringStartIndex !== -1) {
      return currentUrl.substring(queryStringStartIndex);
    }

    return '';
  };

  useEffect(() => {
    // Ensure `fid` and `shows` are defined
    if (fid && shows && shows.length > 0) {
      const foundShow = shows.find((obj) => obj.id === fid.split('-')[0]);

      // Check if a matching show was found
      if (foundShow) {
        setShowTitle(foundShow.title);
      } else {
        console.error(`Show with ID ${fid.split('-')[0]} not found.`);
      }
    } else {
      console.error('Invalid `fid` or `shows` array.');
    }
    setEpisodeDetails(fid.split('-'))
  }, [fid, shows]);

  const isMd = useMediaQuery((theme) => theme.breakpoints.up('md'))

  const handleSubtitlesExpand = () => {
    setSubtitlesExpanded(!subtitlesExpanded);
  };

  useEffect(() => {
    setLoading(true)
    const getSessionID = async () => {
      let sessionID;
      if ("sessionID" in sessionStorage) {
        sessionID = sessionStorage.getItem("sessionID");
        return Promise.resolve(sessionID);
      }
      return API.get('publicapi', '/uuid')
        .then(generatedSessionID => {
          sessionStorage.setItem("sessionID", generatedSessionID);
          return generatedSessionID;
        })
        .catch(err => {
          console.log(`UUID Gen Fetch Error:  ${err}`);
          throw err;
        });
    };

    getSessionID()
      .then(sessionId => {
        const queryStringParams = { queryStringParameters: { fid, sessionId } }
        return API.get('publicapi', '/frame', queryStringParams)
      })
      .then(data => {
        // setDisplayImage(`https://memesrc.com/${fid.split('-')[0]}/img/${fid.split('-')[1]}/${fid.split('-')[2]}/${fid}.jpg`)
        setFrameData(data);
        setFrame(fid)
        setSurroundingFrames(data.frames_surrounding);
        const newMiddleIndex = Math.floor(data.frames_fine_tuning.length / 2);
        const initialFineTuneImage = data.frames_fine_tuning[newMiddleIndex];
        setMiddleIndex(newMiddleIndex)
        setDisplayImage(`https://memesrc.com${initialFineTuneImage}`);
        setLoading(false)
      })
      .catch(console.error);
  }, [fid]);

  useEffect(() => {
    if (frameData.frames_fine_tuning && middleIndex !== 0) {
      const displayIndex = middleIndex + sliderValue;
      const newDisplayFrame = frameData.frames_fine_tuning[displayIndex];
      setDisplayImage(`https://memesrc.com${newDisplayFrame}`);
    }
  }, [sliderValue, frameData, middleIndex]);

  const renderSurroundingFrames = () => {
    let returnedElement;

    if (surroundingFrames) {
      returnedElement =
        <Grid container spacing={2}>
          {surroundingFrames.map((frame, index) => (
            <Grid item xs={4} sm={4} md={12 / 9} key={frame}>
              <a style={{ textDecoration: 'none' }}>
                <StyledCard style={{ border: fid === frame ? '3px solid orange' : '' }}>
                  {/* {console.log(`${fid} = ${result?.fid}`)} */}
                  <StyledCardMedia
                    component="img"
                    alt={`${frame.fid}`}
                    src={`https://memesrc.com${frame.frame_image}`}
                    title={frame.subtitle || 'No subtitle'}
                    onClick={() => {
                      navigate(`/frame/${frame.fid}`)
                    }}
                  />
                </StyledCard>
              </a>
            </Grid>
          ))}
        </Grid>
    }
    return returnedElement
  };

  const renderFineTuningFrames = () => {
    return (
      <>
        <CardMedia
          component={loading ? () => <Skeleton variant='rectangular' sx={{ width: '100%', height: 'auto', aspectRatio }} /> : 'img'}
          alt={`Fine-tuning ${sliderValue}`}
          image={displayImage}
          id='frameImage'
        />
        {/* <Slider
          value={sliderValue}
          min={-middleIndex}
          max={middleIndex}
          step={1}
          onChange={(e, newValue) => setSliderValue(newValue)}
        /> */}

        <Stack spacing={2} direction="row" p={2} pr={3} alignItems={'center'}>
          <Tooltip title="Fine Tuning">
            <IconButton>
              <HistoryToggleOffRounded alt="Fine Tuning" />
            </IconButton>
          </Tooltip>
          <Slider
            size="small"
            defaultValue={4}
            min={-middleIndex}
            max={middleIndex}
            value={sliderValue}
            step={1}
            onChange={(e, newValue) => setSliderValue(newValue)}
            valueLabelFormat={(value) => `Fine Tuning: ${((value - 4) / 10).toFixed(1)}s`}
            marks
          />
        </Stack>
      </>
    );
  };


  return (
    <>
      <Helmet>
        <title> Frame Details | memeSRC 2.0 </title>
      </Helmet>

      {/* <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" to="/" component={RouterLink}>
            <Home />
          </IconButton>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            <>
              <RouterLink to={`/series/${fid.split('-')[0]}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {fid.split('-')[0]}
              </RouterLink>
              <Chip
                size='small'
                label={`S${fid.split('-')[1]} E${fid.split('-')[2]}`}
                sx={{
                  marginLeft: '5px',
                  "& .MuiChip-label": {
                    fontWeight: 'bold',
                  },
                }}
              />
            </>
          </Typography>
        </Toolbar>
      </AppBar> */}

      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Grid container spacing={2} direction="row" alignItems="center">
          {/* <Grid item xs={12}>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              <>
                <RouterLink to={`/series/${fid.split('-')[0]}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {showTitle}
                </RouterLink>
                <Chip
                  size='small'
                  label={`S${fid.split('-')[1]} E${fid.split('-')[2]}`}
                  sx={{
                    marginLeft: '5px',
                    "& .MuiChip-label": {
                      fontWeight: 'bold',
                    },
                  }}
                />
              </>
            </Typography>
          </Grid> */}
          <Grid item xs={12} md={6}>
            <Card>
              {renderFineTuningFrames()}
            </Card>
            {!isMd &&
              <Card sx={{ mt: 3 }}>
                <Accordion expanded={subtitlesExpanded} disableGutters>
                  <AccordionSummary sx={{ paddingX: 1.55 }} onClick={handleSubtitlesExpand} textAlign="center">
                    <Typography marginRight="auto" fontWeight="bold" color="#CACACA" fontSize={14.8}>
                      {subtitlesExpanded ? (
                        <Close style={{ verticalAlign: 'middle', marginTop: '-3px', marginRight: '10px' }} />
                      ) : (
                        <Menu style={{ verticalAlign: 'middle', marginTop: '-3px', marginRight: '10px' }} />
                      )}
                      {subtitlesExpanded ? 'Hide' : 'View'} Nearby Subtitles
                    </Typography>
                    {/* <Chip size="small" label="New!" color="success" /> */}
                  </AccordionSummary>
                  <AccordionDetails sx={{ paddingY: 0, paddingX: 0 }}>
                    <List sx={{ padding: '.5em 0' }}>
                      {surroundingFrames &&
                        surroundingFrames
                          .filter(
                            (result, index, array) =>
                              result?.subtitle &&
                              (index === 0 ||
                                result?.subtitle.replace(/\n/g, ' ') !==
                                array[index - 1].subtitle.replace(/\n/g, ' '))
                          )
                          .map((result) => (
                            <ListItem key={result?.id} disablePadding sx={{ padding: '0 0 .6em 0' }}>
                              <ListItemIcon sx={{ paddingLeft: '0' }}>
                                <Fab
                                  size="small"
                                  sx={{
                                    backgroundColor: theme => theme.palette.background.paper,
                                    boxShadow: 'none',
                                    marginLeft: '5px',
                                    '&:hover': {
                                      xs: { backgroundColor: 'inherit' },
                                      md: {
                                        backgroundColor:
                                          result?.subtitle.replace(/\n/g, ' ') ===
                                            frameData?.subtitle?.replace(/\n/g, ' ')
                                            ? 'rgba(0, 0, 0, 0)'
                                            : 'ButtonHighlight',
                                      },
                                    },
                                  }}
                                  onClick={() => navigate(`/frame/${result?.fid}`)}
                                >
                                  {loading ? (
                                    <CircularProgress size={20} sx={{ color: '#565656' }} />
                                  ) : result?.subtitle.replace(/\n/g, ' ') ===
                                    frameData?.subtitle?.replace(/\n/g, ' ') ? (
                                    <GpsFixed
                                      sx={{
                                        color:
                                          result?.subtitle.replace(/\n/g, ' ') ===
                                            frameData?.subtitle?.replace(/\n/g, ' ')
                                            ? 'rgb(202, 202, 202)'
                                            : 'rgb(89, 89, 89)',
                                        cursor: 'pointer',
                                      }}
                                    />
                                  ) : (
                                    <GpsNotFixed sx={{ color: 'rgb(89, 89, 89)', cursor: 'pointer' }} />
                                  )}
                                </Fab>
                              </ListItemIcon>
                              <ListItemText sx={{ color: 'rgb(173, 173, 173)', fontSize: '4em' }}>
                                <Typography
                                  component="p"
                                  variant="body2"
                                  color={
                                    result?.subtitle.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')
                                      ? 'rgb(202, 202, 202)'
                                      : ''
                                  }
                                  fontWeight={
                                    result?.subtitle.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')
                                      ? 700
                                      : 400
                                  }
                                >
                                  {result?.subtitle.replace(/\n/g, ' ')}
                                </Typography>
                              </ListItemText>
                            </ListItem>
                          ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Card>
            }
          </Grid>
          <Grid item xs={12} md={6} display='flex'>
            <Box sx={{ marginBottom: '1rem', px: 5, mx: isMd ? 0 : 'auto' }}>
              <Typography variant="h4" component="div" style={{ marginBottom: '0.5rem' }} textAlign={isMd ? 'left' : 'center'}>
                {showTitle}
                <Chip
                  size='small'
                  label={`S${fid.split('-')[1]} E${fid.split('-')[2]}`}
                  sx={{
                    marginLeft: '5px',
                    "& .MuiChip-label": {
                      fontWeight: 'bold',
                    },
                  }}
                />
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" style={{ marginBottom: '1rem' }} textAlign={isMd ? 'left' : 'center'}>
                {loading ?
                  <Skeleton variant='text' height={25} width={'max(100px, 50%)'} />
                  :
                  <>
                    {frameData.subtitle ? `"${frameData.subtitle}"` : null}
                  </>
                }
              </Typography>

              <Button size="large" fullWidth={!isMd} variant="contained" to={`/editor/${fid}${getCurrentQueryString()}`} component={RouterLink} style={{ marginBottom: '1rem' }}>
                Add Captions & Edit Photo
              </Button>

              {/* <Typography variant="subtitle1" color="text.secondary" style={{ marginBottom: '1rem' }}>
                TODO: add more metadata, links, content, etc. here
              </Typography> */}
            </Box>
          </Grid>
          {isMd &&
            <Grid item xs={12} md={6}>
              <Card>
                <Accordion expanded={subtitlesExpanded} disableGutters>
                  <AccordionSummary sx={{ paddingX: 1.55 }} onClick={handleSubtitlesExpand} textAlign="center">
                    <Typography marginRight="auto" fontWeight="bold" color="#CACACA" fontSize={14.8}>
                      {subtitlesExpanded ? (
                        <Close style={{ verticalAlign: 'middle', marginTop: '-3px', marginRight: '10px' }} />
                      ) : (
                        <Menu style={{ verticalAlign: 'middle', marginTop: '-3px', marginRight: '10px' }} />
                      )}
                      {subtitlesExpanded ? 'Hide' : 'View'} Nearby Subtitles
                    </Typography>
                    {/* <Chip size="small" label="New!" color="success" /> */}
                  </AccordionSummary>
                  <AccordionDetails sx={{ paddingY: 0, paddingX: 0 }}>
                    <List sx={{ padding: '.5em 0' }}>
                      {surroundingFrames &&
                        surroundingFrames
                          .filter(
                            (result, index, array) =>
                              result?.subtitle &&
                              (index === 0 ||
                                result?.subtitle.replace(/\n/g, ' ') !==
                                array[index - 1].subtitle.replace(/\n/g, ' '))
                          )
                          .map((result) => (
                            <ListItem key={result?.id} disablePadding sx={{ padding: '0 0 .6em 0' }}>
                              <ListItemIcon sx={{ paddingLeft: '0' }}>
                                <Fab
                                  size="small"
                                  sx={{
                                    backgroundColor: theme => theme.palette.background.paper,
                                    boxShadow: 'none',
                                    marginLeft: '5px',
                                    '&:hover': {
                                      xs: { backgroundColor: 'inherit' },
                                      md: {
                                        backgroundColor:
                                          result?.subtitle.replace(/\n/g, ' ') ===
                                            frameData?.subtitle?.replace(/\n/g, ' ')
                                            ? 'rgba(0, 0, 0, 0)'
                                            : 'ButtonHighlight',
                                      },
                                    },
                                  }}
                                  onClick={() => navigate(`/frame/${result?.fid}`)}
                                >
                                  {loading ? (
                                    <CircularProgress size={20} sx={{ color: '#565656' }} />
                                  ) : result?.subtitle.replace(/\n/g, ' ') ===
                                    frameData?.subtitle?.replace(/\n/g, ' ') ? (
                                    <GpsFixed
                                      sx={{
                                        color:
                                          result?.subtitle.replace(/\n/g, ' ') ===
                                            frameData?.subtitle?.replace(/\n/g, ' ')
                                            ? 'rgb(202, 202, 202)'
                                            : 'rgb(89, 89, 89)',
                                        cursor: 'pointer',
                                      }}
                                    />
                                  ) : (
                                    <GpsNotFixed sx={{ color: 'rgb(89, 89, 89)', cursor: 'pointer' }} />
                                  )}
                                </Fab>
                              </ListItemIcon>
                              <ListItemText sx={{ color: 'rgb(173, 173, 173)', fontSize: '4em' }}>
                                <Typography
                                  component="p"
                                  variant="body2"
                                  color={
                                    result?.subtitle.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')
                                      ? 'rgb(202, 202, 202)'
                                      : ''
                                  }
                                  fontWeight={
                                    result?.subtitle.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')
                                      ? 700
                                      : 400
                                  }
                                >
                                  {result?.subtitle.replace(/\n/g, ' ')}
                                </Typography>
                              </ListItemText>
                              <ListItemIcon sx={{ paddingRight: '0', marginLeft: 'auto' }}>
                                {/* <Fab
                                size="small"
                                sx={{
                                  backgroundColor: theme => theme.palette.background.paper,
                                  boxShadow: 'none',
                                  marginRight: '2px',
                                  '&:hover': {
                                    xs: { backgroundColor: 'inherit' },
                                    md: { backgroundColor: 'ButtonHighlight' },
                                  },
                                }}
                                onClick={() => {
                                  navigator.clipboard.writeText(result?.subtitle.replace(/\n/g, ' '));
                                  handleSnackbarOpen();
                                }}
                              >
                                <ContentCopy sx={{ color: 'rgb(89, 89, 89)' }} />
                              </Fab> */}
                                {/* <Fab
                                size="small"
                                sx={{
                                  backgroundColor: theme.palette.background.paper,
                                  boxShadow: 'none',
                                  marginLeft: 'auto',
                                  '&:hover': {
                                    xs: { backgroundColor: 'inherit' },
                                    md: { backgroundColor: 'ButtonHighlight' },
                                  },
                                }}
                                onClick={() => addText(result?.subtitle.replace(/\n/g, ' '), true)}
                              >
                                <Add sx={{ color: 'rgb(89, 89, 89)', cursor: 'pointer' }} />
                              </Fab> */}
                              </ListItemIcon>
                            </ListItem>
                          ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Card>
            </Grid>
          }

          <Grid item xs={12}>
            <Typography variant="h6">Surrounding Frames</Typography>
            {loading ?
              <Grid container spacing={2} mt={0}>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
                <Grid item xs={4} sm={4} md={12 / 9}>
                  <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio }} />
                </Grid>
              </Grid>
              :
              <Grid container spacing={2} mt={0}>
                {surroundingFrames?.map((frame, index) => (
                  <Grid item xs={4} sm={4} md={12 / 9} key={index}>
                    <a style={{ textDecoration: 'none' }}>
                      <StyledCard style={{ border: fid === frame ? '3px solid orange' : '' }}>
                        {/* {console.log(`${fid} = ${result?.fid}`)} */}
                        <StyledCardMedia
                          component="img"
                          alt={`${frame.fid}`}
                          src={`https://memesrc.com${frame.frame_image}`}
                          title={frame.subtitle || 'No subtitle'}
                          onClick={() => {
                            navigate(`/frame/${frame.fid}${getCurrentQueryString()}`)
                          }}
                        />
                      </StyledCard>
                    </a>
                  </Grid>
                ))}
              </Grid>
            }
            <Grid item xs={12} mt={3}>
                    {episodeDetails && (
                      <Button
                        variant="contained"
                        fullWidth
                        href={`/episode/${episodeDetails[0]}/${episodeDetails[1]}/${episodeDetails[2]}/${episodeDetails[3]}`}
                      >
                        View Episode
                      </Button>
                    )}
                  </Grid>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

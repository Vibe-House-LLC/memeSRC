import { Helmet } from 'react-helmet-async';
import { Navigate, Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
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
  Link,
  TextField,
} from '@mui/material';
import { Add, ArrowBack, ArrowBackIos, ArrowForward, ArrowForwardIos, BrowseGallery, Close, ContentCopy, Edit, GpsFixed, GpsNotFixed, HistoryToggleOffRounded, Home, Menu, OpenInBrowser, OpenInNew, Visibility, VisibilityOff } from '@mui/icons-material';
import useSearchDetails from '../hooks/useSearchDetails';
import getFrame from '../utils/frameHandler';

// import { listGlobalMessages } from '../../../graphql/queries'

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
  const { setFrame, fineTuningFrame, setFineTuningFrame } = useSearchDetails();
  const navigate = useNavigate();
  const { fid } = useParams();
  const [frameData, setFrameData] = useState({});
  const [surroundingFrames, setSurroundingFrames] = useState(null);
  // const [surroundingSubtitles, setSurroundingSubtitles] = useState(null);
  const [sliderValue, setSliderValue] = useState(fineTuningFrame || 0);
  const [middleIndex, setMiddleIndex] = useState(0);
  const [displayImage, setDisplayImage] = useState(`https://memesrc.com/${fid.split('-')[0]}/img/${fid.split('-')[1]}/${fid.split('-')[2]}/${fid}.jpg`);
  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  // const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [showTitle, setShowTitle] = useState('');
  const [episodeDetails, setEpisodeDetails] = useState();
  const [imgSrc, setImgSrc] = useState();
  const [showText, setShowText] = useState(false);

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

      setEpisodeDetails(fid.split('-'))

      // Check if a matching show was found
      if (foundShow) {
        setShowTitle(`${foundShow.emoji} ${foundShow.title}`);
      } else {
        console.error(`Show with ID ${fid.split('-')[0]} not found.`);
      }
    }
  }, [fid, shows]);

  /* ---------------------------- Subtitle Function --------------------------- */

  function wrapText(context, text, x, y, maxWidth, lineHeight, shouldDraw = true) {
    // Split text into paragraphs (on new lines)
    const paragraphs = text.split('\n');
    let totalLines = 0;
  
    paragraphs.forEach((paragraph) => {
      if (paragraph.trim() === '') {
        // If the paragraph is just a new line
        if (shouldDraw) {
          y += lineHeight;
        }
        totalLines += 1;
      } else {
        // Process each paragraph
        const words = paragraph.split(' ');
        let line = '';
  
        words.forEach((word, n) => {
          const testLine = `${line}${word} `;
          const metrics = context.measureText(testLine);
          const testWidth = metrics.width;
  
          if (testWidth > maxWidth && n > 0) {
            if (shouldDraw) {
              context.strokeText(line, x, y);
              context.fillText(line, x, y);
            }
            y += lineHeight;
            totalLines += 1;
            line = `${word} `;
          } else {
            line = testLine;
          }
        });
  
        if (line.trim() !== '') {
          if (shouldDraw) {
            context.strokeText(line, x, y);
            context.fillText(line, x, y);
          }
          y += lineHeight;
          totalLines += 1;
        }
      }
    });
  
    return totalLines;
  }
  




  useEffect(() => {
    // console.log(displayImage)
    const offScreenCanvas = document.createElement('canvas');
    const ctx = offScreenCanvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = displayImage;
    img.onload = function () {
      const referenceWidth = 1000;
      const referenceFontSizeDesktop = 40;
      const referenceFontSizeMobile = 40;
      const referenceBottomAnch = -10;  // Reference distance from bottom for desktop
      const referenceBottomAnchMobile = -10; // Reference distance for mobile

      const scaleFactor = img.width / referenceWidth;

      const scaledFontSizeDesktop = referenceFontSizeDesktop * scaleFactor;
      const scaledFontSizeMobile = referenceFontSizeMobile * scaleFactor;
      const scaledBottomAnch = isMd ? referenceBottomAnch * scaleFactor : referenceBottomAnchMobile * scaleFactor;
      const referenceLineHeight = 60;
      const scaledLineHeight = referenceLineHeight * scaleFactor;

      offScreenCanvas.width = img.width;
      offScreenCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setLoading(false)

      if (showText) {
        // Styling the text
        ctx.font = `700 ${isMd ? `${scaledFontSizeDesktop}px` : `${scaledFontSizeMobile}px`} Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;

        const x = offScreenCanvas.width / 2;
        const maxWidth = offScreenCanvas.width - 60; // leaving some margin
        const lineHeight = 80; // adjust as per your requirements
        const startY = offScreenCanvas.height - (2 * lineHeight); // adjust to position the text properly

        const text = frameData.subtitle;

        // Calculate number of lines without drawing
        const numOfLines = wrapText(ctx, text, x, startY, maxWidth, scaledLineHeight, false);
        const totalTextHeight = numOfLines * scaledLineHeight;  // Use scaled line height

        // Adjust startY to anchor the text a scaled distance from the bottom
        const startYAdjusted = offScreenCanvas.height - totalTextHeight - scaledBottomAnch;

        // Draw the text using the adjusted startY
        wrapText(ctx, text, x, startYAdjusted, maxWidth, scaledLineHeight);
      }

      // console.log(offScreenCanvas.toDataURL())

      // Convert the canvas data to an image URL and set it as the src of the img tag
      setImgSrc(offScreenCanvas.toDataURL());
    };
  }, [showText, displayImage, frameData, frameData.subtitle]);

  /* -------------------------------------------------------------------------- */

  const isMd = useMediaQuery((theme) => theme.breakpoints.up('md'))

  const handleSubtitlesExpand = async () => {
    setSubtitlesExpanded(!subtitlesExpanded);
};

  

  useEffect(() => {
    setLoading(true)
    // const getSessionID = async () => {
    //   let sessionID;
    //   if ("sessionID" in sessionStorage) {
    //     sessionID = sessionStorage.getItem("sessionID");
    //     return Promise.resolve(sessionID);
    //   }
    //   return API.get('publicapi', '/uuid')
    //     .then(generatedSessionID => {
    //       sessionStorage.setItem("sessionID", generatedSessionID);
    //       return generatedSessionID;
    //     })
    //     .catch(err => {
    //       console.log(`UUID Gen Fetch Error:  ${err}`);
    //       throw err;
    //     });
    // };

    // getSessionID()
      // .then(sessionId => {
        // return getFrame(fid)
      // })
      getFrame(fid)
      .then(data => {
        setFrameData(data);
        setFrame(fid)
        setSurroundingFrames(data.frames_surrounding);
        // console.log("FRAME DETAILS:")
        // console.log(data)
        const newMiddleIndex = Math.floor(data.frames_fine_tuning.length / 2);
        const initialFineTuneImage = data.frames_fine_tuning[newMiddleIndex];
        setMiddleIndex(newMiddleIndex)
        // console.log(newMiddleIndex);
        // console.log(fineTuningFrame)
        if (typeof fineTuningFrame === 'number') {
          setSliderValue(fineTuningFrame - newMiddleIndex)
        }
        setDisplayImage(`https://memesrc.com${initialFineTuneImage}`);
        // setLoading(false)
      })
      .catch(console.error);
  }, [fid]);

  useEffect(() => {
    if (frameData.frames_fine_tuning && middleIndex !== 0) {
      const displayIndex = fineTuningFrame != null ? fineTuningFrame : middleIndex + sliderValue;

      // console.log(displayIndex);
      // console.log(fineTuningFrame);

      const newDisplayFrame = frameData.frames_fine_tuning[displayIndex];
      setDisplayImage(`https://memesrc.com${newDisplayFrame}`);
    }
  }, [sliderValue, frameData, middleIndex]);

  // Use a callback function to handle slider changes
  const handleSliderChange = (newSliderValue) => {
    setSliderValue(newSliderValue);
    setFineTuningFrame(middleIndex + newSliderValue);
  };

  const renderSurroundingFrames = () => {
    let returnedElement;

    if (surroundingFrames) {
      returnedElement =
        <Grid container spacing={2}>
          {surroundingFrames.map((frame, index) => (
            <Grid item xs={4} sm={4} md={12 / 9} key={frame.fid}>
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

  const frameToTimecode = (frameNumber, fps) => {
    const totalSeconds = Math.floor(frameNumber / fps);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = totalSeconds - (hours * 3600) - (minutes * 60);
    const frames = frameNumber % fps;

    // Format the output with leading zeroes where necessary
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    const framesStr = String(frames).padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
  };

  const renderFineTuningFrames = () => {
    return (
      <>
      <div style={{position: 'relative'}}>
        <CardMedia
          component={loading ? () => <Skeleton variant='rectangular' sx={{ width: '100%', height: 'auto', aspectRatio }} /> : 'img'}
          alt={`Fine-tuning ${sliderValue}`}
          image={imgSrc}
          id='frameImage'
        />
        <IconButton 
          style={{
            position: 'absolute', 
            top: '50%', 
            left: '2%', // Reduced left margin
            transform: 'translateY(-50%)', 
            backgroundColor: 'transparent', 
            color: 'white', 
            padding: '20px', // Increase padding to make the button easier to press
            margin: '-10px'
          }}
          onClick={() => {
            navigate(`/frame/${surroundingFrames[3].fid}`)
          }}
        >
          <ArrowBackIos style={{ fontSize: '2rem' }} /> {/* Increased icon size */}
        </IconButton>
        <IconButton 
          style={{
            position: 'absolute', 
            top: '50%', 
            right: '2%', // Reduced right margin
            transform: 'translateY(-50%)', 
            backgroundColor: 'transparent', 
            color: 'white', 
            padding: '20px', // Increase padding to make the button easier to press
            margin: '-10px'
          }}
          onClick={() => {
            navigate(`/frame/${surroundingFrames[5].fid}`)
          }}
        >
          <ArrowForwardIos style={{ fontSize: '2rem' }} /> {/* Increased icon size */}
        </IconButton>
      </div>
  
      <Stack spacing={2} direction="row" p={0} pr={3} pl={3} alignItems={'center'}>
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
          onChange={(e, newValue) => handleSliderChange(newValue)}
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

      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Grid container spacing={2} direction="row" alignItems="center">

          <Grid item xs={12} md={12}>

            <Typography variant='h2' marginBottom={2}>
              {showTitle}
            </Typography>

            <Chip
                          size='small'
                          icon={<OpenInNew />}
                          label={`Season ${fid.split('-')[1]} / Episode ${fid.split('-')[2]}`}
                          onClick={() => navigate(`/episode/${episodeDetails[0]}/${episodeDetails[1]}/${episodeDetails[2]}/${episodeDetails[3]}`)}
                          sx={{
                            marginBottom: '15px',
                            "& .MuiChip-label": {
                              fontWeight: 'bold',
                            },
                          }}
                        />
                        <Chip
                          size='small'
                          icon={<BrowseGallery />}
                          label={frameToTimecode(fid.split('-')[3], 9)}
                          onClick={() => navigate(`/episode/${episodeDetails[0]}/${episodeDetails[1]}/${episodeDetails[2]}/${episodeDetails[3]}`)}
                          sx={{
                            marginBottom: '15px',
                            marginLeft: '5px',
                            "& .MuiChip-label": {
                              fontWeight: 'bold',
                            },
                          }}
                        />
            
            <Card>
              {renderFineTuningFrames()}
            </Card>

            {isMd &&
              <Grid item xs={12} mt={3}>
                <Card>
                  <Accordion expanded={subtitlesExpanded} disableGutters>
                    <AccordionSummary sx={{ paddingX: 1.55, textAlign: 'center' }} onClick={handleSubtitlesExpand}>
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
                    {/* {subtitlesLoading ? (
                        <CircularProgress />
                      ) : ( */}
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
                            .map((result, index) => (
                              <ListItem key={result.id ? result.id : `surrounding-subtitle-${index}`} disablePadding sx={{ padding: '0 0 .6em 0' }}>
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
                                <ListItemIcon sx={{ paddingRight: '0', marginLeft: 'auto' }} />
                              </ListItem>
                            ))}
                      </List>
                      {/* )} */}
                    </AccordionDetails>
                  </Accordion>
                </Card>
              </Grid>
            }
                <Grid item xs={12} md={12}>
                  <Box sx={{ mt: isMd ? 0 : '1rem', width: isMd ? 'inherit' : '100%' }}>
                    <Card style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <CardContent>
                        {/* <Typography variant="h3" component="div" style={{ marginBottom: '0.5rem' }} textAlign='left'>
                         {showTitle}
                        </Typography> */}
                          {loading ?
                            <Skeleton variant='text' height={25} width={'max(100px, 50%)'} />
                            :
                            <Stack direction='row' spacing={1} alignItems='center'>
                              {showText ? 
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                  <TextField
                                    autoFocus
                                    multiline
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    value={frameData.subtitle}
                                    onChange={(e) => setFrameData({ ...frameData, subtitle: e.target.value })}
                                    sx={{ margin: -1 }}
                                  />
                                  <IconButton size='small' sx={{ marginLeft: 2, marginRight: -1.5 }} onClick={() => { setShowText(!showText) }}>
                                    <VisibilityOff sx={{ fontSize: 20 }} />
                                  </IconButton>
                                </Box>
                                :
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                  <Box sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => setShowText(!showText)}>
                                    <Typography 
                                      variant="subtitle1" 
                                      style={{ marginBottom: '0rem', whiteSpace: 'pre-line' }}
                                      textAlign='left' 
                                      sx={{ color: "text.secondary" }}
                                    > 
                                      {frameData.subtitle ? frameData.subtitle : '(no subtitle)'}
                                    </Typography>
                                  </Box>
                                  <IconButton size='small' onClick={() => setShowText(!showText)} sx={{ cursor: 'pointer', marginLeft: 2, marginRight: -1.5 }}>
                                    <Edit sx={{ fontSize: 20 }} />
                                  </IconButton>
                                </Box>
                              }
                              {/* <IconButton size='small' onClick={() => { setShowText(!showText) }}>
                                {showText ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Edit sx={{ fontSize: 20 }} />}
                              </IconButton> */}
                            </Stack>
                          }

                      </CardContent>
                    </Card>
                  </Box>
                </Grid>
                <Button
                  size="medium"
                  fullWidth={!isMd}
                  variant="contained"
                  to={`/editor/${fid}${getCurrentQueryString()}`}
                  onClick={() => setShowText(!showText)}
                  sx={{ marginTop: 2, '&:hover': { backgroundColor: '#737373' } }}
                  startIcon={showText ? <VisibilityOff /> : <Visibility />}
                >
                  {showText ? "Disable" : "Enable"} Caption
                </Button>

                <Button
                  size="medium"
                  fullWidth={!isMd}
                  variant="contained"
                  to={`/editor/${fid}${getCurrentQueryString()}`}
                  component={RouterLink}
                  // sx={{ my: 2, backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
                  sx={{ my: 2 }}
                  startIcon={<Edit />}
                >
                  Advanced Editor
                </Button>
                <Card sx={{ mt: 0 }}>
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
          </Grid>

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
                  <Grid item xs={4} sm={4} md={12 / 9} key={`surrounding-frame-${frame.fid ? frame.fid : index}`}>
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
      </Container >
    </>
  );
}

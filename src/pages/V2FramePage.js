// eslint-disable camelcase
import { Helmet } from 'react-helmet-async';
import { Navigate, Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { API } from 'aws-amplify';
import { styled } from '@mui/material/styles';
import { useTheme } from '@emotion/react';
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
  Snackbar,
  Alert,
} from '@mui/material';
import { Add, ArrowBack, ArrowBackIos, ArrowForward, ArrowForwardIos, BrowseGallery, Close, ContentCopy, Edit, FormatLineSpacing, FormatSize, GpsFixed, GpsNotFixed, HistoryToggleOffRounded, Home, Menu, OpenInBrowser, OpenInNew, VerticalAlignBottom, VerticalAlignTop, Visibility, VisibilityOff } from '@mui/icons-material';
import useSearchDetails from '../hooks/useSearchDetails';
import fetchFrameInfo from '../utils/frameHandlerV2';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';

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
  const [fineTuningFrames, setFineTuningFrames] = useState([]);
  const [surroundingFrames, setSurroundingFrames] = useState(null);
  const [sliderValue, setSliderValue] = useState(fineTuningFrame || 0);
  const [middleIndex, setMiddleIndex] = useState(0);
  const [displayImage, setDisplayImage] = useState();
  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [showTitle, setShowTitle] = useState('');
  const [episodeDetails, setEpisodeDetails] = useState();
  const [imgSrc, setImgSrc] = useState();
  const [showText, setShowText] = useState(false);
  const [fontSizeScaleFactor, setFontSizeScaleFactor] = useState(1);
  const [fontLineHeightScaleFactor, setFontLineHeightScaleFactor] = useState(1);
  const [fontBottomMarginScaleFactor, setFontBottomMarginScaleFactor] = useState(1);

  /* ---------- This is used to prevent slider activity while scrolling on mobile ---------- */

  const isSm = useMediaQuery((theme) => theme.breakpoints.down('md'));

  /* -------------------------------------------------------------------------- */

  const [snackbarOpen, setSnackBarOpen] = useState(false);

  const [alertOpenTapToEdit, setAlertOpenTapToEdit] = useState(() => {
    return sessionStorage.getItem('alertDismissed-98ruio') !== 'true';
  });

  const theme = useTheme();

  const handleSnackbarOpen = () => {
    setSnackBarOpen(true);
  }

  const handleSnackbarClose = () => {
    setSnackBarOpen(false);
  }

  // const getCurrentQueryString = () => {
  //   const currentUrl = window.location.href;
  //   const queryStringStartIndex = currentUrl.indexOf('?');

  //   // Check if a query string is found; if not, return an empty string
  //   if (queryStringStartIndex !== -1) {
  //     return currentUrl.substring(queryStringStartIndex);
  //   }

  //   return '';
  // };

  // useEffect(() => {
  //   // Ensure `fid` and `shows` are defined
  //   if (fid && shows && shows.length > 0) {
  //     const foundShow = shows.find((obj) => obj.id === fid.split('-')[0]);

  //     setEpisodeDetails(fid.split('-'))

  //     // Check if a matching show was found
  //     if (foundShow) {
  //       setShowTitle(`${foundShow.emoji} ${foundShow.title}`);
  //     } else {
  //       console.error(`Show with ID ${fid.split('-')[0]} not found.`);
  //     }
  //   }
  // }, [fid, shows]);

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


  const updateCanvas = (scaleDown) => {
    const offScreenCanvas = document.createElement('canvas');
    const ctx = offScreenCanvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = displayImage;
    img.onload = function () {
      // Define the maximum width for the canvas
      const maxCanvasWidth = 1000; // Adjust this value as needed

      // Calculate the aspect ratio of the image
      const canvasAspectRatio = img.width / img.height;

      // Calculate the corresponding height for the maximum width
      const maxCanvasHeight = maxCanvasWidth / canvasAspectRatio;

      const referenceWidth = 1000;
      const referenceFontSizeDesktop = 40;
      const referenceFontSizeMobile = 40;
      const referenceBottomAnch = 35;  // Reference distance from bottom for desktop
      const referenceBottomAnchMobile = 35; // Reference distance for mobile

      const scaleFactor = 1000 / referenceWidth;

      const scaledFontSizeDesktop = referenceFontSizeDesktop * scaleFactor;
      const scaledFontSizeMobile = referenceFontSizeMobile * scaleFactor;
      const scaledBottomAnch = isMd ? referenceBottomAnch * scaleFactor * fontBottomMarginScaleFactor : referenceBottomAnchMobile * scaleFactor * fontBottomMarginScaleFactor;
      const referenceLineHeight = 50;
      const scaledLineHeight = referenceLineHeight * scaleFactor * fontLineHeightScaleFactor * fontSizeScaleFactor;

      // Set the canvas dimensions
      offScreenCanvas.width = maxCanvasWidth;
      offScreenCanvas.height = maxCanvasHeight;
      // Scale the image and draw it on the canvas
      ctx.drawImage(img, 0, 0, maxCanvasWidth, maxCanvasHeight);
      setLoading(false)

      if (showText) {
        // Styling the text
        ctx.font = `700 ${isMd ? `${scaledFontSizeDesktop * fontSizeScaleFactor}px` : `${scaledFontSizeMobile * fontSizeScaleFactor}px`} Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round'; // Add this line to round the joints

        const x = offScreenCanvas.width / 2;
        const maxWidth = offScreenCanvas.width - 60; // leaving some margin
        const lineHeight = 24; // adjust as per your requirements
        const startY = offScreenCanvas.height - (2 * lineHeight); // adjust to position the text properly

        const text = loadedSubtitle;

        // Calculate number of lines without drawing
        const numOfLines = wrapText(ctx, text, x, startY, maxWidth, scaledLineHeight, false);
        const totalTextHeight = numOfLines * scaledLineHeight;  // Use scaled line height

        // Adjust startY to anchor the text a scaled distance from the bottom
        const startYAdjusted = offScreenCanvas.height - totalTextHeight - scaledBottomAnch + 40;

        // Draw the text using the adjusted startY
        wrapText(ctx, text, x, startYAdjusted, maxWidth, scaledLineHeight);
      }

      if (scaleDown) {
        // Create a second canvas
        const scaledCanvas = document.createElement('canvas');
        const scaledCtx = scaledCanvas.getContext('2d');

        // Calculate the scaled dimensions
        const scaledWidth = offScreenCanvas.width / 3;
        const scaledHeight = offScreenCanvas.height / 3;

        // Set the scaled canvas dimensions
        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;

        // Draw the full-size canvas onto the scaled canvas at the reduced size
        scaledCtx.drawImage(offScreenCanvas, 0, 0, scaledWidth, scaledHeight);

        // Use the scaled canvas to create the blob
        scaledCanvas.toBlob((blob) => {
          if (blob) {
            // Create an object URL for the blob
            const imageUrl = URL.createObjectURL(blob);

            // Use this object URL as the src for the image instead of a data URL
            setImgSrc(imageUrl);

            // Optionally, revoke the object URL after the image has loaded to release memory
            img.onload = () => {
              URL.revokeObjectURL(imageUrl);
            };
          }
        }, 'image/png');
      } else {

        // Instead of using toDataURL, convert the canvas to a blob
        offScreenCanvas.toBlob((blob) => {
          if (blob) {
            // Create an object URL for the blob
            const imageUrl = URL.createObjectURL(blob);

            // Use this object URL as the src for the image instead of a data URL
            setImgSrc(imageUrl);

            // Optionally, revoke the object URL after the image has loaded to release memory
            img.onload = () => {
              URL.revokeObjectURL(imageUrl);
            };
          }
        }, 'image/png'); // You can specify the image format
      }
    };
  }




  useEffect(() => {
    updateCanvas(true)
  }, [fontSizeScaleFactor, fontLineHeightScaleFactor, fontBottomMarginScaleFactor]);

  /* -------------------------------------------------------------------------- */

  const isMd = useMediaQuery((theme) => theme.breakpoints.up('md'))

  const handleSubtitlesExpand = async () => {
    setSubtitlesExpanded(!subtitlesExpanded);
  };



  // useEffect(() => {
  //   setLoading(true)
  //   setFineTuningFrames([])
  //   console.log(fineTuningFrame)
  //   getFrame(fid)
  //     .then(data => {
  //       setFrameData(data);
  //       setFrame(fid)
  //       setSurroundingFrames(data.frames_surrounding);
  //       const newMiddleIndex = Math.floor(data.frames_fine_tuning.length / 2);
  //       const initialFineTuneImage = data.frames_fine_tuning[fineTuningFrame || newMiddleIndex];
  //       setMiddleIndex(newMiddleIndex)
  //       if (typeof fineTuningFrame === 'number') {
  //         setSliderValue(fineTuningFrame - newMiddleIndex)
  //       }
  //       setDisplayImage(`https://memesrc.com${initialFineTuneImage}`);
  //     })
  //     .catch(console.error);
  // }, [fid]);

  // // This effect is responsible for preloading images
  // useEffect(() => {
  //   if (frameData.frames_fine_tuning) {
  //     const preloadImages = async () => {
  //       const images = await Promise.all(frameData.frames_fine_tuning.map(frameId => {
  //         return new Promise(resolve => {
  //           const img = new Image();
  //           img.onload = () => resolve(img);
  //           img.src = `https://memesrc.com${frameId}`;
  //         });
  //       }));

  //       setFineTuningFrames(images);
  //     };

  //     preloadImages();
  //   }
  // }, [frameData.frames_fine_tuning]);

  // This effect is responsible for setting the display image based on slider value
  // useEffect(() => {
  //   if (fineTuningFrames.length > 0 && middleIndex !== 0) {
  //     const displayIndex = (typeof fineTuningFrame === 'number') ? fineTuningFrame : middleIndex + sliderValue;
  //     if (fineTuningFrames[displayIndex]) {
  //       setDisplayImage(fineTuningFrames[displayIndex].src);
  //     }
  //   }
  // }, [sliderValue, fineTuningFrames, middleIndex, fineTuningFrame]);

  // Use a callback function to handle slider changes


  /* ------------ This was unused so I've commented it out for now ------------ */
  // const renderSurroundingFrames = () => {
  //   let returnedElement;

  //   if (surroundingFrames) {
  //     returnedElement =
  //       <Grid container spacing={2}>
  //         {surroundingFrames.map((frame, index) => (
  //           <Grid item xs={4} sm={4} md={12 / 9} key={frame.fid}>
  //             <a style={{ textDecoration: 'none' }}>
  //               <StyledCard style={{ border: fid === frame ? '3px solid orange' : '' }}>
  //                 <StyledCardMedia
  //                   component="img"
  //                   alt={`${frame.fid}`}
  //                   src={`https://memesrc.com${frame.frame_image}`}
  //                   title={frame.subtitle || 'No subtitle'}
  //                   onClick={() => {
  //                     navigate(`/frame/${frame.fid}`)
  //                   }}
  //                 />
  //               </StyledCard>
  //             </a>
  //           </Grid>
  //         ))}
  //       </Grid>
  //   }
  //   return returnedElement
  // };

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




  /* -------------------------------- New Stuff ------------------------------- */




  const { showObj, setShowObj, cid, selectedFrameIndex, setSelectedFrameIndex } = useSearchDetailsV2();
  const [loadingCsv, setLoadingCsv] = useState();
  const [frames, setFrames] = useState();
  const params = useParams();
  const [loadedSubtitle, setLoadedSubtitle] = useState('');
  const [loadedSeason, setLoadedSeason] = useState('');
  const [loadedEpisode, setLoadedEpisode] = useState('');

  useEffect(() => {
    updateCanvas();
  }, [showText, displayImage, frameData, loadedSubtitle]);

  useEffect(() => {
    fetchFrameInfo(params.cid, params.season, params.episode, params.frame).then(info => {
      console.log("frame info:", info)
    })
  }, [])

  /* -------------------------------- Functions ------------------------------- */

  async function loopThroughKeys(obj, fps, subtitleObj) {
    const files = []
    // Loop through each key in the object
    const fileList = Object.keys(obj).map(async (key) => {
      const videoUrl = `https://ipfs.memesrc.com/ipfs/${params.cid}/${subtitleObj.season}/${subtitleObj.episode}/${key}`

      const frameBlobs = await extractFramesFromVideo(videoUrl, obj[key], fps)

      // console.log(frameBlobs)


      return [
        ...frameBlobs
      ]
    })

    const images = await Promise.all(fileList)

    console.log(images.flat())

    setFrames(images.flat())
  }

  async function extractFramesFromVideo(videoUrl, frameNumbers, assumedFps = 30) {
    return new Promise((resolve, reject) => {
      // Create a video element
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.crossOrigin = "anonymous"; // Handle CORS policy
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const blobs = [];
      let currentFrameIndex = 0;

      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Function to capture a frame at a specific index
        const captureFrame = (frameIndex) => {
          const frameTime = frameIndex / assumedFps;
          video.currentTime = frameTime;
        };

        video.addEventListener('seeked', async () => {
          if (currentFrameIndex < frameNumbers.length) {
            // Draw the video frame to the canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Convert the canvas to a blob
            canvas.toBlob((blob) => {
              const objUrl = URL.createObjectURL(blob)
              blobs.push(objUrl);
              currentFrameIndex += 1;
              if (currentFrameIndex < frameNumbers.length) {
                // Capture the next frame
                captureFrame(frameNumbers[currentFrameIndex] - 1); // Adjust for 0-based indexing
              } else {
                // Resolve the promise when all frames are loaded
                resolve(blobs);
              }
            }, 'image/jpeg'); // Specify the format and quality if needed
          }
        });

        // Start capturing frames
        captureFrame(frameNumbers[currentFrameIndex] - 1); // Adjust for 0-based indexing
      });

      video.addEventListener('error', (e) => {
        reject(new Error('Error loading video'));
      });
    });
  }

  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    async function loadFile(cid, filename) {
      const url = `https://ipfs.memesrc.com/ipfs/${cid}/_docs.csv`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const text = await response.text();
        const lines = text.split("\n");
        const headers = lines[0].split(",").map((header) => header.trim());
        return lines.slice(1).map((line) => {
          const values = line.split(",").map((value) => value.trim());
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index] ? values[index] : "";
            if (header === "subtitle_text" && obj[header]) {
              obj.base64_subtitle = obj[header]; // Store the base64 version
              obj[header] = atob(obj[header]); // Decode to regular text
            }
            return obj;
          }, {});
        });
      } catch (error) {
        console.error("Failed to load file:", error);
        return [];
      }
    }

    async function initialize(cid = null) {
      const selectedCid = cid
      if (!selectedCid) {
        alert("Please enter a valid CID.");
        return;
      }
      const filename = "1-1.csv";
      const lines = await loadFile(cid, filename);
      if (lines?.length > 0) {
        // Decode base64 subtitle and assign to a new property
        const decodedLines = lines.map(line => ({
          ...line,
          subtitle: line.base64_subtitle ? atob(line.base64_subtitle) : "" // Ensure you decode the subtitle and assign it here
        }));
        setLoadingCsv(false);
        setShowObj(decodedLines); // Use decodedLines with subtitle property
      } else {
        alert('error');
      }
    }

    if (!showObj) {
      initialize(params.cid);
    }
  }, [showObj]);


  useEffect(() => {
    if (showObj && params?.subtitleIndex) {
      setFrames()
      const subtitleObj = showObj.find(obj => obj.subtitle_index === params?.subtitleIndex)

      // eslint-disable-next-line camelcase
      const { season, episode, subtitle_index, subtitle_text, start_frame, end_frame } = subtitleObj

      setLoadedSeason(season)
      setLoadedEpisode(episode)
      setLoadedSubtitle(subtitle_text)

      const startFrame = 190
      const endFrame = 847

      const fps = 10
      const videoLength = 25
      const framesPerContainer = (videoLength * fps)

      // Video files are 25 seconds long, and 10 frames per second

      // eslint-disable-next-line camelcase
      const startFile = Math.floor(start_frame / framesPerContainer)

      // eslint-disable-next-line camelcase
      const endFile = Math.floor(end_frame / framesPerContainer)
      console.log('start_frame', start_frame)
      console.log('startFile', startFile)
      console.log('end_frame', end_frame)
      console.log('startFile', endFile)
      // eslint-disable-next-line camelcase
      const startIndex = start_frame % framesPerContainer
      console.log('startIndex', startIndex)
      // eslint-disable-next-line camelcase
      const endIndex = end_frame % framesPerContainer
      console.log('endIndex', endIndex)

      const listBetween = (x, y) => Array.from({ length: y - x + 1 }, (_, i) => x + i);

      const fileNameArray = listBetween(startFile, endFile)
      console.log('fileNameArray', fileNameArray)
      // eslint-disable-next-line camelcase
      const frameNumberArray = listBetween(start_frame, end_frame);
      console.log('frameNumberArray', frameNumberArray)

      const fileFrameGroups = {};

      // eslint-disable-next-line camelcase
      for (let frameId = parseInt(start_frame, 10); frameId <= parseInt(end_frame, 10); frameId += 1) {
        const fileNumber = Math.floor(frameId / framesPerContainer);
        const frameNumber = frameId % framesPerContainer;
        const fileName = `${fileNumber}.mp4`;
        fileFrameGroups[fileName] = fileFrameGroups[fileName] || [];
        fileFrameGroups[fileName].push(frameNumber);
      }


      console.log('fileFrameGroups', fileFrameGroups)
      loopThroughKeys(fileFrameGroups, fps, subtitleObj)




      // https://ipfs.memesrc.com/ipfs/${params.cid}/${result.season}/${result.episode}/s${parseInt(result.subtitle_index, 10)+1}.mp4
    }

  }, [showObj, params?.subtitleIndex]);

  useEffect(() => {
    if (frames && frames.length > 0) {
      console.log(frames.length)
      console.log(Math.floor(frames.length / 2))
      setSelectedFrameIndex(selectedFrameIndex || Math.floor(frames.length / 2))
      setDisplayImage(selectedFrameIndex ? frames[selectedFrameIndex] : frames[Math.floor(frames.length / 2)])
    }
  }, [frames]);

  const handleSliderChange = (newSliderValue) => {
    setSelectedFrameIndex(newSliderValue);
    setDisplayImage(frames[newSliderValue]);
  };

  const renderFineTuningFrames = (imgSrc) => {
    return (
      <>
        <div style={{ position: 'relative' }}>
          <CardMedia
            component={!imgSrc ? () => <Skeleton variant='rectangular' sx={{ width: '100%', height: 'auto', aspectRatio }} /> : 'img'}
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
              navigate(`/v2/frame/${params?.cid}/${Number(params?.subtitleIndex) - 1}`)
            }}
          >
            <ArrowBackIos style={{ fontSize: '2rem' }} />
          </IconButton>
          <IconButton
            disabled={Number(params?.subtitleIndex) - 1 === 0}
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
              navigate(`/v2/frame/${params?.cid}/${Number(params?.subtitleIndex) + 1}`)
            }}
          >
            <ArrowForwardIos style={{ fontSize: '2rem' }} />
          </IconButton>
        </div>

        {frames && frames?.length > 0 ?
          <Stack spacing={2} direction="row" p={0} pr={3} pl={3} alignItems={'center'}>
            <Tooltip title="Fine Tuning">
              <IconButton>
                <HistoryToggleOffRounded alt="Fine Tuning" />
              </IconButton>
            </Tooltip>
            <Slider
              size="small"
              defaultValue={selectedFrameIndex || Math.floor(frames.length / 2)}
              min={0}
              max={frames.length - 1}
              value={selectedFrameIndex}
              step={1}
              onChange={(e, newValue) => handleSliderChange(newValue)}
              valueLabelFormat={(value) => `Fine Tuning: ${((value - 4) / 10).toFixed(1)}s`}
              marks
            />
          </Stack>
          :
          <Stack spacing={2} direction="row" py={1.1} justifyContent='center' alignItems={'center'}>
            <CircularProgress color='success' size={14} />
            <Typography variant='body2'>
              Loading fine tuning frames...
            </Typography>
          </Stack>
        }
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
          {/* <img src={imgSrc} alt='alt' /> */}
          <Grid item xs={12} md={6}>

            <Typography variant='h2' marginBottom={2}>
              {showTitle}
            </Typography>

            <Chip
              size='small'
              icon={<OpenInNew />}
              label={`Season ${loadedSeason}`}
              // onClick={() => navigate(`/episode/${episodeDetails[0]}/${episodeDetails[1]}/${episodeDetails[2]}/1`)}
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
              label={`Episode ${loadedEpisode}`}
              // onClick={() => navigate(`/episode/${episodeDetails[0]}/${episodeDetails[1]}/${episodeDetails[2]}/${episodeDetails[3]}`)}
              sx={{
                marginBottom: '15px',
                marginLeft: '5px',
                "& .MuiChip-label": {
                  fontWeight: 'bold',
                },
              }}
            />

            <Card>
              {renderFineTuningFrames(imgSrc)}
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ width: '100%' }}>
              <Card
                style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                onClick={(e) => {
                  // Prevent card click event when clicking on any button or other interactive element inside the card
                  if (e.target.closest('button, a, input, textarea')) {
                    return;
                  }

                  // If showText is already true, do nothing
                  if (showText) {
                    return;
                  }

                  // If showText is false, then set it to true to show the TextField
                  setShowText(true);
                }}
              >
                <CardContent sx={{ pt: 3 }}>
                  {/* <Typography variant="h3" component="div" style={{ marginBottom: '0.5rem' }} textAlign='left'>
                         {showTitle}
                        </Typography> */}
                  {loading ?
                    <Skeleton variant='text' height={25} width={'max(100px, 50%)'} />
                    :
                    <>
                      <Stack direction='row' spacing={1} pl={0.5} alignItems='center'>
                        {showText ?
                          <Stack direction='row' spacing={2} alignItems='center' sx={{ width: '100%' }}>
                            <IconButton size='small' onClick={() => { setShowText(!showText) }}>
                              <VisibilityOff sx={{ fontSize: 20 }} />
                            </IconButton>
                            <TextField
                              autoFocus
                              multiline
                              fullWidth
                              variant="outlined"
                              size="small"
                              value={loadedSubtitle}
                              onChange={(e) => setLoadedSubtitle(e.target.value)}
                            />
                          </Stack>
                          :
                          <Stack direction='row' spacing={1} pl={0.5} alignItems='center'>
                            <IconButton size='small' onClick={() => setShowText(!showText)} sx={{ cursor: 'pointer' }}>
                              <Edit sx={{ fontSize: 20 }} />
                            </IconButton>
                            <Typography
                              variant="subtitle1"
                              style={{ marginBottom: '0rem', whiteSpace: 'pre-line' }}
                              textAlign='left'
                              sx={{ color: "text.secondary" }}
                              onClick={() => { setShowText(!showText) }}
                            >
                              {loadedSubtitle || '(no subtitle)'}
                            </Typography>
                          </Stack>
                        }
                      </Stack>
                      {showText &&
                        <Stack spacing={2} direction="row" p={0} pt={2} alignItems={'center'}>
                          <Tooltip title="Line Height">
                            <IconButton>
                              <VerticalAlignTop alt="Line Height" />
                            </IconButton>
                          </Tooltip>
                          <Slider
                            componentsProps={{
                              root: {
                                style: {
                                  ...(isSm && { pointerEvents: 'none' })
                                }
                              },
                              thumb: {
                                style: {
                                  ...(isSm && { pointerEvents: 'auto' })
                                }
                              }
                            }}
                            size="small"
                            defaultValue={1}
                            min={1}
                            max={10}
                            step={0.2}
                            value={fontBottomMarginScaleFactor}
                            onChange={(e, newValue) => {
                              if (e.type === 'mousedown') {
                                return;
                              }
                              setFontBottomMarginScaleFactor(newValue)
                            }}
                            onChangeCommitted={() => updateCanvas()}
                            marks
                            valueLabelFormat='Bottom Margin'
                            valueLabelDisplay
                          />
                        </Stack>
                      }
                      {showText &&
                        <Stack spacing={2} direction="row" p={0} pt={2} alignItems={'center'}>
                          <Tooltip title="Font Size">
                            <IconButton>
                              <FormatSize alt="Font Size" />
                            </IconButton>
                          </Tooltip>
                          <Slider
                            componentsProps={{
                              root: {
                                style: {
                                  ...(isSm && { pointerEvents: 'none' })
                                }
                              },
                              thumb: {
                                style: {
                                  ...(isSm && { pointerEvents: 'auto' })
                                }
                              }
                            }}
                            size="small"
                            defaultValue={25} // 1 scaled up by the factor of 25
                            min={0.25} // 0.01 scaled up by the factor of 25
                            max={50} // 2 scaled up by the factor of 25
                            step={1}
                            value={fontSizeScaleFactor * 25}
                            onChange={(e, newValue) => {
                              if (e.type === 'mousedown') {
                                return;
                              }
                              setFontSizeScaleFactor(newValue / 25)
                            }}
                            onChangeCommitted={() => updateCanvas()}
                            marks
                            valueLabelFormat='Font Size'
                            valueLabelDisplay
                          />
                        </Stack>
                      }
                      {showText &&
                        <Stack spacing={2} direction="row" p={0} pt={2} alignItems={'center'}>
                          <Tooltip title="Line Height">
                            <IconButton>
                              <FormatLineSpacing alt="Line Height" />
                            </IconButton>
                          </Tooltip>
                          <Slider
                            componentsProps={{
                              root: {
                                style: {
                                  ...(isSm && { pointerEvents: 'none' })
                                }
                              },
                              thumb: {
                                style: {
                                  ...(isSm && { pointerEvents: 'auto' })
                                }
                              }
                            }}
                            size="small"
                            defaultValue={1} // 1 scaled up by the factor of 25
                            min={1} // 0.01 scaled up by the factor of 25
                            max={5} // 2 scaled up by the factor of 25
                            step={0.2}
                            value={fontLineHeightScaleFactor} // Scale the value for the slider
                            onChange={(e, newValue) => {
                              if (e.type === 'mousedown') {
                                return;
                              }
                              // Divide by scale factor to get the actual value to set
                              setFontLineHeightScaleFactor(newValue);
                            }}
                            onChangeCommitted={() => updateCanvas()}
                            valueLabelFormat='Line Height'
                            valueLabelDisplay
                            marks
                          />
                        </Stack>
                      }
                    </>
                  }

                </CardContent>
              </Card>
            </Box>
            {alertOpenTapToEdit && (
              <Alert
                severity='success'
                sx={{ marginTop: 1.5 }}
                action={
                  <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={() => {
                      sessionStorage.setItem('alertDismissed-98ruio', 'true');
                      setAlertOpenTapToEdit(!alertOpenTapToEdit);
                    }}
                  >
                    <Close fontSize="inherit" />
                  </IconButton>
                }
              >
                <b>New!</b> Tap the text ☝️ to edit your caption
              </Alert>
            )}

            <Button
              size="medium"
              fullWidth
              variant="contained"
              // to={`/editor/${fid}${getCurrentQueryString()}`}
              onClick={() => setShowText(!showText)}
              sx={{ marginTop: 2, '&:hover': { backgroundColor: '#737373' } }}
              startIcon={showText ? <VisibilityOff /> : <Visibility />}
            >
              {showText ? "Disable" : "Enable"} Caption
            </Button>

            <Button
              size="medium"
              fullWidth
              variant="contained"
              to={`/v2/editor/${params?.cid}/${params?.subtitleIndex}`}
              component={RouterLink}
              sx={{ my: 2, backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
              startIcon={<Edit />}
            >
              Advanced Editor
            </Button>
          </Grid>
          {/* <Grid item xs={12} md={6}>
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
                              <Fab
                                size="small"
                                sx={{
                                  backgroundColor: theme.palette.background.paper,
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
                              </Fab>
                            </ListItemIcon>
                          </ListItem>
                        ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Card>
          </Grid> */}

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={2000}
            severity="success"
            onClose={handleSnackbarClose}
            message="Copied to clipboard!"
          >
            <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
              Copied to clipboard!
            </Alert>
          </Snackbar>

          {/* <Grid item xs={12}>
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
                      <StyledCard sx={{ ...((fid === frame.fid) && { border: '3px solid orange' }), cursor: (fid === frame.fid) ? 'default' : 'pointer' }}>
                        
                        <StyledCardMedia
                          component="img"
                          alt={`${frame.fid}`}
                          src={`https://memesrc.com${frame.frame_image}`}
                          title={frame.subtitle || 'No subtitle'}
                          onClick={() => {
                            // navigate(`/frame/${frame.fid}${getCurrentQueryString()}`)
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
          </Grid> */}
        </Grid>
      </Container >
    </>
  );
}

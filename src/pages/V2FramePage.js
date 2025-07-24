// V2FramePage.js

// eslint-disable camelcase
import { Helmet } from 'react-helmet-async';
import { Navigate, Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState, useContext, memo } from 'react';
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
  FormControl,
  FormLabel,
  MenuItem, 
  Select,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Popover,
} from '@mui/material';
import { Add, ArrowBack, ArrowBackIos, ArrowForward, ArrowForwardIos, BrowseGallery, Close, ContentCopy, Edit, FontDownload, FontDownloadOutlined, FormatBold, FormatColorFill, FormatItalic, FormatLineSpacing, FormatSize, GpsFixed, GpsNotFixed, HistoryToggleOffRounded, Home, Menu, OpenInBrowser, OpenInNew, VerticalAlignBottom, VerticalAlignTop, Visibility, VisibilityOff, Collections, Settings } from '@mui/icons-material';
import { TwitterPicker } from 'react-color';
import useSearchDetails from '../hooks/useSearchDetails';
import { fetchFrameInfo, fetchFramesFineTuning, fetchFramesSurroundingPromises } from '../utils/frameHandlerV2';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import getV2Metadata from '../utils/getV2Metadata';
import FramePageBottomBannerAd from '../ads/FramePageBottomBannerAd';
import { UserContext } from '../UserContext';
import HomePageBannerAd from '../ads/HomePageBannerAd';
import FixedMobileBannerAd from '../ads/FixedMobileBannerAd';
import { useCollage } from '../contexts/CollageContext';

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
  const [frameData, setFrameData] = useState({});
  const [fineTuningFrames, setFineTuningFrames] = useState([]);
  const [surroundingFrames, setSurroundingFrames] = useState([]);
  const [surroundingSubtitles, setSurroundingSubtitles] = useState(null);
  const [loading, setLoading] = useState(false);
  const { cid, season, episode, frame, fineTuningIndex = null, searchTerms } = useParams();
  const [confirmedCid, setConfirmedCid] = useState();
  const [sliderValue, setSliderValue] = useState(fineTuningFrame || 0);
  const [displayImage, setDisplayImage] = useState();
  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [showTitle, setShowTitle] = useState('');
  const [episodeName, setEpisodeName] = useState('');
  const [tvdbIdOverride, setTvdbIdOverride] = useState('');
  const [imgSrc, setImgSrc] = useState();
  const [showText, setShowText] = useState(false);
  const [fontSizeScaleFactor, setFontSizeScaleFactor] = useState(1);
  const [fontLineHeightScaleFactor, setFontLineHeightScaleFactor] = useState(1);
  const [fontBottomMarginScaleFactor, setFontBottomMarginScaleFactor] = useState(1);
  const [enableFineTuningFrames, setEnableFineTuningFrames] = useState(true);
  const [loadingFineTuning, setLoadingFineTuning] = useState(false);
  const [fineTuningLoadStarted, setFineTuningLoadStarted] = useState(false);
  const [fineTuningBlobs, setFineTuningBlobs] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('searchTerm');

  const [textFieldFocused, setTextFieldFocused] = useState(false);

  const throttleTimeoutRef = useRef(null);

  const { user } = useContext(UserContext);
  const { addItem, isItemInCollage, collageItems, count } = useCollage();
  
  // Check if user is an admin (same logic as FloatingActionButtons)
  const hasCollageAccess = user?.['cognito:groups']?.includes('admins');

  // Function to add current frame to collage
  const handleAddToCollage = () => {
    const currentItem = {
      cid: confirmedCid,
      season: parseInt(season, 10),
      episode: parseInt(episode, 10),
      frame: parseInt(frame, 10),
      subtitle: loadedSubtitle || '',
      subtitleShowing: showText && (loadedSubtitle || '').trim() !== '',
      frameImage: displayImage || frameData?.frame_image,
      showTitle: showTitle || frameData?.showTitle,
      timestamp: frameToTimeCode(frame)
    };
    addItem(currentItem);
    setCollageSnackbarOpen(true);
  };

  /* ---------- This is used to prevent slider activity while scrolling on mobile ---------- */

  const isSm = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const fonts = ["Arial", "Courier New", "Georgia", "Verdana", "Akbar", "Baveuse", "PULPY", "scrubs", "South Park", "SPIDEY", "HORROR", "IMPACT", "Star Jedi", "twilight", "zuume"];

  /* -------------------------------------------------------------------------- */

  const FontSelector = ({ selectedFont, onSelectFont }) => {
    return (
      <Select
        value={selectedFont}
        onChange={(e) => {
          const newFont = e.target.value;
          onSelectFont(newFont);
          setIsLowercaseFont(newFont === 'Star Jedi');
        }}
        displayEmpty
        inputProps={{ 'aria-label': 'Without label' }}
        size='small'
        startAdornment={<FontDownloadOutlined sx={{ mr: 0.5}} />}
        sx={{
          '& .MuiSelect-select': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      >
        {fonts.map((font) => (
          <MenuItem key={font} value={font} sx={{ fontFamily: font }}>{font}</MenuItem>
        ))}
      </Select>
    );
  };

  useEffect(() => {
    getV2Metadata(cid).then(metadata => {
      setConfirmedCid(metadata.id)
    }).catch(error => {
      console.log(error)
    })
  }, [cid]);

  useEffect(() => {
    if (cid) {
      const storedId = localStorage.getItem(`tvdbId_${cid}`);
      if (storedId) {
        setTvdbIdOverride(storedId);
      }
    }
  }, [cid]);

  const [snackbarOpen, setSnackBarOpen] = useState(false);
  const [collageSnackbarOpen, setCollageSnackbarOpen] = useState(false);

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

  const handleCollageSnackbarClose = () => {
    setCollageSnackbarOpen(false);
  }

  /* ---------------------------- Subtitle Function --------------------------- */

  const handleClearCaption = () => {
    setLoadedSubtitle('');
    updateCanvas();
  };

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

  function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for bright colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  const updateCanvasUnthrottled = (scaleDown) => {
    const offScreenCanvas = document.createElement('canvas');
    const ctx = offScreenCanvas.getContext('2d');
  
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = displayImage;
    img.onload = function () {
      if (throttleTimeoutRef.current !== null) {
        clearTimeout(throttleTimeoutRef.current);
      }

      throttleTimeoutRef.current = setTimeout(() => {
        // Define the maximum width for the canvas
        const maxCanvasWidth = 1000; // Adjust this value as needed

        // Calculate the aspect ratio of the image
        const canvasAspectRatio = img.width / img.height;

        // Calculate the corresponding height for the maximum width
        const maxCanvasHeight = maxCanvasWidth / canvasAspectRatio;

        const referenceWidth = 1000;
        const referenceFontSizeDesktop = 40;
        const referenceFontSizeMobile = 40;
        const referenceBottomAnch = 25;  // Reference distance from bottom for desktop
        const referenceBottomAnchMobile = 25; // Reference distance for mobile

        const scaleFactor = 1000 / referenceWidth;

        const scaledFontSizeDesktop = referenceFontSizeDesktop * scaleFactor * fontSizeScaleFactor;
        const scaledFontSizeMobile = referenceFontSizeMobile * scaleFactor * fontSizeScaleFactor;
        const scaledBottomAnch = isMd ? referenceBottomAnch * scaleFactor * fontBottomMarginScaleFactor : referenceBottomAnchMobile * scaleFactor * fontBottomMarginScaleFactor;
        const referenceLineHeight = 50;
        const scaledLineHeight = referenceLineHeight * scaleFactor * fontLineHeightScaleFactor * fontSizeScaleFactor;

        // Set the canvas dimensions
        offScreenCanvas.width = maxCanvasWidth;
        offScreenCanvas.height = maxCanvasHeight;
        // Scale the image and draw it on the canvas
        ctx.drawImage(img, 0, 0, maxCanvasWidth, maxCanvasHeight);
        setLoading(false)

        if (showText && loadedSubtitle) {
          // Styling the text with bold and italic
          const fontStyle = isItalic ? 'italic' : 'normal';
          const fontWeight = isBold ? 'bold' : 'normal';
          const fontColor = (typeof colorPickerColor === 'object') ? '#FFFFFF' : colorPickerColor;
  
          // Apply the font style and weight along with size and family
          ctx.font = `${fontStyle} ${fontWeight} ${isMd ? scaledFontSizeDesktop : scaledFontSizeMobile}px ${fontFamily}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = fontColor;
          ctx.strokeStyle = getContrastColor(fontColor);
          ctx.lineWidth = offScreenCanvas.width * 0.0044; // Adjusted to be between 0.002 and 0.0025
          ctx.lineJoin = 'round'; // Add this line to round the joints

          const x = offScreenCanvas.width / 2;
          const maxWidth = offScreenCanvas.width - 60; // leaving some margin
          const lineHeight = 24; // adjust as per your requirements
          const startY = offScreenCanvas.height - (2 * lineHeight); // adjust to position the text properly

          const text = isLowercaseFont ? loadedSubtitle.toLowerCase() : loadedSubtitle;

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
          }, 'image/jpeg', 0.9);
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
          }, 'image/jpeg', 0.9); // You can specify the image format
        }

        throttleTimeoutRef.current = null;
      }, 10); // Adjust the debounce delay as needed
    };
  };

  const updateCanvas = () => {
    if (throttleTimeoutRef.current === null) {
      updateCanvasUnthrottled();
    }
  };


  useEffect(() => {
    if (confirmedCid) {
      const loadInitialFrameInfo = async () => {
        setLoading(true);
        try {
          // Fetch initial frame information including the main image and subtitle
          const initialInfo = await fetchFrameInfo(confirmedCid, season, episode, frame, { mainImage: true });
          // console.log("initialInfo: ", initialInfo);
          setFrame(initialInfo.frame_image);
          setFrameData(initialInfo);
          setDisplayImage(initialInfo.frame_image);
          setLoadedSubtitle(initialInfo.subtitle);
          setOriginalSubtitle(initialInfo.subtitle);
          setLoadedSeason(season);
          setLoadedEpisode(episode);
          setShowTitle(initialInfo.series_name || '');
          if (initialInfo.fontFamily && fonts.includes(initialInfo.fontFamily)) {
            setFontFamily(initialInfo.fontFamily);
          }
        } catch (error) {
          console.error("Failed to fetch initial frame info:", error);
        } finally {
          setLoading(false);
        }
      };



      const loadSurroundingSubtitles = async () => {
        try {
          // Fetch only the surrounding subtitles
          const subtitlesSurrounding = (await fetchFrameInfo(confirmedCid, season, episode, frame, { subtitlesSurrounding: true })).subtitles_surrounding;
          setSurroundingSubtitles(subtitlesSurrounding);
        } catch (error) {
          console.error("Failed to fetch surrounding subtitles:", error);
        }
      };

      const loadSurroundingFrames = async () => {
        try {
          // Fetch surrounding frames; these calls already assume fetching of images and possibly their subtitles
          const surroundingFramePromises = fetchFramesSurroundingPromises(confirmedCid, season, episode, frame);

          // Initialize an array to keep track of the frames as they load
          const surroundingFrames = [];

          // Instead of waiting for all promises to resolve, handle each promise individually
          surroundingFramePromises.forEach((promise, index) => {
            promise.then(resolvedFrame => {
              resolvedFrame.cid = confirmedCid;
              resolvedFrame.season = parseInt(season, 10);
              resolvedFrame.episode = parseInt(episode, 10);
              // resolvedFrame.frame = parseInt(frame, 10);
              // Update the state with each frame as it becomes available
              // Use a function to ensure the state is correctly updated based on the previous state
              setSurroundingFrames(prevFrames => {
                // Create a new array that includes the newly resolved frame
                const updatedFrames = [...prevFrames];
                updatedFrames[index] = resolvedFrame; // This ensures that frames are kept in order
                return updatedFrames;
              });
              // console.log("Loaded Frame: ", resolvedFrame);
            }).catch(error => {
              console.error("Failed to fetch a frame:", error);
            });
          });
        } catch (error) {
          console.error("Failed to fetch surrounding frames:", error);
        }
      };

      // Clear values before loading new ones
      setLoading(true);
      setFrame(null);
      setFrameData(null);
      setDisplayImage(null);
      setLoadedSubtitle(null);
      setOriginalSubtitle('');
      setSubtitleUserInteracted(false);
      setSelectedFrameIndex(5);
      setFineTuningFrames([]);
      setFrames([]);
      setSurroundingSubtitles([]);
      setSurroundingFrames(new Array(9).fill('loading'));
      setEnableFineTuningFrames(false)
      setImgSrc();
      setLoadingFineTuning(false)
      setFineTuningLoadStarted(false)
      setFineTuningBlobs([])

      // Call the loading functions
      loadInitialFrameInfo().then(() => {
        loadFineTuningFrames(); // Load fine-tuning frames
        loadSurroundingSubtitles(); // Load surrounding subtitles
        loadSurroundingFrames(); // Load surrounding frames
      });
    }
  }, [confirmedCid, season, episode, frame]);


  const loadFineTuningFrames = async () => {
    try {
      // Since fetchFramesFineTuning now expects an array, calculate the array of indexes for fine-tuning
      const fineTuningImageUrls = await fetchFramesFineTuning(confirmedCid, season, episode, frame);

      setFineTuningFrames(fineTuningImageUrls);
      setFrames(fineTuningImageUrls);
    } catch (error) {
      console.error("Failed to fetch fine tuning frames:", error);
    }
  };

  const loadFineTuningImages = () => {
    if (fineTuningFrames && !fineTuningLoadStarted) {
      // console.log('LOADING THE IMAGES');
      setFineTuningLoadStarted(true);
      setLoadingFineTuning(true);

      // Create an array of promises for each image load
      const blobPromises = fineTuningFrames.map((url) => {
        return fetch(url)
          .then((response) => response.blob())
          .catch((error) => {
            console.error('Error fetching image:', error);
            return null;
          });
      });

      // Wait for all blob promises to resolve
      Promise.all(blobPromises)
        .then((blobs) => {
          // Filter out any null blobs (in case of errors)
          const validBlobs = blobs.filter((blob) => blob !== null);

          // Create blob URLs for each valid blob
          const blobUrls = validBlobs.map((blob) => URL.createObjectURL(blob));

          setFineTuningBlobs(blobUrls);
          setLoadingFineTuning(false);
        })
        .catch((error) => {
          console.error('Error loading fine-tuning images:', error);
          setLoadingFineTuning(false);
        });
    }
  };

useEffect(() => {
  if (fineTuningBlobs && fineTuningBlobs.length > 0) {
    setDisplayImage(fineTuningBlobs?.[selectedFrameIndex] || null);
  }

}, [fineTuningBlobs]);

  // Fetch episode name from TVDB when identifiers change
  useEffect(() => {
    const fetchEpisodeName = async () => {
      let fetchedName = '';
      try {
        let seriesId = tvdbIdOverride;
        if (!seriesId && showTitle) {
          const searchResults = await API.get('publicapi', '/tvdb/search', {
            queryStringParameters: { query: showTitle },
          });
          if (Array.isArray(searchResults) && searchResults.length > 0) {
            seriesId = searchResults[0].tvdb_id;
          }
        }

        if (seriesId) {
          const seriesData = await API.get('publicapi', `/tvdb/series/${seriesId}/extended`);
          const seasonObj = seriesData?.seasons?.find((s) => s.number === parseInt(season, 10));
          if (seasonObj) {
            const seasonData = await API.get('publicapi', `/tvdb/seasons/${seasonObj.id}/extended`);
            const episodeObj = seasonData?.episodes?.find((e) => e.number === parseInt(episode, 10));
            if (episodeObj?.name) {
              fetchedName = episodeObj.name;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch episode name:', err);
      } finally {
        if (fetchedName) {
          setEpisodeName(fetchedName);
        } else {
          setEpisodeName('Episode name unavailable');
        }
      }
    };
    fetchEpisodeName();
  }, [showTitle, season, episode, tvdbIdOverride]);


  function frameToTimeCode(frame, frameRate = 10) {
    const totalSeconds = frame / frameRate;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    // Format numbers to have at least two digits
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }

  // useEffect(() => {
  //   updateCanvas(true)
  // }, [fontSizeScaleFactor, fontLineHeightScaleFactor, fontBottomMarginScaleFactor]);

  /* -------------------------------------------------------------------------- */

  const isMd = useMediaQuery((theme) => theme.breakpoints.up('md'))

  const handleSubtitlesExpand = async () => {
    setSubtitlesExpanded(!subtitlesExpanded);
  };

  const { showObj, setShowObj, selectedFrameIndex, setSelectedFrameIndex } = useSearchDetailsV2();
  const [loadingCsv, setLoadingCsv] = useState();
  const [frames, setFrames] = useState();
  const [loadedSubtitle, setLoadedSubtitle] = useState('');  // TODO
  const [originalSubtitle, setOriginalSubtitle] = useState(''); // Track original subtitle from server
  const [subtitleUserInteracted, setSubtitleUserInteracted] = useState(false); // Track if user interacted with subtitle UI
  const [loadedSeason, setLoadedSeason] = useState('');  // TODO
  const [loadedEpisode, setLoadedEpisode] = useState('');  // TODO
  const [formats, setFormats] = useState(() => ['bold', 'italic']);
  const [colorPickerShowing, setColorPickerShowing] = useState(false);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);

  const [isBold, setIsBold] = useState(() => {
    const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
    return storedValue ? JSON.parse(storedValue).isBold : false;
  });
  
  const [isItalic, setIsItalic] = useState(() => {
    const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
    return storedValue ? JSON.parse(storedValue).isItalic : false;
  });
  
  const [colorPickerColor, setColorPickerColor] = useState(() => {
    const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
    return storedValue ? JSON.parse(storedValue).colorPickerColor : {
      r: '255',
      g: '255',
      b: '255',
      a: '100'
    };
  });
  
  const [fontFamily, setFontFamily] = useState(() => {
    const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
    return storedValue ? JSON.parse(storedValue).fontFamily : 'Arial';
  });

  const [isLowercaseFont, setIsLowercaseFont] = useState(() => {
    const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
    return storedValue ? JSON.parse(storedValue).fontFamily === 'Star Jedi' : false;
  });

  const updateLocalStorage = () => {
    const formattingOptions = {
      isBold,
      isItalic,
      colorPickerColor,
      fontFamily,
    };
    localStorage.setItem(`formatting-${user?.username}-${cid}`, JSON.stringify(formattingOptions));
  };

  const handleMainImageLoad = () => {
    setMainImageLoaded(true);
  };

  const textFieldRef = useRef(null);

  const moveCursorToEnd = () => {
    if (textFieldRef.current) {
      const input = textFieldRef.current;
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };

  useEffect(() => {
    const moveCursorToEnd = () => {
      if (textFieldRef.current) {
        const input = textFieldRef.current;
        input.setSelectionRange(input.value.length, input.value.length);
      }
    };
  
    if (showText && textFieldRef.current) {
      moveCursorToEnd();
    }
  }, [showText]);
  

  const colorPicker = useRef();

  const StyledTwitterPicker = styled(TwitterPicker)`
  span div {
      border: 1px solid rgb(240, 240, 240);
  }`;

  const TwitterPickerWrapper = memo(StyledTwitterPicker);

  const changeColor = (color) => {
    setColorPickerColor(color.hex);
    setColorPickerShowing(false);
  }

  // Scroll to top when this component loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    updateCanvas();
  }, [showText, frameData, fontSizeScaleFactor, fontLineHeightScaleFactor, fontBottomMarginScaleFactor]);

  useEffect(() => {
    updateCanvasUnthrottled();
  }, [displayImage, loadedSubtitle, frame, fineTuningBlobs, selectedFrameIndex, fontFamily, isBold, isItalic, colorPickerColor]);

  useEffect(() => {
    updateLocalStorage();
  }, [isBold, isItalic, colorPickerColor, fontFamily]);

  useEffect(() => {
    if (frames && frames.length > 0) {
      // console.log(frames.length)
      // console.log(Math.floor(frames.length / 2))
      setSelectedFrameIndex(fineTuningIndex || Math.floor(frames.length / 2))
      setDisplayImage(fineTuningIndex ? frames[fineTuningIndex] : frames[Math.floor(frames.length / 2)])
    }
  }, [frames]);

  const handleSliderChange = (newSliderValue) => {
    setSelectedFrameIndex(newSliderValue);
    setDisplayImage(fineTuningBlobs?.[newSliderValue] || null);
  };

  const renderFineTuningFrames = (imgSrc) => {
    return (
      <>
        <div style={{ position: 'relative' }}>
        {!mainImageLoaded && (
          <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio, paddingTop: '56.25%' }} />
        )}
        <CardMedia
          component={'img'}
          alt={`Fine-tuning ${sliderValue}`}
          image={imgSrc}
          id='frameImage'
          onLoad={handleMainImageLoad}
          onError={() => {
            console.error(`Failed to load main image`);
            handleMainImageLoad();
          }}
          sx={{
            display: mainImageLoaded ? 'block' : 'none',
          }}
        />
          {loadingFineTuning && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CircularProgress size={60} />
            </div>
          )}
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
              navigate(`/frame/${cid}/${season}/${episode}/${Number(frame) - 10}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`)
            }}
          >
            <ArrowBackIos style={{ fontSize: '2rem' }} />
          </IconButton>
          <IconButton
            disabled={Number(frame) - 1 === 0}
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
              navigate(`/frame/${cid}/${season}/${episode}/${Number(frame) + 10}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`)
            }}
          >
            <ArrowForwardIos style={{ fontSize: '2rem' }} />
          </IconButton>
        </div>

        {frames && frames?.length > 0 ?
          <Stack spacing={2} direction="row" p={0} pr={3} pl={3} alignItems={'center'}>
            <Tooltip title="Fine Tuning">
              <IconButton>
                {loadingFineTuning ? (
                  <CircularProgress size={24} />
                ) : (
                  <HistoryToggleOffRounded alt="Fine Tuning" />
                )}
              </IconButton>
            </Tooltip>
            <Slider
              size="small"
              defaultValue={selectedFrameIndex || Math.floor(frames?.length / 2)}
              min={0}
              max={frames?.length - 1}
              value={selectedFrameIndex}
              step={1}
              onMouseDown={loadFineTuningImages}
              onTouchStart={loadFineTuningImages}
              onChange={(e, newValue) => handleSliderChange(newValue)}
              onChangeCommitted={(e, value) => {navigate(`/frame/${cid}/${season}/${episode}/${frame}/${value}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`)}}
              valueLabelFormat={(value) => `Fine Tuning: ${((value - 4) / 10).toFixed(1)}s`}
              marks
              componentsProps={{
                track: {
                  style: {
                    ...(isSm && { pointerEvents: 'none' }),
                    backgroundColor: 'white', // Change the background color to white
                    height: 6, // Increase the height of the slider
                  }
                },
                rail: {
                  style: {
                    backgroundColor: 'white', // Change the background color to white
                    height: 6, // Increase the height of the slider
                  }
                },
                thumb: {
                  style: {
                    ...(isSm && { pointerEvents: 'auto' }),
                    backgroundColor: '#2079fe', // Change the color of the slider thumb to blue
                    width: 20, // Increase the width of the slider thumb
                    height: 20, // Increase the height of the slider thumb
                  }
                }
              }}
            />
          </Stack>
          :
          <Stack spacing={2} direction="row" p={0} pr={3} pl={3} alignItems={'center'}>
            <Tooltip title="Fine Tuning">
              <IconButton>
                <HistoryToggleOffRounded alt="Fine Tuning" />
              </IconButton>
            </Tooltip>
            <Slider
              size="small"
              defaultValue={5}
              min={0}
              max={10}
              value={5}
              step={1}
              disabled
              marks
              componentsProps={{
                root: {
                  style: {
                    ...(isSm && { pointerEvents: 'none' }),
                  }
                },
                track: {
                  style: {
                    ...(isSm && { pointerEvents: 'none' }),
                    backgroundColor: 'white', // Change the background color to white
                    height: 6, // Increase the height of the slider
                  }
                },
                rail: {
                  style: {
                    backgroundColor: 'white', // Change the background color to white
                    height: 6, // Increase the height of the slider
                  }
                },
                thumb: {
                  style: {
                    ...(isSm && { pointerEvents: 'auto' }),
                    backgroundColor: '#2079fe', // Change the color of the slider thumb to blue
                    width: 20, // Increase the width of the slider thumb
                    height: 20, // Increase the height of the slider thumb
                  }
                }
              }}
            />
          </Stack>
        }
      </>

    );
  };

  const [imagesLoaded, setImagesLoaded] = useState({});

  const handleImageLoad = (frameId) => {
    setImagesLoaded((prevState) => ({ ...prevState, [frameId]: true }));
  };

  const handleProClick = () => {
    navigate('/pro');
  };

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  return (
    <>
      <Helmet>
        <title> Frame Details | memeSRC 2.0 </title>
      </Helmet>

      <Container maxWidth="xl" sx={{ pt: 0 }}>
        {user?.userDetails?.subscriptionStatus !== 'active' && (
          <Grid item xs={12} mb={3}>
            <center>
              <Box>
                {isMobile ? <FixedMobileBannerAd /> : <HomePageBannerAd />}
                <RouterLink to="/pro" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" textAlign="center" color="white" sx={{ marginTop: 1 }}>
                    ☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
                  </Typography>
                </RouterLink>
              </Box>
            </center>
          </Grid>
        )}

        <Grid container spacing={2} direction="row" alignItems="center">

          <Grid item xs={12} md={6}>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                size='small'
                icon={<OpenInNew />}
                label={episodeName && episodeName !== 'Episode name unavailable' ? `${episodeName} (S${season}E${episode})` : `Episode name unavailable (S${season}E${episode})`}
                onClick={() => {
                  const frameRate = 10;
                  const totalSeconds = Math.round(frame / frameRate);
                  const nearestSecondFrame = totalSeconds * frameRate;
                  navigate(`/episode/${cid}/${season}/${episode}/${nearestSecondFrame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`);
                }}
                sx={{
                  marginBottom: '15px',
                  "& .MuiChip-label": {
                    fontWeight: 'bold',
                  },
                }}
              />
              <Tooltip title="Set TVDB ID" placement="top">
                <IconButton size="small" onClick={() => {
                  const newId = window.prompt('Enter TVDB series ID', tvdbIdOverride || '');
                  if (newId !== null) {
                    localStorage.setItem(`tvdbId_${cid}`, newId);
                    setTvdbIdOverride(newId);
                  }
                }} sx={{ ml: 1, mb: '15px' }}>
                  <Settings fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Chip
              size='small'
              icon={<BrowseGallery />}
              label={`${frameToTimeCode(frame)}`}
              onClick={() => {
                const frameRate = 10;
                const totalSeconds = Math.round(frame / frameRate);
                const nearestSecondFrame = totalSeconds * frameRate;
                navigate(`/episode/${cid}/${season}/${episode}/${nearestSecondFrame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`);
              }}
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
                  {/* Formatting Toolbar */}
                  {showText &&
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <ToggleButtonGroup
                      value={[isBold && 'bold', isItalic && 'italic'].filter(Boolean)}
                      onChange={(event, newFormats) => {
                        setIsBold(newFormats.includes('bold'));
                        setIsItalic(newFormats.includes('italic'));
                        setShowText(true)
                      }}
                      aria-label="text formatting"
                      sx={{ flexShrink: 0 }}
                    >
                      <ToggleButton size='small' value="bold" aria-label="bold">
                        <FormatBold />
                      </ToggleButton>
                      <ToggleButton size='small' value="italic" aria-label="italic">
                        <FormatItalic />
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <ToggleButtonGroup
                      sx={{ mx: 1, flexShrink: 0 }}
                      value={[isBold && 'bold', isItalic && 'italic'].filter(Boolean)}
                      onChange={(event, newFormats) => {
                        setColorPickerShowing(newFormats.includes('fontColor'))
                        setShowText(true)
                      }}
                      aria-label="text formatting"
                    >
                      <ToggleButton ref={colorPicker} size='small' value="fontColor" aria-label="font color">
                        <FormatColorFill sx={{ color: colorPickerColor }} />
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <FontSelector selectedFont={fontFamily} onSelectFont={setFontFamily} />
                    <Popover
                      open={colorPickerShowing}
                      anchorEl={colorPicker.current}
                      onClose={() => setColorPickerShowing(false)}
                      id="colorPicker"
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                      }}
                    >
                      <div>
                        <TwitterPickerWrapper
                          onChangeComplete={(color) => changeColor(color)}
                          color={colorPickerColor}
                          colors={[
                            '#FFFFFF',
                            '#FFFF00',
                            '#000000',
                            '#FF4136',
                            '#2ECC40',
                            '#0052CC',
                            '#FF851B',
                            '#B10DC9',
                            '#39CCCC',
                            '#F012BE',
                          ]}
                          width="280px"
                        />
                      </div>
                    </Popover>
                  </Box>
                  }

                  {loading ?
                    <Skeleton variant='text' height={150} width={'max(100px, 50%)'} />
                    :
                    <>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <Stack direction='row' alignItems='center' sx={{ width: '100%' }}>
                        <TextField
                          multiline
                          minRows={2}
                          fullWidth
                          variant="outlined"
                          size="small"
                          placeholder="Type a caption..."
                          value={loadedSubtitle}
                          onMouseDown={() => {
                            setShowText(true);
                            setSubtitleUserInteracted(true);
                          }}
                          onChange={(e) => setLoadedSubtitle(e.target.value)}
                          onFocus={() => {
                            setTextFieldFocused(true);
                            setSubtitleUserInteracted(true);
                          }}
                          onBlur={() => setTextFieldFocused(false)}
                          InputProps={{
                            style: {
                              fontWeight: isBold ? 'bold' : 'normal',
                              fontStyle: isItalic ? 'italic' : 'normal',
                              fontFamily,
                            },
                          }}
                          inputProps={{
                            style: {
                              textTransform: isLowercaseFont ? 'lowercase' : 'none',
                            },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'white',
                              color: 'black',
                              '& fieldset': {
                                borderColor: 'rgba(0, 0, 0, 0.23)',
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(0, 0, 0, 0.87)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: 'primary.main',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: 'black',
                            },
                          }}
                          inputRef={textFieldRef}
                        />
                        </Stack>
                      </Stack>
                      {showText && loadedSubtitle?.trim() !== '' && (
                        <Button
                          size="medium"
                          fullWidth
                          variant="contained"
                          onClick={handleClearCaption}
                          sx={{ mt: 2, backgroundColor: '#f44336', '&:hover': { backgroundColor: '#d32f2f' } }}
                          startIcon={<Close />}
                        >
                          Clear Caption
                        </Button>
                      )}
                      {textFieldFocused && user?.userDetails?.subscriptionStatus !== 'active' && (
                        <Box sx={{ mt: 2 }}>
                          <FixedMobileBannerAd />
                        </Box>
                      )}
                      {showText &&
                        <>
                        <FormControl fullWidth variant="outlined" sx={{ mt: 2, border: '1px solid rgba(191, 191, 191, 0.57)', borderRadius: '8px', py: 1, px: 2 }}>
                          <FormLabel sx={{ fontSize: '0.875rem', fontWeight: 'bold', mb: 1, textAlign: 'center' }}>Bottom Margin</FormLabel>
                          <Stack spacing={2} direction="row" p={0} alignItems={'center'}>
                            {/* <Tooltip title="Line Height">
                              <IconButton>
                                <VerticalAlignTop alt="Line Height" />
                              </IconButton>
                            </Tooltip> */}
                            <Slider
                              componentsProps={{
                                root: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'none' }),
                                  }
                                },
                                track: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'none' }),
                                    backgroundColor: 'white',
                                    height: 6,
                                  }
                                },
                                rail: {
                                  style: {
                                    backgroundColor: 'white',
                                    height: 6,
                                  }
                                },
                                thumb: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'auto' }),
                                    backgroundColor: '#2079fe',
                                    width: 20,
                                    height: 20,
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
                              onMouseDown={() => {
                                setShowText(true)
                              }}
                              onTouchStart={() => {
                                setShowText(true)
                              }}
                            />
                          </Stack>
                        </FormControl>
                        <FormControl fullWidth variant="outlined" sx={{ mt: 2, border: '1px solid rgba(191, 191, 191, 0.57)', borderRadius: '8px', py: 1, px: 2 }}>
                          <FormLabel sx={{ fontSize: '0.875rem', fontWeight: 'bold', mb: 1, textAlign: 'center' }}>Font Size</FormLabel>
                          <Stack spacing={2} direction="row" p={0} alignItems={'center'}>
                            {/* <Tooltip title="Font Size">
                              <IconButton>
                                <FormatSize alt="Font Size" />
                              </IconButton>
                            </Tooltip> */}
                            <Slider
                              componentsProps={{
                                root: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'none' }),
                                  }
                                },
                                track: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'none' }),
                                    backgroundColor: 'white',
                                    height: 6,
                                  }
                                },
                                rail: {
                                  style: {
                                    backgroundColor: 'white',
                                    height: 6,
                                  }
                                },
                                thumb: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'auto' }),
                                    backgroundColor: '#2079fe',
                                    width: 20,
                                    height: 20,
                                  }
                                }
                              }}
                              size="small"
                              defaultValue={25}
                              min={0.25}
                              max={50}
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
                              onMouseDown={() => {
                                setShowText(true)
                              }}
                              onTouchStart={() => {
                                setShowText(true)
                              }}
                            />
                          </Stack>
                        </FormControl>
                        <FormControl fullWidth variant="outlined" sx={{ mt: 2, border: '1px solid rgba(191, 191, 191, 0.57)', borderRadius: '8px', py: 1, px: 2 }}>
                          <FormLabel sx={{ fontSize: '0.875rem', fontWeight: 'bold', mb: 1, textAlign: 'center' }}>Line Height</FormLabel>
                          <Stack spacing={2} direction="row" p={0} alignItems={'center'}>
                            {/* <Tooltip title="Line Height">
                              <IconButton>
                                <FormatLineSpacing alt="Line Height" />
                              </IconButton>
                            </Tooltip> */}
                            <Slider
                              componentsProps={{
                                root: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'none' }),
                                  }
                                },
                                track: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'none' }),
                                    backgroundColor: 'white',
                                    height: 6,
                                  }
                                },
                                rail: {
                                  style: {
                                    backgroundColor: 'white',
                                    height: 6,
                                  }
                                },
                                thumb: {
                                  style: {
                                    ...(isSm && { pointerEvents: 'auto' }),
                                    backgroundColor: '#2079fe',
                                    width: 20,
                                    height: 20,
                                  }
                                }
                              }}
                              size="small"
                              defaultValue={1}
                              min={1}
                              max={5}
                              step={0.2}
                              value={fontLineHeightScaleFactor}
                              onChange={(e, newValue) => {
                                if (e.type === 'mousedown') {
                                  return;
                                }
                                setFontLineHeightScaleFactor(newValue);
                              }}
                              onChangeCommitted={() => updateCanvas()}
                              valueLabelFormat='Line Height'
                              valueLabelDisplay
                              onMouseDown={() => {
                                setShowText(true)
                              }}
                              onTouchStart={() => {
                                setShowText(true)
                              }}
                              marks
                            />
                          </Stack>
                        </FormControl>
                      </>
                      }
                    </>
                  }

                {/* </CardContent>
              </Card> */}
            </Box>
            {/* {alertOpenTapToEdit && (
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
            )} */}

            {/* <Button
              size="medium"
              fullWidth
              variant="contained"
              // to={`/editor/${fid}${getCurrentQueryString()}`}
              onClick={() => setShowText(!showText)}
              sx={{ marginTop: 2, '&:hover': { backgroundColor: '#737373' } }}
              startIcon={showText ? <VisibilityOff /> : <Visibility />}
            >
              {showText ? "Disable" : "Enable"} Caption
            </Button> */}

            {!showText &&
              <Button
              size="medium"
              fullWidth
              variant="contained"
              component={RouterLink}
              sx={{ mt: 2, backgroundColor: '#4CAF50', '&:hover': { backgroundColor: theme => theme.palette.grey[400] } }}
              // startIcon={<Edit />}
              onClick={() => {
                setShowText(true);
                setSubtitleUserInteracted(true);
              }}
            >
              Make A Meme
            </Button>
            }

              <Button
                size="medium"
                fullWidth
                variant="contained"
                to={`/editor/${cid}/${season}/${episode}/${frame}${(fineTuningIndex || fineTuningLoadStarted) ? `/${selectedFrameIndex}` : ''}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`}
                component={RouterLink}
                sx={{ my: 2, backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
                startIcon={<Edit />}
              >
                Advanced Editor
              </Button>

              {hasCollageAccess && (
                <Button
                  size="medium"
                  fullWidth
                  variant="outlined"
                  onClick={handleAddToCollage}
                  disabled={!confirmedCid}
                  sx={{ 
                    mb: 2, 
                    borderColor: '#2196F3', 
                    color: '#2196F3',
                    '&:hover': { 
                      borderColor: '#1976D2', 
                      backgroundColor: 'rgba(33, 150, 243, 0.04)' 
                    },
                    '&.Mui-disabled': {
                      borderColor: '#ccc',
                      color: '#ccc'
                    }
                  }}
                  startIcon={<Collections />}
                >
                  Add to Collage
                </Button>
              )}
          </Grid>
          {/* {user?.userDetails?.subscriptionStatus !== 'active' &&
            <Grid item xs={12} my={1}>
              <center>
                <Box sx={{ maxWidth: '800px' }}>
                  <HomePageBannerAd />
                </Box>
              </center>
            </Grid>
          } */}
          <Grid item xs={12} md={6}>
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
                    {surroundingSubtitles &&
                      surroundingSubtitles
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
                                        result?.subtitle?.replace(/\n/g, ' ') ===
                                          frameData?.subtitle?.replace(/\n/g, ' ')
                                          ? 'rgba(0, 0, 0, 0)'
                                          : 'ButtonHighlight',
                                    },
                                  },
                                }}
                                onClick={() => navigate(`/frame/${cid}/${season}/${episode}/${result?.frame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`)}
                              >
                                {loading ? (
                                  <CircularProgress size={20} sx={{ color: '#565656' }} />
                                ) : result?.subtitle?.replace(/\n/g, ' ') ===
                                  frameData?.subtitle?.replace(/\n/g, ' ') ? (
                                  <GpsFixed
                                    sx={{
                                      color:
                                        result?.subtitle?.replace(/\n/g, ' ') ===
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
                                  result?.subtitle?.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')
                                    ? 'rgb(202, 202, 202)'
                                    : ''
                                }
                                fontWeight={
                                  result?.subtitle?.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')
                                    ? 700
                                    : 400
                                }
                              >
                                {result?.subtitle?.replace(/\n/g, ' ')}
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
          </Grid>

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

          <Snackbar
            open={collageSnackbarOpen}
            autoHideDuration={3000}
            onClose={handleCollageSnackbarClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert onClose={handleCollageSnackbarClose} severity="success" sx={{ width: '100%' }}>
              Frame added to collage! ({count} items)
            </Alert>
          </Snackbar>

          <Grid item xs={12}>
            <Typography variant="h6">Surrounding Frames</Typography>
            <Grid container spacing={2} mt={0}>
              {surroundingFrames.filter((frame, index, self) => {
                const identifier = `${frame?.cid}-${frame?.season}-${frame?.episode}-${frame?.frame}`;
                return (self.findIndex(f => `${f?.cid}-${f?.season}-${f?.episode}-${f?.frame}` === identifier) === index) || frame === 'loading';
              }).map((surroundingFrame, index) => (
                <Grid item xs={4} sm={4} md={12 / 9} key={`surrounding-frame-${index}`}>
                  {surroundingFrame !== 'loading' ? (
                    // Render the actual content if the surrounding frame data is available
                    <a style={{ textDecoration: 'none' }}>
                      <StyledCard
                        sx={{
                          ...((parseInt(frame, 10) === surroundingFrame.frame) && { border: '3px solid orange' }),
                          cursor: (parseInt(frame, 10) === surroundingFrame.frame) ? 'default' : 'pointer'
                        }}>
                        <StyledCardMedia
                          component="img"
                          alt={`${surroundingFrame.frame}`}
                          src={`${surroundingFrame.frameImage}`}
                          title={surroundingFrame.subtitle || 'No subtitle'}
                          onClick={() => {
                            navigate(`/frame/${cid}/${season}/${episode}/${surroundingFrame.frame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`);
                          }}
                          onLoad={() => handleImageLoad(surroundingFrame.frame)}
                          onError={() => {
                            console.error(`Failed to load image for frame ${surroundingFrame.frame}`);
                            handleImageLoad(surroundingFrame.frame);
                          }}
                          sx={{
                            display: imagesLoaded[surroundingFrame.frame] ? 'block' : 'none',
                          }}
                        />
                        {!imagesLoaded[surroundingFrame.frame] && (
                          <Skeleton variant='rounded' sx={{ width: '100%', height: 0, paddingTop: '56.25%' }} />
                        )}
                      </StyledCard>
                    </a>
                  ) : (
                    // Render a skeleton if the data is not yet available (loading)
                    <Skeleton variant='rounded' sx={{ width: '100%', height: 0, paddingTop: '56.25%' }} />
                  )}
                </Grid>
              ))}
            </Grid>

            <Grid item xs={12} mt={3}>
              <Button
                variant="contained"
                fullWidth
                href={`/episode/${cid}/${season}/${episode}/${Math.round(frame / 10) * 10}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`}
              >
                View Episode
              </Button>
            </Grid>

            {user?.userDetails?.subscriptionStatus !== 'active' && (
              <Grid item xs={12} mt={2}>
                <center>
                  <Box sx={{ maxWidth: '800px' }}>
                    <FramePageBottomBannerAd />
                  </Box>
                </center>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container >
    </>
  );
}

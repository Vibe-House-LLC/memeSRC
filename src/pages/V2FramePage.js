// V2FramePage.js

// eslint-disable camelcase
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, useContext, memo, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { useTheme } from '@emotion/react';
import {
  IconButton,
  Button,
  Typography,
  Container,
  Card,
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
  TextField,
  Snackbar,
  Alert,
  FormControl,
  FormLabel,
  Menu,
  MenuItem,
  Select,
  ToggleButtonGroup,
  ToggleButton,
  Popover,
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos, ArrowDropDown, BrowseGallery, Close, ContentCopy, Edit, FontDownloadOutlined, FormatBold, FormatColorFill, FormatItalic, FormatUnderlined, GpsFixed, GpsNotFixed, HistoryToggleOffRounded, Menu as MenuIcon, OpenInNew, Collections, Add, PhotoLibrary } from '@mui/icons-material';
import { TwitterPicker } from 'react-color';
import PropTypes from 'prop-types';
import useSearchDetails from '../hooks/useSearchDetails';
import { fetchFrameInfo, fetchFramesFineTuning, fetchFramesSurroundingPromises } from '../utils/frameHandlerV2';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import getV2Metadata from '../utils/getV2Metadata';
import FramePageBottomBannerAd from '../ads/FramePageBottomBannerAd';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';
import HomePageBannerAd from '../ads/HomePageBannerAd';
import FixedMobileBannerAd from '../ads/FixedMobileBannerAd';
import { shouldShowAds } from '../utils/adsenseLoader';
// Removed collage collector usage
import { saveImageToLibrary } from '../utils/library/saveImageToLibrary';
import { trackUsageEvent } from '../utils/trackUsageEvent';
import { useTrackImageSaveIntent } from '../hooks/useTrackImageSaveIntent';
import AddToCollageChooser from '../components/collage/AddToCollageChooser';
import {
  createProject,
  resolveTemplateSnapshot,
  upsertProject,
} from '../components/collage/utils/templates';
import { renderThumbnailFromSnapshot } from '../components/collage/utils/renderThumbnailFromSnapshot';
import {
  appendImageToSnapshot,
  buildSnapshotSignature,
  MAX_COLLAGE_IMAGES,
  normalizeSnapshot,
  replaceImageInSnapshot,
  snapshotImageFromPayload,
} from '../components/collage/utils/snapshotEditing';
import ReplaceCollageImageDialog from '../components/collage/ReplaceCollageImageDialog';
import { get as getFromLibrary } from '../utils/library/storage';

// import { listGlobalMessages } from '../../../graphql/queries'

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;
`;

const StyledCardMedia = styled('img')`
  width: 100%;
  height: auto;
  background-color: black;
`;

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const SurroundingFrameThumbnail = ({
  frameData,
  index,
  activeFrame,
  cid,
  season,
  episode,
  searchTerm,
  onNavigate,
  onLoad,
  onError,
  isLoaded,
}) => {
  const meta = useMemo(() => {
    const payload = {
      source: 'V2FramePage',
      intentTarget: 'SurroundingFrameThumbnail',
      position: index,
    };

    const resolvedCid = frameData?.cid || cid;
    if (resolvedCid) {
      payload.cid = resolvedCid;
    }

    if (frameData?.season || season) {
      payload.season = frameData?.season || season;
    }

    if (frameData?.episode || episode) {
      payload.episode = frameData?.episode || episode;
    }

    if (frameData?.frame) {
      payload.frame = frameData.frame;
    }

    if (typeof searchTerm === 'string' && searchTerm.length > 0) {
      payload.searchTerm = searchTerm;
    }

    return payload;
  }, [cid, episode, frameData, index, searchTerm, season]);

  const intentHandlers = useTrackImageSaveIntent(meta);
  const isActive = Number(activeFrame) === Number(frameData?.frame);

  return (
    <StyledCard
      sx={{
        ...(isActive && { border: '3px solid orange' }),
        cursor: isActive ? 'default' : 'pointer',
      }}
    >
      <StyledCardMedia
        component="img"
        alt={`${frameData?.frame}`}
        src={`${frameData?.frameImage}`}
        title={frameData?.subtitle || 'No subtitle'}
        draggable
        onClick={onNavigate}
        onLoad={onLoad}
        onError={onError}
        sx={{ display: isLoaded ? 'block' : 'none' }}
        {...intentHandlers}
      />
      {!isLoaded && (
        <Skeleton variant='rounded' sx={{ width: '100%', height: 0, paddingTop: '56.25%' }} />
      )}
    </StyledCard>
  );
};

export default function FramePage() {
  const { setFrame } = useSearchDetails();
  const navigate = useNavigate();
  const [frameData, setFrameData] = useState({});
  const [fineTuningFrames, setFineTuningFrames] = useState([]);
  const [surroundingFrames, setSurroundingFrames] = useState([]);
  const [surroundingSubtitles, setSurroundingSubtitles] = useState(null);
  const [loading, setLoading] = useState(false);
  const { cid, season, episode, frame, fineTuningIndex = null } = useParams();
  const [confirmedCid, setConfirmedCid] = useState();
  const [displayImage, setDisplayImage] = useState();
  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  const aspectRatio = '16/9';
  const [showTitle] = useState('');
  const [imgSrc, setImgSrc] = useState();
  const [showText, setShowText] = useState(false);
  const [fontSizeScaleFactor, setFontSizeScaleFactor] = useState(1);
  const [fontLineHeightScaleFactor, setFontLineHeightScaleFactor] = useState(1);
  const [fontBottomMarginScaleFactor, setFontBottomMarginScaleFactor] = useState(1);
  const [loadingFineTuning, setLoadingFineTuning] = useState(false);
  const [fineTuningLoadStarted, setFineTuningLoadStarted] = useState(false);
  const [fineTuningBlobs, setFineTuningBlobs] = useState([]);
  const [searchParams] = useSearchParams();
  const urlSearchTerm = searchParams.get('searchTerm');
  const encodedSearchTerm = useMemo(
    () => (urlSearchTerm ? encodeURIComponent(urlSearchTerm) : ''),
    [urlSearchTerm],
  );
  const {
    selectedFrameIndex,
    setSelectedFrameIndex,
    searchQuery: contextSearchQuery,
  } = useSearchDetailsV2();

  const [textFieldFocused, setTextFieldFocused] = useState(false);

  const throttleTimeoutRef = useRef(null);
  const lastTrackedFrameRef = useRef('');

  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const isPro = user?.userDetails?.magicSubscription === 'true';
  const hasLibraryAccess = isAdmin || isPro;
  const hasToolAccess = isAdmin || isPro;
  const [toolsAnchorEl, setToolsAnchorEl] = useState(null);
  const toolsMenuOpen = Boolean(toolsAnchorEl);
  const currentImage = displayImage || frameData?.frameImage;
  const [addingToCollage, setAddingToCollage] = useState(false);
  const [collageChooserOpen, setCollageChooserOpen] = useState(false);
  const [pendingCollagePayload, setPendingCollagePayload] = useState(null);
  const [collagePreview, setCollagePreview] = useState(null);
  const [collageReplaceDialogOpen, setCollageReplaceDialogOpen] = useState(false);
  const [collageReplaceSelection, setCollageReplaceSelection] = useState(null);
  const [collageReplaceOptions, setCollageReplaceOptions] = useState([]);
  const [collageReplaceContext, setCollageReplaceContext] = useState(null);

  const resolveSnapshotImageUrl = useCallback(
    async (imageRef) => {
      if (!imageRef) return null;
      if (typeof imageRef.url === 'string' && imageRef.url.length > 0) {
        return imageRef.url;
      }
      if (imageRef.libraryKey) {
        try {
          const blob = await getFromLibrary(imageRef.libraryKey, { level: 'private' });
          return await blobToDataUrl(blob);
        } catch (err) {
          console.warn('Unable to load collage image from library', err);
        }
      }
      return null;
    },
    [blobToDataUrl]
  );

  const persistCollageSnapshot = useCallback(
    async (projectId, snapshot) => {
      const normalized = normalizeSnapshot(snapshot, 'portrait');
      await upsertProject(projectId, { state: normalized });
      let thumbnail = null;
      try {
        thumbnail = await renderThumbnailFromSnapshot(normalized, { maxDim: 512 });
        if (thumbnail) {
          const signature = buildSnapshotSignature(normalized);
          await upsertProject(projectId, {
            thumbnail,
            thumbnailSignature: signature,
            thumbnailUpdatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Failed to render collage thumbnail', err);
      }
      return { snapshot: normalized, thumbnail };
    },
    [buildSnapshotSignature, normalizeSnapshot, renderThumbnailFromSnapshot, upsertProject]
  );

  const loadCollageSnapshot = useCallback(
    async (project) => {
      const snap = await resolveTemplateSnapshot(project);
      return normalizeSnapshot(snap, 'portrait');
    },
    [normalizeSnapshot, resolveTemplateSnapshot]
  );

  const prepareReplaceDialogOptions = useCallback(
    async (snapshot) => {
      const urls = await Promise.all(
        (snapshot?.images || []).map(async (img) => ({
          url: await resolveSnapshotImageUrl(img),
        }))
      );
      setCollageReplaceOptions(urls);
      setCollageReplaceSelection(urls.length ? 0 : null);
    },
    [resolveSnapshotImageUrl]
  );

  const ensureCollagePayloadHasLibraryKey = useCallback(async () => {
    if (!pendingCollagePayload) return null;
    if (pendingCollagePayload?.imagePayload?.metadata?.libraryKey) {
      return pendingCollagePayload;
    }
    const libraryKey = await saveImageToLibrary(
      pendingCollagePayload.blob,
      pendingCollagePayload.filename,
      {
        level: 'private',
        metadata: pendingCollagePayload.metadata,
      }
    );
    const updatedPayload = {
      ...pendingCollagePayload,
      imagePayload: {
        ...pendingCollagePayload.imagePayload,
        metadata: {
          ...pendingCollagePayload.imagePayload.metadata,
          libraryKey,
        },
      },
    };
    setPendingCollagePayload(updatedPayload);
    return updatedPayload;
  }, [pendingCollagePayload, saveImageToLibrary]);

  // Function to save current frame to library
  const handleSaveToLibrary = async () => {
    if (!displayImage || savingToLibrary) return;

    setSavingToLibrary(true);
    try {
      // Create a canvas to generate the final image
      const offScreenCanvas = document.createElement('canvas');
      const ctx = offScreenCanvas.getContext('2d');
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = displayImage;
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Set canvas dimensions
            const maxCanvasWidth = 1000;
            const canvasAspectRatio = img.width / img.height;
            const maxCanvasHeight = maxCanvasWidth / canvasAspectRatio;
            
            offScreenCanvas.width = maxCanvasWidth;
            offScreenCanvas.height = maxCanvasHeight;
            
                      // Draw the image (original image without any text overlay)
          ctx.drawImage(img, 0, 0, maxCanvasWidth, maxCanvasHeight);
            
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
      });
      
      // Convert canvas to Blob (prefer toBlob and pass Blob to library saver)
      const blob = await new Promise((resolve) => offScreenCanvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Failed to create image blob');
      
      // Generate filename
      const showTitleSafe = (showTitle || frameData?.showTitle || 'frame').replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `${showTitleSafe}-S${season}E${episode}-${frameToTimeCode(frame).replace(/:/g, '-')}`;
      
      // Save to library with metadata (default caption + show tag)
      const showName = (showTitle || frameData?.showTitle || '').toString();
      const defaultCaption = (loadedSubtitle || '').toString();
      await saveImageToLibrary(blob, filename, {
        level: 'private',
        metadata: {
          tags: showName ? [showName] : [],
          description: '',
          defaultCaption,
        },
      });

      const eventPayload = {
        cid: confirmedCid,
        season,
        episode,
        frame,
        fineTuningIndex,
        source: 'V2FramePage',
      };

      const resolvedSearchTerm = resolveSearchTerm();
      if (resolvedSearchTerm !== undefined) {
        eventPayload.searchTerm = resolvedSearchTerm;
      }

      trackUsageEvent('add_to_library', eventPayload);
      handleSnackbarOpen('Saved to Library', {
        autoHideDuration: 4000,
        action: (
          <Button
            color="inherit"
            size="small"
            component={RouterLink}
            to="/library"
            onClick={handleSnackbarClose}
          >
            View Library
          </Button>
        ),
      });
    } catch (error) {
      console.error('Error saving frame to library:', error);
    } finally {
      setSavingToLibrary(false);
    }
  };

  const handleOpenToolsMenu = (event) => {
    setToolsAnchorEl(event.currentTarget);
  };

  const handleCloseToolsMenu = () => {
    setToolsAnchorEl(null);
  };

  const requireToolAccess = () => {
    if (!hasToolAccess) {
      openSubscriptionDialog();
      handleCloseToolsMenu();
      return false;
    }
    return true;
  };

  const trackToolSelect = (tool) => {
    const payload = {
      source: 'V2FramePage',
      tool,
      cid: confirmedCid || cid,
      season,
      episode,
      frame,
    };

    if (fineTuningIndex !== null && fineTuningIndex !== undefined) {
      payload.fineTuningIndex = fineTuningIndex;
    }

    if (typeof selectedFrameIndex === 'number') {
      payload.selectedFrameIndex = selectedFrameIndex;
    }

    trackUsageEvent('frame_tool_select', payload);
  };

  const handleLibrarySelect = async () => {
    handleCloseToolsMenu();

    if (!hasLibraryAccess || !displayImage || !confirmedCid || savingToLibrary) {
      return;
    }

    trackToolSelect('library');

    await handleSaveToLibrary();
  };

  const handleToolSelect = (tool) => {
    if (tool === 'library') {
      void handleLibrarySelect();
      return;
    }

    if (!currentImage) {
      handleCloseToolsMenu();
      return;
    }

    if (tool === 'advanced') {
      trackToolSelect(tool);
      navigate(advancedEditorPath);
      handleCloseToolsMenu();
      return;
    }

    if (!requireToolAccess()) return;

    trackToolSelect(tool);

    if (tool === 'collage') {
      handleCloseToolsMenu();
      void handlePrepareCollage();
    }
  };

  /* ---------- This is used to prevent slider activity while scrolling on mobile ---------- */

  const isSm = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const fonts = ["Arial", "Courier New", "Georgia", "Verdana", "Akbar", "Baveuse", "PULPY", "scrubs", "South Park", "SPIDEY", "HORROR", "IMPACT", "Star Jedi", "twilight", "zuume"];

  /* -------------------------------------------------------------------------- */

  const FontSelector = ({ selectedFont, onSelectFont }) => (
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

  FontSelector.propTypes = {
    selectedFont: PropTypes.string.isRequired,
    onSelectFont: PropTypes.func.isRequired,
  };

  useEffect(() => {
    getV2Metadata(cid).then(metadata => {
      setConfirmedCid(metadata.id)
    }).catch(error => {
      console.log(error)
    })
  }, [cid]);

  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    severity: 'success',
    duration: 2000,
    action: null,
  });
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [loadedSubtitle, setLoadedSubtitle] = useState('');

  const resolveSearchTerm = useCallback(() => {
    if (typeof urlSearchTerm === 'string' && urlSearchTerm.length > 0) {
      return urlSearchTerm;
    }

    if (typeof contextSearchQuery === 'string' && contextSearchQuery.length > 0) {
      return contextSearchQuery;
    }

    return undefined;
  }, [contextSearchQuery, urlSearchTerm]);

  const episodeLink = (() => {
    const frameNumber = Number(frame);
    const anchorFrame = Number.isFinite(frameNumber) ? Math.round(frameNumber / 10) * 10 : frame;
    const searchSuffix = encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : '';
    return `/episode/${cid}/${season}/${episode}/${anchorFrame}${searchSuffix}`;
  })();

  const theme = useTheme();

  const resolvedSearchTermValue = resolveSearchTerm();

  const mainImageSaveIntentMeta = useMemo(() => {
    const meta = {
      source: 'V2FramePage',
      intentTarget: 'FrameHeroImage',
    };

    const resolvedCid = confirmedCid || cid;
    if (resolvedCid) {
      meta.cid = resolvedCid;
    }

    if (season) {
      meta.season = season;
    }

    if (episode) {
      meta.episode = episode;
    }

    if (frame) {
      meta.frame = frame;
    }

    if (fineTuningIndex !== null && fineTuningIndex !== undefined) {
      meta.fineTuningIndex = fineTuningIndex;
    }

    if (typeof selectedFrameIndex === 'number') {
      meta.selectedFrameIndex = selectedFrameIndex;
    }

    if (typeof resolvedSearchTermValue === 'string' && resolvedSearchTermValue.length > 0) {
      meta.searchTerm = resolvedSearchTermValue;
    }

    return meta;
  }, [
    cid,
    confirmedCid,
    season,
    episode,
    frame,
    fineTuningIndex,
    selectedFrameIndex,
    resolvedSearchTermValue,
  ]);

  const collageIntentMeta = useMemo(() => {
    const meta = {
      source: 'V2FramePage',
    };

    const resolvedCid = confirmedCid || cid;
    if (resolvedCid) {
      meta.cid = resolvedCid;
    }

    if (season) {
      meta.season = season;
    }

    if (episode) {
      meta.episode = episode;
    }

    if (frame) {
      meta.frame = frame;
    }

    if (fineTuningIndex !== null && fineTuningIndex !== undefined) {
      meta.fineTuningIndex = fineTuningIndex;
    }

    if (typeof selectedFrameIndex === 'number') {
      meta.selectedFrameIndex = selectedFrameIndex;
    }

    if (typeof resolvedSearchTermValue === 'string' && resolvedSearchTermValue.length > 0) {
      meta.searchTerm = resolvedSearchTermValue;
    }

    return meta;
  }, [cid, confirmedCid, episode, frame, fineTuningIndex, resolvedSearchTermValue, season, selectedFrameIndex]);

  const advancedEditorPath = useMemo(() => {
    const fineTuningSuffix = (fineTuningIndex || fineTuningLoadStarted) ? `/${selectedFrameIndex}` : '';
    const searchSuffix = encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : '';
    return `/editor/${cid}/${season}/${episode}/${frame}${fineTuningSuffix}${searchSuffix}`;
  }, [cid, season, episode, frame, fineTuningIndex, fineTuningLoadStarted, selectedFrameIndex, encodedSearchTerm]);

  const mainImageSaveIntentHandlers = useTrackImageSaveIntent(mainImageSaveIntentMeta);

  const handleSnackbarOpen = (message, options = {}) => {
    setSnackbarState({
      open: true,
      message,
      severity: options.severity || 'success',
      duration: options.autoHideDuration ?? 2000,
      action: options.action || null,
    });
  };

  const handleSnackbarClose = () => {
    setSnackbarState((prev) => ({
      ...prev,
      open: false,
    }));
  };

  useEffect(() => {
    if (!confirmedCid || !frame || !displayImage) {
      return;
    }

    const frameKey = `${confirmedCid}:${season}:${episode}:${frame}`;
    if (lastTrackedFrameRef.current === frameKey) {
      return;
    }

    lastTrackedFrameRef.current = frameKey;

    const eventPayload = {
      cid: confirmedCid,
      season,
      episode,
      frame,
      fineTuningIndex,
      source: 'V2FramePage',
    };

    const resolvedSearchTerm = resolveSearchTerm();
    if (resolvedSearchTerm !== undefined) {
      eventPayload.searchTerm = resolvedSearchTerm;
    }

    trackUsageEvent('view_image', eventPayload);
  }, [
    confirmedCid,
    season,
    episode,
    frame,
    fineTuningIndex,
    displayImage,
    resolveSearchTerm,
  ]);

  /* ---------------------------- Subtitle Function --------------------------- */

  const handleClearCaption = () => {
    setLoadedSubtitle('');
    updateCanvas();
  };

  const buildFontString = (style, fontSize, fontFamily) => {
    const fontStyle = style.italic ? 'italic' : 'normal';
    const fontWeight = style.bold ? 'bold' : 'normal';
    return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  };

  function parseFormattedText(text, baseStyle) {
    const tagRegex = /<\/?(b|i|u)>/gi;
    const segments = [];
    const styleStack = [{ tag: null, style: { ...baseStyle } }];

    let lastIndex = 0;
    let match;

    const currentStyle = () => styleStack[styleStack.length - 1].style;

    while ((match = tagRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, match.index),
          style: { ...currentStyle() },
        });
      }

      const tag = match[1].toLowerCase();
      const isClosing = match[0].startsWith('</');

      if (isClosing) {
        if (styleStack[styleStack.length - 1].tag === tag) {
          styleStack.pop();
        }
      } else {
        const nextStyle = { ...currentStyle() };
        if (tag === 'b') nextStyle.bold = true;
        if (tag === 'i') nextStyle.italic = true;
        if (tag === 'u') nextStyle.underline = true;
        styleStack.push({ tag, style: nextStyle });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        style: { ...currentStyle() },
      });
    }

    return segments;
  }

  function wrapFormattedText(context, text, x, y, maxWidth, lineHeight, fontSize, fontFamily, baseStyle, shouldDraw = true) {
    const segments = parseFormattedText(text, baseStyle);
    if (segments.length === 0) {
      return 0;
    }

    const newlineAwareSegments = [];
    segments.forEach((segment) => {
      const parts = segment.text.split('\n');
      parts.forEach((part, index) => {
        if (part) {
          newlineAwareSegments.push({ type: 'text', text: part, style: segment.style });
        }
        if (index < parts.length - 1) {
          newlineAwareSegments.push({ type: 'newline' });
        }
      });
    });

    const getSegmentWidth = (segmentText, style) => {
      context.font = buildFontString(style, fontSize, fontFamily);
      return context.measureText(segmentText).width;
    };

    let totalLines = 0;
    let currentLineSegments = [];
    let currentLineWidth = 0;

    const drawLine = () => {
      const totalWidth = currentLineSegments.reduce((sum, segment) => sum + segment.width, 0);
      const startX = x - totalWidth / 2;

      if (shouldDraw) {
        const previousAlignment = context.textAlign;
        context.textAlign = 'left';
        let cursorX = startX;

        currentLineSegments.forEach((segment) => {
          context.font = buildFontString(segment.style, fontSize, fontFamily);

          if (segment.style.underline) {
            const underlineY = y + Math.max(fontSize * 0.18, context.lineWidth * 1.25);
            const previousStrokeStyle = context.strokeStyle;
            const previousFillStyle = context.fillStyle;
            const previousLineWidth = context.lineWidth;

            // Draw underline stroke to match text outline and sit behind the text
            context.strokeStyle = previousStrokeStyle;
            context.lineWidth = previousLineWidth;
            context.beginPath();
            context.moveTo(cursorX, underlineY);
            context.lineTo(cursorX + segment.width, underlineY);
            context.stroke();

            // Fill pass for the underline
            context.strokeStyle = previousFillStyle;
            context.lineWidth = Math.max(previousLineWidth - 1, 1);
            context.beginPath();
            context.moveTo(cursorX, underlineY);
            context.lineTo(cursorX + segment.width, underlineY);
            context.stroke();

            context.strokeStyle = previousStrokeStyle;
            context.lineWidth = previousLineWidth;
          }

          context.strokeText(segment.text, cursorX, y);
          context.fillText(segment.text, cursorX, y);

          cursorX += segment.width;
        });

        context.textAlign = previousAlignment;
      }

      totalLines += 1;
      y += lineHeight;
      currentLineSegments = [];
      currentLineWidth = 0;
    };

    newlineAwareSegments.forEach((segment) => {
      if (segment.type === 'newline') {
        drawLine();
        return;
      }

      const words = segment.text.split(/(\s+)/).filter((word) => word !== '');
      words.forEach((word) => {
        const width = getSegmentWidth(word, segment.style);
        const exceedsMaxWidth = currentLineWidth + width > maxWidth;

        if (exceedsMaxWidth && currentLineSegments.length > 0) {
          drawLine();
        }

        currentLineSegments.push({ text: word, style: segment.style, width });
        currentLineWidth += width;
      });
    });

    if (currentLineSegments.length > 0) {
      drawLine();
    }

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
    img.onload = () => {
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

          const baseStyle = { bold: isBold, italic: isItalic, underline: isUnderline };
          const appliedFontSize = isMd ? scaledFontSizeDesktop : scaledFontSizeMobile;

          // Calculate number of lines without drawing
          const numOfLines = wrapFormattedText(
            ctx,
            text,
            x,
            startY,
            maxWidth,
            scaledLineHeight,
            appliedFontSize,
            fontFamily,
            baseStyle,
            false,
          );
          const totalTextHeight = numOfLines * scaledLineHeight;  // Use scaled line height

          // Adjust startY to anchor the text a scaled distance from the bottom
          const startYAdjusted = offScreenCanvas.height - totalTextHeight - scaledBottomAnch + 40;

          // Draw the text using the adjusted startY
          wrapFormattedText(
            ctx,
            text,
            x,
            startYAdjusted,
            maxWidth,
            scaledLineHeight,
            appliedFontSize,
            fontFamily,
            baseStyle,
          );
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
      const blobPromises = fineTuningFrames.map((url) =>
        fetch(url)
          .then((response) => response.blob())
          .catch((error) => {
            console.error('Error fetching image:', error);
            return null;
          }));

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

  const [frames, setFrames] = useState();
  const [, setOriginalSubtitle] = useState('');
  const [, setSubtitleUserInteracted] = useState(false);
  const [, setLoadedSeason] = useState('');
  const [, setLoadedEpisode] = useState('');
  const [colorPickerShowing, setColorPickerShowing] = useState(false);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);

  // Base styles always default to false - formatting is markup-based only
  const [isBold] = useState(false);
  const [isItalic] = useState(false);
  const [isUnderline] = useState(false);

  const [activeFormats, setActiveFormats] = useState([]);

  const selectionCacheRef = useRef({});
  const SELECTION_CACHE_TTL_MS = 15000;
  
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
      colorPickerColor,
      fontFamily,
    };
    localStorage.setItem(`formatting-${user?.username}-${cid}`, JSON.stringify(formattingOptions));
  };

  const handleCollageChooserClose = useCallback(() => {
    setCollageChooserOpen(false);
    setPendingCollagePayload(null);
    setCollagePreview(null);
  }, []);

  const handlePrepareCollage = useCallback(async () => {
    if (addingToCollage || !currentImage) return;

    setAddingToCollage(true);
    try {
      const response = await fetch(currentImage);
      if (!response.ok) {
        throw new Error('Failed to fetch frame image');
      }
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (!dataUrl) {
        throw new Error('Unable to read frame image');
      }

      const rawSubtitle = typeof loadedSubtitle === 'string' ? loadedSubtitle : '';
      const subtitle = rawSubtitle.trim();
      const hasSubtitle = subtitle.length > 0;
      const subtitleShowing = hasSubtitle && showText;
      const filename = `collage-${Date.now()}.jpg`;

      const metadata = {
        source: 'V2FramePage',
        ...(hasSubtitle ? { defaultCaption: subtitle } : {}),
        ...(fontFamily ? { fontFamily } : {}),
        ...((confirmedCid || cid) ? { cid: confirmedCid || cid } : {}),
        ...(season ? { season } : {}),
        ...(episode ? { episode } : {}),
        ...(frame ? { frame } : {}),
      };

      const imagePayload = {
        originalUrl: dataUrl,
        displayUrl: dataUrl,
        ...(hasSubtitle ? { subtitle } : {}),
        subtitleShowing,
        metadata: {
          source: 'V2FramePage',
          ...(fontFamily ? { fontFamily } : {}),
          ...(hasSubtitle ? { defaultCaption: subtitle } : {}),
        },
      };

      setPendingCollagePayload({ imagePayload, blob, metadata, filename });
      setCollageChooserOpen(true);
    } catch (error) {
      console.error('Error preparing collage image:', error);
    } finally {
      setAddingToCollage(false);
    }
  }, [addingToCollage, cid, confirmedCid, currentImage, episode, fontFamily, frame, loadedSubtitle, season, showText]);

  const handleCollageNewProject = useCallback(async () => {
    try {
      setAddingToCollage(true);
      const payloadWithKey = await ensureCollagePayloadHasLibraryKey();
      if (!payloadWithKey) return;
      const project = await createProject({ name: 'Untitled Meme' });
      const projectId = project?.id;
      if (!projectId) throw new Error('Missing project id for collage project');
      const { snapshot, thumbnail } = await persistCollageSnapshot(
        projectId,
        appendImageToSnapshot(null, snapshotImageFromPayload(payloadWithKey.imagePayload)).snapshot
      );

      trackUsageEvent('add_to_collage', {
        ...collageIntentMeta,
        projectId,
        libraryKey: payloadWithKey.imagePayload?.metadata?.libraryKey,
        subtitleIncluded: Boolean(payloadWithKey.imagePayload?.subtitle),
        subtitleShowing: Boolean(payloadWithKey.imagePayload?.subtitleShowing),
        target: 'new_project',
      });

      setCollagePreview({
        projectId,
        name: project?.name || 'Untitled Meme',
        thumbnail: thumbnail || null,
        snapshot,
      });
      setCollageChooserOpen(true);
    } catch (error) {
      console.error('Error creating collage project:', error);
    } finally {
      setAddingToCollage(false);
    }
  }, [
    appendImageToSnapshot,
    collageIntentMeta,
    createProject,
    ensureCollagePayloadHasLibraryKey,
    persistCollageSnapshot,
    snapshotImageFromPayload,
    trackUsageEvent,
  ]);

  const handleCollageExistingProject = useCallback(
    async (project) => {
      try {
        setAddingToCollage(true);
        const payloadWithKey = await ensureCollagePayloadHasLibraryKey();
        if (!project?.id || !payloadWithKey) return;
        const baseSnapshot = await loadCollageSnapshot(project);
        const incomingImage = snapshotImageFromPayload(payloadWithKey.imagePayload);
        if ((baseSnapshot.images || []).length >= MAX_COLLAGE_IMAGES) {
          setCollageReplaceContext({
            project,
            snapshot: baseSnapshot,
            incomingImage,
            incomingPreview:
              payloadWithKey.imagePayload.displayUrl ||
              payloadWithKey.imagePayload.originalUrl ||
              null,
          });
          setCollageChooserOpen(false);
          await prepareReplaceDialogOptions(baseSnapshot);
          setCollageReplaceDialogOpen(true);
          setAddingToCollage(false);
          return;
        }

        const { snapshot } = appendImageToSnapshot(baseSnapshot, incomingImage);
        const { thumbnail } = await persistCollageSnapshot(project.id, snapshot);

        trackUsageEvent('add_to_collage', {
          ...collageIntentMeta,
          projectId: project.id,
          libraryKey: payloadWithKey.imagePayload?.metadata?.libraryKey,
          subtitleIncluded: Boolean(payloadWithKey.imagePayload?.subtitle),
          subtitleShowing: Boolean(payloadWithKey.imagePayload?.subtitleShowing),
          target: 'existing_project',
        });

        setCollagePreview({
          projectId: project.id,
          name: project?.name || 'Untitled Meme',
          thumbnail: thumbnail || null,
          snapshot,
        });
        setCollageChooserOpen(true);
      } catch (err) {
        console.error('Error adding image to existing collage:', err);
      } finally {
        setAddingToCollage(false);
      }
    },
    [
      appendImageToSnapshot,
      collageIntentMeta,
      ensureCollagePayloadHasLibraryKey,
      loadCollageSnapshot,
      prepareReplaceDialogOptions,
      persistCollageSnapshot,
      snapshotImageFromPayload,
      setCollageChooserOpen,
      trackUsageEvent,
    ]
  );

  const handleCollageReplaceCancel = useCallback(() => {
    if (addingToCollage) return;
    setCollageReplaceDialogOpen(false);
    setCollageReplaceContext(null);
    setCollageReplaceOptions([]);
    setCollageReplaceSelection(null);
    setPendingCollagePayload(null);
    setCollageChooserOpen(true);
  }, [addingToCollage]);

  const handleCollageReplaceConfirm = useCallback(async () => {
    if (!collageReplaceContext || collageReplaceSelection == null) return;
    try {
      setAddingToCollage(true);
      const nextSnapshot = replaceImageInSnapshot(
        collageReplaceContext.snapshot,
        collageReplaceSelection,
        collageReplaceContext.incomingImage
      );
      const { thumbnail } = await persistCollageSnapshot(collageReplaceContext.project.id, nextSnapshot);

      trackUsageEvent('add_to_collage', {
        ...collageIntentMeta,
        projectId: collageReplaceContext.project.id,
        target: 'existing_project',
        replacedIndex: collageReplaceSelection,
      });

      setCollagePreview({
        projectId: collageReplaceContext.project.id,
        name: collageReplaceContext.project?.name || 'Untitled Meme',
        thumbnail: thumbnail || null,
        snapshot: nextSnapshot,
      });
      setPendingCollagePayload(null);
      setCollageReplaceDialogOpen(false);
      setCollageReplaceContext(null);
      setCollageReplaceOptions([]);
      setCollageReplaceSelection(null);
      setCollageChooserOpen(true);
    } catch (err) {
      console.error('Error replacing collage image:', err);
    } finally {
      setAddingToCollage(false);
    }
  }, [
    collageIntentMeta,
    collageReplaceContext,
    collageReplaceSelection,
    persistCollageSnapshot,
    replaceImageInSnapshot,
    trackUsageEvent,
  ]);

  const handleMainImageLoad = () => {
    setMainImageLoaded(true);
  };

  const textFieldRef = useRef(null);

  const applyTagToSelection = (tag) => {
    const input = textFieldRef.current;
    if (!input || input.selectionStart === null || input.selectionEnd === null) {
      return false;
    }

    const { selectionStart, selectionEnd, value } = input;
    if (selectionStart === selectionEnd) {
      return false;
    }

    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;

    const before = value.slice(0, selectionStart);
    const selectedText = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);

    const hasWrapping = before.endsWith(openTag) && after.startsWith(closeTag);
    const newValue = hasWrapping
      ? `${before.slice(0, before.length - openTag.length)}${selectedText}${after.slice(closeTag.length)}`
      : `${before}${openTag}${selectedText}${closeTag}${after}`;

    const selectionAdjustment = hasWrapping ? -openTag.length : openTag.length;
    const newSelectionStart = selectionStart + selectionAdjustment;
    const newSelectionEnd = selectionEnd + selectionAdjustment;

    setLoadedSubtitle(newValue);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(newSelectionStart, newSelectionEnd);
    });

    return true;
  };

  // Inline formatting helpers (ported from V2EditorPage)
  const INLINE_TAG_ORDER = ['bold', 'italic', 'underline'];
  const STYLE_TO_TAG = { bold: 'b', italic: 'i', underline: 'u' };

  const normalizeStyle = (style = {}) => ({
    bold: Boolean(style.bold),
    italic: Boolean(style.italic),
    underline: Boolean(style.underline),
  });

  const mergeAdjacentRanges = (ranges = []) => {
    if (!ranges.length) return [];

    const merged = [];
    ranges.forEach((range) => {
      const safeStyle = normalizeStyle(range.style);
      if (merged.length === 0) {
        merged.push({ ...range, style: safeStyle });
        return;
      }

      const last = merged[merged.length - 1];
      const lastStyle = normalizeStyle(last.style);

      if (
        last.end === range.start &&
        lastStyle.bold === safeStyle.bold &&
        lastStyle.italic === safeStyle.italic &&
        lastStyle.underline === safeStyle.underline
      ) {
        last.end = range.end;
      } else {
        merged.push({ ...range, style: safeStyle });
      }
    });

    return merged;
  };

  const parseFormattedTextForInlineEditing = (rawText = '') => {
    const tagRegex = /<\/?(b|i|u)>/ig;
    const styleCounts = { b: 0, i: 0, u: 0 };
    const segments = [];
    let cleanText = '';
    let cursor = 0;

    const buildStyle = () => ({
      bold: styleCounts.b > 0,
      italic: styleCounts.i > 0,
      underline: styleCounts.u > 0,
    });

    let match;
    while ((match = tagRegex.exec(rawText)) !== null) {
      const textChunk = rawText.slice(cursor, match.index);
      if (textChunk.length > 0) {
        segments.push({ text: textChunk, style: buildStyle() });
        cleanText += textChunk;
      }

      const tagKey = match[1]?.toLowerCase();
      const isClosing = match[0].startsWith('</');
      if (tagKey && typeof styleCounts[tagKey] === 'number') {
        const delta = isClosing ? -1 : 1;
        styleCounts[tagKey] = Math.max(0, styleCounts[tagKey] + delta);
      }

      cursor = match.index + match[0].length;
    }

    const tail = rawText.slice(cursor);
    if (tail.length > 0) {
      segments.push({ text: tail, style: buildStyle() });
      cleanText += tail;
    }

    let pointer = 0;
    const ranges = segments
      .filter((segment) => segment.text.length > 0)
      .map((segment) => {
        const start = pointer;
        const end = start + segment.text.length;
        pointer = end;
        return { start, end, style: normalizeStyle(segment.style) };
      });

    return { cleanText, ranges: mergeAdjacentRanges(ranges) };
  };

  const buildIndexMaps = (rawText = '') => {
    const rawToPlain = new Array(rawText.length + 1).fill(0);
    const plainToRaw = [];
    let plainIndex = 0;
    let rawIndex = 0;

    while (rawIndex < rawText.length) {
      const char = rawText[rawIndex];
      rawToPlain[rawIndex] = plainIndex;

      if (char === '<') {
        const closingIdx = rawText.indexOf('>', rawIndex);
        if (closingIdx !== -1) {
          for (let i = rawIndex + 1; i <= closingIdx; i += 1) {
            rawToPlain[i] = plainIndex;
          }
          rawIndex = closingIdx + 1;
          continue;
        }
      }

      plainToRaw[plainIndex] = rawIndex;
      plainIndex += 1;
      rawIndex += 1;
    }

    rawToPlain[rawText.length] = plainIndex;
    plainToRaw[plainIndex] = rawText.length;

    return { rawToPlain, plainToRaw };
  };

  const resolveSelectionBounds = (ranges, textLength, rawStart = 0, rawEnd = 0, rawToPlain = []) => {
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const safeStart = clamp(rawStart ?? 0, 0, rawToPlain.length - 1);
    const safeEnd = clamp(rawEnd ?? safeStart, 0, rawToPlain.length - 1);

    const plainStart = clamp(rawToPlain[safeStart] ?? 0, 0, textLength);
    const plainEnd = clamp(rawToPlain[safeEnd] ?? plainStart, 0, textLength);

    if (plainStart !== plainEnd) {
      return { start: Math.min(plainStart, plainEnd), end: Math.max(plainStart, plainEnd) };
    }

    if (!ranges.length) {
      return { start: 0, end: 0 };
    }

    const caret = Math.min(plainStart, textLength);
    const activeRange = ranges.find((range) => caret >= range.start && caret < range.end);
    if (activeRange) {
      return { start: activeRange.start, end: activeRange.end };
    }

    const lastRange = ranges[ranges.length - 1];
    if (textLength > 0) {
      return { start: lastRange.start, end: lastRange.end };
    }

    return { start: 0, end: 0 };
  };

  const toggleStyleInRanges = (ranges, selectionStart, selectionEnd, styleKey) => {
    if (!ranges.length || selectionEnd <= selectionStart) {
      return ranges;
    }

    const overlapping = ranges.filter(
      (range) => range.end > selectionStart && range.start < selectionEnd,
    );
    const isFullyActive = overlapping.length > 0 && overlapping.every(
      (range) => normalizeStyle(range.style)[styleKey],
    );
    const targetValue = !isFullyActive;

    const nextRanges = [];

    ranges.forEach((range) => {
      const { start, end } = range;
      const safeStyle = normalizeStyle(range.style);

      if (end <= selectionStart || start >= selectionEnd) {
        nextRanges.push({ ...range, style: safeStyle });
        return;
      }

      if (start < selectionStart) {
        nextRanges.push({ start, end: selectionStart, style: safeStyle });
      }

      const middleStart = Math.max(start, selectionStart);
      const middleEnd = Math.min(end, selectionEnd);
      nextRanges.push({
        start: middleStart,
        end: middleEnd,
        style: { ...safeStyle, [styleKey]: targetValue },
      });

      if (end > selectionEnd) {
        nextRanges.push({ start: selectionEnd, end, style: safeStyle });
      }
    });

    return mergeAdjacentRanges(nextRanges);
  };

  const getActiveFormatsFromRanges = (ranges, selectionStart, selectionEnd) => {
    if (!ranges.length || selectionEnd <= selectionStart) {
      return [];
    }

    const overlapping = ranges.filter(
      (range) => range.end > selectionStart && range.start < selectionEnd,
    );

    if (!overlapping.length) {
      return [];
    }

    return INLINE_TAG_ORDER.filter((key) => overlapping.every(
      (range) => normalizeStyle(range.style)[key],
    ));
  };

  const serializeRangesToMarkup = (text = '', ranges = []) => {
    if (text.length === 0) {
      return '';
    }

    let output = '';
    let activeStyle = { bold: false, italic: false, underline: false };
    let rangeIndex = 0;

    for (let i = 0; i < text.length; i += 1) {
      while (rangeIndex < ranges.length && ranges[rangeIndex].end <= i) {
        rangeIndex += 1;
      }

      const currentRange = ranges[rangeIndex] || { style: activeStyle };
      const nextStyle = normalizeStyle(currentRange.style);

      for (let j = INLINE_TAG_ORDER.length - 1; j >= 0; j -= 1) {
        const key = INLINE_TAG_ORDER[j];
        if (activeStyle[key] && !nextStyle[key]) {
          output += `</${STYLE_TO_TAG[key]}>`;
        }
      }

      for (let j = 0; j < INLINE_TAG_ORDER.length; j += 1) {
        const key = INLINE_TAG_ORDER[j];
        if (!activeStyle[key] && nextStyle[key]) {
          output += `<${STYLE_TO_TAG[key]}>`;
        }
      }

      output += text[i];
      activeStyle = nextStyle;
    }

    for (let i = INLINE_TAG_ORDER.length - 1; i >= 0; i -= 1) {
      const key = INLINE_TAG_ORDER[i];
      if (activeStyle[key]) {
        output += `</${STYLE_TO_TAG[key]}>`;
      }
    }

    return output;
  };

  const syncActiveFormatsFromSelection = useCallback((overrideSelection) => {
    const inputEl = textFieldRef.current;
    if (!inputEl) return;

    const rawValue = inputEl.value ?? loadedSubtitle ?? '';
    const { cleanText, ranges } = parseFormattedTextForInlineEditing(rawValue);

    if (cleanText.length === 0) {
      setActiveFormats([]);
      return;
    }

    const selectionStart = overrideSelection ? overrideSelection.start : inputEl.selectionStart ?? 0;
    const selectionEnd = overrideSelection ? overrideSelection.end : inputEl.selectionEnd ?? selectionStart;

    selectionCacheRef.current = {
      start: selectionStart,
      end: selectionEnd,
      timestamp: Date.now(),
      hadFocus: true,
    };

    const { rawToPlain } = buildIndexMaps(rawValue);
    const { start, end } = resolveSelectionBounds(
      ranges,
      cleanText.length,
      selectionStart,
      selectionEnd,
      rawToPlain,
    );

    const activeFormats = getActiveFormatsFromRanges(ranges, start, end);
    setActiveFormats(activeFormats);
  }, [loadedSubtitle]);

  const applyInlineStyleToggle = useCallback((styleKey) => {
    const inputEl = textFieldRef.current;
    if (!inputEl) return false;

    const rawValue = inputEl.value ?? loadedSubtitle ?? '';
    const { cleanText, ranges } = parseFormattedTextForInlineEditing(rawValue);

    if (cleanText.length === 0) {
      return false;
    }

    const hadFocus = document.activeElement === inputEl;
    const cache = selectionCacheRef.current;
    const now = Date.now();
    const cacheIsUsable = Boolean(
      cache &&
      typeof cache.start === 'number' &&
      typeof cache.end === 'number',
    );
    const cacheIsFresh = cacheIsUsable && now - cache.timestamp < SELECTION_CACHE_TTL_MS;
    const cacheIsMeaningful = cacheIsUsable && (cache.start !== 0 || cache.end !== rawValue.length);
    const usedCachedSelection = !hadFocus && (cacheIsFresh || cacheIsMeaningful);

    const selectionStart = hadFocus && inputEl.selectionStart !== null
      ? inputEl.selectionStart
      : usedCachedSelection
        ? cache.start
        : 0;
    const selectionEnd = hadFocus && inputEl.selectionEnd !== null
      ? inputEl.selectionEnd
      : usedCachedSelection
        ? cache.end
        : rawValue.length;
    const { rawToPlain, plainToRaw } = buildIndexMaps(rawValue);
    const selectionIsCollapsed = selectionStart === selectionEnd;
    const originalPlainStart = rawToPlain[Math.min(selectionStart, rawToPlain.length - 1)] ?? 0;
    const originalPlainEnd = rawToPlain[Math.min(selectionEnd, rawToPlain.length - 1)] ?? originalPlainStart;
    const caretPlain = rawToPlain[Math.min(selectionStart, rawToPlain.length - 1)] ?? 0;
    const resolved = resolveSelectionBounds(
      ranges,
      cleanText.length,
      selectionStart,
      selectionEnd,
      rawToPlain,
    );

    let selectionStartPlain = resolved.start;
    let selectionEndPlain = resolved.end;

    if (selectionIsCollapsed) {
      const caretPlain = rawToPlain[Math.min(selectionStart, rawToPlain.length - 1)] ?? 0;
      const caretRange = ranges.find(
        (range) => caretPlain >= range.start && caretPlain < range.end,
      );
      if (caretRange) {
        selectionStartPlain = caretRange.start;
        selectionEndPlain = caretRange.end;
      }
    }

    if (selectionEndPlain <= selectionStartPlain) {
      return false;
    }

    const updatedRanges = toggleStyleInRanges(
      ranges,
      selectionStartPlain,
      selectionEndPlain,
      styleKey,
    );
    const nextValue = serializeRangesToMarkup(cleanText, updatedRanges);
    const nextIndexMaps = buildIndexMaps(nextValue);
    const finalPlainStart = selectionIsCollapsed ? caretPlain : originalPlainStart;
    const finalPlainEnd = selectionIsCollapsed ? caretPlain : originalPlainEnd;
    const nextSelectionStart = nextIndexMaps.plainToRaw[finalPlainStart] ?? nextValue.length;
    const nextSelectionEnd = nextIndexMaps.plainToRaw[finalPlainEnd] ?? nextValue.length;
    const activeFormats = getActiveFormatsFromRanges(
      updatedRanges,
      selectionStartPlain,
      selectionEndPlain,
    );

    setLoadedSubtitle(nextValue);

    requestAnimationFrame(() => {
      if (hadFocus) {
        inputEl.focus();
        inputEl.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }
      selectionCacheRef.current = {
        start: nextSelectionStart,
        end: nextSelectionEnd,
        timestamp: Date.now(),
        hadFocus: hadFocus || usedCachedSelection,
      };
      setActiveFormats(activeFormats);
    });

    return true;
  }, [loadedSubtitle]);

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

  useEffect(() => {
    const handleSelectionChange = () => {
      const activeEl = document.activeElement;
      if (!activeEl || activeEl !== textFieldRef.current) return;

      const inputEl = textFieldRef.current;
      if (inputEl.selectionStart == null || inputEl.selectionEnd == null) {
        return;
      }

      selectionCacheRef.current = {
        start: inputEl.selectionStart,
        end: inputEl.selectionEnd,
        timestamp: Date.now(),
        hadFocus: true,
      };
      syncActiveFormatsFromSelection({
        start: inputEl.selectionStart,
        end: inputEl.selectionEnd,
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [syncActiveFormatsFromSelection]);

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
  }, [displayImage, loadedSubtitle, frame, fineTuningBlobs, selectedFrameIndex, fontFamily, colorPickerColor]);

  useEffect(() => {
    updateLocalStorage();
  }, [colorPickerColor, fontFamily]);

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

  const renderFineTuningFrames = (imgSrc) => (
      <>
        <div style={{ position: 'relative' }}>
        {!mainImageLoaded && (
          <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio, paddingTop: '56.25%' }} />
        )}
        <CardMedia
          component={'img'}
          alt={`Fine-tuning ${selectedFrameIndex}`}
          image={imgSrc}
          id='frameImage'
          onLoad={handleMainImageLoad}
          onError={() => {
            console.error(`Failed to load main image`);
            handleMainImageLoad();
          }}
          draggable
          {...mainImageSaveIntentHandlers}
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
            aria-label="previous frame"
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
              navigate(`/frame/${cid}/${season}/${episode}/${Number(frame) - 10}${encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : ''}`)
            }}
          >
            <ArrowBackIos style={{ fontSize: '2rem' }} />
          </IconButton>
          <IconButton
            aria-label="next frame"
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
              navigate(`/frame/${cid}/${season}/${episode}/${Number(frame) + 10}${encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : ''}`)
            }}
          >
            <ArrowForwardIos style={{ fontSize: '2rem' }} />
          </IconButton>
        </div>

        {frames && frames?.length > 0 ?
          <Stack spacing={2} direction="row" p={0} pr={3} pl={3} alignItems={'center'}>
            <Tooltip title="Fine Tuning">
              <IconButton aria-label="fine tuning">
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
              onChangeCommitted={(e, value) => {navigate(`/frame/${cid}/${season}/${episode}/${frame}/${value}${encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : ''}`)}}
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
              <IconButton aria-label="fine tuning">
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

  const [imagesLoaded, setImagesLoaded] = useState({});

  const handleImageLoad = (frameId) => {
    setImagesLoaded((prevState) => ({ ...prevState, [frameId]: true }));
  };


  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const showAds = shouldShowAds(user);

  return (
    <>
      <Helmet>
        <title> Frame Details | memeSRC 2.0 </title>
      </Helmet>

      <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, sm: 3, md: 6, lg: 8, xl: 12 }, pt: 0 }}>
        {showAds && (
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

            <Chip
              size='small'
              icon={<OpenInNew />}
              label={`Season ${season} / Episode ${episode}`}
              onClick={() => {
                const frameRate = 10;
                const totalSeconds = Math.round(frame / frameRate);
                const nearestSecondFrame = totalSeconds * frameRate;
                navigate(`/episode/${cid}/${season}/${episode}/${nearestSecondFrame}${encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : ''}`);
              }}
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
              label={`${frameToTimeCode(frame)}`}
              onClick={() => {
                const frameRate = 10;
                const totalSeconds = Math.round(frame / frameRate);
                const nearestSecondFrame = totalSeconds * frameRate;
                navigate(`/episode/${cid}/${season}/${episode}/${nearestSecondFrame}${encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : ''}`);
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
            <Stack spacing={1.5} sx={{ width: '100%' }}>
              <Box sx={{ width: '100%' }}>
                {/* Formatting Toolbar */}
                {showText &&
                  <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <ToggleButtonGroup
                    value={activeFormats}
                    onChange={(event, newFormats) => {
                      const clickedFormat = event.currentTarget?.value;
                      const styleKeyMap = { bold: 'bold', italic: 'italic', underline: 'underline' };
                      if (clickedFormat && styleKeyMap[clickedFormat]) {
                        const handledWithInline = applyInlineStyleToggle(styleKeyMap[clickedFormat]);
                        if (handledWithInline) {
                          setShowText(true);
                          return;
                        }
                      }

                      // If no text to format, just update UI state (don't persist to base styles)
                      setActiveFormats(newFormats);
                      setShowText(true);
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
                    <ToggleButton size='small' value="underline" aria-label="underline">
                      <FormatUnderlined />
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <ToggleButtonGroup
                    sx={{ mx: 1, flexShrink: 0 }}
                    value={[colorPickerShowing && 'fontColor'].filter(Boolean)}
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
                        onChange={(e) => {
                          setLoadedSubtitle(e.target.value);
                          syncActiveFormatsFromSelection();
                        }}
                        onFocus={() => {
                          setTextFieldFocused(true);
                          setSubtitleUserInteracted(true);
                          syncActiveFormatsFromSelection();
                        }}
                        onBlur={() => setTextFieldFocused(false)}
                        InputProps={{
                          style: {
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
                    <Button
                      size="medium"
                      fullWidth
                      variant="contained"
                      onClick={handleOpenToolsMenu}
                      startIcon={<Add />}
                      endIcon={<ArrowDropDown />}
                      aria-haspopup="true"
                      aria-controls={toolsMenuOpen ? 'frame-tools-menu' : undefined}
                      aria-expanded={toolsMenuOpen ? 'true' : undefined}
                      sx={{ mt: 1.5, backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
                    >
                      Add to...
                    </Button>
                    <Menu
                      id="frame-tools-menu"
                      anchorEl={toolsAnchorEl}
                      open={toolsMenuOpen}
                      onClose={handleCloseToolsMenu}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                      <MenuItem
                        onClick={() => handleToolSelect('library')}
                        disabled={!hasLibraryAccess || !confirmedCid || !displayImage || savingToLibrary}
                      >
                        <ListItemIcon>
                          {savingToLibrary ? (
                            <CircularProgress size={18} />
                          ) : (
                            <Collections fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={savingToLibrary ? 'Saving…' : 'Library'}
                          secondary={!hasLibraryAccess ? 'Pro required' : undefined}
                        />
                      </MenuItem>
                      <MenuItem onClick={() => handleToolSelect('advanced')} disabled={!currentImage}>
                        <ListItemIcon>
                          <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Caption Tool" />
                      </MenuItem>
                      <MenuItem onClick={() => handleToolSelect('collage')} disabled={!currentImage || addingToCollage}>
                        <ListItemIcon>
                          <PhotoLibrary fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Collage Tool"
                          secondary={
                            !hasToolAccess
                              ? 'Pro required'
                              : addingToCollage
                                ? 'Preparing...'
                                : undefined
                          }
                        />
                      </MenuItem>
                    </Menu>
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
                    {textFieldFocused && showAds && (
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
            </Stack>

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
                      <MenuIcon style={{ verticalAlign: 'middle', marginTop: '-3px', marginRight: '10px' }} />
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
                                onClick={() => navigate(`/frame/${cid}/${season}/${episode}/${result?.frame}${encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : ''}`)}
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
                                handleSnackbarOpen('Copied to clipboard!');
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

          <AddToCollageChooser
            open={collageChooserOpen}
            onClose={handleCollageChooserClose}
            onSelectNew={handleCollageNewProject}
            onSelectExisting={handleCollageExistingProject}
            loading={addingToCollage}
            preview={collagePreview}
            onEditPreview={() => {
              if (!collagePreview?.projectId) return;
              navigate(`/projects/${collagePreview.projectId}`, {
                state: { projectId: collagePreview.projectId },
              });
              handleCollageChooserClose();
            }}
            onClearPreview={handleCollageChooserClose}
          />
          <ReplaceCollageImageDialog
            open={collageReplaceDialogOpen}
            incomingImageUrl={collageReplaceContext?.incomingPreview || null}
            existingImages={collageReplaceOptions}
            onClose={handleCollageReplaceCancel}
            onConfirm={handleCollageReplaceConfirm}
            busy={addingToCollage}
          />
          <Snackbar
            open={snackbarState.open}
            autoHideDuration={snackbarState.duration}
            onClose={handleSnackbarClose}
            message={snackbarState.message || 'Done'}
          >
            <Alert
              onClose={handleSnackbarClose}
              severity={snackbarState.severity}
              action={snackbarState.action}
              sx={{ width: '100%' }}
            >
              {snackbarState.message || 'Done'}
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
                    <Box component="div" sx={{ textDecoration: 'none' }}>
                      <SurroundingFrameThumbnail
                        frameData={surroundingFrame}
                        index={index}
                        activeFrame={frame}
                        cid={cid}
                        season={season}
                        episode={episode}
                        searchTerm={resolvedSearchTermValue}
                        onNavigate={() => {
                          navigate(`/frame/${cid}/${season}/${episode}/${surroundingFrame.frame}${encodedSearchTerm ? `?searchTerm=${encodedSearchTerm}` : ''}`);
                        }}
                        onLoad={() => handleImageLoad(surroundingFrame.frame)}
                        onError={() => {
                          console.error(`Failed to load image for frame ${surroundingFrame.frame}`);
                          handleImageLoad(surroundingFrame.frame);
                        }}
                        isLoaded={Boolean(imagesLoaded[surroundingFrame.frame])}
                      />
                    </Box>
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
                component={RouterLink}
                to={episodeLink}
                sx={{
                  color: '#e5e7eb',
                  background: 'linear-gradient(45deg, #1f2937 30%, #374151 90%)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #253042 30%, #3f4856 90%)',
                    borderColor: 'rgba(255, 255, 255, 0.24)',
                  },
                }}
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

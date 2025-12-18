// V2EditorPage.js
/* eslint-disable no-unused-vars, func-names */

import { Fragment, forwardRef, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types';
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react'
import { styled } from '@mui/material/styles';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { TwitterPicker } from 'react-color';
import MuiAlert from '@mui/material/Alert';
import { Accordion, AccordionDetails, AccordionSummary, Button, ButtonGroup, Card, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Fab, Grid, IconButton, InputAdornment, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Popover, Radio, FormControlLabel, RadioGroup, Skeleton, Slider, Snackbar, Stack, Tab, Tabs, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Add, AddCircleOutline, AddPhotoAlternate, AutoFixHigh, AutoFixHighRounded, CheckCircleOutline, Close, ClosedCaption, ContentCopy, Edit, FormatColorFill, GpsFixed, GpsNotFixed, HighlightOffRounded, HistoryToggleOffRounded, IosShare, LocalPoliceRounded, Menu, Redo, Save, Send, Share, Undo, ZoomIn, ZoomOut } from '@mui/icons-material';
import { API, Storage, graphqlOperation } from 'aws-amplify';
import { Box } from '@mui/system';
import { Helmet } from 'react-helmet-async';
import { getRateLimit, getWebsiteSetting } from '../graphql/queries';
import TextEditorControls from '../components/TextEditorControls';
import { SnackbarContext } from '../SnackbarContext';
import { UserContext } from '../UserContext';
import { MagicPopupContext } from '../MagicPopupContext';
import useSearchDetails from '../hooks/useSearchDetails';
import getFrame from '../utils/frameHandler';
import LoadingBackdrop from '../components/LoadingBackdrop';
import ImageEditorControls from '../components/ImageEditorControls';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import EditorPageBottomBannerAd from '../ads/EditorPageBottomBannerAd';
import { trackUsageEvent } from '../utils/trackUsageEvent';
import { useTrackImageSaveIntent } from '../hooks/useTrackImageSaveIntent';
import {
  createProject,
  resolveTemplateSnapshot,
  upsertProject,
} from '../components/collage/utils/templates';
import AddToCollageChooser from '../components/collage/AddToCollageChooser';
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
import { saveImageToLibrary } from '../utils/library/saveImageToLibrary';
import { get as getFromLibrary } from '../utils/library/storage';

import { fetchFrameInfo, fetchFramesFineTuning, fetchFramesSurroundingPromises } from '../utils/frameHandlerV2';
import getV2Metadata from '../utils/getV2Metadata';
import HomePageBannerAd from '../ads/HomePageBannerAd';

import { calculateEditorSize, getContrastColor, deleteLayer, moveLayerUp } from '../utils/editorFunctions';
import FixedMobileBannerAd from '../ads/FixedMobileBannerAd';
import { shouldShowAds } from '../utils/adsenseLoader';
import { isAdPauseActive } from '../utils/adsenseLoader';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const Alert = forwardRef((props, ref) => <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />);

// Minimal magic result query to avoid unauthorized user field.
const getMagicResultLite = /* GraphQL */ `
  query GetMagicResultLite($id: ID!) {
    getMagicResult(id: $id) {
      id
      prompt
      results
      error
      createdAt
      updatedAt
      __typename
    }
  }
`;

const ParentContainer = styled('div')`
    height: 100%;
`;

const ColorPickerPopover = styled('div')({
})

const oImgBuild = path =>
  new Promise(resolve => {
    fabric.Image.fromURL(`https://memesrc.com${path}`, (oImg) => {
      resolve(oImg);
    }, { crossOrigin: "anonymous" });
  });

const loadImg = (paths, func) => Promise.all(paths.map(func));

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;
`;

const StyledLayerControlCard = styled(Card)`
  width: 280px;
  border: 3px solid transparent;
  box-sizing: border-box;
  padding: 10px 15px;
`;

const StyledCardMedia = styled('img')`
  width: 100%;
  height: auto;
  background-color: black;
`;

const MAGIC_IMAGE_SIZE = 1024;
const MAGIC_RESUME_STORAGE_KEY = 'v2-editor-magic-resume';
const MAGIC_RESUME_MAX_AGE_MS = 10 * 60 * 1000;
const MAGIC_MAX_REFERENCES = 4;
const DEFAULT_RATE_LIMIT = 100;

const toNumber = (value, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getUtcDayId = () => new Date().toISOString().slice(0, 10);


const EditorSurroundingFrameThumbnail = ({
  baseMeta,
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
  isLoaded = true,
}) => {
  const intentMeta = useMemo(() => {
    const meta = {
      ...baseMeta,
      intentTarget: 'SurroundingFrameThumbnail',
      position: index,
    };

    const resolvedCid = frameData?.cid || cid;
    if (resolvedCid) {
      meta.cid = resolvedCid;
    }

    if (frameData?.season || season) {
      meta.season = frameData?.season || season;
    }

    if (frameData?.episode || episode) {
      meta.episode = frameData?.episode || episode;
    }

    if (frameData?.frame) {
      meta.frame = frameData.frame;
    }

    if (typeof searchTerm === 'string' && searchTerm.length > 0) {
      meta.searchTerm = searchTerm;
    }

    return meta;
  }, [baseMeta, cid, season, episode, frameData, index, searchTerm]);

  const intentHandlers = useTrackImageSaveIntent(intentMeta);
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
        sx={{
          display: isLoaded ? 'block' : 'none',
        }}
        {...intentHandlers}
      />
      {!isLoaded && (
        <Skeleton variant='rounded' sx={{ width: '100%', height: 0, paddingTop: '56.25%' }} />
      )}
    </StyledCard>
  );
};

const MagicResultOption = ({
  baseMeta,
  image,
  index,
  columns,
  isSelected,
  isDimmed,
  onSelect,
  aspectRatio,
}) => {
  const intentMeta = useMemo(
    () => ({
      ...baseMeta,
      intentTarget: 'MagicResultOption',
      position: index,
      magicResultSelected: Boolean(isSelected),
      magicResultHasImage: Boolean(image),
    }),
    [baseMeta, image, index, isSelected]
  );

  const intentHandlers = useTrackImageSaveIntent(intentMeta);

  return (
    <Grid
      item
      xs={columns === 2 ? 6 : 12}
      onClick={onSelect}
      style={{ padding: '5px' }}
    >
      <div
        style={{
          position: 'relative',
          border: isSelected ? '2px solid green' : '2px solid lightgray',
          borderRadius: '4px',
        }}
      >
        <img
          src={image}
          alt="placeholder"
          draggable
          {...intentHandlers}
          style={{
            width: '100%',
            aspectRatio: `${aspectRatio}/1`,
            objectFit: 'cover',
            objectPosition: 'center',
            filter: isDimmed ? 'brightness(50%)' : 'none',
          }}
        />
        {isSelected && (
          <Fab
            size='small'
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: 'green',
              color: 'white',
            }}
          >
            <CheckCircleOutline />
          </Fab>
        )}
      </div>
    </Grid>
  );
};



const EditorPage = ({ shows }) => {
  const searchDetails = useSearchDetails();
  const [hasFabricPaths, setHasFabricPaths] = useState(false);
  const [openNavWithoutSavingDialog, setOpenNavWithoutSavingDialog] = useState(false);
  const [selectedNavItemFid, setSelectedNavItemFid] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('searchTerm');
  const encodedSearchQuery = useMemo(
    () => (searchQuery ? encodeURIComponent(searchQuery) : ''),
    [searchQuery],
  );

  // Get everything ready
  const { fid, editorProjectId, fineTuningIndex, searchTerms } = useParams();
  const { user, setUser, forceTokenRefresh } = useContext(UserContext);
  const [defaultFrame, setDefaultFrame] = useState(null);
  const [pickingColor, setPickingColor] = useState(false);
  const [imageScale, setImageScale] = useState();
  const [generatedImageFilename, setGeneratedImageFilename] = useState();
  const [canvasSize, setCanvasSize] = useState({
    // width: 500,
    // height: 500
  });
  const [fineTuningFrames, setFineTuningFrames] = useState([]);
  const [canvasObjects, setCanvasObjects] = useState();
  const [surroundingFrames, setSurroundingFrames] = useState([]);
  const [surroundingFramesLoaded, setSurroundingFramesLoaded] = useState({});
  const [selectedFid, setSelectedFid] = useState(fid);
  const [defaultSubtitle, setDefaultSubtitle] = useState(null);
  const [colorPickerShowing, setColorPickerShowing] = useState(false);
  const [colorPickerAnchorEl, setColorPickerAnchorEl] = useState(null);
  const [colorPickerColor, setColorPickerColor] = useState({
    r: '0',
    g: '0',
    b: '0',
    a: '100'
  });
  const [fontSizePickerShowing, setFontSizePickerShowing] = useState(false);
  const [fontSizePickerAnchor, setFontSizePickerAnchor] = useState(null);
  const [selectedFontSize, setSelectedFontSize] = useState(100);

  const [currentColorType, setCurrentColorType] = useState('text');
  const [layerRawText, setLayerRawText] = useState({});
  const [layerActiveFormats, setLayerActiveFormats] = useState({});

  const [editorAspectRatio, setEditorAspectRatio] = useState(1);

  const [loading, setLoading] = useState(true)

  const [fineTuningValue, setFineTuningValue] = useState(searchDetails.fineTuningFrame || 4);
  const [openDialog, setOpenDialog] = useState(false);
  const [imageUploading, setImageUploading] = useState();
  const [imageBlob, setImageBlob] = useState();
  const [shareImageFile, setShareImageFile] = useState();
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [librarySaveSuccess, setLibrarySaveSuccess] = useState(false);
  const [librarySavePromptOpen, setLibrarySavePromptOpen] = useState(false);
  const [librarySaveStep, setLibrarySaveStep] = useState('choice');
  const [libraryCaptionSelectionIndex, setLibraryCaptionSelectionIndex] = useState(null);
  const [addingToCollage, setAddingToCollage] = useState(false);
  const [collagePromptOpen, setCollagePromptOpen] = useState(false);
  const [collageCaptionSelectionIndex, setCollageCaptionSelectionIndex] = useState(null);
  const [collageChooserOpen, setCollageChooserOpen] = useState(false);
  const [pendingCollagePayload, setPendingCollagePayload] = useState(null);
  const [collagePreview, setCollagePreview] = useState(null);
  const [collageReplaceDialogOpen, setCollageReplaceDialogOpen] = useState(false);
  const [collageReplaceSelection, setCollageReplaceSelection] = useState(null);
  const [collageReplaceOptions, setCollageReplaceOptions] = useState([]);
  const [collageReplaceContext, setCollageReplaceContext] = useState(null);
  const [snackbarOpen, setSnackBarOpen] = useState(false);
  const theme = useTheme();
  // const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [loadedSeriesTitle, setLoadedSeriesTitle] = useState('_universal');
  // const [drawingMode, setDrawingMode] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('')
  const [magicReferences, setMagicReferences] = useState([])
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadingInpaintingResult, setLoadingInpaintingResult] = useState(false);
  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);
  const [editorTool, setEditorTool] = useState('captions');
  const [brushToolSize, setBrushToolSize] = useState(50);
  const [showBrushSize, setShowBrushSize] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [editorStates, setEditorStates] = useState([]);
  const [canvasSizes, setCanvasSizes] = useState([]);
  const [futureStates, setFutureStates] = useState([]);
  const [futureCanvasSizes, setFutureCanvasSizes] = useState([]);
  const [bgEditorStates, setBgEditorStates] = useState([]);
  const [bgFutureStates, setBgFutureStates] = useState([]);
  const [loadingFineTuningFrames, setLoadingFineTuningFrames] = useState(true);
  // const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);

  const [variationDisplayColumns, setVariationDisplayColumns] = useState(1);

  const isProUser = user?.userDetails?.subscriptionStatus === 'active';

  // const [earlyAccessComplete, setEarlyAccessComplete] = useState(false);
  // const [earlyAccessDisabled, setEarlyAccessDisabled] = useState(false);
  // const [loadingSubscriptionUrl, setLoadingSubscriptionUrl] = useState(false);

  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  const [promptEnabled, setPromptEnabled] = useState('edit');
  const [showLegacyTools, setShowLegacyTools] = useState(false);
  // const buttonRef = useRef(null);
  const { setMagicToolsPopoverAnchorEl } = useContext(MagicPopupContext)
  const { openSubscriptionDialog } = useSubscribeDialog();

  // Image selection stuff
  const [selectedImage, setSelectedImage] = useState(null);
  const [openSelectResult, setOpenSelectResult] = useState(false);
  // const images = Array(5).fill("https://placekitten.com/350/350");
  // const isMd = useMediaQuery((theme) => theme.breakpoints.up('md'));
  const [returnedImages, setReturnedImages] = useState([]);

  const magicToolsButtonRef = useRef();
  const magicPromptInputRef = useRef();
  const magicReferenceInputRef = useRef();
  const textFieldRefs = useRef({});
  const selectionCacheRef = useRef({});
  const pendingMagicResumeRef = useRef(null);
  const skipNextDefaultFrameRef = useRef(false);
  const skipNextDefaultSubtitleRef = useRef(false);

  // Animated placeholder for magic prompt
  const magicExamples = useMemo(
    () => [
      'Remove the text…',
      'Add a tophat…',
      'Make him laugh…',
      'Add an angry cat…',
      'Change background to sunset…',
    ],
    []
  );
  const [magicExampleIndex, setMagicExampleIndex] = useState(0);
  const [magicPlaceholder, setMagicPlaceholder] = useState('');
  const [magicTypingPhase, setMagicTypingPhase] = useState('typing');
  const [magicCharIndex, setMagicCharIndex] = useState(0);
  const [magicPromptFocused, setMagicPromptFocused] = useState(false);
  const [rateLimitState, setRateLimitState] = useState({
    nanoUsage: 0,
    nanoLimit: DEFAULT_RATE_LIMIT,
    nanoAvailable: true,
    openaiUsage: 0,
    openaiLimit: DEFAULT_RATE_LIMIT,
    openaiAvailable: true,
    loading: true,
  });
  const [rateLimitDialogOpen, setRateLimitDialogOpen] = useState(false);

  const SELECTION_CACHE_TTL_MS = 15000;

  // Animated placeholder effect for magic prompt
  useEffect(() => {
    let timeout;
    // If user is typing, keep placeholder empty
    if ((magicPrompt && magicPrompt.length > 0) || loadingInpaintingResult || magicPromptFocused) {
      setMagicPlaceholder('');
      return () => {
        if (timeout) window.clearTimeout(timeout);
      };
    }
    const full = magicExamples[magicExampleIndex] || '';
    if (magicTypingPhase === 'typing') {
      if (magicCharIndex < full.length) {
        timeout = window.setTimeout(() => {
          setMagicCharIndex((c) => c + 1);
          setMagicPlaceholder(full.slice(0, magicCharIndex + 1));
        }, 60);
      } else {
        setMagicTypingPhase('pausing');
      }
    } else if (magicTypingPhase === 'pausing') {
      timeout = window.setTimeout(() => setMagicTypingPhase('deleting'), 1000);
    } else if (magicTypingPhase === 'deleting') {
      if (magicCharIndex > 0) {
        timeout = window.setTimeout(() => {
          setMagicCharIndex((c) => c - 1);
          setMagicPlaceholder(full.slice(0, Math.max(0, magicCharIndex - 1)));
        }, 35);
      } else {
        setMagicTypingPhase('typing');
        setMagicExampleIndex((i) => (i + 1) % magicExamples.length);
      }
    }
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [magicPrompt, loadingInpaintingResult, magicPromptFocused, magicExamples, magicExampleIndex, magicTypingPhase, magicCharIndex]);

  const refreshRateLimits = useCallback(async () => {
    const dayId = getUtcDayId();
    try {
      const settingsResp = await API.graphql(graphqlOperation(getWebsiteSetting, { id: 'globalSettings' }));
      let rateResp = null;
      try {
        rateResp = await API.graphql(graphqlOperation(getRateLimit, { id: dayId }));
      } catch (_) {
        rateResp = null;
      }
      const settings = settingsResp?.data?.getWebsiteSetting || {};
      const nanoLimit = toNumber(settings?.nanoBananaRateLimit, DEFAULT_RATE_LIMIT);
      const openaiLimit = toNumber(settings?.openAIRateLimit, DEFAULT_RATE_LIMIT);
      const rateItem = rateResp?.data?.getRateLimit;
      const nanoUsage = toNumber(rateItem?.geminiUsage, 0);
      const openaiUsage = toNumber(rateItem?.openaiUsage, 0);
      setRateLimitState({
        nanoUsage,
        nanoLimit,
        nanoAvailable: nanoUsage < nanoLimit,
        openaiUsage,
        openaiLimit,
        openaiAvailable: openaiUsage < openaiLimit,
        loading: false,
      });
    } catch (err) {
      console.warn('[V2Editor] Failed to load rate limits', err);
      setRateLimitState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshRateLimits();
  }, [refreshRateLimits]);

  const navigate = useNavigate();
  const location = useLocation();
  const fromCollage = Boolean(location.state?.collageState);
  const uploadedImageSource = location.state?.uploadedImage || null;

  const readMagicResumeSnapshot = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(MAGIC_RESUME_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const isForPath = parsed?.path === `${location.pathname}${location.search}`;
      const isFresh = !parsed?.timestamp || (Math.abs(Date.now() - parsed.timestamp) <= MAGIC_RESUME_MAX_AGE_MS);
      if (!isForPath || !isFresh) {
        sessionStorage.removeItem(MAGIC_RESUME_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (err) {
      console.error('Failed to read magic resume snapshot', err);
      try { sessionStorage.removeItem(MAGIC_RESUME_STORAGE_KEY); } catch (_) {}
      return null;
    }
  }, [location.pathname, location.search]);

  const persistMagicResumeSnapshot = useCallback((snapshot) => {
    try {
      sessionStorage.setItem(MAGIC_RESUME_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.error('Failed to store magic resume snapshot', err);
    }
  }, []);

  const clearMagicResumeSnapshot = useCallback(() => {
    try { sessionStorage.removeItem(MAGIC_RESUME_STORAGE_KEY); } catch (_) {}
  }, []);

  const handleSubtitlesExpand = () => {
    setSubtitlesExpanded(!subtitlesExpanded);
  };

  const handleSnackbarOpen = () => {
    setSnackBarOpen(true);
  }

  const handleSnackbarClose = () => {
    setSnackBarOpen(false);
  }

  const handleSurroundingFrameLoad = useCallback((index) => {
    setSurroundingFramesLoaded((prev) => ({
      ...prev,
      [index]: true,
    }));
  }, []);

  const handleSurroundingFrameError = useCallback((index) => {
    setSurroundingFramesLoaded((prev) => ({
      ...prev,
      [index]: false,
    }));
  }, []);

  useEffect(() => {
    setFineTuningValue(searchDetails.fineTuningFrame);
  }, [searchDetails])

  const { selectedObjects, editor, onReady } = useFabricJSEditor()

  const StyledTwitterPicker = styled(TwitterPicker)`
    span div {
        border: 1px solid rgb(240, 240, 240);
    }`;

  const TwitterPickerWrapper = memo(StyledTwitterPicker);

  useEffect(() => {
    const storedResume = readMagicResumeSnapshot();
    if (storedResume) {
      pendingMagicResumeRef.current = storedResume;
    }
  }, [readMagicResumeSnapshot]);

  useEffect(() => {
    const navState = location.state;
    if (!navState || !navState.magicResult) {
      return;
    }

    const { magicResult, magicContext } = navState;
    const cleanState = { ...navState };
    delete cleanState.magicResult;
    delete cleanState.magicContext;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: cleanState });

    const storedResume = readMagicResumeSnapshot();
    const resumeKey = magicContext?.resumeKey;
    if (storedResume && resumeKey && storedResume.key && storedResume.key !== resumeKey) {
      console.warn('Magic resume key mismatch; continuing with stored snapshot.');
    }

    pendingMagicResumeRef.current = { ...(storedResume || {}), magicResult, magicContext };
  }, [location.pathname, location.search, location.state, navigate, readMagicResumeSnapshot]);

  const saveCollageImage = () => {
    const resultImage = editor.canvas.toDataURL({
      format: 'jpeg',
      quality: 1,
      multiplier: imageScale || 1
    });

          fetch(resultImage)
        .then(res => res.blob())
        .then(blob => {
          if (!location.state || !location.state.collageState) {
            console.error('Collage state is missing');
            return;
          }

                  const { collageState } = location.state;

          if (!Array.isArray(collageState.images) || typeof collageState.editingImageIndex !== 'number') {
          console.error('Invalid collage state structure');
          return;
        }

        const updatedImages = [...collageState.images];
        updatedImages[collageState.editingImageIndex] = {
          ...updatedImages[collageState.editingImageIndex],
          src: URL.createObjectURL(blob),
          width: editor.canvas.width,
          height: editor.canvas.height,
        };

        const updatedCollageState = {
          ...collageState,
          images: updatedImages,
          editingImageIndex: null,
        };

        navigate('/collage', { state: { updatedCollageState } });
      })
      .catch(error => {
        console.error('Error in saveCollageImage:', error);
      });
  };

  const handleClickDialogOpen = () => {
    const eventPayload = {
      source: 'V2EditorPage',
      fromCollage: Boolean(location.state?.collageState),
    };

    if (confirmedCid) {
      eventPayload.cid = confirmedCid;
    }

    if (season) {
      eventPayload.season = season;
    }

    if (episode) {
      eventPayload.episode = episode;
    }

    if (frame) {
      eventPayload.frame = frame;
    }

    if (typeof fineTuningIndex !== 'undefined') {
      eventPayload.fineTuningIndex = fineTuningIndex;
    }

    if (editorProjectId) {
      eventPayload.editorProjectId = editorProjectId;
    }

    if (location.state?.uploadedImage) {
      eventPayload.hasUploadedImage = true;
    }

    const trimmedSearchTerm = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    if (trimmedSearchTerm) {
      eventPayload.searchTerm = trimmedSearchTerm;
    }

    trackUsageEvent('advanced_editor_save', eventPayload);

    setLibrarySaveSuccess(false);
    setSavingToLibrary(false);
    setLibrarySavePromptOpen(false);
    setLibrarySaveStep('choice');
    setLibraryCaptionSelectionIndex(null);
    setCollagePromptOpen(false);
    setCollageCaptionSelectionIndex(null);
    setAddingToCollage(false);

    if (location.state?.collageState) {
      saveCollageImage();
    } else {
      setOpenDialog(true);
      saveImage();
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSavingToLibrary(false);
    setLibrarySaveSuccess(false);
    setLibrarySavePromptOpen(false);
    setLibrarySaveStep('choice');
    setLibraryCaptionSelectionIndex(null);
    setCollagePromptOpen(false);
    setCollageCaptionSelectionIndex(null);
    setAddingToCollage(false);
  };

  const handleAlignment = (index, alignment) => {
    const textObject = editor.canvas.item(index);
    textObject.set({ textAlign: alignment });
    editor?.canvas.renderAll();
    addToHistory();
  };

  // Canvas resizing
  const resizeCanvas = useCallback((width, height) => {
    if (editor) {
      editor.canvas.preserveObjectStacking = true;
      editor?.canvas.setWidth(width);
      editor?.canvas.setHeight(height);
      editor?.canvas.setBackgroundColor("white");
    }
  }, [editor])

  // Update the editor size
  const updateEditorSize = useCallback(() => {
    const [desiredHeight, desiredWidth] = calculateEditorSize(editorAspectRatio);
    // Calculate scale factor
    const scaleFactorX = desiredWidth / canvasSize.width;
    const scaleFactorY = desiredHeight / canvasSize.height;
    const scaleFactor = Math.min(scaleFactorX, scaleFactorY)
    // Scale the canvas
    editor?.canvas.setZoom(scaleFactor);
    // Resize the canvas
    resizeCanvas(desiredWidth, desiredHeight);
    setCanvasObjects([...editor?.canvas._objects])
    editor?.canvas.renderAll();
  }, [editor, canvasSize, editorAspectRatio, resizeCanvas]);

  // useEffect(() => {
  //     navigate(`/editor/${selectedFid}`)
  // }, [selectedFid, navigate])

  // Warm up the UUID function for faster save dialog response
  useEffect(() => {
    const idleId = 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => {
          API.get('publicapi', '/uuid', { queryStringParameters: { warmup: true } })
        })
      : setTimeout(() => {
          API.get('publicapi', '/uuid', { queryStringParameters: { warmup: true } })
        }, 1000)

    return () => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      } else {
        clearTimeout(idleId)
      }
    }
  }, [])

  useEffect(() => {
    setSelectedFid(fid)
  }, [location, fid, editor])

  useEffect(() => {
    if (imageLoaded) {
      window.addEventListener('resize', updateEditorSize)
    }
    return () => {
      window.removeEventListener('resize', updateEditorSize)
    }
  }, [updateEditorSize, imageLoaded])

  const addText = useCallback((updatedText, append) => {
    const text = new fabric.Textbox(updatedText, {
      left: editor?.canvas.getWidth() * 0.05,
      top: editor?.canvas.getHeight() * (append ? 0.5 : 0.95),
      originY: 'bottom',
      width: editor?.canvas.getWidth() * 0.9,
      fontSize: editor?.canvas.getWidth() * 0.04,
      fontFamily: 'sans-serif',
      fontWeight: 400,
      fill: 'white',
      stroke: 'black',
      strokeLineJoin: 'round',
      strokeWidth: editor?.canvas.getWidth() * 0.0040,
      strokeUniform: false,
      textAlign: 'center',
      selectable: true,
      paintFirst: 'stroke'
    });

    if (editor) {
      if (append) {
        editor.canvas.add(text);
        editor.canvas.setActiveObject(text); // Set the text as the active object
        setCanvasObjects([...editor.canvas._objects]);
      } else {
        editor.canvas._objects = [];
        editor.canvas.add(text);
        editor.canvas.setActiveObject(text); // Set the text as the active object
        setCanvasObjects([...editor.canvas._objects]);
      }
      addToHistory();
    }
    setLayerRawText((prev) => {
      if (append) {
        const newIndex = editor?.canvas?._objects?.length ? editor.canvas._objects.length - 1 : 0;
        return { ...prev, [newIndex]: updatedText };
      }
      return { 0: updatedText };
    });
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps


  // Function to handle image uploads and add them to the canvas
  const addImageLayer = (imageFile) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const imgObj = new Image();
      imgObj.src = event.target.result;
      imgObj.onload = function () {
        const image = new fabric.Image(imgObj);

        // Calculate the scale to fit the image within the canvas, maintaining the aspect ratio
        const canvasWidth = editor.canvas.getWidth();
        const canvasHeight = editor.canvas.getHeight();
        const paddingFactor = 0.9;
        const scale = Math.min(canvasWidth / imgObj.width, canvasHeight / imgObj.height) * paddingFactor;

        // Set the image properties, including the scale
        image.set({
          angle: 0,
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: canvasWidth / 2,
          top: canvasHeight / 2
        });

        // Add the image to the canvas and set it as the active object
        editor.canvas.add(image);
        editor.canvas.setActiveObject(image);

        // Update the image object and canvas state
        image.setCoords();
        editor.canvas.renderAll();

        // Create a new canvas object for the image
        const imageObject = {
          type: 'image',
          src: event.target.result,
          scale,
          angle: 0,
          left: canvasWidth / 2,
          top: canvasHeight / 2
        };

        // Update the canvasObjects state with the new image object
        setCanvasObjects(prevObjects => [...prevObjects, imageObject]);
        addToHistory();
      };
    };
    reader.readAsDataURL(imageFile);
  };

  const fileInputRef = useRef(null); // Define the ref
  const lastTrackedAdvancedViewRef = useRef('');

  const handleDeleteLayer = (index) => {
    deleteLayer(editor.canvas, index, setLayerFonts, setCanvasObjects);
    const remappedRefs = {};
    Object.entries(textFieldRefs.current).forEach(([key, ref]) => {
      const refIndex = Number(key);
      if (Number.isNaN(refIndex)) return;
      if (refIndex < index) {
        remappedRefs[refIndex] = ref;
      } else if (refIndex > index) {
        remappedRefs[refIndex - 1] = ref;
      }
    });
    textFieldRefs.current = remappedRefs;
    const remappedSelectionCache = {};
    Object.entries(selectionCacheRef.current).forEach(([key, cache]) => {
      const refIndex = Number(key);
      if (Number.isNaN(refIndex)) return;
      if (refIndex < index) {
        remappedSelectionCache[refIndex] = cache;
      } else if (refIndex > index) {
        remappedSelectionCache[refIndex - 1] = cache;
      }
    });
    selectionCacheRef.current = remappedSelectionCache;
    setLayerRawText((prev) => {
      const updated = {};
      Object.entries(prev || {}).forEach(([key, value]) => {
        const refIndex = Number(key);
        if (Number.isNaN(refIndex)) return;
        if (refIndex < index) {
          updated[refIndex] = value;
        } else if (refIndex > index) {
          updated[refIndex - 1] = value;
        }
      });
      return updated;
    });
    setLayerActiveFormats((prev) => {
      const updated = {};
      Object.entries(prev || {}).forEach(([key, value]) => {
        const refIndex = Number(key);
        if (Number.isNaN(refIndex)) return;
        if (refIndex < index) {
          updated[refIndex] = value;
        } else if (refIndex > index) {
          updated[refIndex - 1] = value;
        }
      });
      return updated;
    });
    addToHistory();
  };

  const loadEditorDefaults = useCallback(async () => {
    setLoading(true);
    // Check if the uploadedImage exists in the location state
    const uploadedImage = location.state?.uploadedImage;
    const fromCollage = location.state?.fromCollage;

    if (uploadedImage) {
      fabric.Image.fromURL(uploadedImage, (oImg) => {
        setDefaultFrame(oImg);

        // Set the canvas size based on the image aspect ratio
        const imageAspectRatio = oImg.width / oImg.height;
        setEditorAspectRatio(imageAspectRatio);
        const [desiredHeight, desiredWidth] = calculateEditorSize(imageAspectRatio);
        setCanvasSize({ height: desiredHeight, width: desiredWidth });

        // Scale the image to fit the canvas
        oImg.scale(desiredWidth / oImg.width);

        // Center the image within the canvas
        oImg.set({ left: 0, top: 0 });
        const minWidth = 750;
        const x = (oImg.width > minWidth) ? oImg.width : minWidth;
        setImageScale(x / desiredWidth);
        resizeCanvas(desiredWidth, desiredHeight);

        editor?.canvas.setBackgroundImage(oImg);
        setImageLoaded(true);

        // Rendering the canvas after applying all changes
        editor?.canvas?.renderAll?.();
        setLoading(false);

        // If it's from the collage page, set some default states
        if (fromCollage) {
          setLoadedSeriesTitle("");
          setSurroundingFrames([]);
          setDefaultSubtitle(false);
        }
      }, { crossOrigin: 'anonymous' });
    } else if (editorProjectId) {
      try {
        // Generate the file name/path based on the editorProjectId
        const fileName = `projects/${editorProjectId}.json`;
  
        // Fetch the serialized canvas state from S3 under the user's protected folder
        const serializedCanvas = await Storage.get(fileName, { level: 'protected' });
  
        if (serializedCanvas) {
          // Fetch the actual content from S3. 
          // Storage.get provides a pre-signed URL, so we need to fetch the actual content.
          const response = await fetch(serializedCanvas);
          const canvasStateJSON = await response.json();
  
          editor?.canvas.loadFromJSON(canvasStateJSON, () => {
            const oImg = editor.canvas.backgroundImage;
            const imageAspectRatio = oImg.width / oImg.height;
            setEditorAspectRatio(imageAspectRatio);
            const [desiredHeight, desiredWidth] = calculateEditorSize(imageAspectRatio);
            setCanvasSize({ height: desiredHeight, width: desiredWidth });
  
            // Scale the image to fit the canvas
            const scale = desiredWidth / oImg.width;
            oImg.scale(desiredWidth / oImg.width);
            editor.canvas.forEachObject(obj => {
              obj.left *= scale;
              obj.top *= scale;
              obj.scaleY *= scale;
              obj.scaleX *= scale;
            });
  
            // Center the image within the canvas
            oImg.set({ left: 0, top: 0 });
            const minWidth = 750;
            const x = (oImg.width > minWidth) ? oImg.width : minWidth;
            setImageScale(x / desiredWidth);
            resizeCanvas(desiredWidth, desiredHeight);
  
            editor?.canvas.setBackgroundImage(oImg);
            if (defaultSubtitle) {
              addText(defaultSubtitle);
            }
            setImageLoaded(true);
  
            // Rendering the canvas after applying all changes
            editor.canvas.renderAll();
          });
        } else {
          console.error('No saved editor state found for the project in S3.');
        }
      } catch (error) {
        console.error('Failed to load editor state from S3:', error);
      }
    } else {
      getFrame(selectedFid)
        .then((data) => {
          setLoadedSeriesTitle(data.series_name);
          // loadSurroundingFrames();
          // setSurroundingFrames(data.frames_surrounding);
          // Pre load fine tuning frames
          loadImg(data.frames_fine_tuning, oImgBuild).then((images) => {
            setFineTuningFrames(images);
          });
          // Background image from the given URL
          fabric.Image.fromURL(
            `https://memesrc.com${(typeof searchDetails.fineTuningFrame === 'number') ? data.frames_fine_tuning[searchDetails.fineTuningFrame] : data.frame_image}`,
            (oImg) => {
              setDefaultFrame(oImg);
              setDefaultSubtitle(data.subtitle);
              setLoading(false);
            },
            { crossOrigin: 'anonymous' }
          );
        })
        .catch((err) => {
          console.error('Error loading frame data:', err);
        });
    }
  }, [resizeCanvas, selectedFid, editor, addText, location, searchDetails]); // eslint-disable-line react-hooks/exhaustive-deps

  // Look up data for the fid and set defaults
  useEffect(() => {
    // if (editor) { editor.canvas._objects = [] }
    loadEditorDefaults();
    // TODO: BUG - it appears our setup for loading the editor requires it to run twice. Look into fixing this.
  }, [selectedFid]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editor) {
      updateEditorSize();
    }
  }, [canvasSize])

  useEffect(() => {
    if (defaultFrame) {
      if (skipNextDefaultFrameRef.current) {
        skipNextDefaultFrameRef.current = false;
        return;
      }

      const oImg = defaultFrame
      const imageAspectRatio = oImg.width / oImg.height;
      setEditorAspectRatio(imageAspectRatio);
      const [desiredHeight, desiredWidth] = calculateEditorSize(imageAspectRatio);
      setCanvasSize({ height: desiredHeight, width: desiredWidth })  // TODO: rename this to something like "desiredSize"
      // Scale the image to fit the canvas
      oImg.scale(desiredWidth / oImg.width);
      // Center the image within the canvas
      oImg.set({ left: 0, top: 0 });
      const minWidth = 750;
      const x = (oImg.width > minWidth) ? oImg.width : minWidth;
      setImageScale(x / desiredWidth);
      resizeCanvas(desiredWidth, desiredHeight)
      editor?.canvas.setBackgroundImage(oImg);
      // if (defaultSubtitle) {
      // addText(defaultSubtitle || '')
      // }
      setImageLoaded(true)
    }
  }, [defaultFrame])

  useEffect(() => {
    if (defaultSubtitle) {
      if (skipNextDefaultSubtitleRef.current) {
        skipNextDefaultSubtitleRef.current = false;
        return;
      }
      addText(defaultSubtitle || '')
    }
  }, [defaultSubtitle]);

  const saveImage = () => {
    setImageUploading(true);
    const resultImage = editor.canvas.toDataURL({
      format: 'jpeg',
      quality: 0.6,
      multiplier: imageScale
    });

    fetch(resultImage)
      .then(res => res.blob())
      .then(blob => {
        setImageBlob(blob);

        API.get('publicapi', '/uuid').then(uuid => {
          const filename = `${uuid}.jpg`;
          setGeneratedImageFilename(filename);

          // Save public version of the image
          Storage.put(`${uuid}.jpg`, blob, {
            resumable: true,
            contentType: "image/jpeg",
            completeCallback: (event) => {
              Storage.get(event.key).then(() => {
                const file = new File([blob], filename, { type: 'image/jpeg' });
                setShareImageFile(file);
                setImageUploading(false);
              });
            },
            progressCallback: (progress) => {
              // Upload progress
            },
            errorCallback: (err) => {
              console.error('Upload error:', err);
            }
          });

        }).catch(err => console.log(`UUID Gen Fetch Error: ${err}`));
      });
  }

  const showColorPicker = (colorType, index, event) => {
    setPickingColor(index);
    setColorPickerShowing(index);
    setCurrentColorType(colorType);
    setColorPickerAnchorEl(event.currentTarget);
  }

  const showFontSizePicker = (event, index) => {
    const defaultFontSize = editor.canvas.getWidth() * 0.04;
    const currentFontSize = Math.round(100 * editor.canvas.item(index).fontSize / defaultFontSize);
    setSelectedFontSize(currentFontSize);
    setFontSizePickerShowing(index);
    setFontSizePickerAnchor(event.target);
  }

  const changeColor = (color, index) => {
    setColorPickerColor(color);
    const textObject = editor.canvas.item(index);
  
    if (currentColorType === 'text') {
        textObject.set({
            fill: color.hex,
        });
    } else if (currentColorType === 'stroke') {
        textObject.set({
            stroke: color.hex,
            strokeWidth: editor?.canvas.getWidth() * 0.0025,
            strokeUniform: false
        });
    }
  
    setCanvasObjects([...editor.canvas._objects]);
    editor?.canvas.renderAll();
    setColorPickerShowing(false);
    addToHistory();
  }

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

  const parseFormattedText = (rawText = '') => {
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

  const applyFormattedTextToCanvas = useCallback((index, rawValue) => {
    if (!editor?.canvas) return;
    const textObject = editor.canvas.item(index);
    if (!textObject) return;

    const { cleanText, ranges } = parseFormattedText(rawValue);

    textObject.set({ text: cleanText });
    textObject.styles = {};

    ranges.forEach(({ start, end, style }) => {
      const selectionStyle = {
        fontWeight: style.bold ? 'bold' : textObject.fontWeight || 'normal',
        fontStyle: style.italic ? 'italic' : textObject.fontStyle || 'normal',
        underline: style.underline === undefined ? Boolean(textObject.underline) : style.underline,
      };
      textObject.setSelectionStyles(selectionStyle, start, end);
    });

    textObject.initDimensions();
    textObject.setCoords();
    textObject.dirty = true;
    setCanvasObjects([...editor.canvas._objects]);
    editor?.canvas.renderAll();
  }, [editor]);

  const syncActiveFormatsFromSelection = useCallback((index, overrideSelection) => {
    const inputEl = textFieldRefs.current[index];
    const textObject = editor?.canvas?.item(index);
    if (!inputEl || !textObject) return;

    const rawValue = inputEl.value ?? layerRawText[index] ?? textObject.text ?? '';
    const { cleanText, ranges } = parseFormattedText(rawValue);

    if (cleanText.length === 0) {
      setLayerActiveFormats((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    const selectionStart = overrideSelection ? overrideSelection.start : inputEl.selectionStart ?? 0;
    const selectionEnd = overrideSelection ? overrideSelection.end : inputEl.selectionEnd ?? selectionStart;

    selectionCacheRef.current[index] = {
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
    setLayerActiveFormats((prev) => ({ ...prev, [index]: activeFormats }));
  }, [editor, layerRawText]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const activeEl = document.activeElement;
      if (!activeEl) return;
      const entries = Object.entries(textFieldRefs.current);
      const matched = entries.find(([, el]) => el === activeEl);
      if (!matched) return;

      const [matchedIndex, matchedEl] = matched;
      if (matchedEl.selectionStart == null || matchedEl.selectionEnd == null) {
        return;
      }

      selectionCacheRef.current[matchedIndex] = {
        start: matchedEl.selectionStart,
        end: matchedEl.selectionEnd,
        timestamp: Date.now(),
        hadFocus: true,
      };
      syncActiveFormatsFromSelection(Number(matchedIndex), {
        start: matchedEl.selectionStart,
        end: matchedEl.selectionEnd,
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [syncActiveFormatsFromSelection]);

  const applyInlineStyleToggle = useCallback((index, styleKey) => {
    const inputEl = textFieldRefs.current[index];
    const textObject = editor?.canvas?.item(index);
    if (!inputEl || !textObject) return false;

    const rawValue = inputEl.value ?? layerRawText[index] ?? textObject.text ?? '';
    const { cleanText, ranges } = parseFormattedText(rawValue);

    if (cleanText.length === 0) {
      return false;
    }

    const hadFocus = document.activeElement === inputEl;
    const cache = selectionCacheRef.current[index];
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

    setLayerRawText((prev) => ({ ...prev, [index]: nextValue }));
    applyFormattedTextToCanvas(index, nextValue);

    requestAnimationFrame(() => {
      if (hadFocus) {
        inputEl.focus();
        inputEl.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }
      selectionCacheRef.current[index] = {
        start: nextSelectionStart,
        end: nextSelectionEnd,
        timestamp: Date.now(),
        hadFocus: hadFocus || usedCachedSelection,
      };
      setLayerActiveFormats((prev) => ({ ...prev, [index]: activeFormats }));
    });

    return true;
  }, [applyFormattedTextToCanvas, editor, layerRawText]);

  const handleEdit = (event, index) => {
    const rawValue = event.target.value;
    setLayerRawText((prev) => ({ ...prev, [index]: rawValue }));
    applyFormattedTextToCanvas(index, rawValue);
    syncActiveFormatsFromSelection(index);
  };

  const handleFocus = (index) => {
    editor.canvas.setActiveObject(editor.canvas.item(index));
    editor?.canvas.renderAll();
    syncActiveFormatsFromSelection(index);
  }

  const handleFontSize = (event, index) => {
    const defaultFontSize = editor.canvas.getWidth() * 0.04;
    editor.canvas.item(index).fontSize = defaultFontSize * (event.target.value / 100);
    setCanvasObjects([...editor.canvas._objects])
    editor?.canvas.renderAll();
    syncActiveFormatsFromSelection(index);
  }

  const addToHistory = async () => {
    try {
      // Save the current state of the canvas for local undo/redo before any scaling or modifications
      const serializedCanvas = JSON.stringify(editor.canvas);
      const currentCanvasSize = {
        width: editor.canvas.width,
        height: editor.canvas.height
      };

      setFutureStates([]);
      setFutureCanvasSizes([]);

      setEditorStates(prevHistory => [...prevHistory, serializedCanvas]);
      setCanvasSizes(prevSizes => [...prevSizes, currentCanvasSize]);

    } catch (error) {
      console.error('Failed to update editor state or canvas image in S3:', error);
    }
  };

  const handleFineTuning = (value) => {
    // console.log(fineTuningFrames[value]);
    const oImg = fineTuningFrames[value];
    oImg.scaleToHeight(editor.canvas.getHeight());
    oImg.scaleToWidth(editor.canvas.getWidth());
    editor?.canvas?.setBackgroundImage(oImg);
    editor?.canvas.renderAll();
    const serializedCanvas = JSON.stringify(editor.canvas);
    setFutureStates([]);
    setBgFutureStates([]);
    searchDetails.setFineTuningFrame(value)
    setEditorStates(prevHistory => [...prevHistory, serializedCanvas]);
    setBgEditorStates(prevHistory => [...prevHistory, oImg]);
  }

  const handleStyle = (index, customStyles, clickedFormat) => {
    if (!editor?.canvas) {
      return false;
    }
    const styles = customStyles || [];
    if (clickedFormat) {
      const styleKeyMap = { bold: 'bold', italic: 'italic', underline: 'underline', underlined: 'underline' };
      const styleKey = styleKeyMap[clickedFormat];
      if (styleKey) {
        const handledWithInline = applyInlineStyleToggle(index, styleKey);
        if (handledWithInline) {
          return true;
        }
      }
    }
    // Select the item
    const item = editor.canvas.item(index);
    if (!item) {
      return false;
    }
    // Update the style
    item.set({
      fontWeight: styles.includes('bold') ? 'bold' : 'normal',
      fontStyle: styles.includes('italic') ? 'italic' : 'normal',
      underline: styles.includes('underline') || styles.includes('underlined')
    });
    // Update the canvas
    item.dirty = true;
    setCanvasObjects([...editor.canvas._objects]);
    editor?.canvas.renderAll();
    addToHistory();
    const inlineStyles = styles
      .filter((style) => ['bold', 'italic', 'underline', 'underlined'].includes(style))
      .map((style) => (style === 'underlined' ? 'underline' : style));
    setLayerActiveFormats((prev) => ({ ...prev, [index]: inlineStyles }));
    return false;
  }

  const handleFontChange = (index, font) => {
    // Select the item
    const item = editor.canvas.item(index);
    // Update the style
    item.fontFamily = font || 'Arial'
    // Update the canvas
    item.dirty = true;
    setCanvasObjects([...editor.canvas._objects]);
    editor?.canvas.renderAll();
    addToHistory();
  }

  // Function to move a layer down in the stack
  const moveLayerDown = (index) => {
    if (index >= editor.canvas._objects.length - 1) return; // Already at the bottom or invalid index

    const objectToMoveDown = editor.canvas.item(index);
    if (!objectToMoveDown) return; // Object not found

    // Move the object one step down in the canvas stack
    editor.canvas.moveTo(objectToMoveDown, index + 1);
    editor.canvas.renderAll();
    addToHistory();

    setCanvasObjects(prevCanvasObjects => {
      const newCanvasObjects = [...prevCanvasObjects];
      // Swap the positions of the index with the index below
      [newCanvasObjects[index], newCanvasObjects[index + 1]] = [newCanvasObjects[index + 1], newCanvasObjects[index]];
      return newCanvasObjects;
    });
  };

  // ------------------------------------------------------------------------

  const QUERY_INTERVAL = 1000; // Every second
  const TIMEOUT = 60 * 1000;   // 1 minute

  const spendMagicCredit = useCallback(async () => {
    try {
      const currentCredits = user?.userDetails?.credits ?? 0;
      const newCreditAmount = Math.max(0, currentCredits - 1);
      setUser({ ...user, userDetails: { ...user?.userDetails, credits: newCreditAmount } });
      await forceTokenRefresh();
    } catch (err) {
      console.error('Failed to refresh credits after magic edit:', err);
    }
  }, [forceTokenRefresh, setUser, user]);

  async function checkMagicResult(id) {
    try {
      const result = await API.graphql(graphqlOperation(getMagicResultLite, { id }));
      const rawError = result?.data?.getMagicResult?.error;
      let normalizedError = rawError;
      if (typeof rawError === 'string') {
        try {
          normalizedError = JSON.parse(rawError);
          if (typeof normalizedError === 'string') {
            normalizedError = JSON.parse(normalizedError);
          }
        } catch (_) {
          normalizedError = rawError;
        }
      }
      return {
        results: result?.data?.getMagicResult?.results,
        error: normalizedError,
      };
    } catch (error) {
      console.error('Error fetching magic result:', error);
      const fallbackMessage = error?.errors?.[0]?.message || error?.message || null;
      return { results: null, error: fallbackMessage ? { message: fallbackMessage, reason: 'fetch_error' } : null };
    }
  }

  const toggleDrawingMode = (tool) => {
    if (editor) {
      if (user && user?.userDetails?.credits > 0) {
        editor.canvas.isDrawingMode = (tool === 'magicEraser');
        editor.canvas.freeDrawingBrush.width = brushToolSize;
        editor.canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
        if (tool !== 'magicEraser') {
          editor.canvas.getObjects().forEach((obj) => {
            if (obj instanceof fabric.Path) {
              editor.canvas.remove(obj)
            }
          });
          setHasFabricPaths(false);
          addToHistory();
        }
      }
    }
    // setDrawingMode((tool === 'magicEraser'))
  }

  const buildBackgroundDataUrl = ({ forceSquare = true } = {}) => {
    if (!editor?.canvas?.backgroundImage) {
      throw new Error('No background image available for magic edits.');
    }

    const canvasWidth = editor.canvas.getWidth() || MAGIC_IMAGE_SIZE;
    const canvasHeight = editor.canvas.getHeight() || MAGIC_IMAGE_SIZE;
    const backgroundImage = editor.canvas.backgroundImage;
    const imageElement = backgroundImage.getElement();
    if (!imageElement) {
      throw new Error('Unable to access background image for magic edit.');
    }

    const naturalWidth = backgroundImage.width || imageElement.naturalWidth || imageElement.width || canvasWidth;
    const naturalHeight = backgroundImage.height || imageElement.naturalHeight || imageElement.height || canvasHeight;
    const visibleWidth = typeof backgroundImage.getScaledWidth === 'function'
      ? backgroundImage.getScaledWidth()
      : naturalWidth * (backgroundImage.scaleX || 1);
    const visibleHeight = typeof backgroundImage.getScaledHeight === 'function'
      ? backgroundImage.getScaledHeight()
      : naturalHeight * (backgroundImage.scaleY || 1);

    const exportScale = MAGIC_IMAGE_SIZE / Math.max(visibleWidth, visibleHeight);
    const targetWidth = forceSquare ? MAGIC_IMAGE_SIZE : Math.max(1, Math.round(visibleWidth * exportScale));
    const targetHeight = forceSquare ? MAGIC_IMAGE_SIZE : Math.max(1, Math.round(visibleHeight * exportScale));

    console.log('[Magic Edit Export Debug]', {
      forceSquare,
      canvasSize: { width: canvasWidth, height: canvasHeight },
      canvasZoom: editor.canvas.getZoom(),
      logicalCanvasSize: {
        width: canvasWidth / (editor.canvas.getZoom() || 1),
        height: canvasHeight / (editor.canvas.getZoom() || 1)
      },
      backgroundImage: {
        natural: { width: naturalWidth, height: naturalHeight },
        visible: { width: visibleWidth, height: visibleHeight },
        position: { left: backgroundImage.left, top: backgroundImage.top },
        scale: { x: backgroundImage.scaleX, y: backgroundImage.scaleY }
      },
      exportScale,
      exportedSize: { width: targetWidth, height: targetHeight }
    });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to prepare magic edit image.');
    }
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const drawWidth = visibleWidth * exportScale;
    const drawHeight = visibleHeight * exportScale;
    const offsetX = (targetWidth - drawWidth) / 2;
    const offsetY = (targetHeight - drawHeight) / 2;

    ctx.drawImage(imageElement, offsetX, offsetY, drawWidth, drawHeight);

    return { dataUrl: tempCanvas.toDataURL('image/png'), scale: exportScale };
  };

  const buildMaskDataUrl = () => {
    if (!editor?.canvas) {
      throw new Error('Editor not ready for magic erase.');
    }

    const tempCanvasDrawing = new fabric.Canvas();
    tempCanvasDrawing.setWidth(MAGIC_IMAGE_SIZE);
    tempCanvasDrawing.setHeight(MAGIC_IMAGE_SIZE);

    tempCanvasDrawing.backgroundColor = 'black';

    const originalHeight = editor.canvas.height;
    const originalWidth = editor.canvas.width;

    const scale = Math.min(MAGIC_IMAGE_SIZE / originalWidth, MAGIC_IMAGE_SIZE / originalHeight);
    const offsetX = (MAGIC_IMAGE_SIZE - originalWidth * scale) / 2;
    const offsetY = (MAGIC_IMAGE_SIZE - originalHeight * scale) / 2;

    editor.canvas.getObjects().forEach((obj) => {
      if (obj instanceof fabric.Path) {
        const path = obj.toObject();
        const newPath = new fabric.Path(path.path, { ...path, stroke: 'red', fill: 'transparent', globalCompositeOperation: 'destination-out' });
        newPath.scale(scale);
        newPath.set({ left: newPath.left * scale + offsetX, top: newPath.top * scale + offsetY });
        tempCanvasDrawing.add(newPath);
      }
    });

    return tempCanvasDrawing.toDataURL({
      format: 'png',
      left: 0,
      top: 0,
      width: tempCanvasDrawing.getWidth(),
      height: tempCanvasDrawing.getHeight(),
    });
  };

  const pollMagicResults = (magicResultId) => {
    const startTime = Date.now();

    const pollInterval = setInterval(async () => {
      const { results, error } = await checkMagicResult(magicResultId);
      let parsedError = null;
      if (error) {
        parsedError = error;
        if (typeof error === 'string') {
          try {
            parsedError = JSON.parse(error);
          } catch (_) {
            parsedError = { message: error };
          }
        }
      }
      const timedOut = (Date.now() - startTime) >= TIMEOUT;
      if (results || parsedError || timedOut) {
        clearInterval(pollInterval);
        setLoadingInpaintingResult(false);  // Stop the loading spinner

        if (parsedError) {
          const reason = parsedError?.reason;
          const model = parsedError?.model;
          const message = parsedError?.message || 'Magic tools are temporarily unavailable.';
          setSeverity('error');
          if (reason === 'moderation' || reason === 'ProviderModeration') {
            setMessage('Content blocked by moderation.');
          } else {
            setMessage(message);
          }
          setOpen(true);
          if (reason === 'rate_limit') {
            if (model === 'gemini') {
              setRateLimitState((prev) => ({ ...prev, nanoAvailable: false, nanoUsage: prev.nanoLimit }));
            } else {
            setRateLimitState((prev) => ({ ...prev, openaiAvailable: false, openaiUsage: prev.openaiLimit }));
          }
        } else if (reason === 'moderation') {
          console.warn('[V2Editor] Moderation block received', { model });
        } else if (reason === 'ProviderModeration') {
          console.warn('[V2Editor] Provider moderation blocked output', { model });
        }
      } else if (results) {
          try {
            const imageUrls = JSON.parse(results);
            setReturnedImages((prev) => [...prev, ...imageUrls]);
            setOpenSelectResult(true);
            await spendMagicCredit();
            void refreshRateLimits();
          } catch (err) {
            console.error('Error parsing magic results:', err);
            alert('Error: Unable to parse magic results. Please try again.');
          }
        } else {
          console.error("Timeout reached without fetching magic results.");
          alert("Error: The request timed out. Please try again.");  // Notify the user about the timeout
        }
        if (parsedError?.reason === 'rate_limit') {
          void refreshRateLimits();
        }
      }
    }, QUERY_INTERVAL);

    return pollInterval;
  };

  const downloadDataURL = (dataURL, fileName) => {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = fileName;
    // Simulate a click to start the download
    link.click();
  };

  const exportDrawing = async () => {
    if (!editor?.canvas?.backgroundImage) {
      setSeverity('error');
      setMessage('Load an image before using Magic Eraser.');
      setOpen(true);
      return;
    }
    if (rateLimitState.openaiAvailable === false) {
      setSeverity('error');
      setMessage('Classic Magic Tools are temporarily unavailable. Please try again later.');
      setOpen(true);
      return;
    }

    setLoadingInpaintingResult(true);
    window.scrollTo(0, 0);
    const originalCanvas = editor.canvas;

    try {
      const dataURLDrawing = buildMaskDataUrl();
      const { dataUrl: dataURLBgImage } = buildBackgroundDataUrl();

      if (dataURLBgImage && dataURLDrawing) {
        const data = {
          image: dataURLBgImage,
          mask: dataURLDrawing,
          prompt: magicPrompt,
        };

        try {
          const response = await API.post('publicapi', '/inpaint', {
            body: data
          });

          const {magicResultId} = response;

          if (!magicResultId) {
            throw new Error('Unable to start magic edit.');
          }

          pollMagicResults(magicResultId);
        } catch (error) {
          setLoadingInpaintingResult(false);
          const rateLimitReason = error?.response?.data?.error?.reason || error?.response?.data?.error?.code;
          const rateLimitModel = error?.response?.data?.error?.model;
          const messageText = error?.message ? error.message.toLowerCase() : '';
          if (rateLimitReason === 'rate_limit' || messageText.includes('rate limit')) {
            if (rateLimitModel === 'gemini') {
              setRateLimitState((prev) => ({ ...prev, nanoAvailable: false, nanoUsage: prev.nanoLimit }));
            } else {
              setRateLimitState((prev) => ({ ...prev, openaiAvailable: false, openaiUsage: prev.openaiLimit }));
            }
            setSeverity('error');
            setMessage(rateLimitModel === 'gemini'
              ? 'Magic Tools are temporarily unavailable. Please try again later.'
              : 'Classic Magic Tools are temporarily unavailable. Please try again later.');
            setOpen(true);
            return;
          }
          if (rateLimitReason === 'moderation' || messageText.includes('moderation')) {
            setSeverity('error');
            setMessage(error?.response?.data?.error?.message || 'Content was blocked by safety filters.');
            setOpen(true);
            return;
          }
          if (error.response?.data?.error?.name === "InsufficientCredits") {
            setSeverity('error');
            setMessage('Insufficient Credits');
            setOpen(true);
            originalCanvas.getObjects().forEach((obj) => {
              if (obj instanceof fabric.Path) {
                editor.canvas.remove(obj);
              }
            });
            setHasFabricPaths(false);
          } else {
            console.error(error);
            setSeverity('error');
            setMessage(error.message || 'An error occurred while applying magic erase.');
            setOpen(true);
          }
          if (error.response?.data) {
            console.log(error.response.data);
            alert(`Error: ${JSON.stringify(error.response.data)}`);
          }
        }
      }
    } catch (error) {
      setLoadingInpaintingResult(false);
      setSeverity('error');
      setMessage(error.message || 'An error occurred while preparing the magic edit.');
      setOpen(true);
    }
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleMagicReferenceFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAGIC_MAX_REFERENCES);
    const reads = await Promise.all(files.map(async (file) => {
      try {
        return await readFileAsDataUrl(file);
      } catch (err) {
        console.error('Failed to read reference image', err);
        return null;
      }
    }));
    const filtered = reads.filter(Boolean);
    if (!filtered.length) return;
    setMagicReferences((prev) => {
      const merged = [...prev, ...filtered];
      return merged.slice(0, MAGIC_MAX_REFERENCES);
    });
  }, []);

  const removeMagicReference = useCallback((index) => {
    setMagicReferences((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleMagicEdit = async () => {
    if (!magicPrompt || magicPrompt.trim().length === 0) {
      setSeverity('error');
      setMessage('Add a prompt to describe the magic edit.');
      setOpen(true);
      return;
    }

    if (!editor?.canvas?.backgroundImage) {
      setSeverity('error');
      setMessage('Load an image before using Magic Edit.');
      setOpen(true);
      return;
    }

    if (rateLimitState.nanoAvailable === false) {
      if (rateLimitState.openaiAvailable) {
        setRateLimitDialogOpen(true);
      } else {
        setSeverity('error');
        setMessage('Magic tools are temporarily unavailable. Please try again later.');
        setOpen(true);
      }
      return;
    }

    try {
      const { dataUrl, scale } = buildBackgroundDataUrl({ forceSquare: false });
      const resumeKey = `${Date.now()}`;
      try {
        const canvasWidth = typeof editor.canvas.getWidth === 'function' ? editor.canvas.getWidth() : editor.canvas.width;
        const canvasHeight = typeof editor.canvas.getHeight === 'function' ? editor.canvas.getHeight() : editor.canvas.height;
        const snapshot = {
          key: resumeKey,
          path: `${location.pathname}${location.search}`,
          timestamp: Date.now(),
          canvasJSON: JSON.stringify(editor.canvas),
          canvasWidth,
          canvasHeight,
          canvasSize,
          editorAspectRatio,
          whiteSpaceHeight,
          whiteSpaceValue,
          showWhiteSpaceSlider,
          imageScale,
          layerFonts,
          layerRawText,
          layerActiveFormats,
          magicPrompt,
          magicReferences,
          sourceScale: scale,
        };
        pendingMagicResumeRef.current = snapshot;
        persistMagicResumeSnapshot(snapshot);
      } catch (snapshotError) {
        console.error('Failed to preserve editor state for magic edit:', snapshotError);
      }

      navigate('/magic', {
        state: {
          initialSrc: dataUrl,
          returnTo: `${location.pathname}${location.search}`,
          magicPrompt,
          magicAutoStart: true,
          magicAutoStartKey: resumeKey,
          magicVariationCount: 1,
          magicEditContext: {
            source: 'v2editor',
            resumeKey,
            sourceScale: scale,
          },
          references: magicReferences,
        },
      });
    } catch (error) {
      console.error(error);
      setSeverity('error');
      setMessage(error.message || 'An error occurred while preparing the magic edit.');
      setOpen(true);
    }
  };

  const handleSwitchToClassicTools = () => {
    setRateLimitDialogOpen(false);
    setPromptEnabled('erase');
    toggleDrawingMode('magicEraser');
    setSeverity('info');
    setMessage('Switched to classic tools while nanoBanana is unavailable.');
    setOpen(true);
  };

  const handleStayOnMagicTools = () => {
    setRateLimitDialogOpen(false);
  };

  const handleAddCanvasBackground = (imgUrl, options = {}) => {
    const { skipHistory = false } = options;
    try {
      setOpenSelectResult(false);

      fabric.Image.fromURL(imgUrl, (returnedImage) => {
        if (!returnedImage) {
          throw new Error('Failed to load image from URL');
        }

        editor.canvas.getObjects().forEach((obj) => {
          if (obj instanceof fabric.Path) {
            editor.canvas.remove(obj)
          }
        });

        setHasFabricPaths(false);

        setSelectedImage();
        setReturnedImages([]);

        const bg = editor.canvas.backgroundImage;
        const naturalWidth = returnedImage.width || MAGIC_IMAGE_SIZE;
        const naturalHeight = returnedImage.height || MAGIC_IMAGE_SIZE;

        let appliedScale;
        let left = 0;
        let top = 0;
        let originX = 'left';
        let originY = 'top';

        if (options?.sourceScale) {
          const targetWidth = editor.canvas.getWidth() / (editor.canvas.getZoom() || 1);
          const targetHeight = editor.canvas.getHeight() / (editor.canvas.getZoom() || 1);

          const sourceBasedScale = 1 / options.sourceScale;
          const minCoverScale = Math.max(
            targetWidth / naturalWidth,
            targetHeight / naturalHeight
          );

          appliedScale = Math.max(sourceBasedScale, minCoverScale);

          console.log('[Magic Edit Debug]', {
            sourceScale: options.sourceScale,
            sourceBasedScale,
            minCoverScale,
            appliedScale,
            returnedImageSize: { width: naturalWidth, height: naturalHeight },
            canvasZoom: editor.canvas.getZoom(),
            canvasSize: {
              width: editor.canvas.getWidth(),
              height: editor.canvas.getHeight()
            },
            logicalSize: { width: targetWidth, height: targetHeight },
            finalImageSize: {
              width: naturalWidth * appliedScale,
              height: naturalHeight * appliedScale
            },
            bgPosition: bg ? { left: bg.left, top: bg.top, width: bg.width, height: bg.height, scaleX: bg.scaleX, scaleY: bg.scaleY, originX: bg.originX, originY: bg.originY } : null
          });

          if (bg) {
            left = typeof bg.left === 'number' ? bg.left : 0;
            top = typeof bg.top === 'number' ? bg.top : 0;
            originX = bg.originX || 'left';
            originY = bg.originY || 'top';
          }
        } else {
          // Classic tools logic: simple scale and center
          const originalHeight = editor.canvas.height;
          const originalWidth = editor.canvas.width;
          const scale = Math.min(1024 / originalWidth, 1024 / originalHeight);
          appliedScale = 1 / scale;
        }

        returnedImage.scale(appliedScale);
        returnedImage.set({
          left,
          top,
          originX,
          originY,
        });
        editor.canvas.setBackgroundImage(returnedImage);

        // For classic tools (no sourceScale), center the image
        if (!options?.sourceScale) {
          editor.canvas.backgroundImage.center();
        }

        setBgEditorStates(prevHistory => [...prevHistory, returnedImage]);
        editor.canvas.renderAll();

        setEditorTool('captions');
        toggleDrawingMode('captions');
        setMagicPrompt(promptEnabled === 'edit' ? '' : 'Everyday scene as cinematic cinestill sample');
        // setPromptEnabled('erase');
        if (!skipHistory) {
          addToHistory();
        }
      }, {
        crossOrigin: "anonymous"
      });

    } catch (error) {
      setSeverity('error');
      setMessage(`An error occurred: ${error.message}`);
      setOpen(true);
    }
  };



  const restoreMagicResume = async (resume) => {
    if (!resume || !resume.canvasJSON || !editor?.canvas) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        skipNextDefaultFrameRef.current = true;
        skipNextDefaultSubtitleRef.current = true;
        const width = resume.canvasWidth || (typeof editor.canvas.getWidth === 'function' ? editor.canvas.getWidth() : editor.canvas.width) || canvasSize.width;
        const height = resume.canvasHeight || (typeof editor.canvas.getHeight === 'function' ? editor.canvas.getHeight() : editor.canvas.height) || canvasSize.height;

        editor.canvas.loadFromJSON(resume.canvasJSON, () => {
          editor.canvas.setWidth(width);
          editor.canvas.setHeight(height);
          editor.canvas.renderAll();

          const nextCanvasSize = (resume.canvasSize && resume.canvasSize.width && resume.canvasSize.height)
            ? resume.canvasSize
            : { width, height };

          setCanvasSize(nextCanvasSize);
          setEditorAspectRatio(resume.editorAspectRatio || ((width && height) ? width / height : editorAspectRatio));
          setWhiteSpaceHeight(resume.whiteSpaceHeight ?? 0);
          setWhiteSpaceValue(resume.whiteSpaceValue ?? 0);
          setShowWhiteSpaceSlider(Boolean(resume.showWhiteSpaceSlider));
          setImageScale(resume.imageScale || imageScale);

          const rawText = resume.layerRawText ? { ...resume.layerRawText } : {};
          if (!resume.layerRawText) {
            editor.canvas.getObjects().forEach((obj, idx) => {
              if (obj && typeof obj.text === 'string') {
                rawText[idx] = obj.text;
              }
            });
          }

          setLayerRawText(rawText);
          setLayerActiveFormats(resume.layerActiveFormats || {});
          setLayerFonts(resume.layerFonts || {});
          setCanvasObjects([...editor.canvas._objects]);
          setEditorStates([resume.canvasJSON]);
          setCanvasSizes([{ width: nextCanvasSize.width, height: nextCanvasSize.height }]);
          setFutureStates([]);
          setFutureCanvasSizes([]);
          setHasFabricPaths(editor.canvas.getObjects().some((obj) => obj instanceof fabric.Path));
          setBgEditorStates([editor.canvas.backgroundImage]);
          setBgFutureStates([]);
          setEditorTool('captions');
          toggleDrawingMode('captions');
          setMagicPrompt(resume.magicPrompt ?? magicPrompt);
          setLoading(false);
          setImageLoaded(true);
          resolve(true);
        });
      } catch (err) {
        console.error('Failed to restore magic edit session', err);
        resolve(false);
      }
    });
  };

  useEffect(() => {
    if (!editor?.canvas) {
      return;
    }

    const applyPendingMagic = async () => {
      const pending = pendingMagicResumeRef.current || readMagicResumeSnapshot();
      if (!pending) {
        return;
      }

      const applied = await restoreMagicResume(pending);
      const resultUrl = pending.magicResult?.displayUrl || pending.magicResult?.originalUrl;
      if (resultUrl) {
        const sourceScale = pending.magicContext?.sourceScale || pending.sourceScale;
        handleAddCanvasBackground(resultUrl, { sourceScale, skipHistory: true });

        // Add single history entry after magic result is applied
        setTimeout(() => {
          addToHistory();
        }, 100);
      }

      clearMagicResumeSnapshot();
      pendingMagicResumeRef.current = null;
    };

    applyPendingMagic();
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectResultCancel = () => {
    setSelectedImage()
    setReturnedImages([])
    setOpenSelectResult(false)
  }

  const handleBrushToolSize = (size) => {
    if (editor) {
      setBrushToolSize(size);
      editor.canvas.freeDrawingBrush.width = size;
    }
  }

  // function ValueLabelComponent(props) {
  //   const { children, open, value } = props;

  //   return (
  //     <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
  //     <Box 
  //       sx={{ 
  //         width: value, 
  //         height: value, 
  //         borderRadius: '50%', 
  //         backgroundColor: 'red',
  //         display: 'flex'
  //       }}
  //     >
  //       {value}
  //     </Box>
  //     </Tooltip>
  //   );
  // }
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  }





  const undo = () => {
    if (editorStates.length <= 1) return; // Ensure there's at least one state to go back to

    // Move the latest action to futureStates before going back
    setFutureStates(prevFuture => [editorStates[editorStates.length - 1], ...prevFuture]);
    setFutureCanvasSizes(prevFuture => [canvasSizes[canvasSizes.length - 1], ...prevFuture]);

    // Go back in history
    setEditorStates(prevHistory => prevHistory.slice(0, prevHistory.length - 1));
    setCanvasSizes(prevSizes => prevSizes.slice(0, prevSizes.length - 1));

    const restoredSize = canvasSizes[canvasSizes.length - 2];

    // Load the previous state into the canvas
    editor.canvas.loadFromJSON(editorStates[editorStates.length - 2], () => {
      const [desiredHeight, desiredWidth] = calculateEditorSize(editorAspectRatio);
      const scaleFactorX = desiredWidth / restoredSize.width;
      const scaleFactorY = desiredHeight / restoredSize.height;
      const scaleFactor = Math.min(scaleFactorX, scaleFactorY);

      editor.canvas.setZoom(scaleFactor);
      editor.canvas.setWidth(desiredWidth);
      editor.canvas.setHeight(desiredHeight);

      // Ensure background image fills the canvas
      const bg = editor.canvas.backgroundImage;
      if (bg) {
        const bgNaturalWidth = bg.width || bg.getOriginalSize?.().width || 1;
        const bgNaturalHeight = bg.height || bg.getOriginalSize?.().height || 1;
        const requiredScaleX = restoredSize.width / bgNaturalWidth;
        const requiredScaleY = restoredSize.height / bgNaturalHeight;
        const requiredScale = Math.max(requiredScaleX, requiredScaleY);

        bg.scaleX = requiredScale;
        bg.scaleY = requiredScale;
      }

      editor.canvas.renderAll();
      setCanvasObjects([...editor.canvas._objects]);
      setWhiteSpaceHeight(restoredSize.height - canvasSize.height);
    });
  }

  const redo = () => {
    if (futureStates.length === 0) return; // Ensure there's at least one state to go forward to

    const restoredSize = futureCanvasSizes[0];

    // Move the first future state back to editorStates
    setEditorStates(prevHistory => [...prevHistory, futureStates[0]]);
    setCanvasSizes(prevSizes => [...prevSizes, restoredSize]);

    // Remove the state we've just moved from futureStates
    setFutureStates(prevFuture => prevFuture.slice(1));
    setFutureCanvasSizes(prevFuture => prevFuture.slice(1));

    // Load the restored state into the canvas
    editor.canvas.loadFromJSON(futureStates[0], () => {
      const [desiredHeight, desiredWidth] = calculateEditorSize(editorAspectRatio);
      const scaleFactorX = desiredWidth / restoredSize.width;
      const scaleFactorY = desiredHeight / restoredSize.height;
      const scaleFactor = Math.min(scaleFactorX, scaleFactorY);

      editor.canvas.setZoom(scaleFactor);
      editor.canvas.setWidth(desiredWidth);
      editor.canvas.setHeight(desiredHeight);

      // Ensure background image fills the canvas
      const bg = editor.canvas.backgroundImage;
      if (bg) {
        const bgNaturalWidth = bg.width || bg.getOriginalSize?.().width || 1;
        const bgNaturalHeight = bg.height || bg.getOriginalSize?.().height || 1;
        const requiredScaleX = restoredSize.width / bgNaturalWidth;
        const requiredScaleY = restoredSize.height / bgNaturalHeight;
        const requiredScale = Math.max(requiredScaleX, requiredScaleY);

        bg.scaleX = requiredScale;
        bg.scaleY = requiredScale;
      }

      editor.canvas.renderAll();
      setCanvasObjects([...editor.canvas._objects]);
      setWhiteSpaceHeight(restoredSize.height - canvasSize.height);
    });
  }

  useEffect(() => {
    if (editor && !editorLoaded) {
      setEditorLoaded(true);

      // Function to remove the center line
      const removeCenterLine = () => {
        const centerLine = editor.canvas.getObjects().find((obj) => obj.centerLine === true);
        if (centerLine) {
          editor.canvas.remove(centerLine);
          editor.canvas.renderAll();
        }
      };

      if (!selectedFid) {
        loadEditorDefaults();
      }

      // On object modification (when object's movement/editing is completed)
      editor.canvas.on('object:modified', () => {
        removeCenterLine(); // remove the center line
        addToHistory();
      });

      // On path creation
      editor.canvas.on('path:created', () => {
        addToHistory();
        setHasFabricPaths(true);
      });

      // Snap to horizontal center logic when moving the object
      const snapThreshold = 5;
      editor.canvas.on('object:moving', (options) => {
        const movingObject = options.target;
        let movingCenterX;

        if (movingObject.type === 'group') {
          // When multiple objects are selected
          movingCenterX = movingObject.left;
        } else {
          // Single object
          movingCenterX = movingObject.left + (movingObject.width * movingObject.scaleX) / 2;
        }

        // Adjust movingCenterX calculation considering the originX
        if (movingObject.originX === 'center') {
          movingCenterX = movingObject.left;
        } else {
          movingCenterX = movingObject.left + (movingObject.width * movingObject.scaleX) / 2;
        }


        // Get the horizontal center of the canvas
        const canvasCenterX = editor.canvas.width / 2;

        // Calculate the horizontal distance from the moving object's/group's center to the canvas center
        const distanceX = Math.abs(movingCenterX - canvasCenterX);

        // If within threshold, snap to center
        if (distanceX < snapThreshold) {
          if (movingObject.originX === 'center') {
            movingObject.set({ left: canvasCenterX });
          } else {
            // Adjust for objects where the originX is not 'center'
            movingObject.set({ left: canvasCenterX - (movingObject.width * movingObject.scaleX) / 2 });
          }

          // Check if centerLine exists in the canvas
          let centerLine = editor.canvas.getObjects().find((obj) => obj.centerLine === true);

          // If centerLine does not exist, create and add to canvas
          if (!centerLine) {
            centerLine = new fabric.Line([canvasCenterX, 0, canvasCenterX, editor.canvas.height], {
              stroke: 'red',
              strokeWidth: 1,
              opacity: 1,
              selectable: false,
              evented: false, // makes sure this line doesn't participate in any canvas events
              centerLine: true, // custom property to uniquely identify the center line
            });
            editor.canvas.add(centerLine);
          }
        } else {
          removeCenterLine();
        }

        // Always render the canvas after changes
        editor.canvas.renderAll();
      });

      // Record the background state
      setBgEditorStates((prevHistory) => [...prevHistory, editor.canvas.backgroundImage]);
    }
  }, [editor]);

  const loadFineTuningFrames = () => {
    setLoadingFineTuningFrames(false)
  }

  // This is going to handle toggling our default prompt when the user switches between modes.
  useEffect(() => {
    if (promptEnabled === "fill" || promptEnabled === 'edit') {
      setMagicPrompt('')
    } else if (promptEnabled === 'erase') {
      setMagicPrompt('Everyday scene as cinematic cinestill sample')
    }
  }, [promptEnabled])

  useEffect(() => {
    if (searchParams.has('magicTools', 'true')) {
      if (!user || user?.userDetails?.credits <= 0) {
        setMagicToolsPopoverAnchorEl(magicToolsButtonRef.current);
        setEditorTool('captions')
      }
    }

  }, []);

  useEffect(() => {
    if (editorTool === 'magicEraser') {
      setPromptEnabled('edit');
      setMagicPrompt('');
    }
    if (editorTool === 'fineTuning') {
      loadFineTuningImages()
    }
  }, [editorTool])

  useEffect(() => {
    if (editorTool === 'magicEraser') {
      if (promptEnabled === 'edit') {
        toggleDrawingMode('captions');
      } else {
        toggleDrawingMode('magicEraser');
      }
    }
  }, [editorTool, promptEnabled])

  useEffect(() => {
    if (editorLoaded) {
      if (searchParams.has('magicTools', 'true')) {
        if (!(!user || user?.userDetails?.credits <= 0)) {
          setEditorTool('magicEraser');
          toggleDrawingMode('magicEraser');
        }
      }
    }
  }, [editorLoaded]);

  const handleOpenNavWithoutSavingDialog = (cid, season, episode, frame) => {
    if (editorStates.length > 1) {
      setSelectedNavItemFid(frame);
      setOpenNavWithoutSavingDialog(true);
    } else {
      handleNavigate(cid, season, episode, frame);
    }
  };

  const handleNavigate = (cid, season, episode, frame) => {
    navigate(`/editor/${cid}/${season}/${episode}/${frame}${encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : ''}`);
    setOpenNavWithoutSavingDialog(false);
    editor.canvas.discardActiveObject().requestRenderAll();
    setFutureStates([]);
    setBgFutureStates([]);
    setEditorStates([]);
    setBgEditorStates([]);
  };

  const { cid, season, episode, frame } = useParams();
  const [confirmedCid, setConfirmedCid] = useState();
  const { showObj, setShowObj, selectedFrameIndex, setSelectedFrameIndex } = useSearchDetailsV2();

  const editorImageIntentBaseMeta = useMemo(() => {
    const meta = {
      source: 'V2EditorPage',
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

    if (typeof fineTuningIndex !== 'undefined') {
      meta.fineTuningIndex = fineTuningIndex;
    }

    if (editorProjectId) {
      meta.editorProjectId = editorProjectId;
    }

    if (generatedImageFilename) {
      meta.generatedImageFilename = generatedImageFilename;
    }

    if (typeof searchQuery === 'string') {
      const trimmed = searchQuery.trim();
      if (trimmed.length > 0) {
        meta.searchTerm = trimmed;
      }
    }

    if (!meta.searchTerm && typeof searchTerms === 'string') {
      const trimmedLegacy = searchTerms.trim();
      if (trimmedLegacy.length > 0) {
        meta.searchTerm = trimmedLegacy;
      }
    }

    if (typeof selectedFrameIndex !== 'undefined') {
      meta.selectedFrameIndex = selectedFrameIndex;
    }

    return meta;
  }, [
    cid,
    confirmedCid,
    season,
    episode,
    frame,
    fineTuningIndex,
    editorProjectId,
    generatedImageFilename,
    searchQuery,
    searchTerms,
    selectedFrameIndex,
  ]);

  const saveDialogImageIntentMeta = useMemo(
    () => ({
      ...editorImageIntentBaseMeta,
      intentTarget: 'SaveDialogPreview',
      imageUploading: Boolean(imageUploading),
      hasShareImageFile: Boolean(shareImageFile),
      hasClipboardImage: Boolean(imageBlob),
    }),
    [editorImageIntentBaseMeta, imageUploading, shareImageFile, imageBlob]
  );

  const saveDialogImageIntentHandlers = useTrackImageSaveIntent(saveDialogImageIntentMeta);

  const trackSaveDialogAction = useCallback(
    (trigger, extra = {}) => {
      const payload = {
        ...saveDialogImageIntentMeta,
        intentTarget: 'SaveDialogAction',
        trigger,
      };

      Object.assign(payload, extra);

      trackUsageEvent('save_intent_image', payload);
    },
    [saveDialogImageIntentMeta]
  );

  const getTextLayers = useCallback(() => {
    if (!editor?.canvas) return [];
    return editor.canvas.getObjects().filter((obj) => obj?.type === 'textbox' || obj?.type === 'text');
  }, [editor]);

  const getTextLayersWithText = useCallback(() => {
    const objects = editor?.canvas?.getObjects() || [];
    return getTextLayers().map((layer) => {
      const canvasIndex = objects.indexOf(layer);
      const rawValue = canvasIndex >= 0 ? layerRawText?.[canvasIndex] : undefined;
      const candidate = (rawValue || layer?.text || '').toString();
      const { cleanText } = parseFormattedText(candidate);
      return {
        canvasIndex,
        text: cleanText || candidate || 'Text',
        fontFamily: layer?.fontFamily || 'Arial',
      };
    });
  }, [editor, getTextLayers, layerRawText, parseFormattedText]);

  const textLayerEntries = useMemo(() => getTextLayersWithText(), [getTextLayersWithText]);

  const captureCanvasBlob = useCallback(
    async ({ includeCaptions }) => {
      if (!editor?.canvas) return null;
      const textLayers = getTextLayers();
      const shouldHideText = !includeCaptions && textLayers.length > 0;
      const prevVisibility = [];

      if (shouldHideText) {
        textLayers.forEach((layer, idx) => {
          prevVisibility[idx] = layer.visible;
          layer.visible = false;
        });
        editor.canvas.renderAll();
      }

      try {
        const dataUrl = editor.canvas.toDataURL({
          format: 'jpeg',
          quality: 0.6,
          multiplier: imageScale || 1,
        });
        const res = await fetch(dataUrl);
        return await res.blob();
      } finally {
        if (shouldHideText) {
          textLayers.forEach((layer, idx) => {
            layer.visible = typeof prevVisibility[idx] === 'boolean' ? prevVisibility[idx] : true;
          });
          editor.canvas.renderAll();
        }
      }
    },
    [editor, getTextLayers, imageScale]
  );

  const blobToDataUrl = useCallback(async (blob) => new Promise((resolve, reject) => {
    if (!blob) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }), []);

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

  const getDefaultCaptionFromTextLayer = useCallback(
    (canvasIndexOverride) => {
      const textLayers = getTextLayers();
      if (!textLayers.length) return '';

      const objects = editor?.canvas?.getObjects() || [];
      const target =
        typeof canvasIndexOverride === 'number'
          ? objects[canvasIndexOverride]
          : textLayers[0];
      const index = objects.indexOf(target);
      const rawValue = index >= 0 ? layerRawText?.[index] : undefined;
      const candidate = (rawValue || target?.text || '').toString();
      const { cleanText } = parseFormattedText(candidate);
      return cleanText || candidate;
    },
    [editor, getTextLayers, layerRawText, parseFormattedText]
  );

  const performSaveToLibrary = useCallback(
    async ({ includeCaptions, captionIndex }) => {
      if (!isProUser || savingToLibrary) return;

      setSavingToLibrary(true);
      setLibrarySaveSuccess(false);

      const textLayers = getTextLayers();

      trackSaveDialogAction('save_to_library_button', {
        isProUser: Boolean(isProUser),
        hasImageBlob: Boolean(imageBlob),
        includeCaptions: Boolean(includeCaptions),
        textLayerCount: textLayers.length,
      });

      try {
        const filename = generatedImageFilename || 'editor-image.jpg';
        const metadata = {
          source: 'V2EditorPage',
          ...(editorProjectId ? { editorProjectId } : {}),
          ...((confirmedCid || cid) ? { cid: confirmedCid || cid } : {}),
          ...(season ? { season } : {}),
          ...(episode ? { episode } : {}),
          ...(frame ? { frame } : {}),
        };

        if (!includeCaptions) {
          const defaultCaption = getDefaultCaptionFromTextLayer(captionIndex);
          if (defaultCaption) {
            metadata.defaultCaption = defaultCaption;
          }
        }

        const blobToSave = includeCaptions
          ? imageBlob || (await captureCanvasBlob({ includeCaptions: true }))
          : await captureCanvasBlob({ includeCaptions: false });

        if (!blobToSave) {
          throw new Error('No image available to save');
        }

        const libraryKey = await saveImageToLibrary(blobToSave, filename, {
          level: 'private',
          metadata,
        });

        trackUsageEvent('add_to_library', {
          ...editorImageIntentBaseMeta,
          libraryKey,
          trigger: 'save_dialog',
          includeCaptions: Boolean(includeCaptions),
          captionIndex: typeof captionIndex === 'number' ? captionIndex : undefined,
        });

        setLibrarySaveSuccess(true);
      } catch (error) {
        console.error('Error saving image to library:', error);
        setSeverity('error');
        setMessage('Unable to save to library right now.');
        setOpen(true);
      } finally {
        setSavingToLibrary(false);
      }
    },
    [
      isProUser,
      savingToLibrary,
      getTextLayers,
      trackSaveDialogAction,
      imageBlob,
      generatedImageFilename,
      editorProjectId,
      confirmedCid,
      cid,
      season,
      episode,
      frame,
      getDefaultCaptionFromTextLayer,
      captureCanvasBlob,
      editorImageIntentBaseMeta,
      setSeverity,
      setMessage,
      setOpen,
    ]
  );

  const handleSaveToLibraryClick = useCallback(() => {
    if (!isProUser || imageUploading || savingToLibrary) return;
    setLibrarySaveSuccess(false);
    setLibrarySaveStep('choice');
    setLibraryCaptionSelectionIndex(null);
    const textLayers = getTextLayers();
    if (textLayers.length > 0) {
      trackSaveDialogAction('save_to_library_prompt', {
        textLayerCount: textLayers.length,
      });
      setLibrarySavePromptOpen(true);
      return;
    }
    performSaveToLibrary({ includeCaptions: true });
  }, [
    getTextLayers,
    imageUploading,
    isProUser,
    performSaveToLibrary,
    savingToLibrary,
    trackSaveDialogAction,
  ]);

  const performAddToCollage = useCallback(
    async (captionEntry) => {
      if (!isProUser) {
        openSubscriptionDialog();
        return;
      }
      if (addingToCollage || imageUploading) return;

      setAddingToCollage(true);

      const captionIndex = typeof captionEntry?.canvasIndex === 'number' ? captionEntry.canvasIndex : null;
      trackSaveDialogAction('add_to_collage', {
        textLayerCount: textLayerEntries.length,
        captionIndex,
      });

      try {
        const cleanBlob = await captureCanvasBlob({ includeCaptions: false });
        const dataUrl = await blobToDataUrl(cleanBlob);
        if (!dataUrl) {
          throw new Error('No image available to add to collage');
        }

        const subtitle = (captionEntry?.text || '').toString();
        const fontFamily = captionEntry?.fontFamily || 'Arial';
        const filename = generatedImageFilename || `collage-${Date.now()}.jpg`;

        let libraryKey = null;
        try {
          const metadata = {
            source: 'V2EditorPage',
            ...(subtitle ? { defaultCaption: subtitle } : {}),
            ...(fontFamily ? { fontFamily } : {}),
            ...(editorProjectId ? { editorProjectId } : {}),
            ...((confirmedCid || cid) ? { cid: confirmedCid || cid } : {}),
            ...(season ? { season } : {}),
            ...(episode ? { episode } : {}),
            ...(frame ? { frame } : {}),
          };
          libraryKey = await saveImageToLibrary(cleanBlob, filename, { level: 'private', metadata });
        } catch (err) {
          console.error('Error saving collage image to library:', err);
          setSeverity('error');
          setMessage('Unable to save image for collage right now.');
          setOpen(true);
          return;
        }

        const imagePayload = {
          originalUrl: dataUrl,
          displayUrl: dataUrl,
          subtitle,
          subtitleShowing: Boolean(subtitle),
          metadata: {
            source: 'V2EditorPage',
            ...(captionEntry?.fontFamily ? { fontFamily } : {}),
            ...(libraryKey ? { libraryKey } : {}),
          },
        };

        setPendingCollagePayload({
          captionIndex,
          textLayerCount: textLayerEntries.length,
          imagePayload,
          libraryKey,
        });
        setCollageChooserOpen(true);
      } catch (error) {
        console.error('Error adding to collage:', error);
        setSeverity('error');
        setMessage('Unable to add to collage right now.');
        setOpen(true);
      } finally {
        setAddingToCollage(false);
        setCollagePromptOpen(false);
        setCollageCaptionSelectionIndex(null);
      }
    },
    [
      addingToCollage,
      blobToDataUrl,
      captureCanvasBlob,
      createProject,
      editorImageIntentBaseMeta,
      imageUploading,
      isProUser,
      openSubscriptionDialog,
      setMessage,
      setOpen,
      setSeverity,
      textLayerEntries,
      trackSaveDialogAction,
    ]
  );

  const handleAddToCollageClick = useCallback(() => {
    if (!isProUser) {
      openSubscriptionDialog();
      return;
    }
    if (imageUploading || addingToCollage) return;
    const entries = textLayerEntries;
    if (entries.length > 1) {
      trackSaveDialogAction('add_to_collage_prompt', {
        textLayerCount: entries.length,
      });
      setCollageCaptionSelectionIndex(entries[0]?.canvasIndex ?? null);
      setCollagePromptOpen(true);
      return;
    }
    const entry = entries[0] || null;
    performAddToCollage(entry);
  }, [addingToCollage, imageUploading, isProUser, openSubscriptionDialog, performAddToCollage, textLayerEntries, trackSaveDialogAction]);

  const handleCollageChooserClose = useCallback(() => {
    setCollageChooserOpen(false);
    setPendingCollagePayload(null);
    setCollagePreview(null);
  }, []);

  const handleCollageNewProject = useCallback(async () => {
    if (!pendingCollagePayload) return;
    try {
      setAddingToCollage(true);
      const project = await createProject({ name: 'Untitled Meme' });
      const projectId = project?.id;
      if (!projectId) throw new Error('Missing project id for collage project');
      const { snapshot, thumbnail } = await persistCollageSnapshot(
        projectId,
        appendImageToSnapshot(null, snapshotImageFromPayload(pendingCollagePayload.imagePayload)).snapshot
      );

      trackUsageEvent('add_to_collage', {
        ...editorImageIntentBaseMeta,
        projectId,
        captionIndex: pendingCollagePayload.captionIndex,
        textLayerCount: pendingCollagePayload.textLayerCount,
        libraryKey: pendingCollagePayload.libraryKey,
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
      setSeverity('error');
      setMessage('Unable to start a collage project right now.');
      setOpen(true);
    } finally {
      setAddingToCollage(false);
    }
  }, [
    appendImageToSnapshot,
    createProject,
    editorImageIntentBaseMeta,
    pendingCollagePayload,
    persistCollageSnapshot,
    snapshotImageFromPayload,
    setMessage,
    setOpen,
    setSeverity,
  ]);

  const handleCollageExistingProject = useCallback(
    async (project) => {
      if (!project?.id || !pendingCollagePayload) return;
      try {
        setAddingToCollage(true);
        const baseSnapshot = await loadCollageSnapshot(project);
        const incomingImage = snapshotImageFromPayload(pendingCollagePayload.imagePayload);
        if ((baseSnapshot.images || []).length >= MAX_COLLAGE_IMAGES) {
          setCollageReplaceContext({
            project,
            snapshot: baseSnapshot,
            incomingImage,
            incomingPreview:
              pendingCollagePayload.imagePayload.displayUrl ||
              pendingCollagePayload.imagePayload.originalUrl ||
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
          ...editorImageIntentBaseMeta,
          projectId: project.id,
          captionIndex: pendingCollagePayload.captionIndex,
          textLayerCount: pendingCollagePayload.textLayerCount,
          libraryKey: pendingCollagePayload.libraryKey,
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
        setSeverity('error');
        setMessage('Unable to add to collage right now.');
        setOpen(true);
      } finally {
        setAddingToCollage(false);
      }
    },
    [
      appendImageToSnapshot,
      editorImageIntentBaseMeta,
      handleCollageChooserClose,
      loadCollageSnapshot,
      pendingCollagePayload,
      persistCollageSnapshot,
      prepareReplaceDialogOptions,
      setCollageChooserOpen,
      setMessage,
      setOpen,
      setSeverity,
      snapshotImageFromPayload,
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
      const { thumbnail } = await persistCollageSnapshot(
        collageReplaceContext.project.id,
        nextSnapshot
      );

      trackUsageEvent('add_to_collage', {
        ...editorImageIntentBaseMeta,
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
      setCollageChooserOpen(true);
      setCollageReplaceDialogOpen(false);
      setCollageReplaceContext(null);
      setCollageReplaceOptions([]);
      setCollageReplaceSelection(null);
    } catch (err) {
      console.error('Error replacing collage image:', err);
      setSeverity('error');
      setMessage('Unable to replace collage image right now.');
      setOpen(true);
    } finally {
      setAddingToCollage(false);
    }
  }, [
    collageReplaceContext,
    collageReplaceSelection,
    editorImageIntentBaseMeta,
    persistCollageSnapshot,
    replaceImageInSnapshot,
    setMessage,
    setOpen,
    setSeverity,
    trackUsageEvent,
  ]);

  const handleAddTextLayer = useCallback(() => {
    const eventPayload = {
      source: 'V2EditorPage',
    };

    const resolvedCid = confirmedCid || cid;
    if (resolvedCid) {
      eventPayload.cid = resolvedCid;
    }

    if (season) {
      eventPayload.season = season;
    }

    if (episode) {
      eventPayload.episode = episode;
    }

    if (frame) {
      eventPayload.frame = frame;
    }

    if (typeof fineTuningIndex !== 'undefined') {
      eventPayload.fineTuningIndex = fineTuningIndex;
    }

    if (typeof selectedFrameIndex !== 'undefined') {
      eventPayload.selectedFrameIndex = selectedFrameIndex;
    }

    if (editorProjectId) {
      eventPayload.editorProjectId = editorProjectId;
    }

    const currentLayerCount = Array.isArray(canvasObjects) ? canvasObjects.length : 0;
    eventPayload.canvasObjectCount = currentLayerCount;
    eventPayload.nextCanvasObjectCount = currentLayerCount + 1;

    const trimmedSearchTerm = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    if (trimmedSearchTerm) {
      eventPayload.searchTerm = trimmedSearchTerm;
    }

    trackUsageEvent('advanced_editor_add_text_layer', eventPayload);
    addText('text', true);
  }, [
    addText,
    canvasObjects,
    confirmedCid,
    cid,
    season,
    episode,
    frame,
    fineTuningIndex,
    selectedFrameIndex,
    editorProjectId,
    searchQuery,
  ]);

  const episodeLink = (() => {
    const frameNumber = Number(frame);
    const anchorFrame = Number.isFinite(frameNumber) ? Math.round(frameNumber / 10) * 10 : frame;
    const searchSuffix = encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : '';
    return `/episode/${cid}/${season}/${episode}/${anchorFrame}${searchSuffix}`;
  })();

  // ------------------------------------------------------------------------

  /* -------------------------------- New Stuff ------------------------------- */
  const [loadingCsv, setLoadingCsv] = useState();
  const [frames, setFrames] = useState();
  const params = useParams();
  const [loadedSubtitle, setLoadedSubtitle] = useState('');
  const [loadedSeason, setLoadedSeason] = useState('');
  const [loadedEpisode, setLoadedEpisode] = useState('');
  const [surroundingSubtitles, setSurroundingSubtitles] = useState(null);
  const [loadingFineTuning, setLoadingFineTuning] = useState(false);
  const [fineTuningLoadStarted, setFineTuningLoadStarted] = useState(false);
  const [fineTuningBlobs, setFineTuningBlobs] = useState([]);
  const [layerFonts, setLayerFonts] = useState({})

  useEffect(() => {
    getV2Metadata(cid).then(metadata => {
      setConfirmedCid(metadata.id)
    }).catch(error => {
      // Error getting metadata
    })
  }, [cid]);

  // setFrames
  // setLoadedSubtitle
  // setLoadedSeason
  // setLoadedEpisode

  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (frames && frames.length > 0) {
      setSelectedFrameIndex(fineTuningIndex || Math.floor(frames.length / 2))

      // Background image from the given URL
      fabric.Image.fromURL(
        fineTuningIndex ? frames[fineTuningIndex] : frames[Math.floor(frames.length / 2)],
        (oImg) => {
          setDefaultFrame(oImg);
          setDefaultSubtitle(loadedSubtitle);
          setLoading(false);
        },
        { crossOrigin: 'anonymous' }
      );
    }
  }, [frames]);

  const handleSliderChange = (newSliderValue) => {
    setSelectedFrameIndex(newSliderValue);
    fabric.Image.fromURL(
      fineTuningBlobs[newSliderValue],
      (oImg) => {
        setDefaultFrame(oImg);
        setLoading(false);
      },
      { crossOrigin: 'anonymous' }
    );
  };

  useEffect(() => {
    if (confirmedCid) {
      // Reset whitespace-related state variables
      setShowWhiteSpaceSlider(false);
      setWhiteSpaceValue(10);
      setWhiteSpaceHeight(0);

      const loadInitialFrameInfo = async () => {
        setLoading(true);
        try {
          // Fetch initial frame information including the main image and subtitle
          const initialInfo = await fetchFrameInfo(confirmedCid, season, episode, frame, { mainImage: true });
          // setFrame(initialInfo.frame_image);
          // setFrameData(initialInfo);
          // setDisplayImage(initialInfo.frame_image);
          setLoadedSubtitle(initialInfo.subtitle);
          setLoadedSeason(season);
          setLoadedEpisode(episode);
        } catch (error) {
          console.error("Failed to fetch initial frame info:", error);
        } finally {
          setLoading(false);
        }
      };

      const loadFineTuningFrames = async () => {
        try {
          // Since fetchFramesFineTuning now expects an array, calculate the array of indexes for fine-tuning
          const fineTuningImageUrls = await fetchFramesFineTuning(confirmedCid, season, episode, frame);

          // Preload the images and convert them to blob URLs
          // const fineTuningFrames = await Promise.all(
          //   fineTuningImageUrls.map(async (url) => {
          //     const response = await fetch(url);
          //     const blob = await response.blob();
          //     return URL.createObjectURL(blob);
          //   })
          // );

          setFineTuningFrames(fineTuningImageUrls);
          setFrames(fineTuningImageUrls);
        } catch (error) {
          console.error("Failed to fetch fine tuning frames:", error);
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

          Promise.all(surroundingFramePromises).then(surroundingFrames => {
            setSurroundingFrames(surroundingFrames.map(frame => ({
              ...frame,
              confirmedCid,
              season: parseInt(season, 10),
              episode: parseInt(episode, 10),
            })));
          }).catch(error => {
            console.error("Failed to fetch surrounding frames:", error);
          });
        } catch (error) {
          console.error("Failed to fetch surrounding frames:", error);
        }
      };

      window.scrollTo(0, 0);

      // Make sure the values are cleared before loading new ones: 
      // TODO: make the 'main image' show a skeleton while loading (incl. between navigations)
      setLoading(true);
      // setFrame(null);
      // setFrameData(null);
      // setDisplayImage(null);
      setLoadedSubtitle(null);
      setSelectedFrameIndex(5);
      setFineTuningFrames([]);
      setFrames([]);
      setSurroundingSubtitles([]);
      setSurroundingFrames(new Array(9).fill('loading'));
      setSurroundingFramesLoaded({});
      setLoadingFineTuning(false)
      setFineTuningLoadStarted(false)
      setFineTuningBlobs([])
      setEditorTool('captions')

      // Sequentially call the functions to ensure loading states and data fetching are managed efficiently
      loadInitialFrameInfo().then(() => {
        loadFineTuningFrames(); // Load fine-tuning frames
        loadSurroundingSubtitles(); // Separately load surrounding subtitles
        loadSurroundingFrames(); // Load surrounding frames and their subtitles (if available)
      });
    }
  }, [confirmedCid, season, episode, frame]);

  const loadFineTuningImages = () => {
    if (fineTuningFrames && !fineTuningLoadStarted) {
      setFineTuningLoadStarted(true);
      setLoadingFineTuning(true);

      // Create an array of promises for each image load
      const blobPromises = fineTuningFrames.map((url) => fetch(url)
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
    if (!defaultFrame) {
      return;
    }

    let uniqueKey;

    if (confirmedCid && season && episode && frame) {
      uniqueKey = `cid:${confirmedCid}|s:${season}|e:${episode}|f:${frame}|sel:${selectedFrameIndex ?? ''}`;
    } else if (uploadedImageSource) {
      uniqueKey = `uploaded:${uploadedImageSource}`;
    } else if (editorProjectId) {
      uniqueKey = `project:${editorProjectId}`;
    } else if (typeof defaultFrame?.getSrc === 'function') {
      uniqueKey = `src:${defaultFrame.getSrc()}`;
    } else {
      uniqueKey = `fid:${fid || ''}|selected:${selectedFid || ''}`;
    }

    if (lastTrackedAdvancedViewRef.current === uniqueKey) {
      return;
    }

    lastTrackedAdvancedViewRef.current = uniqueKey;

    const eventPayload = {
      source: 'V2EditorPage',
      fromCollage,
      imageLoaded,
    };

    if (confirmedCid) {
      eventPayload.cid = confirmedCid;
    }

    if (season) {
      eventPayload.season = season;
    }

    if (episode) {
      eventPayload.episode = episode;
    }

    if (frame) {
      eventPayload.frame = frame;
    }

    if (typeof fineTuningIndex !== 'undefined') {
      eventPayload.fineTuningIndex = fineTuningIndex;
    }

    if (typeof selectedFrameIndex !== 'undefined') {
      eventPayload.selectedFrameIndex = selectedFrameIndex;
    }

    if (uploadedImageSource) {
      eventPayload.hasUploadedImage = true;
    }

    if (editorProjectId) {
      eventPayload.editorProjectId = editorProjectId;
    }

    if (fid) {
      eventPayload.fid = fid;
    }

    const trimmedSearchTerm = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    if (trimmedSearchTerm) {
      eventPayload.searchTerm = trimmedSearchTerm;
    }

    trackUsageEvent('view_image_advanced', eventPayload);
  }, [
    defaultFrame,
    confirmedCid,
    season,
    episode,
    frame,
    fineTuningIndex,
    selectedFrameIndex,
    uploadedImageSource,
    editorProjectId,
    fromCollage,
    searchQuery,
    imageLoaded,
    fid,
    selectedFid,
  ]);

  // Add these state variables near the top of your component, with the other useState declarations
  const [showWhiteSpaceSlider, setShowWhiteSpaceSlider] = useState(false);
  const [whiteSpaceValue, setWhiteSpaceValue] = useState(20);
  const [whiteSpaceHeight, setWhiteSpaceHeight] = useState(0);
  const [whiteSpacePreview, setWhiteSpacePreview] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  // Add this function to handle white space changes
  const handleWhiteSpaceChange = (newValue) => {
    const newWhiteSpaceHeight = (newValue / 100) * canvasSize.height;
    setWhiteSpacePreview(newWhiteSpaceHeight);
  };

  const startWhiteSpaceChange = () => {
    setIsSliding(true);
    // Remove whitespace from canvas and reposition elements
    if (editor) {
      editor.canvas.getObjects().forEach((obj) => {
        obj.set('top', obj.top - whiteSpaceHeight);
      });
      if (editor.canvas.backgroundImage) {
        editor.canvas.backgroundImage.set('top', editor.canvas.backgroundImage.top - whiteSpaceHeight);
      }
      editor.canvas.renderAll();
    }
  };

  const applyWhiteSpace = () => {
    setIsSliding(false);
    const newHeight = canvasSize.height + whiteSpacePreview;
    
    if (editor) {
      editor.canvas.setHeight(newHeight);
      editor.canvas.getObjects().forEach((obj) => {
        obj.set('top', obj.top + whiteSpacePreview);
      });
      if (editor.canvas.backgroundImage) {
        editor.canvas.backgroundImage.set('top', editor.canvas.backgroundImage.top + whiteSpacePreview);
      }
      editor.canvas.renderAll();
    }

    setWhiteSpaceHeight(whiteSpacePreview);
    addToHistory();
  };

  const toggleWhiteSpaceSlider = () => {
    if (!showWhiteSpaceSlider) {
      setShowWhiteSpaceSlider(true);
      const defaultWhiteSpaceValue = 20;
      setWhiteSpaceValue(defaultWhiteSpaceValue);
      const newWhiteSpaceHeight = (defaultWhiteSpaceValue / 100) * canvasSize.height;
      setWhiteSpacePreview(newWhiteSpaceHeight);
      
      // Apply the default whitespace immediately
      if (editor) {
        const newHeight = canvasSize.height + newWhiteSpaceHeight;
        editor.canvas.setHeight(newHeight);
        editor.canvas.getObjects().forEach((obj) => {
          obj.set('top', obj.top + newWhiteSpaceHeight);
        });
        if (editor.canvas.backgroundImage) {
          editor.canvas.backgroundImage.set('top', editor.canvas.backgroundImage.top + newWhiteSpaceHeight);
        }
        editor.canvas.renderAll();
      }
      setWhiteSpaceHeight(newWhiteSpaceHeight);
      addToHistory();
    } else {
      setShowWhiteSpaceSlider(false);
      if (editor) {
        const newHeight = canvasSize.height - whiteSpaceHeight;
        editor.canvas.setHeight(newHeight);
        editor.canvas.getObjects().forEach((obj) => {
          obj.set('top', obj.top - whiteSpaceHeight);
        });
        if (editor.canvas.backgroundImage) {
          editor.canvas.backgroundImage.set('top', editor.canvas.backgroundImage.top - whiteSpaceHeight);
        }
        editor.canvas.renderAll();
      }
      setWhiteSpaceHeight(0);
      setWhiteSpacePreview(0);
      addToHistory();
    }
  };

  const updateCanvasSize = useCallback((heightDifference) => {
    if (editor && canvasSize) {
      const newHeight = canvasSize.height + whiteSpaceHeight;
      editor.canvas.setHeight(newHeight);
      editor.canvas.setWidth(canvasSize.width);

      // Move all objects by the height difference
      editor.canvas.getObjects().forEach((obj) => {
        obj.set('top', obj.top + heightDifference);
      });

      // Move the background image
      if (editor.canvas.backgroundImage) {
        editor.canvas.backgroundImage.set('top', editor.canvas.backgroundImage.top + heightDifference);
      }

      editor.canvas.renderAll();
    }
  }, [editor, canvasSize, whiteSpaceHeight]);

  useEffect(() => {
    updateCanvasSize(0);
  }, [whiteSpaceHeight, updateCanvasSize]);

  // Add this near the top of the component, with other useEffects
  useEffect(() => {
    if (location.state?.fromCollage && location.state?.collageImageFile) {
      const file = location.state.collageImageFile;
      addImageLayer(file);
    }
  }, [location.state]);

  // Add this state near other useState declarations
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const showAds = shouldShowAds(user);

  return (
    <>
      <Helmet>
        <title>Edit • memeSRC</title>
      </Helmet>
      <Container maxWidth='xl' disableGutters sx={{ px: { xs: 2, sm: 3, md: 6, lg: 8, xl: 12 } }}>
        <ParentContainer sx={{ pt: { xs: 1.5, md: 2 } }} id="parent-container">

          {showAds && (
            <Grid container>
              <Grid item xs={12} mb={3}>
                <center>
                  <Box>
                    {isMobile ? <FixedMobileBannerAd /> : <HomePageBannerAd />}
                    <Link to="/pro" style={{ textDecoration: 'none' }}>
                      <Typography variant="body2" textAlign="center" color="white" sx={{ marginTop: 1 }}>
                        ☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
                      </Typography>
                    </Link>
                  </Box>
                </center>
              </Grid>
            </Grid>
          )}

          <Card sx={{ padding: { xs: 1.5, md: 2 } }}>
            <Grid container spacing={2}>

              {/* Editor */}

              <Grid item xs={12} md={7} lg={7} marginRight={{ xs: '', md: 'auto' }}>
                <Grid container item mb={1.5}>
                  <Grid item xs={12}>
                    <Stack direction='column' width='100%' spacing={1}>
                      <Stack direction='row' width='100%' justifyContent='space-between' alignItems='center'>
                        <ButtonGroup variant="contained" size="small">
                          <IconButton
                            disabled={(editorStates.length <= 1)}
                            onClick={undo}
                            aria-label="undo"
                          >
                            <Undo />
                          </IconButton>
                          <IconButton
                            disabled={(futureStates.length === 0)}
                            onClick={redo}
                            aria-label="redo"
                          >
                            <Redo />
                          </IconButton>
                        </ButtonGroup>

                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={<Save />}
                          onClick={handleClickDialogOpen}
                          sx={{ zIndex: '50', backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
                        >
                          Save
                        </Button>
                      </Stack>

                      <Button
                        variant="contained"
                        fullWidth
                        onClick={toggleWhiteSpaceSlider}
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
                        Add White Space
                      </Button>

                      {showWhiteSpaceSlider && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>Whitespace</Typography>
                          <Slider
                            value={whiteSpacePreview / canvasSize.height * 100}
                            onChange={(event, newValue) => handleWhiteSpaceChange(newValue)}
                            onChangeCommitted={applyWhiteSpace}
                            onMouseDown={startWhiteSpaceChange}
                            onTouchStart={startWhiteSpaceChange}
                            aria-labelledby="white-space-slider"
                            valueLabelDisplay="auto"
                            min={0}
                            max={100}
                            step={1}
                            sx={{ flexGrow: 1, zIndex: 100 }}
                            valueLabelFormat={(value) => `${Math.round(value)}%`}
                          />
                          <IconButton onClick={toggleWhiteSpaceSlider} aria-label="close">
                            <Close />
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
                <div style={{ width: '100%', padding: 0, margin: 0, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }} id="canvas-container">
                  {showWhiteSpaceSlider && isSliding && (
                    <div 
                      style={{
                        width: '100%',
                        height: `${whiteSpacePreview}px`,
                        backgroundColor: 'white',
                        transition: 'height 0.05s ease-out'
                      }}
                    />
                  )}
                  <div style={{ height: isSliding ? canvasSize.height : (canvasSize.height + whiteSpaceHeight) }}>
                    <FabricJSCanvas onReady={onReady} />
                    {showBrushSize &&
                      <div style={{
                        width: brushToolSize,
                        height: brushToolSize,
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        background: 'red',
                        borderColor: 'black',
                        borderStyle: 'solid',
                        borderWidth: '1px',
                        boxShadow: '0 7px 10px rgba(0, 0, 0, 0.75)'
                      }} />
                    }
                  </div>
                </div>


                {/* <button type='button' onClick={addImage}>Add Image</button>
                                    <button type='button' onClick={saveProject}>Save Project</button>
                                    <button type='button' onClick={loadProject}>Load Project</button>
                                    <button type='button' onClick={handleClickDialogOpen}>Save Image</button> */}
              </Grid>

              {/* Editing Tools */}

              <Grid item xs={12} md={5}>
                <Stack width='100%' spacing={1}>
                  <Tabs
                    value={editorTool}
                    onChange={(event, value) => {
                      setEditorTool(value);
                      toggleDrawingMode(value);
                    }}
                    centered
                    TabIndicatorProps={{
                      style: {
                        backgroundColor: 'limegreen',
                        height: '3px',
                      }
                    }}
                  >
                    {frames?.length > 0 &&
                      <Tab
                        style={{
                          opacity: editorTool === "fineTuning" ? 1 : 0.4,
                          color: editorTool === "fineTuning" ? "limegreen" : "white"
                        }}
                        icon={
                          <Box display="flex" alignItems="center" marginX={-1}>
                            <HistoryToggleOffRounded fontSize='small' sx={{ mr: 1 }} />
                            Timing
                          </Box>
                        }
                        value="fineTuning"
                      />
                    }
                    <Tab
                      style={{
                        opacity: editorTool === "captions" ? 1 : 0.4,
                        color: editorTool === "captions" ? "limegreen" : "white"
                      }}
                      icon={
                        <Box display="flex" alignItems="center" marginX={-1}>
                          <ClosedCaption fontSize='small' sx={{ mr: 1 }} />
                          Captions
                        </Box>
                      }
                      value="captions"
                    />
                    <Tab
                      ref={magicToolsButtonRef}
                      style={{
                        opacity: editorTool === "magicEraser" ? 1 : 0.4,
                        color: editorTool === "magicEraser" ? "limegreen" : "white"
                      }}
                      icon={
                        <Box display="flex" alignItems="center" marginX={-1}>
                          <AutoFixHighRounded fontSize='small' sx={{ mr: 1 }} />
                          Magic
                        </Box>
                      }
                      value="magicEraser"
                      onClick={(event) => {
                        if (!user || user?.userDetails?.credits <= 0) {
                          setMagicToolsPopoverAnchorEl(event.currentTarget);
                          setEditorTool('captions')
                        }
                      }}
                    />
                  </Tabs>

                  {editorTool === 'captions' && (
                    <>
                      {canvasObjects &&
                        canvasObjects.map((object, index) => (
                          <Fragment key={`layer-${index}`}>
                            {'text' in object && (
                              <Grid item xs={12} order={index} marginBottom={1} style={{ marginLeft: '10px' }}>
                                <div style={{ display: 'inline', position: 'relative' }}>
                              <TextEditorControls
                                showColorPicker={(colorType, index, event) => showColorPicker(colorType, index, event)}
                                colorPickerShowing={colorPickerShowing}
                                index={index}
                                showFontSizePicker={(event) => showFontSizePicker(event, index)}
                                    fontSizePickerShowing={fontSizePickerShowing}
                                    handleStyle={handleStyle}
                                    handleFontChange={handleFontChange}
                                    layerFonts={layerFonts}
                                    setLayerFonts={setLayerFonts}
                                layerColor={object.fill}
                                layerStrokeColor={object.stroke}
                                handleAlignment={handleAlignment}
                                activeFormats={layerActiveFormats[index] || []}
                              />
                            </div>
                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                  <TextField
                                    size="small"
                                    multiline
                                    type="text"
                                    value={layerRawText[index] ?? object.text}
                                    fullWidth
                                    onFocus={() => handleFocus(index)}
                                    onBlur={addToHistory}
                                    onChange={(event) => handleEdit(event, index)}
                                    onSelect={() => syncActiveFormatsFromSelection(index)}
                                    onKeyUp={() => syncActiveFormatsFromSelection(index)}
                                    onMouseUp={() => syncActiveFormatsFromSelection(index)}
                                    placeholder='(type your caption)'
                                    inputRef={(el) => {
                                      if (el) {
                                        textFieldRefs.current[index] = el;
                                      }
                                    }}
                                    InputProps={{
                                      style: {
                                        fontFamily: layerFonts[index] || 'Arial',
                                      },
                                    }}
                                  />
                                  <Fab
                                    size="small"
                                    aria-label="delete"
                                    sx={{
                                      marginLeft: '10px',
                                      backgroundColor: theme.palette.background.paper,
                                      boxShadow: 'none'
                                    }}
                                    onClick={() => handleDeleteLayer(index)}
                                  >
                                    <HighlightOffRounded color="error" />
                                  </Fab>
                                </div>
                              </Grid>
                            )}
                            {object.type === 'image' && (
                              <Grid item xs={12} order={index} marginBottom={1} style={{ marginLeft: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                  {/* Placeholder for image layer UI */}
                                  <div style={{ display: 'inline', position: 'relative' }}>
                                    {/* Settings for the image layer, such as resizing and repositioning */}
                                    {/* Implement ImageEditorControls according to your app's functionality */}
                                    <ImageEditorControls
                                      index={index}
                                      deleteLayer={handleDeleteLayer} // Implement this function to handle layer deletion
                                      moveLayerUp={moveLayerUp} // Implement this function to handle moving the layer up
                                      moveLayerDown={moveLayerDown} // Implement this function to handle moving the layer down
                                      src={object.src}
                                    />
                                  </div>
                                  {/* Button to remove the image layer */}
                                  <Fab
                                    size="small"
                                    aria-label="delete"
                                    sx={{
                                      marginLeft: '10px',
                                      backgroundColor: theme.palette.background.paper,
                                      boxShadow: 'none'
                                    }}
                                    onClick={() => handleDeleteLayer(index)}
                                  >
                                    <HighlightOffRounded color="error" />
                                  </Fab>
                                </div>
                              </Grid>
                            )}
                          </Fragment>
                        ))
                      }
                      <Grid item xs={12} order={canvasObjects?.length} key="add-text-layer-button">
                        <Button
                          variant="contained"
                          onClick={handleAddTextLayer}
                          fullWidth
                          sx={{
                            zIndex: '50',
                            marginTop: '20px',
                            color: '#e5e7eb',
                            background: 'linear-gradient(45deg, #1f2937 30%, #374151 90%)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #253042 30%, #3f4856 90%)',
                              borderColor: 'rgba(255, 255, 255, 0.24)',
                            },
                          }}
                          startIcon={<AddCircleOutline />}
                        >
                          Add text layer
                        </Button>
                      </Grid>
                      {/* <Grid item xs={12} order={canvasObjects?.length + 1} key="add-image-layer-button">
                        <input
                          type="file"
                          onChange={(e) => addImageLayer(e.target.files[0])}
                          style={{ display: 'none' }}
                          ref={fileInputRef}
                        />
                        <Button
                          variant="contained"
                          onClick={() => fileInputRef.current.click()}
                          fullWidth
                          sx={{ zIndex: '50', marginBottom: '20px' }}
                          startIcon={<AddPhotoAlternate />}
                        >
                          Add image layer
                        </Button>
                      </Grid> */}
                    </>
                  )}



                  {editorTool === 'fineTuning' && (
                    <>
                      <Slider
                        size="small"
                        defaultValue={selectedFrameIndex || Math.floor(frames.length / 2)}
                        min={0}
                        max={frames.length - 1}
                        value={selectedFrameIndex}
                        step={1}
                        onMouseDown={loadFineTuningImages}
                        onTouchStart={loadFineTuningImages}
                        onChange={(e, newValue) => handleSliderChange(newValue)}
                        onChangeCommitted={(e, value) => {navigate(`/editor/${cid}/${season}/${episode}/${frame}/${value}${encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : ''}`)}}
                        valueLabelFormat={(value) => `Fine Tuning: ${((value - 4) / 10).toFixed(1)}s`}
                        marks
                        disabled={loadingFineTuning}
                      />
                      {loadingFineTuning && <LinearProgress />}
                    </>
                  )}

                  {editorTool === 'magicEraser' && (
                    <>
                      {promptEnabled === 'edit' ? (
                        <>
                          {/* Main Magic Edit Interface */}
                          <Box>
                            {!rateLimitState.nanoAvailable && (
                              <Alert severity="warning" sx={{ mb: 2 }}>
                                Magic tools are temporarily unavailable. {rateLimitState.openaiAvailable ? 'Switch to classic tools below.' : 'Please try again later.'}
                              </Alert>
                            )}
                            {/* Input field comes first */}
                            <TextField
                              fullWidth
                              placeholder={magicPlaceholder}
                              value={magicPrompt}
                              onChange={(event) => setMagicPrompt(event.target.value)}
                              onFocus={() => setMagicPromptFocused(true)}
                              onBlur={() => setMagicPromptFocused(false)}
                              disabled={loadingInpaintingResult || !rateLimitState.nanoAvailable}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (magicPrompt?.trim() && !loadingInpaintingResult) {
                                    magicPromptInputRef.current?.blur();
                                    handleMagicEdit();
                                  }
                                }
                              }}
                              inputRef={magicPromptInputRef}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <AutoFixHighRounded sx={{ color: loadingInpaintingResult ? 'grey.500' : 'primary.main' }} />
                                  </InputAdornment>
                                ),
                                endAdornment: (
                                  <InputAdornment position="end">
                                    {magicPrompt?.length && !loadingInpaintingResult ? (
                                      <IconButton
                                        aria-label="clear prompt"
                                        size="small"
                                        onClick={() => setMagicPrompt('')}
                                        edge="end"
                                        sx={{ mr: 0.5 }}
                                      >
                                        <Close fontSize="small" />
                                      </IconButton>
                                    ) : null}
                                    {loadingInpaintingResult ? (
                                      <CircularProgress size={18} thickness={5} sx={{ ml: 0.5 }} />
                                    ) : (
                                      <IconButton
                                        aria-label="send prompt"
                                        size="small"
                                        onClick={() => {
                                      if (magicPrompt?.trim() && !loadingInpaintingResult && rateLimitState.nanoAvailable) {
                                        magicPromptInputRef.current?.blur();
                                        handleMagicEdit();
                                      }
                                    }}
                                    disabled={!magicPrompt?.trim() || loadingInpaintingResult || !rateLimitState.nanoAvailable}
                                    edge="end"
                                    color={magicPrompt?.trim() && !loadingInpaintingResult && rateLimitState.nanoAvailable ? 'primary' : 'default'}
                                    sx={{ ml: 0.5, color: magicPrompt?.trim() && !loadingInpaintingResult && rateLimitState.nanoAvailable ? 'primary.main' : undefined, cursor: (!magicPrompt?.trim() || loadingInpaintingResult || !rateLimitState.nanoAvailable) ? 'not-allowed' : undefined }}
                                  >
                                    <Send />
                                  </IconButton>
                                    )}
                                  </InputAdornment>
                                ),
                              }}
                              inputProps={{ 'aria-label': 'Magic edit prompt' }}
                              sx={{
                                mb: 1.5,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  backgroundColor: '#fff',
                                },
                                '& .MuiOutlinedInput-root.Mui-disabled': {
                                  backgroundColor: '#f5f5f5',
                                },
                                '& .MuiOutlinedInput-input': {
                                  color: 'rgba(0,0,0,0.9)',
                                  fontWeight: 600,
                                },
                                '& .MuiOutlinedInput-input.Mui-disabled': {
                                  color: 'rgba(0,0,0,0.55)',
                                  WebkitTextFillColor: 'rgba(0,0,0,0.55)',
                                },
                                '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'rgba(0,0,0,0.12)',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                  color: 'rgba(0,0,0,0.5)',
                                  opacity: 1,
                                  fontWeight: 500,
                                },
                              }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                              {magicReferences.map((src, idx) => (
                                <Box key={`${src}-${idx}`} sx={{ position: 'relative' }}>
                                  <Box
                                    component="img"
                                    src={src}
                                    alt={`Ref ${idx + 1}`}
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      objectFit: 'cover',
                                      borderRadius: 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    aria-label="Remove reference"
                                    onClick={() => removeMagicReference(idx)}
                                    sx={{
                                      position: 'absolute',
                                      top: -10,
                                      right: -10,
                                      bgcolor: 'background.paper',
                                      boxShadow: 1,
                                      '&:hover': { bgcolor: 'grey.100' },
                                    }}
                                  >
                                    <Close fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                          {/* References temporarily disabled
                          {magicReferences.length < MAGIC_MAX_REFERENCES && (
                            <Button
                              variant="text"
                              size="small"
                              startIcon={<AddPhotoAlternate />}
                              onClick={() => magicReferenceInputRef.current?.click()}
                              disabled={loadingInpaintingResult || !rateLimitState.nanoAvailable}
                              sx={{ minWidth: 0, px: 0.5 }}
                            >
                              Add ref
                            </Button>
                          )}
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Optional refs; main image stays primary.
                          </Typography>
                          */}
                        </Box>
                        <input
                          ref={magicReferenceInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              hidden
                              onChange={(e) => {
                                void handleMagicReferenceFiles(e.target.files);
                                if (magicReferenceInputRef.current) {
                                  magicReferenceInputRef.current.value = '';
                                }
                              }}
                            />

                            {/* Label that leads into suggestions */}
                            <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                              Or tap a suggestion to try it:
                            </Typography>

                            {/* Suggestion Chips */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                              {[
                                "Remove the text",
                                "Zoom in",
                                "Zoom out",
                                "Add a tophat",
                                "Add sunglasses",
                                "Censor the faces",
                                "Add a beard",
                                "Add a mustache",
                                "Make it black and white"           
                              ].map((suggestion) => (
                                <Chip
                                  key={suggestion}
                                  label={suggestion}
                                  onClick={() => {
                                    setMagicPrompt(suggestion);
                                    magicPromptInputRef.current?.focus();
                                  }}
                                  disabled={loadingInpaintingResult}
                                  sx={{
                                    borderRadius: 2,
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                                    color: 'primary.main',
                                    border: '1px solid rgba(25, 118, 210, 0.2)',
                                    '&:hover': {
                                      bgcolor: 'rgba(25, 118, 210, 0.15)',
                                      borderColor: 'primary.main',
                                      transform: 'translateY(-1px)',
                                    },
                                    '&.Mui-disabled': {
                                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                                      color: 'rgba(0, 0, 0, 0.26)',
                                      borderColor: 'rgba(0, 0, 0, 0.12)',
                                    },
                                  }}
                                />
                              ))}
                            </Box>

                            {/* Small link to switch to classic */}
                            <Box sx={{ textAlign: 'center', pt: 2, pb: 1 }}>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => {
                                  setPromptEnabled('erase');
                                }}
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.75rem',
                                  textTransform: 'none',
                                  textDecoration: 'underline',
                                  '&:hover': {
                                    color: 'primary.main',
                                    backgroundColor: 'transparent',
                                    textDecoration: 'underline',
                                  },
                                }}
                              >
                                Switch to classic Erase & Fill
                              </Button>
                            </Box>
                          </Box>
                        </>
                      ) : (
                        <>
                          {/* Classic Tools Interface */}
                          <Box sx={{ mb: 2 }}>
                            {/* Back to Magic Edit button */}
                            <Button
                              variant="outlined"
                              fullWidth
                              onClick={() => {
                                setPromptEnabled('edit');
                                toggleDrawingMode('captions');
                              }}
                              disabled={!rateLimitState.nanoAvailable}
                              startIcon={<AutoFixHighRounded />}
                              sx={{
                                mb: 2,
                                py: 1.25,
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                fontWeight: 600,
                                '&:hover': {
                                  borderColor: 'primary.dark',
                                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                },
                              }}
                            >
                              Back to Magic Edit
                            </Button>

                            {!rateLimitState.openaiAvailable && (
                              <Alert severity="warning" sx={{ mb: 2 }}>
                                Classic magic tools are temporarily unavailable. Please try again later.
                              </Alert>
                            )}

                            {/* Login prompt for unauthenticated users */}
                            {(!user || user?.userDetails?.credits <= 0) && (
                              <Box sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: 'rgba(76, 175, 80, 0.08)',
                                border: '1px solid rgba(76, 175, 80, 0.3)',
                                mb: 2,
                                textAlign: 'center'
                              }}>
                                <Typography variant="body2" sx={{ mb: 1.5, color: 'rgb(46, 125, 50)', fontWeight: 600 }}>
                                  {!user ? 'Sign in to use Magic Tools' : 'Get more credits for Magic Tools'}
                                </Typography>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  component={Link}
                                  to="/pro"
                                  sx={{
                                    bgcolor: 'rgb(76, 175, 80)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    py: 1,
                                    '&:hover': {
                                      bgcolor: 'rgb(56, 142, 60)',
                                    }
                                  }}
                                >
                                  {!user ? 'Sign In / Sign Up' : 'Get More Credits'}
                                </Button>
                              </Box>
                            )}

                            <Box sx={{
                              p: 1.5,
                              borderRadius: 1,
                              bgcolor: 'rgba(255, 152, 0, 0.08)',
                              border: '1px solid rgba(255, 152, 0, 0.2)',
                              mb: 2
                            }}>
                              <Typography variant="caption" sx={{ display: 'block', color: 'rgb(230, 81, 0)', lineHeight: 1.4, fontSize: '0.75rem', fontWeight: 600 }}>
                                ⚠️ Classic magic tools may produce lower quality results.{' '}
                                <Typography
                                  component="span"
                                  variant="caption"
                                  onClick={() => {
                                    setPromptEnabled('edit');
                                    toggleDrawingMode('captions');
                                  }}
                                  sx={{
                                    color: 'rgb(230, 81, 0)',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    '&:hover': {
                                      color: 'rgb(200, 61, 0)',
                                    }
                                  }}
                                >
                                  Try the new editor
                                </Typography>
                              </Typography>
                            </Box>

                            <ButtonGroup variant="outlined" fullWidth sx={{ mb: 2.5 }}>
                              <Button
                                onClick={() => {
                                  setPromptEnabled('erase');
                                  toggleDrawingMode('magicEraser');
                                }}
                                disabled={!rateLimitState.openaiAvailable}
                                sx={{
                                  flex: 1,
                                  py: 1.25,
                                  borderColor: promptEnabled === 'erase' ? 'primary.main' : 'rgba(0,0,0,0.12)',
                                  backgroundColor: promptEnabled === 'erase' ? 'primary.main' : 'transparent',
                                  color: promptEnabled === 'erase' ? '#fff' : 'text.secondary',
                                  fontWeight: promptEnabled === 'erase' ? 600 : 500,
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: promptEnabled === 'erase' ? 'primary.dark' : 'rgba(25, 118, 210, 0.04)',
                                  },
                                }}
                              >
                                <Stack direction="column" spacing={0.25} alignItems="center">
                                  <AutoFixHigh fontSize='small' />
                                  <Typography variant="caption" sx={{ fontWeight: 'inherit', fontSize: '0.75rem' }}>Erase</Typography>
                                </Stack>
                              </Button>
                              <Button
                                onClick={() => {
                                  setPromptEnabled('fill');
                                  toggleDrawingMode('magicEraser');
                                }}
                                disabled={!rateLimitState.openaiAvailable}
                                sx={{
                                  flex: 1,
                                  py: 1.25,
                                  borderColor: promptEnabled === 'fill' ? 'primary.main' : 'rgba(0,0,0,0.12)',
                                  backgroundColor: promptEnabled === 'fill' ? 'primary.main' : 'transparent',
                                  color: promptEnabled === 'fill' ? '#fff' : 'text.secondary',
                                  fontWeight: promptEnabled === 'fill' ? 600 : 500,
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: promptEnabled === 'fill' ? 'primary.dark' : 'rgba(25, 118, 210, 0.04)',
                                  },
                                }}
                              >
                                <Stack direction="column" spacing={0.25} alignItems="center">
                                  <FormatColorFill fontSize='small' />
                                  <Typography variant="caption" sx={{ fontWeight: 'inherit', fontSize: '0.75rem' }}>Fill</Typography>
                                </Stack>
                              </Button>
                            </ButtonGroup>

                            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                              {promptEnabled === 'erase' ? (
                                'Paint over unwanted areas, then click Apply.'
                              ) : (
                                'Paint areas to modify and describe what to add below, then click Apply.'
                              )}
                            </Typography>

                            {promptEnabled === "fill" && (
                              <TextField
                                value={magicPrompt}
                                onChange={(event) => {
                                  setMagicPrompt(event.target.value);
                                }}
                                fullWidth
                                size="small"
                                placeholder="Describe what to fill with..."
                                sx={{
                                  mb: 2,
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#fff',
                                  },
                                  '& .MuiOutlinedInput-input': {
                                    color: 'rgba(0,0,0,0.87)',
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: 'rgba(0,0,0,0.6)',
                                  },
                                  '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'primary.main',
                                  },
                                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                  },
                                }}
                                label='What to fill with'
                              />
                            )}

                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                                Brush Size
                              </Typography>
                              <Slider
                                size="medium"
                                min={1}
                                max={100}
                                value={brushToolSize}
                                aria-label="Brush size"
                                valueLabelDisplay='auto'
                                onChange={(event, value) => {
                                  setShowBrushSize(true);
                                  handleBrushToolSize(value);
                                }}
                                onChangeCommitted={() => {
                                  setShowBrushSize(false);
                                }}
                                sx={{
                                  color: 'primary.main',
                                  '& .MuiSlider-thumb': {
                                    backgroundColor: 'primary.main',
                                  },
                                  '& .MuiSlider-track': {
                                    backgroundColor: 'primary.main',
                                  },
                                }}
                              />
                            </Box>

                            <Button
                              variant='contained'
                              fullWidth
                              size="large"
                              disabled={!hasFabricPaths || loadingInpaintingResult || !rateLimitState.openaiAvailable}
                              onClick={() => {
                                exportDrawing();
                              }}
                              startIcon={loadingInpaintingResult ? <CircularProgress size={18} color="inherit" /> : <AutoFixHighRounded />}
                              sx={{
                                py: 1.5,
                                fontWeight: 600,
                                backgroundColor: hasFabricPaths && rateLimitState.openaiAvailable ? 'primary.main' : 'grey.400',
                                '&:hover': {
                                  backgroundColor: hasFabricPaths && rateLimitState.openaiAvailable ? 'primary.dark' : 'grey.400',
                                },
                                '&.Mui-disabled': {
                                  backgroundColor: 'grey.300',
                                  color: 'rgba(0,0,0,0.26)',
                                },
                              }}
                            >
                              {loadingInpaintingResult ? 'Processing...' : hasFabricPaths ? (rateLimitState.openaiAvailable ? 'Apply Changes' : 'Classic Magic Tools are temporarily unavailable') : 'Paint on canvas to start'}
                            </Button>
                          </Box>
                        </>
                      )}
                    </>
                  )}

                </Stack>
              </Grid>


              {/* Surrounding Frames Grid */}


              <Grid
                item
                xs={12}
                md={7}
                lg={7}
                marginRight={{ xs: '', md: 'auto' }}
                marginTop={{ xs: -2.5, md: -1.5 }}
              >

                {/* Big Share Button */}

                <Grid item xs={12} marginBottom={2} order={2}>
                  <Button
                    variant="contained"
                    onClick={handleClickDialogOpen}
                    fullWidth
                    sx={{ marginTop: 2, zIndex: '50', backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
                    startIcon={<Share />}
                    size="large"
                  >
                    Save
                  </Button>
                </Grid>

                {user?.userDetails?.subscriptionStatus !== 'active' &&
                  <Grid item xs={12} my={2}>
                    <center>
                        <FixedMobileBannerAd />
                    </center>
                  </Grid>
                }

                {surroundingFrames && surroundingFrames.length > 0 && (
                  <Card sx={{ my: 2 }}>
                    <Accordion expanded={subtitlesExpanded} disableGutters>
                      <AccordionSummary sx={{ paddingX: 1.55, textAlign: "center" }} onClick={handleSubtitlesExpand} >
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
                          {surroundingSubtitles &&
                            surroundingSubtitles
                              .map((result, index) => (
                                <ListItem key={result.id ? result.id : `surrounding-subtitle-${index}`} disablePadding sx={{ padding: '0 0 .6em 0' }}>
                                  <ListItemIcon sx={{ paddingLeft: '0' }}>
                                    <Fab
                                      size="small"
                                      sx={{
                                        backgroundColor: theme.palette.background.paper,
                                        boxShadow: 'none',
                                        marginLeft: '5px',
                                        '&:hover': {
                                          xs: { backgroundColor: 'inherit' },
                                          md: {
                                            backgroundColor:
                                              result?.subtitle.replace(/\n/g, ' ') ===
                                                defaultSubtitle?.replace(/\n/g, ' ')
                                                ? 'rgba(0, 0, 0, 0)'
                                                : 'ButtonHighlight',
                                          },
                                        },
                                      }}
                                      onClick={() => handleOpenNavWithoutSavingDialog(cid, season, episode, result.frame)}
                                    >
                                      {loading ? (
                                        <CircularProgress size={20} sx={{ color: '#565656' }} />
                                      ) : result?.subtitle.replace(/\n/g, ' ') ===
                                        defaultSubtitle?.replace(/\n/g, ' ') ? (
                                        <GpsFixed
                                          sx={{
                                            color:
                                              result?.subtitle.replace(/\n/g, ' ') ===
                                                defaultSubtitle?.replace(/\n/g, ' ')
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
                                        result?.subtitle.replace(/\n/g, ' ') === defaultSubtitle?.replace(/\n/g, ' ')
                                          ? 'rgb(202, 202, 202)'
                                          : ''
                                      }
                                      fontWeight={
                                        result?.subtitle.replace(/\n/g, ' ') === defaultSubtitle?.replace(/\n/g, ' ')
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
                                    <Fab
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
                                    </Fab>
                                    {/* <Fab
                                                                              size="small"
                                                                              sx={{
                                                                                  backgroundColor: theme.palette.background.paper,
                                                                                  boxShadow: "none",
                                                                                  marginLeft: '5px',
                                                                                  '&:hover': {xs: {backgroundColor: 'inherit'}, md: {backgroundColor: (result?.subtitle.replace(/\n/g, " ") === defaultSubtitle?.replace(/\n/g, " ")) ? 'rgba(0, 0, 0, 0)' : 'ButtonHighlight'}}
                                                                              }}
                                                                              onClick={() => navigate(`/editor/${result?.fid}`)}
                                                                          >
                                                                          {loading ? (
                                                                              <CircularProgress size={20} sx={{ color: "#565656"}} />
                                                                          ) : (
                                                                              (result?.subtitle.replace(/\n/g, " ") === defaultSubtitle.replace(/\n/g, " ")) ? <GpsFixed sx={{ color: (result?.subtitle.replace(/\n/g, " ") === defaultSubtitle?.replace(/\n/g, " ")) ? 'rgb(50, 50, 50)' : 'rgb(89, 89, 89)', cursor: "pointer"}} /> : <ArrowForward sx={{ color: "rgb(89, 89, 89)", cursor: "pointer"}} /> 
                                                                          )}
                                                                          </Fab> */}
                                  </ListItemIcon>
                                </ListItem>
                              ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  </Card>
                )}
                <Dialog
                  componentsProps={{
                    backdrop: {
                      style: { backgroundColor: 'rgba(0, 0, 0, 0.3)' }, // Adjust the opacity as needed
                    },
                  }}
                  open={openNavWithoutSavingDialog}
                  onClose={() => setOpenNavWithoutSavingDialog(false)}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">{"Unsaved Changes"}</DialogTitle>
                  <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                      If you leave this frame, your edits will be lost.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setOpenNavWithoutSavingDialog(false)} color="primary">
                      Cancel
                    </Button>
                    <Button onClick={() => handleNavigate(cid, season, episode, selectedNavItemFid)} color="primary" autoFocus>
                      Leave
                    </Button>
                  </DialogActions>
                </Dialog>
              </Grid>

            </Grid>
            <Grid container item spacing={1}>
              {surroundingFrames?.map((surroundingFrame, index) => (
                <Grid item xs={4} sm={4} md={12 / 9} key={`surrounding-frame-${surroundingFrame?.frame ? surroundingFrame?.frame : index}`}>
                {surroundingFrame !== 'loading' ? (
                  // Render the actual content if the surrounding frame data is available
                  <Box component="div" sx={{ textDecoration: 'none' }}>
                    <EditorSurroundingFrameThumbnail
                      baseMeta={editorImageIntentBaseMeta}
                      frameData={surroundingFrame}
                      index={index}
                      activeFrame={frame}
                      cid={cid}
                      season={season}
                      episode={episode}
                      searchTerm={editorImageIntentBaseMeta.searchTerm}
                      onNavigate={() => {
                        navigate(`/editor/${cid}/${season}/${episode}/${surroundingFrame.frame}${encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : ''}`);
                      }}
                      onLoad={() => handleSurroundingFrameLoad(index)}
                      onError={() => handleSurroundingFrameError(index)}
                      isLoaded={Boolean(surroundingFramesLoaded[index])}
                    />
                  </Box>
                ) : (
                  // Render a skeleton if the data is not yet available (undefined)
                    <Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio: `${editorAspectRatio === 1 ? (16 / 9) : editorAspectRatio}/1` }} />
                  )}
                </Grid>
              ))}
              {surroundingFrames?.length > 0 && (
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    component={Link}
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
              )}
            </Grid>
          </Card>

          <Popover
            open={colorPickerShowing !== false}
            anchorEl={colorPickerAnchorEl}
            onClose={() => {
              setColorPickerShowing(false);
              setColorPickerAnchorEl(null);
            }}
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
            <ColorPickerPopover>
            <TwitterPickerWrapper
              onChange={(color) => changeColor(color, pickingColor)}
              color={colorPickerColor}
              colors={[
                '#FFFFFF', // White (unchanged)
                '#FFFF00', // Yellow (unchanged)
                '#000000', // Black (unchanged)
                '#FF4136', // Bright Red
                '#2ECC40', // Bright Green
                '#0052CC', // Darker Blue
                '#FF851B', // Bright Orange
                '#B10DC9', // Bright Purple
                '#39CCCC', // Bright Cyan
                '#F012BE', // Bright Magenta
              ]}
              width="280px"
            />
            </ColorPickerPopover>
          </Popover>

          <Popover
            open={fontSizePickerShowing !== false}
            anchorEl={fontSizePickerAnchor}
            onClose={() => setFontSizePickerShowing(false)}
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
            <StyledLayerControlCard>
              <Typography variant="body1">Font Size</Typography>
              <Slider
                size="small"
                defaultValue={selectedFontSize}
                min={1}
                max={400}
                aria-label="Small"
                valueLabelDisplay="auto"
                onChange={(event) => handleFontSize(event, fontSizePickerShowing)}
                onFocus={() => handleFocus(fontSizePickerShowing)}
                onBlur={addToHistory}
              />
            </StyledLayerControlCard>
          </Popover>

          <Dialog
            open={openDialog}
            onClose={handleDialogClose}
            aria-labelledby="responsive-dialog-title"
            fullWidth
            PaperProps={{ sx: { xs: { minWidth: '85vw' }, sm: { minWidth: '85vw' }, md: { minWidth: '85vw' } } }}
            BackdropProps={{ style: { backgroundColor: 'rgb(33, 33, 33, 0.9)' } }}
          >
            <DialogTitle id="responsive-dialog-title">Save Image</DialogTitle>
            <DialogContent
              sx={{
                flex: 'none',
                marginTop: 'auto',
                overflow: 'hidden',
                overflowY: 'hidden',
                paddingBottom: 2,
                paddingLeft: '12px',
                paddingRight: '12px',
              }}
            >
              <DialogContentText sx={{ marginTop: 'auto', marginBottom: 'auto' }}>
                {!imageUploading && (
                  <img
                    src={`https://i${process.env.REACT_APP_USER_BRANCH === 'prod' ? 'prod' : `-${process.env.REACT_APP_USER_BRANCH}`
                      }.memesrc.com/${generatedImageFilename}`}
                    alt="generated meme"
                    draggable
                    {...saveDialogImageIntentHandlers}
                  />
                )}
                {imageUploading && (
                  <center>
                    <CircularProgress sx={{ margin: '30%' }} />
                  </center>
                )}
              </DialogContentText>
            </DialogContent>
            <DialogContentText sx={{ paddingX: 4, marginTop: 'auto', paddingBottom: 2 }}>
              <center>
                <p>
                  ☝️
                  <b style={{ color: '#4CAF50' }}>
                    {'ontouchstart' in window ? 'Tap and hold ' : 'Right click '}
                    the image to save
                  </b>,
                  or use a quick action:
                </p>
              </center>
            </DialogContentText>

            <DialogActions sx={{ marginBottom: 'auto', display: 'inline-flex', padding: '0 23px' }}>
              <Box display="grid" width="100%" gap={2}>
                <Box
                  display="grid"
                  gridTemplateColumns={navigator.canShare ? '1fr 1fr' : '1fr'}
                  gap={2}
                  width="100%"
                >
                  {navigator.canShare && (
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ padding: '12px 16px' }}
                      disabled={imageUploading}
                      onClick={() => {
                        trackSaveDialogAction('share_button', {
                          shareSupported: true,
                          shareHasFile: Boolean(shareImageFile),
                        });
                        navigator.share({
                          title: 'memeSRC.com',
                          text: 'Check out this meme I made on memeSRC.com',
                          files: [shareImageFile],
                        }).catch(() => {
                          trackSaveDialogAction('share_button_error', {
                            shareSupported: true,
                            shareHasFile: Boolean(shareImageFile),
                          });
                        });
                      }}
                      startIcon={<IosShare />}
                    >
                      Share
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ padding: '12px 16px' }}
                    disabled={imageUploading}
                    autoFocus
                    onClick={() => {
                      trackSaveDialogAction('copy_button', {
                        clipboardSupported: Boolean(navigator?.clipboard?.write),
                      });
                      const { ClipboardItem } = window;
                      navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })]);
                      handleSnackbarOpen();
                    }}
                    startIcon={<ContentCopy />}
                  >
                    Copy
                  </Button>
                </Box>
                {isProUser && (
                  <Box display="flex" flexDirection="column" alignItems="center" width="100%">
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ padding: '12px 16px', backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
                      disabled={imageUploading || savingToLibrary}
                      onClick={handleSaveToLibraryClick}
                      startIcon={<Save />}
                    >
                      {savingToLibrary ? 'Saving...' : 'Save to library'}
                    </Button>
                    {librarySaveSuccess && (
                      <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                        Saved!{' '}
                        <Link to="/library" style={{ color: '#90caf9', textDecoration: 'underline' }}>
                          Click here to view library.
                        </Link>
                      </Typography>
                    )}
                  </Box>
                )}
                <LoadingButton
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ padding: '12px 16px', backgroundColor: '#4CAF50', '&:hover': { backgroundColor: '#45a045' } }}
                  disabled={imageUploading}
                  loading={addingToCollage}
                  onClick={handleAddToCollageClick}
                  startIcon={<AddPhotoAlternate />}
                  endIcon={(
                    <Chip
                      icon={<LocalPoliceRounded fontSize="small" />}
                      label="Pro"
                      size="small"
                      sx={{
                        ml: 0.5,
                        background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                        border: '1px solid #8b5cc7',
                        boxShadow: '0 0 12px rgba(107,66,161,0.45)',
                        '& .MuiChip-label': { fontWeight: 700, color: '#fff', fontSize: '12px' },
                        '& .MuiChip-icon': { color: '#fff' },

                      }}
                    />
                  )}
                >
                  Add to collage
                </LoadingButton>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  sx={{ padding: '12px 16px' }}
                  autoFocus
                  onClick={handleDialogClose}
                  startIcon={<Close />}
                >
                  Close
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
          <Dialog
            open={librarySavePromptOpen}
            onClose={() => {
              if (!savingToLibrary) {
                setLibrarySavePromptOpen(false);
                setLibrarySaveStep('choice');
                setLibraryCaptionSelectionIndex(null);
              }
            }}
            aria-labelledby="library-save-prompt-title"
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle id="library-save-prompt-title">
              {librarySaveStep === 'choice' ? 'Save text on image?' : 'Choose default text'}
            </DialogTitle>
            <DialogContent>
              {librarySaveStep === 'choice' ? (
                <DialogContentText>
                  Save to your library with the text burned into the image, or keep the image clean and store one of your text layers as the default caption instead.
                </DialogContentText>
              ) : (
                <>
                  <DialogContentText sx={{ mb: 1 }}>
                    Which text should become the default caption in your library?
                  </DialogContentText>
                  <RadioGroup
                    value={
                      libraryCaptionSelectionIndex !== null && libraryCaptionSelectionIndex !== undefined
                        ? String(libraryCaptionSelectionIndex)
                        : textLayerEntries[0]?.canvasIndex !== undefined
                          ? String(textLayerEntries[0]?.canvasIndex)
                          : ''
                    }
                    onChange={(e) => setLibraryCaptionSelectionIndex(Number(e.target.value))}
                  >
                    {textLayerEntries.map((entry) => (
                      <FormControlLabel
                        key={entry.canvasIndex}
                        value={entry.canvasIndex}
                        control={<Radio />}
                        label={entry.text}
                        sx={{ py: 1 }}
                      />
                    ))}
                  </RadioGroup>
                </>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'center',
                gap: 0,
                px: 3,
                pb: 3,
                width: '100%',
                '& > *': { width: '100%' },
                '& > :not(:first-of-type)': { marginLeft: 0, marginTop: 1 },
              }}
            >
              {librarySaveStep === 'choice' ? (
                <>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={savingToLibrary}
                    onClick={() => {
                      setLibrarySavePromptOpen(false);
                      setLibrarySaveStep('choice');
                      performSaveToLibrary({ includeCaptions: true });
                    }}
                  >
                    With Permanent Text
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled={savingToLibrary}
                    onClick={() => {
                      const entries = textLayerEntries;
                      if (entries.length <= 1) {
                        setLibrarySavePromptOpen(false);
                        setLibrarySaveStep('choice');
                        performSaveToLibrary({ includeCaptions: false, captionIndex: entries[0]?.canvasIndex });
                        return;
                      }
                      setLibraryCaptionSelectionIndex(entries[0]?.canvasIndex ?? null);
                      setLibrarySaveStep('selectCaption');
                    }}
                  >
                    Without Permanent Text
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => {
                      setLibrarySavePromptOpen(false);
                      setLibrarySaveStep('choice');
                      setLibraryCaptionSelectionIndex(null);
                    }}
                    disabled={savingToLibrary}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={savingToLibrary}
                    onClick={() => {
                      const captionIndex =
                        typeof libraryCaptionSelectionIndex === 'number'
                          ? libraryCaptionSelectionIndex
                          : textLayerEntries[0]?.canvasIndex;
                      setLibrarySavePromptOpen(false);
                      setLibrarySaveStep('choice');
                      performSaveToLibrary({ includeCaptions: false, captionIndex });
                    }}
                  >
                    Save without permanent text
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => setLibrarySaveStep('choice')}
                    disabled={savingToLibrary}
                  >
                    Back
                  </Button>
                </>
              )}
            </DialogActions>
          </Dialog>
          <Dialog
            open={collagePromptOpen}
            onClose={() => {
              if (!addingToCollage) {
                setCollagePromptOpen(false);
                setCollageCaptionSelectionIndex(null);
              }
            }}
            aria-labelledby="collage-save-prompt-title"
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle id="collage-save-prompt-title">Choose collage text</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: textLayerEntries.length > 0 ? 1 : 0 }}>
                Collages support one text layer. Pick which text to send as the collage caption, or skip text.
              </DialogContentText>
              {textLayerEntries.length > 0 && (
                <RadioGroup
                  value={
                    collageCaptionSelectionIndex !== null && collageCaptionSelectionIndex !== undefined
                      ? String(collageCaptionSelectionIndex)
                      : textLayerEntries[0]?.canvasIndex !== undefined
                        ? String(textLayerEntries[0]?.canvasIndex)
                        : 'none'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'none') {
                      setCollageCaptionSelectionIndex(null);
                    } else {
                      setCollageCaptionSelectionIndex(Number(val));
                    }
                  }}
                >
                  {textLayerEntries.map((entry) => (
                    <FormControlLabel
                      key={entry.canvasIndex}
                      value={entry.canvasIndex}
                      control={<Radio />}
                      label={entry.text}
                    />
                  ))}
                  <FormControlLabel value="none" control={<Radio />} label="No text" />
                </RadioGroup>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'center',
                gap: 0,
                px: 3,
                pb: 3,
                width: '100%',
                '& > *': { width: '100%' },
                '& > :not(:first-of-type)': { marginLeft: 0, marginTop: 1 },
              }}
            >
              <LoadingButton
                variant="contained"
                fullWidth
                loading={addingToCollage}
                disabled={addingToCollage}
                endIcon={(
                  <Chip
                    icon={<LocalPoliceRounded fontSize="small" />}
                    label="Pro"
                    size="small"
                    sx={{
                      ml: 0.5,
                      background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                      border: '1px solid #8b5cc7',
                      boxShadow: '0 0 12px rgba(107,66,161,0.45)',
                      '& .MuiChip-label': { fontWeight: 700, color: '#fff', fontSize: '12px' },
                      '& .MuiChip-icon': { color: '#fff' },
                    }}
                  />
                )}
                onClick={() => {
                  const entry =
                    collageCaptionSelectionIndex === null || collageCaptionSelectionIndex === undefined
                      ? null
                      : textLayerEntries.find((t) => t.canvasIndex === collageCaptionSelectionIndex) ||
                        textLayerEntries[0] ||
                        null;
                  performAddToCollage(entry);
                }}
              >
                Add to collage
              </LoadingButton>
              <Button
                fullWidth
                onClick={() => {
                  setCollagePromptOpen(false);
                  setCollageCaptionSelectionIndex(null);
                }}
                disabled={addingToCollage}
              >
                Cancel
              </Button>
            </DialogActions>
          </Dialog>
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
          {user?.userDetails?.subscriptionStatus !== 'active' &&
            <Grid container>
              <Grid item xs={12} mt={2}>
                <center>
                  <Box sx={{ maxWidth: '800px' }}>
                    <EditorPageBottomBannerAd />
                  </Box>
                </center>
              </Grid>
            </Grid>
          }
        </ParentContainer>
      </Container>
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

      <Dialog
        open={rateLimitDialogOpen}
        onClose={handleStayOnMagicTools}
        aria-labelledby="rate-limit-dialog-title"
      >
        <DialogTitle id="rate-limit-dialog-title">Magic tools are temporarily unavailable</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ maxWidth: 380 }}>
            Magic tools are temporarily unavailable. Would you like to switch to the classic tools for now?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStayOnMagicTools}>Stay on new tools</Button>
          <Button onClick={handleSwitchToClassicTools} autoFocus>
            Switch to classic
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingBackdrop open={loadingInpaintingResult} variationCount={promptEnabled === 'edit' ? 1 : 2} />

      <Dialog
        open={openSelectResult}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth='md'
        PaperProps={{ style: { margin: '8px', padding: '10px' } }}
      >
        <DialogTitle id="alert-dialog-title">
          {"Magic Results"}
          <div style={{ fontSize: '0.8em', marginTop: '5px' }}>Pick the best variation:</div>
        </DialogTitle>
        <DialogContent style={{ padding: 0 }}>  {/* Reduced padding */}
          <Grid container>
            {returnedImages?.map((image, index) => (
              <MagicResultOption
                key={`image-key-${index}`}
                baseMeta={editorImageIntentBaseMeta}
                image={image}
                index={index}
                columns={variationDisplayColumns}
                isSelected={selectedImage === image}
                isDimmed={Boolean(selectedImage && selectedImage !== image)}
                onSelect={() => setSelectedImage(image)}
                aspectRatio={editorAspectRatio}
              />
            ))}
          </Grid>
        </DialogContent>
        <DialogActions style={{ padding: '8px 16px' }}>
          <Button
            variant='contained'
            onClick={() => {
              setEditorTool('captions')
              toggleDrawingMode('fineTuning')
              handleSelectResultCancel()
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedImage}
            onClick={() => { handleAddCanvasBackground(selectedImage) }}
            variant='contained'
            style={{
              backgroundColor: 'limegreen',
              color: 'white',
              opacity: selectedImage ? 1 : 0.5, // Adjust opacity based on selectedImage
              cursor: selectedImage ? 'pointer' : 'not-allowed', // Change cursor style
            }}
          >
            Apply
          </Button>
        </DialogActions>

        <Fab
          size="small"  // Makes the FAB smaller
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: '#333', // Dark background color
            color: '#fff', // White text color
            boxShadow: 'none', // Remove box shadow (if any)
          }}
          onClick={() => setVariationDisplayColumns(prev => (prev === 2 ? 1 : 2))}
        >
          {variationDisplayColumns === 2 ? <ZoomIn /> : <ZoomOut />}
        </Fab>
      </Dialog>
    </>
  );
}

EditorPage.propTypes = {
  shows: PropTypes.array,
};

export default EditorPage

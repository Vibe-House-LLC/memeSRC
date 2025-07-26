import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from 'prop-types';
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Fab,
  useMediaQuery,
  Menu,
  MenuItem,
  Grid,
  Stack,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  TextField,
  Checkbox,
} from "@mui/material";
import { styled } from "@mui/system";
import { Delete, Add, ArrowBack, ArrowForward, Close, Edit, ArrowUpward, ArrowDownward, Save, TrendingUp } from "@mui/icons-material";
import { useNavigate, useLocation } from 'react-router-dom'; 
import { LoadingButton } from "@mui/lab";
import { useTheme } from "@mui/material/styles";
import { API } from 'aws-amplify';
import BasePage from "../../../pages/BasePage";
import { UserContext } from "../../../UserContext";
import { useSubscribeDialog } from "../../../contexts/useSubscribeDialog";
import { hashString, setCollagePreference } from "../utils/preferences";

// Utility functions for managing banner dismiss timestamp
const getBannerDismissKey = (user) => {
  if (!user?.userDetails?.email) return 'memeSRC-banner-dismiss-anonymous';
  const hashedUsername = hashString(user.userDetails.email);
  return `memeSRC-banner-dismiss-${hashedUsername}`;
};

const isBannerDismissed = (user) => {
  const key = getBannerDismissKey(user);
  const dismissedTimestamp = localStorage.getItem(key);
  if (!dismissedTimestamp) return false;
  
  const now = new Date().getTime();
  const dismissedTime = parseInt(dismissedTimestamp, 10);
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  return (now - dismissedTime) < sevenDaysInMs;
};

const setBannerDismissed = (user) => {
  const key = getBannerDismissKey(user);
  const now = new Date().getTime().toString();
  localStorage.setItem(key, now);
};

// Component for subtle chip to try new version when banner is dismissed
function SubtleSwitchChip({ onTryNewVersion }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ px: isMobile ? 1 : 0, mb: 3, textAlign: 'center' }}>
      <Chip
        label="Tap to try the new version"
        icon={<TrendingUp sx={{ fontSize: '16px !important' }} />}
        onClick={onTryNewVersion}
        variant="outlined"
        size="small"
        sx={{
          borderColor: 'rgba(76, 175, 80, 0.4)',
          color: 'rgba(76, 175, 80, 0.8)',
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: 'rgba(76, 175, 80, 0.05)',
          '&:hover': {
            borderColor: 'rgba(76, 175, 80, 0.6)',
            color: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            cursor: 'pointer'
          },
          '& .MuiChip-icon': {
            color: 'inherit'
          }
        }}
      />
    </Box>
  );
}

SubtleSwitchChip.propTypes = {
  onTryNewVersion: PropTypes.func.isRequired,
};

// Component for encouraging users to try the new version
function TryNewVersionBanner({ user, onTryNewVersion }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Local state for dismiss feedback
  const [showDismissFeedback, setShowDismissFeedback] = useState(false);
  const [dismissFeedback, setDismissFeedback] = useState('');
  const [dismissEmailConsent, setDismissEmailConsent] = useState(false);
  const [dismissFormSubmitted, setDismissFormSubmitted] = useState(false);
  const [dismissLoadingSubmit, setDismissLoadingSubmit] = useState(false);
  const [bannerDismissed, setBannerDismissedLocal] = useState(false);

  const handleDismissClick = () => {
    setShowDismissFeedback(true);
  };

  const handleCancelDismiss = () => {
    setShowDismissFeedback(false);
    setDismissFeedback('');
    setDismissEmailConsent(false);
    setDismissFormSubmitted(false);
  };

  const submitDismissFeedback = async () => {
    setDismissFormSubmitted(true);
    
    if (dismissFeedback.trim() !== '' && !dismissEmailConsent) {
      // Show error for email consent if feedback is provided
      return;
    }
    
    setDismissLoadingSubmit(true);
    
    try {
      if (dismissFeedback.trim() !== '') {
        const feedbackMessage = `[DISMISSED NEW VERSION BANNER] ${dismissFeedback}`;
        
        await API.post('publicapi', '/user/update/proSupportMessage', {
          body: { message: feedbackMessage },
        });
      }
      
      // Dismiss banner regardless of feedback submission
      setBannerDismissed(user);
      setBannerDismissedLocal(true);
      
    } catch (error) {
      console.log('Error submitting dismiss feedback:', error);
      // Still dismiss even if feedback fails
      setBannerDismissed(user);
      setBannerDismissedLocal(true);
    }
    
    setDismissLoadingSubmit(false);
  };

  // Don't render if banner has been dismissed
  if (bannerDismissed) {
    return null;
  }

  return (
    <Box sx={{ px: isMobile ? 1 : 0, mb: 3 }}>
      <Paper 
        elevation={6}
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a2e1a 0%, #16623e 50%, #0f6034 100%)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
          position: 'relative'
        }}
      >
        {!showDismissFeedback ? (
          <>
            {/* Close button */}
            <IconButton
              onClick={handleDismissClick}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'rgba(255, 255, 255, 0.7)',
                zIndex: 1,
                '&:hover': {
                  color: '#fff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              size="small"
            >
              <Close fontSize="small" />
            </IconButton>

            <Box sx={{ 
              p: isMobile ? 2 : 3,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: isMobile ? 1.5 : 0,
              pr: isMobile ? 2 : 3 // Normal right padding on mobile since button is below close button
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TrendingUp sx={{ 
                  fontSize: 32, 
                  color: '#4caf50',
                  filter: 'drop-shadow(0 2px 4px rgba(76, 175, 80, 0.3))'
                }} />
                <Box>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: '#fff',
                    fontSize: isMobile ? '1.1rem' : '1.25rem',
                    mb: 0.5
                  }}>
                    New Collage Tool Available!
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: isMobile ? '0.8rem' : '0.875rem'
                  }}>
                    A brand new Collage Tool with better layouts and features is in early access
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ 
                width: isMobile ? '100%' : 'auto'
              }}>
                <Button
                  onClick={onTryNewVersion}
                  variant="contained"
                  size={isMobile ? "medium" : "small"}
                  startIcon={<TrendingUp />}
                  fullWidth={isMobile}
                  sx={{
                    backgroundColor: '#4caf50',
                    color: '#000',
                    '&:hover': {
                      backgroundColor: '#66bb6a',
                    },
                    fontWeight: 600,
                    borderRadius: 2,
                    minWidth: isMobile ? 'auto' : 'fit-content',
                    px: 3,
                    py: 1,
                  }}
                >
                  Try New Version
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          /* Dismiss Feedback Form */
          <Box sx={{ 
            p: isMobile ? 2 : 2.5
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mb: 1.5 
            }}>
              <Typography variant="body1" sx={{ 
                color: '#fff', 
                fontWeight: 600,
                fontSize: '1rem'
              }}>
                Keep Using Classic Version
              </Typography>
            </Box>
            
            <TextField
              placeholder="What's better about this version?"
              multiline
              rows={3}
              value={dismissFeedback}
              onChange={(e) => setDismissFeedback(e.target.value)}
              fullWidth
              sx={{ 
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(76, 175, 80, 0.6)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4caf50',
                    borderWidth: 2,
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                  fontSize: '0.9rem'
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  opacity: 1,
                },
              }}
            />
            
            {dismissFeedback.trim() !== '' && (
              <Box sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 2,
                p: 1.5,
                mb: 1.5,
                border: (dismissFormSubmitted && dismissFeedback.trim() !== '' && !dismissEmailConsent) ? 
                  '1px solid #ff5252' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={dismissEmailConsent}
                      onChange={(e) => setDismissEmailConsent(e.target.checked)}
                      size="small"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        '&.Mui-checked': {
                          color: '#4caf50',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.85rem',
                      lineHeight: 1.4
                    }}>
                      I consent to being contacted via email about this feedback
                    </Typography>
                  }
                />
                
                {dismissFormSubmitted && dismissFeedback.trim() !== '' && !dismissEmailConsent && (
                  <Typography variant="caption" sx={{ 
                    display: 'block', 
                    mt: 0.5,
                    color: '#ff5252',
                    fontSize: '0.75rem'
                  }}>
                    Email consent is required when providing feedback
                  </Typography>
                )}
              </Box>
            )}
            
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <Button
                onClick={handleCancelDismiss}
                size="medium"
                startIcon={<ArrowBack />}
                sx={{ 
                  textTransform: 'none', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.85rem',
                  px: 2,
                  '&:hover': {
                    color: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Back
              </Button>
              
              <LoadingButton
                loading={dismissLoadingSubmit}
                onClick={submitDismissFeedback}
                variant="contained"
                size="medium"
                sx={{ 
                  textTransform: 'none',
                  backgroundColor: '#4caf50',
                  color: '#000',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  px: 3,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                  '&:hover': {
                    backgroundColor: '#66bb6a',
                    boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(76, 175, 80, 0.4)',
                    color: 'rgba(0, 0, 0, 0.6)',
                  },
                }}
              >
                {dismissFeedback.trim() === '' ? 'Skip & Hide' : 'Submit & Hide'}
              </LoadingButton>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

TryNewVersionBanner.propTypes = {
  user: PropTypes.object,
  onTryNewVersion: PropTypes.func.isRequired,
};

const CollageImage = styled("img")({
  maxWidth: "100%",
  height: "auto",
  marginBottom: "24px",
});

const ImageContainer = styled(Box)({
  position: "relative",
  marginBottom: "16px",
  "&:hover .delete-button, &:active .delete-button, &:hover .edit-button, &:active .edit-button, &:hover .move-up-button, &:active .move-up-button, &:hover .move-down-button, &:active .move-down-button": {
    display: "flex",
  },
});

const ImageWrapper = styled(Box)({
  position: "relative",
  width: "350px",
  margin: "auto",
});

const UploadButton = styled(Fab)({
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1,
});

const EditButton = styled(IconButton)({
  position: "absolute",
  top: "8px",
  right: "48px",
  zIndex: 1,
  backgroundColor: "white",
  color: "blue",
  border: "2px solid blue",
  padding: "4px",
  display: "none",
  '&:hover': {
    backgroundColor: "#e6e6ff",
  },
});

const DeleteButton = styled(IconButton)({
  position: "absolute",
  top: "8px",
  right: "8px",
  zIndex: 1,
  backgroundColor: "white",
  color: "red",
  border: "2px solid red",
  padding: "4px",
  display: "none",
  '&:hover': {
    backgroundColor: "#ffe6e6",
  },
});

const MoveUpButton = styled(IconButton)({
  position: "absolute",
  top: "48px",
  right: "48px",
  zIndex: 1,
  backgroundColor: "white",
  color: "green",
  border: "2px solid green",
  padding: "4px",
  display: "none",
  '&:hover': {
    backgroundColor: "#e6ffe6",
  },
});

const MoveDownButton = styled(IconButton)({
  position: "absolute",
  top: "48px",
  right: "8px",
  zIndex: 1,
  backgroundColor: "white",
  color: "orange",
  border: "2px solid orange",
  padding: "4px",
  display: "none",
  '&:hover': {
    backgroundColor: "#fff2e6",
  },
});

const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "300px",
  width: "100%",
  maxWidth: "800px", // Set a reasonable maximum width
  margin: "0 auto", // Center the container
  border: `2px dashed #ccc`,
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center",
  marginBottom: "32px",
  cursor: "pointer",
  transition: "background-color 0.3s",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ResultOptionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  marginBottom: theme.spacing(4),
}));

const OptionGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

const ThumbnailContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

const CollageThumbnail = styled('img')(({ theme }) => ({
  maxWidth: '300px',
  maxHeight: '300px',
  objectFit: 'contain',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));


const StepperContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  marginBottom: theme.spacing(4),
}));

const StepButton = styled(Button)(({ theme }) => ({
  color: 'white',
  backgroundColor: theme.palette.grey[800],
  '&:hover': {
    backgroundColor: theme.palette.grey[700],
  },
}));

const StepContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  maxWidth: '800px',
  margin: '0 auto',
  padding: theme.spacing(2),
}));

const ButtonGroup = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(2),
  width: '100%',
  marginTop: theme.spacing(2),
}));


const borderColorOptions = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#FF0000' },
  { label: 'Blue', value: '#0000FF' },
  { label: 'Green', value: '#00FF00' },
  { label: 'Custom', value: 'custom' },
];

export default function CollagePage() {
  const [images, setImages] = useState([]);
  const [borderThickness, setBorderThickness] = useState(15);
  const [collageBlob, setCollageBlob] = useState(null);
  const [editMode, setEditMode] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [accordionExpanded, setAccordionExpanded] = useState(false);
  const canvasRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuIndex, setMenuIndex] = useState(null);
  const imageRefs = useRef([]);
  const imagesOnly = true; // Set this to true to use images as default option
  const [borderColor, setBorderColor] = useState('#FFFFFF');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hasAddedImages, setHasAddedImages] = useState(false);

  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();

  const navigate = useNavigate();
  const location = useLocation();

  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  // Check if user has explicitly chosen legacy version and banner hasn't been dismissed
  const shouldShowNewVersionBanner = authorized && user && !isBannerDismissed(user);
  
  // Show subtle chip when banner is dismissed
  const shouldShowSubtleChip = authorized && user && isBannerDismissed(user);

  // Handle switching to new version
  const handleTryNewVersion = () => {
    setCollagePreference(user, 'new');
    navigate('/collage?force=new');
  };

  const handleReset = () => {
    // Clear all state variables
    setImages([]);
    setBorderThickness(15);
    setBorderColor('#FFFFFF');
    setShowColorPicker(false);
    setActiveStep(0);
    setEditMode(true);
    setAccordionExpanded(false);
    setCollageBlob(null);

    // Clear sessionStorage
    sessionStorage.removeItem('collageState');

    // Clear any state passed through navigation
    if (navigate) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  };

  useEffect(() => {
    createCollage();
  }, [images, borderThickness, borderColor]);

  const searchParams = new URLSearchParams(location.search);
  const isEditing = searchParams.get('editing') === 'true';

  useEffect(() => {
    if (!isEditing) {
      // Clear the state in session storage
      sessionStorage.removeItem('collageState');

      // Add ?editing=true to the URL
      searchParams.set('editing', 'true');
      navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    } else {
      const storedCollageState = sessionStorage.getItem('collageState');
      if (storedCollageState) {
        try {
          const parsedCollageState = JSON.parse(storedCollageState);
          setImages(parsedCollageState.images);
          setBorderThickness(parsedCollageState.borderThickness);
          setBorderColor(parsedCollageState.borderColor || '#FFFFFF');
          setEditMode(parsedCollageState.editMode);
          setAccordionExpanded(parsedCollageState.accordionExpanded);
          setActiveStep(parsedCollageState.activeStep);
          setHasAddedImages(true);
        } catch (error) {
          console.error('Error parsing stored collage state:', error);
        }
      }
    }

    if (location.state?.updatedCollageState) {
      const { images, borderThickness, editMode, accordionExpanded } = location.state.updatedCollageState;
      setImages(images.map(img => ({
        ...img,
        width: img.width || img.naturalWidth,
        height: img.height || img.naturalHeight,
      })));
      setBorderThickness(borderThickness);
      setEditMode(editMode);
      setAccordionExpanded(accordionExpanded);
    }
  }, [location.search, location.state, navigate]);

  useEffect(() => {
    if (hasAddedImages) {
      const collageState = {
        images,
        borderThickness,
        borderColor,
        editMode,
        accordionExpanded,
        activeStep,
      };
      sessionStorage.setItem('collageState', JSON.stringify(collageState));
    }
  }, [images, borderThickness, borderColor, editMode, accordionExpanded, activeStep, hasAddedImages]);
  

  const handleImageUpload = (event, index) => {
    const uploadedImages = Array.from(event.target.files);
  
    const loadImage = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              id: Date.now().toString(),
              src: e.target.result,
              width: img.width,
              height: img.height,
            });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
  
    Promise.all(uploadedImages.map(loadImage)).then((newImages) => {
      setImages((prevImages) => {
        const updatedImages = [...prevImages];
        updatedImages.splice(index, 0, ...newImages);
        return updatedImages;
      });
      setHasAddedImages(true);
    });
  };

  const handleEditImage = (index) => {
    const image = images[index];
    const collageState = {
      images,
      editingImageIndex: index,
      borderThickness,
      borderColor,
      editMode,
      accordionExpanded,
      activeStep,
    };
    sessionStorage.setItem('collageState', JSON.stringify(collageState));

    fetch(image.src)
      .then(res => res.blob())
      .then(blob => {
        const uploadedImage = URL.createObjectURL(blob);
        navigate('/editor/project/new', { 
          state: { 
            uploadedImage,
            fromCollage: true,
            collageState
          } 
        });
      });
  };

  const addTextArea = (index) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const text = "My reaction to the collage editor";
    const fontSize = 24;
    const padding = 20;

    ctx.font = `${fontSize}px Arial`;
    const textWidth = ctx.measureText(text).width;

    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillText(text, padding, fontSize + padding);

    const newImage = {
      id: Date.now().toString(),
      src: canvas.toDataURL(),
      width: canvas.width,
      height: canvas.height,
    };

    setImages((prevImages) => {
      const newImages = [...prevImages];
      newImages.splice(index, 0, newImage);
      return newImages;
    });
  };

  const deleteImage = (index) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });
  };
  
  const moveImage = (index, direction) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      if (index + direction < 0 || index + direction >= newImages.length) {
        return newImages; // Return the original array if the move is out of bounds
      }
      const temp = newImages[index];
      newImages[index] = newImages[index + direction];
      newImages[index + direction] = temp;
      return newImages;
    });
  };

  const createCollage = () => {
    if (images.length === 0) return;
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
  
    const maxWidth = 1000; // Set a maximum width for the collage
    let totalHeight = 0;
  
    const resizedImages = images.map((image) => {
      const scaleFactor = maxWidth / image.width;
      const scaledHeight = image.height * scaleFactor;
      totalHeight += scaledHeight;
      return {
        src: image.src,
        width: maxWidth,
        height: scaledHeight,
      };
    });
  
    totalHeight += borderThickness * (resizedImages.length + 1);
    canvas.width = maxWidth + borderThickness * 2;
    canvas.height = totalHeight;
  
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    let currentHeight = borderThickness;
    resizedImages.forEach((image, index) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, borderThickness, currentHeight, image.width, image.height);
        currentHeight += image.height + borderThickness;
  
        if (index === resizedImages.length - 1) {
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setCollageBlob(url);
          }, "image/png");
        }
      };
      img.src = image.src;
    });
  };

  const handleMenuClick = (event, index) => {
    if (imagesOnly) {
      document.getElementById(`file-input-${index}`).click();
    } else {
      setAnchorEl(event.currentTarget);
      setMenuIndex(index);
    }
  };

  const handleMenuClose = (action) => {
    setAnchorEl(null);
    if (action === "image") {
      document.getElementById(`file-input-${menuIndex}`).click();
    } else if (action === "text") {
      addTextArea(menuIndex);
    }
  };


  const handleBorderChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setBorderThickness(value);
    setAccordionExpanded(false); // Collapse the accordion
  };

  const [openSaveDialog, setOpenSaveDialog] = useState(false);

  const handleOpenInEditor = () => {
    // Store the current state in sessionStorage
    const collageState = {
      images,
      borderThickness,
      borderColor,
      editMode,
      accordionExpanded,
      activeStep,
    };
    sessionStorage.setItem('collageState', JSON.stringify(collageState));

    // Create the resulting image blob
    const resultImage = canvasRef.current.toDataURL({
      format: 'jpeg',
      quality: 0.8
    });

    fetch(resultImage)
      .then(res => res.blob())
      .then(blob => {
        const uploadedImage = URL.createObjectURL(blob);
        navigate('/editor/project/new', { 
          state: { 
            uploadedImage,
            fromCollage: true
          } 
        });
      });
  };

  const handleSave = () => {
    setOpenSaveDialog(true);
  };

  const handleCloseSaveDialog = () => {
    setOpenSaveDialog(false);
  };

  const steps = ['Add Images', 'Adjust Borders', 'Save or Edit'];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    if (activeStep === 0) {
      createCollage();
      setEditMode(false);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    if (activeStep === 1) {
      setEditMode(true);
    }
  };

  const handleBorderColorChange = (event) => {
    const {value} = event.target;
    if (value === 'custom') {
      setShowColorPicker(true);
    } else {
      setBorderColor(value);
      setShowColorPicker(false);
    }
  };

  const handleCustomColorChange = (event) => {
    setBorderColor(event.target.value);
  };

  return (
    <BasePage
      pageTitle="Create a collage"
      breadcrumbLinks={[
        { name: "Edit", path: "/edit" },
        { name: "Collage Tool" },
      ]}
    >
      <Helmet>
        <title>Collage Tool - Editor - memeSRC</title>
      </Helmet>

      {!authorized ? (
        <Grid container height="100%" justifyContent="center" alignItems="center" mt={6}>
          <Grid item>
            <Stack spacing={3} justifyContent="center">
              <img
                src="/assets/memeSRC-white.svg"
                alt="memeSRC logo"
                style={{ height: 48, marginBottom: -15 }}
              />
              <Typography variant="h3" textAlign="center">
                memeSRC&nbsp;Collage Tool
              </Typography>
              <Typography variant="body" textAlign="center">
                While in Early Access, the Collage Tool is only available for memeSRC&nbsp;Pro subscribers.
              </Typography>
            </Stack>
            <center>
                <LoadingButton
                  onClick={openSubscriptionDialog}
                  variant="contained"
                  size="large"
                  sx={{ mt: 5, fontSize: 17 }}
                >
                  Upgrade to Pro
                </LoadingButton>
              </center>
          </Grid>
        </Grid>
      ) : (
        <>
          {shouldShowNewVersionBanner && (
            <TryNewVersionBanner user={user} onTryNewVersion={handleTryNewVersion} />
          )}
          
          {shouldShowSubtleChip && (
            <SubtleSwitchChip onTryNewVersion={handleTryNewVersion} />
          )}
          
          <StepperContainer>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </StepperContainer>

          {activeStep === 0 && (
            <StepContainer>
              {images.length > 0 && (
                <ButtonGroup>
                  <StepButton
                    variant="contained"
                    startIcon={<Delete />}
                    onClick={handleReset}
                    fullWidth
                  >
                    Reset
                  </StepButton>
                  <StepButton
                    variant="contained"
                    startIcon={<ArrowForward />}
                    onClick={handleNext}
                    fullWidth
                  >
                    Continue
                  </StepButton>
                </ButtonGroup>
              )}
              {images.length === 0 ? (
                  <EmptyStateContainer onClick={(event) => handleMenuClick(event, 0)}>
                  <Typography variant="h6" gutterBottom>
                    Add Images
                  </Typography>
                  <Typography variant="body1" marginBottom={2}>
                    Upload images for your collage
                  </Typography>
                  <Fab
                    color="primary"
                    size="large"
                    component="label"
                  >
                    <Add />
                  </Fab>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => handleMenuClose(null)}
                  >
                    <MenuItem onClick={() => handleMenuClose("image")}>Add Image</MenuItem>
                    <MenuItem onClick={() => handleMenuClose("text")}>Add Text</MenuItem>
                  </Menu>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    id="file-input-0"
                    onChange={(event) => handleImageUpload(event, 0)}
                    multiple
                  />
                </EmptyStateContainer>
              ) : (
                <Box sx={{ position: "relative" }}>
                  <UploadButton
                    color="primary"
                    size="small"
                    component="label"
                    sx={{ marginTop: '16px', marginBottom: '16px' }}
                    onClick={(event) => handleMenuClick(event, 0)}
                  >
                    <Add />
                  </UploadButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => handleMenuClose(null)}
                  >
                    <MenuItem onClick={() => handleMenuClose("image")}>Add Image</MenuItem>
                    <MenuItem onClick={() => handleMenuClose("text")}>Add Text</MenuItem>
                  </Menu>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    id="file-input-0"
                    onChange={(event) => handleImageUpload(event, 0)}
                    multiple
                  />
        
                  {images.map((image, index) => (
                    <>
                      <ImageContainer ref={(el) => { imageRefs.current[index] = el; }}>
                        <ImageWrapper>
                          <img src={image.src} alt={`layer ${index + 1}`} style={{ width: "100%" }} />
                          <DeleteButton className="delete-button" onClick={() => deleteImage(index)}>
                            <Close />
                          </DeleteButton>
                          <EditButton className="edit-button" onClick={() => handleEditImage(index)}>
                            <Edit />
                          </EditButton>
                          <MoveUpButton className="move-up-button" onClick={() => moveImage(index, -1)}>
                            <ArrowUpward />
                          </MoveUpButton>
                          <MoveDownButton className="move-down-button" onClick={() => moveImage(index, 1)}>
                            <ArrowDownward />
                          </MoveDownButton>
                        </ImageWrapper>
                      </ImageContainer>
                      {index < images.length - 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '16px', marginBottom: '16px' }}>
                          <Fab
                            color="primary"
                            size="small"
                            component="label"
                            onClick={(event) => handleMenuClick(event, index + 1)}
                          >
                            <Add />
                          </Fab>
                          <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => handleMenuClose(null)}
                          >
                            <MenuItem onClick={() => handleMenuClose("image", index + 1)}>Add Image</MenuItem>
                            <MenuItem onClick={() => handleMenuClose("text", index + 1)}>Add Text</MenuItem>
                          </Menu>
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            id={`file-input-${index + 1}`}
                            onChange={(event) => handleImageUpload(event, index + 1)}
                            multiple
                          />
                        </Box>
                      )}
                    </>
                  ))}
        
                  <UploadButton
                    color="primary"
                    size="small"
                    component="label"
                    onClick={(event) => handleMenuClick(event, images.length)}
                  >
                    <Add />
                  </UploadButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => handleMenuClose(null)}
                  >
                    <MenuItem onClick={() => handleMenuClose("image", images.length)}>Add Image</MenuItem>
                    <MenuItem onClick={() => handleMenuClose("text", images.length)}>Add Text</MenuItem>
                  </Menu>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    id={`file-input-${images.length}`}
                    onChange={(event) => handleImageUpload(event, images.length)}
                    multiple
                  />
                </Box>
              )}
              {images.length > 0 && (
                <ButtonGroup>
                  <StepButton
                    variant="contained"
                    startIcon={<Delete />}
                    onClick={handleReset}
                    fullWidth
                  >
                    Reset
                  </StepButton>
                  <StepButton
                    variant="contained"
                    startIcon={<ArrowForward />}
                    onClick={handleNext}
                    fullWidth
                  >
                    Continue
                  </StepButton>
                </ButtonGroup>
              )}
            </StepContainer>
          )}

          {activeStep === 1 && (
            <StepContainer>
              <ButtonGroup>
                <StepButton
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                  fullWidth
                >
                  Back
                </StepButton>
                <StepButton
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                  fullWidth
                >
                  Continue
                </StepButton>
              </ButtonGroup>

              <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel id="border-thickness-label">Border Thickness</InputLabel>
                    <Select
                      labelId="border-thickness-label"
                      id="border-thickness-select"
                      value={borderThickness}
                      label="Border Thickness"
                      onChange={handleBorderChange}
                    >
                      <MenuItem value={0}>No border</MenuItem>
                      <MenuItem value={5}>Thin</MenuItem>
                      <MenuItem value={15}>Medium</MenuItem>
                      <MenuItem value={30}>Thick</MenuItem>
                      <MenuItem value={65}>Extra Thick</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel id="border-color-label">Border Color</InputLabel>
                    <Select
                      labelId="border-color-label"
                      id="border-color-select"
                      value={showColorPicker ? 'custom' : borderColor}
                      label="Border Color"
                      onChange={handleBorderColorChange}
                    >
                      {borderColorOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {option.value !== 'custom' && (
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: option.value,
                                  border: '1px solid #ccc',
                                }}
                              />
                            )}
                            <Typography>{option.label}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {showColorPicker && (
                <Box sx={{ margin: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography>Custom Color:</Typography>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={handleCustomColorChange}
                    style={{
                      width: '30px',
                      height: '30px',
                      padding: 0,
                      border: 'none',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  />
                </Box>
              )}

              <ThumbnailContainer sx={{ my: 2 }}>
                <CollageThumbnail src={collageBlob} alt="Collage Result" />
              </ThumbnailContainer>

              <ButtonGroup>
                <StepButton
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                  fullWidth
                >
                  Back
                </StepButton>
                <StepButton
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                  fullWidth
                >
                  Continue
                </StepButton>
              </ButtonGroup>
            </StepContainer>
          )}

          {activeStep === 2 && (
            <StepContainer>
              <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
                ✅ Your Collage is Ready!
              </Typography>
              
              <ThumbnailContainer sx={{ my: 2 }}>
                <CollageThumbnail src={collageBlob} alt="Collage Result" />
              </ThumbnailContainer>

              <ResultOptionsContainer sx={{ gap: 2 }}>
                <OptionGroup>
                  <StepButton
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={handleOpenInEditor}
                    fullWidth
                  >
                    Advanced Editor
                  </StepButton>
                  <StepButton
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    fullWidth
                  >
                    Save Collage
                  </StepButton>
                </OptionGroup>

                <StepButton
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={handleBack}
                  fullWidth
                >
                  Back
                </StepButton>
              </ResultOptionsContainer>
            </StepContainer>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </>
      )}

      <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog}>
        <DialogTitle>Save Your Collage</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
            <CollageImage src={collageBlob} alt="Collage Result" sx={{ maxWidth: '100%', height: 'auto', mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              To save your collage:
            </Typography>
            <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
              <li>{'ontouchstart' in window ? 'Tap and hold' : 'Right-click'} on the image above</li>
              <li>Select "Save image" from the menu</li>
              <li>Choose a location on your device to save the collage</li>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </BasePage>
  );
 }
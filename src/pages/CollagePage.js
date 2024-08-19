import { useContext, useEffect, useRef, useState, useCallback } from "react";
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
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { styled } from "@mui/system";
import { Delete, Add, ArrowBack, ArrowForward, ExpandMore, Close, Edit, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingButton } from "@mui/lab";
import BasePage from "./BasePage";
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";

const CollageContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginTop: "32px",
});

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
  border: `2px dashed ${theme.palette.divider}`,
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

export default function CollagePage() {
  const [images, setImages] = useState([]);
  const [borderThickness, setBorderThickness] = useState(15);
  const [collageBlob, setCollageBlob] = useState(null);
  const [editMode, setEditMode] = useState(true);
  const [accordionExpanded, setAccordionExpanded] = useState(false);
  const canvasRef = useRef(null);
  const isMobile = useMediaQuery("(max-width:600px)");
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuIndex, setMenuIndex] = useState(null);
  const imageRefs = useRef([]);
  const imagesOnly = true; // Set this to true to use images as default option

  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();

  const navigate = useNavigate();

  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  useEffect(() => {
    createCollage();
  }, [images, borderThickness]);

  const location = useLocation();

  useEffect(() => {
    const storedCollageState = localStorage.getItem('collageState');
    if (storedCollageState) {
      const parsedCollageState = JSON.parse(storedCollageState);
      setImages(parsedCollageState.images);
      setBorderThickness(parsedCollageState.borderThickness);
      setEditMode(parsedCollageState.editMode);
      setAccordionExpanded(parsedCollageState.accordionExpanded);
      localStorage.removeItem('collageState');
    }

    if (location.state?.updatedCollageState) {
      const { images, borderThickness, editMode, accordionExpanded } = location.state.updatedCollageState;
      setImages(images);
      setBorderThickness(borderThickness);
      setEditMode(editMode);
      setAccordionExpanded(accordionExpanded);
    }
  }, [location.state]);

  const handleImageUpload = (event, index) => {
    const uploadedImages = Array.from(event.target.files);
  
    const loadImage = (file) => {
      return new Promise((resolve) => {
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
    };
  
    Promise.all(uploadedImages.map(loadImage)).then((newImages) => {
      setImages((prevImages) => {
        const updatedImages = [...prevImages];
        updatedImages.splice(index, 0, ...newImages);
        return updatedImages;
      });
    });
  };

  const handleEditImage = (index) => {
    const collageState = {
      images,
      editingImageIndex: index,
      borderThickness,
      editMode,
      accordionExpanded,
    };
    localStorage.setItem('collageState', JSON.stringify(collageState));
    navigate(`/editor/project/new`, { state: { collageState } });
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
  
    ctx.fillStyle = "white";
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

  const calculateButtonPositions = useCallback(() => {
    const positions = [];
    imageRefs.current.forEach((ref, index) => {
      if (ref) {
        const { top, height } = ref.getBoundingClientRect();
        positions[index] = top + height / 2;
      }
    });
    return positions;
  }, [images]);

  const buttonPositions = calculateButtonPositions();

  const handleBorderChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setBorderThickness(value);
    setAccordionExpanded(false); // Collapse the accordion
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
        {editMode ? (
          <>
            <Typography variant="body1" marginBottom={5} gutterBottom>
              Add images to create a collage:
            </Typography>
            {images.length > 0 && (
              <Button
                variant="contained"
                startIcon={<ArrowForward />}
                onClick={() => {
                  createCollage();
                  setEditMode(false);
                  window.scrollTo(0, 0);
                }}
                fullWidth
                size="large"
              >
                Continue
              </Button>
            )}
            {images.length === 0 ? (
                <EmptyStateContainer onClick={(event) => handleMenuClick(event, 0)}>
                <Typography variant="h6" gutterBottom>
                  No images added
                </Typography>
                <Typography variant="body1" marginBottom={2}>
                  Click anywhere to select your first image
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
              <Button
                variant="contained"
                startIcon={<ArrowForward />}
                onClick={() => {
                  createCollage();
                  setEditMode(false);
                  window.scrollTo(0, 0);
                }}
                sx={{ marginTop: "32px" }}
                fullWidth
                size="large"
              >
                Continue
              </Button>
            )}
          </>
        ) : (
          <CollageContainer>
            <Button
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={() => setEditMode(true)}
              fullWidth
              sx={{ mb: 2 }}
            >
              Edit Photos
            </Button>
            <Accordion sx={{ mb: 2 }} expanded={accordionExpanded} onChange={() => setAccordionExpanded(!accordionExpanded)}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Adjust Border Thickness</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <RadioGroup
                  value={borderThickness.toString()}
                  onChange={handleBorderChange}
                >
                  <FormControlLabel value="0" control={<Radio />} label="None" />
                  <FormControlLabel value="10" control={<Radio />} label="Thin" />
                  <FormControlLabel value="15" control={<Radio />} label="Normal" />
                  <FormControlLabel value="35" control={<Radio />} label="Thicc" />
                  <FormControlLabel value="65" control={<Radio />} label="Thiccer" />
                </RadioGroup>
              </AccordionDetails>
            </Accordion>
 
            <ImageWrapper>
              <CollageImage src={collageBlob} alt="Collage Result" />
            </ImageWrapper>
            <Alert
              severity='success'
              sx={{ marginTop: 1.5 }}
            >
              <b>{'ontouchstart' in window ? 'Tap and hold ' : 'Right click '} ☝️ the image to save</b>
            </Alert>
          </CollageContainer>
        )}
      </>
      )}
 
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </BasePage>
  );
 }
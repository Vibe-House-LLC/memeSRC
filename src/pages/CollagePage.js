import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Fab,
  useMediaQuery,
  Slider,
} from "@mui/material";
import { styled } from "@mui/system";
import { Delete, Add, Edit, ArrowBack, Check, ArrowForward } from "@mui/icons-material";
import BasePage from "./BasePage";

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
});

const ImageWrapper = styled(Box)({
  position: "relative",
  width: "350px",
  margin: "auto",
});

const UploadButton = styled(Fab)({
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1,
});

const DeleteButton = styled(IconButton)({
  position: "absolute",
  top: "8px",
  left: "8px",
  zIndex: 1,
});

const EmptyStateContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "300px",
  border: "2px dashed #ccc",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center",
  marginBottom: "32px",
});

export default function CollagePage() {
  const [images, setImages] = useState([]);
  const [borderThickness, setBorderThickness] = useState(0);
  const [collageBlob, setCollageBlob] = useState(null);
  const [editMode, setEditMode] = useState(true);
  const canvasRef = useRef(null);
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    createCollage();
  }, [images]);

  const handleImageUpload = (event, index) => {
    const uploadedImage = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const newImage = {
          id: Date.now().toString(),
          src: e.target.result,
          width: img.width,
          height: img.height,
        };
        setImages((prevImages) => {
          const newImages = [...prevImages];
          newImages.splice(index, 0, newImage);
          return newImages;
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(uploadedImage);
  };

  const deleteImage = (index) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const createCollage = () => {
    if (images.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const maxWidth = Math.max(...images.map((image) => image.width), 0);
    let totalHeight = 0;

    images.forEach((image) => {
      const scaleFactor = maxWidth / image.width;
      const scaledHeight = image.height * scaleFactor;
      totalHeight += scaledHeight;
    });

    totalHeight += borderThickness * (images.length + 1);
    canvas.width = maxWidth + borderThickness * 2;
    canvas.height = totalHeight;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentHeight = borderThickness;
    images.forEach((image) => {
      const scaleFactor = maxWidth / image.width;
      const scaledHeight = image.height * scaleFactor;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, borderThickness, currentHeight, maxWidth, scaledHeight);
        currentHeight += scaledHeight + borderThickness;

        if (currentHeight >= totalHeight) {
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setCollageBlob(url);
          }, "image/png");
        }
      };
      img.src = image.src;
    });
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

      {editMode ? (
        <>
          <Typography variant="body1" marginBottom={5} gutterBottom>
            Upload images to create a collage:
          </Typography>
          {images.length === 0 ? (
            <EmptyStateContainer>
              <Typography variant="h6" gutterBottom>
                No images added
              </Typography>
              <Typography variant="body1" marginBottom={2}>
                Select your first image
              </Typography>
              <Fab
                color="primary"
                size="large"
                component="label"
              >
                <Add />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => handleImageUpload(event, 0)}
                />
              </Fab>
            </EmptyStateContainer>
          ) : (
            <Box sx={{ position: "relative" }}>
              <UploadButton
                color="primary"
                size="small"
                component="label"
                sx={{ top: "-25px" }}
              >
                <Add />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => handleImageUpload(event, 0)}
                />
              </UploadButton>

              {images.map((image, index) => (
                <ImageContainer key={image.id}>
                  <ImageWrapper>
                    <img src={image.src} alt={`layer ${index + 1}`} style={{ width: "100%" }} />
                    <DeleteButton onClick={() => deleteImage(index)}>
                      <Delete />
                    </DeleteButton>
                  </ImageWrapper>
                  {index === images.length - 1 && (
                    <UploadButton
                      color="primary"
                      size="small"
                      component="label"
                      sx={{ bottom: "-25px" }}
                    >
                      <Add />
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => handleImageUpload(event, images.length)}
                      />
                    </UploadButton>
                  )}
                </ImageContainer>
              ))}

                {images.map((_, index) => (
                    index < images.length - 1 && (
                        <UploadButton
                        key={index}
                        color="primary"
                        size="small"
                        component="label"
                        sx={{
                            top: `${images.slice(0, index + 1).reduce((totalHeight, image) => {
                            const scaleFactor = 350 / image.width;
                            const scaledHeight = image.height * scaleFactor;
                            return totalHeight + scaledHeight;
                            }, 0)}px`,
                            left: "50%",
                            transform: "translate(-50%, -50%)"
                        }}
                        >
                        <Add />
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(event) => handleImageUpload(event, index + 1)}
                        />
                        </UploadButton>
                    )
                ))}
            </Box>
          )}

          {images.length > 0 && (
            <Button
              variant="contained"
              startIcon={<ArrowForward />}
              onClick={() => {
                createCollage();
                setEditMode(false);
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
            sx={{
              mb: 2
            }}
          >
            Edit Photos
          </Button>
          <ImageWrapper>
            <CollageImage src={collageBlob} alt="Collage Result" />
          </ImageWrapper>
          <Box sx={{ width: 300 }}>
            <Typography id="border-thickness-slider" gutterBottom>
              Border Thickness
            </Typography>
            <Slider
              value={borderThickness}
              min={0}
              max={20}
              onChange={(event, newValue) => {
                setBorderThickness(newValue);
                createCollage();
              }}
              aria-labelledby="border-thickness-slider"
            />
          </Box>
          <Button
            variant="contained"
            startIcon={<Check />}
            onClick={() => {
              createCollage();
              setEditMode(false);
            }}
            sx={{
              marginTop: "10px",
              color: "#000000",
              backgroundColor: "#54D62C"
            }}
            fullWidth
            size="large"
          >
            Save Image
          </Button>
        </CollageContainer>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </BasePage>
  );
}

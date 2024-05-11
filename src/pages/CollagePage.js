import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Fab,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/system";
import { Delete, Add, Edit } from "@mui/icons-material";
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

export default function CollagePage() {
  const [images, setImages] = useState([]);
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

    canvas.width = maxWidth;
    canvas.height = totalHeight;

    let currentHeight = 0;
    images.forEach((image) => {
      const scaleFactor = maxWidth / image.width;
      const scaledHeight = image.height * scaleFactor;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, currentHeight, maxWidth, scaledHeight);
        currentHeight += scaledHeight;

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
      pageTitle="Collage Tool"
      breadcrumbLinks={[
        { name: "Editor", path: "/" },
        { name: "Collage Tool" },
      ]}
    >
      <Helmet>
        <title>Collage Tool - Editor - memeSRC</title>
      </Helmet>

      {editMode ? (
        <>
          <Typography variant="body1" gutterBottom>
            Upload images to create a collage:
          </Typography>

          <Box sx={{ position: "relative" }}>
            {images.length === 0 ? (
              <Fab
                color="primary"
                size="large"
                component="label"
                sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
              >
                <Add />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => handleImageUpload(event, 0)}
                />
              </Fab>
            ) : (
              <>
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
                      sx={{ top: `${(index + 1) * 100 / images.length}%`, left: "50%", transform: "translate(-50%, -50%)" }}
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
              </>
            )}
          </Box>

          {images.length > 0 && (
            <Button
              variant="contained"
              onClick={() => {
                createCollage();
                setEditMode(false);
              }}
              sx={{ marginTop: "32px" }}
            >
              Create & Save
            </Button>
          )}
        </>
      ) : (
        <CollageContainer>
          <ImageWrapper>
            <CollageImage src={collageBlob} alt="Collage Result" />
          </ImageWrapper>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => setEditMode(true)}
          >
            Back to Edit
          </Button>
        </CollageContainer>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </BasePage>
  );
}
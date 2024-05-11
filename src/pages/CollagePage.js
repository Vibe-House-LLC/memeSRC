import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/system";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";
import BasePage from "./BasePage";

const CollageContainer = styled(Box)({
  display: "flex",
  justifyContent: "center",
  marginTop: "16px",
});

const CollageImage = styled("img")({
  maxWidth: "100%",
  height: "auto",
});

const ThumbnailImage = styled("img")({
  width: "100%",
  height: "auto",
  objectFit: "contain",
  marginBottom: "8px",
});

export default function CollagePage() {
  const [images, setImages] = useState([]);
  const [collageBlob, setCollageBlob] = useState(null);
  const canvasRef = useRef(null);
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    if (images.length > 0) {
      createCollage();
    }
  }, [images]);

  const handleImageUpload = (event) => {
    const uploadedImages = Array.from(event.target.files);
    const imagePromises = uploadedImages.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            resolve({ id: Date.now().toString(), src: e.target.result, width: img.width, height: img.height });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((loadedImages) => {
      setImages((prevImages) => [...prevImages, ...loadedImages]);
    });
  };

  const createCollage = () => {
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

  const moveImage = (index, direction) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      const temp = newImages[index];

      if (direction === -1) {
        if (index === 0) {
          // Moving the first image up, shift all others down
          newImages.shift();
          newImages.push(temp);
        } else {
          // Swap the current image with the one above it
          newImages[index] = newImages[index - 1];
          newImages[index - 1] = temp;
        }
      } else if (direction === 1) {
        if (index === newImages.length - 1) {
          // Moving the last image down, shift all others up
          newImages.pop();
          newImages.unshift(temp);
        } else {
          // Swap the current image with the one below it
          newImages[index] = newImages[index + 1];
          newImages[index + 1] = temp;
        }
      }

      return newImages;
    });
  };

  return (
    <BasePage pageTitle="Collage Tool" breadcrumbLinks={[{ name: "Editor", path: "/" }, { name: "Collage Tool" }]}>
      <Helmet>
        <title>Collage Tool - Editor - memeSRC</title>
      </Helmet>

      <Typography variant="body1" gutterBottom>
        Upload images to create a collage:
      </Typography>
      <Button variant="contained" component="label">
        Upload Images
        <input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
      </Button>

      <Box sx={{ display: "flex" }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <List>
            {images.map((image, index) => (
              <ListItem key={image.id} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mr: 2 }}>
                  <IconButton
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUpward />
                  </IconButton>
                  <IconButton
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                  >
                    <ArrowDownward />
                  </IconButton>
                </Box>
                <ThumbnailImage src={image.src} alt={`Thumbnail ${index + 1}`} />
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ flex: 1 }}>
          {collageBlob && (
            <CollageContainer>
              <CollageImage
                src={collageBlob}
                alt="Collage Result"
                style={{ width: isMobile ? "100%" : "auto" }}
              />
            </CollageContainer>
          )}
        </Box>
      </Box>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </BasePage>
  );
}

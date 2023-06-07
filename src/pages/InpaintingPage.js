import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Button, Typography, Container, Slider } from '@mui/material';
import { fabric } from 'fabric';

const StyledContent = styled('div')(({ theme }) => ({
  maxWidth: 480,
  margin: 'auto',
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  flexDirection: 'column',
  padding: theme.spacing(12, 0),
}));

export default function InpaintingPage() {
  const fabricCanvasRef = React.useRef(null);
  const [brushWidth, setBrushWidth] = React.useState(5); // Initial brush width

  // Reference to the fabric.Canvas instance
  const fabricCanvasInstance = React.useRef();

  // Initialize canvas and load image (run only once after mounting)
  React.useEffect(() => {
    const canvas = new fabric.Canvas(fabricCanvasRef.current, {
      selection: false,
    });
    fabricCanvasInstance.current = canvas;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = 'https://i-dev.memesrc.com/3fbef76c-4ef5-404d-a587-efef1342d512.jpg';
    image.onload = function () {
      const fabricImage = new fabric.Image(image);
      canvas.add(fabricImage);
      fabricImage.set({ selectable: false, evented: false });
      canvas.setDimensions({ width: image.width, height: image.height });
      fabricCanvasRef.current.width = image.width;
      fabricCanvasRef.current.height = image.height;

      // Enable free drawing after the image is loaded and added
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = brushWidth; // Set initial brush width
      canvas.freeDrawingBrush.color = 'red'; // Set brush color
    };
  }, []);

  // Update brush width when brushWidth state changes (run whenever brushWidth changes)
  React.useEffect(() => {
    if (fabricCanvasInstance.current) {
      fabricCanvasInstance.current.freeDrawingBrush.width = brushWidth;
    }
  }, [brushWidth]);

  const handleBrushWidthChange = (event, newValue) => {
    setBrushWidth(newValue);
  };

  const exportDrawing = () => {
    const originalCanvas = fabricCanvasInstance.current;
  
    // Create a temporary canvas for drawing
    const tempCanvasDrawing = new fabric.Canvas();
    tempCanvasDrawing.setWidth(originalCanvas.getWidth());
    tempCanvasDrawing.setHeight(originalCanvas.getHeight());
  
    let fabricImage = null; // Reference to the fabric.Image instance
  
    // Create a solid rectangle that covers the entire canvas
    const solidRect = new fabric.Rect({
      left: 0,
      top: 0,
      width: tempCanvasDrawing.getWidth(),
      height: tempCanvasDrawing.getHeight(),
      fill: 'black',
      selectable: false,
      evented: false,
    });
  
    tempCanvasDrawing.add(solidRect);
  
    // Copy path objects (the drawings) from the original canvas to the temporary one
    originalCanvas.getObjects().forEach((obj) => {
      if (obj instanceof fabric.Path) {
        const path = obj.toObject();
        // Set fill to 'transparent' and globalCompositeOperation to 'destination-out'
        // to create the effect of an inverted mask
        tempCanvasDrawing.add(new fabric.Path(path.path, { ...path, fill: 'transparent', globalCompositeOperation: 'destination-out' }));
      }
    
      if (obj instanceof fabric.Image) {
        fabricImage = obj;
      }
    });
  
    // Export the drawing
    const dataURLDrawing = tempCanvasDrawing.toDataURL({
      format: 'png',
      left: 0,
      top: 0,
      width: tempCanvasDrawing.getWidth(),
      height: tempCanvasDrawing.getHeight(),
    });
  
    // Create anchor for drawing download
    const anchorDrawing = document.createElement('a');
    anchorDrawing.href = dataURLDrawing;
    anchorDrawing.download = 'drawing.png';
    anchorDrawing.click();
  
    if (fabricImage) {
      // Create a temporary canvas for background image
      const tempCanvasBgImage = document.createElement('canvas');
      tempCanvasBgImage.width = originalCanvas.getWidth();
      tempCanvasBgImage.height = originalCanvas.getHeight();
  
      // Draw the image onto the temporary canvas
      const context = tempCanvasBgImage.getContext('2d');
      context.drawImage(fabricImage._element, 0, 0, tempCanvasBgImage.width, tempCanvasBgImage.height);
  
      // Export the background image
      const dataURLBgImage = tempCanvasBgImage.toDataURL('image/png');
  
      // Introduce a delay before initiating the second download
      setTimeout(() => {
        const anchorImage = document.createElement('a');
        anchorImage.href = dataURLBgImage;
        anchorImage.download = 'background.png';
        anchorImage.click();
      }, 1000); // 1000 ms delay
    }
  };    

  return (
    <>
      <Helmet>
        <title>Inpainting Page | memeSRC 2.0</title>
      </Helmet>

      <Container>
        <StyledContent sx={{ textAlign: 'center', alignItems: 'center' }}>

          <Typography variant="h3" paragraph>
            Inpainting Masking Demo
          </Typography>

          <canvas ref={fabricCanvasRef} />

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <Typography id="brush-width-slider" sx={{ marginRight: '16px' }}>
              Brush Width: {brushWidth}
            </Typography>
            <div
              style={{
                width: brushWidth,
                height: brushWidth,
                borderRadius: '50%',
                backgroundColor: 'red',
              }}
            />
          </div>

          <Slider
            value={brushWidth}
            onChange={handleBrushWidthChange}
            min={1}
            max={100}
            step={1}
            aria-labelledby="brush-width-slider"
          />

          <Button onClick={exportDrawing} size="large" variant="contained">
            Export Drawing
          </Button>

        </StyledContent>
      </Container>
    </>
  );
}
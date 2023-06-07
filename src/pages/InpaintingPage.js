import React from 'react';
import { Helmet } from 'react-helmet-async';
import { styled } from '@mui/material/styles';
import { Button, Typography, Container, Slider, Box } from '@mui/material';
import { fabric } from 'fabric';

const StyledContent = styled('div')(({ theme }) => ({
  margin: 'auto',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(2, 0),
}));

const Controls = ({ brushWidth, handleBrushWidthChange, exportDrawing }) => (
  <Box sx={{ marginBottom: '16px', textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography id="brush-width-slider" sx={{ marginRight: '16px' }}>
        Brush Width: {brushWidth}
      </Typography>
      <Box
        sx={{
          width: brushWidth,
          height: brushWidth,
          borderRadius: '50%',
          backgroundColor: 'red',
        }}
      />
    </Box>
    <Slider
      value={brushWidth}
      onChange={handleBrushWidthChange}
      min={1}
      max={100}
      step={1}
      aria-labelledby="brush-width-slider"
      sx={{ width: '50%' }} // Adjust this percentage as needed to fit your design
    />
    <Button onClick={exportDrawing} size="medium" variant="contained">
      Export Components
    </Button>
  </Box>
);

export default function InpaintingPage() {
  const fabricCanvasRef = React.useRef(null);
  const [brushWidth, setBrushWidth] = React.useState(50);

  const fabricCanvasInstance = React.useRef();

  React.useEffect(() => {
    const canvas = new fabric.Canvas(fabricCanvasRef.current, {
      selection: false,
    });

    fabricCanvasInstance.current = canvas;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = 'https://memesrc.com/seinfeld/img/5/10/seinfeld-5-10-2087.jpg';
    image.onload = function () {
      const fabricImage = new fabric.Image(image);

      fabricImage.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });

      canvas.add(fabricImage);

      canvas.setDimensions({ width: image.width, height: image.height });
      fabricCanvasRef.current.width = image.width;
      fabricCanvasRef.current.height = image.height;

      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = brushWidth; 
      canvas.freeDrawingBrush.color = 'red'; 
    };
  }, []);

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
    const originalWidth = originalCanvas.getWidth();
    const originalHeight = originalCanvas.getHeight();

    const tempCanvasDrawing = new fabric.Canvas();
    tempCanvasDrawing.setWidth(1024);
    tempCanvasDrawing.setHeight(1024);

    let fabricImage = null;

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

    const scale = Math.min(1024 / originalWidth, 1024 / originalHeight);
    const offsetX = (1024 - originalWidth * scale) / 2;
    const offsetY = (1024 - originalHeight * scale) / 2;

    originalCanvas.getObjects().forEach((obj) => {
      if (obj instanceof fabric.Path) {
        const path = obj.toObject();
        const newPath = new fabric.Path(path.path, { ...path, fill: 'transparent', globalCompositeOperation: 'destination-out' });
        
        // Scale and reposition the paths
        newPath.scale(scale);
        newPath.set({ left: newPath.left * scale + offsetX, top: newPath.top * scale + offsetY });

        tempCanvasDrawing.add(newPath);
      }

      if (obj instanceof fabric.Image) {
        fabricImage = obj;
      }
    });

    const dataURLDrawing = tempCanvasDrawing.toDataURL({
      format: 'png',
      left: 0,
      top: 0,
      width: tempCanvasDrawing.getWidth(),
      height: tempCanvasDrawing.getHeight(),
    });

    const anchorDrawing = document.createElement('a');
    anchorDrawing.href = dataURLDrawing;
    anchorDrawing.download = 'mask.png';
    anchorDrawing.click();

    if (fabricImage) {
      const tempCanvasBgImage = document.createElement('canvas');
      tempCanvasBgImage.width = 1024;
      tempCanvasBgImage.height = 1024;

      const context = tempCanvasBgImage.getContext('2d');

      const scale = Math.min(tempCanvasBgImage.width / fabricImage.width, tempCanvasBgImage.height / fabricImage.height);
      const width = fabricImage.width * scale;
      const height = fabricImage.height * scale;
      const x = (tempCanvasBgImage.width - width) / 2;
      const y = (tempCanvasBgImage.height - height) / 2;

      context.drawImage(fabricImage._element, x, y, width, height);

      const dataURLBgImage = tempCanvasBgImage.toDataURL('image/png');

      setTimeout(() => {
        const anchorImage = document.createElement('a');
        anchorImage.href = dataURLBgImage;
        anchorImage.download = 'background.png';
        anchorImage.click();
      }, 1000);
    }
  };


  return (
    <>
      <Helmet>
        <title>Inpainting Page | memeSRC 2.0</title>
      </Helmet>

      <Container>
        <StyledContent>
          <Typography variant="h4" paragraph>
            Inpainting Masking Demo
          </Typography>

          <Controls
            brushWidth={brushWidth}
            handleBrushWidthChange={handleBrushWidthChange}
            exportDrawing={exportDrawing}
          />

          <canvas ref={fabricCanvasRef} />
        </StyledContent>
      </Container>
    </>
  );
}

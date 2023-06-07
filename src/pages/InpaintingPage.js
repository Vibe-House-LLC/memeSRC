import React from 'react';
import { Helmet } from 'react-helmet-async';
import { styled } from '@mui/material/styles';
import { Button, Typography, Container, Slider, Box } from '@mui/material';
import { fabric } from 'fabric';
import { API } from 'aws-amplify';

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
  const [imageSrc, setImageSrc] = React.useState('https://memesrc.com/seinfeld/img/5/10/seinfeld-5-10-2087.jpg');

  const fabricCanvasInstance = React.useRef();

  const initializeCanvas = React.useCallback((newImageSrc) => {
    if (fabricCanvasInstance.current) {
      fabricCanvasInstance.current.dispose();
    }

    const canvas = new fabric.Canvas(fabricCanvasRef.current, {
      selection: false,
    });

    fabricCanvasInstance.current = canvas;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = brushWidth;
    canvas.freeDrawingBrush.color = 'red';

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = newImageSrc;
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
      canvas.requestRenderAll();
    };
  }, [brushWidth]);

  React.useEffect(() => {
    initializeCanvas(imageSrc);
  }, [initializeCanvas, imageSrc, brushWidth]);

  const handleBrushWidthChange = (event, newValue) => {
    setBrushWidth(newValue);
  };

  const exportDrawing = async () => {
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

    const scale = Math.max(1024 / originalWidth, 1024 / originalHeight);
    const offsetX = (1024 - originalWidth * scale) / 2;
    const offsetY = (1024 - originalHeight * scale) / 2;

    originalCanvas.getObjects().forEach((obj) => {
      if (obj instanceof fabric.Path) {
        const path = obj.toObject();
        const newPath = new fabric.Path(path.path, { ...path, fill: 'transparent', globalCompositeOperation: 'destination-out' });

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

    if (fabricImage) {
      const tempCanvasBgImage = document.createElement('canvas');
      tempCanvasBgImage.width = 1024;
      tempCanvasBgImage.height = 1024;

      const context = tempCanvasBgImage.getContext('2d');

      const scale = Math.max(tempCanvasBgImage.width / fabricImage.width, tempCanvasBgImage.height / fabricImage.height);
      const width = fabricImage.width * scale;
      const height = fabricImage.height * scale;
      const x = (tempCanvasBgImage.width - width) / 2;
      const y = (tempCanvasBgImage.height - height) / 2;

      context.drawImage(fabricImage._element, x, y, width, height);

      const dataURLBgImage = tempCanvasBgImage.toDataURL('image/png');

      const data = {
        image: dataURLBgImage,
        mask: dataURLDrawing,
        prompt: "rainbow",
      };

      try {
        const response = await API.post('publicapi', '/inpaint', {
          body: data
        });
        const responseImg = new Image();
        responseImg.src = response.imageData;
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = originalWidth;
        finalCanvas.height = originalHeight;
        const finalContext = finalCanvas.getContext('2d');

        responseImg.onload = function() {
          const scale = Math.max(originalWidth / responseImg.width, originalHeight / responseImg.height);
          const width = responseImg.width * scale;
          const height = responseImg.height * scale;
          const x = (finalCanvas.width - width) / 2;
          const y = (finalCanvas.height - height) / 2;
          finalContext.drawImage(responseImg, x, y, width, height);
          
          const croppedDataURL = finalCanvas.toDataURL('image/png');
          setImageSrc(croppedDataURL);
        };

      } catch (error) {
        console.log('Error posting to lambda function:', error);
      }
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

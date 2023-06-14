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

const Controls = ({ brushWidth, handleBrushWidthChange, exportDrawing, importImage }) => (
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
      sx={{ width: '50%' }}
    />
    <Button onClick={exportDrawing} size="medium" variant="contained">
      Export Components
    </Button>
    <input type="file" accept="image/*" onChange={importImage} />
  </Box>
);

export default function InpaintingPage() {
  const fabricCanvasRef = React.useRef(null);
  const [brushWidth, setBrushWidth] = React.useState(50);
  const [imageSrc, setImageSrc] = React.useState('');

  const fabricCanvasInstance = React.useRef();

  const initializeCanvas = React.useCallback((newImageSrc) => {
    if (fabricCanvasInstance.current) {
      fabricCanvasInstance.current.dispose();
    }

    const canvas = new fabric.Canvas(fabricCanvasRef.current, {
      width: 1024,
      height: 1024,
      selection: false,
      backgroundColor: 'black',
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

      // Scale image to fit canvas
      const scale = Math.min(1024 / image.width, 1024 / image.height);
      fabricImage.scale(scale).set({
        left: (canvas.width - image.width * scale) / 2,
        top: (canvas.height - image.height * scale) / 2,
        selectable: false,
        evented: false,
      });

      canvas.add(fabricImage);
      canvas.requestRenderAll();
    };
    
  }, [brushWidth]);

  React.useEffect(() => {
    initializeCanvas(imageSrc);
  }, [initializeCanvas, imageSrc, brushWidth]);

  const handleBrushWidthChange = (event, newValue) => {
    setBrushWidth(newValue);
  };

  const downloadDataURL = (dataURL, fileName) => {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = fileName;

    // Simulate a click to start the download
    link.click();
  };

  const exportDrawing = async () => {
    const originalCanvas = fabricCanvasInstance.current;

    let fabricImage = null;

    const tempCanvasDrawing = new fabric.Canvas();
    tempCanvasDrawing.setWidth(1024);
    tempCanvasDrawing.setHeight(1024);

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

    originalCanvas.getObjects().forEach((obj) => {
      if (obj instanceof fabric.Path) {
        const path = obj.toObject();
        const newPath = new fabric.Path(path.path, { ...path, fill: 'transparent', globalCompositeOperation: 'destination-out' });

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
      const dataURLBgImage = fabricImage.toDataURL('image/png');

      const data = {
        image: dataURLBgImage,
        mask: dataURLDrawing,
        prompt: "rainbow",
      };

      // Delay the downloads using setTimeout
      setTimeout(() => {
        downloadDataURL(dataURLBgImage, 'background_image.png');
      }, 500);

      setTimeout(() => {
        downloadDataURL(dataURLDrawing, 'drawing.png');
      }, 1000);

      try {
        const response = await API.post('publicapi', '/inpaint', {
          body: data
        });
        setImageSrc(response.imageData);
      } catch (error) {
        console.log('Error posting to lambda function:', error);
      }
    }
  };

  const importImage = (event) => {
    const file = event.target.files[0];
    const temporaryURL = URL.createObjectURL(file);

    const image = new Image();
    image.src = temporaryURL;
    image.onload = function () {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      const size = 1024;
      const aspectRatio = image.width / image.height;

      let width = size;
      let height = size;

      if (aspectRatio < 1) {
        width = size * aspectRatio;
      } else {
        height = size / aspectRatio;
      }

      const xOffset = (size - width) / 2;
      const yOffset = (size - height) / 2;

      canvas.width = size;
      canvas.height = size;
      context.fillStyle = 'black';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, xOffset, yOffset, width, height);

      const imageData = canvas.toDataURL();
      initializeCanvas(imageData);
      setImageSrc(imageData);
    };
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
            importImage={importImage}
          />
          <canvas ref={fabricCanvasRef} width="1024" height="1024" />
        </StyledContent>
      </Container>
    </>
  );
}
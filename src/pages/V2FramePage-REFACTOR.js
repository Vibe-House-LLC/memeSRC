import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Slider, Typography } from '@mui/material';

// NOTE: This isn't really the "Frame Page" itself, it's just the caption editor section.
// TODO: Tidy this up and replace some of the clutter in V2FramePage.js by importing this component

const V2FramePage = () => {
  const [subtitle, setSubtitle] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [imageUrl, setImageUrl] = useState('');
  const canvasRef = useRef(null);
  const throttleTimeoutRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = 'https://v2-beta.memesrc.com/frame/seinfeld/1/1/4040';
    image.onload = () => {
      if (throttleTimeoutRef.current === null) {
        throttleTimeoutRef.current = setTimeout(() => {
          canvas.width = image.width;
          canvas.height = image.height;
          context.drawImage(image, 0, 0);
          context.font = `${fontSize}px Arial`;
          context.fillStyle = 'white';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          const lines = subtitle.split('\n');
          const lineSpacing = fontSize * lineHeight;
          const totalHeight = lines.length * lineSpacing;
          const startY = canvas.height * (verticalPosition / 100) - totalHeight / 2;
          lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, startY + index * lineSpacing);
          });
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
          }, 'image/jpeg', 0.9);
          throttleTimeoutRef.current = null;
        }, 10); // Adjust the throttle delay as needed
      }
    };
  }, [subtitle, fontSize, verticalPosition, lineHeight]);

  return (
    <Box>
      <Box position="relative">
        {imageUrl && <img src={imageUrl} alt="" width="100%" crossOrigin="anonymous" />}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Box>
      <TextField
        label="Subtitle"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Typography id="font-size-slider" gutterBottom>
        Font Size
      </Typography>
      <Slider
        value={fontSize}
        min={12}
        max={48}
        step={1}
        onChange={(e, value) => setFontSize(value)}
        aria-labelledby="font-size-slider"
      />
      <Typography id="vertical-position-slider" gutterBottom>
        Vertical Position
      </Typography>
      <Slider
        value={verticalPosition}
        min={0}
        max={100}
        step={1}
        onChange={(e, value) => setVerticalPosition(value)}
        aria-labelledby="vertical-position-slider"
      />
      <Typography id="line-height-slider" gutterBottom>
        Line Height
      </Typography>
      <Slider
        value={lineHeight}
        min={1}
        max={3}
        step={0.1}
        onChange={(e, value) => setLineHeight(value)}
        aria-labelledby="line-height-slider"
      />
    </Box>
  );
};

export default V2FramePage;

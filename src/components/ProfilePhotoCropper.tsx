import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  Stack,
} from '@mui/material';
import { Close, ZoomIn, ZoomOut } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

interface ProfilePhotoCropperProps {
  open: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCrop: (croppedBlob: Blob) => void;
}

const ProfilePhotoCropper: React.FC<ProfilePhotoCropperProps> = ({
  open,
  imageFile,
  onClose,
  onCrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState(1);

  const CANVAS_SIZE = 300; // Display size
  const OUTPUT_SIZE = 500; // Final output size

  // Load image from file
  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      setImage(img);
      // Calculate initial scale to cover the circle
      const minScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      setScale(minScale);
      setPosition({ x: 0, y: 0 });
      URL.revokeObjectURL(url);
    };

    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw image
    ctx.save();
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const x = (CANVAS_SIZE - scaledWidth) / 2 + position.x;
    const y = (CANVAS_SIZE - scaledHeight) / 2 + position.y;

    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
    ctx.restore();

    // Draw circular overlay (darkened area outside circle)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Cut out circle
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw circle border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [image, scale, position]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Helper function to get distance between two touch points
  const getTouchDistance = (touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle zoom
  const handleZoom = (delta: number) => {
    setScale((prev) => {
      const newScale = prev + delta;
      const minScale = Math.max(CANVAS_SIZE / (image?.width || 1), CANVAS_SIZE / (image?.height || 1));
      return Math.max(minScale, Math.min(3, newScale));
    });
  };

  // Handle mouse/touch interactions
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 2) {
        // Two-finger pinch zoom
        e.preventDefault();
        const distance = getTouchDistance(e.touches);
        setTouchStartDistance(distance);
        setTouchStartScale(scale);
        setIsDragging(false);
      } else if (e.touches.length === 1) {
        // Single-finger drag
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
        setTouchStartDistance(null);
      }
    } else {
      // Mouse event
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!image) return;

      if ('touches' in e && e.touches.length === 2 && touchStartDistance !== null) {
        // Two-finger pinch zoom
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        const scaleRatio = currentDistance / touchStartDistance;
        const newScale = touchStartScale * scaleRatio;
        
        const minScale = Math.max(CANVAS_SIZE / image.width, CANVAS_SIZE / image.height);
        const clampedScale = Math.max(minScale, Math.min(3, newScale));
        
        setScale(clampedScale);
        
        // Constrain position when zooming
        const scaledWidth = image.width * clampedScale;
        const scaledHeight = image.height * clampedScale;
        const maxX = Math.max(0, (scaledWidth - CANVAS_SIZE) / 2);
        const maxY = Math.max(0, (scaledHeight - CANVAS_SIZE) / 2);
        
        setPosition((prev) => ({
          x: Math.max(-maxX, Math.min(maxX, prev.x)),
          y: Math.max(-maxY, Math.min(maxY, prev.y)),
        }));
      } else if (isDragging) {
        // Single-finger drag or mouse drag
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const newX = clientX - dragStart.x;
        const newY = clientY - dragStart.y;

        // Calculate bounds to keep image covering the circle
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const maxX = Math.max(0, (scaledWidth - CANVAS_SIZE) / 2);
        const maxY = Math.max(0, (scaledHeight - CANVAS_SIZE) / 2);

        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY)),
        });
      }
    },
    [isDragging, dragStart, scale, image, touchStartDistance, touchStartScale, getTouchDistance]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setTouchStartDistance(null);
  }, []);

  useEffect(() => {
    if (isDragging || touchStartDistance !== null) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
      window.addEventListener('touchcancel', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, [isDragging, touchStartDistance, handlePointerMove, handlePointerUp]);

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    handleZoom(delta);
  };

  // Crop and export
  const handleCrop = async () => {
    if (!image) return;

    setProcessing(true);

    try {
      // Create output canvas at 500x500
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = OUTPUT_SIZE;
      outputCanvas.height = OUTPUT_SIZE;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) return;

      // Calculate scaling from display to output
      const outputScale = OUTPUT_SIZE / CANVAS_SIZE;
      const scaledWidth = image.width * scale * outputScale;
      const scaledHeight = image.height * scale * outputScale;
      const x = (OUTPUT_SIZE - scaledWidth) / 2 + position.x * outputScale;
      const y = (OUTPUT_SIZE - scaledHeight) / 2 + position.y * outputScale;

      // Clip to circle
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw image
      ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

      // Convert to blob
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            onCrop(blob);
          }
          setProcessing(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (error) {
      console.error('Error cropping image:', error);
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Crop Profile Photo
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Box
          ref={containerRef}
          sx={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            borderRadius: '50%',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onWheel={handleWheel}
            style={{ display: 'block' }}
          />
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => handleZoom(-0.1)} size="small" color="primary">
            <ZoomOut />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80, textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </Typography>
          <IconButton onClick={() => handleZoom(0.1)} size="small" color="primary">
            <ZoomIn />
          </IconButton>
        </Stack>

        <Typography variant="body2" color="text.secondary" align="center">
          Drag to reposition • Scroll or pinch to zoom
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <LoadingButton onClick={handleCrop} variant="contained" loading={processing}>
          Save Photo
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default ProfilePhotoCropper;


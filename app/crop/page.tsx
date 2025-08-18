"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric';

const ImageCropper = () => {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [image, setImage] = useState<fabric.Image | null>(null);
  const [cropRect, setCropRect] = useState<fabric.Rect | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [showCroppedImage, setShowCroppedImage] = useState(false);

  useEffect(() => {
    const initCanvas = new fabric.Canvas('canvas', {
      width: 1,
      height: 1,
      backgroundColor: '#f0f0f0',
      uniformScaling: false,
    });
    setCanvas(initCanvas);

    return () => {
      initCanvas.dispose();
    };
  }, []);

  const scaleImageToFit = (img: fabric.Image, canvas: fabric.Canvas) => {
    const horizontalPadding = 40; // 20px on each side
    const verticalPadding = 80; // 40px on top and bottom

    const maxWidth = window.innerWidth - horizontalPadding;
    const maxHeight = window.innerHeight - verticalPadding;

    const scaleX = maxWidth / img.width!;
    const scaleY = maxHeight / img.height!;
    const scale = Math.min(scaleX, scaleY);
    setScale(scale);

    const scaledWidth = img.width! * scale;
    const scaledHeight = img.height! * scale;

    canvas.setDimensions({ width: scaledWidth, height: scaledHeight });
    
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
      scaleX: scale,
      scaleY: scale,
    });

    canvas.renderAll();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canvas) {
      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target?.result as string, (img) => {
          canvas.clear();
          setImage(img);
          scaleImageToFit(img, canvas);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const createCropRect = (left: number, top: number, width: number, height: number) => {
    const rect = new fabric.Rect({
      left,
      top,
      width,
      height,
      fill: 'rgba(255, 255, 255, 0.2)',
      hasRotatingPoint: false,
      lockRotation: true,
      transparentCorners: false,
      cornerColor: 'white',
      cornerStrokeColor: 'black',
      cornerStyle: 'circle',
      cornerSize: 10,
      borderColor: 'black',
      borderScaleFactor: 1.5,
    });

    // Hide the rotation control
    rect.setControlsVisibility({ mtr: false });

    return rect;
  };

  const handleCanvasMouseDown = (e: fabric.IEvent) => {
    if (!canvas || !image) return;
    const pointer = canvas.getPointer(e.e);

    if (cropRect) {
      canvas.setActiveObject(cropRect);
    } else {
      setIsDrawing(true);
      setStartPoint({ x: pointer.x, y: pointer.y });

      const rect = createCropRect(pointer.x, pointer.y, 0, 0);
      canvas.add(rect);
      setCropRect(rect);
    }
    canvas.renderAll();
  };

  const handleCanvasMouseMove = (e: fabric.IEvent) => {
    if (!canvas || !isDrawing || !startPoint || !cropRect || !image) return;
    const pointer = canvas.getPointer(e.e);

    // Calculate the image boundaries
    const imgBounds = {
      left: image.left || 0,
      top: image.top || 0,
      right: (image.left || 0) + (image.width || 0) * (image.scaleX || 1),
      bottom: (image.top || 0) + (image.height || 0) * (image.scaleY || 1),
    };

    // Constrain the pointer coordinates within the image boundaries
    const constrainedPointer = {
      x: Math.max(imgBounds.left, Math.min(pointer.x, imgBounds.right)),
      y: Math.max(imgBounds.top, Math.min(pointer.y, imgBounds.bottom)),
    };

    const width = Math.abs(constrainedPointer.x - startPoint.x);
    const height = Math.abs(constrainedPointer.y - startPoint.y);

    cropRect.set({
      left: Math.min(startPoint.x, constrainedPointer.x),
      top: Math.min(startPoint.y, constrainedPointer.y),
      width,
      height,
    });

    canvas.renderAll();
  };

  const handleCanvasMouseUp = () => {
    if (!cropRect || !canvas || !image) return;
    setIsDrawing(false);
    setStartPoint(null);

    // Ensure the crop rectangle is fully within the image bounds
    const imgBounds = {
      left: image.left || 0,
      top: image.top || 0,
      right: (image.left || 0) + (image.width || 0) * (image.scaleX || 1),
      bottom: (image.top || 0) + (image.height || 0) * (image.scaleY || 1),
    };

    const rectBounds = cropRect.getBoundingRect();

    cropRect.set({
      left: Math.max(imgBounds.left, Math.min(rectBounds.left, imgBounds.right - rectBounds.width)),
      top: Math.max(imgBounds.top, Math.min(rectBounds.top, imgBounds.bottom - rectBounds.height)),
    });

    canvas.setActiveObject(cropRect);
    canvas.renderAll();
  };

  useEffect(() => {
    if (!canvas) return;

    const handlers = {
      'mouse:down': handleCanvasMouseDown,
      'mouse:move': handleCanvasMouseMove,
      'mouse:up': handleCanvasMouseUp,
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      canvas.on(event as any, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        canvas.off(event as any, handler);
      });
    };
  }, [canvas, isDrawing, startPoint, cropRect, image]);

  const handleCrop = () => {
    if (canvas && cropRect && image) {
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');
      
      if (ctx) {
        const rect = cropRect.getBoundingRect();
        const imgElement = image.getElement() as HTMLImageElement;

        const scaledRect = {
          left: rect.left / scale,
          top: rect.top / scale,
          width: rect.width / scale,
          height: rect.height / scale,
        };

        croppedCanvas.width = scaledRect.width;
        croppedCanvas.height = scaledRect.height;

        ctx.drawImage(
          imgElement,
          scaledRect.left,
          scaledRect.top,
          scaledRect.width,
          scaledRect.height,
          0,
          0,
          scaledRect.width,
          scaledRect.height
        );

        croppedCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setCroppedImageUrl(url);
            setShowCroppedImage(true); // Show the cropped image
          }
        }, 'image/png');
      }
    }
  };

  const handleUndo = () => {
    setShowCroppedImage(false);
    setCroppedImageUrl(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Image Cropper</h1>
      <div style={{ display: showCroppedImage ? 'none' : 'block' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="mb-4"
        />
        <div className="mb-4">
          <button onClick={handleCrop} className="bg-green-500 text-white px-4 py-2 rounded">
            Crop Image
          </button>
        </div>
        <canvas id="canvas" />
      </div>
      {showCroppedImage && croppedImageUrl && (
        <div>
          <h2 className="text-xl font-bold mb-2">Cropped Image:</h2>
          <img src={croppedImageUrl} alt="Cropped" className="max-w-full h-auto mb-4" />
          <button 
            onClick={handleUndo} 
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Undo Crop
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageCropper;
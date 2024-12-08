// /app/collage/CollageTool.tsx
'use client'

import { useState, useRef, useEffect } from 'react';
import { Trash2, ChevronUp, ChevronDown, Plus, ArrowRight, ArrowLeft } from 'lucide-react';

interface ImageData {
  id: string;
  file: File;
}

export default function CollageTool() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [borderThickness, setBorderThickness] = useState(15);
  const [editMode, setEditMode] = useState(true);
  const [collageBlob, setCollageBlob] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    createCollage();
  }, [images, borderThickness]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files).map((file) => ({
        id: Date.now().toString(),
        file,
      }));

      setImages((prevImages) => {
        const updatedImages = [...prevImages];
        updatedImages.splice(index, 0, ...newImages);
        return updatedImages;
      });
    }
  };

  const deleteImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: number) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      if (index + direction < 0 || index + direction >= newImages.length) {
        return newImages;
      }
      const temp = newImages[index];
      newImages[index] = newImages[index + direction];
      newImages[index + direction] = temp;
      return newImages;
    });
  };

  const createCollage = async () => {
    if (images.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxWidth = 1000;
    let totalHeight = 0;

    // Load all images and get their dimensions
    const loadedImages = await Promise.all(
      images.map(async (image) => {
        const imageElement = document.createElement('img');
        const objectUrl = URL.createObjectURL(image.file);
        imageElement.src = objectUrl;
        await new Promise((resolve) => { imageElement.onload = resolve; });
        URL.revokeObjectURL(objectUrl);

        const scaleFactor = maxWidth / imageElement.width;
        const scaledHeight = imageElement.height * scaleFactor;
        totalHeight += scaledHeight;

        return {
          element: imageElement,
          width: maxWidth,
          height: scaledHeight,
        };
      })
    );

    totalHeight += borderThickness * (loadedImages.length + 1);
    canvas.width = maxWidth + borderThickness * 2;
    canvas.height = totalHeight;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentHeight = borderThickness;
    loadedImages.forEach((image) => {
      ctx.drawImage(image.element, borderThickness, currentHeight, image.width, image.height);
      currentHeight += image.height + borderThickness;
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCollageBlob(url);
      }
    }, "image/png");
  };

  return (
    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8">
      {editMode ? (
        <>
          {images.length === 0 ? (
            <div className="text-center">
              <p className="text-xl mb-4">No images added</p>
              <p className="mb-6">Select your first image</p>
              <label htmlFor="image-upload-0" className="cursor-pointer">
                <div className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <Plus size={24} />
                </div>
                <input
                  id="image-upload-0"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 0)}
                  className="hidden"
                  multiple
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {images.map((image, index) => (
                <div key={image.id} className="relative">
                  <img 
                    src={URL.createObjectURL(image.file)} 
                    alt={`Uploaded image ${index + 1}`} 
                    className="w-full h-auto max-w-md mx-auto"
                  />
                  <div className="absolute top-2 right-2 space-x-2">
                    <button onClick={() => deleteImage(index)} className="p-1 bg-white text-red-500 rounded-full hover:bg-red-100">
                      <Trash2 size={20} />
                    </button>
                    <button onClick={() => moveImage(index, -1)} className="p-1 bg-white text-green-500 rounded-full hover:bg-green-100">
                      <ChevronUp size={20} />
                    </button>
                    <button onClick={() => moveImage(index, 1)} className="p-1 bg-white text-orange-500 rounded-full hover:bg-orange-100">
                      <ChevronDown size={20} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="text-center mt-4">
                <label htmlFor={`image-upload-${images.length}`} className="cursor-pointer">
                  <div className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <Plus size={24} />
                  </div>
                  <input
                    id={`image-upload-${images.length}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, images.length)}
                    className="hidden"
                    multiple
                  />
                </label>
              </div>
            </div>
          )}
          {images.length > 0 && (
            <button
              onClick={() => {
                createCollage();
                setEditMode(false);
              }}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center"
            >
              Continue
              <ArrowRight size={20} className="ml-2" />
            </button>
          )}
        </>
      ) : (
        <div className="text-center">
          <button
            onClick={() => setEditMode(true)}
            className="mb-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center"
          >
            <ArrowLeft size={20} className="mr-2" />
            Edit Photos
          </button>
          <div className="mb-4">
            <label htmlFor="borderThickness" className="block mb-2">Border Thickness:</label>
            <input
              type="range"
              id="borderThickness"
              min="0"
              max="65"
              value={borderThickness}
              onChange={(e) => setBorderThickness(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {collageBlob && (
            <img src={collageBlob} alt="Collage Result" className="max-w-full h-auto mx-auto" />
          )}
          <p className="mt-4 text-green-500 font-bold">Right click the image to save</p>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

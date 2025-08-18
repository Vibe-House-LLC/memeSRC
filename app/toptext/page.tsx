'use client'

import { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, ArrowLeft } from 'lucide-react';

export default function TopCaptionTool() {
  const [image, setImage] = useState<File | null>(null);
  const [whiteSpaceHeight, setWhiteSpaceHeight] = useState(100);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (image) {
      addWhiteSpace();
    }
  }, [image, whiteSpaceHeight]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      setImage(files[0]);
    }
  };

  const addWhiteSpace = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height + whiteSpaceHeight;

      // Fill the canvas with white
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image below the white space
      ctx.drawImage(img, 0, whiteSpaceHeight);

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      setResultImage(dataUrl);
    };
    img.src = URL.createObjectURL(image);
  };

  return (
    <div className="min-h-screen pt-16 pb-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-3xl shadow-lg rounded-lg overflow-hidden border-2 border-dashed border-gray-800 p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-100">Top Caption Tool</h1>
        {!image ? (
          <div className="text-center py-12">
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-xl mb-4 text-gray-200">No image selected</p>
            <p className="mb-6 text-gray-400">Select an image to add white space</p>
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="bg-blue-600 hover:bg-blue-700 text-gray-100 font-bold py-3 px-6 rounded-lg inline-flex items-center transition duration-150 ease-in-out">
                <Upload size={20} className="mr-2" />
                Upload Image
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <label htmlFor="whiteSpaceHeight" className="block mb-2 text-gray-200">White Space Height:</label>
              <input
                type="range"
                id="whiteSpaceHeight"
                min="0"
                max="500"
                step="10"
                value={whiteSpaceHeight}
                onChange={(e) => setWhiteSpaceHeight(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-gray-200">{whiteSpaceHeight}px</span>
            </div>
            <div className="mb-4 overflow-auto max-h-[calc(100vh-300px)]">
              {resultImage && (
                <img src={resultImage} alt="Result" className="max-w-full h-auto mx-auto border border-gray-600 rounded-lg" />
              )}
            </div>
            <button
              onClick={() => setImage(null)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-gray-100 font-bold py-3 px-6 rounded-lg flex items-center justify-center transition duration-150 ease-in-out"
            >
              <ArrowLeft size={20} className="mr-2" />
              Upload New Image
            </button>
            <p className="mt-4 text-green-400 font-bold">Right click the image to save</p>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
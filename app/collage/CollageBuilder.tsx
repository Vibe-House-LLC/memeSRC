'use client'

import { useState, useRef, useEffect } from 'react';
import { Trash2, Download, Plus, Grid } from 'lucide-react';
import { 
  Layout, 
  layoutDefinitions, 
  getLayoutsForPanelCount 
} from './config/layouts';
import { 
  parseGridTemplate, 
  parseGridAreas, 
  findAreaPosition, 
  drawImageInCell 
} from './utils/gridUtils';

interface CollageImage {
  id: string;
  file: File;
  url: string;
}

type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2';
type BorderThickness = 0 | 2 | 5 | 10 | 20;

export default function CollageBuilder() {
  const [images, setImages] = useState<CollageImage[]>([]);
  const [panelCount, setPanelCount] = useState<number>(4);
  const [layout, setLayout] = useState<Layout>('grid-2x2');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [borderThickness, setBorderThickness] = useState<BorderThickness>(2);
  const [borderColor, setBorderColor] = useState<string>('#000000');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update layout when panel count changes
  useEffect(() => {
    const availableLayouts = getLayoutsForPanelCount(panelCount);
    if (availableLayouts.length > 0) {
      setLayout(availableLayouts[0]);
    }
  }, [panelCount]);

  // Generate preview when images or layout changes
  useEffect(() => {
    if (images.length > 0) {
      generateCollage();
    }
  }, [images, layout, aspectRatio, borderThickness, borderColor]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newImages = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      url: URL.createObjectURL(file)
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter(img => img.id !== id);
      return filtered;
    });
  };

  const clearAllImages = () => {
    setImages([]);
    setPreviewUrl(null);
  };

  const generateCollage = async () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configure canvas size based on aspect ratio
    let width = 800;
    let height = 800;
    
    if (aspectRatio === '16:9') {
      height = width * (9/16);
    } else if (aspectRatio === '4:3') {
      height = width * (3/4);
    } else if (aspectRatio === '3:2') {
      height = width * (2/3);
    }
    
    canvas.width = width;
    canvas.height = height;

    // Clear canvas and set background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Get current layout definition
    const currentLayout = layoutDefinitions[layout];
    if (!currentLayout) return;
    
    // Create CSS Grid using the layout definition
    const gridColumns = parseGridTemplate(currentLayout.gridTemplateColumns);
    const gridRows = parseGridTemplate(currentLayout.gridTemplateRows);
    const gridAreas = currentLayout.gridTemplateAreas ? parseGridAreas(currentLayout.gridTemplateAreas) : null;
    
    // Calculate total units for columns and rows
    const totalColUnits = gridColumns.reduce((sum, col) => sum + col, 0);
    const totalRowUnits = gridRows.reduce((sum, row) => sum + row, 0);
    
    // Calculate cell widths and heights
    const cellWidths = gridColumns.map(col => (col / totalColUnits) * width);
    const cellHeights = gridRows.map(row => (row / totalRowUnits) * height);
    
    // Only use as many images as we have positions in the layout
    const maxImages = currentLayout.areas ? currentLayout.areas.length : (gridColumns.length * gridRows.length);
    const imagesToRender = images.slice(0, maxImages);
    
    // Load all images first
    const loadedImages = await Promise.all(
      imagesToRender.map((img) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const imgEl = new Image();
          imgEl.onload = () => resolve(imgEl);
          imgEl.src = img.url;
        });
      })
    );
    
    // Draw images in grid
    loadedImages.forEach((img, index) => {
      let cellX = 0;
      let cellY = 0;
      let cellWidth = 0;
      let cellHeight = 0;
      
      if (currentLayout.areas && currentLayout.gridTemplateAreas) {
        // Use named grid areas
        const areaName = currentLayout.areas[index];
        const areaInfo = findAreaPosition(areaName, gridAreas!, gridColumns, gridRows, cellWidths, cellHeights);
        
        if (areaInfo) {
          cellX = areaInfo.x;
          cellY = areaInfo.y;
          cellWidth = areaInfo.width;
          cellHeight = areaInfo.height;
        }
      } else {
        // Use standard grid
        const cols = gridColumns.length;
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        // Calculate position
        cellX = cellWidths.slice(0, col).reduce((sum, w) => sum + w, 0);
        cellY = cellHeights.slice(0, row).reduce((sum, h) => sum + h, 0);
        cellWidth = cellWidths[col];
        cellHeight = cellHeights[row];
      }
      
      // Add padding for border
      const padding = borderThickness;
      cellX += padding;
      cellY += padding;
      cellWidth -= padding * 2;
      cellHeight -= padding * 2;
      
      // Draw the image in its cell
      drawImageInCell(ctx, img, cellX, cellY, cellWidth, cellHeight, borderThickness, borderColor);
    });

    // Convert canvas to URL
    const url = canvas.toDataURL('image/png');
    setPreviewUrl(url);
  };

  const downloadCollage = () => {
    if (!previewUrl) return;
    
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `collage-${layout}-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left side: Controls and image upload */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Layout</h2>
          
          {/* Panel Count */}
          <h3 className="font-semibold mb-2">Panel Count</h3>
          <div className="flex mb-4 gap-3">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => setPanelCount(count)}
                className={`py-2 px-3 rounded ${panelCount === count ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {count}
              </button>
            ))}
          </div>
          
          {/* Layout Selection */}
          <h3 className="font-semibold mb-2">Arrangement</h3>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {getLayoutsForPanelCount(panelCount).map((layoutOption) => {
              const layoutDef = layoutDefinitions[layoutOption];
              if (!layoutDef) return null;
              
              const Icon = layoutDef.icon || Grid;
              
              return (
                <button
                  key={layoutDef.id}
                  onClick={() => setLayout(layoutOption)}
                  className={`p-2 rounded ${layout === layoutOption ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={layoutDef.name}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span className="text-sm">{layoutDef.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
          
          <h3 className="font-semibold mb-2">Aspect Ratio</h3>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button 
              onClick={() => setAspectRatio('1:1')}
              className={`py-2 px-3 rounded ${aspectRatio === '1:1' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              1:1 (Square)
            </button>
            <button 
              onClick={() => setAspectRatio('16:9')}
              className={`py-2 px-3 rounded ${aspectRatio === '16:9' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              16:9 (Landscape)
            </button>
            <button 
              onClick={() => setAspectRatio('4:3')}
              className={`py-2 px-3 rounded ${aspectRatio === '4:3' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              4:3 (Classic)
            </button>
            <button 
              onClick={() => setAspectRatio('3:2')}
              className={`py-2 px-3 rounded ${aspectRatio === '3:2' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              3:2 (Photo)
            </button>
          </div>
          
          <h3 className="font-semibold mb-2">Border</h3>
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button 
                onClick={() => setBorderThickness(0)}
                className={`py-2 px-3 rounded text-sm ${borderThickness === 0 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                None
              </button>
              <button 
                onClick={() => setBorderThickness(2)}
                className={`py-2 px-3 rounded text-sm ${borderThickness === 2 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                Thin
              </button>
              <button 
                onClick={() => setBorderThickness(5)}
                className={`py-2 px-3 rounded text-sm ${borderThickness === 5 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                Medium
              </button>
              <button 
                onClick={() => setBorderThickness(10)}
                className={`py-2 px-3 rounded text-sm ${borderThickness === 10 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                Thick
              </button>
              <button 
                onClick={() => setBorderThickness(20)}
                className={`py-2 px-3 rounded text-sm ${borderThickness === 20 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                Extra
              </button>
            </div>
            
            <div className="flex gap-2 items-center">
              <label htmlFor="borderColor" className="text-sm">Color:</label>
              <input 
                type="color" 
                id="borderColor"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="h-8 w-14 cursor-pointer bg-transparent border-0 rounded"
              />
              <span className="text-sm">{borderColor}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Images</h2>
          
          <div className="space-y-4">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="relative group">
                    <img 
                      src={img.url} 
                      alt="Uploaded" 
                      className="w-full aspect-square object-cover rounded"
                    />
                    <button 
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 bg-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No images added yet</p>
            )}
            
            <div className="flex gap-2">
              <label className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-center rounded cursor-pointer transition">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  multiple 
                  className="hidden"
                />
                <span className="flex items-center justify-center">
                  <Plus size={20} className="mr-2" />
                  Add Images
                </span>
              </label>
              
              {images.length > 0 && (
                <button
                  onClick={clearAllImages}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {previewUrl && (
          <button 
            onClick={downloadCollage}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-center rounded flex items-center justify-center"
          >
            <Download size={20} className="mr-2" />
            Download Collage
          </button>
        )}
      </div>

      {/* Right side: Preview */}
      <div className="w-full lg:w-2/3">
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Preview</h2>
          
          <div className="flex flex-col">
            <div className="text-gray-400 text-sm mb-4">
              {panelCount > images.length ? (
                <p className="text-yellow-400">You need {panelCount - images.length} more {panelCount - images.length === 1 ? 'image' : 'images'} for this layout</p>
              ) : (
                images.length > panelCount ? (
                  <p>Using {panelCount} of {images.length} images</p>
                ) : null
              )}
            </div>
            
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Collage Preview" 
                className="max-w-full max-h-[600px] mx-auto border-2 border-gray-700 rounded"
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] bg-gray-800 border-2 border-dashed border-gray-700 rounded">
                <p className="text-gray-400">Add images to generate a preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas used for rendering */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
} 
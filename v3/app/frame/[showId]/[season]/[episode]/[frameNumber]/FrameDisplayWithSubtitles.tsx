'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Palette, 
  Type, 
  Eye, 
  EyeOff,
  Settings,
  RotateCcw
} from 'lucide-react';

interface FrameData {
  subtitle: string;
  frameImage: string;
  showTitle?: string;
  fontFamily?: string;
}

interface FrameDisplayProps {
  showId: string;
  season: string;
  episode: string;
  frameNumber: string;
}

const fonts = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
  'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black'
];

const colors = [
  '#FFFFFF', '#FFFF00', '#000000', '#FF4136', '#2ECC40', '#0052CC',
  '#FF851B', '#B10DC9', '#39CCCC', '#F012BE'
];

export default function FrameDisplayWithSubtitles({ 
  showId, 
  season, 
  episode, 
  frameNumber 
}: FrameDisplayProps) {
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showText, setShowText] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  
  // Text styling states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(1);
  const [lineHeight, setLineHeight] = useState(1);
  const [bottomMargin, setBottomMargin] = useState(1);
  
  // UI states
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showControls, setShowControls] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Frame to timecode conversion (matching V2 logic)
  const frameToTimeCode = useCallback((frame: number, frameRate = 10) => {
    const totalSeconds = frame / frameRate;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  
  // Fetch frame data
  useEffect(() => {
    const fetchFrameData = async () => {
      setLoading(true);
      const currentFrame = parseInt(frameNumber, 10);
      const currentTimeCode = frameToTimeCode(currentFrame);
      
      console.log(`Fetching subtitle data for ${showId} S${season}E${episode} Frame ${currentFrame} (${currentTimeCode})`);
      
      try {
        const response = await fetch(`/api/frame/${showId}/${season}/${episode}/${frameNumber}`);
        if (response.ok) {
          const data: FrameData = await response.json();
          console.log('Fetched frame data:', data);
          setFrameData(data);
          setSubtitle(data.subtitle || '');
          
          // Automatically show text if there's a subtitle from the API
          if (data.subtitle && data.subtitle.trim()) {
            console.log(`Auto-enabling text display for subtitle: "${data.subtitle}"`);
            setShowText(true);
          } else {
            console.log(`No subtitle found for frame ${currentFrame} (${currentTimeCode})`);
          }
          
          if (data.fontFamily && fonts.includes(data.fontFamily)) {
            setFontFamily(data.fontFamily);
          }
        }
      } catch (error) {
        console.error('Failed to fetch frame data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFrameData();
  }, [showId, season, episode, frameNumber, frameToTimeCode]);
  
  // Text wrapping function from V2FramePage.js
  const wrapText = useCallback((
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    shouldDraw = true
  ) => {
    const paragraphs = text.split('\n');
    let totalLines = 0;
    
    paragraphs.forEach((paragraph) => {
      if (paragraph.trim() === '') {
        if (shouldDraw) {
          y += lineHeight;
        }
        totalLines += 1;
      } else {
        const words = paragraph.split(' ');
        let line = '';
        
        words.forEach((word, n) => {
          const testLine = `${line}${word} `;
          const metrics = context.measureText(testLine);
          const testWidth = metrics.width;
          
          if (testWidth > maxWidth && n > 0) {
            if (shouldDraw) {
              context.strokeText(line, x, y);
              context.fillText(line, x, y);
            }
            y += lineHeight;
            totalLines += 1;
            line = `${word} `;
          } else {
            line = testLine;
          }
        });
        
        if (line.trim() !== '') {
          if (shouldDraw) {
            context.strokeText(line, x, y);
            context.fillText(line, x, y);
          }
          y += lineHeight;
          totalLines += 1;
        }
      }
    });
    
    return totalLines;
  }, []);
  
  // Get contrasting stroke color
  const getContrastColor = useCallback((hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }, []);
  
  // Canvas rendering function adapted from V2FramePage.js
  const updateCanvas = useCallback(() => {
    if (!frameData || !canvasRef.current) return;
    
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }
    
    throttleTimeoutRef.current = setTimeout(() => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = frameData.frameImage;
      
      img.onload = () => {
        const maxCanvasWidth = 1000;
        const canvasAspectRatio = img.width / img.height;
        const maxCanvasHeight = maxCanvasWidth / canvasAspectRatio;
        
        canvas.width = maxCanvasWidth;
        canvas.height = maxCanvasHeight;
        
        // Draw the image
        ctx.drawImage(img, 0, 0, maxCanvasWidth, maxCanvasHeight);
        
                 if (showText && subtitle.trim()) {
           console.log(`Rendering subtitle on canvas: "${subtitle}" (showText: ${showText})`);
           
           const referenceWidth = 1000;
           const referenceFontSize = 40;
           const referenceBottomAnch = 25;
           const referenceLineHeight = 50;
           
           const scaleFactor = 1000 / referenceWidth;
           const scaledFontSize = referenceFontSize * scaleFactor * fontSize;
           const scaledBottomAnch = referenceBottomAnch * scaleFactor * bottomMargin;
           const scaledLineHeight = referenceLineHeight * scaleFactor * lineHeight * fontSize;
           
           // Set font style
           const fontStyle = isItalic ? 'italic' : 'normal';
           const fontWeight = isBold ? 'bold' : 'normal';
           
           ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;
           ctx.textAlign = 'center';
           ctx.fillStyle = textColor;
           ctx.strokeStyle = getContrastColor(textColor);
           ctx.lineWidth = canvas.width * 0.0044;
           ctx.lineJoin = 'round';
           
           const x = canvas.width / 2;
           const maxWidth = canvas.width - 60;
           
           // Calculate number of lines without drawing
           const numOfLines = wrapText(ctx, subtitle, x, 0, maxWidth, scaledLineHeight, false);
           const totalTextHeight = numOfLines * scaledLineHeight;
           
           // Adjust startY to anchor the text from the bottom
           const startYAdjusted = canvas.height - totalTextHeight - scaledBottomAnch + 40;
           
           console.log(`Drawing text at position: x=${x}, y=${startYAdjusted}, font=${ctx.font}`);
           
           // Draw the text
           wrapText(ctx, subtitle, x, startYAdjusted, maxWidth, scaledLineHeight);
         } else {
           console.log(`Not rendering subtitle - showText: ${showText}, subtitle: "${subtitle}"`);
         }
      };
      
      throttleTimeoutRef.current = null;
    }, 10);
  }, [frameData, showText, subtitle, isBold, isItalic, fontFamily, textColor, fontSize, lineHeight, bottomMargin, wrapText, getContrastColor]);
  
  // Update canvas when dependencies change
  useEffect(() => {
    updateCanvas();
  }, [updateCanvas]);
  
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Canvas Display */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="relative aspect-video bg-black">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>
      
      {/* Subtitle Input */}
      <div className="space-y-2">
        <textarea
          value={subtitle}
          onChange={(e) => {
            setSubtitle(e.target.value);
            if (!showText && e.target.value.trim()) {
              setShowText(true);
            }
          }}
          placeholder="Type a caption..."
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
          rows={3}
        />
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showText ? "default" : "outline"}
            size="sm"
            onClick={() => setShowText(!showText)}
            className="flex items-center gap-2"
          >
            {showText ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showText ? 'Hide' : 'Show'} Caption
          </Button>
          
          {showText && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowControls(!showControls)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Controls
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubtitle('')}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Text Controls */}
      {showText && showControls && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          {/* Text Style Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isBold ? "default" : "outline"}
              size="sm"
              onClick={() => setIsBold(!isBold)}
            >
              <Bold className="w-4 h-4" />
            </Button>
            
            <Button
              variant={isItalic ? "default" : "outline"}
              size="sm"
              onClick={() => setIsItalic(!isItalic)}
            >
              <Italic className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              Color
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFontPicker(!showFontPicker)}
              className="flex items-center gap-2"
            >
              <Type className="w-4 h-4" />
              Font
            </Button>
          </div>
          
          {/* Color Picker */}
          {showColorPicker && (
            <div className="grid grid-cols-5 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setTextColor(color);
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded border-2 ${
                    textColor === color ? 'border-white' : 'border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
          
          {/* Font Picker */}
          {showFontPicker && (
            <div className="grid grid-cols-2 gap-2">
              {fonts.map((font) => (
                <button
                  key={font}
                  onClick={() => {
                    setFontFamily(font);
                    setShowFontPicker(false);
                  }}
                  className={`p-2 text-left rounded ${
                    fontFamily === font 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
          
          {/* Slider Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Font Size: {fontSize.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Line Height: {lineHeight.toFixed(1)}x
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Bottom Margin: {bottomMargin.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={bottomMargin}
                onChange={(e) => setBottomMargin(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
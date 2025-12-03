import { fabric } from 'fabric';
import type React from 'react';

type EditorLike = {
  canvas: fabric.Canvas & {
    freeDrawingBrush: fabric.PencilBrush & { color: string };
  };
};

type ColorLike = { hex: string };

// Calculate the desired editor size
export const calculateEditorSize = (aspectRatio: number): [number, number] => {
  const containerElement = document.getElementById('canvas-container') as HTMLElement;
  const availableWidth = containerElement.offsetWidth;
  const calculatedWidth = availableWidth;
  const calculatedHeight = availableWidth / aspectRatio;
  return [calculatedHeight, calculatedWidth];
};

// Calculate contrast color for text
export function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Update text object style
export const updateTextStyle = (
  textObject: fabric.Textbox,
  customStyles: string[],
  canvas: fabric.Canvas
): void => {
  textObject.set({
    fontWeight: customStyles.includes('bold') ? 'bold' : 'normal',
    fontStyle: customStyles.includes('italic') ? 'italic' : 'normal',
    underline: customStyles.includes('underline') || customStyles.includes('underlined'),
  });
  canvas.renderAll();
};

// Update text object font
export const updateTextFont = (
  textObject: fabric.Textbox,
  font: string,
  canvas: fabric.Canvas
): void => {
  textObject.set({ fontFamily: font || 'Arial' });
  canvas.renderAll();
};

// Delete layer and update layer fonts
export const deleteLayer = (
  canvas: fabric.Canvas,
  index: number,
  setLayerFonts: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setCanvasObjects: (objs: unknown[]) => void
): void => {
  canvas.remove(canvas.item(index));
  canvas.renderAll();

  setLayerFonts((prevFonts) => {
    const updatedFonts: Record<string, string> = {};
    Object.entries(prevFonts).forEach(([layerIndex, font]) => {
      if (parseInt(layerIndex, 10) < index) {
        updatedFonts[layerIndex] = font as string;
      } else if (parseInt(layerIndex, 10) > index) {
        updatedFonts[parseInt(layerIndex, 10) - 1] = font as string;
      }
    });
    return updatedFonts;
  });

  // Update canvasObjects state
  setCanvasObjects([...canvas.getObjects()]);
};

// Move layer up in the stack
export const moveLayerUp = (canvas: fabric.Canvas, index: number): fabric.Object[] => {
  if (index <= 0 || !canvas.item(index)) {
    // Already at the top, invalid index, or object not found
    return [...canvas.getObjects()]; // Return current objects without changes
  }

  const objectToMoveUp = canvas.item(index);
  if (!objectToMoveUp) {
    return [...canvas.getObjects()];
  }
  canvas.moveTo(objectToMoveUp, index - 1);
  canvas.renderAll();

  return [...canvas.getObjects()];
};

// Save image as data URL
export const saveImageAsDataURL = (canvas: fabric.Canvas, imageScale: number): string =>
  canvas.toDataURL({
    format: 'jpeg',
    quality: 0.6,
    multiplier: imageScale,
  });

// Add text to canvas
export const addText = (
  editor: EditorLike,
  text: string,
  append: boolean,
  canvasWidth: number,
  canvasHeight: number
): fabric.Object[] => {
  const textbox = new fabric.Textbox(text);
  textbox.set({
    left: canvasWidth * 0.05,
    top: canvasHeight * (append ? 0.5 : 0.95),
    originY: 'bottom',
    width: canvasWidth * 0.9,
    fontSize: canvasWidth * 0.04,
    fontFamily: 'sans-serif',
    fontWeight: 400,
    fill: 'white',
    stroke: 'black',
    strokeLineJoin: 'round',
    strokeWidth: canvasWidth * 0.004,
    strokeUniform: false,
    textAlign: 'center',
    selectable: true,
    paintFirst: 'stroke',
  });

  if (append) {
    editor.canvas.add(textbox);
    editor.canvas.setActiveObject(textbox);
  } else {
    editor.canvas.clear();
    editor.canvas.add(textbox);
    editor.canvas.setActiveObject(textbox);
  }

  return [...editor.canvas.getObjects()];
};

// Add image layer to canvas
type ImageDescriptor = {
  type: 'image';
  src: string;
  scale: number;
  angle: number;
  left: number;
  top: number;
};

export const addImageLayer = (
  editor: EditorLike,
  imageFile: File | Blob
): Promise<Array<fabric.Object | ImageDescriptor>> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image file'));
        return;
      }

      const imgObj = new Image();
      imgObj.src = result;
      imgObj.onload = () => {
        const image = new fabric.Image(imgObj);

        const canvasWidth = editor.canvas.getWidth();
        const canvasHeight = editor.canvas.getHeight();
        const paddingFactor = 0.9;
        const scale = Math.min(canvasWidth / imgObj.width, canvasHeight / imgObj.height) * paddingFactor;

        image.set({
          angle: 0,
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: canvasWidth / 2,
          top: canvasHeight / 2,
        });

        editor.canvas.add(image);
        editor.canvas.setActiveObject(image);

        image.setCoords();
        editor.canvas.renderAll();

        const imageObject: ImageDescriptor = {
          type: 'image',
          src: result,
          scale,
          angle: 0,
          left: canvasWidth / 2,
          top: canvasHeight / 2,
        };

        resolve([...editor.canvas.getObjects(), imageObject]);
      };
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });

// Handle color change for text
export const changeTextColor = (
  editor: EditorLike,
  color: ColorLike,
  index: number
): fabric.Object[] => {
  const textObject = editor.canvas.item(index) as fabric.Textbox;

  const fontColor = color.hex;
  const strokeColor = getContrastColor(fontColor);

  textObject.set({
    fill: fontColor,
    stroke: strokeColor,
    strokeWidth: editor.canvas.getWidth() * 0.0025,
    strokeUniform: false,
  });

  editor.canvas.renderAll();
  return [...editor.canvas.getObjects()];
};

// Handle font size change
export const changeFontSize = (
  editor: EditorLike,
  value: number,
  index: number,
  defaultFontSize: number
): fabric.Object[] => {
  const textObject = editor.canvas.item(index) as fabric.Textbox;
  textObject.set({ fontSize: defaultFontSize * (value / 100) });
  editor.canvas.renderAll();
  return [...editor.canvas.getObjects()];
};

// Toggle drawing mode
export const toggleDrawingMode = (editor: EditorLike, isDrawingMode: boolean, brushSize: number): void => {
  if (editor) {
    editor.canvas.isDrawingMode = isDrawingMode;
    if (isDrawingMode) {
      editor.canvas.freeDrawingBrush.width = brushSize;
      editor.canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
    }
  }
};

// Clear drawing paths
export const clearDrawingPaths = (editor: EditorLike): fabric.Object[] => {
  editor.canvas.getObjects().forEach((obj) => {
    if (obj instanceof fabric.Path) {
      editor.canvas.remove(obj);
    }
  });
  editor.canvas.renderAll();
  return [...editor.canvas.getObjects()];
};

// Resize canvas
export const resizeCanvas = (editor: EditorLike, width: number, height: number): void => {
  if (editor) {
    editor.canvas.setWidth(width);
    editor.canvas.setHeight(height);
    editor.canvas.setBackgroundColor('white');
    editor.canvas.renderAll();
  }
};

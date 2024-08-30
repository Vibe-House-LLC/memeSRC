import { fabric } from 'fabric';

// Calculate the desired editor size
export const calculateEditorSize = (aspectRatio) => {
  const containerElement = document.getElementById('canvas-container');
  const availableWidth = containerElement.offsetWidth;
  const calculatedWidth = availableWidth;
  const calculatedHeight = availableWidth / aspectRatio;
  return [calculatedHeight, calculatedWidth];
};

// Calculate contrast color for text
export function getContrastColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Update text object style
export const updateTextStyle = (textObject, customStyles, canvas) => {
  textObject.set({
    fontWeight: customStyles.includes('bold') ? 'bold' : 'normal',
    fontStyle: customStyles.includes('italic') ? 'italic' : 'normal',
    underline: customStyles.includes('underlined')
  });
  textObject.dirty = true;
  canvas.renderAll();
};

// Update text object font
export const updateTextFont = (textObject, font, canvas) => {
  textObject.fontFamily = font || 'Arial';
  textObject.dirty = true;
  canvas.renderAll();
};

// Delete layer and update layer fonts
export const deleteLayer = (canvas, index, setLayerFonts, setCanvasObjects) => {
  canvas.remove(canvas.item(index));
  canvas.renderAll();

  setLayerFonts((prevFonts) => {
    const updatedFonts = {};
    Object.entries(prevFonts).forEach(([layerIndex, font]) => {
      if (parseInt(layerIndex, 10) < index) {
        updatedFonts[layerIndex] = font;
      } else if (parseInt(layerIndex, 10) > index) {
        updatedFonts[parseInt(layerIndex, 10) - 1] = font;
      }
    });
    return updatedFonts;
  });

  // Update canvasObjects state
  setCanvasObjects([...canvas.getObjects()]);
};

// Move layer up in the stack
export const moveLayerUp = (canvas, index) => {
  if (index <= 0 || !canvas.item(index)) {
    // Already at the top, invalid index, or object not found
    return [...canvas.getObjects()]; // Return current objects without changes
  }

  const objectToMoveUp = canvas.item(index);
  canvas.moveTo(objectToMoveUp, index - 1);
  canvas.renderAll();

  return [...canvas.getObjects()];
};

// Save image as data URL
export const saveImageAsDataURL = (canvas, imageScale) => {
  return canvas.toDataURL({
    format: 'jpeg',
    quality: 0.6,
    multiplier: imageScale
  });
};

// Add text to canvas
export const addText = (editor, text, append, canvasWidth, canvasHeight) => {
  const textbox = new fabric.Textbox(text, {
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
    strokeWidth: canvasWidth * 0.0040,
    strokeUniform: false,
    textAlign: 'center',
    selectable: true,
    paintFirst: 'stroke'
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
export const addImageLayer = (editor, imageFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const imgObj = new Image();
      imgObj.src = event.target.result;
      imgObj.onload = function () {
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
          top: canvasHeight / 2
        });

        editor.canvas.add(image);
        editor.canvas.setActiveObject(image);

        image.setCoords();
        editor.canvas.renderAll();

        const imageObject = {
          type: 'image',
          src: event.target.result,
          scale,
          angle: 0,
          left: canvasWidth / 2,
          top: canvasHeight / 2
        };

        resolve([...editor.canvas.getObjects(), imageObject]);
      };
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
};

// Handle color change for text
export const changeTextColor = (editor, color, index) => {
  const textObject = editor.canvas.item(index);
  
  const fontColor = color.hex;
  const strokeColor = getContrastColor(fontColor);

  textObject.set({
    fill: fontColor,
    stroke: strokeColor,
    strokeWidth: editor.canvas.getWidth() * 0.0025,
    strokeUniform: false
  });

  editor.canvas.renderAll();
  return [...editor.canvas.getObjects()];
};

// Handle font size change
export const changeFontSize = (editor, value, index, defaultFontSize) => {
  const textObject = editor.canvas.item(index);
  textObject.fontSize = defaultFontSize * (value / 100);
  editor.canvas.renderAll();
  return [...editor.canvas.getObjects()];
};

// Toggle drawing mode
export const toggleDrawingMode = (editor, isDrawingMode, brushSize) => {
  if (editor) {
    editor.canvas.isDrawingMode = isDrawingMode;
    if (isDrawingMode) {
      editor.canvas.freeDrawingBrush.width = brushSize;
      editor.canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
    }
  }
};

// Clear drawing paths
export const clearDrawingPaths = (editor) => {
  editor.canvas.getObjects().forEach((obj) => {
    if (obj instanceof fabric.Path) {
      editor.canvas.remove(obj);
    }
  });
  editor.canvas.renderAll();
  return [...editor.canvas.getObjects()];
};

// Resize canvas
export const resizeCanvas = (editor, width, height) => {
  if (editor) {
    editor.canvas.setWidth(width);
    editor.canvas.setHeight(height);
    editor.canvas.setBackgroundColor("white");
    editor.canvas.renderAll();
  }
};

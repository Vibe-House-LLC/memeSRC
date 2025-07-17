import { useState, useCallback } from 'react';

// Types
interface PanelTransform {
  scale: number;
  positionX: number;
  positionY: number;
}

interface PanelText {
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  strokeWidth?: number;
  textPositionX?: number;
  textPositionY?: number;
  textRotation?: number;
  autoAssigned?: boolean;
  subtitleShowing?: boolean;
}

interface TextSettings {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  strokeWidth?: number;
  textPositionX?: number;
  textPositionY?: number;
  textRotation?: number;
}

interface CollagePayload {
  selectedTemplate: {
    id: string;
    name: string;
  };
  selectedAspectRatio: string;
  panelCount: number;
  images: Array<{
    index: number;
    originalUrl: string;
    displayUrl: string;
    subtitle?: string;
    subtitleShowing?: boolean;
    metadata?: Record<string, any>;
  }>;
  panelImageMapping: Record<string, number>;
  panelTransforms: Record<string, PanelTransform>;
  panelTexts: Record<string, PanelText>;
  lastUsedTextSettings: TextSettings;
  borderThickness: number;
  borderColor: string;
  aspectRatioValue: number;
  isCreatingCollage: boolean;
}

interface UseCollagePayloadReturn {
  // Current state
  payload: CollagePayload;
  panelTransforms: Record<string, PanelTransform>;
  panelTexts: Record<string, PanelText>;
  lastUsedTextSettings: TextSettings;
  
  // Update functions for the component
  updatePanelTransform: (panelId: string, transform: PanelTransform) => void;
  updatePanelText: (panelId: string, text: PanelText) => void;
  
  // Utility functions
  loadPayload: (newPayload: CollagePayload) => void;
  resetPanel: (panelId: string) => void;
  resetAllPanels: () => void;
  exportPayload: () => CollagePayload;
}

/**
 * Custom hook for managing collage payload data and state
 * Provides all necessary functions for the CanvasCollagePreview component
 */
export const useCollagePayload = (initialPayload?: CollagePayload): UseCollagePayloadReturn => {
  const [payload, setPayload] = useState<CollagePayload>(
    initialPayload || {
      selectedTemplate: { id: '1x1', name: 'Single Image' },
      selectedAspectRatio: 'square',
      panelCount: 1,
      images: [],
      panelImageMapping: {},
      panelTransforms: {},
      panelTexts: {},
      lastUsedTextSettings: {
        fontSize: 26,
        fontWeight: 400,
        fontFamily: 'Arial',
        color: '#ffffff',
        strokeWidth: 2
      },
      borderThickness: 0,
      borderColor: '#000000',
      aspectRatioValue: 1,
      isCreatingCollage: false
    }
  );

  const [panelTransforms, setPanelTransforms] = useState<Record<string, PanelTransform>>(
    payload.panelTransforms
  );
  
  const [panelTexts, setPanelTexts] = useState<Record<string, PanelText>>(
    payload.panelTexts
  );

  const [lastUsedTextSettings, setLastUsedTextSettings] = useState<TextSettings>(
    payload.lastUsedTextSettings
  );

  // Update panel transform
  const updatePanelTransform = useCallback((panelId: string, transform: PanelTransform) => {
    setPanelTransforms(prev => ({
      ...prev,
      [panelId]: transform
    }));
  }, []);

  // Update panel text
  const updatePanelText = useCallback((panelId: string, text: PanelText) => {
    setPanelTexts(prev => ({
      ...prev,
      [panelId]: text
    }));
    
    // Update last used settings when text properties change
    if (text.fontSize !== undefined || text.fontFamily || text.color || text.fontWeight !== undefined || text.strokeWidth !== undefined) {
      setLastUsedTextSettings(prev => ({
        ...prev,
        ...(text.fontSize !== undefined && { fontSize: text.fontSize }),
        ...(text.fontFamily && { fontFamily: text.fontFamily }),
        ...(text.color && { color: text.color }),
        ...(text.fontWeight !== undefined && { fontWeight: text.fontWeight }),
        ...(text.strokeWidth !== undefined && { strokeWidth: text.strokeWidth }),
        ...(text.textPositionX !== undefined && { textPositionX: text.textPositionX }),
        ...(text.textPositionY !== undefined && { textPositionY: text.textPositionY }),
        ...(text.textRotation !== undefined && { textRotation: text.textRotation }),
      }));
    }
  }, []);

  // Load a new payload
  const loadPayload = useCallback((newPayload: CollagePayload) => {
    setPayload(newPayload);
    setPanelTransforms(newPayload.panelTransforms);
    setPanelTexts(newPayload.panelTexts);
    setLastUsedTextSettings(newPayload.lastUsedTextSettings);
  }, []);

  // Reset a specific panel
  const resetPanel = useCallback((panelId: string) => {
    setPanelTransforms(prev => {
      const newTransforms = { ...prev };
      delete newTransforms[panelId];
      return newTransforms;
    });
    
    setPanelTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[panelId];
      return newTexts;
    });
  }, []);

  // Reset all panels
  const resetAllPanels = useCallback(() => {
    setPanelTransforms({});
    setPanelTexts({});
  }, []);

  // Export current state as payload
  const exportPayload = useCallback((): CollagePayload => {
    return {
      ...payload,
      panelTransforms,
      panelTexts,
      lastUsedTextSettings
    };
  }, [payload, panelTransforms, panelTexts, lastUsedTextSettings]);

  return {
    payload,
    panelTransforms,
    panelTexts,
    lastUsedTextSettings,
    updatePanelTransform,
    updatePanelText,
    loadPayload,
    resetPanel,
    resetAllPanels,
    exportPayload
  };
};

export type { CollagePayload, PanelTransform, PanelText, TextSettings }; 
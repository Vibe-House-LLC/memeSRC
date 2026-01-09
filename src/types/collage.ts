// Shared types for Collage Projects and Snapshots

export type AspectRatio = 'square' | 'landscape' | 'portrait' | string;

export interface CollageImageMetadata {
  libraryKey?: string;
  fontFamily?: string;
  source?: string;
  // Allow additional metadata fields for future use cases
  [key: string]: any;
}

export interface CollageImageRef {
  libraryKey?: string;
  url?: string;
  // Optional direct font hint kept for backward compatibility; prefer metadata.fontFamily
  fontFamily?: string;
  subtitle?: string;
  subtitleShowing?: boolean;
  metadata?: CollageImageMetadata;
}

export interface CollageSnapshot {
  version: number;
  images: CollageImageRef[];
  panelImageMapping: Record<string, number>;
  // Transform objects are produced by the collage editor; keep broad typing
  panelTransforms: Record<string, unknown>;
  // Text config objects keyed by panel id
  panelTexts: Record<string, unknown>;
  selectedTemplateId: string | null;
  selectedAspectRatio: AspectRatio;
  panelCount: number;
  borderThickness?: number | string;
  borderColor?: string;
  customLayout?: unknown;
  canvasWidth?: number;
  canvasHeight?: number;
  panelDimensions?: Record<string, { width: number; height: number }>;
}

export interface CollageProject {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  ownerIdentityId?: string | null;
  thumbnail: string | null; // data URL (legacy)
  thumbnailKey: string | null; // reserved for remote storage key
  thumbnailSignature: string | null; // version/dedupe signature
  thumbnailUpdatedAt: string | null; // ISO timestamp
  state: CollageSnapshot | null;
  snapshotKey?: string | null; // remote snapshot key (S3)
  snapshotVersion?: number | null;
}

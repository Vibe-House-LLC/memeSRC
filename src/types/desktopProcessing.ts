export const DESKTOP_RESUME_VERSION = 2;

export const RESUME_STORAGE_PREFIX = 'memesrcDesktopResume:';
export const CURRENT_PROCESSING_STORAGE_KEY = 'memesrcDesktopCurrentJob';

export interface ProcessingMetadata {
  title?: string;
  description?: string;
  frameCount?: number;
  colorMain?: string;
  colorSecondary?: string;
  emoji?: string;
}

export interface ProcessingStatusSummary {
  done: number;
  indexing: number;
  pending: number;
  total: number;
}

export interface UploadResumeState {
  version: number;
  processingId: string;
  sourceMediaId?: string;
  identityId?: string;
  seriesId?: string;
  seriesName?: string;
  entryName?: string;
  backgroundColor?: string;
  textColor?: string;
  folderPath?: string;
  completedFiles: string[];
  fileRecords: Record<string, string>;
  fileSizes?: Record<string, number>;
  totalBytes?: number;
  totalFiles?: number;
  uploadedBytes?: number;
  lastUploadedAt?: string;
  lastError?: string | null;
}

export const SUPPORTED_UPLOAD_EXTENSIONS = new Set<string>(['.mp4', '.json', '.csv']);

export const isUploadResumeState = (value: unknown): value is UploadResumeState => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<UploadResumeState>;
  return (
    typeof candidate.processingId === 'string' &&
    Array.isArray(candidate.completedFiles) &&
    typeof candidate.fileRecords === 'object'
  );
};

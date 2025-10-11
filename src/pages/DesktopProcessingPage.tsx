import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Button,
  Paper,
  Grid,
  Stepper,
  Step,
  StepLabel,
  alpha,
  useTheme,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PauseIcon from '@mui/icons-material/Pause';
import FolderIcon from '@mui/icons-material/Folder';
import MovieIcon from '@mui/icons-material/Movie';
import { API, Auth, graphqlOperation, Storage } from 'aws-amplify';
import { nanoid } from 'nanoid';
import { paramCase } from 'change-case';
import { listSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';
import { SnackbarContext } from '../SnackbarContext';
import { readJSON, safeRemoveItem, writeJSON } from '../utils/storage';
import {
  DESKTOP_RESUME_VERSION,
  ProcessingMetadata,
  ProcessingStatusSummary,
  RESUME_STORAGE_PREFIX,
  SUPPORTED_UPLOAD_EXTENSIONS,
  UploadResumeState,
  isUploadResumeState,
} from '../types/desktopProcessing';

type GraphQLResult<T> = {
  data?: T;
  errors?: readonly unknown[];
};

interface ListSeriesQueryResult {
  listSeries?: {
    items?: SeriesOption[];
    nextToken?: string | null;
  };
}

interface SeriesOption {
  id: string;
  name: string;
  slug?: string | null;
}

interface ProcessedFileInfo {
  absolutePath: string;
  relativePath: string;
  normalizedPath: string;
  size: number;
}

interface ProcessedSummary {
  files: ProcessedFileInfo[];
  countsByExtension: Record<string, number>;
  totalSize: number;
}

interface UploadSnapshot {
  fileSizes: Record<string, number>;
  totalBytes: number;
  totalFiles: number;
}

type SubmissionStatus = 'created' | 'processing' | 'processed' | 'uploading' | 'uploaded' | 'completed' | 'error';

interface Submission {
  id: string;
  sourceMediaId: string;
  seriesId: string;
  seriesName: string;
  title: string;
  indexName: string;
  sourceFolderPath: string;
  backgroundColor?: string;
  textColor?: string;
  status: SubmissionStatus;
  processingProgress?: number;
  uploadProgress?: number;
  metadata?: ProcessingMetadata;
  statusSummary?: ProcessingStatusSummary;
  resumeState?: UploadResumeState;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

type AuthUserDetails = {
  sub?: string | null;
  username?: string | null;
  email?: string | null;
  [key: string]: unknown;
};

type AuthUser =
  | null
  | undefined
  | false
  | {
      userDetails?: AuthUserDetails | null;
      sub?: string | null;
      [key: string]: unknown;
    };

type ElectronModule = {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<any>;
    send: (channel: string, ...args: unknown[]) => void;
    once: (channel: string, listener: (event: unknown, response: any) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
};

declare global {
  interface Window {
    require?: (module: string) => unknown;
    process?: {
      type?: string;
    };
  }
}

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  json: 'application/json',
  csv: 'text/csv',
  srt: 'application/x-subrip',
  zip: 'application/zip',
};

const MAX_UPLOAD_RETRIES = 3;
const CREDENTIAL_REFRESH_INTERVAL_MS = 12 * 60 * 1000;
const UPLOAD_RETRY_DELAY_MS = 2000;

type ActiveUploadListener = (id: string | null) => void;

// Active upload tracking
// Uses sessionStorage to survive navigation but NOT app restart
// This allows uploads to auto-resume after navigation/refresh
// but show as "paused" after app quit/restart
let activeUploadJobId: string | null = null;
const activeUploadListeners = new Set<ActiveUploadListener>();

const getActiveUploadJobId = (): string | null => {
  if (activeUploadJobId) return activeUploadJobId;
  // Try to restore from sessionStorage
  try {
    return sessionStorage.getItem('desktop-upload-active-job-id');
  } catch {
    return null;
  }
};

const setActiveUploadJobId = (next: string | null) => {
  activeUploadJobId = next;
  // Persist to sessionStorage
  try {
    if (next) {
      sessionStorage.setItem('desktop-upload-active-job-id', next);
    } else {
      sessionStorage.removeItem('desktop-upload-active-job-id');
    }
  } catch {
    // Ignore sessionStorage errors
  }
  activeUploadListeners.forEach((listener) => listener(next));
};

const subscribeToActiveUploadJobId = (listener: ActiveUploadListener) => {
  activeUploadListeners.add(listener);
  return () => {
    activeUploadListeners.delete(listener);
  };
};

const buildResumeKey = (id: string) => `${RESUME_STORAGE_PREFIX}${id}`;

const normalizeRelativePath = (rawPath: string): string => {
  const trimmed = rawPath.replace(/^\/+/, '');
  const safeSegments = trimmed
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  return safeSegments.join('/');
};

const getExtension = (filePath: string): string => {
  const segments = filePath.split('.');
  if (segments.length <= 1) {
    return 'unknown';
  }
  return segments.pop()?.toLowerCase() ?? 'unknown';
};

const summarizeStatusData = (statusData: unknown): ProcessingStatusSummary => {
  const summary: ProcessingStatusSummary = {
    done: 0,
    indexing: 0,
    pending: 0,
    total: 0,
  };
  if (!statusData || typeof statusData !== 'object') {
    return summary;
  }
  Object.values(statusData as Record<string, unknown>).forEach((seasonValue) => {
    if (seasonValue && typeof seasonValue === 'object') {
      Object.values(seasonValue as Record<string, unknown>).forEach((statusValue) => {
        summary.total += 1;
        if (statusValue === 'done') {
          summary.done += 1;
        } else if (statusValue === 'indexing') {
          summary.indexing += 1;
        } else {
          summary.pending += 1;
        }
      });
    }
  });
  return summary;
};

const deriveProcessingProgressFromSummary = (
  summary?: ProcessingStatusSummary | null
): number | undefined => {
  if (!summary || summary.total <= 0) {
    return undefined;
  }
  const weightedDone = summary.done + summary.indexing * 0.5;
  const normalizedRatio = Math.max(0, Math.min(1, weightedDone / summary.total));
  return Math.round(normalizedRatio * 100);
};

const isProcessingSummaryComplete = (summary?: ProcessingStatusSummary | null): boolean => {
  return Boolean(summary && summary.total > 0 && summary.done >= summary.total);
};

const isProcessingSummaryInProgress = (summary?: ProcessingStatusSummary | null): boolean => {
  return Boolean(summary && summary.total > 0 && summary.done < summary.total);
};


const ensureResumeState = (input: UploadResumeState | null, processingId: string): UploadResumeState => {
  const normalizedCompleted = Array.from(new Set(input?.completedFiles ?? []));
  const normalizedFileRecords =
    input?.fileRecords && typeof input.fileRecords === 'object' ? input.fileRecords : {};
  const normalizedFileSizes =
    input?.fileSizes && typeof input.fileSizes === 'object'
      ? Object.entries(input.fileSizes).reduce<Record<string, number>>((acc, [key, value]) => {
          if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
            acc[key] = value;
          }
          return acc;
        }, {})
      : {};

  const derivedTotalBytes =
    typeof input?.totalBytes === 'number' && Number.isFinite(input.totalBytes) && input.totalBytes >= 0
      ? input.totalBytes
      : Object.values(normalizedFileSizes).reduce((acc, size) => acc + size, 0);
  const totalBytes = derivedTotalBytes > 0 ? derivedTotalBytes : undefined;

  const derivedTotalFiles =
    typeof input?.totalFiles === 'number' && Number.isFinite(input.totalFiles) && input.totalFiles >= 0
      ? Math.floor(input.totalFiles)
      : Object.keys(normalizedFileSizes).length;
  const totalFiles = derivedTotalFiles > 0 ? derivedTotalFiles : undefined;

  const uploadedBytesCandidate =
    typeof input?.uploadedBytes === 'number' && Number.isFinite(input.uploadedBytes) && input.uploadedBytes >= 0
      ? input.uploadedBytes
      : undefined;
  const normalizedUploadedBytes =
    typeof totalBytes === 'number' && typeof uploadedBytesCandidate === 'number'
      ? Math.min(totalBytes, uploadedBytesCandidate)
      : uploadedBytesCandidate;

  return {
    version: input?.version ?? DESKTOP_RESUME_VERSION,
    processingId,
    sourceMediaId: input?.sourceMediaId,
    identityId: input?.identityId,
    seriesId: input?.seriesId,
    seriesName: input?.seriesName,
    entryName: input?.entryName,
    backgroundColor: input?.backgroundColor,
    textColor: input?.textColor,
    folderPath: input?.folderPath,
    completedFiles: normalizedCompleted,
    fileRecords: normalizedFileRecords,
    fileSizes: normalizedFileSizes,
    totalBytes,
    totalFiles,
    uploadedBytes: normalizedUploadedBytes,
    lastUploadedAt: input?.lastUploadedAt,
    lastError: input?.lastError ?? null,
  };
};

const parseStoredResume = (processingId: string): UploadResumeState | null => {
  const raw = readJSON<unknown>(buildResumeKey(processingId));
  if (!raw) {
    return null;
  }
  if (isUploadResumeState(raw)) {
    return ensureResumeState(raw, processingId);
  }

  if (typeof raw === 'object') {
    const legacy = raw as Record<string, unknown>;
    const completedFiles = Array.isArray(legacy.completedFiles)
      ? (legacy.completedFiles as string[])
      : [];
    const fileRecords =
      legacy.fileRecords && typeof legacy.fileRecords === 'object'
        ? (legacy.fileRecords as Record<string, string>)
        : {};
    const fileSizes =
      legacy.fileSizes && typeof legacy.fileSizes === 'object'
        ? Object.entries(legacy.fileSizes as Record<string, unknown>).reduce<Record<string, number>>(
            (acc, [key, value]) => {
              if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
                acc[key] = value;
              }
              return acc;
            },
            {}
          )
        : {};
    const totalBytes =
      typeof legacy.totalBytes === 'number' && Number.isFinite(legacy.totalBytes) && legacy.totalBytes >= 0
        ? legacy.totalBytes
        : undefined;
    const totalFiles =
      typeof legacy.totalFiles === 'number' && Number.isFinite(legacy.totalFiles) && legacy.totalFiles >= 0
        ? Math.floor(legacy.totalFiles)
        : undefined;
    const uploadedBytes =
      typeof legacy.uploadedBytes === 'number' && Number.isFinite(legacy.uploadedBytes) && legacy.uploadedBytes >= 0
        ? legacy.uploadedBytes
        : undefined;

    if (completedFiles.length || Object.keys(fileRecords).length || Object.keys(fileSizes).length) {
      return ensureResumeState(
        {
          version: typeof legacy.version === 'number' ? legacy.version : 0,
          processingId,
          sourceMediaId:
            typeof legacy.sourceMediaId === 'string' ? legacy.sourceMediaId : undefined,
          identityId: typeof legacy.identityId === 'string' ? legacy.identityId : undefined,
          completedFiles,
          fileRecords,
          fileSizes,
          totalBytes,
          totalFiles,
          uploadedBytes,
        },
        processingId
      );
    }
  }

  return null;
};

const persistResumeState = (processingId: string, next: UploadResumeState): UploadResumeState => {
  const normalized = ensureResumeState(
    {
      ...next,
      version: DESKTOP_RESUME_VERSION,
      processingId,
    },
    processingId
  );
  writeJSON(buildResumeKey(processingId), normalized);
  return normalized;
};

const sanitizeCompletedFiles = (completedFiles: string[], fileSizes: Record<string, number>) => {
  const seen = new Set<string>();
  return completedFiles.filter((file) => {
    if (!fileSizes[file]) {
      return false;
    }
    if (seen.has(file)) {
      return false;
    }
    seen.add(file);
    return true;
  });
};

const sumCompletedBytes = (completedFiles: string[], fileSizes: Record<string, number>) => {
  return completedFiles.reduce((acc, file) => acc + (fileSizes[file] ?? 0), 0);
};

interface ResumeUploadStats {
  completedFiles: string[];
  totalFiles: number;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;
}

const deriveResumeUploadStats = (resumeState: UploadResumeState | null): ResumeUploadStats | null => {
  if (!resumeState) {
    return null;
  }

  const fileSizes = resumeState.fileSizes ?? {};
  const normalizedCompleted = sanitizeCompletedFiles(resumeState.completedFiles ?? [], fileSizes);
  const sizeEntries = Object.entries(fileSizes);

  const derivedTotalFiles =
    typeof resumeState.totalFiles === 'number' && resumeState.totalFiles > 0
      ? Math.floor(resumeState.totalFiles)
      : sizeEntries.length;
  const totalFiles = Math.max(derivedTotalFiles, normalizedCompleted.length);

  const derivedTotalBytes =
    typeof resumeState.totalBytes === 'number' && resumeState.totalBytes > 0
      ? resumeState.totalBytes
      : sizeEntries.reduce((acc, [, size]) => acc + size, 0);
  const totalBytes = Math.max(derivedTotalBytes, sumCompletedBytes(normalizedCompleted, fileSizes));

  const computedUploadedBytes = sumCompletedBytes(normalizedCompleted, fileSizes);
  const uploadedBytes =
    typeof resumeState.uploadedBytes === 'number' && resumeState.uploadedBytes >= 0
      ? Math.min(Math.max(resumeState.uploadedBytes, computedUploadedBytes), totalBytes || Number.MAX_SAFE_INTEGER)
      : computedUploadedBytes;

  let progress = 0;
  if (totalBytes > 0) {
    progress = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
  } else if (totalFiles > 0) {
    progress = Math.min(100, Math.round((normalizedCompleted.length / totalFiles) * 100));
  }

  return {
    completedFiles: normalizedCompleted,
    totalFiles,
    totalBytes,
    uploadedBytes,
    progress,
  };
};

const collectUploadSnapshot = async (
  fs: typeof import('fs'),
  pathModule: typeof import('path'),
  root: string
): Promise<UploadSnapshot> => {
  const fileSizes: Record<string, number> = {};

  const walk = async (directory: string) => {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = pathModule.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else {
        const stats = await fs.promises.stat(entryPath);
        const relativePath = pathModule.relative(root, entryPath).split(pathModule.sep).join('/');
        const normalizedPath = normalizeRelativePath(relativePath);
        const extension = `.${getExtension(normalizedPath)}`;
        if (SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
          fileSizes[normalizedPath] = stats.size;
        }
      }
    }
  };

  const directoryExists = await fs.promises
    .access(root)
    .then(() => true)
    .catch(() => false);
  if (!directoryExists) {
    return {
      fileSizes: {},
      totalBytes: 0,
      totalFiles: 0,
    };
  }

  await walk(root);
  const totalFiles = Object.keys(fileSizes).length;
  const totalBytes = Object.values(fileSizes).reduce((acc, size) => acc + size, 0);
  return {
    fileSizes,
    totalBytes,
    totalFiles,
  };
};

const buildEligibleSnapshotFromSummary = (summary: ProcessedSummary): UploadSnapshot => {
  const fileSizes = summary.files.reduce<Record<string, number>>((acc, file) => {
    const extension = `.${getExtension(file.normalizedPath)}`;
    if (SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
      acc[file.normalizedPath] = file.size;
    }
    return acc;
  }, {});
  const totalFiles = Object.keys(fileSizes).length;
  const totalBytes = Object.values(fileSizes).reduce((acc, size) => acc + size, 0);
  return {
    fileSizes,
    totalBytes,
    totalFiles,
  };
};

const clearResumeState = (processingId?: string) => {
  if (processingId) {
    safeRemoveItem(buildResumeKey(processingId));
  }
};

const isTokenExpiredError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
        ? (error as any).message
        : '';
  return message.toLowerCase().includes('token') && message.toLowerCase().includes('expir');
};

// Stable sorting function that doesn't cause items to jump around during progress updates
// Always sorts by createdAt (newest first) to keep the list stable
const sortSubmissions = (submissions: Submission[]): Submission[] => {
  return [...submissions].sort((a, b) => {
    // Sort by createdAt (newest first)
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    
    if (timeB !== timeA) return timeB - timeA;
    
    // ID as tiebreaker for absolute stability
    return a.id.localeCompare(b.id);
  });
};

const DesktopProcessingPage = () => {
  const theme = useTheme();
  const isElectron = typeof window !== 'undefined' && Boolean(window.process?.type);
  const { user: userContextValue, forceTokenRefresh } = useContext(UserContext) as {
    user: AuthUser;
    forceTokenRefresh?: () => Promise<void>;
  };
  const { setMessage, setOpen, setSeverity } = useContext(SnackbarContext);

  // Debug: Check sessionStorage on mount
  useEffect(() => {
    console.log('[DesktopProcessingPage] Component mounted');
    console.log('[DesktopProcessingPage] SessionStorage active upload:', getActiveUploadJobId());
  }, []);

  const authUser = userContextValue;
  const typedAuthUser =
    authUser !== null && authUser !== undefined && authUser !== false && typeof authUser === 'object'
      ? (authUser as { userDetails?: AuthUserDetails | null; sub?: string | null })
      : null;
  const authUserDetails = typedAuthUser?.userDetails ?? null;
  const isAuthLoading = authUser === null || typeof authUser === 'undefined';
  const hasUserDetails = Boolean(authUserDetails);
  const userSub = typedAuthUser?.sub ?? authUserDetails?.sub ?? null;

  // Series data
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const submissionsRef = useRef<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSeriesSelection, setNewSeriesSelection] = useState<SeriesOption | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newIndexName, setNewIndexName] = useState('');
  const [newSourceFolder, setNewSourceFolder] = useState('');
  const [newBackgroundColor, setNewBackgroundColor] = useState('#000000');
  const [newTextColor, setNewTextColor] = useState('#ffffff');
  const [creating, setCreating] = useState(false);

  // Processing state
  const [activeUploadId, setActiveUploadIdState] = useState<string | null>(() => getActiveUploadJobId());
  const [pendingAutoUpload, setPendingAutoUpload] = useState<Submission | null>(null);
  
  // Track which job we started processing in THIS session
  // Persisted to sessionStorage to survive page navigation but NOT app restart/quit
  // sessionStorage is automatically cleared when the app closes
  // This allows us to:
  // - Show loading spinner while actively processing (even after navigation)
  // - Show "Resume" button for jobs interrupted by app quit/restart
  const getInitialActiveProcessingId = () => {
    try {
      return sessionStorage.getItem('desktop-processing-active-job-id');
    } catch {
      return null;
    }
  };
  const activeProcessingIdRef = useRef<string | null>(getInitialActiveProcessingId());
  const [activeProcessingId, setActiveProcessingId] = useState<string | null>(() => getInitialActiveProcessingId());
  
  const lastCredentialsRefreshRef = useRef<number>(0);
  const statusPollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Track if upload should continue (used to cancel upload loops)
  const shouldContinueUploadRef = useRef<Record<string, boolean>>({});

  useEffect(() => subscribeToActiveUploadJobId(setActiveUploadIdState), [setActiveUploadIdState]);

  const setActiveUploadId = useCallback((next: string | null) => {
    setActiveUploadJobId(next);
  }, []);

  const getElectronModule = useCallback((): ElectronModule | null => {
    if (!isElectron || !window.require) {
      return null;
    }
    try {
      return window.require('electron') as ElectronModule;
    } catch {
      return null;
    }
  }, [isElectron]);

  const getSubmissionStorageKey = useCallback((submissionId: string) => {
    return `desktop-submission-${submissionId}`;
  }, []);

  const saveSubmission = useCallback((submission: Submission) => {
    writeJSON(getSubmissionStorageKey(submission.id), submission);
  }, [getSubmissionStorageKey]);

  const loadSubmission = useCallback((submissionId: string): Submission | null => {
    return readJSON<Submission>(getSubmissionStorageKey(submissionId));
  }, [getSubmissionStorageKey]);

  const cancelProcessingJob = useCallback((submissionId: string) => {
    const electronModule = getElectronModule();
    if (!electronModule) {
      return;
    }
    
    console.log('Cancelling processing job:', submissionId);
    
    // Send cancel signal to Electron
    electronModule.ipcRenderer.send('cancel-processing-job', { id: submissionId });
    
    // Clear active processing state
    if (activeProcessingIdRef.current === submissionId) {
      activeProcessingIdRef.current = null;
      setActiveProcessingId(null);
      try {
        sessionStorage.removeItem('desktop-processing-active-job-id');
        sessionStorage.removeItem(`desktop-auto-upload-after-${submissionId}`);
      } catch {
        // Ignore sessionStorage errors
      }
    }
  }, [getElectronModule]);

  const cancelUploadJob = useCallback((submissionId: string) => {
    console.log('Cancelling upload job:', submissionId);
    
    // Set flag to break upload loop
    shouldContinueUploadRef.current[submissionId] = false;
    
    // Clear active upload state
    if (activeUploadId === submissionId) {
      setActiveUploadId(null);
    }
  }, [activeUploadId, setActiveUploadId]);

  // Unified status polling for all active jobs (processing or uploading)
  useEffect(() => {
    if (!isElectron || !window.require) {
      return;
    }

    const pollActiveJobsStatus = async () => {
      const fs = window.require('fs') as typeof import('fs');
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');

      // CRITICAL: Always read from current ref to avoid stale closures
      const currentSubs = submissionsRef.current;
      const updates: Array<{ id: string; submission: Submission }> = [];

      // Use for...of instead of indexed loop to avoid index confusion
      for (const submission of currentSubs) {
        // Skip if this submission no longer exists (defensive check)
        if (!submission || !submission.id) {
          continue;
        }
        
        // Only poll jobs that are actively processing or uploading
        if (submission.status !== 'processing' && submission.status !== 'uploading') {
          continue;
        }

        const jobDir = path.join(os.homedir(), '.memesrc', 'processing', submission.id);

        // Poll processing status
        if (submission.status === 'processing') {
          const statusPath = path.join(jobDir, 'status.json');
          try {
            const statusExists = await fs.promises.access(statusPath).then(() => true).catch(() => false);
            if (statusExists) {
              const rawStatus = await fs.promises.readFile(statusPath, 'utf-8');
              const statusSummary = summarizeStatusData(JSON.parse(rawStatus));
              const processingProgress = deriveProcessingProgressFromSummary(statusSummary);

              // Check if processing completed
              if (isProcessingSummaryComplete(statusSummary)) {
                const updated = {
                  ...submission,
                  status: 'processed' as SubmissionStatus,
                  statusSummary,
                  processingProgress: 100,
                  updatedAt: new Date().toISOString(),
                };
                updates.push({ id: submission.id, submission: updated });
                saveSubmission(updated);
                
                // Check if we should auto-upload after processing
                let shouldAutoUpload = false;
                try {
                  shouldAutoUpload = sessionStorage.getItem(`desktop-auto-upload-after-${submission.id}`) === 'true';
                } catch {
                  // Ignore sessionStorage errors
                }
                
                // Clear active processing flag
                if (activeProcessingIdRef.current === submission.id) {
                  activeProcessingIdRef.current = null;
                  setActiveProcessingId(null);
                  try {
                    sessionStorage.removeItem('desktop-processing-active-job-id');
                    if (shouldAutoUpload) {
                      sessionStorage.removeItem(`desktop-auto-upload-after-${submission.id}`);
                    }
                  } catch {
                    // Ignore sessionStorage errors
                  }
                }
                
                // Schedule auto-upload if requested
                if (shouldAutoUpload) {
                  console.log('[Auto-upload] Processing complete, scheduling auto-upload for', submission.id);
                  setTimeout(() => {
                    setPendingAutoUpload(updated);
                  }, 500);
                }
              } else if (
                processingProgress !== submission.processingProgress ||
                JSON.stringify(statusSummary) !== JSON.stringify(submission.statusSummary)
              ) {
                const updated = {
                  ...submission,
                  statusSummary,
                  processingProgress,
                  updatedAt: new Date().toISOString(),
                };
                updates.push({ id: submission.id, submission: updated });
                saveSubmission(updated);
              }
            }
          } catch (error) {
            console.warn('Unable to poll processing status for', submission.id, error);
          }
        }

        // Poll upload status from storage
        if (submission.status === 'uploading') {
          // Re-verify submission still exists before loading
          const stored = loadSubmission(submission.id);
          if (!stored) {
            // Submission was deleted, skip it
            continue;
          }
          
          if (stored.status === 'uploading') {
            const resumeState = parseStoredResume(submission.id);
            const stats = deriveResumeUploadStats(resumeState);

            if (stats) {
              // Check if upload completed
              if (stats.progress >= 100) {
                const updated = {
                  ...submission,
                  status: 'completed' as SubmissionStatus,
                  uploadProgress: 100,
                  resumeState,
                  updatedAt: new Date().toISOString(),
                };
                updates.push({ id: submission.id, submission: updated });
                saveSubmission(updated);
                clearResumeState(submission.id);
              } else if (
                stats.progress !== submission.uploadProgress ||
                stats.uploadedBytes !== (submission.resumeState?.uploadedBytes ?? 0)
              ) {
                const updated = {
                  ...submission,
                  uploadProgress: stats.progress,
                  resumeState,
                  updatedAt: new Date().toISOString(),
                };
                updates.push({ id: submission.id, submission: updated });
                saveSubmission(updated);
              }
            }
          }
        }
      }

      // Apply all updates using submission IDs (never indices)
      if (updates.length > 0) {
        setSubmissions((currentSubs) => {
          // Create a map of updates by ID for O(1) lookup
          const updateMap = new Map(updates.map((u) => [u.id, u.submission]));
          
          // Apply updates by matching ID only
          // This ensures we never use stale array positions
          const updatedSubs = currentSubs.map((sub) => {
            const update = updateMap.get(sub.id);
            return update ?? sub;
          });
          
          // Use stable sort that won't cause items to jump around
          return sortSubmissions(updatedSubs);
        });

        // Also update selected submission if it was updated
        setSelectedSubmission((prev) => {
          if (!prev) return prev;
          const updated = updates.find((u) => u.id === prev.id);
          return updated ? updated.submission : prev;
        });
      }
    };

    // Initial poll
    pollActiveJobsStatus();

    // Poll every 2 seconds
    statusPollingInterval.current = setInterval(pollActiveJobsStatus, 2000);

    return () => {
      if (statusPollingInterval.current) {
        clearInterval(statusPollingInterval.current);
        statusPollingInterval.current = null;
      }
    };
  }, [isElectron, loadSubmission, saveSubmission]);

  const deleteSubmission = useCallback((submissionId: string) => {
    safeRemoveItem(getSubmissionStorageKey(submissionId));
    clearResumeState(submissionId);
  }, [getSubmissionStorageKey]);

  const loadAllSubmissions = useCallback(async () => {
    if (!isElectron || !window.require) {
      return;
    }
    setLoadingSubmissions(true);
    try {
      const fs = window.require('fs') as typeof import('fs');
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');
      
      const baseDir = path.join(os.homedir(), '.memesrc', 'processing');
      const exists = await fs.promises
        .access(baseDir)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        setSubmissions([]);
        return;
      }

      const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
      const loadedSubmissions: Submission[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const jobId = entry.name;
        const stored = loadSubmission(jobId);
        
        if (stored) {
          const jobDir = path.join(baseDir, jobId);
          const metadataPath = path.join(jobDir, '00_metadata.json');
          const statusPath = path.join(jobDir, 'status.json');

          let metadata: ProcessingMetadata | null = null;
          let statusSummary: ProcessingStatusSummary | null = null;

          try {
            const metadataExists = await fs.promises.access(metadataPath).then(() => true).catch(() => false);
            if (metadataExists) {
              const rawMetadata = await fs.promises.readFile(metadataPath, 'utf-8');
              metadata = JSON.parse(rawMetadata);
            }
          } catch {}

          try {
            const statusExists = await fs.promises.access(statusPath).then(() => true).catch(() => false);
            if (statusExists) {
              const rawStatus = await fs.promises.readFile(statusPath, 'utf-8');
              statusSummary = summarizeStatusData(JSON.parse(rawStatus));
            }
          } catch {}

          let resumeState = parseStoredResume(jobId);
          let workingResume = resumeState ? ensureResumeState(resumeState, jobId) : null;
          let uploadProgress = typeof stored.uploadProgress === 'number' ? stored.uploadProgress : undefined;
          let status = stored.status;
          let resumeMutated = false;

          if (workingResume) {
            if (!workingResume.fileSizes || Object.keys(workingResume.fileSizes).length === 0) {
              try {
                const snapshot = await collectUploadSnapshot(fs, path, jobDir);
                if (snapshot.totalFiles > 0) {
                  workingResume = ensureResumeState(
                    {
                      ...workingResume,
                      fileSizes: snapshot.fileSizes,
                      totalBytes: snapshot.totalBytes,
                      totalFiles: snapshot.totalFiles,
                    },
                    jobId
                  );
                  resumeMutated = true;
                }
              } catch (snapshotError) {
                console.warn('Unable to hydrate resume snapshot', snapshotError);
              }
            }

            let stats = deriveResumeUploadStats(workingResume);

            if (stats) {
              const shouldUpdateResume =
                stats.totalBytes !== (workingResume.totalBytes ?? 0) ||
                stats.totalFiles !== (workingResume.totalFiles ?? 0) ||
                stats.uploadedBytes !== (workingResume.uploadedBytes ?? 0) ||
                stats.completedFiles.length !== workingResume.completedFiles.length;

              if (shouldUpdateResume) {
                workingResume = ensureResumeState(
                  {
                    ...workingResume,
                    completedFiles: stats.completedFiles,
                    totalBytes: stats.totalBytes,
                    totalFiles: stats.totalFiles,
                    uploadedBytes: stats.uploadedBytes,
                  },
                  jobId
                );
                resumeMutated = true;
                stats = deriveResumeUploadStats(workingResume);
              }

              if (stats) {
                if (stats.progress > 0) {
                  uploadProgress = stats.progress;
                }
                if (stats.progress > 0 && stats.progress < 100) {
                  if (status !== 'completed' && status !== 'uploaded') {
                    status = 'uploading';
                  }
                } else if (stats.progress >= 100) {
                  uploadProgress = 100;
                  if (status === 'uploading') {
                    status = 'uploaded';
                  }
                }
              }
            }

            if (resumeMutated) {
              resumeState = persistResumeState(jobId, workingResume);
            } else {
              resumeState = workingResume;
            }
          }

          const updatedSubmission: Submission = {
            ...stored,
            status,
            uploadProgress,
            metadata,
            statusSummary,
            resumeState,
          };

          const uploadProgressChanged =
            typeof uploadProgress === 'number' && uploadProgress !== (stored.uploadProgress ?? undefined);
          const statusChanged = status !== stored.status;
          const resumeStateChanged =
            (!!resumeState &&
              JSON.stringify(resumeState.completedFiles) !==
                JSON.stringify(stored.resumeState?.completedFiles ?? [])) ||
            (!resumeState && !!stored.resumeState);

          if (uploadProgressChanged || statusChanged || resumeMutated || resumeStateChanged) {
            saveSubmission(updatedSubmission);
          }

          loadedSubmissions.push(updatedSubmission);
        }
      }

      // Use stable sort
      setSubmissions(sortSubmissions(loadedSubmissions));
    } catch (error) {
      console.error('Failed to load submissions', error);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [isElectron, loadSubmission, saveSubmission]);

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    try {
      const allSeries: SeriesOption[] = [];
      let nextToken: string | null | undefined;
      do {
        const response = (await API.graphql(
          graphqlOperation(listSeries, { limit: 200, nextToken })
        )) as GraphQLResult<ListSeriesQueryResult>;
        const items = response.data?.listSeries?.items ?? [];
        allSeries.push(
          ...items
            .filter((item): item is SeriesOption => Boolean(item?.id && item?.name))
            .map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug ?? null,
            }))
        );
        nextToken = response.data?.listSeries?.nextToken ?? null;
      } while (nextToken);
      setSeriesOptions(allSeries.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Failed to load series list', error);
      setMessage('Unable to load series list. Please retry.');
      setSeverity('error');
      setOpen(true);
    } finally {
      setSeriesLoading(false);
    }
  }, [setMessage, setOpen, setSeverity]);

  useEffect(() => {
    if (!isElectron || !hasUserDetails) {
      return;
    }
    loadSeries();
    loadAllSubmissions();
  }, [isElectron, hasUserDetails, loadSeries, loadAllSubmissions]);

  const handleSelectFolder = useCallback(async () => {
    const electronModule = getElectronModule();
    if (!electronModule) {
      setMessage('Folder selection is only available in the desktop app.');
      setSeverity('warning');
      setOpen(true);
      return '';
    }
    try {
      const selected = await electronModule.ipcRenderer.invoke('open-directory-dialog');
      return selected || '';
    } catch (error) {
      console.error('Failed to select folder', error);
      setMessage('Unable to select folder. Please try again.');
      setSeverity('error');
      setOpen(true);
      return '';
    }
  }, [getElectronModule, setMessage, setOpen, setSeverity]);

  const handleBrowseSourceFolder = useCallback(async () => {
    const folder = await handleSelectFolder();
    if (folder) {
      setNewSourceFolder(folder);
    }
  }, [handleSelectFolder]);

  const handleCreateSubmission = useCallback(async () => {
    if (!newSeriesSelection) {
      setMessage('Please select a series.');
      setSeverity('warning');
      setOpen(true);
      return;
    }
    if (!newTitle.trim()) {
      setMessage('Please enter a title.');
      setSeverity('warning');
      setOpen(true);
      return;
    }
    if (!newIndexName.trim()) {
      setMessage('Please enter an index/alias name.');
      setSeverity('warning');
      setOpen(true);
      return;
    }
    if (!newSourceFolder) {
      setMessage('Please select a source folder.');
      setSeverity('warning');
      setOpen(true);
      return;
    }
    if (!userSub) {
      setMessage('You must be signed in to create a submission.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    setCreating(true);
    try {
      // Force a new token and get identityId
      if (typeof forceTokenRefresh === 'function') {
        await forceTokenRefresh();
      }
      
      let identityId;
      try {
        const credentials = await Auth.currentCredentials();
        identityId = credentials?.identityId;
      } catch (credentialsError) {
        console.warn('Unable to resolve identity id', credentialsError);
      }

      if (!identityId) {
        throw new Error('Unable to resolve your identity. Please sign in again.');
      }

      // Create SourceMedia record with identityId
      const sourceMediaInput = {
        sourceMediaSeriesId: newSeriesSelection.id,
        status: 'pending',
        userDetailsSourceMediaId: userSub,
        identityId,
        pendingAlias: newIndexName.trim(),
      };

      const createResponse = (await API.graphql(
        graphqlOperation(createSourceMediaMutation, { input: sourceMediaInput })
      )) as GraphQLResult<CreateSourceMediaMutationResult>;

      const sourceMediaId = createResponse.data?.createSourceMedia?.id;
      if (!sourceMediaId) {
        throw new Error('Failed to create SourceMedia record.');
      }

      // Create submission ID
      const submissionId = `${paramCase(newTitle.trim())}-${nanoid(6).toLowerCase()}`;

      // Initialize local folder
      if (window.require) {
        const fs = window.require('fs') as typeof import('fs');
        const path = window.require('path') as typeof import('path');
        const os = window.require('os') as typeof import('os');

        const jobDir = path.join(os.homedir(), '.memesrc', 'processing', submissionId);
        await fs.promises.mkdir(jobDir, { recursive: true });
      }

      const now = new Date().toISOString();
      const newSubmission: Submission = {
        id: submissionId,
        sourceMediaId,
        seriesId: newSeriesSelection.id,
        seriesName: newSeriesSelection.name,
        title: newTitle.trim(),
        indexName: newIndexName.trim(),
        sourceFolderPath: newSourceFolder,
        backgroundColor: newBackgroundColor,
        textColor: newTextColor,
        status: 'created',
        createdAt: now,
        updatedAt: now,
      };

      saveSubmission(newSubmission);
      await loadAllSubmissions();

      setMessage('Submission created successfully!');
      setSeverity('success');
      setOpen(true);

      // Reset form
      setCreateDialogOpen(false);
      setNewSeriesSelection(null);
      setNewTitle('');
      setNewIndexName('');
      setNewSourceFolder('');
      setNewBackgroundColor('#000000');
      setNewTextColor('#ffffff');

      // Select the new submission
      setSelectedSubmission(newSubmission);
    } catch (error) {
      console.error('Failed to create submission', error);
      setMessage(error instanceof Error ? error.message : 'Failed to create submission.');
      setSeverity('error');
      setOpen(true);
    } finally {
      setCreating(false);
    }
  }, [
    newSeriesSelection,
    newTitle,
    newIndexName,
    newSourceFolder,
    newBackgroundColor,
    newTextColor,
    userSub,
    forceTokenRefresh,
    setMessage,
    setSeverity,
    setOpen,
    saveSubmission,
    loadAllSubmissions,
  ]);

  const handleStartProcessing = useCallback(async (submission: Submission, autoUploadAfter = false) => {
    const electronModule = getElectronModule();
    if (!electronModule) {
      setMessage('Processing is only available in the desktop app.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    try {
      // Pause any currently active submission first
      if (activeProcessingId && activeProcessingId !== submission.id) {
        console.log('Auto-pausing active processing job:', activeProcessingId);
        cancelProcessingJob(activeProcessingId);
      }
      if (activeUploadId && activeUploadId !== submission.id) {
        console.log('Auto-pausing active upload job:', activeUploadId);
        cancelUploadJob(activeUploadId);
      }

      // Mark as actively processing in this session
      activeProcessingIdRef.current = submission.id;
      setActiveProcessingId(submission.id);
      try {
        sessionStorage.setItem('desktop-processing-active-job-id', submission.id);
        // Store auto-upload flag if needed
        if (autoUploadAfter) {
          sessionStorage.setItem(`desktop-auto-upload-after-${submission.id}`, 'true');
        }
      } catch {
        // Ignore sessionStorage errors
      }

      // Update submission status to 'processing' immediately
      const updated: Submission = {
        ...submission,
        status: 'processing',
        processingProgress: submission.processingProgress ?? 0,
        error: undefined,
        updatedAt: new Date().toISOString(),
      };
      saveSubmission(updated);
      
      // Use functional updates to avoid stale state
      setSubmissions(subs => {
        const updatedSubs = subs.map(s => s.id === submission.id ? updated : s);
        return sortSubmissions(updatedSubs);
      });
      setSelectedSubmission(prev => prev?.id === submission.id ? updated : prev);

      // Tell electron to start processing (fire and forget)
      // The status polling will handle progress updates
      electronModule.ipcRenderer.send('test-javascript-processing', {
        inputPath: submission.sourceFolderPath,
        id: submission.id,
        title: submission.title,
        description: '',
        frameCount: 10,
        colorMain: submission.backgroundColor || '#000000',
        colorSecondary: submission.textColor || '#ffffff',
        emoji: '',
        fontFamily: '',
      });

      setMessage(autoUploadAfter ? 'Submission started!' : 'Processing started!');
      setSeverity('info');
      setOpen(true);
    } catch (error) {
      console.error('Failed to start processing', error);
      setMessage(error instanceof Error ? error.message : 'Failed to start processing.');
      setSeverity('error');
      setOpen(true);
      activeProcessingIdRef.current = null;
      setActiveProcessingId(null);
      try {
        sessionStorage.removeItem('desktop-processing-active-job-id');
        sessionStorage.removeItem(`desktop-auto-upload-after-${submission.id}`);
      } catch {
        // Ignore sessionStorage errors
      }
    }
  }, [getElectronModule, saveSubmission, setMessage, setSeverity, setOpen, activeProcessingId, activeUploadId, cancelProcessingJob, cancelUploadJob]);

  const loadProcessedSummary = useCallback(
    async (id: string): Promise<ProcessedSummary> => {
      if (!isElectron || !window.require) {
        throw new Error('Processed summary is only available in the desktop app.');
      }
      const fs = window.require('fs') as typeof import('fs');
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');

      const root = path.join(os.homedir(), '.memesrc', 'processing', id);
      const files: ProcessedFileInfo[] = [];

      const walk = async (directory: string) => {
        const entries = await fs.promises.readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            await walk(entryPath);
          } else {
            const stats = await fs.promises.stat(entryPath);
            const relativePath = path.relative(root, entryPath).split(path.sep).join('/');
            const normalizedPath = normalizeRelativePath(relativePath);
            files.push({
              absolutePath: entryPath,
              relativePath,
              normalizedPath,
              size: stats.size,
            });
          }
        }
      };

      const directoryExists = await fs.promises
        .access(root)
        .then(() => true)
        .catch(() => false);

      if (!directoryExists) {
        throw new Error('No processed output was found for this run.');
      }

      await walk(root);

      if (files.length === 0) {
        throw new Error('Processing completed but no output files were detected.');
      }

      const countsByExtension = files.reduce<Record<string, number>>((acc, file) => {
        const extension = getExtension(file.normalizedPath);
        acc[extension] = (acc[extension] || 0) + 1;
        return acc;
      }, {});

      const totalSize = files.reduce((acc, file) => acc + file.size, 0);

      return {
        files,
        countsByExtension,
        totalSize,
      };
    },
    [isElectron]
  );

  const handleStartUpload = useCallback(async (submission: Submission) => {
    console.log('handleStartUpload called for', submission.id, 'current activeUploadId:', activeUploadId);
    
    // Pause any currently active submission first
    if (activeProcessingId && activeProcessingId !== submission.id) {
      console.log('Auto-pausing active processing job:', activeProcessingId);
      cancelProcessingJob(activeProcessingId);
    }
    if (activeUploadId && activeUploadId !== submission.id) {
      console.log('Auto-pausing active upload job:', activeUploadId);
      cancelUploadJob(activeUploadId);
    }

    if (!userSub) {
      console.error('Upload blocked: user not signed in');
      setMessage('You must be signed in to upload.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    const fs = window.require?.('fs') as typeof import('fs') | undefined;
    const path = window.require?.('path') as typeof import('path') | undefined;
    const os = window.require?.('os') as typeof import('os') | undefined;

    if (!fs || !path || !os) {
      console.error('Upload blocked: file system APIs unavailable');
      setMessage('File system APIs are unavailable.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    let workingResume: UploadResumeState | null = null;
    let currentSubmission: Submission = submission;
    
    console.log('Starting upload process for', submission.id);
    
    // Set flag to allow upload to continue
    shouldContinueUploadRef.current[submission.id] = true;

    const applySubmissionPatch = (patch: Partial<Submission>) => {
      const nextSubmission: Submission = {
        ...currentSubmission,
        ...patch,
        updatedAt: new Date().toISOString(), // Always update timestamp
      };
      saveSubmission(nextSubmission);
      
      // Use functional update with proper sorting
      setSubmissions((subs) => {
        // Check if submission still exists (could have been deleted)
        if (!subs.find(s => s.id === submission.id)) {
          console.warn('Submission', submission.id, 'no longer exists, skipping update');
          return subs;
        }
        
        const updatedSubs = subs.map((s) => (s.id === submission.id ? nextSubmission : s));
        
        // Use stable sort based on createdAt (won't cause items to jump around)
        return sortSubmissions(updatedSubs);
      });
      
      setSelectedSubmission((prev) => (prev?.id === submission.id ? nextSubmission : prev));
      currentSubmission = nextSubmission;
      return nextSubmission;
    };

    // Mark this upload as active
    console.log('Setting active upload ID to', submission.id);
    setActiveUploadId(submission.id);

    // Update submission to uploading status
    applySubmissionPatch({
      status: 'uploading',
      error: undefined,
      updatedAt: new Date().toISOString(),
    });
    console.log('Updated submission status to uploading');

    try {
      console.log('Loading processed summary...');
      const summary = await loadProcessedSummary(submission.id);
      console.log('Processed summary loaded:', summary.files.length, 'files');
      const snapshot = buildEligibleSnapshotFromSummary(summary);
      const root = path.join(os.homedir(), '.memesrc', 'processing', submission.id);

      const eligibleFiles = summary.files.filter((file) => snapshot.fileSizes[file.normalizedPath]);
      if (!eligibleFiles.length) {
        setMessage('No supported files were found to upload (.mp4, .json, .csv).');
        setSeverity('warning');
        setOpen(true);
        setActiveUploadId(null);
        return;
      }

      const storedResume = parseStoredResume(submission.id);
      let workingResume = ensureResumeState(
        storedResume ?? {
          version: DESKTOP_RESUME_VERSION,
          processingId: submission.id,
          completedFiles: [],
          fileRecords: {},
        },
        submission.id
      );

      workingResume = ensureResumeState(
        {
          ...workingResume,
          sourceMediaId: submission.sourceMediaId,
          seriesId: submission.seriesId,
          seriesName: submission.seriesName,
          entryName: submission.title,
          backgroundColor: submission.backgroundColor,
          textColor: submission.textColor,
          folderPath: root,
        },
        submission.id
      );

      const normalizedCompleted = sanitizeCompletedFiles(
        workingResume.completedFiles,
        snapshot.fileSizes
      );
      let recordMap = Object.entries(workingResume.fileRecords ?? {}).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          if (snapshot.fileSizes[key]) {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );
      let uploadedBytes = sumCompletedBytes(normalizedCompleted, snapshot.fileSizes);

      workingResume = ensureResumeState(
        {
          ...workingResume,
          fileSizes: snapshot.fileSizes,
          totalBytes: snapshot.totalBytes,
          totalFiles: snapshot.totalFiles,
          completedFiles: normalizedCompleted,
          fileRecords: recordMap,
          uploadedBytes,
        },
        submission.id
      );
      workingResume = persistResumeState(submission.id, workingResume);

      const persistResume = (patch: Partial<UploadResumeState>) => {
        workingResume = ensureResumeState({ ...workingResume, ...patch }, submission.id);
        workingResume = persistResumeState(submission.id, workingResume);
        return workingResume;
      };

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const ensureFreshCredentials = async (forceRefresh = false) => {
        if (forceRefresh && typeof forceTokenRefresh === 'function') {
          await forceTokenRefresh();
        }
        const credentials = await Auth.currentCredentials();
        const resolvedIdentityId = credentials?.identityId ?? workingResume.identityId ?? null;
        if (!resolvedIdentityId) {
          throw new Error('Unable to determine your storage identity. Please sign in again.');
        }
        lastCredentialsRefreshRef.current = Date.now();
        persistResume({ identityId: resolvedIdentityId, lastError: null });
        return resolvedIdentityId;
      };

      let identityId = workingResume.identityId ?? null;
      identityId = await ensureFreshCredentials(!identityId);

      const completedSet = new Set(workingResume.completedFiles);

      const syncSubmission = () => {
        const stats = deriveResumeUploadStats(workingResume);
        const progress = stats ? stats.progress : 0;
        return applySubmissionPatch({
          status: progress >= 100 ? 'completed' : 'uploading',
          uploadProgress: progress,
          resumeState: workingResume,
          updatedAt: new Date().toISOString(),
        });
      };

      currentSubmission = syncSubmission();

      if ((currentSubmission.uploadProgress ?? 0) >= 100) {
        clearResumeState(submission.id);
        applySubmissionPatch({
          status: 'completed',
          uploadProgress: currentSubmission.uploadProgress ?? 100,
          resumeState: undefined,
          updatedAt: new Date().toISOString(),
          error: undefined,
        });
        setMessage('Upload already completed.');
        setSeverity('success');
        setOpen(true);
        await loadAllSubmissions();
        return;
      }

      const updateProgress = () => {
        const stats = deriveResumeUploadStats(workingResume);
        if (!stats) {
          return;
        }
        const progress = stats.progress;
        if (
          progress !== (currentSubmission.uploadProgress ?? 0) ||
          currentSubmission.resumeState !== workingResume
        ) {
          applySubmissionPatch({
            status: 'uploading',
            uploadProgress: progress,
            resumeState: workingResume,
            updatedAt: new Date().toISOString(),
          });
        }
      };

      const uploadWithRetry = async (
        storageKey: string,
        fileBuffer: Buffer,
        contentType: string | undefined,
        attempt = 0
      ): Promise<void> => {
        await ensureFreshCredentials(attempt > 0);
        try {
          await Storage.put(storageKey, fileBuffer, {
            level: 'protected',
            contentType,
          });
        } catch (error) {
          if (isTokenExpiredError(error) && attempt < MAX_UPLOAD_RETRIES) {
            await delay(UPLOAD_RETRY_DELAY_MS * (attempt + 1));
            await ensureFreshCredentials(true);
            return uploadWithRetry(storageKey, fileBuffer, contentType, attempt + 1);
          }
          throw error;
        }
      };

      // Upload each file that hasn't been completed yet
      // Files are only marked as completed AFTER successful upload
      // This ensures partial uploads are retried on resume
      console.log('Starting upload loop:', eligibleFiles.length, 'total files,', completedSet.size, 'already completed');
      
      for (const file of eligibleFiles) {
        // Check if upload was cancelled/paused
        if (!shouldContinueUploadRef.current[submission.id]) {
          console.log('Upload cancelled by user for', submission.id);
          throw new Error('Upload paused');
        }
        
        const normalizedRelativePath = file.normalizedPath;
        if (completedSet.has(normalizedRelativePath)) {
          continue;
        }
        
        console.log('Uploading file:', normalizedRelativePath);

        if (Date.now() - lastCredentialsRefreshRef.current > CREDENTIAL_REFRESH_INTERVAL_MS) {
          identityId = await ensureFreshCredentials(true);
        }

        const storageKey = `${submission.sourceMediaId}/${normalizedRelativePath}`;
        const contentType =
          CONTENT_TYPE_BY_EXTENSION[getExtension(normalizedRelativePath)] ?? 'application/octet-stream';
        const diskPath = path.join(root, normalizedRelativePath.split('/').join(path.sep));

        const fileExists = await fs.promises
          .access(diskPath)
          .then(() => true)
          .catch(() => false);
        if (!fileExists) {
          console.warn('Skipping missing file', diskPath);
          continue;
        }

        const fileBuffer = await fs.promises.readFile(diskPath);

        let fileRecordId = recordMap[normalizedRelativePath] ?? null;
        if (!fileRecordId) {
          try {
            const createFileResponse = (await API.graphql(
              graphqlOperation(createFileMutation, {
                input: {
                  sourceMediaFilesId: submission.sourceMediaId,
                  key: `protected/${identityId}/${storageKey}`,
                  status: 'uploading',
                },
              })
            )) as GraphQLResult<CreateFileMutationResult>;
            fileRecordId = createFileResponse.data?.createFile?.id ?? null;
            if (fileRecordId) {
              recordMap = {
                ...recordMap,
                [normalizedRelativePath]: fileRecordId,
              };
              workingResume = persistResume({ fileRecords: recordMap });
            }
          } catch (createFileError) {
            console.warn('Unable to create file record', createFileError);
          }
        }

        // Upload the file (will throw on failure, preventing it from being marked complete)
        await uploadWithRetry(storageKey, fileBuffer, contentType);

        if (fileRecordId) {
          try {
            await API.graphql(
              graphqlOperation(updateFileMutation, {
                input: {
                  id: fileRecordId,
                  status: 'uploaded',
                },
              })
            );
          } catch (updateFileError) {
            console.warn('Unable to update file record status', updateFileError);
          }
        }

        // Only mark as complete after successful upload
        completedSet.add(normalizedRelativePath);
        // Use the size from snapshot.fileSizes to ensure consistency with progress calculations
        uploadedBytes += snapshot.fileSizes[normalizedRelativePath] ?? 0;

        workingResume = persistResume({
          completedFiles: Array.from(completedSet),
          fileRecords: recordMap,
          uploadedBytes,
          lastUploadedAt: new Date().toISOString(),
        });

        updateProgress();
        console.log('File uploaded successfully:', normalizedRelativePath, `(${completedSet.size}/${eligibleFiles.length})`);
      }
      
      console.log('Upload loop completed. All files uploaded.');

      try {
        await API.graphql(
          graphqlOperation(updateSourceMediaMutation, {
            input: {
              id: submission.sourceMediaId,
              status: 'uploaded',
            },
          })
        );
      } catch {}

      clearResumeState(submission.id);

      currentSubmission = applySubmissionPatch({
        status: 'completed',
        uploadProgress: 100,
        resumeState: undefined,
        updatedAt: new Date().toISOString(),
        error: undefined,
      });

      console.log('Upload completed successfully for', submission.id);
      setMessage('Upload completed successfully!');
      setSeverity('success');
      setOpen(true);

      await loadAllSubmissions();
    } catch (error) {
      console.error('Upload failed for', submission.id, ':', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Don't treat "Upload paused" as an error - it's intentional
      if (errorMessage === 'Upload paused') {
        console.log('Upload paused gracefully for', submission.id);
        // Don't update status to error, leave it as 'uploading' so it can be resumed
        return;
      }

      applySubmissionPatch({
        status: 'error',
        error: errorMessage,
        resumeState: workingResume ?? currentSubmission.resumeState,
        updatedAt: new Date().toISOString(),
      });

      setMessage(`Upload error: ${errorMessage}`);
      setSeverity('error');
      setOpen(true);
    } finally {
      // Always clear the active upload ID when done (success, error, or interrupted)
      console.log('Clearing active upload ID');
      setActiveUploadId(null);
      // Clean up the continue flag
      delete shouldContinueUploadRef.current[submission.id];
    }
  }, [
    userSub,
    activeUploadId,
    activeProcessingId,
    cancelProcessingJob,
    cancelUploadJob,
    loadProcessedSummary,
    saveSubmission,
    forceTokenRefresh,
    setMessage,
    setSeverity,
    setOpen,
    loadAllSubmissions,
    setActiveUploadId,
  ]);

  // Effect to trigger auto-upload when pendingAutoUpload is set
  useEffect(() => {
    if (pendingAutoUpload) {
      console.log('[Auto-upload] Triggering upload for', pendingAutoUpload.id);
      handleStartUpload(pendingAutoUpload);
      setPendingAutoUpload(null);
    }
  }, [pendingAutoUpload, handleStartUpload]);

  // Auto-resume upload after navigation/refresh if there's an active upload in sessionStorage
  const hasAttemptedAutoResumeRef = useRef(false);
  
  useEffect(() => {
    // Don't try to auto-resume if we've already attempted (check FIRST to avoid log spam)
    if (hasAttemptedAutoResumeRef.current) {
      return;
    }
    
    console.log('[Auto-resume] Effect triggered. Electron:', isElectron, 'User:', !!hasUserDetails, 'Submissions:', submissions.length);
    
    if (!isElectron || !hasUserDetails || submissions.length === 0) {
      console.log('[Auto-resume] Early return - conditions not met');
      return;
    }

    const storedActiveUploadId = getActiveUploadJobId();
    console.log('[Auto-resume] Stored active upload ID from sessionStorage:', storedActiveUploadId);
    
    if (!storedActiveUploadId) {
      console.log('[Auto-resume] No stored upload ID, nothing to resume');
      return;
    }

    // Check if this upload is actually in progress (not completed)
    const submission = submissions.find((s) => s.id === storedActiveUploadId);
    if (!submission) {
      // Submission not found, clear the stale reference
      console.warn('[Auto-resume] Submission not found, clearing stale reference', storedActiveUploadId);
      setActiveUploadJobId(null);
      return;
    }

    console.log('[Auto-resume] Found submission:', submission.id, 'status:', submission.status, 'progress:', submission.uploadProgress);

    // Only auto-resume if status is uploading and progress is incomplete
    if (submission.status === 'uploading' && (submission.uploadProgress ?? 0) < 100) {
      console.log('[Auto-resume] ✅ Triggering auto-resume for', submission.id, 'at', submission.uploadProgress, '%');
      hasAttemptedAutoResumeRef.current = true;
      
      // Small delay to ensure all state is settled
      setTimeout(() => {
        console.log('[Auto-resume] Calling handleStartUpload now');
        handleStartUpload(submission);
      }, 100);
    } else if (submission.status === 'completed' || (submission.uploadProgress ?? 0) >= 100) {
      // Upload is complete, clear the active flag
      console.log('[Auto-resume] Upload already complete, clearing active flag');
      setActiveUploadJobId(null);
    } else {
      console.log('[Auto-resume] Status/progress does not qualify for auto-resume');
    }
  }, [isElectron, hasUserDetails, submissions, handleStartUpload]);

  const handlePauseSubmission = useCallback((submission: Submission) => {
    if (activeUploadId === submission.id) {
      console.log('Pausing upload for', submission.id);
      cancelUploadJob(submission.id);
      setMessage('Upload paused. Click Resume to continue.');
      setSeverity('info');
      setOpen(true);
    } else if (activeProcessingId === submission.id) {
      console.log('Pausing processing for', submission.id);
      cancelProcessingJob(submission.id);
      setMessage('Processing cancelled. Click Resume to restart from the last checkpoint.');
      setSeverity('info');
      setOpen(true);
    }
  }, [activeUploadId, activeProcessingId, cancelUploadJob, cancelProcessingJob, setMessage, setSeverity, setOpen]);

  const handleDeleteSubmission = useCallback(async (submission: Submission) => {
    if (!window.confirm(`Are you sure you want to delete "${submission.title}"? This will remove the local submission record but not the remote SourceMedia.`)) {
      return;
    }

    try {
      const submissionId = submission.id;
      
      // Cancel any active operations first
      if (activeUploadId === submissionId) {
        cancelUploadJob(submissionId);
      }
      if (activeProcessingIdRef.current === submissionId) {
        cancelProcessingJob(submissionId);
      }
      
      // Clean up the continue flag
      delete shouldContinueUploadRef.current[submissionId];
      
      // Delete from localStorage
      deleteSubmission(submissionId);
      
      // Update state with functional update to ensure we filter by ID
      setSubmissions(subs => {
        const filtered = subs.filter(s => s.id !== submissionId);
        console.log('[Delete] Removed submission', submissionId, 'from state. Remaining:', filtered.length);
        return filtered;
      });
      
      // Clear selected submission if it was the deleted one
      setSelectedSubmission(prev => prev?.id === submissionId ? null : prev);

      setMessage('Submission deleted successfully.');
      setSeverity('success');
      setOpen(true);
    } catch (error) {
      console.error('Failed to delete submission', error);
      setMessage('Failed to delete submission.');
      setSeverity('error');
      setOpen(true);
    }
  }, [deleteSubmission, activeUploadId, cancelUploadJob, cancelProcessingJob, setMessage, setSeverity, setOpen]);

  const handleRefresh = useCallback(() => {
    loadAllSubmissions();
  }, [loadAllSubmissions]);

  const handleOpenReviewPage = useCallback((sourceMediaId: string) => {
    const reviewUrl = `/dashboard/review-upload?sourceMediaId=${sourceMediaId}`;
    window.open(reviewUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const getUploadStatsForSubmission = (submission: Submission) =>
    deriveResumeUploadStats(submission.resumeState ?? null);

  const isUploadPaused = (submission: Submission) => {
    if (submission.status !== 'uploading') {
      return false;
    }
    const stats = getUploadStatsForSubmission(submission);
    const progress = submission.uploadProgress ?? stats?.progress ?? 0;
    const isActive = activeUploadId === submission.id;
    return progress > 0 && progress < 100 && !isActive;
  };

  const getStatusColor = (submission: Submission): 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' => {
    if (isUploadPaused(submission)) {
      return 'warning';
    }
    switch (submission.status) {
      case 'completed':
      case 'uploaded':
        return 'success';
      case 'processing':
        return 'info';
      case 'uploading':
        return 'info';
      case 'processed':
        return 'primary';
      case 'error':
        return 'error';
      case 'created':
      default:
        return 'default';
    }
  };

  const getStatusLabel = (submission: Submission): string => {
    if (submission.status === 'uploading') {
      if (isUploadPaused(submission)) {
        return 'Upload Paused';
      }
      const progress = submission.uploadProgress ?? 0;
      if (progress >= 100) {
        return 'Upload Complete';
      }
      return 'Uploading';
    }
    switch (submission.status) {
      case 'created':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'processed':
        return 'Ready to Upload';
      case 'uploaded':
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return submission.status;
    }
  };

  const isSubmissionProcessingIncomplete = (submission: Submission) => {
    if (isProcessingSummaryInProgress(submission.statusSummary)) {
      return true;
    }
    return typeof submission.processingProgress === 'number' && submission.processingProgress < 100;
  };

  const isProcessingActive = (submission: Submission) => {
    // Only consider it actively processing if we started it in THIS session
    return submission.status === 'processing' && 
           activeProcessingId === submission.id &&
           !isProcessingSummaryComplete(submission.statusSummary);
  };

  const canStartProcessing = (submission: Submission) => {
    // Can't start if already actively processing in this session
    if (isProcessingActive(submission)) {
      return false;
    }
    // Can start/resume if created, error, or incomplete processing
    if (submission.status === 'created') {
      return true;
    }
    if (submission.status === 'error') {
      return true;
    }
    // Can resume processing if it's marked as processing but not active (paused/interrupted)
    if (submission.status === 'processing' && activeProcessingId !== submission.id) {
      return true;
    }
    if (submission.status === 'processed' && isSubmissionProcessingIncomplete(submission)) {
      return true;
    }
    return false;
  };

  const getProcessingButtonLabel = (submission: Submission): string => {
    if (submission.status === 'processing' && isSubmissionProcessingIncomplete(submission)) {
      return 'Resume Processing';
    }
    if (submission.status === 'error') {
      return 'Retry Processing';
    }
    if (submission.status === 'processed' && isSubmissionProcessingIncomplete(submission)) {
      return 'Resume Processing';
    }
    return 'Start Processing';
  };

  const isUploadActive = (submission: Submission) => {
    return activeUploadId === submission.id;
  };

  const canStartUpload = (submission: Submission) => {
    // Can't start if another upload is active
    if (activeUploadId && activeUploadId !== submission.id) {
      return false;
    }
    // Can't start if this upload is already running
    if (isUploadActive(submission)) {
      return false;
    }
    // Can start if processed, error, or incomplete upload
    if (submission.status === 'processed' || submission.status === 'error') {
      return true;
    }
    if (submission.status === 'uploading') {
      const stats = getUploadStatsForSubmission(submission);
      const progress = submission.uploadProgress ?? stats?.progress ?? 0;
      return progress < 100;
    }
    return false;
  };

  const getUploadButtonLabel = (submission: Submission) => {
    if (isUploadPaused(submission) || (submission.uploadProgress ?? 0) > 0) {
      return 'Resume Upload';
    }
    return 'Start Upload';
  };

  // Unified submission flow
  const handleSubmit = useCallback((submission: Submission) => {
    // If not yet processed, start processing with auto-upload
    if (submission.status === 'created' || submission.status === 'error') {
      handleStartProcessing(submission, true);
    }
    // If processing incomplete, resume processing with auto-upload
    else if (submission.status === 'processing' || (submission.status === 'processed' && isSubmissionProcessingIncomplete(submission))) {
      handleStartProcessing(submission, true);
    }
    // If processed, start upload directly
    else if (submission.status === 'processed' || submission.status === 'uploading') {
      handleStartUpload(submission);
    }
  }, [handleStartProcessing, handleStartUpload]);

  const canSubmit = (submission: Submission) => {
    // Can't submit if another upload is active
    if (activeUploadId && activeUploadId !== submission.id) {
      return false;
    }
    // Can't submit if another processing job is active
    if (activeProcessingId && activeProcessingId !== submission.id) {
      return false;
    }
    // Can't submit if already completed
    if (submission.status === 'completed' || submission.status === 'uploaded') {
      return false;
    }
    return true;
  };

  const getSubmitButtonLabel = (submission: Submission): string => {
    const processingIncomplete = isSubmissionProcessingIncomplete(submission);
    const uploadIncomplete = submission.status === 'uploading' && (submission.uploadProgress ?? 0) < 100;
    
    if (submission.status === 'created') {
      return 'Submit';
    }
    if (submission.status === 'error') {
      return 'Retry Submission';
    }
    if (submission.status === 'processing' && processingIncomplete) {
      return 'Resume Submission';
    }
    if (submission.status === 'processed' && processingIncomplete) {
      return 'Resume Submission';
    }
    if (submission.status === 'processed' && !processingIncomplete) {
      return 'Submit (Start Upload)';
    }
    if (uploadIncomplete || isUploadPaused(submission)) {
      return 'Resume Submission';
    }
    return 'Submit';
  };

  const getSubmissionPhase = (submission: Submission): { activeStep: number; steps: string[] } => {
    const steps = ['Processing', 'Uploading'];
    let activeStep = 0;
    
    if (submission.status === 'created') {
      activeStep = 0;
    } else if (submission.status === 'processing' || submission.status === 'processed') {
      activeStep = 0;
    } else if (submission.status === 'uploading' || submission.status === 'uploaded') {
      activeStep = 1;
    } else if (submission.status === 'completed') {
      activeStep = 2;
    }
    
    return { activeStep, steps };
  };

  const getSubmissionProgress = (submission: Submission): { phase: string; progress: number; label: string } | null => {
    if (submission.status === 'processing' || (submission.status === 'processed' && isSubmissionProcessingIncomplete(submission))) {
      const progress = submission.processingProgress ?? 0;
      return {
        phase: 'Processing',
        progress,
        label: `Processing: ${progress}%`,
      };
    }
    if (submission.status === 'uploading' || isUploadPaused(submission)) {
      const progress = submission.uploadProgress ?? 0;
      const paused = isUploadPaused(submission);
      return {
        phase: 'Uploading',
        progress,
        label: paused ? `Upload paused at ${progress}%` : `Uploading: ${progress}%`,
      };
    }
    if (submission.status === 'completed' || submission.status === 'uploaded') {
      return {
        phase: 'Completed',
        progress: 100,
        label: 'Submission complete',
      };
    }
    return null;
  };

  if (isAuthLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'common.black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  if (!hasUserDetails) {
    return <Navigate to="/login" replace />;
  }

  if (!isElectron) {
    return (
      <Container sx={{ py: 8 }}>
        <Helmet>
          <title>Desktop Processing - memeSRC Dashboard</title>
        </Helmet>
        <Alert severity="info">
          This tool is only available in the memeSRC desktop application. Please launch the
          desktop app to process and submit content.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Desktop Processing - memeSRC Dashboard</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              alignItems={{ xs: 'flex-start', sm: 'center' }} 
              justifyContent="space-between"
              spacing={3}
            >
              <Box>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    mb: 1,
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Submissions
                </Typography>
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  Process and upload your content in a unified workflow
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loadingSubmissions}
                  size="large"
                  sx={{ 
                    fontWeight: 600,
                    minWidth: 120,
                  }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  size="large"
                  sx={{ 
                    fontWeight: 600,
                    minWidth: 180,
                  }}
                >
                  New Submission
                </Button>
              </Stack>
            </Stack>
          </Box>

          {/* Submissions List */}
          {loadingSubmissions && <LinearProgress />}
          
          {!loadingSubmissions && submissions.length === 0 && (
            <Paper 
              elevation={0}
              sx={{ 
                p: 8, 
                textAlign: 'center',
                borderRadius: 3,
                border: 2,
                borderStyle: 'dashed',
                borderColor: 'divider',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.6 }} />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                No submissions yet
              </Typography>
              <Typography variant="body1" color="text.secondary" fontWeight={500} sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                Create your first submission to start processing and uploading content. The unified workflow will handle both phases automatically.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                size="large"
                sx={{ 
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  minWidth: 240,
                }}
              >
                Create Your First Submission
              </Button>
            </Paper>
          )}

          {submissions.length > 0 && (
            <Stack spacing={4}>
              {/* In Progress Section */}
              {submissions.filter(s => s.status !== 'completed' && s.status !== 'uploaded').length > 0 && (
                <Box>
                  <Typography 
                    variant="h6" 
                    fontWeight={700} 
                    sx={{ mb: 2, color: 'text.primary' }}
                  >
                    In Progress
                  </Typography>
                  <Stack spacing={2}>
                    {submissions
                      .filter(s => s.status !== 'completed' && s.status !== 'uploaded')
                      .map((submission) => {
                        const progressInfo = getSubmissionProgress(submission);
                        const isActive = isProcessingActive(submission) || isUploadActive(submission);
                        const isComplete = submission.status === 'completed' || submission.status === 'uploaded';
                        const isProcessingPaused = submission.status === 'processing' && 
                                                  activeProcessingId !== submission.id && 
                                                  isSubmissionProcessingIncomplete(submission);
                        const isPaused = isUploadPaused(submission) || isProcessingPaused;

                        return (
                          <Paper
                            key={submission.id}
                            elevation={0}
                            sx={{ 
                              p: 3,
                              borderRadius: 3,
                              bgcolor: 'background.paper',
                              border: 1,
                              borderColor: isActive ? 'primary.main' : 'divider',
                              transition: 'all 0.3s ease',
                              boxShadow: isActive 
                                ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
                                : 'none',
                              '&:hover': {
                                boxShadow: theme.shadows[4],
                              },
                            }}
                          >
                    <Grid container spacing={3} alignItems="center">
                      {/* Left: Status Icon - Fixed width to prevent layout shift */}
                      <Grid item xs="auto">
                        <Box 
                          sx={{ 
                            width: 56, 
                            height: 56, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isComplete ? (
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
                            </Box>
                          ) : isActive ? (
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CircularProgress size={32} thickness={3.5} />
                            </Box>
                          ) : isPaused ? (
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PauseCircleOutlineIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                            </Box>
                          ) : (
                            <Box 
                              sx={{ 
                                width: 56, 
                                height: 56, 
                                borderRadius: '50%', 
                                border: 2, 
                                borderColor: alpha(theme.palette.divider, 0.5),
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PlayArrowIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                            </Box>
                          )}
                        </Box>
                      </Grid>

                      {/* Middle: Info & Progress - Flexible width */}
                      <Grid item xs>
                        <Box sx={{ minHeight: 88 }}>
                          <Typography variant="h6" fontWeight={600} noWrap sx={{ mb: 0.5 }}>
                            {submission.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 2 }}>
                            {submission.seriesName} • {submission.indexName}
                          </Typography>
                          
                          {/* Always reserve space for progress/status to prevent layout shift */}
                          <Box sx={{ minHeight: 32 }}>
                            {progressInfo && !isComplete && (
                              <Box>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                    {progressInfo.phase}
                                  </Typography>
                                  <Typography variant="caption" fontWeight={700} color={isPaused ? 'text.secondary' : 'primary.main'}>
                                    {progressInfo.progress}%
                                  </Typography>
                                </Stack>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={progressInfo.progress}
                                  sx={{ 
                                    height: 6, 
                                    borderRadius: 1,
                                    bgcolor: alpha(theme.palette.action.disabledBackground, 0.3),
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 1,
                                      bgcolor: isPaused 
                                        ? theme.palette.action.disabled
                                        : 'primary.main',
                                    },
                                  }}
                                />
                              </Box>
                            )}

                            {isComplete && (
                              <Chip 
                                label="Completed" 
                                color="success" 
                                size="medium"
                                icon={<CheckCircleIcon />}
                                sx={{ fontWeight: 600 }}
                              />
                            )}

                            {submission.error && (
                              <Alert severity="error" sx={{ py: 0, mt: 1 }}>
                                <Typography variant="caption" fontWeight={500}>
                                  {submission.error}
                                </Typography>
                              </Alert>
                            )}
                          </Box>
                        </Box>
                      </Grid>

                      {/* Right: Actions - Two buttons always present */}
                      <Grid item xs="auto">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {/* Primary action button - morphs based on state */}
                          <IconButton
                            onClick={() => {
                              if (isComplete) {
                                handleOpenReviewPage(submission.sourceMediaId);
                              } else if (isActive) {
                                handlePauseSubmission(submission);
                              } else {
                                handleSubmit(submission);
                              }
                            }}
                            disabled={isComplete ? false : submission.status === 'completed' || submission.status === 'uploaded'}
                            title={
                              isComplete 
                                ? 'Review Submission' 
                                : isActive 
                                  ? (isUploadActive(submission) ? 'Pause Upload' : 'Cancel Processing')
                                  : getSubmitButtonLabel(submission)
                            }
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: isComplete
                                ? alpha(theme.palette.success.main, 0.15)
                                : isActive
                                  ? alpha(theme.palette.warning.main, 0.15)
                                  : alpha(theme.palette.primary.main, 0.15),
                              color: isComplete
                                ? 'success.main'
                                : isActive
                                  ? 'warning.main'
                                  : 'primary.main',
                              '&:hover': {
                                bgcolor: isComplete
                                  ? alpha(theme.palette.success.main, 0.25)
                                  : isActive
                                    ? alpha(theme.palette.warning.main, 0.25)
                                    : alpha(theme.palette.primary.main, 0.25),
                              },
                              '&.Mui-disabled': {
                                bgcolor: alpha(theme.palette.action.disabledBackground, 0.5),
                                color: 'action.disabled',
                              },
                            }}
                          >
                            {isComplete ? (
                              <CheckCircleIcon sx={{ fontSize: 28 }} />
                            ) : isActive ? (
                              <PauseIcon sx={{ fontSize: 28 }} />
                            ) : (
                              <PlayArrowIcon sx={{ fontSize: 28 }} />
                            )}
                          </IconButton>
                          
                          {/* Delete button - always present */}
                          <IconButton
                            onClick={() => handleDeleteSubmission(submission)}
                            disabled={isActive}
                            title="Delete Submission"
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: alpha(theme.palette.error.main, 0.08),
                              color: 'error.main',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.18),
                              },
                              '&.Mui-disabled': {
                                bgcolor: alpha(theme.palette.action.disabledBackground, 0.5),
                                color: 'action.disabled',
                                opacity: 0.5,
                              },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 24 }} />
                          </IconButton>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                        );
                      })}
                  </Stack>
                </Box>
              )}

              {/* Submitted Section */}
              {submissions.filter(s => s.status === 'completed' || s.status === 'uploaded').length > 0 && (
                <Box>
                  <Typography 
                    variant="h6" 
                    fontWeight={700} 
                    sx={{ mb: 2, color: 'text.primary' }}
                  >
                    Submitted
                  </Typography>
                  <Stack spacing={2}>
                    {submissions
                      .filter(s => s.status === 'completed' || s.status === 'uploaded')
                      .map((submission) => {
                        const progressInfo = getSubmissionProgress(submission);
                        const isActive = isProcessingActive(submission) || isUploadActive(submission);
                        const isComplete = submission.status === 'completed' || submission.status === 'uploaded';
                        const isProcessingPaused = submission.status === 'processing' && 
                                                  activeProcessingId !== submission.id && 
                                                  isSubmissionProcessingIncomplete(submission);
                        const isPaused = isUploadPaused(submission) || isProcessingPaused;

                        return (
                          <Paper
                            key={submission.id}
                            elevation={0}
                            sx={{ 
                              p: 3,
                              borderRadius: 3,
                              bgcolor: 'background.paper',
                              border: 1,
                              borderColor: 'success.main',
                              transition: 'all 0.3s ease',
                              boxShadow: `0 0 0 2px ${alpha(theme.palette.success.main, 0.1)}`,
                              '&:hover': {
                                boxShadow: theme.shadows[4],
                              },
                            }}
                          >
                    <Grid container spacing={3} alignItems="center">
                      {/* Left: Status Icon - Fixed width to prevent layout shift */}
                      <Grid item xs="auto">
                        <Box 
                          sx={{ 
                            width: 56, 
                            height: 56, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isComplete ? (
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
                            </Box>
                          ) : isActive ? (
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CircularProgress size={32} thickness={3.5} />
                            </Box>
                          ) : isPaused ? (
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PauseCircleOutlineIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                            </Box>
                          ) : (
                            <Box 
                              sx={{ 
                                width: 56, 
                                height: 56, 
                                borderRadius: '50%', 
                                border: 2, 
                                borderColor: alpha(theme.palette.divider, 0.5),
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PlayArrowIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                            </Box>
                          )}
                        </Box>
                      </Grid>

                      {/* Middle: Info & Progress - Flexible width */}
                      <Grid item xs>
                        <Box sx={{ minHeight: 88 }}>
                          <Typography variant="h6" fontWeight={600} noWrap sx={{ mb: 0.5 }}>
                            {submission.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 2 }}>
                            {submission.seriesName} • {submission.indexName}
                          </Typography>
                          
                          {/* Always reserve space for progress/status to prevent layout shift */}
                          <Box sx={{ minHeight: 32 }}>
                            {progressInfo && !isComplete && (
                              <Box>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                    {progressInfo.phase}
                                  </Typography>
                                  <Typography variant="caption" fontWeight={700} color={isPaused ? 'text.secondary' : 'primary.main'}>
                                    {progressInfo.progress}%
                                  </Typography>
                                </Stack>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={progressInfo.progress}
                                  sx={{ 
                                    height: 6, 
                                    borderRadius: 1,
                                    bgcolor: alpha(theme.palette.action.disabledBackground, 0.3),
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 1,
                                      bgcolor: isPaused 
                                        ? theme.palette.action.disabled
                                        : 'primary.main',
                                    },
                                  }}
                                />
                              </Box>
                            )}

                            {isComplete && (
                              <Chip 
                                label="Completed" 
                                color="success" 
                                size="medium"
                                icon={<CheckCircleIcon />}
                                sx={{ fontWeight: 600 }}
                              />
                            )}

                            {submission.error && (
                              <Alert severity="error" sx={{ py: 0, mt: 1 }}>
                                <Typography variant="caption" fontWeight={500}>
                                  {submission.error}
                                </Typography>
                              </Alert>
                            )}
                          </Box>
                        </Box>
                      </Grid>

                      {/* Right: Actions - Two buttons always present */}
                      <Grid item xs="auto">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {/* Primary action button - morphs based on state */}
                          <IconButton
                            onClick={() => {
                              if (isComplete) {
                                handleOpenReviewPage(submission.sourceMediaId);
                              } else if (isActive) {
                                handlePauseSubmission(submission);
                              } else {
                                handleSubmit(submission);
                              }
                            }}
                            disabled={isComplete ? false : submission.status === 'completed' || submission.status === 'uploaded'}
                            title={
                              isComplete 
                                ? 'Review Submission' 
                                : isActive 
                                  ? (isUploadActive(submission) ? 'Pause Upload' : 'Cancel Processing')
                                  : getSubmitButtonLabel(submission)
                            }
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: isComplete
                                ? alpha(theme.palette.success.main, 0.15)
                                : isActive
                                  ? alpha(theme.palette.warning.main, 0.15)
                                  : alpha(theme.palette.primary.main, 0.15),
                              color: isComplete
                                ? 'success.main'
                                : isActive
                                  ? 'warning.main'
                                  : 'primary.main',
                              '&:hover': {
                                bgcolor: isComplete
                                  ? alpha(theme.palette.success.main, 0.25)
                                  : isActive
                                    ? alpha(theme.palette.warning.main, 0.25)
                                    : alpha(theme.palette.primary.main, 0.25),
                              },
                              '&.Mui-disabled': {
                                bgcolor: alpha(theme.palette.action.disabledBackground, 0.5),
                                color: 'action.disabled',
                              },
                            }}
                          >
                            {isComplete ? (
                              <CheckCircleIcon sx={{ fontSize: 28 }} />
                            ) : isActive ? (
                              <PauseIcon sx={{ fontSize: 28 }} />
                            ) : (
                              <PlayArrowIcon sx={{ fontSize: 28 }} />
                            )}
                          </IconButton>
                          
                          {/* Delete button - always present */}
                          <IconButton
                            onClick={() => handleDeleteSubmission(submission)}
                            disabled={isActive}
                            title="Delete Submission"
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: alpha(theme.palette.error.main, 0.08),
                              color: 'error.main',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.18),
                              },
                              '&.Mui-disabled': {
                                bgcolor: alpha(theme.palette.action.disabledBackground, 0.5),
                                color: 'action.disabled',
                                opacity: 0.5,
                              },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 24 }} />
                          </IconButton>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                        );
                      })}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </Container>

      {/* Create Submission Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Create New Submission
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Set up a new content submission for processing and upload
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setCreateDialogOpen(false)} 
              disabled={creating}
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Autocomplete
              options={seriesOptions}
              loading={seriesLoading}
              getOptionLabel={(option) => option.name}
              value={newSeriesSelection}
              onChange={(_event, value) => setNewSeriesSelection(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Series"
                  placeholder="Select a series"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {seriesLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Complete Series Collection"
              required
              fullWidth
              helperText="A clean, descriptive name for this submission"
            />

            <TextField
              label="Index / Alias Name"
              value={newIndexName}
              onChange={(e) => setNewIndexName(e.target.value)}
              placeholder="e.g., Season 1-10"
              required
              fullWidth
              helperText="This will be the pending alias for the SourceMedia"
            />

            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Source Folder
              </Typography>
              <Stack spacing={2}>
                <TextField
                  value={newSourceFolder}
                  placeholder="No folder selected"
                  InputProps={{
                    readOnly: true,
                    startAdornment: <FolderIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  fullWidth
                  sx={{ 
                    '& .MuiInputBase-root': {
                      bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<FolderIcon />}
                  onClick={handleBrowseSourceFolder}
                  disabled={creating}
                  fullWidth
                  sx={{ fontWeight: 600 }}
                >
                  Browse for Source Folder
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Select the folder containing episodes to process
                </Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Theme Colors
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Background Color"
                  type="color"
                  value={newBackgroundColor}
                  onChange={(e) => setNewBackgroundColor(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Text Color"
                  type="color"
                  value={newTextColor}
                  onChange={(e) => setNewTextColor(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button 
            onClick={() => setCreateDialogOpen(false)} 
            disabled={creating}
            size="large"
            sx={{ fontWeight: 600 }}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleCreateSubmission}
            loading={creating}
            size="large"
            startIcon={<AddIcon />}
            sx={{ fontWeight: 600, px: 3 }}
          >
            Create Submission
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Helper functions
const formatDateTime = (value?: string | number | null) => {
  if (!value) {
    return '';
  }
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

// GraphQL Mutations
const createSourceMediaMutation = /* GraphQL */ `
  mutation CreateSourceMedia(
    $input: CreateSourceMediaInput!
    $condition: ModelSourceMediaConditionInput
  ) {
    createSourceMedia(input: $input, condition: $condition) {
      id
    }
  }
`;

const updateSourceMediaMutation = /* GraphQL */ `
  mutation UpdateSourceMedia(
    $input: UpdateSourceMediaInput!
    $condition: ModelSourceMediaConditionInput
  ) {
    updateSourceMedia(input: $input, condition: $condition) {
      id
      status
    }
  }
`;

const createFileMutation = /* GraphQL */ `
  mutation CreateFile(
    $input: CreateFileInput!
    $condition: ModelFileConditionInput
  ) {
    createFile(input: $input, condition: $condition) {
      id
      status
    }
  }
`;

const updateFileMutation = /* GraphQL */ `
  mutation UpdateFile(
    $input: UpdateFileInput!
    $condition: ModelFileConditionInput
  ) {
    updateFile(input: $input, condition: $condition) {
      id
      status
    }
  }
`;

interface CreateSourceMediaMutationResult {
  createSourceMedia?: {
    id: string;
  };
}

interface CreateFileMutationResult {
  createFile?: {
    id: string;
    status?: string | null;
  };
}

export default DesktopProcessingPage;

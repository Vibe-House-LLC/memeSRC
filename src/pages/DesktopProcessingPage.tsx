import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
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
  List,
  ListItem,
  ListItemText,
  Paper,
  Grid,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
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

const buildResumeKey = (id: string) => `${RESUME_STORAGE_PREFIX}${id}`;

const normalizeRelativePath = (rawPath: string): string => {
  const trimmed = rawPath.replace(/^\/+/, '');
  const safeSegments = trimmed
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  return safeSegments.join('/');
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

const ensureResumeState = (input: UploadResumeState | null, processingId: string): UploadResumeState => {
  const normalizedCompleted = Array.from(new Set(input?.completedFiles ?? []));
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
    fileRecords: input?.fileRecords ?? {},
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

    if (completedFiles.length || Object.keys(fileRecords).length) {
      return ensureResumeState(
        {
          version: typeof legacy.version === 'number' ? legacy.version : 0,
          processingId,
          sourceMediaId:
            typeof legacy.sourceMediaId === 'string' ? legacy.sourceMediaId : undefined,
          identityId: typeof legacy.identityId === 'string' ? legacy.identityId : undefined,
          completedFiles,
          fileRecords,
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

const DesktopProcessingPage = () => {
  const isElectron = typeof window !== 'undefined' && Boolean(window.process?.type);
  const { user: userContextValue, forceTokenRefresh } = useContext(UserContext) as {
    user: unknown;
    forceTokenRefresh?: () => Promise<void>;
  };
  const { setMessage, setOpen, setSeverity } = useContext(SnackbarContext);

  const userSub =
    userContextValue && typeof userContextValue === 'object'
      ? (userContextValue as { sub?: string | null }).sub ?? null
      : null;

  // Series data
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const processingStatusInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCredentialsRefreshRef = useRef<number>(0);

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
          // Load latest status and metadata
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
          
          const resumeState = parseStoredResume(jobId);
          
          loadedSubmissions.push({
            ...stored,
            metadata,
            statusSummary,
            resumeState,
          });
        }
      }

      loadedSubmissions.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setSubmissions(loadedSubmissions);
    } catch (error) {
      console.error('Failed to load submissions', error);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [isElectron, loadSubmission]);

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
    if (isElectron) {
      loadSeries();
      loadAllSubmissions();
    }
  }, [isElectron, loadSeries, loadAllSubmissions]);

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

  const handleStartProcessing = useCallback(async (submission: Submission) => {
    const electronModule = getElectronModule();
    if (!electronModule) {
      setMessage('Processing is only available in the desktop app.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    setIsProcessing(true);
    try {
      // Save folder path for electron
      await electronModule.ipcRenderer.invoke('save-job-folder-path', {
        id: submission.id,
        folderPath: submission.sourceFolderPath,
      });

      // Update submission status
      const updated: Submission = {
        ...submission,
        status: 'processing',
        processingProgress: 0,
        updatedAt: new Date().toISOString(),
      };
      saveSubmission(updated);
      setSubmissions(subs => subs.map(s => s.id === submission.id ? updated : s));
      setSelectedSubmission(updated);

      // Setup progress polling
      const updateProgress = async () => {
        try {
          const statusResponse = await electronModule.ipcRenderer.invoke(
            'fetch-processing-status',
            submission.id
          );
          if (statusResponse?.success && statusResponse.status) {
            const seasons = Object.values(statusResponse.status) as Record<string, string>[];
            let done = 0;
            let total = 0;
            seasons.forEach((episodes) => {
              Object.values(episodes).forEach((status) => {
                total += 1;
                if (status === 'done') {
                  done += 1;
                } else if (status === 'indexing') {
                  done += 0.5;
                }
              });
            });
            if (total > 0) {
              const progress = Math.round((done / total) * 100);
              setSubmissions(subs => subs.map(s => 
                s.id === submission.id ? { ...s, processingProgress: progress } : s
              ));
              setSelectedSubmission(prev => prev?.id === submission.id ? { ...prev, processingProgress: progress } : prev);
            }
          }
        } catch (error) {
          console.warn('Unable to fetch processing status', error);
        }
      };

      processingStatusInterval.current = setInterval(updateProgress, 5000);

      electronModule.ipcRenderer.once('javascript-processing-result', async (_event, response) => {
        if (processingStatusInterval.current) {
          clearInterval(processingStatusInterval.current);
          processingStatusInterval.current = null;
        }

        const finished: Submission = {
          ...updated,
          status: 'processed',
          processingProgress: 100,
          updatedAt: new Date().toISOString(),
        };
        saveSubmission(finished);
        setSubmissions(subs => subs.map(s => s.id === submission.id ? finished : s));
        setSelectedSubmission(finished);
        setIsProcessing(false);

        setMessage('Processing completed successfully!');
        setSeverity('success');
        setOpen(true);

        await loadAllSubmissions();
      });

      electronModule.ipcRenderer.once('javascript-processing-error', (_event, error) => {
        if (processingStatusInterval.current) {
          clearInterval(processingStatusInterval.current);
          processingStatusInterval.current = null;
        }

        const errorMessage = typeof error === 'string' ? error : error?.message ?? 'Processing failed';
        const failed: Submission = {
          ...updated,
          status: 'error',
          error: errorMessage,
          updatedAt: new Date().toISOString(),
        };
        saveSubmission(failed);
        setSubmissions(subs => subs.map(s => s.id === submission.id ? failed : s));
        setSelectedSubmission(failed);
        setIsProcessing(false);

        setMessage(`Processing error: ${errorMessage}`);
        setSeverity('error');
        setOpen(true);
      });

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
    } catch (error) {
      console.error('Failed to start processing', error);
      setMessage(error instanceof Error ? error.message : 'Failed to start processing.');
      setSeverity('error');
      setOpen(true);
      setIsProcessing(false);
    }
  }, [getElectronModule, saveSubmission, setMessage, setSeverity, setOpen, loadAllSubmissions]);

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
    if (!userSub) {
      setMessage('You must be signed in to upload.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    const fs = window.require?.('fs') as typeof import('fs') | undefined;
    const path = window.require?.('path') as typeof import('path') | undefined;
    const os = window.require?.('os') as typeof import('os') | undefined;

    if (!fs || !path || !os) {
      setMessage('File system APIs are unavailable.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    setIsUploading(true);
    try {
      // Load processed files summary
      const summary = await loadProcessedSummary(submission.id);
      const root = path.join(os.homedir(), '.memesrc', 'processing', submission.id);

      // Update status
      const uploading: Submission = {
        ...submission,
        status: 'uploading',
        uploadProgress: 0,
        updatedAt: new Date().toISOString(),
      };
      saveSubmission(uploading);
      setSubmissions(subs => subs.map(s => s.id === submission.id ? uploading : s));
      setSelectedSubmission(uploading);

      // Load or create resume state
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

      const eligibleFiles = summary.files.filter((file) => {
        const extension = `.${getExtension(file.normalizedPath)}`;
        return SUPPORTED_UPLOAD_EXTENSIONS.has(extension);
      });

      if (!eligibleFiles.length) {
        setMessage('No supported files were found to upload (.mp4, .json, .csv).');
        setSeverity('warning');
        setOpen(true);
        setIsUploading(false);
        return;
      }

      const completedSet = new Set(workingResume.completedFiles);
      let recordMap = { ...workingResume.fileRecords };
      const totalBytes = eligibleFiles.reduce((acc, file) => acc + file.size, 0);
      let uploadedBytes = eligibleFiles.reduce(
        (acc, file) => (completedSet.has(file.normalizedPath) ? acc + file.size : acc),
        0
      );

      const updateProgress = () => {
        if (totalBytes > 0) {
          const progress = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
          setSubmissions(subs => subs.map(s => 
            s.id === submission.id ? { ...s, uploadProgress: progress } : s
          ));
          setSelectedSubmission(prev => prev?.id === submission.id ? { ...prev, uploadProgress: progress } : prev);
        }
      };

      updateProgress();

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

      for (const file of eligibleFiles) {
        const normalizedRelativePath = file.normalizedPath;
        if (completedSet.has(normalizedRelativePath)) {
          continue;
        }

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
              persistResume({ fileRecords: recordMap });
            }
          } catch (createFileError) {
            console.warn('Unable to create file record', createFileError);
          }
        }

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

        completedSet.add(normalizedRelativePath);
        uploadedBytes += file.size;
        updateProgress();
        persistResume({
          completedFiles: Array.from(completedSet),
          fileRecords: recordMap,
          lastUploadedAt: new Date().toISOString(),
        });
      }

      // Update SourceMedia status
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

      const completed: Submission = {
        ...uploading,
        status: 'completed',
        uploadProgress: 100,
        updatedAt: new Date().toISOString(),
      };
      saveSubmission(completed);
      setSubmissions(subs => subs.map(s => s.id === submission.id ? completed : s));
      setSelectedSubmission(completed);

      clearResumeState(submission.id);

      setMessage('Upload completed successfully!');
      setSeverity('success');
      setOpen(true);

      await loadAllSubmissions();
    } catch (error) {
      console.error('Failed to upload files', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      const failed: Submission = {
        ...submission,
        status: 'error',
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      };
      saveSubmission(failed);
      setSubmissions(subs => subs.map(s => s.id === submission.id ? failed : s));
      setSelectedSubmission(failed);

      setMessage(`Upload error: ${errorMessage}`);
      setSeverity('error');
      setOpen(true);
    } finally {
      setIsUploading(false);
    }
  }, [
    userSub,
    loadProcessedSummary,
    saveSubmission,
    forceTokenRefresh,
    setMessage,
    setSeverity,
    setOpen,
    loadAllSubmissions,
  ]);

  const handleDeleteSubmission = useCallback(async (submission: Submission) => {
    if (!window.confirm(`Are you sure you want to delete "${submission.title}"? This will remove the local submission record but not the remote SourceMedia.`)) {
      return;
    }

    try {
      deleteSubmission(submission.id);
      setSubmissions(subs => subs.filter(s => s.id !== submission.id));
      if (selectedSubmission?.id === submission.id) {
        setSelectedSubmission(null);
      }

      setMessage('Submission deleted successfully.');
      setSeverity('success');
      setOpen(true);
    } catch (error) {
      console.error('Failed to delete submission', error);
      setMessage('Failed to delete submission.');
      setSeverity('error');
      setOpen(true);
    }
  }, [deleteSubmission, selectedSubmission, setMessage, setSeverity, setOpen]);

  const handleRefresh = useCallback(() => {
    loadAllSubmissions();
  }, [loadAllSubmissions]);

  const handleOpenReviewPage = useCallback((sourceMediaId: string) => {
    const reviewUrl = `/dashboard/review-upload?sourceMediaId=${sourceMediaId}`;
    window.open(reviewUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const getStatusColor = (status: SubmissionStatus): 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'uploaded':
        return 'success';
      case 'processing':
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

  const getStatusLabel = (status: SubmissionStatus): string => {
    switch (status) {
      case 'created':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'processed':
        return 'Ready to Upload';
      case 'uploading':
        return 'Uploading';
      case 'uploaded':
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const canStartProcessing = (submission: Submission) => {
    return submission.status === 'created' && !isProcessing;
  };

  const canStartUpload = (submission: Submission) => {
    return (submission.status === 'processed' || submission.status === 'error') && !isUploading;
  };

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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" gutterBottom>
                  Desktop Submissions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your local processing and upload workflow
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loadingSubmissions}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  New Submission
                </Button>
              </Stack>
            </Stack>
          </Box>

          {/* Submissions List */}
          {loadingSubmissions && <LinearProgress />}
          
          {!loadingSubmissions && submissions.length === 0 && (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No submissions yet
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Create your first submission to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ mt: 2 }}
              >
                Create Submission
              </Button>
            </Paper>
          )}

          {submissions.length > 0 && (
            <Grid container spacing={3}>
              {submissions.map((submission) => (
                <Grid item xs={12} md={6} key={submission.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      border: selectedSubmission?.id === submission.id ? 2 : 0,
                      borderColor: 'primary.main',
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                          <Box flex={1}>
                            <Typography variant="h6" gutterBottom>
                              {submission.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {submission.seriesName} • {submission.indexName}
                            </Typography>
                          </Box>
                          <Chip 
                            size="small" 
                            label={getStatusLabel(submission.status)} 
                            color={getStatusColor(submission.status)}
                          />
                        </Stack>

                        <Divider />

                        <Stack spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDateTime(submission.createdAt)}
                          </Typography>
                          {submission.statusSummary && submission.statusSummary.total > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Episodes: {submission.statusSummary.done}/{submission.statusSummary.total} processed
                            </Typography>
                          )}
                          {submission.processingProgress !== undefined && submission.processingProgress > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Processing: {submission.processingProgress}%
                              </Typography>
                              <LinearProgress variant="determinate" value={submission.processingProgress} />
                            </Box>
                          )}
                          {submission.uploadProgress !== undefined && submission.uploadProgress > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Upload: {submission.uploadProgress}%
                              </Typography>
                              <LinearProgress variant="determinate" value={submission.uploadProgress} />
                            </Box>
                          )}
                          {submission.error && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              {submission.error}
                            </Alert>
                          )}
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {canStartProcessing(submission) && (
                            <LoadingButton
                              size="small"
                              variant="contained"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => handleStartProcessing(submission)}
                              loading={isProcessing && selectedSubmission?.id === submission.id}
                            >
                              Start Processing
                            </LoadingButton>
                          )}
                          {canStartUpload(submission) && (
                            <LoadingButton
                              size="small"
                              variant="contained"
                              startIcon={<CloudUploadIcon />}
                              onClick={() => handleStartUpload(submission)}
                              loading={isUploading && selectedSubmission?.id === submission.id}
                            >
                              {submission.resumeState?.completedFiles?.length ? 'Resume Upload' : 'Start Upload'}
                            </LoadingButton>
                          )}
                          {(submission.status === 'completed' || submission.status === 'uploaded') && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleOpenReviewPage(submission.sourceMediaId)}
                            >
                              Review
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSubmission(submission)}
                            disabled={submission.status === 'processing' || submission.status === 'uploading'}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>

      {/* Create Submission Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Create New Submission</Typography>
            <IconButton onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
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

            <Stack spacing={1}>
              <Typography variant="subtitle2">Source Folder</Typography>
              <TextField
                value={newSourceFolder}
                placeholder="No folder selected"
                InputProps={{
                  readOnly: true,
                }}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleBrowseSourceFolder}
                disabled={creating}
              >
                Browse...
              </Button>
              <Typography variant="caption" color="text.secondary">
                Select the folder containing episodes to process
              </Typography>
            </Stack>

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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleCreateSubmission}
            loading={creating}
          >
            Create
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Helper functions
const formatBytes = (value: number): string => {
  if (value === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const quotient = value / 1024 ** exponent;
  return `${quotient.toFixed(2)} ${units[exponent]}`;
};

const getExtension = (filePath: string): string => {
  const segments = filePath.split('.');
  if (segments.length <= 1) {
    return 'unknown';
  }
  return segments.pop()?.toLowerCase() ?? 'unknown';
};

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

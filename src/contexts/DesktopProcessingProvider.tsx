import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API, Auth, graphqlOperation, Storage } from 'aws-amplify';
import { deriveProcessingProgressFromSummary, isProcessingSummaryComplete, summarizeProcessingStatus } from '../utils/processingStatus';
import { 
  DESKTOP_RESUME_VERSION,
  ProcessingMetadata,
  ProcessingStatusSummary,
  RESUME_STORAGE_PREFIX,
  SUPPORTED_UPLOAD_EXTENSIONS,
  UploadResumeState,
} from '../types/desktopProcessing';
import { readJSON, safeRemoveItem, writeJSON } from '../utils/storage';
import { UserContext } from '../UserContext';

// Minimal copy of types used by DesktopProcessingPage
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

type GraphQLResult<T> = {
  data?: T;
  errors?: readonly unknown[];
};

// Electron bridge
type ElectronModule = {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void;
  };
};

const isElectron = typeof window !== 'undefined' && Boolean(window.process?.type);

const getElectronModule = (): ElectronModule | null => {
  if (!isElectron || !window.require) return null;
  try {
    return window.require('electron') as ElectronModule;
  } catch {
    return null;
  }
};

// Helpers shared with page (replicated here to avoid tight coupling)
const buildResumeKey = (id: string) => `${RESUME_STORAGE_PREFIX}${id}`;
const normalizeRelativePath = (rawPath: string): string => {
  const trimmed = rawPath.replace(/^\/+/ , '');
  const safeSegments = trimmed
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  return safeSegments.join('/');
};
const getExtension = (filePath: string): string => {
  const segments = filePath.split('.');
  if (segments.length <= 1) return 'unknown';
  return segments.pop()?.toLowerCase() ?? 'unknown';
};

const ensureResumeState = (input: UploadResumeState | null, processingId: string): UploadResumeState => {
  const normalizedCompleted = Array.from(new Set(input?.completedFiles ?? []));
  const normalizedFileRecords = input?.fileRecords && typeof input.fileRecords === 'object' ? input.fileRecords : {};
  const normalizedFileSizes = input?.fileSizes && typeof input.fileSizes === 'object'
    ? Object.entries(input.fileSizes).reduce<Record<string, number>>((acc, [key, value]) => {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) acc[key] = value;
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
  if (!raw) return null;
  if (typeof raw === 'object') {
    const candidate = raw as UploadResumeState;
    return ensureResumeState(candidate, processingId);
  }
  return null;
};

const persistResumeState = (processingId: string, next: UploadResumeState): UploadResumeState => {
  const normalized = ensureResumeState({ ...next, version: DESKTOP_RESUME_VERSION, processingId }, processingId);
  writeJSON(buildResumeKey(processingId), normalized);
  return normalized;
};

const sanitizeCompletedFiles = (completedFiles: string[], fileSizes: Record<string, number>) => {
  const seen = new Set<string>();
  return completedFiles.filter((file) => {
    if (!fileSizes[file]) return false;
    if (seen.has(file)) return false;
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
  if (!resumeState) return null;

  const fileSizes = resumeState.fileSizes ?? {};
  const normalizedCompleted = sanitizeCompletedFiles(resumeState.completedFiles ?? [], fileSizes);
  const sizeEntries = Object.entries(fileSizes);

  const derivedTotalFiles =
    typeof resumeState.totalFiles === 'number' && resumeState.totalFiles > 0 ? Math.floor(resumeState.totalFiles) : sizeEntries.length;
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
  if (totalBytes > 0) progress = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
  else if (totalFiles > 0) progress = Math.min(100, Math.round((normalizedCompleted.length / totalFiles) * 100));

  return { completedFiles: normalizedCompleted, totalFiles, totalBytes, uploadedBytes, progress };
};

const collectUploadSnapshot = async (
  fs: typeof import('fs'),
  pathModule: typeof import('path'),
  root: string
): Promise<{ fileSizes: Record<string, number>; totalBytes: number; totalFiles: number }> => {
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

  const directoryExists = await fs.promises.access(root).then(() => true).catch(() => false);
  if (!directoryExists) return { fileSizes: {}, totalBytes: 0, totalFiles: 0 };

  await walk(root);
  const totalFiles = Object.keys(fileSizes).length;
  const totalBytes = Object.values(fileSizes).reduce((acc, size) => acc + size, 0);
  return { fileSizes, totalBytes, totalFiles };
};

const clearResumeState = (processingId?: string) => {
  if (processingId) safeRemoveItem(buildResumeKey(processingId));
};

const buildEligibleSnapshotFromSummary = (summary: { files: Array<{ normalizedPath: string; size: number }> }) => {
  const fileSizes = summary.files.reduce<Record<string, number>>((acc, file) => {
    const extension = `.${getExtension(file.normalizedPath)}`;
    if (SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) acc[file.normalizedPath] = file.size;
    return acc;
  }, {});
  const totalFiles = Object.keys(fileSizes).length;
  const totalBytes = Object.values(fileSizes).reduce((acc, size) => acc + size, 0);
  return { fileSizes, totalBytes, totalFiles };
};

const isTokenExpiredError = (error: unknown): boolean => {
  if (!error) return false;
  const message = typeof error === 'string'
    ? error
    : typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
      ? (error as any).message
      : '';
  return message.toLowerCase().includes('token') && message.toLowerCase().includes('expir');
};

const MAX_UPLOAD_RETRIES = 3;
const CREDENTIAL_REFRESH_INTERVAL_MS = 12 * 60 * 1000;
const UPLOAD_RETRY_DELAY_MS = 2000;

// Storage keys mirrored from page implementation
const getSubmissionStorageKey = (submissionId: string) => `desktop-submission-${submissionId}`;
const saveSubmission = (submission: Submission) => writeJSON(getSubmissionStorageKey(submission.id), submission);
const loadSubmission = (submissionId: string): Submission | null => readJSON<Submission>(getSubmissionStorageKey(submissionId));

// GraphQL Mutations replicated for background updates
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

interface CreateFileMutationResult { createFile?: { id: string; status?: string | null } }

// Context surface
interface DesktopProcessingContextValue {
  activeUploadId: string | null;
  startUpload: (submission: Submission) => Promise<void>;
  cancelUpload: (submissionId: string) => void;
  refreshBackground: () => void;
}

export const DesktopProcessingContext = createContext<DesktopProcessingContextValue>({
  activeUploadId: null,
  startUpload: async () => {},
  cancelUpload: () => {},
  refreshBackground: () => {},
});

export default function DesktopProcessingProvider({ children }: { children: React.ReactNode }) {
  const { forceTokenRefresh, user } = useContext(UserContext) as { forceTokenRefresh?: () => Promise<void>; user: unknown };

  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const lastCredentialsRefreshRef = useRef<number>(0);
  const shouldContinueUploadRef = useRef<Record<string, boolean>>({});

  const isDesktopProcessingPageMounted = useCallback(() => {
    try {
      return sessionStorage.getItem('desktop-processing-page-mounted') === 'true';
    } catch {
      return false;
    }
  }, []);

  const loadProcessedSummary = useCallback(
    async (id: string): Promise<{ files: Array<{ absolutePath: string; relativePath: string; normalizedPath: string; size: number }>; countsByExtension: Record<string, number>; totalSize: number }> => {
      if (!isElectron || !window.require) throw new Error('Processed summary is only available in the desktop app.');
      const fs = window.require('fs') as typeof import('fs');
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');

      const root = path.join(os.homedir(), '.memesrc', 'processing', id);
      const files: Array<{ absolutePath: string; relativePath: string; normalizedPath: string; size: number }> = [];

      const walk = async (directory: string) => {
        const entries = await fs.promises.readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(directory, entry.name);
          if (entry.isDirectory()) await walk(entryPath);
          else {
            const stats = await fs.promises.stat(entryPath);
            const relativePath = path.relative(root, entryPath).split(path.sep).join('/');
            const normalizedPath = normalizeRelativePath(relativePath);
            files.push({ absolutePath: entryPath, relativePath, normalizedPath, size: stats.size });
          }
        }
      };

      const directoryExists = await fs.promises.access(root).then(() => true).catch(() => false);
      if (!directoryExists) throw new Error('No processed output was found for this run.');

      await walk(root);
      if (files.length === 0) throw new Error('Processing completed but no output files were detected.');

      const countsByExtension = files.reduce<Record<string, number>>((acc, file) => {
        const extension = getExtension(file.normalizedPath);
        acc[extension] = (acc[extension] || 0) + 1;
        return acc;
      }, {});
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      return { files, countsByExtension, totalSize };
    }, []);

  const startUpload = useCallback(async (submission: Submission) => {
    if (!isElectron || !window.require) return;

    const fs = window.require('fs') as typeof import('fs');
    const path = window.require('path') as typeof import('path');
    const os = window.require('os') as typeof import('os');

    // Cancel other active uploads
    if (activeUploadId && activeUploadId !== submission.id) {
      shouldContinueUploadRef.current[activeUploadId] = false;
    }

    shouldContinueUploadRef.current[submission.id] = true;
    setActiveUploadId(submission.id);
    try { sessionStorage.setItem('desktop-upload-active-job-id', submission.id); } catch {}

    let workingResume: UploadResumeState | null = null;
    let currentSubmission: Submission = submission;

    const applySubmissionPatch = (patch: Partial<Submission>) => {
      const nextSubmission: Submission = { ...currentSubmission, ...patch, updatedAt: new Date().toISOString() };
      saveSubmission(nextSubmission);
      currentSubmission = nextSubmission;
      return nextSubmission;
    };

    try {
      const summary = await loadProcessedSummary(submission.id);
      const snapshot = buildEligibleSnapshotFromSummary(summary);
      const root = path.join(os.homedir(), '.memesrc', 'processing', submission.id);

      const eligibleFiles = summary.files.filter((file) => snapshot.fileSizes[file.normalizedPath]);
      if (!eligibleFiles.length) {
        setActiveUploadId(null);
        try { sessionStorage.removeItem('desktop-upload-active-job-id'); } catch {}
        return;
      }

      const storedResume = parseStoredResume(submission.id);
      let resume = ensureResumeState(
        storedResume ?? { version: DESKTOP_RESUME_VERSION, processingId: submission.id, completedFiles: [], fileRecords: {} },
        submission.id
      );

      resume = ensureResumeState(
        {
          ...resume,
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

      const normalizedCompleted = sanitizeCompletedFiles(resume.completedFiles, snapshot.fileSizes);
      let recordMap = Object.entries(resume.fileRecords ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
        if (snapshot.fileSizes[key]) acc[key] = value;
        return acc;
      }, {});
      let uploadedBytes = sumCompletedBytes(normalizedCompleted, snapshot.fileSizes);

      resume = ensureResumeState(
        {
          ...resume,
          fileSizes: snapshot.fileSizes,
          totalBytes: snapshot.totalBytes,
          totalFiles: snapshot.totalFiles,
          completedFiles: normalizedCompleted,
          fileRecords: recordMap,
          uploadedBytes,
        },
        submission.id
      );
      resume = persistResumeState(submission.id, resume);
      workingResume = resume;

      const persistResume = (patch: Partial<UploadResumeState>) => {
        workingResume = ensureResumeState({ ...workingResume!, ...patch }, submission.id);
        workingResume = persistResumeState(submission.id, workingResume);
        return workingResume;
      };

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const ensureFreshCredentials = async (forceRefresh = false) => {
        if (forceRefresh && typeof forceTokenRefresh === 'function') await forceTokenRefresh();
        const credentials = await Auth.currentCredentials();
        const resolvedIdentityId = credentials?.identityId ?? workingResume?.identityId ?? null;
        if (!resolvedIdentityId) throw new Error('Unable to determine storage identity');
        lastCredentialsRefreshRef.current = Date.now();
        persistResume({ identityId: resolvedIdentityId, lastError: null });
        return resolvedIdentityId;
      };

      await ensureFreshCredentials(!workingResume?.identityId);

      const updateProgress = () => {
        const stats = deriveResumeUploadStats(workingResume);
        if (!stats) return;
        const progress = stats.progress;
        applySubmissionPatch({ status: progress >= 100 ? 'completed' : 'uploading', uploadProgress: progress, resumeState: workingResume });
      };

      const uploadWithRetry = async (storageKey: string, fileBuffer: Buffer, contentType: string | undefined, attempt = 0): Promise<void> => {
        await ensureFreshCredentials(attempt > 0);
        try {
          await Storage.put(storageKey, fileBuffer, { level: 'protected', contentType });
        } catch (error) {
          if (isTokenExpiredError(error) && attempt < MAX_UPLOAD_RETRIES) {
            await delay(UPLOAD_RETRY_DELAY_MS * (attempt + 1));
            await ensureFreshCredentials(true);
            return uploadWithRetry(storageKey, fileBuffer, contentType, attempt + 1);
          }
          throw error;
        }
      };

      const completedSet = new Set(workingResume.completedFiles);
      applySubmissionPatch({ status: 'uploading', error: undefined });

      for (const file of eligibleFiles) {
        if (!shouldContinueUploadRef.current[submission.id]) throw new Error('Upload paused');

        const normalizedRelativePath = file.normalizedPath;
        if (completedSet.has(normalizedRelativePath)) continue;

        if (Date.now() - lastCredentialsRefreshRef.current > CREDENTIAL_REFRESH_INTERVAL_MS) {
          await ensureFreshCredentials(true);
        }

        const storageKey = `${submission.sourceMediaId}/${normalizedRelativePath}`;
        const contentType = ({
          mp4: 'video/mp4',
          mkv: 'video/x-matroska',
          avi: 'video/x-msvideo',
          mov: 'video/quicktime',
          m4v: 'video/x-m4v',
          json: 'application/json',
          csv: 'text/csv',
          srt: 'application/x-subrip',
          zip: 'application/zip',
        } as Record<string, string>)[getExtension(normalizedRelativePath)] ?? 'application/octet-stream';
        const diskPath = path.join(root, normalizedRelativePath.split('/').join(path.sep));

        const fileExists = await fs.promises.access(diskPath).then(() => true).catch(() => false);
        if (!fileExists) continue;

        const fileBuffer = await fs.promises.readFile(diskPath);

        let fileRecordId = workingResume.fileRecords[normalizedRelativePath] ?? null;
        if (!fileRecordId) {
          try {
            const credentials = await Auth.currentCredentials();
            const identityId = credentials?.identityId;
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
              const nextMap = { ...workingResume.fileRecords, [normalizedRelativePath]: fileRecordId };
              workingResume = persistResume({ fileRecords: nextMap });
            }
          } catch {}
        }

        await uploadWithRetry(storageKey, fileBuffer, contentType);

        if (fileRecordId) {
          try {
            await API.graphql(
              graphqlOperation(updateFileMutation, {
                input: { id: fileRecordId, status: 'uploaded' },
              })
            );
          } catch {}
        }

        completedSet.add(normalizedRelativePath);
        uploadedBytes += snapshot.fileSizes[normalizedRelativePath] ?? 0;
        workingResume = persistResume({
          completedFiles: Array.from(completedSet),
          uploadedBytes,
          lastUploadedAt: new Date().toISOString(),
        });

        updateProgress();
      }

      try {
        await API.graphql(
          graphqlOperation(updateSourceMediaMutation, {
            input: { id: submission.sourceMediaId, status: 'uploaded' },
          })
        );
      } catch {}

      clearResumeState(submission.id);
      applySubmissionPatch({ status: 'completed', uploadProgress: 100, resumeState: undefined, error: undefined });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      if (errorMessage === 'Upload paused') return;
      const resume = workingResume ?? currentSubmission.resumeState ?? null;
      applySubmissionPatch({ status: 'error', error: errorMessage, resumeState: resume ?? undefined });
    } finally {
      setActiveUploadId(null);
      try { sessionStorage.removeItem('desktop-upload-active-job-id'); } catch {}
      delete shouldContinueUploadRef.current[submission.id];
    }
  }, [activeUploadId, forceTokenRefresh, loadProcessedSummary]);

  const cancelUpload = useCallback((submissionId: string) => {
    shouldContinueUploadRef.current[submissionId] = false;
    if (activeUploadId === submissionId) {
      setActiveUploadId(null);
      try { sessionStorage.removeItem('desktop-upload-active-job-id'); } catch {}
    }
  }, [activeUploadId]);

  const refreshBackground = useCallback(() => {
    // No-op for now; polling handles refresh
  }, []);

  // Poll processing/uploading statuses and trigger auto-upload when page is not mounted
  useEffect(() => {
    if (!isElectron || !window.require) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (isDesktopProcessingPageMounted()) return; // Avoid contention; page owns the workflow when mounted

      const fs = window.require('fs') as typeof import('fs');
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');

      const baseDir = path.join(os.homedir(), '.memesrc', 'processing');
      const exists = await fs.promises.access(baseDir).then(() => true).catch(() => false);
      if (!exists) return;

      const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const jobId = entry.name;
        const stored = loadSubmission(jobId);
        if (!stored) continue;
        const jobDir = path.join(baseDir, jobId);
        const statusPath = path.join(jobDir, 'status.json');

        if (stored.status === 'processing') {
          try {
            const statusExists = await fs.promises.access(statusPath).then(() => true).catch(() => false);
            if (!statusExists) continue;
            const rawStatus = await fs.promises.readFile(statusPath, 'utf-8');
            const statusSummary = summarizeProcessingStatus(JSON.parse(rawStatus));
            const processingProgress = deriveProcessingProgressFromSummary(statusSummary);
            if (isProcessingSummaryComplete(statusSummary)) {
              const updated: Submission = { ...stored, status: 'processed', statusSummary, processingProgress: 100, updatedAt: new Date().toISOString() };
              saveSubmission(updated);
              // auto-upload if flagged
              let shouldAutoUpload = false;
              try { shouldAutoUpload = sessionStorage.getItem(`desktop-auto-upload-after-${jobId}`) === 'true'; } catch {}
              if (shouldAutoUpload) {
                try { sessionStorage.removeItem(`desktop-auto-upload-after-${jobId}`); } catch {}
                // Start upload in background
                startUpload(updated);
              }
            } else if (
              processingProgress !== stored.processingProgress || JSON.stringify(statusSummary) !== JSON.stringify(stored.statusSummary)
            ) {
              const updated: Submission = { ...stored, statusSummary, processingProgress, updatedAt: new Date().toISOString() };
              saveSubmission(updated);
            }
          } catch {}
        }

        if (stored.status === 'uploading') {
          const resumeState = parseStoredResume(jobId);
          const stats = deriveResumeUploadStats(resumeState);
          if (stats) {
            if (stats.progress >= 100) {
              const updated: Submission = { ...stored, status: 'completed', uploadProgress: 100, resumeState, updatedAt: new Date().toISOString() };
              saveSubmission(updated);
              clearResumeState(jobId);
            } else if (stats.progress !== (stored.uploadProgress ?? 0) || stats.uploadedBytes !== (stored.resumeState?.uploadedBytes ?? 0)) {
              const updated: Submission = { ...stored, uploadProgress: stats.progress, resumeState, updatedAt: new Date().toISOString() };
              saveSubmission(updated);
            }
          }
        }
      }
    };

    // Initial run and poll
    poll();
    interval = setInterval(poll, 2000);
    return () => { if (interval) clearInterval(interval); };
  }, [isDesktopProcessingPageMounted, startUpload]);

  // Auto-resume unfinished uploads if page is not mounted
  useEffect(() => {
    if (!isElectron || !window.require) return;
    if (isDesktopProcessingPageMounted()) return;

    const storedActiveUploadId = (() => { try { return sessionStorage.getItem('desktop-upload-active-job-id'); } catch { return null; } })();
    if (!storedActiveUploadId) return;
    const submission = loadSubmission(storedActiveUploadId);
    if (!submission) return;
    if (submission.status === 'uploading' && (submission.uploadProgress ?? 0) < 100) {
      startUpload(submission);
    } else if (submission.status === 'completed' || (submission.uploadProgress ?? 0) >= 100) {
      try { sessionStorage.removeItem('desktop-upload-active-job-id'); } catch {}
    }
  }, [isDesktopProcessingPageMounted, startUpload]);

  const value = useMemo<DesktopProcessingContextValue>(() => ({ activeUploadId, startUpload, cancelUpload, refreshBackground }), [activeUploadId, startUpload, cancelUpload, refreshBackground]);

  return (
    <DesktopProcessingContext.Provider value={value}>
      {children}
    </DesktopProcessingContext.Provider>
  );
}



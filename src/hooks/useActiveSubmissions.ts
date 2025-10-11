import { useCallback, useEffect, useRef, useState } from 'react';
import { readJSON } from '../utils/storage';
import {
  deriveProcessingProgressFromSummary,
  isProcessingSummaryComplete,
  summarizeProcessingStatus,
} from '../utils/processingStatus';

export interface ActiveSubmission {
  id: string;
  title: string;
  seriesName: string;
  status: 'processing' | 'uploading' | 'uploaded' | 'processed' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

const ACTIVE_STATUSES = new Set<ActiveSubmission['status']>([
  'processing',
  'uploading',
  'uploaded',
  'processed',
  'completed',
  'error',
]);

const clampProgress = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 100) {
    return 100;
  }

  return value;
};

const haveSameActiveSubmissions = (
  previous: ActiveSubmission[],
  next: ActiveSubmission[]
): boolean => {
  if (previous.length !== next.length) {
    return false;
  }

  for (let i = 0; i < previous.length; i += 1) {
    const prev = previous[i];
    const candidate = next[i];

    if (
      prev.id !== candidate.id ||
      prev.title !== candidate.title ||
      prev.seriesName !== candidate.seriesName ||
      prev.status !== candidate.status ||
      (prev.progress ?? null) !== (candidate.progress ?? null) ||
      (prev.error ?? null) !== (candidate.error ?? null)
    ) {
      return false;
    }
  }

  return true;
};

export const useActiveSubmissions = () => {
  const [activeSubmissions, setActiveSubmissions] = useState<ActiveSubmission[]>([]);
  const isElectron = typeof window !== 'undefined' && window.process && window.process.type;

  const isMountedRef = useRef(true);
  const lastRequestRef = useRef(0);
  const isLoadingRef = useRef(false);
  const pendingLoadRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applyStateUpdate = useCallback((requestId: number, submissions: ActiveSubmission[]) => {
    if (!isMountedRef.current || lastRequestRef.current !== requestId) {
      return;
    }

    setActiveSubmissions((previous) =>
      haveSameActiveSubmissions(previous, submissions) ? previous : submissions
    );
  }, []);

  const loadActiveSubmissions = useCallback(async () => {
    if (!isElectron || typeof window === 'undefined' || typeof window.require !== 'function') {
      return;
    }

    if (isLoadingRef.current) {
      pendingLoadRef.current = true;
      return;
    }

    isLoadingRef.current = true;
    const requestId = ++lastRequestRef.current;

    try {
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');
      const fs = window.require('fs') as typeof import('fs');

      let fsPromises: typeof import('fs/promises') | null = null;

      try {
        fsPromises = window.require('fs/promises') as typeof import('fs/promises');
      } catch {
        fsPromises = fs.promises ?? null;
      }

      if (!fsPromises) {
        console.warn('fs.promises is not available in the renderer process.');
        applyStateUpdate(requestId, []);
        return;
      }

      const baseDir = path.join(os.homedir(), '.memesrc', 'processing');
      const directoryExists = await fsPromises
        .access(baseDir)
        .then(() => true)
        .catch(() => false);

      if (!directoryExists) {
        applyStateUpdate(requestId, []);
        return;
      }

      const entries = await fsPromises.readdir(baseDir, { withFileTypes: true });
      const active: ActiveSubmission[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const jobId = entry.name;
        const storageKey = `desktop-submission-${jobId}`;
        const submission = readJSON<any>(storageKey);

        if (!submission) {
          continue;
        }

        const status = submission.status as ActiveSubmission['status'] | undefined;

        if (!status || !ACTIVE_STATUSES.has(status)) {
          continue;
        }

        let effectiveStatus: ActiveSubmission['status'] = status;
        let progress: number | undefined;
        let error: string | undefined = submission.error;

        if (status === 'processing' || status === 'processed') {
          const statusPath = path.join(baseDir, jobId, 'status.json');

          try {
            const rawStatus = await fsPromises.readFile(statusPath, 'utf-8');
            const summary = summarizeProcessingStatus(JSON.parse(rawStatus));
            const derivedProgress = deriveProcessingProgressFromSummary(summary);

            if (derivedProgress !== undefined) {
              progress = derivedProgress;
            }

            if (isProcessingSummaryComplete(summary)) {
              effectiveStatus = 'processed';
              progress = 100;
            } else if (status === 'processing' && progress === undefined) {
              progress = clampProgress(submission.processingProgress);
            }
          } catch {
            if (status === 'processing') {
              progress = clampProgress(submission.processingProgress);
            } else if (status === 'processed') {
              progress = 100;
            }
          }
        } else if (status === 'uploading' || status === 'uploaded') {
          progress = clampProgress(submission.uploadProgress);
        } else if (status === 'completed') {
          progress = 100;
        } else if (status === 'error') {
          progress =
            clampProgress(submission.uploadProgress) ??
            clampProgress(submission.processingProgress);
        }

        if (effectiveStatus === 'processed' && progress === undefined) {
          progress = 100;
        }

        if (effectiveStatus === 'uploaded' && progress === undefined) {
          progress = 100;
        }

        active.push({
          id: submission.id,
          title: submission.title || 'Untitled',
          seriesName: submission.seriesName || 'Unknown Series',
          status: effectiveStatus,
          progress,
          error,
        });
      }

      active.sort((a, b) => a.id.localeCompare(b.id));

      applyStateUpdate(requestId, active);
    } catch (error) {
      console.error('Error loading active submissions:', error);
      applyStateUpdate(requestId, []);
    } finally {
      isLoadingRef.current = false;
      if (pendingLoadRef.current && isMountedRef.current) {
        pendingLoadRef.current = false;
        await loadActiveSubmissions();
      } else {
        pendingLoadRef.current = false;
      }
    }
  }, [isElectron, applyStateUpdate]);

  useEffect(() => {
    if (!isElectron) {
      setActiveSubmissions([]);
      return () => undefined;
    }

    void loadActiveSubmissions();
    const intervalId = setInterval(() => {
      void loadActiveSubmissions();
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isElectron, loadActiveSubmissions]);

  const refresh = useCallback(() => {
    void loadActiveSubmissions();
  }, [loadActiveSubmissions]);

  return {
    activeSubmissions,
    hasActiveSubmissions: activeSubmissions.length > 0,
    refresh,
  };
};


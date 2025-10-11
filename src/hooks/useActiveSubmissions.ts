import { useState, useEffect, useCallback } from 'react';
import { readJSON } from '../utils/storage';

export interface ActiveSubmission {
  id: string;
  title: string;
  seriesName: string;
  status: 'processing' | 'uploading' | 'uploaded' | 'processed' | 'error';
  progress?: number;
  error?: string;
}

/**
 * Hook to track active desktop submissions (processing or uploading)
 * Only works in Electron environment
 */
export const useActiveSubmissions = () => {
  const [activeSubmissions, setActiveSubmissions] = useState<ActiveSubmission[]>([]);
  const isElectron = typeof window !== 'undefined' && window.process && window.process.type;

  const loadActiveSubmissions = useCallback(() => {
    if (!isElectron || !window.require) {
      return;
    }

    try {
      const fs = window.require('fs') as typeof import('fs');
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');

      const baseDir = path.join(os.homedir(), '.memesrc', 'processing');
      
      // Check if directory exists synchronously
      if (!fs.existsSync(baseDir)) {
        setActiveSubmissions([]);
        return;
      }

      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      const active: ActiveSubmission[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const jobId = entry.name;
        const storageKey = `desktop-submission-${jobId}`;
        const submission = readJSON<any>(storageKey);
        
        if (!submission) continue;

        // Only include submissions that are actively processing or uploading
        // Exclude 'completed' (fully done) but include 'error' so users can see failures
        if (
          submission.status === 'processing' ||
          submission.status === 'uploading' ||
          submission.status === 'uploaded' || // upload finished, about to be completed
          submission.status === 'processed' || // processed but not yet uploaded
          submission.status === 'error' // show errors so users know something failed
        ) {
          let progress: number | undefined;
          
          if (submission.status === 'processing') {
            progress = submission.processingProgress;
          } else if (submission.status === 'uploading' || submission.status === 'uploaded') {
            progress = submission.uploadProgress;
          }

          active.push({
            id: submission.id,
            title: submission.title || 'Untitled',
            seriesName: submission.seriesName || 'Unknown Series',
            status: submission.status,
            progress,
            error: submission.error,
          });
        }
      }

      setActiveSubmissions(active);
    } catch (error) {
      console.error('Error loading active submissions:', error);
      setActiveSubmissions([]);
    }
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron) {
      return undefined;
    }

    // Initial load
    loadActiveSubmissions();

    // Poll every 2 seconds for updates
    const intervalId = setInterval(loadActiveSubmissions, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isElectron, loadActiveSubmissions]);

  return {
    activeSubmissions,
    hasActiveSubmissions: activeSubmissions.length > 0,
    refresh: loadActiveSubmissions,
  };
};


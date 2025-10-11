import { ProcessingStatusSummary } from '../types/desktopProcessing';

export const summarizeProcessingStatus = (statusData: unknown): ProcessingStatusSummary => {
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

export const deriveProcessingProgressFromSummary = (
  summary?: ProcessingStatusSummary | null
): number | undefined => {
  if (!summary || summary.total <= 0) {
    return undefined;
  }

  const weightedDone = summary.done + summary.indexing * 0.5;
  const normalizedRatio = Math.max(0, Math.min(1, weightedDone / summary.total));
  return Math.round(normalizedRatio * 100);
};

export const isProcessingSummaryComplete = (
  summary?: ProcessingStatusSummary | null
): boolean => {
  return Boolean(summary && summary.total > 0 && summary.done >= summary.total);
};


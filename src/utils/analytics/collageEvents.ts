import { trackUsageEvent } from '../trackUsageEvent';
import type { LibraryFrameRef } from '../library/metadata';

export const COLLAGE_EVENT_SCHEMA_VERSION = '1.0';

export type CollageSeedEventType =
  | 'collage_seed_add'
  | 'collage_seed_replace'
  | 'collage_seed_remove';

export type CollageSeedUserFeedbackReason =
  | 'not_relevant'
  | 'wrong_style'
  | 'duplicate'
  | 'other';

export type CollageSeedFeedbackOption = {
  value: CollageSeedUserFeedbackReason;
  label: string;
};

export const COLLAGE_SEED_FEEDBACK_OPTIONS: readonly CollageSeedFeedbackOption[] = [
  { value: 'not_relevant', label: 'Not relevant' },
  { value: 'wrong_style', label: 'Wrong style' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
] as const;

type SessionContext = Record<string, unknown> | null | undefined;

type SeedTelemetry = {
  cid: string;
  season?: string | number;
  episode?: string | number;
  frame?: string | number;
  fineTuningIndex?: string | number | null;
  panelIndex?: number;
};

type CollageSeedEventPayload = SeedTelemetry & {
  templateId?: string | null;
  source: string;
  sessionContext?: SessionContext;
  userFeedbackReason?: CollageSeedUserFeedbackReason;
  userFeedbackNote?: string;
  replacedSeed?: SeedTelemetry;
  schemaVersion: typeof COLLAGE_EVENT_SCHEMA_VERSION;
};

const buildSeedTelemetry = (
  frameRef?: LibraryFrameRef | null,
  panelIndex?: number
): SeedTelemetry | null => {
  if (!frameRef || !frameRef.cid) {
    return null;
  }

  const payload: SeedTelemetry = {
    cid: frameRef.cid,
  };

  if (frameRef.season !== undefined) {
    payload.season = frameRef.season;
  }
  if (frameRef.episode !== undefined) {
    payload.episode = frameRef.episode;
  }
  if (frameRef.frame !== undefined) {
    payload.frame = frameRef.frame;
  }
  if (frameRef.fineTuningIndex !== undefined) {
    payload.fineTuningIndex = frameRef.fineTuningIndex;
  }
  if (typeof panelIndex === 'number') {
    payload.panelIndex = panelIndex;
  }

  return payload;
};

export type TrackCollageSeedEventInput = {
  eventType: CollageSeedEventType;
  frameRef: LibraryFrameRef | null | undefined;
  templateId?: string | null;
  panelIndex?: number | null;
  source?: string | null;
  sessionContext?: SessionContext;
  userFeedbackReason?: CollageSeedUserFeedbackReason;
  userFeedbackNote?: string | null;
  replacedFrameRef?: LibraryFrameRef | null;
};

export const trackCollageSeedEvent = ({
  eventType,
  frameRef,
  templateId,
  panelIndex,
  source,
  sessionContext,
  userFeedbackReason,
  userFeedbackNote,
  replacedFrameRef,
}: TrackCollageSeedEventInput): void => {
  const telemetry = frameRef ? buildSeedTelemetry(frameRef, panelIndex ?? undefined) : null;

  if (!telemetry) {
    return;
  }

  const payload: CollageSeedEventPayload = {
    ...telemetry,
    templateId: templateId ?? undefined,
    source: source || 'collage_editor',
    schemaVersion: COLLAGE_EVENT_SCHEMA_VERSION,
  };

  if (sessionContext) {
    payload.sessionContext = sessionContext;
  }

  if (userFeedbackReason) {
    payload.userFeedbackReason = userFeedbackReason;
  }

  if (userFeedbackNote) {
    payload.userFeedbackNote = userFeedbackNote;
  }

  const previousSeed = replacedFrameRef
    ? buildSeedTelemetry(replacedFrameRef, panelIndex ?? undefined)
    : null;

  if (previousSeed) {
    payload.replacedSeed = previousSeed;
  }

  trackUsageEvent(eventType, payload);
};

export type TrackCollageSeedBulkAddInput = {
  seeds: Array<{
    frameRef: LibraryFrameRef | null | undefined;
    panelIndex?: number | null;
  }>;
  templateId?: string | null;
  source?: string | null;
  sessionContext?: SessionContext;
};

export const trackCollageSeedBulkAdd = ({
  seeds,
  templateId,
  source,
  sessionContext,
}: TrackCollageSeedBulkAddInput): void => {
  const seedPayloads = seeds
    .map(({ frameRef, panelIndex }) => buildSeedTelemetry(frameRef, panelIndex ?? undefined))
    .filter((seed): seed is SeedTelemetry => Boolean(seed));

  if (!seedPayloads.length) {
    return;
  }

  const payload = {
    seeds: seedPayloads,
    templateId: templateId ?? undefined,
    source: source || 'collage_editor',
    schemaVersion: COLLAGE_EVENT_SCHEMA_VERSION,
  } as {
    seeds: SeedTelemetry[];
    templateId?: string | null;
    source: string;
    schemaVersion: typeof COLLAGE_EVENT_SCHEMA_VERSION;
    sessionContext?: SessionContext;
  };

  if (sessionContext) {
    payload.sessionContext = sessionContext;
  }

  trackUsageEvent('collage_seed_bulk_add', payload);
};

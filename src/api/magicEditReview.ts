export type MagicEditReviewStatus = 'pending' | 'approved' | 'needs_changes';

export type MagicEditReviewItem = {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  status: MagicEditReviewStatus;
  seed: string;
  width?: number;
  height?: number;
  notes?: string;
};

export type FetchMagicEditReviewOptions = {
  limit?: number;
  delayMs?: number;
};

export type UpdateMagicEditReviewStatusOptions = {
  delayMs?: number;
};

// TODO: swap mock prompts for backend-provided prompts/metadata once API lands.
const PROMPTS = [
  'Refine lighting and add subtle rim highlights to the subject.',
  'Tighten the edges and remove stray pixels around the silhouette.',
  'Warm up the color balance and soften the background noise.',
  'Sharpen facial details while keeping skin tones natural.',
  'Enhance shadows for depth; avoid over-saturating the midtones.',
  'Remove watermark artifacts and smooth gradients in the sky.',
  'Nudge the crop to keep key elements centered and readable.',
  'Match contrast with the reference set; avoid crushed blacks.',
];

const wait = (ms?: number) =>
  new Promise<void>((resolve) => {
    if (!ms) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      clearTimeout(timer);
      resolve();
    }, ms);
  });

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// TODO: replace this mock generator with real response mapping from the API.
const createMockResult = (index: number): MagicEditReviewItem => {
  const seed = `magic-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`;
  const width = randomBetween(520, 780);
  const height = randomBetween(640, 1040);

  return {
    id: `${seed}-${index}`,
    imageUrl: `https://picsum.photos/seed/${seed}/${width}/${height}`,
    prompt: PROMPTS[index % PROMPTS.length],
    createdAt: new Date(Date.now() - randomBetween(1, 36) * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    seed,
    width,
    height,
  };
};

const createMockBatch = (count: number): MagicEditReviewItem[] =>
  Array.from({ length: count }, (_, index) => createMockResult(index));

// TODO: wire to real fetch endpoint; keep signature stable for easy swap.
export async function fetchMagicEditReviewBatch(
  options: FetchMagicEditReviewOptions = {}
): Promise<MagicEditReviewItem[]> {
  const { limit = 28, delayMs = 420 } = options;
  await wait(delayMs);
  return createMockBatch(limit);
}

// TODO: call backend mutation when ready; mimic latency for now.
export async function updateMagicEditReviewStatus(
  ids: string[],
  status: MagicEditReviewStatus,
  notes?: string,
  options: UpdateMagicEditReviewStatusOptions = {}
): Promise<{ ids: string[]; status: MagicEditReviewStatus; notes?: string }> {
  const { delayMs = 120 } = options;
  await wait(delayMs);
  return { ids, status, notes: notes?.trim() || undefined };
}

export const magicEditReviewApi = {
  fetchBatch: fetchMagicEditReviewBatch,
  updateStatus: updateMagicEditReviewStatus,
};


import workflowTemplate from '../workflows/t2i-rmbg.api.json';

const DEFAULT_COMFYUI_URL = process.env.REACT_APP_COMFYUI_URL || 'http://192.168.0.103:8000';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 1000;
const MAGIC_STICKER_DIMENSION_PX = 400;

export const DEFAULT_MAGIC_STICKER_NEGATIVE_PROMPT = [
  'multiple objects',
  'crowded scene',
  'busy background',
  'complex environment',
  'subject cut off',
  'close-up crop',
  'drop shadow',
  'text',
  'watermark',
  'logo',
  'border',
  'frame',
  'blur',
  'low quality',
  'noise',
  'artifacts',
].join(', ');

export const MAGIC_STICKER_STYLE_PRESETS = [
  {
    id: 'realistic',
    label: 'Realistic',
    positivePrefix: 'Product photo. Neutral lighting.',
    negativePrompt: DEFAULT_MAGIC_STICKER_NEGATIVE_PROMPT,
  },
  {
    id: 'cartoon',
    label: 'Cartoon',
    positivePrefix: 'Cartoon sticker illustration. Neutral lighting. Clean outlines. Flat colors.',
    negativePrompt: `${DEFAULT_MAGIC_STICKER_NEGATIVE_PROMPT}, photorealistic, realistic skin texture, film grain`,
  },
  {
    id: 'digital-art',
    label: 'Digital Art',
    positivePrefix: 'Digital illustration sticker. Neutral lighting. Clean polished concept-art look.',
    negativePrompt: `${DEFAULT_MAGIC_STICKER_NEGATIVE_PROMPT}, photorealistic, camera artifacts, heavy texture`,
  },
  {
    id: 'vector',
    label: 'Vector',
    positivePrefix: 'Vector sticker design. Neutral lighting. Bold clean shapes. Minimal shading.',
    negativePrompt: `${DEFAULT_MAGIC_STICKER_NEGATIVE_PROMPT}, photorealistic, painterly texture, gradients everywhere`,
  },
  {
    id: '3d-render',
    label: '3D Render',
    positivePrefix: '3D render sticker asset. Neutral lighting. Clean materials. Studio look.',
    negativePrompt: `${DEFAULT_MAGIC_STICKER_NEGATIVE_PROMPT}, flat 2d drawing, sketch lines, painterly brushstrokes`,
  },
] as const;

export type MagicStickerStylePresetId = (typeof MAGIC_STICKER_STYLE_PRESETS)[number]['id'];

export const DEFAULT_MAGIC_STICKER_STYLE_PRESET: MagicStickerStylePresetId = 'realistic';

type MagicStickerStylePreset = (typeof MAGIC_STICKER_STYLE_PRESETS)[number];

const FALLBACK_STYLE_PRESET: MagicStickerStylePreset = MAGIC_STICKER_STYLE_PRESETS[0];

const MAGIC_STICKER_STYLE_PRESET_MAP: Map<string, MagicStickerStylePreset> = new Map(
  MAGIC_STICKER_STYLE_PRESETS.map((preset) => [preset.id, preset])
);

type ComfyNode = {
  class_type?: string;
  inputs?: Record<string, unknown>;
  _meta?: {
    title?: string;
  };
};

type ComfyWorkflow = Record<string, ComfyNode>;

type ComfyImageRef = {
  filename: string;
  subfolder?: string;
  type?: string;
};

type ComfyHistoryItem = {
  outputs?: Record<string, unknown>;
};

export interface RunMagicStickerLocallyOptions {
  prompt?: string;
  stylePreset?: string;
  positivePrompt?: string;
  negativePrompt?: string;
  comfyUiUrl?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const normalizeComfyUrl = (url: string): string => url.replace(/\/+$/, '');

const randomSeed = (): number => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

const cloneWorkflowTemplate = (): ComfyWorkflow =>
  JSON.parse(JSON.stringify(workflowTemplate)) as ComfyWorkflow;

const getNodeIdsByClassType = (workflow: ComfyWorkflow, classType: string): string[] =>
  Object.keys(workflow)
    .filter((nodeId) => workflow[nodeId]?.class_type === classType)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));

const getTitle = (node?: ComfyNode): string =>
  String(node?._meta?.title || '').toLowerCase();

const hasInputs = (node?: ComfyNode): node is ComfyNode & { inputs: Record<string, unknown> } =>
  Boolean(node?.inputs && typeof node.inputs === 'object');

export const getMagicStickerStylePreset = (stylePreset?: string): MagicStickerStylePreset => {
  if (typeof stylePreset === 'string' && stylePreset.trim().length > 0) {
    const preset = MAGIC_STICKER_STYLE_PRESET_MAP.get(stylePreset.trim());
    if (preset) return preset;
  }
  return FALLBACK_STYLE_PRESET;
};

export const buildMagicStickerPositivePrompt = (
  userPrompt: string,
  stylePreset: string = DEFAULT_MAGIC_STICKER_STYLE_PRESET
): string => {
  const trimmedPrompt = userPrompt.trim();
  if (!trimmedPrompt) {
    throw new Error('Magic sticker prompt is required.');
  }
  const preset = getMagicStickerStylePreset(stylePreset);
  return `${preset.positivePrefix} ${trimmedPrompt}`;
};

export const buildMagicStickerNegativePrompt = (
  stylePreset: string = DEFAULT_MAGIC_STICKER_STYLE_PRESET
): string => getMagicStickerStylePreset(stylePreset).negativePrompt;

const setWorkflowPrompts = (workflow: ComfyWorkflow, prompt: string, negativePrompt: string): void => {
  const clipNodeIds = getNodeIdsByClassType(workflow, 'CLIPTextEncode');
  if (!clipNodeIds.length) {
    throw new Error('Magic sticker workflow is missing CLIPTextEncode nodes.');
  }

  const positiveNodeId =
    clipNodeIds.find((nodeId) => getTitle(workflow[nodeId]).includes('positive')) || clipNodeIds[0];
  const positiveNode = workflow[positiveNodeId];
  if (!hasInputs(positiveNode)) {
    throw new Error('Magic sticker positive prompt node has no inputs.');
  }
  positiveNode.inputs.text = prompt;

  const fallbackNegativeNode = clipNodeIds.find((nodeId) => nodeId !== positiveNodeId);
  const negativeNodeId =
    clipNodeIds.find((nodeId) => getTitle(workflow[nodeId]).includes('negative')) || fallbackNegativeNode;
  if (!negativeNodeId) return;

  const negativeNode = workflow[negativeNodeId];
  if (!hasInputs(negativeNode)) {
    throw new Error('Magic sticker negative prompt node has no inputs.');
  }
  negativeNode.inputs.text = negativePrompt;
};

const applyRuntimeWorkflowValues = (workflow: ComfyWorkflow): void => {
  Object.values(workflow).forEach((node) => {
    if (!node?.inputs) return;
    if ('width' in node.inputs) {
      node.inputs.width = MAGIC_STICKER_DIMENSION_PX;
    }
    if ('height' in node.inputs) {
      node.inputs.height = MAGIC_STICKER_DIMENSION_PX;
    }
  });

  const randomNoiseNodeIds = getNodeIdsByClassType(workflow, 'RandomNoise');
  randomNoiseNodeIds.forEach((nodeId) => {
    const node = workflow[nodeId];
    if (!node?.inputs) return;
    if ('noise_seed' in node.inputs) {
      node.inputs.noise_seed = randomSeed();
    }
  });

  const samplerNodeIds = getNodeIdsByClassType(workflow, 'KSampler');
  samplerNodeIds.forEach((nodeId) => {
    const node = workflow[nodeId];
    if (!node?.inputs) return;
    if ('seed' in node.inputs) {
      node.inputs.seed = randomSeed();
    }
  });

  const saveNodeIds = getNodeIdsByClassType(workflow, 'SaveImage');
  saveNodeIds.forEach((nodeId, index) => {
    const node = workflow[nodeId];
    if (!node?.inputs) return;
    node.inputs.filename_prefix = `memeSRC_magic_sticker_${Date.now()}_${index + 1}`;
  });
};

const readResponseBody = async (response: Response): Promise<{ raw: string; json: Record<string, unknown> | null }> => {
  const raw = await response.text();
  if (!raw) {
    return { raw, json: null };
  }

  try {
    return { raw, json: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { raw, json: null };
  }
};

const queuePrompt = async (serverUrl: string, workflow: ComfyWorkflow): Promise<string> => {
  const clientId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `meme-src-magic-sticker-${Date.now()}`;

  const response = await fetch(`${serverUrl}/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: workflow,
      client_id: clientId,
    }),
  });
  const { raw, json } = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(`Failed to queue local magic sticker prompt (${response.status}). ${raw || 'No response body.'}`);
  }

  const promptId = typeof json?.prompt_id === 'string' ? json.prompt_id : null;
  if (!promptId) {
    throw new Error(`Local ComfyUI returned an invalid prompt response. ${raw || ''}`.trim());
  }

  return promptId;
};

const waitForHistory = async (
  serverUrl: string,
  promptId: string,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<ComfyHistoryItem> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${serverUrl}/history/${encodeURIComponent(promptId)}`);
      const { json } = await readResponseBody(response);
      if (response.ok && json && typeof json === 'object') {
        const historyCandidate = json[promptId];
        if (historyCandidate && typeof historyCandidate === 'object') {
          return historyCandidate as ComfyHistoryItem;
        }
      }
    } catch {
      // Keep polling for transient local-server failures.
    }

    await delay(pollIntervalMs);
  }

  throw new Error('Timed out waiting for local ComfyUI magic sticker result.');
};

const toImageRef = (value: unknown): ComfyImageRef | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.filename !== 'string' || !record.filename) return null;

  return {
    filename: record.filename,
    subfolder: typeof record.subfolder === 'string' ? record.subfolder : '',
    type: typeof record.type === 'string' ? record.type : 'output',
  };
};

const extractFirstOutputImage = (historyItem: ComfyHistoryItem): ComfyImageRef | null => {
  const outputs = historyItem.outputs;
  if (!outputs || typeof outputs !== 'object') return null;

  for (const value of Object.values(outputs)) {
    if (!value || typeof value !== 'object') continue;
    const outputRecord = value as Record<string, unknown>;
    if (!Array.isArray(outputRecord.images)) continue;
    for (const image of outputRecord.images) {
      const imageRef = toImageRef(image);
      if (imageRef) return imageRef;
    }
  }

  return null;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to decode local ComfyUI output image.'));
    reader.readAsDataURL(blob);
  });

const fetchOutputImageDataUrl = async (serverUrl: string, imageRef: ComfyImageRef): Promise<string> => {
  const viewUrl = new URL(`${serverUrl}/view`);
  viewUrl.searchParams.set('filename', imageRef.filename);
  if (imageRef.subfolder) {
    viewUrl.searchParams.set('subfolder', imageRef.subfolder);
  }
  viewUrl.searchParams.set('type', imageRef.type || 'output');

  const response = await fetch(viewUrl.toString());
  if (!response.ok) {
    throw new Error(`Failed to download local ComfyUI output image (${response.status}).`);
  }
  const blob = await response.blob();
  return await blobToDataUrl(blob);
};

export async function runMagicStickerLocally({
  prompt,
  stylePreset = DEFAULT_MAGIC_STICKER_STYLE_PRESET,
  positivePrompt,
  negativePrompt,
  comfyUiUrl = DEFAULT_COMFYUI_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: RunMagicStickerLocallyOptions): Promise<string> {
  const normalizedPositivePrompt =
    typeof positivePrompt === 'string' && positivePrompt.trim().length > 0
      ? positivePrompt.trim()
      : buildMagicStickerPositivePrompt(String(prompt || ''), stylePreset);
  const normalizedNegativePrompt =
    typeof negativePrompt === 'string'
      ? negativePrompt.trim()
      : buildMagicStickerNegativePrompt(stylePreset);

  const workflow = cloneWorkflowTemplate();
  setWorkflowPrompts(workflow, normalizedPositivePrompt, normalizedNegativePrompt);
  applyRuntimeWorkflowValues(workflow);

  const serverUrl = normalizeComfyUrl(comfyUiUrl);
  const promptId = await queuePrompt(serverUrl, workflow);
  const historyItem = await waitForHistory(serverUrl, promptId, timeoutMs, pollIntervalMs);
  const firstImageRef = extractFirstOutputImage(historyItem);
  if (!firstImageRef) {
    throw new Error('Local ComfyUI finished but returned no output image.');
  }

  return await fetchOutputImageDataUrl(serverUrl, firstImageRef);
}

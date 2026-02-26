const DEFAULT_COMFYUI_URL = process.env.REACT_APP_COMFYUI_URL || 'http://192.168.0.103:8000';
const DEFAULT_INPUT_FILENAME = 'flux_fill_inpaint_input.png';
const DEFAULT_MASK_FILENAME = 'flux_fill_inpaint_mask.png';
const DEFAULT_MASK_BACKGROUND_COLOR = process.env.REACT_APP_LOCAL_CLASSIC_MASK_BACKGROUND_COLOR || 'red';
export const CLASSIC_ERASER_DEFAULT_PROMPT = 'Everyday scene as cinematic cinestill sample';
const WORKFLOW_LOAD_IMAGE_NODE_ID = '17';
const WORKFLOW_MASK_LOAD_IMAGE_NODE_ID = '18';
const WORKFLOW_PROMPT_NODE_ID = '47:23';

const toNonNegativeNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const DEFAULT_MASK_GROW_PX = toNonNegativeNumber(process.env.REACT_APP_LOCAL_CLASSIC_MASK_GROW_PX, 3);
const DEFAULT_MASK_FEATHER_PX = toNonNegativeNumber(process.env.REACT_APP_LOCAL_CLASSIC_MASK_FEATHER_PX, 5);
const DEFAULT_MASK_EDGE_CLAMP = Math.round(
  toNonNegativeNumber(process.env.REACT_APP_LOCAL_CLASSIC_MASK_EDGE_CLAMP, 6)
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

export interface RunClassicInpaintLocallyOptions {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt: string;
  comfyUiUrl?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  maskGrowPx?: number;
  maskFeatherPx?: number;
}

const COMFY_INPAINT_WORKFLOW_TEMPLATE: ComfyWorkflow = {
  '9': {
    inputs: {
      filename_prefix: 'ComfyUI',
      images: ['47:8', 0],
    },
    class_type: 'SaveImage',
    _meta: {
      title: 'Save Image',
    },
  },
  '17': {
    inputs: {
      image: DEFAULT_INPUT_FILENAME,
    },
    class_type: 'LoadImage',
    _meta: {
      title: 'Load Input Image',
    },
  },
  '18': {
    inputs: {
      image: DEFAULT_MASK_FILENAME,
    },
    class_type: 'LoadImage',
    _meta: {
      title: 'Load Mask Image',
    },
  },
  '47:34': {
    inputs: {
      clip_name1: 'clip_l.safetensors',
      clip_name2: 't5xxl_fp16.safetensors',
      type: 'flux',
      device: 'default',
    },
    class_type: 'DualCLIPLoader',
    _meta: {
      title: 'DualCLIPLoader',
    },
  },
  '47:26': {
    inputs: {
      guidance: 30,
      conditioning: ['47:23', 0],
    },
    class_type: 'FluxGuidance',
    _meta: {
      title: 'FluxGuidance',
    },
  },
  '47:32': {
    inputs: {
      vae_name: 'ae.safetensors',
    },
    class_type: 'VAELoader',
    _meta: {
      title: 'Load VAE',
    },
  },
  '47:31': {
    inputs: {
      unet_name: 'flux1-fill-dev.safetensors',
      weight_dtype: 'default',
    },
    class_type: 'UNETLoader',
    _meta: {
      title: 'Load Diffusion Model',
    },
  },
  '47:46': {
    inputs: {
      conditioning: ['47:23', 0],
    },
    class_type: 'ConditioningZeroOut',
    _meta: {
      title: 'ConditioningZeroOut',
    },
  },
  '47:23': {
    inputs: {
      text: CLASSIC_ERASER_DEFAULT_PROMPT,
      clip: ['47:34', 0],
    },
    class_type: 'CLIPTextEncode',
    _meta: {
      title: 'CLIP Text Encode (Positive Prompt)',
    },
  },
  '47:39': {
    inputs: {
      strength: 1,
      model: ['47:31', 0],
    },
    class_type: 'DifferentialDiffusion',
    _meta: {
      title: 'Differential Diffusion',
    },
  },
  '47:8': {
    inputs: {
      samples: ['47:3', 0],
      vae: ['47:32', 0],
    },
    class_type: 'VAEDecode',
    _meta: {
      title: 'VAE Decode',
    },
  },
  '47:38': {
    inputs: {
      noise_mask: true,
      positive: ['47:26', 0],
      negative: ['47:46', 0],
      vae: ['47:32', 0],
      pixels: ['17', 0],
      mask: ['18', 1],
    },
    class_type: 'InpaintModelConditioning',
    _meta: {
      title: 'InpaintModelConditioning',
    },
  },
  '47:3': {
    inputs: {
      seed: 656821733471329,
      steps: 20,
      cfg: 1,
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 1,
      model: ['47:39', 0],
      positive: ['47:38', 0],
      negative: ['47:38', 1],
      latent_image: ['47:38', 2],
    },
    class_type: 'KSampler',
    _meta: {
      title: 'KSampler',
    },
  },
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const normalizeComfyUrl = (url: string): string => url.replace(/\/+$/, '');

const cloneWorkflowTemplate = (): ComfyWorkflow =>
  JSON.parse(JSON.stringify(COMFY_INPAINT_WORKFLOW_TEMPLATE)) as ComfyWorkflow;

const getNodeIdsByClassType = (workflow: ComfyWorkflow, classType: string): string[] =>
  Object.keys(workflow)
    .filter((nodeId) => workflow[nodeId]?.class_type === classType)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));

const setWorkflowPromptText = (workflow: ComfyWorkflow, prompt: string): void => {
  const explicitPromptNode = workflow[WORKFLOW_PROMPT_NODE_ID];
  if (explicitPromptNode?.class_type === 'CLIPTextEncode' && explicitPromptNode.inputs) {
    explicitPromptNode.inputs.text = prompt?.trim() || CLASSIC_ERASER_DEFAULT_PROMPT;
    return;
  }

  const clipNodeIds = getNodeIdsByClassType(workflow, 'CLIPTextEncode');
  if (!clipNodeIds.length) {
    throw new Error('Local inpaint workflow is missing a CLIPTextEncode node.');
  }

  const preferredNodeId =
    clipNodeIds.find((nodeId) =>
      String(workflow[nodeId]?._meta?.title || '')
        .toLowerCase()
        .includes('positive')
    ) || clipNodeIds[0];

  const inputs = workflow[preferredNodeId]?.inputs;
  if (!inputs) {
    throw new Error('Local inpaint workflow prompt node has no inputs.');
  }
  inputs.text = prompt?.trim() || CLASSIC_ERASER_DEFAULT_PROMPT;
};

const setWorkflowInputFilename = (workflow: ComfyWorkflow, inputFilename: string): void => {
  const explicitLoadImageNode = workflow[WORKFLOW_LOAD_IMAGE_NODE_ID];
  if (explicitLoadImageNode?.class_type === 'LoadImage' && explicitLoadImageNode.inputs) {
    explicitLoadImageNode.inputs.image = inputFilename;
    return;
  }

  const loadImageNodeIds = getNodeIdsByClassType(workflow, 'LoadImage');
  if (!loadImageNodeIds.length) {
    throw new Error('Local inpaint workflow is missing a LoadImage node.');
  }

  const inputs = workflow[loadImageNodeIds[0]]?.inputs;
  if (!inputs) {
    throw new Error('Local inpaint workflow image input node has no inputs.');
  }
  inputs.image = inputFilename;
};

const setWorkflowMaskFilename = (workflow: ComfyWorkflow, inputFilename: string): void => {
  const explicitLoadImageNode = workflow[WORKFLOW_MASK_LOAD_IMAGE_NODE_ID];
  if (explicitLoadImageNode?.class_type === 'LoadImage' && explicitLoadImageNode.inputs) {
    explicitLoadImageNode.inputs.image = inputFilename;
    return;
  }

  const loadImageNodeIds = getNodeIdsByClassType(workflow, 'LoadImage');
  if (loadImageNodeIds.length < 2) {
    throw new Error('Local inpaint workflow is missing a mask LoadImage node.');
  }

  const maskNodeId =
    loadImageNodeIds.find((nodeId) =>
      String(workflow[nodeId]?._meta?.title || '')
        .toLowerCase()
        .includes('mask')
    ) || loadImageNodeIds[1];
  const inputs = workflow[maskNodeId]?.inputs;
  if (!inputs) {
    throw new Error('Local inpaint workflow mask input node has no inputs.');
  }
  inputs.image = inputFilename;
};

const randomSeed = (): number => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

const applyRuntimeWorkflowValues = (workflow: ComfyWorkflow): void => {
  const samplerNodeIds = getNodeIdsByClassType(workflow, 'KSampler');
  if (samplerNodeIds.length) {
    const inputs = workflow[samplerNodeIds[0]]?.inputs;
    if (inputs) {
      inputs.seed = randomSeed();
    }
  }

  const saveNodeIds = getNodeIdsByClassType(workflow, 'SaveImage');
  if (saveNodeIds.length) {
    const inputs = workflow[saveNodeIds[0]]?.inputs;
    if (inputs) {
      inputs.filename_prefix = `memeSRC_classic_${Date.now()}`;
    }
  }
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

const readDataUrlAsImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load generated image data for local inpaint.'));
    image.src = src;
  });

const dilateSelectionMask = (
  sourceMask: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray => {
  if (radius <= 0) return sourceMask;

  const horizontalPass = new Uint8ClampedArray(sourceMask.length);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      let maxValue = 0;
      const startX = Math.max(0, x - radius);
      const endX = Math.min(width - 1, x + radius);
      for (let sampleX = startX; sampleX <= endX; sampleX += 1) {
        const value = sourceMask[rowOffset + sampleX];
        if (value > maxValue) maxValue = value;
      }
      horizontalPass[rowOffset + x] = maxValue;
    }
  }

  const verticalPass = new Uint8ClampedArray(sourceMask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let maxValue = 0;
      const startY = Math.max(0, y - radius);
      const endY = Math.min(height - 1, y + radius);
      for (let sampleY = startY; sampleY <= endY; sampleY += 1) {
        const value = horizontalPass[sampleY * width + x];
        if (value > maxValue) maxValue = value;
      }
      verticalPass[y * width + x] = maxValue;
    }
  }

  return verticalPass;
};

const blurSelectionMask = (
  selectionMask: Uint8ClampedArray,
  width: number,
  height: number,
  featherPx: number
): Uint8ClampedArray => {
  if (featherPx <= 0) return selectionMask;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return selectionMask;

  const sourceImageData = sourceCtx.createImageData(width, height);
  for (let index = 0, px = 0; index < selectionMask.length; index += 1, px += 4) {
    const value = selectionMask[index];
    sourceImageData.data[px] = value;
    sourceImageData.data[px + 1] = value;
    sourceImageData.data[px + 2] = value;
    sourceImageData.data[px + 3] = 255;
  }
  sourceCtx.putImageData(sourceImageData, 0, 0);

  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext('2d');
  if (!blurCtx) return selectionMask;
  blurCtx.filter = `blur(${featherPx}px)`;
  blurCtx.drawImage(sourceCanvas, 0, 0, width, height);
  blurCtx.filter = 'none';

  const blurredImageData = blurCtx.getImageData(0, 0, width, height);
  const blurredMask = new Uint8ClampedArray(selectionMask.length);
  for (let index = 0, px = 0; index < blurredMask.length; index += 1, px += 4) {
    blurredMask[index] = blurredImageData.data[px];
  }

  return blurredMask;
};

const clampSelectionMaskExtremes = (selectionMask: Uint8ClampedArray, edgeClamp: number): Uint8ClampedArray => {
  const clampValue = Math.max(0, Math.min(127, Math.round(edgeClamp)));
  if (clampValue <= 0) return selectionMask;

  const lowCutoff = clampValue;
  const highCutoff = 255 - clampValue;
  const clampedMask = new Uint8ClampedArray(selectionMask.length);
  for (let index = 0; index < selectionMask.length; index += 1) {
    const value = selectionMask[index];
    clampedMask[index] = value <= lowCutoff ? 0 : value >= highCutoff ? 255 : value;
  }

  return clampedMask;
};

const getMaskAlphaData = (
  maskImage: HTMLImageElement,
  width: number,
  height: number,
  growPx: number,
  featherPx: number
): ImageData => {
  const baseMaskCanvas = document.createElement('canvas');
  baseMaskCanvas.width = width;
  baseMaskCanvas.height = height;
  const baseMaskCtx = baseMaskCanvas.getContext('2d');
  if (!baseMaskCtx) {
    throw new Error('Unable to prepare mask image for local inpaint.');
  }
  baseMaskCtx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in baseMaskCtx) {
    baseMaskCtx.imageSmoothingQuality = 'high';
  }
  baseMaskCtx.drawImage(maskImage, 0, 0, width, height);
  const baseMaskData = baseMaskCtx.getImageData(0, 0, width, height);

  const initialSelectionMask = new Uint8ClampedArray(width * height);
  for (let index = 0, px = 0; index < initialSelectionMask.length; index += 1, px += 4) {
    // In this workflow, transparent areas in the uploaded PNG indicate the inpaint region.
    initialSelectionMask[index] = 255 - baseMaskData.data[px + 3];
  }

  const dilatedMask = dilateSelectionMask(
    initialSelectionMask,
    width,
    height,
    Math.round(toNonNegativeNumber(growPx, 0))
  );
  const smoothedMask = blurSelectionMask(
    dilatedMask,
    width,
    height,
    toNonNegativeNumber(featherPx, 0)
  );
  const refinedMask = clampSelectionMaskExtremes(smoothedMask, DEFAULT_MASK_EDGE_CLAMP);

  const alphaMaskCanvas = document.createElement('canvas');
  alphaMaskCanvas.width = width;
  alphaMaskCanvas.height = height;
  const alphaMaskCtx = alphaMaskCanvas.getContext('2d');
  if (!alphaMaskCtx) {
    return baseMaskData;
  }

  const alphaMaskData = alphaMaskCtx.createImageData(width, height);
  for (let index = 0, px = 0; index < refinedMask.length; index += 1, px += 4) {
    const alphaValue = 255 - refinedMask[index];
    alphaMaskData.data[px] = 0;
    alphaMaskData.data[px + 1] = 0;
    alphaMaskData.data[px + 2] = 0;
    alphaMaskData.data[px + 3] = alphaValue;
  }
  return alphaMaskData;
};

const composeOpaqueInputBlob = async (
  imageDataUrl: string,
): Promise<{ blob: Blob; width: number; height: number }> => {
  const baseImage = await readDataUrlAsImage(imageDataUrl);

  const width = baseImage.naturalWidth || baseImage.width;
  const height = baseImage.naturalHeight || baseImage.height;
  if (!width || !height) {
    throw new Error('Unable to read source image dimensions for local inpaint.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to prepare source image for local inpaint.');
  }

  ctx.fillStyle = DEFAULT_MASK_BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(baseImage, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Failed to encode local inpaint input image.');
  }
  return { blob, width, height };
};

const composeMaskInputBlob = async (
  maskDataUrl: string,
  width: number,
  height: number,
  {
    maskGrowPx = DEFAULT_MASK_GROW_PX,
    maskFeatherPx = DEFAULT_MASK_FEATHER_PX,
  }: { maskGrowPx?: number; maskFeatherPx?: number } = {}
): Promise<Blob> => {
  const maskImage = await readDataUrlAsImage(maskDataUrl);
  const maskData = getMaskAlphaData(maskImage, width, height, maskGrowPx, maskFeatherPx);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to prepare source mask for local inpaint.');
  }

  ctx.fillStyle = DEFAULT_MASK_BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);
  const composedMaskData = ctx.getImageData(0, 0, width, height);
  for (let index = 0; index < composedMaskData.data.length; index += 4) {
    composedMaskData.data[index + 3] = maskData.data[index + 3];
  }
  ctx.putImageData(composedMaskData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Failed to encode local inpaint mask image.');
  }
  return blob;
};

const uploadInputImage = async (serverUrl: string, imageBlob: Blob, filename: string): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageBlob, filename);
  formData.append('type', 'input');
  formData.append('overwrite', 'true');
  formData.append('subfolder', '');

  const response = await fetch(`${serverUrl}/upload/image`, {
    method: 'POST',
    body: formData,
  });
  const { raw, json } = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(`Failed to upload local ComfyUI input image (${response.status}). ${raw || 'No response body.'}`);
  }

  const uploadedFilename = typeof json?.name === 'string' && json.name.trim().length > 0 ? json.name : filename;
  const subfolder = typeof json?.subfolder === 'string' ? json.subfolder : '';

  return subfolder ? `${subfolder}/${uploadedFilename}` : uploadedFilename;
};

const queuePrompt = async (serverUrl: string, workflow: ComfyWorkflow): Promise<string> => {
  const clientId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `meme-src-${Date.now()}`;

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
    throw new Error(`Failed to queue local inpaint prompt (${response.status}). ${raw || 'No response body.'}`);
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

  throw new Error('Timed out waiting for local ComfyUI inpaint result.');
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

export async function runClassicInpaintLocally({
  imageDataUrl,
  maskDataUrl,
  prompt,
  comfyUiUrl = DEFAULT_COMFYUI_URL,
  timeoutMs = 5 * 60 * 1000,
  pollIntervalMs = 1000,
  maskGrowPx = DEFAULT_MASK_GROW_PX,
  maskFeatherPx = DEFAULT_MASK_FEATHER_PX,
}: RunClassicInpaintLocallyOptions): Promise<string> {
  if (!imageDataUrl || !maskDataUrl) {
    throw new Error('Classic inpaint requires both an image and a mask.');
  }

  const serverUrl = normalizeComfyUrl(comfyUiUrl);
  const { blob: sourceInputBlob, width, height } = await composeOpaqueInputBlob(imageDataUrl);
  const maskInputBlob = await composeMaskInputBlob(maskDataUrl, width, height, { maskGrowPx, maskFeatherPx });
  const uploadedInputFilename = await uploadInputImage(serverUrl, sourceInputBlob, DEFAULT_INPUT_FILENAME);
  const uploadedMaskFilename = await uploadInputImage(serverUrl, maskInputBlob, DEFAULT_MASK_FILENAME);

  const workflow = cloneWorkflowTemplate();
  setWorkflowPromptText(workflow, prompt);
  setWorkflowInputFilename(workflow, uploadedInputFilename);
  setWorkflowMaskFilename(workflow, uploadedMaskFilename);
  applyRuntimeWorkflowValues(workflow);

  const promptId = await queuePrompt(serverUrl, workflow);
  const historyItem = await waitForHistory(serverUrl, promptId, timeoutMs, pollIntervalMs);
  const firstImageRef = extractFirstOutputImage(historyItem);
  if (!firstImageRef) {
    throw new Error('Local ComfyUI finished but returned no output image.');
  }

  return await fetchOutputImageDataUrl(serverUrl, firstImageRef);
}

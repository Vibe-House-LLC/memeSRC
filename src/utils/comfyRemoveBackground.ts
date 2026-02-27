import workflowTemplate from '../workflows/removebg.api.json';

const DEFAULT_COMFYUI_URL = process.env.REACT_APP_COMFYUI_URL || 'http://192.168.0.103:8000';
const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_INPUT_FILENAME = 'removebg_input.png';
const WORKFLOW_LOAD_IMAGE_NODE_ID = '2';

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

export interface RunRemoveBackgroundLocallyOptions {
  imageDataUrl: string;
  comfyUiUrl?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const normalizeComfyUrl = (url: string): string => url.replace(/\/+$/, '');

const cloneWorkflowTemplate = (): ComfyWorkflow =>
  JSON.parse(JSON.stringify(workflowTemplate)) as ComfyWorkflow;

const getNodeIdsByClassType = (workflow: ComfyWorkflow, classType: string): string[] =>
  Object.keys(workflow)
    .filter((nodeId) => workflow[nodeId]?.class_type === classType)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));

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

const randomToken = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '');
  }
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000_000)}`;
};

const buildUniqueUploadFilename = (filename: string, suffix: string): string => {
  const trimmed = String(filename || '').trim() || DEFAULT_INPUT_FILENAME;
  const lastDotIndex = trimmed.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return `${trimmed}_${suffix}`;
  }

  const basename = trimmed.slice(0, lastDotIndex);
  const extension = trimmed.slice(lastDotIndex);
  return `${basename}_${suffix}${extension}`;
};

const setWorkflowInputFilename = (workflow: ComfyWorkflow, inputFilename: string): void => {
  const explicitNode = workflow[WORKFLOW_LOAD_IMAGE_NODE_ID];
  if (explicitNode?.class_type === 'LoadImage' && explicitNode.inputs) {
    explicitNode.inputs.image = inputFilename;
    return;
  }

  const loadImageNodeIds = getNodeIdsByClassType(workflow, 'LoadImage');
  if (!loadImageNodeIds.length) {
    throw new Error('Remove background workflow is missing a LoadImage node.');
  }

  const inputs = workflow[loadImageNodeIds[0]]?.inputs;
  if (!inputs) {
    throw new Error('Remove background workflow image input node has no inputs.');
  }
  inputs.image = inputFilename;
};

const applyRuntimeWorkflowValues = (workflow: ComfyWorkflow): void => {
  const saveNodeIds = getNodeIdsByClassType(workflow, 'SaveImage');
  saveNodeIds.forEach((nodeId, index) => {
    const node = workflow[nodeId];
    if (!node?.inputs) return;
    node.inputs.filename_prefix = `memeSRC_removebg_${Date.now()}_${index + 1}`;
  });
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

const uploadInputImage = async (serverUrl: string, imageBlob: Blob, filename: string): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageBlob, filename);
  formData.append('type', 'input');
  formData.append('overwrite', 'false');
  formData.append('subfolder', '');

  const response = await fetch(`${serverUrl}/upload/image`, {
    method: 'POST',
    body: formData,
  });
  const { raw, json } = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(`Failed to upload local remove-background image (${response.status}). ${raw || 'No response body.'}`);
  }

  const uploadedFilename = typeof json?.name === 'string' && json.name.trim().length > 0 ? json.name : filename;
  const subfolder = typeof json?.subfolder === 'string' ? json.subfolder : '';
  return subfolder ? `${subfolder}/${uploadedFilename}` : uploadedFilename;
};

const queuePrompt = async (serverUrl: string, workflow: ComfyWorkflow): Promise<string> => {
  const clientId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `meme-src-removebg-${Date.now()}`;

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
    throw new Error(`Failed to queue local remove-background prompt (${response.status}). ${raw || 'No response body.'}`);
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

  throw new Error('Timed out waiting for local ComfyUI remove-background result.');
};

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

export async function runRemoveBackgroundLocally({
  imageDataUrl,
  comfyUiUrl = DEFAULT_COMFYUI_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: RunRemoveBackgroundLocallyOptions): Promise<string> {
  if (!imageDataUrl) {
    throw new Error('Remove background requires an image.');
  }

  const imageResponse = await fetch(imageDataUrl);
  const imageBlob = await imageResponse.blob();
  const uploadFilename = buildUniqueUploadFilename(DEFAULT_INPUT_FILENAME, randomToken());
  const serverUrl = normalizeComfyUrl(comfyUiUrl);
  const uploadedInputFilename = await uploadInputImage(serverUrl, imageBlob, uploadFilename);

  const workflow = cloneWorkflowTemplate();
  setWorkflowInputFilename(workflow, uploadedInputFilename);
  applyRuntimeWorkflowValues(workflow);

  const promptId = await queuePrompt(serverUrl, workflow);
  const historyItem = await waitForHistory(serverUrl, promptId, timeoutMs, pollIntervalMs);
  const outputImageRef = extractFirstOutputImage(historyItem);
  if (!outputImageRef) {
    throw new Error('Local ComfyUI finished but returned no output image.');
  }

  return await fetchOutputImageDataUrl(serverUrl, outputImageRef);
}

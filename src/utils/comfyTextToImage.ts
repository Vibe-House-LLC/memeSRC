import workflowTemplate from '../workflows/t2i.api.json';

const DEFAULT_COMFYUI_URL = process.env.REACT_APP_COMFYUI_URL || 'http://192.168.0.103:8000';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 1000;

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

export interface RunTextToImageLocallyOptions {
  prompt: string;
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

const hasTextInput = (node?: ComfyNode): node is ComfyNode & { inputs: Record<string, unknown> } =>
  Boolean(node?.inputs && typeof node.inputs === 'object');

const setWorkflowPrompts = (workflow: ComfyWorkflow, prompt: string, negativePrompt?: string): void => {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error('Text-to-image prompt is required.');
  }

  const clipNodeIds = getNodeIdsByClassType(workflow, 'CLIPTextEncode');
  if (!clipNodeIds.length) {
    throw new Error('Text-to-image workflow is missing CLIPTextEncode nodes.');
  }

  const positiveNodeId =
    clipNodeIds.find((nodeId) => getTitle(workflow[nodeId]).includes('positive')) || clipNodeIds[0];
  const positiveNode = workflow[positiveNodeId];
  if (!hasTextInput(positiveNode)) {
    throw new Error('Text-to-image positive prompt node has no inputs.');
  }
  positiveNode.inputs.text = trimmedPrompt;

  if (typeof negativePrompt !== 'string') return;

  const fallbackNegativeNode = clipNodeIds.find((nodeId) => nodeId !== positiveNodeId);
  const negativeNodeId =
    clipNodeIds.find((nodeId) => getTitle(workflow[nodeId]).includes('negative')) || fallbackNegativeNode;
  if (!negativeNodeId) return;

  const negativeNode = workflow[negativeNodeId];
  if (!hasTextInput(negativeNode)) {
    throw new Error('Text-to-image negative prompt node has no inputs.');
  }
  negativeNode.inputs.text = negativePrompt.trim();
};

const applyRuntimeWorkflowValues = (workflow: ComfyWorkflow): void => {
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
    node.inputs.filename_prefix = `memeSRC_t2i_${Date.now()}_${index + 1}`;
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
      : `meme-src-t2i-${Date.now()}`;

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
    throw new Error(`Failed to queue local text-to-image prompt (${response.status}). ${raw || 'No response body.'}`);
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

  throw new Error('Timed out waiting for local ComfyUI text-to-image result.');
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

export async function runTextToImageLocally({
  prompt,
  negativePrompt,
  comfyUiUrl = DEFAULT_COMFYUI_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: RunTextToImageLocallyOptions): Promise<string> {
  const workflow = cloneWorkflowTemplate();
  setWorkflowPrompts(workflow, prompt, negativePrompt);
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

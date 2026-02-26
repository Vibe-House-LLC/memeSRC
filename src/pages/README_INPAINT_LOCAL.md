Check file named inpaint.json for the workflow from ComfyUI.

We'll use this local API to handle the 'classic' inpainting workflow instead of the AWS Lambda function via the current magic editor api workflow. 

So swap out how we handle the inpainting workflow to use this API to initiate the job, and then poll for the results.

NOTE: the notes and examples below were written without awareness of this particualr project or how we want to implement things. You shouldn't do exactly what it says in the examples, obviously, but use that information to guide you through this. 

IMPORTANT NOTE: I don't want to update any backend functions. Since this is just a test, I want to replace the call to the 'backend' API for a direct call to this 'local' endpoint / process for inpainting. I don't care about credit consumption or anything except it actually working for this demo. 

# General Notes and example:

```
You already have the server reachable on `http://192.168.0.103:8000`, so you can use ComfyUI’s built-in HTTP API directly.

ComfyUI’s core flow is:

1. **POST `/prompt`** with an *API-exported workflow JSON* (the “prompt” graph).
2. Get back a **`prompt_id`**.
3. **GET `/history/{prompt_id}`** to find the output image filename(s).
4. **GET `/view`** to download the image bytes.

These routes are part of ComfyUI’s server API. ([ComfyUI Documentation][1])

---

## 1) Make sure your `t2i.json` is the **API export**

In the ComfyUI UI, use **Workflow → Export (API)** and save that JSON as `t2i.json`. (The regular “Save workflow” format is not the same thing.) ([DEV Community][2])

---

## 2) Edit the prompt text inside the workflow JSON

Your `t2i.json` is basically a dict of nodes keyed by numeric IDs. Somewhere inside it you’ll have nodes like `CLIPTextEncode` (positive/negative). You need to change:

* the **positive prompt** node’s `inputs.text`
* optionally the **negative prompt** node’s `inputs.text`

Example shape (illustrative):

```json
{
  "12": { "class_type": "CLIPTextEncode", "inputs": { "text": "old prompt", "clip": ["4", 1] } },
  "13": { "class_type": "CLIPTextEncode", "inputs": { "text": "old negative", "clip": ["4", 1] } }
}
```

So your code will:

* load JSON
* find the node(s) with `class_type == "CLIPTextEncode"`
* pick the one you want (often there are 2: pos/neg)
* set `inputs["text"] = "your new prompt"`

---

## 3) Kick off the run: `POST /prompt`

**curl example** (assumes you already edited `t2i.json` contents into the request as JSON):

```bash
curl -X POST "http://192.168.0.103:8000/prompt" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\": <PASTE_YOUR_T2I_JSON_OBJECT_HERE>, \"client_id\":\"any-string-you-want\"}"
```

`/prompt` is the correct endpoint for queueing a workflow. ([ComfyUI Documentation][1])

It returns something like:

```json
{ "prompt_id": "4f1c..." }
```

---

## 4) Poll for results: `GET /history/{prompt_id}`

```bash
curl "http://192.168.0.103:8000/history/PUT_PROMPT_ID_HERE"
```

The history response includes the outputs and filenames. `/history` and `/history/{prompt_id}` are official routes. ([ComfyUI Documentation][1])

---

## 5) Download the output image: `GET /view`

Once you find a filename in the history output (often under something like `outputs -> images -> filename/subfolder/type`), fetch it like:

```bash
curl -o result.png "http://192.168.0.103:8000/view?filename=YOUR_FILE.png&subfolder=YOUR_SUBFOLDER&type=output"
```

(Parameters come from the history payload; `type` is commonly `output`.)

---

## A complete Python script (edit prompt + run + download)

This works end-to-end if:

* your `t2i.json` is an **API export**
* it contains at least one `CLIPTextEncode` node
* you adjust the “which CLIPTextEncode is positive vs negative” selection if needed

```python
import json
import time
import uuid
import requests

SERVER = "http://192.168.0.103:8000"
WORKFLOW_PATH = "t2i.json"

NEW_POSITIVE = "a cinematic photo of a red fox in a snowy forest, 50mm, shallow depth of field"
NEW_NEGATIVE = "blurry, low quality, artifacts"

def load_workflow(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def set_cliptextencode_prompts(workflow: dict, positive: str, negative: str | None = None) -> dict:
    """
    Finds CLIPTextEncode nodes and sets their inputs.text.
    If there are 2+ nodes, this assigns the first as positive and second as negative.
    You may need to tweak this logic for your specific graph.
    """
    clip_nodes = []
    for node_id, node in workflow.items():
        if isinstance(node, dict) and node.get("class_type") == "CLIPTextEncode":
            clip_nodes.append(node_id)

    if not clip_nodes:
        raise RuntimeError("No CLIPTextEncode nodes found in workflow JSON. Is this an API export?")

    # Deterministic order
    clip_nodes.sort(key=lambda x: int(x) if str(x).isdigit() else str(x))

    # Set positive
    workflow[clip_nodes[0]]["inputs"]["text"] = positive

    # Set negative if available
    if negative is not None and len(clip_nodes) > 1:
        workflow[clip_nodes[1]]["inputs"]["text"] = negative

    return workflow

def queue_prompt(workflow: dict) -> str:
    payload = {
        "prompt": workflow,
        "client_id": str(uuid.uuid4()),
    }
    r = requests.post(f"{SERVER}/prompt", json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    if "prompt_id" not in data:
        raise RuntimeError(f"Unexpected /prompt response: {data}")
    return data["prompt_id"]

def wait_for_history(prompt_id: str, poll_seconds: float = 1.0, timeout_seconds: int = 300) -> dict:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        r = requests.get(f"{SERVER}/history/{prompt_id}", timeout=60)
        r.raise_for_status()
        data = r.json()

        # When complete, history usually contains the prompt_id key with outputs.
        if data and prompt_id in data:
            return data[prompt_id]

        time.sleep(poll_seconds)

    raise TimeoutError("Timed out waiting for workflow to finish.")

def extract_image_refs(history_item: dict) -> list[dict]:
    """
    Pulls image file references out of history item.
    Returns list of dicts with filename/subfolder/type.
    """
    images = []
    outputs = history_item.get("outputs", {})
    for _, out in outputs.items():
        for img in out.get("images", []):
            # img often has: filename, subfolder, type
            if "filename" in img:
                images.append(img)
    return images

def download_image(img_ref: dict, out_path: str):
    params = {
        "filename": img_ref.get("filename"),
        "subfolder": img_ref.get("subfolder", ""),
        "type": img_ref.get("type", "output"),
    }
    r = requests.get(f"{SERVER}/view", params=params, timeout=120)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(r.content)

def main():
    wf = load_workflow(WORKFLOW_PATH)
    wf = set_cliptextencode_prompts(wf, NEW_POSITIVE, NEW_NEGATIVE)

    prompt_id = queue_prompt(wf)
    print("prompt_id:", prompt_id)

    hist_item = wait_for_history(prompt_id)
    img_refs = extract_image_refs(hist_item)

    if not img_refs:
        raise RuntimeError("No images found in outputs. Check your workflow's output nodes.")

    for i, img in enumerate(img_refs, start=1):
        out_file = f"result_{i}.png"
        download_image(img, out_file)
        print("saved:", out_file)

if __name__ == "__main__":
    main()
```

API routes used here (`/prompt`, `/history/{prompt_id}`) are documented ComfyUI server endpoints. ([ComfyUI Documentation][1])

---

## Optional: real-time progress (WebSocket)

If you want progress updates instead of polling, ComfyUI also exposes a WebSocket endpoint (`/ws`) for real-time execution events. ([ComfyUI Documentation][1])

---

## Common gotchas

* **Wrong JSON file**: must be **Export (API)**, not the normal workflow save. ([DEV Community][2])
* **Picking the wrong `CLIPTextEncode` node**: some workflows have multiple text encoders (prompt, negative, style, etc.). If the “first/second” assumption is wrong, open `t2i.json` and target the exact node IDs you want.
* **Port mismatch**: Desktop often runs on **8000** (you are), web setups often use 8188. ([ComfyUI Documentation][3])

If you paste a small snippet of your `t2i.json` showing the `CLIPTextEncode` nodes (just those nodes, not the whole file), I can tell you exactly which node IDs to edit for positive/negative.

[1]: https://docs.comfy.org/development/comfyui-server/comms_routes?utm_source=chatgpt.com "Routes"
[2]: https://dev.to/worldlinetech/unlocking-comfyuis-power-a-guide-to-the-http-api-in-jupyter-1mpi?utm_source=chatgpt.com "Unlocking ComfyUI's Power: A Guide to the HTTP API in ..."
[3]: https://docs.comfy.org/interface/settings/server-config?utm_source=chatgpt.com "Server Config"
```


MORE NOTES about having image inputs and inpainting:

```
### What changes for inpainting

For inpainting you do the same `/prompt → /history → /view` flow as before, but you must also:

1. **Upload the input image** to ComfyUI via **`POST /upload/image`** (multipart form upload). ([ComfyUI Documentation][1])
2. Update the workflow JSON so the **LoadImage** node points at the uploaded filename.

Your uploaded workflow (`inpaint.json`) has:

* **LoadImage node**: id **`"17"`** with `inputs.image = "flux_fill_inpaint_input.png"` 
* **Prompt node**: id **`"47:23"`** (`CLI:contentReference[oaicite:2]{index=2}nputs.text = ...` 
* The inpainting conditioning uses **both`and`mask: ["17", 1]` 

That last part means **this workflow exp from the LoadImage node’s mask output**. In ComfyUI that typically means: **your uploaded PNG should contain an alpha channel** (RGBA) and the mask is derived from it (common pattern: alpha defines mask). If you don’t have an alpha mask and instead have a separate mask image, you’ll need to modify the workflow to load the mask separately (see “Separate mask” section below).

---

## Endpoints you will use

* `POST /upload/image` (upload your input image into ComfyUI’s filesystem) ([ComfyUI Documentation][1])
* `POST /prompt` (queue the workflow) ([ComfyUI Documentation][1])
* `GET /history/{prompt_id}` (find output filenames) ([ComfyUI Documentation][1])
* `GET /view?...` (download image bytes) ([ComfyUI Documentation][1])

---

## cURL: upload image, then run

### 1) Upload your inpaint input image

```bash
curl -X POST "http://192.168.0.103:8000/upload/image" ^
  -H "Content-Type: multipart/form-data" ^
  -F "image=@C:\path\to\input_rgba.png" ^
  -F "type=input" ^
  -F "overwrite=true"
```

`/upload/image` is a built-in ComfyUI route. ([ComfyUI Documentation][1])

The response includes the stored filename (you’ll use it in the workflow’s LoadImage node).

### 2) Queue the prompt

Same as before: POST `/prompt` with the workflow JSON after you set:

* `47:23.inputs.text` to your prompt
* `17.inputs.image` to the uploaded filename

---

## Complete Python script (upload + patch workflow + run + download)

This script assumes:

* You’re using **this exact `inpaint.json` structure** you uploaded 
* Your input is an **RGBA PNG** if you want mask-from-alpha

```python
import json
import time
import uuid
import requests
from pathlib import Path

SERVER = "http://192.168.0.103:8000"

WORKFLOW_PATH = "inpaint.json"          # your API-exported workflow
INPUT_IMAGE_PATH = r"C:\path\to\input_rgba.png"  # must exist on the machine running this script

PROMPT = "repl:contentReference[oaicite:13]{index=13}th a cozy library, soft warm lighting"
# Optional: if you want to tweak seed/steps/etc you can patch node 47:3 too.

def upload_image(path: str) -> str:
    """
    Uploads an image into ComfyUI's input store via /upload/image.
    Returns the server-side filename to put into LoadImage.inputs.image.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(p)

    with p.open("rb") as f:
        files = {"image": (p.name, f, "application/octet-stream")}
        data = {
            "type": "input",
            "overwrite": "true",
            # "subfolder": "",  # optional
        }
        r = requests.post(f"{SERVER}/upload/image", files=files, data=data, timeout=120)
        r.raise_for_status()
        resp = r.json()

    # Different builds return slightly different shapes, but filename is typically here:
    # {"name":"my.png","subfolder":"","type":"input"} or similar.
    for key in ("name", "filename"):
        if key in resp and resp[key]:
            return resp[key]
    raise RuntimeError(f"Unexpected upload response: {resp}")

def load_workflow(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def queue_prompt(workflow: dict) -> str:
    payload = {"prompt": workflow, "client_id": str(uuid.uuid4())}
    r = requests.post(f"{SERVER}/prompt", json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    if "prompt_id" not in data:
        raise RuntimeError(f"Unexpected /prompt response: {data}")
    return data["prompt_id"]

def wait_for_history(prompt_id: str, poll_seconds: float = 1.0, timeout_seconds: int = 600) -> dict:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        r = requests.get(f"{SERVER}/history/{prompt_id}", timeout=60)
        r.raise_for_status()
        data = r.json()
        if data and prompt_id in data:
            return data[prompt_id]
        time.sleep(poll_seconds)
    raise TimeoutError("Timed out waiting for workflow to finish.")

def extract_image_refs(history_item: dict) -> list[dict]:
    images = []
    outputs = history_item.get("outputs", {})
    for _, out in outputs.items():
        for img in out.get("images", []):
            if "filename" in img:
                images.append(img)
    return images

def download_image(img_ref: dict, out_path: str):
    params = {
        "filename": img_ref.get("filename"),
        "subfolder": img_ref.get("subfolder", ""),
        "type": img_ref.get("type", "output"),
    }
    r = requests.get(f"{SERVER}/view", params=params, timeout=120)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(r.content)

def main():
    # 1) Upload the input image
    uploaded_name = upload_image(INPUT_IMAGE_PATH)
    print("Uploaded as:", uploaded_name)

    # 2) Load workflow and patch nodes
    wf = load_workflow(WORKFLOW_PATH)

    # Patch prompt (your workflow uses node "47:23")
    wf["47:23"]["inputs"]["text"] = PROMPT

    # Patch LoadImage filename (your workflow uses node "17")
    wf["17"]["inputs"]["image"] = uploaded_name

    # 3) Queue
    prompt_id = queue_prompt(wf)
    print("prompt_id:", prompt_id)

    # 4) Wait for completion
    hist_item = wait_for_history(prompt_id)

    # 5) Download outputs
    imgs = extract_image_refs(hist_item)
    if not imgs:
        raise RuntimeError("No images found in outputs. Check the SaveImage node and graph.")

    for i, img in enumerate(imgs, 1):
        out_file = f"inpaint_result_{i}.png"
        download_image(img, out_file)
        print("Saved:", out_file)

if __name__ == "__main__":
    main()
```

---

## Separate mask instead of alpha (if you need it)

Your current workflow wires `mask: ["17", 1]` from the same `LoadImage` node as the pixels. 
If you have a separate mask file (e.g., black/white PNG), you have two options:

1. **Modify the workflow** to add another `LoadImage` node for the mask and wire its mask output into `InpaintModelConditioning.mask`. Then upload both images and set both filenames before `/prompt`.

2. Use the dedicated **`POST /upload/mask`** route (it exists) but you still need a s that mask appropriately. ([ComfyUI Documentation][1])

---

### Minimal checklist

* Upload RGBA input (alpha = mask) via `POST /upload/image` ([ComfyUI Documentation][1])
* Set `wf["17"]["inputs"]["image"] = <uploaded filename>` 
* Set `wf["47:23"]["inputs"]["text"] = <prompt>` 
* POST `/prompt` → poll `/history/{id}` → GET `/view` ([ComfyUI Documentation][1])

If you paste the upload response JSON you’re seeing from `/upload/image`, I can adjust the filename extraction in the script to match it exactly.



[1]: https://docs.comfy.org/development/comfyui-server/comms_routes "Routes - ComfyUI"

```


Additional notes for the masking, etc. 

```
Specialized for seamless inpainting with:

FLUX fp8 low-precision models

Differential Diffusion for edge blending

Dual CLIP encoders integration

Built-in image comparison

2. Core Models

Model

Purpose

Flux Fill dev - fp8

Official inpainting model

clip_l + t5xxl_fp8

Dual-text encoder

ae.sft

Special VAE

3. Key Components

Critical Nodes:

DifferentialDiffusion

Feature: Auto-edge blending

Default: No manual adjustment needed

FluxGuidance

Unique: FLUX-specific CFG control

Tip: Keep scale=30 for best results

4. Processing Flow

graph LR
    A[Masked Image] --> B(Aspect Ratio Fix)
    B --> C[Dual Encoding]
    C --> D[Diffusion Process]
    D --> E[Output Comparison]
5. I/O Specifications

Input:

{
    "mask": "Transparent PNG",
    "prompt": "English only",
    "resolution": "Auto-1024px"
}
Output:

Interactive before/after slider

Metadata-preserved output

6. Pro Tips

For perfect results:

Use feather-edged masks

Keep original lighting direction

When troubleshooting:

Color shifts → Verify VAE loading

Artifacts → Enable DifferentialDiffusion
```
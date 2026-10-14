// The depth-estimation Web Worker behind "text behind the horizon". It owns
// transformers.js and the Depth Anything session, so the editor thread stays
// responsive and the model's memory goes away with `worker.terminate()`.
//
// transformers.js is imported from its pinned jsDelivr build rather than
// bundled: onnxruntime-web fetches its own WebAssembly next to the module it
// was loaded from, which a bundled copy breaks, and the app never pays for the
// library unless the user opts in. The model weights come from Hugging Face and
// land in the browser's Cache API ("transformers-cache"), so the one-time
// download is never repeated.

import { DEPTH_MODEL, TRANSFORMERS_URL } from "./horizon-depth";

export interface DepthRequest {
  /** object URL of the (capped) photo — same-origin, so readable in here */
  photoUrl: string;
}

export type DepthResponse =
  | { loaded: number; total: number; type: "progress" }
  | { data: Uint8Array; h: number; type: "done"; w: number }
  | { message: string; type: "error" };

// The slice of the transformers.js API this worker touches.
interface Tensor {
  data: ArrayLike<number>;
  dims: number[];
  div: (v: number) => Tensor;
  item: () => number;
  max: () => Tensor;
  min: () => Tensor;
  mul: (v: number) => Tensor;
  squeeze: () => Tensor;
  sub: (v: number) => Tensor;
  to: (type: string) => Tensor;
}
interface RawImage {
  height: number;
  width: number;
}
type ModelInputs = Record<string, Tensor>;
interface ProgressInfo {
  file?: string;
  loaded?: number;
  status: string;
  total?: number;
}
type DepthModel = (inputs: ModelInputs) => Promise<{ predicted_depth: Tensor }>;
type Processor = (image: RawImage) => Promise<ModelInputs>;
type Device = "wasm" | "webgpu";
interface Transformers {
  AutoModelForDepthEstimation: {
    from_pretrained: (
      id: string,
      opts: {
        device: Device;
        dtype: string;
        progress_callback: (p: ProgressInfo) => void;
      }
    ) => Promise<DepthModel>;
  };
  AutoProcessor: { from_pretrained: (id: string) => Promise<Processor> };
  env: { allowLocalModels: boolean };
  RawImage: { fromURL: (url: string) => Promise<RawImage> };
}
interface Session {
  model: DepthModel;
  processor: Processor;
  tjs: Transformers;
}

const post = (message: DepthResponse, transfer: Transferable[] = []) => {
  self.postMessage(message, { transfer });
};

// Bytes per file, so the progress bar covers every file the model needs.
const progress = new Map<string, { loaded: number; total: number }>();
const onProgress = (p: ProgressInfo) => {
  if (
    p.status !== "progress" ||
    p.file === undefined ||
    p.total === undefined ||
    p.total <= 0
  ) {
    return;
  }
  progress.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
  let loaded = 0;
  let total = 0;
  for (const file of progress.values()) {
    loaded += file.loaded;
    total += file.total;
  }
  post({ loaded, total, type: "progress" });
};

const load = async (device: Device): Promise<Session> => {
  // SAFETY: the pinned transformers.js build exports these members with these
  // shapes; a remote module carries no types of its own.
  // The bundler-ignore magic comments have to sit inside import(), inline.
  /* oxlint-disable eslint/no-inline-comments */
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see SAFETY above
  const tjs = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ TRANSFORMERS_URL
  )) as Transformers;
  /* oxlint-enable eslint/no-inline-comments */
  tjs.env.allowLocalModels = false;
  const [model, processor] = await Promise.all([
    tjs.AutoModelForDepthEstimation.from_pretrained(DEPTH_MODEL.id, {
      device,
      dtype: "q8",
      progress_callback: onProgress,
    }),
    tjs.AutoProcessor.from_pretrained(DEPTH_MODEL.id),
  ]);
  return { model, processor, tjs };
};

/** A GPU adapter is the real test: some browsers expose `navigator.gpu` but
 *  have no adapter to give (headless, blocklisted GPUs). */
const hasGpuAdapter = async (): Promise<boolean> => {
  if (!("gpu" in navigator)) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
};

// WebGPU where the device has a GPU adapter, WebAssembly otherwise — and as
// the fallback when a GPU session can't be created.
const loadBest = async (): Promise<Session> => {
  if (await hasGpuAdapter()) {
    try {
      return await load("webgpu");
    } catch {
      // fall through to WebAssembly
    }
  }
  return await load("wasm");
};

let session: Promise<Session> | null = null;

const estimate = async ({ photoUrl }: DepthRequest): Promise<void> => {
  session ??= loadBest();
  const { model, processor, tjs } = await session;
  const image = await tjs.RawImage.fromURL(photoUrl);
  const inputs = await processor(image);
  const { predicted_depth: predicted } = await model(inputs);
  const depth = predicted.squeeze();
  const min = depth.min().item();
  const max = depth.max().item();
  const out = depth
    .sub(min)
    .div(max - min + 1e-6)
    .mul(255)
    .to("uint8");
  const [h, w] = out.dims.slice(-2);
  const data = new Uint8Array(out.data);
  post({ data, h, type: "done", w }, [data.buffer]);
};

const handle = async (request: DepthRequest): Promise<void> => {
  try {
    await estimate(request);
  } catch (error) {
    session = null;
    post({
      message: error instanceof Error ? error.message : String(error),
      type: "error",
    });
  }
};

self.addEventListener("message", (event: MessageEvent<DepthRequest>) => {
  void handle(event.data);
});

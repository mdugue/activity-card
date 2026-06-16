// The palette-extraction Web Worker. All it does is run node-vibrant's
// prebuilt worker entry: it registers the full pipeline (filter → MMCQ
// quantizer → default generator) inside the worker and listens for jobs
// posted by the main thread's `WorkerPipeline` (see `lib/palette.ts`).
import "node-vibrant/worker.worker";

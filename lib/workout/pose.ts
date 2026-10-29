"use client";

/**
 * Lazy loader for the MediaPipe pose model.
 *
 * The WASM bundle and the model are served from `/public/mediapipe`, so the
 * workout keeps working offline and the first frame does not depend on a CDN.
 * The library is imported dynamically: it is large and has no business in the
 * initial page bundle.
 */

import type { PoseLandmarker, PoseLandmarkerOptions } from "@mediapipe/tasks-vision";

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/pose_landmarker_lite.task";

let pending: Promise<PoseLandmarker> | null = null;

async function create(): Promise<PoseLandmarker> {
  const { FilesetResolver, PoseLandmarker: Landmarker } = await import(
    "@mediapipe/tasks-vision"
  );

  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const options: PoseLandmarkerOptions = {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  try {
    return await Landmarker.createFromOptions(fileset, options);
  } catch {
    // Some GPUs and browsers reject the WebGL delegate. CPU is slower but
    // still comfortably real-time for a single person.
    return await Landmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" },
    });
  }
}

export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!pending) pending = create();
  return pending;
}

export function resetPoseLandmarker(): void {
  pending = null;
}

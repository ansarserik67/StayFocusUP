"use client";

/**
 * Lazy loader for the MediaPipe pose model.
 *
 * The WASM bundle and the model are served from `/public/mediapipe`, so the
 * workout keeps working offline and the first frame does not depend on a CDN.
 * The library is imported dynamically: it is large and has no business in the
 * initial page bundle.
 *
 * Two things matter for stability here:
 *  - a failed load is *not* cached. A cached rejection would leave the workout
 *    permanently broken until a full reload after a single transient GPU or
 *    network hiccup.
 *  - the landmarker owns WASM memory and a WebGL context, so it is closed and
 *    dropped when the workout screen goes away instead of being leaked.
 */

import type { PoseLandmarker, PoseLandmarkerOptions } from "@mediapipe/tasks-vision";

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/pose_landmarker_lite.task";

let instance: PoseLandmarker | null = null;
let pending: Promise<PoseLandmarker> | null = null;
let generation = 0;

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
  if (instance) return Promise.resolve(instance);
  if (pending) return pending;

  const startedAt = generation;
  pending = create()
    .then((landmarker) => {
      // A release happened while the model was still loading: drop it at once
      // instead of resurrecting a landmarker nobody is waiting for any more.
      if (startedAt !== generation) {
        landmarker.close();
        throw new Error("PoseLandmarkerReleased");
      }
      instance = landmarker;
      return landmarker;
    })
    .catch((error: unknown) => {
      // Never cache a rejection — the next attempt starts from scratch.
      pending = null;
      throw error;
    })
    .finally(() => {
      if (startedAt === generation) pending = null;
    });

  return pending;
}

/** True while a landmarker is ready, so a retry can skip the warm-up. */
export function isPoseLandmarkerReady(): boolean {
  return instance !== null;
}

/**
 * Closes the model and frees its WASM/GPU memory. Safe to call when nothing is
 * loaded; the next `loadPoseLandmarker()` rebuilds it.
 */
export function releasePoseLandmarker(): void {
  generation += 1;
  pending = null;
  const current = instance;
  instance = null;
  if (!current) return;
  try {
    current.close();
  } catch {
    /* already disposed by the browser */
  }
}

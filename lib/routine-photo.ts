"use client";

/**
 * Browser half of the routine report check: decode the picked file, measure it
 * and keep a small JPEG only.
 *
 * The stored copy is intentionally shrunk to ~560px at q0.72. A full phone
 * photo as a data URL is several megabytes, and a handful of them would fill
 * the localStorage quota the whole app shares.
 */

import {
  judgeReport,
  metricsFromPixels,
  type ImageMetrics,
  type ReportReason,
} from "@/lib/routine-check";

const ANALYSIS_SIDE = 320;
const SAVED_SIDE = 560;
const SAVED_QUALITY = 0.72;

export interface ReportCheck {
  ok: boolean;
  reasons: ReportReason[];
  metrics: ImageMetrics | null;
  /** Downscaled JPEG data URL, only produced when the check passed. */
  dataUrl: string | null;
}

function drawTo(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, ctx };
}

function scaled(width: number, height: number, max: number) {
  const ratio = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Runs every check on the chosen photo and returns the verdict the UI shows.
 * A rejected photo is never stored, so a wrong shot costs nothing.
 */
export async function checkRoutinePhoto(
  file: File,
  seenHashes: string[],
): Promise<ReportCheck> {
  const fail = (reasons: ReportReason[]): ReportCheck => ({
    ok: false,
    reasons,
    metrics: null,
    dataUrl: null,
  });

  if (!file.type.startsWith("image/")) return fail(["unreadable"]);
  if (file.size === 0) return fail(["unreadable"]);

  let bitmap: ImageBitmap | null = null;
  let element: HTMLImageElement | null = null;
  let objectUrl: string | null = null;

  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
    } else {
      objectUrl = URL.createObjectURL(file);
      element = new Image();
      element.src = objectUrl;
      await element.decode();
    }
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return fail(["unreadable"]);
  }

  const source: CanvasImageSource = bitmap ?? (element as HTMLImageElement);
  const naturalWidth = bitmap?.width ?? element?.naturalWidth ?? 0;
  const naturalHeight = bitmap?.height ?? element?.naturalHeight ?? 0;

  try {
    if (naturalWidth < 2 || naturalHeight < 2) return fail(["unreadable"]);

    const analysis = scaled(naturalWidth, naturalHeight, ANALYSIS_SIDE);
    const canvasSet = drawTo(source, analysis.width, analysis.height);
    if (!canvasSet) return fail(["unreadable"]);

    const imageData = canvasSet.ctx.getImageData(0, 0, analysis.width, analysis.height);
    const metrics = metricsFromPixels(imageData.data, analysis.width, analysis.height);

    const verdict = judgeReport(metrics, {
      seenHashes,
      naturalWidth,
      naturalHeight,
      // `lastModified` is when the file was written; for a camera shot that is
      // the capture time, and 0 means the browser did not tell us.
      fileAgeMs: file.lastModified > 0 ? Date.now() - file.lastModified : null,
    });

    if (!verdict.ok) {
      return { ok: false, reasons: verdict.reasons, metrics, dataUrl: null };
    }

    const saved = scaled(naturalWidth, naturalHeight, SAVED_SIDE);
    const savedSet = drawTo(source, saved.width, saved.height);
    if (!savedSet) return { ok: false, reasons: ["unreadable"], metrics, dataUrl: null };

    return {
      ok: true,
      reasons: [],
      metrics,
      dataUrl: savedSet.canvas.toDataURL("image/jpeg", SAVED_QUALITY),
    };
  } catch {
    return { ok: false, reasons: ["unreadable"], metrics: null, dataUrl: null };
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

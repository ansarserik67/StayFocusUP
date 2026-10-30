/**
 * Automatic verification of a routine photo report.
 *
 * The check is deliberately local: nothing is uploaded, no vision API key is
 * needed, and the verdict is reproducible offline. It answers the only question
 * that matters for the food reward — "is this a fresh, real, usable photo of
 * something, and not a placeholder, a black frame, a screenshot copy or the
 * same picture as yesterday?"
 *
 * Everything here is pure so it can be exercised without a browser.
 */

export type ReportReason =
  | "tooSmall"
  | "blurry"
  | "tooDark"
  | "tooBright"
  | "flat"
  | "duplicate"
  | "stalePhoto"
  | "unreadable";

export interface ImageMetrics {
  width: number;
  height: number;
  /** Mean luma, 0..255. */
  brightness: number;
  /** Standard deviation of luma — how much structure the frame has. */
  contrast: number;
  /** Variance of the Laplacian — how much real detail is in focus. */
  sharpness: number;
  /** 64-bit perceptual hash, hex encoded. */
  hash: string;
}

export interface ReportVerdict {
  ok: boolean;
  reasons: ReportReason[];
}

/** A phone photo is orders of magnitude larger; this only rejects thumbnails. */
export const MIN_SIDE = 320;
/** Photos of a made bed or a sink keep plenty of edge energy. */
export const MIN_SHARPNESS = 26;
export const MIN_BRIGHTNESS = 16;
export const MAX_BRIGHTNESS = 243;
/** A near-uniform frame (blank wall, covered lens, flat colour) has no structure. */
export const MIN_CONTRAST = 7;
/** A reused photo from an earlier report is not new proof. */
export const MAX_PHOTO_AGE_MS = 36 * 60 * 60 * 1000;

/** Rec. 601 luma, the perceptually reasonable grey of a colour pixel. */
function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function toGrey(pixels: Uint8ClampedArray | number[], width: number, height: number): Float32Array {
  const grey = new Float32Array(width * height);
  for (let i = 0, p = 0; i < grey.length; i += 1, p += 4) {
    grey[i] = luma(pixels[p] ?? 0, pixels[p + 1] ?? 0, pixels[p + 2] ?? 0);
  }
  return grey;
}

/**
 * 64-bit average hash: a 9×8 grey grid compared against its own mean.
 * Two shots of the same scene at the same angle hash identically, which is
 * exactly the reuse this is meant to catch.
 */
export function perceptualHash(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
): string {
  if (width < 2 || height < 2) return "0".repeat(16);
  const cols = 9;
  const rows = 8;
  const grey = toGrey(pixels, width, height);
  const cells: number[] = [];

  for (let ry = 0; ry < rows; ry += 1) {
    const y0 = Math.floor((ry * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((ry + 1) * height) / rows));
    for (let rx = 0; rx < cols; rx += 1) {
      const x0 = Math.floor((rx * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((rx + 1) * width) / cols));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          sum += grey[y * width + x];
          count += 1;
        }
      }
      cells.push(count > 0 ? sum / count : 0);
    }
  }

  const mean = cells.reduce((acc, value) => acc + value, 0) / cells.length;
  // 72 bits of the 9×8 grid, hex packed so it is a compact storage value.
  let hash = "";
  for (let i = 0; i < cells.length; i += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4 && i + bit < cells.length; bit += 1) {
      if (cells[i + bit] > mean) nibble |= 1 << (3 - bit);
    }
    hash += nibble.toString(16);
  }
  return hash;
}

/** Every measurable property of a rendered frame, plus its hash. */
export function metricsFromPixels(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
): ImageMetrics | null {
  if (width < 2 || height < 2 || pixels.length < width * height * 4) return null;
  const grey = toGrey(pixels, width, height);

  let sum = 0;
  for (let i = 0; i < grey.length; i += 1) sum += grey[i];
  const brightness = sum / grey.length;

  let variance = 0;
  for (let i = 0; i < grey.length; i += 1) {
    const delta = grey[i] - brightness;
    variance += delta * delta;
  }
  const contrast = Math.sqrt(variance / grey.length);

  // Laplacian edge energy over the interior only; the border has no neighbours.
  let lapSum = 0;
  let lapSquare = 0;
  let lapCount = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const lap =
        4 * grey[index] -
        grey[index - 1] -
        grey[index + 1] -
        grey[index - width] -
        grey[index + width];
      lapSum += lap;
      lapSquare += lap * lap;
      lapCount += 1;
    }
  }
  const lapMean = lapCount > 0 ? lapSum / lapCount : 0;
  const sharpness = lapCount > 0 ? lapSquare / lapCount - lapMean * lapMean : 0;

  return {
    width,
    height,
    brightness,
    contrast,
    sharpness,
    hash: perceptualHash(pixels, width, height),
  };
}

/**
 * The verdict shown to the user. Every failing check becomes a reason, so a
 * rejection always says *why* instead of a generic "try again".
 */
export function judgeReport(
  metrics: ImageMetrics | null,
  context: {
    /** Hashes already submitted for this or earlier reports. */
    seenHashes?: string[];
    /** File age when the browser exposes it; null when unknown. */
    fileAgeMs?: number | null;
    /**
     * Dimensions of the source file. Sharpness and contrast are measured on a
     * downscaled copy (so every photo is compared at the same scale), but the
     * "is this really a photo" test must look at the original pixels.
     */
    naturalWidth?: number;
    naturalHeight?: number;
  } = {},
): ReportVerdict {
  if (!metrics) return { ok: false, reasons: ["tooSmall"] };

  const width = context.naturalWidth ?? metrics.width;
  const height = context.naturalHeight ?? metrics.height;
  const reasons: ReportReason[] = [];
  if (Math.min(width, height) < MIN_SIDE) reasons.push("tooSmall");
  if (metrics.sharpness < MIN_SHARPNESS) reasons.push("blurry");
  if (metrics.brightness < MIN_BRIGHTNESS) reasons.push("tooDark");
  if (metrics.brightness > MAX_BRIGHTNESS) reasons.push("tooBright");
  if (metrics.contrast < MIN_CONTRAST) reasons.push("flat");
  if ((context.seenHashes ?? []).includes(metrics.hash)) reasons.push("duplicate");
  if (typeof context.fileAgeMs === "number" && context.fileAgeMs > MAX_PHOTO_AGE_MS) {
    reasons.push("stalePhoto");
  }

  return { ok: reasons.length === 0, reasons };
}

/** Human readable label for a failed check (Russian-first product copy). */
export function reasonText(reason: ReportReason): string {
  switch (reason) {
    case "tooSmall":
      return "Фото слишком маленькое — нужен снимок с камеры, а не миниатюра.";
    case "blurry":
      return "Фото размытое: не видно, что рутина выполнена. Сними ещё раз, держа телефон ровно.";
    case "tooDark":
      return "Слишком темно — на снимке ничего не разобрать.";
    case "tooBright":
      return "Слишком засвечено — сделай фото без прямого света в кадр.";
    case "flat":
      return "Пустой кадр: однотонная поверхность не подтверждает рутину.";
    case "duplicate":
      return "Это фото уже отправляли. Для подтверждения нужен новый снимок.";
    case "stalePhoto":
      return "Снимок сделан слишком давно. Сфотографируй результат сейчас.";
    case "unreadable":
      return "Не удалось открыть файл. Выбери обычное фото (JPEG или PNG).";
    default:
      return "Фото не прошло проверку.";
  }
}

/**
 * Generates the PWA icon set without image dependencies.
 * Draws a deep-navy rounded square with a mint focus ring and a glowing dot.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;

function hex(value) {
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
}

// Signed-distance helpers in unit coordinates (0..1).
function insideRoundedRect(x, y, radius, inset = 0) {
  const min = inset;
  const max = 1 - inset;
  const r = radius - inset;
  const cx = Math.max(min + r, Math.min(x, max - r));
  const cy = Math.max(min + r, Math.min(y, max - r));
  return Math.hypot(x - cx, y - cy) <= r;
}

function ringAlpha(x, y, cx, cy, radius, thickness) {
  const distance = Math.hypot(x - cx, y - cy);
  return clamp(1 - Math.abs(distance - radius) / thickness);
}

const NAVY = hex("#0B1222");
const NAVY_2 = hex("#13233A");
const MINT = hex("#10B981");
const CYAN = hex("#22D3EE");
const LIGHT = hex("#E9FFF7");

function render(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const safe = maskable ? 0.78 : 0.9;
  const cx = 0.5;
  const cy = 0.5;
  const ringRadius = 0.215 * safe;
  const ringThickness = 0.032 * safe;
  const dotRadius = 0.072 * safe;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      // background rounded square
      const ux = (x + 0.5) / size;
      const uy = (y + 0.5) / size;
      if (insideRoundedRect(ux, uy, 0.23)) {
        const t = clamp((ux + uy) / 2);
        r = mix(NAVY[0], NAVY_2[0], t);
        g = mix(NAVY[1], NAVY_2[1], t);
        b = mix(NAVY[2], NAVY_2[2], t);
        a = 1;

        // ambient glows
        const glowA = clamp(1 - Math.hypot(ux - 0.24, uy - 0.18) / 0.5) ** 2 * 0.45;
        const glowB = clamp(1 - Math.hypot(ux - 0.78, uy - 0.82) / 0.5) ** 2 * 0.38;
        r = mix(r, MINT[0], glowA * 0.55 + glowB * 0.25);
        g = mix(g, MINT[1], glowA * 0.55 + glowB * 0.25);
        b = mix(b, MINT[2], glowA * 0.55 + glowB * 0.25);

        // outer halo
        const halo = clamp(1 - Math.abs(Math.hypot(ux - cx, uy - cy) - ringRadius) / 0.16) * 0.18;
        r = mix(r, CYAN[0], halo);
        g = mix(g, CYAN[1], halo);
        b = mix(b, CYAN[2], halo);

        // focus ring (gradient mint -> cyan)
        const ring = ringAlpha(ux, uy, cx, cy, ringRadius, ringThickness);
        if (ring > 0) {
          const mixT = clamp((uy - (cy - ringRadius)) / (ringRadius * 2));
          r = mix(r, mix(CYAN[0], MINT[0], mixT), ring);
          g = mix(g, mix(CYAN[1], MINT[1], mixT), ring);
          b = mix(b, mix(CYAN[2], MINT[2], mixT), ring);
        }

        // center dot with subtle white core
        const dot = clamp(1 - (Math.hypot(ux - cx, uy - cy) - dotRadius) / 0.008);
        if (dot > 0) {
          r = mix(r, MINT[0], dot);
          g = mix(g, MINT[1], dot);
          b = mix(b, MINT[2], dot);
        }
        const core = clamp(1 - Math.hypot(ux - (cx - 0.012), uy - (cy - 0.012)) / (dotRadius * 0.42));
        if (core > 0) {
          r = mix(r, LIGHT[0], core * 0.85);
          g = mix(g, LIGHT[1], core * 0.85);
          b = mix(b, LIGHT[2], core * 0.85);
        }
      }

      const offset = (y * size + x) * 4;
      rgba[offset] = Math.round(r);
      rgba[offset + 1] = Math.round(g);
      rgba[offset + 2] = Math.round(b);
      rgba[offset + 3] = Math.round(a * 255);
    }
  }

  return encodePng(size, size, rgba);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "icon-192.png"), render(192));
writeFileSync(join(OUT, "icon-512.png"), render(512));
writeFileSync(join(OUT, "maskable-512.png"), render(512, { maskable: true }));
writeFileSync(join(OUT, "apple-touch-icon.png"), render(180));
writeFileSync(join(OUT, "badge-96.png"), render(96));
writeFileSync(join(ROOT, "app", "icon.png"), render(192));
console.log("icons written to public/icons");

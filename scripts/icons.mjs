// Generates the PWA icons as PNG without any image library: a green rounded square with a
// white check mark. Output: apps/web/public/icons/*.png
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BG = [0x0f, 0x51, 0x32]; // #0f5132
const FG = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Distance from point p to segment ab. */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  const dx = ax + t * vx - px, dy = ay + t * vy - py;
  return Math.hypot(dx, dy);
}

function render(size, { maskable }) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = maskable ? 0 : size * 0.06;
  const radius = maskable ? 0 : size * 0.22;
  const inner = size - pad * 2;
  // Check mark geometry in unit space, inset for maskable safe zone (80% circle).
  const s = maskable ? 0.62 : 0.78;
  const cx = size / 2, cy = size / 2;
  const ax = cx - 0.30 * s * size, ay = cy + 0.02 * s * size;
  const bx = cx - 0.08 * s * size, by = cy + 0.26 * s * size;
  const ex = cx + 0.34 * s * size, ey = cy - 0.24 * s * size;
  const stroke = size * 0.085 * (maskable ? 0.9 : 1);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded square coverage
      const lx = x + 0.5 - pad, ly = y + 0.5 - pad;
      let bgAlpha = 1;
      if (lx < 0 || ly < 0 || lx > inner || ly > inner) bgAlpha = 0;
      else if (radius > 0) {
        const qx = Math.max(radius - lx, lx - (inner - radius), 0);
        const qy = Math.max(radius - ly, ly - (inner - radius), 0);
        const d = Math.hypot(qx, qy) - radius;
        bgAlpha = Math.max(0, Math.min(1, 0.5 - d));
      }
      const d = Math.min(segDist(x + 0.5, y + 0.5, ax, ay, bx, by), segDist(x + 0.5, y + 0.5, bx, by, ex, ey));
      const fgAlpha = Math.max(0, Math.min(1, stroke / 2 - d + 0.5)) * bgAlpha;
      const r = FG[0] * fgAlpha + BG[0] * (1 - fgAlpha);
      const g = FG[1] * fgAlpha + BG[1] * (1 - fgAlpha);
      const b = FG[2] * fgAlpha + BG[2] * (1 - fgAlpha);
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = Math.round(bgAlpha * 255);
    }
  }
  return png(size, size, buf);
}

const out = resolve(import.meta.dirname, "..", "apps", "web", "public", "icons");
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, "icon-192.png"), render(192, { maskable: false }));
writeFileSync(resolve(out, "icon-512.png"), render(512, { maskable: false }));
writeFileSync(resolve(out, "icon-maskable-512.png"), render(512, { maskable: true }));
writeFileSync(resolve(out, "apple-touch-icon.png"), render(180, { maskable: true }));
console.log(`wrote icons to ${out}`);

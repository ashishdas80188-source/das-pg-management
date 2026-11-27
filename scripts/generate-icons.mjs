import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function blendPixel(buf, idx, r, g, b, a) {
  if (a <= 0) return;
  const alpha = Math.min(1, a);
  const inv = 1 - alpha;
  buf[idx] = Math.round(r * alpha + buf[idx] * inv);
  buf[idx + 1] = Math.round(g * alpha + buf[idx + 1] * inv);
  buf[idx + 2] = Math.round(b * alpha + buf[idx + 2] * inv);
  buf[idx + 3] = 255;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function drawIcon(size, maskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 512;
  const padScale = maskable ? 0.78 : 1;
  const offset = maskable ? (size * (1 - padScale)) / 2 : 0;

  const mapPt = (x, y) => [x * scale * padScale + offset, y * scale * padScale + offset];

  // Background navy (#0B192C)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Subtle radial depth
      const cx = size / 2;
      const cy = size / 2;
      const d = Math.hypot(x - cx, y - cy) / (size * 0.75);
      const t = Math.max(0, 1 - d);
      buf[idx] = Math.round(11 + t * 8);
      buf[idx + 1] = Math.round(25 + t * 18);
      buf[idx + 2] = Math.round(44 + t * 30);
      buf[idx + 3] = 255;
    }
  }

  // Draw rounded border if non-maskable
  const strokeW = 14 * scale * padScale;
  const [pTopX, pTopY] = mapPt(256, 98);
  const [pLeftX, pLeftY] = mapPt(104, 214);
  const [pBotLX, pBotLY] = mapPt(104, 404);
  const [pBotRX, pBotRY] = mapPt(408, 404);
  const [pRightX, pRightY] = mapPt(408, 214);

  const roofEdges = [
    [pTopX, pTopY, pLeftX, pLeftY],
    [pLeftX, pLeftY, pBotLX, pBotLY],
    [pBotLX, pBotLY, pBotRX, pBotRY],
    [pBotRX, pBotRY, pRightX, pRightY],
    [pRightX, pRightY, pTopX, pTopY],
  ];

  // Fill house interior
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - offset) / (scale * padScale);
      const ny = (y - offset) / (scale * padScale);
      if (nx >= 104 && nx <= 408 && ny <= 404) {
        const roofY = 98 + (Math.abs(nx - 256) / 152) * (214 - 98);
        if (ny >= roofY) {
          const idx = (y * size + x) * 4;
          blendPixel(buf, idx, 19, 43, 74, 0.9);
        }
      }
    }
  }

  // Stroke house outline in Emerald (#10B981)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let minDist = 9999;
      for (const [x1, y1, x2, y2] of roofEdges) {
        minDist = Math.min(minDist, distToSegment(x, y, x1, y1, x2, y2));
      }
      const aa = Math.max(0, Math.min(1, strokeW / 2 + 0.8 - minDist));
      if (aa > 0) {
        blendPixel(buf, (y * size + x) * 4, 16, 185, 129, aa);
      }
    }
  }

  // Draw bold "D" (white) and "P" (emerald) inside house
  const letterStroke = 16 * scale * padScale;
  const [d1x, d1y] = mapPt(176, 246);
  const [d2x, d2y] = mapPt(176, 338);
  const [d3x, d3y] = mapPt(222, 246);
  const [d4x, d4y] = mapPt(222, 338);
  const [dMidX, dMidY] = mapPt(222, 292);
  const dArcR = 46 * scale * padScale;

  const [p1x, p1y] = mapPt(294, 338);
  const [p2x, p2y] = mapPt(294, 246);
  const [p3x, p3y] = mapPt(330, 246);
  const [p4x, p4y] = mapPt(330, 296);
  const [pMidX, pMidY] = mapPt(330, 271);
  const pArcR = 25 * scale * padScale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // D letter segments
      let dDist = Math.min(
        distToSegment(x, y, d1x, d1y, d2x, d2y),
        distToSegment(x, y, d1x, d1y, d3x, d3y),
        distToSegment(x, y, d2x, d2y, d4x, d4y)
      );
      if (x >= dMidX) {
        dDist = Math.min(dDist, Math.abs(Math.hypot(x - dMidX, y - dMidY) - dArcR));
      }
      const daa = Math.max(0, Math.min(1, letterStroke / 2 + 0.8 - dDist));
      if (daa > 0) {
        blendPixel(buf, (y * size + x) * 4, 255, 255, 255, daa);
      }

      // P letter segments
      let pDist = Math.min(
        distToSegment(x, y, p1x, p1y, p2x, p2y),
        distToSegment(x, y, p2x, p2y, p3x, p3y),
        distToSegment(x, y, pMidX - 36 * scale * padScale, p4y, p4x, p4y)
      );
      if (x >= pMidX) {
        pDist = Math.min(pDist, Math.abs(Math.hypot(x - pMidX, y - pMidY) - pArcR));
      }
      const paa = Math.max(0, Math.min(1, letterStroke / 2 + 0.8 - pDist));
      if (paa > 0) {
        blendPixel(buf, (y * size + x) * 4, 16, 185, 129, paa);
      }
    }
  }

  return encodePNG(size, size, buf);
}

const outDir = path.resolve('public/icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512, false));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), drawIcon(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), drawIcon(180, false));
console.log('Generated PWA icons in', outDir);

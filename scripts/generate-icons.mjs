import { writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const sizes = [192, 512];
const palette = {
  bg: [247, 243, 234, 255],
  book: [66, 107, 93, 255],
  page: [255, 253, 248, 255],
  mark: [181, 107, 69, 255],
};

for (const size of sizes) {
  const pixels = new Uint8Array(size * size * 4);
  fillRoundedRect(pixels, size, 0, 0, size, size, size * 0.22, palette.bg);
  fillRoundedRect(pixels, size, size * 0.25, size * 0.23, size * 0.5, size * 0.6, size * 0.055, palette.book);
  fillRoundedRect(pixels, size, size * 0.34, size * 0.32, size * 0.32, size * 0.055, size * 0.02, palette.page);
  fillRoundedRect(pixels, size, size * 0.34, size * 0.42, size * 0.32, size * 0.055, size * 0.02, palette.page);
  fillRoundedRect(pixels, size, size * 0.34, size * 0.52, size * 0.23, size * 0.055, size * 0.02, palette.page);
  fillCircle(pixels, size, size * 0.65, size * 0.67, size * 0.065, palette.mark);
  await writeFile(new URL(`../icons/icon-${size}.png`, import.meta.url), encodePng(pixels, size, size));
}

function fillRoundedRect(pixels, canvasSize, x, y, width, height, radius, color) {
  const left = Math.round(x);
  const top = Math.round(y);
  const right = Math.round(x + width);
  const bottom = Math.round(y + height);
  const r = Math.round(radius);

  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      const dx = Math.max(left + r - px, 0, px - (right - r));
      const dy = Math.max(top + r - py, 0, py - (bottom - r));
      if (dx * dx + dy * dy <= r * r) {
        setPixel(pixels, canvasSize, px, py, color);
      }
    }
  }
}

function fillCircle(pixels, canvasSize, cx, cy, radius, color) {
  const left = Math.round(cx - radius);
  const right = Math.round(cx + radius);
  const top = Math.round(cy - radius);
  const bottom = Math.round(cy + radius);
  const r2 = radius * radius;

  for (let py = top; py <= bottom; py += 1) {
    for (let px = left; px <= right; px += 1) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(pixels, canvasSize, px, py, color);
      }
    }
  }
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function encodePng(pixels, width, height) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    Buffer.from(pixels.subarray(y * width * 4, (y + 1) * width * 4)).copy(scanlines, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([
      uint32(width),
      uint32(height),
      Buffer.from([8, 6, 0, 0, 0]),
    ])),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([
    uint32(data.length),
    typeBuffer,
    data,
    uint32(crc32(Buffer.concat([typeBuffer, data]))),
  ]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

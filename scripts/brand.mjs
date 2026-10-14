/**
 * Brand asset generator — the "Signal M" mark.
 * The M is drawn as a pipeline graph; its final node is the live (mint) output.
 *
 *   node scripts/brand.mjs
 *
 * Writes public/brand/*.svg and the favicon / app-icon set into public/images/.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const INK = '#0a0d0c';
const TILE = '#111715';
const TXT = '#ecefea';
const SIG = '#3df5a7';

/** Primary mark (48-unit grid): hollow graph nodes, mint output node. */
export const markInner = (fg = TXT, bg = INK) => `
  <polyline points="9,39 9,11 24,28 39,11 39,39" fill="none" stroke="${fg}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="9" cy="39" r="3.6" fill="${bg}" stroke="${fg}" stroke-width="2.4"/>
  <circle cx="9" cy="11" r="3.6" fill="${bg}" stroke="${fg}" stroke-width="2.4"/>
  <circle cx="24" cy="28" r="3.6" fill="${bg}" stroke="${fg}" stroke-width="2.4"/>
  <circle cx="39" cy="11" r="3.6" fill="${bg}" stroke="${fg}" stroke-width="2.4"/>
  <circle cx="39" cy="39" r="4.8" fill="${SIG}"/>`;

/** Icon variant for small sizes: tile, heavier strokes, filled nodes. */
const iconInner = `
  <rect width="48" height="48" rx="11" fill="${TILE}"/>
  <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="10.25" fill="none" stroke="${SIG}" stroke-opacity="0.45" stroke-width="1.5"/>
  <polyline points="12,36 12,13 24,27 36,13 36,33" fill="none" stroke="${TXT}" stroke-width="4.6" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="36" cy="36" r="5.4" fill="${SIG}"/>`;

const svg = (inner, size = 48) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}">${inner}</svg>`;

mkdirSync('public/brand', { recursive: true });
mkdirSync('public/images', { recursive: true });

writeFileSync('public/brand/mark.svg', svg(markInner()));
writeFileSync('public/brand/mark-on-light.svg', svg(markInner('#0a0d0c', '#ffffff')));
writeFileSync('public/brand/icon.svg', svg(iconInner));
writeFileSync('public/images/favicon.svg', svg(iconInner));

const png = (size, file) => sharp(Buffer.from(svg(iconInner, size)), { density: 72 * (size / 48) * 2 })
  .resize(size, size)
  .png()
  .toFile(file);

const sizes = [
  [16, 'public/images/favicon-16x16.png'],
  [32, 'public/images/favicon-32x32.png'],
  [180, 'public/images/apple-touch-icon.png'],
  [192, 'public/images/android-chrome-192x192.png'],
  [512, 'public/images/android-chrome-512x512.png'],
];
await Promise.all(sizes.map(([s, f]) => png(s, f)));

// favicon.ico — ICO container with embedded 16/32/48 PNGs.
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) =>
  sharp(Buffer.from(svg(iconInner, s)), { density: 72 * (s / 48) * 2 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((buf, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0);
  e.writeUInt8(icoSizes[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});
writeFileSync('public/images/favicon.ico', Buffer.concat([header, ...entries, ...pngs]));

console.log('brand assets written');

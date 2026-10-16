// Shared look for every profile SVG: a blurred gradient backdrop with slowly
// drifting colour blobs and film grain, plus frosted "glass" panels on top.
// Everything is plain SVG + CSS so it renders inside GitHub's <img> sandbox
// (no scripts, no external requests, no foreignObject).
//
// Typography and colour follow GitHub's own brand system (Primer Brand, as on
// github.com): Mona Sans and Mona Sans Mono, light heading weights with tight
// tracking, a monochrome base with a single green accent, and a blue-violet
// glow. The fonts are OFL subsets in ../fonts/, embedded as data URIs because
// an <img> SVG cannot load fonts from anywhere else.

import { readFileSync } from 'node:fs';

const font = (file) => readFileSync(new URL(`../fonts/${file}`, import.meta.url)).toString('base64');
const FONT_FACES = `
    @font-face { font-family: "Mona Sans"; src: url(data:font/woff2;base64,${font('mona-sans.woff2')}) format("woff2"); font-weight: 400 700; }
    @font-face { font-family: "Mona Sans Mono"; src: url(data:font/woff2;base64,${font('mona-sans-mono.woff2')}) format("woff2"); font-weight: 400 600; }`;

// Advance width of one Mona Sans Mono character, in em.
export const MONO = 0.618;

// GitHub brand weights: headings sit well below bold.
export const WEIGHT = { display: 440, heading: 460, subhead: 500, strong: 560 };

export const PALETTES = {
  dark: {
    base: '#000000', text: '#ffffff', muted: '#a4aea6', accent: '#5fed83', accent2: '#c898fd',
    blobs: ['#5049c2', '#8534f3', '#0d6731'], blobOpacity: 0.34, grain: 0.05,
    glass: '#ffffff', glassOpacity: 0.035, edge: '#ffffff', edgeHi: 0.18, edgeLo: 0.05, sheen: 0.04,
    line: '#ffffff', lineOpacity: 0.1, outline: '#ffffff', outlineOpacity: 0.12,
  },
  light: {
    base: '#ffffff', text: '#000000', muted: '#58635b', accent: '#08872b', accent2: '#8534f3',
    blobs: ['#8c93fb', '#e6b7fe', '#8cf2a6'], blobOpacity: 0.55, grain: 0.04,
    glass: '#ffffff', glassOpacity: 0.6, edge: '#000000', edgeHi: 0.1, edgeLo: 0.07, sheen: 0.3,
    line: '#000000', lineOpacity: 0.08, outline: '#000000', outlineOpacity: 0.1,
  },
};

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function style(extra = '') {
  return `<style>${FONT_FACES}
    text { -webkit-font-smoothing: antialiased; font-feature-settings: "liga" 0; }
    .sans { font-family: "Mona Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
    .mono { font-family: "Mona Sans Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .blob { animation: drift 19s cubic-bezier(.33, 1, .68, 1) infinite alternate; }
    .blob1 { animation-duration: 23s; animation-direction: alternate-reverse; }
    .blob2 { animation-duration: 29s; }
    @keyframes drift { from { transform: translate(0, 0); } to { transform: translate(70px, 26px); } }${extra}
  </style>`;
}

export function defs(p, w, h) {
  return `<filter id="soften" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="56"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <clipPath id="card"><rect width="${w}" height="${h}" rx="24"/></clipPath>
    <linearGradient id="edge" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${p.edge}" stop-opacity="${p.edgeHi}"/>
      <stop offset="1" stop-color="${p.edge}" stop-opacity="${p.edgeLo}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="${p.sheen}"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>`;
}

// blobs: [{ cx, cy, r }], coloured in palette order.
export function backdrop(p, w, h, blobs) {
  const circles = blobs.map((b, i) => `<circle class="blob blob${i % 3}" cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="${p.blobs[i % 3]}"/>`).join('\n      ');
  return `<g clip-path="url(#card)">
    <rect width="${w}" height="${h}" fill="${p.base}"/>
    <g filter="url(#soften)" opacity="${p.blobOpacity}">
      ${circles}
    </g>
    <rect width="${w}" height="${h}" filter="url(#grain)" opacity="${p.grain}"/>
  </g>`;
}

export function outline(p, w, h) {
  return `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="24" fill="none" stroke="${p.outline}" stroke-opacity="${p.outlineOpacity}"/>`;
}

export function panel(p, x, y, w, h, r = 16, attrs = '') {
  return `<g${attrs}>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${p.glass}" fill-opacity="${p.glassOpacity}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#sheen)"/>
    <rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r - 0.5}" fill="none" stroke="url(#edge)"/>
  </g>`;
}

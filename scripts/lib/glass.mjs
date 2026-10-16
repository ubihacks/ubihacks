// Shared look for every profile SVG: a blurred gradient backdrop with slowly
// drifting colour blobs and film grain, plus frosted "glass" panels on top.
// Everything is plain SVG + CSS so it renders inside GitHub's <img> sandbox
// (no scripts, no external fonts, no foreignObject).

export const PALETTES = {
  dark: {
    base: '#05070d', text: '#f0f6fc', muted: '#8b949e', accent: '#58b4ff', accent2: '#b39dfa',
    blobs: ['#2f81f7', '#8b5cf6', '#0ea5b7'], blobOpacity: 0.45, grain: 0.07,
    glass: '#ffffff', glassOpacity: 0.045, edge: '#ffffff', edgeHi: 0.26, edgeLo: 0.04, sheen: 0.07,
    line: '#ffffff', lineOpacity: 0.08, outline: '#ffffff', outlineOpacity: 0.07,
  },
  light: {
    base: '#eef2f8', text: '#0f172a', muted: '#526071', accent: '#2563eb', accent2: '#7c3aed',
    blobs: ['#60a5fa', '#c4b5fd', '#67e8f9'], blobOpacity: 0.75, grain: 0.05,
    glass: '#ffffff', glassOpacity: 0.5, edge: '#ffffff', edgeHi: 1, edgeLo: 0.4, sheen: 0.35,
    line: '#0f172a', lineOpacity: 0.08, outline: '#0f172a', outlineOpacity: 0.09,
  },
};

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function style(extra = '') {
  return `<style>
    .sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif; }
    .mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
    .blob { animation: drift 19s ease-in-out infinite alternate; }
    .blob1 { animation-duration: 23s; animation-direction: alternate-reverse; }
    .blob2 { animation-duration: 29s; }
    @keyframes drift { from { transform: translate(0, 0); } to { transform: translate(70px, 26px); } }${extra}
  </style>`;
}

export function defs(p, w, h) {
  return `<filter id="soften" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="56"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <clipPath id="card"><rect width="${w}" height="${h}" rx="18"/></clipPath>
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
  return `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="18" fill="none" stroke="${p.outline}" stroke-opacity="${p.outlineOpacity}"/>`;
}

export function panel(p, x, y, w, h, r = 14, attrs = '') {
  return `<g${attrs}>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${p.glass}" fill-opacity="${p.glassOpacity}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#sheen)"/>
    <rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r - 0.5}" fill="none" stroke="url(#edge)"/>
  </g>`;
}

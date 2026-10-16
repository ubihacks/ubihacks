// Builds the static profile SVGs in assets/ (header and pillars, light and dark).
// Run locally after editing copy or styling:  node scripts/build-assets.mjs
//
// The header combines three effects, all precomputed here so the SVGs need no
// scripts at render time:
//   - glass terminal window over a drifting, blurred gradient backdrop
//   - a typed tagline that cycles through PHRASES (SMIL, discrete steps)
//   - an ASCII delivery loop, its comet rendered frame by frame (CSS, stepped opacity)

import { mkdir, writeFile } from 'node:fs/promises';
import { PALETTES, MONO, WEIGHT, esc, style, defs, backdrop, outline, panel } from './lib/glass.mjs';

const OUT_DIR = new URL('../assets/', import.meta.url);

const PHRASES = [
  'building systems that scale',
  'shipping cloud platforms on Azure',
  'bringing AI into how we build software',
  'removing friction from real workflows',
  'making products people can rely on',
];

const PILLARS = [
  ['01 · BUILD', 'Full-stack systems', 'Clean architecture, built', 'to scale and stay simple.'],
  ['02 · CLOUD', 'Cloud platforms', 'Azure infrastructure, IaC', 'and secure deployments.'],
  ['03 · AUTOMATION', 'Ship faster', 'CI/CD pipelines that cut', 'friction and reduce risk.'],
  ['04 · AI', 'Agentic AI', 'Agent workflows and local', 'LLMs that reason securely.'],
];

// Header chips: what I am, then how I design systems.
const CHIPS = [
  [['Microsoft Azure certified', 'lit'], ['Agentic AI', 'lit'], ['LLM orchestration', 'lit']],
  [['Cloud-native', 'arch'], ['IaC', 'arch'], ['CI/CD', 'arch'], ['Full-stack', 'arch'], ['Secure by design', 'arch']],
];

// One SVG button per link, since a single <img> can only carry one href.
// Keep in sync with the hrefs in README.md.
const LINKS = [
  { key: 'linkedin', label: 'LinkedIn', handle: 'in/ubihacks' },
  { key: 'instagram', label: 'Instagram', handle: '@ubihacks' },
  { key: 'email', label: 'Email', handle: 'ubaidifti@gmail.com' },
];

const reducedMotion =(rules) => `
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } ${rules} }`;

// ---------- delivery loop ----------

// How a product gets better: an ASCII comet circles the loop, lighting each
// stage as it arrives while the centre explains what happens there.
// [stage, what we do, why]
const LOOP = [
  ['discover', 'talk to users', 'find the friction'],
  ['design', 'shape the fix', 'keep it simple'],
  ['build', 'small, safe PRs', 'tests + AI review'],
  ['ship', 'ship with CI/CD', 'zero downtime'],
  ['learn', 'measure impact', 'feed the next loop'],
];

// Comet head first, fading to the ring's own dot.
const TRAIL = ['@', '#', '*', '+', ':', '·'];

function deliveryLoop(p, { cx, cy, rx, ry, perStage = 14, frameMs = 100 }) {
  const n = LOOP.length;
  const points = n * perStage;
  const period = (points * frameMs) / 1000;
  const fs = 13;
  // Clockwise from 12 o'clock; nudge glyphs down so they centre on the ring.
  const pt = (k) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / points;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  };
  const xy = ([x, y]) => `x="${x.toFixed(1)}" y="${(y + fs * 0.34).toFixed(1)}"`;

  // Static ring, with a gap around each stage node.
  const ring = Array.from({ length: points }, (_, k) => k)
    .filter((k) => Math.min(k % perStage, perStage - (k % perStage)) > 1)
    .map((k) => `<tspan ${xy(pt(k))}>·</tspan>`).join('');

  // One frame per ring point; each shows the comet with its trail behind it.
  const frames = Array.from({ length: points }, (_, f) => {
    const tspans = TRAIL.map((ch, t) => `<tspan ${xy(pt((f - t + points) % points))} fill-opacity="${(1 - t / TRAIL.length).toFixed(2)}">${esc(ch)}</tspan>`).join('');
    const delay = ((f * frameMs) / 1000 - period).toFixed(3);
    return `<text class="f${f === 0 ? ' f0' : ''}" style="animation-delay:${delay}s">${tspans}</text>`;
  });

  // Stages light up as the comet reaches them and stay lit until the loop restarts.
  const at = (i) => (100 * i) / n;
  const stageCss = LOOP.map((_, i) => `
    .s${i} { animation: s${i} ${period}s linear infinite; }
    @keyframes s${i} { ${i === 0 ? '0%, 96% { opacity: 1; }' : `0%, ${(at(i) - 0.01).toFixed(2)}% { opacity: 0; } ${at(i)}%, 96% { opacity: 1; }`} 99%, 100% { opacity: 0; } }`).join('');
  const stages = LOOP.map(([name], i) => {
    const [x, y] = pt(i * perStage);
    const dx = x - cx;
    const side = Math.abs(dx) > rx * 0.7;
    // Top/bottom labels sit above/below the node, side labels beside it.
    const [lx, ly, anchor] = side
      ? [x + Math.sign(dx) * 10, y + 3.5, dx > 0 ? 'start' : 'end']
      : [x, y < cy ? y - 10 : y + 17, 'middle'];
    const label = (cls, fill) => `<text class="mono${cls}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9.5" letter-spacing="0.5" fill="${fill}" text-anchor="${anchor}">${esc(name)}</text>`;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="none" stroke="${p.muted}" stroke-opacity="0.6"/>
    <circle class="s${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${p.accent}"/>
    ${label('', p.muted)}
    ${label(` s${i}`, p.accent)}`;
  }).join('\n    ');

  // Centre: what happens at the current stage, swapped as each one lights.
  const actCss = LOOP.map((_, i) => {
    const [s, e] = [at(i), at(i + 1)];
    return `
    .a${i} { opacity: 0; animation: a${i} ${period}s ease-out infinite; }
    @keyframes a${i} { 0%, ${s}% { opacity: 0; transform: translateY(3px); } ${s + 3}%, ${e - 2}% { opacity: 1; transform: none; } ${e}%, 100% { opacity: 0; } }`;
  }).join('');
  const acts = LOOP.map(([, what, why], i) => `<g class="a${i}">
      <text x="${cx}" y="${cy - 12}" class="mono" font-size="8.5" letter-spacing="1.5" fill="${p.accent}" text-anchor="middle">${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</text>
      <text x="${cx}" y="${cy + 5}" class="sans" font-size="13" font-weight="${WEIGHT.strong}" fill="${p.text}" text-anchor="middle">${esc(what)}</text>
      <text x="${cx}" y="${cy + 19}" class="mono" font-size="8.5" fill="${p.muted}" text-anchor="middle">${esc(why)}</text>
    </g>`).join('\n    ');

  const css = `
    .ring { font-size: ${fs}px; }
    .f { opacity: 0; animation: frame ${period}s steps(1, end) infinite; }
    @keyframes frame { 0% { opacity: 1; } ${(100 / points).toFixed(3)}% { opacity: 0; } 100% { opacity: 0; } }${stageCss}${actCss}`;
  const svg = `<g class="mono ring" text-anchor="middle">
      <text fill="${p.muted}" fill-opacity="0.6">${ring}</text>
      <g fill="url(#asciiInk)">
      ${frames.join('\n      ')}
      </g>
    </g>
    ${stages}
    ${acts}`;
  return { css, svg, aria: `Product delivery loop, repeated: ${LOOP.map(([s, w, y]) => `${s}, ${w}, ${y}`).join('; ')}.` };
}

// ---------- typing ----------

function typing(p, { x, y, fontSize, typeMs = 55, holdMs = 1900, deleteMs = 24, gapMs = 380 }) {
  const charW = fontSize * MONO;
  // Timeline of [ms, activePhrase, visibleChars].
  const events = [];
  let now = 0;
  PHRASES.forEach((phrase, pi) => {
    for (let n = 1; n <= phrase.length; n++) {
      now += typeMs;
      events.push([now, pi, n]);
    }
    now += holdMs;
    for (let n = phrase.length - 1; n >= 0; n--) {
      now += deleteMs;
      events.push([now, pi, n]);
    }
    now += gapMs;
  });
  const total = now;
  events.unshift([0, 0, 0]);
  const keyTimes = events.map(([t]) => (t / total).toFixed(5)).join(';');
  const dur = `${(total / 1000).toFixed(2)}s`;
  const anim = (attr, values) =>
    `<animate attributeName="${attr}" dur="${dur}" repeatCount="indefinite" calcMode="discrete" keyTimes="${keyTimes}" values="${values.join(';')}"/>`;

  const lines = PHRASES.map((phrase, pi) => {
    const widths = events.map(([, a, n]) => (a === pi ? (n * charW).toFixed(2) : 0));
    return `<clipPath id="type${pi}"><rect x="${x}" y="${y - fontSize - 4}" width="0" height="${fontSize + 10}">${anim('width', widths)}</rect></clipPath>
    <text x="${x}" y="${y}" clip-path="url(#type${pi})" class="mono" font-size="${fontSize}" fill="${p.text}" textLength="${(phrase.length * charW).toFixed(2)}" lengthAdjust="spacing">${esc(phrase)}</text>`;
  });
  const cursorX = events.map(([, , n]) => (x + n * charW + 1).toFixed(2));
  const cursor = `<rect class="cursor" x="${x + 1}" y="${y - fontSize + 2}" width="${(charW * 0.9).toFixed(1)}" height="${fontSize + 2}" rx="1.5" fill="${p.accent}">${anim('x', cursorX)}</rect>`;
  const css = `
    .cursor { animation: blink 1.05s steps(1, end) infinite; }
    @keyframes blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0.15; } }`;
  return { css, svg: `${lines.join('\n    ')}\n    ${cursor}` };
}

// ---------- header ----------

function header(p) {
  const W = 900;
  const H = 356;
  const loop = deliveryLoop(p, { cx: 736, cy: 190, rx: 66, ry: 58 });
  const typed = typing(p, { x: 66, y: 214, fontSize: 16 });

  const dot = { lit: [p.accent, 1], arch: [p.accent2, 0.85] };
  const chipSvg = CHIPS.map((row, ri) => {
    const y = 250 + ri * 38;
    let cx = 44;
    return row.map(([label, kind]) => {
      const w = Math.round(label.length * 11 * MONO + 34);
      const [fill, op] = dot[kind] ?? [p.muted, 0.6];
      const g = `${panel(p, cx, y, w, 28, 14)}
    <circle cx="${cx + 14}" cy="${y + 14}" r="3" fill="${fill}" fill-opacity="${op}"/>
    <text x="${cx + 24}" y="${y + 18}" class="mono" font-size="11" fill="${kind === 'arch' ? p.text : p.muted}" fill-opacity="${kind === 'arch' ? 0.82 : 1}" textLength="${(label.length * 11 * MONO).toFixed(1)}" lengthAdjust="spacing">${esc(label)}</text>`;
      cx += w + 10;
      return g;
    }).join('\n    ');
  }).join('\n    ');
  const chipAria = CHIPS.flat().map(([l]) => l).join(', ');

  const css = `${loop.css}${typed.css}${reducedMotion('.f0, .a0 { opacity: 1; }')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ubaid Iftikhar, Senior Software Engineer and Cloud Engineer. ${esc(PHRASES.join('. '))}. ${esc(chipAria)}. ${esc(loop.aria)}">
  ${style(css)}
  <defs>
    ${defs(p, W, H)}
    <linearGradient id="asciiInk" gradientUnits="userSpaceOnUse" x1="620" y1="110" x2="850" y2="310">
      <stop offset="0" stop-color="${p.accent}"/>
      <stop offset="1" stop-color="${p.accent2}"/>
    </linearGradient>
  </defs>

  ${backdrop(p, W, H, [{ cx: 160, cy: 40, r: 150 }, { cx: 780, cy: 300, r: 170 }, { cx: 560, cy: 20, r: 110 }])}

  ${panel(p, 16, 16, W - 32, H - 32, 16)}

  <!-- window chrome -->
  <circle cx="40" cy="42" r="5" fill="#ff5f57"/>
  <circle cx="58" cy="42" r="5" fill="#febc2e"/>
  <circle cx="76" cy="42" r="5" fill="#28c840"/>
  <text x="${W / 2}" y="46" class="mono" font-size="11" fill="${p.muted}" text-anchor="middle">ubihacks@cloud: ~/profile</text>
  <rect x="17" y="66" width="${W - 34}" height="1" fill="${p.line}" fill-opacity="${p.lineOpacity}"/>

  <!-- identity -->
  <text x="44" y="108" class="mono" font-size="11" letter-spacing="1.2" fill="${p.accent}">SENIOR SOFTWARE ENGINEER  /  CLOUD ENGINEER</text>
  <text x="42" y="166" class="sans" font-size="56" font-weight="${WEIGHT.display}" letter-spacing="-1.96" fill="${p.text}">Ubaid Iftikhar</text>
  <text x="44" y="214" class="mono" font-size="16" fill="${p.accent}">$</text>
    ${typed.svg}
    ${chipSvg}

  <!-- delivery loop -->
  ${panel(p, 608, 86, 256, 230, 16)}
  <text x="622" y="304" class="mono" font-size="9" letter-spacing="1" fill="${p.muted}" fill-opacity="0.8">~/ship.loop</text>
  <text x="850" y="304" class="mono" font-size="9" letter-spacing="1" fill="${p.accent}" fill-opacity="0.8" text-anchor="end">↻ repeat</text>
  ${loop.svg}

  ${outline(p, W, H)}
</svg>
`;
}

// ---------- pillars ----------

function pillars(p) {
  const W = 900;
  const H = 196;
  const gap = 12;
  const cardW = (W - 32 - gap * 3) / 4;
  const cards = PILLARS.map(([label, title, l1, l2], i) => {
    const x = 16 + i * (cardW + gap);
    return `<g class="rise" style="animation-delay:${(0.12 * i).toFixed(2)}s">
    ${panel(p, x, 16, cardW, H - 32, 16)}
    <text x="${x + 20}" y="52" class="mono" font-size="11" letter-spacing="1.2" fill="${p.accent}">${esc(label)}</text>
    <rect x="${x + 20}" y="64" width="22" height="2" rx="1" fill="${p.accent2}" fill-opacity="0.8"/>
    <text x="${x + 20}" y="98" class="sans" font-size="18" font-weight="${WEIGHT.subhead}" fill="${p.text}">${esc(title)}</text>
    <text x="${x + 20}" y="128" class="sans" font-size="12.5" fill="${p.muted}">${esc(l1)}</text>
    <text x="${x + 20}" y="148" class="sans" font-size="12.5" fill="${p.muted}">${esc(l2)}</text>
  </g>`;
  });
  const aria = PILLARS.map(([label, title, l1, l2]) => `${label.replace(' · ', ' ')}: ${title}. ${l1} ${l2}`).join(' ');
  const css = `
    .rise { animation: rise 0.9s cubic-bezier(.2,.7,.2,1) backwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } }${reducedMotion('')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
  ${style(css)}
  <defs>
    ${defs(p, W, H)}
  </defs>

  ${backdrop(p, W, H, [{ cx: 120, cy: 180, r: 130 }, { cx: 520, cy: 10, r: 140 }, { cx: 840, cy: 160, r: 120 }])}

  ${cards.join('\n  ')}

  ${outline(p, W, H)}
</svg>
`;
}

// ---------- adoption ----------

// AI adoption card: AI being brought into a large, established codebase. A spark
// travels the delivery lifecycle, lighting each stage, and the outcomes fill in.
// One shared PERIOD keeps the pipeline and outcomes on the same beat.
const ADOPTION_STAGES = [['Plan', 'spec drafts'], ['Code', 'pair coding'], ['Review', 'PR checks'], ['Test', 'test generation'], ['Release', 'release notes']];
const ADOPTION_OUTCOMES = ['Ship faster', 'Safer changes', 'Better for users'];
const ADOPTION_CHIPS = ['Secure by design', 'Structured rollout', 'Human in the loop', 'Built for end users'];
const SPARKLE = 'M0 -8 C1 -2 2 -1 8 0 C2 1 1 2 0 8 C-1 2 -2 1 -8 0 C-2 -1 -1 -2 0 -8Z';

function adoption(p) {
  const W = 900;
  const H = 300;
  const PERIOD = 6;
  const top = 100;
  const cardH = 140;
  const box = 'transform-box: fill-box; transform-origin: center;';
  const left = 'transform-box: fill-box; transform-origin: left;';

  // Codebase: a dense grid of modules; some light up as AI starts touching them.
  const COLS = 12;
  const ROWS = 7;
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = 50 + c * 12;
      const y = top + 18 + r * 9;
      cells.push(`<rect x="${x}" y="${y}" width="9" height="5" rx="1.5" fill="${p.muted}" fill-opacity="0.28"/>`);
      // Deterministic scatter so rebuilds do not churn the SVG.
      const h = (r * 7 + c * 13) % 11;
      if (h < 3) {
        cells.push(`<rect class="tw" style="animation-delay:${((r * 0.37 + c * 0.23) % 3).toFixed(2)}s" x="${x}" y="${y}" width="9" height="5" rx="1.5" fill="${h === 0 ? p.accent2 : p.accent}"/>`);
      }
    }
  }

  // Pipeline: five stages, a sparkle travels across and lights each one.
  const px = [0, 1, 2, 3, 4].map((i) => 312 + i * 78);
  const py = top + 40;
  const start = 6;
  const end = 80;
  const at = px.map((_, i) => start + ((end - start) * i) / (px.length - 1));
  const stageCss = ADOPTION_STAGES.map((_, i) => `
    .n${i} { animation: n${i} ${PERIOD}s linear infinite; }
    @keyframes n${i} { 0%, ${(at[i] - 0.1).toFixed(1)}% { opacity: 0; } ${at[i].toFixed(1)}%, 92% { opacity: 1; } 97%, 100% { opacity: 0; } }`).join('');
  const stages = ADOPTION_STAGES.map(([name, hint], i) => `<circle cx="${px[i]}" cy="${py}" r="7" fill="none" stroke="${p.muted}" stroke-opacity="0.5"/>
    <circle class="n${i}" cx="${px[i]}" cy="${py}" r="7" fill="${p.accent}"/>
    <text x="${px[i]}" y="${py + 24}" class="sans" font-size="11" font-weight="${WEIGHT.strong}" fill="${p.text}" text-anchor="middle">${esc(name)}</text>
    <text x="${px[i]}" y="${py + 38}" class="mono" font-size="8" fill="${p.muted}" text-anchor="middle">${esc(hint)}</text>`).join('\n    ');
  const span = px[px.length - 1] - px[0];
  const pipeline = `<rect x="${px[0]}" y="${py - 1}" width="${span}" height="2" rx="1" fill="${p.muted}" fill-opacity="0.3"/>
    <rect class="trail" x="${px[0]}" y="${py - 1}" width="${span}" height="2" rx="1" fill="url(#aiInk)"/>
    ${stages}
    <g transform="translate(${px[0]} ${py - 20})"><g class="spark">
      <circle r="9" fill="${p.accent2}" fill-opacity="0.25"/>
      <path d="${SPARKLE}" transform="scale(0.85)" fill="url(#aiInk)"/>
    </g></g>`;

  // Outcomes: each bar fills once the spark reaches the end of the pipeline.
  const ox = 676;
  const outcomes = ADOPTION_OUTCOMES.map((label, k) => {
    const y = top + 30 + k * 24;
    return `<circle cx="${ox + 24}" cy="${y - 4}" r="3" fill="${k === 2 ? p.accent2 : p.accent}"/>
    <text x="${ox + 34}" y="${y}" class="sans" font-size="11" fill="${p.text}">${esc(label)}</text>
    <rect x="${ox + 128}" y="${y - 6}" width="44" height="4" rx="2" fill="${p.muted}" fill-opacity="0.3"/>
    <rect class="o${k}" x="${ox + 128}" y="${y - 6}" width="44" height="4" rx="2" fill="url(#aiInk)"/>`;
  }).join('\n    ');
  const outcomeCss = ADOPTION_OUTCOMES.map((_, k) => {
    const a = end + 2 + k * 3;
    return `
    .o${k} { ${left} animation: o${k} ${PERIOD}s ease-out infinite; }
    @keyframes o${k} { 0%, ${a - 4}% { transform: scaleX(0); } ${a}%, 92% { transform: scaleX(1); } 97%, 100% { transform: scaleX(0); } }`;
  }).join('');

  const captions = [
    [32, 'Large codebase', 'established, pre-AI'],
    [272, 'AI across the delivery lifecycle', 'structured, reviewed, secure'],
    [676, 'Outcomes', 'team and end users'],
  ];
  const panels = [[32, 180], [272, 392], [676, 190]].map(([x, w]) => panel(p, x, top, w, cardH, 16)).join('\n  ');
  const captionSvg = captions.map(([x, title, sub]) => `<text x="${x + 20}" y="${top + cardH - 26}" class="sans" font-size="14" font-weight="${WEIGHT.subhead}" fill="${p.text}">${esc(title)}</text>
  <text x="${x + 20}" y="${top + cardH - 11}" class="mono" font-size="9.5" fill="${p.muted}">${esc(sub)}</text>`).join('\n  ');

  let chipX = 32;
  const chips = ADOPTION_CHIPS.map((label, i) => {
    const w = Math.round(label.length * 11 * MONO + 34);
    const g = `${panel(p, chipX, 254, w, 28, 14)}
    <circle class="glow" style="animation-delay:${(0.5 * i).toFixed(1)}s" cx="${chipX + 14}" cy="268" r="3" fill="${i % 2 ? p.accent2 : p.accent}"/>
    <text x="${chipX + 24}" y="272" class="mono" font-size="11" fill="${p.text}" fill-opacity="0.82" textLength="${(label.length * 11 * MONO).toFixed(1)}" lengthAdjust="spacing">${esc(label)}</text>`;
    chipX += w + 10;
    return g;
  }).join('\n  ');

  const css = `
    .tw { animation: tw 3s ease-in-out infinite backwards; }
    @keyframes tw { 0%, 100% { opacity: 0; } 50% { opacity: 0.9; } }
    .flow { animation: flow 0.9s linear infinite; }
    @keyframes flow { to { stroke-dashoffset: -16; } }
    .spark { animation: spark ${PERIOD}s cubic-bezier(.45,0,.55,1) infinite; }
    @keyframes spark { 0% { transform: translateX(0); opacity: 0; } ${start}% { transform: translateX(0); opacity: 1; } ${end}% { transform: translateX(${span}px); opacity: 1; } 90% { transform: translateX(${span}px); opacity: 0; } 100% { transform: translateX(0); opacity: 0; } }
    .trail { ${left} animation: trail ${PERIOD}s cubic-bezier(.45,0,.55,1) infinite; }
    @keyframes trail { 0%, ${start}% { transform: scaleX(0); } ${end}%, 92% { transform: scaleX(1); } 97%, 100% { transform: scaleX(0); } }${stageCss}${outcomeCss}
    .glow { ${box} animation: glow 2.4s ease-in-out infinite; }
    @keyframes glow { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.5); opacity: 1; } }${reducedMotion('.tw, .spark { display: none; }')}`;

  const aria = `Bringing AI into a large, established codebase that was not using it, securely and in a structured way. AI across the delivery lifecycle: ${ADOPTION_STAGES.map(([n, h]) => `${n} (${h})`).join(', ')}. Outcomes: ${ADOPTION_OUTCOMES.join(', ')}. ${ADOPTION_CHIPS.join('. ')}.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
  ${style(css)}
  <defs>
    ${defs(p, W, H)}
    <linearGradient id="aiInk" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${p.accent}"/>
      <stop offset="1" stop-color="${p.accent2}"/>
    </linearGradient>
  </defs>

  ${backdrop(p, W, H, [{ cx: 140, cy: 260, r: 140 }, { cx: 560, cy: 40, r: 150 }, { cx: 820, cy: 240, r: 130 }])}

  <text x="34" y="44" class="mono" font-size="11" letter-spacing="1.2" fill="${p.accent}">AI ADOPTION</text>
  <text x="32" y="76" class="sans" font-size="24" font-weight="${WEIGHT.heading}" letter-spacing="-0.6" fill="${p.text}">Bringing AI into a large codebase, securely and by design</text>

  ${panels}
  ${cells.join('\n  ')}

  <path class="flow" d="M220 ${top + cardH / 2 - 30} H262" fill="none" stroke="${p.accent}" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>
  <path d="M256 ${top + cardH / 2 - 35} L262 ${top + cardH / 2 - 30} L256 ${top + cardH / 2 - 25}" fill="none" stroke="${p.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${pipeline}
    ${outcomes}
  ${captionSvg}

  ${chips}

  ${outline(p, W, H)}
</svg>
`;
}

// ---------- link buttons ----------

const X_GLYPH = 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z';

// A 36px brand tile with its glyph drawn from primitives, at (x, y), scaled by s.
function linkIcon(p, key, x0, y0, s = 1) {
  return `<g transform="translate(${x0} ${y0}) scale(${s})">${linkGlyph(p, key, 0, 0)}</g>`;
}

function linkGlyph(p, key, x, y) {
  const tile = (fill) => `<rect x="${x}" y="${y}" width="36" height="36" rx="10" fill="${fill}"/>`;
  const ink = 'fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round"';
  switch (key) {
    case 'linkedin':
      return `${tile('#0a66c2')}
    <text x="${x + 18}" y="${y + 25}" class="sans" font-size="19" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">in</text>`;
    case 'x':
      return `${tile(p.text)}
    <path d="${X_GLYPH}" transform="translate(${x + 10} ${y + 10}) scale(0.667)" fill="${p.base}"/>`;
    case 'instagram':
      return `${tile('url(#insta)')}
    <rect x="${x + 9}" y="${y + 9}" width="18" height="18" rx="5.5" ${ink} stroke-width="1.8"/>
    <circle cx="${x + 18}" cy="${y + 18}" r="4.2" ${ink} stroke-width="1.8"/>
    <circle cx="${x + 23.3}" cy="${y + 12.7}" r="1.2" fill="#ffffff"/>`;
    case 'email':
      return `${tile('url(#mail)')}
    <rect x="${x + 8.5}" y="${y + 11.5}" width="19" height="13" rx="2.5" ${ink} stroke-width="1.7"/>
    <path d="M${x + 9.5} ${y + 13} L${x + 18} ${y + 19.2} L${x + 26.5} ${y + 13}" ${ink} stroke-width="1.7"/>`;
  }
}

// The buttons sit side by side at equal % widths, so together they span the
// same 900px as the header and pillars. Each SVG is a 900/n slice of that row
// holding a smaller card, offset like justify-content: space-between: first
// flush left, last flush right, equal gaps between. MY adds room above/below.
const LINK_W = 220;
const LINK_H = 48;
const LINK_MY = 10;

function linkButton(p, { key, label, handle }, i, n) {
  const ROW = 900;
  const SW = ROW / n;
  const SH = LINK_H + LINK_MY * 2;
  const W = LINK_W;
  const H = LINK_H;
  const ox = n > 1 ? (i * (SW - W)) / (n - 1) : 0;
  const css = `
    .sweep { animation: sweep 9s cubic-bezier(.4,0,.2,1) infinite; animation-delay: ${(0.6 * i).toFixed(1)}s; }
    @keyframes sweep { 0% { transform: translateX(0); } 22%, 100% { transform: translateX(${W + 140}px); } }${reducedMotion('.sweep { display: none; }')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="${esc(`${label}: ${handle}`)}">
  ${style(css)}
  <defs>
    ${defs(p, W, H)}
    <linearGradient id="insta" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#feda75"/><stop offset="0.3" stop-color="#fa7e1e"/>
      <stop offset="0.6" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/>
    </linearGradient>
    <linearGradient id="mail" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent2}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="${Math.min(0.5, p.sheen * 2)}"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <g transform="translate(${ox} ${LINK_MY})">
  ${backdrop(p, W, H, [{ cx: 20 + i * 40, cy: 0, r: 60 }, { cx: W - 30, cy: H, r: 70 }])}
  ${panel(p, 0, 0, W, H, 24)}

  <g clip-path="url(#card)"><rect class="sweep" x="-100" y="-10" width="44" height="${H + 20}" fill="url(#shine)" transform="skewX(-20)"/></g>

  ${linkIcon(p, key, 10, 10, 28 / 36)}
  <text x="48" y="22" class="sans" font-size="13" font-weight="${WEIGHT.subhead}" fill="${p.text}">${esc(label)}</text>
  <text x="48" y="36" class="mono" font-size="10" fill="${p.muted}">${esc(handle)}</text>
  <path d="M${W - 20} 20 L${W - 14} 14 M${W - 19} 14 H${W - 14} V${19}" fill="none" stroke="${p.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

  ${outline(p, W, H)}
  </g>
</svg>
`;
}

await mkdir(OUT_DIR, { recursive: true });
for (const [name, p] of Object.entries(PALETTES)) {
  await writeFile(new URL(`header-${name}.svg`, OUT_DIR), header(p));
  await writeFile(new URL(`pillars-${name}.svg`, OUT_DIR), pillars(p));
  await writeFile(new URL(`adoption-${name}.svg`, OUT_DIR), adoption(p));
  for (const [i, link] of LINKS.entries()) {
    await writeFile(new URL(`link-${link.key}-${name}.svg`, OUT_DIR), linkButton(p, link, i, LINKS.length));
  }
}
console.log('Wrote header, pillars, adoption and link SVGs to assets/');

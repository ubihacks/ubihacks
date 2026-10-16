// Renders the live profile cards (GitHub activity and WakaTime coding time)
// as light and dark SVGs. Run by .github/workflows/profile-cards.yml.
//
//   GITHUB_TOKEN      required, used for the GitHub GraphQL API
//   WAKATIME_API_KEY  optional, without it the coding-time card shows a placeholder
//   GH_LOGIN          GitHub username (default: ubihacks)
//   OUT_DIR           output directory (default: dist)

import { mkdir, writeFile } from 'node:fs/promises';
import { PALETTES, esc, style, defs, backdrop, outline, panel } from './lib/glass.mjs';

const LOGIN = process.env.GH_LOGIN || 'ubihacks';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const WAKATIME_API_KEY = process.env.WAKATIME_API_KEY;
const OUT_DIR = process.env.OUT_DIR || 'dist';

const WIDTH = 900;
const HEIGHT = 300;

const THEMES = {
  dark: {
    ...PALETTES.dark, track: '#1a212c',
    levels: ['#1a212c', '#0c2d4a', '#11568f', '#2a86d6', '#6cc0ff'],
  },
  light: {
    ...PALETTES.light, track: '#e2e8f0',
    levels: ['#e2e8f0', '#c6e2ff', '#79b8ff', '#2f81f7', '#0a4fa3'],
  },
};

const LEVEL_INDEX = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const fmtNumber = (n) => n.toLocaleString('en-US');
const fmtDate = (d, opts) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });

// ---------- data ----------

async function fetchContributions() {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set');
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-cards' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data.user.contributionsCollection.contributionCalendar;
}

async function fetchWakaTime() {
  const res = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
    headers: { Authorization: `Basic ${Buffer.from(WAKATIME_API_KEY).toString('base64')}` },
  });
  if (!res.ok) throw new Error(`WakaTime API responded ${res.status}`);
  return (await res.json()).data;
}

// ---------- shared pieces ----------

function frame(t, label, aria, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${esc(aria)}">
  ${style('\n    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }')}
  <defs>
    ${defs(t, WIDTH, HEIGHT)}
  </defs>
  ${backdrop(t, WIDTH, HEIGHT, [{ cx: 120, cy: 40, r: 150 }, { cx: 820, cy: 280, r: 160 }, { cx: 520, cy: 300, r: 110 }])}
  ${panel(t, 12, 12, WIDTH - 24, HEIGHT - 24, 14)}
  ${outline(t, WIDTH, HEIGHT)}
  <text x="28" y="42" class="mono" font-size="11" letter-spacing="1.5" fill="${t.accent}">${esc(label)}</text>
  ${body}
</svg>
`;
}

function stat(t, x, value, caption) {
  return `<text x="${x}" y="84" class="sans" font-size="24" font-weight="600" letter-spacing="-0.5" fill="${t.text}">${esc(value)}</text>
  <text x="${x}" y="104" class="sans" font-size="12" fill="${t.muted}">${esc(caption)}</text>`;
}

function footer(t, note) {
  return `<text x="28" y="${HEIGHT - 18}" class="mono" font-size="10" fill="${t.muted}">${esc(note)}</text>`;
}

const updated = () => `Updated ${fmtDate(Date.now(), { day: 'numeric', month: 'short', year: 'numeric' })}`;

// ---------- GitHub activity ----------

function streaks(days) {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Today often has no activity yet, so the current streak may end yesterday.
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;
  return { current, longest };
}

function activityCard(cal, t) {
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const { current, longest } = streaks(days);
  const best = days.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a), days[0]);
  const dayLabel = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

  const step = 16;
  const size = 13;
  const gridWidth = cal.weeks.length * step - (step - size);
  const x0 = Math.round((WIDTH - gridWidth) / 2);
  const y0 = 150;

  const cells = cal.weeks.flatMap((week, wi) => week.contributionDays.map((d) => {
    const row = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    const fill = t.levels[LEVEL_INDEX[d.contributionLevel] ?? 0];
    return `<rect x="${x0 + wi * step}" y="${y0 + row * step}" width="${size}" height="${size}" rx="3" fill="${fill}"/>`;
  }));

  const months = [];
  cal.weeks.forEach((week, wi) => {
    const m = new Date(`${week.contributionDays[0].date}T00:00:00Z`).getUTCMonth();
    if (wi === 0 || m !== months.at(-1).m) months.push({ wi, m });
  });
  const monthLabels = months
    .filter((l, i) => (months[i + 1]?.wi ?? cal.weeks.length) - l.wi >= 3)
    .map((l) => `<text x="${x0 + l.wi * step}" y="${y0 - 10}" class="mono" font-size="10" fill="${t.muted}">${fmtDate(Date.UTC(2000, l.m, 1), { month: 'short' })}</text>`);

  const legendX = WIDTH - 28 - 30 - (5 * 14 - 3);
  const legend = `<text x="${legendX - 8}" y="${HEIGHT - 18}" class="mono" font-size="10" fill="${t.muted}" text-anchor="end">Less</text>
  ${t.levels.map((c, i) => `<rect x="${legendX + i * 14}" y="${HEIGHT - 27}" width="11" height="11" rx="2.5" fill="${c}"/>`).join('')}
  <text x="${legendX + 5 * 14 + 5}" y="${HEIGHT - 18}" class="mono" font-size="10" fill="${t.muted}">More</text>`;

  const body = `${stat(t, 28, fmtNumber(cal.totalContributions), 'Contributions in the last year')}
  ${stat(t, 268, dayLabel(current), 'Current streak')}
  ${stat(t, 448, dayLabel(longest), 'Longest streak')}
  ${stat(t, 628, fmtNumber(best.contributionCount), `Best day, ${fmtDate(`${best.date}T00:00:00Z`, { day: 'numeric', month: 'short' })}`)}
  ${monthLabels.join('\n  ')}
  ${cells.join('\n  ')}
  ${footer(t, updated())}
  ${legend}`;

  const aria = `${cal.totalContributions} GitHub contributions in the last year. Current streak ${current} days, longest streak ${longest} days.`;
  return frame(t, 'GITHUB · LAST 12 MONTHS', aria, body);
}

// ---------- WakaTime ----------

function wakaCard(data, t) {
  const label = 'CODING TIME · LAST 7 DAYS';
  if (!data) {
    const body = `<text x="28" y="96" class="sans" font-size="15" fill="${t.muted}">Coding stats are not available right now.</text>
  ${footer(t, updated())}`;
    return frame(t, label, 'Coding time stats are not available.', body);
  }

  const total = data.human_readable_total_including_other_language || data.human_readable_total || '0 mins';
  const average = data.human_readable_daily_average_including_other_language || data.human_readable_daily_average || '0 mins';
  const bestDay = data.best_day?.text ? `${data.best_day.text}` : '–';
  const bestDate = data.best_day?.date ? fmtDate(`${data.best_day.date}T00:00:00Z`, { weekday: 'long' }) : 'Best day';
  const editor = data.editors?.[0]?.name || '–';

  const languages = (data.languages || []).filter((l) => l.percent > 0).slice(0, 5);
  const top = languages[0]?.percent || 1;
  const trackX = 170;
  const trackW = 540;
  const opacities = [1, 0.8, 0.65, 0.5, 0.4];

  const rows = languages.length
    ? languages.map((l, i) => {
      const y = 152 + i * 26;
      const w = Math.max(4, Math.round((trackW * l.percent) / top));
      return `<text x="28" y="${y}" class="sans" font-size="13" fill="${t.text}">${esc(l.name)}</text>
  <rect x="${trackX}" y="${y - 8}" width="${trackW}" height="6" rx="3" fill="${t.track}"/>
  <rect x="${trackX}" y="${y - 8}" width="${w}" height="6" rx="3" fill="${t.accent}" fill-opacity="${opacities[i]}"/>
  <text x="${WIDTH - 28}" y="${y}" class="mono" font-size="11" fill="${t.muted}" text-anchor="end">${esc(l.text)} · ${Math.round(l.percent)}%</text>`;
    })
    : [`<text x="28" y="160" class="sans" font-size="14" fill="${t.muted}">No coding activity recorded this week.</text>`];

  const body = `${stat(t, 28, total, 'Total this week')}
  ${stat(t, 268, average, 'Daily average')}
  ${stat(t, 498, bestDay, `Best day, ${bestDate}`)}
  ${stat(t, 718, editor, 'Main editor')}
  ${rows.join('\n  ')}
  ${footer(t, `${updated()} · via WakaTime`)}`;

  const aria = `Coding time in the last 7 days: ${total}. Top languages: ${languages.map((l) => l.name).join(', ') || 'none'}.`;
  return frame(t, label, aria, body);
}

// ---------- main ----------

const calendar = await fetchContributions();
let waka = null;
if (WAKATIME_API_KEY) {
  try {
    waka = await fetchWakaTime();
  } catch (err) {
    console.warn(`WakaTime: ${err.message}`);
  }
} else {
  console.warn('WAKATIME_API_KEY is not set, rendering the coding-time placeholder');
}

await mkdir(OUT_DIR, { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
  await writeFile(`${OUT_DIR}/activity-${name}.svg`, activityCard(calendar, theme));
  await writeFile(`${OUT_DIR}/wakatime-${name}.svg`, wakaCard(waka, theme));
}
console.log(`Wrote cards to ${OUT_DIR}/`);

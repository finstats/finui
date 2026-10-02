// FinUI presets: a choice per axis of presets.json, spelled as a short code, made into tokens. One module for the page
// (create/index.html) and the installer (bin/finui.mjs), so the two can never make different stylesheets of one code.
// A code is one base-36 digit per axis in the file's order, so options are only ever appended there: a code once
// handed out keeps its meaning. Pure: it is given the presets and the files, and reads nothing itself.

/** A choice is one option index per axis. */
export const encode = (choice) => choice.map((o) => o.toString(36)).join('');

/** The option of every axis a code names, or null when it names one that does not exist. A code shorter than the axes
 *  leaves the rest at their defaults: it was made before they were added. */
export function decode(presets, code) {
  const { axes } = presets;
  if (typeof code !== 'string' || !/^[0-9a-z]+$/.test(code) || code.length > axes.length) return null;
  const choice = axes.map(() => 0);
  for (let i = 0; i < code.length; i++) {
    const o = parseInt(code[i], 36);
    if (o >= axes[i].options.length) return null;
    choice[i] = o;
  }
  return choice;
}

const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
const ld = (light, dark) => `light-dark(${light}, ${dark})`;
const sides = (c) => (Array.isArray(c) ? c : [c, c]);

/** What a base may name outright, by day (`day`) and by night (`night`), over what its ramp would give: its grounds and its
 *  text. A paper of its own is what makes one base look unlike another by day, where every grey ramp is nearly white. */
const OWN = { bg: ['--bg'], card: ['--bg-2', '--page-glow'], sunken: ['--bg-sunken'], text: ['--text', '--text-strong'], muted: ['--text-muted'], faint: ['--text-faint'] };

/** The neutrals from a ramp of eleven (50 … 950): paper by day from its light end, the night from its dark end, at the
 *  steps tokens.css' own Obsidian sits at; then what the base names itself. */
function base(ramp, day = {}, night = {}) {
  const sides = new Map(ramp_(ramp).map(([t, v]) => [t, sidesOf(v)]));
  for (const [key, names] of Object.entries(OWN)) {
    for (const t of names) {
      const [l, d] = sides.get(t);
      sides.set(t, [day[key] ?? l, t === '--page-glow' ? d : night[key] ?? d]);
    }
  }
  return [...sides].map(([t, [l, d]]) => [t, ld(l, d)]);
}
/** A light-dark() written here, back into its two sides. */
function sidesOf(v) {
  const body = v.slice('light-dark('.length, -1);
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++; else if (body[i] === ')') depth--;
    else if (body[i] === ',' && !depth) return [body.slice(0, i).trim(), body.slice(i + 1).trim()];
  }
  throw new Error(`not light-dark: ${v}`);
}

function ramp_(ramp) {
  const r = (i) => ramp[i];
  return [
    ['--bg', ld(r(1), mix(r(9), 75, r(8)))],
    ['--page-glow', ld(r(0), 'transparent')],
    ['--bg-2', ld('#ffffff', r(8))],
    ['--bg-lift', ld('#ffffff', r(10))],
    ['--bg-sunken', ld(r(2), r(9))],
    ['--hover', ld(mix(r(10), 7, 'transparent'), mix(r(8), 60, r(7)))],
    ['--btn-hover', ld(mix(r(10), 11, 'transparent'), mix(r(8), 35, r(7)))],
    ['--border', ld(r(3), mix(r(8), 40, r(7)))],
    ['--border-soft', ld(r(2), mix(r(8), 80, r(7)))],
    ['--border-strong', ld(r(4), mix(r(7), 60, r(6)))],
    ['--text', ld(r(9), mix(r(2), 50, r(3)))],
    ['--text-muted', ld(r(6), r(4))],
    ['--text-faint', ld(mix(r(5), 60, r(6)), mix(r(5), 50, r(4)))],
    ['--text-strong', ld(r(9), r(1))],
    ['--text-hero', ld(r(10), r(0))],
    ['--grid', ld(r(2), mix(r(8), 60, r(7)))],
    ['--axis', ld(r(3), mix(r(7), 80, r(8)))],
    ['--scrollbar', ld(r(4), mix(r(7), 70, r(6)))],
    ['--separator', ld(r(4), r(6))],
    ['--knob', ld('#ffffff', r(3))],
    ['--placeholder', ld(r(2), mix(r(8), 60, r(7)))],
    ['--skeleton', ld(r(2), mix(r(8), 50, r(7)))],
    ['--track', ld(r(2), mix(r(8), 30, r(7)))],
    ['--land', ld(r(2), mix(r(8), 85, r(9)))],
    ['--land-edge', ld(r(3), mix(r(8), 30, r(7)))],
    ['--heat-0', ld(r(2), mix(r(8), 60, r(7)))],
    ['--rc-heat-0', ld(r(2), mix('#ffffff', 6, 'transparent'))],
    ['--wash-2', ld(r(2), mix(r(8), 50, r(7)))],
    ['--wash-2-text', ld(r(8), r(2))],
    ['--warn-wash', ld(mix('var(--warning)', 18, 'var(--bg-2)'), mix('var(--warning)', 25, 'var(--bg-2)'))],
    ['--crit-wash', ld(mix('var(--critical)', 16, 'var(--bg-2)'), mix('var(--critical)', 25, 'var(--bg-2)'))],
  ];
}

/** An accent and what follows from it: a deeper one for links by day and a lighter one by night (both read as text on
 *  the ground), the pressed fill, the washes, and the text that reads on it. */
function accent(l, d) {
  return [
    ['--accent', ld(l, d)],
    // Read as text on every base's ground and card: deep enough by day, light enough by night (a test holds 4.5:1).
    ['--accent-hi', ld(mix(l, 78, '#000000'), mix(d, 60, '#ffffff'))],
    ['--accent-hover', ld(mix(l, 85, '#000000'), mix(d, 85, '#000000'))],
    ['--accent-wash', ld(mix(l, 10, 'transparent'), mix(d, 14, 'transparent'))],
    ['--selection', ld(mix(l, 22, 'transparent'), mix(d, 40, 'transparent'))],
    ['--on-accent', ld(on(l), on(d))],
  ];
}

/** The four series, and the ramp of one quantity drawn from `single` towards `peak` on the card's ground. */
function charts(series, single, peak) {
  const [sl, sd] = sides(single), [pl, pd] = sides(peak);
  const shade = (pct) => ld(mix(sl, pct, 'var(--bg-2)'), mix(sd, pct, 'var(--bg-2)'));
  return [
    ...series.map((c, i) => [`--series-${i + 1}`, ld(...sides(c))]),
    ['--single', ld(sl, sd)],
    ['--peak', ld(pl, pd)],
    ['--spark', ld(sl, sd)],
    ...[14, 30, 48, 66, 84].map((pct, i) => [`--heat-${i + 1}`, shade(pct)]),
    ['--heat-6', ld(pl, pd)],
    ['--rc-heat-1', shade(22)],
    ['--rc-heat-2', shade(50)],
    ['--rc-heat-3', ld(sl, sd)],
    ['--rc-heat-4', ld(pl, pd)],
  ];
}

function optionTokens(axis, o) {
  const kind = axis.kind;
  if (kind === 'base') return o.ramp && o.ramp.length === 11 ? base(o.ramp, o.day, o.night) : [];
  if (kind === 'font') return o.stack ? [[axis.token, o.stack]] : [];
  if (kind === 'accent') return o.light && o.dark ? accent(o.light, o.dark) : [];
  if (kind === 'charts') return o.series && o.series.length === 4 && o.single && o.peak ? charts(o.series, o.single, o.peak) : [];
  return Object.entries(o.tokens || {});
}

/** The tokens a choice sets, in the order they are written; a token set twice keeps the later axis' value. */
export function tokens(presets, choice) {
  const out = new Map();
  presets.axes.forEach((axis, i) => { for (const [t, v] of optionTokens(axis, axis.options[choice[i]])) out.set(t, v); });
  return [...out];
}

/** The @font-face rules the fonts a choice names need, each family once, its licence named beside it; '' for none. The
 *  files are `fonts/` beside the stylesheet, as base.css' own are. Only a face that is used is ever downloaded. */
export function faces(presets, choice) {
  const seen = new Set();
  let css = '';
  presets.axes.forEach((axis, i) => {
    const o = axis.options[choice[i]];
    if (axis.kind !== 'font' || !o.files || seen.has(o.family)) return;
    seen.add(o.family);
    css += `/* ${o.label}: SIL Open Font License 1.1, fonts/${o.licence} */\n`;
    for (const f of o.files) {
      css += `@font-face { font-family: "${o.family}"; font-style: normal; font-weight: ${o.weight}; font-display: swap; src: url("fonts/${f.file}") format("woff2-variations"); unicode-range: ${f.range}; }\n`;
    }
  });
  return css;
}

/** The faces and the `:root { … }` a choice needs, after a comment naming it, or '' when it changes nothing. */
export function overlay(presets, code, choice) {
  const set = tokens(presets, choice);
  if (!set.length) return '';
  const named = presets.axes.map((a, i) => (choice[i] ? `${a.label.toLowerCase()} ${a.options[choice[i]].label}` : null)).filter(Boolean);
  return `/* FinUI preset ${code}, made at FinUI create: ${named.join(', ')}. */\n${faces(presets, choice)}:root {\n${set.map(([t, v]) => `  ${t}: ${v};\n`).join('')}}\n`;
}

const luminance = (hex) => {
  const ch = (i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
};
/** The text that reads better on a fill of `hex`: white or ink, by WCAG's contrast ratio. */
export function on(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const l = luminance(hex), ink = luminance('#0a0a0a');
  return 1.05 / (l + 0.05) >= (l + 0.05) / (ink + 0.05) ? '#ffffff' : '#0a0a0a';
}

/** Every CSS file the registry lists, foundation first, each once, in order — with a preset's block right after
 *  tokens.css, whose values it replaces. `read(path)` gives a file's text, from disk or over the network. */
export async function stylesheet(registry, read, preset = '') {
  const paths = [...registry.foundation, ...registry.components.flatMap((c) => c.files)].filter((p) => p.endsWith('.css'));
  const texts = await Promise.all(paths.map((p) => read(p)));
  let out = '/* FinUI — https://github.com/finstats/finui, every stylesheet in registry.json\'s order. GPL-3.0-only. */\n';
  paths.forEach((p, i) => {
    out += '\n' + texts[i].trim() + '\n';
    if (p === 'tokens.css' && preset) out += '\n' + preset;
  });
  return out;
}

// Resolving what a preset writes into colours, for the tests: hex, color-mix(in srgb, …), light-dark(…) and var(--x) over
// tokens.css and a preset's own tokens. Only what presets and tokens.css use; anything else throws, so a test cannot pass by
// not understanding a value.

const hex = (h) => { let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim()); if (!m) return null; const x = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]; const n = parseInt(x, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; };
const named = { transparent: [0, 0, 0, 0], white: [255, 255, 255, 1], black: [0, 0, 0, 1] };

/** Split on commas at depth 0. */
function args(s) {
  const out = []; let depth = 0, at = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++; else if (s[i] === ')') depth--;
    else if (s[i] === ',' && depth === 0) { out.push(s.slice(at, i).trim()); at = i + 1; }
  }
  out.push(s.slice(at).trim());
  return out;
}
const inner = (s, name) => s.slice(name.length + 1, -1);

/** The colour an expression is in one theme: [r, g, b, a] with r, g, b 0–255. */
export function resolve(value, side, lookup, seen = new Set()) {
  const v = value.trim();
  const h = hex(v); if (h) return h;
  if (named[v]) return named[v];
  if (v.startsWith('var(')) {
    const name = inner(v, 'var');
    if (seen.has(name)) throw new Error(`${name} reads itself`);
    const next = lookup(name);
    if (next == null) throw new Error(`${name} is not a token`);
    return resolve(next, side, lookup, new Set([...seen, name]));
  }
  if (v.startsWith('light-dark(')) { const [l, d] = args(inner(v, 'light-dark')); return resolve(side === 'light' ? l : d, side, lookup, seen); }
  if (v.startsWith('rgba(') || v.startsWith('rgb(')) { const n = v.match(/[\d.]+/g).map(Number); return [n[0], n[1], n[2], n[3] ?? 1]; }
  if (v.startsWith('color-mix(')) {
    const [space, a, b] = args(inner(v, 'color-mix'));
    if (space !== 'in srgb') throw new Error(`color-mix ${space}`);
    const part = (s) => { const m = /^(.*?)\s+([\d.]+)%$/.exec(s); return m ? [m[1], Number(m[2]) / 100] : [s, null]; };
    let [ca, pa] = part(a), [cb, pb] = part(b);
    if (pa == null && pb == null) { pa = 0.5; pb = 0.5; } else if (pa == null) pa = 1 - pb; else if (pb == null) pb = 1 - pa;
    const x = resolve(ca, side, lookup, seen), y = resolve(cb, side, lookup, seen);
    // Premultiplied, as CSS mixes: a transparent side thins the other without darkening it.
    const alpha = x[3] * pa + y[3] * pb;
    const ch = (i) => (alpha ? (x[i] * x[3] * pa + y[i] * y[3] * pb) / alpha : 0);
    return [ch(0), ch(1), ch(2), alpha];
  }
  throw new Error(`cannot read ${v}`);
}

/** A colour laid over another, as it shows. */
export const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
export const luminance = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export function oklab(c) {
  const [r, g, b] = c.slice(0, 3).map(lin);
  const [l, m, s] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
/** Perceptual distance, OKLab ×100 (the dataviz validator's ΔE). */
export const deltaE = (a, b) => { const [x, y] = [oklab(a), oklab(b)]; return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

/** tokens.css as a map of name → value. */
export function tokensOf(css) {
  const out = new Map();
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm)) out.set(m[1], m[2].trim());
  return out;
}

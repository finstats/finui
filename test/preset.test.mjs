// The preset rules: how a code is read, what each choice sets, and what may never come out of it.
// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decode, encode, tokens, faces, overlay, on, stylesheet } from '../create/preset.js';
import { resolve, contrast, deltaE, tokensOf, over, oklab } from './colour.mjs';

const root = new URL('../', import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, root), 'utf8');
const presets = JSON.parse(read('create/presets.json'));
const registry = JSON.parse(read('registry.json'));
const n = presets.axes.length;
const at = (key) => presets.axes.findIndex((a) => a.key === key);
const defined = new Set([...read('tokens.css').matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
/** Each option of each axis on its own, the rest at their default: every value the file holds is written once. */
const everyChoice = () => [Array(n).fill(0), ...presets.axes.flatMap((a, i) => a.options.slice(1).map((_, o) => Object.assign(Array(n).fill(0), { [i]: o + 1 })))];
const pick = (picks) => presets.axes.map((a) => picks[a.key] ?? 0);

test('a code is one digit per axis, and a short one means the defaults after it', () => {
  assert.deepEqual(decode(presets, '0'.repeat(n)), Array(n).fill(0));
  assert.deepEqual(decode(presets, '02'), Object.assign(Array(n).fill(0), { 1: 2 }), 'a code from before an axis was added keeps working');
  assert.equal(encode(Object.assign(Array(n).fill(0), { 1: 2, 3: 1 })), '0201' + '0'.repeat(n - 4));
});

test('a code that names no option is refused', () => {
  const past = presets.axes[0].options.length.toString(36);
  for (const bad of ['', 'z', '0Z', '0-1', '0.0', '0'.repeat(n + 1), 'é', past, null, undefined]) assert.equal(decode(presets, bad), null, String(bad));
});

test('an option keeps its digit', () => {
  assert.equal(new Set(presets.axes.map((a) => a.key)).size, n, 'two axes share a key');
  for (const a of presets.axes) {
    assert.ok(a.options.length <= 36, `${a.key} has more options than one base-36 digit spells`);
    assert.equal(new Set(a.options.map((o) => o.key)).size, a.options.length, `${a.key} has two options with one key`);
  }
});

test('the first option of every axis is tokens.css as it stands', () => {
  const none = Array(n).fill(0);
  assert.deepEqual(tokens(presets, none), []);
  assert.equal(overlay(presets, encode(none), none), '');
  for (const c of everyChoice().slice(1)) assert.ok(tokens(presets, c).length, `${encode(c)} changes nothing`);
});

test('the default swatches are tokens.css’ own colours', () => {
  const sides = (name) => { const m = read('tokens.css').match(new RegExp(`${name}:\\s*light-dark\\(([^,]+),\\s*([^)]+)\\)`)); return [m[1].trim(), m[2].trim()]; };
  const swatch = (key) => presets.axes[at(key)].options[0].swatch;
  assert.deepEqual(swatch('base'), sides('--bg'));
  assert.deepEqual(swatch('accent'), sides('--accent'));
  assert.deepEqual(swatch('charts'), ['--series-1', '--series-2', '--series-3', '--series-4'].map((t) => sides(t)[0]));
});

test('every token a preset sets is one tokens.css defines', () => {
  for (const c of everyChoice()) for (const [t] of tokens(presets, c)) assert.ok(defined.has(t), `${encode(c)} sets ${t}, which tokens.css does not define`);
});

test('every colour a preset sets is light and dark', () => {
  for (const c of everyChoice()) {
    if (c.every((o, i) => o === 0 || ['tokens', 'font'].includes(presets.axes[i].kind))) continue;   // a font is not a colour
    for (const [t, v] of tokens(presets, c)) assert.match(v, /^light-dark\(.*\)$/, `${t}: ${v}`);
  }
});

// The file is ours, but a value is pasted into a stylesheet: it may say a value and nothing else. A font stack names its
// family in double quotes, and nothing else may.
test('a value can say nothing but a value', () => {
  for (const c of everyChoice()) {
    for (const [t, v] of tokens(presets, c)) {
      assert.doesNotMatch(v, /[;{}<>'\\@]/, `${t}: ${v}`);
      if (v.includes('"')) assert.match(v, /^("[A-Za-z0-9 ]+"(, )?)+[a-z, "A-Z0-9-]*$/, `${t}: quotes only around a family name: ${v}`);
      for (const m of v.matchAll(/var\(([^)]+)\)/g)) assert.ok(defined.has(m[1]), `${t} reads ${m[1]}, which tokens.css does not define`);
    }
  }
});

test('an accent is worked out into everything that follows it', () => {
  const set = Object.fromEntries(tokens(presets, pick({ accent: presets.axes[at('accent')].options.findIndex((o) => o.key === 'violet') })));
  for (const t of ['--accent', '--accent-hi', '--accent-hover', '--accent-wash', '--selection', '--on-accent']) assert.ok(t in set, `violet does not set ${t}`);
  assert.equal(set['--accent'], 'light-dark(#6d28d9, #8b5cf6)');
});

test('a later axis wins a token both set', () => {
  const washes = tokens(presets, pick({ accent: 1, highlight: 1 })).filter(([t]) => t === '--accent-wash').map(([, v]) => v);
  assert.deepEqual(washes, ['color-mix(in srgb, var(--accent) 24%, transparent)']);
});

test('text on an accent is whichever of white and ink reads better', () => {
  assert.equal(on('#1d4ed8'), '#ffffff');
  assert.equal(on('#b23a26'), '#ffffff');
  assert.equal(on('#f59e0b'), '#0a0a0a');
  assert.equal(on('#e5e5e5'), '#0a0a0a');
});

test('an overlay is one :root block that names its code', () => {
  const c = pick({ radius: 1 });
  const css = overlay(presets, encode(c), c);
  assert.match(css, new RegExp(`preset ${encode(c)}`));
  assert.equal(css.split(':root {').length - 1, 1);
  assert.match(css, /--radius: 0px;/);
});

// Stacked bars put every series beside the next, so neighbours must differ for anyone who looks: the dataviz validator's
// normal-vision floor, ΔE 15 in OKLab (×100), by day and by night. Forest's green and lime were 4.5.
test('neighbouring series of every palette are far enough apart', () => {
  const oklab = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    const [l, m, s] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  };
  for (const o of presets.axes[at('charts')].options.slice(1)) {
    for (const side of [0, 1]) {
      const hexes = o.series.map((c) => (Array.isArray(c) ? c[side] : c));
      assert.ok(hexes.every((x) => /^#[0-9a-f]{6}$/i.test(x)), `${o.key}: a palette is fixed colours, or it can collide with the accent it reads`);
      for (let i = 0; i < 3; i++) {
        const [a, b] = [oklab(hexes[i]), oklab(hexes[i + 1])];
        const de = 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        assert.ok(de >= 15, `${o.key} ${side ? 'by night' : 'by day'}: ${hexes[i]} and ${hexes[i + 1]} are ΔE ${de.toFixed(1)} apart`);
      }
    }
  }
});

test('the stylesheet is every CSS file in registry order, a preset’s block right after tokens.css', async () => {
  const files = [...registry.foundation, ...registry.components.flatMap((c) => c.files)].filter((f) => f.endsWith('.css'));
  const plain = await stylesheet(registry, async (f) => read(f));
  assert.match(plain, /^\/\* FinUI/);
  let from = 0;
  for (const f of files) { const at2 = plain.indexOf(read(f).trim(), from); assert.ok(at2 >= from, `${f} is not in it, or not after what comes before it`); from = at2; }
  const c = pick({ accent: 1 });
  const block = overlay(presets, encode(c), c);
  const css = await stylesheet(registry, async (f) => read(f), block);
  assert.ok(css.indexOf(read('tokens.css').trim()) < css.indexOf(block) && css.indexOf(block) < css.indexOf(read('base.css').trim()), 'the block sits between tokens.css and base.css');
  assert.equal(css.replace(block + '\n', ''), plain, 'apart from its block, a preset is the plain stylesheet');
});

// ---------------------------------------------------------------- what a base and an accent must hold to
const defaults = tokensOf(read('tokens.css'));
/** Every token's value under a choice: tokens.css, then the preset's. */
const under = (choice) => { const set = new Map([...defaults, ...tokens(presets, choice)]); return (n) => set.get(n); };
const colourOf = (choice, side) => { const get = under(choice); return (t) => resolve(`var(${t})`, side, get); };
const GROUNDS = ['--bg', '--bg-2', '--bg-sunken'];
const option = (key, k) => presets.axes[at(key)].options.findIndex((o) => o.key === k);

// The floors are what washi, the base people read every day, already gives: body text 7:1 and more, muted text WCAG's
// 4.5:1, faint text (hints, axis labels) 3.5:1 — washi's faint is 4.2 by day and 3.7 by night.
test('every base reads: text, muted and faint on every ground, by day and by night', () => {
  const bad = [];
  presets.axes[at('base')].options.forEach((o, i) => {
    for (const side of ['light', 'dark']) {
      const c = colourOf(pick({ base: i }), side);
      for (const [t, floor] of [['--text', 7], ['--text-muted', 4.5], ['--text-faint', 3.5]]) {
        for (const g of GROUNDS) {
          const k = contrast(over(c(t), c(g)), c(g));
          if (k < floor) bad.push(`${o.key} ${side}: ${t} on ${g} is ${k.toFixed(2)}, under ${floor}`);
        }
      }
    }
  });
  assert.deepEqual(bad, []);
});

// By day every grey looked the same: Tailwind's neutral, stone, zinc, slate and gray are 0.1–0.8 apart in OKLab at the
// step the page ground was taken from, under what anybody can tell. Washi stood 4 from each. Every base's paper is its own.
test('by day every base has a paper of its own: no two pages closer than ΔE 3', () => {
  const opts = presets.axes[at('base')].options;
  const grounds = opts.map((_, i) => colourOf(pick({ base: i }), 'light')('--bg'));
  const close = [];
  for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) {
    const d = deltaE(grounds[i], grounds[j]);
    if (d < 3) close.push(`${opts[i].key} and ${opts[j].key}: ΔE ${d.toFixed(1)}`);
  }
  assert.deepEqual(close, []);
});

test('every accent reads as a link on every base, and its own buttons read too, by day and by night', () => {
  const bad = [];
  presets.axes[at('accent')].options.forEach((a, ai) => {
    presets.axes[at('base')].options.forEach((b, bi) => {
      for (const side of ['light', 'dark']) {
        const c = colourOf(pick({ base: bi, accent: ai }), side);
        for (const g of ['--bg', '--bg-2']) {
          const k = contrast(c('--accent-hi'), c(g));
          if (k < 4.5) bad.push(`${a.key} on ${b.key} ${side}: a link on ${g} is ${k.toFixed(2)}`);
        }
        // The default is tokens.css' own look, not a preset's: white on Obsidian's violet is 4.26, which is finstats'
        // owner's call to change. Every accent a preset adds is held to 4.5.
        const button = contrast(c('--on-accent'), c('--accent'));
        if (button < 4.5 && ai > 0) bad.push(`${a.key} ${side}: a button's words are ${button.toFixed(2)}`);
      }
    });
  });
  assert.deepEqual([...new Set(bad)].slice(0, 30), []);
});

// Two-colour accents, like the seal by day and violet by night: two different hues, not one hue in two shades.
test('a two-colour accent is two hues, at least 60 degrees apart', () => {
  const hueOf = (h) => { const [, A, B] = oklab(resolve(h, 'light', () => null)); return (Math.atan2(B, A) * 180 / Math.PI + 360) % 360; };
  const duals = presets.axes[at('accent')].options.filter((o) => / & /.test(o.label) && o.light);
  assert.ok(duals.length >= 8, `${duals.length} two-colour accents`);
  for (const o of duals) {
    const d = Math.abs(hueOf(o.light) - hueOf(o.dark));
    const apart = Math.min(d, 360 - d);
    assert.ok(apart >= 60, `${o.key}: ${o.light} and ${o.dark} are ${apart.toFixed(0)}° apart`);
  }
});

test('there is a choice of bases and accents', () => {
  assert.ok(presets.axes[at('base')].options.length >= 14, 'bases');
  assert.ok(presets.axes[at('accent')].options.length >= 20, 'accents');
});

// ---------------------------------------------------------------- fonts
const fontAxes = presets.axes.filter((a) => a.kind === 'font');
test('fonts: one axis each for the text, the headings and the numbers, each setting its own token', () => {
  assert.deepEqual(fontAxes.map((a) => [a.key, a.token]), [['font', '--sans'], ['heading', '--font-heading'], ['mono', '--mono']]);
  for (const a of fontAxes) assert.ok(defaults.has(a.token), `${a.token} is not a token`);
  assert.match(uncomment(read('base.css')), /var\(--font-heading\)/, 'something reads the heading font');
});
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

test('every font a preset can choose is bundled with its licence beside it, and free to use (OFL)', () => {
  const files = new Set(fs.readdirSync(new URL('fonts/', root)));
  for (const a of fontAxes) for (const o of a.options.filter((x) => x.files)) {
    for (const f of o.files) assert.ok(files.has(f.file), `${a.key} ${o.key}: fonts/${f.file}`);
    assert.ok(files.has(o.licence), `${o.key}: fonts/${o.licence}`);
    assert.match(read(`fonts/${o.licence}`), /SIL Open Font License/, `${o.key}: the licence is the OFL`);
  }
});

test('a font is its family first in its token, and its faces come with it; nothing chosen, nothing loaded', () => {
  assert.equal(faces(presets, Array(n).fill(0)), '');
  for (const a of fontAxes) {
    const i = presets.axes.indexOf(a);
    a.options.forEach((o, k) => {
      if (!k) return;
      const c = Object.assign(Array(n).fill(0), { [i]: k });
      const set = Object.fromEntries(tokens(presets, c));
      assert.ok(set[a.token].startsWith(`"${o.family}"`), `${a.key} ${o.key}: ${set[a.token]}`);
      const css = faces(presets, c);
      for (const f of o.files || []) assert.ok(css.includes(`url("fonts/${f.file}")`), `${a.key} ${o.key}: the face for ${f.file}`);
      if (o.files) assert.ok(css.includes(`fonts/${o.licence}`), `${a.key} ${o.key}: its faces name the licence`);
      assert.ok(overlay(presets, encode(c), c).includes(css), `${a.key} ${o.key}: the overlay carries the faces`);
    });
  }
  const two = Object.assign(Array(n).fill(0), { [at('font')]: option('font', 'manrope'), [at('heading')]: option('heading', 'lora') });
  const css = faces(presets, two);
  assert.ok(css.includes('Manrope') && css.includes('Lora') && !css.includes('Fraunces'), 'the faces of what was chosen and nothing else');
});

// ---------------------------------------------------------------- the rest of the look, axis by axis
test('FinUI create offers these axes, in this order (a code is read by position, so a new one goes at the end)', () => {
  assert.deepEqual(presets.axes.map((a) => a.key), ['base', 'accent', 'charts', 'radius', 'density', 'borders', 'cards', 'highlight', 'motion', 'icons',
    'font', 'heading', 'mono', 'headings', 'buttons', 'fields', 'tables', 'menu', 'icon-ends', 'page', 'focus', 'contrast']);
});

// A token nothing reads is a choice that changes nothing on the page. (The colours of a base, an accent and a palette are
// every colour finstats has, and its own pages read many of them; the shape and feel of a page are FinUI's.)
test('every token a shape or feel option sets is read by FinUI', () => {
  const css = ['base.css', ...registry.components.flatMap((c) => c.files).filter((f) => f.endsWith('.css'))].map((f) => uncomment(read(f))).join('\n')
    + [...defaults.values()].join('\n');
  const unread = new Set();
  for (const c of everyChoice().filter((c) => c.every((o, i) => !o || presets.axes[i].kind === 'tokens'))) for (const [t] of tokens(presets, c)) if (!css.includes(`var(${t})`) && !css.includes(`var(${t},`)) unread.add(t);
  assert.deepEqual([...unread], []);
});

test('every axis has a choice worth making', () => {
  const least = { base: 18, accent: 30, charts: 10, radius: 6, density: 5, borders: 4, cards: 5, highlight: 3, motion: 5, icons: 5, font: 28, mono: 8,
    headings: 4, buttons: 4, fields: 3, tables: 3, menu: 4, 'icon-ends': 2, page: 4, focus: 3, contrast: 2 };
  const short = Object.entries(least).map(([k, min]) => [k, presets.axes[at(k)]?.options.length ?? 0, min]).filter(([, len, min]) => len < min);
  assert.deepEqual(short, []);
});

test('the heading font is any text font, or the text’s own', () => {
  assert.deepEqual(presets.axes[at('heading')].options.map((o) => o.key), ['text', ...presets.axes[at('font')].options.map((o) => o.key)]);
});

/** Over every base and accent, by day and by night: the words on a fill read at 4.5:1. */
function readsOn(axis, text, fill, skip = () => false) {
  const bad = [];
  presets.axes[at(axis)].options.forEach((o, oi) => presets.axes[at('accent')].options.forEach((a, ai) => presets.axes[at('base')].options.forEach((b, bi) => {
    if (skip(oi, ai)) return;
    for (const side of ['light', 'dark']) {
      const c = colourOf(pick({ [axis]: oi, accent: ai, base: bi }), side);
      const ground = over(c(fill), c('--bg-2'));
      const k = contrast(over(c(text), ground), ground);
      if (k < 4.5) bad.push(`${axis} ${o.key}, ${a.key} on ${b.key} ${side}: ${k.toFixed(2)}`);
    }
  })));
  return [...new Set(bad)].slice(0, 20);
}
// Solid is the accent with its own words on it, held already, and tokens.css' seal-and-violet is the owner's call.
test('a primary button’s words read on it, whatever the button style', () => {
  assert.deepEqual(readsOn('buttons', '--primary-text', '--primary-bg', (oi, ai) => oi === 0 && ai === 0), []);
});
test('the selected item of a menu reads, whatever the menu style', () => {
  assert.deepEqual(readsOn('menu', '--selected-text', '--selected-bg', (oi, ai) => oi === 1 && ai === 0), []);
});

test('high contrast lifts muted text to 7:1 and faint text to 4.5:1 on every base', () => {
  const bad = [];
  presets.axes[at('base')].options.forEach((b, bi) => {
    for (const side of ['light', 'dark']) {
      const c = colourOf(pick({ base: bi, contrast: option('contrast', 'high') }), side);
      for (const [t, floor] of [['--text', 7], ['--text-muted', 7], ['--text-faint', 4.5]]) for (const g of GROUNDS) {
        const k = contrast(over(c(t), c(g)), c(g));
        if (k < floor) bad.push(`${b.key} ${side}: ${t} on ${g} is ${k.toFixed(2)}`);
      }
    }
  });
  assert.deepEqual(bad, []);
});

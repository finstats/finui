// The preset rules: how a code is read, what each choice sets, and what may never come out of it.
// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decode, encode, tokens, overlay, on, stylesheet } from '../create/preset.js';

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
    if (c.every((o, i) => o === 0 || presets.axes[i].kind === 'tokens')) continue;
    for (const [t, v] of tokens(presets, c)) assert.match(v, /^light-dark\(.*\)$/, `${t}: ${v}`);
  }
});

// The file is ours, but a value is pasted into a stylesheet: it may say a value and nothing else.
test('a value can say nothing but a value', () => {
  for (const c of everyChoice()) {
    for (const [t, v] of tokens(presets, c)) {
      assert.doesNotMatch(v, /[;{}<>"'\\@]/, `${t}: ${v}`);
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

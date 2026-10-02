// Animated icons: every icon of core.js has a motion of its own, and a motion moves only parts the icon has. Pure, so held
// here; the QA stage watches them move in a browser.
// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MOTIONS, ACTS, plan } from '../components/animated-icon/motions.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
// The icons as core.js draws them: a name and how many shapes it is made of (a later entry of a name is the one used).
const ICONS = Object.fromEntries([...read('core.js').matchAll(/^ {2}(\w+): '(<[^']+)',$/gm)].map(([, name, svg]) => [name, svg.match(/<(path|circle|rect|ellipse|line|polyline)\b/g).length]));
const css = read('components/animated-icon/animated-icon.css');
const of = (name) => plan(name, ICONS[name]);

test('every icon has a motion, and nothing else does', () => {
  assert.ok(Object.keys(ICONS).length >= 70, `${Object.keys(ICONS).length} icons read from core.js`);
  assert.deepEqual(Object.keys(MOTIONS).sort(), Object.keys(ICONS).sort());
});

test('a motion moves parts the icon has, with an act there is CSS for, and every icon moves something', () => {
  for (const [name, count] of Object.entries(ICONS)) {
    const parts = plan(name, count);
    assert.equal(parts.length, count, `${name}: one entry per shape`);
    assert.ok(parts.some((p) => p.act), `${name}: only drawn in and out, nothing of it moves`);
    for (const p of parts.filter((x) => x.act)) assert.ok(ACTS.includes(p.act), `${name}: ${p.act} is no act`);
    for (const m of MOTIONS[name]) for (const i of m.parts || []) assert.ok(i >= 0 && i < count, `${name}: part ${i} of ${count}`);
  }
  for (const act of ACTS) {
    assert.match(css, new RegExp(`@keyframes fui-animated-icon-${act} \\{`), `${act}: its keyframes`);
    assert.match(css, new RegExp(`\\[data-act="${act}"\\]`), `${act}: a rule that plays it`);
  }
});

test('what an icon says it does: refresh spins, download drops into its tray, trash lifts its lid', () => {
  const refresh = of('refresh');
  assert.ok(refresh.every((p) => p.act === 'spin' && p.origin === '12px 12px'), 'the whole of refresh turns about its centre');
  const [shaft, head, tray] = of('download');
  for (const p of [shaft, head]) { assert.equal(p.act, 'exit'); assert.equal(p.dy, 1, 'downwards'); assert.equal(p.dx, 0); }
  assert.equal(tray.act, null, 'the tray stays where it is');
  const [lid, handle, can] = of('trash');
  assert.equal(lid.act, 'lift'); assert.equal(handle.act, 'lift'); assert.equal(can.act, null);
  assert.deepEqual(of('upload').slice(0, 2).map((p) => [p.act, p.dy]), [['exit', -1], ['exit', -1]], 'upload leaves upwards');
});

test('a slider’s knob takes the gap in its line with it: the line on each side stretches as the knob moves', () => {
  const s = of('sliders');
  // Three rows of a line, a gap, a line, and the knob in the gap: shapes 0 1 2, 3 4 5, 6 7 8.
  for (const [left, right, knob] of [[0, 1, 2], [3, 4, 5], [6, 7, 8]]) {
    assert.equal(s[knob].act, 'slide');
    assert.equal(s[left].act, 'stretch'); assert.equal(s[right].act, 'stretch');
    // The knob moves 3 units; the line before it gains them and the line after it loses them, each from its far end.
    const before = s[knob].dx < 0 ? s[left] : s[right], after = s[knob].dx < 0 ? s[right] : s[left];
    assert.ok(before.sx < 1 && after.sx > 1, `row of ${knob}: the line it moves towards gives way, the other follows`);
  }
  assert.ok(new Set(s.map((p) => p.k)).size === 1, 'every part of it moves at once');
});

test('parts that move together take turns: k counts them, so a group can be staggered', () => {
  assert.deepEqual(of('chart').map((p) => [p.act, p.k]), [['grow', 0], ['grow', 1], ['grow', 2], [null, 0]]);
  assert.throws(() => plan('no-such-icon', 1), /no motion/);
});

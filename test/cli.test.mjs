// The installer: `pnpm dlx github:finstats/finui init --preset <code>` copies FinUI into a project with the preset's tokens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decode, overlay, stylesheet } from '../create/preset.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const presets = JSON.parse(read('create/presets.json'));
const registry = JSON.parse(read('registry.json'));
const listed = [...registry.foundation, ...registry.components.flatMap((c) => c.files)];
const fonts = fs.readdirSync(path.join(root, 'fonts'));
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'finui-'));
const finui = (cwd, ...args) => spawnSync(process.execPath, [path.join(root, 'bin/finui.mjs'), ...args], { cwd, encoding: 'utf8' });

test('init copies FinUI into ./finui with the preset’s tokens after tokens.css’ own', () => {
  const cwd = temp();
  const r = finui(cwd, 'init', '--preset', '0101');
  assert.equal(r.status, 0, r.stderr);
  const out = path.join(cwd, 'finui');
  for (const f of [...listed, 'registry.json', 'LICENSE', ...fonts.map((x) => `fonts/${x}`)]) assert.ok(fs.existsSync(path.join(out, f)), `${f} was not copied`);
  const block = overlay(presets, '0101', decode(presets, '0101'));
  assert.equal(fs.readFileSync(path.join(out, 'tokens.css'), 'utf8'), read('tokens.css').trimEnd() + '\n\n' + block);
  for (const f of listed.filter((x) => x !== 'tokens.css')) assert.equal(fs.readFileSync(path.join(out, f), 'utf8'), read(f), `${f} is not FinUI's own`);
  assert.match(r.stdout, /finui-?\/?|FinUI/);
});

test('without a preset, tokens.css is FinUI’s as it ships', () => {
  const cwd = temp();
  assert.equal(finui(cwd, 'init').status, 0);
  assert.equal(fs.readFileSync(path.join(cwd, 'finui/tokens.css'), 'utf8'), read('tokens.css'));
});

test('--css writes one stylesheet with the fonts beside it, into the folder asked for', async () => {
  const cwd = temp();
  const r = finui(cwd, 'init', '--preset', '01', '--css', '--dir', 'public/ui');
  assert.equal(r.status, 0, r.stderr);
  const out = path.join(cwd, 'public/ui');
  const want = await stylesheet(registry, async (f) => read(f), overlay(presets, '01', decode(presets, '01')));
  assert.equal(fs.readFileSync(path.join(out, 'finui.css'), 'utf8'), want);
  for (const f of fonts) assert.ok(fs.existsSync(path.join(out, 'fonts', f)), `fonts/${f}`);
  assert.ok(!fs.existsSync(path.join(out, 'components')), 'one stylesheet, not the source');
});

test('a code that names no preset is refused, and nothing is written', () => {
  const cwd = temp();
  const r = finui(cwd, 'init', '--preset', 'zz');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /names no preset/);
  assert.deepEqual(fs.readdirSync(cwd), []);
});

test('a folder that already holds files is left alone', () => {
  const cwd = temp();
  fs.mkdirSync(path.join(cwd, 'finui'));
  fs.writeFileSync(path.join(cwd, 'finui/tokens.css'), 'mine');
  const r = finui(cwd, 'init', '--preset', '01');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already/);
  assert.equal(fs.readFileSync(path.join(cwd, 'finui/tokens.css'), 'utf8'), 'mine');
});

test('help says how, and anything else is refused', () => {
  const help = finui(temp(), '--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /pnpm dlx github:finstats\/finui init \[--preset <code>\]/);
  assert.match(help.stdout, /npx --allow-git=all github:finstats\/finui init/, "npm 12 refuses a package from git unless it is allowed");
  assert.equal(finui(temp(), 'nonsense').status, 1);
});

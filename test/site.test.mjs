// The site the pages workflow publishes, and the installer on it:
//   curl -fsSL https://finstats.github.io/finui/install.sh | sh -s -- <code>
// Run here the way it runs there: the site built into a folder, served over HTTP, the script fed to sh.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { build } from '../tools/build-site.mjs';
import { decode, encode, tokens, faces, stylesheet } from '../create/preset.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const presets = JSON.parse(read('create/presets.json'));
const registry = JSON.parse(read('registry.json'));
const library = [...registry.foundation, ...registry.components.flatMap((c) => c.files)];
// The fonts every install brings: base.css' own. A preset's come only when it names them.
const fonts = [...new Set([...read('base.css').matchAll(/fonts\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]))];
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'finui-'));
const n = presets.axes.length;

/** What a run of :root blocks leaves each token at: the last value wins, as the cascade does. */
function cascade(css) {
  const out = new Map();
  for (const block of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const m of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  }
  return out;
}
/** Every option on its own, and a fixed spread of several at once (each axis turns at its own pace). */
const choices = () => [
  ...presets.axes.flatMap((a, i) => a.options.slice(1).map((_, o) => Object.assign(Array(n).fill(0), { [i]: o + 1 }))),
  ...Array.from({ length: 40 }, (_, k) => presets.axes.map((a, i) => (k * (i + 3) + i) % a.options.length)),
  presets.axes.map((a) => a.options.length - 1),
];

let site, server, url;
before(async () => {
  site = temp();
  await build(site);
  server = http.createServer((req, res) => {
    const f = path.join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!f.startsWith(site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
// Fed to sh on stdin, as `curl … | sh -s -- <args>` does. Asynchronous: the server answering its curl is in this process.
function install(cwd, args, from = url) {
  return new Promise((resolve) => {
    const p = spawn('sh', ['-s', '--', ...args], { cwd, env: { ...process.env, FINUI_SITE: from } });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => { stdout += d; });
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('close', (status) => resolve({ status, stdout, stderr }));
    p.stdin.end(fs.readFileSync(path.join(site, 'install.sh')));
  });
}

test('the site holds the pages, the library, finui.css and the installer', async () => {
  for (const f of ['index.html', 'demo/demo.js', 'create/index.html', 'create/create.js', 'create/preset.js', 'create/presets.json', 'registry.json', 'LICENSE', 'install.sh', ...library, ...fonts.map((x) => `fonts/${x}`)]) {
    assert.ok(fs.existsSync(path.join(site, f)), `${f} is not on the site`);
  }
  assert.equal(fs.readFileSync(path.join(site, 'finui.css'), 'utf8'), await stylesheet(registry, async (f) => read(f)));
  for (const f of ['test', 'tools', '.github', 'package.json']) assert.ok(!fs.existsSync(path.join(site, f)), `${f} is published`);
});

test('every option has a file of its own tokens, the defaults none, and in axis order they cascade to the preset', () => {
  presets.axes.forEach((a, i) => {
    assert.ok(!fs.existsSync(path.join(site, `p/${i}/0.css`)), `${a.key}'s default sets nothing`);
    a.options.slice(1).forEach((_, o) => assert.ok(fs.existsSync(path.join(site, `p/${i}/${o + 1}.css`)), `p/${i}/${o + 1}.css`));
  });
  for (const c of choices()) {
    const css = c.map((o, i) => (o ? fs.readFileSync(path.join(site, `p/${i}/${o}.css`), 'utf8') : '')).join('');
    assert.deepEqual(cascade(css), new Map(tokens(presets, c)), `${encode(c)}: the files and the preset disagree`);
  }
});

test('install.sh copies FinUI into ./finui, the preset’s tokens after tokens.css’ own', async () => {
  const cwd = temp();
  const code = encode(Object.assign(Array(n).fill(0), { 1: 2, 3: 1, 7: 1 }));
  const r = await install(cwd, [code]);
  assert.equal(r.status, 0, r.stderr);
  const out = path.join(cwd, 'finui');
  for (const f of [...library, 'registry.json', 'LICENSE', ...fonts.map((x) => `fonts/${x}`)]) assert.ok(fs.existsSync(path.join(out, f)), `${f} was not copied`);
  for (const f of library.filter((x) => x !== 'tokens.css')) assert.equal(fs.readFileSync(path.join(out, f), 'utf8'), read(f), `${f} is not FinUI's own`);
  const mine = fs.readFileSync(path.join(out, 'tokens.css'), 'utf8');
  assert.ok(mine.startsWith(read('tokens.css')), 'tokens.css first, as it ships');
  assert.match(mine, new RegExp(`/\\* FinUI preset ${code}`));
  assert.deepEqual(cascade(mine.slice(read('tokens.css').length)), new Map(tokens(presets, decode(presets, code))));
  assert.match(r.stdout, /FinUI is in finui/);
});

test('without a code, FinUI as it ships', async () => {
  const cwd = temp();
  assert.equal((await install(cwd, [])).status, 0);
  assert.equal(fs.readFileSync(path.join(cwd, 'finui/tokens.css'), 'utf8'), read('tokens.css'));
});

test('--css writes one stylesheet with the fonts beside it, into the folder asked for', async () => {
  const cwd = temp();
  const r = await install(cwd, ['0101', '--css', '--dir', 'public/ui']);
  assert.equal(r.status, 0, r.stderr);
  const css = fs.readFileSync(path.join(cwd, 'public/ui/finui.css'), 'utf8');
  assert.ok(css.startsWith(fs.readFileSync(path.join(site, 'finui.css'), 'utf8')), 'finui.css as published, then the preset');
  assert.deepEqual(new Map([...cascade(css)].filter(([t]) => tokens(presets, decode(presets, '0101')).some(([x]) => x === t))), new Map(tokens(presets, decode(presets, '0101'))));
  for (const f of fonts) assert.ok(fs.existsSync(path.join(cwd, 'public/ui/fonts', f)), `fonts/${f}`);
  assert.ok(!fs.existsSync(path.join(cwd, 'public/ui/components')), 'one stylesheet, not the source');
});

test('a code that names no preset is refused, and nothing is written', async () => {
  for (const bad of ['zz', '0Z', '0'.repeat(n + 1), '0-1']) {
    const cwd = temp();
    const r = await install(cwd, [bad]);
    assert.equal(r.status, 1, bad);
    assert.match(r.stderr, /names no preset/, bad);
    assert.deepEqual(fs.readdirSync(cwd), [], bad);
  }
});

test('a folder that already holds files is left alone', async () => {
  const cwd = temp();
  fs.mkdirSync(path.join(cwd, 'finui'));
  fs.writeFileSync(path.join(cwd, 'finui/tokens.css'), 'mine');
  const r = await install(cwd, ['01']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already/);
  assert.equal(fs.readFileSync(path.join(cwd, 'finui/tokens.css'), 'utf8'), 'mine');
});

test('a failed download leaves nothing behind', async () => {
  const cwd = temp();
  const r = await install(cwd, ['01'], `${url}/nowhere`);
  assert.equal(r.status, 1);
  assert.deepEqual(fs.readdirSync(cwd), []);
});

test('help says how', async () => {
  const r = await install(temp(), ['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /curl -fsSL https:\/\/finstats\.github\.io\/finui\/install\.sh \| sh -s -- <code>/);
});

const fontAt = (key) => presets.axes.findIndex((a) => a.key === key);
const fontOption = (key, k) => presets.axes[fontAt(key)].options.findIndex((o) => o.key === k);

test('an option file carries what its option needs: a font its faces, nothing else any', () => {
  presets.axes.forEach((a, i) => a.options.forEach((o, k) => {
    if (!k) return;
    const css = fs.readFileSync(path.join(site, `p/${i}/${k}.css`), 'utf8');
    const want = faces(presets, Object.assign(Array(n).fill(0), { [i]: k }));
    if (want) assert.ok(css.includes(want), `p/${i}/${k}.css (${a.key} ${o.key}) lacks its faces`);
    else assert.ok(!css.includes('@font-face'), `p/${i}/${k}.css (${a.key} ${o.key}) has faces it does not need`);
  }));
});

test('install.sh brings the fonts a preset names, with their licences, and no other', async () => {
  const cwd = temp();
  const c = Object.assign(Array(n).fill(0), { [fontAt('font')]: fontOption('font', 'manrope'), [fontAt('heading')]: fontOption('heading', 'lora'), [fontAt('mono')]: fontOption('mono', 'fira-code') });
  const r = await install(cwd, [encode(c)]);
  assert.equal(r.status, 0, r.stderr);
  const got = new Set(fs.readdirSync(path.join(cwd, 'finui/fonts')));
  for (const k of ['manrope', 'lora', 'fira-code']) {
    for (const f of fs.readdirSync(path.join(root, 'fonts')).filter((x) => x.startsWith(`${k}-`))) assert.ok(got.has(f), `fonts/${f}`);
  }
  for (const l of ['LICENSE-Manrope.txt', 'LICENSE-Lora.txt', 'LICENSE-FiraCode.txt', 'LICENSE-Inter.txt', 'LICENSE-JetBrainsMono.txt']) assert.ok(got.has(l), l);
  assert.ok(![...got].some((f) => f.startsWith('fraunces') || f.startsWith('geist')), `fonts nobody chose: ${[...got].join(', ')}`);
  const mine = fs.readFileSync(path.join(cwd, 'finui/tokens.css'), 'utf8');
  assert.ok(mine.includes('url("fonts/manrope-latin-wght-normal.woff2")'), 'the faces are in tokens.css, beside the fonts');
  const one = temp();
  assert.equal((await install(one, [encode(c), '--css'])).status, 0);
  assert.ok(fs.readdirSync(path.join(one, 'finui/fonts')).includes('lora-latin-wght-normal.woff2'), 'and with --css');
});

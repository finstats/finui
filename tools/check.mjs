// finui's checks, with nothing but Node: the registry matches the files, nothing imports from outside finui, every colour
// is a token, every class belongs to its component, every component reads only tokens that exist, and every module
// parses. `node tools/check.mjs` — exit 1 on the first rule broken, saying which and where.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const uncommented = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
const code = (t) => uncommented(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const problems = [];
const fail = (m) => problems.push(m);

function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

const reg = JSON.parse(read('registry.json'));
if (reg.name !== 'finui' || reg.prefix !== 'fui-') fail('registry.json: name must be finui and prefix fui-');
if (reg.license !== 'GPL-3.0-only') fail('registry.json: the licence is GPL-3.0-only');
const listed = [...reg.foundation, ...reg.components.flatMap((c) => c.files)];
const names = new Set(reg.components.map((c) => c.name));
for (const c of reg.components) for (const r of c.requires) if (r !== 'core' && !names.has(r)) fail(`${c.name} requires ${r}, which finui does not have`);
const onDisk = ['tokens.css', 'base.css', 'core.js', 'format.js', ...walk('components')].map((f) => f.split(path.sep).join('/'));
for (const f of listed) if (!fs.existsSync(path.join(root, f))) fail(`listed but not there: ${f}`);
for (const f of onDisk) if (!listed.includes(f)) fail(`in finui but not in registry.json: ${f}`);

// Imports stay inside finui (the demo is not finui; it may import finui).
for (const f of onDisk.filter((x) => x.endsWith('.js'))) {
  for (const m of code(read(f)).matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
    const target = path.resolve(path.dirname(path.join(root, f)), m[1]);
    if (!target.startsWith(root + path.sep) || target.includes(`${path.sep}demo${path.sep}`)) fail(`${f} imports ${m[1]}: finui imports nothing from outside finui`);
    else if (!fs.existsSync(target)) fail(`${f} imports ${m[1]}, which is not there`);
  }
}

// Colours live in tokens.css alone.
// The pages beside it (the gallery, FinUI create) are held to it too; create/preset.js writes tokens' values, as tokens.css does.
const pages = ['demo/demo.css', 'demo/demo.js', ...walk('create').map((f) => f.split(path.sep).join('/')).filter((f) => /\.(css|js)$/.test(f))];
for (const f of [...onDisk, ...pages].filter((x) => /\.(css|js)$/.test(x) && x !== 'tokens.css' && x !== 'create/preset.js')) {
  const t = f.endsWith('.css') ? uncommented(read(f)) : code(read(f));
  t.split('\n').forEach((line, n) => {
    if (/(^|[\s:'"(])#[0-9a-fA-F]{3,8}\b/.test(line) || /\b(rgba?|hsla?|light-dark)\(/.test(line)) fail(`${f}:${n + 1}: a colour that is not a token: ${line.trim().slice(0, 100)}`);
  });
}

// A class is styled by its own component, or as context by one it requires.
for (const c of reg.components) {
  for (const f of c.files.filter((x) => x.endsWith('.css'))) {
    const css = uncommented(read(f));
    for (const m of css.matchAll(/\.(fui-[A-Za-z0-9_-]+)/g)) {
      const base = m[1].split('--')[0].split('__')[0].replace(/^fui-/, '');
      if (base !== c.name && !c.requires.includes(base)) fail(`${f} styles .${m[1]}, which is neither ${c.name}'s nor of a component it requires`);
    }
    const own = new Set([...css.matchAll(/(?<![(\w-])(--[a-z0-9-]+)\s*:/g)].map((x) => x[1]));
    const reads = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((x) => x[1]).filter((t) => !own.has(t)));
    const want = new Set(c.tokens);
    for (const t of reads) if (!want.has(t)) fail(`${c.name} reads ${t} but registry.json does not list it`);
    for (const t of want) if (!reads.has(t)) fail(`${c.name} lists ${t} but does not read it`);
  }
}
const tokens = uncommented(read('tokens.css'));
for (const c of reg.components) for (const t of c.tokens) if (!new RegExp(`${t}\\s*:`).test(tokens)) fail(`${c.name} reads ${t}, which tokens.css does not define`);

// Every module parses.
for (const f of [...onDisk, ...pages, 'tools/build-site.mjs'].filter((x) => /\.m?js$/.test(x))) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); } catch (e) { fail(`${f} does not parse: ${String(e.stderr).split('\n')[0]}`); }
}

if (problems.length) { console.error(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
console.log(`✓ ${reg.components.length} components, ${listed.length} files: the registry holds`);

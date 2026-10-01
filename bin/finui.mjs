#!/usr/bin/env node
// FinUI's installer: FinUI is source you copy and own, so installing it is copying it — with the tokens of a preset
// made at FinUI create after tokens.css' own. No dependencies; run it from GitHub:
//   pnpm dlx github:finstats/finui init --preset <code>
//   npx --allow-git=all github:finstats/finui init --preset <code>     (npm 12 fetches nothing from git unless allowed)
import fs from 'node:fs';
import path from 'node:path';
import { decode, overlay, stylesheet } from '../create/preset.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const HELP = `FinUI — the components finstats is built from.

  pnpm dlx github:finstats/finui init [--preset <code>] [--dir <folder>] [--css]
  npx --allow-git=all github:finstats/finui init …   (npm 12 fetches nothing from git unless it is allowed)

  init            copy FinUI into ./finui: tokens, base styles, core and every component, its fonts and licence
  --preset <code> a preset made at https://finstats.github.io/finui/create/, its tokens after tokens.css' own
  --dir <folder>  where to put it (default: finui)
  --css           one stylesheet, finui.css, with the fonts beside it, instead of the source
`;

function fail(message) {
  process.stderr.write(message + '\n');
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) { process.stdout.write(HELP); process.exit(0); }
if (args[0] !== 'init') fail(`finui: "${args[0]}" is not a command.\n\n${HELP}`);
const option = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] ?? fail(`finui: ${name} needs a value.`); };

const presets = JSON.parse(read('create/presets.json'));
const code = option('--preset');
const choice = code == null ? presets.axes.map(() => 0) : decode(presets, code);
if (!choice) fail(`finui: "${code}" names no preset. A code is one letter or digit per choice, such as 0101; make one at https://finstats.github.io/finui/create/`);
const block = overlay(presets, code ?? '', choice);

const dir = path.resolve(option('--dir') ?? 'finui');
if (fs.existsSync(dir) && fs.readdirSync(dir).length) fail(`finui: ${dir} already holds files; FinUI is copied only into an empty folder, so nothing of yours is overwritten.`);

const registry = JSON.parse(read('registry.json'));
const place = (f) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); return path.join(dir, f); };
const write = (f, text) => fs.writeFileSync(place(f), text);
const copy = (f) => fs.copyFileSync(path.join(root, f), place(f));
const fonts = fs.readdirSync(path.join(root, 'fonts')).map((f) => `fonts/${f}`);
const shown = (p) => path.relative(process.cwd(), p) || '.';

if (args.includes('--css')) {
  write('finui.css', await stylesheet(registry, async (f) => read(f), block));
  fonts.forEach(copy);
  process.stdout.write(`FinUI: ${shown(path.join(dir, 'finui.css'))}${code ? ` (preset ${code})` : ''}, with its fonts beside it.\n`);
} else {
  for (const f of [...registry.foundation, ...registry.components.flatMap((c) => c.files), 'registry.json', 'LICENSE', ...fonts]) {
    if (f === 'tokens.css' && block) write(f, read(f).trimEnd() + '\n\n' + block);
    else copy(f);
  }
  process.stdout.write(`FinUI is in ${shown(dir)}${code ? `, with preset ${code}` : ''}. Load tokens.css, base.css and each component's CSS in registry.json's order, then import what you need.\n`);
}

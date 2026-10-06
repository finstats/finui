// The site the pages workflow publishes at https://finstats.github.io/finui/: the gallery and FinUI create as they are in
// the repository, FinUI's files for the installer to fetch, finui.css (every stylesheet joined), one small file of
// tokens for each option a preset can choose (p/<axis>/<option>.css), install.sh with the lists it needs filled in, and
// every icon as a file of its own, still and animated (icons/<name>.svg, icons/animated/<name>.svg).
// node tools/build-site.mjs <folder>
import fs from 'node:fs';
import path from 'node:path';
import { tokens, faces, stylesheet } from '../create/preset.js';
import { buildIcons } from './build-icons.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

export async function build(out) {
  const registry = JSON.parse(read('registry.json'));
  const presets = JSON.parse(read('create/presets.json'));
  const library = [...registry.foundation, ...registry.components.flatMap((c) => c.files), 'registry.json', 'LICENSE'];
  // The fonts every install brings: those base.css names, faces and licences. A preset's own come with its option files.
  const fonts = [...new Set([...read('base.css').matchAll(/fonts\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]))].sort();
  const write = (f, text) => { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.writeFileSync(path.join(out, f), text); };
  const copy = (f) => fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });

  fs.mkdirSync(out, { recursive: true });
  for (const f of ['index.html', 'demo', 'blocks', 'create', ...library, 'fonts']) copy(f);   // every font: a preset may name any
  write('finui.css', await stylesheet(registry, async (f) => read(f)));
  // An option's tokens alone; read in axis order, a later axis sets a token last, as tokens() lets it win.
  presets.axes.forEach((axis, a) => axis.options.forEach((option, o) => {
    if (!o) return;
    const choice = presets.axes.map((_, i) => (i === a ? o : 0));
    const set = tokens(presets, choice);
    write(`p/${a}/${o}.css`, `/* ${axis.label}: ${option.label} */\n${faces(presets, choice)}:root {\n${set.map(([t, v]) => `  ${t}: ${v};\n`).join('')}}\n`);
  }));
  buildIcons(path.join(out, 'icons'));
  write('install.sh', read('tools/install.sh')
    .replace('@COUNTS@', presets.axes.map((a) => a.options.length).join(' '))
    .replace('@FILES@', library.join(' '))
    .replace('@FONTS@', fonts.join(' ')));
}

function fail(m) { console.error(m); process.exit(1); }
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const out = process.argv[2] || fail('node tools/build-site.mjs <folder>');
  await build(path.resolve(out));
  console.log(`✓ the site is in ${out}`);
}

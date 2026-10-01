// The site the pages workflow publishes at https://finstats.github.io/finui/: the gallery and FinUI create as they are in
// the repository, FinUI's files for the installer to fetch, finui.css (every stylesheet joined), one small file of
// tokens for each option a preset can choose (p/<axis>/<option>.css), and install.sh with the lists it needs filled in.
// node tools/build-site.mjs <folder>
import fs from 'node:fs';
import path from 'node:path';
import { tokens, stylesheet } from '../create/preset.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

export async function build(out) {
  const registry = JSON.parse(read('registry.json'));
  const presets = JSON.parse(read('create/presets.json'));
  const library = [...registry.foundation, ...registry.components.flatMap((c) => c.files), 'registry.json', 'LICENSE'];
  const fonts = fs.readdirSync(path.join(root, 'fonts')).sort();
  const write = (f, text) => { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.writeFileSync(path.join(out, f), text); };
  const copy = (f) => fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });

  fs.mkdirSync(out, { recursive: true });
  for (const f of ['index.html', 'demo', 'create', ...library, 'fonts']) copy(f);
  write('finui.css', await stylesheet(registry, async (f) => read(f)));
  // An option's tokens alone; read in axis order, a later axis sets a token last, as tokens() lets it win.
  presets.axes.forEach((axis, a) => axis.options.forEach((option, o) => {
    if (!o) return;
    const set = tokens(presets, presets.axes.map((_, i) => (i === a ? o : 0)));
    write(`p/${a}/${o}.css`, `/* ${axis.label}: ${option.label} */\n:root {\n${set.map(([t, v]) => `  ${t}: ${v};\n`).join('')}}\n`);
  }));
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

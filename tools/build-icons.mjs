// Every icon as a file of its own: <folder>/<name>.svg as icon() draws it, and <folder>/animated/<name>.svg as it moves,
// its motion inside it. Both draw in currentColor. The site publishes them at icons/; any folder will do.
// node tools/build-icons.mjs <folder>
import fs from 'node:fs';
import path from 'node:path';
import { iconNames, iconSvg } from '../core.js';
import { animatedSvg } from '../components/animated-icon/svg.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/** Writes every icon, still and moving, into `out`; answers how many icons there are. */
export function buildIcons(out) {
  const css = fs.readFileSync(path.join(root, 'components/animated-icon/animated-icon.css'), 'utf8');
  fs.mkdirSync(path.join(out, 'animated'), { recursive: true });
  const names = iconNames();
  for (const name of names) {
    fs.writeFileSync(path.join(out, `${name}.svg`), iconSvg(name));
    fs.writeFileSync(path.join(out, 'animated', `${name}.svg`), animatedSvg(name, css));
  }
  return names.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const out = process.argv[2];
  if (!out) { console.error('node tools/build-icons.mjs <folder>'); process.exit(1); }
  console.log(`✓ ${buildIcons(path.resolve(out))} icons, still and animated, in ${out}`);
}

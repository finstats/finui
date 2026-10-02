// A block's code, to copy into a project of one's own: from blocks.js, the block's builder and every helper it reaches,
// with FinUI's imports pointed at where the installer puts FinUI (./finui/); from blocks.css, the rules of the classes it
// draws. Pure text work, so the gallery and a test run the same thing.

/** A block's function name: bar-chart → barChartBlock. */
export const blockName = (key) => key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()) + 'Block';

/** Code with its comments and the text of its strings taken out (a template's ${…} stays: that is code). */
function bare(code) {
  let out = '', i = 0;
  const skipString = (q) => { i++; while (i < code.length && code[i] !== q) { if (code[i] === '\\') i++; i++; } i++; out += q + q; };
  while (i < code.length) {
    const c = code[i], two = code.slice(i, i + 2);
    if (two === '//') { while (i < code.length && code[i] !== '\n') i++; }
    else if (two === '/*') { i = code.indexOf('*/', i + 2) + 2 || code.length; }
    else if (c === "'" || c === '"') skipString(c);
    else if (c === '`') {
      i++; out += '`';
      while (i < code.length && code[i] !== '`') {
        if (code[i] === '\\') { i += 2; continue; }
        if (code.slice(i, i + 2) === '${') { let depth = 1; i += 2; out += '${'; while (i < code.length && depth) { if (code[i] === '{') depth++; else if (code[i] === '}') depth--; if (depth) out += code[i]; i++; } out += '}'; continue; }
        i++;
      }
      i++; out += '`';
    } else { out += c; i++; }
  }
  return out;
}
/** A name used as code in `code`: not a property, not inside a word, a string or a comment, not a key of an object. */
const uses = (code, name) => new RegExp(`(?<![\\w.$-])${name}(?![\\w$-]|\\s*:)`).test(bare(code));

/** The top-level items of a module: each declaration with the comment above it, in the order they are written. */
function items(text) {
  const out = [];
  let comment = [], current = null;
  for (const line of text.split('\n')) {
    const decl = /^(?:export )?(?:function\*? |const |let )(\w+)/.exec(line);
    if (decl) { current = { name: decl[1], lines: [...comment, line] }; comment = []; out.push(current); continue; }
    if (/^(\/\*\*|\/\/| \*)/.test(line)) {
      // A comment at the top level belongs to what follows it; one that only marks a section belongs to nothing.
      if (!current || /^(\/\*\*|\/\/)/.test(line) || comment.length) { current = null; if (!/^\/\/ -{3}/.test(line)) comment.push(line); }
      else current.lines.push(line);
      continue;
    }
    if (current && line.trim()) current.lines.push(line);
    else if (!line.trim()) { current = null; comment = []; }
  }
  return out.map((i) => ({ name: i.name, code: i.lines.join('\n') }));
}

/** A block's builder: the expression its `render` returns, from its entry in BLOCKS. */
function render(text, key) {
  // At the start of a line: a block's own data may hold an object with a key of the same name, further in.
  const found = new RegExp(`^ {2}\\{ key: '${key}',`, 'm').exec(text);
  if (!found) throw new Error(`no block ${key}`);
  const at = found.index;
  const next = text.slice(at + 1).search(/\n {2}\{ key: '|\n\];/);
  const entry = text.slice(at, at + 1 + next);
  const r = entry.indexOf('render: () => ');
  return entry.slice(r + 'render: () => '.length).replace(/\s*\},?\s*$/, '');
}

/** The module to copy for block `key`: FinUI's imports, the helpers it needs and an exported function that builds it. */
export function blockSource(text, key, base = './finui/') {
  const decls = items(text).filter((d) => d.name !== 'BLOCKS');
  const imports = [...text.matchAll(/^import \{([^}]+)\} from '([^']+)';$/gm)].map(([, names, from]) => ({ names: names.split(',').map((n) => n.trim()), from }));
  const name = blockName(key);
  const main = `/** ${key}: a block of FinUI's. Put it where it belongs: document.querySelector('main').append(${name}()); */\nexport function ${name}() {\n  return ${render(text, key)};\n}`;
  // Every helper the block reaches, and every helper those reach.
  const wanted = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    const code = [main, ...decls.filter((d) => wanted.has(d.name)).map((d) => d.code)].join('\n');
    for (const d of decls) if (!wanted.has(d.name) && uses(code, d.name)) { wanted.add(d.name); grew = true; }
  }
  const body = [...decls.filter((d) => wanted.has(d.name)).map((d) => d.code), main].join('\n\n');
  const lines = imports.map(({ names, from }) => {
    const used = names.filter((n) => uses(body, n));
    return used.length ? `import { ${used.join(', ')} } from '${from.replace(/^\.\.\//, base)}';` : null;
  }).filter(Boolean);
  return `${lines.join('\n')}\n\n${body}\n`;
}

/** The rules of blocks.css that style any of `classes`, each with the comment above it; '' for none. */
export function blockCss(text, classes) {
  if (!classes.length) return '';
  const want = new RegExp(`\\.(${classes.map((c) => c.replace(/[-]/g, '\\-')).join('|')})(?![\\w-])`);
  const out = [];
  let comment = '';
  for (const m of text.matchAll(/(\/\*[\s\S]*?\*\/)|([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1]) { comment = m[1]; continue; }
    const selector = m[2].trim();
    if (want.test(selector)) { if (comment) out.push(comment); out.push(`${selector} {${m[3]}}`); }
    comment = '';
  }
  return out.length ? out.join('\n') + '\n' : '';
}

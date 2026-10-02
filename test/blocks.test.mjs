// A block's code, as the gallery shows it to copy: a module that needs nothing but FinUI installed beside it, and the CSS
// of the classes it draws. Pure text work over blocks.js and blocks.css, so it is held here; the QA stage runs the code.
// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { blockSource, blockCss, blockName } from '../blocks/source.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const js = read('blocks/blocks.js');
const css = read('blocks/blocks.css');
const keys = [...js.matchAll(/^ {2}\{ key: '([a-z0-9-]+)'/gm)].map((m) => m[1]);
// Everything blocks.js declares at its top level, and what it imports: a name a block's code uses must be one of its own.
const declared = [...js.matchAll(/^(?:function\*? |const |let )(\w+)/gm)].map((m) => m[1]);
// An import names a thing as the code calls it: `calendar as monthPicker` is monthPicker.
const local = (x) => x.trim().split(/\s+as\s+/).pop();
const imported = [...js.matchAll(/^import \{([^}]+)\}/gm)].flatMap((m) => m[1].split(',').map(local));
// Comments and the text of strings say nothing about what code uses: "the busiest month" is not a call of month().
const plain = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const uses = (code, name) => new RegExp(`(?<![\\w.$-])${name}(?![\\w$-]|\\s*:)`).test(plain(code));

test('every block has code', () => {
  assert.ok(keys.length >= 40, `${keys.length} blocks`);
  for (const k of keys) assert.match(blockSource(js, k), new RegExp(`export function ${blockName(k)}\\(\\)`), k);
  assert.equal(blockName('bar-chart'), 'barChartBlock');
});

test('a block’s code declares or imports everything it uses, and nothing it does not', () => {
  for (const k of keys) {
    const code = blockSource(js, k);
    const own = [...code.matchAll(/^(?:function\*? |const |let |export function )(\w+)/gm)].map((m) => m[1]);
    const brought = [...code.matchAll(/^import \{([^}]+)\}/gm)].flatMap((m) => m[1].split(',').map(local));
    for (const name of [...declared, ...imported].filter((n) => n !== 'BLOCKS')) {
      const body = code.replace(/^import .*$/gm, '');
      if (uses(body.replace(new RegExp(`^(?:function\\*? |const |let )${name}\\b`, 'm'), ''), name)) assert.ok(own.includes(name) || brought.includes(name), `${k}: uses ${name} without it`);
    }
    for (const name of brought) assert.ok(uses(code.replace(/^import .*$/gm, ''), name), `${k}: imports ${name} and never uses it`);
    assert.ok(!code.includes('BLOCKS'), `${k}: carries the list of blocks`);
  }
});

test('its imports are FinUI’s, from where the installer puts it', () => {
  for (const k of keys) {
    const code = blockSource(js, k);
    for (const [, from] of code.matchAll(/^import .* from '([^']+)';$/gm)) assert.match(from, /^\.\/finui\/(core\.js|components\/[a-z-]+\/[a-z-]+\.js)$/, `${k}: ${from}`);
    assert.ok(!code.includes('../'), `${k}: a path of the gallery's`);
  }
  assert.match(blockSource(js, 'calendar', 'https://example.org/finui/'), /from 'https:\/\/example\.org\/finui\/core\.js'/, 'another base');
});

test('a block’s CSS is the rules of the classes it draws, and every one of them', () => {
  const sheet = blockCss(css, ['blk-agenda', 'blk-agenda__day', 'blk-list']);
  assert.match(sheet, /\.blk-agenda__day \{/);
  assert.match(sheet, /\.blk-agenda__day \+ \.blk-agenda__day/, 'a rule naming two of its classes');
  assert.doesNotMatch(sheet, /\.blk-radar|\.blk-side/, 'rules of other blocks');
  assert.equal(blockCss(css, []), '', 'no classes, no rules');
  for (const rule of sheet.split('}').filter((r) => r.trim())) assert.match(rule, /\.blk-/, `a rule of no block: ${rule}`);
});

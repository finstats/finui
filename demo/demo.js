// The FinUI site: a landing that shows FinUI on a page you restyle, an index of every block and component, a workbench
// for each — the example, its switches and the list of its kind on one screen — and the foundation (tokens and icons).
// It is made of FinUI: every part a person sees is one of FinUI's components, and demo.css only lays them out (a test
// holds it to that). Its styles come from registry.json in its order, as a host page would load them. Invented data only.

import { h, icon, mount, iconNames } from '../core.js';
import { button } from '../components/button/button.js';
import { card } from '../components/card/card.js';
import { facts } from '../components/facts/facts.js';
import { pageHeader } from '../components/page-header/page-header.js';
import { sectionNav } from '../components/sections/sections.js';
import { segmented } from '../components/segmented/segmented.js';
import { settingRow } from '../components/setting-row/setting-row.js';
import { themeSwitch } from '../components/theme-switch/theme-switch.js';
import { themeFrame } from '../components/theme-frame/theme-frame.js';
import { topBar } from '../components/top-bar/top-bar.js';
import { codeBlock } from '../components/code-block/code-block.js';
import { swatch } from '../components/swatch/swatch.js';
import { animatedIcon } from '../components/animated-icon/animated-icon.js';
import { emptyState } from '../components/empty/empty.js';
import { toggle } from '../components/toggle/toggle.js';
import { copyButton } from '../components/copy/copy.js';
import { BLOCKS } from '../blocks/blocks.js';
import { blockSource, blockCss } from '../blocks/source.js';
import { landing, componentIndex, blockIndex, nameOf } from './landing.js';

const root = document.getElementById('demo');
const CATEGORY = { primitive: 'Primitives', pattern: 'Patterns', chart: 'Charts' };
// Where an example is drawn: in the page's own theme (one example, as large as the screen allows), both themes side by
// side, or at a phone's width. The choice is the browser's, kept like the theme.
const VIEWS = [{ value: 'page', label: 'Page theme' }, { value: 'both', label: 'Both themes' }, { value: 'phone', label: '360 px' }];
const keep = (key, value) => { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* not kept */ } };
const kept = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
let view = VIEWS.some((v) => v.value === kept('finui.view')) ? kept('finui.view') : 'page';
let repaint = () => {};   // the landing's, for a change of theme

// ---- the theme of the page itself, kept in this browser
const dark = matchMedia('(prefers-color-scheme: dark)');
/** The theme the page is in now: the one chosen, else the device's. */
const scheme = () => document.documentElement.dataset.theme || (dark.matches ? 'dark' : 'light');
/** A change of theme repaints nothing: the frames drawn in the page's theme take the new one where they stand, so an
 *  example keeps what its switches made of it, and the landing's preview follows. */
function retheme() {
  const sc = scheme();
  for (const f of document.querySelectorAll('.demo-frames.is-page > .demo-frame, .demo-frames.is-phone > .demo-frame')) {
    for (const s of ['light', 'dark']) { f.classList.toggle(`is-${s}`, s === sc); f.classList.toggle(`fui-theme-frame--${s}`, s === sc); }
  }
  repaint();
}
function applyTheme(choice) {
  if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice;
  else delete document.documentElement.dataset.theme;
  keep('finui.theme', choice === 'device' ? null : choice);
  retheme();
}
dark.addEventListener('change', retheme);

function frames(render) {
  const frame = (sc, phone = false) => themeFrame({ scheme: sc, phone, class: ['demo-frame', `is-${sc}`, phone && 'is-phone'].filter(Boolean).join(' ') }, render());
  if (view === 'phone') return h('div', { class: 'demo-frames is-phone' }, frame(scheme(), true));
  if (view === 'both') return h('div', { class: 'demo-frames is-both' }, frame('light'), frame('dark'));
  return h('div', { class: 'demo-frames is-page' }, frame(scheme()));
}
/** Where the example is drawn. `redraw` draws the frames again and nothing else, so an example keeps what its switches
 *  made of it. */
const viewSwitch = (redraw) => segmented({ label: 'Where the example is drawn', size: 'sm', value: view, options: VIEWS, onChange: (v) => { view = v; keep('finui.view', v); redraw(); } });

// ---- a workbench: the list of its kind, the example as large as the screen allows, its switches beside it
/** The switches of a playground, and the example they draw: switches turn its features on (one may turn others off), a
 *  choice picks between variants, and the example is drawn again at every change. Each switch is a setting row. */
function playground(name, p, onChange = () => {}) {
  const state = Object.fromEntries(p.controls.map((c) => [c.key, c.choices ? c.choices[0][0] : !!c.on]));
  const canvas = h('div', { class: 'wb-canvas' });
  const draw = () => { mount(canvas, frames(() => p.render({ ...state }))); onChange({ ...state }); };
  const switches = {};
  const rows = p.controls.map((c) => {
    const id = `play-${name}-${c.key}`;
    let control;
    if (c.choices) {
      const pick = (v) => { state[c.key] = v; draw(); };
      // A few choices side by side; more than fit the panel, a list to open.
      control = c.choices.length > 4
        ? h('select', { class: 'fui-field__input demo-play__select', 'aria-labelledby': `${id}-label`, onChange: (e) => pick(e.target.value) }, c.choices.map(([value, label]) => h('option', { value, selected: value === state[c.key] }, label)))
        : segmented({ label: c.label, size: 'sm', value: state[c.key], options: c.choices.map(([value, label]) => ({ value, label })), onChange: pick });
    } else {
      control = toggle({ checked: state[c.key], labelledby: `${id}-label`, onChange: (on) => {
        state[c.key] = on;
        if (on) for (const other of c.excludes || []) if (state[other]) { state[other] = false; switches[other].setAttribute('aria-checked', 'false'); }
        draw();
      } });
      switches[c.key] = control;
    }
    const [row] = settingRow({ id, label: c.label, control });
    row.classList.add('demo-play__control');
    if (c.choices) row.classList.add('demo-play__control--choice');
    row.dataset.control = c.key;
    return row;
  });
  draw();
  const panel = card({ title: 'Switches', cls: 'demo-play__controls wb-panel', body: h('div', { class: 'fui-setting-row__rows' }, rows) });
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'What it does');
  const el = h('section', { class: 'demo-example demo-play wb-bench' }, canvas, panel);
  return { el, draw };
}

/** The list of a kind, and when it is long a field that narrows it: what is typed is looked for in each name, Enter
 *  opens the first that is left, Esc gives the whole list back. */
function sideList(list, current, label) {
  const nav = sectionNav('#', list, current, label);
  if (list.length < 12) return [nav];
  const input = h('input', { class: 'fui-field__input', type: 'search', placeholder: 'Find…', 'aria-label': `Find in ${label.toLowerCase()}`, autocomplete: 'off', spellcheck: false });
  const shown = () => [...nav.querySelectorAll('.fui-sections__link')].filter((a) => !a.hidden);
  const narrow = () => {
    const words = input.value.trim().toLowerCase();
    for (const a of nav.querySelectorAll('.fui-sections__link')) a.hidden = !!words && !(a.textContent.toLowerCase().includes(words) || a.getAttribute('href').includes(words));
    for (const g of nav.querySelectorAll('.fui-sections__group')) g.hidden = !g.querySelector('.fui-sections__link:not([hidden])');
  };
  input.addEventListener('input', narrow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const a = shown()[0]; if (a) { e.preventDefault(); location.hash = a.getAttribute('href').slice(1); } }
    if (e.key === 'Escape' && input.value) { e.preventDefault(); e.stopPropagation(); input.value = ''; narrow(); }
  });
  return [h('div', { class: 'wb-find' }, input), nav];
}

function workbench(slot, { list, current, label, title, code, purpose, tools, bench, below }) {
  mount(slot, h('div', { class: 'wb' },
    h('aside', { class: ['wb-side', list.length >= 12 && 'is-long'] }, sideList(list, current, label)),
    h('div', { class: 'wb-main' },
      pageHeader(code ? [title, ' ', h('span', { class: 'mono muted' }, code)] : title, purpose, h('div', { class: 'wb-tools' }, tools)),
      bench, below)));
}

function docs(meta) {
  const about = [['Use it', meta.use], ['Not for', meta.avoid], ['Variants', meta.variants && meta.variants.join(', ')],
    ['States', meta.states && meta.states.length ? meta.states.join(', ') : null], ['Accessibility', meta.a11y]].filter(([, v]) => v);
  return h('div', { class: 'wb-docs' },
    card({ title: 'About', body: facts(about.map(([k, v]) => [k, v, { wide: true }])) }),
    meta.props ? card({ title: 'Props', body: facts(Object.entries(meta.props).map(([k, v]) => [h('span', { class: 'mono' }, k), v, { wide: true }])) }) : null);
}

function componentPage(slot, site, section) {
  const meta = section.meta || {};
  const name = meta.name || section.key;
  const fixed = (meta.examples || []).map((x) => x.render);
  const canvas = h('div', { class: 'wb-canvas' });
  const bench = meta.playground ? playground(name, meta.playground)
    : { el: h('section', { class: 'demo-example demo-play wb-bench' }, canvas), draw: () => mount(canvas, fixed.map(frames)) };
  if (!meta.playground) bench.draw();
  workbench(slot, {
    list: site.components, current: section.key, label: 'Components', title: nameOf(name), code: name, purpose: meta.purpose || '',
    tools: viewSwitch(bench.draw), bench: bench.el, below: docs(meta),
  });
}

// ---- a block's code, to paste into a project with FinUI in ./finui: its module, its CSS, its HTML
let texts = null;
const sourceTexts = () => (texts ??= Promise.all(['blocks/blocks.js', 'blocks/blocks.css'].map(async (f) => (await fetch(f)).text())));
async function codePanel(b, state = null) {
  const [js, css] = await sourceTexts();
  const el = state ? b.playground.render(state) : b.render();
  const classes = [...new Set([el, ...el.querySelectorAll('[class]')].flatMap((e) => [...e.classList]).filter((c) => c.startsWith('blk-')))];
  return codeBlock({
    label: 'Code', fill: true, class: 'demo-code',
    note: ['With FinUI in ./finui (curl -fsSL https://finstats.github.io/finui/install.sh | sh) and its stylesheets on the page: add the CSS, import the JavaScript, and append ',
      h('code', { class: 'mono' }, `${b.key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())}Block()`), ' where it belongs. The HTML is the same block, drawn once, without its behaviour.'],
    panes: [
      { key: 'js', label: 'JavaScript', text: blockSource(js, b.key, './finui/', state ? b.playground.code(state) : null) },
      { key: 'css', label: 'CSS', text: blockCss(css, classes) || '/* Nothing to add: FinUI’s own stylesheets draw this block. */\n' },
      { key: 'html', label: 'HTML', text: el.outerHTML, wrap: true },
    ],
  });
}

/** A block: the example and its switches, and in the same place its code — the same code, with only what is on in it. */
function blockPage(slot, site, b) {
  let tab = 'preview';
  const codeSlot = h('div', { class: 'wb-codebox' });
  const copySlot = h('span', { class: 'demo-block__head' });
  let asked = 0;
  const follow = async (state) => {
    const mine = ++asked;
    const html = b.playground.render(state).outerHTML;
    mount(copySlot, copyButton(html, `Copy the HTML of ${b.name}`));
    try {
      const panel = await codePanel(b, state);
      if (mine === asked) mount(codeSlot, panel);
    } catch (e) { mount(codeSlot, emptyState('The code could not be read', e.message)); }
  };
  const bench = playground(b.key, b.playground, follow);
  const area = h('div', { class: ['wb-area', b.wide && 'is-wide'], dataset: { tab } }, bench.el, codeSlot);
  const tabs = segmented({ label: 'Preview or code', size: 'sm', value: tab, options: [{ value: 'preview', label: 'Preview' }, { value: 'code', label: 'Code' }], onChange: (v) => { tab = v; area.dataset.tab = v; } });
  workbench(slot, {
    list: site.blocks, current: `block-${b.key}`, label: 'Blocks', title: b.name, purpose: `${b.about} Switch on what it needs; its code has that and nothing more.`,
    tools: [copySlot, tabs, viewSwitch(bench.draw)], bench: area, below: null,
  });
}

// ---- the foundation: tokens and icons
async function foundation(slot) {
  const text = await (await fetch('tokens.css')).text();
  const colours = [...text.matchAll(/^\s*(--[a-z0-9-]+):\s*light-dark\(/gm)].map((m) => m[1]);
  const paint = () => mount(slot, h('div', { class: 'site-page' },
    pageHeader('Foundation', 'Every colour is a token, and every token names its light and its dark value in one declaration. The element builder (h) and the icons are core.js; numbers and initials are format.js.', viewSwitch(paint)),
    card({ title: `Colour tokens (${colours.length})`, body: frames(() => h('div', { class: 'demo-swatches' }, colours.map((t) => h('div', { class: 'demo-swatch' }, swatch([`var(${t})`]), h('span', { class: 'mono muted' }, t))))) }),
    card({ title: `Icons (${iconNames().length})`, sub: 'Each icon twice: as it stands still (icon), and as it moves (animatedIcon), drawn in, doing what it is about and drawn out again.',
      body: frames(() => h('ul', { class: 'demo-icons' }, iconNames().map((n) => h('li', { class: 'demo-icon', title: n, dataset: { icon: n } },
        h('span', { class: 'demo-icon__still' }, icon(n, 20)), h('span', { class: 'demo-icon__moving' }, animatedIcon(n, { size: 20 })), h('span', { class: 'mono muted' }, n))))) })));
  paint();
}

const indexPage = (slot, title, line, body) => mount(slot, h('div', { class: 'site-page' }, pageHeader(title, line), body));

async function start() {
  const registry = await (await fetch('registry.json')).json();
  const presets = await (await fetch('create/presets.json')).json();
  // Each component's stylesheet after the foundation, in the registry's order: the order the cascade was written for.
  const sheets = [...registry.foundation.filter((f) => f.endsWith('.css')), ...registry.components.flatMap((c) => c.files.filter((x) => x.endsWith('.css')))];
  for (const f of sheets.filter((x) => !registry.foundation.includes(x))) document.head.append(h('link', { rel: 'stylesheet', href: f }));
  const metas = await Promise.all(registry.components.map(async (c) => {
    // The module named after the component holds its meta; another beside it (calendar's dates.js) is its own parts.
    const js = c.files.find((f) => f.endsWith(`/${c.name}.js`)) || c.files.find((f) => f.endsWith('.js'));
    return js ? ((await import('../' + js)).meta || {}) : {};
  }));
  const site = {
    components: registry.components.map((c, i) => ({ key: c.name, label: nameOf(c.name), icon: 'layers', group: CATEGORY[c.category] || 'Components', meta: metas[i] })),
    blocks: BLOCKS.map((b) => ({ key: `block-${b.key}`, label: b.name, icon: b.icon, group: b.group, block: b })),
  };
  const here = new URL('.', location.href).href;
  const previewSheets = [...sheets, 'demo/demo.css'].map((f) => new URL(f, here).href);

  const slot = h('div', { class: 'site-slot' });
  const bar = topBar({ brand: { name: 'FinUI', href: '#/' }, label: 'FinUI',
    links: [{ href: '#/components', label: 'Components', key: 'components' }, { href: '#/blocks', label: 'Blocks', key: 'blocks' }, { href: '#/foundation', label: 'Foundation', key: 'foundation' },
      { href: 'create/', label: 'Create', key: 'create' }, { href: 'https://finstats.github.io/finmotion/', label: 'FinMotion' }, { href: 'https://github.com/finstats/finui', label: 'GitHub' }],
    actions: themeSwitch({ value: kept('finui.theme') || 'device', onChange: applyTheme }) });
  mount(root,
    button({ href: '#main', class: 'site-skip', onClick: (e) => { e.preventDefault(); document.getElementById('main').focus(); } }, 'Skip to the page'),
    bar,
    h('main', { class: 'site-main', id: 'main', tabindex: '-1' }, slot),
    h('footer', { class: 'site-foot muted' }, 'FinUI is free software under the GNU GPL v3. Its fonts are under the SIL Open Font License.'));

  async function route() {
    const key = location.hash.replace(/^#\/?/, '');
    const section = [...site.components, ...site.blocks].find((s) => s.key === key);
    bar.setCurrent(section ? (section.block ? 'blocks' : 'components') : key);
    root.dataset.page = section ? 'bench' : (key || 'landing');
    repaint = () => {};
    if (section && section.block) { document.title = `${section.label} · FinUI`; blockPage(slot, site, section.block); return; }
    if (section) { document.title = `${section.label} · FinUI`; componentPage(slot, site, section); return; }
    if (key === 'foundation') { document.title = 'Foundation · FinUI'; await foundation(slot); return; }
    if (key === 'components') { document.title = 'Components · FinUI'; indexPage(slot, 'Components', `${registry.components.length} of them, each with an example to play with, what it is for and what it is not.`, componentIndex(registry, metas)); return; }
    if (key === 'blocks') { document.title = 'Blocks · FinUI'; indexPage(slot, 'Blocks', 'Components put together, with switches for what goes in and the code for exactly that.', blockIndex(BLOCKS)); return; }
    document.title = 'FinUI';
    const page = landing(slot, { registry, metas, blocks: BLOCKS, presets, sheets: previewSheets, scheme });
    repaint = () => page.scheme(scheme());
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo({ top: 0 }); });
  route();
}

start().catch((e) => mount(root, emptyState('The site could not start', String(e && e.message || e))));

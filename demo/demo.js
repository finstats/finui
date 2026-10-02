// The FinUI demo: every component drawn from its own `meta`, each example in both themes side by side or at phone
// width, a page of the foundation (tokens and icons), and a showcase of the components together. Invented data only.
// It is FinUI using itself: the page is built with h() and FinUI's own components, and its styles come from
// registry.json in its order, as a host page would load them.

import { h, icon, mount, iconNames } from '../core.js';
import { num } from '../format.js';
import { sectionNav, sectionLayout } from '../components/sections/sections.js';
import { segmented } from '../components/segmented/segmented.js';
import { themeSwitch } from '../components/theme-switch/theme-switch.js';
import { pageHeader } from '../components/page-header/page-header.js';
import { card } from '../components/card/card.js';
import { statTile } from '../components/stat-tile/stat-tile.js';
import { rankList } from '../components/rank-list/rank-list.js';
import { mediaCard, mediaGrid } from '../components/media-card/media-card.js';
import { poster } from '../components/poster/poster.js';
import { avatar } from '../components/avatar/avatar.js';
import { dataTable } from '../components/data-table/data-table.js';
import { facts } from '../components/facts/facts.js';
import { badge, status } from '../components/badge/badge.js';
import { chip, chipSet } from '../components/chip/chip.js';
import { meter } from '../components/meter/meter.js';
import { pagination } from '../components/pagination/pagination.js';
import { button } from '../components/button/button.js';
import { animatedIcon } from '../components/animated-icon/animated-icon.js';
import { emptyState } from '../components/empty/empty.js';
import { formField } from '../components/field/field.js';
import { toggle } from '../components/toggle/toggle.js';
import { copyButton } from '../components/copy/copy.js';
import { BLOCKS } from '../blocks/blocks.js';
import { blockSource, blockCss } from '../blocks/source.js';

const root = document.getElementById('demo');
const CATEGORY = { primitive: 'Primitives', pattern: 'Patterns', chart: 'Charts' };
const VIEWS = [{ value: 'both', label: 'Both themes' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'phone', label: '360 px' }];
let view = 'both';

// ---- the theme of the page itself, kept in this browser
function applyTheme(choice) {
  if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice;
  else delete document.documentElement.dataset.theme;
  try { if (choice === 'device') localStorage.removeItem('finui.theme'); else localStorage.setItem('finui.theme', choice); } catch { /* not kept */ }
}
const stored = (() => { try { return localStorage.getItem('finui.theme') || 'device'; } catch { return 'device'; } })();

function frames(render) {
  const frame = (scheme, phone = false) => h('div', { class: ['demo-frame', 'is-' + scheme, phone && 'is-phone'] }, render());
  if (view === 'phone') return h('div', { class: 'demo-frames is-single' }, frame('light', true), frame('dark', true));
  if (view === 'light' || view === 'dark') return h('div', { class: 'demo-frames is-single' }, frame(view));
  return h('div', { class: 'demo-frames' }, frame('light'), frame('dark'));
}

function docs(meta) {
  const row = (label, value) => (value ? [h('dt', null, label), h('dd', null, value)] : null);
  return h('div', { class: 'demo-stack' },
    h('dl', { class: 'demo-about' }, row('Use it', meta.use), row('Not for', meta.avoid), row('Variants', meta.variants && meta.variants.join(', ')),
      row('States', meta.states && meta.states.length ? meta.states.join(', ') : null), row('Accessibility', meta.a11y)),
    meta.props ? [h('h3', { class: 'demo-h' }, 'Props'), h('dl', { class: 'demo-props' }, Object.entries(meta.props).map(([k, v]) => [h('dt', { class: 'mono' }, k), h('dd', null, v)]))] : null);
}

/** One example to play with: switches turn its features on (one may turn others off), a choice picks between variants,
 *  and the example is drawn again in both themes at every change. */
function playground(name, p, onChange = () => {}) {
  const state = Object.fromEntries(p.controls.map((c) => [c.key, c.choices ? c.choices[0][0] : !!c.on]));
  const stage = h('div');
  const draw = () => { mount(stage, frames(() => p.render({ ...state }))); onChange({ ...state }); };
  const switches = {};
  const controls = p.controls.map((c) => {
    const id = `play-${name}-${c.key}`;
    if (c.choices) {
      const pick = (v) => { state[c.key] = v; draw(); };
      // A few choices side by side; more than fit a phone's width, a list to open.
      const input = c.choices.length > 5
        ? h('select', { class: 'fui-field__input demo-play__select', 'aria-labelledby': id, onChange: (e) => pick(e.target.value) }, c.choices.map(([value, label]) => h('option', { value, selected: value === state[c.key] }, label)))
        : segmented({ label: c.label, size: 'sm', value: state[c.key], options: c.choices.map(([value, label]) => ({ value, label })), onChange: pick });
      return h('div', { class: 'demo-play__control demo-play__control--choice', dataset: { control: c.key } }, h('span', { class: 'demo-play__label', id }, c.label), input);
    }
    const sw = toggle({ checked: state[c.key], labelledby: id, onChange: (on) => {
      state[c.key] = on;
      if (on) for (const other of c.excludes || []) if (state[other]) { state[other] = false; switches[other].setAttribute('aria-checked', 'false'); }
      draw();
    } });
    switches[c.key] = sw;
    return h('div', { class: 'demo-play__control', dataset: { control: c.key } }, sw, h('span', { class: 'demo-play__label', id }, c.label));
  });
  draw();
  return h('section', { class: 'demo-example demo-play' }, h('div', { class: 'demo-play__controls', role: 'group', 'aria-label': 'What it does' }, controls), stage);
}

function viewBar(title, repaint) {
  return h('div', { class: 'demo-bar' }, h('h3', { class: 'demo-h' }, title),
    segmented({ label: 'Where the examples are drawn', size: 'sm', value: view, options: VIEWS, onChange: (v) => { view = v; repaint(); } }));
}

// ---- the foundation: tokens and icons
async function foundation(slot) {
  const text = await (await fetch('tokens.css')).text();
  const colours = [...text.matchAll(/^\s*(--[a-z0-9-]+):\s*light-dark\(/gm)].map((m) => m[1]);
  const paint = () => mount(slot,
    h('p', { class: 'demo-purpose' }, 'Every colour is a token, and every token names its light and its dark value in one declaration. The element builder (h) and the icons are core.js; numbers and initials are format.js.'),
    viewBar(`Colour tokens (${colours.length})`, paint),
    frames(() => h('div', { class: 'demo-swatches' }, colours.map((t) => h('div', { class: 'demo-swatch' }, h('span', { class: 'demo-swatch-chip', style: { background: `var(${t})` } }), h('span', { class: 'mono' }, t))))),
    h('h3', { class: 'demo-h' }, `Icons (${iconNames().length})`),
    h('p', { class: 'demo-purpose' }, 'Each icon twice: as it stands still (icon), and as it moves (animatedIcon), drawn in, doing what it is about and drawn out again.'),
    frames(() => h('ul', { class: 'demo-icons' }, iconNames().map((n) => h('li', { class: 'demo-icon', title: n, dataset: { icon: n } },
      h('span', { class: 'demo-icon__still' }, icon(n, 20)), h('span', { class: 'demo-icon__moving' }, animatedIcon(n, { size: 20 })), h('span', { class: 'mono' }, n))))));
  paint();
}

// ---- the components together, as a page of an app would use them
function showcase(slot) {
  const films = ['Big Buck Bunny', 'Sintel', 'Tears of Steel', 'Cosmos Laundromat', 'Elephants Dream', 'Spring'];
  const draw = () => h('div', { class: 'demo-stack' },
    pageHeader('Living room', 'An invented week on an invented server'),
    h('div', { class: 'fui-stat-tile__grid' },
      statTile({ label: 'Watch time', value: '42h 10m', current: 42, previous: 36, vsLabel: 'vs last week' }),
      statTile({ label: 'Plays', value: '128', current: 128, previous: 140, vsLabel: 'vs last week' }),
      statTile({ label: 'People', value: '5', current: 5, previous: 5, vsLabel: 'vs last week' }),
      statTile({ label: 'Last played', value: 'just now', hint: 'Spring' })),
    h('div', { class: 'demo-grid-2' },
      card({ title: 'Most watched', sub: 'By watch time', body: rankList(films.slice(0, 5).map((f, i) => ({ href: '#/showcase', thumb: poster(null, f, { cls: 'fui-poster--sm' }), name: f, sub: `${2008 + i * 2} · ${5 - i} users`, value: `${12 - i * 2}h ${10 + i * 7}m`, note: `${num(31 - i * 5)} plays` }))) }),
      card({ title: 'Who watched', body: rankList(['alice', 'bob', 'carol'].map((p, i) => ({ href: '#/showcase', thumb: avatar(null, p, { size: 36 }), name: p, value: `${20 - i * 6}h`, note: `${num(40 - i * 11)} plays` }))) })),
    card({ title: 'Recently added', actions: button({ size: 'sm', variant: 'ghost', href: '#/showcase' }, 'Everything in it', icon('chevronRight', 13)),
      body: mediaGrid(films.map((f, i) => mediaCard({ href: '#/showcase', poster: poster(null, f, { cls: 'fui-poster--grid' }), name: f, sub: `${2006 + i} · added ${i + 1}d ago` }))) }),
    card({ title: 'Plays', cls: 'fui-card--flush', body: [dataTable(h('table', { class: 'fui-data-table' },
      h('thead', null, h('tr', null, h('th', null, 'Title'), h('th', null, 'Who'), h('th', null, 'How'), h('th', { class: 'r' }, 'Watched'), h('th', { class: 'r' }, 'Progress'))),
      h('tbody', null, films.slice(0, 4).map((f, i) => h('tr', null, h('td', null, f), h('td', null, ['alice', 'bob', 'carol', 'dave'][i]),
        h('td', null, badge({ dot: true }, ['Direct play', 'Transcode', 'Direct play', 'Direct stream'][i])), h('td', { class: 'mono r' }, `${1 + i}h ${12 * i}m`),
        h('td', { class: 'r' }, h('span', { class: 'demo-row' }, meter({ value: [1, 0.62, 0.3, 0.9][i] }), h('span', { class: 'mono' }, `${[100, 62, 30, 90][i]}%`))))))), { filter: true }),
      pagination({ page: 1, perPage: 4, total: 128, onPage: () => {} })] }),
    h('div', { class: 'demo-grid-2' },
      card({ title: 'A file', body: [facts([['Resolution', '1080p HEVC'], ['Size', '4.1 GB', { mono: true }], ['Audio', 'English · Japanese'], ['Added', '3 days ago'], ['Path', h('span', { class: 'mono' }, '/media/films/Big Buck Bunny (2008)/Big Buck Bunny.mkv'), { wide: true }]]),
        h('p', { class: 'fui-field__help' }, 'Everything here is invented.'),
        h('div', { class: 'demo-row' }, status({ tone: 'good' }, 'Connected'), status({ tone: 'warning' }, 'Slow to answer'), badge({ live: true }, 'Live')),
        chipSet(chip('Drama'), chip('Animation'), chip('Short'))] }),
      card({ title: 'Settings', body: h('div', { class: 'demo-stack' },
        formField({ id: 'demo-name', label: 'Name', placeholder: 'Living room', help: 'What this server is called here.' }).el,
        h('div', { class: 'demo-row' }, h('span', { id: 'demo-pub' }, 'Public profiles'), toggle({ checked: true, onChange: () => {}, labelledby: 'demo-pub' })),
        segmented({ label: 'Measure', value: 'time', options: [{ value: 'time', label: 'Watch time' }, { value: 'plays', label: 'Plays' }], onChange: () => {} }),
        h('div', { class: 'demo-row' }, button({ variant: 'primary' }, 'Save'), button({ variant: 'ghost' }, 'Cancel'))) })),
    card({ title: 'Nothing yet', body: emptyState('No plays in this range', 'Plays appear here as they happen.', button({ size: 'sm' }, icon('refresh', 13), 'Look again')) }));
  const paint = () => mount(slot, h('p', { class: 'demo-purpose' }, 'The components together, the way a page of finstats uses them.'), viewBar('A page', paint), frames(draw));
  paint();
}

// ---- a block's code, to paste into a project with FinUI in ./finui: its module, its CSS, its HTML
let texts = null;
const sourceTexts = () => (texts ??= Promise.all(['blocks/blocks.js', 'blocks/blocks.css'].map(async (f) => (await fetch(f)).text())));
const TAKE = [{ value: 'js', label: 'JavaScript' }, { value: 'css', label: 'CSS' }, { value: 'html', label: 'HTML' }];
async function codePanel(b, state = null) {
  const [js, css] = await sourceTexts();
  const el = state ? b.playground.render(state) : b.render();
  const classes = [...new Set([el, ...el.querySelectorAll('[class]')].flatMap((e) => [...e.classList]).filter((c) => c.startsWith('blk-')))];
  const code = { js: blockSource(js, b.key, './finui/', state ? b.playground.code(state) : null), css: blockCss(css, classes) || '/* Nothing to add: FinUI’s own stylesheets draw this block. */\n', html: el.outerHTML };
  let lang = 'js';
  const copySlot = h('span');
  const panes = TAKE.map(({ value }) => h('pre', { class: 'demo-code__pane mono', dataset: { lang: value }, hidden: value !== lang, tabindex: 0 }, code[value]));
  const show = () => { panes.forEach((p) => { p.hidden = p.dataset.lang !== lang; }); mount(copySlot, copyButton(code[lang], `Copy the ${TAKE.find((t) => t.value === lang).label}`)); };
  show();
  return h('section', { class: 'demo-code', 'aria-label': 'Code' },
    h('div', { class: 'demo-code__bar' }, segmented({ label: 'Code', size: 'sm', value: lang, options: TAKE, onChange: (v) => { lang = v; show(); } }), copySlot),
    h('p', { class: 'demo-code__how' }, 'With FinUI in ./finui (curl -fsSL https://finstats.github.io/finui/install.sh | sh) and its stylesheets on the page: add the CSS, import the JavaScript, and append ', h('code', { class: 'mono' }, `${b.key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())}Block()`), ' where it belongs. The HTML is the same block, drawn once, without its behaviour.'),
    panes);
}

// ---- a block: a card's worth of an app, one of those FinUI create draws a preset on, with its HTML to copy
function blockPage(slot, b) {
  if (b.playground) return blockPlay(slot, b);
  const paint = () => {
    const html = b.render().outerHTML;
    mount(slot, h('h2', { class: 'fui-page-header__title' }, b.name),
      h('p', { class: 'demo-purpose' }, `${b.about} Copy its HTML and style it with finui.css and blocks/blocks.css; its controls come alive with the components’ own JavaScript, as in blocks/blocks.js.`),
      viewBar('Example', paint),
      h('section', { class: ['demo-block', b.wide && 'is-wide'], dataset: { block: b.key, html } },
        h('div', { class: 'demo-block__head' }, h('h4', { class: 'demo-name' }, b.title), copyButton(html, `Copy the HTML of ${b.name}`)),
        frames(b.render)),
      codeSlot);
  };
  const codeSlot = h('div');
  codePanel(b).then((panel) => mount(codeSlot, panel)).catch((e) => mount(codeSlot, h('p', { class: 'demo-purpose' }, `The code could not be read: ${e.message}`)));
  paint();
}

/** A block with switches: one example, its extras switched on, and its code following them — the same code, with only
 *  what is on in it. */
function blockPlay(slot, b) {
  const codeSlot = h('div');
  const copySlot = h('span');
  const head = h('div', { class: 'demo-block__head' }, h('h4', { class: 'demo-name' }, b.title), copySlot);
  let asked = 0;
  const follow = async (state) => {
    const mine = ++asked;
    const html = b.playground.render(state).outerHTML;
    section.dataset.html = html;
    mount(copySlot, copyButton(html, `Copy the HTML of ${b.name}`));
    const panel = await codePanel(b, state);
    if (mine === asked) mount(codeSlot, panel);
  };
  const section = h('section', { class: 'demo-block', dataset: { block: b.key } }, head);
  const paint = () => {
    section.replaceChildren(head, playground(b.key, b.playground, follow));
    mount(slot, h('h2', { class: 'fui-page-header__title' }, b.name),
      h('p', { class: 'demo-purpose' }, `${b.about} Switch on what it needs; the code below has that and nothing more.`),
      viewBar('Try it', paint), section, codeSlot);
  };
  paint();
}

async function start() {
  const registry = await (await fetch('registry.json')).json();
  // Each component's stylesheet after the foundation, in the registry's order: the order the cascade was written for.
  for (const c of registry.components) for (const f of c.files.filter((x) => x.endsWith('.css'))) document.head.append(h('link', { rel: 'stylesheet', href: f }));
  const metas = await Promise.all(registry.components.map(async (c) => {
    // The module named after the component holds its meta; another beside it (calendar's dates.js) is its own parts.
    const js = c.files.find((f) => f.endsWith(`/${c.name}.js`)) || c.files.find((f) => f.endsWith('.js'));
    return js ? ((await import('../' + js)).meta || {}) : {};
  }));
  const sections = [{ key: 'showcase', label: 'Showcase', icon: 'sparkle', group: 'FinUI' }, { key: 'foundation', label: 'Foundation', icon: 'layers', group: 'FinUI' },
    ...registry.components.map((c, i) => ({ key: c.name, label: c.name, icon: 'layers', group: CATEGORY[c.category] || 'Components', meta: metas[i] })),
    // Each block its own entry, under a group of its kind, after the components: a calendar, a chart, a form.
    ...BLOCKS.map((b) => ({ key: `block-${b.key}`, label: b.name, icon: b.icon, group: b.group, block: b }))];

  const slot = h('div', { class: 'demo-stack' });
  const navSlot = h('div');
  mount(root,
    h('header', { class: 'demo-top' },
      h('div', { class: 'demo-brand' }, h('h1', null, 'FinUI'), h('p', null, `The components finstats is built from. ${registry.components.length} of them, no build step, light and dark from one set of tokens.`)),
      h('div', { class: 'demo-top-right' }, button({ href: 'create/', variant: 'primary', size: 'sm' }, icon('sliders', 14), 'Create'), h('a', { href: 'https://github.com/finstats/finui' }, 'Source'), h('a', { href: 'https://github.com/finstats/finstats' }, 'finstats'),
        themeSwitch({ value: stored, onChange: applyTheme }))),
    sectionLayout(navSlot, slot),
    h('p', { class: 'demo-foot' }, `FinUI is free software under the GNU GPL v3. Its fonts, Inter and JetBrains Mono, are under the SIL Open Font License.`));

  async function route() {
    const key = location.hash.replace(/^#\/?/, '') || 'showcase';
    const section = sections.find((s) => s.key === key) || sections[0];
    mount(navSlot, sectionNav('#', sections, section.key, 'FinUI'));
    document.title = `${section.label} · FinUI`;
    if (section.key === 'showcase') return showcase(slot);
    if (section.key === 'foundation') return foundation(slot);
    if (section.block) return blockPage(slot, section.block);
    const meta = section.meta || {};
    const paint = () => mount(slot, h('h2', { class: 'fui-page-header__title' }, meta.name || section.key), h('p', { class: 'demo-purpose' }, meta.purpose || ''), docs(meta),
      viewBar('Try it', paint), meta.playground ? playground(meta.name || section.key, meta.playground)
        : (meta.examples || []).map((x) => h('section', { class: 'demo-example' }, h('h4', { class: 'demo-name' }, x.name), frames(x.render))));
    paint();
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo({ top: 0 }); });
  route();
}

start().catch((e) => mount(root, emptyState('The gallery could not start', String(e && e.message || e))));

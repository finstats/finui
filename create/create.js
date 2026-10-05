// FinUI create: a picker for every axis of presets.json, a live preview drawn with FinUI's own stylesheets and the
// preset's tokens (in frames of their own, so nothing of this page reaches in), and the one line that takes it home:
// curl -fsSL https://finstats.github.io/finui/install.sh | sh -s -- <code>. A static page: the preset is worked out here, by the same module the
// installer uses, and the code is kept in the address. Made of FinUI: the site's bar, pickers with swatches, cards, a
// code line; create.css only lays them out (a test holds it to that).

import { h, icon, mount } from '../core.js';
import { button } from '../components/button/button.js';
import { card } from '../components/card/card.js';
import { segmented } from '../components/segmented/segmented.js';
import { openModal } from '../components/modal/modal.js';
import { formField } from '../components/field/field.js';
import { emptyState } from '../components/empty/empty.js';
import { themeSwitch } from '../components/theme-switch/theme-switch.js';
import { toggle } from '../components/toggle/toggle.js';
import { topBar } from '../components/top-bar/top-bar.js';
import { pageHeader } from '../components/page-header/page-header.js';
import { picker } from '../components/picker/picker.js';
import { swatch, cornerSwatch, typeSwatch, strokeSwatch } from '../components/swatch/swatch.js';
import { codeLine, codeBlock } from '../components/code-block/code-block.js';
import { decode, encode, faces, overlay, stylesheet, styleChoice, styleOf } from './preset.js';
import { previewPage } from './preview.js';

const ROOT = new URL('../', import.meta.url);
const at = (f) => new URL(f, ROOT).href;
const VIEWS = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'both', label: 'Both' }];
const root = document.getElementById('create');

/** The code in anything that holds one: the code itself, the install line, a stylesheet's name. */
const codeIn = (text) => (/sh -s --\s+([0-9a-z]+)/.exec(text) || /--preset\s+([0-9a-z]+)/.exec(text) || /finui-([0-9a-z]+)(?:\.tokens)?\.css/.exec(text) || /^\s*([0-9a-z]+)\s*$/.exec(text) || [])[1] || null;
const first = (c) => (Array.isArray(c) ? c[0] : c);
const noop = () => {};

// ---- the theme of the page itself, kept in this browser (the gallery's key: one choice for both pages)
function applyTheme(choice) {
  if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice;
  else delete document.documentElement.dataset.theme;
  try { if (choice === 'device') localStorage.removeItem('finui.theme'); else localStorage.setItem('finui.theme', choice); } catch { /* not kept */ }
}
const stored = (() => { try { return localStorage.getItem('finui.theme') || 'device'; } catch { return 'device'; } })();

/** What an option looks like, small, as FinUI's swatches draw it: two halves for a colour by day and by night, dots for
 *  a palette, bars for a style, a corner, a typeface, a stroke. */
function mark(axis, o) {
  if (axis.kind === 'style') return swatch(o.colours, { shape: 'bars' });
  if (axis.kind === 'base') return swatch(o.ramp ? [o.ramp[1], o.ramp[9]] : o.swatch, { shape: 'halves' });
  if (axis.kind === 'accent') return swatch(o.light ? [o.light, o.dark] : o.swatch, { shape: 'halves' });
  if (axis.kind === 'charts') return swatch(o.series ? o.series.map(first) : o.swatch, { shape: 'dots' });
  if (axis.key === 'radius') return cornerSwatch((o.tokens && o.tokens['--radius-control']) || '6px');
  // A font says itself: Aa in it. Its face is declared on this page (fontFaces), so only the ones shown are fetched.
  if (axis.kind === 'font') return typeSwatch(o.stack || (axis.token === '--font-heading' ? 'var(--sans)' : `var(${axis.token})`));
  if (axis.key === 'icons') return strokeSwatch((o.tokens && o.tokens['--icon-stroke']) || '1.75');
  return null;
}

/** One axis as FinUI's picker: moving through its options previews each, Enter or a click keeps one, and closing
 *  without choosing puts back what was there. Every axis but the style has a lock that Shuffle leaves alone. */
function axisPicker(axis, { get, set, preview, locked, onLock }) {
  const p = picker({
    label: axis.label, value: get(), onChange: set, onPreview: preview, dataset: { axis: axis.key },
    options: axis.options.map((o) => ({ key: o.key, label: o.label, blurb: o.blurb || null, mark: () => mark(axis, o) })),
    lock: axis.kind === 'style' ? null : { label: `Lock ${axis.label.toLowerCase()}`, title: 'Locked: Shuffle leaves it alone', on: locked(), onToggle: () => onLock() },
  });
  return { el: p.el, show: () => p.update({ value: get(), locked: locked() }) };
}

/** A preset's faces name their files as `fonts/` beside the stylesheet; on this page and in its frames that is FinUI's own. */
const located = (css) => css.replaceAll('url("fonts/', `url("${at('fonts/')}`);

/** Every font a preset can choose, declared on this page so a picker can show each in itself; a browser fetches a face
 *  only when something on the page uses it. */
function fontFaces(presets) {
  const css = presets.axes.flatMap((axis, a) => axis.kind !== 'font' ? [] : axis.options.map((_, o) => faces(presets, presets.axes.map((__, i) => (i === a ? o : 0))))).join('');
  document.head.append(h('style', null, located(css)));
}

/** A frame the preview is drawn in: a document of its own (srcdoc, so standards mode) with FinUI's stylesheets, the
 *  preview's layout and a <style> that holds the preset's tokens. */
function frame(theme, sheets, onScroll, onLead) {
  const el = h('iframe', { class: 'create-frame', title: `Preview, ${theme}`, srcdoc: '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>' });
  let preset = null, pending = '';
  el.addEventListener('load', () => {
    const win = el.contentWindow;
    win.addEventListener('scroll', () => onScroll(win), { passive: true });
    // What says somebody is scrolling this one: the wheel, a press (the scrollbar too), a touch, a key.
    for (const type of ['wheel', 'pointerdown', 'touchstart', 'keydown']) win.addEventListener(type, () => onLead(win), { passive: true, capture: true });
    const doc = el.contentDocument;
    doc.documentElement.dataset.theme = theme;
    for (const href of [...sheets, at('blocks/blocks.css'), at('create/preview.css')]) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet'; link.href = href;
      doc.head.append(link);
    }
    preset = doc.createElement('style');
    preset.dataset.preset = '';
    preset.textContent = pending;
    doc.head.append(preset);
    doc.body.append(doc.adoptNode(previewPage()));
  }, { once: true });
  el.addEventListener('pointerenter', () => { if (el.contentWindow) onLead(el.contentWindow); });
  return { el, use(css) { pending = css; if (preset) preset.textContent = css; }, win: () => el.contentWindow };
}

function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/css' })), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}


function installDialog({ code, axes, choice, block, registry, style }) {
  const line = `curl -fsSL https://finstats.github.io/finui/install.sh | sh -s -- ${code}`;
  const panes = {
    shell: h('div', { class: 'create-install__pane' },
      h('p', { class: 'muted' }, 'Copies FinUI into ./finui: the tokens with this preset’s values after their own, the base styles, core and every component, the fonts and the licence. Nothing but curl and sh; FinUI is source you own, so change anything after.'),
      codeLine(line),
      h('p', { class: 'muted' }, 'One stylesheet instead of the source, with the fonts beside it:'), codeLine(`${line} --css`)),
    file: h('div', { class: 'create-install__pane', hidden: true },
      h('p', { class: 'muted' }, 'Every stylesheet in one file, this preset’s tokens after tokens.css. It reads its fonts from fonts/ beside it, which the command with --css brings.'),
      button({ variant: 'primary', onClick: async () => download(`finui-${code}.css`, await stylesheet(registry, async (f) => (await fetch(at(f))).text(), block)) }, icon('download', 14), `Download finui-${code}.css`)),
    tokens: h('div', { class: 'create-install__pane', hidden: true },
      h('p', { class: 'muted' }, 'The preset’s tokens alone, to put after tokens.css in a FinUI you already have.'),
      block ? codeBlock({ label: 'Tokens', panes: [{ key: 'css', label: 'The preset’s tokens', text: block, wrap: true }] }) : h('p', { class: 'muted' }, 'Nothing to change: every choice is at its default, so tokens.css is the whole of it.')),
  };
  const named = axes.map((a, i) => (choice[i] ? `${a.label}: ${a.options[choice[i]].label}` : null)).filter(Boolean);
  if (style && style.key !== 'washi') named.unshift(`Style: ${style.label}`);
  openModal({ title: 'Take it home', wide: true, body: h('div', { class: 'create-install' },
    h('p', null, named.length ? named.join(' · ') : 'FinUI as it ships: every choice at its default.'),
    segmented({ label: 'How to take it', size: 'sm', value: 'shell', options: [{ value: 'shell', label: 'Terminal' }, { value: 'file', label: 'Download' }, { value: 'tokens', label: 'Tokens only' }],
      onChange: (v) => { for (const [k, el] of Object.entries(panes)) el.hidden = k !== v; } }),
    Object.values(panes),
    h('p', { class: 'create-install__foot muted' }, 'FinUI is free software under the GNU GPL v3. Inter and JetBrains Mono are under the SIL Open Font License, whose texts come with them.')) });
}

function openDialog(axes, apply) {
  const field = formField({ id: 'create-open', label: 'Preset', placeholder: 'A code, or the install line with one in it' });
  field.input.classList.add('mono');
  const form = h('form', { class: 'create-open', novalidate: true }, field.el,
    h('div', { class: 'create-open__actions' }, button({ variant: 'primary', type: 'submit' }, 'Open')));
  const modal = openModal({ title: 'Open a preset', body: form, initialFocus: field.input });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = codeIn(field.input.value);
    const choice = code && decode({ axes }, code);
    if (!choice) { field.setError('That names no preset. A code is one letter or digit per choice, such as 0101.'); return; }
    modal.close();
    apply(choice);
  });
}

async function start() {
  const [presets, registry] = await Promise.all(['create/presets.json', 'registry.json'].map(async (f) => (await fetch(at(f))).json()));
  const { axes } = presets;
  // Each component's stylesheet after the foundation, in the registry's order, before this page's own.
  const own = document.querySelector('link[href="create.css"]');
  const components = registry.components.flatMap((c) => c.files.filter((f) => f.endsWith('.css'))).map(at);
  for (const href of components) own.before(h('link', { rel: 'stylesheet', href }));
  const sheets = [at('tokens.css'), at('base.css'), ...components];
  fontFaces(presets);

  let choice = decode(presets, new URLSearchParams(location.search).get('preset')) || axes.map(() => 0);
  const locks = new Set();
  let view = 'light';
  let frames = [];
  // Both themes side by side scroll as one, unless the switch says otherwise: linked to start with. The one being scrolled
  // leads (under the pointer, or last given a wheel, a press, a touch or a key) and only its scrolling moves the other: a
  // follower's own scroll event arrives a frame late, and letting it lead pulled a smooth scroll back at every step.
  let linked = true;
  let leader = null;
  const align = (from) => {
    for (const f of frames) {
      const w = f.win();
      if (w && w !== from && (w.scrollY !== from.scrollY || w.scrollX !== from.scrollX)) w.scrollTo({ left: from.scrollX, top: from.scrollY, behavior: 'instant' });
    }
  };
  const follow = (from) => {
    if (!linked || frames.length < 2) return;
    leader ??= from;
    if (from === leader) align(from);
  };
  const lead = (w) => { leader = w; };
  const linkSlot = h('div', { class: 'create-link', hidden: true },
    h('span', { id: 'create-link-label' }, 'Link scrolling'),
    toggle({ checked: linked, labelledby: 'create-link-label', onChange: (on) => { linked = on; const from = leader || (frames[0] && frames[0].win()); if (on && from) align(from); } }));
  const stage = h('div', { class: 'create-frames' });
  const codeEl = codeLine('', { label: 'Copy the code', class: 'create-code' });

  const live = (c) => { const css = located(overlay(presets, encode(c), c)); for (const f of frames) f.use(css); };
  function drawFrames() {
    leader = null;
    frames = (view === 'both' ? ['light', 'dark'] : [view]).map((t) => frame(t, sheets, follow, lead));
    stage.classList.toggle('is-both', view === 'both');
    linkSlot.hidden = view !== 'both';
    mount(stage, frames.map((f) => f.el));
    live(choice);
  }
  function commit(next) {
    choice = next;
    const code = encode(choice);
    history.replaceState(null, '', `?preset=${code}`);
    codeEl.set(code);
    for (const p of pickers) p.show();
    live(choice);
  }
  const pickers = axes.map((axis, a) => axisPicker(axis, {
    get: () => choice[a],
    set: (o) => commit(choice.map((v, i) => (i === a ? o : v))),
    preview: (o) => live(choice.map((v, i) => (i === a ? o : v))),
    locked: () => locks.has(a),
    onLock: () => { if (locks.has(a)) locks.delete(a); else locks.add(a); },
  }));
  // Styles: whole looks to start from. Choosing one sets every axis that is not locked; changing anything after makes it Custom.
  const swatchOf = (c) => {
    const b = axes[0].options[c[0]], a = axes[1].options[c[1]], ch = axes[2].options[c[2]];
    return [(b.day && b.day.bg) || (b.ramp ? b.ramp[1] : b.swatch[0]), a.light || a.swatch[0], ch.series ? first(ch.series[0]) : ch.swatch[0]];
  };
  const styleAxis = { key: 'style', label: 'Style', kind: 'style', options: (presets.styles || []).map((st) => ({ ...st, colours: swatchOf(styleChoice(presets, st)) })) };
  const asStyle = (k, base = choice) => styleChoice(presets, presets.styles[k]).map((v, a) => (locks.has(a) ? base[a] : v));
  const stylePicker = axisPicker(styleAxis, {
    get: () => presets.styles.indexOf(styleOf(presets, choice)),
    set: (k) => commit(asStyle(k)),
    preview: (k) => live(k < 0 ? choice : asStyle(k)),
    locked: () => false, onLock: noop,
  });
  pickers.push(stylePicker);
  const shuffle = () => commit(choice.map((v, a) => (locks.has(a) ? v : Math.floor(Math.random() * axes[a].options.length))));
  const groups = [];
  axes.forEach((axis, a) => {
    if (!groups.length || groups[groups.length - 1].name !== axis.group) groups.push({ name: axis.group, items: [] });
    groups[groups.length - 1].items.push(pickers[a].el);
  });
  // The panel: a card per group of choices, and the preset's own card — its code, what to do with it, taking it home.
  const panel = h('aside', { class: 'create-panel', 'aria-label': 'Customize' },
    card({ title: 'Preset', cls: 'create-preset', body: [codeEl,
      h('div', { class: 'create-actions' },
        button({ onClick: shuffle }, icon('shuffle', 14), 'Shuffle'),
        button({ onClick: () => openDialog(axes, commit) }, 'Open preset'),
        button({ variant: 'ghost', onClick: () => commit(axes.map(() => 0)) }, 'Reset')),
      button({ variant: 'primary', block: true, onClick: () => installDialog({ code: encode(choice), axes, choice, block: overlay(presets, encode(choice), choice), registry, style: styleOf(presets, choice) }) },
        icon('download', 14), 'Take it home')] }),
    card({ title: 'Start from', cls: 'create-group', body: stylePicker.el }),
    groups.map((g) => card({ title: g.name, cls: 'create-group', body: g.items })));

  // The site's own bar: FinUI create is one of its sections.
  const bar = topBar({ brand: { name: 'FinUI', href: at('') }, label: 'FinUI', current: 'create',
    links: [{ href: at('#/components'), label: 'Components', key: 'components' }, { href: at('#/blocks'), label: 'Blocks', key: 'blocks' }, { href: at('#/foundation'), label: 'Foundation', key: 'foundation' },
      { href: at('create/'), label: 'Create', key: 'create' }, { href: 'https://github.com/finstats/finui', label: 'GitHub' }],
    actions: themeSwitch({ value: stored, onChange: applyTheme }) });
  const head = pageHeader('FinUI create', 'Choose how FinUI looks, watch it change, then take it home with one command.',
    h('div', { class: 'create-tools' }, segmented({ label: 'Preview in', size: 'sm', value: view, options: VIEWS, onChange: (v) => { view = v; drawFrames(); } }), linkSlot));
  head.classList.add('create-top');
  mount(root, bar, h('main', { class: 'create-main' }, head,
    h('div', { class: 'create' }, card({ cls: 'fui-card--flush create-stage', body: stage }), panel)));
  drawFrames();
  commit(choice);
}

start().catch((e) => mount(root, emptyState('FinUI create could not start', String((e && e.message) || e))));

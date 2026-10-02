// FinUI create: a picker for every axis of presets.json, a live preview drawn with FinUI's own stylesheets and the
// preset's tokens (in frames of their own, so nothing of this page reaches in), and the one line that takes it home:
// curl -fsSL https://finstats.github.io/finui/install.sh | sh -s -- <code>. A static page: the preset is worked out here, by the same module the
// installer uses, and the code is kept in the address.

import { h, icon, mount } from '../core.js';
import { button } from '../components/button/button.js';
import { segmented } from '../components/segmented/segmented.js';
import { copyButton } from '../components/copy/copy.js';
import { openModal } from '../components/modal/modal.js';
import { inlineError } from '../components/field/field.js';
import { emptyState } from '../components/empty/empty.js';
import { themeSwitch } from '../components/theme-switch/theme-switch.js';
import { toggle } from '../components/toggle/toggle.js';
import { decode, encode, faces, overlay, stylesheet, styleChoice, styleOf } from './preset.js';
import { previewPage } from './preview.js';

const ROOT = new URL('../', import.meta.url);
const at = (f) => new URL(f, ROOT).href;
const VIEWS = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'both', label: 'Both' }];
const root = document.getElementById('create');

/** The code in anything that holds one: the code itself, the install line, a stylesheet's name. */
const codeIn = (text) => (/sh -s --\s+([0-9a-z]+)/.exec(text) || /--preset\s+([0-9a-z]+)/.exec(text) || /finui-([0-9a-z]+)(?:\.tokens)?\.css/.exec(text) || /^\s*([0-9a-z]+)\s*$/.exec(text) || [])[1] || null;
const paint = (el, colour) => { el.style.background = colour; return el; };
const first = (c) => (Array.isArray(c) ? c[0] : c);
const noop = () => {};

// ---- the theme of the page itself, kept in this browser (the gallery's key: one choice for both pages)
function applyTheme(choice) {
  if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice;
  else delete document.documentElement.dataset.theme;
  try { if (choice === 'device') localStorage.removeItem('finui.theme'); else localStorage.setItem('finui.theme', choice); } catch { /* not kept */ }
}
const stored = (() => { try { return localStorage.getItem('finui.theme') || 'device'; } catch { return 'device'; } })();

/** What an option looks like, small: two halves for a colour by day and by night, dots for a palette, a corner. */
function mark(axis, o) {
  // A style: its paper, its accent and its first series, as three dots.
  if (axis.kind === 'style') return h('span', { class: 'create-mark create-mark--style' }, o.colours.map((c) => paint(h('span'), c)));
  const halves = (l, d) => h('span', { class: 'create-mark create-mark--halves' }, paint(h('span'), l), paint(h('span'), d));
  if (axis.kind === 'base') return o.ramp ? halves(o.ramp[1], o.ramp[9]) : halves(...o.swatch);
  if (axis.kind === 'accent') return o.light ? halves(o.light, o.dark) : halves(...o.swatch);
  if (axis.kind === 'charts') return h('span', { class: 'create-mark create-mark--dots' }, (o.series ? o.series.map(first) : o.swatch).map((c) => paint(h('span'), c)));
  if (axis.key === 'radius') {
    const corner = h('span', { class: 'create-mark create-mark--corner' });
    corner.style.borderTopLeftRadius = (o.tokens && o.tokens['--radius-control']) || '6px';
    return corner;
  }
  // A font says itself: Aa in it. Its face is declared on this page (fontFaces), so only the ones shown are fetched.
  if (axis.kind === 'font') {
    const aa = h('span', { class: 'create-mark create-mark--font' }, 'Aa');
    aa.style.fontFamily = o.stack || (axis.token === '--font-heading' ? 'var(--sans)' : `var(${axis.token})`);
    return aa;
  }
  if (axis.key === 'icons') {
    const i = icon('sparkle', 16, 'create-mark');
    i.style.strokeWidth = (o.tokens && o.tokens['--icon-stroke']) || '1.75';
    return i;
  }
  return null;
}

/** One axis: a button that names the choice and opens its options. Moving through them previews each; Enter or a
 *  click keeps one, and closing without choosing puts back what was there. */
function picker(axis, { get, set, preview, locked, onLock }) {
  const id = `create-${axis.key}`;
  const value = h('span', { class: 'create-picker__value' });
  const markSlot = h('span', { class: 'create-picker__mark', 'aria-hidden': 'true' });
  const btn = h('button', { type: 'button', class: 'create-picker__button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': id, dataset: { axis: axis.key } },
    h('span', { class: 'create-picker__text' }, h('span', { class: 'create-picker__label' }, axis.label), value), markSlot);
  const lock = axis.kind === 'style' ? null : h('button', { type: 'button', class: 'create-picker__lock', 'aria-pressed': 'false', dataset: { axis: axis.key },
    'aria-label': `Lock ${axis.label.toLowerCase()}`, title: 'Locked: Shuffle leaves it alone' });
  const list = h('ul', { class: 'create-picker__list', role: 'listbox', id, tabindex: -1, hidden: true, 'aria-label': axis.label });
  const el = h('div', { class: 'create-picker' }, btn, lock, list);
  let active = 0, before = 0;

  function show() {
    // A style is shown as Custom once anything in it was changed.
    const o = axis.options[get()];
    value.textContent = o ? o.label : 'Custom';
    mount(markSlot, o ? mark(axis, o) : null);
    if (!lock) return;
    const on = locked();
    lock.setAttribute('aria-pressed', String(on));
    el.classList.toggle('is-locked', on);
    mount(lock, icon(on ? 'lock' : 'unlock', 14));
  }
  function options() {
    mount(list, axis.options.map((o, i) => h('li', { role: 'option', id: `${id}-${i}`, dataset: { option: o.key },
      class: ['create-picker__option', i === active && 'is-active'], 'aria-selected': String(i === get()),
      onPointerdown: (e) => { e.preventDefault(); choose(i); },
      onPointermove: () => { if (active !== i) move(i); } },
      h('span', { class: 'create-picker__mark', 'aria-hidden': 'true' }, mark(axis, o)),
      o.blurb ? h('span', { class: 'create-picker__about' }, h('span', { class: 'create-picker__name' }, o.label), h('span', { class: 'create-picker__blurb' }, o.blurb)) : h('span', { class: 'trunc' }, o.label),
      i === get() ? icon('check', 14, 'create-picker__check') : null)));
    list.setAttribute('aria-activedescendant', `${id}-${active}`);
    list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }
  // Moving through the list only moves the highlight: the options stay the same nodes, so what is under the pointer is
  // what it clicks.
  function move(i) {
    active = i;
    list.querySelectorAll('[role=option]').forEach((li, k) => li.classList.toggle('is-active', k === i));
    list.setAttribute('aria-activedescendant', `${id}-${i}`);
    list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
    preview(i);
  }
  function open() {
    before = get(); active = Math.max(0, before);
    list.hidden = false; btn.setAttribute('aria-expanded', 'true'); el.classList.add('is-open');
    options();
    // Open upwards when the panel has no room below: a menu at the foot of the panel was cut off there.
    const room = el.closest('.create-panel__body')?.getBoundingClientRect();
    el.classList.toggle('is-up', !!room && list.getBoundingClientRect().bottom > room.bottom && btn.getBoundingClientRect().top - room.top > list.offsetHeight);
    list.focus();
    document.addEventListener('pointerdown', outside, true);
  }
  function close(refocus) {
    if (list.hidden) return;
    list.hidden = true; btn.setAttribute('aria-expanded', 'false'); el.classList.remove('is-open');
    document.removeEventListener('pointerdown', outside, true);
    if (refocus) btn.focus();
  }
  function choose(i) { close(true); set(i); }
  function cancel(refocus) { close(refocus); preview(before); }
  const outside = (e) => { if (!el.contains(e.target)) cancel(false); };
  btn.addEventListener('click', () => (list.hidden ? open() : cancel(true)));
  lock?.addEventListener('click', () => { onLock(); show(); });
  list.addEventListener('keydown', (e) => {
    const last = axis.options.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); move(Math.min(last, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(Math.max(0, active - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(last); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(true); }
    else if (e.key === 'Tab') cancel(false);
  });
  show();
  return { el, show };
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
function frame(theme, sheets, onScroll) {
  const el = h('iframe', { class: 'create-frame', title: `Preview, ${theme}`, srcdoc: '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>' });
  let preset = null, pending = '';
  el.addEventListener('load', () => {
    el.contentWindow.addEventListener('scroll', () => onScroll(el.contentWindow), { passive: true });
    const doc = el.contentDocument;
    doc.documentElement.dataset.theme = theme;
    for (const href of [...sheets, at('create/preview.css')]) {
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
  return { el, use(css) { pending = css; if (preset) preset.textContent = css; }, win: () => el.contentWindow };
}

function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/css' })), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function snippet(text, label) {
  return h('div', { class: 'create-snippet-wrap' }, h('pre', { class: 'create-snippet mono' }, text), copyButton(text, label));
}

function installDialog({ code, axes, choice, block, registry, style }) {
  const line = `curl -fsSL https://finstats.github.io/finui/install.sh | sh -s -- ${code}`;
  const panes = {
    shell: h('div', { class: 'create-install__pane' },
      h('p', { class: 'muted' }, 'Copies FinUI into ./finui: the tokens with this preset’s values after their own, the base styles, core and every component, the fonts and the licence. Nothing but curl and sh; FinUI is source you own, so change anything after.'),
      snippet(line, 'Copy the command'),
      h('p', { class: 'muted' }, 'One stylesheet instead of the source, with the fonts beside it:'), snippet(`${line} --css`, 'Copy the command')),
    file: h('div', { class: 'create-install__pane', hidden: true },
      h('p', { class: 'muted' }, 'Every stylesheet in one file, this preset’s tokens after tokens.css. It reads its fonts from fonts/ beside it, which the command with --css brings.'),
      button({ variant: 'primary', onClick: async () => download(`finui-${code}.css`, await stylesheet(registry, async (f) => (await fetch(at(f))).text(), block)) }, icon('download', 14), `Download finui-${code}.css`)),
    tokens: h('div', { class: 'create-install__pane', hidden: true },
      h('p', { class: 'muted' }, 'The preset’s tokens alone, to put after tokens.css in a FinUI you already have.'),
      block ? snippet(block, 'Copy the tokens') : h('p', { class: 'create-snippet mono' }, 'Nothing to change: every choice is at its default, so tokens.css is the whole of it.')),
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
  const input = h('input', { class: 'fui-field__input mono', id: 'create-open', type: 'text', autocomplete: 'off', spellcheck: false,
    placeholder: 'A code, or the install line with one in it', 'aria-describedby': 'create-open-error' });
  const error = h('div');
  const form = h('form', { class: 'create-open', novalidate: true },
    h('label', { class: 'fui-field__label', htmlFor: 'create-open' }, 'Preset'), input, error,
    h('div', { class: 'create-open__actions' }, button({ variant: 'primary', type: 'submit' }, 'Open')));
  const modal = openModal({ title: 'Open a preset', body: form, initialFocus: input });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = codeIn(input.value);
    const choice = code && decode({ axes }, code);
    if (!choice) {
      input.setAttribute('aria-invalid', 'true');
      mount(error, inlineError('create-open-error', 'That names no preset. A code is one letter or digit per choice, such as 0101.'));
      return;
    }
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
  // Both themes side by side scroll as one, unless the switch says otherwise: linked to start with.
  let linked = true;
  const follow = (from) => {
    if (!linked || frames.length < 2) return;
    for (const f of frames) {
      const w = f.win();
      // A frame already there does nothing, so the one that follows does not lead back.
      if (w && w !== from && (Math.round(w.scrollY) !== Math.round(from.scrollY) || Math.round(w.scrollX) !== Math.round(from.scrollX))) w.scrollTo(from.scrollX, from.scrollY);
    }
  };
  const linkSlot = h('div', { class: 'create-link', hidden: true },
    h('span', { class: 'create-link__label', id: 'create-link-label' }, 'Link scrolling'),
    toggle({ checked: linked, labelledby: 'create-link-label', onChange: (on) => { linked = on; if (on && frames[0] && frames[0].win()) follow(frames[0].win()); } }));
  const stage = h('div', { class: 'create-stage' });
  const codeEl = h('code', { class: 'create-code mono' });
  const codeRow = h('div', { class: 'create-code-row' });

  const live = (c) => { const css = located(overlay(presets, encode(c), c)); for (const f of frames) f.use(css); };
  function drawFrames() {
    frames = (view === 'both' ? ['light', 'dark'] : [view]).map((t) => frame(t, sheets, follow));
    stage.classList.toggle('is-both', view === 'both');
    linkSlot.hidden = view !== 'both';
    mount(stage, frames.map((f) => f.el));
    live(choice);
  }
  function commit(next) {
    choice = next;
    const code = encode(choice);
    history.replaceState(null, '', `?preset=${code}`);
    codeEl.textContent = code;
    mount(codeRow, codeEl, copyButton(code, 'Copy the code'));
    for (const p of pickers) p.show();
    live(choice);
  }
  const pickers = axes.map((axis, a) => picker(axis, {
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
  const stylePicker = picker(styleAxis, {
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
  const panel = h('aside', { class: 'create-panel', 'aria-label': 'Customize' },
    h('div', { class: 'create-panel__body' }, h('section', { class: 'create-group', 'aria-label': 'Style' }, h('h2', { class: 'create-group__name' }, 'Start from'), stylePicker.el), groups.map((g) => h('section', { class: 'create-group', 'aria-label': g.name }, h('h2', { class: 'create-group__name' }, g.name), g.items))),
    h('div', { class: 'create-panel__foot' },
      h('div', { class: 'create-panel__label muted' }, 'Preset'), codeRow,
      h('div', { class: 'create-panel__actions' },
        button({ onClick: shuffle }, icon('shuffle', 14), 'Shuffle'),
        button({ onClick: () => openDialog(axes, commit) }, 'Open preset'),
        button({ variant: 'ghost', onClick: () => commit(axes.map(() => 0)) }, 'Reset')),
      button({ variant: 'primary', block: true, onClick: () => installDialog({ code: encode(choice), axes, choice, block: overlay(presets, encode(choice), choice), registry, style: styleOf(presets, choice) }) },
        icon('download', 14), 'Take it home')));

  mount(root,
    h('header', { class: 'create-top' },
      h('div', { class: 'create-brand' }, h('h1', null, 'FinUI create'), h('p', null, 'Choose how FinUI looks, watch it change, then take it home with one command.')),
      h('div', { class: 'create-top-right' },
        segmented({ label: 'Preview in', size: 'sm', value: view, options: VIEWS, onChange: (v) => { view = v; drawFrames(); } }),
        linkSlot,
        h('a', { href: at('') }, 'Gallery'), h('a', { href: 'https://github.com/finstats/finui' }, 'Source'),
        themeSwitch({ value: stored, onChange: applyTheme }))),
    h('div', { class: 'create' }, stage, panel));
  drawFrames();
  commit(choice);
}

start().catch((e) => mount(root, emptyState('FinUI create could not start', String((e && e.message) || e))));

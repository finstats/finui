// The landing: what FinUI is, shown rather than told: a page of an app built from it, which any of FinUI create's whole
// looks restyles in place, the one line that installs the look picked, and every block and component a click away.
// Made of FinUI like the rest of the site: hero, chips, swatches, a code line and cards.

import { h, icon } from '../core.js';
import { button } from '../components/button/button.js';
import { card } from '../components/card/card.js';
import { chipChoice } from '../components/chip/chip.js';
import { swatch } from '../components/swatch/swatch.js';
import { codeLine } from '../components/code-block/code-block.js';
import { hero } from '../components/hero/hero.js';
import { sectionHeader } from '../components/page-header/page-header.js';
import { encode, overlay, styleChoice } from '../create/preset.js';
import { livingRoom } from './showcase.js';

const INSTALL = 'curl -fsSL https://finui.finstats.no/install.sh | sh';
const first = (c) => (Array.isArray(c) ? c[0] : c);
const sentence = (text) => String(text || '').split(/(?<=\.)\s/)[0];
export const nameOf = (key) => key.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** A look's three colours, as FinUI create shows them: its ground, its accent, its first chart colour. */
export function colours(presets, choice) {
  const [b, a, c] = [0, 1, 2].map((i) => presets.axes[i].options[choice[i]]);
  return [(b.day && b.day.bg) || (b.ramp ? b.ramp[1] : first(b.swatch)), a.light || first(a.swatch), c.series ? first(c.series[0]) : first(c.swatch)];
}

/** The preview: a document of its own (srcdoc, so standards mode) with FinUI's stylesheets and a <style> holding the
 *  look's tokens. A look cannot be put on a part of a page: a token made from another is worked out where it is set. */
function previewFrame(sheets, scheme) {
  const el = h('iframe', { title: 'A page built with FinUI, in the look picked', srcdoc: '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body class="landing-preview__body"></body></html>' });
  let preset = null, pending = '';
  el.addEventListener('load', () => {
    const doc = el.contentDocument;
    doc.documentElement.dataset.theme = scheme();
    for (const href of sheets) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = href; doc.head.append(l); }
    preset = doc.createElement('style');
    preset.dataset.preset = '';
    preset.textContent = pending;
    doc.head.append(preset);
    doc.body.append(doc.adoptNode(livingRoom()));
    // It is a picture of a page: its links go nowhere.
    doc.addEventListener('click', (e) => { if (e.target.closest('a[href]')) e.preventDefault(); });
  }, { once: true });
  return {
    el,
    use(css) { pending = css; if (preset) preset.textContent = css; },
    scheme(s) { if (el.contentDocument && el.contentDocument.documentElement) el.contentDocument.documentElement.dataset.theme = s; },
  };
}

const CATEGORY = [['primitive', 'Primitives', 'The controls and marks everything else is made of.'], ['pattern', 'Patterns', 'Whole parts of a page: lists, tables, dialogs, menus.'], ['chart', 'Charts', 'Numbers drawn.']];
const entries = (list) => h('div', { class: 'landing-grid' }, list.map(([href, name, line]) => card({ href, title: name, sub: line })));

/** Every component, by kind: the landing's index and the Components page are the same list. */
export function componentIndex(registry, metas) {
  return CATEGORY.map(([cat, title, line]) => {
    const list = registry.components.map((c, i) => [c, metas[i] || {}]).filter(([c]) => (c.category || 'pattern') === cat);
    if (!list.length) return null;
    return h('section', { class: 'landing-group' }, sectionHeader(title, line), entries(list.map(([c, m]) => [`#/${c.name}`, nameOf(c.name), sentence(m.purpose)])));
  });
}

/** Every block: a card's worth of an app, switched to what it needs. */
export function blockIndex(blocks) {
  return h('section', { class: 'landing-group' }, sectionHeader('Blocks', 'Components put together into something an app needs, with switches for what goes in and the code for exactly that.'),
    entries(blocks.map((b) => [`#/block-${b.key}`, b.name, sentence(b.about)])));
}

export function landing(slot, { registry, metas, blocks, presets, sheets, scheme }) {
  const frame = previewFrame(sheets, scheme);
  const line = codeLine(INSTALL, { label: 'Copy the install line', class: 'landing-install' });
  const blurb = h('p', { class: 'muted' });
  const create = button({ href: 'create/' }, icon('sliders', 14), 'Make it yours');
  const show = (st) => {
    const choice = styleChoice(presets, st), code = encode(choice);
    const css = overlay(presets, code, choice).replaceAll('url("fonts/', `url("${new URL('fonts/', location.href)}`);
    frame.use(css);
    // FinUI as it ships needs no code; any other look is its code.
    line.set(css ? `${INSTALL} -s -- ${code}` : INSTALL);
    blurb.textContent = st.blurb || '';
    create.setAttribute('href', css ? `create/?preset=${code}` : 'create/');
  };
  const looks = chipChoice({ label: 'A look', value: 'washi', onChange: (key) => show(presets.styles.find((s) => s.key === key)),
    options: presets.styles.map((st) => ({ value: st.key, label: st.label, lead: swatch(colours(presets, styleChoice(presets, st))) })) });
  show(presets.styles.find((s) => s.key === 'washi') || presets.styles[0]);
  const top = hero({
    title: 'The parts FinStats is made of, yours to take.',
    lede: `${registry.components.length} components and ${blocks.length} blocks in plain JavaScript and CSS: no build step, no dependencies, light and dark from one set of tokens. Copy them into a project and change anything.`,
    actions: [button({ href: '#/components', variant: 'primary' }, 'Browse components'), create],
    aside: card({ cls: 'fui-card--flush landing-preview', body: frame.el }),
    children: [h('div', { class: 'landing-looks' }, h('p', { class: 'muted' }, 'Try a look on the page beside this'), looks, blurb), line],
  });
  top.classList.add('landing-hero');
  slot.replaceChildren(top, blockIndex(blocks), ...componentIndex(registry, metas).filter(Boolean));
  return { scheme: frame.scheme };
}

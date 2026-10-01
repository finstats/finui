// What FinUI create draws its preview with: a page of FinUI, built from its components and nothing else,
// with invented data only. It is drawn into a frame that loads FinUI's stylesheets and a preset's tokens, so every
// colour, corner and gap in it is the stylesheet's, as somebody who fetches that stylesheet will see it.

import { h, s, icon } from '../core.js';
import { button } from '../components/button/button.js';
import { card } from '../components/card/card.js';
import { chip, chipToggle } from '../components/chip/chip.js';
import { badge, status } from '../components/badge/badge.js';
import { statTile } from '../components/stat-tile/stat-tile.js';
import { rankList } from '../components/rank-list/rank-list.js';
import { dataTable } from '../components/data-table/data-table.js';
import { avatar } from '../components/avatar/avatar.js';
import { meter } from '../components/meter/meter.js';
import { facts } from '../components/facts/facts.js';
import { segmented } from '../components/segmented/segmented.js';
import { toggle } from '../components/toggle/toggle.js';
import { settingRow } from '../components/setting-row/setting-row.js';
import { pagination } from '../components/pagination/pagination.js';
import { emptyState } from '../components/empty/empty.js';
import { pageHeader } from '../components/page-header/page-header.js';
import { spinner } from '../components/spinner/spinner.js';

const SERIES = [['Films', 1], ['Episodes', 2], ['Music', 3], ['Other', 4]];

/** The same numbers every time: a picture to compare presets by must not move between them. */
function* steady(seed) {
  let x = seed;
  for (;;) { x = (x * 16807) % 2147483647; yield x / 2147483647; }
}

/** Fourteen days of watch time, one stacked bar a day, a colour per kind of media. */
function bars() {
  const r = steady(7);
  const days = Array.from({ length: 14 }, () => SERIES.map(([, n]) => Math.round(r.next().value * (n === 2 ? 60 : n === 1 ? 40 : 14))));
  const W = 560, H = 180, gap = 8, bw = (W - gap * 13) / 14;
  const top = Math.max(...days.map((d) => d.reduce((a, b) => a + b, 0)));
  const svg = s('svg', { class: 'pv-chart', viewBox: `0 0 ${W} ${H + 18}`, role: 'img', 'aria-label': 'Watch time a day for two weeks, stacked by kind' });
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const line = s('line', { x1: 0, x2: W, y1: H - H * f, y2: H - H * f });
    line.style.stroke = 'var(--grid)';
    svg.append(line);
  }
  days.forEach((d, i) => {
    let y = H;
    d.forEach((v, k) => {
      const hgt = (v / top) * (H - 6);
      const rect = s('rect', { x: i * (bw + gap), y: y - hgt, width: bw, height: Math.max(0, hgt - 1), rx: 2 });
      rect.style.fill = `var(--series-${k + 1})`;
      svg.append(rect);
      y -= hgt;
    });
    if (i % 2 === 0) {
      const t = s('text', { x: i * (bw + gap) + bw / 2, y: H + 14, 'text-anchor': 'middle', class: 'pv-tick' }, String(i + 1));
      svg.append(t);
    }
  });
  const legend = h('ul', { class: 'pv-legend' }, SERIES.map(([name, n]) => {
    const key = h('span', { class: 'pv-key', 'aria-hidden': 'true' });
    key.style.background = `var(--series-${n})`;
    return h('li', null, key, name);
  }));
  return h('div', { class: 'pv-stack' }, svg, legend);
}

/** When people watch: a week of hours, quiet to busy. */
function heat() {
  const r = steady(11);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const grid = h('div', { class: 'pv-heat', role: 'img', 'aria-label': 'Plays by weekday and hour' });
  days.forEach((d, row) => {
    grid.append(h('span', { class: 'pv-heat__day' }, d));
    for (let hr = 0; hr < 24; hr++) {
      const evening = Math.max(0, 1 - Math.abs(hr - 20.5) / 6) + (row >= 5 ? 0.25 : 0);
      const level = Math.min(6, Math.round(evening * 5 + r.next().value * 1.6 - 0.4));
      const cell = h('span', { class: 'pv-heat__cell' });
      cell.style.background = `var(--heat-${Math.max(0, level)})`;
      grid.append(cell);
    }
  });
  return grid;
}

function recent() {
  const rows = [
    ['alice', 'Big Buck Bunny', 'Direct play', 1],
    ['bob', 'Sintel', 'Transcode', 0.42],
    ['carol', 'Tears of Steel', 'Direct play', 0.87],
    ['dave', 'Cosmos Laundromat', 'Direct stream', 0.15],
  ];
  return dataTable(h('table', { class: 'fui-data-table' },
    h('thead', null, h('tr', null, h('th', null, 'Who'), h('th', null, 'Title'), h('th', null, 'How'), h('th', { class: 'r' }, 'Watched'))),
    h('tbody', null, rows.map(([who, title, how, done]) => h('tr', null,
      h('td', null, h('span', { class: 'pv-who' }, avatar(null, who, { size: 24 }), who)),
      h('td', null, title),
      h('td', null, badge({ dot: how === 'Direct play' }, how)),
      h('td', { class: 'r nowrap' }, h('span', { class: 'pv-done' }, meter({ value: done }), `${Math.round(done * 100)}%`)))))));
}

function settings() {
  const row = (id, label, help, on) => settingRow({ id, label, help, control: toggle({ checked: on, onChange: () => {}, labelledby: `${id}-label`, describedby: `${id}-help` }) });
  return h('div', { class: 'fui-setting-row__rows' },
    row('pv-groups', 'Watched together', 'Plays of one title by two people within a minute count as one evening.', true),
    row('pv-local', 'Home network', 'Plays from this network are marked as home.', false),
    settingRow({ id: 'pv-min', label: 'Shortest play counted', help: 'Shorter plays are left out of every statistic.', labelFor: 'pv-min-in',
      control: h('input', { class: 'fui-field__input fui-field__input--num', id: 'pv-min-in', type: 'number', value: 120 }) }),
    settingRow({ id: 'pv-name', label: 'Server name', labelFor: 'pv-name-in',
      control: h('input', { class: 'fui-field__input', id: 'pv-name-in', type: 'text', value: 'Living room', autocomplete: 'off' }) }));
}

/** Everything the preview shows, built in this document; the frame adopts it. */
export function previewPage() {
  return h('main', { class: 'pv' },
    pageHeader('Overview', 'The last 30 days on this server',
      segmented({ label: 'Range', size: 'sm', value: '30', options: [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }], onChange: () => {} })),
    h('div', { class: 'fui-stat-tile__grid' },
      statTile({ label: 'Watch time', value: '312h', current: 312, previous: 268, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'Plays', value: '1,284', current: 1284, previous: 1330, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'People', value: '6', current: 6, previous: 6, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'Last played', value: 'just now', hint: 'Big Buck Bunny' })),
    h('div', { class: 'pv-grid' },
      card({ title: 'Watch time by day', sub: 'Films, episodes, music and the rest', body: bars(),
        actions: button({ variant: 'ghost', size: 'sm' }, icon('download', 14), 'Export') }),
      card({ title: 'Most watched', body: rankList([
        { href: '#', name: 'Big Buck Bunny', sub: '2008 · 4 people', value: '12h 4m', note: '31 plays' },
        { href: '#', name: 'Sintel', sub: '2010 · 3 people', value: '6h 50m', note: '18 plays' },
        { href: '#', name: 'Tears of Steel', sub: '2012 · 2 people', value: '3h 2m', note: '9 plays' },
        { href: '#', name: 'Elephants Dream', sub: '2006 · 1 person', value: '1h 1m', note: '2 plays' }]) })),
    h('div', { class: 'pv-grid' },
      card({ title: 'When people watch', sub: 'Plays by weekday and hour', body: heat() }),
      card({ title: 'Library', body: h('div', { class: 'pv-stack' },
        facts([['Films', '418'], ['Episodes', '6,032'], ['Size', '14.2 TB', { mono: true }], ['Last read', '4 min ago']]),
        meter({ value: 0.81, block: true, label: 'Disk used' })) })),
    card({ title: 'Recent plays', cls: 'fui-card--flush', body: recent() }),
    h('div', { class: 'pv-grid pv-grid--even' },
      card({ title: 'Settings', body: h('div', { class: 'pv-stack' }, settings(),
        h('div', { class: 'pv-row pv-row--end' }, button({ variant: 'ghost' }, 'Cancel'), button({ variant: 'primary' }, 'Save'))) }),
      card({ title: 'And the rest', body: h('div', { class: 'pv-stack' },
        h('div', { class: 'pv-row' }, button({ variant: 'primary' }, icon('play', 14), 'Primary'), button({}, 'Default'), button({ variant: 'ghost' }, 'Ghost'), button({ variant: 'danger' }, 'Delete')),
        h('div', { class: 'pv-row' }, chipToggle({ pressed: true }, 'Films'), chipToggle({ pressed: false }, 'Shows'), chip('Drama'), chip('Science Fiction'), badge({ live: true }, 'Live'), badge({ count: true }, '12')),
        h('div', { class: 'pv-row' }, status({ tone: 'good' }, 'Connected'), status({ tone: 'warning' }, 'Slow to answer'), status({ tone: 'critical' }, 'Failed')),
        h('div', { class: 'pv-row' }, spinner(16), h('span', { class: 'muted' }, 'Reading the library…')),
        pagination({ page: 2, perPage: 50, total: 640, onPage: () => {} })) })),
    card({ title: 'Nothing here yet', body: emptyState('No plays in this range', 'Plays show up here a minute after they start.', button({}, 'Show all time')) }));
}

// What FinUI create draws its preview with: pages of FinUI, built from its components and nothing else, with invented
// data only. It is drawn into a frame that loads FinUI's stylesheets and a preset's tokens, so every colour, corner, gap,
// font and line in it is the stylesheet's, as somebody who fetches that stylesheet will see it. There is a card for
// every axis to show itself on: titles for the headings, a primary button in most, forms for the fields, tables, a
// settings menu, icons, a focus ring held still, and faint words for the contrast.

import { h, s, icon } from '../core.js';
import { button } from '../components/button/button.js';
import { card } from '../components/card/card.js';
import { chip, chipToggle, chipSet, removableChip } from '../components/chip/chip.js';
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
import { errorState } from '../components/error/error.js';
import { pageHeader } from '../components/page-header/page-header.js';
import { spinner } from '../components/spinner/spinner.js';
import { sk } from '../components/skeleton/skeleton.js';
import { poster } from '../components/poster/poster.js';
import { copyButton } from '../components/copy/copy.js';
import { formField } from '../components/field/field.js';
import { sectionNav, sectionLayout } from '../components/sections/sections.js';

const SERIES = [['Films', 1], ['Episodes', 2], ['Music', 3], ['Other', 4]];
const noop = () => {};

/** The same numbers every time: a picture to compare presets by must not move between them. */
function* steady(seed) {
  let x = seed;
  for (;;) { x = (x * 16807) % 2147483647; yield x / 2147483647; }
}
const styled = (el, style) => { Object.assign(el.style, style); return el; };
const legend = (items) => h('ul', { class: 'pv-legend' }, items.map(([name, colour]) => h('li', null, styled(h('span', { class: 'pv-key', 'aria-hidden': 'true' }), { background: colour }), name)));

/** Fourteen days of watch time, one stacked bar a day, a colour per kind of media. */
function bars() {
  const r = steady(7);
  const days = Array.from({ length: 14 }, () => SERIES.map(([, n]) => Math.round(r.next().value * (n === 2 ? 60 : n === 1 ? 40 : 14))));
  const W = 560, H = 180, gap = 8, bw = (W - gap * 13) / 14;
  const top = Math.max(...days.map((d) => d.reduce((a, b) => a + b, 0)));
  const svg = s('svg', { class: 'pv-chart', viewBox: `0 0 ${W} ${H + 18}`, role: 'img', 'aria-label': 'Watch time a day for two weeks, stacked by kind' });
  for (const f of [0.25, 0.5, 0.75, 1]) svg.append(styled(s('line', { x1: 0, x2: W, y1: H - H * f, y2: H - H * f }), { stroke: 'var(--grid)' }));
  days.forEach((d, i) => {
    let y = H;
    d.forEach((v, k) => {
      const hgt = (v / top) * (H - 6);
      svg.append(styled(s('rect', { x: i * (bw + gap), y: y - hgt, width: bw, height: Math.max(0, hgt - 1), rx: 2 }), { fill: `var(--series-${k + 1})` }));
      y -= hgt;
    });
    if (i % 2 === 0) svg.append(s('text', { x: i * (bw + gap) + bw / 2, y: H + 14, 'text-anchor': 'middle', class: 'pv-tick' }, String(i + 1)));
  });
  return h('div', { class: 'pv-stack' }, svg, legend(SERIES.map(([name, n]) => [name, `var(--series-${n})`])));
}

/** A year of plays a month: one quantity, so one colour and its peak. */
function area() {
  const r = steady(3);
  const months = Array.from({ length: 12 }, (_, i) => 30 + Math.sin(i / 1.8) * 14 + r.next().value * 22);
  const W = 320, H = 120, step = W / 11, top = Math.max(...months);
  const pts = months.map((v, i) => [i * step, H - (v / top) * (H - 10)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const svg = s('svg', { class: 'pv-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Plays a month for a year' });
  for (const f of [0.33, 0.66]) svg.append(styled(s('line', { x1: 0, x2: W, y1: H * f, y2: H * f }), { stroke: 'var(--grid)' }));
  svg.append(styled(s('path', { d: `${line} L${W},${H} L0,${H} Z` }), { fill: 'var(--single)', opacity: '.16' }));
  svg.append(styled(s('path', { d: line }), { fill: 'none', stroke: 'var(--single)', strokeWidth: '2' }));
  const [px, py] = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
  svg.append(styled(s('circle', { cx: px, cy: py, r: 4 }), { fill: 'var(--peak)' }));
  return svg;
}

/** Where plays happen: a ring of the four kinds. */
function donut() {
  const parts = [['Living room TV', 46, 1], ['Phone', 24, 2], ['Laptop', 18, 3], ['Tablet', 12, 4]];
  const svg = s('svg', { class: 'pv-donut', viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Plays by device' });
  const R = 46, C = 2 * Math.PI * R;
  let from = 0;
  for (const [, pct, n] of parts) {
    svg.append(styled(s('circle', { cx: 60, cy: 60, r: R, 'stroke-dasharray': `${(pct / 100) * C - 2} ${C}`, 'stroke-dashoffset': (-from * C) / 100, transform: 'rotate(-90 60 60)' }),
      { fill: 'none', stroke: `var(--series-${n})`, strokeWidth: '16' }));
    from += pct;
  }
  svg.append(s('text', { x: 60, y: 60, 'text-anchor': 'middle', class: 'pv-donut__value' }, '935'));
  svg.append(s('text', { x: 60, y: 76, 'text-anchor': 'middle', class: 'pv-tick' }, 'plays'));
  return h('div', { class: 'pv-donut-wrap' }, svg, legend(parts.map(([name, pct, n]) => [`${name} · ${pct}%`, `var(--series-${n})`])));
}

/** When people watch: a week of hours, quiet to busy. */
function heat() {
  const r = steady(11);
  const grid = h('div', { class: 'pv-heat', role: 'img', 'aria-label': 'Plays by weekday and hour' });
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d, row) => {
    grid.append(h('span', { class: 'pv-heat__day' }, d));
    for (let hr = 0; hr < 24; hr++) {
      const evening = Math.max(0, 1 - Math.abs(hr - 20.5) / 6) + (row >= 5 ? 0.25 : 0);
      const level = Math.min(6, Math.round(evening * 5 + r.next().value * 1.6 - 0.4));
      grid.append(styled(h('span', { class: 'pv-heat__cell' }), { background: `var(--heat-${Math.max(0, level)})` }));
    }
  });
  return grid;
}

const table = (head, rows, { right = [] } = {}) => dataTable(h('table', { class: 'fui-data-table' },
  h('thead', null, h('tr', null, head.map((t, i) => h('th', { class: right.includes(i) ? 'r' : null }, t)))),
  h('tbody', null, rows.map((r) => h('tr', null, r.map((c, i) => h('td', { class: right.includes(i) ? 'r nowrap' : null }, c)))))), { filter: false });

function recent() {
  return table(['Who', 'Title', 'How', 'Watched'], [
    ['alice', 'Big Buck Bunny', 'Direct play', 1], ['bob', 'Sintel', 'Transcode', 0.42], ['carol', 'Tears of Steel', 'Direct play', 0.87],
    ['dave', 'Cosmos Laundromat', 'Direct stream', 0.15], ['erin', 'Elephants Dream', 'Direct play', 0.64]].map(([who, title, how, done]) => [
    h('span', { class: 'pv-who' }, avatar(null, who, { size: 24 }), who), title, badge({ dot: how === 'Direct play' }, how),
    h('span', { class: 'pv-done' }, meter({ value: done }), `${Math.round(done * 100)}%`)]), { right: [3] });
}

/** The colours of the look, each with its token's name: what a preset changes, side by side. */
function palette() {
  const sw = (t) => h('div', { class: 'pv-swatch' }, styled(h('span', { class: 'pv-swatch__chip' }), { background: `var(${t})` }), h('span', { class: 'pv-swatch__name mono' }, t.slice(2)));
  return h('div', { class: 'pv-stack' },
    h('div', null, h('p', { class: 'pv-specimen__title' }, 'Designing with rhythm and hierarchy'),
      h('p', { class: 'muted' }, 'A strong body style keeps long lists readable and balances the weight of headings.')),
    h('div', { class: 'pv-swatches' }, ['--bg', '--bg-2', '--text', '--text-muted', '--accent', '--accent-wash', '--border', '--good', '--warning', '--critical',
      '--series-1', '--series-2', '--series-3', '--series-4', '--single', '--peak'].map(sw)));
}

function type() {
  return h('div', { class: 'pv-stack' },
    h('h3', { class: 'pv-specimen__title' }, 'Every film has a second life in somebody’s evening.'),
    h('p', null, 'Body text sits in the font a preset chose, headings in theirs. Numbers and codes, such as ', h('span', { class: 'mono' }, '1h 42m'), ' and ', h('span', { class: 'mono' }, 'S02E04'), ', take the mono face.'),
    h('p', { class: 'muted' }, 'Faint words like these are what the contrast choice lifts.'));
}

function signIn() {
  const server = formField({ id: 'pv-server', label: 'Server address', placeholder: 'http://192.168.1.10:8096', help: 'Where Jellyfin answers on this network.' });
  const user = formField({ id: 'pv-user', label: 'User name', autocomplete: 'off', placeholder: 'alice' });
  const pass = formField({ id: 'pv-pass', label: 'Password', type: 'password', autocomplete: 'off', placeholder: '••••••••' });
  return h('div', { class: 'pv-stack' }, server.el, user.el, pass.el,
    h('label', { class: 'fui-field__check' }, h('input', { type: 'checkbox', checked: true }), 'Keep me signed in on this device'),
    button({ variant: 'primary', block: true }, icon('lock', 14), 'Sign in'));
}

function notifications() {
  const row = (id, label, help, on) => settingRow({ id, label, help, control: toggle({ checked: on, onChange: noop, labelledby: `${id}-label`, describedby: `${id}-help` }) });
  return h('div', { class: 'fui-setting-row__rows' },
    row('pv-n-start', 'A play starts', 'Who, what and on which device.', true),
    row('pv-n-avail', 'A request can be watched', 'Once it is in the library.', true),
    row('pv-n-fail', 'Failed sign-ins', 'Three in a row from one address.', false));
}

/** Settings as finstats lays them out: the list to move between, the open one marked, and its rows. */
function settingsPage() {
  const visible = [{ key: 'account', label: 'Account', icon: 'user', group: 'You' }, { key: 'appearance', label: 'Appearance', icon: 'sliders', group: 'You' },
    { key: 'notifications', label: 'Notifications', icon: 'inbox', group: 'You' }, { key: 'collection', label: 'Collection', icon: 'database', group: 'Server' },
    { key: 'security', label: 'Security', icon: 'shield', group: 'Server' }, { key: 'tasks', label: 'Tasks', icon: 'clock', group: 'Server' }];
  const rows = h('div', { class: 'fui-setting-row__rows' },
    settingRow({ id: 'pv-groups', label: 'Watched together', help: 'Plays of one title by two people within a minute count as one evening.',
      control: toggle({ checked: true, onChange: noop, labelledby: 'pv-groups-label', describedby: 'pv-groups-help' }) }),
    settingRow({ id: 'pv-min', label: 'Shortest play counted', help: 'Shorter plays are left out of every statistic.', labelFor: 'pv-min-in',
      control: h('input', { class: 'fui-field__input fui-field__input--num', id: 'pv-min-in', type: 'number', value: 120 }) }),
    settingRow({ id: 'pv-name', label: 'Server name', labelFor: 'pv-name-in',
      control: h('input', { class: 'fui-field__input', id: 'pv-name-in', type: 'text', value: 'Living room', autocomplete: 'off' }) }),
    settingRow({ id: 'pv-week', label: 'Week starts on', labelFor: 'pv-week-in',
      control: h('select', { class: 'fui-field__input', id: 'pv-week-in' }, h('option', null, 'Monday'), h('option', null, 'Sunday')) }));
  return sectionLayout(sectionNav('#', visible, 'appearance', 'Settings'),
    h('div', { class: 'pv-stack' }, rows, h('div', { class: 'pv-row pv-row--end' }, button({ variant: 'ghost' }, 'Cancel'), button({ variant: 'primary' }, 'Save'))));
}

function upcoming() {
  const day = (d, m) => h('span', { class: 'pv-date' }, h('span', { class: 'pv-date__day' }, d), h('span', { class: 'pv-date__month' }, m));
  return h('ul', { class: 'pv-list' }, [
    ['9', 'Oct', 'Sintel', 'Season 2, episode 4', status({ tone: 'good' }, 'On the server')],
    ['14', 'Oct', 'Tears of Steel', 'Film · requested by bob', status({ tone: 'warning' }, 'Downloading')],
    ['22', 'Oct', 'Cosmos Laundromat', 'Season 1, episode 1', status({ tone: 'info' }, 'Coming up')],
  ].map(([d, m, title, sub, state]) => h('li', { class: 'pv-list__row' }, day(d, m), h('div', { class: 'pv-list__text' }, h('strong', null, title), h('span', { class: 'muted' }, sub)), state)));
}

function downloads() {
  return h('div', { class: 'pv-stack' }, [['Big Buck Bunny (2008) 2160p', 0.82, '2 min left'], ['Sintel S02E04 1080p', 0.37, '14 min left'], ['Elephants Dream 720p', 0.06, 'Queued']].map(([name, v, eta]) =>
    h('div', { class: 'pv-dl' }, h('div', { class: 'pv-dl__top' }, h('span', { class: 'trunc' }, name), h('span', { class: 'muted nowrap' }, eta)), meter({ value: v, block: true, label: name }))));
}

function nowPlaying() {
  return h('ul', { class: 'pv-list' }, [['Big Buck Bunny', 'alice · Living room TV', 0.64, 'Direct play'], ['Sintel', 'bob · Phone', 0.21, 'Transcode']].map(([title, who, v, how]) =>
    h('li', { class: 'pv-list__row' }, poster(null, title, { cls: 'fui-poster--sm' }),
      h('div', { class: 'pv-list__text' }, h('strong', null, title), h('span', { class: 'muted' }, who), meter({ value: v, block: true, label: `${title}, how far along` })),
      chip(how))));
}

function together() {
  return h('div', { class: 'pv-stack' },
    h('div', { class: 'pv-avatars' }, ['alice', 'bob', 'carol', 'dave'].map((n) => avatar(null, n, { size: 34 }))),
    h('p', null, h('strong', null, 'Three evenings together'), ' this month: alice and bob watched Sintel side by side.'),
    facts([['Longest', '2h 10m'], ['Usually', 'Fridays']]));
}

function apiKey() {
  const key = 'fs_3f9a1c07d24e8b6a';
  return h('div', { class: 'pv-stack' },
    h('div', { class: 'pv-key-row' }, h('code', { class: 'mono trunc' }, `${key}…`), copyButton(key, 'Copy the key')),
    h('p', { class: 'muted' }, 'Shown once. Anything that holds it reads finstats as you.'),
    h('div', { class: 'pv-row' }, button({ size: 'sm' }, icon('plus', 14), 'New key'), button({ size: 'sm', variant: 'danger' }, icon('trash', 14), 'Revoke')));
}

function search() {
  return h('div', { class: 'pv-stack' },
    h('label', { class: 'fui-field__search' }, icon('search', 14), h('input', { class: 'fui-field__input fui-field__input--search', type: 'search', placeholder: 'Search titles, people…', 'aria-label': 'Search' })),
    segmented({ label: 'Kind', size: 'sm', value: 'all', options: [{ value: 'all', label: 'All' }, { value: 'films', label: 'Films' }, { value: 'shows', label: 'Shows' }, { value: 'music', label: 'Music' }], onChange: noop }),
    chipSet(removableChip({ label: 'Drama', onRemove: noop }), removableChip({ label: 'After 2010', onRemove: noop }), chipToggle({ pressed: true }, 'Unwatched'), chipToggle({ pressed: false }, '4K')));
}

function shortcuts() {
  const keys = (...k) => h('span', { class: 'pv-keys' }, k.map((x) => h('kbd', { class: 'pv-kbd mono' }, x)));
  return h('ul', { class: 'pv-shortcuts' }, [['Search', keys('/')], ['Go to the dashboard', keys('g', 'd')], ['Go back', keys('Esc')], ['Next page', keys('→')]].map(([what, k]) =>
    h('li', null, h('span', null, what), k)));
}

function health() {
  return h('div', { class: 'pv-stack' },
    h('div', { class: 'pv-stack pv-stack--tight' }, status({ tone: 'good' }, 'Jellyfin answers in 38 ms'), status({ tone: 'warning' }, 'Sonarr is slow to answer'), status({ tone: 'critical' }, 'Radarr: the key was refused')),
    table(['Library', 'Titles', 'Size'], [['Films', '418', '6.1 TB'], ['Shows', '213', '7.8 TB'], ['Music', '9,204', '312 GB'], [h('strong', null, 'Total'), h('strong', null, '9,835'), h('strong', null, '14.2 TB')]], { right: [1, 2] }));
}

function focusDemo() {
  return h('div', { class: 'pv-stack' },
    h('p', { class: 'muted' }, 'The ring a control wears when the keyboard reaches it, held still here:'),
    h('div', { class: 'pv-row' }, button({ class: 'pv-focused' }, 'Focused'), button({ variant: 'primary' }, 'Not focused')),
    h('div', { class: 'pv-row pv-icons' }, ['play', 'settings', 'calendar', 'shield', 'download', 'trophy', 'heart', 'compass'].map((n) => icon(n, 18))));
}

function confirmBox() {
  return h('div', { class: 'fui-modal pv-modal', role: 'group', 'aria-label': 'A dialog' },
    h('div', { class: 'fui-modal__head' }, h('h3', { class: 'fui-modal__title' }, 'Remove this destination?'), button({ variant: 'icon', 'aria-label': 'Close' }, icon('x', 16))),
    h('div', { class: 'fui-modal__body pv-stack' }, h('p', null, 'Notifications stop going to ntfy.example. What was sent stays sent.'),
      h('div', { class: 'pv-row pv-row--end' }, button({ variant: 'ghost' }, 'Keep it'), button({ variant: 'danger' }, 'Remove'))));
}

function buttons() {
  return h('div', { class: 'pv-stack' },
    h('div', { class: 'pv-row' }, button({ variant: 'primary' }, icon('play', 14), 'Primary'), button({}, 'Default'), button({ variant: 'ghost' }, 'Ghost'), button({ variant: 'danger' }, 'Delete')),
    h('div', { class: 'pv-row' }, chipToggle({ pressed: true }, 'Films'), chipToggle({ pressed: false }, 'Shows'), chip('Drama'), chip('Science Fiction'), badge({ live: true }, 'Live'), badge({ count: true }, '12')),
    h('div', { class: 'pv-row' }, spinner(16), h('span', { class: 'muted' }, 'Reading the library…')),
    pagination({ page: 2, perPage: 50, total: 640, onPage: noop }));
}

/** Everything the preview shows, built in this document; the frame adopts it. */
export function previewPage() {
  const page = h('main', { class: 'pv' },
    pageHeader('Overview', 'The last 30 days on this server',
      segmented({ label: 'Range', size: 'sm', value: '30', options: [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }], onChange: noop })),
    h('div', { class: 'fui-stat-tile__grid' },
      statTile({ label: 'Watch time', value: '312h', current: 312, previous: 268, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'Plays', value: '1,284', current: 1284, previous: 1330, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'People', value: '6', current: 6, previous: 6, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'Last played', value: 'just now', hint: 'Big Buck Bunny' })),
    h('div', { class: 'pv-masonry' },
      card({ title: 'The look', sub: 'Colours and type, by token', body: palette() }),
      card({ title: 'Watch time by day', sub: 'Films, episodes, music and the rest', body: bars(), actions: button({ variant: 'ghost', size: 'sm' }, icon('download', 14), 'Export') }),
      card({ title: 'Sign in', sub: 'With your Jellyfin account', body: signIn() }),
      card({ title: 'Most watched', body: rankList([
        { href: '#', name: 'Big Buck Bunny', sub: '2008 · 4 people', value: '12h 4m', note: '31 plays' },
        { href: '#', name: 'Sintel', sub: '2010 · 3 people', value: '6h 50m', note: '18 plays' },
        { href: '#', name: 'Tears of Steel', sub: '2012 · 2 people', value: '3h 2m', note: '9 plays' },
        { href: '#', name: 'Elephants Dream', sub: '2006 · 1 person', value: '1h 1m', note: '2 plays' }]) }),
      card({ title: 'Plays a month', sub: 'This year, the busiest month marked', body: area() }),
      card({ title: 'Now playing', body: nowPlaying(), actions: badge({ live: true }, 'Live') }),
      card({ title: 'Coming up', sub: 'From Sonarr, Radarr and requests', body: upcoming() }),
      card({ title: 'Where people watch', body: donut() }),
      card({ title: 'Notifications', sub: 'What finstats tells you', body: notifications() }),
      card({ title: 'Type', body: type() }),
      card({ title: 'When people watch', sub: 'Plays by weekday and hour', body: heat() }),
      card({ title: 'Downloads', sub: 'Sonarr and Radarr queues', body: downloads() }),
      card({ title: 'Watched together', body: together() }),
      card({ title: 'Find something', body: search() }),
      card({ title: 'API key', sub: 'For scripts and the calendar feed', body: apiKey() }),
      card({ title: 'Server health', body: health() }),
      card({ title: 'Library', body: h('div', { class: 'pv-stack' },
        facts([['Films', '418'], ['Episodes', '6,032'], ['Size', '14.2 TB', { mono: true }], ['Last read', '4 min ago']]),
        meter({ value: 0.81, block: true, label: 'Disk used' })) }),
      card({ title: 'Keys', sub: 'Everywhere in finstats', body: shortcuts() }),
      card({ title: 'Focus and icons', body: focusDemo() }),
      confirmBox(),
      card({ title: 'Loading', body: sk.rows(3) }),
      card({ title: 'Something went wrong', body: errorState(new Error('Jellyfin did not answer within 10 seconds.'), noop) }),
      card({ title: 'Buttons and the rest', body: buttons() }),
      card({ title: 'Nothing here yet', body: emptyState('No plays in this range', 'Plays show up here a minute after they start.', button({}, 'Show all time')) })),
    card({ title: 'Recent plays', cls: 'fui-card--flush', body: recent() }),
    card({ title: 'Settings', sub: 'One section at a time, the open one marked', body: settingsPage() }));
  // A preview: nothing in it goes anywhere.
  page.addEventListener('click', (e) => { if (e.target.closest('a, button[type=submit]')) e.preventDefault(); });
  return page;
}

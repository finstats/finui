// FinUI blocks: compositions of FinUI's components, each a card's worth of an app (a sign-in form, a settings page, a
// chart with its legend), with invented data only. FinUI create draws every one of them to show a preset on, and the
// gallery shows each in both themes with its HTML to copy. Their layout is blocks.css, tokens only like the rest.

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
const legend = (items) => h('ul', { class: 'blk-legend' }, items.map(([name, colour]) => h('li', null, styled(h('span', { class: 'blk-key', 'aria-hidden': 'true' }), { background: colour }), name)));

/** Fourteen days of watch time, one stacked bar a day, a colour per kind of media. */
function bars() {
  const r = steady(7);
  const days = Array.from({ length: 14 }, () => SERIES.map(([, n]) => Math.round(r.next().value * (n === 2 ? 60 : n === 1 ? 40 : 14))));
  const W = 560, H = 180, gap = 8, bw = (W - gap * 13) / 14;
  const top = Math.max(...days.map((d) => d.reduce((a, b) => a + b, 0)));
  const svg = s('svg', { class: 'blk-chart', viewBox: `0 0 ${W} ${H + 18}`, role: 'img', 'aria-label': 'Watch time a day for two weeks, stacked by kind' });
  for (const f of [0.25, 0.5, 0.75, 1]) svg.append(styled(s('line', { x1: 0, x2: W, y1: H - H * f, y2: H - H * f }), { stroke: 'var(--grid)' }));
  days.forEach((d, i) => {
    let y = H;
    d.forEach((v, k) => {
      const hgt = (v / top) * (H - 6);
      svg.append(styled(s('rect', { x: i * (bw + gap), y: y - hgt, width: bw, height: Math.max(0, hgt - 1), rx: 2 }), { fill: `var(--series-${k + 1})` }));
      y -= hgt;
    });
    if (i % 2 === 0) svg.append(s('text', { x: i * (bw + gap) + bw / 2, y: H + 14, 'text-anchor': 'middle', class: 'blk-tick' }, String(i + 1)));
  });
  return h('div', { class: 'blk-stack' }, svg, legend(SERIES.map(([name, n]) => [name, `var(--series-${n})`])));
}

/** A year of plays a month: one quantity, so one colour and its peak. */
function area() {
  const r = steady(3);
  const months = Array.from({ length: 12 }, (_, i) => 30 + Math.sin(i / 1.8) * 14 + r.next().value * 22);
  const W = 320, H = 120, step = W / 11, top = Math.max(...months);
  const pts = months.map((v, i) => [i * step, H - (v / top) * (H - 10)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const svg = s('svg', { class: 'blk-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Plays a month for a year' });
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
  const svg = s('svg', { class: 'blk-donut', viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Plays by device' });
  const R = 46, C = 2 * Math.PI * R;
  let from = 0;
  for (const [, pct, n] of parts) {
    svg.append(styled(s('circle', { cx: 60, cy: 60, r: R, 'stroke-dasharray': `${(pct / 100) * C - 2} ${C}`, 'stroke-dashoffset': (-from * C) / 100, transform: 'rotate(-90 60 60)' }),
      { fill: 'none', stroke: `var(--series-${n})`, strokeWidth: '16' }));
    from += pct;
  }
  svg.append(s('text', { x: 60, y: 60, 'text-anchor': 'middle', class: 'blk-donut__value' }, '935'));
  svg.append(s('text', { x: 60, y: 76, 'text-anchor': 'middle', class: 'blk-tick' }, 'plays'));
  return h('div', { class: 'blk-donut-wrap' }, svg, legend(parts.map(([name, pct, n]) => [`${name} · ${pct}%`, `var(--series-${n})`])));
}

/** When people watch: a week of hours, quiet to busy. */
function heat() {
  const r = steady(11);
  const grid = h('div', { class: 'blk-heat', role: 'img', 'aria-label': 'Plays by weekday and hour' });
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d, row) => {
    grid.append(h('span', { class: 'blk-heat__day' }, d));
    for (let hr = 0; hr < 24; hr++) {
      const evening = Math.max(0, 1 - Math.abs(hr - 20.5) / 6) + (row >= 5 ? 0.25 : 0);
      const level = Math.min(6, Math.round(evening * 5 + r.next().value * 1.6 - 0.4));
      grid.append(styled(h('span', { class: 'blk-heat__cell' }), { background: `var(--heat-${Math.max(0, level)})` }));
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
    h('span', { class: 'blk-who' }, avatar(null, who, { size: 24 }), who), title, badge({ dot: how === 'Direct play' }, how),
    h('span', { class: 'blk-done' }, meter({ value: done }), `${Math.round(done * 100)}%`)]), { right: [3] });
}

/** The colours of the look, each with its token's name: what a preset changes, side by side. */
function palette() {
  const sw = (t) => h('div', { class: 'blk-swatch' }, styled(h('span', { class: 'blk-swatch__chip' }), { background: `var(${t})` }), h('span', { class: 'blk-swatch__name mono' }, t.slice(2)));
  return h('div', { class: 'blk-stack' },
    h('div', null, h('p', { class: 'blk-specimen__title' }, 'Designing with rhythm and hierarchy'),
      h('p', { class: 'muted' }, 'A strong body style keeps long lists readable and balances the weight of headings.')),
    h('div', { class: 'blk-swatches' }, ['--bg', '--bg-2', '--text', '--text-muted', '--accent', '--accent-wash', '--border', '--good', '--warning', '--critical',
      '--series-1', '--series-2', '--series-3', '--series-4', '--single', '--peak'].map(sw)));
}

function type() {
  return h('div', { class: 'blk-stack' },
    h('h3', { class: 'blk-specimen__title' }, 'Every film has a second life in somebody’s evening.'),
    h('p', null, 'Body text sits in the font a preset chose, headings in theirs. Numbers and codes, such as ', h('span', { class: 'mono' }, '1h 42m'), ' and ', h('span', { class: 'mono' }, 'S02E04'), ', take the mono face.'),
    h('p', { class: 'muted' }, 'Faint words like these are what the contrast choice lifts.'));
}

function signIn() {
  const server = formField({ id: 'blk-server', label: 'Server address', placeholder: 'http://192.168.1.10:8096', help: 'Where Jellyfin answers on this network.' });
  const user = formField({ id: 'blk-user', label: 'User name', autocomplete: 'off', placeholder: 'alice' });
  const pass = formField({ id: 'blk-pass', label: 'Password', type: 'password', autocomplete: 'off', placeholder: '••••••••' });
  return h('div', { class: 'blk-stack' }, server.el, user.el, pass.el,
    h('label', { class: 'fui-field__check' }, h('input', { type: 'checkbox', checked: true }), 'Keep me signed in on this device'),
    button({ variant: 'primary', block: true }, icon('lock', 14), 'Sign in'));
}

function notifications() {
  const row = (id, label, help, on) => settingRow({ id, label, help, control: toggle({ checked: on, onChange: noop, labelledby: `${id}-label`, describedby: `${id}-help` }) });
  return h('div', { class: 'fui-setting-row__rows' },
    row('blk-n-start', 'A play starts', 'Who, what and on which device.', true),
    row('blk-n-avail', 'A request can be watched', 'Once it is in the library.', true),
    row('blk-n-fail', 'Failed sign-ins', 'Three in a row from one address.', false));
}

/** Settings as finstats lays them out: the list to move between, the open one marked, and its rows. */
function settingsPage() {
  const visible = [{ key: 'account', label: 'Account', icon: 'user', group: 'You' }, { key: 'appearance', label: 'Appearance', icon: 'sliders', group: 'You' },
    { key: 'notifications', label: 'Notifications', icon: 'inbox', group: 'You' }, { key: 'collection', label: 'Collection', icon: 'database', group: 'Server' },
    { key: 'security', label: 'Security', icon: 'shield', group: 'Server' }, { key: 'tasks', label: 'Tasks', icon: 'clock', group: 'Server' }];
  const rows = h('div', { class: 'fui-setting-row__rows' },
    settingRow({ id: 'blk-groups', label: 'Watched together', help: 'Plays of one title by two people within a minute count as one evening.',
      control: toggle({ checked: true, onChange: noop, labelledby: 'blk-groups-label', describedby: 'blk-groups-help' }) }),
    settingRow({ id: 'blk-min', label: 'Shortest play counted', help: 'Shorter plays are left out of every statistic.', labelFor: 'blk-min-in',
      control: h('input', { class: 'fui-field__input fui-field__input--num', id: 'blk-min-in', type: 'number', value: 120 }) }),
    settingRow({ id: 'blk-name', label: 'Server name', labelFor: 'blk-name-in',
      control: h('input', { class: 'fui-field__input', id: 'blk-name-in', type: 'text', value: 'Living room', autocomplete: 'off' }) }),
    settingRow({ id: 'blk-week', label: 'Week starts on', labelFor: 'blk-week-in',
      control: h('select', { class: 'fui-field__input', id: 'blk-week-in' }, h('option', null, 'Monday'), h('option', null, 'Sunday')) }));
  return sectionLayout(sectionNav('#', visible, 'appearance', 'Settings'),
    h('div', { class: 'blk-stack' }, rows, h('div', { class: 'blk-row blk-row--end' }, button({ variant: 'ghost' }, 'Cancel'), button({ variant: 'primary' }, 'Save'))));
}

function upcoming() {
  const day = (d, m) => h('span', { class: 'blk-date' }, h('span', { class: 'blk-date__day' }, d), h('span', { class: 'blk-date__month' }, m));
  return h('ul', { class: 'blk-list' }, [
    ['9', 'Oct', 'Sintel', 'Season 2, episode 4', status({ tone: 'good' }, 'On the server')],
    ['14', 'Oct', 'Tears of Steel', 'Film · requested by bob', status({ tone: 'warning' }, 'Downloading')],
    ['22', 'Oct', 'Cosmos Laundromat', 'Season 1, episode 1', status({ tone: 'info' }, 'Coming up')],
  ].map(([d, m, title, sub, state]) => h('li', { class: 'blk-list__row' }, day(d, m), h('div', { class: 'blk-list__text' }, h('strong', null, title), h('span', { class: 'muted' }, sub)), state)));
}

function downloads() {
  return h('div', { class: 'blk-stack' }, [['Big Buck Bunny (2008) 2160p', 0.82, '2 min left'], ['Sintel S02E04 1080p', 0.37, '14 min left'], ['Elephants Dream 720p', 0.06, 'Queued']].map(([name, v, eta]) =>
    h('div', { class: 'blk-dl' }, h('div', { class: 'blk-dl__top' }, h('span', { class: 'trunc' }, name), h('span', { class: 'muted nowrap' }, eta)), meter({ value: v, block: true, label: name }))));
}

function nowPlaying() {
  return h('ul', { class: 'blk-list' }, [['Big Buck Bunny', 'alice · Living room TV', 0.64, 'Direct play'], ['Sintel', 'bob · Phone', 0.21, 'Transcode']].map(([title, who, v, how]) =>
    h('li', { class: 'blk-list__row' }, poster(null, title, { cls: 'fui-poster--sm' }),
      h('div', { class: 'blk-list__text' }, h('strong', null, title), h('span', { class: 'muted' }, who), meter({ value: v, block: true, label: `${title}, how far along` })),
      chip(how))));
}

function together() {
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-avatars' }, ['alice', 'bob', 'carol', 'dave'].map((n) => avatar(null, n, { size: 34 }))),
    h('p', null, h('strong', null, 'Three evenings together'), ' this month: alice and bob watched Sintel side by side.'),
    facts([['Longest', '2h 10m'], ['Usually', 'Fridays']]));
}

function apiKey() {
  const key = 'fs_3f9a1c07d24e8b6a';
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-key-row' }, h('code', { class: 'mono trunc' }, `${key}…`), copyButton(key, 'Copy the key')),
    h('p', { class: 'muted' }, 'Shown once. Anything that holds it reads finstats as you.'),
    h('div', { class: 'blk-row' }, button({ size: 'sm' }, icon('plus', 14), 'New key'), button({ size: 'sm', variant: 'danger' }, icon('trash', 14), 'Revoke')));
}

function search() {
  return h('div', { class: 'blk-stack' },
    h('label', { class: 'fui-field__search' }, icon('search', 14), h('input', { class: 'fui-field__input fui-field__input--search', type: 'search', placeholder: 'Search titles, people…', 'aria-label': 'Search' })),
    segmented({ label: 'Kind', size: 'sm', value: 'all', options: [{ value: 'all', label: 'All' }, { value: 'films', label: 'Films' }, { value: 'shows', label: 'Shows' }, { value: 'music', label: 'Music' }], onChange: noop }),
    chipSet(removableChip({ label: 'Drama', onRemove: noop }), removableChip({ label: 'After 2010', onRemove: noop }), chipToggle({ pressed: true }, 'Unwatched'), chipToggle({ pressed: false }, '4K')));
}

function shortcuts() {
  const keys = (...k) => h('span', { class: 'blk-keys' }, k.map((x) => h('kbd', { class: 'blk-kbd mono' }, x)));
  return h('ul', { class: 'blk-shortcuts' }, [['Search', keys('/')], ['Go to the dashboard', keys('g', 'd')], ['Go back', keys('Esc')], ['Next page', keys('→')]].map(([what, k]) =>
    h('li', null, h('span', null, what), k)));
}

function health() {
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-stack blk-stack--tight' }, status({ tone: 'good' }, 'Jellyfin answers in 38 ms'), status({ tone: 'warning' }, 'Sonarr is slow to answer'), status({ tone: 'critical' }, 'Radarr: the key was refused')),
    table(['Library', 'Titles', 'Size'], [['Films', '418', '6.1 TB'], ['Shows', '213', '7.8 TB'], ['Music', '9,204', '312 GB'], [h('strong', null, 'Total'), h('strong', null, '9,835'), h('strong', null, '14.2 TB')]], { right: [1, 2] }));
}

function focusDemo() {
  return h('div', { class: 'blk-stack' },
    h('p', { class: 'muted' }, 'The ring a control wears when the keyboard reaches it, held still here:'),
    h('div', { class: 'blk-row' }, button({ class: 'blk-focused' }, 'Focused'), button({ variant: 'primary' }, 'Not focused')),
    h('div', { class: 'blk-row blk-icons' }, ['play', 'settings', 'calendar', 'shield', 'download', 'trophy', 'heart', 'compass'].map((n) => icon(n, 18))));
}

function confirmBox() {
  return h('div', { class: 'fui-modal blk-modal', role: 'group', 'aria-label': 'A dialog' },
    h('div', { class: 'fui-modal__head' }, h('h3', { class: 'fui-modal__title' }, 'Remove this destination?'), button({ variant: 'icon', 'aria-label': 'Close' }, icon('x', 16))),
    h('div', { class: 'fui-modal__body blk-stack' }, h('p', null, 'Notifications stop going to ntfy.example. What was sent stays sent.'),
      h('div', { class: 'blk-row blk-row--end' }, button({ variant: 'ghost' }, 'Keep it'), button({ variant: 'danger' }, 'Remove'))));
}

function buttons() {
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-row' }, button({ variant: 'primary' }, icon('play', 14), 'Primary'), button({}, 'Default'), button({ variant: 'ghost' }, 'Ghost'), button({ variant: 'danger' }, 'Delete')),
    h('div', { class: 'blk-row' }, chipToggle({ pressed: true }, 'Films'), chipToggle({ pressed: false }, 'Shows'), chip('Drama'), chip('Science Fiction'), badge({ live: true }, 'Live'), badge({ count: true }, '12')),
    h('div', { class: 'blk-row' }, spinner(16), h('span', { class: 'muted' }, 'Reading the library…')),
    pagination({ page: 2, perPage: 50, total: 640, onPage: noop }));
}

/** A month, Monday first, whole weeks: today ringed, the chosen day filled, a dot on a day with something coming out, and
 *  what comes out on the chosen day below. October 2026, so the picture never moves. */
function calendar() {
  const today = 2;
  const releases = { 2: ['Sintel', 'Season 2, episode 3'], 9: ['Sintel', 'Season 2, episode 4'], 14: ['Tears of Steel', 'Film'], 22: ['Cosmos Laundromat', 'Season 1, episode 1'], 30: ['Spring', 'Film'] };
  let chosen = 9;
  const list = h('ul', { class: 'blk-list' });
  const show = () => {
    const r = releases[chosen];
    list.replaceChildren(h('li', { class: 'blk-list__row' }, h('div', { class: 'blk-list__text' },
      h('strong', null, r ? r[0] : 'Nothing comes out'), h('span', { class: 'muted' }, r ? `${r[1]} · ${chosen} October` : `on ${chosen} October`)), r ? status({ tone: 'info' }, 'Coming up') : null));
  };
  const grid = month((d) => {
    const b = h('button', { type: 'button', class: 'blk-cal__day', 'aria-pressed': String(d === chosen), 'aria-current': d === today ? 'date' : null,
      'aria-label': `${d} October${releases[d] ? `, ${releases[d][0]}` : ''}` }, String(d), releases[d] ? h('span', { class: 'blk-cal__dot', 'aria-hidden': 'true' }) : null);
    b.addEventListener('click', () => { chosen = d; grid.querySelectorAll('button.blk-cal__day').forEach((x, k) => x.setAttribute('aria-pressed', String(k + 1 === d))); show(); });
    return b;
  });
  show();
  return h('div', { class: 'blk-cal' },
    h('div', { class: 'blk-cal__head' }, button({ variant: 'icon', 'aria-label': 'September' }, icon('chevronLeft', 16)), h('span', { class: 'blk-cal__month' }, 'October 2026'),
      button({ variant: 'icon', 'aria-label': 'November' }, icon('chevronRight', 16))),
    grid, list);
}

// ---- more charts
/** Two lines, this month and the one before, day by day. */
function lineChart() {
  const r = steady(19);
  const W = 320, H = 130;
  const make = (base) => Array.from({ length: 15 }, (_, i) => base + Math.sin(i / 2.2) * 12 + r.next().value * 14);
  const now = make(40), before = make(30), top = Math.max(...now, ...before);
  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${((i / 14) * W).toFixed(1)},${(H - (v / top) * (H - 8)).toFixed(1)}`).join(' ');
  const svg = s('svg', { class: 'blk-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Plays a day, this month and the month before' });
  for (const f of [0.25, 0.5, 0.75]) svg.append(styled(s('line', { x1: 0, x2: W, y1: H * f, y2: H * f }), { stroke: 'var(--grid)' }));
  svg.append(styled(s('path', { d: line(before) }), { fill: 'none', stroke: 'var(--series-2)', strokeWidth: '2', strokeDasharray: '4 4' }));
  svg.append(styled(s('path', { d: line(now) }), { fill: 'none', stroke: 'var(--series-1)', strokeWidth: '2.5' }));
  return h('div', { class: 'blk-stack' }, svg, legend([['This month', 'var(--series-1)'], ['The month before', 'var(--series-2)']]));
}

/** Three rings, each how far one thing has come. */
function radial() {
  const parts = [['Finished', 0.72, 1], ['Started', 0.48, 2], ['Requested', 0.3, 3]];
  const svg = s('svg', { class: 'blk-donut', viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Shows finished, started and requested this year' });
  parts.forEach(([, v, n], i) => {
    const R = 50 - i * 14, C = 2 * Math.PI * R;
    svg.append(styled(s('circle', { cx: 60, cy: 60, r: R }), { fill: 'none', stroke: 'var(--track)', strokeWidth: '9' }));
    svg.append(styled(s('circle', { cx: 60, cy: 60, r: R, 'stroke-dasharray': `${v * C} ${C}`, transform: 'rotate(-90 60 60)', 'stroke-linecap': 'round' }), { fill: 'none', stroke: `var(--series-${n})`, strokeWidth: '9' }));
  });
  return h('div', { class: 'blk-donut-wrap' }, svg, legend(parts.map(([name, v, n]) => [`${name} · ${Math.round(v * 100)}%`, `var(--series-${n})`])));
}

/** What somebody watches, by genre: one shape over a web of six. */
function radar() {
  const axes = [['Drama', 0.9], ['Comedy', 0.55], ['Animation', 0.8], ['Sci-fi', 0.65], ['Documentary', 0.3], ['Horror', 0.2]];
  const C = 80, R = 58, pt = (i, f) => [C + Math.sin((i / 6) * 2 * Math.PI) * R * f, C - Math.cos((i / 6) * 2 * Math.PI) * R * f];
  const svg = s('svg', { class: 'blk-radar', viewBox: '0 0 160 160', role: 'img', 'aria-label': 'Watch time by genre' });
  for (const f of [0.33, 0.66, 1]) svg.append(styled(s('polygon', { points: axes.map((_, i) => pt(i, f).join(',')).join(' ') }), { fill: 'none', stroke: 'var(--grid)' }));
  axes.forEach(([name], i) => {
    const [x, y] = pt(i, 1), [tx, ty] = pt(i, 1.22);
    svg.append(styled(s('line', { x1: C, y1: C, x2: x, y2: y }), { stroke: 'var(--grid)' }));
    svg.append(s('text', { x: tx, y: ty + 2.5, 'text-anchor': 'middle', class: 'blk-radar__label' }, name));
  });
  svg.append(styled(s('polygon', { points: axes.map(([, v], i) => pt(i, v).join(',')).join(' ') }), { fill: 'var(--single)', fillOpacity: '.22', stroke: 'var(--single)', strokeWidth: '2' }));
  return svg;
}

/** Plays by app, as bars to compare, the number beside each. */
function barList() {
  const rows = [['Android TV', 412], ['Web', 298], ['iOS', 171], ['Kodi', 96], ['Roku', 44]];
  const top = rows[0][1];
  return h('ul', { class: 'blk-bars' }, rows.map(([name, n]) => h('li', { class: 'blk-bars__row' },
    styled(h('span', { class: 'blk-bars__fill', 'aria-hidden': 'true' }), { width: `${(n / top) * 100}%` }), h('span', { class: 'blk-bars__name' }, name), h('span', { class: 'blk-bars__value mono' }, String(n)))));
}

const spark = (seed) => {
  const r = steady(seed), v = Array.from({ length: 12 }, (_, i) => 8 + i * 0.6 + r.next().value * 8), top = Math.max(...v);
  const svg = s('svg', { class: 'blk-spark', viewBox: '0 0 80 24', 'aria-hidden': 'true' });
  svg.append(styled(s('path', { d: v.map((x, i) => `${i ? 'L' : 'M'}${(i / 11) * 80},${24 - (x / top) * 22}`).join(' ') }), { fill: 'none', stroke: 'var(--spark)', strokeWidth: '1.5' }));
  return svg;
};
function statsRow() {
  return h('div', { class: 'fui-stat-tile__grid blk-stats' },
    statTile({ label: 'Watch time', value: '42h', current: 42, previous: 36, vsLabel: 'vs last week', spark: spark(2) }),
    statTile({ label: 'Plays', value: '128', current: 128, previous: 140, vsLabel: 'vs last week', spark: spark(5) }),
    statTile({ label: 'Transcodes', value: '9', current: 9, previous: 14, vsLabel: 'vs last week', spark: spark(8) }));
}

// ---- dates
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
/** October 2026 as a grid, Monday first: `day(d)` gives a day's own attributes and contents. */
function month(day) {
  const first = 3, days = 31, cells = [];
  for (let i = 0; i < first; i++) cells.push(h('span', { class: 'blk-cal__day is-outside', 'aria-hidden': 'true' }, String(28 + i)));
  for (let d = 1; d <= days; d++) cells.push(day(d));
  while (cells.length % 7) cells.push(h('span', { class: 'blk-cal__day is-outside', 'aria-hidden': 'true' }, String(cells.length - first - days + 1)));
  return h('div', { class: 'blk-cal__grid', role: 'group', 'aria-label': 'October 2026' }, WEEKDAYS.map((w) => h('span', { class: 'blk-cal__wd', 'aria-hidden': 'true' }, w)), cells);
}
function dateRange() {
  const from = 12, to = 18;
  const grid = month((d) => h('span', { class: ['blk-cal__day', d >= from && d <= to && 'is-in-range', (d === from || d === to) && 'is-edge'], 'aria-current': d === 2 ? 'date' : null }, String(d)));
  return h('div', { class: 'blk-cal' },
    h('div', { class: 'blk-cal__head' }, button({ variant: 'icon', 'aria-label': 'September' }, icon('chevronLeft', 16)), h('span', { class: 'blk-cal__month' }, 'October 2026'), button({ variant: 'icon', 'aria-label': 'November' }, icon('chevronRight', 16))),
    grid,
    h('div', { class: 'blk-row blk-row--between' }, h('span', { class: 'muted' }, '12 – 18 October · 7 days'), button({ variant: 'primary', size: 'sm' }, 'Show this week')));
}
function timeSlots() {
  const times = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
  let chosen = '20:00';
  const slots = h('div', { class: 'blk-slots', role: 'group', 'aria-label': 'Start at' });
  const paint = () => slots.replaceChildren(...times.map((t) => chipToggle({ pressed: t === chosen, onChange: () => { chosen = t; paint(); } }, t)));
  paint();
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-row blk-row--between' }, h('strong', null, 'Friday 9 October'), status({ tone: 'good' }, '4 of 5 free')),
    slots,
    h('p', { class: 'muted' }, 'alice, bob and carol are free then; dave joins at 21:00.'),
    button({ variant: 'primary', block: true }, icon('calendar', 14), 'Plan the evening'));
}
function weekAgenda() {
  const days = [['Mon 5', [['21:00', 'Sintel', 'S2 · E3']]], ['Wed 7', [['20:30', 'Tears of Steel', 'Film'], ['22:45', 'Spring', 'Short']]], ['Fri 9', [['21:00', 'Sintel', 'S2 · E4']]], ['Sun 11', []]];
  return h('ul', { class: 'blk-agenda' }, days.map(([d, items]) => h('li', { class: 'blk-agenda__day' }, h('span', { class: 'blk-agenda__date' }, d),
    h('div', { class: 'blk-agenda__items' }, items.length ? items.map(([t, title, sub]) => h('div', { class: 'blk-agenda__item' }, h('span', { class: 'mono muted' }, t), h('strong', null, title), h('span', { class: 'muted' }, sub)))
      : h('span', { class: 'muted' }, 'Nothing planned')))));
}

// ---- forms
function signUp() {
  const f = (id, label, type = 'text', placeholder = '') => formField({ id, label, type, placeholder, autocomplete: 'off' }).el;
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-two' }, f('blk-first', 'First name', 'text', 'Alice'), f('blk-last', 'Last name', 'text', 'Liddell')),
    f('blk-mail', 'E-mail', 'email', 'alice@example.org'), f('blk-new-pass', 'Password', 'password', 'At least 12 characters'),
    h('label', { class: 'fui-field__check' }, h('input', { type: 'checkbox' }), 'Send me the weekly summary'),
    button({ variant: 'primary', block: true }, 'Create the account'),
    h('p', { class: 'muted blk-center' }, 'Already have one? ', h('a', { href: '#' }, 'Sign in')));
}
function verifyCode() {
  const boxes = Array.from({ length: 6 }, (_, i) => h('input', { class: 'fui-field__input blk-otp__box mono', type: 'text', inputMode: 'numeric', maxLength: 1, value: i < 4 ? '3917'[i] : '', 'aria-label': `Digit ${i + 1}` }));
  return h('div', { class: 'blk-stack blk-center' },
    h('p', null, 'Enter the six digits your authenticator app shows for finstats.'),
    h('div', { class: 'blk-otp' }, boxes.slice(0, 3), h('span', { class: 'blk-otp__dash', 'aria-hidden': 'true' }, '–'), boxes.slice(3)),
    button({ variant: 'primary', block: true }, 'Verify'),
    h('p', { class: 'muted' }, 'Lost your phone? ', h('a', { href: '#' }, 'Use a recovery code')));
}
function connectService() {
  const url = formField({ id: 'blk-svc-url', label: 'Address', placeholder: 'http://192.168.1.10:8989' }).el;
  const key = h('div', { class: 'fui-field' }, h('label', { class: 'fui-field__label', htmlFor: 'blk-svc-key' }, 'API key'),
    h('div', { class: 'blk-key-row' }, h('input', { class: 'fui-field__input mono', id: 'blk-svc-key', type: 'password', value: 'invented-key-123', autocomplete: 'off' }), button({ variant: 'icon', 'aria-label': 'Show the key' }, icon('unlock', 15))),
    h('p', { class: 'fui-field__help' }, 'Settings → General in Sonarr.'));
  return h('div', { class: 'blk-stack' }, segmented({ label: 'Service', size: 'sm', value: 'sonarr', options: [{ value: 'sonarr', label: 'Sonarr' }, { value: 'radarr', label: 'Radarr' }, { value: 'seerr', label: 'Seerr' }], onChange: noop }),
    url, key, status({ tone: 'good' }, 'Answered in 42 ms · version 4.0'),
    h('div', { class: 'blk-row blk-row--end' }, button({}, icon('refresh', 14), 'Test'), button({ variant: 'primary' }, 'Connect')));
}
function invite() {
  const row = (who, role) => h('div', { class: 'blk-invite' }, h('input', { class: 'fui-field__input', type: 'email', value: who, 'aria-label': 'E-mail' }),
    h('select', { class: 'fui-field__input', 'aria-label': 'Role' }, ['Viewer', 'Manager'].map((r) => h('option', { selected: r === role }, r))));
  const link = 'https://stats.example.org/invite/7f3a';
  return h('div', { class: 'blk-stack' }, row('carol@example.org', 'Viewer'), row('dave@example.org', 'Manager'),
    button({ variant: 'ghost', size: 'sm' }, icon('plus', 14), 'Another'),
    h('div', { class: 'blk-key-row blk-key-row--boxed' }, h('code', { class: 'mono trunc' }, link), copyButton(link, 'Copy the invite link')),
    button({ variant: 'primary', block: true }, 'Send 2 invites'));
}
function upload() {
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-drop' }, icon('upload', 22), h('strong', null, 'Drop a backup here'), h('span', { class: 'muted' }, 'Jellystat, Streamystats or Tautulli · up to 2 GB'), button({ size: 'sm' }, 'Choose a file')),
    h('div', { class: 'blk-dl' }, h('div', { class: 'blk-dl__top' }, h('span', { class: 'trunc mono' }, 'jellystat-backup.json'), h('span', { class: 'muted nowrap' }, '61%')), meter({ value: 0.61, block: true, label: 'Uploading' })));
}

// ---- lists
function activityFeed() {
  const rows = [['alice', 'started', 'Sintel', '2 min ago', 'play'], ['bob', 'finished', 'Tears of Steel', '18 min ago', 'check'], ['carol', 'requested', 'Cosmos Laundromat', '1 h ago', 'plus'],
    ['dave', 'signed in from', 'a new place', '3 h ago', 'shield']];
  return h('ol', { class: 'blk-feed' }, rows.map(([who, did, what, when, ic]) => h('li', { class: 'blk-feed__row' },
    h('span', { class: 'blk-feed__mark', 'aria-hidden': 'true' }, icon(ic, 13)),
    h('div', { class: 'blk-list__text' }, h('span', null, h('strong', null, who), ` ${did} `, h('strong', null, what)), h('span', { class: 'muted' }, when)))));
}
function members() {
  const rows = [['alice', 'Administrator'], ['bob', 'Manager'], ['carol', 'Viewer'], ['dave', 'Viewer']];
  return h('ul', { class: 'blk-list' }, rows.map(([who, role]) => h('li', { class: 'blk-list__row' }, avatar(null, who, { size: 32 }),
    h('div', { class: 'blk-list__text' }, h('strong', null, who), h('span', { class: 'muted' }, `${who}@example.org`)),
    role === 'Administrator' ? badge({}, 'Jellyfin admin') : h('select', { class: 'fui-field__input blk-select-sm', 'aria-label': `${who}'s role` }, ['Viewer', 'Manager'].map((r) => h('option', { selected: r === role }, r))))));
}
function inbox() {
  const rows = [['Sintel S2 · E4 is on the server', 'Requested by you', '5 min', true], ['Three failed sign-ins', 'From 203.0.113.7', '1 h', true], ['Backup written', '14.2 MB', 'yesterday', false]];
  return h('div', { class: 'blk-stack' },
    h('ul', { class: 'blk-list' }, rows.map(([title, sub, when, unread]) => h('li', { class: ['blk-list__row', 'blk-inbox', unread && 'is-unread'] },
      h('span', { class: 'blk-inbox__dot', 'aria-label': unread ? 'Unread' : null }), h('div', { class: 'blk-list__text' }, h('strong', null, title), h('span', { class: 'muted' }, sub)), h('span', { class: 'muted nowrap' }, when)))),
    button({ variant: 'ghost', size: 'sm' }, icon('check', 14), 'Mark all as read'));
}
function storage() {
  const parts = [['Films', 6.1, 1], ['Shows', 7.8, 2], ['Music', 0.3, 3], ['Free', 5.8, 0]];
  const total = parts.reduce((a, [, v]) => a + v, 0);
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-row blk-row--between' }, h('strong', { class: 'blk-big' }, '14.2 TB'), h('span', { class: 'muted' }, 'of 20 TB')),
    h('div', { class: 'blk-stackbar', role: 'img', 'aria-label': 'Disk use by library' }, parts.map(([, v, n]) => styled(h('span'), { width: `${(v / total) * 100}%`, background: n ? `var(--series-${n})` : 'var(--track)' }))),
    legend(parts.map(([name, v, n]) => [`${name} · ${v} TB`, n ? `var(--series-${n})` : 'var(--track)'])));
}

// ---- feedback
function banners() {
  const one = (tone, ic, title, text, action) => h('div', { class: ['blk-callout', `blk-callout--${tone}`], role: tone === 'critical' ? 'alert' : 'status' },
    icon(ic, 16), h('div', { class: 'blk-list__text' }, h('strong', null, title), h('span', null, text)), action);
  return h('div', { class: 'blk-stack' },
    one('info', 'info', 'A new version is out', 'finstats 2.3.0 brings the blocks to your look.', button({ size: 'sm' }, 'What changed')),
    one('warning', 'alert', 'Radarr is slow to answer', 'It took 8 seconds; downloads may lag behind.', null),
    one('critical', 'alert', 'The library read was refused', 'Jellyfin answered with nothing; nothing was removed.', button({ size: 'sm' }, 'Details')));
}
function success() {
  return h('div', { class: 'blk-stack blk-center' }, h('span', { class: 'blk-done', 'aria-hidden': 'true' }, icon('check', 26)),
    h('strong', { class: 'blk-big' }, 'Import finished'), h('p', { class: 'muted' }, '3,162 plays from Jellystat, none of them twice.'),
    facts([['Plays', '3,162'], ['People', '6'], ['Took', '14 s']]), button({ variant: 'primary', block: true }, 'See them'));
}

// ---- pages
function notFound() {
  return h('div', { class: 'blk-stack blk-center' }, h('span', { class: 'blk-404 mono' }, '404'), h('strong', { class: 'blk-big' }, 'Nothing lives here'),
    h('p', { class: 'muted' }, 'The address may be old, or the title was removed from the library.'),
    h('label', { class: 'fui-field__search' }, icon('search', 14), h('input', { class: 'fui-field__input fui-field__input--search', type: 'search', placeholder: 'Search instead…', 'aria-label': 'Search' })),
    button({ variant: 'primary' }, icon('home', 14), 'Back to the dashboard'));
}
function appSidebar() {
  const item = (ic, label, active) => h('a', { href: '#', class: ['blk-side__item', active && 'is-active'], 'aria-current': active ? 'page' : null }, icon(ic, 15), h('span', null, label));
  return h('nav', { class: 'blk-side', 'aria-label': 'An app’s menu' },
    h('div', { class: 'blk-side__brand' }, h('span', { class: 'blk-side__logo', 'aria-hidden': 'true' }, 'f'), h('strong', null, 'finstats'), h('span', { class: 'muted' }, 'Living room')),
    h('p', { class: 'blk-side__group' }, 'Watch'), item('home', 'Dashboard', true), item('activity', 'Activity'), item('library', 'Libraries'), item('together', 'Together'),
    h('p', { class: 'blk-side__group' }, 'Server'), item('server', 'Server'), item('shield', 'Security'), item('settings', 'Settings'),
    h('div', { class: 'blk-side__user' }, avatar(null, 'alice', { size: 28 }), h('div', { class: 'blk-list__text' }, h('strong', null, 'alice'), h('span', { class: 'muted' }, 'Administrator'))));
}

/** Every block: a key, its name and group in the gallery's list and an icon there, a title, a line on what it shows, and
 *  its builder. `wide` blocks take a whole row. A block is a
 *  composition of FinUI's components with invented data; FinUI create draws them all, the gallery shows each with its
 *  HTML to copy. */
export const BLOCKS = [
  { key: 'bar-chart', name: 'Bar chart', group: 'Chart blocks', icon: 'chart', title: 'Watch time by day', about: 'Stacked bars, one colour per kind, with a legend.', render: () => card({ title: 'Watch time by day', sub: 'Films, episodes, music and the rest', body: bars(), actions: button({ variant: 'ghost', size: 'sm' }, icon('download', 14), 'Export') }) },
  { key: 'area-chart', name: 'Area chart', group: 'Chart blocks', icon: 'activity', title: 'Plays a month', about: 'One quantity over a year, its busiest month marked.', render: () => card({ title: 'Plays a month', sub: 'This year, the busiest month marked', body: area() }) },
  { key: 'donut-chart', name: 'Donut chart', group: 'Chart blocks', icon: 'gauge', title: 'Where people watch', about: 'A ring of four parts and its legend.', render: () => card({ title: 'Where people watch', body: donut() }) },
  { key: 'heatmap', name: 'Heatmap', group: 'Chart blocks', icon: 'flame', title: 'When people watch', about: 'A week of hours, quiet to busy.', render: () => card({ title: 'When people watch', sub: 'Plays by weekday and hour', body: heat() }) },
  { key: 'line-chart', name: 'Line chart', group: 'Chart blocks', icon: 'activity', title: 'Plays a day', about: 'Two lines to compare, one dashed, with a legend.', render: () => card({ title: 'Plays a day', sub: 'This month and the one before', body: lineChart() }) },
  { key: 'radial-chart', name: 'Radial chart', group: 'Chart blocks', icon: 'gauge', title: 'Shows this year', about: 'Rings, each how far one thing has come.', render: () => card({ title: 'Shows this year', body: radial() }) },
  { key: 'radar-chart', name: 'Radar chart', group: 'Chart blocks', icon: 'compass', title: 'Taste', about: 'One shape over a web of six, for a profile at a glance.', render: () => card({ title: 'Taste', sub: 'Watch time by genre', body: radar() }) },
  { key: 'bar-list', name: 'Bar list', group: 'Chart blocks', icon: 'chart', title: 'Plays by app', about: 'Bars to compare, the number beside each.', render: () => card({ title: 'Plays by app', sub: 'The last 30 days', body: barList() }) },
  { key: 'stats-row', name: 'Stats with sparklines', group: 'Chart blocks', icon: 'trendUp', title: 'This week', about: 'Numbers that matter, each with how it moved and a sparkline.', render: () => card({ title: 'This week', body: statsRow() }) },
  { key: 'calendar', name: 'Calendar', group: 'Date blocks', icon: 'calendar', title: 'Calendar', about: 'A month to pick a day in, today ringed, a dot where something comes out.', render: () => card({ title: 'Calendar', sub: 'What comes out when', body: calendar() }) },
  { key: 'coming-up', name: 'Coming up', group: 'Date blocks', icon: 'clock', title: 'Coming up', about: 'Dated rows, each with its state.', render: () => card({ title: 'Coming up', sub: 'From Sonarr, Radarr and requests', body: upcoming() }) },
  { key: 'date-range', name: 'Date range', group: 'Date blocks', icon: 'calendar', title: 'Pick a week', about: 'A month with a range chosen, its two ends filled.', render: () => card({ title: 'Pick a week', body: dateRange() }) },
  { key: 'time-slots', name: 'Time slots', group: 'Date blocks', icon: 'clock', title: 'Watch together', about: 'Times to choose from, and who is free then.', render: () => card({ title: 'Watch together', body: timeSlots() }) },
  { key: 'week-agenda', name: 'Week agenda', group: 'Date blocks', icon: 'calendar', title: 'This week', about: 'Days and what is planned on each, an empty day said in words.', render: () => card({ title: 'This week', body: weekAgenda() }) },
  { key: 'sign-in', name: 'Sign in', group: 'Form blocks', icon: 'lock', title: 'Sign in', about: 'A form: fields with labels and help, a checkbox, the primary button.', render: () => card({ title: 'Sign in', sub: 'With your Jellyfin account', body: signIn() }) },
  { key: 'notifications', name: 'Notifications', group: 'Form blocks', icon: 'inbox', title: 'Notifications', about: 'Settings that switch on and off, each with a line of help.', render: () => card({ title: 'Notifications', sub: 'What finstats tells you', body: notifications() }) },
  { key: 'search', name: 'Search and filters', group: 'Form blocks', icon: 'search', title: 'Find something', about: 'A search box, a segmented choice and filter chips.', render: () => card({ title: 'Find something', body: search() }) },
  { key: 'api-key', name: 'API key', group: 'Form blocks', icon: 'link', title: 'API key', about: 'A secret to copy once, and what to do with it.', render: () => card({ title: 'API key', sub: 'For scripts and the calendar feed', body: apiKey() }) },
  { key: 'sign-up', name: 'Sign up', group: 'Form blocks', icon: 'user', title: 'Create an account', about: 'Two names side by side, an address, a password, a way back to signing in.', render: () => card({ title: 'Create an account', body: signUp() }) },
  { key: 'verify-code', name: 'Verification code', group: 'Form blocks', icon: 'shield', title: 'Two-step sign-in', about: 'Six digits in boxes of their own, and a way out.', render: () => card({ title: 'Two-step sign-in', body: verifyCode() }) },
  { key: 'connect-service', name: 'Connect a service', group: 'Form blocks', icon: 'plug', title: 'Connect a service', about: 'An address, a secret to show or hide, a test and its answer.', render: () => card({ title: 'Connect a service', body: connectService() }) },
  { key: 'invite', name: 'Invite people', group: 'Form blocks', icon: 'users', title: 'Invite people', about: 'Addresses with a role each, another row, and a link to copy.', render: () => card({ title: 'Invite people', body: invite() }) },
  { key: 'upload', name: 'Upload', group: 'Form blocks', icon: 'upload', title: 'Import a backup', about: 'A place to drop a file, and one on its way.', render: () => card({ title: 'Import a backup', body: upload() }) },
  { key: 'most-watched', name: 'Ranked list', group: 'List blocks', icon: 'trophy', title: 'Most watched', about: 'A ranked list with a value and a note on each row.', render: () => card({ title: 'Most watched', body: rankList([
    { href: '#', name: 'Big Buck Bunny', sub: '2008 · 4 people', value: '12h 4m', note: '31 plays' },
    { href: '#', name: 'Sintel', sub: '2010 · 3 people', value: '6h 50m', note: '18 plays' },
    { href: '#', name: 'Tears of Steel', sub: '2012 · 2 people', value: '3h 2m', note: '9 plays' },
    { href: '#', name: 'Elephants Dream', sub: '2006 · 1 person', value: '1h 1m', note: '2 plays' }]) }) },
  { key: 'now-playing', name: 'Now playing', group: 'List blocks', icon: 'play', title: 'Now playing', about: 'What is on now: poster, who, where, how far along.', render: () => card({ title: 'Now playing', body: nowPlaying(), actions: badge({ live: true }, 'Live') }) },
  { key: 'downloads', name: 'Downloads', group: 'List blocks', icon: 'download', title: 'Downloads', about: 'Progress bars with what is left.', render: () => card({ title: 'Downloads', sub: 'Sonarr and Radarr queues', body: downloads() }) },
  { key: 'together', name: 'People together', group: 'List blocks', icon: 'together', title: 'Watched together', about: 'Avatars side by side, a sentence and two facts.', render: () => card({ title: 'Watched together', body: together() }) },
  { key: 'health', name: 'Status and table', group: 'List blocks', icon: 'server', title: 'Server health', about: 'Statuses in their tones over a table with a total.', render: () => card({ title: 'Server health', body: health() }) },
  { key: 'library', name: 'Facts and a meter', group: 'List blocks', icon: 'database', title: 'Library', about: 'Facts and a meter.', render: () => card({ title: 'Library', body: h('div', { class: 'blk-stack' },
    facts([['Films', '418'], ['Episodes', '6,032'], ['Size', '14.2 TB', { mono: true }], ['Last read', '4 min ago']]),
    meter({ value: 0.81, block: true, label: 'Disk used' })) }) },
  { key: 'keys', name: 'Shortcuts', group: 'List blocks', icon: 'menu', title: 'Keys', about: 'Keyboard shortcuts, each with its keys.', render: () => card({ title: 'Keys', sub: 'Everywhere in finstats', body: shortcuts() }) },
  { key: 'activity-feed', name: 'Activity feed', group: 'List blocks', icon: 'activity', title: 'What happened', about: 'Who did what, newest first, on a line that joins them.', render: () => card({ title: 'What happened', body: activityFeed() }) },
  { key: 'members', name: 'Members', group: 'List blocks', icon: 'users', title: 'People', about: 'Who has a say: a role each, the administrator fixed.', render: () => card({ title: 'People', body: members() }) },
  { key: 'inbox', name: 'Inbox', group: 'List blocks', icon: 'inbox', title: 'Notifications', about: 'Unread first, marked, with a way to read them all.', render: () => card({ title: 'Notifications', body: inbox() }) },
  { key: 'storage', name: 'Storage', group: 'List blocks', icon: 'database', title: 'Storage', about: 'One bar of parts, how much each takes, and what is free.', render: () => card({ title: 'Storage', body: storage() }) },
  { key: 'dialog', name: 'Dialog', group: 'Feedback blocks', icon: 'trash', title: 'A dialog', about: 'A question that cannot be taken back, and its two answers.', render: () => confirmBox() },
  { key: 'loading', name: 'Loading', group: 'Feedback blocks', icon: 'refresh', title: 'Loading', about: 'Skeleton rows while something comes.', render: () => card({ title: 'Loading', body: sk.rows(3) }) },
  { key: 'error', name: 'Error', group: 'Feedback blocks', icon: 'alert', title: 'Something went wrong', about: 'What failed, in words, and a way to try again.', render: () => card({ title: 'Something went wrong', body: errorState(new Error('Jellyfin did not answer within 10 seconds.'), noop) }) },
  { key: 'empty', name: 'Empty state', group: 'Feedback blocks', icon: 'inbox', title: 'Nothing here yet', about: 'An empty state that says what will come and offers a way on.', render: () => card({ title: 'Nothing here yet', body: emptyState('No plays in this range', 'Plays show up here a minute after they start.', button({}, 'Show all time')) }) },
  { key: 'banners', name: 'Banners', group: 'Feedback blocks', icon: 'info', title: 'Banners', about: 'Something to know, to watch and to act on, each in its tone.', render: () => card({ title: 'Banners', body: banners() }) },
  { key: 'success', name: 'Success', group: 'Feedback blocks', icon: 'check', title: 'Done', about: 'A finished thing, what it came to, and where to go next.', render: () => card({ title: 'Done', body: success() }) },
  { key: 'look', name: 'Colours', group: 'Look blocks', icon: 'sparkle', title: 'The look', about: 'The colours of a look by token, and a heading over its text.', render: () => card({ title: 'The look', sub: 'Colours and type, by token', body: palette() }) },
  { key: 'type', name: 'Type', group: 'Look blocks', icon: 'log', title: 'Type', about: 'A heading, body text with mono numbers, and faint words.', render: () => card({ title: 'Type', body: type() }) },
  { key: 'focus', name: 'Focus and icons', group: 'Look blocks', icon: 'compass', title: 'Focus and icons', about: 'A focus ring held still, and a row of icons.', render: () => card({ title: 'Focus and icons', body: focusDemo() }) },
  { key: 'buttons', name: 'Buttons', group: 'Look blocks', icon: 'sliders', title: 'Buttons and the rest', about: 'Every button, chips, badges, a spinner and pagination.', render: () => card({ title: 'Buttons and the rest', body: buttons() }) },
  { key: 'recent-plays', name: 'Table', group: 'Page blocks', icon: 'table', title: 'Recent plays', wide: true, about: 'A sortable table with avatars, badges and progress.', render: () => card({ title: 'Recent plays', cls: 'fui-card--flush', body: recent() }) },
  { key: 'settings', name: 'Settings page', group: 'Page blocks', icon: 'settings', title: 'Settings', wide: true, about: 'A page of settings: the menu, the open section marked, its rows.', render: () => card({ title: 'Settings', sub: 'One section at a time, the open one marked', body: settingsPage() }) },
  { key: 'not-found', name: 'Not found', group: 'Page blocks', icon: 'compass', title: 'Not found', about: 'A page that is not there, said plainly, with two ways on.', render: () => card({ title: 'Not found', body: notFound() }) },
  { key: 'app-sidebar', name: 'App sidebar', group: 'Page blocks', icon: 'menu', title: 'App sidebar', about: 'An app’s menu: its name, groups of pages, the open one marked, and who is signed in.', render: () => card({ title: 'App sidebar', body: appSidebar() }) },
];

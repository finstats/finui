// The page the landing restyles: the components together, the way a page of finstats uses them. Invented data only.
// Drawn into the landing's preview frame, a document of its own wearing the look that was picked.

import { h, icon } from '../core.js';
import { num } from '../format.js';
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
import { emptyState } from '../components/empty/empty.js';
import { formField } from '../components/field/field.js';
import { toggle } from '../components/toggle/toggle.js';
import { segmented } from '../components/segmented/segmented.js';

export function livingRoom() {
  const films = ['Big Buck Bunny', 'Sintel', 'Tears of Steel', 'Cosmos Laundromat', 'Elephants Dream', 'Spring'];
  return h('div', { class: 'demo-stack demo-living' },
    pageHeader('Living room', 'An invented week on an invented server'),
    h('div', { class: 'fui-stat-tile__grid' },
      statTile({ label: 'Watch time', value: '42h 10m', current: 42, previous: 36, vsLabel: 'vs last week' }),
      statTile({ label: 'Plays', value: '128', current: 128, previous: 140, vsLabel: 'vs last week' }),
      statTile({ label: 'People', value: '5', current: 5, previous: 5, vsLabel: 'vs last week' }),
      statTile({ label: 'Last played', value: 'just now', hint: 'Spring' })),
    h('div', { class: 'demo-grid-2' },
      card({ title: 'Most watched', sub: 'By watch time', body: rankList(films.slice(0, 5).map((f, i) => ({ href: '#', thumb: poster(null, f, { cls: 'fui-poster--sm' }), name: f, sub: `${2008 + i * 2} · ${5 - i} users`, value: `${12 - i * 2}h ${10 + i * 7}m`, note: `${num(31 - i * 5)} plays` }))) }),
      card({ title: 'Who watched', body: rankList(['alice', 'bob', 'carol'].map((p, i) => ({ href: '#', thumb: avatar(null, p, { size: 36 }), name: p, value: `${20 - i * 6}h`, note: `${num(40 - i * 11)} plays` }))) })),
    card({ title: 'Recently added', actions: button({ size: 'sm', variant: 'ghost', href: '#' }, 'Everything in it', icon('chevronRight', 13)),
      body: mediaGrid(films.map((f, i) => mediaCard({ href: '#', poster: poster(null, f, { cls: 'fui-poster--grid' }), name: f, sub: `${2006 + i} · added ${i + 1}d ago` }))) }),
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
}

// FinUI blocks: compositions of FinUI's components, each a card's worth of an app, with invented data only. A block is
// one family (a calendar, a chart, a form, a list, a state, the look, a page) built from parts: switches turn its
// parts on, and the same call that draws it is written out as its code, with only what is on in it. FinUI create draws
// each in several ways to show a preset on. Their layout is blocks.css, tokens only like the rest.

import { h, s, icon } from '../core.js';
import { button } from '../components/button/button.js';
import { card } from '../components/card/card.js';
import { chip, chipToggle, chipChoice, chipSet, removableChip } from '../components/chip/chip.js';
import { badge, status } from '../components/badge/badge.js';
import { statTile } from '../components/stat-tile/stat-tile.js';
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
import { calendar as monthPicker } from '../components/calendar/calendar.js';
import { progressBar, progressRing } from '../components/progress/progress.js';
import { avatarGroup } from '../components/avatar-group/avatar-group.js';
import { tabs } from '../components/tabs/tabs.js';
import { dropdownMenu } from '../components/dropdown-menu/dropdown-menu.js';
import { steps } from '../components/steps/steps.js';
import { otp } from '../components/otp/otp.js';
import { slider } from '../components/slider/slider.js';
import { numberStepper } from '../components/number-stepper/number-stepper.js';
import { choiceGroup } from '../components/choice/choice.js';
import { tagInput } from '../components/tag-input/tag-input.js';
import { fileDrop } from '../components/file-drop/file-drop.js';
import { callout } from '../components/callout/callout.js';
import { toast } from '../components/toast/toast.js';
import { breadcrumb } from '../components/breadcrumb/breadcrumb.js';
import { shelf } from '../components/shelf/shelf.js';
import { mediaCard, mediaGrid } from '../components/media-card/media-card.js';
import { barChart } from '../components/bar-chart/bar-chart.js';
import { lineChart } from '../components/line-chart/line-chart.js';
import { heatmap as heatGrid } from '../components/heatmap/heatmap.js';
import { sparkline } from '../components/sparkline/sparkline.js';
import { barList as barRanks } from '../components/bar-list/bar-list.js';
import { timeline as eventLine } from '../components/timeline/timeline.js';

const SERIES = [['Films', 1], ['Episodes', 2], ['Music', 3], ['Other', 4]];
const noop = () => {};

/** The same numbers every time: a picture to compare presets by must not move between them. */
function* steady(seed) {
  let x = seed;
  for (;;) { x = (x * 16807) % 2147483647; yield x / 2147483647; }
}
const styled = (el, style) => { Object.assign(el.style, style); return el; };
const legend = (items) => h('ul', { class: 'blk-legend' }, items.map(([name, colour]) => h('li', null, styled(h('span', { class: 'blk-key', 'aria-hidden': 'true' }), { background: colour }), name)));

// ---------------------------------------------------------------- chart: a kind, and what goes with it

/** A chart and what is switched on with it. `kind()` draws one and names its colours ({ chart, key }); an extra is
 *  { above, render() }, drawn over the chart or under it. */
function chartOf({ legend: withKey = true } = {}, kind, ...extras) {
  const { chart, key } = kind();
  const at = (above) => extras.filter((x) => !!x.above === above).map((x) => x.render());
  return h('div', { class: 'blk-stack' }, ...at(true), chart, withKey && key.length ? legend(key) : null, ...at(false));
}

/** Fourteen days of watch time, one stacked bar a day, a colour per kind of media. */
function stackedBars() {
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
  return { chart: svg, key: SERIES.map(([name, n]) => [name, `var(--series-${n})`]) };
}

/** Two lines, this month and the one before, day by day. */
function twoLines() {
  const r = steady(19);
  const W = 320, H = 130;
  const make = (base) => Array.from({ length: 15 }, (_, i) => base + Math.sin(i / 2.2) * 12 + r.next().value * 14);
  const now = make(40), before = make(30), top = Math.max(...now, ...before);
  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${((i / 14) * W).toFixed(1)},${(H - (v / top) * (H - 8)).toFixed(1)}`).join(' ');
  const svg = s('svg', { class: 'blk-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Plays a day, this month and the month before' });
  for (const f of [0.25, 0.5, 0.75]) svg.append(styled(s('line', { x1: 0, x2: W, y1: H * f, y2: H * f }), { stroke: 'var(--grid)' }));
  svg.append(styled(s('path', { d: line(before) }), { fill: 'none', stroke: 'var(--series-2)', strokeWidth: '2', strokeDasharray: '4 4' }));
  svg.append(styled(s('path', { d: line(now) }), { fill: 'none', stroke: 'var(--series-1)', strokeWidth: '2.5' }));
  return { chart: svg, key: [['This month', 'var(--series-1)'], ['The month before', 'var(--series-2)']] };
}

/** A year of plays a month: one quantity, so one colour and its peak. */
function areaOfOne() {
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
  return { chart: svg, key: [['Plays', 'var(--single)'], ['The busiest month', 'var(--peak)']] };
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
  return { chart: h('div', { class: 'blk-donut-wrap' }, svg), key: parts.map(([name, pct, n]) => [`${name} · ${pct}%`, `var(--series-${n})`]) };
}

/** Three rings, each how far one thing has come. */
function rings() {
  const parts = [['Finished', 0.72, 1], ['Started', 0.48, 2], ['Requested', 0.3, 3]];
  const svg = s('svg', { class: 'blk-donut', viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Shows finished, started and requested this year' });
  parts.forEach(([, v, n], i) => {
    const R = 50 - i * 14, C = 2 * Math.PI * R;
    svg.append(styled(s('circle', { cx: 60, cy: 60, r: R }), { fill: 'none', stroke: 'var(--track)', strokeWidth: '9' }));
    svg.append(styled(s('circle', { cx: 60, cy: 60, r: R, 'stroke-dasharray': `${v * C} ${C}`, transform: 'rotate(-90 60 60)', 'stroke-linecap': 'round' }), { fill: 'none', stroke: `var(--series-${n})`, strokeWidth: '9' }));
  });
  return { chart: h('div', { class: 'blk-donut-wrap' }, svg), key: parts.map(([name, v, n]) => [`${name} · ${Math.round(v * 100)}%`, `var(--series-${n})`]) };
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
  return { chart: svg, key: [['Watch time this year', 'var(--single)']] };
}

/** When people watch: a week of hours, quiet to busy. */
function heatmap() {
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
  return { chart: grid, key: [['Quiet', 'var(--heat-1)'], ['Busy', 'var(--heat-6)']] };
}

/** Plays by app, as bars to compare, the number beside each. */
function barList() {
  const rows = [['Android TV', 412], ['Web', 298], ['iOS', 171], ['Kodi', 96], ['Roku', 44]];
  const top = rows[0][1];
  return { chart: h('ul', { class: 'blk-bars' }, rows.map(([name, n]) => h('li', { class: 'blk-bars__row' },
    styled(h('span', { class: 'blk-bars__fill', 'aria-hidden': 'true' }), { width: `${(n / top) * 100}%` }), h('span', { class: 'blk-bars__name' }, name), h('span', { class: 'blk-bars__value mono' }, String(n))))),
  key: [['Plays in the last 30 days', 'var(--accent-wash)']] };
}

/** One bar of parts: how much each library takes, and what is free. */
function storageBar() {
  const parts = [['Films', 6.1, 1], ['Shows', 7.8, 2], ['Music', 0.3, 3], ['Free', 5.8, 0]];
  const total = parts.reduce((a, [, v]) => a + v, 0);
  return { chart: h('div', { class: 'blk-stack blk-stack--tight' },
    h('div', { class: 'blk-row blk-row--between' }, h('strong', { class: 'blk-big' }, '14.2 TB'), h('span', { class: 'muted' }, 'of 20 TB')),
    h('div', { class: 'blk-stackbar', role: 'img', 'aria-label': 'Disk use by library' }, parts.map(([, v, n]) => styled(h('span'), { width: `${(v / total) * 100}%`, background: n ? `var(--series-${n})` : 'var(--track)' })))),
  key: parts.map(([name, v, n]) => [`${name} · ${v} TB`, n ? `var(--series-${n})` : 'var(--track)']) };
}

const spark = (seed) => {
  const r = steady(seed), v = Array.from({ length: 12 }, (_, i) => 8 + i * 0.6 + r.next().value * 8), top = Math.max(...v);
  const svg = s('svg', { class: 'blk-spark', viewBox: '0 0 80 24', 'aria-hidden': 'true' });
  svg.append(styled(s('path', { d: v.map((x, i) => `${i ? 'L' : 'M'}${(i / 11) * 80},${24 - (x / top) * 22}`).join(' ') }), { fill: 'none', stroke: 'var(--spark)', strokeWidth: '1.5' }));
  return svg;
};
/** The numbers that matter, each with how it moved and a sparkline, over the chart. */
const numbersAbove = {
  above: true,
  render: () => h('div', { class: 'fui-stat-tile__grid blk-stats' },
    statTile({ label: 'Watch time', value: '42h', current: 42, previous: 36, vsLabel: 'vs last week', spark: spark(2) }),
    statTile({ label: 'Plays', value: '128', current: 128, previous: 140, vsLabel: 'vs last week', spark: spark(5) }),
    statTile({ label: 'Transcodes', value: '9', current: 9, previous: 14, vsLabel: 'vs last week', spark: spark(8) })),
};
/** What the chart says, in a sentence under it. */
const summary = { render: () => h('p', { class: 'muted' }, h('strong', null, '312 hours'), ' this month: 16% more than the month before, most of it on Friday evenings.') };
/** A way to take the numbers away, over the chart. */
const exportButton = {
  above: true,
  render: () => {
    const said_ = h('span', { class: 'muted', 'aria-live': 'polite' });
    return h('div', { class: 'blk-row blk-row--end' }, said_, button({ variant: 'ghost', size: 'sm', onClick: () => { said_.textContent = 'Saved as plays.csv'; } }, icon('download', 14), 'Export'));
  },
};

// ---------------------------------------------------------------- dates: a calendar, and what goes with it

const RELEASES = { '2026-10-02': 'Sintel, season 2, episode 3', '2026-10-09': 'Sintel, season 2, episode 4', '2026-10-14': 'Tears of Steel', '2026-10-22': 'Cosmos Laundromat, episode 1', '2026-10-30': 'Spring' };
const dayName = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const said = (key) => dayName.format(new Date(`${key}T12:00:00Z`));

/** Every day picked, in order: the day, the days, or each day of the range. */
function pickedDays(mode, v) {
  if (mode === 'multiple') return v || [];
  if (mode === 'range') {
    if (!v || !v.from) return [];
    const out = [];
    for (let d = new Date(`${v.from}T12:00:00Z`), end = new Date(`${v.to || v.from}T12:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
    return out;
  }
  return v ? [v] : [];
}

/** A calendar and the extras switched on beside it. An extra is { marks, render({ mode, value, onPick }) }: its marks go on
 *  the calendar's days, and it hears every pick. */
function dateBlock({ mode = 'single', sunday = false } = {}, ...extras) {
  const listeners = [];
  const value = mode === 'single' ? '2026-10-09' : null;
  const picker = monthPicker({ mode, month: '2026-10-01', value, limit: 5, weekStart: sunday ? 0 : 1, locale: 'en-GB', label: 'Calendar',
    marks: Object.assign({}, ...extras.map((x) => x.marks || {})), onChange: (v) => listeners.forEach((f) => f(v)) });
  const parts = extras.map((x) => x.render({ mode, value, onPick: (f) => { listeners.push(f); f(value); } }));
  return h('div', { class: 'blk-stack' }, picker, ...parts);
}

/** What is picked, said back in words. */
const inWords = {
  render({ mode, onPick }) {
    const p = h('p', { class: 'muted', 'aria-live': 'polite' });
    onPick((v) => {
      if (mode === 'range') {
        if (!v || !v.from) { p.textContent = 'Pick where it starts, then where it ends.'; return; }
        if (!v.to) { p.textContent = `From ${said(v.from)}: now pick where it ends.`; return; }
        const n = pickedDays(mode, v).length, [a, b] = [said(v.from), said(v.to)];
        p.textContent = `${a.split(' ')[1] === b.split(' ')[1] ? a.split(' ')[0] : a} – ${b} · ${n} day${n === 1 ? '' : 's'}`;
      } else if (mode === 'multiple') {
        p.textContent = v && v.length ? `${v.length} day${v.length === 1 ? '' : 's'}: ${v.map((d) => said(d).split(' ')[0]).join(', ')} October` : 'Pick up to five days.';
      } else p.textContent = v ? said(v) : 'Pick a day.';
    });
    return p;
  },
};

/** A dot on every day something comes out, and what comes out on the days picked. */
const whatComesOut = {
  marks: RELEASES,
  render({ mode, onPick }) {
    const list = h('ul', { class: 'blk-list', 'aria-live': 'polite' });
    onPick((v) => {
      const out = pickedDays(mode, v).filter((d) => RELEASES[d]);
      list.replaceChildren(...(out.length ? out.map((d) => h('li', { class: 'blk-list__row' }, h('div', { class: 'blk-list__text' }, h('strong', null, RELEASES[d]), h('span', { class: 'muted' }, said(d))), status({ tone: 'info' }, 'Coming up')))
        : [h('li', { class: 'muted' }, 'Nothing comes out then.')]));
    });
    return list;
  },
};

/** A time to start, on the day picked, and the evening said back. */
const times = {
  render({ onPick }) {
    let day = null, at = '20:00';
    const line = h('p', { class: 'muted', 'aria-live': 'polite' });
    const slots = h('div', { class: 'blk-slots', role: 'group', 'aria-label': 'Start at' });
    const say = () => { line.textContent = day ? `Starts at ${at} on ${said(day)}` : `Starts at ${at}: pick a day`; };
    const paint = () => slots.replaceChildren(...['18:00', '19:00', '20:00', '21:00', '22:00'].map((t) => chipToggle({ pressed: t === at, onChange: () => { at = t; paint(); say(); } }, t)));
    onPick((v) => { const d = Array.isArray(v) ? v[v.length - 1] : v && typeof v === 'object' ? v.from : v; day = d || null; say(); });
    paint();
    return h('div', { class: 'blk-stack blk-stack--tight' }, slots, line);
  },
};

const PLANS = { '2026-10-05': [['21:00', 'Sintel', 'S2 · E3']], '2026-10-07': [['20:30', 'Tears of Steel', 'Film'], ['22:45', 'Spring', 'Short']], '2026-10-09': [['21:00', 'Sintel', 'S2 · E4']], '2026-10-14': [['20:00', 'Cosmos Laundromat', 'S1 · E1']] };
/** The week of the day picked, Monday first, and what is planned on each of its days. */
const weekPlans = {
  render({ mode, onPick }) {
    const list = h('ul', { class: 'blk-agenda' });
    const short = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
    onPick((v) => {
      const days = pickedDays(mode, v), last = days[days.length - 1] || '2026-10-09';
      const d = new Date(`${last}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const week = Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setUTCDate(d.getUTCDate() + i); return x.toISOString().slice(0, 10); });
      list.replaceChildren(...week.map((key) => h('li', { class: 'blk-agenda__day' }, h('span', { class: 'blk-agenda__date' }, short.format(new Date(`${key}T12:00:00Z`))),
        h('div', { class: 'blk-agenda__items' }, (PLANS[key] || []).length ? PLANS[key].map(([t, title, sub]) => h('div', { class: 'blk-agenda__item' }, h('span', { class: 'mono muted' }, t), h('strong', null, title), h('span', { class: 'muted' }, sub)))
          : h('span', { class: 'muted' }, 'Nothing planned')))));
    });
    return list;
  },
};

// ---------------------------------------------------------------- form: its parts, and the button they call for

/** A form: the parts switched on, one under the other, and its button. A part is a function that draws itself. */
function formOf({ action = 'Save', note = null } = {}, ...parts) {
  return h('form', { class: 'blk-stack', onSubmit: (e) => e.preventDefault() }, ...parts.map((p) => p()),
    button({ variant: 'primary', block: true, type: 'submit' }, action), note ? h('p', { class: 'muted blk-center' }, note) : null);
}

/** A field whose secret shows and hides. */
function secret(id, label, value, help, kind) {
  const input = h('input', { class: 'fui-field__input mono', id, type: 'password', value, autocomplete: 'off' });
  const eye = button({ variant: 'icon', 'aria-label': `Show the ${kind}` }, icon('unlock', 15));
  eye.addEventListener('click', () => {
    const shown = input.type === 'password';
    input.type = shown ? 'text' : 'password';
    eye.setAttribute('aria-label', `${shown ? 'Hide' : 'Show'} the ${kind}`);
    eye.replaceChildren(icon(shown ? 'lock' : 'unlock', 15));
  });
  return h('div', { class: 'fui-field' }, h('label', { class: 'fui-field__label', htmlFor: id }, label), h('div', { class: 'blk-inline' }, input, eye), help ? h('p', { class: 'fui-field__help' }, help) : null);
}

const serverAddress = () => formField({ id: 'blk-server', label: 'Server address', placeholder: 'http://192.168.1.10:8096', help: 'Where Jellyfin answers on this network.' }).el;
const userName = () => formField({ id: 'blk-user', label: 'User name', autocomplete: 'off', placeholder: 'alice' }).el;
const names = () => h('div', { class: 'blk-two' }, formField({ id: 'blk-first', label: 'First name', placeholder: 'Alice' }).el, formField({ id: 'blk-last', label: 'Last name', placeholder: 'Liddell' }).el);
const email = () => formField({ id: 'blk-mail', label: 'E-mail', type: 'email', placeholder: 'alice@example.org' }).el;
const password = () => secret('blk-pass', 'Password', 'correct horse', 'At least twelve characters.', 'password');
const remember = () => h('label', { class: 'fui-field__check' }, h('input', { type: 'checkbox', checked: true }), 'Keep me signed in on this device');

/** Six boxes for a code: a digit typed moves on, Backspace moves back, a pasted code fills them all. */
function twoStepCode() {
  const boxes = Array.from({ length: 6 }, (_, i) => h('input', { class: 'fui-field__input blk-otp__box mono', type: 'text', inputMode: 'numeric', autocomplete: i ? 'off' : 'one-time-code', maxLength: 6, 'aria-label': `Digit ${i + 1}` }));
  const fill = (from, digits) => { digits.split('').slice(0, 6 - from).forEach((d, k) => { boxes[from + k].value = d; }); boxes[Math.min(5, from + digits.length)].focus(); };
  boxes.forEach((b, i) => {
    b.addEventListener('focus', () => b.select());
    b.addEventListener('input', () => { const digits = b.value.replace(/\D/g, ''); b.value = digits.slice(0, 1); if (digits.length > 1) fill(i, digits); else if (digits && i < 5) boxes[i + 1].focus(); });
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !b.value && i) { e.preventDefault(); boxes[i - 1].value = ''; boxes[i - 1].focus(); }
      else if (e.key === 'ArrowLeft' && i) { e.preventDefault(); boxes[i - 1].focus(); }
      else if (e.key === 'ArrowRight' && i < 5) { e.preventDefault(); boxes[i + 1].focus(); }
    });
    b.addEventListener('paste', (e) => { e.preventDefault(); fill(i, (e.clipboardData.getData('text') || '').replace(/\D/g, '')); });
  });
  return h('div', { class: 'blk-stack blk-stack--tight blk-center' }, h('p', null, 'The six digits your authenticator app shows for FinStats.'),
    h('div', { class: 'blk-otp' }, boxes.slice(0, 3), h('span', { class: 'blk-otp__dash', 'aria-hidden': 'true' }, '–'), boxes.slice(3)));
}

/** A service: which one, its address, its key to show or hide, a test that answers. */
function service() {
  const url = formField({ id: 'blk-svc-url', label: 'Address', placeholder: 'http://192.168.1.10:8989' });
  const answer = h('div', { 'aria-live': 'polite' });
  const test = button({ type: 'button' }, icon('refresh', 14), 'Test');
  test.addEventListener('click', () => {
    answer.replaceChildren(h('span', { class: 'blk-row' }, spinner(14), h('span', { class: 'muted' }, 'Asking…')));
    setTimeout(() => answer.replaceChildren(url.input.value.startsWith('http') ? status({ tone: 'good' }, 'Answered in 42 ms · version 4.0') : status({ tone: 'critical' }, 'That is not an address: it needs http:// or https://')), 500);
  });
  return h('div', { class: 'blk-stack' }, segmented({ label: 'Service', size: 'sm', value: 'sonarr', options: [{ value: 'sonarr', label: 'Sonarr' }, { value: 'radarr', label: 'Radarr' }, { value: 'seerr', label: 'Seerr' }], onChange: noop }),
    url.el, secret('blk-svc-key', 'API key', 'invented-key-123', 'Settings → General in Sonarr.', 'key'), h('div', { class: 'blk-row blk-row--between' }, answer, test));
}

/** Addresses with a role each, another row when asked, and how many there are. */
function people() {
  const rows = h('div', { class: 'blk-stack blk-stack--tight' });
  const count = h('p', { class: 'muted', 'aria-live': 'polite' });
  const counted = () => { const n = rows.children.length; count.textContent = `${n} ${n === 1 ? 'person' : 'people'} invited`; };
  const row = (who = '', role = 'Viewer') => {
    const r = h('div', { class: 'blk-invite' }, h('input', { class: 'fui-field__input', type: 'email', value: who, placeholder: 'name@example.org', 'aria-label': 'E-mail' }),
      h('select', { class: 'fui-field__input', 'aria-label': 'Role' }, ['Viewer', 'Manager'].map((x) => h('option', { selected: x === role }, x))),
      button({ variant: 'icon', type: 'button', 'aria-label': 'Remove this row', onClick: () => { if (rows.children.length > 1) { r.remove(); counted(); } } }, icon('x', 14)));
    return r;
  };
  rows.append(row('carol@example.org'), row('dave@example.org', 'Manager'));
  counted();
  return h('div', { class: 'blk-stack' }, rows, h('div', { class: 'blk-row blk-row--between' }, count,
    button({ variant: 'ghost', size: 'sm', type: 'button', onClick: () => { const r = row(); rows.append(r); counted(); r.querySelector('input').focus(); } }, icon('plus', 14), 'Another')));
}

/** A place to drop a file or choose one: what was chosen is named, with its size. */
function file() {
  const input = h('input', { type: 'file', class: 'sr-only', id: 'blk-upload', accept: '.json,.jsonl,.db,.zip' });
  const chosen = h('div', { 'aria-live': 'polite' });
  const size = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
  const take = (f) => {
    if (!f) return;
    chosen.replaceChildren(h('div', { class: 'blk-dl' }, h('div', { class: 'blk-dl__top' }, h('span', { class: 'trunc mono' }, f.name), h('span', { class: 'muted nowrap' }, size(f.size))),
      meter({ value: 1, block: true, label: `${f.name}, read` }), status({ tone: 'good' }, 'Ready to import')));
  };
  input.addEventListener('change', () => take(input.files[0]));
  const drop = h('div', { class: 'blk-drop' }, icon('upload', 22), h('strong', null, 'Drop a backup here'), h('span', { class: 'muted' }, 'Jellystat, Streamystats or Tautulli · up to 2 GB'),
    h('label', { class: 'fui-button fui-button--sm', htmlFor: 'blk-upload' }, 'Choose a file'), input);
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); take(e.dataTransfer.files[0]); });
  return h('div', { class: 'blk-stack' }, drop, chosen);
}

/** Settings that switch on and off, each with a line of help. */
function notifySwitches() {
  const row = (id, label, help, on) => settingRow({ id, label, help, control: toggle({ checked: on, onChange: noop, labelledby: `${id}-label`, describedby: `${id}-help` }) });
  return h('div', { class: 'fui-setting-row__rows' },
    row('blk-n-start', 'A play starts', 'Who, what and on which device.', true),
    row('blk-n-avail', 'A request can be watched', 'Once it is in the library.', true),
    row('blk-n-fail', 'Failed sign-ins', 'Three in a row from one address.', false));
}

/** A key, shown once, to copy. */
function newKey() {
  const key = 'fs_3f9a1c07d24e8b6a';
  return h('div', { class: 'blk-stack blk-stack--tight' },
    h('div', { class: 'blk-key-row blk-key-row--boxed' }, h('code', { class: 'mono trunc' }, `${key}…`), copyButton(key, 'Copy the key')),
    h('p', { class: 'muted' }, 'Shown once. Anything that holds it reads FinStats as you.'));
}

// ---------------------------------------------------------------- list: one set of rows, a feature of each switched on

const ROWS = [
  { title: 'Big Buck Bunny', sub: '2008 · alice, on the living room TV', value: '12h 4m', note: '31 plays', progress: 0.64, state: ['good', 'On the server'], unread: true, who: 'alice', role: 'Administrator', did: 'started', when: '2 min ago', mark: 'play' },
  { title: 'Sintel', sub: '2010 · bob, on a phone', value: '6h 50m', note: '18 plays', progress: 0.21, state: ['warning', 'Downloading'], unread: true, who: 'bob', role: 'Manager', did: 'finished', when: '18 min ago', mark: 'check' },
  { title: 'Tears of Steel', sub: '2012 · carol, in a browser', value: '3h 2m', note: '9 plays', progress: 0.87, state: ['info', 'Requested'], unread: false, who: 'carol', role: 'Viewer', did: 'requested', when: '1 h ago', mark: 'plus' },
  { title: 'Cosmos Laundromat', sub: '2015 · dave, on a tablet', value: '1h 1m', note: '2 plays', progress: 0.15, state: ['critical', 'Failed'], unread: false, who: 'dave', role: 'Viewer', did: 'rated', when: '3 h ago', mark: 'heart' },
];

/** A list of ROWS: every row the same, with what each feature switched on adds to it. A feature may draw something at
 *  the start of a row (`lead`), under its title (`text`), at its end (`end`), over the list (`head(list)`), and give the
 *  list a class. */
function listOf({ ranked = false } = {}, ...features) {
  const list = h('ul', { class: ['blk-list', ...features.map((f) => f.cls)] }, ROWS.map((r, i) => h('li', { class: ['blk-list__row', features.some((f) => f.unread) && r.unread && 'is-unread'], dataset: { title: r.title } },
    ranked ? h('span', { class: 'blk-rank mono' }, String(i + 1)) : null,
    ...features.map((f) => f.lead && f.lead(r)),
    h('div', { class: 'blk-list__text' }, h('strong', null, r.title), ...features.map((f) => f.text && f.text(r))),
    ...features.map((f) => f.end && f.end(r)))));
  return h('div', { class: 'blk-stack' }, ...features.map((f) => f.head && f.head(list)), list);
}

const pictures = { lead: (r) => poster(null, r.title, { cls: 'fui-poster--sm' }) };
const lineUnder = { text: (r) => h('span', { class: 'muted' }, r.sub) };
const values = { end: (r) => h('div', { class: 'blk-value' }, h('strong', { class: 'mono' }, r.value), h('span', { class: 'muted' }, r.note)) };
const progress = { text: (r) => meter({ value: r.progress, block: true, label: `${r.title}, how far along` }) };
const states = { end: (r) => status({ tone: r.state[0] }, r.state[1]) };
const roles = { end: (r) => (r.role === 'Administrator' ? badge({}, 'Jellyfin admin') : h('select', { class: 'fui-field__input blk-select-sm', 'aria-label': `${r.who}'s role` }, ['Viewer', 'Manager'].map((x) => h('option', { selected: x === r.role }, x)))) };
const timeline = { cls: 'blk-feed', lead: (r) => h('span', { class: 'blk-feed__mark', 'aria-hidden': 'true' }, icon(r.mark, 13)), text: (r) => h('span', { class: 'muted' }, `${r.who} ${r.did} it · ${r.when}`) };
/** Unread rows marked, and a way to read them all. */
const unread = {
  unread: true,
  lead: (r) => h('span', { class: 'blk-inbox__dot', 'aria-label': r.unread ? 'Unread' : null }),
  head: (list) => {
    const all = button({ variant: 'ghost', size: 'sm' }, icon('check', 14), 'Mark all as read');
    all.addEventListener('click', () => {
      list.querySelectorAll('.is-unread').forEach((row) => { row.classList.remove('is-unread'); row.querySelector('.blk-inbox__dot')?.removeAttribute('aria-label'); });
      all.disabled = true; all.replaceChildren(icon('check', 14), 'All read');
    });
    return h('div', { class: 'blk-row blk-row--end' }, all);
  },
};
/** A search that narrows the rows as it is typed, and filters that come off when told to. */
const filters = {
  head: (list) => {
    const input = h('input', { class: 'fui-field__input fui-field__input--search', type: 'search', placeholder: 'Find a title…', 'aria-label': 'Find a title' });
    input.addEventListener('input', () => { const q = input.value.trim().toLowerCase(); for (const row of list.children) row.hidden = !!q && !row.dataset.title.toLowerCase().includes(q); });
    const chips = chipSet();
    for (const label of ['Drama', 'After 2010']) { const c = removableChip({ label, onRemove: () => c.remove(), removeLabel: `Remove the filter ${label}` }); chips.append(c); }
    chips.append(chipToggle({ pressed: true }, 'Unwatched'));
    return h('div', { class: 'blk-stack blk-stack--tight' }, h('label', { class: 'fui-field__search' }, icon('search', 14), input), chips);
  },
};

// ---------------------------------------------------------------- state: what a view says, and where it says it

/** A state, said where it is wanted: as it is (`frame` 'plain'), as a banner, or in a dialog; with a way on, and a way
 *  to dismiss it. A state is { tone, icon, title, text, body(), act, ask }: `ask` is a question's two answers. */
function stateOf({ frame = 'plain', action = true, dismiss = false } = {}, state) {
  const holder = h('div', { 'aria-live': 'polite' });
  const gone = () => holder.replaceChildren(h('p', { class: 'muted' }, 'Dismissed.'));
  const close = dismiss ? button({ variant: 'icon', 'aria-label': `Dismiss: ${state.title}`, onClick: gone }, icon('x', 14)) : null;
  const answers = () => {
    if (state.ask) {
      const answer = (words) => { said_.replaceChildren(status({ tone: 'good', line: true }, words), h('div', { class: 'blk-row blk-row--end' }, button({ variant: 'ghost', onClick: ask }, 'Undo'))); };
      const said_ = h('div', { class: 'blk-stack blk-stack--tight' });
      const ask = () => said_.replaceChildren(h('div', { class: 'blk-row blk-row--end' }, button({ variant: 'ghost', onClick: () => answer(state.ask[0][1]) }, state.ask[0][0]), button({ variant: 'danger', onClick: () => answer(state.ask[1][1]) }, state.ask[1][0])));
      ask();
      return said_;
    }
    return action && state.act ? h('div', { class: 'blk-row blk-row--end' }, button({ size: 'sm' }, state.act)) : null;
  };
  if (frame === 'banner') {
    holder.append(h('div', { class: ['blk-callout', `blk-callout--${state.tone}`], role: state.tone === 'critical' ? 'alert' : 'status' },
      icon(state.icon, 16), h('div', { class: 'blk-list__text' }, h('strong', null, state.title), h('span', null, state.text), answers()), close));
  } else if (frame === 'dialog') {
    holder.append(h('div', { class: 'fui-modal blk-modal', role: 'group', 'aria-label': state.title },
      h('div', { class: 'fui-modal__head' }, h('h3', { class: 'fui-modal__title' }, state.title), close),
      h('div', { class: 'fui-modal__body blk-stack' }, h('p', null, state.text), answers())));
  } else {
    holder.append(h('div', { class: 'blk-stack' }, close ? h('div', { class: 'blk-row blk-row--end' }, close) : null, state.body(), answers()));
  }
  return holder;
}

const loading = { tone: 'info', icon: 'refresh', title: 'Reading the library', text: 'A big library takes a minute.', act: 'Cancel',
  body: () => h('div', { class: 'blk-stack' }, sk.rows(3), h('div', { class: 'blk-row' }, spinner(16), h('span', { class: 'muted' }, 'Reading the library…'))) };
const empty = { tone: 'info', icon: 'inbox', title: 'No plays in this range', text: 'Plays show up here a minute after they start.', act: 'Show all time',
  body: () => emptyState('No plays in this range', 'Plays show up here a minute after they start.') };
const failed = { tone: 'critical', icon: 'alert', title: 'Couldn’t load this', text: 'Jellyfin did not answer within 10 seconds.', act: 'Try again',
  body: () => errorState(new Error('Jellyfin did not answer within 10 seconds.')) };
const done = { tone: 'good', icon: 'check', title: 'Import finished', text: '3,162 plays from Jellystat, none of them twice.', act: 'See them',
  body: () => h('div', { class: 'blk-stack blk-center' }, h('span', { class: 'blk-done', 'aria-hidden': 'true' }, icon('check', 26)), h('strong', { class: 'blk-big' }, 'Import finished'),
    h('p', { class: 'muted' }, '3,162 plays from Jellystat, none of them twice.'), facts([['Plays', '3,162'], ['People', '6'], ['Took', '14 s']])) };
const question = { tone: 'warning', icon: 'trash', title: 'Remove this destination?', text: 'Notifications stop going to ntfy.example. What was sent stays sent.',
  ask: [['Keep it', 'Kept: notifications go on as before.'], ['Remove', 'Removed: nothing more goes to ntfy.example.']],
  body: () => h('p', null, 'Notifications stop going to ntfy.example. What was sent stays sent.') };

// ---------------------------------------------------------------- the look: its parts, one under the other

/** The look of a preset, part by part. */
function lookOf(...parts) {
  return h('div', { class: 'blk-stack blk-look' }, ...parts.map((p) => p()));
}

/** The colours of the look, each with its token's name. */
function colours() {
  const sw = (t) => h('div', { class: 'blk-swatch' }, styled(h('span', { class: 'blk-swatch__chip' }), { background: `var(${t})` }), h('span', { class: 'blk-swatch__name mono' }, t.slice(2)));
  return h('div', { class: 'blk-swatches' }, ['--bg', '--bg-2', '--text', '--text-muted', '--accent', '--accent-wash', '--border', '--good', '--warning', '--critical',
    '--series-1', '--series-2', '--series-3', '--series-4', '--single', '--peak'].map(sw));
}
/** A heading over body text, with numbers in mono and faint words. */
function typeSample() {
  return h('div', { class: 'blk-stack blk-stack--tight' },
    h('h3', { class: 'blk-specimen__title' }, 'Every film has a second life in somebody’s evening.'),
    h('p', null, 'Body text sits in the font a preset chose, headings in theirs. Numbers and codes, such as ', h('span', { class: 'mono' }, '1h 42m'), ' and ', h('span', { class: 'mono' }, 'S02E04'), ', take the mono face.'),
    h('p', { class: 'muted' }, 'Faint words like these are what the contrast choice lifts.'));
}
/** Every button, and pages that turn. */
function buttonsRow() {
  const pages = h('div');
  let page = 2;
  const turn = () => pages.replaceChildren(pagination({ page, perPage: 50, total: 640, onPage: (n) => { page = n; turn(); } }));
  turn();
  return h('div', { class: 'blk-stack blk-stack--tight' },
    h('div', { class: 'blk-row' }, button({ variant: 'primary' }, icon('play', 14), 'Primary'), button({}, 'Default'), button({ variant: 'ghost' }, 'Ghost'), button({ variant: 'danger' }, 'Delete')), pages);
}
/** Chips that toggle, values, badges and a spinner. */
function badgesRow() {
  return h('div', { class: 'blk-stack blk-stack--tight' },
    h('div', { class: 'blk-row' }, chipToggle({ pressed: true }, 'Films'), chipToggle({ pressed: false }, 'Shows'), chip('Drama'), chip('Science Fiction')),
    h('div', { class: 'blk-row' }, badge({ live: true }, 'Live'), badge({ count: true }, '12'), badge({ dot: true }, 'Direct play'), spinner(16)));
}
/** A focus ring held still, and a row of icons. */
function focusRow() {
  return h('div', { class: 'blk-stack blk-stack--tight' },
    h('div', { class: 'blk-row' }, button({ class: 'blk-focused' }, 'Focused'), button({ variant: 'primary' }, 'Not focused')),
    h('div', { class: 'blk-row blk-icons' }, ['play', 'settings', 'calendar', 'shield', 'download', 'trophy', 'heart', 'compass'].map((n) => icon(n, 18))));
}
/** Keyboard keys, each beside what it does. */
function keysRow() {
  const keys = (...k) => h('span', { class: 'blk-keys' }, k.map((x) => h('kbd', { class: 'blk-kbd mono' }, x)));
  return h('ul', { class: 'blk-shortcuts' }, [['Search', keys('/')], ['Go to the dashboard', keys('g', 'd')], ['Go back', keys('Esc')]].map(([what, k]) => h('li', null, h('span', null, what), k)));
}
/** Facts in a grid, and a meter under them. */
function factsRow() {
  return h('div', { class: 'blk-stack blk-stack--tight' }, facts([['Films', '418'], ['Episodes', '6,032'], ['Size', '14.2 TB', { mono: true }], ['Last read', '4 min ago']]), meter({ value: 0.81, block: true, label: 'Disk used' }));
}

// ---------------------------------------------------------------- page: what it holds, and what is around it

/** A page: an app's menu beside it when asked, a header, what is switched on over its content, and the content. */
function pageOf({ sidebar = false, header = true } = {}, content, ...extras) {
  const main = h('div', { class: 'blk-page__main' }, header ? pageHeader('Overview', 'The last 30 days on this server') : null, ...extras.map((x) => x.render()), content());
  return h('div', { class: ['blk-page', sidebar && 'blk-page--side'] }, sidebar ? card({ body: appSidebar() }) : null, main);
}

const table = (head, rows, { right = [] } = {}) => dataTable(h('table', { class: 'fui-data-table' },
  h('thead', null, h('tr', null, head.map((t, i) => h('th', { class: right.includes(i) ? 'r' : null }, t)))),
  h('tbody', null, rows.map((r) => h('tr', null, r.map((c, i) => h('td', { class: right.includes(i) ? 'r nowrap' : null }, c)))))), { filter: false });
/** Recent plays, in a table that sorts. */
function playsTable() {
  return card({ title: 'Recent plays', cls: 'fui-card--flush', body: table(['Who', 'Title', 'How', 'Watched'], [
    ['alice', 'Big Buck Bunny', 'Direct play', 1], ['bob', 'Sintel', 'Transcode', 0.42], ['carol', 'Tears of Steel', 'Direct play', 0.87],
    ['dave', 'Cosmos Laundromat', 'Direct stream', 0.15], ['erin', 'Elephants Dream', 'Direct play', 0.64]].map(([who, title, how, ok]) => [
    h('span', { class: 'blk-who' }, avatar(null, who, { size: 24 }), who), title, badge({ dot: how === 'Direct play' }, how),
    h('span', { class: 'blk-watched' }, meter({ value: ok }), `${Math.round(ok * 100)}%`)]), { right: [3] }) });
}
/** Settings as FinStats lays them out: the list to move between, the open one marked, and its rows. */
function settingsPage() {
  const visible = [{ key: 'account', label: 'Account', icon: 'user', group: 'You' }, { key: 'appearance', label: 'Appearance', icon: 'sliders', group: 'You' },
    { key: 'notifications', label: 'Notifications', icon: 'inbox', group: 'You' }, { key: 'collection', label: 'Collection', icon: 'database', group: 'Server' },
    { key: 'security', label: 'Security', icon: 'shield', group: 'Server' }, { key: 'tasks', label: 'Tasks', icon: 'clock', group: 'Server' }];
  const sw = (id, label, help, on) => settingRow({ id, label, help, control: toggle({ checked: on, onChange: noop, labelledby: `${id}-label`, describedby: `${id}-help` }) });
  const pages = {
    appearance: () => [sw('blk-groups', 'Watched together', 'Plays of one title by two people within a minute count as one evening.', true),
      settingRow({ id: 'blk-min', label: 'Shortest play counted', help: 'Shorter plays are left out of every statistic.', labelFor: 'blk-min-in',
        control: h('input', { class: 'fui-field__input fui-field__input--num', id: 'blk-min-in', type: 'number', value: 120 }) }),
      settingRow({ id: 'blk-name', label: 'Server name', labelFor: 'blk-name-in', control: h('input', { class: 'fui-field__input', id: 'blk-name-in', type: 'text', value: 'Living room', autocomplete: 'off' }) })],
    notifications: () => [sw('blk-n1', 'A play starts', 'Who, what and on which device.', true), sw('blk-n2', 'Failed sign-ins', 'Three in a row from one address.', false)],
  };
  const holder = h('div');
  const open = (key) => {
    const rows = (pages[key] || (() => [h('p', { class: 'muted' }, `${visible.find((v) => v.key === key).label}: nothing to set in this example.`)]))();
    const nav = sectionNav('#', visible, key, 'Settings');
    nav.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); open(a.getAttribute('href').split('/').pop()); holder.querySelector('.fui-sections__link.is-active')?.focus(); });
    holder.replaceChildren(sectionLayout(nav, h('div', { class: 'blk-stack' }, h('div', { class: 'fui-setting-row__rows' }, rows),
      h('div', { class: 'blk-row blk-row--end' }, button({ variant: 'ghost' }, 'Cancel'), button({ variant: 'primary' }, 'Save')))));
  };
  open('appearance');
  return card({ title: 'Settings', sub: 'One section at a time, the open one marked', body: holder });
}
/** A page that is not there, said plainly, with two ways on. */
function notFound() {
  return card({ body: h('div', { class: 'blk-stack blk-center' }, h('span', { class: 'blk-404 mono' }, '404'), h('strong', { class: 'blk-big' }, 'Nothing lives here'),
    h('p', { class: 'muted' }, 'The address may be old, or the title was removed from the library.'),
    h('label', { class: 'fui-field__search' }, icon('search', 14), h('input', { class: 'fui-field__input fui-field__input--search', type: 'search', placeholder: 'Search instead…', 'aria-label': 'Search' })),
    button({ variant: 'primary' }, icon('home', 14), 'Back to the dashboard')) });
}
/** An app's menu: its name, groups of pages, the open one marked, and who is signed in. */
function appSidebar() {
  const nav = h('nav', { class: 'blk-side', 'aria-label': 'An app’s menu' });
  const item = (ic, label, active) => h('a', { href: '#', class: ['blk-side__item', active && 'is-active'], 'aria-current': active ? 'page' : null }, icon(ic, 15), h('span', null, label));
  nav.append(h('div', { class: 'blk-side__brand' }, h('span', { class: 'blk-side__logo', 'aria-hidden': 'true' }, 'f'), h('strong', null, 'finstats'), h('span', { class: 'muted' }, 'Living room')),
    h('p', { class: 'blk-side__group' }, 'Watch'), item('home', 'Dashboard', true), item('activity', 'Activity'), item('library', 'Libraries'), item('together', 'Together'),
    h('p', { class: 'blk-side__group' }, 'Server'), item('server', 'Server'), item('shield', 'Security'), item('settings', 'Settings'),
    h('div', { class: 'blk-side__user' }, avatar(null, 'alice', { size: 28 }), h('div', { class: 'blk-list__text' }, h('strong', null, 'alice'), h('span', { class: 'muted' }, 'Administrator'))));
  // The page that is open moves to the one chosen.
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('.blk-side__item');
    if (!a) return;
    e.preventDefault();
    nav.querySelectorAll('.blk-side__item').forEach((x) => { x.classList.toggle('is-active', x === a); if (x === a) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
  });
  return nav;
}

// ---------------------------------------------------------------- the blocks: switches made into calls

/** Every part a switch can put in, by the name the code calls it. */
// ---------------------------------------------------------------- watching: what is on now, a title, what comes next

const STREAMS = [
  { title: 'Sintel', who: ['alice'], device: 'Living room TV', how: ['good', 'Direct play'], at: 0.62, left: '5 min left' },
  { title: 'Low Orbit · S2E5', who: ['bob', 'carol'], device: 'Phone', how: ['warning', 'Transcode'], at: 0.18, left: '38 min left' },
  { title: 'Tears of Steel', who: ['dave'], device: 'Laptop', how: ['good', 'Direct stream'], at: 0.91, left: '1 min left' },
];
/** What is playing now: each stream's title, who is watching it and where, how it plays, and how far along it is. */
function nowPlaying() {
  return h('ul', { class: 'blk-list' }, STREAMS.map((st) => h('li', { class: 'blk-list__row' }, poster(null, st.title, { cls: 'fui-poster--sm' }),
    h('div', { class: 'blk-list__text' }, h('strong', null, st.title), h('span', { class: 'muted' }, `${st.device} · ${st.left}`), meter({ value: st.at, block: true, label: `${st.title}, how far along` })),
    h('div', { class: 'blk-value' }, avatarGroup({ people: st.who.map((name) => ({ name })), max: 3, size: 24 }), status({ tone: st.how[0] }, st.how[1])))));
}
/** A title's own page, at its top: its poster, what it is, what can be done with it, and its parts under tabs. */
function titlePage() {
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'blk-title' }, poster(null, 'Low Orbit', { cls: 'fui-poster--grid' }),
      h('div', { class: 'blk-stack blk-stack--tight' },
        breadcrumb({ items: [{ label: 'Shows', href: '#' }, { label: 'Low Orbit' }] }),
        h('strong', { class: 'blk-title__name' }, 'Low Orbit'), h('span', { class: 'muted' }, '2021 · 2 seasons · Drama, Science fiction'),
        h('div', { class: 'blk-row' }, button({ variant: 'primary', size: 'sm' }, icon('play', 13), 'Open in Jellyfin'), button({ size: 'sm' }, icon('bookmark', 13), 'Watchlist'),
          dropdownMenu({ label: 'More', icon: 'menu', iconOnly: true, items: [{ label: 'Copy link', icon: 'link' }, { label: 'Mark as watched', icon: 'check' }] })))),
    tabs({ label: 'Low Orbit', tabs: [
      { key: 'about', label: 'Overview', panel: () => facts([['Seen by', '4 people'], ['Plays', '31'], ['Files', '1080p HEVC'], ['Added', '3 weeks ago']]) },
      { key: 'plays', label: 'Plays', count: 31, panel: () => h('p', { class: 'muted' }, '31 plays by 4 people, the last on Friday.') },
    ] }));
}
const EPISODES = [['Lift-off', 1], ['Burn', 1], ['Drift', 1], ['The Far Side', 0.4], ['Re-entry', 0]];
/** A show's seasons under tabs, each episode with what is seen of it. */
function seasonEpisodes() {
  const season = () => h('ol', { class: 'blk-episodes' }, EPISODES.map(([name, seen], i) => h('li', { class: ['blk-episodes__row', seen === 1 && 'is-seen'] },
    h('span', { class: 'blk-rank mono' }, `E${i + 1}`),
    h('div', { class: 'blk-list__text' }, h('strong', null, name), seen > 0 && seen < 1 ? meter({ value: seen, block: true, label: `${name}, how far along` }) : h('span', { class: 'muted' }, seen ? 'Seen' : `${42 + i} min`)),
    seen === 1 ? icon('check', 15) : null)));
  return tabs({ label: 'Seasons', value: 's2', tabs: [{ key: 's1', label: 'Season 1', count: 5, panel: season }, { key: 's2', label: 'Season 2', count: 5, panel: season }] });
}
/** The next episode, starting by itself unless cancelled, the ring closing as it waits. */
function upNext() {
  return h('div', { class: 'blk-upnext' }, progressRing({ label: 'Starts in 6 seconds', value: 0.4, size: 44 }),
    h('div', { class: 'blk-list__text' }, h('span', { class: 'muted' }, 'Up next, in 6 seconds'), h('strong', null, 'Low Orbit · S2E6 · Re-entry')),
    button({ size: 'sm' }, 'Cancel'));
}
/** What is being watched: the parts switched on, one under another. */
function watchingOf(...parts) {
  return h('div', { class: 'blk-stack blk-stack--loose' }, parts.map((part) => part()));
}

// ---------------------------------------------------------------- dashboard: the numbers, the charts, what happened

/** The numbers over a dashboard, each with how it moved and its last weeks as a sparkline. */
function numbersRow() {
  const r = steady(31);
  const weeks = (base) => Array.from({ length: 12 }, (_, i) => Math.round(base + i * 2 + r.next().value * 8));
  return h('div', { class: 'fui-stat-tile__grid' },
    statTile({ label: 'Watch time', value: '42h', current: 42, previous: 36, vsLabel: 'vs last week', spark: sparkline({ values: weeks(20), label: 'Watch time each week, rising' }) }),
    statTile({ label: 'Plays', value: '128', current: 128, previous: 140, vsLabel: 'vs last week', spark: sparkline({ values: weeks(30).reverse(), label: 'Plays each week, falling' }) }),
    statTile({ label: 'People', value: '5', current: 5, previous: 5, vsLabel: 'vs last week' }));
}
/** A week of watch time, a column a day, stacked by kind. */
function weekChart() {
  const r = steady(43);
  const day = (n) => Array.from({ length: 7 }, () => Math.round(r.next().value * n * 10) / 10);
  return barChart({ title: 'Watch time', sub: 'Each day this week', categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], format: (v) => `${v}h`,
    series: [{ name: 'Films', values: day(4) }, { name: 'Episodes', values: day(5) }, { name: 'Music', values: day(1.5) }] });
}
/** A year of plays, month by month. */
function yearChart() {
  const r = steady(57);
  return lineChart({ title: 'Plays', sub: 'Each month of the last year', labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    series: [{ name: 'Plays', values: Array.from({ length: 12 }, (_, i) => Math.round(80 + i * 6 + r.next().value * 40)) }] });
}
/** The most watched titles, longest first. */
function topTitles() {
  return h('div', { class: 'blk-stack blk-stack--tight' }, h('strong', null, 'Most watched'),
    barRanks({ format: (v) => `${v} plays`, max: 5, items: [['Big Buck Bunny', 31], ['Sintel', 26], ['Low Orbit', 22], ['Tears of Steel', 21], ['Cosmos Laundromat', 16], ['Spring', 9]].map(([name, value]) => ({ name, value, href: '#' })) }));
}
/** When people watch: the hours of each weekday, quiet to busy. */
function whenWatched() {
  const r = steady(71);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  return heatGrid({ title: 'When people watch', sub: 'Plays by hour and weekday', rows: days, cols: hours,
    values: days.map((_, d) => hours.map((__, hh) => Math.round((hh >= 19 && hh <= 23 ? 6 : hh >= 12 ? 2 : 0) * r.next().value + (d >= 5 && hh >= 14 ? 2 : 0)))) });
}
const AT = (d, hh, mm) => new Date(2026, 9, d, hh, mm).getTime();
/** What happened lately, newest first, by day. */
function activityFeed() {
  return eventLine({ events: [
    { at: AT(5, 21, 4), title: 'alice started Sintel', detail: 'Living room TV · Direct play', icon: 'play' },
    { at: AT(5, 20, 31), title: 'Low Orbit S2E5 arrived', detail: '1080p HEVC · 1.2 GB', icon: 'download', tone: 'good' },
    { at: AT(4, 23, 12), title: 'Sonarr stopped answering', detail: 'Coming up shows what it knew at 22:58', icon: 'alert', tone: 'warning' },
    { at: AT(4, 19, 2), title: 'bob finished Big Buck Bunny', detail: 'Phone · Transcode', icon: 'check' },
  ] });
}
/** What is downloading: each with how far along and the time left, and what needs a look. */
function downloadsQueue() {
  return h('div', { class: 'blk-stack' },
    callout({ tone: 'warning', title: 'One download is stalled', body: 'Spring has not moved for 20 minutes.', action: button({ size: 'sm' }, 'Look at it') }),
    progressBar({ label: 'Low Orbit · S2E6', value: 0.64, elapsed: 300, detail: '780 MB of 1.2 GB' }),
    progressBar({ label: 'Cosmos Laundromat', value: 0.21, elapsed: 420, detail: '0.9 GB of 4.1 GB' }),
    progressBar({ label: 'Spring', value: null, detail: 'Waiting for peers', tone: 'critical' }));
}
/** A dashboard of the parts switched on. */
function dashboardOf(...parts) {
  return h('div', { class: 'blk-dash' }, parts.map((part) => h('div', { class: 'blk-dash__part' }, part())));
}

// ---------------------------------------------------------------- account: setting up, settings, being told, a person

/** The second step of setting up: where it is in the wizard, the question it asks, and the way on. */
function setupWizard() {
  return h('div', { class: 'blk-stack' },
    steps({ steps: [{ label: 'Jellyfin' }, { label: 'Sign in' }, { label: 'History' }, { label: 'Done' }], current: 1, done: [0], onGo: noop }),
    formField({ id: 'blk-setup-user', label: 'A Jellyfin administrator', placeholder: 'alice', help: 'Only to create the key FinStats reads with.' }).el,
    h('div', { class: 'blk-row blk-row--end' }, button({ variant: 'ghost' }, 'Back'), button({ variant: 'primary' }, 'Next')));
}
/** Settings in tabs: a slider, a number and a switch on one, a choice of several on the other. */
function settingsPanel() {
  return tabs({ label: 'Settings', tabs: [
    { key: 'collect', label: 'Collection', panel: () => h('div', { class: 'fui-setting-row__rows' },
      settingRow({ id: 'blk-min', label: 'Shortest play counted', help: 'Shorter plays are left out of totals.', control: h('div', { class: 'blk-slider' }, slider({ label: 'Shortest play counted', min: 0, max: 30, value: 2, hideLabel: true, format: (v) => (v ? `${v} min` : 'Every play') })) })[0],
      settingRow({ id: 'blk-keep', label: 'Backups kept', control: numberStepper({ label: 'Backups kept', value: 5, min: 1, max: 30, unit: 'copies' }) })[0],
      settingRow({ id: 'blk-home', label: 'Plays from home count as local', control: toggle({ checked: true, labelledby: 'blk-home-label' }) })[0]) },
    { key: 'kinds', label: 'What counts', panel: () => choiceGroup({ label: 'Count these', kind: 'checkbox', value: ['films', 'shows'],
      options: [{ value: 'films', label: 'Films' }, { value: 'shows', label: 'Shows' }, { value: 'music', label: 'Music', help: 'Tracks shorter than a minute are never counted.' }] }) },
  ] });
}
const NOTES = [['download', 'Low Orbit S2E5 is on the server', '2 min ago', true], ['users', 'bob and carol watched together', '1 h ago', true], ['check', 'The backup is written', 'Yesterday', false]];
/** What FinStats told you: what needs a look first, then the rest, newest first, and a way to read them all. */
function notificationsCentre() {
  return h('div', { class: 'blk-stack' },
    callout({ tone: 'warning', title: 'Sonarr is not answering', body: 'Coming up shows what it knew an hour ago.', action: button({ size: 'sm' }, 'Look at it') }),
    h('ul', { class: 'blk-list' }, NOTES.map(([ic, text, when, unread]) => h('li', { class: ['blk-list__row', unread && 'is-unread'] },
      h('span', { class: 'blk-feed__mark', 'aria-hidden': 'true' }, icon(ic, 13)), h('div', { class: 'blk-list__text' }, h('strong', null, text), h('span', { class: 'muted' }, when))))),
    h('div', { class: 'blk-row blk-row--end' }, button({ size: 'sm', variant: 'ghost', onClick: () => toast({ text: 'Every notification is read.', tone: 'good', action: 'Undo' }) }, icon('check', 14), 'Mark all as read')));
}
/** A person at the top of their page: their face, their year, who they watch with, what can be done. */
function profileHeader() {
  return h('div', { class: 'blk-profile' }, avatar(null, 'alice', { size: 56 }),
    h('div', { class: 'blk-stack blk-stack--tight' }, h('strong', { class: 'blk-title__name' }, 'alice'), h('span', { class: 'muted' }, 'Watching since 2021 · 212 hours this year'),
      h('div', { class: 'blk-row' }, avatarGroup({ people: ['bob', 'carol', 'dave', 'erin', 'frank'].map((name) => ({ name })), max: 4, size: 24 }), h('span', { class: 'muted' }, 'watches with 5 others'))),
    dropdownMenu({ label: 'alice', icon: 'menu', iconOnly: true, items: [{ label: 'Timeline', icon: 'activity' }, { label: 'Watchlist', icon: 'bookmark' }, { label: 'Share the profile', icon: 'share' }] }));
}
/** A code from an authenticator, in its boxes, and the way on. */
function codeStep() {
  return h('div', { class: 'blk-stack' }, h('p', null, 'Type the six digits from your authenticator.'), otp({ label: 'Code', length: 6, grouped: true }),
    h('div', { class: 'blk-row blk-row--end' }, button({ variant: 'primary' }, 'Verify')));
}
/** An account's pages of the parts switched on. */
function accountOf(...parts) {
  return h('div', { class: 'blk-stack blk-stack--loose' }, parts.map((part) => part()));
}

// ---------------------------------------------------------------- library: finding, browsing, a person, bringing in

/** What to show of a library: a kind, genres to keep to, an order. */
function libraryFilters() {
  return h('div', { class: 'blk-stack blk-stack--tight' },
    h('div', { class: 'blk-row' }, chipChoice({ label: 'Kind', value: 'films', options: [{ value: 'films', label: 'Films' }, { value: 'shows', label: 'Shows' }, { value: 'music', label: 'Music' }] }),
      dropdownMenu({ label: 'Newest first', icon: 'sliders', size: 'sm', items: [{ label: 'Newest first' }, { label: 'Most watched' }, { label: 'A to Z' }] })),
    tagInput({ label: 'Genres', value: ['Drama'], placeholder: 'Keep to a genre…' }));
}
const SHELF = ['Big Buck Bunny', 'Sintel', 'Tears of Steel', 'Cosmos Laundromat', 'Elephants Dream', 'Spring', 'Agent 327', 'Caminandes'];
/** A page of titles as cards, and the way to the next. */
function titleGrid() {
  return h('div', { class: 'blk-stack' }, mediaGrid(SHELF.slice(0, 6).map((name, i) => mediaCard({ href: '#', poster: poster(null, name, { cls: 'fui-poster--grid' }), name, sub: `${2006 + i}` }))),
    pagination({ page: 1, perPage: 6, total: 48, onPage: noop }));
}
/** What a search found, by kind: titles, then people. */
function searchResults() {
  const row = (name, sub) => h('li', { class: 'blk-list__row' }, poster(null, name, { cls: 'fui-poster--sm' }), h('div', { class: 'blk-list__text' }, h('strong', null, name), h('span', { class: 'muted' }, sub)));
  return h('div', { class: 'blk-stack' },
    h('div', { class: 'fui-field__search' }, icon('search', 14), h('input', { class: 'fui-field__input fui-field__input--search', type: 'search', value: 'steel', 'aria-label': 'Search the library' })),
    h('p', { class: 'muted' }, 'Titles'), h('ul', { class: 'blk-list' }, row('Tears of Steel', 'Film · 2012 · 12 min'), row('Man of Steel', 'Not on the server')),
    h('p', { class: 'muted' }, 'People'), h('ul', { class: 'blk-list' }, h('li', { class: 'blk-list__row' }, avatar(null, 'Ian Hubert', { size: 32 }), h('div', { class: 'blk-list__text' }, h('strong', null, 'Ian Hubert'), h('span', { class: 'muted' }, 'Directed Tears of Steel')))));
}
/** A person's page: where it sits, who, and what they are in, along a shelf. */
function personPage() {
  return h('div', { class: 'blk-stack' }, breadcrumb({ items: [{ label: 'Cast & crew', href: '#' }, { label: 'Ian Hubert' }] }),
    h('div', { class: 'blk-profile' }, avatar(null, 'Ian Hubert', { size: 48 }), h('div', { class: 'blk-stack blk-stack--tight' }, h('strong', { class: 'blk-title__name' }, 'Ian Hubert'), h('span', { class: 'muted' }, 'Director · in 3 titles here'))),
    shelf({ label: 'In the library', items: SHELF.slice(0, 5).map((name, i) => mediaCard({ href: '#', poster: poster(null, name, { cls: 'fui-poster--grid' }), name, sub: `${2008 + i}` })) }));
}
/** Bringing history in: the steps of an import, the file being read, how far along it is. */
function importDrop() {
  const drop = fileDrop({ label: 'Drop a Jellystat backup here', help: 'A .jsonl or .jsonl.gz, up to 2 GB.', accept: '.jsonl,.jsonl.gz' });
  drop.show([{ name: 'jellystat-backup-2026-09.jsonl.gz', size: 412 * 1024 ** 2, progress: 1 }]);
  return h('div', { class: 'blk-stack' }, steps({ steps: [{ label: 'Choose' }, { label: 'Check' }, { label: 'Import' }], current: 2, done: [0, 1], onGo: noop }), drop,
    progressBar({ label: 'Importing plays', value: 0.62, elapsed: 190, detail: '7,940 of 12,804 plays' }));
}
/** A library's page of the parts switched on. */
function libraryOf(...parts) {
  return h('div', { class: 'blk-stack blk-stack--loose' }, parts.map((part) => part()));
}

const PARTS = { stackedBars, twoLines, areaOfOne, donut, rings, radar, heatmap, barList, storageBar, numbersAbove, summary, exportButton,
  whatComesOut, times, weekPlans, inWords, serverAddress, userName, names, email, password, twoStepCode, remember, service, people, file, notifySwitches, newKey,
  pictures, lineUnder, values, progress, states, unread, roles, timeline, filters, loading, empty, failed, done, question,
  colours, typeSample, buttonsRow, badgesRow, focusRow, keysRow, factsRow, playsTable, settingsPage, notFound,
  nowPlaying, titlePage, seasonEpisodes, upNext, numbersRow, weekChart, yearChart, topTitles, whenWatched, activityFeed, downloadsQueue,
  setupWizard, settingsPanel, notificationsCentre, profileHeader, codeStep, libraryFilters, titleGrid, searchResults, personPage, importDrop };
const BUILD = { dateBlock, chartOf, formOf, listOf, stateOf, lookOf, pageOf, watchingOf, dashboardOf, accountOf, libraryOf };
/** An option as code says it: strings quoted, the rest as they are. */
const lit = (opts) => { const set = Object.entries(opts).filter(([, v]) => v !== undefined); return set.length ? `{ ${set.map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`).join(', ')} }` : '{}'; };
/** A block's switches made into a call (its builder, its options, the parts that are on) which draws the block and is
 *  written out as its code, so the two cannot differ. `plan(o)` gives { title, sub, fn, options, parts, bare }. */
function playable(controls, plan) {
  const args = (p) => [...(p.options === null ? [] : [p.options]), ...p.parts.map((n) => PARTS[n])];
  const call = (p) => `${p.fn}(${[...(p.options === null ? [] : [lit(p.options)]), ...p.parts].join(', ')})`;
  return {
    controls,
    render: (o) => { const p = plan(o); const body = BUILD[p.fn](...args(p)); return p.bare ? body : card({ title: p.title, sub: p.sub, body }); },
    code: (o) => { const p = plan(o); return p.bare ? call(p) : `card({ title: '${p.title}'${p.sub ? `, sub: '${p.sub}'` : ''}, body: ${call(p)} })`; },
  };
}

const CHARTS = {
  bars: ['stackedBars', 'Watch time by day', 'Films, episodes, music and the rest'], line: ['twoLines', 'Plays a day', 'This month and the one before'],
  area: ['areaOfOne', 'Plays a month', 'This year, the busiest month marked'], donut: ['donut', 'Where people watch', 'Plays by device'],
  rings: ['rings', 'Shows this year', 'Finished, started and requested'], radar: ['radar', 'Taste', 'Watch time by genre'],
  heatmap: ['heatmap', 'When people watch', 'Plays by weekday and hour'], barList: ['barList', 'Plays by app', 'The last 30 days'],
  storage: ['storageBar', 'Storage', 'What each library takes'],
};
/** The form switches have made: its title and button follow what it asks for. */
const FORM_PARTS = [['server', 'serverAddress'], ['user', 'userName'], ['names', 'names'], ['email', 'email'], ['password', 'password'], ['code', 'twoStepCode'], ['remember', 'remember'],
  ['service', 'service'], ['people', 'people'], ['file', 'file'], ['notify', 'notifySwitches'], ['key', 'newKey']];
const formSays = (o) => (o.code ? ['Two-step sign-in', 'Verify'] : o.names ? ['Create an account', 'Create the account'] : o.service ? ['Connect a service', 'Connect']
  : o.people ? ['Invite people', 'Send the invites'] : o.file ? ['Import a backup', 'Import'] : o.key ? ['API key', 'Done'] : o.notify ? ['Notifications', 'Save'] : ['Sign in', 'Sign in']);
const LIST_PARTS = ['pictures', 'lineUnder', 'values', 'progress', 'states', 'unread', 'roles', 'timeline', 'filters'];
const listSays = (o) => (o.unread ? 'Notifications' : o.timeline ? 'What happened' : o.roles ? 'People' : o.filters ? 'Find something' : o.progress && !o.values ? 'Now playing' : 'Most watched');
const STATES = { loading: 'loading', empty: 'empty', error: 'failed', done: 'done', question: 'question' };
/** The card each state is shown in: what it is the state of. */
const STATE_OF = { loading: 'Library', empty: 'Recent plays', error: 'Recent plays', done: 'Import', question: 'Notifications' };
const LOOK_PARTS = [['colours', 'colours'], ['type', 'typeSample'], ['buttons', 'buttonsRow'], ['badges', 'badgesRow'], ['focus', 'focusRow'], ['keys', 'keysRow'], ['facts', 'factsRow']];
const PAGES = { table: 'playsTable', settings: 'settingsPage', notFound: 'notFound' };
/** The four families made of FinUI's larger parts: each switch a part, in the order they are listed. */
const WATCHING = [['now', 'Now playing', 'nowPlaying', true], ['title', 'The title', 'titlePage'], ['episodes', 'Episodes', 'seasonEpisodes'], ['next', 'Up next', 'upNext']];
const DASHBOARD = [['numbers', 'Numbers', 'numbersRow', true], ['week', 'A week of watch time', 'weekChart', true], ['year', 'A year of plays', 'yearChart'], ['top', 'Top titles', 'topTitles'],
  ['when', 'When people watch', 'whenWatched'], ['activity', 'Activity', 'activityFeed'], ['downloads', 'Downloads', 'downloadsQueue']];
const ACCOUNT = [['setup', 'Setup', 'setupWizard'], ['settings', 'Settings', 'settingsPanel', true], ['notes', 'Notifications', 'notificationsCentre'], ['profile', 'Profile', 'profileHeader'], ['code', 'Two-step code', 'codeStep']];
const LIBRARY = [['filters', 'Filters', 'libraryFilters', true], ['titles', 'Titles', 'titleGrid', true], ['search', 'Search results', 'searchResults'], ['person', 'A person', 'personPage'], ['import', 'An import', 'importDrop']];
/** A family's switches and the call they make: its builder with the parts that are on, in a card of `title`. */
const family = (list, fn, title) => playable(list.map(([key, label, , on]) => ({ key, label, on: !!on })), (o) => ({ title, fn, options: null, parts: list.filter(([key]) => o[key]).map(([, , part]) => part) }));

/** Every block: a key, its name in the gallery's list and an icon there, a line on what it is, its switches (`playground`),
 *  the ways FinUI create shows it (`preview`, options for its switches), and as it opens (`render`). `wide` blocks take a
 *  whole row. */
export const BLOCKS = [
  { key: 'calendar', name: 'Calendar', group: 'Blocks', icon: 'calendar', title: 'Calendar', about: 'A month to pick in, and what is switched on beside it: what comes out, times, the week’s plans, the pick in words.',
    playground: playable([
      { key: 'several', label: 'Several days', excludes: ['range'] }, { key: 'range', label: 'A range', excludes: ['several'] },
      { key: 'marks', label: 'What comes out' }, { key: 'times', label: 'Times' }, { key: 'week', label: 'The week’s plans' },
      { key: 'words', label: 'Say it in words', on: true }, { key: 'sunday', label: 'Week starts on Sunday' },
    ], (o) => ({ title: 'Calendar', sub: 'Pick a day, and what goes with it', fn: 'dateBlock',
      options: { mode: o.range ? 'range' : o.several ? 'multiple' : undefined, sunday: o.sunday || undefined },
      parts: [o.marks && 'whatComesOut', o.times && 'times', o.week && 'weekPlans', o.words && 'inWords'].filter(Boolean) })),
    preview: [{ marks: true, words: true }, { range: true, words: true }, { several: true, words: true }, { times: true }, { week: true }],
    render: () => card({ title: 'Calendar', sub: 'Pick a day, and what goes with it', body: dateBlock({}, inWords) }) },
  { key: 'chart', name: 'Chart', group: 'Blocks', icon: 'chart', title: 'Chart', about: 'One chart, of the kind chosen, and what goes with it: a legend, the numbers over it, a sentence, a way to export.',
    playground: playable([
      { key: 'kind', label: 'Kind', choices: [['bars', 'Bars'], ['line', 'Line'], ['area', 'Area'], ['donut', 'Donut'], ['rings', 'Rings'], ['radar', 'Radar'], ['heatmap', 'Heatmap'], ['barList', 'Bar list'], ['storage', 'Storage']] },
      { key: 'legend', label: 'Legend', on: true }, { key: 'numbers', label: 'Numbers above' }, { key: 'summary', label: 'A summary line' }, { key: 'export', label: 'An export button' },
    ], (o) => { const [fn, title, sub] = CHARTS[o.kind || 'bars']; return { title, sub, fn: 'chartOf', options: { legend: o.legend ? undefined : false },
      parts: [fn, o.numbers && 'numbersAbove', o.export && 'exportButton', o.summary && 'summary'].filter(Boolean) }; }),
    preview: [{ kind: 'bars', legend: true, export: true }, { kind: 'line', legend: true }, { kind: 'area', legend: false }, { kind: 'donut', legend: true }, { kind: 'rings', legend: true },
      { kind: 'radar', legend: false }, { kind: 'heatmap', legend: true }, { kind: 'barList', legend: false }, { kind: 'storage', legend: true }, { kind: 'line', legend: true, numbers: true, summary: true }],
    render: () => card({ title: 'Watch time by day', sub: 'Films, episodes, music and the rest', body: chartOf({}, stackedBars) }) },
  { key: 'form', name: 'Form', group: 'Blocks', icon: 'lock', title: 'Form', about: 'A form of the parts switched on (a sign-in, an account, a code, a service, people, a file, notifications, a key) and the button they call for.',
    playground: playable([
      { key: 'server', label: 'Server address', on: true }, { key: 'user', label: 'User name', on: true }, { key: 'names', label: 'Names' }, { key: 'email', label: 'E-mail' },
      { key: 'password', label: 'Password', on: true }, { key: 'code', label: 'Two-step code' }, { key: 'remember', label: 'Keep me signed in', on: true },
      { key: 'service', label: 'A service to connect' }, { key: 'people', label: 'People to invite' }, { key: 'file', label: 'A file to import' },
      { key: 'notify', label: 'Notifications' }, { key: 'key', label: 'A new key' },
    ], (o) => { const [title, action] = formSays(o); return { title, fn: 'formOf', options: { action }, parts: FORM_PARTS.filter(([k]) => o[k]).map(([, n]) => n) }; }),
    preview: [{ server: true, user: true, password: true, remember: true }, { names: true, email: true, password: true }, { code: true }, { service: true }, { people: true }, { file: true }, { notify: true }, { key: true }],
    render: () => card({ title: 'Sign in', body: formOf({ action: 'Sign in' }, serverAddress, userName, password, remember) }) },
  { key: 'list', name: 'List', group: 'Blocks', icon: 'trophy', title: 'List', about: 'One set of rows; each switch adds a feature to every row: pictures, a line, values, progress, states, unread marks, roles, a timeline, filters.',
    playground: playable([
      { key: 'ranked', label: 'Numbered' }, { key: 'pictures', label: 'Pictures', on: true }, { key: 'lineUnder', label: 'A line under', on: true }, { key: 'values', label: 'Values', on: true },
      { key: 'progress', label: 'Progress' }, { key: 'states', label: 'States' }, { key: 'unread', label: 'Unread marks' }, { key: 'roles', label: 'Roles' },
      { key: 'timeline', label: 'A timeline' }, { key: 'filters', label: 'Filters' },
    ], (o) => ({ title: listSays(o), fn: 'listOf', options: { ranked: o.ranked || undefined }, parts: LIST_PARTS.filter((k) => o[k]) })),
    preview: [{ ranked: true, pictures: true, lineUnder: true, values: true }, { pictures: true, lineUnder: true, progress: true }, { progress: true, states: true }, { timeline: true },
      { roles: true, lineUnder: true }, { unread: true, lineUnder: true }, { filters: true, values: true }],
    render: () => card({ title: 'Most watched', body: listOf({}, pictures, lineUnder, values) }) },
  { key: 'state', name: 'State', group: 'Blocks', icon: 'info', title: 'State', about: 'What a view says while it loads, when it is empty, when it failed, when it is done, or when it asks: as it is, as a banner or in a dialog.',
    playground: playable([
      { key: 'state', label: 'State', choices: [['loading', 'Loading'], ['empty', 'Empty'], ['error', 'Error'], ['done', 'Done'], ['question', 'A question']] },
      { key: 'action', label: 'A way on', on: true }, { key: 'dismiss', label: 'Dismissible' }, { key: 'banner', label: 'As a banner', excludes: ['dialog'] }, { key: 'dialog', label: 'In a dialog', excludes: ['banner'] },
    ], (o) => ({ title: STATE_OF[o.state || 'loading'], bare: o.dialog, fn: 'stateOf', options: { frame: o.dialog ? 'dialog' : o.banner ? 'banner' : undefined, action: o.action ? undefined : false, dismiss: o.dismiss || undefined },
      parts: [STATES[o.state || 'loading']] })),
    preview: [{ state: 'loading' }, { state: 'empty', action: true }, { state: 'error', action: true }, { state: 'done', action: true }, { state: 'question', dialog: true }, { state: 'error', banner: true, dismiss: true, action: true }],
    render: () => card({ title: 'Library', body: stateOf({}, loading) }) },
  { key: 'look', name: 'Look', group: 'Blocks', icon: 'sparkle', title: 'The look', about: 'The look of a preset, part by part: its colours, its type, its buttons, badges and chips, its focus ring and icons, its keys, its facts.',
    playground: playable([
      { key: 'colours', label: 'Colours', on: true }, { key: 'type', label: 'Type', on: true }, { key: 'buttons', label: 'Buttons' }, { key: 'badges', label: 'Badges and chips' },
      { key: 'focus', label: 'Focus and icons' }, { key: 'keys', label: 'Keyboard keys' }, { key: 'facts', label: 'Facts' },
    ], (o) => ({ title: 'The look', sub: 'A preset, part by part', fn: 'lookOf', options: null, parts: LOOK_PARTS.filter(([k]) => o[k]).map(([, n]) => n) })),
    preview: [{ colours: true, type: true }, { buttons: true, badges: true }, { focus: true }, { keys: true }, { facts: true }],
    render: () => card({ title: 'The look', sub: 'A preset, part by part', body: lookOf(colours, typeSample) }) },
  { key: 'page', name: 'Page', group: 'Blocks', icon: 'table', title: 'Page', wide: true, about: 'A page of an app: a table, settings or a page that is not there, with its header, numbers over it, and the app’s menu beside it.',
    playground: playable([
      { key: 'content', label: 'Content', choices: [['table', 'A table'], ['settings', 'Settings'], ['notFound', 'Not found']] },
      { key: 'sidebar', label: 'App sidebar' }, { key: 'header', label: 'Page header', on: true }, { key: 'numbers', label: 'Numbers above' },
    ], (o) => ({ title: 'Page', bare: true, fn: 'pageOf', options: { sidebar: o.sidebar || undefined, header: o.header ? undefined : false },
      parts: [PAGES[o.content || 'table'], o.numbers && 'numbersAbove'].filter(Boolean) })),
    preview: [{ content: 'table', header: false }, { content: 'settings', header: false }, { content: 'table', sidebar: true, header: true, numbers: true }],
    render: () => pageOf({}, playsTable) },
  { key: 'watching', name: 'Watching', group: 'Blocks', icon: 'play', title: 'Watching', about: 'What is on now, a title’s page, its seasons and episodes, and what plays next, each switched on as a part.',
    playground: family(WATCHING, 'watchingOf', 'Watching'),
    preview: [{ now: true }, { title: true }, { episodes: true, next: true }, { now: true, next: true }],
    render: () => card({ title: 'Watching', body: watchingOf(nowPlaying) }) },
  { key: 'dashboard', name: 'Dashboard', group: 'Blocks', icon: 'chart', title: 'Dashboard', wide: true, about: 'A dashboard of numbers over charts: a week of watch time, a year of plays, the top titles, when people watch, what happened, what is downloading.',
    playground: family(DASHBOARD, 'dashboardOf', 'Overview'),
    preview: [{ numbers: true, week: true }, { year: true, top: true }, { when: true }, { activity: true, downloads: true }],
    render: () => card({ title: 'Overview', body: dashboardOf(numbersRow, weekChart) }) },
  { key: 'account', name: 'Account', group: 'Blocks', icon: 'user', title: 'Account', about: 'Setting up, settings with sliders, numbers and choices, what FinStats told you, a person’s header, and a two-step code.',
    playground: family(ACCOUNT, 'accountOf', 'Account'),
    preview: [{ setup: true }, { settings: true }, { notes: true }, { profile: true, code: true }],
    render: () => card({ title: 'Account', body: accountOf(settingsPanel) }) },
  { key: 'library', name: 'Library', group: 'Blocks', icon: 'library', title: 'Library', wide: true, about: 'A library to find things in: filters, a grid of titles, search results, a person’s page, and bringing history in from a backup.',
    playground: family(LIBRARY, 'libraryOf', 'Library'),
    preview: [{ filters: true, titles: true }, { search: true }, { person: true }, { import: true }],
    render: () => card({ title: 'Library', body: libraryOf(libraryFilters, titleGrid) }) },
];

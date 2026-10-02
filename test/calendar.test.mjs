// The calendar's dates: a month as whole weeks, moving by keys, and what a click picks in each mode. Pure, so held here;
// the QA stage clicks and types in the real one.
// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeks, addDays, addMonths, move, pick, inRange, picked, allowed, monthOf, today } from '../components/calendar/dates.js';

test('a month is whole weeks, Monday first unless told otherwise', () => {
  const oct = weeks('2026-10-01');
  assert.equal(oct.length, 5);
  assert.deepEqual(oct[0].map((d) => d.key), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(oct[0].map((d) => d.inMonth), [false, false, false, true, true, true, true]);
  assert.equal(oct[4][6].key, '2026-11-01');
  assert.equal(weeks('2026-10-01', 0)[0][0].key, '2026-09-27', 'Sunday first');
  assert.equal(weeks('2021-02-01').length, 4, 'February 2021 starts on a Monday and is four weeks');
  assert.equal(weeks('2026-08-01').length, 6, 'August 2026 needs six');
  for (const k of ['2024-02-01', '2026-03-01', '2026-12-01']) for (const w of weeks(k)) assert.equal(w.length, 7);
});

test('days and months add across the year, a month keeps its day where it can', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-03-28', 7), '2026-04-04', 'across the clock change, a day is a day');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-15');
  assert.equal(monthOf('2026-10-17'), '2026-10-01');
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

test('the keys move as a date grid does', () => {
  assert.equal(move('2026-10-14', 'ArrowRight'), '2026-10-15');
  assert.equal(move('2026-10-14', 'ArrowLeft'), '2026-10-13');
  assert.equal(move('2026-10-14', 'ArrowDown'), '2026-10-21');
  assert.equal(move('2026-10-14', 'ArrowUp'), '2026-10-07');
  assert.equal(move('2026-10-14', 'Home'), '2026-10-12', 'the start of its week, a Monday');
  assert.equal(move('2026-10-14', 'End'), '2026-10-18');
  assert.equal(move('2026-10-14', 'Home', 0), '2026-10-11', 'a Sunday when weeks start on Sunday');
  assert.equal(move('2026-10-31', 'PageDown'), '2026-11-30');
  assert.equal(move('2026-10-14', 'PageUp'), '2026-09-14');
  assert.equal(move('2026-10-14', 'PageUp', 1, true), '2025-10-14', 'with Shift, a year');
  assert.equal(move('2026-10-14', 'x'), null, 'any other key, nothing');
});

test('single picks one day; picking it again keeps it', () => {
  assert.equal(pick('single', null, '2026-10-09'), '2026-10-09');
  assert.equal(pick('single', '2026-10-09', '2026-10-09'), '2026-10-09');
  assert.equal(picked('single', '2026-10-09', '2026-10-09'), true);
});

test('multiple adds and takes away, in order, and stops at its limit', () => {
  let v = pick('multiple', [], '2026-10-14');
  v = pick('multiple', v, '2026-10-02');
  assert.deepEqual(v, ['2026-10-02', '2026-10-14']);
  assert.deepEqual(pick('multiple', v, '2026-10-14'), ['2026-10-02']);
  assert.deepEqual(pick('multiple', ['2026-10-01', '2026-10-02'], '2026-10-03', { limit: 2 }), ['2026-10-01', '2026-10-02'], 'full: nothing added');
  assert.equal(picked('multiple', v, '2026-10-02'), true);
});

test('range: the first click starts it, the second ends it either way round, a third starts again', () => {
  let r = pick('range', { from: null, to: null }, '2026-10-12');
  assert.deepEqual(r, { from: '2026-10-12', to: null });
  assert.deepEqual(pick('range', r, '2026-10-18'), { from: '2026-10-12', to: '2026-10-18' });
  assert.deepEqual(pick('range', r, '2026-10-05'), { from: '2026-10-05', to: '2026-10-12' }, 'an earlier end turns it round');
  assert.deepEqual(pick('range', { from: '2026-10-12', to: '2026-10-18' }, '2026-10-20'), { from: '2026-10-20', to: null });
  const full = { from: '2026-10-12', to: '2026-10-18' };
  assert.equal(inRange('2026-10-15', full), true);
  assert.equal(inRange('2026-10-19', full), false);
  assert.equal(picked('range', full, '2026-10-12'), true);
  assert.equal(picked('range', full, '2026-10-15'), false, 'the middle is in the range, not one of its ends');
});

test('a day outside min and max cannot be picked', () => {
  assert.equal(allowed('2026-10-05', { min: '2026-10-02', max: '2026-10-20' }), true);
  assert.equal(allowed('2026-10-01', { min: '2026-10-02' }), false);
  assert.equal(allowed('2026-10-21', { max: '2026-10-20' }), false);
  assert.equal(pick('single', '2026-10-09', '2026-10-01', { min: '2026-10-02' }), '2026-10-09');
});

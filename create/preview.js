// What FinUI create draws its preview with: every block (blocks/blocks.js) on one page, as a wall of cards, under the
// overview a page of finstats opens on. It is drawn into a frame that loads FinUI's stylesheets and a preset's tokens, so
// every colour, corner, gap, font and line in it is the stylesheet's, as somebody who fetches that stylesheet will see it.

import { h } from '../core.js';
import { segmented } from '../components/segmented/segmented.js';
import { statTile } from '../components/stat-tile/stat-tile.js';
import { pageHeader } from '../components/page-header/page-header.js';
import { BLOCKS } from '../blocks/blocks.js';

/** Everything the preview shows, built in this document; the frame adopts it. */
export function previewPage() {
  const page = h('main', { class: 'pv' },
    pageHeader('Overview', 'The last 30 days on this server',
      segmented({ label: 'Range', size: 'sm', value: '30', options: [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }], onChange: () => {} })),
    h('div', { class: 'fui-stat-tile__grid' },
      statTile({ label: 'Watch time', value: '312h', current: 312, previous: 268, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'Plays', value: '1,284', current: 1284, previous: 1330, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'People', value: '6', current: 6, previous: 6, vsLabel: 'vs the 30 days before' }),
      statTile({ label: 'Last played', value: 'just now', hint: 'Big Buck Bunny' })),
    h('div', { class: 'pv-masonry' }, BLOCKS.filter((b) => !b.wide).map((b) => b.render())),
    BLOCKS.filter((b) => b.wide).map((b) => b.render()));
  // A preview: nothing in it goes anywhere.
  page.addEventListener('click', (e) => { if (e.target.closest('a, button[type=submit]')) e.preventDefault(); });
  return page;
}

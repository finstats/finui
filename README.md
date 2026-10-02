# FinUI

The components [finstats](https://github.com/finstats/finstats) is built from: buttons, cards, tables that sort by
meaning, dialogs that stack, a theme switch, and two dozen more. Vanilla ES modules and plain CSS, no build step and no
dependencies, light and dark from one set of tokens.

**[See every component in both themes →](https://finstats.github.io/finui/)** · **[Make it yours in FinUI create →](https://finstats.github.io/finui/create/)**

## What it is

FinUI is a registry in the spirit of shadcn/ui: the components are source you copy and own, not a package you install.

- **No build step, no dependencies, no CDN.** Each component is an ES module built with `h()` (a small element builder in
  `core.js`) and a CSS file of its own.
- **Every colour is a token**, and every token is `light-dark(light, dark)` in `tokens.css`: one declaration, both themes.
  No other file names a colour.
- **One namespace.** Every class is `fui-` and its component's name: `fui-button`, `fui-button--primary`,
  `fui-card__title`. A component styles its own classes, and those of the components it is built with only as context.
- **Documented where it lives.** Each module exports `meta`: what it is for and not for, its props, variants and states,
  its accessibility, and the examples the gallery draws. There is no second copy of the docs.
- **Data-free.** A component never fetches, never reads an app's state and never knows a route: it is given what it
  shows. A poster is given an address, not an id.
- **The same contract everywhere**: operable from the keyboard with a visible focus ring, the right roles and ARIA,
  quiet under `prefers-reduced-motion`, readable in both themes and at 360 px, and data reaches the DOM only as text.

## Make it yours

[FinUI create](https://finstats.github.io/finui/create/) shows a wall of FinUI — dashboards, forms, tables, settings,
dialogs, charts — and lets you change it as you watch, in light, dark or both. Start from one of eleven styles (whole looks,
from Washi, finstats' own, to Noir, Gazette or Arcade), then change any of twenty-two choices: base colour, accent, chart
colours, contrast; radius, density, borders, cards, buttons, fields, tables; highlight, motion, icon stroke and ends, menu,
page, focus ring; the text, heading and mono fonts and how headings are set. Lock what you like and shuffle the rest. What
you made is a short code, and one command takes it home:

```sh
curl -fsSL https://finstats.github.io/finui/install.sh | sh -s -- 0101         # FinUI into ./finui, your tokens after tokens.css' own
curl -fsSL https://finstats.github.io/finui/install.sh | sh -s -- 0101 --css   # or one finui.css, with its fonts beside it
```

Nothing but `curl` and `sh`: no package manager, no Node. The installer writes only into an empty folder (`--dir` names
another), and fetches everything before it writes anything. Without a shell, the page downloads the stylesheet itself.
The site, installer included, is built by the pages workflow (`tools/build-site.mjs`) on every push to `main`, once the
checks and tests pass: FinUI's files, `finui.css`, and one small file of tokens per choice (`p/<axis>/<option>.css`),
which the installer fetches in axis order, so a later choice sets a token last, as the page does. A preset is nothing but tokens: a `:root` block
after `tokens.css`, which you can also copy from the page and paste into a FinUI you already have. The choices live in
`create/presets.json` and are worked into tokens by `create/preset.js`, the one module both the page and the site's
builder use; a style is a name and its picks there. Tests hold what every choice must: every palette's neighbours stay
apart by day and by night, every base's text reads on its grounds, every accent reads as a link and on its buttons, every
button and menu style keeps its words readable, and every token a choice sets is one something reads.

## Trying a component

Each component's page in the gallery has one example to play with: switches turn its features on, a choice picks
between its variants, and it is drawn again in both themes at every change. The calendar, for one: a day, several
days or a range, marked days, limits, a week that starts on Sunday — and its buttons and keys work as they will in an
app, because a component that only looks right is no component.

## Icons that move

Every icon comes twice: still, as `icon()` draws it, and moving, as `animatedIcon()` draws it. A moving icon is drawn
in stroke by stroke, does what it is about — refresh turns, download's arrow drops into its tray, a heart beats, a
slider's knobs slide, the trash lifts its lid — and is drawn out again, in a loop; or its act once each time it is
pointed at (`play: 'hover'`), or once. At rest it is the still icon, and it stays still with reduced motion and with a
preset's Motion: Off. What each icon does is one line of `components/animated-icon/motions.js`.

`animateWithin(root)` does it for a whole app: every icon inside a link, a button or a tab moves once on hover, the ones
there now and the ones drawn later, while an icon among words stays still. `setBusy(icon, true)` keeps a refresh turning
while its answer is on the way, and `setBusy(icon, false)` lets it finish the turn it is in.

```js
import { animateWithin, setBusy } from './finui/components/animated-icon/animated-icon.js';
animateWithin(document.body);
```

## Blocks

The gallery's **blocks** are compositions of the components, a card's worth of an app each: seven of them, one of each
kind, each an entry of its own in its list. Each is one block with switches, not a row of fixed variants:

- **Calendar**: one day, several or a range, and beside it what comes out, times, the week's plans, the pick in words.
- **Chart**: bars, a line, an area, a donut, rings, a radar, a heatmap, a bar list or storage, with a legend, numbers over it, a sentence, an export.
- **Form**: a server address, a user name, names, an e-mail, a password, a two-step code, a service, people to invite, a file, notifications, a new key — and the button they call for.
- **List**: one set of rows, numbered or not, with pictures, a line under, values, progress, states, unread marks, roles, a timeline or filters.
- **State**: loading, empty, an error, done or a question, as it is, as a banner or in a dialog, with a way on and a way to dismiss it.
- **Look**: a preset part by part — colours, type, buttons, badges, focus and icons, keys, facts.
- **Page**: a table, settings or not found, with the app's menu, a page header and numbers over it.

They are the cards FinUI create draws a preset on, each in several of its ways (`blocks/blocks.js`, laid out by
`blocks/blocks.css`), shown in both themes. Each comes with its code to copy, the same code with only what is switched on:
a module that imports FinUI from `./finui/` (where the installer puts it) and exports one function that builds the block,
the CSS of the classes it draws, and its HTML. `blocks/source.js` works the code out of `blocks.js` and `blocks.css`, and
the QA stage pastes it into a page with nothing but FinUI and runs it.

## Using it

Copy the folder, or let the installer above copy it.
Load the stylesheets in `registry.json`'s order — `tokens.css`, `base.css`, then each component's CSS
— either as separate `<link>`s or as one file joined in that order (finstats serves them joined, as `/assets/finui.css`).
Then import what you need:

```js
import { h, icon } from './finui/core.js';
import { button } from './finui/components/button/button.js';
import { card } from './finui/components/card/card.js';

document.body.append(card({ title: 'Recently added', body: button({ variant: 'primary' }, icon('plus', 14), 'Add') }));
```

The theme follows the device (`color-scheme: light dark`); `data-theme="light"` or `"dark"` on `<html>` chooses one.
Fonts are Inter and JetBrains Mono, in `fonts/` beside `base.css`.

`registry.json` lists every component with its files, the tokens its CSS reads and the components it is built with.
`node tools/check.mjs` holds the registry to the files and keeps the rules above, and `node --test test/*.test.mjs` holds
the presets, the site and the installer (run with `sh` against the built site); both run before every publish and on
every pull request.

## Where it is made

FinUI's components are developed inside finstats (`web/assets/finui`), where every one of them is used and tested, and
copied here as they change; the gallery and FinUI create live here only. Issues and changes are welcome in either place.

## Licence

FinUI is free software under the [GNU General Public License v3.0](LICENSE) only, like finstats. The bundled fonts are
under the SIL Open Font License 1.1; their licences are in `fonts/`.

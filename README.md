# finui

The components [finstats](https://github.com/finstats/finstats) is built from: buttons, cards, tables that sort by
meaning, dialogs that stack, a theme switch, and two dozen more. Vanilla ES modules and plain CSS, no build step and no
dependencies, light and dark from one set of tokens.

**[See every component in both themes →](https://finstats.github.io/finui/)**

## What it is

finui is a registry in the spirit of shadcn/ui: the components are source you copy and own, not a package you install.

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

## Using it

Copy the folder. Load the stylesheets in `registry.json`'s order — `tokens.css`, `base.css`, then each component's CSS
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
`node tools/check.mjs` holds the registry to the files and keeps the rules above; it runs on every push.

## Where it is made

finui is developed inside finstats (`web/assets/finui`), where its gallery is part of the app and every component is
tested in finstats' own suite, and copied here as it changes. Issues and changes are welcome in either place.

## Licence

finui is free software under the [GNU General Public License v3.0](LICENSE) only, like finstats. The bundled fonts are
under the SIL Open Font License 1.1; their licences are in `fonts/`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

FinUI is finstats' component library (`github.com/finstats/finui`). How it is developed (the rule checker, the tests,
test-first) is in `qa/CLAUDE.md`, beside the suite it describes.

## Git conventions

The same as finstats and FinMotion:

- Conventional-commit subjects with a scope where one fits: `feat(toast):`, `fix(desktop-nav):`, `feat(create):`, `docs:`,
  `chore:`. The scope is the component, or the part of the site (`create`, `demo`). The subject says what changed; the body
  says why.
- **No LLM attribution of any kind**: no `Co-Authored-By:` for Claude or any model, no session link, no "Generated with…"
  line, in a commit message or anywhere else, whatever a tool defaults to.
- One logical change per commit, standing on its own; commit as work lands.
- **Never push unless explicitly told to.**
- One commit identity, the repository's usual author.

## No em-dashes

**No em-dash is used anywhere in the fin\* repositories on GitHub** (finstats, FinUI, FinMotion): not in code, comments,
UI text, docs or commit messages (the owner's decision, 2026-10-07). Where a sentence wants one, rewrite the sentence: a
full stop, a colon, a semicolon, commas, parentheses or a joining word. Another dash in its place (a hyphen, an en dash,
two hyphens) or an escape for the character is not a rewrite.

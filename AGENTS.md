# AGENTS.md

Rules for working in this repository, for people and coding assistants alike.
What the repository is and how it is laid out is in [`README.md`](README.md);
the look is in [`style-guide.html`](style-guide.html), rendered from
[`assets/tokens.js`](assets/tokens.js). This file does not repeat either.

## What a demo is

A demo explains *how something works*: a method, a concept, a piece of maths,
an instrument. It does not show results or data from a project. The reader
should understand the idea by changing something and watching the response.

- **Concept first.** Show the idea in its most basic form: the equations as the
  concept is known by (textbook or original-paper formulation, with its
  symbols), and the simplest numbers that make the point.
- **One topic, one page; cases inside it.** A method gets one page. Its
  variants are cases on that page, behind a case selector, ordered from the
  simplest (one signal, no delay, no noise) to the realistic one. A case
  explains one idea in at most 130 words.
- **Short text above, explanation below.** A title and a lead of at most 50
  words on the left two thirds, the case selector on the right third beside
  them (closed it shows the current case, a click opens the menu), then the
  controls and the plots. Under the plots the explanation and the equations,
  and last the reference list, full width.
- **Plot limits are fixed per case.** They follow from the case's bands, never
  from a slider, the harmonic or the phase angle, so nothing rescales while the
  reader changes a setting or sweeps φ.

## How a demo is built

- One folder `demos/<field>/<demo>/`: an `index.html` for the markup and a
  `<demo>.js` module for the engine. Data the demo needs sits next to them.
- Plain HTML, CSS and JavaScript modules. No framework, no npm, no build step.
  A library that is really needed is a pinned copy in the repository, never a
  CDN link.
- Every page uses the shared layer in `assets/`: `shell.js` (tokens, header,
  footer, width steps, the two views), `site.css`, `plot.js` for canvases and
  `cite.js` for references. A demo calls `initShell({ page: 'demo', views: true })`.
- No analytics, no cookies, no tracking, no requests to another server. The
  font is Source Sans 3 from `assets/fonts/`, never Google Fonts.
- It is served over http (GitHub Pages, or `python -m http.server` locally):
  modules and `references.bib` do not load from `file://`.
- It works on a phone width as well as a desktop, and in the presentation view.
- `index.html` starts with a comment block: what the demo shows, the model and
  equations behind it, its sources, author and date.

## The design system

`assets/tokens.js` is the single source of truth for every colour, type role,
radius, spacing step, chart constant, presentation setting, writing rule and
editorial limit. `installTokens()` writes them into `:root` before anything
renders, and the style guide renders itself from the same objects, so the
guide cannot drift from the site.

- **Never hard-code a colour, font size or font weight** in a page, a demo or
  `site.css`. CSS uses `var(--token)`; a canvas imports `C`, `CHART` or
  `typeFont()` from `tokens.js`.
- **A new token is added with a `usage` note.** The note is what the style
  guide shows next to it, so write it for a reader. A new text style is a new
  type role in `TYPE_GROUPS`, never a one-off size.
- **Colours come from the PhD colour scheme** (`SCHEME`, copied from phd_ui).
  The data roles keep the meaning of the MES tutorial figures: red the
  stimulus-on half, blue the off half, A black, B orange.
- **Responsive rules key off `<html data-w>`** (`compact`, `mid`, `wide`), set by
  the shell from the width it actually has, never off `@media (max-width)`.
  Otherwise the layout stays wide while the presentation zoom makes the content
  narrow.
- **The presentation view is a zoom plus subtractions.** A new subtraction is
  added to `PRESENTATION.subtractions` with the reason it is noise from the back
  of a room, in the same change as its CSS.

## Numbers and references

- Every literature value, equation or claim taken from a paper is cited. Every
  made-up number sits on a page that says the numbers are illustrative.
- References live in [`references.bib`](references.bib), pasted from Zotero.
  Nothing on a page types a reference by hand.
- In text a citation is a marker, `[@alias]` or `[@alias, locator]`: the
  locator is where in the work (`Eq. 2`, `Fig. 42.1, p. 969`). An alias is a key
  of the demo's `SOURCES` map (a citekey plus, for a book, the chapter, and the
  group lead) or a citekey directly. `cite.js` turns markers into numbered
  superscripts and writes the list.
- The list entry leads with the group short form,
  `<first author> et al. (<group lead>), <journal ISO 4> <year>`, e.g.
  `Weyel et al. (Hess), Acc. Chem. Res. 2024`; the bracket is dropped when the
  first author is the group lead. Where Zotero gives the journal unabbreviated,
  the alias carries the ISO 4 form (`journal: 'Chem. Eng. Sci.'`).
- A locator is read from the source, never guessed. If the page is not known,
  give the figure or equation number alone.

## Text and plot style

The full list is `WRITING_RULES` in `tokens.js`, shown on the style guide. The
ones most often broken:

- No em dashes. A comma, a period or a separate sentence.
- Title Case for page, section, case and panel titles. Everything inside a plot
  is lowercase.
- Axis labels read `quantity / unit` (`time / T`, `wavenumber / cm⁻¹`); a
  dimensionless quantity gets an en dash (`absorbance / –`).
- Unicode for formulas in text (CO₂, cm⁻¹, A₁); `<sub>` only for a letter
  subscript Unicode lacks (t<sub>con</sub>, φ<sub>max</sub>).
- Quantities italic, units and words upright.

## Adding a demo, checklist

1. Create `demos/<field>/<demo>/index.html` and `<demo>.js` following the rules
   above; add its references to `references.bib`.
2. Add a row to the table in [`README.md`](README.md) and a card on the landing
   page `index.html`.
3. Serve the repository and open the demo at desktop width, phone width and in
   the presentation view; check every control does what the text says, and
   every number in the readout against the formula it claims to follow.
4. One demo per commit: `Add <field>/<demo> demo`, later changes as
   `<demo>: <what changed>`.

## Coding assistants

Coding assistants (Claude and others) are welcome here and are credited once,
in the acknowledgement of [`README.md`](README.md). Not in the history:

- No `Co-Authored-By` or other assistant trailers in commit messages, and no
  "generated with" lines in pull requests. The commit author is the person who
  checked the change and answers for it.
- Commit under the maintainer's name and e-mail, never as the assistant.

Two things enforce this, so it does not depend on anyone remembering:

- [`.claude/settings.json`](.claude/settings.json) switches Claude Code's commit
  and pull-request attribution off for this repository.
- The `commit-msg` hook in [`.githooks/`](.githooks/) deletes assistant
  `Co-Authored-By` and `Claude-Session` lines from every commit message, whoever
  or whatever writes it. Human co-authors stay. Git does not activate hooks from
  a clone by itself, so run this once after cloning:

  ```
  git config core.hooksPath .githooks
  ```

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
- **A topic gets a hub, then the transformation, then the cases.** A method
  is a folder with a short hub page (one card per sub-page) and two
  sub-pages, in this order:
  - *Transformation*: the core operation on one signal, shown several ways,
    with an input selector (the simplest input first). It answers "what does
    the method do to a signal".
  - *Cases*: the method on realistic spectra, with every setting on screen
    (see below). Cases are ordered from the simplest (one signal, no delay,
    no noise) to the realistic one.
  A case or an input explains one idea in at most 130 words. A small topic
  with nothing to transform can stay one page.
- **Every setting is always there; a case only sets values.** Every value the
  engine reads has a control, the structure of the sample included: species
  are a fixed set of slots, each switched on or off, never added or removed.
  A case is a stored set of values for those controls plus a title and a
  text. Picking it changes the values; it never adds, hides or removes a
  control. The selector marks the case as changed once a value differs.
- **Every value can be typed and reset.** A slider shows its value as a
  number field: type to set it. A small ↺ beside it appears only while the
  value differs from the case and puts the case's value back; a
  double-click on the slider sets the page default (noise 0, φ 0°, …). A
  group of values (a species slot) gets one ↺ for the whole group.
- **The workbench layout, on a wide screen.** An app layout under the site
  header, as tall as the window: the settings in a full-height panel flush
  with the left edge (case selector first), the values as a table in one
  flush with the right edge, the centre between them. Each of the three
  scrolls on its own; scrolling the centre never moves a side panel. The
  centre holds first the head (breadcrumb, title, a lead of at most 50
  words) and the plots, sized so every one is in view without scrolling,
  then the explanation, the equations and the reference list. Text in the
  centre is at `CHART.workbenchScale` (1.5×). Narrower, head and plots come
  first, then the settings, then the values, and the page scrolls as usual.
- **Both panels collapse.** The right one goes away entirely, a tab at the
  edge brings it back. The left one shrinks to a rail of quick switches, as
  IR-bands does: the case, its reset, the stimulus, k, all φ, the sweep, the
  noise, and one switch per species slot; a button names itself on hover,
  and a few open a small menu.
- **Nothing moves when a setting changes.** Subtitles and legends keep a
  fixed height, panel titles stay on one line, a mark that comes and goes
  (changed, ↺) keeps its space. Only the panels' own content changes.
- **Case texts are tooltips; the text below is general.** Hovering a case
  in the selector shows its text. The explanation under the plots is the
  same for every case: what the page shows and how to read and use it.
- **Plots answer the pointer where a point means something.** A marked
  point (a maximum, a zero) shows what it means on hover, previews its
  effect in the other plots, and is kept on click. A ruler that sets a value
  (the phase angle) is drawn dashed with a grip and moves only when grabbed;
  a click anywhere else in the plot does nothing.
- **Names in a case.** Species are lettered in drive order, A first
  (`A, gas in the cell`, `B, fast species`). A quantity a reader may know
  from another method is named generically: the signal, not the band
  height.
- **Plot limits are fixed per case.** They follow from the bands, never from
  a slider or the phase angle, so nothing rescales while the reader changes a
  setting or sweeps φ. The one exception is the harmonic: the axes of
  demodulated signals follow k (1/k for a square wave), or harmonics above
  the first look empty.
- **The presentation view of the workbench is not settled yet.** For now it
  is the zoom of the shell, which stacks the three columns.

## How a demo is built

- One folder `demos/<field>/<demo>/`: an `index.html` for the markup and a
  `<demo>.js` module for the engine. Data the demo needs sits next to them.
  A topic with sub-pages is `demos/<field>/<topic>/index.html` (the hub) plus
  one folder per sub-page, `<topic>/<page>/index.html` and `<page>.js`. A
  sub-page carries a breadcrumb above its title back to the hub.
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

1. Create `demos/<field>/<demo>/index.html` and `<demo>.js` (or the hub and
   its sub-pages) following the rules above; add its references to
   `references.bib`.
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

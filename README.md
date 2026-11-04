# web-site-demos

Interactive browser demos from the Urakawa group at TU Delft: spectroscopy,
kinetics, reactors and instruments, explained by playing with them.

Each demo is a web page. Open it, pick a case, move the sliders, watch what
happens. Nothing to install, no account, no build step.

**Live: <https://urakawa-group.github.io/web-site-demos/>**

## Demos

| demo | field | what it shows |
|---|---|---|
| [MES-PSD](demos/spectroscopy/mes-psd/index.html) | spectroscopy | modulation excitation and phase-sensitive detection in eight cases, from one band without delay to a sequence of species with a spectator: folding, the phase domain, time values, square-wave harmonics |

## Layout

```
index.html                          landing page, one card per demo
impressum.html                      who is responsible, privacy, credits
style-guide.html                    the design system, rendered from assets/tokens.js
references.bib                      every reference any demo cites (Zotero export)
assets/tokens.js                    design tokens: the single source of every colour, size, rule
assets/site.css                     the styles, built only from tokens
assets/shell.js                     header, footer, width steps, the two views
assets/plot.js                      canvas plots with the chart conventions built in
assets/cite.js                      [@alias, locator] markers → numbered citations from references.bib
assets/fonts/                       Source Sans 3 (OFL), served from here
demos/<field>/<demo>/index.html     one demo: its page,
demos/<field>/<demo>/<demo>.js      and its engine
```

## Running it locally

The pages load `references.bib` and their scripts as modules, which browsers
only allow over http. Double-clicking a file does not work; serve the
repository instead:

```
python -m http.server 8000
```

and open <http://localhost:8000>. GitHub Pages serves `main` as it is (no
build, `.nojekyll` switches Jekyll off), so a push to `main` is a release,
usually live within a minute. Every demo has its own address,
`https://urakawa-group.github.io/web-site-demos/demos/<field>/<demo>/`.

## Two views

Every demo has a desktop view and a presentation view for a screen at the
front of a room: a zoom of 1.25× to 2× plus a few subtractions (header, lead,
explanation). Switch with the button in the header, with Shift+P, or open a
link with `?present=1` (`?present=1.75` names the scale); + and − step the
scale, Escape leaves. A demo with cases also takes `?case=<id>`.

## Adding a demo

The rules are in [`AGENTS.md`](AGENTS.md), for people and coding assistants
alike, and the look is in the [style guide](style-guide.html). In short: one
folder, the concept from its simplest case up, every number with its source
from `references.bib`, no colour or size outside `tokens.js`, and an entry in
the table above and on the landing page.

## Contact

Maintained by Julius Sommer. Questions or ideas for a demo: open an issue.

## Acknowledgement

The demos and this repository were written with the help of
[Claude](https://claude.ai) (Anthropic) as a coding assistant. The maintainer
checked and is responsible for every commit.

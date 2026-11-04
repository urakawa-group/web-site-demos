# web-site-demos

Interactive browser demos from the Urakawa group at TU Delft: spectroscopy,
kinetics, reactors and instruments, explained by playing with them.

Each demo is one self-contained web page. Open it, move the sliders, watch what
happens. Nothing to install, no account, no build step.

## Demos

| demo | field | what it shows |
|---|---|---|
| [MES in one minute](demos/spectroscopy/mes/index.html) | spectroscopy | modulation excitation and phase-sensitive detection: folding cycles, removing a spectator band, reading time values from the phase |

## Layout

```
index.html                          landing page that links every demo
demos/<field>/<demo>/index.html     one demo, self-contained
assets/fonts/                       fonts shared by all pages (Source Sans 3, OFL)
```

`<field>` is the subject area (`spectroscopy`, `kinetics`, `reactors`,
`sorption`, ...), `<demo>` a short lowercase name with hyphens (`mes`,
`plug-flow`). A demo can be opened straight from disk by double-clicking its
`index.html`. Once GitHub Pages is switched on for this repository, every demo
also gets its own address:
`https://urakawa-group.github.io/web-site-demos/demos/<field>/<demo>/`.
Opened from disk in Firefox, the shared font may not load and the page falls
back to Arial; over GitHub Pages it always loads.

## Adding a demo

The rules are in [`AGENTS.md`](AGENTS.md), for people and coding assistants
alike. In short: one folder, one page, the concept in its simplest form, every
number with its source, and an entry in the table above and on the landing page.

## Contact

Maintained by Julius Sommer. Questions or ideas for a demo: open an issue.

# web-site-demos

Interactive browser demos from the Urakawa group at TU Delft: spectroscopy,
kinetics, reactors and instruments, explained by playing with them.

Each demo is one self-contained web page. Open it, move the sliders, watch what
happens. Nothing to install, no account, no build step.

## Demos

| demo | field | what it shows |
|---|---|---|
| *none yet* | | |

## Layout

```
index.html                          landing page that links every demo
demos/<field>/<demo>/index.html     one demo, self-contained
```

`<field>` is the subject area (`spectroscopy`, `kinetics`, `reactors`,
`sorption`, ...), `<demo>` a short lowercase name with hyphens (`mes`,
`plug-flow`). A demo can be opened straight from disk by double-clicking its
`index.html`. Once GitHub Pages is switched on for this repository, every demo
also gets its own address:
`https://urakawa-group.github.io/web-site-demos/demos/<field>/<demo>/`.

## Adding a demo

The rules are in [`AGENTS.md`](AGENTS.md), for people and coding assistants
alike. In short: one folder, one page, the concept in its simplest form, every
number with its source, and an entry in the table above and on the landing page.

## Contact

Maintained by Julius Sommer. Questions or ideas for a demo: open an issue.

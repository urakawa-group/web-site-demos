# AGENTS.md

Rules for working in this repository, for people and coding assistants alike.
What the repository is and how it is laid out is in [`README.md`](README.md);
this file does not repeat it.

## What a demo is

A demo explains *how something works*: a method, a concept, a piece of maths,
an instrument. It does not show results or data from a project. The reader
should understand the idea by changing something and watching the response.

- **Concept first.** Show the idea in its most basic form: the equations as the
  concept is known by (textbook or original-paper formulation, with its symbols),
  and the simplest numbers that make the point. Never more abstract than the
  concept it explains.
- **One idea per demo.** If a demo needs a second idea to make sense, that is a
  second demo, linked from the first.
- **Short text.** A title, one or two sentences on what the reader will see, the
  controls, the plots. Longer explanation goes in a collapsible section below,
  not above the demo.

## How a demo is built

- One folder `demos/<field>/<demo>/` with one `index.html`. Markup, styles and
  script are inline in that file. Images or data the demo needs sit next to it
  in the same folder.
- Plain HTML, CSS and JavaScript. No framework, no npm, no build step. If a
  library is really needed, put a pinned copy in the demo folder rather than
  linking a CDN.
- It must work opened straight from disk, without a server, and on a phone
  width as well as a desktop.
- No analytics, no cookies, no tracking, no external requests. Fonts included:
  Source Sans 3 is used for all text, served from this repository rather than
  Google Fonts, which would send every visitor's address to Google. Link it with
  `<link rel="stylesheet" href="../../../assets/fonts/source-sans-3/source-sans-3.css">`;
  it is the one shared file a demo may use.
- Every `index.html` starts with a comment block: what the demo shows, the
  model and equations behind it, its sources, author and date.

## Numbers and references

- Every physical constant, literature value or parameter that is not made up for
  illustration has a source, in a comment next to it and on the page where the
  reader sees it.
- Made-up numbers are fine for showing a concept, but the page says they are
  illustrative.
- A reference shown on the page reads
  `<first author> et al. (<group lead>), <journal abbreviation> <year>`, e.g.
  `Urakawa et al., J. Phys. Chem. C 2019`. The bracket names the professor
  behind the paper and is dropped when the first author is that person.
  Journal abbreviations in ISO 4 form, with dots.

## Text and plot style

The same conventions as the group's other code and figures:

- No em dashes. Use a comma, a period or a separate sentence.
- Capitals only in titles, at the start of a sentence and in proper nouns. Axis
  labels, tick labels, legend entries and other text inside a plot are lowercase.
- Axis labels read `quantity / unit`, e.g. `time / s`, `temperature / K`. A
  dimensionless quantity gets an en dash: `fraction / –`.
- Units in power notation, not slashes: m² s⁻¹, mol m⁻³ s⁻¹, not m²/s.
- Subscripts identify (species, role, method: <i>S</i><sub>MeOH</sub>,
  <i>E</i><sub>a</sub>), superscripts are for the state or reference
  (<i>p</i>°).
- Chemical formulas with real subscripts and superscripts: CO<sub>2</sub>,
  Al<sup>3+</sup>, never CO2 in visible text.
- Quantities in italic, units and words upright.

## Adding a demo, checklist

1. Create `demos/<field>/<demo>/index.html` following the rules above.
2. Add a row to the table in [`README.md`](README.md) and a link on the landing
   page `index.html`.
3. Open it from disk in a browser, at desktop and phone width, and check every
   control does what the text says.
4. One demo per commit: `Add <field>/<demo> demo`, later changes as
   `<demo>: <what changed>`.

## Coding assistants

Coding assistants (Claude and others) are welcome here and are credited once,
in the acknowledgement of [`README.md`](README.md). Not in the history:

- No `Co-Authored-By` or other assistant trailers in commit messages, and no
  "generated with" lines in pull requests. The commit author is the person who
  checked the change and answers for it.
- Commit under the maintainer's name and e-mail, never as the assistant.

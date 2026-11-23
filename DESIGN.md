# Design: web-site-demos

The locked system. This site already has a design system; every Hallmark run reads this file first and works inside it. Change it on purpose; the file is the rule.

## System
- Genre: custom, the house system of the Urakawa group demos. Teaching tools and workbenches, not landing pages.
- Theme: none. Do not deal a theme, pick fonts or propose a direction.
- Shape: hub, sub-page and workbench pages as `AGENTS.md` describes. A new demo copies the structure of an existing one.

## Tokens
`assets/tokens.js` is the single source of truth for every colour, type role, radius, spacing step, chart constant, presentation setting, writing rule and editorial limit. `installTokens()` writes them into `:root`; `style-guide.html` renders from the same objects.
- CSS uses `var(--token)`; a canvas imports `C`, `CHART` or `typeFont()`.
- Colours are the PhD colour scheme (`SCHEME`, copied from phd_ui), with the data roles fixed in `AGENTS.md`.
- The font is Source Sans 3 from `assets/fonts/`. Never Google Fonts, never a CDN.
- Plain HTML, CSS and JavaScript modules on the shared layer in `assets/` (`shell.js`, `site.css`, `plot.js`, `cite.js`, `workbench.js`). No framework, no npm, no build step.
- Responsive rules key off `<html data-w>`, never `@media (max-width)`; the presentation view is a zoom plus subtractions.

## Writing
- `WRITING_RULES` in `tokens.js`, shown on the style guide. No em dashes; axis labels `quantity / unit`.
- Full rules: `AGENTS.md`.

## Hallmark in this repo
- Tokens stay in `tokens.js`. No `tokens.css`, no second `:root` block, no parallel token file.
- No Hallmark stamp or critique line in any CSS, no `.hallmark/` folder in the repository.
- No analytics, cookies or requests to another server, so no external fonts, images or comps.
- Existing pages change only as asked, in this system. `redesign` and `audit` only when Julius names them; an audit reports and changes nothing.
- Where a Hallmark gate and this system disagree, this system wins; waive the gate on the record as "house system".

/**
 * Design tokens: the single source of truth for every colour, typeface, size,
 * radius, spacing step, chart constant and editorial limit on this site.
 *
 * Rules of the road (the same as in IR-bands' tokens.ts):
 *   1. No page and no demo hard-codes a colour, font size or font weight. Use
 *      the CSS custom property a token emits, or import the token here where a
 *      value has to reach JavaScript (a canvas cannot read CSS variables).
 *   2. Change a value here and it changes everywhere: installTokens() writes
 *      every token into :root before anything renders, and style-guide.html
 *      renders itself from these same objects, so the guide cannot drift.
 *   3. Adding a token means adding it here with a `usage` note. That note is
 *      the text the style guide shows next to it, so write it for a reader.
 *
 * CSS variable naming:
 *   colours     --<token-name>        e.g. var(--ink-700)
 *   typography  --t-<role>-<prop>     e.g. var(--t-body-size)
 *               props: size | weight | color | ff | lh | ls | tt | fs
 *   layout      --radius-* --space-* --shadow-*
 */

/* ---------------------------------------------------------------------------
   The PhD colour scheme (phd_ui/colors/scheme.py), copied verbatim. Every
   colour below is one of these tones; the scheme itself is shown on the style
   guide so a figure made in Python and a demo made here share one palette.
   --------------------------------------------------------------------------- */

export const SCHEME = {
  pink:   { light: '#d67394', base: '#c94c7b', dark: '#7b2b49', darkest: '#530b2b', line: '#c93f76' },
  orange: { light: '#e1805d', base: '#d55b2a', dark: '#903d1f', darkest: '#5a1b00', line: '#db551a' },
  red:    { light: '#cf7d75', base: '#c05449', dark: '#6a302a', darkest: '#4f1d17', line: '#c44036' },
  amber:  { light: '#dbbb7a', base: '#cfa44b', dark: '#7d6128', darkest: '#624915', line: '#ba8904' },
  green:  { light: '#7bc6a1', base: '#42a975', dark: '#29704f', darkest: '#184e37', line: '#02985f' },
  blue:   { light: '#83c0e9', base: '#6fc1e4', dark: '#306f8e', darkest: '#1e485c', line: '#0186ae' },
  purple: { light: '#908cc4', base: '#6863ac', dark: '#39375f', darkest: '#27265f', line: '#6353c5' },
  grey:   { light: '#c3c8cf', base: '#9aa1ac', dark: '#5e6570', darkest: '#3f4245', line: '#79818c' },
  sand:   { light: '#f4f3f1', base: '#e3dfd8', dark: '#aca08b', darkest: '#827359', line: '#827359' },
  ink:    { light: '#675f56', base: '#413b34', dark: '#2e2924', darkest: '#1d1a16', line: '#413b34' },
};

export const SCHEME_NOTE =
  'Ten hues, four fill tones each (light, base, dark, darkest) and one line tone. ' +
  'Fills use base, strokes and markers in a plot use line. Copied from phd_ui, never edited here.';

/* ---------------------------------------------------------------------------
   Colour roles
   --------------------------------------------------------------------------- */

export const COLOR_GROUPS = [
  {
    key: 'ink',
    title: 'Ink',
    note: 'Text, darkest to lightest. Pick by role, not by taste: titles ink-900, body ink-700, secondary ink-500, meta ink-300.',
    tokens: {
      'ink-900': { value: SCHEME.ink.darkest, usage: 'Page and card titles, the value of a control' },
      'ink-700': { value: SCHEME.ink.base, usage: 'Body text, plot frames and tick marks' },
      'ink-500': { value: SCHEME.ink.light, usage: 'Secondary text: leads, panel subtitles, control labels, axis labels' },
      'ink-300': { value: SCHEME.grey.dark, usage: 'Meta text: tick labels, footnotes, keyboard hints' },
    },
  },
  {
    key: 'surface',
    title: 'Surfaces and Lines',
    note: 'Neutral chrome. The page is warm sand, everything the reader works with sits on white.',
    tokens: {
      'surface':        { value: '#ffffff', usage: 'Panels, cards, plot backgrounds' },
      'surface-page':   { value: SCHEME.sand.light, usage: 'Page canvas behind the panels' },
      'surface-hover':  { value: SCHEME.sand.base, usage: 'Hovered button, card or row' },
      'line':           { value: SCHEME.grey.light, usage: 'Control borders: buttons, selects, sliders' },
      'line-soft':      { value: SCHEME.sand.base, usage: 'Panel borders, dividers, table rules' },
      'line-zero':      { value: SCHEME.grey.light, usage: 'The zero line inside a plot' },
    },
  },
  {
    key: 'accent',
    title: 'Accent',
    note: 'Blue, for navigation and for "this is active". Never used to encode data, so it can never be mistaken for a series.',
    tokens: {
      'accent':        { value: SCHEME.blue.dark, usage: 'Links, active case, active button, slider thumb' },
      'accent-strong': { value: SCHEME.blue.darkest, usage: 'Header band, hovered link' },
      'accent-tint':   { value: '#e7f2f8', usage: 'Background of the active case and the active view button (blue light at about 20 % on white)' },
      'on-accent':     { value: '#ffffff', usage: 'Text on the header band and on an active button' },
    },
  },
  {
    key: 'ref',
    title: 'Reference Parchment',
    note: 'Reserved for citations: the reference list and the superscript numbers. Warm sand, so a citation reads as one at a glance.',
    tokens: {
      'ref-surface': { value: SCHEME.sand.light, usage: 'Reference list background' },
      'ref-border':  { value: SCHEME.sand.base, usage: 'Reference list border' },
      'ref-accent':  { value: SCHEME.sand.dark, usage: 'Left edge of a reference entry, 3px' },
      'ref-text':    { value: SCHEME.sand.darkest, usage: 'Citation numbers and the locator line' },
    },
  },
  {
    key: 'data',
    title: 'Data Roles',
    note: 'What a colour means in a demo plot, the same in every demo and in the phd_ui figures of the MES tutorials: red is the first half-period (stimulus on), blue the second, the first species orange, the second ink grey.',
    tokens: {
      'data-on':        { value: SCHEME.red.line, usage: 'Stimulus on: the first half-period, its shading and its spectra' },
      'data-off':       { value: SCHEME.blue.line, usage: 'Stimulus off: the second half-period' },
      'data-a':         { value: SCHEME.orange.line, usage: 'Signal or band A, the first species of a case, and the one signal of a page that has only one' },
      'data-b':         { value: SCHEME.ink.base, usage: 'Signal or band B, the second species' },
      'data-c':         { value: SCHEME.purple.line, usage: 'A third species, where a case has one' },
      'data-d':         { value: SCHEME.pink.line, usage: 'A fourth species that follows the stimulus, e.g. one the reader adds' },
      'data-e':         { value: SCHEME.sand.darkest, usage: 'A fifth species that follows the stimulus' },
      'data-static':    { value: SCHEME.grey.line, usage: 'Static signal: support, spectators, anything that does not follow the stimulus' },
      'data-stimulus':  { value: SCHEME.grey.dark, usage: 'The stimulus trace itself, drawn dashed' },
      'data-highlight': { value: SCHEME.green.line, usage: 'The one trace the reader should look at: the phase-resolved spectrum at the chosen angle' },
      'data-faint':     { value: 'rgba(94,101,112,0.28)', usage: 'Many traces at once (grey dark at 28 %): the spectra of one period, the other phase angles' },
      'shade-on':       { value: 'rgba(196,64,54,0.08)', usage: 'Background of the stimulus-on half in a time plot (red line at 8 %)' },
      'shade-off':      { value: 'rgba(1,134,174,0.08)', usage: 'Background of the stimulus-off half (blue line at 8 %)' },
      'map-pos':        { value: SCHEME.red.line, usage: 'Positive values: halfway up a diverging colour map (blue, white, red, as cmocean balance) and the positive area under a product curve. A plot that uses it shows no on/off shading, so red is never read as stimulus on there' },
      'map-pos-strong': { value: SCHEME.red.darkest, usage: 'The largest positive value of a diverging colour map' },
      'map-neg':        { value: SCHEME.blue.line, usage: 'Negative values: halfway down a diverging colour map, and the negative area under a product curve' },
      'map-neg-strong': { value: SCHEME.blue.darkest, usage: 'The most negative value of a diverging colour map' },
    },
  },
];

/** Flat lookup: C['ink-700'] → '#413b34'. */
export const C = Object.fromEntries(COLOR_GROUPS.flatMap(g => Object.entries(g.tokens).map(([k, t]) => [k, t.value])));

/* ---------------------------------------------------------------------------
   Typography
   --------------------------------------------------------------------------- */

export const FONTS = {
  sans: "'Source Sans 3', Arial, sans-serif",
  mono: "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace",
};

export const FONTS_NOTE =
  'Source Sans 3 for every word on the site, bundled in assets/fonts (OFL), no CDN. Hierarchy by size and weight, never by a second family. ' +
  'Quantities italic, units and words upright. Monospace only for file names and identifiers.';

export const TYPE_GROUPS = [
  {
    key: 'page',
    title: 'Page Level',
    note: 'Every page, the landing page, a demo, the Impressum and this guide, uses these roles and nothing else for its prose.',
    roles: [
      { key: 'page-title',   label: 'Page title',      usage: 'One per page, top of the content column, Title Case', size: '30px', weight: 700, color: 'ink-900', lh: '1.15', ls: '-0.01em' },
      { key: 'lead',         label: 'Lead',            usage: 'One or two sentences under the page title: what the reader will see', size: '17px', weight: 400, color: 'ink-500', lh: '1.5' },
      { key: 'section-head', label: 'Section heading', usage: 'Uppercase eyebrow over a section, with a hairline under it', size: '13px', weight: 700, color: 'ink-500', tt: 'uppercase', ls: '0.07em' },
      { key: 'body',         label: 'Body',            usage: 'Prose paragraphs, at most 760px wide', size: '16px', weight: 400, color: 'ink-700', lh: '1.6' },
      { key: 'label',        label: 'Field label',     usage: 'Left column of a key/value grid', size: '15px', weight: 600, color: 'ink-500', lh: '1.5' },
      { key: 'code',         label: 'Code / file name', usage: 'File names, identifiers, keys', size: '13px', weight: 400, color: 'ink-500', family: 'mono' },
    ],
  },
  {
    key: 'chrome',
    title: 'Site Chrome',
    note: 'Header, footer and the cards that lead somewhere. Fixed sizes.',
    roles: [
      { key: 'wordmark',   label: 'Wordmark',    usage: 'Site name in the header band', size: '19px', weight: 700, color: 'on-accent', ls: '-0.005em' },
      { key: 'nav',        label: 'Nav item',    usage: 'Header links', size: '15px', weight: 600, color: 'on-accent' },
      { key: 'card-title', label: 'Card title',  usage: 'One line, names the demo or the page a card leads to', size: '18px', weight: 600, color: 'accent' },
      { key: 'card-desc',  label: 'Card text',   usage: 'Two or three lines under a card title', size: '15px', weight: 400, color: 'ink-500', lh: '1.5' },
      { key: 'footer',     label: 'Footer',      usage: 'The one line at the bottom of every page', size: '13px', weight: 400, color: 'ink-300' },
    ],
  },
  {
    key: 'demo',
    title: 'Demo Controls and Panels',
    note: 'Everything around a plot. A control says its name and its current value; a panel says what it shows in a title and how to read it in a subtitle.',
    roles: [
      { key: 'control',       label: 'Control label', usage: 'Name of a slider, select or switch', size: '14px', weight: 400, color: 'ink-500' },
      { key: 'control-value', label: 'Control value', usage: 'The current value beside a control label', size: '14px', weight: 600, color: 'ink-900' },
      { key: 'button',        label: 'Button',        usage: 'View switch, play, menu items', size: '14.5px', weight: 600, color: 'ink-700' },
      { key: 'case-current',  label: 'Current case',  usage: 'The case selector closed: the case on screen, beside the title', size: '17px', weight: 600, color: 'accent' },
      { key: 'panel-title',   label: 'Panel title',   usage: 'Numbered: "1 · Time Domain"', size: '16px', weight: 600, color: 'ink-900' },
      { key: 'panel-sub',     label: 'Panel subtitle', usage: 'One line under a panel title: how to read the plot', size: '13.5px', weight: 400, color: 'ink-500', lh: '1.4' },
      { key: 'formula',       label: 'Formula',       usage: 'The equation in an equation callout. Fractions stack, an integral carries its limits; running prose keeps 2/π on one line. The callout around it: header in panel-title, explanation and symbol list in panel-sub', size: '19px', weight: 400, color: 'ink-900', lh: '1.4' },
      { key: 'table',         label: 'Table',         usage: 'The readout table under the panels', size: '14px', weight: 400, color: 'ink-700' },
      { key: 'table-head',    label: 'Table header',  usage: 'Column names of a readout table', size: '13px', weight: 600, color: 'ink-500' },
    ],
  },
  {
    key: 'plot',
    title: 'Inside a Plot',
    note: 'Text a canvas draws on itself. Lowercase, axis labels as "quantity / unit". The smallest text on the site is a tick label.',
    roles: [
      { key: 'axis',       label: 'Axis label',  usage: '"time / T", "wavenumber / cm⁻¹", "absorbance / –"', size: '13px', weight: 400, color: 'ink-500' },
      { key: 'tick',       label: 'Tick label',  usage: 'Numbers on an axis; the floor for any text on the site', size: '12px', weight: 400, color: 'ink-300' },
      { key: 'annotation', label: 'Annotation',  usage: 'A label placed on the data: a band name, "warm-up"', size: '13px', weight: 600, color: 'ink-500' },
    ],
  },
  {
    key: 'cite',
    title: 'Citations',
    note: 'A citation is a number in the text and an entry in the list under it. The entry leads with the group short form, then the full reference.',
    roles: [
      { key: 'cite-sup',  label: 'Citation number', usage: 'Superscript in running text, links to the entry', size: '11.5px', weight: 600, color: 'ref-text' },
      { key: 'ref-short', label: 'Short form',      usage: '"Urakawa et al., Chem. Eng. Sci. 2008", first line of an entry', size: '14.5px', weight: 600, color: 'ink-900' },
      { key: 'ref-full',  label: 'Full reference',  usage: 'Authors, title, journal, volume, pages, year, DOI', size: '13.5px', weight: 400, color: 'ink-500', lh: '1.45' },
      { key: 'ref-loc',   label: 'Locator',         usage: 'Where in the work: "Eq. 2", "Fig. 42.1"', size: '13px', weight: 400, color: 'ref-text', fs: 'italic' },
    ],
  },
];

export const TYPE_ROLES = TYPE_GROUPS.flatMap(g => g.roles);

/** A type role's resolved values for canvas text: font string and colour. */
export function typeFont(key) {
  const r = TYPE_ROLES.find(t => t.key === key);
  if (!r) throw new Error(`unknown type role ${key}`);
  return {
    font: `${r.fs === 'italic' ? 'italic ' : ''}${r.weight} ${r.size} ${r.family === 'mono' ? FONTS.mono : FONTS.sans}`,
    color: C[r.color],
  };
}

/* ---------------------------------------------------------------------------
   Shape and rhythm
   --------------------------------------------------------------------------- */

export const RADII = {
  'radius-sm': { value: '4px', usage: 'Buttons, selects, pills' },
  'radius':    { value: '6px', usage: 'Panels, the reference list' },
  'radius-lg': { value: '10px', usage: 'Cards on the landing page' },
};

export const SPACING = {
  'space-1': { value: '4px', usage: 'Inside a control: label to value' },
  'space-2': { value: '8px', usage: 'Between buttons in a row' },
  'space-3': { value: '12px', usage: 'Panel padding, gap between panels' },
  'space-4': { value: '18px', usage: 'Between control groups' },
  'space-5': { value: '28px', usage: 'Page side padding, between sections' },
  'space-6': { value: '44px', usage: 'Above the footer, between page parts' },
};

export const SHADOWS = {
  'shadow-card': { value: '0 4px 16px rgba(30,72,92,0.12)', usage: 'A card, hovered (blue darkest at 12 %)' },
  'shadow-menu': { value: '0 6px 20px rgba(30,72,92,0.18)', usage: 'An open menu: the case selector (blue darkest at 18 %)' },
};

export const PAGE_LAYOUT = {
  'Content column': { value: '760px max', usage: 'Prose: the landing page, the Impressum, the explanation under a demo. Never full-bleed text' },
  'Demo width':     { value: '1760px max', usage: 'A demo page: the plots get the width, prose inside it stays at 760px' },
  'Demo head':      { value: '2 : 1', usage: 'Title and lead on the left two thirds, the case selector on the right third, top-aligned' },
  'Panel grid':     { value: '2 × 2 from mid', usage: 'Four panels, one column on a compact shell' },
  'Header':         { value: '56px band', usage: 'Accent-strong band, wordmark left, links right' },
  'Workbench':      { value: '360px · rest · 340px', usage: 'A page with cases on a wide screen: settings panel left, plots in the centre sized to the window, values panel right; both panels full height and collapsible, the left one to a rail of quick switches' },
};

/* ---------------------------------------------------------------------------
   Width steps. The shell measures itself and writes <html data-w="…">;
   layout rules key off that attribute, never off a media query, so they stay
   right when presentation mode zooms the page.
   --------------------------------------------------------------------------- */

export const WIDTH_CLASSES = [
  { key: 'compact', max: 720, usage: 'A phone, or a zoomed shell about that narrow: one column of panels, controls stacked' },
  { key: 'mid', max: 1180, usage: 'A tablet or half a desktop window: two columns of panels, controls wrap' },
  { key: 'wide', max: Infinity, usage: 'The layout a demo is drawn for: two columns of panels at full height' },
];

export function widthClass(px) {
  for (const w of WIDTH_CLASSES) if (px <= w.max) return w.key;
  return 'wide';
}

/* ---------------------------------------------------------------------------
   The two views
   --------------------------------------------------------------------------- */

/**
 * Desktop is the default view: everything on, read at arm's length.
 *
 * Presentation is a demo on a screen at the front of a room. As in IR-bands
 * the problem there is angular size, not density, so the view is a
 * magnification first (one CSS zoom on the page, which reflows rather than
 * paints bigger) and a short list of subtractions second. Reached three
 * ways, all the same state: Shift+P, ?present=1 (or ?present=1.75 to name
 * the scale) and the view switch in the header. + and − step the scale,
 * Escape leaves.
 */
export const PRESENTATION = {
  scales: [1.25, 1.5, 1.75, 2],
  defaultScale: 1.5,
  subtractions: [
    { what: 'The site header and footer', why: 'Navigation for a reader at a desk. On a wall it is a band of nothing that costs an eighth of the screen.' },
    { what: 'The lead under the title', why: 'The presenter says it. The title stays, so the room knows what it is looking at.' },
    { what: 'The breadcrumb above the title of a sub-page', why: 'It is for finding the sibling page at a desk. The presenter switches pages with the address bar or a link, the room does not need the path.' },
    { what: 'The explanation and the reference list', why: 'Prose is read at a desk, not from the back of a room. The citation numbers in the panel subtitles stay, so a slide photographed by a student still says where the equation comes from.' },
  ],
};

/* ---------------------------------------------------------------------------
   Charts
   --------------------------------------------------------------------------- */

export const CHART = {
  height: 270,            // px, a panel's canvas on desktop
  heightCompact: 230,     // px, on a compact shell
  margin: { l: 52, r: 14, t: 12, b: 40 },
  lineData: 2,            // px, a data trace
  lineThin: 1.2,          // px, a noisy raw trace, the stimulus
  lineFaint: 1,           // px, one of many traces
  lineHighlight: 2.8,     // px, the trace the reader should look at
  lineFrame: 1,           // px, the plot frame
  dash: [5, 4],           // the stimulus and anything that is not a measured signal
  marker: 5,              // px radius, a maximum or a chosen point
  workbenchScale: 1.5,    // text in the centre of a workbench page, plots and panel titles
};

export const CHART_DOCS = [
  { name: 'Canvas height', value: `${CHART.height}px, ${CHART.heightCompact}px compact`, usage: 'Every panel the same height, so a 2 × 2 grid lines up' },
  { name: 'Data line', value: `${CHART.lineData}px`, usage: 'One trace per band or signal' },
  { name: 'Thin line', value: `${CHART.lineThin}px`, usage: 'Raw, noisy traces and the stimulus' },
  { name: 'Faint line', value: `${CHART.lineFaint}px in data-faint`, usage: 'Many traces at once: the spectra of one period, every phase angle' },
  { name: 'Highlight', value: `${CHART.lineHighlight}px`, usage: 'The single trace that answers the panel\'s question' },
  { name: 'Dash', value: CHART.dash.join(' / ') + ' px', usage: 'The stimulus, and only things that are not measured signals' },
  { name: 'Frame', value: `${CHART.lineFrame}px ink-700`, usage: 'A closed box round every plot, ticks outside' },
  { name: 'Workbench text', value: `${CHART.workbenchScale}×`, usage: 'Every text in the centre of a workbench page (panel titles, subtitles, legends, ticks, axis labels) at this multiple of its role, on a wide screen. The plots fill the window there, so normal sizes read small' },
];

/* ---------------------------------------------------------------------------
   Writing rules and editorial limits
   --------------------------------------------------------------------------- */

export const WRITING_RULES = [
  { rule: 'No em dashes', detail: 'A comma, a period or a separate sentence. The en dash is for ranges (967–978) and for a dimensionless unit (fraction / –).' },
  { rule: 'Title Case for headings', detail: 'Page titles, section and panel titles capitalise every major word and keep articles and short prepositions small: "Reading the Phase Domain". Everything inside a plot is lowercase.' },
  { rule: 'Axis labels read quantity / unit', detail: '"time / T", "wavenumber / cm⁻¹", "phase-resolved absorbance / –". Running text says "in cm⁻¹" instead.' },
  { rule: 'Fractions stack in a formula box, not in prose', detail: 'A formula box sets 2/T, (360° − φ<sub>max</sub>)/360° and 1/√(1 + (ωτ)²) as stacked fractions; running text writes them on one line.' },
  { rule: 'Units in powers', detail: 'm² s⁻¹, mol m⁻³ s⁻¹, never m²/s.' },
  { rule: 'Unicode, not markup, for formulas in text', detail: 'CO₂, cm⁻¹, Cu²⁺, A₁. Only a letter subscript Unicode has no character for (t<sub>con</sub>, φ<sub>max</sub>) is written with &lt;sub&gt;. Never bare CO2 in visible text.' },
  { rule: 'Subscripts identify, superscripts state', detail: 'φ<sub>max</sub>, t<sub>con</sub>, A<sub>k</sub> name which one; φ<sup>PSD</sup> or p° give the state or reference.' },
  { rule: 'Quantities italic, words upright', detail: '<i>T</i>, <i>τ</i>, <i>φ</i>, <i>k</i> are italic; "on", "max", "con" in a subscript are upright.' },
  { rule: 'Every number has a source or says it is illustrative', detail: 'A literature value carries a citation; a made-up one sits on a page that says so.' },
  { rule: 'Citations', detail: 'In text, a marker [@alias, locator] that becomes a number. In the list, the group short form first: "<first author> et al. (<group lead>), <journal ISO 4> <year>", the bracket dropped when the first author is the group lead.' },
];

export const CONTENT_LIMITS = [
  { what: 'Lead under a page title', max: 50, usage: 'What the reader will see, not how it works' },
  { what: 'Explanation of one demo case', max: 130, usage: 'One idea; a second idea is a second case' },
  { what: 'Panel subtitle', max: 25, usage: 'How to read the plot, one line' },
];

/* ---------------------------------------------------------------------------
   Install
   --------------------------------------------------------------------------- */

function typeVars(r) {
  const p = `--t-${r.key}`;
  const out = [
    `${p}-size: ${r.size};`,
    `${p}-weight: ${r.weight};`,
    `${p}-color: var(--${r.color});`,
    `${p}-ff: var(--font-${r.family ?? 'sans'});`,
    `${p}-lh: ${r.lh ?? 'normal'};`,
    `${p}-ls: ${r.ls ?? 'normal'};`,
    `${p}-tt: ${r.tt ?? 'none'};`,
    `${p}-fs: ${r.fs ?? 'normal'};`,
  ];
  return out.map(l => '  ' + l);
}

export function tokenCss() {
  const lines = [':root {', `  --font-sans: ${FONTS.sans};`, `  --font-mono: ${FONTS.mono};`];
  for (const g of COLOR_GROUPS) for (const [n, t] of Object.entries(g.tokens)) lines.push(`  --${n}: ${t.value};`);
  for (const r of TYPE_ROLES) lines.push(...typeVars(r));
  for (const map of [RADII, SPACING, SHADOWS]) for (const [n, t] of Object.entries(map)) lines.push(`  --${n}: ${t.value};`);
  lines.push(`  --chart-h: ${CHART.height}px;`, `  --chart-h-compact: ${CHART.heightCompact}px;`, `  --wb-text-scale: ${CHART.workbenchScale};`, '}');
  return lines.join('\n');
}

export function installTokens() {
  if (document.getElementById('design-tokens')) return;
  const el = document.createElement('style');
  el.id = 'design-tokens';
  el.textContent = tokenCss();
  document.head.prepend(el);
}

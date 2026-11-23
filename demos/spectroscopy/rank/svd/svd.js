/**
 * Rank · SVD: a series of mixture spectra X, its singular value
 * decomposition, and the plots that decide how many components it holds.
 * See the comment block in index.html for the model and the sources; the
 * case texts carry the citations.
 */
import { initShell } from '../../../../assets/shell.js';
import { C, CHART } from '../../../../assets/tokens.js';
import { plot } from '../../../../assets/plot.js';
import { renderCitations } from '../../../../assets/cite.js';
import { svd, sumSq, fTail } from '../../../../assets/linalg.js';
import {
  fitWorkbench, initWorkbench, valueControls, foldingGroups, caseSelector, tooltip,
  setSeg, rail, grip, dragRuler, localIn, clamp, reserveLegends,
} from '../../../../assets/workbench.js';
import { T_END, build } from '../mixture.js';
import {
  $, clone, M, SOURCES as COMMON_SOURCES, DATA_BASE, caseOf, XAS_SPECIES, KEPT, DROPPED, CUT, LEVEL, COLOR,
  residual, fmtS, fmtPct, SC, T_TICKS, XLAB_T, axOf, xRangeOf, LOG_TICKS, legend, legendHtml, heatmap, MAP_LEGEND,
  dataLimits, drawData, dataLegends, drawBlocks, BLOCK_LEGEND, BLOCK_LEGEND_STATIC, dataControls, techniqueSwitch, carriedData,
  callout, frac, sum, EQ_BILINEAR, EQ_NOISE,
} from '../common.js';

initShell({ page: 'demo', views: true });

const SOURCES = { ...COMMON_SOURCES, malinowski: { key: 'Malinowski.StatisticalFtestsAbstract.1989', journal: 'J. Chemom.' } };

/* ---------------------------------------------------------------------------
   Settings: the data (common.js) plus
     n      components kept (what the reader decides, not the data)
     view1  'spectra' | 'map' | 'truth';  view2 'scree' | 'ftest';  view3 'loadings' | 'scores' | 'plane'
     view4  'blocks' | 'numbers' | 'residual' | 'lof'
   --------------------------------------------------------------------------- */
const NMAX = 10, NTAB = 10;
const base = { ...clone(DATA_BASE), n: 3, view1: 'spectra', view2: 'scree', view3: 'loadings', view4: 'blocks' };
const DISPLAY_ONLY = ['n', 'view1', 'view2', 'view3', 'view4'];
const cs = (o, f) => caseOf(base, o, f);

const CASES = [
  {
    id: 'one', title: 'One Species, No Noise', s: cs({ n: 1, k1: 0.05 }, { B: { on: false }, C: { on: false } }),
    text: `<p>Only A is on, so every spectrum is the same band, scaled by how much A is left: <b>X</b> is one spectrum times one profile, rank 1. The first singular value carries all of <b>X</b>; the second is rounding, below the floor of the plot, and the lack of fit at <i>n</i> = 1 is zero.</p>
      <p>The loading of component 1 is the band of A, scaled to unit length, and its score in time is the decay of A. In the matrix view <b>U</b>, diag(<b>σ</b>) and <b>V</b><sup>T</sup> shrink to one column, one number and one row. With one species the SVD hands back the species itself, up to a scale.</p>`,
  },
  {
    id: 'two', title: 'Two Species, No Noise', s: cs({ n: 2, k1: 0.06, k2: 0 }, { C: { on: false } }),
    text: `<p>A turns into B and nothing else, so A + B = 1 at every time: the closure that normalised XAS data obey [@ch29, p. 627]. The rank is still 2, because <b>X</b> = <b>s</b><sub>B</sub> + A (<b>s</b><sub>A</sub> − <b>s</b><sub>B</sub>): a fixed spectrum plus one that changes. Two singular values, then rounding.</p>
      <p>Look at the loadings: component 1 is close to the average spectrum, component 2 has a positive and a negative band. Neither is a species. The SVD orders by size and makes the components orthogonal; real spectra are neither.</p>`,
  },
  {
    id: 'three', title: 'Three Species with Noise', s: cs({ n: 3, noise: 0.004 }),
    text: `<p>A → B → C with noise. The scree plot falls steeply for three components and then runs flat: from the fourth on the singular values are noise, at the level drawn dashed. The rank is the number of points before the flat tail starts [@ch29, Fig. 29.2a, p. 629].</p>
      <p>Switch panel 3 to "in time": the first three scores are smooth curves, the fourth is noise, as in the 1D score trajectory plots of the chapter [@ch29, Fig. 29.2c, p. 630]. Keep <i>n</i> = 2 and the <b>E</b> block (matrix, numbers) shows a pattern; at 4 it shows only speckle.</p>`,
  },
  {
    id: 'weak', title: 'A Short-Lived Intermediate', s: cs({ n: 2, k1: 0.25, k2: 1, noise: 0.008 }, { B: { h: 0.3 } }),
    text: `<p>B forms fast and is used up faster, so it reaches at most about 16 % and only in the first few spectra. Its component carries little of <b>X</b>, and its singular value sits just above the flat tail.</p>
      <p>Rank 2 or 3? Compare <i>n</i> = 2 and 3 in panel 4: the lack of fit hardly changes, but the residual at <i>n</i> = 2 has a stripe at the start of the run. The difficulty is the choice of the rank, not the SVD [@ch29, p. 628]: read the scree plot, the scores in time and the residual together.</p>`,
  },
  {
    id: 'ftest', title: 'Counting by Statistics', s: cs({ n: 2, k1: 0.25, k2: 1, noise: 0.008, view2: 'ftest' }, { B: { h: 0.3 } }),
    text: `<p>The short-lived intermediate again, with the rank counted by a test instead of by eye. Malinowski's F-test compares each eigenvalue, reduced by its degrees of freedom, with the pool of all smaller ones; the bars give the significance level of each component [@malinowski, Eq. 19, p. 52].</p>
      <p>Read from the last component upwards and stop at the first one below the chosen level [@malinowski, p. 56]. Here component 3 sits at about 11 %: outside the "grey" region between 5 and 10 % that the paper describes, so the test says 2. Lower the noise in the measurement group and it moves below 5 %.</p>`,
  },
  {
    id: 'overlap', title: 'Overlapping Bands', s: cs({ n: 3, noise: 0.008 }, { A: { c: 1540, w: 80 }, B: { c: 1520, w: 80 }, C: { c: 1500, w: 80 } }),
    text: `<p>Three species whose bands lie 20 cm⁻¹ apart and are four times as wide. The data are still rank 3, but the spectra are so alike that the third component carries little and its singular value comes down towards the noise. Similar spectra are one of the two causes of rank deficiency [@ch29, p. 633].</p>
      <p>Move the band of C to 1350 cm⁻¹ in its card and watch <i>σ</i>₃ climb out of the noise. The rank counts the directions in which the spectra differ, not bands and not species.</p>`,
  },
  {
    id: 'coevolve', title: 'Two Species, One Profile', s: cs({ n: 3, noise: 0.003 }, { D: { on: true } }),
    text: `<p>D forms with exactly the profile of C, like two phases that grow together. Four species, but the SVD finds three components: C and D always come in the same ratio, so to the data they are one species with the sum of their spectra. This is rank deficiency from co-evolving concentrations [@ch29, p. 633].</p>
      <p>No choice of <i>n</i> fixes it; the information is not in this data set. The chapter breaks it with a second run in which the two form in another ratio, analysed together with the first [@ch29, Fig. 29.6]. Set D to "grows over the run" and a fourth component appears.</p>`,
  },
  {
    id: 'parallel', title: 'Two Products in Parallel', s: cs({ n: 2, noise: 0.004 }, { C: { src: 'from:A', k: 0.04 } }),
    text: `<p>B and C both form from A, side by side, at their own rates. Both then follow the same curve, 1 − e<sup>−(<i>k</i><sub>B</sub> + <i>k</i><sub>C</sub>)<i>t</i></sup>, in the fixed ratio of their rates, so to the data they are one species: three species, rank 2. Parallel products are the chemist's way to co-evolving concentrations [@ch29, p. 633].</p>
      <p>Set C back to "forms from B" in its card and the third component returns. Look at "species" in panel 1: the two products rise together.</p>`,
  },
  {
    id: 'shift', title: 'A Band That Moves', s: cs({ n: 4, noise: 0.004 }, { C: { shift: -15 } }),
    text: `<p>The band of C moves 15 cm⁻¹ down as C builds up, as a band can with coverage. A band that moves is not a multiple of itself, so <b>X</b> is no longer bilinear, and the shift costs a component: four above the noise for three species, with a structured score in time. It looks real.</p>
      <p>The chapter meets the same in XAS, where damping with temperature made the components outnumber the species [@ch29, p. 630]. Set the shift to 0 in the card of C and the fourth component sinks into the noise.</p>`,
  },
  {
    id: 'drift', title: 'A Drifting Baseline', s: cs({ n: 4, noise: 0.003, drift: 0.15 }),
    text: `<p>Three species and a baseline that tilts more and more over the run. The scree plot shows four components above the noise: the fourth is the baseline, a slope in the loadings and a ramp in time. A component is anything that varies on its own, a species or not.</p>
      <p>Keep <i>n</i> = 3 and the residual is the tilt; keep 4 and it is gone. Before MCR such a component is either kept and resolved like a species, or taken out first by a baseline correction.</p>`,
  },
  {
    id: 'xas', title: 'XAS: Edges a Few eV Apart', s: cs({ axis: 'xas', n: 3, noise: 0.002 }, XAS_SPECIES),
    text: `<p>The same kinetics on an absorption edge: each species is a normalised step with a white line, the edges 3 eV apart, as an oxidation state changes. Every spectrum ends at 1 after the edge, so the first component is large and the rest are small, but three still stand above the noise.</p>
      <p>This is the setting of the chapter, quick-XAS of a catalyst being reduced [@ch29, Fig. 29.1, p. 627]. Take it to the PCA page: centring puts the common step into the mean.</p>`,
  },
];

const EQUATIONS = [
  EQ_BILINEAR,
  callout({
    title: 'Singular Value Decomposition',
    math: `<b>X</b> = <b>U</b> diag(<b>σ</b>) <b>V</b><sup>T</sup> = ${sum('<i>i</i>', '')} <i>σ<sub>i</sub></i> <b>u</b><sub><i>i</i></sub> <b>v</b><sub><i>i</i></sub><sup>T</sup>, &emsp; <i>σ</i>₁ ≥ <i>σ</i>₂ ≥ … ≥ 0`,
    text: 'The decomposition behind PCA [@ch29, Eq. 29.4, p. 628]. The letters differ between sources: the chapter writes the diagonal matrix as S and calls its entries eigenvalues (they are the singular values; the eigenvalues of <b>X X</b><sup>T</sup> are their squares), and Golshan et al. write <b>D</b> = <b>CA</b> = <b>USV</b>, with <b>A</b> the spectra and <b>S</b> the singular values [@golshan, Eq. 4, p. 836]. These pages keep <b>C</b> and <b>S</b> for concentrations and pure spectra and write the singular values as a vector <b>σ</b>, the matrix as diag(<b>σ</b>), so no letter means two things and Σ is only ever a sum. The sign of each pair is free; the page turns each so the largest point of <b>v</b><sub><i>i</i></sub> is positive.',
    symbols: [
      ['<b>u</b><sub><i>i</i></sub>', 'scores of component <i>i</i>, one value per spectrum, unit length'],
      ['<b>v</b><sub><i>i</i></sub>', 'loading of component <i>i</i>, one value per point, unit length'],
      ['<i>σ<sub>i</sub></i>', 'singular value: how much of <b>X</b> component <i>i</i> carries'],
    ],
  }),
  callout({
    title: 'Rebuilding from n Components',
    math: `<b>X</b><sub><i>n</i></sub> = ${sum('<i>i</i> = 1', '<i>n</i>')} <i>σ<sub>i</sub></i> <b>u</b><sub><i>i</i></sub> <b>v</b><sub><i>i</i></sub><sup>T</sup>, &emsp; ${sum('<i>ij</i>', '')} <i>e<sub>ij</sub></i>² = ${sum('<i>i</i> > <i>n</i>', '')} <i>σ<sub>i</sub></i>²`,
    text: 'Keeping the first <i>n</i> components gives the matrix of rank <i>n</i> closest to <b>X</b> in the least-squares sense (the Eckart–Young theorem), and the squared residual is the sum of the dropped <i>σ<sub>i</sub></i>². Standard linear algebra. Panel 4 draws it as blocks, <b>X</b> ≈ <b>U</b><sub><i>n</i></sub> diag(<b>σ</b><sub><i>n</i></sub>) <b>V</b><sub><i>n</i></sub><sup>T</sup> + <b>E</b>.',
    symbols: [['<i>e<sub>ij</sub></i>', 'residual of spectrum <i>i</i> at point <i>j</i>']],
  }),
  callout({
    title: 'Lack of Fit',
    math: `LoF (%) = 100 √(${frac('Σ <i>e<sub>ij</sub></i>²', 'Σ <i>x<sub>ij</sub></i>²')}), &emsp; variance explained (%) = 100 (1 − ${frac('Σ <i>e<sub>ij</sub></i>²', 'Σ <i>x<sub>ij</sub></i>²')})`,
    text: 'The fit measure the chapter reports for MCR-ALS [@ch29, Eq. 29.2, p. 627], here for the rebuild from <i>n</i> components. The variance explained is the same ratio without the root.',
    symbols: [['<i>x<sub>ij</sub></i>', 'an element of <b>X</b>']],
  }),
  callout({
    title: 'An F-Test for the Rank',
    math: `<i>F</i>(1, <i>s</i> − <i>n</i>) = ${frac('<i>λ<sub>n</sub></i> / (<i>r</i> − <i>n</i> + 1)(<i>c</i> − <i>n</i> + 1)', `${sum('<i>j</i> = <i>n</i> + 1', '<i>s</i>')} <i>λ<sub>j</sub></i> / ${sum('<i>j</i> = <i>n</i> + 1', '<i>s</i>')} (<i>r</i> − <i>j</i> + 1)(<i>c</i> − <i>j</i> + 1)`)}`,
    text: 'Each eigenvalue <i>λ<sub>j</sub></i> = <i>σ<sub>j</sub></i>², divided by its degrees of freedom (the reduced eigenvalue), is compared with the pool of the smaller ones, weighted by theirs [@malinowski, Eqs. 13 and 19, p. 52]. The significance level is the chance of a ratio this large from noise alone. Read from the bottom up; the paper finds 5 % tends to undercount and 10 % to overcount, with a grey region between [@malinowski, p. 56]. It assumes normally distributed errors, so it says nothing about noise-free data.',
    symbols: [['<i>r</i>, <i>c</i>', 'rows and columns of <b>X</b> (here <i>q</i> and <i>m</i>)'], ['<i>s</i>', 'the smaller of the two'], ['<i>n</i>', 'the component under test']],
  }),
  EQ_NOISE,
];

const GENERAL = `<h2>What This Page Shows</h2>
  <p>A series of spectra measured while a mixture changes is a matrix <b>X</b>: one row per spectrum, one column per point. If each species adds its own spectrum, scaled by its concentration, <b>X</b> = <b>C</b> <b>S</b><sup>T</sup> + <b>E</b> [@ch29, Eq. 29.1, p. 626], and MCR-ALS has to be told how many components to resolve before it starts, usually from an SVD [@ch29, p. 627] [@dejuan, p. 4970]. The SVD writes <b>X</b> as a sum of components ordered by how much of <b>X</b> each carries. Computing it is easy; deciding where signal ends and noise begins is the hard part [@ch29, p. 628].</p>
  <p>Panel 1 is the data, and the species that made it. Panel 2 is the scree plot: the singular values on a log scale, with the cut between kept and dropped components. Panel 3 shows the components as loadings, as scores in time, and as score plots of one against the next [@ch29, Fig. 29.2]. Panel 4 is the operation itself, the rebuild: <b>X</b> as the product of <b>U</b>, diag(<b>σ</b>) and <b>V</b><sup>T</sup>, as blocks filled by role or with their numbers, and what is left, <b>E</b>, as a map or as the lack of fit for every <i>n</i>.</p>
  <p>The components are not the species. They are orthogonal and ordered by size, and a loading can be negative where no spectrum is. Turning them into concentrations and pure spectra needs constraints, which is what MCR-ALS adds. The PCA page takes the same data after centring, the EFA page asks the same question in time; the technique switch on the left carries your data across.</p>
  <h2>Using the Plots</h2>
  <p>Drag the green cut in panel 2, click a point there or a bar in the lack-of-fit view, or pick <i>n</i> on the left: every plot follows. Every setting is on the left and stays there; a case only sets values, hover it for what it shows. Each species card has its own sliders. The values on the right list each component's share and the lack of fit if it were the last one kept.</p>`;

/* ---------------------------------------------------------------------------
   Engine
   --------------------------------------------------------------------------- */
const state = { idx: 2, s: null, seed: 1, hover: null };
let S = null, LIM = null;
function compute() {
  const st = state.s, B = build(st, state.seed), r = svd(B.X), total = sumSq(B.X) || 1;
  const cum = []; let acc = 0;
  for (const x of r.s) { acc += x * x; cum.push(acc); }
  const q = B.X.length, s = Math.min(q, M), lam = r.s.map(x => x * x), sl = [];
  for (let j = 1; j < s; j++) {
    let pool = 0, dof = 0;
    for (let i = j + 1; i <= s; i++) { pool += lam[i - 1]; dof += (q - i + 1) * (M - i + 1); }
    const F = (lam[j - 1] / ((q - j + 1) * (M - j + 1))) / (pool / dof);
    sl.push(100 * fTail(F, 1, s - j));
  }
  const nAt = a => { for (let j = s - 1; j >= 1; j--) if (sl[j - 1] < a) return j; return 0; };
  S = {
    sl, n5: nAt(5), n10: nAt(10),
    B, r, cum,
    lof: cum.map(c => 100 * Math.sqrt(Math.max(total - c, 0) / total)),
    noiseLof: 100 * Math.sqrt(sumSq(B.noise) / total),
    level: st.noise * (Math.sqrt(st.q) + Math.sqrt(M)),
  };
}
function limits() {
  const st = state.s, L = dataLimits(S.B.X, S.B.pure);
  let R = 1.5;
  for (let i = 0; i < Math.min(NMAX + 1, S.r.s.length); i++) for (const x of S.r.u[i]) R = Math.max(R, Math.abs(x) * Math.sqrt(st.q));
  LIM = { ...L, R: 1.12 * R, res: Math.max(0.02 * L.map, 3.5 * st.noise) };
  LOG = [-4, Math.max(1, Math.ceil(Math.log10(1.5 * S.r.s[0])))];   // the top decade from the case's largest σ
}

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
let LOG = [-4, 2];
const logOf = v => clamp(Math.log10(Math.max(v, 1e-300)), LOG[0], LOG[1]);
const strips = st => Math.min(NMAX, Math.max(st.n + 2, 3), S.r.s.length);

function drawDataPanel() {
  const st = state.s, o = drawData($('cData'), { st, B: S.B, Xp: S.B.X, lim: LIM, view: st.view1, ylabel: 'signal / –' });
  $('subData').textContent = o.sub; legend($('legData'), o.leg);
}

let P2 = null;
const screeLegend = () => [['kept', KEPT, 'dot'], ['dropped', DROPPED, 'dot'], ['the cut', CUT, 'dashed'], state.s.noise > 0 && ['noise level <i>ε</i>(√<i>q</i> + √<i>m</i>)', LEVEL, 'dashed']];
const ftestLegend = [['significance level, kept', KEPT, 'bar'], ['dropped', DROPPED, 'bar'], ['5 % and 10 %', LEVEL, 'dashed']];
function drawFtest() {
  const st = state.s, cv = $('cScree'), sc = SC(), NS = Math.min(S.sl.length, 15);
  const p = plot(cv, { x: [0.4, NS + 0.6], y: [0, 100], xlabel: 'component *n*', ylabel: 'significance / %', xticks: Array.from({ length: NS }, (_, i) => [i + 1, String(i + 1)]).filter(([v]) => NS <= 10 || v % 2 === 1), yticks: [[0, '0'], [25, '25'], [50, '50'], [75, '75'], [100, '100']], scale: sc });
  p.ctx.fillStyle = C['data-faint']; p.ctx.globalAlpha = 0.35; p.ctx.fillRect(p.inner.l, p.Y(10), p.inner.r - p.inner.l, p.Y(5) - p.Y(10)); p.ctx.globalAlpha = 1;
  for (const v of [5, 10]) p.line([0.4, NS + 0.6], [v, v], LEVEL, CHART.lineThin, CHART.dash);
  const pts = [];
  for (let i = 0; i < NS; i++) {
    const x0 = p.X(i + 1 - 0.3), x1 = p.X(i + 1 + 0.3), y = Math.max(S.sl[i], 0.6);
    p.ctx.fillStyle = i < st.n ? KEPT : DROPPED; p.ctx.fillRect(x0, p.Y(y), x1 - x0, p.Y(0) - p.Y(y));
    pts.push({ i, px: (x0 + x1) / 2, py: p.Y(y) });
  }
  p.text(st.noise > 0 ? `the test: ${S.n5} at 5 %, ${S.n10} at 10 %` : 'no noise: nothing to test against', NS + 0.4, 80, C['ink-500'], 'right');
  p.text('5 to 10 %', NS + 0.4, 17, C['ink-500'], 'right');
  const rx = p.X(st.n + 0.5);
  p.line([st.n + 0.5, st.n + 0.5], [0, 100], CUT, CHART.lineData, CHART.dash);
  grip(p, rx, CUT);
  p.axes();
  P2 = { p, rx, pts, NS };
  $('subScree').textContent = 'Malinowski\'s F-test: low is not noise. Read from the right.';
  legend($('legScree'), ftestLegend);
}
function drawScree() {
  if (state.s.view2 === 'ftest') { drawFtest(); return; }
  const st = state.s, cv = $('cScree'), sc = SC(), s = S.r.s, NS = Math.min(s.length, 15);
  const p = plot(cv, { x: [0.4, NS + 0.6], y: LOG, xlabel: 'component *i*', ylabel: 'singular value *σ*_*i*_', xticks: Array.from({ length: NS }, (_, i) => [i + 1, String(i + 1)]).filter(([v]) => NS <= 10 || v % 2 === 1), yticks: LOG_TICKS.filter(([v]) => v <= LOG[1]), scale: sc });
  const xs = Array.from({ length: NS }, (_, i) => i + 1), ys = xs.map(i => logOf(s[i - 1]));
  if (st.noise > 0) {
    const ly = logOf(S.level);
    p.line([0.4, NS + 0.6], [ly, ly], LEVEL, CHART.lineThin, CHART.dash);
    p.text('noise level', NS + 0.4, ly - 1.2, C['ink-500'], 'right');
  }
  p.line(xs, ys, C['line'], CHART.lineThin);
  const pts = [];
  for (let i = 0; i < NS; i++) {
    p.dot(xs[i], ys[i], i < st.n ? KEPT : DROPPED, state.hover === i ? CHART.marker + 2 : CHART.marker);
    pts.push({ i, px: p.X(xs[i]), py: p.Y(ys[i]) });
  }
  if (ys.some(y => y <= LOG[0])) p.text('rounding, ≈ 0', NS + 0.4, LOG[0] + 0.3, C['ink-500'], 'right');
  const rx = p.X(st.n + 0.5);
  p.line([st.n + 0.5, st.n + 0.5], LOG, CUT, CHART.lineData, CHART.dash);
  grip(p, rx, CUT);
  p.axes();
  P2 = { p, rx, pts, NS };
  $('subScree').textContent = 'Log scale: steep for signal, flat for noise. Drag the green cut.';
  legend($('legScree'), screeLegend());
}

const compLegends = { plane: [['both kept', KEPT, 'dot'], ['one dropped', DROPPED, 'dot'], ['scores ×√<i>q</i>', C['ink-300'], '']], other: [['kept', KEPT, ''], ['dropped', DROPPED, '']] };
function drawComp() {
  const st = state.s, cv = $('cComp'), sc = SC(), { s, u, v } = S.r, ts = S.B.ts, ax = axOf(st);
  if (st.view3 === 'plane') {
    const W = cv.clientWidth, n = Math.min(st.n, s.length - 1), R = LIM.R;
    const pairs = [n >= 2 ? [n - 2, n - 1] : [0, 1], [n - 1, n]];
    const tk = [[-Math.floor(R), String(-Math.floor(R))], [0, '0'], [Math.floor(R), String(Math.floor(R))]];
    pairs.forEach(([a, b], k) => {
      const kept = a < st.n && b < st.n;
      const p = plot(cv, { keep: k === 1, x: [-R, R], y: [-R, R], margin: k ? { l: W / 2 + 44 * sc } : { r: W / 2 + 8 }, xlabel: `scores ${a + 1} (→) and ${b + 1} (↑)`, xticks: tk, yticks: tk, scale: sc });
      p.hline(0);
      const f = Math.sqrt(st.q), xs = Array.from(u[a], x => x * f), ys = Array.from(u[b], x => x * f);
      p.line(xs, ys, kept ? C['ink-300'] : C['data-faint'], CHART.lineThin);
      for (let i = 0; i < xs.length; i++) p.dot(xs[i], ys[i], kept ? KEPT : DROPPED, 2.5);
      p.text('*t* = 0', xs[0], ys[0] + 0.12 * R, C['ink-500']);
      p.axes();
    });
    $('subComp').textContent = 'Score against score: a path, then a cloud.';
    legend($('legComp'), compLegends.plane);
    return;
  }
  const inTime = st.view3 === 'scores', xs = inTime ? ts : S.B.grid, nc = strips(st);
  const p = plot(cv, {
    x: inTime ? [0, T_END] : xRangeOf(st), y: [0, nc], xlabel: inTime ? XLAB_T : ax.label, ylabel: 'component *i*',
    xticks: inTime ? T_TICKS : ax.ticks, yticks: Array.from({ length: nc }, (_, i) => [nc - i - 0.5, String(i + 1)]), scale: sc,
  });
  for (let i = 1; i < nc; i++) p.hline(i, C['line-soft']);
  for (let i = 0; i < nc; i++) {
    const mid = nc - i - 0.5, vec = inTime ? u[i] : v[i], kept = i < st.n;
    let big = 0;
    for (const x of vec) big = Math.max(big, Math.abs(x));
    const f = big > 0 ? 0.42 / big : 0;   // each component scaled to its own largest value: nothing clips
    p.hline(mid, C['line-zero']);
    p.line(xs, Array.from(vec, x => mid + x * f), kept ? KEPT : DROPPED, kept ? CHART.lineData : CHART.lineThin);
    if (nc <= 6) p.text(`*σ*_${i + 1}_ = ${fmtS(s[i])}`, inTime ? T_END * 0.98 : ax.to, mid - 0.1, kept ? KEPT : C['ink-500'], 'right');
  }
  p.axes();
  $('subComp').textContent = inTime ? 'Columns of U, each to its own size.' : 'Rows of Vᵀ, each to its own size.';
  legend($('legComp'), compLegends.other);
}

const LOF_LOG = [-3, 2];
const LOF_TICKS = [[-3, '0.001'], [-2, '0.01'], [-1, '0.1'], [0, '1'], [1, '10'], [2, '100']];
let P4 = null;
const fitLegends = () => ({
  matrix: BLOCK_LEGEND,
  blocks: BLOCK_LEGEND_STATIC,
  residual: MAP_LEGEND(LIM.res),
  lof: [['chosen <i>n</i>', KEPT, 'bar'], ['other <i>n</i>', DROPPED, 'bar'], state.s.noise > 0 && ['LoF of the noise that was added', LEVEL, 'dashed']],
});
function drawFit() {
  const st = state.s, cv = $('cFit'), sc = SC(), { s, u, v } = S.r, X = S.B.X, q = X.length;
  P4 = null;
  if (st.view4 === 'numbers' || st.view4 === 'blocks') {
    const K = strips(st), E = residual(X, S.r, st.n);
    drawBlocks(cv, [
      { label: 'X', role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => X[r][c] },
      '≈',
      { label: 'U', role: 'score', rows: q, cols: K, h: 'q', w: 'n', at: (r, c) => u[c][r], fade: { fromCol: st.n } },
      { label: 'diag(σ)', role: 'diag', rows: K, cols: K, h: 'n', w: 'n', scale: 'log', max: s[0], floor: Math.max(s[Math.min(K, s.length) - 1], s[0] * 1e-4), at: (r, c) => s[r], fade: { fromCol: st.n, fromRow: st.n }, dim: `${K} × ${K}` },
      { label: 'V^T^', role: 'load', rows: K, cols: M, h: 'n', w: 'm', at: (r, c) => v[r][c], fade: { fromRow: st.n } },
      '+',
      { label: 'E', role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => E[r][c] },
    ], { mode: st.view4 === 'blocks' ? 'blocks' : 'numbers' });
    $('subFit').innerHTML = st.view4 === 'blocks' ? `<b>X</b> ≈ <b>U</b> diag(<b>σ</b>) <b>V</b><sup>T</sup> + <b>E</b>, ${K} components.` : 'The same blocks, with their numbers.';
    legend($('legFit'), st.view4 === 'blocks' ? fitLegends().blocks : fitLegends().matrix);
    return;
  }
  if (st.view4 === 'residual') {
    const E = residual(X, S.r, st.n), ax = axOf(st);
    heatmap(cv, { x: xRangeOf(st), y: [0, T_END], xlabel: ax.label, ylabel: XLAB_T, xticks: ax.ticks, yticks: T_TICKS, scale: sc }, E.length, M, (i, j) => E[i][j], LIM.res);
    $('subFit').innerHTML = `<b>E</b> after ${st.n}: a pattern is a missing component.`;
    legend($('legFit'), fitLegends().residual);
    return;
  }
  const nb = Math.min(NTAB, S.lof.length);
  const lofLog = x => clamp(Math.log10(Math.max(x, 1e-300)), LOF_LOG[0], LOF_LOG[1]);
  const p = plot(cv, { x: [0.4, nb + 0.6], y: LOF_LOG, xlabel: 'components kept *n*', ylabel: 'lack of fit / %', xticks: Array.from({ length: nb }, (_, i) => [i + 1, String(i + 1)]), yticks: LOF_TICKS, scale: sc });
  const bars = [];
  for (let i = 0; i < nb; i++) {
    const x0 = p.X(i + 1 - 0.32), x1 = p.X(i + 1 + 0.32), y0 = p.Y(LOF_LOG[0]), y1 = p.Y(lofLog(S.lof[i]));
    p.ctx.fillStyle = i + 1 === st.n ? KEPT : DROPPED;
    p.ctx.fillRect(x0, y1, x1 - x0, y0 - y1);
    bars.push({ i, l: x0, r: x1 });
  }
  p.text(`${fmtPct(S.lof[st.n - 1])} %`, st.n, lofLog(S.lof[st.n - 1]) + 0.3, KEPT);
  if (st.noise > 0) {
    const ly = lofLog(S.noiseLof);
    p.line([0.4, nb + 0.6], [ly, ly], LEVEL, CHART.lineThin, CHART.dash);
    p.text('the noise alone', nb + 0.4, ly + 0.25, C['ink-500'], 'right');
  }
  p.axes();
  P4 = { p, bars };
  $('subFit').innerHTML = 'Click a bar to keep that many.';
  legend($('legFit'), fitLegends().lof);
}

function drawTable() {
  const st = state.s, { s } = S.r, nt = Math.min(NTAB, s.length);
  const sq = s.map(x => x * x), all = sq.reduce((a, b) => a + b, 0) || 1;
  $('vN').textContent = st.n;
  let rows = '<tr><th><i>i</i></th><th><i>σ<sub>i</sub></i></th><th>share %</th><th>sum %</th><th>LoF %</th></tr>';
  for (let i = 0; i < nt; i++) {
    rows += `<tr style="color:${i < st.n ? C['ink-900'] : C['ink-300']}"><td>${i + 1}</td><td>${fmtS(s[i])}</td><td>${(100 * sq[i] / all).toFixed(3)}</td><td>${(100 * S.cum[i] / all).toFixed(3)}</td><td>${fmtPct(S.lof[i])}</td></tr>`;
  }
  rows += `<tr><td colspan="2">noise level</td><td colspan="3">${st.noise > 0 ? fmtS(S.level) : '–'}</td></tr>`;
  rows += `<tr><td colspan="2">F-test, <i>n</i></td><td colspan="3">${st.noise > 0 ? `${S.n5} at 5 % · ${S.n10} at 10 %` : '–'}</td></tr>`;
  rows += `<tr><td colspan="2">noise LoF</td><td colspan="3">${st.noise > 0 ? `${S.noiseLof.toPrecision(3)} %` : '–'}</td></tr>`;
  $('readout').innerHTML = rows;
  $('sideNote').innerHTML = 'Share: <i>σ<sub>i</sub></i>² over the sum of all. LoF: Eq. 29.2 for the rebuild from 1 … <i>i</i>. The last two rows use the noise this page added, which a real measurement does not tell you.';
}

function draw() {
  const st = state.s, f = fitLegends();
  reserveLegends([...dataLegends(st, LIM), legendHtml(screeLegend()), legendHtml(ftestLegend), legendHtml(compLegends.plane), legendHtml(compLegends.other), legendHtml(f.matrix), legendHtml(f.blocks), legendHtml(f.residual), legendHtml(f.lof)]);
  drawDataPanel(); drawScree(); drawComp(); drawFit(); drawTable();
  sums(); controls.refresh();
}
function update() { compute(); draw(); markChanged(); }

/* ---------------------------------------------------------------------------
   Controls
   --------------------------------------------------------------------------- */
const snap = s => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => !DISPLAY_ONLY.includes(k))));
const caseS = () => CASES[state.idx].s;
const data = dataControls(state, caseS);
function markChanged() { selector.changed(snap(state.s) !== snap(caseS())); data.refresh(); renderRail(); }
const sums = foldingGroups(() => ({
  case: `${state.idx + 1} · ${CASES[state.idx].title}`,
  technique: 'SVD',
  components: `<i>n</i> = ${state.s.n}`,
  ...data.summaries(),
}));
const controls = valueControls({
  bindOf: key => data.bind(key), update, draw,
  after: () => {
    if (!state.s) return;
    setSeg($('nSeg'), state.s.n);
    for (const k of ['view1', 'view2', 'view3', 'view4']) setSeg($(k), state.s[k]);
    data.refresh();
  },
});
data.attach(controls, { update, changed: markChanged, labels: () => drawDataPanel(), relimit: () => { compute(); limits(); draw(); markChanged(); } });
techniqueSwitch('svd', state);

const setN = n => { const c = clamp(Math.round(n), 1, Math.min(NMAX, S.r.s.length)); if (c !== state.s.n) { state.s.n = c; draw(); } };
const segClick = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b) fn(b.dataset.v); });
segClick('nSeg', v => setN(+v));
for (const k of ['view1', 'view2', 'view3', 'view4']) segClick(k, x => { state.s[k] = x; draw(); });
$('resetCase').addEventListener('click', () => selectCase(state.idx, false));

/* panel 2: drag the cut, hover a point for its values, click it to cut after it */
const cScree = $('cScree');
const hitPt = e => {
  if (!P2) return null;
  const { x, y } = localIn(cScree, e);
  let best = null, bd = 10;
  for (const q of P2.pts) { const d = Math.hypot(q.px - x, q.py - y); if (d < bd) { bd = d; best = q; } }
  return best;
};
function ptText(i) {
  if (state.s.view2 === 'ftest') return `<div class="tip-title">Component ${i + 1}, significance level ${S.sl[i] < 0.01 ? '< 0.01' : S.sl[i].toPrecision(2)} %</div>
    <p>The chance that noise alone gives a reduced eigenvalue this much larger than the pool of the smaller ones. ${S.sl[i] < 5 ? 'Below 5 %: not noise.' : S.sl[i] < 10 ? 'Between 5 and 10 %: the grey region.' : 'Above 10 %: as noise.'}</p><p class="tip-hint">click to keep ${i + 1} component${i ? 's' : ''}</p>`;
  const s = S.r.s, sq = s.map(x => x * x), all = sq.reduce((a, b) => a + b, 0) || 1;
  const where = state.s.noise > 0 ? (s[i] > 1.2 * S.level ? 'above the noise level' : s[i] > 0.8 * S.level ? 'at the noise level' : 'below the noise level')
    : s[i] < 1e-6 * s[0] ? 'rounding: the data have no more independent directions' : 'a direction the data have';
  return `<div class="tip-title">Component ${i + 1}, <i>σ</i> = ${fmtS(s[i])}</div>
    <p>It carries ${(100 * sq[i] / all).toPrecision(3)} % of the sum of squares, ${where}. Kept up to here, the lack of fit is ${fmtPct(S.lof[i])} %.</p><p class="tip-hint">click to keep ${i + 1} component${i ? 's' : ''}</p>`;
}
dragRuler(cScree, {
  rulerXs: () => (P2 ? [P2.rx] : []), plotOf: () => P2?.p,
  onDrag: x => { const { inner } = P2.p; setN(0.4 + (x - inner.l) / (inner.r - inner.l) * (P2.NS + 0.2) - 0.5); },
  hover: e => {
    const q = hitPt(e), i = q ? q.i : null;
    if (i !== state.hover) { state.hover = i; drawScree(); }
    if (q) tooltip.show(ptText(q.i), e.clientX, e.clientY); else tooltip.hide();
    return !!q;
  },
  down: e => { const q = hitPt(e); if (!q) return false; tooltip.hide(); setN(q.i + 1); return true; },
  leave: () => { if (state.hover != null) { state.hover = null; drawScree(); } tooltip.hide(); },
});
const cFit = $('cFit'), barAt = e => { if (!P4) return null; const { x } = localIn(cFit, e); return P4.bars.find(q => x >= q.l - 4 && x <= q.r + 4); };
cFit.addEventListener('click', e => { const b = barAt(e); if (b) setN(b.i + 1); });
cFit.addEventListener('pointermove', e => { cFit.style.cursor = barAt(e) ? 'pointer' : 'default'; });

/* ---------------------------------------------------------------------------
   Panels and the rail
   --------------------------------------------------------------------------- */
function renderRail() {
  if (panels.left || !state.s) { $('rail').innerHTML = ''; return; }
  const st = state.s, changed = $('caseSelect').classList.contains('changed');
  $('rail').innerHTML = [
    rail.btn('open', '▶', 'Open the settings', { text: true }), rail.rule,
    rail.fly('case', rail.btn('caseFly', String(state.idx + 1), 'Case', { text: true, on: true }),
      `<div class="fly-title">Case</div>${CASES.map((c, i) => rail.item('case', i, `${i + 1} · ${c.title}`, i === state.idx)).join('')}`),
    rail.btn('reset', '↺', changed ? 'Reset to the case' : 'Nothing changed from the case', { disabled: !changed }), rail.rule,
    rail.fly('n', rail.btn('nFly', `n${st.n}`, 'Components kept', { text: true }),
      `<div class="fly-title">Keep <i>n</i></div>${Array.from({ length: NMAX }, (_, i) => rail.item('n', i + 1, `n = ${i + 1}`, i + 1 === st.n)).join('')}`),
    ...st.species.map((sp, i) => rail.btn(`sp${i}`, sp.key, `${sp.label}: ${sp.on ? 'on. Click to switch off' : 'off. Click to switch on'}`, { text: true, on: sp.on, style: `--c:${COLOR[sp.key]}` })),
    rail.rule, rail.btn('reseed', '⟳', 'New noise', { text: true }),
  ].join('');
}
$('rail').addEventListener('click', e => {
  const b = e.target.closest('[data-r]');
  if (!b) return;
  const r = b.dataset.r;
  rail.open = null;
  if (r === 'open') { panels.left = true; panels.set(); return; }
  if (r === 'case') { selectCase(+b.dataset.v); return; }
  if (r === 'reset') { selectCase(state.idx, false); return; }
  if (r === 'n') { setN(+b.dataset.v); renderRail(); return; }
  if (r === 'reseed') { state.seed += 1; update(); return; }
  if (r.startsWith('sp')) { const sp = state.s.species[+r.slice(2)]; sp.on = !sp.on; data.renderSpecies(); update(); }
});

const panels = initWorkbench({ redraw: draw, renderRail });
const selector = caseSelector({ list: CASES, onSelect: i => selectCase(i) });

function selectCase(idx, push = true, carried = null) {
  state.idx = idx;
  state.s = { ...clone(CASES[idx].s), ...(carried ? clone(carried) : {}) };
  state.hover = null;
  selector.mark(idx);
  data.renderSpecies();
  compute(); limits();
  if (push) { try { const u = new URL(location.href); u.searchParams.set('case', CASES[idx].id); u.searchParams.delete('data'); history.replaceState(null, '', u); } catch { /* not essential */ } }
  draw(); markChanged();
}

/* ---------------------------------------------------------------------------
   Start: texts once (their markers are numbered once), then a case
   --------------------------------------------------------------------------- */
$('general').innerHTML = GENERAL;
$('equations').innerHTML = `<h2>Equations</h2>${EQUATIONS.join('')}`;
$('caseTexts').innerHTML = CASES.map(c => `<div>${c.text}</div>`).join('');
state.s = clone(CASES[state.idx].s);
controls.fill(document);
const wanted = new URLSearchParams(location.search).get('case');
const start = CASES.findIndex(c => c.id === wanted);
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  fitWorkbench();
  selectCase(start < 0 ? state.idx : start, false, carriedData());
  renderCitations([$('general'), $('equations'), $('caseTexts')], $('refs'), SOURCES);
});

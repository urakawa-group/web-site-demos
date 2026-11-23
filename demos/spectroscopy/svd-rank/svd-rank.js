/**
 * SVD and rank: a series of mixture spectra D, its singular value
 * decomposition, and the plots that decide how many components it holds.
 * See the comment block in index.html for the model and the sources; the
 * case texts carry the citations.
 */
import { initShell } from '../../../assets/shell.js';
import { C, CHART } from '../../../assets/tokens.js';
import { plot, ticks } from '../../../assets/plot.js';
import { renderCitations } from '../../../assets/cite.js';
import { svd, sumSq } from '../../../assets/linalg.js';
import { NU, T_END, build } from './mixture.js';
import {
  fitWorkbench, initWorkbench, valueControls, foldingGroups, caseSelector, tooltip,
  setSeg, rail, grip, dragRuler, localIn, clamp,
} from '../../../assets/workbench.js';

initShell({ page: 'demo', views: true });

const SOURCES = {
  ch29: {
    key: 'Wachs.SpringerHandbookAdvanced.2023',
    chapter: 'A. R. Passos, C. La Fontaine, A. Rochet and V. Briois, “Case Studies: Time-Resolved X-Ray Absorption Spectroscopy (XAS)”, Ch. 29, pp. 625–658',
    short: 'Passos et al. (Briois), Springer Handbook of Advanced Catalyst Characterization 2023, Ch. 29',
  },
  dejuan: { key: 'DeJuan.MultivariateCurveResolution.2014', lead: 'Tauler' },
  golshan: { key: 'Golshan.ResolutionRotationalAmbiguity.2011', lead: 'Maeder' },
};

/* ---------------------------------------------------------------------------
   Settings. Everything the engine reads is one object; a case is a copy of it
   with a title and a text (the tooltip of the case selector).

   { species: [{ key, on, c, w, h }] × 4, k1, k2, dProfile, q, noise, drift,
     n, view1, view3, view4 }

     species   A, B, C, D: one Gaussian band each, centre c and FWHM w in
               cm⁻¹, height h in absorbance at full concentration
     k1, k2    first-order rate constants of A → B and B → C, in min⁻¹
     dProfile  'C': D has exactly the profile of C; 'ramp': D grows linearly
     q         number of spectra over the run of 60 min
     noise     standard deviation of the noise, in absorbance
     drift     height of the baseline at 1800 cm⁻¹ at the end of the run
     n         components kept (what the reader decides, not the data)
   --------------------------------------------------------------------------- */
const SP = (key, on, c, w, h) => ({ key, on, c, w, h });
const base = {
  species: [SP('A', true, 1650, 50, 0.6), SP('B', true, 1500, 60, 0.5), SP('C', true, 1350, 50, 0.7), SP('D', false, 1580, 40, 0.4)],
  k1: 0.08, k2: 0.04, dProfile: 'C', q: 60, noise: 0, drift: 0,
  n: 3, view1: 'spectra', view3: 'loadings', view4: 'residual',
};
const DISPLAY_ONLY = ['n', 'view1', 'view3', 'view4'];
const withSp = (o, f = {}) => ({ ...base, ...o, species: base.species.map(s => ({ ...s, ...(f[s.key] ?? {}) })) });

const CASES = [
  {
    id: 'one', title: 'One Species, No Noise', s: withSp({ n: 1, k1: 0.05 }, { B: { on: false }, C: { on: false } }),
    text: `<p>Only A is on, so every spectrum is the same band, scaled by how much A is left: D is one spectrum times one profile, rank 1. The first singular value carries all of D; the second is rounding, below the floor of the plot, and the lack of fit at <i>n</i> = 1 is zero.</p>
      <p>The loading of component 1 is the band of A, scaled to unit length, and its score in time is the decay of A. With one species the SVD hands back the species itself, up to a scale. With two it no longer does.</p>`,
  },
  {
    id: 'two', title: 'Two Species, No Noise', s: withSp({ n: 2, k1: 0.06, k2: 0 }, { C: { on: false } }),
    text: `<p>A turns into B and nothing else, so A + B = 1 at every time: the closure that normalised XAS data obey [@ch29, p. 627]. The rank is still 2, because D = <i>s</i><sub>B</sub> + A (<i>s</i><sub>A</sub> − <i>s</i><sub>B</sub>): a fixed spectrum plus one that changes. Two singular values, then rounding.</p>
      <p>Look at the loadings: component 1 is close to the average spectrum, component 2 has a positive and a negative band. Neither is a species. The SVD orders by size and makes the components orthogonal; real spectra are neither. Finding the species is the job of MCR, not of the SVD.</p>`,
  },
  {
    id: 'three', title: 'Three Species with Noise', s: withSp({ n: 3, noise: 0.004 }),
    text: `<p>A → B → C with noise. The scree plot falls steeply for three components and then runs flat: from the fourth on the singular values are noise, at the level drawn dashed. The rank is the number of points before the flat tail starts [@ch29, Fig. 29.2a, p. 629].</p>
      <p>Switch panel 3 to "in time": the first three scores are smooth curves, the fourth is noise, as in the 1D score trajectory plots of the chapter [@ch29, Fig. 29.2c, p. 630]. Keep <i>n</i> = 2 and the residual shows a pattern; at 4 it shows only speckle.</p>`,
  },
  {
    id: 'weak', title: 'A Short-Lived Intermediate', s: withSp({ n: 2, k1: 0.25, k2: 1, noise: 0.008 }, { B: { h: 0.3 } }),
    text: `<p>B forms fast and is used up faster, so it reaches at most about 16 % and only in the first few spectra. Its component carries little of D, and its singular value sits just above the flat tail.</p>
      <p>Rank 2 or 3? Compare <i>n</i> = 2 and 3 in panel 4: the lack of fit hardly changes, but the residual at <i>n</i> = 2 has a stripe at the start of the run. The difficulty is the choice of the rank, not the SVD [@ch29, p. 628]: read the scree plot, the scores in time and the residual together.</p>`,
  },
  {
    id: 'overlap', title: 'Overlapping Bands', s: withSp({ n: 3, noise: 0.008 }, { A: { c: 1540, w: 80 }, B: { c: 1520, w: 80 }, C: { c: 1500, w: 80 } }),
    text: `<p>Three species whose bands lie 20 cm⁻¹ apart and are four times as wide. The data are still rank 3, but the spectra are so alike that the third component carries little and its singular value comes down towards the noise. Similar spectra are one of the two causes of rank deficiency [@ch29, p. 633].</p>
      <p>Move the band of C to 1350 cm⁻¹ in its card and watch σ₃ climb out of the noise. The rank counts the directions in which the spectra differ, not bands and not species.</p>`,
  },
  {
    id: 'coevolve', title: 'Two Species, One Profile', s: withSp({ n: 3, noise: 0.003 }, { D: { on: true } }),
    text: `<p>D forms with exactly the profile of C, like two phases that grow together. Four species, but the SVD finds three components: C and D always come in the same ratio, so to the data they are one species with the sum of their spectra. This is rank deficiency from co-evolving concentrations [@ch29, p. 633].</p>
      <p>No choice of <i>n</i> fixes it; the information is not in this data set. The chapter breaks it with a second run in which the two form in another ratio, analysed together with the first [@ch29, Fig. 29.6]. Set D to "grows over the run" and a fourth component appears.</p>`,
  },
  {
    id: 'drift', title: 'A Drifting Baseline', s: withSp({ n: 4, noise: 0.003, drift: 0.15 }),
    text: `<p>Three species and a baseline that tilts more and more over the run. The scree plot shows four components above the noise: the fourth is the baseline, a slope in the loadings and a ramp in time. A component is anything that varies on its own, a species or not.</p>
      <p>Keep <i>n</i> = 3 and the residual is the tilt; keep 4 and it is gone. Before MCR such a component is either kept and resolved like a species, or taken out first by a baseline correction.</p>`,
  },
];

/* Formula boxes */
const frac = (num, den) => `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
const sum = (lo, hi) => `<span class="int">Σ<span class="lims"><span>${hi}</span><span>${lo}</span></span></span>`;
const callout = ({ title, math, text, symbols }) => `<div class="eq-callout">
  <div class="eq-head">${title}</div>
  <div class="eq-math">${math}</div>
  <p class="eq-text">${text}</p>
  <dl class="eq-symbols">${symbols.map(([sym, what]) => `<dt>${sym}</dt><dd>${what}</dd>`).join('')}</dl>
</div>`;

const EQUATIONS = [
  callout({
    title: 'The Bilinear Model',
    math: '<b>D</b> = <b>C</b> <b>S</b><sup>T</sup> + <b>E</b>',
    text: 'Each spectrum is the sum of the pure spectra, each weighted by its concentration [@ch29, Eq. 29.1, p. 626] [@dejuan, Eq. 3, p. 4964]. It holds wherever the signal is linear in concentration, as absorbance is under the Beer–Lambert law.',
    symbols: [
      ['<b>D</b>', 'the data, <i>q</i> × <i>m</i>: one row per spectrum, one column per wavenumber'],
      ['<b>C</b>', 'concentrations, <i>q</i> × <i>N</i>, one column per species'],
      ['<b>S</b>', 'pure spectra, <i>m</i> × <i>N</i>, one column per species'],
      ['<b>E</b>', 'what the model does not explain: ideally the noise alone'],
    ],
  }),
  callout({
    title: 'Singular Value Decomposition',
    math: `<b>D</b> = <b>U</b> <b>Σ</b> <b>V</b><sup>T</sup> = ${sum('<i>i</i>', '')} <i>σ<sub>i</sub></i> <b>u</b><sub><i>i</i></sub> <b>v</b><sub><i>i</i></sub><sup>T</sup>, &emsp; <i>σ</i>₁ ≥ <i>σ</i>₂ ≥ … ≥ 0`,
    text: 'The decomposition behind PCA [@ch29, Eq. 29.4, p. 628]. The letters differ between sources: the chapter writes the diagonal matrix as S and calls its entries eigenvalues (they are the singular values; the eigenvalues of <b>D D</b><sup>T</sup> are their squares), and Golshan et al. write <b>D</b> = <b>CA</b> = <b>USV</b>, with <b>A</b> the spectra and <b>S</b> the singular values [@golshan, Eq. 4, p. 836]. This page keeps <b>D</b>, <b>C</b> and <b>S</b> as the MCR-ALS papers write them [@dejuan, Eq. 3, p. 4964] and uses <b>Σ</b> for the singular values, so no letter means two things. The sign of each pair <b>u</b><sub><i>i</i></sub>, <b>v</b><sub><i>i</i></sub> is free; the page turns each so the largest point of <b>v</b><sub><i>i</i></sub> is positive.',
    symbols: [
      ['<b>u</b><sub><i>i</i></sub>', 'scores of component <i>i</i>, one value per spectrum, unit length (panel 3, in time)'],
      ['<b>v</b><sub><i>i</i></sub>', 'loading of component <i>i</i>, one value per wavenumber, unit length (panel 3, loadings)'],
      ['<i>σ<sub>i</sub></i>', 'singular value: how much of <b>D</b> component <i>i</i> carries (panel 2)'],
    ],
  }),
  callout({
    title: 'Rebuilding from n Components',
    math: `<b>D</b><sub><i>n</i></sub> = ${sum('<i>i</i> = 1', '<i>n</i>')} <i>σ<sub>i</sub></i> <b>u</b><sub><i>i</i></sub> <b>v</b><sub><i>i</i></sub><sup>T</sup>, &emsp; ${sum('<i>ij</i>', '')} <i>e<sub>ij</sub></i>² = ${sum('<i>i</i> > <i>n</i>', '')} <i>σ<sub>i</sub></i>²`,
    text: 'Keeping the first <i>n</i> components gives the matrix of rank <i>n</i> closest to <b>D</b> in the least-squares sense (the Eckart–Young theorem), and the squared residual is the sum of the dropped <i>σ<sub>i</sub></i>². Standard linear algebra. Panel 4 shows <b>E</b> = <b>D</b> − <b>D</b><sub><i>n</i></sub>.',
    symbols: [['<i>e<sub>ij</sub></i>', 'residual of spectrum <i>i</i> at wavenumber <i>j</i>']],
  }),
  callout({
    title: 'Lack of Fit',
    math: `LoF (%) = 100 √(${frac(`Σ <i>e<sub>ij</sub></i>²`, `Σ <i>d<sub>ij</sub></i>²`)}), &emsp; variance explained (%) = 100 (1 − ${frac(`Σ <i>e<sub>ij</sub></i>²`, `Σ <i>d<sub>ij</sub></i>²`)})`,
    text: 'The fit measure the chapter reports for MCR-ALS [@ch29, Eq. 29.2, p. 627], here for the rebuild from <i>n</i> components. The variance explained is the same ratio without the root.',
    symbols: [['<i>d<sub>ij</sub></i>', 'an element of <b>D</b>']],
  }),
  callout({
    title: 'The Noise Level',
    math: '<i>σ</i><sub>noise</sub> ≈ <i>σ</i> (√<i>q</i> + √<i>m</i>)',
    text: 'The largest singular value of a <i>q</i> × <i>m</i> matrix of independent Gaussian noise with standard deviation <i>σ</i>, for large <i>q</i> and <i>m</i>: a standard result of random-matrix theory, not from the chapter. It holds for independent noise only; a drift or correlated detector noise adds components of its own.',
    symbols: [['<i>q</i>, <i>m</i>', 'number of spectra and of points per spectrum (here 241)']],
  }),
];

const GENERAL = `<h2>What This Page Shows</h2>
  <p>A series of spectra measured while a mixture changes is a matrix <b>D</b>: one row per spectrum, one column per wavenumber. If each species adds its own spectrum, scaled by its concentration, <b>D</b> = <b>C</b> <b>S</b><sup>T</sup> + <b>E</b> [@ch29, Eq. 29.1, p. 626], and MCR-ALS has to be told how many components to resolve before it starts, usually from an SVD [@ch29, p. 627] [@dejuan, p. 4970]. The SVD writes <b>D</b> as a sum of components ordered by how much of <b>D</b> each carries. Computing it is easy; deciding where signal ends and noise begins is the hard part [@ch29, p. 628].</p>
  <p>Panel 1 is the data, and the species that made it. Panel 2 is the scree plot: the singular values on a log scale, with the cut between kept and dropped components. Panel 3 shows the components as loadings (spectra), as scores in time, and as score plots of one against the next [@ch29, Fig. 29.2]. Panel 4 shows what is left after rebuilding <b>D</b> from the kept components: structure in the residual means a component is missing, speckle means only noise is left.</p>
  <p>The components are not the species. They are orthogonal and ordered by size, and a loading can be negative where no spectrum is. Turning them into concentrations and pure spectra needs constraints, which is what MCR-ALS adds.</p>
  <h2>Using the Plots</h2>
  <p>Drag the green cut in panel 2, click a point there or a bar in the lack-of-fit view, or pick <i>n</i> on the left: every plot follows. Every setting is on the left and stays there; a case only sets values, hover it for what it shows. "new noise" draws a new realisation with the same <i>σ</i>. The values on the right list each component's share of <b>D</b> and the lack of fit if it were the last one kept.</p>`;

/* ---------------------------------------------------------------------------
   Engine
   --------------------------------------------------------------------------- */
const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const state = { idx: 2, s: null, seed: 1, hover: null };
const M = NU.length, NMAX = 6, NTAB = 8;
const COLOR = { A: C['data-a'], B: C['data-b'], C: C['data-c'], D: C['data-d'] };
const NAME = { A: 'A', B: 'B, from A', C: 'C, from B', D: 'D' };

let S = null, LIM = null;
function compute() {
  const st = state.s, B = build(st, state.seed), r = svd(B.D), total = sumSq(B.D);
  const cum = []; let acc = 0;
  for (const x of r.s) { acc += x * x; cum.push(acc); }
  const lof = cum.map(c => 100 * Math.sqrt(Math.max(total - c, 0) / total));
  S = {
    B, r, total, cum, lof,
    noiseLof: 100 * Math.sqrt(sumSq(B.noise) / total),
    level: st.noise * (Math.sqrt(st.q) + Math.sqrt(M)),
  };
}
/** Plot limits, fixed per case: from the case's clean data, never from a slider. */
function limits() {
  const cs = CASES[state.idx].s, B = build(cs, 1);
  let top = 0;
  for (const row of B.clean) for (const x of row) top = Math.max(top, x);
  let pure = 0;
  for (const sp of cs.species) pure = Math.max(pure, sp.h);
  top = Math.max(top, 0.1);
  LIM = { y: 1.15 * top, map: top, pure: 1.15 * Math.max(pure, 0.1), res: Math.max(0.02 * top, 3 * cs.noise) };
}
/** E = D − D_n, the residual of the rebuild from the first n components. */
function residual(n) {
  const { D } = S.B, { s, u, v } = S.r;
  return D.map((row, i) => {
    const e = Float64Array.from(row);
    for (let k = 0; k < Math.min(n, s.length); k++) { const a = s[k] * u[k][i], vk = v[k]; for (let j = 0; j < M; j++) e[j] -= a * vk[j]; }
    return e;
  });
}

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
const SC = () => (document.documentElement.dataset.w === 'wide' ? CHART.workbenchScale : 1);
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const NU_TICKS = [1800, 1700, 1600, 1500, 1400, 1300].map(v => [v, String(v)]);   // no label at the right edge, where it would be cut
const T_TICKS = ticks(0, T_END, 6, v => v.toFixed(0)).filter(([v]) => v < T_END);
const XLAB_NU = 'wavenumber / cm⁻¹', XLAB_T = 'time / min';
const KEPT = C['ink-700'], DROPPED = C['data-static'], CUT = C['data-highlight'], LEVEL = C['ink-300'];
const fmtS = v => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v >= 1e-3 ? v.toFixed(3) : v.toExponential(1));

function legend(el, items) {
  el.innerHTML = items.filter(Boolean).map(([label, color, cls]) => `<span class="${cls}" style="--c:${color}">${label}</span>`).join('');
}
function colourOf(v, max) {
  const t = clamp(v / max, -1, 1), a = Math.abs(t);
  const [mid, end] = t >= 0 ? [C['map-pos'], C['map-pos-strong']] : [C['map-neg'], C['map-neg-strong']];
  const mix = (c1, c2, f) => hexRgb(c1).map((x, i) => x + (hexRgb(c2)[i] - x) * f);
  return a <= 0.5 ? mix(C.surface, mid, a * 2) : mix(mid, end, (a - 0.5) * 2);
}
function heatmap(canvas, opts, rows, cols, valueAt, max) {
  const p = plot(canvas, opts);
  const off = document.createElement('canvas'); off.width = cols; off.height = rows;
  const octx = off.getContext('2d'), img = octx.createImageData(cols, rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const [R, G, B] = colourOf(valueAt(rows - 1 - r, c), max), o = 4 * (r * cols + c);
    img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  p.ctx.imageSmoothingEnabled = true;
  p.ctx.drawImage(off, p.inner.l, p.inner.t, p.inner.r - p.inner.l, p.inner.b - p.inner.t);
  p.axes();
  return p;
}
const MAP_LEGEND = max => [[`positive, full red at ${fmtS(max)}`, C['map-pos'], 'bar'], [`negative, full blue at −${fmtS(max)}`, C['map-neg'], 'bar']];

/* panel 1: the data, as spectra, as a map, or the species that made it */
function drawData() {
  const st = state.s, cv = $('cData'), sc = SC(), { D, ts, prof, pure } = S.B;
  if (st.view1 === 'map') {
    heatmap(cv, { x: [1800, 1200], y: [0, T_END], xlabel: XLAB_NU, ylabel: XLAB_T, xticks: NU_TICKS, yticks: T_TICKS, scale: sc }, D.length, M, (i, j) => D[i][j], LIM.map);
    $('subData').textContent = `The same ${st.q} spectra as a map, time upwards.`;
    legend($('legData'), MAP_LEGEND(LIM.map));
    return;
  }
  if (st.view1 === 'truth') {
    const W = cv.clientWidth, on = st.species.filter(sp => sp.on);
    const p = plot(cv, { x: [0, T_END], y: [0, 1.08], margin: { r: W / 2 + 8 }, xlabel: XLAB_T, ylabel: 'concentration / –', xticks: ticks(0, T_END, 3, v => v.toFixed(0)), yticks: ticks(0, 1, 4), scale: sc });
    for (const sp of on) p.line(ts, prof[sp.key], COLOR[sp.key]);
    p.axes();
    const p2 = plot(cv, { keep: true, x: [1800, 1200], y: [0, LIM.pure], margin: { l: W / 2 + 46 * sc }, xlabel: XLAB_NU, xticks: [[1800, '1800'], [1500, '1500']], yticks: ticks(0, LIM.pure, 3), scale: sc });
    for (const sp of on) { p2.line(NU, pure[sp.key], COLOR[sp.key]); p2.text(sp.key, sp.c, Math.min(sp.h, LIM.pure * 0.9) + LIM.pure * 0.05, COLOR[sp.key]); }
    p2.axes();
    $('subData').textContent = 'What made the data: concentrations (left), pure spectra in absorbance (right).';
    legend($('legData'), on.map(sp => [NAME[sp.key], COLOR[sp.key], '']));
    return;
  }
  const p = plot(cv, { x: [1800, 1200], y: [-0.06 * LIM.y, LIM.y], xlabel: XLAB_NU, ylabel: 'absorbance / –', xticks: NU_TICKS, yticks: ticks(0, LIM.y, 4), scale: sc });
  p.hline(0);
  for (const row of D) p.line(NU, row, C['data-faint'], CHART.lineFaint);
  p.line(NU, D[0], KEPT, CHART.lineData);
  p.line(NU, D[D.length - 1], KEPT, CHART.lineData, [2, 2]);
  p.axes();
  $('subData').textContent = `${st.q} spectra over ${T_END} min, one row of D each.`;
  legend($('legData'), [['one spectrum', C['data-faint'], ''], ['the first', KEPT, ''], ['the last', KEPT, 'dashed']]);
}

/* panel 2: the scree plot, singular values on a log scale, the cut between kept and dropped */
const LOG = [-4, 2];
const LOG_TICKS = [[-4, '10⁻⁴'], [-3, '10⁻³'], [-2, '0.01'], [-1, '0.1'], [0, '1'], [1, '10'], [2, '100']];
const logOf = v => clamp(Math.log10(Math.max(v, 1e-300)), LOG[0], LOG[1]);
let P2 = null;
function drawScree() {
  const st = state.s, cv = $('cScree'), sc = SC(), s = S.r.s, NS = Math.min(s.length, 15);
  const p = plot(cv, { x: [0.4, NS + 0.6], y: LOG, xlabel: 'component *i*', ylabel: 'singular value *σ*_*i*_', xticks: Array.from({ length: NS }, (_, i) => [i + 1, String(i + 1)]).filter(([v]) => NS <= 10 || v % 2 === 1), yticks: LOG_TICKS, scale: sc });
  const xs = Array.from({ length: NS }, (_, i) => i + 1), ys = xs.map(i => logOf(s[i - 1]));
  if (st.noise > 0) {
    const ly = logOf(S.level);
    p.line([0.4, NS + 0.6], [ly, ly], LEVEL, CHART.lineThin, CHART.dash);
    p.text('noise level', NS + 0.4, ly - 1.2, C['ink-500'], 'right');
  }
  p.line(xs, ys, C['line'], CHART.lineThin);
  const pts = [];
  for (let i = 0; i < NS; i++) {
    const kept = i < st.n, on = state.hover === i;
    p.dot(xs[i], ys[i], kept ? KEPT : DROPPED, on ? CHART.marker + 2 : CHART.marker);
    pts.push({ i, px: p.X(xs[i]), py: p.Y(ys[i]) });
  }
  if (ys.some(y => y <= LOG[0])) p.text('rounding, ≈ 0', NS + 0.4, LOG[0] + 0.3, C['ink-500'], 'right');
  const rx = p.X(st.n + 0.5);
  p.line([st.n + 0.5, st.n + 0.5], LOG, CUT, CHART.lineData, CHART.dash);
  grip(p, rx, CUT);
  p.axes();
  P2 = { p, rx, pts };
  $('subScree').textContent = 'Log scale: steep for signal, flat for noise. Drag the green cut.';
  legend($('legScree'), [['kept', KEPT, 'dot'], ['dropped', DROPPED, 'dot'], ['the cut', CUT, 'dashed'], st.noise > 0 && ['noise level <i>σ</i>(√<i>q</i> + √<i>m</i>)', LEVEL, 'dashed']]);
}

/* panel 3: the components as loadings, as scores in time, or one score against the next */
function drawComp() {
  const st = state.s, cv = $('cComp'), sc = SC(), { s, u, v } = S.r, ts = S.B.ts;
  const nc = Math.min(NMAX, Math.max(st.n + 2, 3), s.length);
  if (st.view3 === 'plane') {
    const W = cv.clientWidth, n = Math.min(st.n, s.length - 1);
    const pairs = [n >= 2 ? [n - 2, n - 1] : [0, 1], [n - 1, n]];
    const R = 3.2, tk = [[-3, '−3'], [0, '0'], [3, '3']];
    pairs.forEach(([a, b], k) => {
      const kept = a < st.n && b < st.n;
      const p = plot(cv, { keep: k === 1, x: [-R, R], y: [-R, R], margin: k ? { l: W / 2 + 44 * sc } : { r: W / 2 + 8 }, xlabel: `scores ${a + 1} (→) and ${b + 1} (↑)`, xticks: tk, yticks: tk, scale: sc });
      p.hline(0);
      const f = Math.sqrt(st.q), xs = Array.from(u[a], x => x * f), ys = Array.from(u[b], x => x * f);
      p.line(xs, ys, kept ? C['ink-300'] : C['data-faint'], CHART.lineThin);
      for (let i = 0; i < xs.length; i++) p.dot(clamp(xs[i], -R, R), clamp(ys[i], -R, R), kept ? KEPT : DROPPED, 2.5);
      p.text('*t* = 0', clamp(xs[0], -R + 0.8, R - 0.8), clamp(ys[0], -R, R - 0.4) + 0.35, C['ink-500']);
      p.axes();
    });
    $('subComp').textContent = 'One score against the next: a path while both are signal.';
    legend($('legComp'), [['both kept', KEPT, 'dot'], ['one dropped', DROPPED, 'dot'], ['scores ×√<i>q</i>, so a flat profile sits at 1', C['ink-300'], '']]);
    return;
  }
  const inTime = st.view3 === 'scores', xs = inTime ? ts : NU, f = inTime ? Math.sqrt(st.q) : Math.sqrt(M);
  const p = plot(cv, {
    x: inTime ? [0, T_END] : [1800, 1200], y: [0, nc], xlabel: inTime ? XLAB_T : XLAB_NU, ylabel: 'component *i*',
    xticks: inTime ? T_TICKS : NU_TICKS, yticks: Array.from({ length: nc }, (_, i) => [nc - i - 0.5, String(i + 1)]), scale: sc,
  });
  for (let i = 1; i < nc; i++) p.hline(i, C['line-soft']);
  for (let i = 0; i < nc; i++) {
    const mid = nc - i - 0.5, vec = inTime ? u[i] : v[i], kept = i < st.n;
    p.hline(mid, C['line-zero']);
    p.line(xs, Array.from(vec, x => mid + clamp(x * f * 0.15, -0.48, 0.48)), kept ? KEPT : DROPPED, kept ? CHART.lineData : CHART.lineThin);
    p.text(`*σ*_${i + 1}_ = ${fmtS(s[i])}`, inTime ? T_END * 0.98 : 1205, mid - 0.1, kept ? KEPT : C['ink-500'], 'right');
  }
  p.axes();
  $('subComp').textContent = inTime
    ? 'Columns of U, scaled to one height: smooth, then noise.'
    : 'Rows of Vᵀ, scaled to one height. Not the species.';
  legend($('legComp'), [['kept', KEPT, ''], ['dropped', DROPPED, '']]);
}

/* panel 4: what is left after the rebuild from n, as a map, or the lack of fit for every n */
const LOF_LOG = [-3, 2];
const LOF_TICKS = [[-3, '0.001'], [-2, '0.01'], [-1, '0.1'], [0, '1'], [1, '10'], [2, '100']];
let P4 = null;
function drawFit() {
  const st = state.s, cv = $('cFit'), sc = SC();
  if (st.view4 === 'residual') {
    const E = residual(st.n);
    heatmap(cv, { x: [1800, 1200], y: [0, T_END], xlabel: XLAB_NU, ylabel: XLAB_T, xticks: NU_TICKS, yticks: T_TICKS, scale: sc }, E.length, M, (i, j) => E[i][j], LIM.res);
    P4 = null;
    $('subFit').textContent = `D minus its rebuild from ${st.n}: a pattern means one is missing.`;
    legend($('legFit'), MAP_LEGEND(LIM.res));
    return;
  }
  const nb = Math.min(NTAB, S.lof.length);
  const lofLog = v => clamp(Math.log10(Math.max(v, 1e-300)), LOF_LOG[0], LOF_LOG[1]);
  const p = plot(cv, { x: [0.4, nb + 0.6], y: LOF_LOG, xlabel: 'components kept *n*', ylabel: 'lack of fit / %', xticks: Array.from({ length: nb }, (_, i) => [i + 1, String(i + 1)]), yticks: LOF_TICKS, scale: sc });
  const bars = [];
  for (let i = 0; i < nb; i++) {
    const x0 = p.X(i + 1 - 0.32), x1 = p.X(i + 1 + 0.32), y0 = p.Y(LOF_LOG[0]), y1 = p.Y(lofLog(S.lof[i]));
    p.ctx.fillStyle = i + 1 === st.n ? KEPT : DROPPED;
    p.ctx.fillRect(x0, y1, x1 - x0, y0 - y1);
    bars.push({ i, l: x0, r: x1 });
  }
  const cur = S.lof[st.n - 1];
  p.text(`${cur < 0.001 ? '< 0.001' : cur.toPrecision(3)} %`, st.n, lofLog(cur) + 0.3, KEPT);
  if (st.noise > 0) {
    const ly = lofLog(S.noiseLof);
    p.line([0.4, nb + 0.6], [ly, ly], LEVEL, CHART.lineThin, CHART.dash);
    p.text('the noise alone', nb + 0.4, ly + 0.25, C['ink-500'], 'right');
  }
  p.axes();
  P4 = { p, bars };
  $('subFit').innerHTML = 'Log scale, one bar per <i>n</i>. Click a bar to keep that many.';
  legend($('legFit'), [['chosen <i>n</i>', KEPT, 'bar'], ['other <i>n</i>', DROPPED, 'bar'], st.noise > 0 && ['LoF of the noise that was added', LEVEL, 'dashed']]);
}

/* the values: each component's share and the lack of fit if it were the last one kept */
function drawTable() {
  const st = state.s, { s } = S.r, nt = Math.min(NTAB, s.length);
  const sq = s.map(x => x * x), all = sq.reduce((a, b) => a + b, 0);
  $('vN').textContent = st.n;
  let rows = '<tr><th><i>i</i></th><th><i>σ<sub>i</sub></i></th><th>share %</th><th>sum %</th><th>LoF %</th></tr>';
  for (let i = 0; i < nt; i++) {
    const col = i < st.n ? C['ink-900'] : C['ink-300'];
    rows += `<tr style="color:${col}"><td>${i + 1}</td><td>${fmtS(s[i])}</td><td>${(100 * sq[i] / all).toFixed(3)}</td><td>${(100 * S.cum[i] / all).toFixed(3)}</td><td>${S.lof[i] < 0.001 ? '< 0.001' : S.lof[i].toPrecision(3)}</td></tr>`;
  }
  rows += `<tr><td colspan="2">noise level</td><td colspan="3">${st.noise > 0 ? fmtS(S.level) : '–'}</td></tr>`;
  rows += `<tr><td colspan="2">LoF of the noise</td><td colspan="3">${st.noise > 0 ? `${S.noiseLof.toPrecision(3)} %` : '–'}</td></tr>`;
  $('readout').innerHTML = rows;
  $('sideNote').innerHTML = 'Share: <i>σ<sub>i</sub></i>² over the sum of all, the part of Σ<i>d<sub>ij</sub></i>² that component <i>i</i> carries. LoF: Eq. 29.2 for the rebuild from 1 … <i>i</i>. The last two rows use the noise this page added, which a real measurement does not tell you.';
}

function draw() {
  drawData(); drawScree(); drawComp(); drawFit(); drawTable();
  sums(); controls.refresh();
}
function update() { compute(); draw(); markChanged(); }

/* ---------------------------------------------------------------------------
   Changed against the case
   --------------------------------------------------------------------------- */
const snap = s => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => !DISPLAY_ONLY.includes(k))));
const caseS = () => CASES[state.idx].s;
function markChanged() {
  selector.changed(snap(state.s) !== snap(caseS()));
  document.querySelectorAll('.sp-card').forEach((card, i) => {
    const rst = card.querySelector('[data-f="resetSlot"]');
    if (rst) rst.hidden = JSON.stringify(state.s.species[i]) === JSON.stringify(caseS().species[i]) && (i !== 3 || state.s.dProfile === caseS().dProfile);
  });
  renderRail();
}

/* ---------------------------------------------------------------------------
   Value controls
   --------------------------------------------------------------------------- */
const kFromR = r => (r <= 0 ? 0 : 0.005 * Math.pow(200, (r - 1) / 99));
const rFromK = k => (k <= 0 ? 0 : clamp(Math.round(1 + 99 * Math.log(k / 0.005) / Math.log(200)), 1, 100));
function bindOf(key) {
  const st = () => state.s;
  if (key === 'k1' || key === 'k2') return {
    label: key === 'k1' ? '<i>k</i>₁, A → B' : '<i>k</i>₂, B → C', unit: 'min⁻¹', min: 0, max: 100, step: 1,
    get: () => st()[key], set: v => { st()[key] = clamp(v, 0, 1); }, toR: rFromK, fromR: kFromR,
    fmt: v => v.toFixed(3), caseV: () => caseS()[key], def: key === 'k1' ? 0.08 : 0.04, redraw: 'update',
  };
  if (key === 'q') return {
    label: 'spectra <i>q</i>', unit: '', min: 10, max: 120, step: 1,
    get: () => st().q, set: v => { st().q = clamp(Math.round(v), 10, 120); }, toR: v => v, fromR: r => r,
    fmt: v => String(v), caseV: () => caseS().q, def: 60, redraw: 'update',
  };
  if (key === 'noise') return {
    label: 'noise <i>σ</i>', unit: '', min: 0, max: 40, step: 1,
    get: () => st().noise, set: v => { st().noise = clamp(v, 0, 0.05); }, toR: v => Math.round(v / 0.0005), fromR: r => r * 0.0005,
    fmt: v => v.toFixed(4), caseV: () => caseS().noise, def: 0, redraw: 'update',
  };
  if (key === 'drift') return {
    label: 'baseline drift', unit: '', min: 0, max: 30, step: 1,
    get: () => st().drift, set: v => { st().drift = clamp(v, 0, 0.5); }, toR: v => Math.round(v / 0.01), fromR: r => r * 0.01,
    fmt: v => v.toFixed(2), caseV: () => caseS().drift, def: 0, redraw: 'update',
  };
  throw new Error(`no control ${key}`);
}
const sums = foldingGroups(() => {
  const st = state.s;
  return {
    case: `${state.idx + 1} · ${CASES[state.idx].title}`,
    components: `<i>n</i> = ${st.n}`,
    species: st.species.filter(s => s.on).map(s => s.key).join(' ') || 'none on',
    kinetics: `<i>k</i>₁ ${st.k1.toFixed(3)} · <i>k</i>₂ ${st.k2.toFixed(3)}`,
    measurement: `<i>q</i> ${st.q} · <i>σ</i> ${st.noise.toFixed(4)} · drift ${st.drift.toFixed(2)}`,
  };
});
const controls = valueControls({
  bindOf, update, draw,
  after: () => {
    if (!state.s) return;
    setSeg($('nSeg'), state.s.n); setSeg($('view1'), state.s.view1); setSeg($('view3'), state.s.view3); setSeg($('view4'), state.s.view4);
  },
});

/* ---------------------------------------------------------------------------
   Species cards: one per slot, folded to the name row when the page opens
   --------------------------------------------------------------------------- */
const folded = new Set(['A', 'B', 'C', 'D']);
const num = (v, d) => String(+(+v).toFixed(d));
function slotCard(sp, i) {
  const f = folded.has(sp.key);
  const prof = sp.key === 'D' ? `<label class="ctl wide"><span>concentration</span><select data-f="dProfile">
      <option value="C"${state.s.dProfile === 'C' ? ' selected' : ''}>exactly as C</option>
      <option value="ramp"${state.s.dProfile === 'ramp' ? ' selected' : ''}>grows over the run</option></select></label>` : '';
  return `<div class="sp-card${sp.on ? '' : ' off'}${f ? ' folded' : ''}" data-i="${i}" style="--c:${COLOR[sp.key]}">
    <div class="sp-top">
      <label class="switch" title="${sp.on ? 'in the sample: click to take it out' : 'not in the sample: click to add it'}"><input type="checkbox" data-f="on"${sp.on ? ' checked' : ''}><span></span></label>
      <span class="sp-swatch"></span>
      <span class="sp-label">${NAME[sp.key]}</span>
      <button type="button" class="sp-fold" data-f="fold" aria-expanded="${!f}" title="${f ? 'Show the settings of this species' : 'Fold this species to its name'}">${f ? '▸' : '▾'}</button>
      <button type="button" class="rst" data-f="resetSlot" title="this species back to the case" hidden>↺</button>
    </div>
    <div class="sp-body">
      ${prof}
      <label class="ctl num"><span>centre</span><input type="number" data-f="c" min="1200" max="1800" step="5" value="${num(sp.c, 1)}"></label>
      <label class="ctl num"><span>FWHM</span><input type="number" data-f="w" min="5" max="300" step="5" value="${num(sp.w, 1)}"></label>
      <label class="ctl num"><span>height</span><input type="number" data-f="h" min="0" max="2" step="0.05" value="${num(sp.h, 3)}"></label>
    </div>
  </div>`;
}
function renderSpecies() { $('species').innerHTML = state.s.species.map(slotCard).join(''); }
$('species').addEventListener('input', e => {
  const t = e.target, f = t.dataset.f, card = t.closest('.sp-card');
  if (!card || !['c', 'w', 'h'].includes(f)) return;
  const v = parseFloat(t.value), sp = state.s.species[+card.dataset.i];
  if (!Number.isFinite(v)) return;
  if (f === 'c') sp.c = clamp(v, 1200, 1800);
  else if (f === 'w') sp.w = clamp(v, 5, 300);
  else sp.h = clamp(v, 0, 2);
  update();
});
$('species').addEventListener('change', e => {
  const t = e.target, f = t.dataset.f, card = t.closest('.sp-card');
  if (!card) return;
  const sp = state.s.species[+card.dataset.i];
  if (f === 'on') sp.on = t.checked;
  else if (f === 'dProfile') state.s.dProfile = t.value;
  else return;
  renderSpecies(); update();
});
$('species').addEventListener('click', e => {
  const t = e.target.closest('[data-f]'), card = e.target.closest('.sp-card');
  if (!card) return;
  const i = +card.dataset.i, key = state.s.species[i].key;
  if (t?.dataset.f === 'fold') { if (folded.has(key)) folded.delete(key); else folded.add(key); renderSpecies(); markChanged(); return; }
  if (t?.dataset.f === 'resetSlot') {
    state.s.species[i] = clone(caseS().species[i]);
    if (i === 3) state.s.dProfile = caseS().dProfile;
    renderSpecies(); update(); return;
  }
  if (card.classList.contains('folded') && !e.target.closest('.switch')) { folded.delete(key); renderSpecies(); markChanged(); }
});

/* ---------------------------------------------------------------------------
   The other controls and the plots
   --------------------------------------------------------------------------- */
const setN = n => { const c = clamp(Math.round(n), 1, Math.min(NMAX, S.r.s.length)); if (c !== state.s.n) { state.s.n = c; draw(); } };
const segClick = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b) { fn(b.dataset.v); draw(); } });
segClick('nSeg', v => { state.s.n = +v; });
segClick('view1', v => { state.s.view1 = v; });
segClick('view3', v => { state.s.view3 = v; });
segClick('view4', v => { state.s.view4 = v; });
$('reseed').addEventListener('click', () => { state.seed += 1; update(); });
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
  const s = S.r.s, sq = s.map(x => x * x), all = sq.reduce((a, b) => a + b, 0), noisy = state.s.noise > 0;
  const where = !noisy ? (s[i] < 1e-6 * s[0] ? 'rounding: the data have no more independent directions' : 'above zero: the data have this direction')
    : s[i] > 1.2 * S.level ? 'above the noise level' : s[i] > 0.8 * S.level ? 'at the noise level' : 'below the noise level';
  return `<div class="tip-title">Component ${i + 1}, <i>σ</i> = ${fmtS(s[i])}</div>
    <p>It carries ${(100 * sq[i] / all).toPrecision(3)} % of Σ<i>d<sub>ij</sub></i>², ${where}. Kept up to here, the lack of fit is ${S.lof[i] < 0.001 ? 'below 0.001' : S.lof[i].toPrecision(3)} %.</p><p class="tip-hint">click to keep ${i + 1} component${i ? 's' : ''}</p>`;
}
dragRuler(cScree, {
  rulerXs: () => (P2 ? [P2.rx] : []), plotOf: () => P2?.p,
  onDrag: x => { const { inner } = P2.p, NS = Math.min(S.r.s.length, 15); setN(0.4 + (x - inner.l) / (inner.r - inner.l) * (NS + 0.2) - 0.5); },
  hover: e => {
    const q = hitPt(e), i = q ? q.i : null;
    if (i !== state.hover) { state.hover = i; drawScree(); }
    if (q) tooltip.show(ptText(q.i), e.clientX, e.clientY); else tooltip.hide();
    return !!q;
  },
  down: e => { const q = hitPt(e); if (!q) return false; tooltip.hide(); setN(q.i + 1); return true; },
  leave: () => { if (state.hover != null) { state.hover = null; drawScree(); } tooltip.hide(); },
});

/* panel 4, lack of fit: click a bar */
$('cFit').addEventListener('click', e => {
  if (!P4) return;
  const { x } = localIn($('cFit'), e), b = P4.bars.find(q => x >= q.l - 4 && x <= q.r + 4);
  if (b) setN(b.i + 1);
});
$('cFit').addEventListener('pointermove', e => {
  if (!P4) { $('cFit').style.cursor = 'default'; return; }
  const { x } = localIn($('cFit'), e);
  $('cFit').style.cursor = P4.bars.some(q => x >= q.l - 4 && x <= q.r + 4) ? 'pointer' : 'default';
});

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
    ...st.species.map((sp, i) => rail.btn(`sp${i}`, sp.key, `${NAME[sp.key]}: ${sp.on ? 'on. Click to switch off' : 'off. Click to switch on'}`, { text: true, on: sp.on, style: `--c:${COLOR[sp.key]}` })),
    rail.rule,
    rail.btn('reseed', '⟳', 'New noise', { text: true }),
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
  if (r.startsWith('sp')) { const sp = state.s.species[+r.slice(2)]; sp.on = !sp.on; renderSpecies(); update(); }
});

const panels = initWorkbench({ redraw: draw, renderRail });
const selector = caseSelector({ list: CASES, onSelect: i => selectCase(i) });

function selectCase(idx, push = true) {
  state.idx = idx;
  state.s = clone(CASES[idx].s);
  state.hover = null;
  selector.mark(idx);
  limits();
  renderSpecies();
  if (push) { try { const u = new URL(location.href); u.searchParams.set('case', CASES[idx].id); history.replaceState(null, '', u); } catch { /* not essential */ } }
  update();
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
  selectCase(start < 0 ? state.idx : start, false);
  renderCitations([$('general'), $('equations'), $('caseTexts')], $('refs'), SOURCES);
});

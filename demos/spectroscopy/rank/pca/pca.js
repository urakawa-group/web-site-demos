/**
 * Rank · PCA: the SVD after centring (and, to compare, autoscaling). Two
 * points of the spectra drawn against each other show what centring does
 * to a direction; the scree plots of raw, centred and autoscaled data show
 * what it does to the rank. See the comment block in index.html.
 */
import { initShell } from '../../../../assets/shell.js';
import { C, CHART } from '../../../../assets/tokens.js';
import { plot, ticks } from '../../../../assets/plot.js';
import { renderCitations } from '../../../../assets/cite.js';
import { svd, sumSq } from '../../../../assets/linalg.js';
import {
  fitWorkbench, initWorkbench, valueControls, foldingGroups, caseSelector, tooltip,
  setSeg, rail, grip, dragRuler, localIn, clamp, reserveLegends,
} from '../../../../assets/workbench.js';
import { AXES, T_END, build } from '../mixture.js';
import {
  $, clone, M, SOURCES, DATA_BASE, caseOf, XAS_SPECIES, KEPT, DROPPED, CUT, LEVEL, COLOR, PREP_NAME,
  prepare, residual, fmtS, SC, T_TICKS, XLAB_T, axOf, xRangeOf, legend, legendHtml,
  dataLimits, drawData, dataLegends, drawBlocks, BLOCK_LEGEND, BLOCK_LEGEND_STATIC, dataControls, techniqueSwitch, carriedData,
  callout, frac, sum, EQ_BILINEAR, EQ_NOISE,
} from '../common.js';

initShell({ page: 'demo', views: true });

/* ---------------------------------------------------------------------------
   Settings: the data (common.js) plus
     n      components kept;  prep 'raw' | 'centre' | 'auto'
     pa, pb the two points of panel 2, in axis units (display only)
     view1  'spectra' | 'centred' | 'map' | 'truth';  view3 'scree' | 'loadings' | 'scores';  view4 'blocks' | 'numbers'
   --------------------------------------------------------------------------- */
const NMAX = 10, NTAB = 10, PREPS = ['raw', 'centre', 'auto'];
const base = { ...clone(DATA_BASE), n: 2, prep: 'centre', pa: 1650, pb: 1500, view1: 'spectra', view3: 'scree', view4: 'blocks' };
const DISPLAY_ONLY = ['n', 'pa', 'pb', 'view1', 'view3', 'view4'];
const cs = (o, f) => caseOf(base, o, f);

const CASES = [
  {
    id: 'cloud', title: 'Two Species, Two Points', s: cs({ n: 1, k1: 0.06, k2: 0, noise: 0.004 }, { C: { on: false } }),
    text: `<p>A turns into B. Panel 2 draws every spectrum as one point: its value at the band of A against its value at the band of B. Because A + B = 1, the points lie on a line from "all A" to "all B".</p>
      <p>The uncentred first direction <b>v</b>₁ (dashed) starts at the origin and points at the data, because the SVD describes the spread about zero. PCA takes the mean off first, so its first direction <b>p</b>₁ starts at the mean and lies along the line, where the data actually vary. Drag the two points in panel 1 to any other pair.</p>`,
  },
  {
    id: 'closure', title: 'Centring Costs a Component', s: cs({ n: 2, noise: 0.004 }),
    text: `<p>A → B → C, and A + B + C = 1 at every time. After the mean is taken off, the centred concentrations add up to zero, so one of them is redundant: panel 3 shows three components above the noise for the raw data and two for the centred. The third is in the mean spectrum.</p>
      <p>A centred PCA counts a closed system one short. That is not an error of the data, only of the centred view: the SVD of the raw matrix still sees all three.</p>`,
  },
  {
    id: 'change', title: 'The Change About the Mean', s: cs({ n: 2, noise: 0.002, view1: 'centred', view3: 'loadings' }),
    text: `<p>Centred, every spectrum is its difference from the mean spectrum (panel 1): early ones have more A than average and less C, late ones the other way round. The loadings describe that change. They have negative lobes where one species is used up while another forms, they are orthogonal by construction, and they are not pure spectra.</p>
      <p>The scores in time are signed mixtures of the concentration profiles. Getting from them to concentrations needs constraints: that is MCR, not PCA.</p>`,
  },
  {
    id: 'auto', title: 'Autoscaling Spectra', s: cs({ n: 3, noise: 0.004, prep: 'auto' }),
    text: `<p>Autoscaling divides every point of the spectrum by its standard deviation, so every point counts the same. Where there is no band, that standard deviation is the noise, and the noise is now blown up to the weight of the bands: in panel 3 the flat tail of the autoscaled data rises to the level of its third component.</p>
      <p>Autoscaling suits variables in different units, not the points of one spectrum. The raw and centred curves keep the noise far below the signal.</p>`,
  },
  {
    id: 'xas', title: 'XAS: A Common Step', s: cs({ axis: 'xas', n: 2, noise: 0.002, pa: 1, pb: 8 }, XAS_SPECIES),
    text: `<p>Every XAS spectrum rises to 1 after the edge. Raw, that common step is the first component and carries nearly all of the sum of squares; the edges that move are small next to it. Centring takes the step into the mean, and what is left is the change.</p>
      <p>With closure (A + B + C = 1) the centred data are rank 2 here, the raw ones rank 3, as the chapter's normalised quick-XAS data would be [@ch29, p. 627].</p>`,
  },
];

const EQUATIONS = [
  EQ_BILINEAR,
  callout({
    title: 'PCA Is the SVD of the Centred Matrix',
    math: `<b>X</b><sub>c</sub> = <b>X</b> − <b>1</b> <b>x̄</b><sup>T</sup> = <b>U</b> diag(<b>σ</b>) <b>V</b><sup>T</sup> = <b>T</b> <b>P</b><sup>T</sup>, &emsp; <b>T</b> = <b>U</b> diag(<b>σ</b>), &emsp; <b>P</b> = <b>V</b>`,
    text: 'Taking the mean spectrum off every row turns the SVD into PCA: the loadings <b>P</b> are the right singular vectors, the scores <b>T</b> the left ones times the singular values. The chapter computes the principal components this way [@ch29, Eq. 29.4, p. 628]. Without centring the first direction describes the spread about the origin, with it the spread about the mean (panel 2).',
    symbols: [['<b>x̄</b>', 'the mean spectrum'], ['<b>1</b>', 'a column of <i>q</i> ones'], ['<b>T</b>, <b>P</b>', 'scores (one row per spectrum) and loadings (one row per point)']],
  }),
  callout({
    title: 'Variance of a Component',
    math: `<i>λ<sub>i</sub></i> = ${frac('<i>σ<sub>i</sub></i>²', '<i>q</i> − 1')}, &emsp; explained variance = ${frac('<i>σ<sub>i</sub></i>²', `${sum('<i>j</i>', '')} <i>σ<sub>j</sub></i>²`)}`,
    text: 'The eigenvalues of the covariance matrix <b>X</b><sub>c</sub><sup>T</sup><b>X</b><sub>c</sub>/(<i>q</i> − 1) are the squared singular values over <i>q</i> − 1. On a log scree plot the square doubles the slope but moves no elbow. Standard linear algebra.',
    symbols: [['<i>λ<sub>i</sub></i>', 'variance along component <i>i</i>']],
  }),
  callout({
    title: 'Closure and Centring',
    math: `${sum('<i>k</i>', '')} <i>c<sub>k</sub></i>(<i>t</i>) = 1 &ensp;⇒&ensp; ${sum('<i>k</i>', '')} (<i>c<sub>k</sub></i>(<i>t</i>) − <i>c̄<sub>k</sub></i>) = 0`,
    text: 'If the concentrations add up to a constant, the centred ones add up to zero, so one centred profile is a combination of the others and the rank of <b>X</b><sub>c</sub> is one less than that of <b>X</b>. The same holds for any combination of profiles that stays constant.',
    symbols: [['<i>c̄<sub>k</sub></i>', 'the mean concentration of species <i>k</i> over the run']],
  }),
  callout({
    title: 'Autoscaling',
    math: `<i>x</i><sup>s</sup><sub><i>ij</i></sub> = ${frac('<i>x<sub>ij</sub></i> − <i>x̄<sub>j</sub></i>', '<i>s<sub>j</sub></i>')}`,
    text: 'Centred, and every column divided by its standard deviation, so every point of the spectrum has unit variance. Standard for variables in different units; for spectra it weights a noise-only point as much as a band.',
    symbols: [['<i>s<sub>j</sub></i>', 'standard deviation of column <i>j</i> over the spectra']],
  }),
  EQ_NOISE,
];

const GENERAL = `<h2>What This Page Shows</h2>
  <p>PCA is the singular value decomposition of the data after the mean spectrum has been taken off every row. The chapter computes the principal components this way and reads the rank from them [@ch29, Eq. 29.4, p. 628]; the SVD page shows the decomposition itself. This page is about the one step in between, centring, and its cousin, autoscaling.</p>
  <p>Panel 1 is the data, raw or centred, with two points marked. Panel 2 draws every spectrum as one point at those two positions: a cloud, with the first direction of the raw SVD and the two directions of PCA. Panel 3 compares the singular values of raw, centred and autoscaled data, and shows the loadings and scores of the chosen one. Panel 4 is the operation, every block filled with its numbers.</p>
  <p>Centring changes what the first component is (the mean, or the main change), and it removes one component when the concentrations add up to a constant. Autoscaling changes the weight of every point, noise included. Neither makes a component a species. The technique switch on the left takes your data to the SVD and EFA pages.</p>
  <h2>Using the Plots</h2>
  <p>Drag the two green lines in panel 1 (spectra view) to choose the points of panel 2. Pick raw, centred or autoscaled on the left, and <i>n</i>. Every setting is on the left and stays there; a case only sets values, hover it for what it shows.</p>`;

/* ---------------------------------------------------------------------------
   Engine: the same data, three ways
   --------------------------------------------------------------------------- */
const state = { idx: 0, s: null, seed: 1 };
let S = null, LIM = null;
function compute() {
  const st = state.s, B = build(st, state.seed), ways = {};
  for (const p of PREPS) {
    const P = prepare(B.X, B.noise, p), r = svd(P.Xp), total = sumSq(P.Xp) || 1;
    ways[p] = { ...P, r, total, share: r.s.map(x => 100 * x * x / total) };
  }
  S = { B, ways, level: st.noise * (Math.sqrt(st.q) + Math.sqrt(M)) };
}
const cur = () => S.ways[state.s.prep];
function limits() {
  const st = state.s, raw = dataLimits(S.B.X, S.B.pure), cen = dataLimits(S.ways.centre.Xp, S.B.pure), cw = cur();
  LIM = { raw, cen, map: dataLimits(cw.Xp, S.B.pure).map, pure: raw.pure };
}
const idxOf = v => { const g = S.B.grid; let best = 0; for (let j = 1; j < g.length; j++) if (Math.abs(g[j] - v) < Math.abs(g[best] - v)) best = j; return best; };

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
let P1 = null;
const centredLegend = [['spectrum − mean', C['data-faint'], ''], ['the first', KEPT, ''], ['the last', KEPT, 'dashed'], ['the two points', CUT, 'dashed']];
function drawDataPanel() {
  const st = state.s, cv = $('cData');
  P1 = null;
  const view = st.view1 === 'centred' ? 'spectra' : st.view1;
  const Xp = st.view1 === 'centred' ? S.ways.centre.Xp : st.view1 === 'map' ? cur().Xp : S.B.X;
  const lim = st.view1 === 'centred' ? LIM.cen : st.view1 === 'map' ? { ...LIM.raw, map: LIM.map } : LIM.raw;
  const o = drawData(cv, {
    st, B: S.B, Xp, lim, view, ylabel: st.view1 === 'centred' ? 'signal − mean / –' : 'signal / –',
    what: st.view1 === 'centred' ? ', centred' : st.view1 === 'map' && st.prep !== 'raw' ? `, ${PREP_NAME[st.prep]}` : '',
    after: p => {
      const xs = [st.pa, st.pb];
      for (const x of xs) { p.line([x, x], lim.y, CUT, CHART.lineData, CHART.dash); grip(p, p.X(x), CUT); }
      p.text('a', st.pa, lim.y[1] - 0.12 * (lim.y[1] - lim.y[0]), CUT); p.text('b', st.pb, lim.y[1] - 0.12 * (lim.y[1] - lim.y[0]), CUT);
      P1 = { p, xs: xs.map(x => p.X(x)) };
    },
  });
  $('subData').textContent = st.view1 === 'centred' ? 'Each spectrum minus the mean.' : o.sub;
  legend($('legData'), st.view1 === 'centred' ? centredLegend : view === 'spectra' ? [...o.leg, ['the two points', CUT, 'dashed']] : o.leg);
}

/* panel 2: two points of every spectrum, as a cloud */
const cloudLegend = [['one spectrum', C['ink-300'], 'dot'], ['the mean', KEPT, 'ring'], ['<b>v</b>₁, raw SVD', C['ink-500'], 'dashed'], ['<b>p</b>₁, <b>p</b>₂, PCA', KEPT, '']];
function drawCloud() {
  const st = state.s, cv = $('cCloud'), sc = SC(), X = S.B.X, a = idxOf(st.pa), b = idxOf(st.pb);
  const xs = X.map(r => r[a]), ys = X.map(r => r[b]), q = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / q, my = ys.reduce((s, v) => s + v, 0) / q;
  // raw SVD of the q × 2 matrix: the direction of largest sum of squares about the origin
  const sxx = xs.reduce((s, v) => s + v * v, 0), syy = ys.reduce((s, v) => s + v * v, 0), sxy = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const ang = (A, Bv, Cv) => 0.5 * Math.atan2(2 * Cv, A - Bv);
  const thRaw = ang(sxx, syy, sxy);
  const cxx = sxx - q * mx * mx, cyy = syy - q * my * my, cxy = sxy - q * mx * my, thPca = ang(cxx, cyy, cxy);
  const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, l1 = tr / 2 + Math.sqrt(Math.max(tr * tr / 4 - det, 0)), l2 = Math.max(tr - l1, 0);
  const lo = Math.min(0, ...xs, ...ys), hi = Math.max(...xs, ...ys, 0.05), pad = 0.08 * (hi - lo);
  const R = [lo - pad, hi + pad], ax = axOf(st), unit = st.axis === 'ir' ? ' cm⁻¹' : st.axis === 'xas' ? ' eV' : '';
  const p = plot(cv, { x: R, y: R, xlabel: `at *a* = ${st.pa.toFixed(0)}${unit} (→) and *b* = ${st.pb.toFixed(0)}${unit} (↑)`, xticks: ticks(R[0], R[1], 4), yticks: ticks(R[0], R[1], 4), scale: sc });
  p.hline(0); p.line([0, 0], R, C['line-zero'], 1);
  p.line(xs, ys, C['line'], CHART.lineThin);
  for (let i = 0; i < q; i++) p.dot(xs[i], ys[i], C['ink-300'], 2.5);
  const L = (hi - lo) * 2, dir = th => [Math.cos(th), Math.sin(th)];
  const [ux, uy] = dir(thRaw); const sgn = ux * mx + uy * my < 0 ? -1 : 1;
  p.line([0, sgn * ux * L], [0, sgn * uy * L], C['ink-500'], CHART.lineData, CHART.dash);
  const [px, py] = dir(thPca), [qx, qy] = [-py, px], s1 = 2 * Math.sqrt(l1 / (q - 1)), s2 = 2 * Math.sqrt(l2 / (q - 1));
  p.line([mx - px * s1, mx + px * s1], [my - py * s1, my + py * s1], KEPT, CHART.lineHighlight);
  p.line([mx - qx * s2, mx + qx * s2], [my - qy * s2, my + qy * s2], KEPT, CHART.lineThin);
  p.ctx.strokeStyle = KEPT; p.ctx.lineWidth = 2; p.ctx.fillStyle = C.surface;
  p.ctx.beginPath(); p.ctx.arc(p.X(mx), p.Y(my), CHART.marker, 0, 2 * Math.PI); p.ctx.fill(); p.ctx.stroke();
  const deg = th => { let d = th * 180 / Math.PI; d = ((d % 180) + 180) % 180; return d; };
  p.text(`*v*_1_ at ${deg(thRaw).toFixed(0)}°, *p*_1_ at ${deg(thPca).toFixed(0)}°`, R[0] + 0.03 * (R[1] - R[0]), R[1] - 0.12 * (R[1] - R[0]), C['ink-500'], 'left');
  p.axes();
  $('subCloud').textContent = 'Each spectrum as a point, at a and b.';
  legend($('legCloud'), cloudLegend);
  void ax;
}

/* panel 3: singular values of the three ways, or the loadings and scores of the chosen one */
const screeLegend = () => [['chosen', KEPT, ''], ['the others', DROPPED, ''], ['kept', KEPT, 'dot'], state.s.noise > 0 && state.s.prep !== 'auto' && ['noise level', LEVEL, 'dashed']];
const stripLegend = [['kept', KEPT, ''], ['dropped', DROPPED, '']];
const SH_LOG = [-6, 2], SH_TICKS = [[-6, '10⁻⁶'], [-4, '10⁻⁴'], [-2, '0.01'], [0, '1'], [2, '100']];
function drawComp() {
  const st = state.s, cv = $('cComp'), sc = SC(), ax = axOf(st);
  if (st.view3 === 'scree') {
    const NS = 12, lg = v => clamp(Math.log10(Math.max(v, 1e-300)), SH_LOG[0], SH_LOG[1]);
    const p = plot(cv, { x: [0.4, NS + 0.9], y: SH_LOG, xlabel: 'component *i*', ylabel: 'share / %', xticks: Array.from({ length: NS }, (_, i) => [i + 1, String(i + 1)]).filter(([v]) => v % 2 === 1), yticks: SH_TICKS, scale: sc });
    const ends = [];
    for (const w of PREPS.filter(x => x !== st.prep).concat(st.prep)) {
      const sh = S.ways[w].share.slice(0, NS), xs = sh.map((_, i) => i + 1), ys = sh.map(lg), mine = w === st.prep;
      p.line(xs, ys, mine ? KEPT : DROPPED, mine ? CHART.lineData : CHART.lineThin);
      if (mine) for (let i = 0; i < xs.length; i++) p.dot(xs[i], ys[i], i < st.n ? KEPT : DROPPED, 4);
      ends.push({ w, y: ys[ys.length - 1] + 0.3, mine });
    }
    // the names at the right end, pushed apart where two curves end together
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 0.75);
    for (const e of ends) p.text(PREP_NAME[e.w], NS + 0.85, e.y, e.mine ? KEPT : C['ink-500'], 'right');
    if (st.noise > 0 && st.prep !== 'auto') {
      const ly = lg(100 * S.level * S.level / cur().total);
      p.line([0.4, NS + 0.9], [ly, ly], LEVEL, CHART.lineThin, CHART.dash);
    }
    p.line([st.n + 0.5, st.n + 0.5], SH_LOG, CUT, CHART.lineThin, CHART.dash);
    p.axes();
    $('subComp').textContent = 'Raw, centred and autoscaled compared.';
    legend($('legComp'), screeLegend());
    return;
  }
  const { s, u, v } = cur().r, inTime = st.view3 === 'scores', xs = inTime ? S.B.ts : S.B.grid, nc = Math.min(NMAX, Math.max(st.n + 2, 3), s.length);
  const p = plot(cv, {
    x: inTime ? [0, T_END] : xRangeOf(st), y: [0, nc], xlabel: inTime ? XLAB_T : ax.label, ylabel: 'component *i*',
    xticks: inTime ? T_TICKS : ax.ticks, yticks: Array.from({ length: nc }, (_, i) => [nc - i - 0.5, String(i + 1)]), scale: sc,
  });
  for (let i = 1; i < nc; i++) p.hline(i, C['line-soft']);
  for (let i = 0; i < nc; i++) {
    const mid = nc - i - 0.5, vec = inTime ? u[i] : v[i], kept = i < st.n;
    let big = 0; for (const x of vec) big = Math.max(big, Math.abs(x));
    const f = big > 0 ? 0.42 / big : 0;
    p.hline(mid, C['line-zero']);
    p.line(xs, Array.from(vec, x => mid + x * f), kept ? KEPT : DROPPED, kept ? CHART.lineData : CHART.lineThin);
  }
  p.axes();
  $('subComp').textContent = `${inTime ? 'Scores' : 'Loadings'}, ${PREP_NAME[st.prep]}, each to its size.`;
  legend($('legComp'), stripLegend);
}

/* panel 4: the operation as blocks */
function drawMat() {
  const st = state.s, w = cur(), { s, u, v } = w.r, X = S.B.X, q = X.length, K = Math.min(Math.max(st.n + 2, 3), NMAX, s.length);
  const E = residual(w.Xp, w.r, st.n), T = (r, c) => s[c] * u[c][r];
  const head = st.prep === 'raw'
    ? [{ label: 'X', role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => X[r][c] }]
    : [{ label: 'X', role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => X[r][c] }, '−',
      { label: '1', role: 'data', rows: q, cols: 1, h: 'q', w: '1', at: () => 1 },
      { label: 'x̄^T^', role: 'data', rows: 1, cols: M, h: '1', w: 'm', at: (r, c) => w.mean[c], max: LIM.raw.map },
      ...(st.prep === 'auto' ? ['÷', { label: 's^T^', role: 'data', rows: 1, cols: M, h: '1', w: 'm', at: (r, c) => w.sd[c] }] : [])];
  drawBlocks($('cMat'), [...head, '≈',
    { label: 'T', role: 'score', rows: q, cols: K, h: 'q', w: 'n', at: T, fade: { fromCol: st.n } },
    { label: 'P^T^', role: 'load', rows: K, cols: M, h: 'n', w: 'm', at: (r, c) => v[r][c], fade: { fromRow: st.n } },
    '+', { label: 'E', role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => E[r][c] }], { mode: st.view4 });
  $('subMat').innerHTML = st.prep === 'raw' ? '<b>X</b> ≈ <b>TP</b><sup>T</sup> + <b>E</b>, no centring.'
    : st.prep === 'centre' ? '<b>X</b> − <b>1x̄</b><sup>T</sup> ≈ <b>TP</b><sup>T</sup> + <b>E</b>.'
      : 'Centred, each column ÷ its <i>s</i>, then the SVD.';
  legend($('legMat'), st.view4 === 'blocks' ? BLOCK_LEGEND_STATIC : BLOCK_LEGEND);
}

function drawTable() {
  const st = state.s, nt = Math.min(NTAB, cur().r.s.length), r = k => S.ways[k].r.s;
  $('vN').textContent = st.n;
  let rows = '<tr><th><i>i</i></th><th><i>σ</i> raw</th><th><i>σ</i> centred</th><th><i>σ</i> auto</th><th><i>λ</i> centred</th></tr>';
  for (let i = 0; i < nt; i++) {
    rows += `<tr style="color:${i < st.n ? C['ink-900'] : C['ink-300']}"><td>${i + 1}</td><td>${fmtS(r('raw')[i])}</td><td>${fmtS(r('centre')[i])}</td><td>${fmtS(r('auto')[i])}</td><td>${fmtS(r('centre')[i] ** 2 / (st.q - 1))}</td></tr>`;
  }
  rows += `<tr><td colspan="2">noise level</td><td colspan="3">${st.noise > 0 ? fmtS(S.level) : '–'}</td></tr>`;
  $('readout').innerHTML = rows;
  $('sideNote').innerHTML = '<i>λ</i> = <i>σ</i>²/(<i>q</i> − 1), the variance along the component. The noise level holds for raw and centred data, not after autoscaling.';
}

function draw() {
  const st = state.s;
  reserveLegends([...dataLegends(st, LIM.raw), legendHtml(centredLegend), legendHtml([['one spectrum', C['data-faint'], ''], ['the first', KEPT, ''], ['the last', KEPT, 'dashed'], ['the two points', CUT, 'dashed']]), legendHtml(cloudLegend), legendHtml(screeLegend()), legendHtml(stripLegend), legendHtml(BLOCK_LEGEND), legendHtml(BLOCK_LEGEND_STATIC)]);
  drawDataPanel(); drawCloud(); drawComp(); drawMat(); drawTable();
  sums(); controls.refresh();
}
function update() { compute(); limits(); draw(); markChanged(); }

/* ---------------------------------------------------------------------------
   Controls
   --------------------------------------------------------------------------- */
const snap = s => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => !DISPLAY_ONLY.includes(k))));
const caseS = () => CASES[state.idx].s;
const data = dataControls(state, caseS);
function markChanged() { selector.changed(snap(state.s) !== snap(caseS())); data.refresh(); renderRail(); }
const sums = foldingGroups(() => ({
  case: `${state.idx + 1} · ${CASES[state.idx].title}`,
  technique: 'PCA',
  components: `<i>n</i> = ${state.s.n} · ${PREP_NAME[state.s.prep]}`,
  ...data.summaries(),
}));
const controls = valueControls({
  bindOf: key => data.bind(key), update, draw,
  after: () => {
    if (!state.s) return;
    setSeg($('nSeg'), state.s.n); setSeg($('prepSeg'), state.s.prep);
    for (const k of ['view1', 'view3', 'view4']) setSeg($(k), state.s[k]);
    data.refresh();
  },
});
data.attach(controls, {
  update, changed: markChanged, labels: () => drawDataPanel(),
  relimit: () => { const st = state.s; st.pa = defaultPoint(0); st.pb = defaultPoint(1); update(); },
});
techniqueSwitch('pca', state);
/** After an axis change: the points on the bands of the first two species that are on. */
function defaultPoint(k) {
  const on = state.s.species.filter(sp => sp.on), sp = on[Math.min(k, on.length - 1)] ?? state.s.species[k];
  return AXES[state.s.axis].shape === 'edge' ? sp.c + sp.w / 2 : sp.c;
}

const setN = n => { const c = clamp(Math.round(n), 1, NMAX); if (c !== state.s.n) { state.s.n = c; draw(); } };
const segClick = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b) fn(b.dataset.v); });
segClick('nSeg', v => setN(+v));
segClick('prepSeg', v => { state.s.prep = v; limits(); draw(); markChanged(); });
for (const k of ['view1', 'view3', 'view4']) segClick(k, x => { state.s[k] = x; draw(); });
$('resetCase').addEventListener('click', () => selectCase(state.idx, false));

/* panel 1: drag the two points */
const cData = $('cData');
let dragK = 0;
dragRuler(cData, {
  rulerXs: () => P1?.xs ?? [], plotOf: () => P1?.p,
  down: e => { if (!P1) return false; const { x } = localIn(cData, e); dragK = Math.abs(x - P1.xs[0]) <= Math.abs(x - P1.xs[1]) ? 0 : 1; return false; },
  onDrag: x => {
    const { inner } = P1.p, a = AXES[state.s.axis], f = clamp((x - inner.l) / (inner.r - inner.l), 0, 1);
    state.s[dragK ? 'pb' : 'pa'] = a.from + f * (a.to - a.from);
    drawDataPanel(); drawCloud();
  },
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
    rail.fly('prep', rail.btn('prepFly', { raw: 'X', centre: 'X̄', auto: 'Xₛ' }[st.prep], 'Data as', { text: true }),
      `<div class="fly-title">Data as</div>${PREPS.map(k => rail.item('prep', k, PREP_NAME[k], k === st.prep)).join('')}`),
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
  if (r === 'prep') { state.s.prep = b.dataset.v; limits(); draw(); markChanged(); return; }
  if (r === 'reseed') { state.seed += 1; update(); return; }
  if (r.startsWith('sp')) { const sp = state.s.species[+r.slice(2)]; sp.on = !sp.on; data.renderSpecies(); update(); }
});

const panels = initWorkbench({ redraw: draw, renderRail });
const selector = caseSelector({ list: CASES, onSelect: i => selectCase(i) });

function selectCase(idx, push = true, carried = null) {
  state.idx = idx;
  state.s = { ...clone(CASES[idx].s), ...(carried ? clone(carried) : {}) };
  if (carried) { state.s.pa = defaultPoint(0); state.s.pb = defaultPoint(1); }
  selector.mark(idx);
  data.renderSpecies();
  compute(); limits();
  if (push) { try { const u = new URL(location.href); u.searchParams.set('case', CASES[idx].id); u.searchParams.delete('data'); history.replaceState(null, '', u); } catch { /* not essential */ } }
  draw(); markChanged();
}

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

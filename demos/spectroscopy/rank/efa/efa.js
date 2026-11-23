/**
 * Rank · EFA: evolving factor analysis. The singular values of the first k
 * spectra (forward) and of the last ones (backward), the windows they give
 * each species (first in, first out), and Maeder's non-iterative profiles
 * C = U R from those windows, against the true concentrations. See the
 * comment block in index.html.
 */
import { initShell } from '../../../../assets/shell.js';
import { C, CHART } from '../../../../assets/tokens.js';
import { plot, ticks } from '../../../../assets/plot.js';
import { renderCitations } from '../../../../assets/cite.js';
import { svd, gram, symEig, symEigValues } from '../../../../assets/linalg.js';
import {
  fitWorkbench, initWorkbench, valueControls, foldingGroups, caseSelector, tooltip,
  setSeg, rail, grip, dragRuler, localIn, clamp, reserveLegends,
} from '../../../../assets/workbench.js';
import { T_END, build } from '../mixture.js';
import {
  $, clone, M, SOURCES as COMMON_SOURCES, DATA_BASE, caseOf, XAS_SPECIES, KEPT, DROPPED, CUT, LEVEL, COLOR,
  fmtS, SC, T_TICKS, XLAB_T, LOG_TICKS, legend, legendHtml, lin,
  dataLimits, drawData, dataLegends, drawBlocks, BLOCK_LEGEND, BLOCK_LEGEND_STATIC, dataControls, techniqueSwitch, carriedData, nameOf,
  callout, EQ_BILINEAR, EQ_NOISE,
} from '../common.js';

initShell({ page: 'demo', views: true });

const SOURCES = {
  ...COMMON_SOURCES,
  keller: { key: 'Keller.EvolvingFactorAnalysis.1991', journal: 'Chemom. Intell. Lab. Syst.' },
  liang: { key: 'Liang.HeuristicEvolvingLatent.1993', journal: 'Chemom. Intell. Lab. Syst.', lead: 'Kvalheim' },
};

/* ---------------------------------------------------------------------------
   Settings: the data (common.js) plus
     n     how many species to look for (the rank, from the SVD page)
     thr   a singular value counts as signal above thr × the noise level of its part
     win   spectra in the fixed-size moving window
     k     the spectrum the green line stands at (display only)
     view1 'spectra' | 'map' | 'truth';  view2 'evolving' | 'window';  view3 'blocks' | 'numbers';
     view4 'windows' | 'profiles' | 'help'
   --------------------------------------------------------------------------- */
const NMAX = 10, NE = 6;
const base = { ...clone(DATA_BASE), n: 3, thr: 2, win: 7, k: 20, view1: 'spectra', view2: 'evolving', view3: 'blocks', view4: 'windows' };
const DISPLAY_ONLY = ['k', 'view1', 'view2', 'view3', 'view4'];
const cs = (o, f) => caseOf(base, o, f);

const CASES = [
  {
    id: 'three', title: 'Three Species, Forward and Backward', s: cs({ noise: 0.004 }),
    text: `<p>Forward (solid), the SVD of the first <i>k</i> spectra: each time a species starts to contribute, a new singular value rises out of its noise level [@maeder]. Backward (dashed), the SVD of the last spectra: a line drops into the noise where a species is gone for good [@ch29, p. 628].</p>
      <p>A and B are there from the first spectra, so two forward lines rise almost at once; C builds up and is detected a little later. Backward, A's line falls first: the first species to appear is the first to go. Drag the green line through the run and watch the blocks in panel 4.</p>`,
  },
  {
    id: 'clean', title: 'No Noise, No Window', s: cs({ noise: 0, k: 30 }),
    text: `<p>Without noise, nothing ever drops below the floor: A decays exponentially and is never exactly zero, so every species is "there" in every spectrum, down to rounding. All windows span the whole run, and the profiles in panel 3 cannot be found, because a window only helps where a species is absent.</p>
      <p>EFA works because real data have noise: a window is where a species is detectable, not where it exists. Add noise and the windows close.</p>`,
  },
  {
    id: 'noisy', title: 'More Noise, Shorter Windows', s: cs({ noise: 0.012, view4: 'profiles' }),
    text: `<p>Three times the noise. The windows now close while a species is still clearly present: they are detection windows, not existence windows. Maeder and Zilian met the same with tailing peaks in chromatography [@maeder].</p>
      <p>Forcing a profile to zero outside a window that closed too early pulls its tail down: compare the estimated and true profiles in panel 3. The result is a starting guess for MCR-ALS, which the chapter recommends for any evolving process [@ch29, p. 630], not the answer.</p>`,
  },
  {
    id: 'slow', title: 'A Slow Second Step', s: cs({ noise: 0.004, k1: 0.15, k2: 0.03 }),
    text: `<p>A is gone fast, B lives long, C builds up slowly. Now the windows are distinct: A's closes early, C's opens late, and B's is in between and overlaps both. These are the windows EFA is good at, because each species is absent from part of the run.</p>
      <p>A reaction is not a chromatogram, though: A is there from the first spectrum and C until the last, so two of the six window edges are the edges of the experiment and carry no information.</p>`,
  },
  {
    id: 'window', title: 'A Fixed-Size Moving Window', s: cs({ noise: 0.004, k1: 0.15, k2: 0.03, view2: 'window', k: 30 }),
    text: `<p>Instead of a part that grows, a window of a fixed number of spectra slides through the run, and its singular values are drawn at its middle. Because the window always holds the same number of spectra, the noise level is a horizontal line, and a small contribution is easier to tell from noise [@keller, p. 220, Fig. 8].</p>
      <p>The count above the line is the local rank: how many species are there at that time. Windows of 5 to 7 spectra are usual; a smaller one lets the noise level wander [@keller, p. 220]. Change the window on the left.</p>`,
  },
  {
    id: 'help', title: 'Selective Regions (HELP)', s: cs({ noise: 0.004, k1: 0.3, k2: 0.15, view2: 'window', view4: 'help', k: 45 }),
    text: `<p>Heuristic evolving latent projections look for selective regions: stretches of the run where only one species is there. In the latent-projective graph, the first two scores of the uncentred data drawn against each other, the spectra of such a region lie on a straight line through the origin, because they differ only in amount [@liang, p. 118, Fig. 3].</p>
      <p>Here A and B are gone in the last part of the run, so C has one; the moving window marks it as local rank 1. C hardly changes once it is alone, so its spectra gather at the far end of their line. HELP takes C's spectrum from that region, strips its contribution off the data and starts again on what is left [@liang, Eq. 1, p. 118].</p>`,
  },
  {
    id: 'coevolve', title: 'Two Species, One Profile', s: cs({ noise: 0.004, n: 3 }, { D: { on: true } }),
    text: `<p>D forms with exactly the profile of C. Forward and backward EFA find three species, not four: C and D appear and disappear together, so no time is "C without D". Their window is one, and the profile EFA gives is that of both.</p>
      <p>The same rank deficiency as on the SVD page [@ch29, p. 633]: EFA asks the rank in time, but cannot see what never varies independently.</p>`,
  },
  {
    id: 'xas', title: 'XAS: Edges a Few eV Apart', s: cs({ axis: 'xas', noise: 0.002, k1: 0.15, k2: 0.03 }, XAS_SPECIES),
    text: `<p>The slow second step on an absorption edge. The common step makes the first singular value large from the first spectrum on, but the forward and backward lines of the edges that move still rise and fall as on the IR axis.</p>
      <p>The chapter's quick-XAS example uses EFA in exactly this role, to start MCR-ALS on a temperature-programmed reduction [@ch29, Fig. 29.3].</p>`,
  },
];

const EQUATIONS = [
  EQ_BILINEAR,
  callout({
    title: 'Forward and Backward',
    math: '<i>σ<sub>i</sub></i>(<b>X</b><sub>1:<i>k</i></sub>), &emsp; <i>σ<sub>i</sub></i>(<b>X</b><sub><i>k</i>:<i>q</i></sub>), &emsp; <i>k</i> = 1 … <i>q</i>',
    text: 'The singular values of the first <i>k</i> rows and of the rows from <i>k</i> to the end [@maeder] [@ch29, p. 628]. A species shows as a singular value above the noise level of the part, <i>ε</i>(√<i>k</i> + √<i>m</i>) forward and <i>ε</i>(√(<i>q</i> − <i>k</i> + 1) + √<i>m</i>) backward. Here the eigenvalues of the sub-blocks of one matrix <b>X X</b><sup>T</sup> give them all.',
    symbols: [['<b>X</b><sub><i>a</i>:<i>b</i></sub>', 'the spectra <i>a</i> to <i>b</i>, in time order']],
  }),
  callout({
    title: 'Fixed-Size Moving Window',
    math: '<i>σ<sub>i</sub></i>(<b>X</b><sub><i>k</i> − <i>w</i> + 1 : <i>k</i></sub>), &emsp; drawn at the middle of the window',
    text: 'The number of spectra is held constant instead of growing, so the noise level, <i>ε</i>(√<i>w</i> + √<i>m</i>), is the same for every window, a horizontal line [@keller, p. 220, Fig. 8]. The count above it is the local rank.',
    symbols: [['<i>w</i>', 'spectra in the window, usually 5 to 7 [@keller, p. 220]']],
  }),
  callout({
    title: 'Selective Regions and Stripping',
    math: '<b>X</b><sub>strip</sub> = <b>X</b> − <b>c</b><sub><i>i</i></sub> <b>s</b><sub><i>i</i></sub><sup>T</sup>',
    text: 'Where only species <i>i</i> is present, every spectrum is a multiple of its spectrum: the points lie on a line through the origin of the latent-projective graph, and the first loading of that region is the pure spectrum. With its profile from the selective and zero-concentration windows, its contribution is subtracted and the rank of what is left drops by one; HELP repeats this until nothing above the noise is left [@liang, Eq. 1, p. 118].',
    symbols: [['<b>c</b><sub><i>i</i></sub>, <b>s</b><sub><i>i</i></sub>', 'the resolved profile and spectrum of species <i>i</i>']],
  }),
  callout({
    title: 'Windows, First In, First Out',
    math: 'species <i>j</i> present at <i>k</i> &ensp;⇔&ensp; <i>j</i> ≤ <i>n</i><sub>f</sub>(<i>k</i>) and <i>j</i> > <i>n</i> − <i>n</i><sub>b</sub>(<i>k</i>)',
    text: 'Count the singular values above the threshold forward, <i>n</i><sub>f</sub>, and backward, <i>n</i><sub>b</sub>. If the first species to appear is also the first to disappear, as for consecutive steps or for peaks in chromatography, species <i>j</i> (in order of appearance) is present wherever both counts allow it [@maeder].',
    symbols: [['<i>n</i>', 'the number of species looked for'], ['<i>j</i>', '1 … <i>n</i>, in order of appearance']],
  }),
  callout({
    title: 'Profiles from Windows',
    math: '<b>C</b> = <b>U</b><sub><i>n</i></sub> <b>R</b>, &emsp; <b>r</b><sub><i>j</i></sub> = arg min ‖<b>U</b><sub><i>n</i>, out</sub> <b>r</b>‖, &emsp; ‖<b>r</b>‖ = 1',
    text: 'Because the concentrations lie in the space of the first <i>n</i> scores, each profile is <b>U</b><sub><i>n</i></sub> times one vector <b>r</b><sub><i>j</i></sub>. Choosing it to make the profile as small as possible outside its window is one small eigenproblem per species, with no iteration: the smallest right singular vector of the rows of <b>U</b><sub><i>n</i></sub> outside the window. Sign and scale stay open; the page makes each profile positive with a maximum of 1.',
    symbols: [['<b>U</b><sub><i>n</i>, out</sub>', 'the rows of <b>U</b><sub><i>n</i></sub> outside the window of species <i>j</i>']],
  }),
  EQ_NOISE,
];

const GENERAL = `<h2>What This Page Shows</h2>
  <p>The SVD page counts the components of the whole data set. Evolving factor analysis asks when each one is there: it repeats the SVD on growing parts of the data, from the start forward and from the end backward, and watches singular values rise out of the noise and sink back into it. Maeder and Zilian called it careful rank analysis in time [@maeder]; the chapter uses it to start MCR-ALS on evolving XAS data [@ch29, p. 628].</p>
  <p>Panel 1 is the data. Panel 2 is EFA: forward solid, backward dashed, the threshold of each part dotted, the green line the spectrum the matrix panel shows; or a window of fixed size sliding through the run [@keller, p. 220]. Panel 4 is the operation: the part of <b>X</b> that each direction has seen at that spectrum, and its singular values. Panel 3 reads the windows off, first in, first out, and turns them into profiles, against the true concentrations; or shows the latent-projective graph of heuristic evolving latent projections, where a region with one species is a straight line through zero [@liang, p. 118].</p>
  <p>The windows are where a species is detectable, which depends on the noise and on the threshold as much as on the chemistry. EFA gives a starting point, not an answer. The technique switch on the left takes your data to the SVD and PCA pages.</p>
  <h2>Using the Plots</h2>
  <p>Drag the green line in panel 2. Set the number of species and the threshold on the left. Every setting is on the left and stays there; a case only sets values, hover it for what it shows.</p>`;

/* ---------------------------------------------------------------------------
   Engine
   --------------------------------------------------------------------------- */
const state = { idx: 0, s: null, seed: 1 };
let S = null, LIM = null;
function compute() {
  const st = state.s, B = build(st, state.seed), X = B.X, q = X.length, G = gram(X);
  const sub = (a, b) => G.slice(a, b).map(row => row.slice(a, b));
  const top = vals => vals.slice(0, NE).map(v => Math.sqrt(Math.max(v, 0)));
  const fwd = [], bwd = [];
  for (let k = 1; k <= q; k++) fwd.push(top(symEigValues(sub(0, k))));
  for (let k = 0; k < q; k++) bwd.push(top(symEigValues(sub(k, q))));
  const w = Math.min(st.win, q);
  const fsmw = Array.from({ length: q }, (_, k) => (k >= w - 1 ? top(symEigValues(sub(k - w + 1, k + 1))) : null));
  const r = svd(X), s1 = r.s[0];
  const lvF = k => (st.noise > 0 ? st.noise * (Math.sqrt(k + 1) + Math.sqrt(M)) : 1e-6 * s1);   // part of k + 1 spectra
  const lvB = k => (st.noise > 0 ? st.noise * (Math.sqrt(q - k) + Math.sqrt(M)) : 1e-6 * s1);   // part from spectrum k to the end
  const n = Math.min(st.n, NE);
  const nf = fwd.map((v, k) => Math.min(n, v.filter(x => x > st.thr * lvF(k)).length));
  const nb = bwd.map((v, k) => Math.min(n, v.filter(x => x > st.thr * lvB(k)).length));
  const present = Array.from({ length: n }, (_, j) => Array.from({ length: q }, (_, k) => j < nf[k] && j >= n - nb[k]));
  // profiles: C = U_n R, each r_j the smallest right singular vector of U_n outside the window
  const Un = Array.from({ length: q }, (_, i) => Array.from({ length: n }, (_, c) => r.u[c][i]));
  const profiles = present.map(pres => {
    const out = Un.filter((_, i) => !pres[i]);
    if (!out.length || out.length < 1) return null;
    const G2 = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => out.reduce((s, row) => s + row[a] * row[b], 0)));
    const { vectors } = symEig(G2), rj = vectors[n - 1];
    let c = Un.map(row => row.reduce((s, x, a) => s + x * rj[a], 0));
    if (c.reduce((a, b) => a + b, 0) < 0) c = c.map(x => -x);
    const mx = Math.max(...c.map(Math.abs)) || 1;
    return c.map(x => x / mx);
  });
  // the true species in order of appearance, for colours and the comparison
  const onSp = st.species.filter(sp => sp.on);
  const first = sp => { const p = B.prof[sp.key], mx = Math.max(...p) || 1; return p.findIndex(x => x > 0.05 * mx); };
  const order = onSp.slice().sort((a, b) => first(a) - first(b));
  const truth = order.map(sp => { const p = B.prof[sp.key], mx = Math.max(...p) || 1; return { sp, c: p.map(x => x / mx) }; });
  const rms = profiles.map((c, j) => (c && truth[j] ? Math.sqrt(c.reduce((a, x, i) => a + (x - truth[j].c[i]) ** 2, 0) / q) : null));
  const lvW = st.noise > 0 ? st.noise * (Math.sqrt(w) + Math.sqrt(M)) : 1e-6 * s1;
  const nw = fsmw.map(v => (v ? v.filter(x => x > st.thr * lvW).length : null));
  S = { B, fwd, bwd, fsmw, w, lvW, nw, r, lvF, lvB, nf, nb, n, present, profiles, truth, rms };
}
function limits() {
  const L = dataLimits(S.B.X, S.B.pure);
  const top = Math.max(1, Math.ceil(Math.log10(1.5 * S.r.s[0])));
  const t1 = S.r.u[0].map(x => x * S.r.s[0]), t2 = S.r.u[1] ? S.r.u[1].map(x => x * S.r.s[1]) : t1.map(() => 0);
  const rng = a => { const lo = Math.min(0, ...a), hi = Math.max(0, ...a), pad = 0.08 * (hi - lo || 1); return [lo - pad, hi + pad]; };
  LIM = { ...L, log: [-4, top], lpg: { x: rng(t1), y: rng(t2) } };
}
const kIdx = () => clamp(state.s.k, 0, state.s.q - 1);
const spanOf = pres => { const a = pres.indexOf(true), b = pres.lastIndexOf(true); return a < 0 ? null : [a, b]; };
const colourOf = j => (S.truth[j] ? COLOR[S.truth[j].sp.key] : DROPPED);

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
function drawDataPanel() {
  const st = state.s, o = drawData($('cData'), { st, B: S.B, Xp: S.B.X, lim: LIM, view: st.view1, ylabel: 'signal / –' });
  $('subData').textContent = o.sub; legend($('legData'), o.leg);
}

let P2 = null;
const efaLegend = () => [['forward', KEPT, ''], ['backward', KEPT, 'dashed'], ['threshold', LEVEL, 'dashed'], ['spectrum <i>k</i>', CUT, 'dashed']];
const winLegend2 = () => [['window of <i>w</i> spectra', KEPT, ''], ['threshold', LEVEL, 'dashed'], ['spectrum <i>k</i>', CUT, 'dashed']];
function drawEfa() {
  const st = state.s, cv = $('cEfa'), sc = SC(), ts = S.B.ts, q = ts.length, L = LIM.log;
  const lg = v => clamp(Math.log10(Math.max(v, 1e-300)), L[0], L[1]);
  const p = plot(cv, { x: [0, T_END], y: L, xlabel: XLAB_T, ylabel: 'singular value *σ*_*i*_', xticks: T_TICKS, yticks: LOG_TICKS.filter(([v]) => v >= L[0] && v <= L[1]), scale: sc });
  if (st.view2 === 'window') {
    const w = S.w, ly = lg(st.thr * S.lvW);
    p.line([0, T_END], [ly, ly], LEVEL, CHART.lineThin, [1, 3]);
    for (let i = 0; i < NE; i++) {
      const kept = i < st.n, xs = [], ys = [];
      for (let k = w - 1; k < q; k++) { xs.push((ts[k - w + 1] + ts[k]) / 2); ys.push(lg(S.fsmw[k][i])); }
      p.line(xs, ys, kept ? KEPT : DROPPED, kept ? CHART.lineData : CHART.lineThin);
    }
    const k = Math.max(kIdx(), w - 1), tk = (ts[k - w + 1] + ts[k]) / 2;
    p.line([tk, tk], L, CUT, CHART.lineData, CHART.dash);
    grip(p, p.X(tk), CUT);
    p.axes();
    P2 = { p, rx: p.X(tk) };
    $('subEfa').innerHTML = `Log scale, grey beyond <i>n</i>. ${w} spectra around ${tk.toFixed(0)} min: local rank ${S.nw[k]}.`;
    legend($('legEfa'), winLegend2());
    return;
  }
  p.line(ts, ts.map((_, k) => lg(st.thr * S.lvF(k))), LEVEL, CHART.lineThin, [1, 3]);
  p.line(ts, ts.map((_, k) => lg(st.thr * S.lvB(k))), LEVEL, CHART.lineThin, [1, 3]);
  for (let i = 0; i < NE; i++) {
    const kept = i < st.n, col = kept ? KEPT : DROPPED, w = kept ? CHART.lineData : CHART.lineThin;
    const fx = [], fy = [], bx = [], by = [];
    for (let k = i; k < q; k++) { fx.push(ts[k]); fy.push(lg(S.fwd[k][i])); }
    for (let k = 0; k < q - i; k++) { bx.push(ts[k]); by.push(lg(S.bwd[k][i])); }
    p.line(fx, fy, col, w);
    p.line(bx, by, col, w, CHART.dash);
  }
  const k = kIdx(), tk = ts[k];
  p.line([tk, tk], L, CUT, CHART.lineData, CHART.dash);
  grip(p, p.X(tk), CUT);
  p.axes();
  P2 = { p, rx: p.X(tk) };
  $('subEfa').innerHTML = `Log scale, grey beyond <i>n</i>. At spectrum ${k + 1}: ${S.nf[k]} forward, ${S.nb[k]} backward.`;
  legend($('legEfa'), efaLegend());
}

function drawMat() {
  const st = state.s, X = S.B.X, q = X.length, k = kIdx(), f = S.fwd[k], b = S.bwd[k];
  const sv = (vals, nsig) => ({ label: 'diag(σ)', role: 'diag', rows: NE, cols: NE, h: 'n', w: 'n', scale: 'log', max: S.r.s[0], floor: S.r.s[0] * 1e-4, at: (r) => vals[r] ?? 0, fade: { fromCol: nsig, fromRow: nsig }, dim: `${nsig} above` });
  if (st.view2 === 'window') {
    const w = S.w, kk = Math.max(k, w - 1);
    drawBlocks($('cMat'), [
      { label: `X_${kk - w + 2}:${kk + 1}_`, role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => X[r][c], fade: { rows: [kk - w + 1, kk + 1] } },
      '→', sv(S.fsmw[kk], S.nw[kk]),
    ], { mode: st.view3 });
    $('subMat').innerHTML = `The window: spectra ${kk - w + 2} to ${kk + 1}, always ${w} of them.`;
    legend($('legMat'), st.view3 === 'blocks' ? BLOCK_LEGEND_STATIC : BLOCK_LEGEND);
    return;
  }
  drawBlocks($('cMat'), [
    { label: `X_1:${k + 1}_`, role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => X[r][c], fade: { rows: [0, k + 1] } },
    '→', sv(f, S.nf[k]), ' ', ' ',
    { label: `X_${k + 1}:${q}_`, role: 'data', rows: q, cols: M, h: 'q', w: 'm', at: (r, c) => X[r][c], fade: { rows: [k, q] } },
    '→', sv(b, S.nb[k]),
  ], { mode: st.view3 });
  $('subMat').innerHTML = `Forward 1–${k + 1}, backward ${k + 1}–${q}.`;
  legend($('legMat'), st.view3 === 'blocks' ? BLOCK_LEGEND_STATIC : BLOCK_LEGEND);
}

const winLegend = () => [['EFA window', KEPT, 'bar'], ['true: above 2 % of its maximum', C['data-faint'], 'bar']];
const profLegend = () => [['EFA profile', KEPT, ''], ['true profile', KEPT, 'dashed']];
const helpLegend = [['one spectrum', C['ink-300'], 'dot'], ['local rank 1: selective', KEPT, 'dot'], ['its line through zero', KEPT, 'dashed']];
function drawHelp() {
  const st = state.s, cv = $('cWin'), sc = SC(), q = S.B.ts.length, w = S.w, { u, s } = S.r;
  const t1 = Array.from(u[0], x => x * s[0]), t2 = u[1] ? Array.from(u[1], x => x * s[1]) : t1.map(() => 0);
  const local = i => S.nw[clamp(i + Math.floor(w / 2), w - 1, q - 1)];
  const { x: XR, y: YR } = LIM.lpg;
  const p = plot(cv, { x: XR, y: YR, xlabel: 'score 1 (→) and score 2 (↑), uncentred', xticks: ticks(XR[0], XR[1], 4), yticks: ticks(YR[0], YR[1], 4), scale: sc });
  p.hline(0); p.line([0, 0], YR, C['line-zero'], 1);
  p.line(t1, t2, C['line'], CHART.lineThin);
  // runs of local rank 1, each with its direction from the origin
  let i = 0, runs = 0;
  while (i < q) {
    if (local(i) !== 1) { i++; continue; }
    let j = i; while (j + 1 < q && local(j + 1) === 1) j++;
    let a = 0, b = 0; for (let k = i; k <= j; k++) { a += t1[k]; b += t2[k]; }
    const L = Math.hypot(a, b) || 1, far = 2 * Math.max(Math.abs(XR[0]), Math.abs(XR[1]), Math.abs(YR[0]), Math.abs(YR[1]));
    p.line([0, a / L * far], [0, b / L * far], KEPT, CHART.lineThin, CHART.dash);
    runs++; i = j + 1;
  }
  for (let k = 0; k < q; k++) p.dot(t1[k], t2[k], local(k) === 1 ? KEPT : C['ink-300'], local(k) === 1 ? 4.5 : 2.5);
  p.text('*t* = 0', t1[0] + 0.1 * (XR[1] - XR[0]), t2[0] - 0.04 * (YR[1] - YR[0]), C['ink-500'], 'left');
  p.axes();
  $('subWin').textContent = runs ? 'A region with one species lies on a line through zero.' : 'No region with one species at this noise and threshold.';
  legend($('legWin'), helpLegend);
}
function drawWin() {
  if (state.s.view4 === 'help') { drawHelp(); return; }
  const st = state.s, cv = $('cWin'), sc = SC(), ts = S.B.ts, n = S.n;
  if (st.view4 === 'profiles') {
    const p = plot(cv, { x: [0, T_END], y: [-0.15, 1.12], xlabel: XLAB_T, ylabel: 'profile, max 1 / –', xticks: T_TICKS, yticks: ticks(0, 1, 4), scale: sc });
    p.hline(0);
    for (let j = 0; j < n; j++) {
      const col = colourOf(j);
      if (S.truth[j]) p.line(ts, S.truth[j].c, col, CHART.lineThin, CHART.dash);
      if (S.profiles[j]) p.line(ts, S.profiles[j], col, CHART.lineData);
    }
    if (S.profiles.every(c => !c)) p.text('every window spans the run: no profile can be fixed', T_END / 2, 0.5, C['ink-500']);
    p.axes();
    $('subWin').textContent = 'C = UR from the windows.';
    legend($('legWin'), profLegend());
    return;
  }
  const p = plot(cv, { x: [0, T_END], y: [0, n], xlabel: XLAB_T, ylabel: 'species', xticks: T_TICKS, yticks: Array.from({ length: n }, (_, j) => [n - j - 0.5, S.truth[j] ? S.truth[j].sp.key : String(j + 1)]), scale: sc });
  const dt = ts.length > 1 ? ts[1] - ts[0] : 1;
  for (let j = 0; j < n; j++) {
    const y = n - j - 0.5, col = colourOf(j);
    if (S.truth[j]) {
      const tp = S.truth[j].c.map(x => x > 0.02), sp = spanOf(tp);
      if (sp) { p.ctx.fillStyle = C['data-faint']; p.ctx.fillRect(p.X(ts[sp[0]]), p.Y(y + 0.36), p.X(ts[sp[1]] + dt) - p.X(ts[sp[0]]), p.Y(y + 0.06) - p.Y(y + 0.36)); }
    }
    const w = spanOf(S.present[j]);
    if (w) { p.ctx.fillStyle = col; p.ctx.fillRect(p.X(ts[w[0]]), p.Y(y), p.X(Math.min(ts[w[1]] + dt, T_END)) - p.X(ts[w[0]]), p.Y(y - 0.3) - p.Y(y)); }
  }
  const tk = ts[kIdx()];
  p.line([tk, tk], [0, n], CUT, CHART.lineThin, CHART.dash);
  p.axes();
  $('subWin').textContent = 'First in, first out; grey is the truth.';
  legend($('legWin'), winLegend());
}

function drawTable() {
  const st = state.s, ts = S.B.ts, dt = ts.length > 1 ? ts[1] - ts[0] : 0, k = kIdx();
  $('vN').textContent = st.n;
  const span = (pres, end) => { const w = spanOf(pres); return w ? `${ts[w[0]].toFixed(0)}–${Math.min(ts[w[1]] + (end ? dt : 0), T_END).toFixed(0)}` : '–'; };
  let rows = '<tr><th><i>j</i></th><th>species</th><th>EFA / min</th><th>true / min</th><th>RMS %</th></tr>';
  for (let j = 0; j < S.n; j++) {
    const t = S.truth[j];
    rows += `<tr><td>${j + 1}</td><td style="color:${colourOf(j)}">${t ? t.sp.key : '–'}</td><td>${span(S.present[j], true)}</td><td>${t ? span(t.c.map(x => x > 0.02), true) : '–'}</td><td>${S.rms[j] != null ? (100 * S.rms[j]).toFixed(1) : '–'}</td></tr>`;
  }
  rows += `<tr><td colspan="2"><i>k</i> = ${k + 1}</td><td colspan="3">${S.nf[k]} forward · ${S.nb[k]} backward</td></tr>`;
  $('readout').innerHTML = rows;
  $('sideNote').innerHTML = '"true" is where a species is above 2 % of its own maximum. RMS: the EFA profile against the true one, both scaled to a maximum of 1. A real measurement has no "true" column: it is what this page can show and a lab cannot.';
}

function draw() {
  const st = state.s;
  reserveLegends([...dataLegends(st, LIM), legendHtml(efaLegend()), legendHtml(winLegend2()), legendHtml(BLOCK_LEGEND), legendHtml(BLOCK_LEGEND_STATIC), legendHtml(winLegend()), legendHtml(profLegend()), legendHtml(helpLegend)]);
  drawDataPanel(); drawEfa(); drawMat(); drawWin(); drawTable();
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
  technique: 'EFA',
  components: `<i>n</i> = ${state.s.n} · ×${state.s.thr.toFixed(1)} · <i>w</i> = ${state.s.win}`,
  ...data.summaries(),
}));
function bindOf(key) {
  const b = data.bind(key);
  if (b) return b;
  if (key === 'win') return { label: 'moving window <i>w</i>', unit: 'spectra', ...lin(3, 15, 1, 0), get: () => state.s.win, set: v => { state.s.win = clamp(Math.round(v), 2, 30); }, caseV: () => caseS().win, def: 7, redraw: 'update' };
  if (key === 'thr') return { label: 'threshold, × noise level', unit: '', ...lin(1, 5, 0.1, 1), get: () => state.s.thr, set: v => { state.s.thr = clamp(v, 1, 10); }, caseV: () => caseS().thr, def: 2, redraw: 'update' };
  throw new Error(`no control ${key}`);
}
const controls = valueControls({
  bindOf, update, draw,
  after: () => {
    if (!state.s) return;
    setSeg($('nSeg'), state.s.n);
    for (const k of ['view1', 'view2', 'view3', 'view4']) setSeg($(k), state.s[k]);
    data.refresh();
  },
});
data.attach(controls, { update, changed: markChanged, labels: () => { drawDataPanel(); drawWin(); }, relimit: () => { compute(); limits(); draw(); markChanged(); } });
techniqueSwitch('efa', state);

const segClick = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b) fn(b.dataset.v); });
segClick('nSeg', v => { state.s.n = clamp(+v, 1, NMAX); update(); });
for (const k of ['view1', 'view2', 'view3', 'view4']) segClick(k, x => { state.s[k] = x; draw(); });
$('resetCase').addEventListener('click', () => selectCase(state.idx, false));

/* panel 2: drag the green line through the run */
const setK = k => { const c = clamp(Math.round(k), 0, state.s.q - 1); if (c !== state.s.k) { state.s.k = c; drawEfa(); drawMat(); drawWin(); drawTable(); } };
dragRuler($('cEfa'), {
  rulerXs: () => (P2 ? [P2.rx] : []), plotOf: () => P2?.p,
  onDrag: x => { const { inner } = P2.p, t = clamp((x - inner.l) / (inner.r - inner.l), 0, 1) * T_END; setK(t / T_END * (state.s.q - 1)); },
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
    rail.fly('n', rail.btn('nFly', `n${st.n}`, 'Species looked for', { text: true }),
      `<div class="fly-title">Species <i>n</i></div>${Array.from({ length: NMAX }, (_, i) => rail.item('n', i + 1, `n = ${i + 1}`, i + 1 === st.n)).join('')}`),
    ...st.species.map((sp, i) => rail.btn(`sp${i}`, sp.key, `${nameOf(st, i)}: ${sp.on ? 'on. Click to switch off' : 'off. Click to switch on'}`, { text: true, on: sp.on, style: `--c:${COLOR[sp.key]}` })),
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
  if (r === 'n') { state.s.n = +b.dataset.v; update(); return; }
  if (r === 'reseed') { state.seed += 1; update(); return; }
  if (r.startsWith('sp')) { const sp = state.s.species[+r.slice(2)]; sp.on = !sp.on; data.renderSpecies(); update(); }
});

const panels = initWorkbench({ redraw: draw, renderRail });
const selector = caseSelector({ list: CASES, onSelect: i => selectCase(i) });

function selectCase(idx, push = true, carried = null) {
  state.idx = idx;
  state.s = { ...clone(CASES[idx].s), ...(carried ? clone(carried) : {}) };
  state.s.k = clamp(state.s.k, 0, state.s.q - 1);
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

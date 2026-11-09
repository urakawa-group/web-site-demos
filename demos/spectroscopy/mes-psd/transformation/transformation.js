/**
 * MES-PSD transformation: one averaged period A(t), turned into A_k(phi) and
 * shown five ways. See the comment block in index.html for the model and the
 * sources; the input texts carry the citations.
 */
import { initShell } from '../../../../assets/shell.js';
import { C, CHART } from '../../../../assets/tokens.js';
import { plot, ticks } from '../../../../assets/plot.js';
import { renderCitations } from '../../../../assets/cite.js';

initShell({ page: 'demo', views: true });

const SOURCES = {
  handbook: {
    key: 'Wachs.SpringerHandbookAdvanced.2023',
    chapter: 'A. Urakawa, D. Ferri and R. J. G. Nuguid, “Modulation Excitation Spectroscopy (MES)”, Ch. 42, pp. 967–978',
    short: 'Urakawa et al., Springer Handbook of Advanced Catalyst Characterization 2023, Ch. 42',
  },
  weyel: { key: 'Weyel.ModulationExcitationSpectroscopy.2024', lead: 'Hess' },
};

/* ---------------------------------------------------------------------------
   Inputs. Each is a stimulus shape plus a chain of first-order steps; `taus`
   names the time constants it has, with their starting values in T.
   --------------------------------------------------------------------------- */
const INPUTS = [
  {
    id: 'square', title: 'Square Wave, No Delay', shape: 'square', taus: {},
    text: `<p>The stimulus itself: 1 in the first half-period, 0 in the second. It is ½ plus odd sines [@handbook, Eq. 42.1, p. 970], so the product with the reference has more amber than purple area at <i>k</i> = 1, <i>φ</i> = 0, and the integral ends at 2/π ≈ 0.64.</p>
      <p>Set <i>φ</i> = 90°: amber and purple balance and the integral ends at zero. That angle is where the signal and the reference are out of step. At <i>k</i> = 2 every lobe of the reference meets as much amber as purple, so the amplitude is zero at every <i>φ</i>: no even harmonics.</p>`,
  },
  {
    id: 'lag', title: 'Square Wave, First-Order Delay', shape: 'square', taus: { tau: 0.08 },
    text: `<p>The band follows through one first-order step. The period is a rounded square, and its fundamental is shifted later by <i>δ</i> = arctan(<i>ωτ</i>). On the phasor that is a clockwise turn of the arrow, so <i>φ</i><sub>max</sub> = 360° − <i>δ</i> and the time value reads the delay back [@weyel, Eq. 2].</p>
      <p>Raise <i>τ</i>: the arrow turns and shrinks. The higher harmonics shrink much faster than the fundamental, because the step smooths the corners, and the rebuilt period needs fewer of them.</p>`,
  },
  {
    id: 'falling', title: 'Square Wave, Falling Band', shape: 'square', taus: { tau: 0.08 }, invert: true,
    text: `<p>A band that falls when the stimulus switches on, through the same step: 1 − <i>y</i>(<i>t</i>). The constant 1 drops out in the integral, so only −<i>y</i> is left, and the arrow points the other way: <i>φ</i><sub>max</sub> moves by 180° and the time value by <i>T</i>/2 at <i>k</i> = 1.</p>
      <p>In the phase-resolved spectra this band is a lobe of the opposite sign. Compare with the rising band of the same <i>τ</i>: same length of arrow, opposite direction.</p>`,
  },
  {
    id: 'chain', title: 'Two Steps in Series', shape: 'square', taus: { tau: 0.05, tau2: 0.12 },
    text: `<p>A species fed by another one: the stimulus drives the first step, the first step drives the second. The phase lags of steps in series add, arctan(<i>ωτ</i>₁) + arctan(<i>ωτ</i>₂), so the arrow can turn past 90° and the time value past <i>T</i>/4, which one step alone never does.</p>
      <p>The amplitudes multiply, so a late signal is also a small one. Watch the amber and purple lobes of the product shift as the period turns into an S-shaped rise.</p>`,
  },
  {
    id: 'asym', title: 'Fast Up, Slow Down', shape: 'square', taus: { tauOn: 0.02, tauOff: 0.2 },
    text: `<p>A band that rises fast while the stimulus is on and decays slowly when it is off, as for fast adsorption and slow desorption. One step with two time constants is no longer linear in the stimulus: rise and fall have different shapes.</p>
      <p>Now <i>k</i> = 2 is not empty. Even harmonics appear, and the harmonic bars show them. Reading <i>k</i> = 3 or 5 as the response to a faster modulation needs a linear response [@handbook, p. 970], so with this input that reading fails. Set both time constants equal and the even bars vanish again.</p>`,
  },
  {
    id: 'sine', title: 'Sine Stimulus, First-Order Delay', shape: 'sine', taus: { tau: 0.08 },
    text: `<p>The stimulus is ½ + ½ sin(<i>ωt</i>). A linear step turns a sine into a sine of the same frequency, smaller and later, so the period holds only the fundamental: every bar but <i>k</i> = 1 is zero, and one harmonic rebuilds the period exactly.</p>
      <p>Its amplitude is ½ for no delay, against 2/π for the square wave, because the square wave puts more of its swing into the fundamental [@handbook, Eq. 42.1, p. 970].</p>`,
  },
];

const TAU_LABEL = { tau: '<i>τ</i>', tau2: '<i>τ</i>₂', tauOn: '<i>τ</i> rising', tauOff: '<i>τ</i> falling' };
const TAU_LABEL_CHAIN = { tau: '<i>τ</i>₁' };

/* Formula boxes, as on the cases page */
const frac = (num, den) => `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
const integral = (lo, hi) => `<span class="int">∫<span class="lims"><span>${hi}</span><span>${lo}</span></span></span>`;
const sum = (lo, hi) => `<span class="int">Σ<span class="lims"><span>${hi}</span><span>${lo}</span></span></span>`;
const callout = ({ title, math, text, symbols }) => `<div class="eq-callout">
  <div class="eq-head">${title}</div>
  <div class="eq-math">${math}</div>
  <p class="eq-text">${text}</p>
  <dl class="eq-symbols">${symbols.map(([sym, what]) => `<dt>${sym}</dt><dd>${what}</dd>`).join('')}</dl>
</div>`;

const EQUATIONS = [
  callout({
    title: 'Phase-Sensitive Detection',
    math: `<i>A<sub>k</sub></i>(<i>φ</i>) = ${frac('2', '<i>T</i>')} ${integral('0', '<i>T</i>')} <i>A</i>(<i>t</i>) sin(<i>kωt</i> + <i>φ</i>) d<i>t</i>, &emsp; <i>ω</i> = ${frac('2π', '<i>T</i>')}`,
    text: 'Section 1 draws this equation term by term: the reference, the product, the integral up to <i>t</i>. A constant in <i>A</i>(<i>t</i>) meets the sine with zero area and drops out [@handbook, Fig. 42.1, p. 969] [@weyel, Eq. 1].',
    symbols: [
      ['<i>A<sub>k</sub></i>(<i>φ</i>)', 'phase-resolved absorbance at harmonic <i>k</i> and phase angle <i>φ</i>'],
      ['<i>A</i>(<i>t</i>)', 'absorbance of the averaged period at one spectral position'],
      ['<i>T</i>, <i>t</i>', 'period, and time within it from switch-on'],
      ['<i>k</i>, <i>φ</i>', 'harmonic and phase angle of the demodulation'],
    ],
  }),
  callout({
    title: 'The Phasor Form',
    math: `<i>A<sub>k</sub></i>(<i>φ</i>) = <i>I<sub>k</sub></i> cos <i>φ</i> + <i>Q<sub>k</sub></i> sin <i>φ</i> = |<i>A<sub>k</sub></i>| cos(<i>φ</i> − <i>φ</i><sub>max</sub>)`,
    text: 'sin(<i>kωt</i> + <i>φ</i>) = sin <i>kωt</i> cos <i>φ</i> + cos <i>kωt</i> sin <i>φ</i>, so two integrals give the result at every <i>φ</i>. That is why the phase domain is always a pure cosine, whatever the signal. Standard trigonometry, written out for this page.',
    symbols: [
      ['<i>I<sub>k</sub></i>', `${frac('2', '<i>T</i>')}∫ <i>A</i>(<i>t</i>) sin(<i>kωt</i>) d<i>t</i>, the sine part, <i>A<sub>k</sub></i>(0°)`],
      ['<i>Q<sub>k</sub></i>', `${frac('2', '<i>T</i>')}∫ <i>A</i>(<i>t</i>) cos(<i>kωt</i>) d<i>t</i>, the cosine part, <i>A<sub>k</sub></i>(90°)`],
      ['|<i>A<sub>k</sub></i>|', '√(<i>I<sub>k</sub></i>² + <i>Q<sub>k</sub></i>²), the length of the arrow'],
      ['<i>φ</i><sub>max</sub>', 'atan2(<i>Q<sub>k</sub></i>, <i>I<sub>k</sub></i>), the angle of the arrow'],
    ],
  }),
  callout({
    title: 'Time Value',
    math: `<i>t</i><sub>con</sub> = ${frac('360° − <i>φ</i><sub>max</sub>', '360°')} · ${frac('<i>T</i>', '<i>k</i>')}`,
    text: 'Reads the angle of the arrow as a delay after the stimulus [@weyel, Eq. 2]; divided by <i>k</i> because the period of harmonic <i>k</i> is <i>T</i>/<i>k</i>.',
    symbols: [['<i>t</i><sub>con</sub>', 'time value, between 0 and <i>T</i>/<i>k</i>']],
  }),
  callout({
    title: 'The Period as a Sum of Harmonics',
    math: `<i>A</i>(<i>t</i>) = <i>a</i>₀ + ${sum('<i>k</i> = 1', '∞')} [<i>I<sub>k</sub></i> sin(<i>kωt</i>) + <i>Q<sub>k</sub></i> cos(<i>kωt</i>)]`,
    text: 'The Fourier series of the period: PSD at harmonic <i>k</i> picks one term out of it. Section 3 stops the sum after <i>n</i> terms. For an on/off square wave only odd <i>k</i> are non-zero [@handbook, Eq. 42.1, p. 970]. Standard Fourier analysis.',
    symbols: [['<i>a</i>₀', 'the mean of the period, which PSD never sees']],
  }),
];

const VIEWS_TEXT = `<h2>Reading the Five Views</h2>
  <p><b>1.</b> PSD is a weighted area. Where signal and reference have the same sign the area counts up, where they differ it counts down; <i>A<sub>k</sub></i>(<i>φ</i>) is what is left at <i>t</i> = <i>T</i>. <b>2.</b> Two of those areas, at <i>φ</i> = 0° and 90°, are the whole story: they are the arrow, and every other <i>φ</i> is its shadow on a turning axis. <b>3.</b> Each <i>k</i> is one term of the Fourier series of the period. <b>4.</b> An offset drops out exactly; a drift does not, because a ramp has a sine part. <b>5.</b> All of this, done at every spectral position at once, is the step from the time-resolved to the phase-resolved spectra.</p>`;

/* ---------------------------------------------------------------------------
   Engine: one period on M samples, T = 1
   --------------------------------------------------------------------------- */
const M = 240, T = 1, dt = T / M, WARM = 12;
const NH = 15;                      // harmonics computed for section 3
const NOISE_MAX = 0.25;
const ts = Array.from({ length: M + 1 }, (_, j) => j * dt);   // closed: t = 0 … T

const $ = id => document.getElementById(id);
const state = {
  inputIdx: 1, k: 1, phi: 0, offset: 0, drift: 0, noise: 0, seed: 1, nh: 3, cursor: 1,
  taus: Object.fromEntries(INPUTS.map(inp => [inp.id, { ...inp.taus }])),
};

const tauFromSlider = v => (v <= 0 ? 0 : 0.003 * Math.pow(200, (v - 1) / 99));
const sliderFromTau = tau => (tau <= 0 ? 0 : Math.round(1 + 99 * Math.log(tau / 0.003) / Math.log(200)));
const noiseSigma = v => NOISE_MAX * Math.pow(v / 100, 1.5);

function rng(seed) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

/** Stimulus value held over sample interval j of a period, and at the sample time (½ on a jump). */
const heldAt = (shape, j) => (shape === 'square' ? (j < M / 2 ? 1 : 0) : 0.5 + 0.5 * Math.sin(2 * Math.PI * (j + 0.5) / M));
const pointAt = (shape, j) => (shape === 'square' ? (j === 0 || j === M / 2 ? 0.5 : j < M / 2 ? 1 : 0) : 0.5 + 0.5 * Math.sin(2 * Math.PI * j / M));

/**
 * One first-order step run to the periodic steady state. `input(j)` is the
 * value held over interval j; `tauOf(u)` the time constant for that input
 * (two values make the step rise and fall at different rates). Returns the
 * response at the M + 1 sample times of one period.
 */
function step(input, tauOf) {
  let y = 0;
  const out = new Float64Array(M + 1);
  for (let c = 0; c <= WARM; c++) {
    for (let j = 0; j < M; j++) {
      if (c === WARM) out[j] = y;
      const u = input(j), tau = tauOf(u, y);
      y = tau > 0 ? u + (y - u) * Math.exp(-dt / tau) : u;
    }
  }
  out[M] = out[0];
  return out;
}

/** The response of the chosen input, 0 to 1, at the M + 1 sample times. */
function response(inp, taus) {
  const sh = inp.shape;
  let y;
  if (inp.id === 'square') y = Float64Array.from(ts, (_, j) => pointAt(sh, j % M));
  else if (inp.id === 'asym') y = step(j => heldAt(sh, j), (u, yy) => (u > yy ? taus.tauOn : taus.tauOff));
  else {
    const tau = taus.tau;
    y = tau > 0 ? step(j => heldAt(sh, j), () => tau) : Float64Array.from(ts, (_, j) => pointAt(sh, j % M));
    if (inp.id === 'chain') {
      const y1 = y;
      y = taus.tau2 > 0 ? step(j => 0.5 * (y1[j] + y1[j + 1]), () => taus.tau2) : y1;
    }
  }
  return inp.invert ? Float64Array.from(y, v => 1 - v) : y;
}

/** Offset, drift (a ramp centred on the period) and noise on the averaged period. */
function disturbance(seedShift = 0) {
  const g = rng(state.seed + seedShift), sig = noiseSigma(state.noise);
  const d = Float64Array.from(ts, t => state.offset + state.drift * (t / T - 0.5) + sig * g());
  // t = T: the ramp has reached its end, the noise repeats that of t = 0
  d[M] = state.offset + state.drift * 0.5 + (d[0] - state.offset + state.drift * 0.5);
  return d;
}

/**
 * Trapezoid over the closed period. For a periodic signal this is the plain
 * sum over j = 0 … M−1, the rule the cases page uses.
 */
const trap = f => { let s = 0; for (let j = 0; j < M; j++) s += 0.5 * (f(j) + f(j + 1)); return s * dt; };

/** Sine and cosine parts at harmonic k, the mean, and what follows from them. */
function parts(A, k) {
  const w = 2 * Math.PI * k / T;
  const I = 2 / T * trap(j => A[j] * Math.sin(w * ts[j]));
  const Q = 2 / T * trap(j => A[j] * Math.cos(w * ts[j]));
  const amp = Math.hypot(I, Q), phiMax = ((Math.atan2(Q, I) * 180 / Math.PI) + 360) % 360;
  return { I, Q, amp, phiMax, tcon: ((360 - phiMax) % 360) / 360 * T / k };
}
const at = (p, phi) => p.I * Math.cos(phi * Math.PI / 180) + p.Q * Math.sin(phi * Math.PI / 180);

/** First-order prediction of the fundamental, linear inputs only (null where it does not apply). */
function theory(inp, taus, k) {
  if (inp.id === 'asym') return null;
  if (inp.shape === 'sine' && k !== 1) return { amp: 0 };
  if (inp.shape === 'square' && k % 2 === 0) return { amp: 0 };
  const w = 2 * Math.PI * k / T;
  const steps = inp.id === 'square' ? [] : inp.id === 'chain' ? [taus.tau, taus.tau2] : [taus.tau];
  const a0 = inp.shape === 'square' ? 2 / (Math.PI * k) : 0.5;
  let delta = 0, amp = a0;
  for (const tau of steps) { delta += Math.atan(w * tau); amp /= Math.sqrt(1 + (w * tau) ** 2); }
  if (inp.invert) delta += Math.PI;
  const period = T / k, tcon = ((delta / (2 * Math.PI)) * period) % period;
  return { amp, tcon };
}

let S = null;
function compute() {
  const inp = INPUTS[state.inputIdx], taus = state.taus[inp.id];
  const y = response(inp, taus), d = disturbance();
  const A = Float64Array.from(y, (v, j) => v + d[j]);
  const stim = Float64Array.from(ts, (_, j) => heldAt(inp.shape, j % M));
  const harm = Array.from({ length: NH }, (_, i) => parts(A, i + 1));
  const harmClean = Array.from({ length: NH }, (_, i) => parts(y, i + 1));
  const mean = trap(j => A[j]) / T;
  S = { inp, taus, y, d, A, stim, harm, harmClean, mean, p: harm[state.k - 1], pc: harmClean[state.k - 1], th: theory(inp, taus, state.k) };
}

/* ---------------------------------------------------------------------------
   Drawing. Every y limit below is fixed: it never follows an input, τ, k or φ.
   --------------------------------------------------------------------------- */
const Y_SIG = [-1.1, 1.9], Y_PROD = [-1.9, 1.9], Y_INT = [-1.0, 1.0], Y_PHASE = [-0.9, 0.9], Y_HARM = [0, 0.75];
const T_TICKS = [[0, '0'], [0.25, 'T/4'], [0.5, 'T/2'], [0.75, '3T/4'], [1, 'T']];
const PHI_TICKS = [0, 90, 180, 270, 360].map(v => [v, String(v)]);
const XLAB_T = 'time in the period / T';

const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const rgba = (hex, a) => `rgba(${hexRgb(hex).join(',')},${a})`;
const refAt = j => Math.sin(2 * Math.PI * state.k * ts[j] / T + state.phi * Math.PI / 180);
const cursorJ = () => Math.round(state.cursor * M);

function shadeHalves(p) { p.shadeX(0, T / 2, C['shade-on']); p.shadeX(T / 2, T, C['shade-off']); }

function drawRef() {
  const p = plot($('cRef'), { x: [0, T], y: Y_SIG, xlabel: XLAB_T, ylabel: 'signal / –', xticks: T_TICKS, yticks: ticks(Y_SIG[0], Y_SIG[1], 4) });
  shadeHalves(p); p.hline(0);
  p.steps(ts, Array.from(S.stim), C['data-stimulus']);
  p.line(ts, ts.map((_, j) => refAt(j)), C['data-highlight'], CHART.lineData, CHART.dash);
  p.line(ts, Array.from(S.A), C['data-b']);
  if (state.cursor < 1) p.vline(state.cursor * T, C['ink-700'], 1, []);
  p.axes();
}

function drawProd() {
  const prod = ts.map((_, j) => S.A[j] * refAt(j)), jc = cursorJ();
  const p = plot($('cProd'), { x: [0, T], y: Y_PROD, xlabel: XLAB_T, ylabel: 'A · reference / –', xticks: T_TICKS, yticks: ticks(Y_PROD[0], Y_PROD[1], 4) });
  const { ctx, X, Y } = p, pos = rgba(C['map-pos'], 0.45), neg = rgba(C['map-neg'], 0.35);
  for (let j = 0; j < jc; j++) {
    const a = prod[j], b = prod[j + 1];
    ctx.fillStyle = a + b >= 0 ? pos : neg;
    ctx.beginPath(); ctx.moveTo(X(ts[j]), Y(0)); ctx.lineTo(X(ts[j]), Y(a)); ctx.lineTo(X(ts[j + 1]), Y(b)); ctx.lineTo(X(ts[j + 1]), Y(0)); ctx.closePath(); ctx.fill();
  }
  p.hline(0);
  p.line(ts, prod, C['data-faint'], CHART.lineFaint);
  p.line(ts.slice(0, jc + 1), prod.slice(0, jc + 1), C['ink-700'], CHART.lineThin);
  if (state.cursor < 1) p.vline(state.cursor * T, C['ink-700'], 1, []);
  p.axes();
}

function drawInt() {
  const run = [0];
  for (let j = 1; j <= M; j++) run.push(run[j - 1] + 2 / T * 0.5 * (S.A[j - 1] * refAt(j - 1) + S.A[j] * refAt(j)) * dt);
  const jc = cursorJ(), end = run[M];
  const p = plot($('cInt'), { x: [0, T], y: Y_INT, xlabel: XLAB_T, ylabel: '(2/T) ∫ A · reference dt / –', xticks: T_TICKS, yticks: ticks(Y_INT[0], Y_INT[1], 4) });
  p.hline(0);
  p.line(ts.slice(0, jc + 1), run.slice(0, jc + 1), C['data-b']);
  if (state.cursor >= 1) {
    p.hline(end, C['data-highlight'], 1);
    p.dot(T, end, C['data-highlight']);
    p.text(`A${sub(state.k)}(φ) = ${end.toFixed(3)}`, T * 0.97, end + (end > 0.6 ? -0.14 : 0.1), C['data-highlight'], 'right');
  } else p.dot(ts[jc], run[jc], C['data-b']);
  p.axes();
  $('subInt').innerHTML = `(2/<i>T</i>)∫<sub>0</sub><sup><i>t</i></sup> of the product. At <i>t</i> = <i>T</i> it is <i>A<sub>${state.k}</sub></i>(${state.phi}°) = ${at(S.p, state.phi).toFixed(3)}, the number PSD returns.`;
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = n => String(n).split('').map(c => SUBS[+c]).join('');

/** Plot ranges with one unit the same length on both axes. */
function squareRange(canvas, r) {
  const m = CHART.margin, w = canvas.clientWidth - m.l - m.r, h = canvas.clientHeight - m.t - m.b;
  return w > h ? { x: [-r * w / h, r * w / h], y: [-r, r] } : { x: [-r, r], y: [-r * h / w, r * h / w] };
}

function arrow(p, x0, y0, x1, y1, color, w = CHART.lineData) {
  const { ctx, X, Y } = p, ax = X(x1), ay = Y(y1), bx = X(x0), by = Y(y0);
  const ang = Math.atan2(ay - by, ax - bx), L = Math.min(11, Math.hypot(ax - bx, ay - by) * 0.4);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ax - Math.cos(ang) * L * 0.6, ay - Math.sin(ang) * L * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.lineTo(ax - L * Math.cos(ang - 0.4), ay - L * Math.sin(ang - 0.4));
  ctx.lineTo(ax - L * Math.cos(ang + 0.4), ay - L * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
}

function drawPhasor() {
  const c = $('cPhasor'), rg = squareRange(c, 0.85), { I, Q, amp } = S.p;
  const p = plot(c, { ...rg, xlabel: 'sine part I / –', ylabel: 'cosine part Q / –', xticks: ticks(rg.x[0], rg.x[1], 4), yticks: ticks(rg.y[0], rg.y[1], 4) });
  const { ctx, X, Y } = p;
  p.hline(0); p.ctx.strokeStyle = C['line-zero']; ctx.beginPath(); ctx.moveTo(X(0), Y(rg.y[0])); ctx.lineTo(X(0), Y(rg.y[1])); ctx.stroke();
  // circle of radius |A_k|: where the arrow can point
  ctx.strokeStyle = C['data-faint']; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.ellipse(X(0), Y(0), Math.abs(X(amp) - X(0)), Math.abs(Y(amp) - Y(0)), 0, 0, 2 * Math.PI); ctx.stroke();
  // the reference axis at φ, through the origin
  const r = state.phi * Math.PI / 180, ux = Math.cos(r), uy = Math.sin(r), far = 3;
  p.line([-far * ux, far * ux], [-far * uy, far * uy], C['data-highlight'], 1, CHART.dash);
  // projection of the arrow on that axis: A_k(φ)
  const v = I * ux + Q * uy;
  p.line([I, v * ux], [Q, v * uy], C['ink-500'], 1, [2, 3]);
  p.line([0, v * ux], [0, v * uy], C['data-highlight'], CHART.lineHighlight);
  p.dot(v * ux, v * uy, C['data-highlight']);
  // I and Q as the two components
  p.line([0, I], [0, 0], C['data-b'], 1, [2, 3]); p.line([I, I], [0, Q], C['data-b'], 1, [2, 3]);
  if (amp > 1e-4) arrow(p, 0, 0, I, Q, C['data-b']);
  const lr = 0.8 * Math.min(rg.x[1], rg.y[1]);
  p.text('φ axis', lr * ux, lr * uy, C['data-highlight']);
  p.axes();
  $('subPhasor').innerHTML = `Arrow: (<i>I</i>, <i>Q</i>) = (${I.toFixed(3)}, ${Q.toFixed(3)}), length |<i>A<sub>${state.k}</sub></i>| = ${amp.toFixed(3)}, angle <i>φ</i><sub>max</sub> = ${amp > 1e-3 ? S.p.phiMax.toFixed(0) + '°' : '–'}. Green: its shadow on the axis at <i>φ</i>, which is <i>A<sub>${state.k}</sub></i>(<i>φ</i>).`;
}

function drawPhase() {
  const ph = Array.from({ length: 73 }, (_, i) => i * 5);
  const p = plot($('cPhase'), { x: [0, 360], y: Y_PHASE, xlabel: 'phase angle φ / °', ylabel: 'phase-resolved absorbance / –', xticks: PHI_TICKS, yticks: ticks(Y_PHASE[0], Y_PHASE[1], 4) });
  p.hline(0);
  p.vline(state.phi, C['data-highlight'], 1.5, [4, 3]);
  p.line(ph, ph.map(f => at(S.p, f)), C['data-b']);
  if (S.p.amp > 1e-3) p.dot(S.p.phiMax, S.p.amp, C['data-b']);
  p.dot(state.phi, at(S.p, state.phi), C['data-highlight']);
  p.axes();
}

function drawHarm() {
  const p = plot($('cHarm'), { x: [0.3, NH + 0.7], y: Y_HARM, xlabel: 'harmonic k / –', ylabel: '|A_k| / –', xticks: Array.from({ length: NH }, (_, i) => [i + 1, String(i + 1)]), yticks: ticks(Y_HARM[0], Y_HARM[1], 3) });
  const { ctx, X, Y } = p, bw = (X(1) - X(0)) * 0.6;
  S.harm.forEach((h, i) => {
    const kk = i + 1, a = Math.min(h.amp, Y_HARM[1]);
    ctx.fillStyle = kk === state.k ? C['data-highlight'] : kk <= state.nh ? C['data-b'] : C['data-faint'];
    ctx.fillRect(X(kk) - bw / 2, Y(a), bw, Y(0) - Y(a));
  });
  p.axes();
  const even = S.harm.filter((_, i) => (i + 1) % 2 === 0).reduce((m, h) => Math.max(m, h.amp), 0);
  $('subHarm').innerHTML = `|<i>A<sub>k</sub></i>| for <i>k</i> = 1 to ${NH}. Green: the <i>k</i> demodulated above; orange: the ones used to rebuild the period. Largest even harmonic: ${even.toFixed(3)}.`;
}

function drawRebuild() {
  const w = 2 * Math.PI / T;
  const rb = ts.map(t => { let v = S.mean; for (let i = 0; i < state.nh; i++) v += S.harm[i].I * Math.sin((i + 1) * w * t) + S.harm[i].Q * Math.cos((i + 1) * w * t); return v; });
  const p = plot($('cRebuild'), { x: [0, T], y: Y_SIG, xlabel: XLAB_T, ylabel: 'signal / –', xticks: T_TICKS, yticks: ticks(Y_SIG[0], Y_SIG[1], 4) });
  shadeHalves(p); p.hline(0);
  p.hline(S.mean, C['data-static'], 1);
  p.line(ts, Array.from(S.A), C['data-b']);
  p.line(ts, rb, C['data-highlight'], CHART.lineHighlight);
  p.text(`mean a₀ = ${S.mean.toFixed(2)}`, 0.03, S.mean + 0.12, C['data-static'], 'left');
  p.axes();
  $('vNh').textContent = state.nh;
}

function drawDist() {
  const p = plot($('cDist'), { x: [0, T], y: Y_SIG, xlabel: XLAB_T, ylabel: 'signal / –', xticks: T_TICKS, yticks: ticks(Y_SIG[0], Y_SIG[1], 4) });
  shadeHalves(p); p.hline(0);
  p.line(ts, Array.from(S.y), C['data-faint'], CHART.lineData);
  p.line(ts, Array.from(S.A), C['data-b']);
  p.axes();
}

function drawLeak() {
  const ph = Array.from({ length: 73 }, (_, i) => i * 5);
  const pd = parts(S.d, state.k);
  const p = plot($('cLeak'), { x: [0, 360], y: Y_PHASE, xlabel: 'phase angle φ / °', ylabel: 'phase-resolved absorbance / –', xticks: PHI_TICKS, yticks: ticks(Y_PHASE[0], Y_PHASE[1], 4) });
  p.hline(0);
  p.line(ph, ph.map(f => at(pd, f)), C['data-static'], CHART.lineThin);
  p.line(ph, ph.map(f => at(S.pc, f)), C['data-faint'], CHART.lineData);
  p.line(ph, ph.map(f => at(S.p, f)), C['data-b']);
  p.axes();
  const dT = S.pc.amp > 1e-3 && S.p.amp > 1e-3 ? ((S.p.tcon - S.pc.tcon + 1.5 * T / state.k) % (T / state.k)) - 0.5 * T / state.k : null;
  $('subLeak').innerHTML = `Grey thick: clean. Orange: disturbed. Grey thin: the disturbance alone, the part that leaks. Amplitude ${S.pc.amp.toFixed(3)} → ${S.p.amp.toFixed(3)}${dT == null ? '' : `, time value shifted by ${dT >= 0 ? '+' : '−'}${Math.abs(dT).toFixed(3)} T`}.`;
}

/* section 5: a static band A at 20 and the input as band B at 40 */
const XS = Array.from({ length: 121 }, (_, i) => i * 0.5);
const gauss = (x, c, w) => Math.exp(-4 * Math.LN2 * ((x - c) / w) ** 2);
const GA = XS.map(x => gauss(x, 20, 10)), GB = XS.map(x => gauss(x, 40, 10));
const MAP_T = 1.9, MAP_P = 0.75;

function colourOf(v, max) {
  const t = Math.max(-1, Math.min(1, v / max)), [r, g, b] = hexRgb(t >= 0 ? C['map-pos'] : C['map-neg']), [sr, sg, sb] = hexRgb(C.surface), a = Math.abs(t);
  return [sr + (r - sr) * a, sg + (g - sg) * a, sb + (b - sb) * a];
}

function heatmap(canvas, opts, rows, cols, valueAt, max, after) {
  const p = plot(canvas, opts);
  const off = document.createElement('canvas'); off.width = cols; off.height = rows;
  const octx = off.getContext('2d'), img = octx.createImageData(cols, rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const [R, G, B] = colourOf(valueAt(rows - 1 - r, c), max), o = 4 * (r * cols + c);
    img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  const { inner, ctx } = p;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, inner.l, inner.t, inner.r - inner.l, inner.b - inner.t);
  after?.(p);
  p.axes();
}

function drawMaps() {
  const g = rng(state.seed + 7), sig = noiseSigma(state.noise);
  const noise = Array.from({ length: M + 1 }, () => XS.map(() => sig * g()));
  const base = j => state.offset + state.drift * (ts[j] / T - 0.5);
  const val = (j, x) => GA[x] + S.y[j] * GB[x] + base(j) + noise[j][x];
  const xt = [0, 10, 20, 30, 40, 50, 60].map(v => [v, String(v)]);
  heatmap($('cMapT'), { x: [0, 60], y: [0, T], xlabel: 'spectral position / –', ylabel: 'time in the period / T', xticks: xt, yticks: T_TICKS }, M + 1, XS.length, val, MAP_T,
    p => { if (state.cursor < 1) p.hline(state.cursor * T, C['ink-700'], 1); });
  // PSD at every spectral position, for φ = 0 … 360
  const w = 2 * Math.PI * state.k / T;
  const IQ = XS.map((_, x) => {
    const I = 2 / T * trap(j => val(j, x) * Math.sin(w * ts[j])), Q = 2 / T * trap(j => val(j, x) * Math.cos(w * ts[j]));
    return { I, Q };
  });
  heatmap($('cMapP'), { x: [0, 60], y: [0, 360], xlabel: 'spectral position / –', ylabel: 'phase angle φ / °', xticks: xt, yticks: PHI_TICKS }, 73, XS.length, (r, x) => at(IQ[x], r * 5), MAP_P,
    p => p.hline(state.phi, C['data-highlight'], 2));
}

function drawTable() {
  const k = state.k, th = S.th, pc = S.pc, p = S.p;
  const fmt = (v, d = 3) => (v == null ? '–' : v.toFixed(d));
  const flat = q => q.amp < 1e-3;
  const row = (label, q, color) => `<tr><td${color ? ` style="color:${color}"` : ''}>${label}</td><td>${fmt(q.I)}</td><td>${fmt(q.Q)}</td><td>${fmt(q.amp)}</td><td>${flat(q) ? '–' : q.phiMax.toFixed(0) + '°'}</td><td>${flat(q) || q.tcon == null ? '–' : fmt(q.tcon) + ' T'}</td></tr>`;
  $('readout').innerHTML = `<tr><th>at <i>k</i> = ${k}</th><th><i>I<sub>k</sub></i></th><th><i>Q<sub>k</sub></i></th><th>|<i>A<sub>k</sub></i>|</th><th><i>φ</i><sub>max</sub></th><th><i>t</i><sub>con</sub></th></tr>`
    + row('response alone', pc, C['ink-500'])
    + row('with offset, drift, noise', p, C['data-b'])
    + (th ? `<tr><td>first-order formula</td><td>–</td><td>–</td><td>${fmt(th.amp)}</td><td>–</td><td>${th.amp < 1e-3 || th.tcon == null ? '–' : fmt(th.tcon) + ' T'}</td></tr>` : '');
}

function draw() {
  if (!S) return;
  $('vPhi').textContent = `${state.phi}°`;
  drawRef(); drawProd(); drawInt(); drawPhasor(); drawPhase(); drawHarm(); drawRebuild(); drawDist(); drawLeak(); drawMaps(); drawTable();
}
function update() { compute(); draw(); }

/* ---------------------------------------------------------------------------
   Controls
   --------------------------------------------------------------------------- */
function setSeg(id, v) { $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v)))); }
const fmtTau = v => `${v.toFixed(3)} T`;

function tauControls() {
  const inp = INPUTS[state.inputIdx], taus = state.taus[inp.id];
  const labels = inp.id === 'chain' ? { ...TAU_LABEL, ...TAU_LABEL_CHAIN } : TAU_LABEL;
  $('tauSlot').innerHTML = Object.keys(taus).map(key => `<label class="ctl"><span>${labels[key]}: <b data-v="${key}">${fmtTau(taus[key])}</b></span>
      <input type="range" min="0" max="100" data-tau="${key}" value="${sliderFromTau(taus[key])}"></label>`).join('');
  $('tauSlot').hidden = !Object.keys(taus).length;
}
$('tauSlot').addEventListener('input', e => {
  const key = e.target.dataset.tau;
  if (!key) return;
  const taus = state.taus[INPUTS[state.inputIdx].id];
  taus[key] = tauFromSlider(+e.target.value);
  $('tauSlot').querySelector(`b[data-v="${key}"]`).textContent = fmtTau(taus[key]);
  update();
});

function selectInput(idx, push = true) {
  state.inputIdx = idx;
  const inp = INPUTS[idx];
  $('caseBtn').innerHTML = `<span class="n">${idx + 1}</span>${inp.title}<span class="caret" aria-hidden="true">▾</span>`;
  document.querySelectorAll('#caseMenu li').forEach((li, i) => li.setAttribute('aria-selected', String(i === idx)));
  $('caseText').innerHTML = `<h2>${inp.title}</h2>${inp.text}${VIEWS_TEXT}`;
  $('equations').innerHTML = `<h2>Equations</h2>${EQUATIONS.join('')}`;
  // static text with markers: rendered once per input, never on a redraw
  $('subPhase').innerHTML = `|<i>A<sub>k</sub></i>| cos(<i>φ</i> − <i>φ</i><sub>max</sub>): the arrow's shadow for every <i>φ</i>. The orange dot is <i>φ</i><sub>max</sub>, read as <i>t</i><sub>con</sub> in the table [@weyel, Eq. 2].`;
  renderCitations([$('subPhase'), $('caseText'), $('equations')], $('refs'), SOURCES);
  tauControls();
  if (push) { try { const u = new URL(location.href); u.searchParams.set('input', inp.id); history.replaceState(null, '', u); } catch { /* not essential */ } }
  update();
}

$('caseMenu').innerHTML = INPUTS.map((c, i) => `<li role="option" tabindex="-1" data-i="${i}"><span class="n">${i + 1}</span>${c.title}</li>`).join('');
const menuOpen = () => !$('caseMenu').hidden;
function openMenu(on) {
  $('caseMenu').hidden = !on;
  $('caseBtn').setAttribute('aria-expanded', String(on));
  if (on) (document.querySelector('#caseMenu li[aria-selected="true"]') ?? document.querySelector('#caseMenu li')).focus();
}
$('caseBtn').addEventListener('click', () => openMenu(!menuOpen()));
$('caseMenu').addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; openMenu(false); $('caseBtn').focus(); selectInput(+li.dataset.i); });
$('caseMenu').addEventListener('keydown', e => {
  const items = [...document.querySelectorAll('#caseMenu li')], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)].focus(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.activeElement.click(); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); openMenu(false); $('caseBtn').focus(); }
});
document.addEventListener('click', e => { if (menuOpen() && !e.target.closest('#caseSelect')) openMenu(false); });

$('harm').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.k = +b.dataset.v; setSeg('harm', state.k); update(); });
$('phi').addEventListener('input', e => { state.phi = +e.target.value; draw(); });
$('offset').addEventListener('input', e => { state.offset = +e.target.value / 100; $('vOff').textContent = state.offset.toFixed(2); update(); });
$('drift').addEventListener('input', e => { state.drift = +e.target.value / 100; $('vDrift').textContent = (state.drift >= 0 ? '+' : '−') + Math.abs(state.drift).toFixed(2); update(); });
$('noise').addEventListener('input', e => { state.noise = +e.target.value; $('vNoise').textContent = noiseSigma(state.noise).toFixed(3); update(); });
$('nh').addEventListener('input', e => { state.nh = +e.target.value; draw(); });
$('reseed').addEventListener('click', () => { state.seed += 1; update(); });

/* φ sweep and the integration cursor share one animation loop */
let sweeping = false, integrating = false, raf = 0, last = 0;
function loop(ts_) {
  if (!sweeping && !integrating) return;
  if (ts_ - last > 50) {
    last = ts_;
    if (sweeping) { state.phi = (state.phi + 5) % 360; $('phi').value = state.phi; }
    if (integrating) {
      state.cursor = Math.min(1, state.cursor + 1 / 60);
      if (state.cursor >= 1) { integrating = false; $('run').textContent = '▶ integrate'; }
    }
    draw();
  }
  raf = requestAnimationFrame(loop);
}
const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
$('play').addEventListener('click', () => { sweeping = !sweeping; $('play').textContent = sweeping ? '❚❚ pause' : '▶ sweep φ'; kick(); });
$('run').addEventListener('click', () => {
  integrating = !integrating;
  if (integrating && state.cursor >= 1) state.cursor = 0;
  $('run').textContent = integrating ? '❚❚ pause' : '▶ integrate';
  if (!integrating) { state.cursor = 1; draw(); }
  kick();
});
window.addEventListener('shell:resize', draw);

$('vOff').textContent = '0.00'; $('vDrift').textContent = '+0.00'; $('vNoise').textContent = noiseSigma(0).toFixed(3);
setSeg('harm', state.k);
const wanted = new URLSearchParams(location.search).get('input');
const start = INPUTS.findIndex(c => c.id === wanted);
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => selectInput(start < 0 ? state.inputIdx : start, false));

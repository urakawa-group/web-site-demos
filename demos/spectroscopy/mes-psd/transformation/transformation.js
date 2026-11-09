/**
 * MES-PSD transformation: one averaged period A(t), turned into A_k(φ), on
 * the workbench. An input is a stored set of values for every setting, as a
 * case is on the cases page. See the comment block in index.html for the
 * model and the sources; the input texts carry the citations.
 */
import { initShell } from '../../../../assets/shell.js';
import { C, CHART } from '../../../../assets/tokens.js';
import { plot, ticks, richText } from '../../../../assets/plot.js';
import { renderCitations } from '../../../../assets/cite.js';
import {
  fitWorkbench, initWorkbench, valueControls, foldingGroups, caseSelector, tooltip,
  setSeg, rail, markMaxima, grip, dragRuler, localIn, clamp,
} from '../../../../assets/workbench.js';

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
   Settings. Everything the engine reads is one object; an input is a copy of
   it with a title and a text (the tooltip of the input selector).

   { shape, duty, tau, tauOff, tau2, invert, offset, drift, noise,
     k, phi, clean, kUpTo, amp, view3, view4 }

     shape   'square' (on/off, on for a fraction duty of the period),
             'triangle' (rising for a fraction duty, then falling),
             'saw' (rising over the whole period, then back at once), 'sine'
     tau     time constant of the first step, in T; 0 = no delay
     tauOff  its time constant while decaying, or null for the same as tau
     tau2    time constant of a second step in series, or null for none
     invert  antiphase: the signal falls while the stimulus rises
     offset, drift, noise   what a measurement adds: a constant, a ramp of
             drift over one period, Gaussian noise (slider 0 to 100)
     clean   draw the clean signal beside the disturbed one
     kUpTo   harmonics 1 … k summed instead of k alone: the period rebuilt
             in panel 1, the sum in the phase domain and in the map in φ
     amp     the amplitude in the phase domain: the envelope ±|A_k|
     view3   'cos' | 'phasor' (phasor and cosine side by side)
     view4   'bars' | 'mapT' | 'mapP'
   --------------------------------------------------------------------------- */
const base = {
  shape: 'square', duty: 0.5, tau: 0, tauOff: null, tau2: null, invert: false,
  offset: 0, drift: 0, noise: 0, k: 1, phi: 0, clean: false, kUpTo: false, amp: false, view3: 'cos', view4: 'bars',
};
/** What a reader changes only to look, not to change the experiment: no "changed" mark for these. */
const DISPLAY_ONLY = ['phi', 'clean', 'kUpTo', 'amp', 'view3', 'view4'];

const INPUTS = [
  {
    id: 'square', title: 'Square Wave, No Delay', s: { ...base },
    text: `<p>The stimulus itself: 1 in the first half-period, 0 in the second. It is ½ plus odd sines [@handbook, Eq. 42.1, p. 970], so the product with the reference has more amber than purple area at <i>k</i> = 1, <i>φ</i> = 0, and the integral ends at 2/π ≈ 0.64.</p>
      <p>Drag the reference a quarter period: amber and purple balance and the integral ends at zero. At <i>k</i> = 2 every lobe of the reference meets as much amber as purple, so the amplitude is zero at every <i>φ</i>: no even harmonics.</p>`,
  },
  {
    id: 'lag', title: 'Square Wave, First-Order Delay', s: { ...base, tau: 0.08 },
    text: `<p>The signal follows through one first-order step. The period is a rounded square, and its fundamental is shifted later by <i>δ</i> = arctan(<i>ωτ</i>). On the phasor that is a clockwise turn of the arrow, so <i>φ</i><sub>max</sub> = 360° − <i>δ</i> and the time value reads the delay back [@weyel, Eq. 2].</p>
      <p>Raise <i>τ</i>: the arrow turns and shrinks. The higher harmonics shrink much faster than the fundamental, because the step smooths the corners, and the rebuilt period needs fewer of them.</p>`,
  },
  {
    id: 'falling', title: 'Square Wave, Antiphase', s: { ...base, tau: 0.08, invert: true },
    text: `<p>A signal that falls when the stimulus switches on, through the same step: 1 − <i>y</i>(<i>t</i>). The constant 1 drops out in the integral, so only −<i>y</i> is left, and the arrow points the other way: <i>φ</i><sub>max</sub> moves by 180° and the time value by <i>T</i>/2 at <i>k</i> = 1.</p>
      <p>In the phase-resolved spectra this band is a lobe of the opposite sign. Compare with the in-phase signal of the same <i>τ</i>: same length of arrow, opposite direction.</p>`,
  },
  {
    id: 'chain', title: 'Two Steps in Series', s: { ...base, tau: 0.05, tau2: 0.12 },
    text: `<p>A species fed by another one: the stimulus drives the first step, the first step drives the second. The phase lags of steps in series add, arctan(<i>ωτ</i>₁) + arctan(<i>ωτ</i>₂), so the arrow can turn past 90° and the time value past <i>T</i>/4, which one step alone never does.</p>
      <p>The amplitudes multiply, so a late signal is also a small one. Watch the amber and purple areas shift as the period turns into an S-shaped rise.</p>`,
  },
  {
    id: 'asym', title: 'Fast Up, Slow Down', s: { ...base, tau: 0.02, tauOff: 0.2, k: 2 },
    text: `<p>A signal that builds up fast while the stimulus is on and decays slowly when it is off, as for fast adsorption and slow desorption. The off half is no longer the mirror image of the on half, so the response is not linear in the stimulus, and <i>k</i> = 2 is not empty: the bars show it.</p>
      <p>Reading <i>k</i> = 3 or 5 as the response to a faster modulation needs a linear response [@handbook, p. 970], so with this input that reading fails, and the first-order formula gives nothing. Untick "decays at a different rate" and the even bars vanish.</p>`,
  },
  {
    id: 'sine', title: 'Sine Stimulus, First-Order Delay', s: { ...base, shape: 'sine', tau: 0.08 },
    text: `<p>The stimulus is ½ + ½ sin(<i>ωt</i>). A linear step turns a sine into a sine of the same frequency, smaller and later, so the period holds only the fundamental: every bar but <i>k</i> = 1 is zero, and one harmonic rebuilds the period exactly.</p>
      <p>Its amplitude is ½ for no delay, against 2/π for the square wave, because the square wave puts more of its swing into the fundamental [@handbook, Eq. 42.1, p. 970].</p>`,
  },
  {
    id: 'ramp', title: 'Ramping the Feed', s: { ...base, shape: 'saw', tau: 0.05 },
    text: `<p>Instead of switching between two feeds, a flow is ramped up slowly over the period and set back at once: a sawtooth. Every harmonic is in it, the even ones too, each smaller by its order, so <i>k</i> = 2 carries signal although the response is linear. The outlined bars are the stimulus; the filled ones the signal.</p>
      <p>Switch to the triangle (up, then down) and the even harmonics go again, because a symmetric triangle mirrors itself every half period. The first-order formula holds for every shape: it reads the stimulus' own phase first, then adds the lags of the steps.</p>`,
  },
];

/* Formula boxes */
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

const GENERAL = `<h2>What This Page Shows</h2>
  <p>Phase-sensitive detection is a weighted area. Panel 1 multiplies the averaged period <i>A</i>(<i>t</i>) by the reference sin(<i>kωt</i> + <i>φ</i>); where the two have the same sign the area counts up (amber), where they differ it counts down (purple). Panel 2 adds that area up over the period; what is left at <i>t</i> = <i>T</i> is <i>A<sub>k</sub></i>(<i>φ</i>) [@handbook, Fig. 42.1, p. 969]. Two of those areas, at <i>φ</i> = 0° and 90°, are the whole story: they are the arrow of the phasor in panel 3, and every other <i>φ</i> is its shadow on a turning axis. Each <i>k</i> is one term of the Fourier series of the period, panel 4.</p>
  <p>Every setting is on the left and stays there; an input only sets their values, hover it for what it shows. The disturbances show what PSD removes and what it does not: an offset drops out exactly, a drift does not, because a ramp has a sine part.</p>
  <h2>Using the Plots</h2>
  <p>Drag the reference in panel 1 by a green dot (where it crosses zero upwards, its own phase 0), or the ruler in panel 3, or type <i>φ</i> above panel 1. ▶ integrate runs the cursor through the period in panels 1 and 2 together. Hover a dot or a ring in panel 3 for what happens at that angle; click to keep it. The view switches above panels 3 and 4 add the phasor beside the cosine (the arrow turns with <i>φ</i>, its height is <i>A<sub>k</sub></i>(<i>φ</i>)), or show the whole spectrum as a map. "Summed 1 … <i>k</i>" adds the harmonics up to <i>k</i>, each at the phase of the same moment: the period comes back, closer to its shape with every harmonic.</p>`;

/* ---------------------------------------------------------------------------
   Engine: one period on M samples, T = 1
   --------------------------------------------------------------------------- */
const M = 240, T = 1, dt = T / M, WARM = 12;
const NH = 15;
const NOISE_MAX = 0.25;
const ts = Array.from({ length: M + 1 }, (_, j) => j * dt);

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const state = { idx: 1, s: null, seed: 1, speed: 80, cursor: 1, preview: null };

const tauFromSlider = v => (v <= 0 ? 0 : 0.003 * Math.pow(200, (v - 1) / 99));
const sliderFromTau = tau => (tau <= 0 ? 0 : clamp(Math.round(1 + 99 * Math.log(tau / 0.003) / Math.log(200)), 1, 100));
const noiseSigma = v => NOISE_MAX * Math.pow(v / 100, 1.5);
const SHAPE_NAME = { square: 'on / off', triangle: 'triangle', saw: 'sawtooth', sine: 'sine' };

function rng(seed) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

/** The stimulus at a fraction f of the period, 0 to 1. */
function uAt(f) {
  const { shape, duty: d } = state.s;
  if (shape === 'square') return f < d ? 1 : 0;
  if (shape === 'triangle') return f < d ? f / d : (1 - f) / (1 - d);
  if (shape === 'saw') return f;
  return 0.5 + 0.5 * Math.sin(2 * Math.PI * f);
}
/** Its value held over sample interval j: the mean over the interval (exact for the straight pieces). */
const heldAt = j => (state.s.shape === 'square' ? (j < Math.round(state.s.duty * M) ? 1 : 0) : uAt((j + 0.5) / M));
/** Its value at sample j; at a jump the mean of the two sides, as the trapezoid rule wants. */
function pointAt(j) {
  const { shape } = state.s;
  if (shape === 'square') { const nOn = Math.round(state.s.duty * M); return j === 0 || j === nOn ? 0.5 : j < nOn ? 1 : 0; }
  if (shape === 'saw' && j % M === 0) return 0.5;
  return uAt((j % M) / M);
}

/**
 * One first-order step run to the periodic steady state: rising towards its
 * input with tau, falling with tauOff (the same unless given). Returns the
 * response at the M + 1 sample times of one period.
 */
function step(input, tau, tauOff = null) {
  const off = tauOff ?? tau;
  const eOn = tau > 0 ? Math.exp(-dt / tau) : 0, eOff = off > 0 ? Math.exp(-dt / off) : 0;
  let y = 0;
  const out = new Float64Array(M + 1);
  for (let c = 0; c <= WARM; c++) {
    for (let j = 0; j < M; j++) {
      if (c === WARM) out[j] = y;
      const u = input(j);
      y = u + (y - u) * (u >= y ? eOn : eOff);
    }
  }
  out[M] = out[0];
  return out;
}

function response() {
  const st = state.s;
  const points = Float64Array.from(ts, (_, j) => pointAt(j));
  const y1 = st.tau > 0 || (st.tauOff ?? 0) > 0 ? step(heldAt, st.tau, st.tauOff) : points;
  const y = st.tau2 > 0 ? step(j => 0.5 * (y1[j] + y1[j + 1]), st.tau2) : y1;
  return { stim: points, y: st.invert ? Float64Array.from(y, v => 1 - v) : y };
}

/** Offset, drift (a ramp centred on the period) and noise; at t = T the ramp has reached its end, the noise repeats. */
function disturbance() {
  const st = state.s, g = rng(state.seed), sig = noiseSigma(st.noise);
  const d = Float64Array.from(ts, t => st.offset + st.drift * (t / T - 0.5) + sig * g());
  d[M] = st.offset + st.drift * 0.5 + (d[0] - st.offset + st.drift * 0.5);
  return d;
}
const disturbed = () => state.s.offset !== 0 || state.s.drift !== 0 || state.s.noise !== 0;

const trap = f => { let s = 0; for (let j = 0; j < M; j++) s += 0.5 * (f(j) + f(j + 1)); return s * dt; };
function parts(A, k) {
  const w = 2 * Math.PI * k / T;
  const I = 2 / T * trap(j => A[j] * Math.sin(w * ts[j]));
  const Q = 2 / T * trap(j => A[j] * Math.cos(w * ts[j]));
  const amp = Math.hypot(I, Q);
  const phiMax = (Math.round((Math.atan2(Q, I) * 180 / Math.PI + 360) * 1e6) / 1e6) % 360;
  const delta = (360 - phiMax) % 360;
  return { I, Q, amp, phiMax, delta, tcon: delta / 360 * T / k };
}
const at = (p, phi) => p.I * Math.cos(phi * Math.PI / 180) + p.Q * Math.sin(phi * Math.PI / 180);

/**
 * First-order prediction at harmonic k, for linear steps only: the stimulus'
 * own harmonic (read numerically, so it holds for every shape), turned by the
 * lag of each step and scaled by its amplitude ratio; antiphase adds 180°.
 */
function theory(ps, k) {
  const st = state.s;
  if (st.tauOff != null && st.tauOff !== st.tau) return null;
  if (ps.amp < 1e-6) return { amp: 0 };
  const w = 2 * Math.PI * k / T;
  let lag = 0, amp = ps.amp;
  for (const tau of [st.tau, st.tau2 ?? 0]) { lag += Math.atan(w * tau); amp /= Math.sqrt(1 + (w * tau) ** 2); }
  let phiMax = ps.phiMax - lag * 180 / Math.PI + (st.invert ? 180 : 0);
  phiMax = ((phiMax % 360) + 360) % 360;
  const delta = (360 - phiMax) % 360;
  return { amp, phiMax, delta, tcon: delta / 360 * T / k };
}

let S = null;
function compute() {
  const st = state.s;
  const { stim, y } = response(), d = disturbance();
  const A = Float64Array.from(y, (v, j) => v + d[j]);
  const harm = Array.from({ length: NH }, (_, i) => parts(A, i + 1));
  const harmClean = Array.from({ length: NH }, (_, i) => parts(y, i + 1));
  const harmStim = Array.from({ length: NH }, (_, i) => parts(stim, i + 1));
  const k = st.k, ps = harmStim[k - 1];
  S = {
    stim, y, d, A, harm, harmClean, harmStim,
    p: harm[k - 1], pc: harmClean[k - 1], ps, pd: parts(d, k), th: theory(ps, k),
    mean: trap(j => A[j]) / T,
  };
}

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
const SC = () => (document.documentElement.dataset.w === 'wide' ? CHART.workbenchScale : 1);
const Y_SIG = [-1.1, 1.9], Y_INT = [-1.0, 1.0], Y_HARM = [0, 0.75];
const T_TICKS = [[0, '0'], [0.25, 'T/4'], [0.5, 'T/2'], [0.75, '3T/4'], [1, 'T']];
const PHI_TICKS = [0, 90, 180, 270, 360].map(v => [v, String(v)]);
const XLAB_T = 'time in the period / *T*';
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const rgba = (hex, a) => `rgba(${hexRgb(hex).join(',')},${a})`;

const shownPhi = () => (state.preview ? state.preview.phi : state.s.phi);
const refAt = j => Math.sin(2 * Math.PI * state.s.k * ts[j] / T + shownPhi() * Math.PI / 180);
const cursorJ = () => Math.round(state.cursor * M);
/** End of the rising (on) part of the period. */
const onTime = () => ({ square: state.s.duty, triangle: state.s.duty, saw: 1, sine: 0.5 }[state.s.shape]) * T;
/**
 * Harmonics 1 … k summed. In time: the period rebuilt from its mean and
 * those harmonics. In φ: each harmonic at the phase of the same moment,
 * φ at the fundamental standing for t = (90° − φ)/360° · T, where harmonic h
 * has φ_h = 90° − h (90° − φ); at k = 1 that is A₁(φ) itself.
 */
const hs = () => (state.s.kUpTo ? Array.from({ length: state.s.k }, (_, i) => i + 1) : [state.s.k]);
const rebuiltAt = t => { let v = S.mean; for (const h of hs()) v += S.harm[h - 1].I * Math.sin(2 * Math.PI * h * t / T) + S.harm[h - 1].Q * Math.cos(2 * Math.PI * h * t / T); return v; };
const sumAt = (parts_, phi) => (state.s.kUpTo ? hs().reduce((a_, h) => a_ + at(parts_[h - 1], 90 - h * (90 - phi)), 0) : at(parts_[state.s.k - 1], phi));
/** The reference's upward zero crossings, where kωt + φ = 0: the delay φ reads, once per T/k. */
const zeroTimes = phi => { const t0 = ((((-phi) / 360) % 1) + 1) % 1 * T / state.s.k; return Array.from({ length: state.s.k }, (_, m) => t0 + m * T / state.s.k); };

/** Phase-domain limits: from the stimulus' own harmonic at k (they follow k, never φ). */
const phaseLim = () => {
  // summed, the largest value the summed stimulus reaches over φ; else the stimulus' harmonic k
  const ref = state.s.kUpTo ? Math.max(...Array.from({ length: 72 }, (_, i) => Math.abs(sumAt(S.harmStim, i * 5)))) : S.ps.amp;
  return Math.max(0.15, 1.25 * ref + 0.1 * Math.abs(state.s.drift));
};

function shade(p) { const t = onTime(); p.shadeX(0, t, C['shade-on']); if (t < T) p.shadeX(t, T, C['shade-off']); }

/* panel 1: the period, the reference and their product */
let P1 = null;
function drawSig() {
  const st = state.s, jc = cursorJ(), sc = SC();
  const p = plot($('cSig'), { scale: sc, x: [0, T], y: Y_SIG, xlabel: XLAB_T, ylabel: 'signal / –', xticks: T_TICKS, yticks: ticks(Y_SIG[0], Y_SIG[1], 4) });
  shade(p);
  // the product as area, up to the cursor
  const prod = ts.map((_, j) => S.A[j] * refAt(j));
  const { ctx, X, Y } = p, pos = rgba(C['map-pos'], 0.4), neg = rgba(C['map-neg'], 0.3);
  for (let j = 0; j < jc; j++) {
    const a = prod[j], b = prod[j + 1];
    ctx.fillStyle = a + b >= 0 ? pos : neg;
    ctx.beginPath(); ctx.moveTo(X(ts[j]), Y(0)); ctx.lineTo(X(ts[j]), Y(a)); ctx.lineTo(X(ts[j + 1]), Y(b)); ctx.lineTo(X(ts[j + 1]), Y(0)); ctx.closePath(); ctx.fill();
  }
  p.hline(0);
  if (st.shape === 'square') p.steps(ts, ts.map((_, j) => heldAt(j % M)), C['data-stimulus']);
  else p.line(ts, Array.from(S.stim), C['data-stimulus'], CHART.lineThin, CHART.dash);
  if (st.clean && disturbed()) p.line(ts, Array.from(S.y), C['data-faint'], CHART.lineData);
  if (st.kUpTo) p.line(ts, ts.map(rebuiltAt), C['ink-700'], CHART.lineData, [6, 3]);
  p.line(ts, Array.from(S.A), C['data-a']);
  p.line(ts, ts.map((_, j) => refAt(j)), C['data-highlight'], CHART.lineData, CHART.dash);
  // the reference's upward zero crossings (its own phase 0): grab one to move
  // the reference, which sets φ. The first is also the delay φ reads.
  const xs = zeroTimes(st.phi).map(t => { p.dot(t, 0, C['data-highlight']); return X(t); });
  grip(p, xs[0], C['data-highlight']);
  if (state.cursor < 1) p.vline(state.cursor * T, C['ink-700'], 1, []);
  p.axes();
  P1 = { p, xs };
  $('subSig').innerHTML = `<i>A</i>(<i>t</i>) times the reference (green, drag it by a dot): amber counts up, purple down.${st.kUpTo ? ` Dashed: harmonics 1 … ${st.k}.` : ''}`;
}

/* panel 2: the running integral */
function drawInt() {
  const run = [0];
  for (let j = 1; j <= M; j++) run.push(run[j - 1] + 2 / T * 0.5 * (S.A[j - 1] * refAt(j - 1) + S.A[j] * refAt(j)) * dt);
  const jc = cursorJ(), end = run[M], k = state.s.k;
  const p = plot($('cInt'), { scale: SC(), x: [0, T], y: Y_INT, xlabel: XLAB_T, ylabel: 'running integral / –', xticks: T_TICKS, yticks: ticks(Y_INT[0], Y_INT[1], 4) });
  p.hline(0);
  p.line(ts.slice(0, jc + 1), run.slice(0, jc + 1), C['data-a']);
  if (state.cursor >= 1) {
    p.hline(end, C['data-highlight'], 1);
    p.dot(T, end, C['data-highlight']);
    p.text(`*A*_${k}_(*φ*) = ${end.toFixed(3)}`, T * 0.97, end + (end > 0.6 ? -0.16 : 0.1), C['data-highlight'], 'right');
  } else p.dot(ts[jc], run[jc], C['data-a']);
  p.axes();
  $('subInt').innerHTML = `(2/<i>T</i>)∫<sub>0</sub><sup><i>t</i></sup> of the product. At <i>T</i>: <i>A<sub>${k}</sub></i>(${Math.round(shownPhi())}°) = ${at(S.p, shownPhi()).toFixed(3)}, what PSD returns.`;
}

/* panel 3: the phase domain, alone or with the phasor beside it */
let P3 = null;
function arrowPx(ctx, bx, by, ax, ay, color, w = CHART.lineData) {
  const ang = Math.atan2(ay - by, ax - bx), L = Math.min(11, Math.hypot(ax - bx, ay - by) * 0.4);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ax - Math.cos(ang) * L * 0.6, ay - Math.sin(ang) * L * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.lineTo(ax - L * Math.cos(ang - 0.4), ay - L * Math.sin(ang - 0.4));
  ctx.lineTo(ax - L * Math.cos(ang + 0.4), ay - L * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
}
/**
 * The phasor, drawn so that it turns with φ: the arrow has the length
 * |A_k| and the angle 90° − (φ − φmax), so its height is
 * |A_k| cos(φ − φmax) = A_k(φ), the value the cosine has at φ. It sits in a
 * square at the left at the full height of the panel; the cosine continues
 * to the right, on the same y axis, and a green line carries the height
 * across.
 */
function drawPhase() {
  const st = state.s, lim = phaseLim(), sc = SC(), cv = $('cPhase'), yr = [-lim, lim];
  const withPhasor = st.view3 === 'phasor' && !st.kUpTo;
  const m = CHART.margin, H = cv.clientHeight, side = H - m.t - m.b * sc;
  const ylabel = st.kUpTo ? `Σ *A*_*h*_ , *h* ≤ ${st.k} / –` : `*A*_${st.k}_(*φ*) / –`;
  let ph0 = null;
  if (withPhasor) {
    // the square: x and y in the same units
    const left = m.l * sc;
    ph0 = plot(cv, { scale: sc, margin: { l: left, r: cv.clientWidth - left - side }, x: [-lim, lim], y: yr, xlabel: '', ylabel, xticks: [], yticks: ticks(yr[0], yr[1], 4) });
  }
  const pOpts = { scale: sc, x: [0, 360], y: yr, xlabel: 'phase angle *φ* / °', ylabel: withPhasor ? '' : ylabel, xticks: PHI_TICKS, yticks: withPhasor ? [] : ticks(yr[0], yr[1], 4) };
  if (withPhasor) { pOpts.keep = true; pOpts.margin = { l: m.l * sc + side + 14 * sc }; }
  const p = plot(cv, pOpts);
  const ph = Array.from({ length: 145 }, (_, i) => i * 2.5);
  p.hline(0);
  if (state.preview) p.vline(state.preview.phi, C['data-highlight'], 1, [1, 3]);
  p.vline(st.phi, C['data-highlight'], 1.5, [4, 3]);
  if (st.clean && disturbed()) {
    if (!st.kUpTo) p.line(ph, ph.map(f => at(S.pd, f)), C['data-static'], CHART.lineThin);   // what leaks through
    p.line(ph, ph.map(f => sumAt(S.harmClean, f)), C['data-faint'], CHART.lineData);
  }
  const curve = ph.map(f => sumAt(S.harm, f));
  if (st.amp) {
    const e = st.kUpTo ? Math.max(...curve.map(Math.abs)) : S.p.amp;
    p.hline(e, C['ink-700'], 1); p.hline(-e, C['ink-700'], 1);
    p.text(st.kUpTo ? 'largest' : `|*A*_${st.k}_| = ${e.toFixed(3)}`, 8, e + lim * 0.08, C['ink-700'], 'left');
  }
  p.line(ph, curve, C['data-a']);
  const { ctx, X, Y } = p, pois = [];
  if (!st.kUpTo && S.p.amp > 0.01 * lim) {
    pois.push({ kind: 'max', phi: S.p.phiMax, y: S.p.amp });
    for (const z of [90, 270]) pois.push({ kind: 'zero', phi: (S.p.phiMax + z) % 360, y: 0 });
    for (const q of pois) {
      if (q.kind === 'max') p.dot(q.phi, q.y, C['data-a']);
      else {
        ctx.strokeStyle = C['data-a']; ctx.lineWidth = 1.8; ctx.fillStyle = C.surface;
        ctx.beginPath(); ctx.arc(X(q.phi), Y(0), CHART.marker, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }
      q.px = X(q.phi); q.py = Y(q.y);
    }
    markMaxima(p, [{ phi: S.p.phiMax, y: S.p.amp, delta: S.p.delta, color: C['data-a'] }], yr);
  }
  const phiS = shownPhi(), yS = sumAt(S.harm, phiS);
  p.dot(phiS, yS, C['data-highlight']);
  if (withPhasor) {
    // the turning arrow, and the green line that carries its height across
    const r = S.p.amp, th = (90 - (phiS - S.p.phiMax)) * Math.PI / 180, cx = ph0.X(0), cy = ph0.Y(0);
    const tipX = ph0.X(r * Math.cos(th)), tipY = ph0.Y(r * Math.sin(th));
    ctx.strokeStyle = C['line-zero']; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(ph0.inner.l, cy); ctx.lineTo(ph0.inner.r, cy); ctx.moveTo(cx, ph0.inner.t); ctx.lineTo(cx, ph0.inner.b); ctx.stroke();
    ctx.strokeStyle = C['data-faint']; ctx.beginPath(); ctx.arc(cx, cy, Math.abs(ph0.X(r) - cx), 0, 2 * Math.PI); ctx.stroke();
    if (st.clean && disturbed() && S.pc.amp > 1e-4) {
      const thc = (90 - (phiS - S.pc.phiMax)) * Math.PI / 180;
      arrowPx(ctx, cx, cy, ph0.X(S.pc.amp * Math.cos(thc)), ph0.Y(S.pc.amp * Math.sin(thc)), C['data-faint']);
    }
    if (r > 1e-4) arrowPx(ctx, cx, cy, tipX, tipY, C['data-a']);
    ctx.strokeStyle = C['data-highlight']; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(X(phiS), Y(yS)); ctx.stroke(); ctx.setLineDash([]);
    ph0.axes();
  }
  grip(p, X(st.phi), C['data-highlight']);
  p.axes();
  P3 = { p, pois, rx: X(st.phi) };
  $('subPhase').innerHTML = st.kUpTo
    ? `Harmonics 1 … ${st.k} summed, each at the phase of the same moment: the period, rebuilt and mirrored in <i>φ</i>.`
    : withPhasor
      ? `The arrow, length |<i>A<sub>${st.k}</sub></i>| = ${S.p.amp.toFixed(3)}, turns with <i>φ</i>; its height is <i>A<sub>${st.k}</sub></i>(<i>φ</i>), the cosine on the right.`
      : `<i>A<sub>k</sub></i>(<i>φ</i>) = |<i>A<sub>k</sub></i>| cos(<i>φ</i> − <i>φ</i><sub>max</sub>). Hover the dot or a ring, drag the ruler.${st.clean && disturbed() ? ' Grey: clean; thin: what leaks.' : ''}`;
}

/* panel 4: the harmonic content, or the whole spectrum as a map */
const XS = Array.from({ length: 121 }, (_, i) => i * 0.5);
const gauss = (x, c, w) => Math.exp(-4 * Math.LN2 * ((x - c) / w) ** 2);
const GA = XS.map(x => gauss(x, 20, 10)), GB = XS.map(x => gauss(x, 40, 10));
function colourOf(v, max) {
  const t = clamp(v / max, -1, 1), [r, g, b] = hexRgb(t >= 0 ? C['map-pos'] : C['map-neg']), [sr, sg, sb] = hexRgb(C.surface), a = Math.abs(t);
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
  p.ctx.imageSmoothingEnabled = true;
  p.ctx.drawImage(off, p.inner.l, p.inner.t, p.inner.r - p.inner.l, p.inner.b - p.inner.t);
  after?.(p);
  p.axes();
}
function drawHarm() {
  const st = state.s, sc = SC();
  if (st.view4 !== 'bars') { drawMap(); return; }
  const p = plot($('cHarm'), { scale: sc, x: [0.3, NH + 0.7], y: Y_HARM, xlabel: 'harmonic *h* / –', ylabel: '|*A*_*h*_| / –', xticks: Array.from({ length: NH }, (_, i) => [i + 1, String(i + 1)]), yticks: ticks(Y_HARM[0], Y_HARM[1], 3) });
  const { ctx, X, Y } = p, bw = (X(1) - X(0)) * 0.56;
  S.harm.forEach((h, i) => {
    const kk = i + 1, a = Math.min(h.amp, Y_HARM[1]);
    ctx.fillStyle = kk === st.k ? C['data-highlight'] : st.kUpTo && kk < st.k ? C['data-a'] : C['data-faint'];
    ctx.fillRect(X(kk) - bw / 2, Y(a), bw, Y(0) - Y(a));
    // the stimulus' own harmonic, as an outline
    const s_ = Math.min(S.harmStim[i].amp, Y_HARM[1]);
    ctx.strokeStyle = C['data-stimulus']; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
    ctx.strokeRect(X(kk) - bw / 2 - 2.5, Y(s_), bw + 5, Y(0) - Y(s_)); ctx.setLineDash([]);
  });
  p.axes();
  const even = S.harm.filter((_, i) => (i + 1) % 2 === 0).reduce((m, h) => Math.max(m, h.amp), 0);
  $('subHarm').innerHTML = `Bars: the signal, outline: the stimulus, green: <i>k</i>${st.kUpTo ? ', orange: the rest of the sum' : ''}. Largest even: ${even.toFixed(3)}.`;
}
function drawMap() {
  const st = state.s, sc = SC(), g = rng(state.seed + 7), sig = noiseSigma(st.noise);
  const noise = Array.from({ length: M + 1 }, () => XS.map(() => sig * g()));
  const val = (j, x) => GA[x] + S.A[j] * GB[x] + noise[j][x];   // a static band at 20, the signal as a band at 40
  const xt = [0, 10, 20, 30, 40, 50, 60].map(v => [v, String(v)]);
  if (st.view4 === 'mapT') {
    heatmap($('cHarm'), { scale: sc, x: [0, 60], y: [0, T], xlabel: 'spectral position / –', ylabel: 'time in the period / *T*', xticks: xt, yticks: T_TICKS }, M + 1, XS.length, val, 1.9,
      p => {
        if (state.cursor < 1) p.hline(state.cursor * T, C['ink-700'], 1);
        for (const t of zeroTimes(shownPhi())) p.hline(t, C['data-highlight'], 1.5);
      });
    $('subHarm').innerHTML = 'The spectra through the period: a static band at 20, the signal at 40. Green: where the reference crosses zero upwards.';
    return;
  }
  // PSD at every spectral position, at every harmonic the sum needs
  const IQ = XS.map((_, x) => Array.from({ length: st.k }, (__, h) => {
    const w = 2 * Math.PI * (h + 1) / T;
    return { I: 2 / T * trap(j => val(j, x) * Math.sin(w * ts[j])), Q: 2 / T * trap(j => val(j, x) * Math.cos(w * ts[j])) };
  }));
  heatmap($('cHarm'), { scale: sc, x: [0, 60], y: [0, 360], xlabel: 'spectral position / –', ylabel: 'phase angle *φ* / °', xticks: xt, yticks: PHI_TICKS }, 73, XS.length, (r, x) => sumAt(IQ[x], r * 5), phaseLim(),
    p => p.hline(shownPhi(), C['data-highlight'], 2));
  $('subHarm').innerHTML = `PSD at every position: the static band is gone, the signal a cosine in <i>φ</i>.`;
}

/* the values: signal, clean, stimulus, formula */
function drawTable() {
  const st = state.s, k = st.k, dis = disturbed();
  const fmt = (v, d = 3) => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(d));
  const flat = q => !q || q.amp == null || q.amp < 5e-3;
  const deg = v => `${Math.round(v) % 360}°`;
  const cols = [['signal', S.p, C['data-a']], ...(dis ? [['clean', S.pc, C['ink-500']]] : []), ['stimulus', S.ps, C['data-stimulus']], ['1st order', S.th, C['ink-500']]];
  const row = (label, f) => `<tr><td>${label}</td>${cols.map(([, q]) => `<td>${f(q)}</td>`).join('')}</tr>`;
  $('vK').textContent = k;
  $('readout').innerHTML = `<tr><th></th>${cols.map(([n, , c]) => `<th style="color:${c}">${n}</th>`).join('')}</tr>`
    + row('<i>I<sub>k</sub></i>', q => (q && q.I != null ? fmt(q.I) : '–'))
    + row('<i>Q<sub>k</sub></i>', q => (q && q.Q != null ? fmt(q.Q) : '–'))
    + row(`|<i>A</i><sub>${k}</sub>|`, q => (q ? fmt(q.amp) : '–'))
    + row('<i>φ</i><sub>max</sub>', q => (flat(q) || q.phiMax == null ? '–' : deg(q.phiMax)))
    + row('<i>δ</i>', q => (flat(q) || q.delta == null ? '–' : deg(q.delta)))
    + row('<i>t</i><sub>con</sub> / <i>T</i>', q => (flat(q) || q.tcon == null ? '–' : fmt(q.tcon)))
    + `<tr><td>mean <i>a</i>₀</td><td>${fmt(S.mean)}</td>${dis ? `<td>${fmt(trap(j => S.y[j]) / T)}</td>` : ''}<td>${fmt(trap(j => S.stim[j]) / T)}</td><td>–</td></tr>`;
}

function draw() {
  if (!S) return;
  drawSig(); drawInt(); drawPhase(); drawHarm(); drawTable(); controls.refresh();
}
function update() { compute(); draw(); markChanged(); }

/* ---------------------------------------------------------------------------
   Inputs as cases: changed or not, ignoring what is only for looking
   --------------------------------------------------------------------------- */
const snap = s => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => !DISPLAY_ONLY.includes(k))));
const caseS = () => INPUTS[state.idx].s;
function markChanged() { selector.changed(snap(state.s) !== snap(caseS())); renderRail(); }

/* ---------------------------------------------------------------------------
   Value controls
   --------------------------------------------------------------------------- */
const lagOf = tau => Math.atan(2 * Math.PI * tau / T) * 180 / Math.PI;
const tauOfLag = d => Math.tan(clamp(d, 0, 89.5) * Math.PI / 180) * T / (2 * Math.PI);
const tauBind = (key, label, off, caseVal, def) => ({
  label, unit: 'T', min: 0, max: 100, step: 1, redraw: 'update',
  get: () => state.s[key] ?? state.s.tau, set: v => { state.s[key] = clamp(v, 0, 2); },
  toR: sliderFromTau, fromR: tauFromSlider, fmt: v => v.toFixed(3), caseV: caseVal, def, off,
});
function bindOf(key) {
  const st = state.s;
  switch (key) {
    case 'duty': return {
      label: st.shape === 'triangle' ? 'rising fraction of the period' : 'on fraction of the period', unit: '', min: 0.05, max: 0.95, step: 0.05, redraw: 'update',
      get: () => st.duty, set: v => { st.duty = Math.round(clamp(v, 0.05, 0.95) * 20) / 20; },
      toR: v => v, fromR: r => +r, fmt: v => v.toFixed(2), caseV: () => caseS().duty, def: 0.5,
      off: () => st.shape === 'saw' || st.shape === 'sine',
    };
    case 'tau': return tauBind('tau', st.tauOff != null ? '<i>τ</i>, building up' : '<i>τ</i>', () => false, () => caseS().tau, 0.08);
    case 'tauOff': return tauBind('tauOff', '<i>τ</i>, decaying', () => st.tauOff == null, () => caseS().tauOff ?? caseS().tau, st.tau);
    case 'tau2': return tauBind('tau2', '<i>τ</i>₂, second step', () => st.tau2 == null, () => caseS().tau2 ?? 0.1, 0.1);
    case 'lag': return {
      label: 'or its lag <i>δ</i> at <i>k</i> = 1', unit: '°', min: 0, max: 89, step: 1, redraw: 'update',
      get: () => lagOf(st.tau), set: v => { st.tau = tauOfLag(v); }, toR: v => Math.round(v), fromR: r => +r, fmt: v => v.toFixed(1),
      caseV: () => lagOf(caseS().tau), def: lagOf(0.08),
    };
    case 'offset': return {
      label: 'offset', unit: '', min: 0, max: 0.5, step: 0.01, redraw: 'update',
      get: () => st.offset, set: v => { st.offset = clamp(v, 0, 0.5); }, toR: v => v, fromR: r => +r, fmt: v => v.toFixed(2), caseV: () => caseS().offset, def: 0,
    };
    case 'drift': return {
      label: 'drift per period', unit: '', min: -0.4, max: 0.4, step: 0.01, redraw: 'update',
      get: () => st.drift, set: v => { st.drift = clamp(v, -0.4, 0.4); }, toR: v => v, fromR: r => +r, fmt: v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2), caseV: () => caseS().drift, def: 0,
    };
    case 'noise': return {
      label: 'noise <i>σ</i>', unit: '', min: 0, max: 100, step: 1, redraw: 'update',
      get: () => noiseSigma(st.noise), set: v => { st.noise = 100 * Math.pow(clamp(v, 0, NOISE_MAX) / NOISE_MAX, 2 / 3); },
      toR: v => 100 * Math.pow(v / NOISE_MAX, 2 / 3), fromR: r => noiseSigma(r), fmt: v => v.toFixed(3), caseV: () => noiseSigma(caseS().noise), def: 0,
    };
    case 'phi': return {
      label: 'phase angle <i>φ</i>', unit: '°', min: 0, max: 359, step: 1, redraw: 'draw',
      get: () => st.phi, set: v => { st.phi = ((Math.round(v) % 360) + 360) % 360; }, toR: v => v, fromR: r => +r, fmt: v => String(v), caseV: () => caseS().phi, def: 0,
    };
    case 'speed': return {
      label: 'sweep speed', unit: '° s⁻¹', min: 10, max: 240, step: 10, redraw: 'none',
      get: () => state.speed, set: v => { state.speed = Math.round(clamp(v, 1, 720)); }, toR: v => v, fromR: r => +r, fmt: v => String(v), caseV: () => 80, def: 80,
    };
    default: throw new Error(`no binding ${key}`);
  }
}

const groupSums = () => {
  const st = state.s, dis = [st.offset && `offset ${st.offset.toFixed(2)}`, st.drift && 'drift', st.noise && `<i>σ</i> ${noiseSigma(st.noise).toFixed(3)}`].filter(Boolean);
  return {
    case: `${state.idx + 1} · ${INPUTS[state.idx].title}`,
    stimulus: `${SHAPE_NAME[st.shape]}${(st.shape === 'square' || st.shape === 'triangle') && st.duty !== 0.5 ? ` ${st.duty.toFixed(2)}` : ''}`,
    response: `<i>τ</i> ${st.tau.toFixed(3)}${st.tauOff != null ? ` / ${st.tauOff.toFixed(3)}` : ''}${st.tau2 != null ? ` + ${st.tau2.toFixed(3)}` : ''}${st.invert ? ' · antiphase' : ''}`,
    disturbances: dis.length ? dis.join(' · ') : 'none',
    demodulation: `<i>k</i> ${st.kUpTo ? '≤' : '='} ${st.k} · <i>φ</i> = ${st.phi}°`,
  };
};
const sums = foldingGroups(groupSums);

const controls = valueControls({
  bindOf, update, draw,
  after: () => {
    if (!state.s) return;
    const st = state.s;
    sums();
    setSeg($('shape'), st.shape); setSeg($('invert'), st.invert ? 1 : 0); setSeg($('harm'), st.k);
    setSeg($('view3'), st.view3); setSeg($('view4'), st.view4);
    $('asym').checked = st.tauOff != null; $('chain').checked = st.tau2 != null;
    $('clean').checked = st.clean; $('amp').checked = st.amp;
    setSeg($('kMode'), st.kUpTo ? 'le' : 'eq');
    $('view3').querySelector('[data-v="phasor"]').disabled = st.kUpTo;
    const pf = $('phiField');
    if (document.activeElement !== pf) pf.value = Math.round(shownPhi());
    pf.classList.toggle('preview', !!state.preview);
    $('kField').innerHTML = `<i>k</i> ${st.kUpTo ? '≤' : '='} ${st.k}, `;
  },
});

/* ---------------------------------------------------------------------------
   The other controls
   --------------------------------------------------------------------------- */
const segClick = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b) { fn(b.dataset.v); update(); } });
segClick('shape', v => { state.s.shape = v; });
segClick('invert', v => { state.s.invert = v === '1'; });
segClick('harm', v => { state.s.k = +v; });
segClick('view3', v => { state.s.view3 = v; });
segClick('view4', v => { state.s.view4 = v; });
$('asym').addEventListener('change', e => { state.s.tauOff = e.target.checked ? state.s.tau : null; update(); });
$('chain').addEventListener('change', e => { state.s.tau2 = e.target.checked ? 0.1 : null; update(); });
$('clean').addEventListener('change', e => { state.s.clean = e.target.checked; draw(); });
$('amp').addEventListener('change', e => { state.s.amp = e.target.checked; draw(); });
segClick('kMode', v => { state.s.kUpTo = v === 'le'; });
$('reseed').addEventListener('click', () => { state.seed += 1; update(); });
$('resetCase').addEventListener('click', () => selectInput(state.idx, false));
$('phiField').addEventListener('change', e => {
  const v = parseFloat(String(e.target.value).replace(',', '.'));
  if (Number.isFinite(v)) controls.apply('phi', v);
  e.target.blur(); controls.refresh();
});
$('phiField').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.dispatchEvent(new Event('change')); });
const setPhi = v => { state.s.phi = ((Math.round(v) % 360) + 360) % 360; draw(); };

/* panel 1: drag the reference by a peak; the peak at t means φ = 90° − 360°·k·t/T */
const cSig = $('cSig');
dragRuler(cSig, {
  rulerXs: () => P1?.xs ?? [], plotOf: () => P1?.p,
  onDrag: x => { const { inner } = P1.p, t = clamp((x - inner.l) / (inner.r - inner.l), 0, 1) * T; setPhi(-360 * state.s.k * t / T); },
});

/* panel 3: hover a point, click to keep it, drag the ruler */
const cPhase = $('cPhase');
const hitPoi = e => {
  if (!P3) return null;
  const { x, y } = localIn(cPhase, e);
  let best = null, bd = 11;
  for (const q of P3.pois) { const d = Math.hypot(q.px - x, q.py - y); if (d < bd) { bd = d; best = q; } }
  return best;
};
function poiText(q) {
  const k = state.s.k, p = S.p;
  if (q.kind === 'max') return `<div class="tip-title">The signal at its maximum, <i>φ</i> = ${q.phi.toFixed(0)}°</div>
    <p>The reference is in step with the signal: in panel 1 almost all of the product is amber, and the integral in panel 2 ends at its largest value, |<i>A</i><sub>${k}</sub>| = ${p.amp.toFixed(3)}. The lag <i>δ</i> = 360° − <i>φ</i><sub>max</sub> = ${p.delta.toFixed(0)}° reads as the time value <i>t</i><sub>con</sub> = ${p.tcon.toFixed(3)} <i>T</i>.</p><p class="tip-hint">click to keep this <i>φ</i></p>`;
  return `<div class="tip-title">The signal is gone, <i>φ</i> = ${q.phi.toFixed(0)}°</div>
    <p>90° from the maximum the reference is a quarter period out of step: in panel 1 the amber and purple areas are equal, and the integral in panel 2 comes back to zero.</p><p class="tip-hint">click to keep this <i>φ</i></p>`;
}
dragRuler(cPhase, {
  rulerXs: () => (P3 ? [P3.rx] : []), plotOf: () => P3?.p,
  onDrag: x => { const { inner } = P3.p; setPhi(clamp((x - inner.l) / (inner.r - inner.l), 0, 0.9999) * 360); },
  hover: e => {
    const q = hitPoi(e), prev = state.preview?.poi;
    if (q !== prev) { state.preview = q ? { phi: q.phi, poi: q } : null; draw(); }
    if (q) tooltip.show(poiText(q), e.clientX, e.clientY); else tooltip.hide();
    return !!q;
  },
  down: e => { const q = hitPoi(e); if (!q) return false; state.preview = null; tooltip.hide(); setPhi(q.phi); return true; },
  leave: () => { if (state.preview) { state.preview = null; draw(); } tooltip.hide(); },
});

/* sweep φ and run the integration cursor: one animation loop */
let playing = false, integrating = false, raf = 0, last = 0, acc = 0;
function loop(t) {
  if (!playing && !integrating) return;
  if (last) {
    const dts = (t - last) / 1000;
    if (playing) { acc = (acc + state.speed * dts) % 360; state.s.phi = Math.round(acc) % 360; }
    if (integrating) { state.cursor = Math.min(1, state.cursor + dts / 2.5); if (state.cursor >= 1) { integrating = false; $('run').textContent = '▶ integrate'; renderRail(); } }
    draw();
  }
  last = t;
  raf = requestAnimationFrame(loop);
}
const kick = () => { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(loop); };
function togglePlay() { playing = !playing; acc = state.s.phi; $('play').textContent = playing ? '❚❚ pause' : '▶ sweep φ'; renderRail(); kick(); }
function toggleRun() {
  integrating = !integrating;
  if (integrating && state.cursor >= 1) state.cursor = 0;
  if (!integrating) { state.cursor = 1; draw(); }
  $('run').textContent = integrating ? '❚❚ pause' : '▶ integrate';
  renderRail(); kick();
}
$('play').addEventListener('click', togglePlay);
$('run').addEventListener('click', toggleRun);

/* ---------------------------------------------------------------------------
   Panels and the rail
   --------------------------------------------------------------------------- */
function renderRail() {
  if (panels.left || !state.s) { $('rail').innerHTML = ''; return; }
  const st = state.s, changed = $('caseSelect').classList.contains('changed');
  $('rail').innerHTML = [
    rail.btn('open', '▶', 'Open the settings', { text: true }), rail.rule,
    rail.fly('input', rail.btn('inFly', String(state.idx + 1), 'Input', { text: true, on: true }),
      `<div class="fly-title">Input</div>${INPUTS.map((c, i) => rail.item('input', i, `${i + 1} · ${c.title}`, i === state.idx)).join('')}`),
    rail.btn('reset', '↺', changed ? 'Reset to the input' : 'Nothing changed from the input', { disabled: !changed }), rail.rule,
    rail.fly('shape', rail.btn('shFly', { square: '⊓', triangle: '⋀', saw: '◿', sine: '∿' }[st.shape], 'Stimulus shape', { text: true }),
      `<div class="fly-title">Stimulus</div>${Object.entries(SHAPE_NAME).map(([v, n]) => rail.item('shape', v, n, v === st.shape)).join('')}`),
    rail.fly('k', rail.btn('kFly', `k${st.k}`, 'Harmonic k', { text: true }),
      `<div class="fly-title">Harmonic <i>k</i></div>${[1, 2, 3, 4, 5].map(k => rail.item('k', k, `k = ${k}`, k === st.k)).join('')}`),
    rail.btn('play', playing ? '❚❚' : '▶', playing ? 'Pause the sweep' : 'Sweep φ', { on: playing, text: true }),
    rail.btn('run', '∫', integrating ? 'Pause the integration' : 'Run the integral', { on: integrating, text: true }),
    rail.btn('kUpTo', 'Σ', st.kUpTo ? `Harmonics 1 … ${st.k} summed. Click for k alone` : `Sum the harmonics 1 … ${st.k}`, { on: st.kUpTo, text: true }),
    rail.btn('clean', '≈', st.clean ? 'Clean signal shown. Click to hide' : 'Show the clean signal', { on: st.clean, text: true }),
    rail.btn('view3', st.view3 === 'cos' ? '∿' : '↗', st.view3 === 'cos' ? 'Phase domain as a cosine. Click for the phasor' : 'Phase domain as a phasor. Click for the cosine', { text: true }),
  ].join('');
}
$('rail').addEventListener('click', e => {
  const b = e.target.closest('[data-r]');
  if (!b) return;
  const r = b.dataset.r, st = state.s;
  rail.open = null;
  if (r === 'open') { panels.left = true; panels.set(); return; }
  if (r === 'input') { selectInput(+b.dataset.v); return; }
  if (r === 'reset') { selectInput(state.idx, false); return; }
  if (r === 'play') { togglePlay(); return; }
  if (r === 'run') { toggleRun(); return; }
  if (r === 'shape') st.shape = b.dataset.v;
  else if (r === 'k') st.k = +b.dataset.v;
  else if (r === 'kUpTo') st.kUpTo = !st.kUpTo;
  else if (r === 'clean') st.clean = !st.clean;
  else if (r === 'view3') st.view3 = st.view3 === 'cos' ? 'phasor' : 'cos';
  else return;
  update();
});

const panels = initWorkbench({ redraw: draw, renderRail });
const selector = caseSelector({ list: INPUTS, onSelect: i => selectInput(i) });

function selectInput(idx, push = true) {
  state.idx = idx;
  state.s = clone(INPUTS[idx].s);
  state.preview = null;
  selector.mark(idx);
  if (push) { try { const u = new URL(location.href); u.searchParams.set('input', INPUTS[idx].id); history.replaceState(null, '', u); } catch { /* not essential */ } }
  update();
}

/* ---------------------------------------------------------------------------
   Start: texts once (their markers are numbered once), then an input
   --------------------------------------------------------------------------- */
$('general').innerHTML = GENERAL;
$('equations').innerHTML = `<h2>Equations</h2>${EQUATIONS.join('')}`;
$('caseTexts').innerHTML = INPUTS.map(c => `<div>${c.text}</div>`).join('');
state.s = clone(INPUTS[state.idx].s);
controls.fill(document);
const wanted = new URLSearchParams(location.search).get('input');
const start = INPUTS.findIndex(c => c.id === wanted);
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  fitWorkbench();
  selectInput(start < 0 ? state.idx : start, false);
  renderCitations([$('general'), $('equations'), $('caseTexts')], $('refs'), SOURCES);
});

/**
 * MES-PSD demo: one engine, eight cases. See the comment block in index.html
 * for the model and the sources; the case texts below carry the citations.
 */
import { initShell } from '../../../assets/shell.js';
import { C, CHART } from '../../../assets/tokens.js';
import { plot, ticks } from '../../../assets/plot.js';
import { renderCitations } from '../../../assets/cite.js';

initShell({ page: 'demo', views: true });

/* ---------------------------------------------------------------------------
   Sources. Locators were read from the PDFs: handbook Ch. 42 runs pp. 967–978,
   Fig. 42.1 is on p. 969, Eq. 42.1 and the higher-harmonic rule on p. 970,
   Figs. 42.2 and 42.3 are discussed on pp. 971–972.
   --------------------------------------------------------------------------- */
const SOURCES = {
  handbook: {
    key: 'Wachs.SpringerHandbookAdvanced.2023',
    chapter: 'A. Urakawa, D. Ferri and R. J. G. Nuguid, “Modulation Excitation Spectroscopy (MES)”, Ch. 42, pp. 967–978',
    short: 'Urakawa et al., Springer Handbook of Advanced Catalyst Characterization 2023, Ch. 42',
  },
  urakawa2008: { key: 'Urakawa.SensitivityEnhancementDynamic.2008', journal: 'Chem. Eng. Sci.' },
  weyel: { key: 'Weyel.ModulationExcitationSpectroscopy.2024', lead: 'Hess' },
};

/* ---------------------------------------------------------------------------
   Cases. Spectral axes, species, and the settings a case opens with.
   A species: band [centre, fwhm, height] or null (a signal without a band,
   e.g. the gas in the cell); drive 'stim', 'static' or another species' key;
   tau in the case's time unit; invert (falls when the stimulus is on);
   base (a part of the band that never leaves).
   --------------------------------------------------------------------------- */
const MUTE_X = { from: 0, to: 60, step: 0.5, label: 'spectral position / –', ticks: [0, 10, 20, 30, 40, 50, 60].map(v => [v, String(v)]) };
const IR_X = { from: 1800, to: 950, step: -5, label: 'wavenumber / cm⁻¹', ticks: [1800, 1600, 1400, 1200, 1000].map(v => [v, String(v)]) };

const CASES = [
  {
    id: 'instant', eq: ['square'], title: 'One Band, No Delay', T: 1, unit: 'T', x: MUTE_X,
    species: [{ key: 'b', label: 'B', color: 'data-b', band: [30, 10, 1], drive: 'stim', tau: 0, slider: true }],
    set: { noise: 0, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: false },
    text: `<p>The simplest response there is: one band that follows the stimulus at once. Phase-sensitive detection multiplies the averaged period by a sine of harmonic <i>k</i>, shifted by the phase angle <i>φ</i>, and integrates over one period [@handbook, Fig. 42.1, p. 969]. Anything constant over the period meets the sine with zero area and drops out, so the mean height of the band is gone and only its swing is left.</p>
      <p>An on/off square wave of height 1 is ½ plus odd sines, so at <i>k</i> = 1 the band comes out with amplitude 2/π ≈ 0.64, largest at <i>φ</i> = 0: no delay, <i>t</i><sub>con</sub> = 0. Try <i>k</i> = 3: amplitude 2/(3π) ≈ 0.21, still at <i>φ</i> = 0. Try <i>k</i> = 2: nothing, a square wave has no even harmonics [@handbook, Eq. 42.1, p. 970].</p>`,
  },
  {
    id: 'lag', eq: ['lag'], title: 'One Band, First-Order Delay', T: 1, unit: 'T', x: MUTE_X,
    species: [{ key: 'b', label: 'B', color: 'data-b', band: [30, 10, 1], drive: 'stim', tau: 0.08, slider: true }],
    set: { noise: 0, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: false },
    text: `<p>Now the band follows through one first-order step, d<i>y</i>/d<i>t</i> = (<i>u</i> − <i>y</i>)/<i>τ</i>. For a linear step like this the fundamental lags the stimulus by <i>δ</i> = arctan(<i>ωτ</i>) and shrinks by 1/√(1 + (<i>ωτ</i>)²), with <i>ω</i> = 2π/<i>T</i>. In the phase domain the maximum moves from 0 to <i>φ</i><sub>max</sub> = 360° − <i>δ</i>, and the time value reads that delay back as a time [@weyel, Eq. 2].</p>
      <p>Move <i>τ</i>. The time value is close to <i>τ</i> only while <i>ωτ</i> ≪ 1, and for one step it never passes <i>T</i>/4, however slow the species, while the amplitude keeps falling. So a period near 2π<i>τ</i> to 10<i>τ</i> suits the steps of interest. The table compares the simulated time value with the one-step formula.</p>`,
  },
  {
    id: 'static', title: 'Static Band and Noise', T: 1, unit: 'T', x: MUTE_X,
    species: [
      { key: 'a', label: 'A, static', color: 'data-static', band: [20, 10, 1], drive: 'static' },
      { key: 'b', label: 'B', color: 'data-b', band: [38, 10, 0.08], drive: 'stim', tau: 0.05, slider: true },
    ],
    set: { noise: 48, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: false },
    text: `<p>What a measured spectrum looks like: a large band A that does not follow the stimulus (support, spectators), a small band B that does, and noise. In the time domain A dominates and B hides in the noise.</p>
      <p>Folding <i>N</i> cycles into one period cuts the noise by about √<i>N</i>. PSD then removes A exactly, because a constant integrates to zero against a sine, and keeps only what oscillates at <i>kω</i> [@handbook, Fig. 42.1, p. 969]. That is the sensitivity gain of MES: a band too small to see in the raw spectra stands out after PSD [@urakawa2008]. Raise the noise, then the number of cycles.</p>`,
  },
  {
    id: 'synchronous', title: 'Two Bands, Synchronous', T: 1, unit: 'T', x: MUTE_X,
    species: [
      { key: 'a', label: 'A', color: 'data-a', band: [20, 10, 1], drive: 'stim', tau: 0.04, slider: true },
      { key: 'b', label: 'B', color: 'data-b', band: [38, 10, 0.4], drive: 'stim', tau: 0.04, slider: true },
    ],
    set: { noise: 0, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: true },
    text: `<p>Two bands with the same kinetics. Every phase-resolved spectrum shows both with the same sign and the same ratio, and both curves in the phase domain cross zero and peak at the same angles [@handbook, Figs. 42.2 and 42.3, pp. 971–972].</p>
      <p>PSD cannot separate them: they are one species with two bands, or two species that happen to share their kinetics. Change one <i>τ</i> and the two maxima part.</p>`,
  },
  {
    id: 'retarded', title: 'Two Bands, A Retarded', T: 1, unit: 'T', x: MUTE_X,
    species: [
      { key: 'a', label: 'A', color: 'data-a', band: [20, 10, 1], drive: 'stim', tau: 0.15, slider: true },
      { key: 'b', label: 'B', color: 'data-b', band: [38, 10, 0.4], drive: 'stim', tau: 0.03, slider: true },
    ],
    set: { noise: 0, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: true },
    text: `<p>A slow band A and a fast band B. Their phase-domain curves peak at different angles, so the phase-resolved spectra change shape with <i>φ</i>: at the angle where one band crosses zero, the spectrum contains only the other [@handbook, Figs. 42.2 and 42.3, pp. 971–972].</p>
      <p>The set of 18 spectra from 0 to 170° is drawn the way the handbook draws it. Sweep <i>φ</i> and watch A vanish while B is still there, and the other way round. B has the smaller time value: it responds first.</p>`,
  },
  {
    id: 'opposite', title: 'Two Bands, Opposite: A Turns into B', T: 1, unit: 'T', x: MUTE_X,
    species: [
      { key: 'a', label: 'A', color: 'data-a', band: [20, 10, 1], drive: 'stim', tau: 0.04, invert: true, slider: true },
      { key: 'b', label: 'B', color: 'data-b', band: [38, 10, 0.4], drive: 'stim', tau: 0.04, slider: true },
    ],
    set: { noise: 0, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: true },
    text: `<p>When the stimulus switches on, A falls while B grows, and back in the second half: one species turning into the other and back [@handbook, Figs. 42.2 and 42.3, pp. 971–972]. Every phase-resolved spectrum shows the two bands as lobes of opposite sign, and their phase-domain curves are mirror images, 180° apart.</p>
      <p>A falling band therefore reads a time value later by <i>T</i>/2 at <i>k</i> = 1. Read the sign before reading the time.</p>`,
  },
  {
    id: 'harmonics', eq: ['square'], title: 'Square-Wave Harmonics', T: 1, unit: 'T', x: MUTE_X,
    species: [
      { key: 'a', label: 'A', color: 'data-a', band: [20, 10, 1], drive: 'stim', tau: 0.15, slider: true },
      { key: 'b', label: 'B', color: 'data-b', band: [38, 10, 0.4], drive: 'stim', tau: 0.03, slider: true },
    ],
    set: { noise: 0, cycles: 4, shape: 'square', k: 3, phi: 0, allPhi: true },
    text: `<p>A square wave is a sum of odd sines, (4/π) Σ sin[(2<i>n</i> − 1)<i>ωt</i>]/(2<i>n</i> − 1), so one square-wave experiment drives the sample at <i>ω</i>, 3<i>ω</i> and 5<i>ω</i> at once [@handbook, Eq. 42.1, p. 970]. Demodulating at <i>k</i> = 3 or 5 gives the response to a 3 or 5 times faster modulation, and the amplitude times <i>k</i> puts it on the scale of the fundamental. This holds exactly only while the response is linear [@handbook, p. 970].</p>
      <p>Compare <i>k</i> = 1 and 3: at the faster frequency the slow band A falls further behind and loses more amplitude. <i>k</i> = 2 shows nothing. Switch the stimulus to sine and only <i>k</i> = 1 is left; how the stimulation shape enters the analysis is worked out in [@urakawa2008].</p>`,
  },
  {
    id: 'sequence', title: 'A Sequence with a Spectator', T: 60, unit: 'min', x: IR_X,
    species: [
      { key: 'gas', label: 'gas in the cell', color: 'data-stimulus', band: null, drive: 'stim', tau: 3.5 },
      { key: 'fast', label: 'fast species', color: 'data-b', band: [1600, 70, 1.0], drive: 'gas', tau: 1.1, slider: true },
      { key: 'slow', label: 'slow species, fed by the fast one', color: 'data-c', band: [1060, 60, 0.7], drive: 'fast', tau: 17.6, base: 0.35, slider: true },
      { key: 'spec', label: 'spectator', color: 'data-static', band: [1430, 90, 0.9], drive: 'static' },
    ],
    set: { noise: 35, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: false },
    text: `<p>A catalyst bed switched between CO₂ + H₂ and H₂ every 30 min (<i>T</i> = 60 min). The gas in the cell follows the valve with its own lag, a fast surface species follows the gas, a slow one is fed by the fast one and keeps a part that never leaves, and a spectator sits there. The band positions and every number are illustrative.</p>
      <p>Delays in series add, so the slow species can come out later than <i>T</i>/4 although no single step can. The spectator is the largest band in the spectrum and vanishes after PSD. Time values read as an order: an intermediate responds after the reactant and before the product, and a signal later than the product is suspect [@weyel].</p>`,
  },
];

/* Formula boxes: fractions stacked, an integral with its limits stacked.
   Running prose keeps the one-line form (2/π), as in IR-bands. */
const frac = (num, den) => `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
const integral = (lo, hi) => `<span class="int">∫<span class="lims"><span>${hi}</span><span>${lo}</span></span></span>`;
const sum = (lo, hi) => `<span class="int">Σ<span class="lims"><span>${hi}</span><span>${lo}</span></span></span>`;
/**
 * An equation callout: header, the equation, what it does, then its symbols.
 * `cite` markers go in the explanation, so the box says where it comes from.
 */
const callout = ({ title, math, text, symbols }) => `<div class="eq-callout">
  <div class="eq-head">${title}</div>
  <div class="eq-math">${math}</div>
  <p class="eq-text">${text}</p>
  <dl class="eq-symbols">${symbols.map(([sym, what]) => `<dt>${sym}</dt><dd>${what}</dd>`).join('')}</dl>
</div>`;

const EQ = {
  psd: callout({
    title: 'Phase-Sensitive Detection',
    math: `<i>A<sub>k</sub></i>(<i>φ</i>) = ${frac('2', '<i>T</i>')} ${integral('0', '<i>T</i>')} <i>A</i>(<i>t</i>) sin(<i>kωt</i> + <i>φ</i>) d<i>t</i>, &emsp; <i>ω</i> = ${frac('2π', '<i>T</i>')}`,
    text: 'Multiplies the averaged period by a sine of the <i>k</i>-th harmonic, shifted by <i>φ</i>, and integrates over one period. Whatever is constant over the period integrates to zero and drops out [@handbook, Fig. 42.1, p. 969] [@weyel, Eq. 1].',
    symbols: [
      ['<i>A<sub>k</sub></i>(<i>φ</i>)', 'phase-resolved absorbance at harmonic <i>k</i> and phase angle <i>φ</i>, in the units of <i>A</i>'],
      ['<i>A</i>(<i>t</i>)', 'absorbance of the averaged period at time <i>t</i>, at one spectral position'],
      ['<i>T</i>', 'period of the stimulus'],
      ['<i>t</i>', 'time within the period, 0 at switch-on'],
      ['<i>k</i>', 'demodulation index, the harmonic: 1, 2, 3, …'],
      ['<i>φ</i>', 'phase angle of the demodulation, in °; <i>φ</i><sup>PSD</sup> in the handbook'],
      ['<i>ω</i>', 'angular frequency of the stimulus'],
    ],
  }),
  tcon: callout({
    title: 'Time Value',
    math: `<i>t</i><sub>con</sub> = ${frac('360° − <i>φ</i><sub>max</sub>', '360°')} · ${frac('<i>T</i>', '<i>k</i>')}`,
    text: 'Reads the phase angle of the maximum back as a delay after the stimulus [@weyel, Eq. 2]. At harmonic <i>k</i> the period is <i>T</i>/<i>k</i>, so this page divides by <i>k</i>; at <i>k</i> = 1 it is the equation as published [@handbook, p. 970].',
    symbols: [
      ['<i>t</i><sub>con</sub>', 'time value: how late the signal responds, between 0 and <i>T</i>/<i>k</i>'],
      ['<i>φ</i><sub>max</sub>', 'phase angle at which <i>A<sub>k</sub></i>(<i>φ</i>) is largest, in °'],
      ['<i>T</i>, <i>k</i>', 'period and harmonic, as above'],
    ],
  }),
  lag: callout({
    title: 'One First-Order Step',
    math: `<i>δ</i> = arctan(<i>ωτ</i>), &emsp; ${frac('|<i>A</i><sub>1</sub>|', '|<i>A</i><sub>1</sub>|<sub><i>τ</i> = 0</sub>')} = ${frac('1', '√(1 + (<i>ωτ</i>)²)')}`,
    text: 'A linear step d<i>y</i>/d<i>t</i> = (<i>u</i> − <i>y</i>)/<i>τ</i> driven at <i>ω</i> lags its input by <i>δ</i> and loses amplitude. Derived for this page, not taken from a source; the table checks it against the simulation.',
    symbols: [
      ['<i>δ</i>', 'phase lag of the response behind the stimulus, in rad'],
      ['<i>τ</i>', 'time constant of the step'],
      ['<i>u</i>, <i>y</i>', 'input and response of the step'],
      ['|<i>A</i><sub>1</sub>|<sub><i>τ</i> = 0</sub>', 'amplitude of a response without delay (2/π for an on/off square wave of height 1)'],
    ],
  }),
  square: callout({
    title: 'A Square Wave as a Sum of Sines',
    math: `SW(<i>t</i>) = ${frac('4', 'π')} <i>A</i><sub>SW</sub> ${sum('<i>n</i> = 1', '∞')} ${frac('sin[(2<i>n</i> − 1)<i>ωt</i>]', '2<i>n</i> − 1')}`,
    text: 'An on/off stimulus contains the fundamental and every odd harmonic, each smaller by its order, and no even one [@handbook, Eq. 42.1, p. 970]. The on/off wave of this page is ½ + ½ SW(<i>t</i>) with <i>A</i><sub>SW</sub> = 1.',
    symbols: [
      ['SW(<i>t</i>)', 'square wave between −<i>A</i><sub>SW</sub> and +<i>A</i><sub>SW</sub>'],
      ['<i>A</i><sub>SW</sub>', 'its amplitude'],
      ['<i>n</i>', 'index of the term; term <i>n</i> is harmonic 2<i>n</i> − 1'],
      ['<i>ω</i>', 'angular frequency of the stimulus, 2π/<i>T</i>'],
    ],
  }),
};


/* ---------------------------------------------------------------------------
   Engine
   --------------------------------------------------------------------------- */
const M = 120;     // samples per period
const WARM = 2;    // cycles discarded before averaging
const SIG_MAX = 0.06;

const $ = id => document.getElementById(id);
const state = { caseIdx: 0, taus: {}, noise: 0, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: false, seed: 1 };

const tauFromSlider = (v, T) => (v <= 0 ? 0 : T * 0.003 * Math.pow(200, (v - 1) / 99));
const sliderFromTau = (tau, T) => (tau <= 0 ? 0 : Math.round(1 + 99 * Math.log(tau / T / 0.003) / Math.log(200)));
const sigmaFromSlider = v => SIG_MAX * Math.pow(v / 100, 1.5);

function rng(seed) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

/**
 * dy/dt = (u - y) / tau, exact for an input held constant over each sample
 * interval. `points` is the input at the sample times (what tau = 0 returns);
 * `held[i]` the value it holds over [t_i, t_i+1]. Without `held`, the mean of
 * the two neighbouring points is used (a chain of steps).
 */
function firstOrder(points, tau, dt, held = null) {
  if (!(tau > 0)) return Float64Array.from(points);
  const e = Math.exp(-dt / tau), y = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    const h = held ? held[i - 1] : 0.5 * (points[i - 1] + points[i]);
    y[i] = h + (y[i - 1] - h) * e;
  }
  return y;
}

const gauss = (x, c, w) => Math.exp(-4 * Math.LN2 * ((x - c) / w) ** 2);

function compute() {
  const cs = CASES[state.caseIdx], T = cs.T, dt = T / M;
  const n = (WARM + state.cycles) * M;
  // the stimulus at the sample times (a jump that falls on a sample counts ½, as
  // the trapezoid rule wants) and the value it holds over each interval
  const stim = new Float64Array(n), held = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const j = i % M;
    if (state.shape === 'square') {
      stim[i] = j === 0 || j === M / 2 ? (i === 0 ? 0 : 0.5) : (j < M / 2 ? 1 : 0);
      held[i] = j < M / 2 ? 1 : 0;
    } else {
      stim[i] = 0.5 + 0.5 * Math.sin(2 * Math.PI * j / M);
      held[i] = 0.5 + 0.5 * Math.sin(2 * Math.PI * (j + 0.5) / M);
    }
  }
  // concentrations, then band heights
  const conc = { stim };
  const height = {};
  for (const sp of cs.species) {
    const tau = state.taus[sp.key] ?? sp.tau ?? 0;
    conc[sp.key] = sp.drive === 'static' ? new Float64Array(n).fill(1)
      : firstOrder(conc[sp.drive], tau, dt, sp.drive === 'stim' ? held : null);
    if (!sp.band) continue;
    const base = sp.base ?? 0, c = conc[sp.key], h = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const v = sp.drive === 'static' ? 1 : (sp.invert ? 1 - c[i] : c[i]);
      h[i] = sp.band[2] * (base + (1 - base) * v);
    }
    height[sp.key] = h;
  }
  // spectra over time, folded over the kept cycles
  const xs = [];
  for (let x = cs.x.from; cs.x.step > 0 ? x <= cs.x.to + 1e-9 : x >= cs.x.to - 1e-9; x += cs.x.step) xs.push(x);
  const nx = xs.length;
  const banded = cs.species.filter(s => s.band);
  const shapes = Object.fromEntries(banded.map(s => [s.key, xs.map(x => gauss(x, s.band[0], s.band[1]))]));
  const centre = Object.fromEntries(banded.map(s => [s.key, xs.reduce((b, x, i) => (Math.abs(x - s.band[0]) < Math.abs(xs[b] - s.band[0]) ? i : b), 0)]));
  const sigma = sigmaFromSlider(state.noise), g = rng(state.seed);
  const fold = Array.from({ length: M }, () => new Float64Array(nx));
  const raw = Object.fromEntries(banded.map(s => [s.key, new Float64Array(n)]));
  for (let i = 0; i < n; i++) {
    for (const s of banded) raw[s.key][i] = height[s.key][i] + sigma * g();
    if (i < WARM * M) continue;
    const row = fold[i % M];
    for (let x = 0; x < nx; x++) {
      let a = sigma * g();
      for (const s of banded) a += height[s.key][i] * shapes[s.key][x];
      row[x] += a / state.cycles;
    }
  }
  // PSD at harmonic k: in-phase and quadrature per spectral point
  const k = state.k, I = new Float64Array(nx), Q = new Float64Array(nx);
  for (let j = 0; j < M; j++) {
    const wt = 2 * Math.PI * k * j / M, sn = Math.sin(wt), cs_ = Math.cos(wt);
    for (let x = 0; x < nx; x++) { I[x] += 2 / M * fold[j][x] * sn; Q[x] += 2 / M * fold[j][x] * cs_; }
  }
  const phaseOf = (i, q) => {
    const amp = Math.hypot(i, q), phiMax = ((Math.atan2(q, i) * 180 / Math.PI) + 360) % 360;
    return { I: i, Q: q, amp, phiMax, tcon: ((360 - phiMax) % 360) / 360 * T / k };
  };
  // a signal without a band (stimulus, gas): PSD of its own folded trace
  const psdTrace = c => {
    let i_ = 0, q_ = 0;
    for (let j = 0; j < M; j++) {
      let v = 0;
      for (let c0 = WARM; c0 < WARM + state.cycles; c0++) v += c[c0 * M + j] / state.cycles;
      const wt = 2 * Math.PI * k * j / M;
      i_ += 2 / M * v * Math.sin(wt); q_ += 2 / M * v * Math.cos(wt);
    }
    return phaseOf(i_, q_);
  };
  const rows = [{ key: 'stim', label: 'stimulus', ...psdTrace(stim), theory: 0 }];
  for (const sp of cs.species) {
    const r = sp.band ? phaseOf(I[centre[sp.key]], Q[centre[sp.key]]) : psdTrace(conc[sp.key]);
    rows.push({ key: sp.key, label: sp.label, color: C[sp.color], static: sp.drive === 'static', sp, ...r, theory: theoryTcon(cs, sp, k) });
  }
  return { cs, T, dt, n, stim, held, conc, raw, height, xs, fold, I, Q, centre, banded, rows, sigma, k };
}

/** One-step (or chain) first-order time value at harmonic k: phases of steps in series add. */
function theoryTcon(cs, sp, k) {
  if (sp.drive === 'static') return null;
  const T = cs.T, w = 2 * Math.PI * k / T;
  let phase = 0, s = sp;
  while (s) {
    const tau = state.taus[s.key] ?? s.tau ?? 0;
    phase += Math.atan(w * tau);
    s = cs.species.find(o => o.key === s.drive);
  }
  if (sp.invert) phase += Math.PI;
  const period = T / k;
  return ((phase / (2 * Math.PI)) * period) % period;
}

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
let S = null;

const fmtT = (v, cs) => (cs.unit === 'T' ? `${v.toFixed(3)} T` : `${v.toFixed(1)} min`);
const timeLabel = cs => (cs.unit === 'T' ? 'time / T' : 'time / min');
/**
 * Fixed y limits per case. They depend on the case's bands only, never on a
 * slider, the harmonic or φ, so nothing rescales while settings change or
 * while φ is swept. A trace that leaves them (heavy noise) is clipped.
 *   hAll:  tallest band, static ones included (time, fold, spectra)
 *   hResp: tallest band that follows the stimulus (PSD can reach 2/π of it)
 */
function limits(cs) {
  const banded = cs.species.filter(s => s.band);
  const hAll = Math.max(1, ...banded.map(s => s.band[2]));
  const hResp = Math.max(...banded.filter(s => s.drive !== 'static').map(s => s.band[2] * (1 - (s.base ?? 0))));
  return {
    time: [-0.12 * hAll, 1.16 * hAll],
    spec: [-0.72 * Math.max(hResp, 0.05 * hAll), 1.12 * hAll],
    phase: [-0.75 * hResp, 0.75 * hResp],
  };
}

function drawTime() {
  const { cs, T, dt, n, held, raw, conc } = S;
  const shown = Math.min(n, (WARM + 3) * M), ts = Array.from({ length: shown }, (_, i) => i * dt);
  const traces = S.banded.map(s => raw[s.key].subarray(0, shown));
  const yr = limits(cs).time;
  const p = plot($('cTime'), {
    x: [0, shown * dt], y: yr, xlabel: timeLabel(cs), ylabel: 'band height / –',
    xticks: ticks(0, shown * dt, 5, v => String(+v.toFixed(2))), yticks: ticks(yr[0], yr[1], 4),
  });
  for (let c = 0; c < shown / M; c++) { p.shadeX(c * T, c * T + T / 2, C['shade-on']); p.shadeX(c * T + T / 2, (c + 1) * T, C['shade-off']); }
  p.vline(WARM * T, C['ink-500'], 1, [3, 3]);
  p.text('warm-up, not averaged', WARM * T * 0.5, yr[1] - (yr[1] - yr[0]) * 0.07);
  p.steps(ts, Array.from(held.subarray(0, shown)), C['data-stimulus']);
  for (const sp of cs.species.filter(s => !s.band)) p.line(ts, Array.from(conc[sp.key].subarray(0, shown)), C[sp.color], CHART.lineThin, CHART.dash);
  S.banded.forEach((s, i) => p.line(ts, Array.from(traces[i]), C[s.color], CHART.lineThin));
  p.axes();
}

function foldedAt(key) {
  const ci = S.centre[key];
  return S.fold.map(r => r[ci]);
}

function drawFold() {
  const { cs, T, dt, held, conc } = S;
  const tp = Array.from({ length: M }, (_, j) => j * dt);
  const traces = S.banded.map(s => foldedAt(s.key));
  const yr = limits(cs).time;
  const tk = cs.unit === 'T' ? [[0, '0'], [0.25, 'T/4'], [0.5, 'T/2'], [0.75, '3T/4'], [1, 'T']] : ticks(0, T, 4);
  const p = plot($('cFold'), { x: [0, T], y: yr, xlabel: cs.unit === 'T' ? 'time in the period / T' : 'time in the period / min', ylabel: 'band height / –', xticks: tk, yticks: ticks(yr[0], yr[1], 4) });
  p.shadeX(0, T / 2, C['shade-on']); p.shadeX(T / 2, T, C['shade-off']);
  p.steps(tp, Array.from(held.subarray(0, M)), C['data-stimulus']);
  for (const sp of cs.species.filter(s => !s.band)) {
    const c = conc[sp.key], avg = tp.map((_, j) => { let v = 0; for (let q = WARM; q < WARM + state.cycles; q++) v += c[q * M + j]; return v / state.cycles; });
    p.line(tp, avg, C[sp.color], CHART.lineThin, CHART.dash);
  }
  S.banded.forEach((s, i) => p.line(tp, traces[i], C[s.color]));
  p.axes();
  $('subFold').textContent = `${state.cycles} cycle${state.cycles > 1 ? 's' : ''} averaged after ${WARM} warm-up cycles: the noise drops by about √${state.cycles}.`;
}

const psdAt = (phi) => {
  const r = phi * Math.PI / 180;
  return Array.from(S.I, (v, x) => v * Math.cos(r) + S.Q[x] * Math.sin(r));
};

function drawSpec() {
  const { cs, xs } = S;
  const cur = psdAt(state.phi);
  const set = state.allPhi ? Array.from({ length: 18 }, (_, i) => psdAt(i * 10)) : [];
  const avg = state.allPhi ? [] : Array.from({ length: 12 }, (_, i) => Array.from(S.fold[i * (M / 12)]));
  const yr = limits(cs).spec;
  const p = plot($('cSpec'), { x: [cs.x.from, cs.x.to], y: yr, xlabel: cs.x.label, ylabel: 'absorbance / –', xticks: cs.x.ticks, yticks: ticks(yr[0], yr[1], 4) });
  p.hline(0);
  for (const s of avg) p.line(xs, s, C['data-faint'], CHART.lineFaint);
  for (const s of set) p.line(xs, s, C['data-faint'], CHART.lineFaint);
  p.line(xs, cur, C['data-highlight'], CHART.lineHighlight);
  for (const s of S.banded) p.text(s.label.split(',')[0], s.band[0], yr[1] - (yr[1] - yr[0]) * 0.07, C[s.color]);
  p.axes();
}

function drawPhase() {
  const ph = Array.from({ length: 73 }, (_, i) => i * 5);
  const rows = S.rows.filter(r => r.sp && r.sp.band);
  const yr = limits(S.cs).phase, amp = yr[1];
  const p = plot($('cPhase'), {
    x: [0, 360], y: yr, xlabel: 'phase angle φ / °', ylabel: 'phase-resolved absorbance / –',
    xticks: [0, 90, 180, 270, 360].map(v => [v, String(v)]), yticks: ticks(yr[0], yr[1], 4),
  });
  p.hline(0);
  p.vline(state.phi, C['data-highlight'], 1.5, [4, 3]);
  for (const r of rows) {
    p.line(ph, ph.map(f => r.I * Math.cos(f * Math.PI / 180) + r.Q * Math.sin(f * Math.PI / 180)), r.color);
    if (!r.static && r.amp > 0.01 * amp) p.dot(r.phiMax, r.amp, r.color);
  }
  p.axes();
}

function legend(el, items) {
  el.innerHTML = items.map(([label, color, dashed]) => `<span class="${dashed ? 'dashed' : ''}" style="--c:${color}">${label}</span>`).join('');
}

function drawTable() {
  const { cs, k, rows } = S;
  const square = state.shape === 'square';
  const strong = Math.max(...rows.filter(r => r.key !== 'stim').map(r => r.amp), 1e-9);
  const head = `<tr><th>signal</th><th><i>τ</i></th><th><i>φ</i><sub>max</sub></th><th><i>t</i><sub>con</sub>, simulated</th><th><i>t</i><sub>con</sub>, first-order steps</th><th>|<i>A<sub>${k}</sub></i>|</th>${square && k > 1 ? `<th>${k} · |<i>A<sub>${k}</sub></i>|</th>` : ''}</tr>`;
  const body = rows.map(r => {
    const flat = r.static || r.amp < 0.01 * Math.max(strong, rows[0].amp);
    const tau = r.sp ? (r.sp.drive === 'static' ? '–' : fmtT(state.taus[r.key] ?? r.sp.tau ?? 0, cs)) : '–';
    return `<tr><td${r.color ? ` style="color:${r.color}"` : ''}>${r.label}</td><td>${tau}</td>
      <td>${flat ? '–' : r.phiMax.toFixed(0) + '°'}</td><td>${flat ? '–' : fmtT(r.tcon, cs)}</td>
      <td>${r.theory == null || flat ? '–' : fmtT(r.theory, cs)}</td><td>${r.amp.toFixed(3)}</td>
      ${square && k > 1 ? `<td>${(k * r.amp).toFixed(3)}</td>` : ''}</tr>`;
  }).join('');
  $('readout').innerHTML = head + body;
}

function draw() {
  if (!S) return;
  $('vPhi').textContent = `${state.phi}°`;
  drawTime(); drawFold(); drawSpec(); drawPhase(); drawTable();
}

function update() { S = compute(); draw(); }

/* ---------------------------------------------------------------------------
   Controls and case switching
   --------------------------------------------------------------------------- */
function setSeg(id, v) {
  $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
}

function caseTexts() {
  const cs = CASES[state.caseIdx];
  $('caseText').innerHTML = `<h2>${cs.title}</h2>${cs.text}`;
  $('equations').innerHTML = `<h2>Equations</h2>${EQ.psd}${EQ.tcon}${(cs.eq ?? []).map(k => EQ[k]).join('')}`;
  $('subSpec').innerHTML = state.allPhi
    ? `<i>A<sub>k</sub></i>(<i>φ</i>) for <i>φ</i> = 0, 10, …, 170° (grey) and at the chosen <i>φ</i> (green) [@handbook, Fig. 42.2, pp. 971–972].`
    : `Grey: the averaged spectra through one period. Green: <i>A<sub>k</sub></i>(<i>φ</i>) at the chosen <i>φ</i> [@handbook, Fig. 42.1, p. 969].`;
  $('subPhase').innerHTML = `<i>A<sub>k</sub></i>(<i>φ</i>) at each band maximum. The dot is <i>φ</i><sub>max</sub>, read as <i>t</i><sub>con</sub> in the table [@weyel, Eq. 2].`;
  renderCitations([$('subSpec'), $('subPhase'), $('caseText'), $('equations')], $('refs'), SOURCES);
}

function tauControls() {
  const cs = CASES[state.caseIdx];
  document.querySelectorAll('.ctl.tau').forEach(e => e.remove());
  const html = cs.species.filter(s => s.slider).map(s =>
    `<label class="ctl tau"><span><i>τ</i>, ${s.label.split(',')[0]}: <b data-v="${s.key}"></b></span>
      <input type="range" min="0" max="100" data-tau="${s.key}" value="${sliderFromTau(state.taus[s.key], cs.T)}"></label>`).join('');
  $('controls').insertAdjacentHTML('afterbegin', html);
  document.querySelectorAll('[data-tau]').forEach(inp => {
    const key = inp.dataset.tau;
    const show = () => { document.querySelector(`b[data-v="${key}"]`).textContent = fmtT(state.taus[key], cs); };
    show();
    inp.addEventListener('input', () => { state.taus[key] = tauFromSlider(+inp.value, cs.T); show(); update(); });
  });
}

function legends() {
  const cs = CASES[state.caseIdx];
  const items = [['stimulus', C['data-stimulus'], true],
    ...cs.species.filter(s => !s.band).map(s => [s.label, C[s.color], true]),
    ...cs.species.filter(s => s.band).map(s => [s.label, C[s.color]])];
  legend($('legTime'), items);
  legend($('legFold'), items);
  legend($('legPhase'), cs.species.filter(s => s.band).map(s => [s.label, C[s.color]]));
}

function selectCase(idx, push = true) {
  state.caseIdx = idx;
  const cs = CASES[idx];
  state.taus = Object.fromEntries(cs.species.map(s => [s.key, s.tau ?? 0]));
  Object.assign(state, { noise: cs.set.noise, cycles: cs.set.cycles, shape: cs.set.shape, k: cs.set.k, phi: cs.set.phi, allPhi: cs.set.allPhi });
  $('noise').value = state.noise; $('cycles').value = state.cycles; $('phi').value = state.phi; $('allPhi').checked = state.allPhi;
  $('vNoise').textContent = sigmaFromSlider(state.noise).toFixed(3);
  $('vCycles').textContent = state.cycles;
  setSeg('shape', state.shape); setSeg('harm', state.k);
  $('caseBtn').innerHTML = `<span class="n">${idx + 1}</span>${cs.title}<span class="caret" aria-hidden="true">▾</span>`;
  document.querySelectorAll('#caseMenu li').forEach((li, i) => li.setAttribute('aria-selected', String(i === idx)));
  tauControls(); legends(); caseTexts();
  if (push) {
    try { const u = new URL(location.href); u.searchParams.set('case', cs.id); history.replaceState(null, '', u); } catch { /* not essential */ }
  }
  update();
}

/* the case selector: one button showing the current case, a menu on click */
$('caseMenu').innerHTML = CASES.map((c, i) => `<li role="option" tabindex="-1" data-i="${i}"><span class="n">${i + 1}</span>${c.title}</li>`).join('');
const menuOpen = () => !$('caseMenu').hidden;
function openMenu(on) {
  $('caseMenu').hidden = !on;
  $('caseBtn').setAttribute('aria-expanded', String(on));
  if (on) (document.querySelector('#caseMenu li[aria-selected="true"]') ?? document.querySelector('#caseMenu li')).focus();
}
$('caseBtn').addEventListener('click', () => openMenu(!menuOpen()));
$('caseMenu').addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li) return;
  openMenu(false); $('caseBtn').focus();
  selectCase(+li.dataset.i);
});
$('caseMenu').addEventListener('keydown', e => {
  const items = [...document.querySelectorAll('#caseMenu li')], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)].focus(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.activeElement.click(); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); openMenu(false); $('caseBtn').focus(); }
});
document.addEventListener('click', e => { if (menuOpen() && !e.target.closest('#caseSelect')) openMenu(false); });
$('noise').addEventListener('input', e => { state.noise = +e.target.value; $('vNoise').textContent = sigmaFromSlider(state.noise).toFixed(3); update(); });
$('cycles').addEventListener('input', e => { state.cycles = +e.target.value; $('vCycles').textContent = state.cycles; update(); });
$('phi').addEventListener('input', e => { state.phi = +e.target.value; draw(); });
$('allPhi').addEventListener('change', e => { state.allPhi = e.target.checked; caseTexts(); draw(); });
$('shape').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.shape = b.dataset.v; setSeg('shape', state.shape); update(); });
$('harm').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.k = +b.dataset.v; setSeg('harm', state.k); update(); });
$('reseed').addEventListener('click', () => { state.seed += 1; update(); });

let playing = false, raf = 0;
$('play').addEventListener('click', () => {
  playing = !playing;
  $('play').textContent = playing ? '❚❚ pause' : '▶ sweep φ';
  let last = 0;
  const stepFn = ts => {
    if (!playing) return;
    if (ts - last > 60) { last = ts; state.phi = (state.phi + 5) % 360; $('phi').value = state.phi; draw(); }
    raf = requestAnimationFrame(stepFn);
  };
  if (playing) raf = requestAnimationFrame(stepFn); else cancelAnimationFrame(raf);
});
window.addEventListener('shell:resize', draw);

const wanted = new URLSearchParams(location.search).get('case');
const start = Math.max(0, CASES.findIndex(c => c.id === wanted));
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => selectCase(start, false));

/**
 * MES-PSD cases: one engine, every setting on a control, and a case is
 * nothing but a stored snapshot of the settings. Picking a case loads its
 * snapshot; from there every control is free. See the comment block in
 * index.html for the model and the sources; the case texts carry the citations.
 */
import { initShell } from '../../../../assets/shell.js';
import { C, CHART } from '../../../../assets/tokens.js';
import { plot, ticks } from '../../../../assets/plot.js';
import { renderCitations } from '../../../../assets/cite.js';

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
   Settings. Everything the engine reads is in one object, and a case is a
   copy of it plus a title and a text:

   { unit, T, axis, noise, cycles, shape, k, phi, allPhi, species: [...] }

     unit     'T' (time in periods, T = 1) or 'min' (T in minutes)
     axis     'generic' (spectral position 0 to 60) or 'ir' (wavenumber)
     noise    slider value 0 to 100
     species  in drive order. Each one:
       key, label, color ('data-a' | 'data-b' | 'data-c'; static and bandless
         species draw in their own colour whatever is stored here)
       band   [centre, fwhm, height] or null (a signal without a band, e.g.
              the gas in the cell)
       drive  'stim', 'static' or the key of an earlier species
       tau    time constant, in the unit of the case
       invert falls while the stimulus is on
       base   part of the band that never leaves, 0 to 0.95
   --------------------------------------------------------------------------- */
const AXES = {
  generic: { from: 0, to: 60, step: 0.5, label: 'spectral position / –', name: 'generic, 0 to 60', ticks: [0, 10, 20, 30, 40, 50, 60].map(v => [v, String(v)]) },
  ir: { from: 1800, to: 950, step: -5, label: 'wavenumber / cm⁻¹', name: 'IR, 1800 to 950 cm⁻¹', ticks: [1800, 1600, 1400, 1200, 1000].map(v => [v, String(v)]) },
};
const DYN_COLORS = ['data-a', 'data-b', 'data-c'];
const MAX_SPECIES = 5;

const sp = (key, label, color, band, drive, tau, extra = {}) => ({ key, label, color, band, drive, tau, invert: false, base: 0, ...extra });
const base = { unit: 'T', T: 1, axis: 'generic', noise: 0, cycles: 4, shape: 'square', k: 1, phi: 0, allPhi: false };

const CASES = [
  {
    id: 'instant', eq: ['square'], title: 'One Band, No Delay',
    s: { ...base, species: [sp('b', 'B', 'data-b', [30, 10, 1], 'stim', 0)] },
    text: `<p>The simplest response there is: one band that follows the stimulus at once. Phase-sensitive detection multiplies the averaged period by a sine of harmonic <i>k</i>, shifted by the phase angle <i>φ</i>, and integrates over one period [@handbook, Fig. 42.1, p. 969]. Anything constant over the period meets the sine with zero area and drops out, so the mean height of the band is gone and only its swing is left.</p>
      <p>An on/off square wave of height 1 is ½ plus odd sines, so at <i>k</i> = 1 the band comes out with amplitude 2/π ≈ 0.64, largest at <i>φ</i> = 0: no delay, <i>t</i><sub>con</sub> = 0. Try <i>k</i> = 3: amplitude 2/(3π) ≈ 0.21, still at <i>φ</i> = 0. Try <i>k</i> = 2: nothing, a square wave has no even harmonics [@handbook, Eq. 42.1, p. 970].</p>`,
  },
  {
    id: 'lag', eq: ['lag'], title: 'One Band, First-Order Delay',
    s: { ...base, species: [sp('b', 'B', 'data-b', [30, 10, 1], 'stim', 0.08)] },
    text: `<p>Now the band follows through one first-order step, d<i>y</i>/d<i>t</i> = (<i>u</i> − <i>y</i>)/<i>τ</i>. For a linear step like this the fundamental lags the stimulus by <i>δ</i> = arctan(<i>ωτ</i>) and shrinks by 1/√(1 + (<i>ωτ</i>)²), with <i>ω</i> = 2π/<i>T</i>. In the phase domain the maximum moves from 0 to <i>φ</i><sub>max</sub> = 360° − <i>δ</i>, and the time value reads that delay back as a time [@weyel, Eq. 2].</p>
      <p>Move <i>τ</i>. The time value is close to <i>τ</i> only while <i>ωτ</i> ≪ 1, and for one step it never passes <i>T</i>/4, however slow the species, while the amplitude keeps falling. So a period near 2π<i>τ</i> to 10<i>τ</i> suits the steps of interest. The table compares the simulated time value with the one-step formula.</p>`,
  },
  {
    id: 'static', title: 'Static Band and Noise',
    s: { ...base, noise: 48, species: [
      sp('a', 'A, static', 'data-a', [20, 10, 1], 'static', 0),
      sp('b', 'B', 'data-b', [38, 10, 0.08], 'stim', 0.05),
    ] },
    text: `<p>What a measured spectrum looks like: a large band A that does not follow the stimulus (support, spectators), a small band B that does, and noise. In the time domain A dominates and B hides in the noise.</p>
      <p>Folding <i>N</i> cycles into one period cuts the noise by about √<i>N</i>. PSD then removes A exactly, because a constant integrates to zero against a sine, and keeps only what oscillates at <i>kω</i> [@handbook, Fig. 42.1, p. 969]. That is the sensitivity gain of MES: a band too small to see in the raw spectra stands out after PSD [@urakawa2008]. Raise the noise, then the number of cycles.</p>`,
  },
  {
    id: 'synchronous', title: 'Two Bands, Synchronous',
    s: { ...base, allPhi: true, species: [
      sp('a', 'A', 'data-a', [20, 10, 1], 'stim', 0.04),
      sp('b', 'B', 'data-b', [38, 10, 0.4], 'stim', 0.04),
    ] },
    text: `<p>Two bands with the same kinetics. Every phase-resolved spectrum shows both with the same sign and the same ratio, and both curves in the phase domain cross zero and peak at the same angles [@handbook, Figs. 42.2 and 42.3, pp. 971–972].</p>
      <p>PSD cannot separate them: they are one species with two bands, or two species that happen to share their kinetics. Change one <i>τ</i> and the two maxima part.</p>`,
  },
  {
    id: 'retarded', title: 'Two Bands, A Retarded',
    s: { ...base, allPhi: true, species: [
      sp('a', 'A', 'data-a', [20, 10, 1], 'stim', 0.15),
      sp('b', 'B', 'data-b', [38, 10, 0.4], 'stim', 0.03),
    ] },
    text: `<p>A slow band A and a fast band B. Their phase-domain curves peak at different angles, so the phase-resolved spectra change shape with <i>φ</i>: at the angle where one band crosses zero, the spectrum contains only the other [@handbook, Figs. 42.2 and 42.3, pp. 971–972].</p>
      <p>The set of 18 spectra from 0 to 170° is drawn the way the handbook draws it. Sweep <i>φ</i> and watch A vanish while B is still there, and the other way round. B has the smaller time value: it responds first.</p>`,
  },
  {
    id: 'opposite', title: 'Two Bands, Opposite: A Turns into B',
    s: { ...base, allPhi: true, species: [
      sp('a', 'A', 'data-a', [20, 10, 1], 'stim', 0.04, { invert: true }),
      sp('b', 'B', 'data-b', [38, 10, 0.4], 'stim', 0.04),
    ] },
    text: `<p>When the stimulus switches on, A falls while B grows, and back in the second half: one species turning into the other and back [@handbook, Figs. 42.2 and 42.3, pp. 971–972]. Every phase-resolved spectrum shows the two bands as lobes of opposite sign, and their phase-domain curves are mirror images, 180° apart.</p>
      <p>A falling band therefore reads a time value later by <i>T</i>/2 at <i>k</i> = 1. Read the sign before reading the time.</p>`,
  },
  {
    id: 'harmonics', eq: ['square'], title: 'Square-Wave Harmonics',
    s: { ...base, k: 3, allPhi: true, species: [
      sp('a', 'A', 'data-a', [20, 10, 1], 'stim', 0.15),
      sp('b', 'B', 'data-b', [38, 10, 0.4], 'stim', 0.03),
    ] },
    text: `<p>A square wave is a sum of odd sines, (4/π) Σ sin[(2<i>n</i> − 1)<i>ωt</i>]/(2<i>n</i> − 1), so one square-wave experiment drives the sample at <i>ω</i>, 3<i>ω</i> and 5<i>ω</i> at once [@handbook, Eq. 42.1, p. 970]. Demodulating at <i>k</i> = 3 or 5 gives the response to a 3 or 5 times faster modulation, and the amplitude times <i>k</i> puts it on the scale of the fundamental. This holds exactly only while the response is linear [@handbook, p. 970].</p>
      <p>Compare <i>k</i> = 1 and 3: at the faster frequency the slow band A falls further behind and loses more amplitude. <i>k</i> = 2 shows nothing. Switch the stimulus to sine and only <i>k</i> = 1 is left; how the stimulation shape enters the analysis is worked out in [@urakawa2008].</p>`,
  },
  {
    id: 'sequence', title: 'A Sequence with a Spectator',
    s: { ...base, unit: 'min', T: 60, axis: 'ir', noise: 35, species: [
      sp('gas', 'gas in the cell', 'data-a', null, 'stim', 3.5),
      sp('fast', 'fast species', 'data-b', [1600, 70, 1.0], 'gas', 1.1),
      sp('slow', 'slow species', 'data-c', [1060, 60, 0.7], 'fast', 17.6, { base: 0.35 }),
      sp('spec', 'spectator', 'data-a', [1430, 90, 0.9], 'static', 0),
    ] },
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
const clone = o => JSON.parse(JSON.stringify(o));
/** state.s is the settings object; caseIdx says which snapshot it came from. */
const state = { caseIdx: 0, s: null, seed: 1 };

const tauFromSlider = (v, T) => (v <= 0 ? 0 : T * 0.003 * Math.pow(200, (v - 1) / 99));
const sliderFromTau = (tau, T) => (tau <= 0 ? 0 : Math.max(1, Math.min(100, Math.round(1 + 99 * Math.log(tau / T / 0.003) / Math.log(200)))));
const sigmaFromSlider = v => SIG_MAX * Math.pow(v / 100, 1.5);

const isStatic = sp => sp.drive === 'static';
const colorKey = sp => (!sp.band ? 'data-stimulus' : isStatic(sp) ? 'data-static' : sp.color);
const colorOf = sp => C[colorKey(sp)];

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
  const st = state.s, T = st.T, dt = T / M, ax = AXES[st.axis];
  const n = (WARM + st.cycles) * M;
  // the stimulus at the sample times (a jump that falls on a sample counts ½, as
  // the trapezoid rule wants) and the value it holds over each interval
  const stim = new Float64Array(n), held = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const j = i % M;
    if (st.shape === 'square') {
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
  for (const s of st.species) {
    conc[s.key] = isStatic(s) ? new Float64Array(n).fill(1)
      : firstOrder(conc[s.drive] ?? stim, s.tau, dt, s.drive === 'stim' || !conc[s.drive] ? held : null);
    if (!s.band) continue;
    const b0 = s.base ?? 0, c = conc[s.key], h = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const v = isStatic(s) ? 1 : (s.invert ? 1 - c[i] : c[i]);
      h[i] = s.band[2] * (b0 + (1 - b0) * v);
    }
    height[s.key] = h;
  }
  // spectra over time, folded over the kept cycles
  const xs = [];
  for (let x = ax.from; ax.step > 0 ? x <= ax.to + 1e-9 : x >= ax.to - 1e-9; x += ax.step) xs.push(x);
  const nx = xs.length;
  const banded = st.species.filter(s => s.band);
  const shapes = Object.fromEntries(banded.map(s => [s.key, xs.map(x => gauss(x, s.band[0], s.band[1]))]));
  const centre = Object.fromEntries(banded.map(s => [s.key, xs.reduce((b, x, i) => (Math.abs(x - s.band[0]) < Math.abs(xs[b] - s.band[0]) ? i : b), 0)]));
  const sigma = sigmaFromSlider(st.noise), g = rng(state.seed);
  const fold = Array.from({ length: M }, () => new Float64Array(nx));
  const raw = Object.fromEntries(banded.map(s => [s.key, new Float64Array(n)]));
  for (let i = 0; i < n; i++) {
    for (const s of banded) raw[s.key][i] = height[s.key][i] + sigma * g();
    if (i < WARM * M) continue;
    const row = fold[i % M];
    for (let x = 0; x < nx; x++) {
      let a = sigma * g();
      for (const s of banded) a += height[s.key][i] * shapes[s.key][x];
      row[x] += a / st.cycles;
    }
  }
  // PSD at harmonic k: in-phase and quadrature per spectral point
  const k = st.k, I = new Float64Array(nx), Q = new Float64Array(nx);
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
      for (let c0 = WARM; c0 < WARM + st.cycles; c0++) v += c[c0 * M + j] / st.cycles;
      const wt = 2 * Math.PI * k * j / M;
      i_ += 2 / M * v * Math.sin(wt); q_ += 2 / M * v * Math.cos(wt);
    }
    return phaseOf(i_, q_);
  };
  const rows = [{ key: 'stim', label: 'stimulus', ...psdTrace(stim), theory: 0 }];
  for (const s of st.species) {
    const r = s.band ? phaseOf(I[centre[s.key]], Q[centre[s.key]]) : psdTrace(conc[s.key]);
    rows.push({ key: s.key, label: s.label, color: colorOf(s), static: isStatic(s), sp: s, ...r, theory: theoryTcon(s, k) });
  }
  return { st, T, dt, n, stim, held, conc, raw, height, xs, fold, I, Q, centre, banded, rows, sigma, k };
}

/** One-step (or chain) first-order time value at harmonic k: phases of steps in series add. */
function theoryTcon(s0, k) {
  if (isStatic(s0)) return null;
  const st = state.s, T = st.T, w = 2 * Math.PI * k / T;
  let phase = 0, s = s0;
  while (s) {
    phase += Math.atan(w * s.tau);
    s = st.species.find(o => o.key === s.drive);
  }
  if (s0.invert) phase += Math.PI;
  const period = T / k;
  return ((phase / (2 * Math.PI)) * period) % period;
}

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
let S = null;

const fmtT = v => (state.s.unit === 'T' ? `${v.toFixed(3)} T` : `${v.toFixed(1)} min`);
const timeLabel = () => (state.s.unit === 'T' ? 'time / T' : 'time / min');
/**
 * Fixed y limits. They depend on the bands only (centre, width, height, the
 * part that stays), never on τ, noise, cycles, the harmonic or φ, so nothing
 * rescales while those change or while φ is swept. A trace that leaves them
 * (heavy noise) is clipped.
 *   hAll:  tallest band, static ones included (time, fold, spectra)
 *   hResp: tallest band that follows the stimulus (PSD can reach 2/π of it)
 */
function limits(st) {
  const banded = st.species.filter(s => s.band);
  const hAll = Math.max(1, ...banded.map(s => s.band[2]));
  const resp = banded.filter(s => !isStatic(s)).map(s => s.band[2] * (1 - (s.base ?? 0)));
  const hResp = Math.max(0.05 * hAll, ...resp);
  return {
    time: [-0.12 * hAll, 1.16 * hAll],
    spec: [-0.72 * hResp, 1.12 * hAll],
    phase: [-0.75 * hResp, 0.75 * hResp],
  };
}

function drawTime() {
  const { st, T, dt, n, held, raw, conc } = S;
  const shown = Math.min(n, (WARM + 3) * M), ts = Array.from({ length: shown }, (_, i) => i * dt);
  const yr = limits(st).time;
  const p = plot($('cTime'), {
    x: [0, shown * dt], y: yr, xlabel: timeLabel(), ylabel: 'band height / –',
    xticks: ticks(0, shown * dt, 5, v => String(+v.toFixed(2))), yticks: ticks(yr[0], yr[1], 4),
  });
  for (let c = 0; c < shown / M; c++) { p.shadeX(c * T, c * T + T / 2, C['shade-on']); p.shadeX(c * T + T / 2, (c + 1) * T, C['shade-off']); }
  p.vline(WARM * T, C['ink-500'], 1, [3, 3]);
  p.text('warm-up, not averaged', WARM * T * 0.5, yr[1] - (yr[1] - yr[0]) * 0.07);
  p.steps(ts, Array.from(held.subarray(0, shown)), C['data-stimulus']);
  for (const s of st.species.filter(s => !s.band)) p.line(ts, Array.from(conc[s.key].subarray(0, shown)), colorOf(s), CHART.lineThin, CHART.dash);
  for (const s of S.banded) p.line(ts, Array.from(raw[s.key].subarray(0, shown)), colorOf(s), CHART.lineThin);
  p.axes();
}

function foldedAt(key) {
  const ci = S.centre[key];
  return S.fold.map(r => r[ci]);
}

function drawFold() {
  const { st, T, dt, held, conc } = S;
  const tp = Array.from({ length: M }, (_, j) => j * dt);
  const yr = limits(st).time;
  const tk = st.unit === 'T' ? [[0, '0'], [0.25, 'T/4'], [0.5, 'T/2'], [0.75, '3T/4'], [1, 'T']] : ticks(0, T, 4);
  const p = plot($('cFold'), { x: [0, T], y: yr, xlabel: st.unit === 'T' ? 'time in the period / T' : 'time in the period / min', ylabel: 'band height / –', xticks: tk, yticks: ticks(yr[0], yr[1], 4) });
  p.shadeX(0, T / 2, C['shade-on']); p.shadeX(T / 2, T, C['shade-off']);
  p.steps(tp, Array.from(held.subarray(0, M)), C['data-stimulus']);
  for (const s of st.species.filter(s => !s.band)) {
    const c = conc[s.key], avg = tp.map((_, j) => { let v = 0; for (let q = WARM; q < WARM + st.cycles; q++) v += c[q * M + j]; return v / st.cycles; });
    p.line(tp, avg, colorOf(s), CHART.lineThin, CHART.dash);
  }
  for (const s of S.banded) p.line(tp, foldedAt(s.key), colorOf(s));
  p.axes();
  $('subFold').textContent = `${st.cycles} cycle${st.cycles > 1 ? 's' : ''} averaged after ${WARM} warm-up cycles: the noise drops by about √${st.cycles}.`;
}

const psdAt = (phi) => {
  const r = phi * Math.PI / 180;
  return Array.from(S.I, (v, x) => v * Math.cos(r) + S.Q[x] * Math.sin(r));
};

function drawSpec() {
  const { st, xs } = S, ax = AXES[st.axis];
  const cur = psdAt(st.phi);
  const set = st.allPhi ? Array.from({ length: 18 }, (_, i) => psdAt(i * 10)) : [];
  const avg = st.allPhi ? [] : Array.from({ length: 12 }, (_, i) => Array.from(S.fold[i * (M / 12)]));
  const yr = limits(st).spec;
  const p = plot($('cSpec'), { x: [ax.from, ax.to], y: yr, xlabel: ax.label, ylabel: 'absorbance / –', xticks: ax.ticks, yticks: ticks(yr[0], yr[1], 4) });
  p.hline(0);
  for (const s of avg) p.line(xs, s, C['data-faint'], CHART.lineFaint);
  for (const s of set) p.line(xs, s, C['data-faint'], CHART.lineFaint);
  p.line(xs, cur, C['data-highlight'], CHART.lineHighlight);
  for (const s of S.banded) p.text(s.label.split(',')[0], s.band[0], yr[1] - (yr[1] - yr[0]) * 0.07, colorOf(s));
  p.axes();
}

function drawPhase() {
  const ph = Array.from({ length: 73 }, (_, i) => i * 5);
  const rows = S.rows.filter(r => r.sp && r.sp.band);
  const yr = limits(S.st).phase, amp = yr[1];
  const p = plot($('cPhase'), {
    x: [0, 360], y: yr, xlabel: 'phase angle φ / °', ylabel: 'phase-resolved absorbance / –',
    xticks: [0, 90, 180, 270, 360].map(v => [v, String(v)]), yticks: ticks(yr[0], yr[1], 4),
  });
  p.hline(0);
  p.vline(S.st.phi, C['data-highlight'], 1.5, [4, 3]);
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
  const { k, rows, st } = S;
  const square = st.shape === 'square';
  const strong = Math.max(...rows.filter(r => r.key !== 'stim').map(r => r.amp), 1e-9);
  const head = `<tr><th>signal</th><th><i>τ</i></th><th><i>φ</i><sub>max</sub></th><th><i>t</i><sub>con</sub>, simulated</th><th><i>t</i><sub>con</sub>, first-order steps</th><th>|<i>A<sub>${k}</sub></i>|</th>${square && k > 1 ? `<th>${k} · |<i>A<sub>${k}</sub></i>|</th>` : ''}</tr>`;
  const body = rows.map(r => {
    const flat = r.static || r.amp < 0.01 * Math.max(strong, rows[0].amp);
    const tau = r.sp ? (isStatic(r.sp) ? '–' : fmtT(r.sp.tau)) : '–';
    return `<tr><td${r.color ? ` style="color:${r.color}"` : ''}>${r.label}</td><td>${tau}</td>
      <td>${flat ? '–' : r.phiMax.toFixed(0) + '°'}</td><td>${flat ? '–' : fmtT(r.tcon)}</td>
      <td>${r.theory == null || flat ? '–' : fmtT(r.theory)}</td><td>${r.amp.toFixed(3)}</td>
      ${square && k > 1 ? `<td>${(k * r.amp).toFixed(3)}</td>` : ''}</tr>`;
  }).join('');
  $('readout').innerHTML = head + body;
}

function draw() {
  if (!S) return;
  $('vPhi').textContent = `${state.s.phi}°`;
  drawTime(); drawFold(); drawSpec(); drawPhase(); drawTable();
}

/** Recompute and redraw after any setting changed. */
function update() { S = compute(); draw(); markChanged(); }

/* ---------------------------------------------------------------------------
   Case snapshot: changed or not. φ is the reading, not the experiment, so
   sweeping it does not count as a change.
   --------------------------------------------------------------------------- */
const snap = s => JSON.stringify({ ...s, phi: 0 });
function markChanged() {
  const changed = snap(state.s) !== snap(CASES[state.caseIdx].s);
  $('caseSelect').classList.toggle('changed', changed);
  $('resetCase').disabled = !changed;
}

/* ---------------------------------------------------------------------------
   Controls: measurement settings
   --------------------------------------------------------------------------- */
function setSeg(id, v) {
  $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
}

/** Write every measurement control from state.s. */
function syncControls() {
  const st = state.s;
  $('noise').value = st.noise; $('cycles').value = st.cycles; $('phi').value = st.phi; $('allPhi').checked = st.allPhi;
  $('vNoise').textContent = sigmaFromSlider(st.noise).toFixed(3);
  $('vCycles').textContent = st.cycles;
  setSeg('shape', st.shape); setSeg('harm', st.k); setSeg('unit', st.unit);
  $('period').value = st.T; $('period').disabled = st.unit === 'T';
  $('axis').value = st.axis;
}

/* ---------------------------------------------------------------------------
   Controls: the species editor. One row per species, in drive order: a
   species can only follow the stimulus or a species above it.
   --------------------------------------------------------------------------- */
const nextKey = () => { let i = 1; while (state.s.species.some(s => s.key === `s${i}`)) i++; return `s${i}`; };
const freeColor = (except = null) => DYN_COLORS.find(c => !state.s.species.some(s => s !== except && s.band && !isStatic(s) && s.color === c));
const num = (v, d = 3) => String(+(+v).toFixed(d));

function speciesRow(s, i) {
  const st = state.s, ax = AXES[st.axis], lo = Math.min(ax.from, ax.to), hi = Math.max(ax.from, ax.to);
  const earlier = st.species.slice(0, i).filter(o => !isStatic(o));
  const dynFull = !freeColor(s) && (isStatic(s) || !s.band);
  const opts = [['stim', 'the stimulus'], ...earlier.map(o => [o.key, o.label])]
    .map(([v, t]) => `<option value="${v}"${s.drive === v ? ' selected' : ''}>${t}</option>`).join('')
    + `<option value="static"${isStatic(s) ? ' selected' : ''}${!s.band ? ' disabled' : ''}>nothing (static)</option>`;
  const dis = (on) => (on ? ' disabled' : '');
  return `<div class="sp-row" data-i="${i}" style="--c:${colorOf(s)}">
    <label class="sp-name"><span class="sp-swatch${s.band ? '' : ' dashed'}"></span><input type="text" data-f="label" value="${s.label}" aria-label="name"></label>
    <label class="ctl"><span>follows</span><select data-f="drive"${dynFull && isStatic(s) ? ' title="three species already follow something"' : ''}>${opts}</select></label>
    <label class="ctl"><span><i>τ</i>: <b data-v="tau">${isStatic(s) ? '–' : fmtT(s.tau)}</b></span><input type="range" min="0" max="100" data-f="tau" value="${sliderFromTau(s.tau, st.T)}"${dis(isStatic(s))}></label>
    <label class="ctl check"><input type="checkbox" data-f="invert"${s.invert ? ' checked' : ''}${dis(isStatic(s))}><span>falls when on</span></label>
    <label class="ctl check"><input type="checkbox" data-f="hasBand"${s.band ? ' checked' : ''}${dis(isStatic(s) || (!s.band && !freeColor(s)))}><span>band</span></label>
    <label class="ctl num"><span>centre</span><input type="number" data-f="c" min="${lo}" max="${hi}" step="${Math.abs(ax.step)}" value="${s.band ? num(s.band[0], 1) : ''}"${dis(!s.band)}></label>
    <label class="ctl num"><span>width</span><input type="number" data-f="w" min="${Math.abs(ax.step)}" max="${(hi - lo) / 2}" step="${Math.abs(ax.step)}" value="${s.band ? num(s.band[1], 1) : ''}"${dis(!s.band)}></label>
    <label class="ctl num"><span>height</span><input type="number" data-f="h" min="0.01" max="2" step="0.01" value="${s.band ? num(s.band[2], 3) : ''}"${dis(!s.band)}></label>
    <label class="ctl num"><span>stays</span><input type="number" data-f="base" min="0" max="0.95" step="0.05" value="${num(s.base ?? 0, 2)}"${dis(!s.band || isStatic(s))}></label>
    <button type="button" class="btn sp-remove" data-f="remove" aria-label="Remove ${s.label}"${dis(st.species.length <= 1)}>×</button>
  </div>`;
}

function renderSpecies() {
  const st = state.s;
  $('species').innerHTML = st.species.map(speciesRow).join('');
  $('addSpecies').disabled = st.species.length >= MAX_SPECIES;
  legends();
}

/** Keep the drive chain valid after a species changed or went away. */
function repairDrives() {
  const st = state.s;
  st.species.forEach((s, i) => {
    if (s.drive === 'stim' || s.drive === 'static') return;
    const src = st.species.findIndex(o => o.key === s.drive);
    if (src < 0 || src >= i || isStatic(st.species[src])) s.drive = 'stim';
  });
}

$('species').addEventListener('input', e => {
  const t = e.target, f = t.dataset.f, row = t.closest('.sp-row');
  if (!f || !row) return;
  const st = state.s, s = st.species[+row.dataset.i];
  const v = parseFloat(t.value);
  if (f === 'label') { s.label = t.value; legends(); update(); return; }
  if (f === 'tau') { s.tau = tauFromSlider(+t.value, st.T); row.querySelector('b[data-v="tau"]').textContent = fmtT(s.tau); update(); return; }
  if (!Number.isFinite(v)) return;
  const ax = AXES[st.axis], lo = Math.min(ax.from, ax.to), hi = Math.max(ax.from, ax.to);
  if (f === 'c') s.band[0] = Math.min(hi, Math.max(lo, v));
  else if (f === 'w') s.band[1] = Math.max(Math.abs(ax.step), v);
  else if (f === 'h') s.band[2] = Math.max(0.01, Math.min(2, v));
  else if (f === 'base') s.base = Math.max(0, Math.min(0.95, v));
  else return;
  update();
});

$('species').addEventListener('change', e => {
  const t = e.target, f = t.dataset.f, row = t.closest('.sp-row');
  if (!f || !row) return;
  const st = state.s, s = st.species[+row.dataset.i];
  if (f === 'drive') {
    const wasStatic = isStatic(s);
    s.drive = t.value;
    if (wasStatic && !isStatic(s)) {
      const c = freeColor(s);
      if (!c) { s.drive = 'static'; t.value = 'static'; return; } // three species already follow something
      s.color = c;
    }
    if (isStatic(s)) s.invert = false;
    repairDrives();
  } else if (f === 'invert') s.invert = t.checked;
  else if (f === 'hasBand') {
    const ax = AXES[st.axis];
    s.band = t.checked ? [(ax.from + ax.to) / 2, Math.abs(ax.to - ax.from) / 6, 0.5] : null;
    if (s.band && !isStatic(s)) s.color = freeColor(s) ?? s.color;
  } else return;
  renderSpecies();
  update();
});

$('species').addEventListener('click', e => {
  const b = e.target.closest('[data-f="remove"]');
  if (!b) return;
  state.s.species.splice(+b.closest('.sp-row').dataset.i, 1);
  repairDrives();
  renderSpecies();
  update();
});

$('addSpecies').addEventListener('click', () => {
  const st = state.s, ax = AXES[st.axis], key = nextKey(), c = freeColor();
  const letter = String.fromCharCode(65 + st.species.length);
  st.species.push(sp(key, letter, c ?? 'data-a', [ax.from + (ax.to - ax.from) * 0.7, Math.abs(ax.to - ax.from) / 6, 0.5], c ? 'stim' : 'static', c ? 0.05 * st.T : 0));
  renderSpecies();
  update();
});

/* ---------------------------------------------------------------------------
   Case texts, legends, case switching
   --------------------------------------------------------------------------- */
function caseTexts() {
  const cs = CASES[state.caseIdx];
  $('caseText').innerHTML = `<h2>${cs.title}</h2>${cs.text}`;
  $('equations').innerHTML = `<h2>Equations</h2>${EQ.psd}${EQ.tcon}${(cs.eq ?? []).map(k => EQ[k]).join('')}`;
  subTexts();
}

function subTexts() {
  $('subSpec').innerHTML = state.s.allPhi
    ? `<i>A<sub>k</sub></i>(<i>φ</i>) for <i>φ</i> = 0, 10, …, 170° (grey) and at the chosen <i>φ</i> (green) [@handbook, Fig. 42.2, pp. 971–972].`
    : `Grey: the averaged spectra through one period. Green: <i>A<sub>k</sub></i>(<i>φ</i>) at the chosen <i>φ</i> [@handbook, Fig. 42.1, p. 969].`;
  $('subPhase').innerHTML = `<i>A<sub>k</sub></i>(<i>φ</i>) at each band maximum. The dot is <i>φ</i><sub>max</sub>, read as <i>t</i><sub>con</sub> in the table [@weyel, Eq. 2].`;
  renderCitations([$('subSpec'), $('subPhase'), $('caseText'), $('equations')], $('refs'), SOURCES);
}

function legends() {
  const st = state.s;
  const items = [['stimulus', C['data-stimulus'], true],
    ...st.species.filter(s => !s.band).map(s => [s.label, colorOf(s), true]),
    ...st.species.filter(s => s.band).map(s => [s.label, colorOf(s)])];
  legend($('legTime'), items);
  legend($('legFold'), items);
  legend($('legPhase'), st.species.filter(s => s.band).map(s => [s.label, colorOf(s)]));
}

function selectCase(idx, push = true) {
  state.caseIdx = idx;
  const cs = CASES[idx];
  state.s = clone(cs.s);
  $('caseBtn').innerHTML = `<span class="n">${idx + 1}</span>${cs.title}<span class="changed-mark">changed</span><span class="caret" aria-hidden="true">▾</span>`;
  document.querySelectorAll('#caseMenu li').forEach((li, i) => li.setAttribute('aria-selected', String(i === idx)));
  syncControls(); renderSpecies(); caseTexts();
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
$('resetCase').addEventListener('click', () => selectCase(state.caseIdx, false));
$('copySettings').addEventListener('click', async () => {
  const text = JSON.stringify({ ...state.s, phi: state.s.phi }, null, 2);
  const btn = $('copySettings'), was = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = 'copied'; }
  catch { console.log(text); btn.textContent = 'in the console'; }
  setTimeout(() => { btn.textContent = was; }, 1500);
});

/* measurement controls */
$('noise').addEventListener('input', e => { state.s.noise = +e.target.value; $('vNoise').textContent = sigmaFromSlider(state.s.noise).toFixed(3); update(); });
$('cycles').addEventListener('input', e => { state.s.cycles = +e.target.value; $('vCycles').textContent = state.s.cycles; update(); });
$('phi').addEventListener('input', e => { state.s.phi = +e.target.value; draw(); });
$('allPhi').addEventListener('change', e => { state.s.allPhi = e.target.checked; caseTexts(); update(); });
$('shape').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.s.shape = b.dataset.v; setSeg('shape', state.s.shape); update(); });
$('harm').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.s.k = +b.dataset.v; setSeg('harm', state.s.k); update(); });
$('reseed').addEventListener('click', () => { state.seed += 1; update(); });

/** Time unit: τ keeps its ratio to T, so the response does not change, only the numbers on the axis. */
$('unit').addEventListener('click', e => {
  const b = e.target.closest('button');
  const st = state.s;
  if (!b || b.dataset.v === st.unit) return;
  const T = b.dataset.v === 'T' ? 1 : 60;
  for (const s of st.species) s.tau *= T / st.T;
  st.unit = b.dataset.v; st.T = T;
  syncControls(); renderSpecies(); update();
});
$('period').addEventListener('change', e => {
  const st = state.s, v = parseFloat(e.target.value);
  if (!(v > 0) || st.unit === 'T') { e.target.value = st.T; return; }
  st.T = Math.min(600, Math.max(1, v));
  e.target.value = st.T;
  renderSpecies(); update();
});
/** Spectral axis: bands keep their place relative to the axis. */
$('axis').addEventListener('change', e => {
  const st = state.s, from = AXES[st.axis], to = AXES[e.target.value];
  const map = x => to.from + (x - from.from) / (from.to - from.from) * (to.to - to.from);
  const scale = Math.abs((to.to - to.from) / (from.to - from.from));
  for (const s of st.species) if (s.band) s.band = [Math.round(map(s.band[0]) / Math.abs(to.step)) * Math.abs(to.step), s.band[1] * scale, s.band[2]];
  st.axis = e.target.value;
  renderSpecies(); update();
});

let playing = false, raf = 0;
$('play').addEventListener('click', () => {
  playing = !playing;
  $('play').textContent = playing ? '❚❚ pause' : '▶ sweep φ';
  let last = 0;
  const stepFn = ts => {
    if (!playing) return;
    if (ts - last > 60) { last = ts; state.s.phi = (state.s.phi + 5) % 360; $('phi').value = state.s.phi; draw(); }
    raf = requestAnimationFrame(stepFn);
  };
  if (playing) raf = requestAnimationFrame(stepFn); else cancelAnimationFrame(raf);
});
window.addEventListener('shell:resize', draw);

$('axis').innerHTML = Object.entries(AXES).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join('');
const wanted = new URLSearchParams(location.search).get('case');
const start = Math.max(0, CASES.findIndex(c => c.id === wanted));
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => selectCase(start, false));

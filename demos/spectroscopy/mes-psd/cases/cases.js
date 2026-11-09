/**
 * MES-PSD cases: one engine, every setting on a control and always on
 * screen. A case is a stored set of values for those settings: picking it
 * changes the values, it never adds or removes a control. See the comment
 * block in index.html for the model and the sources.
 */
import { initShell } from '../../../../assets/shell.js';
import { C, CHART, typeFont } from '../../../../assets/tokens.js';
import { plot, ticks, richText } from '../../../../assets/plot.js';
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
   Settings. Everything the engine reads is one object:

   { unit, T, axis, noise, cycles, shape, k, phi, allPhi, species: [5 slots] }

     unit     'T' (time in periods, T = 1) or 'min' (T in minutes)
     axis     'generic' (spectral position 0 to 60) or 'ir' (wavenumber)
     noise    slider value 0 to 100
     duty     on fraction of the period, for the on/off stimulus (½ by default)
     kUpTo    figure 3 shows every harmonic up to k, not k alone
     allPhi   figure 3 phase-resolved: the spectra at φ = 0, 10, …, 170°
     absSpec  with allPhi, also the amplitude spectrum |A_k| = √(I² + Q²)
     species  always five slots, s1 to s5, in drive order. Each one:
       on     whether it is in the sample; a slot that is off keeps its values
       key, label, color ('data-a' | 'data-b' | 'data-c'; static and bandless
              species draw in their own colour whatever is stored here)
       band   [centre, fwhm, height] or null (a signal without a band, e.g.
              the gas in the cell)
       drive  'stim', 'static' or the key of an earlier slot; an earlier slot
              that is off or static counts as the stimulus
       tau    time constant, in the unit of the settings
       tauOff time constant while the species falls, or null for the same
              as tau; a different one makes the step non-linear
       invert antiphase: falls while the stimulus is on
       base   part of the band that never leaves, 0 to 0.95

   A case is { id, title, eq, text, s }: a title, a text for the tooltip and
   the values. Slots a case does not use are switched off at their defaults.
   --------------------------------------------------------------------------- */
const AXES = {
  generic: { from: 0, to: 60, step: 0.5, label: 'spectral position / –', name: 'generic, 0 to 60', ticks: [0, 10, 20, 30, 40, 50, 60].map(v => [v, String(v)]) },
  ir: { from: 1800, to: 950, step: -5, label: 'wavenumber / cm⁻¹', name: 'IR, 1800 to 950 cm⁻¹', ticks: [1800, 1600, 1400, 1200, 1000].map(v => [v, String(v)]) },
};
const DYN_COLORS = ['data-a', 'data-b', 'data-c', 'data-d', 'data-e'];
const SLOTS = 5;          // always there; the reader can add more below them
const MAX_SPECIES = 8;

const sp = (label, color, band, drive, tau, extra = {}) => ({ label, color, band, drive, tau, tauOff: null, invert: false, base: 0, ...extra });
/** The slots in the generic axis, as a case that does not use them leaves them. */
const DEFAULT_SLOTS = [
  sp('A', 'data-a', [20, 10, 1], 'stim', 0.04),
  sp('B', 'data-b', [38, 10, 0.4], 'stim', 0.04),
  sp('C', 'data-c', [50, 8, 0.3], 's2', 0.1),
  sp('D, static', 'data-a', [10, 6, 0.5], 'static', 0),
  sp('E, static', 'data-a', [56, 5, 0.3], 'static', 0),
];
const mapAxis = (band, from, to) => {
  if (!band) return band;
  const a = AXES[from], b = AXES[to];
  const c = b.from + (band[0] - a.from) / (a.to - a.from) * (b.to - b.from);
  return [Math.round(c / Math.abs(b.step)) * Math.abs(b.step), band[1] * Math.abs((b.to - b.from) / (a.to - a.from)), band[2]];
};
/** Five slots: the case's species first, switched on; the rest off at their defaults. */
function slots(list, axis) {
  return Array.from({ length: SLOTS }, (_, i) => {
    const key = `s${i + 1}`;
    if (list[i]) return { key, on: true, ...list[i] };
    const d = DEFAULT_SLOTS[i];
    return { key, on: false, ...d, band: axis === 'generic' ? d.band : mapAxis(d.band, 'generic', axis) };
  });
}
const base = { unit: 'T', T: 1, axis: 'generic', noise: 0, cycles: 4, shape: 'square', duty: 0.5, k: 1, kUpTo: false, phi: 0, allPhi: false, absSpec: false };
const settings = (extra, list) => ({ ...base, ...extra, species: slots(list, extra.axis ?? 'generic') });

const CASES = [
  {
    id: 'instant', title: 'One Band, No Delay',
    s: settings({}, [sp('A', 'data-a', [30, 10, 1], 'stim', 0)]),
    text: `<p>The simplest response there is: one band that follows the stimulus at once. Phase-sensitive detection multiplies the averaged period by a sine of harmonic <i>k</i>, shifted by the phase angle <i>φ</i>, and integrates over one period [@handbook, Fig. 42.1, p. 969]. Anything constant over the period meets the sine with zero area and drops out, so the mean height of the band is gone and only its swing is left.</p>
      <p>An on/off square wave of height 1 is ½ plus odd sines, so at <i>k</i> = 1 the band comes out with amplitude 2/π ≈ 0.64, largest at <i>φ</i> = 0: no delay, <i>t</i><sub>con</sub> = 0. Try <i>k</i> = 3: amplitude 2/(3π) ≈ 0.21, still at <i>φ</i> = 0. Try <i>k</i> = 2: nothing, a square wave has no even harmonics [@handbook, Eq. 42.1, p. 970].</p>`,
  },
  {
    id: 'lag', title: 'One Band, First-Order Delay',
    s: settings({}, [sp('A', 'data-a', [30, 10, 1], 'stim', 0.08)]),
    text: `<p>Now the band follows through one first-order step, d<i>y</i>/d<i>t</i> = (<i>u</i> − <i>y</i>)/<i>τ</i>. For a linear step like this the fundamental lags the stimulus by <i>δ</i> = arctan(<i>ωτ</i>) and shrinks by 1/√(1 + (<i>ωτ</i>)²), with <i>ω</i> = 2π/<i>T</i>. In the phase domain the maximum moves from 0 to <i>φ</i><sub>max</sub> = 360° − <i>δ</i>, and the time value reads that delay back as a time [@weyel, Eq. 2].</p>
      <p>Move <i>τ</i>. The time value is close to <i>τ</i> only while <i>ωτ</i> ≪ 1, and for one step it never passes <i>T</i>/4, however slow the species, while the amplitude keeps falling. So a period near 2π<i>τ</i> to 10<i>τ</i> suits the steps of interest.</p>`,
  },
  {
    id: 'static', title: 'Static Band and Noise',
    s: settings({ noise: 48 }, [
      sp('A, static', 'data-a', [20, 10, 1], 'static', 0),
      sp('B', 'data-b', [38, 10, 0.08], 'stim', 0.05),
    ]),
    text: `<p>What a measured spectrum looks like: a large band A that does not follow the stimulus (support, spectators), a small band B that does, and noise. In the time domain A dominates and B hides in the noise.</p>
      <p>Folding <i>N</i> cycles into one period cuts the noise by about √<i>N</i>. PSD then removes A exactly, because a constant integrates to zero against a sine, and keeps only what oscillates at <i>kω</i> [@handbook, Fig. 42.1, p. 969]. That is the sensitivity gain of MES: a band too small to see in the raw spectra stands out after PSD [@urakawa2008]. Raise the noise, then the number of cycles.</p>`,
  },
  {
    id: 'synchronous', title: 'Two Bands, Same Kinetics',
    s: settings({ allPhi: true }, [
      sp('A', 'data-a', [20, 10, 1], 'stim', 0.04),
      sp('B', 'data-b', [38, 10, 0.4], 'stim', 0.04),
    ]),
    text: `<p>Two bands with the same kinetics. Every phase-resolved spectrum shows both with the same sign and the same ratio, and both curves in the phase domain cross zero and peak at the same angles [@handbook, Figs. 42.2 and 42.3, pp. 971–972].</p>
      <p>PSD cannot separate them: they are one species with two bands, or two species that happen to share their kinetics. Change one <i>τ</i> and the two maxima part.</p>`,
  },
  {
    id: 'retarded', title: 'Two Bands, A Retarded',
    s: settings({ allPhi: true }, [
      sp('A', 'data-a', [20, 10, 1], 'stim', 0.15),
      sp('B', 'data-b', [38, 10, 0.4], 'stim', 0.03),
    ]),
    text: `<p>A slow band A and a fast band B. Their phase-domain curves peak at different angles, so the phase-resolved spectra change shape with <i>φ</i>: at the angle where one band crosses zero, the spectrum contains only the other [@handbook, Figs. 42.2 and 42.3, pp. 971–972].</p>
      <p>Hover the rings in the phase domain: at one A is gone and B is still there, at the other the reverse. B has the smaller time value: it responds first.</p>`,
  },
  {
    id: 'opposite', title: 'Two Bands in Antiphase: A Turns into B',
    s: settings({ allPhi: true }, [
      sp('A', 'data-a', [20, 10, 1], 'stim', 0.04, { invert: true }),
      sp('B', 'data-b', [38, 10, 0.4], 'stim', 0.04),
    ]),
    text: `<p>When the stimulus switches on, A falls while B grows, and back in the second half: one species turning into the other and back [@handbook, Figs. 42.2 and 42.3, pp. 971–972]. Every phase-resolved spectrum shows the two bands as lobes of opposite sign, and their phase-domain curves are mirror images, 180° apart.</p>
      <p>A band in antiphase therefore reads a time value later by <i>T</i>/2 at <i>k</i> = 1. Read the sign before reading the time.</p>`,
  },
  {
    id: 'harmonics', eq: ['square'], title: 'Square-Wave Harmonics',
    s: settings({ k: 3, allPhi: true }, [
      sp('A', 'data-a', [20, 10, 1], 'stim', 0.15),
      sp('B', 'data-b', [38, 10, 0.4], 'stim', 0.03),
    ]),
    text: `<p>A square wave is a sum of odd sines, (4/π) Σ sin[(2<i>n</i> − 1)<i>ωt</i>]/(2<i>n</i> − 1), so one square-wave experiment drives the sample at <i>ω</i>, 3<i>ω</i> and 5<i>ω</i> at once [@handbook, Eq. 42.1, p. 970]. Demodulating at <i>k</i> = 3 or 5 gives the response to a 3 or 5 times faster modulation, and the amplitude times <i>k</i> puts it on the scale of the fundamental. This holds exactly only while the response is linear [@handbook, p. 970].</p>
      <p>Compare <i>k</i> = 1 and 3: at the faster frequency the slow band A falls further behind and loses more amplitude. <i>k</i> = 2 shows nothing. Switch the stimulus to sine and only <i>k</i> = 1 is left [@urakawa2008].</p>`,
  },
  {
    id: 'even', title: 'Even Harmonics: Fast Up, Slow Down',
    s: settings({ k: 2 }, [sp('A', 'data-a', [30, 10, 1], 'stim', 0.02, { tauOff: 0.2 })]),
    text: `<p>A linear response to an on/off wave of half-period on time has no even harmonics: what builds up in the on half decays the same way in the off half, so the response repeats with the opposite sign every <i>T</i>/2 [@handbook, Eq. 42.1, p. 970]. Here A rises fast while the stimulus is on and falls slowly when it is off, as for fast adsorption and slow desorption. Rise and fall differ, the response is no longer linear in the stimulus, and <i>k</i> = 2 shows a band.</p>
      <p>Set the falling <i>τ</i> back to the rising one and the band at <i>k</i> = 2 goes. A stimulus that is on for less or more than half the period gives even harmonics even with a linear response: try the on fraction.</p>`,
  },
  {
    id: 'sequence', title: 'A Sequence with a Spectator',
    s: settings({ unit: 'min', T: 60, axis: 'ir', noise: 35 }, [
      sp('A, gas in the cell', 'data-a', null, 'stim', 3.5),
      sp('B, fast species', 'data-b', [1600, 70, 1.0], 's1', 1.1),
      sp('C, slow species', 'data-c', [1060, 60, 0.7], 's2', 17.6, { base: 0.35 }),
      sp('D, spectator', 'data-a', [1430, 90, 0.9], 'static', 0),
    ]),
    text: `<p>A catalyst bed switched between CO₂ + H₂ and H₂ every 30 min (<i>T</i> = 60 min). The gas in the cell (A) follows the valve with its own lag, a fast surface species (B) follows the gas, a slow one (C) is fed by the fast one and keeps a part that never leaves, and a spectator (D) sits there. The band positions and every number are illustrative.</p>
      <p>Delays in series add, so the slow species can come out later than <i>T</i>/4 although no single step can. The spectator is the largest band in the spectrum and vanishes after PSD. Time values read as an order: an intermediate responds after the reactant and before the product, and a signal later than the product is suspect [@weyel].</p>`,
  },
];

/** The text under the plots: the same for every case; a case's own text is its tooltip. */
const GENERAL = `<h2>What This Page Shows</h2>
  <p>A modulation excitation experiment in four steps, from left to right and top to bottom: the spectra over time while a stimulus is switched on and off, the cycles folded into one averaged period, the spectra after phase-sensitive detection, and the phase domain, where each band becomes one cosine in <i>φ</i> [@handbook, Fig. 42.1, p. 969]. The values on the right read the phase domain back as the lag <i>δ</i> and the time value <i>t</i><sub>con</sub> [@weyel, Eq. 2], and compare them with the first-order formula.</p>
  <p>Every setting is on the left and stays there. A case only sets their values, from one band without delay to a sequence of species with a spectator; hover a case for what it shows. Each species slot is on or off, follows the stimulus or an earlier species through one first-order step, set by its time constant <i>τ</i> or by the lag <i>δ</i> = arctan(<i>ωτ</i>) that step gives at the fundamental, in phase (rises while the stimulus is on) or in antiphase (falls). Every value can be typed; ↺ puts the case's value back, a double-click on a slider the default. Both side panels collapse: the left one to a rail of quick switches.</p>
  <h2>Using the Phase Domain</h2>
  <p>Each dot marks <i>φ</i><sub>max</sub> of a band, labelled with its lag <i>δ</i> = 360° − <i>φ</i><sub>max</sub>. Each ring marks a <i>φ</i> where that band is gone, 90° from its maximum. Hover a dot or a ring and panel 3 shows the phase-resolved spectrum there, with a note on what each band does at that angle; click to keep it. Grab the dashed green ruler by its triangle or line to set <i>φ</i> by hand.</p>`;
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
const M = 360;     // samples per period
const WARM = 2;    // cycles discarded before averaging
const SIG_MAX = 0.06;

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
/** state.s is the settings object; caseIdx says which case it came from; preview is a hovered φ. */
const state = { caseIdx: 0, s: null, seed: 1, speed: 80, preview: null };

const tauFromSlider = (v, T) => (v <= 0 ? 0 : T * 0.003 * Math.pow(200, (v - 1) / 99));
const sliderFromTau = (tau, T) => (tau <= 0 ? 0 : Math.max(1, Math.min(100, Math.round(1 + 99 * Math.log(tau / T / 0.003) / Math.log(200)))));
const sigmaFromSlider = v => SIG_MAX * Math.pow(v / 100, 1.5);

const isStatic = s => s.drive === 'static';
const isDyn = s => s.on && s.band && !isStatic(s);
const colorKey = s => (!s.band ? 'data-stimulus' : isStatic(s) ? 'data-static' : s.color);
const colorOf = s => C[colorKey(s)];
const live = () => state.s.species.filter(s => s.on);
/** The slot a species follows: an earlier slot that is on and not static, else the stimulus. */
function driverOf(s) {
  if (s.drive === 'stim' || isStatic(s)) return null;
  const sl = state.s.species, i = sl.indexOf(s), j = sl.findIndex(o => o.key === s.drive);
  return j >= 0 && j < i && sl[j].on && !isStatic(sl[j]) ? sl[j] : null;
}

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
function firstOrder(points, tau, dt, held = null, tauOff = null) {
  const off = tauOff ?? tau;
  if (!(tau > 0) && !(off > 0)) return Float64Array.from(points);
  // rising toward the input with tau, falling with tauOff: one step, two rates
  const eOn = tau > 0 ? Math.exp(-dt / tau) : 0, eOff = off > 0 ? Math.exp(-dt / off) : 0;
  const y = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    const h = held ? held[i - 1] : 0.5 * (points[i - 1] + points[i]);
    y[i] = h + (y[i - 1] - h) * (h >= y[i - 1] ? eOn : eOff);
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
      const nOn = Math.round(st.duty * M);
      stim[i] = j === 0 || j === nOn ? (i === 0 ? 0 : 0.5) : (j < nOn ? 1 : 0);
      held[i] = j < nOn ? 1 : 0;
    } else {
      stim[i] = 0.5 + 0.5 * Math.sin(2 * Math.PI * j / M);
      held[i] = 0.5 + 0.5 * Math.sin(2 * Math.PI * (j + 0.5) / M);
    }
  }
  // concentrations, then band heights
  const conc = { stim }, height = {}, on = live();
  for (const s of on) {
    const d = driverOf(s);
    conc[s.key] = isStatic(s) ? new Float64Array(n).fill(1) : firstOrder(d ? conc[d.key] : stim, s.tau, dt, d ? null : held, s.tauOff);
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
  const banded = on.filter(s => s.band);
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
  // PSD per spectral point: in-phase and quadrature parts, at k and, for
  // figure 3 in "k ≤" mode, at every harmonic below it
  const k = st.k;
  const demod = h => {
    const I_ = new Float64Array(nx), Q_ = new Float64Array(nx);
    for (let j = 0; j < M; j++) {
      const wt = 2 * Math.PI * h * j / M, sn = Math.sin(wt), cs_ = Math.cos(wt);
      for (let x = 0; x < nx; x++) { I_[x] += 2 / M * fold[j][x] * sn; Q_[x] += 2 / M * fold[j][x] * cs_; }
    }
    return { I: I_, Q: Q_ };
  };
  const harm = {};
  for (const h of st.kUpTo ? Array.from({ length: k }, (_, i) => i + 1) : [k]) harm[h] = demod(h);
  const { I, Q } = harm[k];
  const phaseOf = (i, q) => {
    const amp = Math.hypot(i, q);
    // round to 1e-6° first, so a maximum a hair past 0° does not read as a lag of a whole period
    const phiMax = (Math.round(((Math.atan2(q, i) * 180 / Math.PI) + 360) * 1e6) / 1e6) % 360;
    const delta = (360 - phiMax) % 360;
    return { I: i, Q: q, amp, phiMax, delta, tcon: delta / 360 * T / k };
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
  const sl = stimLag(k);
  const rows = [{ key: 'stim', label: 'stimulus', color: C['data-stimulus'], ...psdTrace(stim), theory: sl == null ? null : sl / (2 * Math.PI) * T / k }];
  for (const s of on) {
    const r = s.band ? phaseOf(I[centre[s.key]], Q[centre[s.key]]) : psdTrace(conc[s.key]);
    rows.push({ key: s.key, label: s.label, color: colorOf(s), static: isStatic(s), sp: s, ...r, theory: theoryTcon(s, k) });
  }
  return { st, T, dt, n, stim, held, conc, raw, height, xs, fold, I, Q, harm, centre, banded, rows, sigma, k };
}

/** One-step (or chain) first-order time value at harmonic k: phases of steps in series add. */
/**
 * The stimulus' own lag at harmonic k, in rad. An on/off wave on for a
 * fraction d of the period has its k-th harmonic at φ = 90° − 180°·frac(kd),
 * so it lags by 180°·frac(kd) − 90°; null where that harmonic is absent.
 * Zero for d = ½ at every odd k, and for the sine.
 */
function stimLag(k) {
  const st = state.s;
  if (st.shape !== 'square') return k === 1 ? 0 : null;
  const f = (k * st.duty) % 1;
  if (f < 1e-9 || f > 1 - 1e-9) return null;
  const lag = (180 * f - 90) * Math.PI / 180;
  return ((lag % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * First-order time value at harmonic k: the stimulus' own lag plus the lags of
 * the steps in series. Only for linear steps: a step that falls with its own
 * τ has no single lag, and the formula gives none.
 */
function theoryTcon(s0, k) {
  if (isStatic(s0)) return null;
  const T = state.s.T, w = 2 * Math.PI * k / T, sl = stimLag(k);
  if (sl == null) return null;
  let phase = sl, s = s0;
  while (s) {
    if (s.tauOff != null && s.tauOff !== s.tau) return null;
    phase += Math.atan(w * s.tau); s = driverOf(s);
  }
  if (s0.invert) phase += Math.PI;
  const period = T / k;
  return (((phase / (2 * Math.PI)) * period) % period + period) % period;
}

/* ---------------------------------------------------------------------------
   Drawing
   --------------------------------------------------------------------------- */
let S = null;

/** End of the stimulus-on part of the period: the on fraction for on/off, half for the sine. */
const onTime = () => (state.s.shape === 'square' ? state.s.duty : 0.5) * state.s.T;
const fmtT = v => (state.s.unit === 'T' ? `${v.toFixed(3)} T` : `${v.toFixed(1)} min`);
const timeLabel = () => (state.s.unit === 'T' ? 'time / *T*' : 'time / min');
/**
 * Fixed y limits. They depend on the bands (centre, width, height, the part
 * that stays), and the PSD axes on the harmonic, never on τ, noise, cycles or
 * φ, so nothing rescales while those change or while φ is swept. A trace
 * that leaves them (heavy noise) is clipped.
 *   hAll:  tallest band, static ones included (time, fold, spectra)
 *   hResp: tallest band that follows the stimulus (PSD can reach 2/π of it)
 */
function limits() {
  const st = state.s, banded = live().filter(s => s.band);
  const hAll = Math.max(1, ...banded.map(s => s.band[2]));
  const resp = banded.filter(s => !isStatic(s)).map(s => s.band[2] * (1 - (s.base ?? 0)));
  const hResp = Math.max(0.05 * hAll, ...resp);
  // harmonic k of an on/off wave carries 1/k of the fundamental's swing, so the
  // PSD axes follow k (a sine has no harmonics above 1: its axes stay at k = 1)
  const psd = 0.75 * hResp / (st.shape === 'square' && !st.kUpTo ? st.k : 1);
  return {
    time: [-0.12 * hAll, 1.16 * hAll],
    spec: st.allPhi ? [-psd, psd] : [-psd, 1.12 * hAll],
    phase: [-0.75 * hResp / (st.shape === 'square' ? st.k : 1), 0.75 * hResp / (st.shape === 'square' ? st.k : 1)],
  };
}

/**
 * Time domain in quasi-steady state: the engine runs WARM cycles first so the
 * response no longer depends on where it started, and only the cycles after
 * them are shown (and folded); time counts from the first of those.
 */
function drawTime() {
  const { st, T, dt, held, raw, conc } = S;
  const cyc = Math.min(st.cycles, 3), a = WARM * M, b = a + cyc * M;
  const ts = Array.from({ length: b - a }, (_, i) => i * dt);
  const cut = arr => Array.from(arr.subarray(a, b));
  const yr = limits().time;
  const p = plot($('cTime'), { scale: SC(),
    x: [0, cyc * T], y: yr, xlabel: timeLabel(), ylabel: 'signal / –',
    xticks: ticks(0, cyc * T, 5, v => String(+v.toFixed(2))), yticks: ticks(yr[0], yr[1], 4),
  });
  const tOn = onTime();
  for (let c = 0; c < cyc; c++) { p.shadeX(c * T, c * T + tOn, C['shade-on']); p.shadeX(c * T + tOn, (c + 1) * T, C['shade-off']); }
  p.steps(ts, cut(held), C['data-stimulus']);
  for (const s of live().filter(s => !s.band)) p.line(ts, cut(conc[s.key]), colorOf(s), CHART.lineThin, CHART.dash);
  for (const s of S.banded) p.line(ts, cut(raw[s.key]), colorOf(s), CHART.lineThin);
  p.axes();
}

function drawFold() {
  const { st, T, dt, held, conc } = S;
  const tp = Array.from({ length: M }, (_, j) => j * dt);
  const yr = limits().time;
  const tk = st.unit === 'T' ? [[0, '0'], [0.25, 'T/4'], [0.5, 'T/2'], [0.75, '3T/4'], [1, 'T']] : ticks(0, T, 4);
  const p = plot($('cFold'), { scale: SC(), x: [0, T], y: yr, xlabel: st.unit === 'T' ? 'time in the period / *T*' : 'time in the period / min', ylabel: 'signal / –', xticks: tk, yticks: ticks(yr[0], yr[1], 4) });
  p.shadeX(0, onTime(), C['shade-on']); p.shadeX(onTime(), T, C['shade-off']);
  p.steps(tp, Array.from(held.subarray(0, M)), C['data-stimulus']);
  for (const s of live().filter(s => !s.band)) {
    const c = conc[s.key], avg = tp.map((_, j) => { let v = 0; for (let q = WARM; q < WARM + st.cycles; q++) v += c[q * M + j]; return v / st.cycles; });
    p.line(tp, avg, colorOf(s), CHART.lineThin, CHART.dash);
  }
  for (const s of S.banded) { const ci = S.centre[s.key]; p.line(tp, S.fold.map(r => r[ci]), colorOf(s)); }
  p.axes();
  // the chosen φ in the time domain: the delay it reads, t = (360° − φ)/360° · T/k.
  // The reference repeats every T/k, so later copies of that delay exist; only
  // the first, the time value itself, is drawn
  const mark = (phi, w, dash) => p.vline(((360 - phi) % 360) / 360 * T / st.k, C['data-highlight'], w, dash);
  if (state.preview) mark(state.preview.phi, 1, [1, 3]);
  mark(st.phi, 1.5, [4, 3]);
  // a grip on top of the line, to grab the ruler by
  const g = 6, xs = [p.X(((360 - st.phi) % 360) / 360 * T / st.k)];
  p.ctx.fillStyle = C['data-highlight'];
  p.ctx.beginPath(); p.ctx.moveTo(xs[0] - g, p.inner.t); p.ctx.lineTo(xs[0] + g, p.inner.t); p.ctx.lineTo(xs[0], p.inner.t + g * 1.4); p.ctx.closePath(); p.ctx.fill();
  FD = { p, xs, T, k: st.k };
  p.axes();
  $('subFold').innerHTML = `${st.cycles} cycle${st.cycles > 1 ? 's' : ''} in quasi-steady state, averaged: the noise drops by about √${st.cycles}. Green: the delay the chosen <i>φ</i> reads, (360° − <i>φ</i>)/360° · <i>T</i>/<i>k</i>; drag it to set <i>φ</i>.`;
}

const psdAt = phi => {
  const r = phi * Math.PI / 180;
  return Array.from(S.I, (v, x) => v * Math.cos(r) + S.Q[x] * Math.sin(r));
};
const shownPhi = () => (state.preview ? state.preview.phi : state.s.phi);
/** Text scale of the centre: CHART.workbenchScale on a wide screen, where the plots fill the window. */
const SC = () => (document.documentElement.dataset.w === 'wide' ? CHART.workbenchScale : 1);

/**
 * Figure 3. Averaged spectra through the period (grey) or, phase-resolved, the
 * spectra for φ = 0, 10, …, 170° (grey); in both the one at the chosen φ
 * (green). "Exactly k" shows A_k(φ). "Summed up to k" adds the harmonics
 * 1 … k, each at the phase that matches the same moment: φ at the fundamental
 * is the time t = (90° − φ)/360° · T, where harmonic h has the phase
 * φ_h = 90° − h (90° − φ). The sum is the averaged spectrum at t without its
 * mean, rebuilt from k harmonics; at k = 1 it is A₁(φ), and with more
 * harmonics it comes closer to the shape of the original. "Amplitude" adds
 * the envelope no φ exceeds: |A_k| = √(I² + Q²), or for the sum its largest
 * value over the period.
 */
function drawSpec() {
  const { st, xs } = S, ax = AXES[st.axis], phi = shownPhi();
  const hs = st.kUpTo ? Array.from({ length: st.k }, (_, i) => i + 1) : [st.k];
  const one = (h, ph) => { const r = ph * Math.PI / 180, { I: I_, Q: Q_ } = S.harm[h]; return Array.from(I_, (v, x) => v * Math.cos(r) + Q_[x] * Math.sin(r)); };
  // the mean of the period, added back to the sum when the grey lines are the
  // averaged spectra themselves (not phase-resolved), so the two compare directly
  const mean = xs.map((_, x) => S.fold.reduce((a_, r_) => a_ + r_[x], 0) / M);
  const spec = (ph, withMean = false) => {
    if (!st.kUpTo) return one(st.k, ph);
    const out = withMean ? mean.slice() : new Array(xs.length).fill(0);
    for (const h of hs) one(h, 90 - h * (90 - ph)).forEach((v, x) => { out[x] += v; });
    return out;
  };
  const env = () => {
    if (!st.kUpTo) return Array.from(S.harm[st.k].I, (v, x) => Math.hypot(v, S.harm[st.k].Q[x]));
    const out = new Array(xs.length).fill(0);
    for (let ph = 0; ph < 360; ph += 5) spec(ph).forEach((v, x) => { out[x] = Math.max(out[x], Math.abs(v)); });
    return out;
  };
  const set = st.allPhi ? Array.from({ length: 18 }, (_, i) => spec(i * 10)) : [];
  const avg = st.allPhi ? [] : Array.from({ length: 12 }, (_, i) => Array.from(S.fold[i * (M / 12)]));
  const yr = limits().spec;
  const ylabel = !st.allPhi ? 'signal / –' : st.kUpTo ? `Σ *A*_*h*_ , *h* ≤ ${st.k} / –` : `*A*_${st.k}_(*φ*) / –`;
  const p = plot($('cSpec'), { scale: SC(), x: [ax.from, ax.to], y: yr, xlabel: ax.label, ylabel, xticks: ax.ticks, yticks: ticks(yr[0], yr[1], 4) });
  p.hline(0);
  for (const s_ of avg) p.line(xs, s_, C['data-faint'], CHART.lineFaint);
  for (const s_ of set) p.line(xs, s_, C['data-faint'], CHART.lineFaint);
  if (st.allPhi && st.absSpec) p.line(xs, env(), C['ink-700'], CHART.lineData, [6, 3]);
  p.line(xs, spec(phi, st.kUpTo && !st.allPhi), C['data-highlight'], CHART.lineHighlight);
  for (const s_ of S.banded) p.text(s_.label.split(',')[0], s_.band[0], yr[1] - (yr[1] - yr[0]) * 0.07, colorOf(s_));
  p.axes();
}

/* phase domain: the points of interest, kept for hover and click; figure 2: its ruler */
let PH = null, FD = null;

function drawPhase() {
  const ph = Array.from({ length: 73 }, (_, i) => i * 5);
  const rows = S.rows.filter(r => r.sp && r.sp.band);
  const yr = limits().phase, amp = yr[1];
  const p = plot($('cPhase'), { scale: SC(),
    x: [0, 360], y: yr, xlabel: 'phase angle *φ* / °', ylabel: '*A*_*k*_(*φ*) / –',
    xticks: [0, 90, 180, 270, 360].map(v => [v, String(v)]), yticks: ticks(yr[0], yr[1], 4),
  });
  p.hline(0);
  if (state.preview) p.vline(state.preview.phi, C['data-highlight'], 1, [1, 3]);
  p.vline(state.s.phi, C['data-highlight'], 1.5, [4, 3]);
  const pois = [];
  for (const r of rows) {
    p.line(ph, ph.map(f => r.I * Math.cos(f * Math.PI / 180) + r.Q * Math.sin(f * Math.PI / 180)), r.color);
    if (r.static || r.amp < 0.01 * amp) continue;
    pois.push({ kind: 'max', row: r, phi: r.phiMax, y: r.amp });
    for (const z of [90, 270]) pois.push({ kind: 'zero', row: r, phi: (r.phiMax + z) % 360, y: 0 });
  }
  const { ctx, X, Y } = p;
  for (const q of pois) {
    if (q.kind === 'max') p.dot(q.phi, q.y, q.row.color);
    else {
      ctx.strokeStyle = q.row.color; ctx.lineWidth = 1.8; ctx.fillStyle = C.surface;
      ctx.beginPath(); ctx.arc(X(q.phi), Y(0), CHART.marker, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }
    q.px = X(q.phi); q.py = Y(q.y);
  }
  // each maximum read off in the plot: a drop line to the φ axis and a line to
  // the right edge (360°), whose length is the lag δ = 360° − φmax. The angle
  // sits above the dot, δ on its line halfway to the edge, or left of the dot
  // where the line is too short. Where two labels would touch, a δ moves up
  // or down a little and an angle sideways.
  const maxima = pois.filter(q => q.kind === 'max').sort((u, v) => u.phi - v.phi);
  const font = p.font('annotation'), sc = p.scale, placed = [];
  const boxOf = (txt, x, y, align) => {
    const w = richText(ctx, txt, 0, 0, font, 'left', false), h = 15 * sc;
    const l = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    return { l: l - 3, r: l + w + 3, t: y - 12 * sc, b: y - 12 * sc + h, w };
  };
  const hits = bx => placed.some(o => bx.l < o.r && bx.r > o.l && bx.t < o.b && bx.b > o.t);
  const put = (txt, x, y, align, color, nudge) => {
    let bx = boxOf(txt, x, y, align), k = 0;
    while (hits(bx) && k < 6) {
      k += 1;
      const step = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
      if (nudge === 'y') { y += step * (bx.b - bx.t + 2); } else { x += step * (bx.w + 6); }
      bx = boxOf(txt, x, y, align);
    }
    placed.push(bx);
    ctx.fillStyle = C.surface; ctx.globalAlpha = 0.85; ctx.fillRect(bx.l, bx.t, bx.r - bx.l, bx.b - bx.t); ctx.globalAlpha = 1;
    ctx.fillStyle = color; richText(ctx, txt, x, y, font, align);
  };
  for (const q of maxima) {
    const c = q.row.color;
    p.line([q.phi, q.phi], [q.y, yr[0]], c, 1, [3, 3]);
    if (q.row.delta >= 0.5) p.line([q.phi, 360], [q.y, q.y], c, 1, [3, 3]);   // δ = 0: nothing to draw, 360° is 0°
    placed.push({ l: X(q.phi) - 6, r: X(q.phi) + 6, t: Y(q.y) - 6, b: Y(q.y) + 6 });   // the dot itself
  }
  // φmax on its drop line near the φ axis, turned to read upwards. Every label
  // ends at the same height, so units, tens and hundreds of all of them line up
  ctx.font = font;
  const lineH = 15 * sc, endAt = richText(ctx, '360°', 0, 0, font, 'left', false) + 6;
  for (const q of maxima) {
    // on the drop line, but kept inside the frame where φmax is close to 0° or 360°
    const txt = `${q.phi.toFixed(0)}°`, w = richText(ctx, txt, 0, 0, font, 'left', false), y0 = p.inner.b - 4;
    const x = Math.min(p.inner.r - lineH / 2 - 2, Math.max(p.inner.l + lineH / 2 + 2, X(q.phi)));
    ctx.save(); ctx.translate(x, y0); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C.surface; ctx.globalAlpha = 0.85; ctx.fillRect(endAt - w - 3, -lineH / 2, w + 6, lineH); ctx.globalAlpha = 1;
    ctx.fillStyle = q.row.color; richText(ctx, txt, endAt, 4 * sc, font, 'right');
    ctx.restore();
    placed.push({ l: x - lineH / 2, r: x + lineH / 2, t: y0 - endAt - 3, b: y0 });
  }
  // δ: the first free spot of: on its line halfway to the right edge (where
  // the line is long enough), left of its dot, then one row up or down of each
  for (const q of maxima) {
    const txt = `*δ* = ${q.row.delta.toFixed(0)}°`, w = richText(ctx, txt, 0, 0, font, 'left', false);
    const row = 17 * sc, xd = X(q.phi), yd = Y(q.y), room = X(360) - xd - 10;
    const on = [(xd + X(360)) / 2, yd - 4 * sc, 'center'], left = [xd - 9, yd + 5 * sc, 'right'];
    const right = [xd + 9, yd + 5 * sc, 'left'];
    const firsts = q.row.delta < 0.5 ? [right, left] : room >= w + 6 ? [on, left] : [left];
    const cands = [];
    for (const dy of [0, -row, row, -2 * row, 2 * row]) for (const [x, y, al] of firsts) cands.push([x, y + dy, al]);
    const inFrame = bx => bx.t >= p.inner.t && bx.b <= p.inner.b && bx.l >= p.inner.l;
    const pick = cands.find(([x, y, al]) => { const bx = boxOf(txt, x, y, al); return inFrame(bx) && !hits(bx); }) ?? cands[0];
    const bx = boxOf(txt, ...pick);
    placed.push(bx);
    ctx.fillStyle = C.surface; ctx.globalAlpha = 0.85; ctx.fillRect(bx.l, bx.t, bx.r - bx.l, bx.b - bx.t); ctx.globalAlpha = 1;
    ctx.fillStyle = q.row.color; richText(ctx, txt, pick[0], pick[1], font, pick[2]);
  }
  // the ruler's grip: a small triangle on top of the dashed line, to grab it by
  const rx = X(state.s.phi), g = 6;
  ctx.fillStyle = C['data-highlight'];
  ctx.beginPath(); ctx.moveTo(rx - g, p.inner.t); ctx.lineTo(rx + g, p.inner.t); ctx.lineTo(rx, p.inner.t + g * 1.4); ctx.closePath(); ctx.fill();
  p.axes();
  PH = { p, pois, rx };
}

function legend(el, items) {
  el.innerHTML = items.map(([label, color, dashed]) => `<span class="${dashed ? 'dashed' : ''}" style="--c:${color}">${label}</span>`).join('');
}

/**
 * Right panel: the table of values, one row per signal. τ is not repeated
 * here, it is on its slot; the k-scaled amplitude appears for a square wave
 * above k = 1, where the handbook reads it.
 */
function drawValues() {
  const { k, rows, st } = S;
  const scaled = st.shape === 'square' && k > 1;
  const strong = Math.max(...rows.filter(r => r.key !== 'stim').map(r => r.amp), 1e-9);
  $('vK').textContent = k;
  const unit = st.unit === 'T' ? 'T' : 'min';
  const t = v => (st.unit === 'T' ? v.toFixed(3) : v.toFixed(1));
  const head = `<tr><th></th><th><i>φ</i><sub>max</sub></th><th><i>δ</i></th><th><i>t</i><sub>con</sub><br><span class="th-sub">sim. / ${unit}</span></th><th><i>t</i><sub>con</sub><br><span class="th-sub">1st ord.</span></th><th>|<i>A</i><sub>${k}</sub>|</th>${scaled ? `<th>${k}|<i>A</i><sub>${k}</sub>|</th>` : ''}</tr>`;
  const body = rows.map(r => {
    const flat = r.static || r.amp < 1e-4 || r.amp < 0.01 * Math.max(strong, rows[0].amp);
    return `<tr><td style="color:${r.color}" title="${r.label}">${r.key === 'stim' ? 'stim.' : r.label.split(',')[0]}</td>
      <td>${flat ? '–' : r.phiMax.toFixed(0) + '°'}</td><td>${flat ? '–' : r.delta.toFixed(0) + '°'}</td>
      <td>${flat ? '–' : t(r.tcon)}</td><td>${r.theory == null || flat ? '–' : t(r.theory)}</td>
      <td>${r.amp.toFixed(3)}</td>${scaled ? `<td>${(k * r.amp).toFixed(3)}</td>` : ''}</tr>`;
  }).join('');
  $('readout').innerHTML = head + body;
}

function draw() {
  if (!S) return;
  drawTime(); drawFold(); drawSpec(); drawPhase(); drawValues(); refreshVals();
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
  renderRail();
}

/* ---------------------------------------------------------------------------
   Workbench: on a wide screen the centre fills the window below its top, so
   the four plots never need scrolling.
   --------------------------------------------------------------------------- */
function fitWorkbench() {
  const wb = $('workbench'), stage = $('stage'), wide = document.documentElement.dataset.w === 'wide';
  document.body.classList.toggle('wb-locked', wide);
  if (!wide) { wb.style.height = ''; stage.style.height = ''; return; }
  const zoom = parseFloat(document.body.style.zoom) || 1;
  // from under the site header to the bottom of the window; only the centre scrolls
  wb.style.height = `${Math.max(560, window.innerHeight / zoom - wb.offsetTop)}px`;
  stage.style.height = `${$('wbMain').clientHeight}px`;
}

/* ---------------------------------------------------------------------------
   Collapsing the panels. Right: gone, a tab brings it back. Left: a rail of
   quick switches, the way IR-bands collapses its sidebar.
   --------------------------------------------------------------------------- */
const panels = { left: true, right: true };
function setPanels() {
  const wb = $('workbench');
  wb.classList.toggle('left-closed', !panels.left);
  wb.classList.toggle('right-closed', !panels.right);
  $('leftToggle').textContent = panels.left ? '◀' : '▶';
  $('leftToggle').title = panels.left ? 'Collapse the settings to quick switches' : 'Open the settings';
  $('rightOpen').hidden = panels.right;
  renderRail();
  fitWorkbench(); draw();
}
$('leftToggle').addEventListener('click', () => { panels.left = !panels.left; setPanels(); });
$('rightToggle').addEventListener('click', () => { panels.right = false; setPanels(); });
$('rightOpen').addEventListener('click', () => { panels.right = true; setPanels(); });

/* The rail: the case, its reset, the stimulus, k, all φ, the sweep, the
   noise, and one switch per species slot. A button says what it is on hover;
   the case, k and noise open a small menu. */
let flyOpen = null, flyTimer = null;
const railBtn = (id, text, title, opts = {}) => `<button type="button" class="rail-btn${opts.on ? ' on' : ''}${opts.text ? ' is-text' : ''}" data-r="${id}" title="${title}"${opts.style ? ` style="${opts.style}"` : ''}${opts.disabled ? ' disabled' : ''}>${text}</button>`;
const flyWrap = (id, btn, items) => `<div class="rail-wrap" data-fly="${id}">${btn}<div class="fly"${flyOpen === id ? '' : ' hidden'}>${items}</div></div>`;
const flyItem = (r, v, text, on) => `<button type="button" class="fly-item${on ? ' fly-on' : ''}" data-r="${r}" data-v="${v}">${text}</button>`;
function renderRail() {
  if (panels.left || !state.s) { $('rail').innerHTML = ''; return; }
  const st = state.s, ci = state.caseIdx, changed = $('caseSelect').classList.contains('changed');
  $('rail').innerHTML = [
    railBtn('open', '▶', 'Open the settings', { text: true }),
    '<hr class="rail-rule">',
    flyWrap('case', railBtn('caseFly', String(ci + 1), 'Case', { text: true, on: true }),
      `<div class="fly-title">Case</div>${CASES.map((c, i) => flyItem('case', i, `${i + 1} · ${c.title}`, i === ci)).join('')}`),
    railBtn('reset', '↺', changed ? 'Reset to the case' : 'Nothing changed from the case', { disabled: !changed }),
    '<hr class="rail-rule">',
    railBtn('shape', st.shape === 'square' ? '⊓' : '∿', st.shape === 'square' ? 'Stimulus on / off. Click for sine' : 'Stimulus sine. Click for on / off', { text: true }),
    flyWrap('k', railBtn('kFly', `k${st.k}`, 'Harmonic k', { text: true }),
      `<div class="fly-title">Harmonic <i>k</i></div>${[1, 2, 3, 5].map(k => flyItem('k', k, `k = ${k}`, k === st.k)).join('')}`),
    railBtn('allPhi', '∥', st.allPhi ? 'Phase-resolved spectra shown. Click for the averaged period' : 'The averaged period shown. Click for the phase-resolved spectra', { on: st.allPhi, text: true }),
    railBtn('play', playing ? '❚❚' : '▶', playing ? 'Pause the sweep' : 'Sweep φ', { on: playing, text: true }),
    flyWrap('noise', railBtn('noiseFly', 'σ', 'Noise', { text: true, on: st.noise > 0 }),
      `<div class="fly-title">Noise, <i>σ</i> = ${sigmaFromSlider(st.noise).toFixed(3)}</div>${flyItem('noise', 'new', 'new noise')}${flyItem('noise', 'off', 'no noise', st.noise === 0)}${flyItem('noise', 'case', 'the case’s noise', st.noise === caseS().noise)}`),
    '<hr class="rail-rule">',
    ...st.species.map((s, i) => railBtn(`sp:${i}`, s.label.split(',')[0].slice(0, 2), `${s.label}: ${s.on ? 'in the sample. Click to take it out' : 'not in the sample. Click to add it'}`, { text: true, on: s.on, style: `--c:${colorOf(s)}` })),
  ].join('');
}
$('rail').addEventListener('mouseover', e => {
  const w = e.target.closest('[data-fly]');
  if (!w) return;
  if (flyTimer) { clearTimeout(flyTimer); flyTimer = null; }
  if (flyOpen !== w.dataset.fly) { flyOpen = w.dataset.fly; $('rail').querySelectorAll('.fly').forEach(f => { f.hidden = f.parentElement.dataset.fly !== flyOpen; }); }
});
$('rail').addEventListener('mouseout', e => {
  if (e.relatedTarget && e.relatedTarget.closest?.('[data-fly]') === e.target.closest('[data-fly]')) return;
  flyTimer = setTimeout(() => { flyOpen = null; $('rail').querySelectorAll('.fly').forEach(f => { f.hidden = true; }); }, 180);
});
$('rail').addEventListener('click', e => {
  const b = e.target.closest('[data-r]');
  if (!b) return;
  const r = b.dataset.r, st = state.s;
  if (r === 'open') { panels.left = true; setPanels(); return; }
  if (r === 'case') { flyOpen = null; selectCase(+b.dataset.v); return; }
  if (r === 'reset') { selectCase(state.caseIdx, false); return; }
  if (r === 'shape') { st.shape = st.shape === 'square' ? 'sine' : 'square'; syncControls(); }
  else if (r === 'k') { st.k = +b.dataset.v; flyOpen = null; syncControls(); }
  else if (r === 'allPhi') { st.allPhi = !st.allPhi; syncControls(); }
  else if (r === 'play') { $('play').click(); return; }
  else if (r === 'noise') {
    if (b.dataset.v === 'new') state.seed += 1;
    else st.noise = b.dataset.v === 'off' ? 0 : caseS().noise;
    flyOpen = null;
  } else if (r.startsWith('sp:')) {
    const s = st.species[+r.slice(3)], before = s.on;
    s.on = !s.on;
    if (!claimColor(s)) { s.on = before; b.classList.add('refused'); setTimeout(() => b.classList.remove('refused'), 900); return; }
    renderSpecies();
  } else return;
  update();
});

/* ---------------------------------------------------------------------------
   Controls: measurement and demodulation
   --------------------------------------------------------------------------- */
function setSeg(el, v) {
  el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
}

/** Write every measurement control from state.s. */
function syncControls() {
  const st = state.s;
  $('allPhi').checked = st.allPhi;
  $('absSpec').checked = st.absSpec; $('absSpec').disabled = !st.allPhi;
  setSeg($('kMode'), st.kUpTo ? 'le' : 'eq');
  $('subSpecMode').innerHTML = (st.kUpTo ? ` Summed: harmonics 1 … ${st.k} at <i>t</i> = (90° − <i>φ</i>)/360° · <i>T</i>${st.allPhi ? '' : ', plus the mean: the averaged spectrum at <i>t</i>, rebuilt'}.` : '')
    + (st.allPhi && st.absSpec ? ' Dashed ink: the amplitude, which no <i>φ</i> exceeds.' : '');
  setSeg($('shape'), st.shape); setSeg($('harm'), st.k); setSeg($('unit'), st.unit);
  $('period').value = st.T; $('period').disabled = st.unit === 'T';
  $('axis').value = st.axis;
  $('subSpecFold').hidden = st.allPhi; $('subSpecAll').hidden = !st.allPhi;
}

function setPhi(v) {
  state.s.phi = ((Math.round(v) % 360) + 360) % 360;
  draw();
}

/* ---------------------------------------------------------------------------
   Controls: the species slots. Always five, in drive order: a slot can only
   follow the stimulus or a slot above it. Off keeps the values.
   --------------------------------------------------------------------------- */
/** Species cards folded to their name row: all of them when the page opens, then the reader's choice. */
const folded = new Set();
let foldedInit = false;

const freeColor = (except = null) => DYN_COLORS.find(c => !state.s.species.some(s => s !== except && isDyn(s) && s.color === c));
const num = (v, d = 3) => String(+(+v).toFixed(d));

function slotCard(s, i) {
  const st = state.s, ax = AXES[st.axis], lo = Math.min(ax.from, ax.to), hi = Math.max(ax.from, ax.to);
  const opts = [['stim', 'the stimulus'], ...st.species.slice(0, i).map(o => [o.key, `${o.label}${o.on ? '' : ' (off)'}`])]
    .map(([v, t]) => `<option value="${v}"${s.drive === v ? ' selected' : ''}>${t}</option>`).join('')
    + `<option value="static"${isStatic(s) ? ' selected' : ''}${!s.band ? ' disabled' : ''}>nothing (static)</option>`;
  const dis = on => (on ? ' disabled' : '');
  return `<div class="sp-card${s.on ? '' : ' off'}${folded.has(s.key) ? ' folded' : ''}" data-i="${i}" style="--c:${colorOf(s)}">
    <div class="sp-top">
      <label class="switch" title="${s.on ? 'in the sample: click to take it out' : 'not in the sample: click to add it'}"><input type="checkbox" data-f="on"${s.on ? ' checked' : ''}><span></span></label>
      <span class="sp-swatch${s.band ? '' : ' dashed'}"></span>
      ${folded.has(s.key) ? `<span class="sp-label">${s.label}</span>` : `<input type="text" data-f="label" value="${s.label}" aria-label="name">`}
      <button type="button" class="sp-fold" data-f="fold" aria-expanded="${!folded.has(s.key)}" title="${folded.has(s.key) ? 'Show the settings of this species' : 'Fold this species to its name'}">${folded.has(s.key) ? '▸' : '▾'}</button>
      ${i < SLOTS ? `<button type="button" class="rst" data-f="resetSlot" title="this slot back to the case"${slotChanged(i) ? '' : ' hidden'}>↺</button>`
        : '<button type="button" class="sp-x" data-f="remove" title="remove this added species">×</button>'}
    </div>
    <div class="sp-body">
      <label class="ctl wide"><span>follows</span><select data-f="drive">${opts}</select></label>
      <div class="ctl vctl wide" data-k="tau:${i}"></div>
      <div class="ctl vctl wide" data-k="lag:${i}"></div>
      <label class="ctl check wide" title="The species builds up with one time constant while the stimulus is on, and decays with another once it is off, e.g. fast adsorption and slow desorption. The off half is then no longer the mirror image of the on half, and that is what puts signal into the even harmonics (k = 2)."><input type="checkbox" data-f="asym"${s.tauOff != null ? ' checked' : ''}${dis(isStatic(s))}><span>decays at a different rate than it builds up</span></label>
      <div class="ctl vctl wide" data-k="tauOff:${i}"></div>
      <div class="ctl wide"><span>response</span><span class="seg" data-f="invert"><button type="button" data-v="0"${dis(isStatic(s))} aria-pressed="${!s.invert}" title="rises while the stimulus is on">in phase</button><button type="button" data-v="1"${dis(isStatic(s))} aria-pressed="${!!s.invert}" title="falls while the stimulus is on">antiphase</button></span></div>
      ${s.band ? '' : '<p class="sp-note wide">a signal without a band, e.g. the gas in the cell: it drives what follows it and is drawn dashed</p>'}
      <label class="ctl num"><span>centre</span><input type="number" data-f="c" min="${lo}" max="${hi}" step="${Math.abs(ax.step)}" value="${s.band ? num(s.band[0], 1) : ''}"${dis(!s.band)}></label>
      <label class="ctl num"><span>width</span><input type="number" data-f="w" min="${Math.abs(ax.step)}" max="${(hi - lo) / 2}" step="${Math.abs(ax.step)}" value="${s.band ? num(s.band[1], 1) : ''}"${dis(!s.band)}></label>
      <label class="ctl num"><span>height</span><input type="number" data-f="h" min="0.01" step="0.01" value="${s.band ? num(s.band[2], 3) : ''}"${dis(!s.band)}></label>
      <label class="ctl num"><span>stays</span><input type="number" data-f="base" min="0" max="0.95" step="0.05" value="${num(s.base ?? 0, 2)}"${dis(!s.band || isStatic(s))}></label>
    </div>
  </div>`;
}

function renderSpecies() {
  if (!foldedInit) { state.s.species.forEach(s => folded.add(s.key)); foldedInit = true; }
  $('species').innerHTML = state.s.species.map(slotCard).join('');
  $('addSpecies').disabled = state.s.species.length >= MAX_SPECIES;
  fillVctls($('species'));
  legends();
}

/** Turning a slot into a coloured band needs a free colour: A, B and C are the three there are. */
function claimColor(s) {
  if (!isDyn(s)) return true;
  if (!state.s.species.some(o => o !== s && isDyn(o) && o.color === s.color)) return true;
  const c = freeColor(s);
  if (!c) return false;
  s.color = c;
  return true;
}
function refuse(card) {
  card.classList.add('refused');
  card.title = 'Three species already follow the stimulus with a band: A, B and C are the colours there are. Switch one off first.';
  setTimeout(() => card.classList.remove('refused'), 900);
}

$('species').addEventListener('input', e => {
  const t = e.target, f = t.dataset.f, card = t.closest('.sp-card');
  if (!f || !card || f === 'on' || f === 'asym' || f === 'hasBand' || t.closest('.vctl')) return;
  const st = state.s, s = st.species[+card.dataset.i];
  const v = parseFloat(t.value);
  if (f === 'label') { s.label = t.value; legends(); update(); return; }
  if (!Number.isFinite(v)) return;
  const ax = AXES[st.axis], lo = Math.min(ax.from, ax.to), hi = Math.max(ax.from, ax.to);
  if (f === 'c') s.band[0] = Math.min(hi, Math.max(lo, v));
  else if (f === 'w') s.band[1] = Math.max(Math.abs(ax.step), v);
  else if (f === 'h') s.band[2] = Math.max(0.01, v);
  else if (f === 'base') s.base = Math.max(0, Math.min(0.95, v));
  else return;
  update();
});

$('species').addEventListener('change', e => {
  const t = e.target, f = t.dataset.f, card = t.closest('.sp-card');
  if (!f || !card) return;
  const st = state.s, s = st.species[+card.dataset.i];
  const before = clone(s);
  if (f === 'asym') { s.tauOff = t.checked ? s.tau : null; renderSpecies(); update(); return; }
  if (f === 'on') s.on = t.checked;
  else if (f === 'drive') { s.drive = t.value; if (isStatic(s)) s.invert = false; }
  else if (f === 'hasBand') {
    const ax = AXES[st.axis];
    s.band = t.checked ? [(ax.from + ax.to) / 2, Math.abs(ax.to - ax.from) / 6, 0.5] : null;
  } else return;
  if (!claimColor(s)) { Object.assign(s, before); renderSpecies(); refuse($('species').children[+card.dataset.i]); return; }
  renderSpecies();
  update();
});

$('species').addEventListener('click', e => {
  const fb = e.target.closest('[data-f="fold"]');
  if (fb) {
    const key = state.s.species[+fb.closest('.sp-card').dataset.i].key;
    if (folded.has(key)) folded.delete(key); else folded.add(key);
    renderSpecies();
    return;
  }
  // a folded card opens on a click anywhere but its switch and buttons
  const card = e.target.closest('.sp-card.folded');
  if (card && !e.target.closest('.switch, button')) {
    folded.delete(state.s.species[+card.dataset.i].key);
    renderSpecies();
    return;
  }
  const x = e.target.closest('[data-f="remove"]');
  if (x) {
    state.s.species.splice(+x.closest('.sp-card').dataset.i, 1);
    renderSpecies(); update();
    return;
  }
  const r = e.target.closest('[data-f="resetSlot"]');
  if (r) {
    const i = +r.closest('.sp-card').dataset.i;
    state.s.species[i] = caseSlot(i);
    renderSpecies(); update();
    return;
  }
  const b = e.target.closest('[data-f="invert"] button');
  if (!b) return;
  const s = state.s.species[+b.closest('.sp-card').dataset.i];
  s.invert = b.dataset.v === '1';
  setSeg(b.parentElement, b.dataset.v);
  update();
});

/* Adding a species: below the five slots that are always there. An added one
   follows the stimulus with a free colour, or is static when none is left;
   its card has a × to remove it again. */
$('addSpecies').addEventListener('click', () => {
  const st = state.s, ax = AXES[st.axis];
  let n = st.species.length + 1;
  while (st.species.some(s => s.key === `s${n}`)) n++;
  const c = freeColor(), letter = String.fromCharCode(64 + st.species.length + 1);
  const band = [ax.from + (ax.to - ax.from) * 0.75, Math.abs(ax.to - ax.from) / 8, 0.5];
  st.species.push({ key: `s${n}`, on: true, ...sp(letter, c ?? 'data-a', band, c ? 'stim' : 'static', c ? 0.05 * st.T : 0) });
  renderSpecies(); update();
  $('species').lastElementChild?.scrollIntoView({ block: 'nearest' });
});

/* ---------------------------------------------------------------------------
   Legends, case texts as tooltips, case switching
   --------------------------------------------------------------------------- */
function legends() {
  const on = live();
  const items = [['stimulus', C['data-stimulus'], true],
    ...on.filter(s => !s.band).map(s => [s.label, colorOf(s), true]),
    ...on.filter(s => s.band).map(s => [s.label, colorOf(s)])];
  legend($('legTime'), items);
  legend($('legFold'), items);
  legend($('legPhase'), on.filter(s => s.band).map(s => [s.label, colorOf(s)]));
}

/** The floating tooltip: one element for the case texts and the phase-domain points. */
const tip = $('tip');
function showTip(html, x, y, place = 'right') {
  const zoom = parseFloat(document.body.style.zoom) || 1;
  tip.innerHTML = html; tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth / zoom, vh = window.innerHeight / zoom;
  let left = x / zoom + 14, top = y / zoom + 14;
  if (place === 'right') top = y / zoom;
  if (left + w > vw - 8) left = Math.max(8, x / zoom - w - 14);
  if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
  tip.style.left = `${left}px`; tip.style.top = `${top}px`;
}
const hideTip = () => { tip.hidden = true; };
const caseTip = i => `<div class="tip-title">${CASES[i].title}</div>${$('caseTexts').children[i].innerHTML}`;

function selectCase(idx, push = true) {
  state.caseIdx = idx;
  const cs = CASES[idx];
  state.s = clone(cs.s);
  state.preview = null;
  $('caseBtn').innerHTML = `<span class="n">${idx + 1}</span>${cs.title}<span class="caret" aria-hidden="true">▾</span>`;
  document.querySelectorAll('#caseMenu li').forEach((li, i) => li.setAttribute('aria-selected', String(i === idx)));
  syncControls(); renderSpecies();
  if (push) {
    try { const u = new URL(location.href); u.searchParams.set('case', cs.id); history.replaceState(null, '', u); } catch { /* not essential */ }
  }
  update();
}

/* the case selector: one button showing the current case, a menu on click, the text on hover */
$('caseMenu').innerHTML = CASES.map((c, i) => `<li role="option" tabindex="-1" data-i="${i}"><span class="n">${i + 1}</span>${c.title}</li>`).join('');
const menuOpen = () => !$('caseMenu').hidden;
function openMenu(on) {
  $('caseMenu').hidden = !on;
  $('caseBtn').setAttribute('aria-expanded', String(on));
  if (!on) hideTip();
  if (on) (document.querySelector('#caseMenu li[aria-selected="true"]') ?? document.querySelector('#caseMenu li')).focus();
}
const tipBeside = (el, i) => { const r = el.getBoundingClientRect(); showTip(caseTip(i), r.right, r.top, 'right'); };
$('caseBtn').addEventListener('click', () => openMenu(!menuOpen()));
$('caseBtn').addEventListener('mouseenter', e => { if (!menuOpen()) tipBeside(e.currentTarget, state.caseIdx); });
$('caseBtn').addEventListener('mouseleave', () => { if (!menuOpen()) hideTip(); });
$('caseMenu').addEventListener('mouseover', e => { const li = e.target.closest('li'); if (li) tipBeside(li, +li.dataset.i); });
$('caseMenu').addEventListener('focusin', e => { const li = e.target.closest('li'); if (li) tipBeside(li, +li.dataset.i); });
$('caseMenu').addEventListener('mouseleave', hideTip);
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

/* ---------------------------------------------------------------------------
   Phase domain: hover a point to preview the spectrum there, click to keep
   it, drag anywhere to set φ by hand.
   --------------------------------------------------------------------------- */
const pct = v => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(100 * v))} %`;
function poiText(q) {
  const r = q.row, others = S.rows.filter(o => o.sp && o.sp.band && !o.static && o !== r && o.amp > 1e-3);
  const at = o => Math.cos((q.phi - o.phiMax) * Math.PI / 180);
  const name = o => `<b style="color:${o.color}">${o.label.split(',')[0]}</b>`;
  const rest = others.map(o => {
    const v = at(o);
    return Math.abs(v) < 0.05 ? `${name(o)} is gone here too: its maximum lies within a few degrees of this one (or opposite), so at this <i>φ</i> PSD cannot tell the two apart`
      : `${name(o)} is at ${pct(v)} of its amplitude`;
  });
  const lagNote = `The lag <i>δ</i> = 360° − <i>φ</i><sub>max</sub> = ${r.delta.toFixed(0)}° reads as <i>t</i><sub>con</sub> = ${fmtT(r.tcon)}.`;
  if (q.kind === 'max') {
    const sign = r.sp.invert ? ' It falls while the stimulus is on (antiphase), so this maximum lies about 180° from where a rising band of the same <i>τ</i> would peak.' : '';
    return `<div class="tip-title">${name(r)} at its maximum, <i>φ</i> = ${q.phi.toFixed(0)}°</div>
      <p>The reference is in step with ${name(r)}, so the spectrum shows it at full size, |<i>A</i><sub>${S.k}</sub>| = ${r.amp.toFixed(3)}. ${lagNote}${sign}</p>
      ${rest.length ? `<p>${rest.join('; ')}.</p>` : ''}<p class="tip-hint">click to keep this <i>φ</i></p>`;
  }
  return `<div class="tip-title">${name(r)} is gone, <i>φ</i> = ${q.phi.toFixed(0)}°</div>
    <p>90° from its maximum the reference is a quarter period out of step with ${name(r)}: its product integrates to zero. What the spectrum shows here is only what responds at another time.</p>
    ${rest.length ? `<p>${rest.join('; ')}.</p>` : '<p>No other band follows the stimulus, so the phase-resolved spectrum is flat.</p>'}<p class="tip-hint">click to keep this <i>φ</i></p>`;
}

const cPhase = $('cPhase');
function local(e) {
  const r = cPhase.getBoundingClientRect(), f = cPhase.clientWidth / r.width;
  return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f };
}
function hit(e) {
  if (!PH) return null;
  const { x, y } = local(e);
  let best = null, bd = 11;
  for (const q of PH.pois) { const d = Math.hypot(q.px - x, q.py - y); if (d < bd) { bd = d; best = q; } }
  return best;
}
function phiAt(e) {
  const { x } = local(e), { inner } = PH.p;
  return Math.max(0, Math.min(359, (x - inner.l) / (inner.r - inner.l) * 360));
}
/** Near the ruler: within a few px of the dashed line, inside the plot. */
function onRuler(e) {
  if (!PH) return false;
  const { x, y } = local(e), { inner } = PH.p;
  return Math.abs(x - PH.rx) <= 7 && y >= inner.t - 4 && y <= inner.b;
}
let dragging = false;
cPhase.addEventListener('pointermove', e => {
  if (dragging) { setPhi(phiAt(e)); return; }
  const q = hit(e);
  cPhase.style.cursor = q ? 'pointer' : onRuler(e) ? 'ew-resize' : 'default';
  const prev = state.preview?.poi;
  if (q !== prev) {
    state.preview = q ? { phi: q.phi, poi: q } : null;
    draw();
  }
  if (q) showTip(poiText(q), e.clientX, e.clientY, 'cursor'); else hideTip();
});
cPhase.addEventListener('pointerleave', () => { if (dragging) return; state.preview = null; hideTip(); draw(); });
/* figure 2: drag the delay ruler; φ = 360° − 360°·k·t/T, read in whichever of the k periods it is */
const cFold = $('cFold');
const localIn = (cv, e) => { const r = cv.getBoundingClientRect(), f = cv.clientWidth / r.width; return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f }; };
const onFoldRuler = e => {
  if (!FD) return false;
  const { x, y } = localIn(cFold, e), { inner } = FD.p;
  return y >= inner.t - 4 && y <= inner.b && FD.xs.some(rx => Math.abs(x - rx) <= 7);
};
const phiFromFold = e => {
  const { x } = localIn(cFold, e), { inner } = FD.p;
  const t = Math.max(0, Math.min(FD.T, (x - inner.l) / (inner.r - inner.l) * FD.T)), per = FD.T / FD.k;
  return (360 - 360 * ((t % per) / per) + 360) % 360;
};
let foldDrag = false;
cFold.addEventListener('pointermove', e => {
  if (foldDrag) { setPhi(phiFromFold(e)); return; }
  cFold.style.cursor = onFoldRuler(e) ? 'ew-resize' : 'default';
});
cFold.addEventListener('pointerdown', e => {
  if (!onFoldRuler(e)) return;
  foldDrag = true; cFold.setPointerCapture(e.pointerId);
});
cFold.addEventListener('pointerup', e => { foldDrag = false; try { cFold.releasePointerCapture(e.pointerId); } catch { /* already released */ } });

/* the ruler moves only when grabbed, or when a marked point is clicked; a click elsewhere does nothing */
cPhase.addEventListener('pointerdown', e => {
  const q = hit(e);
  if (q) { state.preview = null; hideTip(); setPhi(q.phi); return; }
  if (!onRuler(e)) return;
  dragging = true; cPhase.setPointerCapture(e.pointerId); hideTip(); state.preview = null;
});
cPhase.addEventListener('pointerup', e => { dragging = false; try { cPhase.releasePointerCapture(e.pointerId); } catch { /* already released */ } });

/* ---------------------------------------------------------------------------
   Value controls: a slider, the number it stands for (type to set it), a ↺
   that appears when the value differs from the case and puts the case's
   value back, and a double-click on the slider for the page default.
   One table describes every one of them; `tau:<i>` is the τ of slot i.
   --------------------------------------------------------------------------- */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const caseS = () => CASES[state.caseIdx].s;
/** A case's τ in the time unit on screen (a case in periods, the page in minutes, or the reverse). */
const caseTau = i => (caseS().species[i] ? caseS().species[i].tau * state.s.T / caseS().T : state.s.species[i].tau);
/** A slot as the case has it, in the time unit and on the axis on screen. */
function caseSlot(i) {
  if (!caseS().species[i]) return null;   // a slot the reader added
  const c = clone(caseS().species[i]);
  c.tau *= state.s.T / caseS().T;
  c.band = mapAxis(c.band, caseS().axis, state.s.axis);
  return c;
}
const slotChanged = i => { const c = caseSlot(i); return !!c && JSON.stringify(state.s.species[i]) !== JSON.stringify(c); };

const BIND = {
  noise: {
    label: 'noise <i>σ</i>', unit: '', min: 0, max: 100, step: 1, redraw: 'update',
    get: () => sigmaFromSlider(state.s.noise), set: v => { state.s.noise = 100 * Math.pow(clamp(v, 0, SIG_MAX) / SIG_MAX, 2 / 3); },
    toR: v => 100 * Math.pow(v / SIG_MAX, 2 / 3), fromR: r => sigmaFromSlider(r), fmt: v => v.toFixed(3),
    caseV: () => sigmaFromSlider(caseS().noise), def: 0,
  },
  duty: {
    label: 'on fraction of the period', unit: '', min: 0.1, max: 0.9, step: 0.05, redraw: 'update',
    get: () => state.s.duty, set: v => { state.s.duty = Math.round(clamp(v, 0.05, 0.95) * 20) / 20; },
    toR: v => v, fromR: r => +r, fmt: v => v.toFixed(2), caseV: () => caseS().duty ?? 0.5, def: 0.5,
    off: () => state.s.shape !== 'square',
  },
  cycles: {
    label: 'cycles averaged', unit: '', min: 1, max: 12, step: 1, redraw: 'update',
    get: () => state.s.cycles, set: v => { state.s.cycles = Math.round(clamp(v, 1, 12)); },
    toR: v => v, fromR: r => r, fmt: v => String(v), caseV: () => caseS().cycles, def: 4,
  },
  phi: {
    label: 'phase angle <i>φ</i>', unit: '°', min: 0, max: 359, step: 1, redraw: 'draw',
    get: () => state.s.phi, set: v => { state.s.phi = ((Math.round(v) % 360) + 360) % 360; },
    toR: v => v, fromR: r => r, fmt: v => String(v), caseV: () => caseS().phi, def: 0,
  },
  speed: {
    label: 'sweep speed', unit: '° s⁻¹', min: 10, max: 240, step: 10, redraw: 'none',
    get: () => state.speed, set: v => { state.speed = Math.round(clamp(v, 1, 720)); },
    toR: v => v, fromR: r => r, fmt: v => String(v), caseV: () => 80, def: 80,
  },
};
/** The lag of one first-order step at the fundamental, δ = arctan(ωτ), in degrees. */
const lagOf = tau => Math.atan(2 * Math.PI * tau / state.s.T) * 180 / Math.PI;
const tauOfLag = d => Math.tan(clamp(d, 0, 89.5) * Math.PI / 180) * state.s.T / (2 * Math.PI);
function bindOf(key) {
  if (BIND[key]) return BIND[key];
  const i = +key.split(':')[1];
  // the time constant while the species falls, when it has one of its own
  if (key.startsWith('tauOff:')) return {
    label: '<i>τ</i>, decaying', unit: state.s.unit === 'T' ? 'T' : 'min', min: 0, max: 100, step: 1, redraw: 'update',
    get: () => state.s.species[i].tauOff ?? state.s.species[i].tau,
    set: v => { state.s.species[i].tauOff = clamp(v, 0, 2 * state.s.T); },
    toR: v => sliderFromTau(v, state.s.T), fromR: r => tauFromSlider(r, state.s.T),
    fmt: v => (state.s.unit === 'T' ? v.toFixed(3) : v.toFixed(1)),
    caseV: () => { const c = caseS().species[i]; return c ? (c.tauOff ?? c.tau) * state.s.T / caseS().T : state.s.species[i].tau; },
    def: state.s.species[i].tau, off: () => isStatic(state.s.species[i]) || state.s.species[i].tauOff == null,
  };
  // the same step set by its lag: δ of this one step at k = 1, so τ = tan(δ) T / 2π
  if (key.startsWith('lag:')) return {
    label: 'or its lag <i>δ</i> at <i>k</i> = 1', unit: '°', min: 0, max: 89, step: 1, redraw: 'update',
    get: () => lagOf(state.s.species[i].tau), set: v => { state.s.species[i].tau = tauOfLag(v); },
    toR: v => Math.round(v), fromR: r => r, fmt: v => v.toFixed(1),
    caseV: () => lagOf(caseTau(i)), def: lagOf((DEFAULT_SLOTS[i]?.tau ?? 0.05) * state.s.T),
    off: () => isStatic(state.s.species[i]),
  };
  return {
    label: state.s.species[i].tauOff != null ? '<i>τ</i>, building up' : '<i>τ</i>', unit: state.s.unit === 'T' ? 'T' : 'min', min: 0, max: 100, step: 1, redraw: 'update',
    get: () => state.s.species[i].tau, set: v => { state.s.species[i].tau = clamp(v, 0, 2 * state.s.T); },
    toR: v => sliderFromTau(v, state.s.T), fromR: r => tauFromSlider(r, state.s.T),
    fmt: v => (state.s.unit === 'T' ? v.toFixed(3) : v.toFixed(1)), caseV: () => caseTau(i),
    def: (DEFAULT_SLOTS[i]?.tau ?? 0.05) * state.s.T, off: () => isStatic(state.s.species[i]),
  };
}
/** Build the markup of every value control under root. */
function fillVctls(root) {
  root.querySelectorAll('.vctl').forEach(el => {
    const b = bindOf(el.dataset.k);
    el.innerHTML = `<span class="vlab">${b.label}
        <input class="val" type="text" inputmode="decimal" aria-label="${el.dataset.k} value">${b.unit ? `<span class="vunit">${b.unit}</span>` : ''}
        <button type="button" class="rst" title="back to the case's value · double-click the slider for the default">↺</button></span>
      <input type="range" min="${b.min}" max="${b.max}" step="${b.step}" title="double-click: default">`;
  });
  refreshVals();
}
/** Write every value control from the state: slider, number, and whether ↺ shows. */
/** What each folded group is set to, at the right of its heading. */
function groupSummaries() {
  const st = state.s, sum = (g, t) => { const el = document.querySelector(`.sgroup[data-g="${g}"] .sg-sum`); if (el) el.innerHTML = t; };
  sum('case', `${state.caseIdx + 1} · ${CASES[state.caseIdx].title}`);
  sum('measurement', `${st.shape === 'square' ? `on / off${st.duty !== 0.5 ? ` ${st.duty.toFixed(2)}` : ''}` : 'sine'} · <i>σ</i> ${sigmaFromSlider(st.noise).toFixed(3)} · ${st.cycles} cycles`);
  sum('demodulation', `<i>k</i> ${st.kUpTo ? '≤' : '='} ${st.k} · <i>φ</i> = ${st.phi}°${st.allPhi ? ' · resolved' : ''}`);
  sum('species', live().map(s => s.label.split(',')[0]).join(' ') || 'none on');
}
document.querySelectorAll('.sg-toggle').forEach(b => b.addEventListener('click', () => {
  const g = b.closest('.sgroup'), closed = g.classList.toggle('closed');
  b.setAttribute('aria-expanded', String(!closed));
}));

function refreshVals() {
  if (!state.s) return;
  groupSummaries();
  const pf = $('phiField'), shown = state.preview ? state.preview.phi : state.s.phi;
  if (document.activeElement !== pf) pf.value = Math.round(shown);
  pf.classList.toggle('preview', !!state.preview);
  $('kField').innerHTML = `<i>k</i> ${state.s.kUpTo ? '≤' : '='} ${state.s.k}, `;
  document.querySelectorAll('.vctl').forEach(el => {
    const b = bindOf(el.dataset.k), v = b.get(), off = b.off?.() ?? false;
    const range = el.querySelector('input[type=range]'), val = el.querySelector('.val'), rst = el.querySelector('.rst');
    if (!range) return;
    range.value = b.toR(v);
    range.disabled = off; val.disabled = off;
    if (document.activeElement !== val) val.value = off ? '–' : b.fmt(v);
    rst.hidden = off || b.fmt(v) === b.fmt(b.caseV());
  });
  document.querySelectorAll('.sp-card').forEach(c => {
    const r = c.querySelector('[data-f="resetSlot"]');
    if (r) r.hidden = !slotChanged(+c.dataset.i);
  });
}
function applyVal(key, v) {
  const b = bindOf(key);
  b.set(v);
  if (b.redraw === 'update') update(); else if (b.redraw === 'draw') draw(); else refreshVals();
}
document.addEventListener('input', e => {
  const el = e.target.closest('.vctl');
  if (el && e.target.type === 'range') applyVal(el.dataset.k, bindOf(el.dataset.k).fromR(+e.target.value));
});
document.addEventListener('change', e => {
  const el = e.target.closest('.vctl');
  if (!el || !e.target.classList.contains('val')) return;
  const v = parseFloat(e.target.value.replace(',', '.'));
  if (Number.isFinite(v)) applyVal(el.dataset.k, v);
  e.target.blur(); refreshVals();
});
$('phiField').addEventListener('change', e => {
  const v = parseFloat(String(e.target.value).replace(',', '.'));
  if (Number.isFinite(v)) applyVal('phi', v);
  e.target.blur(); refreshVals();
});
$('phiField').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.dispatchEvent(new Event('change')); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList?.contains('val')) e.target.dispatchEvent(new Event('change', { bubbles: true }));
});
document.addEventListener('click', e => {
  const r = e.target.closest('.vctl .rst');
  if (r) { const k = r.closest('.vctl').dataset.k; applyVal(k, bindOf(k).caseV()); }
});
document.addEventListener('dblclick', e => {
  const el = e.target.closest('.vctl');
  if (el && e.target.type === 'range') { const b = bindOf(el.dataset.k); applyVal(el.dataset.k, b.def); }
});

/* ---------------------------------------------------------------------------
   Measurement and demodulation controls
   --------------------------------------------------------------------------- */
$('allPhi').addEventListener('change', e => { state.s.allPhi = e.target.checked; syncControls(); update(); });
$('absSpec').addEventListener('change', e => { state.s.absSpec = e.target.checked; syncControls(); update(); });
$('kMode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.s.kUpTo = b.dataset.v === 'le'; syncControls(); update(); });
$('shape').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.s.shape = b.dataset.v; setSeg($('shape'), state.s.shape); update(); refreshVals(); });
$('harm').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.s.k = +b.dataset.v; setSeg($('harm'), state.s.k); update(); });
$('reseed').addEventListener('click', () => { state.seed += 1; update(); });

/** Time unit: τ keeps its ratio to T, so the response does not change, only the numbers on the axis. */
$('unit').addEventListener('click', e => {
  const b = e.target.closest('button'), st = state.s;
  if (!b || b.dataset.v === st.unit) return;
  const T = b.dataset.v === 'T' ? 1 : 60;
  for (const s of st.species) { s.tau *= T / st.T; if (s.tauOff != null) s.tauOff *= T / st.T; }
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
/** Spectral axis: bands keep their place relative to the axis, in every slot. */
$('axis').addEventListener('change', e => {
  const st = state.s;
  for (const s of st.species) s.band = mapAxis(s.band, st.axis, e.target.value);
  st.axis = e.target.value;
  renderSpecies(); update();
});

/* sweep φ at the chosen speed, in degrees per second */
let playing = false, raf = 0, acc = 0, last = 0;
$('play').addEventListener('click', () => {
  playing = !playing;
  $('play').textContent = playing ? '❚❚ pause' : '▶ sweep φ';
  renderRail();
  last = 0; acc = state.s.phi;
  const stepFn = t => {
    if (!playing) return;
    if (last) {
      acc = (acc + state.speed * (t - last) / 1000) % 360;
      if (Math.round(acc) % 360 !== state.s.phi) setPhi(acc);
    }
    last = t;
    raf = requestAnimationFrame(stepFn);
  };
  if (playing) raf = requestAnimationFrame(stepFn); else cancelAnimationFrame(raf);
});
window.addEventListener('shell:resize', () => { fitWorkbench(); draw(); });

/* ---------------------------------------------------------------------------
   Start: texts once (their citation markers are numbered once), then a case
   --------------------------------------------------------------------------- */
$('axis').innerHTML = Object.entries(AXES).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join('');
$('general').innerHTML = GENERAL;
$('equations').innerHTML = `<h2>Equations</h2>${EQ.psd}${EQ.tcon}${EQ.lag}${EQ.square}`;
$('caseTexts').innerHTML = CASES.map(c => `<div>${c.text}</div>`).join('');
renderCitations([$('general'), $('subSpecFold'), $('subSpecAll'), $('subPhase'), $('equations'), $('caseTexts')], $('refs'), SOURCES);
fillVctls(document);
const wanted = new URLSearchParams(location.search).get('case');
const start = Math.max(0, CASES.findIndex(c => c.id === wanted));
// the footer goes under the text in the centre, which is what scrolls on a wide screen
$('below').append(document.querySelector('.site-footer'));
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fitWorkbench(); selectCase(start, false); });

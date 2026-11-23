/**
 * Mock data for the demos on a data matrix (SVD and rank, and MCR-ALS to
 * come): a series of spectra of a mixture whose composition changes in
 * time, built as X = C Sᵀ + baseline + noise. Every number is illustrative.
 *
 *   Spectral axis: generic (a position from 0 to 60), IR (1800 to 1200
 *   cm⁻¹, one Gaussian band per species) or XAS (energy around an edge: a
 *   normalised step plus a white line per species). The same three numbers
 *   describe a species on every axis: centre, width (FWHM of the band or
 *   white line) and height; switching the axis maps them across.
 *   Species A, B, C, D, each switched on or off. A species can shift with
 *   its own concentration (shift in axis units at full concentration),
 *   which breaks the bilinear model.
 *   Concentrations: A → B → C, first order with k₁ and k₂, A starting at 1:
 *     A = e^(−k₁t), B = k₁/(k₂ − k₁) (e^(−k₁t) − e^(−k₂t)), C = 1 − A − B.
 *   D follows C exactly ('C', two species with one profile) or grows
 *   linearly over the run ('ramp').
 *   Baseline: a slope over the spectral range that grows linearly in time.
 *   Noise: Gaussian, standard deviation sigma, from a seeded generator.
 */

export const AXES = {
  generic: { from: 0, to: 60, label: 'spectral position / –', name: 'generic, 0 to 60', ticks: [0, 10, 20, 30, 40, 50].map(v => [v, String(v)]), shape: 'band' },
  ir: { from: 1800, to: 1200, label: 'wavenumber / cm⁻¹', name: 'IR, 1800 to 1200 cm⁻¹', ticks: [1800, 1700, 1600, 1500, 1400, 1300].map(v => [v, String(v)]), shape: 'band' },
  xas: { from: -10, to: 30, label: 'energy − *E*_0_ / eV', name: 'XAS, around an edge', ticks: [-10, 0, 10, 20].map(v => [v, String(v)]), shape: 'edge' },
};
/** Points per spectrum, on every axis. */
export const NPTS = 241;
/** Length of the run in min. */
export const T_END = 60;

export const gridOf = axis => { const a = AXES[axis]; return Array.from({ length: NPTS }, (_, j) => a.from + (a.to - a.from) * j / (NPTS - 1)); };
export const spanOf = axis => Math.abs(AXES[axis].to - AXES[axis].from);
export const gauss = (x, c, w) => Math.exp(-4 * Math.LN2 * ((x - c) / w) ** 2);

/**
 * One species' spectrum at x. A band: h · Gaussian of FWHM w at c. An edge:
 * an arctan step of height 1 centred at c (width w/4) plus a white line of
 * height h and FWHM w just above it, at c + w/2.
 */
export function shapeAt(axis, x, c, w, h) {
  if (AXES[axis].shape === 'edge') return 0.5 + Math.atan((x - c) / (w / 4)) / Math.PI + h * gauss(x, c + w / 2, w);
  return h * gauss(x, c, w);
}

/** A species' centre, width and shift carried from one axis to another, as the MES cases page does. */
export function mapSpecies(sp, from, to) {
  const a = AXES[from], b = AXES[to], f = (b.to - b.from) / (a.to - a.from);
  return { ...sp, c: b.from + (sp.c - a.from) * f, w: sp.w * Math.abs(f), shift: (sp.shift ?? 0) * f };
}

export function rng(seed) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

export const timesOf = q => Array.from({ length: q }, (_, i) => (q > 1 ? i * T_END / (q - 1) : 0));

/** Concentration of each species at the times ts: { A, B, C, D } arrays. */
export function profiles(st, ts) {
  const { k1, k2 } = st;
  const A = ts.map(t => Math.exp(-k1 * t));
  const B = ts.map(t => {
    if (k1 === 0) return 0;
    if (Math.abs(k2 - k1) < 1e-9 * Math.max(k1, 1e-9)) return k1 * t * Math.exp(-k1 * t);
    return k1 / (k2 - k1) * (Math.exp(-k1 * t) - Math.exp(-k2 * t));
  });
  const C = ts.map((_, i) => Math.max(0, 1 - A[i] - B[i]));
  const D = st.dProfile === 'C' ? C.slice() : ts.map(t => t / T_END);
  return { A, B, C, D };
}

/** Pure spectrum of one species on the grid (zero when it is off). */
export const pureOf = (sp, axis, grid) => grid.map(x => (sp.on ? shapeAt(axis, x, sp.c, sp.w, sp.h) : 0));

/**
 * Build the data matrix X: rows are spectra in time order (q of them),
 * columns the points of the grid. Returns { grid, ts, prof, pure, clean, noise, X }.
 */
export function build(st, seed) {
  const grid = gridOf(st.axis), ts = timesOf(st.q), prof = profiles(st, ts), m = grid.length;
  const pure = Object.fromEntries(st.species.map(sp => [sp.key, pureOf(sp, st.axis, grid)]));
  const a = AXES[st.axis], slope = grid.map(x => (x - a.from) / (a.to - a.from));
  const g = rng(seed), clean = [], noise = [], X = [];
  for (let i = 0; i < ts.length; i++) {
    const row = new Float64Array(m), nz = new Float64Array(m), d = new Float64Array(m);
    for (const sp of st.species) {
      if (!sp.on) continue;
      const c = prof[sp.key][i];
      if (sp.shift) {   // the spectrum moves with its own concentration: no longer bilinear
        const at = sp.c + sp.shift * c;
        for (let j = 0; j < m; j++) row[j] += c * shapeAt(st.axis, grid[j], at, sp.w, sp.h);
      } else {
        const p = pure[sp.key];
        for (let j = 0; j < m; j++) row[j] += c * p[j];
      }
    }
    const b = st.drift * ts[i] / T_END;
    for (let j = 0; j < m; j++) {
      row[j] += b * slope[j];
      nz[j] = st.noise * g();
      d[j] = row[j] + nz[j];
    }
    clean.push(row); noise.push(nz); X.push(d);
  }
  return { grid, ts, prof, pure, clean, noise, X };
}

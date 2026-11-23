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
 *   Species A, B, C, D, each switched on or off (off: it takes part in the
 *   kinetics but adds nothing to the spectra). A species can shift with its
 *   own concentration (shift in axis units at full concentration), which
 *   breaks the bilinear model.
 *   Where each species comes from (src), set per species, in slot order so
 *   that a species can only depend on one above it:
 *     'start'    present from the start with the amount c0
 *     'from:X'   forms from X, first order with its own k: X → it at k·[X];
 *                several species can form from one (branching)
 *     'ramp'     grows linearly from 0 to 1 over the run
 *     'as:X'     exactly the profile of X (two species, one profile)
 *   The first-order network is integrated with fourth-order Runge–Kutta in
 *   steps far below the fastest time constant; for A → B → C it reproduces
 *   B = k₁/(k₂ − k₁) (e^(−k₁t) − e^(−k₂t)) to rounding.
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

/** The source of a species: { kind: 'start' | 'from' | 'ramp' | 'as', of: index or -1 }. */
export function sourceOf(st, i) {
  const src = st.species[i].src ?? 'start', [kind, key] = src.split(':');
  return { kind, of: key ? st.species.findIndex(s => s.key === key) : -1 };
}
/** Concentration of each species at the times ts: { A: [...], B: [...], … }. */
export function profiles(st, ts) {
  const sp = st.species, n = sp.length, src = sp.map((_, i) => sourceOf(st, i));
  const kin = src.map(s => s.kind === 'start' || s.kind === 'from');
  const y0 = sp.map((s, i) => (kin[i] ? s.c0 ?? 0 : 0));
  const rate = y => {
    const d = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const s = src[i];
      if (s.kind !== 'from' || s.of < 0 || !kin[s.of]) continue;
      const r = (sp[i].k ?? 0) * y[s.of];
      d[i] += r; d[s.of] -= r;
    }
    return d;
  };
  const kmax = Math.max(1e-6, ...sp.map(s => s.k ?? 0));
  const h0 = Math.min(0.05, 0.05 / kmax);
  const out = sp.map(() => new Array(ts.length).fill(0));
  let y = y0.slice(), t = 0;
  ts.forEach((target, j) => {
    while (t < target - 1e-12) {
      const h = Math.min(h0, target - t);
      const k1 = rate(y), k2 = rate(y.map((v, i) => v + h / 2 * k1[i])), k3 = rate(y.map((v, i) => v + h / 2 * k2[i])), k4 = rate(y.map((v, i) => v + h * k3[i]));
      y = y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
      t += h;
    }
    for (let i = 0; i < n; i++) if (kin[i]) out[i][j] = Math.max(0, y[i]);
  });
  for (let i = 0; i < n; i++) {
    if (src[i].kind === 'ramp') out[i] = ts.map(tt => tt / T_END);
    else if (src[i].kind === 'as' && src[i].of >= 0 && src[i].of < i) out[i] = out[src[i].of].slice();
  }
  return Object.fromEntries(sp.map((s, i) => [s.key, out[i]]));
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

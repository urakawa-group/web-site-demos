/**
 * Mock data for the demos on a data matrix (SVD and rank, and MCR-ALS to
 * come): a series of spectra of a mixture whose composition changes in
 * time, built as D = C Sᵀ + baseline + noise. Every number is illustrative.
 *
 *   Species A, B, C, D, each one Gaussian band (centre, FWHM, height in
 *   absorbance) and switched on or off.
 *   Concentrations: A → B → C, first order with k₁ and k₂, A starting at 1:
 *     A = e^(−k₁t), B = k₁/(k₂ − k₁) (e^(−k₁t) − e^(−k₂t)), C = 1 − A − B.
 *   D follows C exactly ('C', two species with one profile) or grows
 *   linearly over the run ('ramp').
 *   Baseline: a slope over the spectral range that grows linearly in time.
 *   Noise: Gaussian, standard deviation sigma, from a seeded generator.
 */

/** Spectral grid: 1800 → 1200 cm⁻¹ in steps of 2.5 cm⁻¹ (241 points). */
export const NU = Array.from({ length: 241 }, (_, j) => 1800 - 2.5 * j);
/** Length of the run in min. */
export const T_END = 60;
export const KEYS = ['A', 'B', 'C', 'D'];

export const gauss = (x, c, w) => Math.exp(-4 * Math.LN2 * ((x - c) / w) ** 2);

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

/** Pure spectrum of one species on NU (zero when it is off). */
export const pureOf = sp => NU.map(x => (sp.on ? sp.h * gauss(x, sp.c, sp.w) : 0));

/** The baseline's spectral shape: 0 at 1200 cm⁻¹, 1 at 1800 cm⁻¹. */
export const slope = NU.map(x => (x - 1200) / 600);

/**
 * Build the data matrix: rows are spectra in time order (q of them), columns
 * the points of NU. Returns { ts, prof, pure, clean, noise, D, sigma }.
 */
export function build(st, seed) {
  const ts = timesOf(st.q), prof = profiles(st, ts);
  const pure = Object.fromEntries(st.species.map(sp => [sp.key, pureOf(sp)]));
  const g = rng(seed), m = NU.length;
  const clean = [], noise = [], D = [];
  for (let i = 0; i < ts.length; i++) {
    const row = new Float64Array(m), nz = new Float64Array(m), d = new Float64Array(m);
    for (const sp of st.species) {
      if (!sp.on) continue;
      const c = prof[sp.key][i], p = pure[sp.key];
      for (let j = 0; j < m; j++) row[j] += c * p[j];
    }
    const b = st.drift * ts[i] / T_END;
    for (let j = 0; j < m; j++) {
      row[j] += b * slope[j];
      nz[j] = st.noise * g();
      d[j] = row[j] + nz[j];
    }
    clean.push(row); noise.push(nz); D.push(d);
  }
  return { ts, prof, pure, clean, noise, D };
}

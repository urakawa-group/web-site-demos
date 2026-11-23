/**
 * What the three pages of the rank topic share (SVD, PCA, EFA): the
 * settings of the mock data and their controls (species cards, kinetics,
 * measurement), the preprocessing, the data panel, heat maps, the live
 * matrix-operation panel, and the technique switch that carries the data
 * from one page to the next. The data themselves come from mixture.js.
 */
import { C, CHART, typeFont } from '../../../assets/tokens.js';
import { plot, ticks, richText } from '../../../assets/plot.js';
import { clamp, setSeg } from '../../../assets/workbench.js';
import { AXES, NPTS, T_END, spanOf, mapSpecies } from './mixture.js';

export const $ = id => document.getElementById(id);
export const clone = o => JSON.parse(JSON.stringify(o));
export const M = NPTS;

export const SOURCES = {
  ch29: {
    key: 'Wachs.SpringerHandbookAdvanced.2023',
    chapter: 'A. R. Passos, C. La Fontaine, A. Rochet and V. Briois, “Case Studies: Time-Resolved X-Ray Absorption Spectroscopy (XAS)”, Ch. 29, pp. 625–658',
    short: 'Passos et al. (Briois), Springer Handbook of Advanced Catalyst Characterization 2023, Ch. 29',
  },
  dejuan: { key: 'DeJuan.MultivariateCurveResolution.2014', lead: 'Tauler' },
  golshan: { key: 'Golshan.ResolutionRotationalAmbiguity.2011', lead: 'Maeder' },
  maeder: { key: 'Maeder.EvolvingFactorAnalysis.1988' },
};

/* ---------------------------------------------------------------------------
   The data settings, the same on every page:
   { axis, species: [{ key, label, on, c, w, h, shift }] × 4, k1, k2,
     dProfile, q, noise, drift }   (see mixture.js)
   A page adds its own keys (n, prep, views, …) on top.
   --------------------------------------------------------------------------- */
export const DATA_KEYS = ['axis', 'species', 'k1', 'k2', 'dProfile', 'q', 'noise', 'drift'];
const SP = (key, label, on, c, w, h) => ({ key, label, on, c, w, h, shift: 0 });
export const DATA_BASE = {
  axis: 'ir',
  species: [SP('A', 'A', true, 1650, 50, 0.6), SP('B', 'B, from A', true, 1500, 60, 0.5), SP('C', 'C, from B', true, 1350, 50, 0.7), SP('D', 'D', false, 1580, 40, 0.4)],
  k1: 0.08, k2: 0.04, dProfile: 'C', q: 60, noise: 0, drift: 0,
};
/** A case's settings: the page's base, some values changed, some species changed. */
export const caseOf = (base, o = {}, f = {}) => ({ ...base, ...o, species: base.species.map(s => ({ ...s, ...(f[s.key] ?? {}) })) });
/** The same species on the XAS axis, used by the XAS cases: edges 3 eV apart. */
export const XAS_SPECIES = { A: { c: 0, w: 8, h: 0.6 }, B: { c: 3, w: 8, h: 0.3 }, C: { c: 6, w: 8, h: 0.9 }, D: { c: 10, w: 8, h: 0.4 } };

export const COLOR = { A: C['data-a'], B: C['data-b'], C: C['data-c'], D: C['data-d'] };
export const PREP_NAME = { raw: 'raw', centre: 'centred', auto: 'autoscaled' };
export const KEPT = C['ink-700'], DROPPED = C['data-static'], CUT = C['data-highlight'], LEVEL = C['ink-300'];

/* ---------------------------------------------------------------------------
   Numbers
   --------------------------------------------------------------------------- */
/** What the decomposition sees: X itself, X minus the mean spectrum, or that divided by each column's standard deviation. */
export function prepare(X, noise, prep) {
  if (prep === 'raw') return { Xp: X, Np: noise, mean: null, sd: null };
  const q = X.length, mu = new Float64Array(M), nmu = new Float64Array(M), sd = new Float64Array(M).fill(1);
  for (const r of X) for (let j = 0; j < M; j++) mu[j] += r[j] / q;
  for (const r of noise) for (let j = 0; j < M; j++) nmu[j] += r[j] / q;
  if (prep === 'auto') {
    sd.fill(0);
    for (const r of X) for (let j = 0; j < M; j++) sd[j] += (r[j] - mu[j]) ** 2 / Math.max(q - 1, 1);
    for (let j = 0; j < M; j++) sd[j] = Math.sqrt(sd[j]) || 1;
  }
  return {
    Xp: X.map(r => r.map((x, j) => (x - mu[j]) / sd[j])),
    Np: noise.map(r => r.map((x, j) => (x - nmu[j]) / sd[j])),
    mean: mu, sd: prep === 'auto' ? sd : null,
  };
}
/** The residual of the rebuild from the first n components of an SVD r of Xp. */
export function residual(Xp, r, n) {
  const { s, u, v } = r;
  return Xp.map((row, i) => {
    const e = Float64Array.from(row);
    for (let k = 0; k < Math.min(n, s.length); k++) { const a = s[k] * u[k][i], vk = v[k]; for (let j = 0; j < M; j++) e[j] -= a * vk[j]; }
    return e;
  });
}
export const fmtS = v => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v >= 1e-3 ? v.toFixed(3) : v.toExponential(1));
export const fmtPct = v => (v < 0.001 ? '< 0.001' : v.toPrecision(3));

/* ---------------------------------------------------------------------------
   Drawing helpers
   --------------------------------------------------------------------------- */
export const SC = () => (document.documentElement.dataset.w === 'wide' ? CHART.workbenchScale : 1);
export const T_TICKS = ticks(0, T_END, 6, v => v.toFixed(0)).filter(([v]) => v < T_END);   // no label at the right edge, where it would be cut
export const XLAB_T = 'time / min';
export const axOf = st => AXES[st.axis];
export const xRangeOf = st => [AXES[st.axis].from, AXES[st.axis].to];
export const LOG_TICKS = [[-4, '10⁻⁴'], [-3, '10⁻³'], [-2, '0.01'], [-1, '0.1'], [0, '1'], [1, '10'], [2, '100'], [3, '10³']];

/** The HTML of a legend; legend() writes it, the legend reserve measures it. */
export const legendHtml = items => items.filter(Boolean).map(([label, color, cls]) => `<span class="${cls}" style="--c:${color}">${label}</span>`).join('');
export const legend = (el, items) => { el.innerHTML = legendHtml(items); };

const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (c1, c2, f) => hexRgb(c1).map((x, i) => x + (hexRgb(c2)[i] - x) * f);
/** Diverging blue, white, red (cmocean balance), full at ±max. */
export function colourOf(v, max) {
  const t = clamp(v / (max || 1), -1, 1), a = Math.abs(t);
  const [mid, end] = t >= 0 ? [C['map-pos'], C['map-pos-strong']] : [C['map-neg'], C['map-neg-strong']];
  return a <= 0.5 ? mix(C.surface, mid, a * 2) : mix(mid, end, (a - 0.5) * 2);
}
/** Paint rows × cols values into a rectangle of a canvas context. */
export function paintMap(ctx, x, y, w, h, rows, cols, valueAt, max, smooth = true) {
  const off = document.createElement('canvas'); off.width = cols; off.height = rows;
  const octx = off.getContext('2d'), img = octx.createImageData(cols, rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const [R, G, B] = colourOf(valueAt(r, c), max), o = 4 * (r * cols + c);
    img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(off, x, y, w, h);
}
/** A heat map in a plot: rows upwards (the first row at the bottom). */
export function heatmap(canvas, opts, rows, cols, valueAt, max) {
  const p = plot(canvas, opts);
  paintMap(p.ctx, p.inner.l, p.inner.t, p.inner.r - p.inner.l, p.inner.b - p.inner.t, rows, cols, (r, c) => valueAt(rows - 1 - r, c), max);
  p.axes();
  return p;
}
export const MAP_LEGEND = max => [[`positive, full red at ${fmtS(max)}`, C['map-pos'], 'bar'], [`negative, full blue at −${fmtS(max)}`, C['map-neg'], 'bar']];

/**
 * Limits of the data panel and the maps: from the data when a case is
 * picked or the axis or preprocessing changes, never from a slider.
 */
export function dataLimits(Xp, pure) {
  let lo = 0, hi = 0, ab = 0, pmax = 0;
  for (const row of Xp) for (const x of row) { lo = Math.min(lo, x); hi = Math.max(hi, x); ab = Math.max(ab, Math.abs(x)); }
  for (const p of Object.values(pure)) for (const x of p) pmax = Math.max(pmax, x);
  const pad = 0.08 * (hi - lo || 1);
  return { y: [lo - pad, hi + pad], map: ab || 1, pure: 1.15 * Math.max(pmax, 0.1) };
}

/**
 * Panel 1 on every page: the data as the decomposition sees it, as spectra
 * or a map, or the species that made them. Returns the plot (spectra view)
 * so a page can draw on top, and fills the subtitle and legend.
 */
export function drawData(cv, { st, B, Xp, lim, view, ylabel, what = '', after }) {
  const sc = SC(), ax = axOf(st), { grid, ts, prof, pure } = B;
  if (view === 'map') {
    heatmap(cv, { x: xRangeOf(st), y: [0, T_END], xlabel: ax.label, ylabel: XLAB_T, xticks: ax.ticks, yticks: T_TICKS, scale: sc }, Xp.length, M, (i, j) => Xp[i][j], lim.map);
    return { p: null, sub: `The same ${st.q} spectra${what}, as a map, time upwards.`, leg: MAP_LEGEND(lim.map) };
  }
  if (view === 'truth') {
    const W = cv.clientWidth, on = st.species.filter(sp => sp.on);
    const p = plot(cv, { x: [0, T_END], y: [0, 1.08], margin: { r: W / 2 + 8 }, xlabel: XLAB_T, ylabel: 'concentration / –', xticks: ticks(0, T_END, 3, v => v.toFixed(0)).filter(([v]) => v < T_END), yticks: ticks(0, 1, 4), scale: sc });
    for (const sp of on) p.line(ts, prof[sp.key], COLOR[sp.key]);
    p.axes();
    const p2 = plot(cv, { keep: true, x: xRangeOf(st), y: [0, lim.pure], margin: { l: W / 2 + 46 * sc }, xlabel: ax.label, xticks: ax.ticks.filter((_, i) => i % 2 === 0), yticks: ticks(0, lim.pure, 3), scale: sc });
    for (const sp of on) p2.line(grid, pure[sp.key], COLOR[sp.key]);
    p2.axes();
    return { p: null, sub: 'What made the data: concentrations (left), pure spectra (right).', leg: on.map(sp => [sp.label, COLOR[sp.key], '']) };
  }
  const p = plot(cv, { x: xRangeOf(st), y: lim.y, xlabel: ax.label, ylabel, xticks: ax.ticks, yticks: ticks(lim.y[0], lim.y[1], 4), scale: sc });
  p.hline(0);
  for (const row of Xp) p.line(grid, row, C['data-faint'], CHART.lineFaint);
  p.line(grid, Xp[0], KEPT, CHART.lineData);
  p.line(grid, Xp[Xp.length - 1], KEPT, CHART.lineData, [2, 2]);
  after?.(p);
  p.axes();
  return { p, sub: `${st.q} spectra over ${T_END} min${what}.`, leg: [['one spectrum', C['data-faint'], ''], ['the first', KEPT, ''], ['the last', KEPT, 'dashed']] };
}
/** Every legend panel 1 can show, for the legend reserve. */
export const dataLegends = (st, lim) => [
  legendHtml([['one spectrum', C['data-faint'], ''], ['the first', KEPT, ''], ['the last', KEPT, 'dashed']]),
  legendHtml(MAP_LEGEND(lim.map)),
  legendHtml(st.species.filter(sp => sp.on).map(sp => [sp.label, COLOR[sp.key], ''])),
];

/* ---------------------------------------------------------------------------
   The matrix operation, drawn live: every block holds its actual numbers as
   a colour map, the long sides drawn to the number of spectra and points,
   the short ones (components) a fixed size per component.

   terms: an array of
     { label, sub?, rows, cols, at(r, c), max?, scale?, h, w, fade? }
       h: 'q' (spectra) | 'n' (components) | '1'; w: 'm' (points) | 'n' | '1'
       rows, cols: the true size, written under the block
       at(r, c): the value; max: the colour scale (else the block's own largest |value|)
       scale: 'log' for a diagonal of singular values (shade by log σ)
       fade: { fromCol, fromRow, rows: [a, b] }: what is dropped or outside, drawn pale
       role: 'data' | 'score' | 'load' | 'diag': the fill of the static view (mode 'blocks'),
         where the name sits inside the block as in the phd_ui matrix figures
     or a string: an operator ('=', '−', '+', '≈', '→') or ' ' for a gap
   --------------------------------------------------------------------------- */
export function drawBlocks(cv, terms, { title = '', note = '', mode = 'numbers' } = {}) {
  const W = cv.clientWidth, H = cv.clientHeight, zoom = parseFloat(document.body.style.zoom) || 1, d = (window.devicePixelRatio || 1) * zoom;
  cv.width = Math.round(W * d); cv.height = Math.round(H * d);
  const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
  const sc = SC(), opW = 26 * sc, gapW = 18 * sc, padL = 8, padR = 8, top = 30 * sc, bottom = 26 * sc;
  const blocks = terms.filter(t => typeof t === 'object');
  const opsW = terms.reduce((a, t) => a + (typeof t === 'string' ? (t === ' ' ? gapW : opW) : 0), 0);
  const mUnits = blocks.filter(b => b.w === 'm').length;
  const nCols = blocks.reduce((a, b) => a + (b.w === 'n' ? b.cols : b.w === '1' ? 1 : 0), 0);
  // a component is a small fixed width, but never so wide that a block of m points is less than ten of them
  const cell = Math.max(3, Math.min(13 * sc, (W - padL - padR - opsW) / (10 * mUnits + nCols)));
  const fixedW = opsW + nCols * cell;
  const sx = Math.max(10, (W - padL - padR - fixedW) / Math.max(mUnits, 1));   // the width of one block of m points
  const sy = Math.max(20, H - top - bottom);                                       // the height of one block of q spectra
  const font = w => typeFont('annotation').font.replace(/^(italic )?\d+/, `$1${w}`).replace(/(\d+(?:\.\d+)?)px/, (_, n) => `${+n * sc}px`);
  const tick = typeFont('tick').font.replace(/(\d+(?:\.\d+)?)px/, (_, n) => `${+n * sc}px`);
  let x = padL;
  for (const t of terms) {
    if (typeof t === 'string') {
      if (t !== ' ') { ctx.fillStyle = C['ink-500']; ctx.font = font(400).replace(/(\d+(?:\.\d+)?)px/, (_, n) => `${+n * 1.5}px`); ctx.textAlign = 'center'; ctx.fillText(t, x + opW / 2, top + sy / 2 + 6 * sc); }
      x += t === ' ' ? gapW : opW;
      continue;
    }
    const w = t.w === 'm' ? sx : (t.w === 'n' ? t.cols : 1) * cell;
    const h = t.h === 'q' ? sy : (t.h === 'n' ? t.rows : 1) * cell;
    let max = t.max;
    if (max == null) { max = 0; for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) max = Math.max(max, Math.abs(t.at(r, c))); }
    const static_ = mode === 'blocks', fill = C[`block-${t.role ?? 'data'}`], edge = C[`block-${t.role ?? 'data'}-edge`];
    if (static_) {
      ctx.fillStyle = fill; ctx.fillRect(x, top, w, h);
      if (t.role === 'diag') {   // a diagonal: only the diagonal cells filled
        ctx.fillStyle = C.surface; ctx.fillRect(x, top, w, h);
        ctx.fillStyle = fill;
        for (let k = 0; k < t.rows; k++) ctx.fillRect(x + w * k / t.cols, top + h * k / t.rows, w / t.cols, h / t.rows);
      }
    } else if (t.scale === 'log') {
      const lo = Math.log10(Math.max(t.floor ?? max * 1e-4, 1e-300)), hi = Math.log10(max || 1);
      paintMap(ctx, x, top, w, h, t.rows, t.cols, (r, c) => (r === c ? clamp((Math.log10(Math.max(t.at(r, c), 1e-300)) - lo) / (hi - lo || 1), 0.04, 1) : 0), 1, false);
    } else {
      paintMap(ctx, x, top, w, h, t.rows, t.cols, t.at, max, t.w === 'm' || t.h === 'q');
    }
    if (t.fade) {
      ctx.fillStyle = C.surface; ctx.globalAlpha = 0.72;
      const { fromCol, fromRow, rows } = t.fade;
      if (fromCol != null && fromCol < t.cols) { const fx = x + w * fromCol / t.cols; ctx.fillRect(fx, top, x + w - fx, h); }
      if (fromRow != null && fromRow < t.rows) { const fy = top + h * fromRow / t.rows; ctx.fillRect(x, fy, w, top + h - fy); }
      if (rows) { const [a, b] = rows; ctx.fillRect(x, top, w, h * a / t.rows); ctx.fillRect(x, top + h * b / t.rows, w, h * (t.rows - b) / t.rows); }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = static_ ? edge : C['ink-700']; ctx.lineWidth = static_ ? 1.5 : CHART.lineFrame; ctx.setLineDash([]);
    ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
    ctx.fillStyle = static_ ? edge : C['ink-900'];
    const inside = static_ && w > richText(ctx, t.label, 0, 0, font(700), 'left', false) + 8 && h > 18 * sc;
    richText(ctx, t.label, x + w / 2, inside ? top + h / 2 + 5 * sc : top - 8 * sc, font(700), 'center');
    ctx.fillStyle = C['ink-300'];
    richText(ctx, t.dim ?? `${t.rows} × ${t.cols}`, x + w / 2, top + h + 16 * sc, tick, 'center');
    if (t.sub) { ctx.fillStyle = C['ink-500']; richText(ctx, t.sub, x + w / 2, top + h + 30 * sc, tick, 'center'); }
    x += w;
  }
  if (title) { ctx.fillStyle = C['ink-500']; richText(ctx, title, padL, H - 6, font(400), 'left'); }
  if (note) { ctx.fillStyle = C['ink-500']; richText(ctx, note, W - padR, H - 6, font(400), 'right'); }
}
export const BLOCK_LEGEND = [['positive', C['map-pos'], 'bar'], ['negative', C['map-neg'], 'bar'], ['pale: dropped', C['line'], 'bar']];
export const BLOCK_LEGEND_STATIC = [['data', C['block-data'], 'bar'], ['scores', C['block-score'], 'bar'], ['loadings', C['block-load'], 'bar'], ['sizes', C['block-diag'], 'bar']];

/* ---------------------------------------------------------------------------
   Controls of the data: species cards, kinetics, measurement
   --------------------------------------------------------------------------- */
const kFromR = r => (r <= 0 ? 0 : 0.005 * Math.pow(200, (r - 1) / 99));
const rFromK = k => (k <= 0 ? 0 : clamp(Math.round(1 + 99 * Math.log(k / 0.005) / Math.log(200)), 1, 100));
export const lin = (min, max, step, d) => ({ min, max, step, toR: v => v, fromR: r => r, fmt: v => (+v).toFixed(d) });

/**
 * The data controls of a page. state.s holds the settings, caseS() the
 * case's. Returns { bind(key), caseSp(i), slotChanged(i), renderSpecies(),
 * summaries(), onAxis(to) }; the page calls attach(controls, hooks) once its
 * value controls exist.
 */
export function dataControls(state, caseS) {
  const st = () => state.s;
  const caseSp = i => (st().axis === caseS().axis ? caseS().species[i] : mapSpecies(caseS().species[i], caseS().axis, st().axis));
  const slotChanged = i => JSON.stringify(st().species[i]) !== JSON.stringify(caseSp(i)) || (i === 3 && st().dProfile !== caseS().dProfile);
  function spBind(f, i) {
    const sp = () => st().species[i], a = AXES[st().axis], span = spanOf(st().axis);
    const lo = Math.min(a.from, a.to), hi = Math.max(a.from, a.to), d = span >= 100 ? 0 : 1, unit = st().axis === 'ir' ? 'cm⁻¹' : st().axis === 'xas' ? 'eV' : '';
    const g = {
      c: { label: 'centre', unit, ...lin(lo, hi, span / 240, d), def: (lo + hi) / 2 },
      w: { label: 'width', unit, ...lin(span / 120, span / 2, span / 240, d), def: span / 12 },
      h: { label: st().axis === 'xas' ? 'white line' : 'height', unit: '', ...lin(0, 1.5, 0.01, 2), def: 0.5 },
      shift: { label: 'shift at full', unit, ...lin(-span / 15, span / 15, span / 240, d), def: 0 },
    }[f];
    return { ...g, get: () => sp()[f], set: v => { sp()[f] = clamp(v, g.min, g.max); }, caseV: () => caseSp(i)[f], off: () => !sp().on, redraw: 'update' };
  }
  function bind(key) {
    if (key.includes(':')) { const [f, i] = key.split(':'); return spBind(f, +i); }
    if (key === 'k1' || key === 'k2') return {
      label: key === 'k1' ? '<i>k</i>₁, A → B' : '<i>k</i>₂, B → C', unit: 'min⁻¹', min: 0, max: 100, step: 1,
      get: () => st()[key], set: v => { st()[key] = clamp(v, 0, 1); }, toR: rFromK, fromR: kFromR,
      fmt: v => v.toFixed(3), caseV: () => caseS()[key], def: key === 'k1' ? 0.08 : 0.04, redraw: 'update',
    };
    if (key === 'q') return { label: 'spectra <i>q</i>', unit: '', ...lin(10, 120, 1, 0), get: () => st().q, set: v => { st().q = clamp(Math.round(v), 10, 120); }, caseV: () => caseS().q, def: 60, redraw: 'update' };
    if (key === 'noise') return {
      label: 'noise <i>ε</i>', unit: '', min: 0, max: 40, step: 1,
      get: () => st().noise, set: v => { st().noise = clamp(v, 0, 0.05); }, toR: v => Math.round(v / 0.0005), fromR: r => r * 0.0005,
      fmt: v => v.toFixed(4), caseV: () => caseS().noise, def: 0, redraw: 'update',
    };
    if (key === 'drift') return { label: 'baseline drift', unit: '', ...lin(0, 0.3, 0.01, 2), get: () => st().drift, set: v => { st().drift = clamp(v, 0, 0.5); }, caseV: () => caseS().drift, def: 0, redraw: 'update' };
    return null;
  }

  const folded = new Set(['A', 'B', 'C', 'D']);
  const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function slotCard(sp, i) {
    const f = folded.has(sp.key);
    const prof = sp.key === 'D' ? `<label class="ctl wide"><span>concentration</span><select data-f="dProfile">
        <option value="C"${st().dProfile === 'C' ? ' selected' : ''}>exactly as C</option>
        <option value="ramp"${st().dProfile === 'ramp' ? ' selected' : ''}>grows over the run</option></select></label>` : '';
    return `<div class="sp-card${sp.on ? '' : ' off'}${f ? ' folded' : ''}" data-i="${i}" style="--c:${COLOR[sp.key]}">
      <div class="sp-top">
        <label class="switch" title="${sp.on ? 'in the sample: click to take it out' : 'not in the sample: click to add it'}"><input type="checkbox" data-f="on"${sp.on ? ' checked' : ''}><span></span></label>
        <span class="sp-swatch"></span>
        ${f ? `<span class="sp-label">${esc(sp.label)}</span>` : `<input type="text" data-f="label" value="${esc(sp.label)}" aria-label="name">`}
        <button type="button" class="sp-fold" data-f="fold" aria-expanded="${!f}" title="${f ? 'Show the settings of this species' : 'Fold this species to its name'}">${f ? '▸' : '▾'}</button>
        <button type="button" class="rst" data-f="resetSlot" title="this species back to the case"${slotChanged(i) ? '' : ' hidden'}>↺</button>
      </div>
      <div class="sp-body">
        ${prof}
        <div class="ctl vctl wide" data-k="c:${i}"></div>
        <div class="ctl vctl wide" data-k="w:${i}"></div>
        <div class="ctl vctl wide" data-k="h:${i}"></div>
        <div class="ctl vctl wide" data-k="shift:${i}"></div>
      </div>
    </div>`;
  }
  let controls = null, hooks = null;
  function renderSpecies() { $('species').innerHTML = st().species.map(slotCard).join(''); controls?.fill($('species')); }
  function attach(c, h) {
    controls = c; hooks = h;
    $('species').addEventListener('input', e => {
      const t = e.target, card = t.closest('.sp-card');
      if (!card || t.dataset.f !== 'label') return;
      st().species[+card.dataset.i].label = t.value;
      hooks.labels();
    });
    $('species').addEventListener('change', e => {
      const t = e.target, f = t.dataset.f, card = t.closest('.sp-card');
      if (!card) return;
      const sp = st().species[+card.dataset.i];
      if (f === 'on') sp.on = t.checked;
      else if (f === 'dProfile') st().dProfile = t.value;
      else return;
      renderSpecies(); hooks.update();
    });
    $('species').addEventListener('click', e => {
      const t = e.target.closest('[data-f]'), card = e.target.closest('.sp-card');
      if (!card) return;
      const i = +card.dataset.i, key = st().species[i].key;
      if (t?.dataset.f === 'fold') { if (folded.has(key)) folded.delete(key); else folded.add(key); renderSpecies(); hooks.changed(); return; }
      if (t?.dataset.f === 'resetSlot') {
        st().species[i] = clone(caseSp(i));
        if (i === 3) st().dProfile = caseS().dProfile;
        renderSpecies(); hooks.update(); return;
      }
      if (card.classList.contains('folded') && !e.target.closest('.switch')) { folded.delete(key); renderSpecies(); hooks.changed(); }
    });
    $('axis').innerHTML = Object.entries(AXES).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join('');
    $('axis').addEventListener('change', e => {
      const to = e.target.value;
      st().species = st().species.map(sp => mapSpecies(sp, st().axis, to));
      st().axis = to;
      renderSpecies(); hooks.relimit();
    });
    $('reseed').addEventListener('click', () => { state.seed += 1; hooks.update(); });
  }
  /** After every refresh: the axis select, the off state and names of the cards, and each card's ↺. */
  function refresh() {
    $('axis').value = st().axis;
    document.querySelectorAll('.sp-card').forEach((card, i) => {
      const sp = st().species[i];
      card.classList.toggle('off', !sp.on);
      const lab = card.querySelector('.sp-label'); if (lab) lab.textContent = sp.label;
      const rst = card.querySelector('[data-f="resetSlot"]'); if (rst) rst.hidden = !slotChanged(i);
    });
  }
  const summaries = () => ({
    species: st().species.filter(s => s.on).map(s => s.key).join(' ') || 'none on',
    kinetics: `<i>k</i>₁ ${st().k1.toFixed(3)} · <i>k</i>₂ ${st().k2.toFixed(3)}`,
    measurement: `${st().axis === 'generic' ? 'generic' : st().axis.toUpperCase()} · <i>q</i> ${st().q} · <i>ε</i> ${st().noise.toFixed(4)} · drift ${st().drift.toFixed(2)}`,
  });
  return { bind, caseSp, slotChanged, renderSpecies, attach, refresh, summaries };
}

/* ---------------------------------------------------------------------------
   The technique switch: the same data on the sibling page
   --------------------------------------------------------------------------- */
export const TECHNIQUES = [['svd', 'SVD'], ['pca', 'PCA'], ['efa', 'EFA']];
/** Wire the switch: a click opens the sibling page with the current data in the address. */
export function techniqueSwitch(current, state) {
  setSeg($('techSeg'), current);
  $('techSeg').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.dataset.v === current) return;
    const data = Object.fromEntries(DATA_KEYS.map(k => [k, state.s[k]]));
    location.href = `../${b.dataset.v}/index.html?data=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))))}`;
  });
}
/** Data carried over from a sibling page, if the address has any. */
export function carriedData() {
  const raw = new URLSearchParams(location.search).get('data');
  if (!raw) return null;
  try {
    const d = JSON.parse(decodeURIComponent(escape(atob(raw))));
    return Object.fromEntries(DATA_KEYS.filter(k => k in d).map(k => [k, d[k]]));
  } catch { return null; }
}

/* ---------------------------------------------------------------------------
   Formula boxes
   --------------------------------------------------------------------------- */
export const frac = (num, den) => `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
export const sum = (lo, hi) => `<span class="int">Σ<span class="lims"><span>${hi}</span><span>${lo}</span></span></span>`;
export const callout = ({ title, math, text, symbols }) => `<div class="eq-callout">
  <div class="eq-head">${title}</div>
  <div class="eq-math">${math}</div>
  <p class="eq-text">${text}</p>
  <dl class="eq-symbols">${symbols.map(([sym, what]) => `<dt>${sym}</dt><dd>${what}</dd>`).join('')}</dl>
</div>`;
/** The bilinear model, the same box on every page. */
export const EQ_BILINEAR = callout({
  title: 'The Bilinear Model',
  math: '<b>X</b> = <b>C</b> <b>S</b><sup>T</sup> + <b>E</b>',
  text: 'Each spectrum is the sum of the pure spectra, each weighted by its concentration [@ch29, Eq. 29.1, p. 626] [@dejuan, Eq. 3, p. 4964]. Both sources write the data as <b>D</b>; these pages write <b>X</b>. It holds wherever the signal is linear in concentration, as absorbance is under the Beer–Lambert law.',
  symbols: [
    ['<b>X</b>', 'the data, <i>q</i> × <i>m</i>: one row per spectrum, one column per point of the spectrum'],
    ['<b>C</b>', 'concentrations, <i>q</i> × <i>N</i>, one column per species'],
    ['<b>S</b>', 'pure spectra, <i>m</i> × <i>N</i>, one column per species'],
    ['<b>E</b>', 'what the model does not explain: ideally the noise alone'],
  ],
});
export const EQ_NOISE = callout({
  title: 'The Noise Level',
  math: '<i>σ</i><sub>noise</sub> ≈ <i>ε</i> (√<i>q</i> + √<i>m</i>)',
  text: 'The largest singular value of a <i>q</i> × <i>m</i> matrix of independent Gaussian noise with standard deviation <i>ε</i>, for large <i>q</i> and <i>m</i>: a standard result of random-matrix theory, not from the chapter. It holds for independent noise only, and not after autoscaling, which weights the noise differently at every point.',
  symbols: [['<i>q</i>, <i>m</i>', 'number of spectra and of points per spectrum (here 241)']],
});

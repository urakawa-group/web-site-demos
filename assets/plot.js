/**
 * A small canvas plot with the site's chart conventions built in: a closed
 * frame, ticks outside, axis labels as "quantity / unit", fonts and colours
 * from the type roles and colour tokens. Lengths are CSS px of the canvas.
 *
 *   const p = plot(canvas, { x: [0, 1], y: [-0.2, 1.2], xlabel: 'time / T', ... });
 *   p.line(xs, ys, C['data-a']);
 */
import { C, CHART, typeFont } from './tokens.js';

export function plot(canvas, o) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  // backing store at device pixels, including presentation zoom, so lines stay sharp
  const zoom = parseFloat(document.body.style.zoom) || 1;
  const d = (window.devicePixelRatio || 1) * zoom;
  canvas.width = Math.round(W * d);
  canvas.height = Math.round(H * d);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const m = { ...CHART.margin, ...(o.margin ?? {}) };
  const [x0, x1] = o.x, [y0, y1] = o.y;
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
  const Y = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
  const inner = { l: m.l, r: W - m.r, t: m.t, b: H - m.b };

  const tick = typeFont('tick'), axis = typeFont('axis'), note = typeFont('annotation');

  const api = {
    ctx, X, Y, W, H, inner,
    /** Fill the background between two x values, e.g. a half-period. */
    shadeX(xa, xb, color) {
      const a = Math.max(X(xa), inner.l), b = Math.min(X(xb), inner.r);
      if (b <= a) return;
      ctx.fillStyle = color;
      ctx.fillRect(a, inner.t, b - a, inner.b - inner.t);
    },
    hline(y, color = C['line-zero'], w = 1) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(inner.l, Y(y)); ctx.lineTo(inner.r, Y(y)); ctx.stroke();
    },
    vline(x, color = C['ink-700'], w = 1, dash = [3, 3]) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(X(x), inner.t); ctx.lineTo(X(x), inner.b); ctx.stroke(); ctx.setLineDash([]);
    },
    line(xs, ys, color, w = CHART.lineData, dash = []) {
      ctx.save();
      ctx.beginPath(); ctx.rect(inner.l, inner.t, inner.r - inner.l, inner.b - inner.t); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < xs.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(xs[i]), Y(ys[i]));
      ctx.stroke();
      ctx.restore();
    },
    /** A step trace (drawstyle steps-post), for an on/off stimulus. */
    steps(xs, ys, color, w = CHART.lineThin, dash = CHART.dash) {
      const sx = [], sy = [];
      for (let i = 0; i < xs.length; i++) {
        if (i) { sx.push(xs[i]); sy.push(ys[i - 1]); }
        sx.push(xs[i]); sy.push(ys[i]);
      }
      api.line(sx, sy, color, w, dash);
    },
    dot(x, y, color, r = CHART.marker) {
      ctx.fillStyle = color; ctx.strokeStyle = C.surface; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(X(x), Y(y), r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    },
    /** A label on the data, on a surface-coloured box so a trace under it does not cut it. */
    text(s, x, y, color = note.color, align = 'center', font = note.font) {
      ctx.font = font; ctx.textAlign = align;
      const w = ctx.measureText(s).width, px = X(x), py = Y(y);
      const left = align === 'center' ? px - w / 2 : align === 'right' ? px - w : px;
      ctx.fillStyle = C.surface; ctx.globalAlpha = 0.85;
      ctx.fillRect(left - 3, py - 12, w + 6, 16);
      ctx.globalAlpha = 1; ctx.fillStyle = color;
      ctx.fillText(s, px, py);
    },
    /** Frame, ticks and labels. Call last, so the frame sits on top. */
    axes() {
      ctx.setLineDash([]);
      ctx.strokeStyle = C['ink-700']; ctx.lineWidth = CHART.lineFrame;
      ctx.strokeRect(inner.l + 0.5, inner.t + 0.5, inner.r - inner.l - 1, inner.b - inner.t - 1);
      ctx.font = tick.font; ctx.fillStyle = tick.color;
      ctx.textAlign = 'center';
      for (const [v, s] of o.xticks ?? []) {
        const px = X(v);
        ctx.beginPath(); ctx.moveTo(px, inner.b); ctx.lineTo(px, inner.b + 4); ctx.stroke();
        ctx.fillText(s, px, inner.b + 17);
      }
      ctx.textAlign = 'right';
      for (const [v, s] of o.yticks ?? []) {
        const py = Y(v);
        ctx.beginPath(); ctx.moveTo(inner.l - 4, py); ctx.lineTo(inner.l, py); ctx.stroke();
        ctx.fillText(s, inner.l - 7, py + 4);
      }
      ctx.font = axis.font; ctx.fillStyle = axis.color; ctx.textAlign = 'center';
      if (o.xlabel) ctx.fillText(o.xlabel, (inner.l + inner.r) / 2, H - 5);
      if (o.ylabel) {
        ctx.save(); ctx.translate(13, (inner.t + inner.b) / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText(o.ylabel, 0, 0); ctx.restore();
      }
    },
  };
  return api;
}

/** Evenly spaced ticks with tidy labels. */
export function ticks(a, b, n = 5, fmt = v => String(+v.toFixed(3))) {
  const span = Math.abs(b - a), raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const s = [1, 2, 2.5, 5, 10].map(f => f * p).find(f => f >= raw) ?? 10 * p;
  const lo = Math.ceil(Math.min(a, b) / s) * s, out = [];
  for (let v = lo; v <= Math.max(a, b) + 1e-9; v += s) out.push([v, fmt(Math.abs(v) < 1e-12 ? 0 : v)]);
  return out;
}

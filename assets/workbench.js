/**
 * The workbench: what every page with cases or inputs shares on a wide
 * screen. Settings left, values right, the centre scrolling on its own and
 * the plots in it sized to the window. See AGENTS.md for the rules it keeps.
 *
 * A page provides the markup (ids below) and its engine; this module wires:
 *
 *   fitWorkbench()          the heights: workbench to the window, stage to the centre
 *   initWorkbench(o)        footer into the centre, resize, panel collapse and rail
 *   valueControls(o)        sliders with a typed number, ↺ to the case, double-click default
 *   foldingGroups(sum)      left-panel groups that fold on their heading
 *   caseSelector(o)         the case (or input) button, menu and hover texts
 *   tooltip                 one floating tooltip, for case texts and points in a plot
 *   setSeg(el, v)           mark the chosen button of a segmented control
 *   markMaxima(p, …)        drop lines and labels for maxima in a phase-domain plot
 *
 * Ids it expects: workbench, left, leftToggle, rail, wbMain, stage, below,
 * right, rightToggle, rightOpen, caseSelect, caseBtn, caseMenu, resetCase,
 * caseTexts, tip. Groups are `.sgroup[data-g]` with `.sg-toggle` and `.sg-sum`;
 * value controls are `.vctl[data-k]`.
 */
import { C } from './tokens.js';
import { richText } from './plot.js';

const $ = id => document.getElementById(id);
const zoomOf = () => parseFloat(document.body.style.zoom) || 1;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function setSeg(el, v) {
  el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
}

/* ---------------------------------------------------------------------------
   Heights and panels
   --------------------------------------------------------------------------- */
export function fitWorkbench() {
  const wb = $('workbench'), stage = $('stage'), wide = document.documentElement.dataset.w === 'wide';
  document.body.classList.toggle('wb-locked', wide);
  if (!wide) { wb.style.height = ''; stage.style.height = ''; return; }
  wb.style.height = `${Math.max(560, window.innerHeight / zoomOf() - wb.offsetTop)}px`;
  stage.style.height = `${$('wbMain').clientHeight}px`;
}

/**
 * initWorkbench({ redraw, renderRail }): the footer goes under the text in the
 * centre, the two panels collapse (right: gone, a tab brings it back; left:
 * to the rail the page draws in renderRail()), and every resize refits and
 * redraws. Returns the panel state, { left, right, set() }.
 */
export function initWorkbench({ redraw, renderRail }) {
  $('below').append(document.querySelector('.site-footer'));
  const panels = { left: true, right: true };
  panels.set = () => {
    const wb = $('workbench');
    wb.classList.toggle('left-closed', !panels.left);
    wb.classList.toggle('right-closed', !panels.right);
    $('rightOpen').hidden = panels.right;
    renderRail();
    fitWorkbench(); redraw();
  };
  $('leftToggle').addEventListener('click', () => { panels.left = false; panels.set(); });
  $('rightToggle').addEventListener('click', () => { panels.right = false; panels.set(); });
  $('rightOpen').addEventListener('click', () => { panels.right = true; panels.set(); });
  window.addEventListener('shell:resize', () => { fitWorkbench(); redraw(); });
  return panels;
}

/* ---------------------------------------------------------------------------
   The rail: small buttons, some with a menu on hover
   --------------------------------------------------------------------------- */
export const rail = {
  open: null,
  btn: (id, text, title, o = {}) => `<button type="button" class="rail-btn${o.on ? ' on' : ''}${o.text ? ' is-text' : ''}" data-r="${id}" title="${title}"${o.style ? ` style="${o.style}"` : ''}${o.disabled ? ' disabled' : ''}>${text}</button>`,
  fly: (id, btn, items) => `<div class="rail-wrap" data-fly="${id}">${btn}<div class="fly"${rail.open === id ? '' : ' hidden'}>${items}</div></div>`,
  item: (r, v, text, on) => `<button type="button" class="fly-item${on ? ' fly-on' : ''}" data-r="${r}" data-v="${v}">${text}</button>`,
  rule: '<hr class="rail-rule">',
};
{
  let timer = null;
  document.addEventListener('mouseover', e => {
    const w = e.target.closest?.('#rail [data-fly]');
    if (!w) return;
    if (timer) { clearTimeout(timer); timer = null; }
    rail.open = w.dataset.fly;
    document.querySelectorAll('#rail .fly').forEach(f => { f.hidden = f.parentElement.dataset.fly !== rail.open; });
  });
  document.addEventListener('mouseout', e => {
    const w = e.target.closest?.('#rail [data-fly]');
    if (!w || (e.relatedTarget && e.relatedTarget.closest?.('[data-fly]') === w)) return;
    timer = setTimeout(() => { rail.open = null; document.querySelectorAll('#rail .fly').forEach(f => { f.hidden = true; }); }, 180);
  });
}

/* ---------------------------------------------------------------------------
   Tooltip
   --------------------------------------------------------------------------- */
export const tooltip = {
  show(html, x, y, place = 'cursor') {
    const tip = $('tip'), z = zoomOf();
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth / z, vh = window.innerHeight / z;
    let left = x / z + 14, top = place === 'right' ? y / z : y / z + 14;
    if (left + w > vw - 8) left = Math.max(8, x / z - w - 14);
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    tip.style.left = `${left}px`; tip.style.top = `${top}px`;
  },
  hide() { $('tip').hidden = true; },
};

/* ---------------------------------------------------------------------------
   Case (or input) selector: one button, a menu, the texts on hover
   --------------------------------------------------------------------------- */
export function caseSelector({ list, onSelect }) {
  $('caseMenu').innerHTML = list.map((c, i) => `<li role="option" tabindex="-1" data-i="${i}"><span class="n">${i + 1}</span>${c.title}</li>`).join('');
  const isOpen = () => !$('caseMenu').hidden;
  const textOf = i => `<div class="tip-title">${list[i].title}</div>${$('caseTexts').children[i].innerHTML}`;
  const beside = (el, i) => { const r = el.getBoundingClientRect(); tooltip.show(textOf(i), r.right, r.top, 'right'); };
  let current = 0;
  const open = on => {
    $('caseMenu').hidden = !on;
    $('caseBtn').setAttribute('aria-expanded', String(on));
    if (!on) tooltip.hide();
    if (on) (document.querySelector('#caseMenu li[aria-selected="true"]') ?? document.querySelector('#caseMenu li')).focus();
  };
  $('caseBtn').addEventListener('click', () => open(!isOpen()));
  $('caseBtn').addEventListener('mouseenter', e => { if (!isOpen()) beside(e.currentTarget, current); });
  $('caseBtn').addEventListener('mouseleave', () => { if (!isOpen()) tooltip.hide(); });
  $('caseMenu').addEventListener('mouseover', e => { const li = e.target.closest('li'); if (li) beside(li, +li.dataset.i); });
  $('caseMenu').addEventListener('focusin', e => { const li = e.target.closest('li'); if (li) beside(li, +li.dataset.i); });
  $('caseMenu').addEventListener('mouseleave', () => tooltip.hide());
  $('caseMenu').addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    open(false); $('caseBtn').focus();
    onSelect(+li.dataset.i);
  });
  $('caseMenu').addEventListener('keydown', e => {
    const items = [...document.querySelectorAll('#caseMenu li')], i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)].focus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.activeElement.click(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); open(false); $('caseBtn').focus(); }
  });
  document.addEventListener('click', e => { if (isOpen() && !e.target.closest('#caseSelect')) open(false); });
  return {
    /** Show case i as the current one in the button and the menu. */
    mark(i) {
      current = i;
      $('caseBtn').innerHTML = `<span class="n">${i + 1}</span>${list[i].title}<span class="caret" aria-hidden="true">▾</span>`;
      document.querySelectorAll('#caseMenu li').forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    },
    /** The "changed" mark and the reset button. */
    changed(on) {
      $('caseSelect').classList.toggle('changed', on);
      $('resetCase').disabled = !on;
    },
  };
}

/* ---------------------------------------------------------------------------
   Groups of the left panel: fold on the heading, a summary when folded
   --------------------------------------------------------------------------- */
export function foldingGroups(summaries) {
  document.querySelectorAll('.sg-toggle').forEach(b => b.addEventListener('click', () => {
    const g = b.closest('.sgroup'), closed = g.classList.toggle('closed');
    b.setAttribute('aria-expanded', String(!closed));
  }));
  return () => {
    for (const [g, html] of Object.entries(summaries())) {
      const el = document.querySelector(`.sgroup[data-g="${g}"] .sg-sum`);
      if (el) el.innerHTML = html;
    }
  };
}

/* ---------------------------------------------------------------------------
   Value controls. A binding describes one value:
     { label, unit, min, max, step, get(), set(v), toR(v), fromR(r), fmt(v),
       caseV(), def, off(), redraw: 'update' | 'draw' | 'none' }
   bindOf(key) returns it for the data-k of a `.vctl`. The slider stands for
   the value; the number beside it can be typed; ↺ shows while the value
   differs from the case and puts it back; a double-click on the slider sets
   the default.
   --------------------------------------------------------------------------- */
export function valueControls({ bindOf, update, draw, after = () => {} }) {
  const refresh = () => {
    document.querySelectorAll('.vctl').forEach(el => {
      const b = bindOf(el.dataset.k), v = b.get(), off = b.off?.() ?? false;
      const range = el.querySelector('input[type=range]'), val = el.querySelector('.val'), rst = el.querySelector('.rst');
      if (!range) return;
      range.value = b.toR(v);
      range.disabled = off; val.disabled = off;
      if (document.activeElement !== val) val.value = off ? '–' : b.fmt(v);
      rst.hidden = off || b.fmt(v) === b.fmt(b.caseV());
    });
    after();
  };
  const fill = root => {
    root.querySelectorAll('.vctl').forEach(el => {
      const b = bindOf(el.dataset.k);
      el.innerHTML = `<span class="vlab">${b.label}
          <input class="val" type="text" inputmode="decimal" aria-label="${el.dataset.k} value">${b.unit ? `<span class="vunit">${b.unit}</span>` : ''}
          <button type="button" class="rst" title="back to the case's value · double-click the slider for the default">↺</button></span>
        <input type="range" min="${b.min}" max="${b.max}" step="${b.step}" title="double-click: default">`;
    });
    refresh();
  };
  const apply = (key, v) => {
    const b = bindOf(key);
    b.set(v);
    if (b.redraw === 'update') update(); else if (b.redraw === 'draw') draw(); else refresh();
  };
  document.addEventListener('input', e => {
    const el = e.target.closest?.('.vctl');
    if (el && e.target.type === 'range') apply(el.dataset.k, bindOf(el.dataset.k).fromR(+e.target.value));
  });
  document.addEventListener('change', e => {
    const el = e.target.closest?.('.vctl');
    if (!el || !e.target.classList.contains('val')) return;
    const v = parseFloat(e.target.value.replace(',', '.'));
    if (Number.isFinite(v)) apply(el.dataset.k, v);
    e.target.blur(); refresh();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList?.contains('val')) e.target.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.addEventListener('click', e => {
    const r = e.target.closest?.('.vctl .rst');
    if (r) { const k = r.closest('.vctl').dataset.k; apply(k, bindOf(k).caseV()); }
  });
  document.addEventListener('dblclick', e => {
    const el = e.target.closest?.('.vctl');
    if (el && e.target.type === 'range') apply(el.dataset.k, bindOf(el.dataset.k).def);
  });
  return { fill, refresh, apply };
}

/* ---------------------------------------------------------------------------
   Maxima in a phase-domain plot, read off in the plot itself: a drop line to
   the φ axis carrying φmax (turned, near the axis, all labels ending at one
   height so the digits line up) and a line to the right edge carrying the
   lag δ = 360° − φmax (on the line halfway, left of the dot where the line is
   short, beside the dot where δ = 0). Labels never overlap.
   maxima: [{ phi, y, delta, color }]; yr: the plot's y range.
   --------------------------------------------------------------------------- */
export function markMaxima(p, maxima, yr) {
  const { ctx, X, Y } = p, font = p.font('annotation'), sc = p.scale, placed = [];
  const boxOf = (txt, x, y, align) => {
    const w = richText(ctx, txt, 0, 0, font, 'left', false), h = 15 * sc;
    const l = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    return { l: l - 3, r: l + w + 3, t: y - 12 * sc, b: y - 12 * sc + h, w };
  };
  const hits = bx => placed.some(o => bx.l < o.r && bx.r > o.l && bx.t < o.b && bx.b > o.t);
  const ms = [...maxima].sort((a, b) => a.phi - b.phi);
  for (const q of ms) {
    p.line([q.phi, q.phi], [q.y, yr[0]], q.color, 1, [3, 3]);
    if (q.delta >= 0.5) p.line([q.phi, 360], [q.y, q.y], q.color, 1, [3, 3]);   // δ = 0: nothing, 360° is 0°
    placed.push({ l: X(q.phi) - 6, r: X(q.phi) + 6, t: Y(q.y) - 6, b: Y(q.y) + 6 });
  }
  const lineH = 15 * sc, endAt = richText(ctx, '360°', 0, 0, font, 'left', false) + 6;
  for (const q of ms) {
    const txt = `${q.phi.toFixed(0)}°`, w = richText(ctx, txt, 0, 0, font, 'left', false), y0 = p.inner.b - 4;
    const x = clamp(X(q.phi), p.inner.l + lineH / 2 + 2, p.inner.r - lineH / 2 - 2);
    ctx.save(); ctx.translate(x, y0); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C.surface; ctx.globalAlpha = 0.85; ctx.fillRect(endAt - w - 3, -lineH / 2, w + 6, lineH); ctx.globalAlpha = 1;
    ctx.fillStyle = q.color; richText(ctx, txt, endAt, 4 * sc, font, 'right');
    ctx.restore();
    placed.push({ l: x - lineH / 2, r: x + lineH / 2, t: y0 - endAt - 3, b: y0 });
  }
  for (const q of ms) {
    const txt = `*δ* = ${q.delta.toFixed(0)}°`, w = richText(ctx, txt, 0, 0, font, 'left', false);
    const row = 17 * sc, xd = X(q.phi), yd = Y(q.y), room = X(360) - xd - 10;
    const on = [(xd + X(360)) / 2, yd - 4 * sc, 'center'], left = [xd - 9, yd + 5 * sc, 'right'], right = [xd + 9, yd + 5 * sc, 'left'];
    const firsts = q.delta < 0.5 ? [right, left] : room >= w + 6 ? [on, left] : [left];
    const cands = [];
    for (const dy of [0, -row, row, -2 * row, 2 * row]) for (const [x, y, al] of firsts) cands.push([x, y + dy, al]);
    const inFrame = bx => bx.t >= p.inner.t && bx.b <= p.inner.b && bx.l >= p.inner.l && bx.r <= p.inner.r;
    const pick = cands.find(c => { const bx = boxOf(txt, ...c); return inFrame(bx) && !hits(bx); }) ?? cands[0];
    const bx = boxOf(txt, ...pick);
    placed.push(bx);
    ctx.fillStyle = C.surface; ctx.globalAlpha = 0.85; ctx.fillRect(bx.l, bx.t, bx.r - bx.l, bx.b - bx.t); ctx.globalAlpha = 1;
    ctx.fillStyle = q.color; richText(ctx, txt, pick[0], pick[1], font, pick[2]);
  }
}

/** A ruler's grip: a small triangle on top of a vertical line at pixel x. */
export function grip(p, x, color) {
  const g = 6, { ctx, inner } = p;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - g, inner.t); ctx.lineTo(x + g, inner.t); ctx.lineTo(x, inner.t + g * 1.4); ctx.closePath(); ctx.fill();
}

/** Pointer position in a canvas's own CSS px, whatever the presentation zoom. */
export function localIn(cv, e) {
  const r = cv.getBoundingClientRect(), f = cv.clientWidth / r.width;
  return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f };
}

/**
 * Make a canvas drag a value by a vertical ruler: grabbed within 7 px of one
 * of the x positions rulerXs() returns, it calls onDrag(x in canvas px) while
 * the pointer moves. hover(e) may claim the pointer first (a point of
 * interest) by returning true.
 */
export function dragRuler(cv, { rulerXs, plotOf, onDrag, hover = () => false, down = () => false, leave = () => {} }) {
  let dragging = false;
  const near = e => {
    const p = plotOf(); if (!p) return false;
    const { x, y } = localIn(cv, e);
    return y >= p.inner.t - 4 && y <= p.inner.b && rulerXs().some(rx => Math.abs(x - rx) <= 7);
  };
  cv.addEventListener('pointermove', e => {
    if (dragging) { onDrag(localIn(cv, e).x); return; }
    if (hover(e)) { cv.style.cursor = 'pointer'; return; }
    cv.style.cursor = near(e) ? 'ew-resize' : 'default';
  });
  cv.addEventListener('pointerdown', e => {
    if (down(e)) return;
    if (!near(e)) return;
    dragging = true; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointerup', e => { dragging = false; try { cv.releasePointerCapture(e.pointerId); } catch { /* released */ } });
  cv.addEventListener('pointerleave', () => { if (!dragging) leave(); });
}

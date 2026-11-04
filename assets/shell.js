/**
 * The shell every page shares: tokens, header, footer, width steps and the
 * two views (desktop, presentation).
 *
 *   import { initShell } from '<root>/assets/shell.js';
 *   initShell({ page: 'demo', views: true });
 *
 * `page` marks the active header link ('demos', 'impressum', 'styleguide' or
 * 'demo'); `views: true` adds the Desktop / Presentation switch, for demos.
 * The page fires a 'shell:resize' event on window whenever the view, the
 * scale or the width changes, so a canvas can redraw.
 */
import { installTokens, widthClass, PRESENTATION } from './tokens.js';

export const ROOT = new URL('../', import.meta.url).href;
const REPO = 'https://github.com/urakawa-group/web-site-demos';

let presenting = false;
let scale = PRESENTATION.defaultScale;

function header(page, views) {
  const h = document.createElement('header');
  h.className = 'site-header';
  const link = (key, href, text) =>
    `<a href="${ROOT}${href}"${page === key ? ' aria-current="page"' : ''}>${text}</a>`;
  h.innerHTML = `
    <a class="wordmark" href="${ROOT}index.html">Urakawa Group Demos</a>
    <nav>
      ${link('demos', 'index.html', 'Demos')}
      ${link('impressum', 'impressum.html', 'Impressum')}
      ${views ? `<span class="view-switch" role="group" aria-label="View">
        <button type="button" data-view="desktop" aria-pressed="true">Desktop</button>
        <button type="button" data-view="presentation" aria-pressed="false" title="Shift+P">Presentation</button>
      </span>` : ''}
    </nav>`;
  return h;
}

function footer() {
  const f = document.createElement('footer');
  f.className = 'site-footer';
  f.innerHTML = `Urakawa group, Catalysis Engineering, TU Delft ·
    <a href="${ROOT}impressum.html">Impressum</a> ·
    <a href="${ROOT}style-guide.html">Style guide</a> ·
    <a href="${REPO}">Source on GitHub</a>`;
  return f;
}

function presentBar() {
  const b = document.createElement('div');
  b.className = 'present-bar';
  b.innerHTML = `<button class="btn" data-step="-1" aria-label="Smaller">−</button>
    <span data-scale></span>
    <button class="btn" data-step="1" aria-label="Larger">+</button>
    <button class="btn" data-leave>Desktop (Esc)</button>`;
  b.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.step) step(+t.dataset.step);
    if ('leave' in t.dataset) setPresenting(false);
  });
  return b;
}

function stampWidth() {
  const px = window.innerWidth / (presenting ? scale : 1);
  const w = widthClass(px);
  document.documentElement.dataset.w = w;
  if (w === 'wide') delete document.documentElement.dataset.narrow;
  else document.documentElement.dataset.narrow = '';
}

function announce() {
  stampWidth();
  window.dispatchEvent(new CustomEvent('shell:resize', { detail: { presenting, scale } }));
}

function syncUrl() {
  try {
    const u = new URL(location.href);
    if (presenting) u.searchParams.set('present', String(scale));
    else u.searchParams.delete('present');
    history.replaceState(null, '', u);
  } catch { /* file:// or a sandbox: the URL is only a convenience */ }
}

function apply() {
  const html = document.documentElement;
  html.dataset.view = presenting ? 'presentation' : 'desktop';
  document.body.style.zoom = presenting ? String(scale) : '';
  document.querySelectorAll('.view-switch button').forEach(b =>
    b.setAttribute('aria-pressed', String((b.dataset.view === 'presentation') === presenting)));
  const s = document.querySelector('.present-bar [data-scale]');
  if (s) s.textContent = `${scale}×`;
  syncUrl();
  announce();
}

export function setPresenting(on, at) {
  presenting = on;
  if (at && PRESENTATION.scales.includes(at)) scale = at;
  apply();
}

function step(dir) {
  const s = PRESENTATION.scales;
  const i = Math.max(0, Math.min(s.length - 1, s.indexOf(scale) + dir));
  scale = s[i];
  apply();
}

export function initShell({ page = '', views = false } = {}) {
  installTokens();
  document.body.prepend(header(page, views));
  document.body.append(footer());
  if (views) {
    document.body.append(presentBar());
    document.querySelector('.view-switch').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) setPresenting(b.dataset.view === 'presentation');
    });
    window.addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.key === 'P' && e.shiftKey) { e.preventDefault(); setPresenting(!presenting); }
      else if (presenting && (e.key === '+' || e.key === '=')) step(1);
      else if (presenting && (e.key === '-' || e.key === '_')) step(-1);
      else if (presenting && e.key === 'Escape') setPresenting(false);
    });
    const q = new URLSearchParams(location.search).get('present');
    if (q !== null) {
      const v = parseFloat(q);
      presenting = true;
      if (PRESENTATION.scales.includes(v)) scale = v;
    }
  }
  window.addEventListener('resize', announce);
  apply();
}

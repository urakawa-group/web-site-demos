/**
 * Citations from references.bib.
 *
 * Authored text carries markers `[@alias]` or `[@alias, locator]`. An alias
 * is a key of the page's SOURCES map (a citekey plus, for a book, the
 * chapter, and the group lead for the short form) or a citekey directly.
 * renderCitations() turns the markers inside a container into numbered
 * superscripts and writes the list they point at. Numbers follow first
 * appearance, one per source (a chapter counts as one source); an entry
 * collects every locator cited from it.
 *
 * The list entry leads with the group short form,
 *   <first author> et al. (<group lead>), <journal ISO 4> <year>
 * (bracket dropped when the first author is the group lead), then the full
 * reference with its DOI. The journal comes from the source's `journal`
 * override if given, else the entry's shortjournal, else journaltitle.
 */
import { ROOT } from './shell.js';

/* ---------- BibTeX ---------- */

/** Parse a .bib text into { citekey: { type, fields } }. Comments outside entries are skipped. */
export function parseBib(text) {
  const out = {};
  let i = 0;
  while ((i = text.indexOf('@', i)) !== -1) {
    const open = text.indexOf('{', i);
    if (open === -1) break;
    const type = text.slice(i + 1, open).trim().toLowerCase();
    // find the matching close brace of the entry
    let depth = 0, j = open;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}' && --depth === 0) break;
    }
    const body = text.slice(open + 1, j);
    i = j + 1;
    if (type === 'comment' || type === 'preamble' || type === 'string') continue;
    const comma = body.indexOf(',');
    const key = body.slice(0, comma).trim();
    const fields = {};
    let k = comma + 1;
    while (k < body.length) {
      const eq = body.indexOf('=', k);
      if (eq === -1) break;
      const name = body.slice(k, eq).trim().replace(/^,/, '').trim().toLowerCase();
      let v = eq + 1;
      while (/\s/.test(body[v])) v++;
      let value = '';
      if (body[v] === '{') {
        let d = 0, e = v;
        for (; e < body.length; e++) {
          if (body[e] === '{') d++;
          else if (body[e] === '}' && --d === 0) break;
        }
        value = body.slice(v + 1, e);
        k = e + 1;
      } else if (body[v] === '"') {
        const e = body.indexOf('"', v + 1);
        value = body.slice(v + 1, e);
        k = e + 1;
      } else {
        const e = body.indexOf(',', v);
        value = body.slice(v, e === -1 ? body.length : e).trim();
        k = e === -1 ? body.length : e;
      }
      if (name) fields[name] = value.replace(/\s+/g, ' ').trim();
      const next = body.indexOf(',', k);
      k = next === -1 ? body.length : next + 1;
    }
    out[key] = { type, fields };
  }
  return out;
}

let bibPromise = null;
/** The site's references.bib, fetched once. Needs http(s): GitHub Pages or a local server. */
export function loadBib() {
  bibPromise ??= fetch(`${ROOT}references.bib`).then(r => {
    if (!r.ok) throw new Error(`references.bib: ${r.status}`);
    return r.text();
  }).then(parseBib);
  return bibPromise;
}

/* ---------- formatting ---------- */

const strip = s => (s ?? '').replace(/[{}]/g, '').replace(/\\&/g, '&');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function people(raw) {
  return strip(raw).split(/\s+and\s+/i).map(a => {
    const [last, first = ''] = a.includes(',') ? a.split(',', 2).map(s => s.trim()) : [a.split(' ').pop(), a.split(' ').slice(0, -1).join(' ')];
    return { last, first };
  });
}

function initials(first) {
  return first.split(/[\s]+/).filter(Boolean).map(n => n.split('-').map(p => p[0] + '.').join('-')).join(' ');
}

function authorsFull(list) {
  const f = list.map(p => `${initials(p.first)} ${p.last}`.trim());
  if (f.length === 1) return f[0];
  if (f.length === 2) return `${f[0]} and ${f[1]}`;
  return f.slice(0, -1).join(', ') + ', and ' + f[f.length - 1];
}

function names(list) {
  if (list.length === 1) return list[0].last;
  if (list.length === 2) return `${list[0].last} & ${list[1].last}`;
  return `${list[0].last} et al.`;
}

/** The group short form: "Weyel et al. (Hess), Acc. Chem. Res. 2024". */
export function shortForm(entry, src = {}) {
  if (src.short) return src.short;
  const f = entry.fields;
  const who = names(people(f.author ?? f.editor ?? ''));
  const lead = src.lead && !who.startsWith(src.lead) ? ` (${src.lead})` : '';
  const journal = src.journal ?? strip(f.shortjournal || f.journaltitle || f.journal || f.booktitle || f.title);
  const year = strip(f.date ?? f.year).slice(0, 4);
  return `${who}${lead}, ${journal} ${year}`;
}

export function refHref(f) {
  const doi = strip(f.doi);
  if (doi) return doi.startsWith('http') ? doi : `https://doi.org/${doi}`;
  return strip(f.url);
}

/** Full reference, IEEE-like, as HTML. A chapter source puts the chapter before the book. */
export function fullHtml(entry, src = {}) {
  const f = entry.fields;
  const parts = [];
  if (src.chapter) {
    parts.push(esc(src.chapter));
    parts.push(`in <em>${esc(strip(f.title))}</em>, ${esc(authorsFull(people(f.author ?? f.editor)))}, Eds.`);
    const pub = [strip(f.location), strip(f.publisher)].filter(Boolean).join(': ');
    if (pub) parts.push(esc(pub));
  } else {
    parts.push(esc(authorsFull(people(f.author ?? ''))));
    parts.push(`“${esc(strip(f.title))}”`);
    const journal = strip(f.journaltitle ?? f.journal);
    if (journal) parts.push(`<em>${esc(journal)}</em>`);
    const detail = [
      f.volume && `vol. ${esc(strip(f.volume))}`,
      f.number && `no. ${esc(strip(f.number))}`,
      f.pages && `pp. ${esc(strip(f.pages).replace(/--/g, '–'))}`,
    ].filter(Boolean);
    if (detail.length) parts.push(detail.join(', '));
  }
  parts.push(esc(strip(f.date ?? f.year).slice(0, 4)));
  let s = parts.join(', ') + '.';
  const href = refHref(f);
  if (href) {
    const label = strip(f.doi) ? `doi:${esc(strip(f.doi))}` : esc(href);
    s += ` <a href="${esc(href)}" rel="noopener">${label}</a>`;
  }
  return s;
}

/* ---------- markers ---------- */

const MARKER = /\[@([^\],\]]+?)(?:,\s*([^\]]+))?\]/g;

/**
 * Replace every marker inside `containers` with a numbered superscript and
 * write the list into `listEl`. `sources` maps aliases to
 * { key, chapter?, lead?, journal?, short? }.
 */
export async function renderCitations(containers, listEl, sources = {}) {
  let bib;
  try { bib = await loadBib(); }
  catch (e) {
    listEl.innerHTML = `<li><span></span><span class="full">References could not be loaded (${esc(String(e.message))}). Open the site over http: GitHub Pages, or <code>python -m http.server</code> in the repository.</span></li>`;
    return;
  }
  const cited = new Map(); // id → { n, src, entry, locators }
  const walker = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (!MARKER.test(text)) continue;
        MARKER.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, m;
        while ((m = MARKER.exec(text))) {
          frag.append(text.slice(last, m.index));
          frag.append(supFor(m[1].trim(), m[2]?.trim()));
          last = m.index + m[0].length;
        }
        frag.append(text.slice(last));
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) walker(child);
    }
  };
  const supFor = (alias, loc) => {
    const src = sources[alias] ?? { key: alias };
    const id = src.chapter ? `${src.key}::${src.chapter}` : src.key;
    const entry = bib[src.key];
    const sup = document.createElement('sup');
    sup.className = 'cite';
    if (!entry) {
      console.warn(`cite: ${src.key} is not in references.bib`);
      sup.textContent = '[?]';
      return sup;
    }
    if (!cited.has(id)) cited.set(id, { n: cited.size + 1, src, entry, locators: [] });
    const c = cited.get(id);
    if (loc && !c.locators.includes(loc)) c.locators.push(loc);
    sup.innerHTML = `<a href="#ref-${c.n}" title="${esc(shortForm(entry, src))}${loc ? ', ' + esc(loc) : ''}">${c.n}</a>`;
    return sup;
  };
  for (const el of containers) walker(el);
  listEl.innerHTML = [...cited.values()].map(c => `
    <li id="ref-${c.n}"><span class="n">${c.n}</span><span>
      <span class="short">${esc(shortForm(c.entry, c.src))}</span>
      <span class="full">${fullHtml(c.entry, c.src)}</span>
      ${c.locators.length ? `<span class="loc">cited: ${c.locators.map(esc).join('; ')}</span>` : ''}
    </span></li>`).join('');
}

/**
 * Small dense linear algebra for the demos that work on a data matrix
 * (SVD and rank, MCR-ALS). Matrices are arrays of rows, each a Float64Array
 * or a plain array. Sizes on these pages are tens to a few hundred, so plain
 * loops are fast enough and nothing needs a library.
 *
 *   symEig(A)      eigenvalues (descending) and eigenvectors of a symmetric matrix, cyclic Jacobi
 *   svd(D)         thin SVD through the Gram matrix of the shorter side
 *   gram(D), mul(A, B), transpose(A)
 *
 * The SVD from the Gram matrix squares the condition number: singular values
 * below about 1e-7 of the largest are rounding, not data. The pages draw a
 * floor well above that.
 */

export const zeros = (r, c) => Array.from({ length: r }, () => new Float64Array(c));

export function transpose(A) {
  const r = A.length, c = A[0].length, T = zeros(c, r);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
  return T;
}

export function mul(A, B) {
  const r = A.length, n = B.length, c = B[0].length, P = zeros(r, c);
  for (let i = 0; i < r; i++) {
    const Ai = A[i], Pi = P[i];
    for (let k = 0; k < n; k++) { const a = Ai[k]; if (a === 0) continue; const Bk = B[k]; for (let j = 0; j < c; j++) Pi[j] += a * Bk[j]; }
  }
  return P;
}

/** D Dᵀ, symmetric, rows × rows. */
export function gram(D) {
  const r = D.length, m = D[0].length, G = zeros(r, r);
  for (let i = 0; i < r; i++) for (let j = i; j < r; j++) {
    let s = 0; const a = D[i], b = D[j];
    for (let k = 0; k < m; k++) s += a[k] * b[k];
    G[i][j] = s; G[j][i] = s;
  }
  return G;
}

/**
 * Eigen-decomposition of a symmetric matrix by cyclic Jacobi rotations.
 * Returns { values, vectors }: values descending, vectors[i] the unit
 * eigenvector of values[i].
 */
export function symEig(A0) {
  const n = A0.length, A = A0.map(r => Float64Array.from(r));
  const V = Array.from({ length: n }, (_, i) => { const r = new Float64Array(n); r[i] = 1; return r; });
  let scale = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) scale += A[i][j] * A[i][j];
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off <= 1e-30 * scale) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p][q];
      if (Math.abs(apq) < 1e-300) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
  return {
    values: order.map(i => A[i][i]),
    vectors: order.map(i => Float64Array.from(V, row => row[i])),
  };
}

/**
 * Thin SVD of D (rows × cols): D = Σ s[i] · u[i] v[i]ᵀ.
 * u[i] has one entry per row, v[i] one per column, both unit length.
 * Signs are fixed so that the largest entry of each v[i] is positive (the
 * SVD itself leaves every sign open). A singular value below 1e-12 of the
 * largest gets a zero vector on the long side.
 */
export function svd(D) {
  const r = D.length, c = D[0].length;
  const wide = r <= c, M = wide ? D : transpose(D);
  const { values, vectors } = symEig(gram(M));
  const s = values.map(v => Math.sqrt(Math.max(v, 0)));
  const short = vectors, long = [];
  const len = M[0].length;
  for (let i = 0; i < s.length; i++) {
    const w = new Float64Array(len);
    if (s[i] > 1e-12 * s[0]) {
      const a = short[i];
      for (let k = 0; k < M.length; k++) { const ak = a[k]; if (ak === 0) continue; const Mk = M[k]; for (let j = 0; j < len; j++) w[j] += ak * Mk[j]; }
      for (let j = 0; j < len; j++) w[j] /= s[i];
    }
    long.push(w);
  }
  let u = wide ? short : long, v = wide ? long : short;
  u = u.map(x => Float64Array.from(x)); v = v.map(x => Float64Array.from(x));
  for (let i = 0; i < s.length; i++) {
    let big = 0;
    for (let j = 0; j < v[i].length; j++) if (Math.abs(v[i][j]) > Math.abs(big)) big = v[i][j];
    if (big < 0) { for (let j = 0; j < v[i].length; j++) v[i][j] = -v[i][j]; for (let j = 0; j < u[i].length; j++) u[i][j] = -u[i][j]; }
  }
  return { s, u, v };
}

/** Sum of squares of every entry. */
export const sumSq = A => { let t = 0; for (const row of A) for (const x of row) t += x * x; return t; };

/**
 * Eigenvalues only (descending) of a symmetric matrix: Householder reduction
 * to tridiagonal form, then the implicit QL iteration (the tred2 and tqli
 * routines of Numerical Recipes, without the eigenvectors). Much faster than
 * symEig for the many small decompositions of evolving factor analysis.
 */
export function symEigValues(A0) {
  const n = A0.length, a = A0.map(r => Float64Array.from(r)), d = new Float64Array(n), e = new Float64Array(n);
  for (let i = n - 1; i > 0; i--) {
    const l = i - 1;
    let h = 0, scale = 0;
    if (l > 0) {
      for (let k = 0; k <= l; k++) scale += Math.abs(a[i][k]);
      if (scale === 0) e[i] = a[i][l];
      else {
        for (let k = 0; k <= l; k++) { a[i][k] /= scale; h += a[i][k] * a[i][k]; }
        let f = a[i][l];
        const g0 = f >= 0 ? -Math.sqrt(h) : Math.sqrt(h);
        e[i] = scale * g0; h -= f * g0; a[i][l] = f - g0; f = 0;
        for (let j = 0; j <= l; j++) {
          let g = 0;
          for (let k = 0; k <= j; k++) g += a[j][k] * a[i][k];
          for (let k = j + 1; k <= l; k++) g += a[k][j] * a[i][k];
          e[j] = g / h; f += e[j] * a[i][j];
        }
        const hh = f / (h + h);
        for (let j = 0; j <= l; j++) {
          const fj = a[i][j], g = e[j] - hh * fj;
          e[j] = g;
          for (let k = 0; k <= j; k++) a[j][k] -= fj * e[k] + g * a[i][k];
        }
      }
    } else e[i] = a[i][l];
    d[i] = h;
  }
  e[0] = 0;
  for (let i = 0; i < n; i++) d[i] = a[i][i];
  for (let i = 1; i < n; i++) e[i - 1] = e[i];
  if (n) e[n - 1] = 0;
  for (let l = 0; l < n; l++) {
    let iter = 0, m;
    do {
      for (m = l; m < n - 1; m++) { const dd = Math.abs(d[m]) + Math.abs(d[m + 1]); if (Math.abs(e[m]) <= 1e-15 * dd) break; }
      if (m !== l) {
        if (iter++ === 60) break;
        let g = (d[l + 1] - d[l]) / (2 * e[l]), r = Math.hypot(g, 1);
        g = d[m] - d[l] + e[l] / (g + (g >= 0 ? Math.abs(r) : -Math.abs(r)));
        let s = 1, c = 1, p = 0, i;
        for (i = m - 1; i >= l; i--) {
          let f = s * e[i]; const b = c * e[i];
          e[i + 1] = r = Math.hypot(f, g);
          if (r === 0) { d[i + 1] -= p; e[m] = 0; break; }
          s = f / r; c = g / r; g = d[i + 1] - p; r = (d[i] - g) * s + 2 * c * b; p = s * r; d[i + 1] = g + p; g = c * r - b;
          f = 0;
        }
        if (r === 0 && i >= l) continue;
        d[l] -= p; e[l] = g; e[m] = 0;
      }
    } while (m !== l);
  }
  return Array.from(d).sort((x, y) => y - x);
}

/* qml-w2d2: a quantum kernel matrix on a shot budget. 24 two-moons points, ZZ feature map; the exact matrix,
   the matrix estimated from shots, and its eigenvalues (shot noise pushes some below zero; clipping repairs). */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  function zz(x) {
    const s = new QP.State(2);
    for (let r = 0; r < 2; r++) {
      s.gate("H", 0).gate("H", 1).gate("P", 0, 2 * x[0]).gate("P", 1, 2 * x[1]);
      s.cx(0, 1).gate("P", 1, 2 * (PI - x[0]) * (PI - x[1])).cx(0, 1);
    }
    return s;
  }
  // eigenvalues of a symmetric matrix, cyclic Jacobi rotations
  function eigvals(M) {
    const n = M.length, A = M.map((r) => r.slice());
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off < 1e-18) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      }
    }
    return A.map((r, i) => r[i]).sort((a, b) => b - a);
  }

  function widget() {
    const card = QP.widget("qgram", "A kernel matrix on a shot budget", "every entry is a measured probability");
    if (!card) return;
    const N = 24;
    const pts = QP.data.moons(N, 0.12, 21).sort((a, b) => a.c - b.c);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const sc = (v, lo, hi) => ((v - lo) / (hi - lo)) * (PI / 2);
    const X = pts.map((p) => [sc(p.x, Math.min(...xs), Math.max(...xs)), sc(p.y, Math.min(...ys), Math.max(...ys))]);
    const states = X.map(zz);
    const K = states.map((a) => states.map((b) => a.fidelity(b)));
    let shots = 100, seed = 1;
    const shotSeg = ui.seg({ label: "Shots per entry", options: [{ value: 0, label: "exact" }, { value: 10, label: "10" }, { value: 100, label: "100" }, { value: 1000, label: "1,000" }, { value: 10000, label: "10,000" }], value: shots, onchange: (v) => { shots = +v; draw(); } });
    const againB = ui.button("Measure again", () => { seed++; draw(); }, "btn soft small");
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "controls" }, shotSeg, againB), h("div", { class: "side-by-side even", style: { marginTop: "8px" } }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "The matrix (rows and columns sorted by class)"));
    const cv = h("canvas", { width: 240, height: 240, class: "qg-canvas" });
    left.append(cv);
    right.append(h("div", { class: "kbd-hint" }, "Its eigenvalues, largest first (red: below zero; the tallest bars are cut off)"));
    const eig = new QP.Plot(right, { xlim: [-0.5, N - 0.5], ylim: [-0.3, 1], aspect: 0.75, minH: 180, maxH: 260, ticks: true, grid: false, xlabel: "eigenvalue number" });
    const sNeg = ui.stat("negative eigenvalues", "–"), sMin = ui.stat("smallest eigenvalue", "–"), sCost = ui.stat(`circuits for ${N} points`, String((N * (N - 1)) / 2));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3em", marginTop: "6px" } });
    card.body.append(h("div", { class: "readout" }, sNeg, sMin, sCost), note);
    eig.onresize = draw;

    function estimate() {
      if (!shots) return K;
      const r = QP.rng(seed * 104729 + shots);
      const E = K.map((row) => row.slice());
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const k = K[i][j];
        let c = 0;
        if (shots <= 1000) { for (let s = 0; s < shots; s++) if (r() < k) c++; }
        else c = Math.round(shots * k + Math.sqrt(shots * k * (1 - k)) * r.normal());
        E[i][j] = E[j][i] = Math.min(1, Math.max(0, c / shots));
      }
      return E; // the diagonal is known to be exactly 1, no need to measure it
    }
    function draw() {
      const E = estimate();
      const ctx = cv.getContext("2d"), cell = 240 / N;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const v = E[i][j];
        ctx.fillStyle = `rgb(${Math.round(255 - (255 - 84) * v)},${Math.round(250 - (250 - 39) * v)},${Math.round(244 - (244 - 143) * v)})`;
        ctx.fillRect(j * cell, i * cell, cell + 0.5, cell + 0.5);
      }
      const ev = eigvals(E);
      const neg = ev.filter((v) => v < -1e-9).length;
      // zoom in on the small eigenvalues: the few big ones run off the top
      const TOP = 1.2;
      eig.o.ylim = [Math.min(-0.25, ev[N - 1] * 1.3), TOP];
      eig.clear();
      eig.seg(-0.5, 0, N - 0.5, 0, { color: C.ink3, width: 1.5 });
      ev.forEach((v, i) => {
        eig.rect(i - 0.38, Math.min(0, v), i + 0.38, Math.min(TOP, Math.max(0, v)), { fill: v < -1e-9 ? "#e5566b" : "#9b82ff" });
      });
      sNeg.set(String(neg), neg ? "bad" : "good");
      sMin.set(ev[N - 1].toExponential(1));
      note.textContent = !shots
        ? "Exact: no negative eigenvalues, as for every valid kernel. Only about 16 are clearly above zero: a two-qubit feature map has density matrices with 16 numbers, so the matrix has rank 16 or less."
        : `Each entry is a fraction of ${shots.toLocaleString("en-US")} shots. The noise nudges the near-zero eigenvalues both ways: ${neg} fell below zero, so the estimated matrix isn't a valid kernel any more. The usual repair clips them to zero. More shots shrink them, but never remove them entirely.`;
    }
    draw();
  }
})();

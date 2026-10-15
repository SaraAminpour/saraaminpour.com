/* qml-w4d1: noise on a trained classifier. Week 3's XOR classifier (2 qubits, one upload, 2 layers) is trained
   noise-free when the page loads, then run through a small density-matrix simulator with the notebook's noise
   model: depolarizing noise after every gate (p) and amplitude damping on the measured qubit just before readout (γ).
   Shots and a threshold re-tuned on the noisy device complete the picture. Basis index i = b0 + 2·b1. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  const LAYERS = 2;
  QP.onReady(() => widget());

  // ---------------------------------------------------------------- 2x2 gates as [a, b, c, d] complex, flattened
  const RY = (t) => { const c = Math.cos(t / 2), s = Math.sin(t / 2); return [c, 0, -s, 0, s, 0, c, 0]; };
  const RZ = (t) => { const c = Math.cos(t / 2), s = Math.sin(t / 2); return [c, -s, 0, 0, 0, 0, c, s]; };
  const mul = (ar, ai, br, bi) => [ar * br - ai * bi, ar * bi + ai * br];

  // pure states: Float64Array(8)
  function sv1(psi, q, U) {
    const m = 1 << q;
    for (let i = 0; i < 4; i++) {
      if (i & m) continue;
      const j = i | m;
      const xr = psi[2 * i], xi = psi[2 * i + 1], yr = psi[2 * j], yi = psi[2 * j + 1];
      const [p1, p2] = mul(U[0], U[1], xr, xi), [p3, p4] = mul(U[2], U[3], yr, yi);
      const [p5, p6] = mul(U[4], U[5], xr, xi), [p7, p8] = mul(U[6], U[7], yr, yi);
      psi[2 * i] = p1 + p3; psi[2 * i + 1] = p2 + p4; psi[2 * j] = p5 + p7; psi[2 * j + 1] = p6 + p8;
    }
  }
  function svCX(psi) { // control qubit 0, target qubit 1: swap |01> (i=1) and |11> (i=3)
    [psi[2], psi[3], psi[6], psi[7]] = [psi[6], psi[7], psi[2], psi[3]];
  }
  function scorePure(x0, x1, w) {
    const psi = new Float64Array(8);
    psi[0] = 1;
    sv1(psi, 0, RY(x0)); sv1(psi, 1, RY(x1));
    for (let l = 0; l < LAYERS; l++) {
      sv1(psi, 0, RY(w[4 * l])); sv1(psi, 0, RZ(w[4 * l + 1])); sv1(psi, 1, RY(w[4 * l + 2])); sv1(psi, 1, RZ(w[4 * l + 3]));
      svCX(psi);
    }
    let z = 0;
    for (let i = 0; i < 4; i++) z += (psi[2 * i] ** 2 + psi[2 * i + 1] ** 2) * (i & 2 ? -1 : 1);
    return z;
  }

  // density matrices: Float64Array(32), entry (r, c) at 2 * (4r + c)
  const at = (r, c) => 2 * (4 * r + c);
  function dm1(rho, q, U) {
    const m = 1 << q;
    for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) {           // U ρ
      if (i & m) continue;
      const j = i | m, a = at(i, c), b = at(j, c);
      const [p1, p2] = mul(U[0], U[1], rho[a], rho[a + 1]), [p3, p4] = mul(U[2], U[3], rho[b], rho[b + 1]);
      const [p5, p6] = mul(U[4], U[5], rho[a], rho[a + 1]), [p7, p8] = mul(U[6], U[7], rho[b], rho[b + 1]);
      rho[a] = p1 + p3; rho[a + 1] = p2 + p4; rho[b] = p5 + p7; rho[b + 1] = p6 + p8;
    }
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) {           // (U ρ) U†
      if (i & m) continue;
      const j = i | m, a = at(r, i), b = at(r, j);
      const [p1, p2] = mul(rho[a], rho[a + 1], U[0], -U[1]), [p3, p4] = mul(rho[b], rho[b + 1], U[2], -U[3]);
      const [p5, p6] = mul(rho[a], rho[a + 1], U[4], -U[5]), [p7, p8] = mul(rho[b], rho[b + 1], U[6], -U[7]);
      rho[a] = p1 + p3; rho[a + 1] = p2 + p4; rho[b] = p5 + p7; rho[b + 1] = p6 + p8;
    }
  }
  function dmCX(rho) {
    const perm = [0, 3, 2, 1];
    const old = rho.slice();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      rho[at(r, c)] = old[at(perm[r], perm[c])];
      rho[at(r, c) + 1] = old[at(perm[r], perm[c]) + 1];
    }
  }
  function depol1(rho, q, p) {   // (1 - p) ρ + p · (I/2 on qubit q) ⊗ Tr_q ρ
    if (!p) return;
    const m = 1 << q, old = rho.slice();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const k = at(r, c);
      const tw = (r & m) === (c & m) ? [(old[k] + old[at(r ^ m, c ^ m)]) / 2, (old[k + 1] + old[at(r ^ m, c ^ m) + 1]) / 2] : [0, 0];
      rho[k] = (1 - p) * old[k] + p * tw[0];
      rho[k + 1] = (1 - p) * old[k + 1] + p * tw[1];
    }
  }
  function depol2(rho, p) {      // (1 - p) ρ + p · I/4
    if (!p) return;
    for (let k = 0; k < 32; k++) rho[k] *= 1 - p;
    for (let i = 0; i < 4; i++) rho[at(i, i)] += p / 4;
  }
  function damp(rho, q, g) {     // amplitude damping: |1> decays to |0> with probability g
    if (!g) return;
    const m = 1 << q, old = rho.slice(), f = (b) => (b ? Math.sqrt(1 - g) : 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const k = at(r, c), s = f(r & m) * f(c & m);
      rho[k] = s * old[k];
      rho[k + 1] = s * old[k + 1];
      if (!(r & m) && !(c & m)) {
        rho[k] += g * old[at(r | m, c | m)];
        rho[k + 1] += g * old[at(r | m, c | m) + 1];
      }
    }
  }
  function scoreNoisy(x0, x1, w, p, g) {
    const rho = new Float64Array(32);
    rho[0] = 1;
    const gate = (q, U) => { dm1(rho, q, U); depol1(rho, q, p); };
    gate(0, RY(x0)); gate(1, RY(x1));
    for (let l = 0; l < LAYERS; l++) {
      gate(0, RY(w[4 * l])); gate(0, RZ(w[4 * l + 1])); gate(1, RY(w[4 * l + 2])); gate(1, RZ(w[4 * l + 3]));
      dmCX(rho);
      depol2(rho, p);
    }
    damp(rho, 1, g);
    let z = 0;
    for (let i = 0; i < 4; i++) z += rho[at(i, i)] * (i & 2 ? -1 : 1);
    return z;
  }

  function widget() {
    const card = QP.widget("noisyqml", "Add noise to a trained classifier", "density-matrix simulation");
    if (!card) return;
    const scale = (pts) => {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      return pts.map((p) => ({ x: -PI / 2 + ((p.x - x0) / (x1 - x0)) * PI, y: -PI / 2 + ((p.y - y0) / (y1 - y0)) * PI, c: p.c }));
    };
    const pts = scale(QP.data.xor(80, 0.18, 5));
    // train noise-free, as in week 3
    const r0 = QP.rng(4);
    let W = Array.from({ length: 4 * LAYERS }, () => 0.6 * r0.normal());
    for (let epoch = 0; epoch < 60; epoch++) {
      const f = pts.map((q) => scorePure(q.x, q.y, W));
      W = W.map((w, k) => {
        const up = W.slice(), dn = W.slice();
        up[k] += PI / 2;
        dn[k] -= PI / 2;
        let g = 0;
        pts.forEach((q, i) => (g += (f[i] - (q.c ? -1 : 1)) * (scorePure(q.x, q.y, up) - scorePure(q.x, q.y, dn))));
        return w - (0.3 * g) / pts.length;
      });
    }
    const clean = pts.map((q) => scorePure(q.x, q.y, W));

    let p = 0, g = 0, shots = 0, retune = false, seed = 1, z = clean.slice(), t = 0, ones = null;
    const pS = ui.slider({ label: "gate noise p", min: 0, max: 0.1, step: 0.005, value: 0, fmt: (v) => v.toFixed(3), color: C.qc, oninput: (v) => { p = v; update(); } });
    const gS = ui.slider({ label: "relaxation γ", min: 0, max: 0.5, step: 0.01, value: 0, fmt: (v) => v.toFixed(2), color: C.qml, oninput: (v) => { g = v; update(); } });
    const shotSeg = ui.seg({ label: "Shots", options: [{ value: 0, label: "exact" }, { value: 101, label: "101" }, { value: 21, label: "21" }], value: 0, onchange: (v) => { shots = +v; measure(); draw(); } });
    const tT = ui.toggle({ label: "Re-tune the threshold on the noisy device", onchange: (v) => { retune = v; update(); } });
    const again = ui.button("Measure again", () => { measure(); draw(); }, "btn soft small");
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [-1.75, 1.75], ylim: [-1.75, 1.75], aspect: 1, equal: true, minH: 260, maxH: 420 });
    const sA = ui.stat("accuracy on these points", "–"), sM = ui.stat("average |⟨Z⟩|", "–"), sT = ui.stat("threshold", "0");
    right.append(h("div", { class: "controls col" }, pS, gS, shotSeg, tT, again), h("div", { class: "readout" }, sA, sM, sT));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3.2em", marginTop: "8px" } });
    card.body.append(note);

    function update() {
      z = pts.map((q) => scoreNoisy(q.x, q.y, W, p, g));
      t = 0;
      if (retune) {      // the middle of the thresholds with the best accuracy on these points
        let best = -1, lo = 0, hi = 0;
        for (let k = -60; k <= 90; k++) {
          const acc = pts.filter((q, i) => (z[i] < k / 100 ? 1 : 0) === q.c).length;
          if (acc > best) { best = acc; lo = hi = k; } else if (acc === best && k === hi + 1) hi = k;
        }
        t = (lo + hi) / 200;
      }
      measure();
      draw();
    }
    function measure() {
      const r = QP.rng(seed++);
      ones = shots ? z.map((v) => { let n = 0; for (let k = 0; k < shots; k++) if (r() < (1 - v) / 2) n++; return n; }) : null;
    }
    const predict = (i) => ((shots ? 1 - (2 * ones[i]) / shots : z[i]) < t ? 1 : 0);
    function draw() {
      plot.clear();
      plot.region((x, y) => QP.blend2((1 - (scoreNoisy(x, y, W, p, g) - t)) / 2, 0.85), 9, `nz|${p}|${g}|${t}`);
      let ok = 0, flips = 0;
      pts.forEach((q, i) => {
        const pr = predict(i);
        if (pr === q.c) ok++;
        if (pr !== (clean[i] < 0 ? 1 : 0)) flips++;
        plot.point(q.x, q.y, { r: 5, fill: QP.classColor(q.c), stroke: pr === q.c ? "#fff" : C.ink, lw: pr === q.c ? 1.4 : 2.4 });
      });
      const margin = z.reduce((a, v) => a + Math.abs(v - t), 0) / z.length;
      const margin0 = clean.reduce((a, v) => a + Math.abs(v), 0) / clean.length;
      sA.set(`${Math.round((100 * ok) / pts.length)}<small>%</small>`, ok < 0.9 * pts.length ? "bad" : "");
      sM.set(margin.toFixed(2));
      sT.set(t.toFixed(2));
      const parts = [];
      if (p > 0) parts.push(`Gate noise shrinks every score toward 0: the average margin fell from ${margin0.toFixed(2)} to ${margin.toFixed(2)}, while the boundary hardly moved.`);
      if (g > 0) parts.push(retune ? `Relaxation pulled the scores toward +1, and the threshold re-tuned on the noisy device (${t.toFixed(2)}) moves the boundary back.` : `Relaxation pulls every score toward +1, so the boundary slides into the blue class; ${g >= 0.25 ? "points near it are now called orange" : "so far without changing any prediction"}. Try re-tuning the threshold.`);
      if (shots) parts.push(`With ${shots} shots, ${flips} of ${pts.length} predictions differ from the noise-free classifier's: small margins and few shots don't mix.`);
      note.textContent = parts.length ? parts.join(" ") : "Noise-free and exact: what a perfect simulator gives. Add gate noise or relaxation, then read out with shots.";
    }
    plot.onresize = draw;
    update();
  }
})();

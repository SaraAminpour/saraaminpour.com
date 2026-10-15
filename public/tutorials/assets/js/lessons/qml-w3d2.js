/* qml-w3d2: from measurements to predictions. A two-layer classifier (trained on XOR when the page loads, as in
   Monday's widget) is measured with a finite number of shots: each point's ⟨Z⟩ is estimated from its counts, points
   near the boundary flip, and a gray zone marks where one measurement flips more than 5% of the time. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("readout", "Measure the classifier", "shots, not ⟨Z⟩");
    if (!card) return;
    const C = QP.colors;
    const PI = Math.PI;
    const LAYERS = 2;
    const scale = (pts) => {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      return pts.map((p) => ({ x: -PI / 2 + ((p.x - x0) / (x1 - x0)) * PI, y: -PI / 2 + ((p.y - y0) / (y1 - y0)) * PI, c: p.c }));
    };
    const pts = scale(QP.data.xor(80, 0.18, 5));

    function score(x0, x1, w) {
      const s = new QP.State(2);
      s.gate("RY", 0, x0).gate("RY", 1, x1);
      for (let l = 0; l < LAYERS; l++) s.gate("RY", 0, w[4 * l]).gate("RZ", 0, w[4 * l + 1]).gate("RY", 1, w[4 * l + 2]).gate("RZ", 1, w[4 * l + 3]).cx(0, 1);
      return s.expZ(1);
    }
    // train once, exactly as on Monday: mean squared error, parameter shift, gradient descent
    const r0 = QP.rng(4);
    let W = Array.from({ length: 4 * LAYERS }, () => 0.6 * r0.normal());
    for (let epoch = 0; epoch < 60; epoch++) {
      const f = pts.map((q) => score(q.x, q.y, W));
      const g = W.map((_, k) => {
        const wp = W.slice(), wm = W.slice();
        wp[k] += PI / 2;
        wm[k] -= PI / 2;
        let s = 0;
        pts.forEach((q, i) => (s += (f[i] - (q.c ? -1 : 1)) * (score(q.x, q.y, wp) - score(q.x, q.y, wm))));
        return s / pts.length;
      });
      W = W.map((w, k) => w - 0.3 * g[k]);
    }
    const exactZ = pts.map((q) => score(q.x, q.y, W));
    const exactPred = exactZ.map((f) => (f < 0 ? 1 : 0));

    let shots = 10, ones = [], pred = [], sel = 0, seed = 1;
    exactZ.forEach((f, i) => { if (Math.abs(f) < Math.abs(exactZ[sel])) sel = i; });
    const shotSeg = ui.seg({ label: "Shots per point", options: [{ value: 10, label: "10" }, { value: 100, label: "100" }, { value: 1000, label: "1,000" }, { value: 0, label: "exact ⟨Z⟩" }], value: shots, onchange: (v) => { shots = +v; measure(); } });
    const again = ui.button("Measure again", () => measure(), "btn qml small");
    card.body.append(h("div", { class: "controls" }, shotSeg, again));
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side", style: { marginTop: "10px" } }, left, right));
    const plot = new QP.Plot(left, { xlim: [-1.75, 1.75], ylim: [-1.75, 1.75], aspect: 1, equal: true, minH: 260, maxH: 400 });
    const sE = ui.stat("accuracy, exact ⟨Z⟩", "–"), sM = ui.stat("accuracy, this measurement", "–"), sF = ui.stat("predictions the shots changed", "–");
    const counts = h("div", { class: "rd-counts" });
    right.append(h("div", { class: "kbd-hint" }, "Tap a point to see its shots"), counts, h("div", { class: "readout" }, sE, sM, sF));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3em", marginTop: "10px" } });
    card.body.append(note);

    plot.on({
      down: (p) => {
        let best = -1, bd = 1e9;
        pts.forEach((q, i) => { const d = plot.pxDist(q, p); if (d < bd) { bd = d; best = i; } });
        if (best >= 0 && bd < 18) { sel = best; draw(); }
      },
    });

    function measure() {
      const r = QP.rng(seed++);
      ones = exactZ.map((f) => {
        if (!shots) return null;
        const p1 = (1 - f) / 2;
        let n = 0;
        for (let k = 0; k < shots; k++) if (r() < p1) n++;
        return n;
      });
      pred = exactZ.map((f, i) => {
        if (!shots) return exactPred[i];
        const est = 1 - (2 * ones[i]) / shots;
        return est < 0 ? 1 : est > 0 ? 0 : r() < 0.5 ? 1 : 0;
      });
      again.disabled = !shots;
      draw();
    }
    const sigma = (f) => Math.sqrt(Math.max(1e-9, 1 - f * f) / shots);
    function draw() {
      plot.clear();
      plot.region((x, y) => {
        const f = score(x, y, W);
        const c = QP.blend2((1 - f) / 2, 0.85);
        if (shots && Math.abs(f) < 1.645 * sigma(f)) return [c[0] * 0.45 + 200 * 0.55, c[1] * 0.45 + 197 * 0.55, c[2] * 0.45 + 212 * 0.55, 0.95];
        return c;
      }, 5, `rd|${shots}`);
      let okE = 0, okM = 0, changed = 0, zone = 0;
      pts.forEach((q, i) => {
        if (exactPred[i] === q.c) okE++;
        if (pred[i] === q.c) okM++;
        if (pred[i] !== exactPred[i]) changed++;
        if (shots && Math.abs(exactZ[i]) < 1.645 * sigma(exactZ[i])) zone++;
        const right = pred[i] === q.c;
        plot.point(q.x, q.y, { r: 5, fill: QP.classColor(q.c), stroke: right ? "#fff" : C.ink, lw: right ? 1.4 : 2.4 });
        if (pred[i] !== exactPred[i]) plot.point(q.x, q.y - 0.17, { r: 4, shape: "star", fill: C.butter, stroke: C.ink, lw: 1 });
      });
      const s = pts[sel];
      plot.circle(s.x, s.y, 0.13, { stroke: C.ink, width: 2.2 });
      sE.set(Math.round((okE / pts.length) * 100) + "%");
      sM.set(Math.round((okM / pts.length) * 100) + "%");
      sF.set(shots ? String(changed) : "–");
      showCounts();
      note.textContent = shots
        ? `With ${shots.toLocaleString("en-US")} shots, the estimate of ⟨Z⟩ wobbles by about ±${(1 / Math.sqrt(shots)).toFixed(2)} near the boundary. In the gray zone a single measurement flips the prediction more than 5% of the time: ${zone} of ${pts.length} points sit there. Stars mark predictions this measurement changed; dark rings mark wrong ones.`
        : "Exact ⟨Z⟩ is what a simulator gives. Hardware never does: pick a number of shots.";
    }
    function showCounts() {
      const f = exactZ[sel];
      counts.innerHTML = "";
      if (!shots) {
        counts.append(h("div", { class: "rd-line" }, `Exact ⟨Z⟩ = ${f.toFixed(3)} → class ${f < 0 ? 1 : 0}, p(class 1) = ${((1 - f) / 2).toFixed(3)}`));
        return;
      }
      const n1 = ones[sel], n0 = shots - n1, est = 1 - (2 * n1) / shots;
      const bar = (label, n, color) => h("div", { class: "rd-bar" }, h("span", { class: "rd-k" }, label), h("span", { class: "rd-track" }, h("i", { style: { width: `${(100 * n) / shots}%`, background: color } })), h("span", { class: "rd-n" }, n.toLocaleString("en-US")));
      counts.append(
        bar("reads 0", n0, C.c0),
        bar("reads 1", n1, C.c1),
        h("div", { class: "rd-line" }, `Estimate ⟨Z⟩ = (${n0} − ${n1}) / ${shots} = ${est.toFixed(3)} → class ${pred[sel]}`),
        h("div", { class: "rd-line muted" }, `exact ⟨Z⟩ = ${f.toFixed(3)} (class ${exactPred[sel]}), true class ${pts[sel].c}`)
      );
    }
    plot.onresize = draw;
    measure();
  }
})();

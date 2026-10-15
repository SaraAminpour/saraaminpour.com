/* ml-w2d4: curves and overfitting. Polynomial fits, a fan of fits from fresh datasets (variance),
   and the training / validation error for every degree. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const truth = (t) => Math.sin(Math.PI * (t + 1)); // one full wave on t in [-1, 1]
  const NOISE = 0.3, N = 15;
  QP.onReady(() => widget());

  function dataset(seed, n = N) {
    const r = QP.rng(seed);
    return Array.from({ length: n }, () => {
      const x = -1 + 2 * r();
      return { x, y: truth(x) + NOISE * r.normal() };
    });
  }
  const fit = (pts, deg) => QP.ml.polyRidge(pts, deg, 1e-9);
  const mse = (w, pts) => QP.math.mean(pts.map((p) => (QP.ml.polyEval(w, p.x) - p.y) ** 2));

  function widget() {
    const card = QP.widget("wiggle", "Too simple, just right, too wiggly", "orange: your 15 training points");
    if (!card) return;
    let deg = 1, seed = 101, fan = false;
    let pts = dataset(seed);
    const val = dataset(9999, 300); // plenty of fresh points: the "true" error
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-1.05, 1.05], ylim: [-2, 2], aspect: 0.55, maxH: 380, ticks: true, xlabel: "x", ylabel: "y" });
    const dS = ui.slider({ label: "polynomial degree", min: 0, max: 12, step: 1, value: deg, color: C.ml, oninput: (v) => { deg = v; draw(); } });
    const fanT = ui.toggle({ label: "Show fits from 8 other datasets", onchange: (v) => { fan = v; draw(); } });
    const fresh = ui.button("New training set", () => { seed += 17; pts = dataset(seed); draw(); }, "btn soft small");
    const sTr = ui.stat("Training MSE", "–"), sVa = ui.stat("Validation MSE", "–"), sDiag = ui.stat("Diagnosis", "–");
    const chartHost = h("div");
    const chart = QP.chart(chartHost, { xlim: [0, 12], ylim: [0, 0.8], xstep: 2, xlabel: "degree", ylabel: "MSE", aspect: 0.42, maxH: 240 });
    card.body.append(plotHost, h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "#bcb7cb" } }), "the true curve (unknown to the model)"), h("span", null, h("i", { style: { background: C.qc } }), "your fit")),
      h("div", { class: "controls" }, dS, fanT, fresh), h("div", { class: "readout" }, sTr, sVa, sDiag),
      h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "Average over 20 training sets: error for every degree (the chart stops at 0.8; high degrees go far above it)"), chartHost);
    plot.onresize = draw;

    // the U-curve: average training and validation error over 20 datasets
    const DEGS = Array.from({ length: 13 }, (_, i) => i);
    const avg = DEGS.map((d) => {
      let tr = 0, va = 0;
      for (let s = 0; s < 20; s++) {
        const p = dataset(5000 + s);
        const w = fit(p, d);
        tr += mse(w, p);
        va += Math.min(mse(w, val), 5);
      }
      return [tr / 20, va / 20];
    });

    function draw() {
      plot.clear();
      plot.fn(truth, { color: "#bcb7cb", width: 3, dash: [8, 6] });
      if (fan) for (let k = 1; k <= 8; k++) plot.fn((x) => QP.ml.polyEval(fit(dataset(seed + 1000 * k), deg), x), { color: "rgba(255,143,184,.55)", width: 1.8, n: 160 });
      const w = fit(pts, deg);
      plot.fn((x) => QP.ml.polyEval(w, x), { color: C.qc, width: 4, n: 240 });
      for (const p of pts) plot.point(p.x, p.y, { r: 6, fill: C.c0, stroke: "#fff", lw: 2 });
      const tr = mse(w, pts), va = mse(w, val);
      sTr.set(tr.toFixed(3));
      sVa.set(va > 9.99 ? "huge" : va.toFixed(3), va < 0.16 ? "good" : va > 0.4 ? "bad" : "");
      sDiag.set(deg <= 2 ? "underfitting" : deg <= 4 ? "about right" : "overfitting", deg <= 2 || deg > 4 ? "bad" : "good");
      chart.marker = deg;
      chart.draw([
        { name: "training error", x: DEGS, y: avg.map((a) => a[0]), color: C.ml, points: true, r: 3.5 },
        { name: "validation error", x: DEGS, y: avg.map((a) => Math.min(a[1], 0.8)), color: C.qc, points: true, r: 3.5 },
        { name: "noise level (the best possible)", x: [0, 12], y: [NOISE * NOISE, NOISE * NOISE], color: "#bcb7cb", dash: [6, 5], width: 2 },
      ]);
    }
    draw();
  }
})();

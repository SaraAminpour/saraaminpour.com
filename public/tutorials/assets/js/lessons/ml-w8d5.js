/* ml-w8d5: the model zoo. Eight classifiers trained in the browser on the same 2D data, each drawing its own
   boundary, scored on the same held-out test points (rings). */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const M = QP.math;
  QP.onReady(() => widget());

  // ---- two small models the shared kit doesn't have
  function gaussianNB(pts) {
    const stats = [0, 1].map((c) => {
      const mine = pts.filter((p) => p.c === c);
      const mx = M.mean(mine.map((p) => p.x)), my = M.mean(mine.map((p) => p.y));
      const vx = M.mean(mine.map((p) => (p.x - mx) ** 2)) + 1e-6, vy = M.mean(mine.map((p) => (p.y - my) ** 2)) + 1e-6;
      return { prior: mine.length / pts.length, mx, my, vx, vy };
    });
    const logp = (s, q) => Math.log(s.prior) - ((q.x - s.mx) ** 2) / (2 * s.vx) - ((q.y - s.my) ** 2) / (2 * s.vy) - 0.5 * Math.log(s.vx * s.vy);
    return (q) => M.sigmoid(logp(stats[1], q) - logp(stats[0], q));
  }
  // a depth-limited regression tree on both features, for boosting
  function regTree(pts, rs, depth) {
    const mean = M.mean(rs);
    if (depth === 0 || pts.length < 6) return () => mean;
    let best = null;
    for (const f of ["x", "y"]) {
      const idx = pts.map((_, i) => i).sort((a, b) => pts[a][f] - pts[b][f]);
      const tot = M.sum(rs);
      let left = 0;
      for (let k = 1; k < idx.length; k++) {
        left += rs[idx[k - 1]];
        if (k < 3 || idx.length - k < 3) continue;
        const gain = (left * left) / k + ((tot - left) ** 2) / (idx.length - k);
        if (!best || gain > best.gain) best = { gain, f, t: (pts[idx[k - 1]][f] + pts[idx[k]][f]) / 2 };
      }
    }
    if (!best) return () => mean;
    const L = [], R = [], rL = [], rR = [];
    pts.forEach((p, i) => (p[best.f] < best.t ? (L.push(p), rL.push(rs[i])) : (R.push(p), rR.push(rs[i]))));
    const l = regTree(L, rL, depth - 1), r = regTree(R, rR, depth - 1);
    return (q) => (q[best.f] < best.t ? l(q) : r(q));
  }
  function boosting(pts, rounds = 80, lr = 0.3) {
    const trees = [];
    const score = (q) => lr * M.sum(trees.map((t) => t(q)));
    for (let k = 0; k < rounds; k++) {
      const rs = pts.map((p) => p.c - M.sigmoid(score(p))); // negative gradient of the cross-entropy
      trees.push(regTree(pts, rs, 2));
    }
    return (q) => M.sigmoid(score(q));
  }

  const MODELS = [
    ["k-nearest neighbors", (tr) => (q) => QP.ml.knn(tr, q, 7).frac[1]],
    ["logistic regression", (tr) => { const m = QP.ml.logreg(); for (let i = 0; i < 400; i++) m.step(tr, 1); return (q) => m.p(q.x, q.y); }],
    ["naive Bayes", (tr) => gaussianNB(tr)],
    ["decision tree", (tr) => QP.ml.tree(tr, 5, { box: [-3, 3, -3, 3] }).predict],
    ["random forest", (tr) => QP.ml.forest(tr, 40, 7, 5).predict],
    ["gradient boosting", (tr) => boosting(tr)],
    ["SVM (RBF kernel)", (tr) => { const s = QP.ml.svm(tr, QP.ml.kernels.rbf(2), 1); return (q) => M.sigmoid(2 * s.decision(q)); }],
    ["neural network", (tr) => { const n = QP.ml.mlp([2, 16, 16, 1], "tanh", 3); for (let i = 0; i < 400; i++) n.step(tr, 0.03); return (q) => n.predict(q.x, q.y); }],
  ];

  function makeData(kind, noisy, seed) {
    const n = 250;
    const pts = kind === "moons" ? QP.data.moons(n, noisy ? 0.28 : 0.12, seed).map((p) => ({ x: p.x * 1.6, y: p.y * 1.6, c: p.c }))
      : kind === "circles" ? QP.data.circles(n, noisy ? 0.16 : 0.07, 0.5, seed).map((p) => ({ x: p.x * 1.6, y: p.y * 1.6, c: p.c }))
      : kind === "xor" ? QP.data.xor(n, noisy ? 0.32 : 0.18, seed).map((p) => ({ x: p.x * 1.6, y: p.y * 1.6, c: p.c }))
      : QP.data.blobs(n, [[-0.7, -0.5], [0.7, 0.5]], noisy ? 0.6 : 0.35, seed);
    return { train: pts.slice(0, 150), test: pts.slice(150) };
  }

  function widget() {
    const card = QP.widget("zoo", "The model zoo", "same data, same test points, eight models");
    if (!card) return;
    let kind = "moons", noisy = false, seed = 2, job = 0;
    const dataS = ui.seg({ label: "Data", options: [{ value: "moons", label: "moons" }, { value: "circles", label: "circles" }, { value: "xor", label: "XOR" }, { value: "blobs", label: "two blobs" }], value: kind, onchange: (v) => { kind = v; run(); } });
    const noiseS = ui.seg({ label: "Noise", options: [{ value: false, label: "low" }, { value: true, label: "high" }], value: noisy, onchange: (v) => { noisy = v; run(); } });
    const again = ui.button("New sample", () => { seed++; run(); }, "btn soft small");
    const grid = h("div", { class: "zoo-grid" });
    const panels = MODELS.map(([name]) => {
      const host = h("div");
      const acc = h("b", { class: "zoo-acc" }, "…");
      const el = h("div", { class: "zoo-cell" }, h("div", { class: "zoo-head" }, h("span", null, name), acc), host);
      grid.append(el);
      const plot = new QP.Plot(host, { xlim: [-2.4, 2.4], ylim: [-2, 2], aspect: 0.8, minH: 120, maxH: 200, pad: 4, grid: false });
      return { el, acc, plot, f: null };
    });
    const note = h("p", { class: "small muted", style: { margin: "10px 0 0" } });
    card.body.append(h("div", { class: "controls" }, dataS, noiseS, again), grid, note);
    let data = null;
    panels.forEach((p) => (p.plot.onresize = () => drawPanel(p)));

    function drawPanel(p) {
      const pl = p.plot;
      pl.clear();
      if (p.f) pl.region((x, y) => QP.blend2(p.f({ x, y }), 0.8), 5, `${job}-${pl.w}`);
      if (!data) return;
      for (const q of data.train) pl.point(q.x, q.y, { r: 2.4, fill: QP.classColor(q.c), stroke: "#fff", lw: 0.6 });
      for (const q of data.test) pl.point(q.x, q.y, { r: 3, fill: "#fff", stroke: QP.classColor(q.c), lw: 1.6 });
    }
    function run() {
      const my = ++job;
      data = makeData(kind, noisy, seed);
      panels.forEach((p) => { p.f = null; p.acc.textContent = "…"; p.el.classList.remove("win"); drawPanel(p); });
      note.textContent = "Training…";
      const scores = [];
      let i = 0;
      const next = () => {
        if (my !== job) return; // a newer run started
        if (i === panels.length) {
          const best = Math.max(...scores);
          panels.forEach((p, k) => p.el.classList.toggle("win", scores[k] === best));
          const winners = MODELS.filter((_, k) => scores[k] === best).map(([n]) => n);
          note.textContent = `Best on these ${data.test.length} test points: ${winners.join(", ")} (${Math.round(best * 100)}%). ${winners.length > 1 ? "A tie." : ""} Press New sample: does the same model win again?`;
          return;
        }
        const p = panels[i];
        p.f = MODELS[i][1](data.train);
        const acc = M.mean(data.test.map((q) => ((p.f(q) > 0.5 ? 1 : 0) === q.c ? 1 : 0)));
        scores.push(acc);
        p.acc.textContent = `${Math.round(acc * 100)}%`;
        drawPanel(p);
        i++;
        setTimeout(next, 0);
      };
      setTimeout(next, 30);
    }
    run();
  }
})();

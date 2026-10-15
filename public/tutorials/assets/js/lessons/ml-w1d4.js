/* ml-w1d4: train, validate, test. The honest score (kNN on a split) and k-fold cross-validation. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const TRAIN = "#17a98c", VAL = "#7b5cfa";
  QP.onReady(() => {
    honest();
    kfold();
  });

  // kNN vote among `train` for point q (ties go to class 1 only if it has strictly more votes)
  function vote(train, q, k, skip = -1) {
    const d = [];
    for (let i = 0; i < train.length; i++) if (i !== skip) d.push([(train[i].x - q.x) ** 2 + (train[i].y - q.y) ** 2, train[i].c]);
    d.sort((a, b) => a[0] - b[0]);
    let ones = 0;
    for (let i = 0; i < k && i < d.length; i++) ones += d[i][1];
    return ones / Math.min(k, d.length);
  }
  const acc = (train, pts, k) => pts.reduce((s, p) => s + ((vote(train, p, k) > 0.5 ? 1 : 0) === p.c ? 1 : 0), 0) / pts.length;

  function makeSplit(seed) {
    const pts = QP.data.moons(300, 0.4, 3);
    const idx = QP.rng(seed).shuffle(pts.map((_, i) => i));
    const nTr = 180, nVa = 60;
    return {
      train: idx.slice(0, nTr).map((i) => pts[i]),
      val: idx.slice(nTr, nTr + nVa).map((i) => pts[i]),
      test: idx.slice(nTr + nVa).map((i) => pts[i]),
    };
  }

  function honest() {
    const card = QP.widget("honest", "The honest score", "filled dots train the model · rings only judge it");
    if (!card) return;
    let seed = 2401, k = 1, split = makeSplit(seed), curve = null;
    const KS = Array.from({ length: 21 }, (_, i) => 2 * i + 1);
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-2.4, 2.5], ylim: [-1.7, 1.7], aspect: 0.6, maxH: 400 });
    const kS = ui.slider({ label: "k (neighbors)", min: 1, max: 41, step: 2, value: k, color: C.ml, oninput: (v) => { k = v; draw(); } });
    const shuffle = ui.button("Reshuffle the split", () => { seed = (seed * 7919 + 13) % 100003; split = makeSplit(seed); curve = null; draw(); }, "btn soft small");
    const best = ui.button("Jump to the best k on validation", () => { const b = bestK(); kS.set(b); k = b; draw(); }, "btn soft small");
    const sTr = ui.stat("Training accuracy", "–");
    const sVa = ui.stat("Validation accuracy", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, marginTop: "8px", minHeight: "2.6em" } });
    const chartHost = h("div");
    const chart = QP.chart(chartHost, { xlim: [0, 42], ylim: [0.6, 1.02], xlabel: "k", ylabel: "accuracy", aspect: 0.5, maxH: 260 });
    const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.ink3 } }), "training points (filled)"), h("span", null, h("i", { style: { background: "#fff", border: `2.5px solid ${C.ink3}` } }), "validation points (rings)"), h("span", null, "test points: locked away for the end"));
    card.body.append(
      plotHost, legend,
      h("div", { class: "controls" }, kS, shuffle, best),
      h("div", { class: "side-by-side", style: { marginTop: "12px" } },
        h("div", null, h("div", { class: "kbd-hint" }, "Accuracy for every k on this split"), chartHost),
        h("div", null, h("div", { class: "readout" }, sTr, sVa), note))
    );
    plot.onresize = draw;

    function computeCurve() {
      curve = { tr: KS.map((kk) => acc(split.train, split.train, kk)), va: KS.map((kk) => acc(split.train, split.val, kk)) };
    }
    function bestK() {
      if (!curve) computeCurve();
      let bi = 0;
      curve.va.forEach((v, i) => { if (v > curve.va[bi] + 1e-9) bi = i; });
      return KS[bi];
    }
    function draw() {
      if (!curve) computeCurve();
      plot.clear();
      plot.region((x, y) => {
        const p = vote(split.train, { x, y }, k);
        return QP.blend2(p, 0.5);
      }, 6, `${seed}-${k}-${plot.w}`);
      for (const p of split.train) plot.point(p.x, p.y, { r: 5, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.2 });
      for (const p of split.val) {
        const ok = (vote(split.train, p, k) > 0.5 ? 1 : 0) === p.c;
        plot.point(p.x, p.y, { r: 6.5, fill: "#fff", stroke: QP.classColor(p.c), lw: 3 });
        if (!ok) plot.point(p.x, p.y, { r: 2.5, fill: C.ink, stroke: null });
      }
      const i = KS.indexOf(k);
      const tr = curve.tr[i], va = curve.va[i];
      sTr.set(`${Math.round(tr * 100)}<small>%</small>`);
      sVa.set(`${Math.round(va * 100)}<small>%</small>`, va >= Math.max(...curve.va) - 1e-9 ? "good" : "");
      const b = bestK();
      note.textContent = k === 1
        ? "k = 1: every training point is its own nearest neighbor, so training accuracy is 100%. The rings tell the real story."
        : k === b ? `k = ${k} is the best value on this validation set. Reshuffle: does the best k move?`
        : k > 25 ? "Large k: the boundary gets too smooth and both scores fall (underfitting)." : `The best k on this split is ${b}. Validation points with a dot in the middle are misclassified.`;
      chart.marker = k;
      chart.draw([
        { name: "training", x: KS, y: curve.tr, color: TRAIN },
        { name: "validation", x: KS, y: curve.va, color: VAL },
        { x: [b], y: [curve.va[KS.indexOf(b)]], color: "#ffd66b", points: true, line: false, r: 8 },
      ]);
    }
    draw();
  }

  function kfold() {
    const card = QP.widget("kfold", "k-fold cross-validation", "every point takes one turn as validation");
    if (!card) return;
    const pts = makeSplit(2401);
    const data = pts.train.concat(pts.val); // the 192 points that are not test
    let K = 5, running = null;
    const seg = ui.seg({ label: "folds", options: [3, 5, 10], value: K, onchange: (v) => { K = v; reset(); } });
    const run = ui.button("Run cross-validation (kNN, k = 15)", () => go(), "btn ml small");
    const rows = h("div", { class: "kf-rows" });
    const out = h("div", { class: "small", style: { fontWeight: 800, marginTop: "10px", minHeight: "1.5em" } });
    card.body.append(h("div", { class: "controls" }, seg, run), rows, out);

    function reset() {
      if (running) running.stop();
      rows.innerHTML = "";
      out.textContent = `${data.length} points split into ${K} folds of about ${Math.round(data.length / K)}.`;
      for (let r = 0; r < K; r++) {
        const bar = h("div", { class: "kf-bar" });
        for (let f = 0; f < K; f++) bar.appendChild(h("span", { class: "kf-cell" }));
        rows.appendChild(h("div", { class: "kf-row" }, h("span", { class: "kf-lab" }, `round ${r + 1}`), bar, h("span", { class: "kf-score" }, "")));
      }
    }
    function go() {
      reset();
      const scores = [];
      let r = 0;
      const step = () => {
        if (r >= K) {
          const m = QP.math.mean(scores);
          const sd = Math.sqrt(QP.math.mean(scores.map((s) => (s - m) ** 2)));
          out.innerHTML = `Cross-validated accuracy: <b>${(m * 100).toFixed(1)}%</b> ± ${(sd * 100).toFixed(1)}% (mean ± spread of the ${K} rounds)`;
          QP.confettiAt(out, 40);
          return;
        }
        const val = data.filter((_, i) => i % K === r), tr = data.filter((_, i) => i % K !== r);
        const s = acc(tr, val, 15);
        scores.push(s);
        const row = rows.children[r];
        row.querySelectorAll(".kf-cell").forEach((c, f) => c.classList.add(f === r ? "val" : "tr"));
        row.querySelector(".kf-score").textContent = `${(s * 100).toFixed(0)}%`;
        row.classList.add("on");
        r++;
        running = { stop: () => clearTimeout(t) };
        const t = setTimeout(step, QP.reduceMotion ? 0 : 380);
      };
      step();
    }
    reset();
  }
})();

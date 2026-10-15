/* ml-w3d3: imbalanced data. Logistic regression on a rare class: plain vs class weights, and a movable threshold. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const RARE = "#ff8a50", COMMON = "#5577f5";
  QP.onReady(() => widget());

  function pool() {
    const r = QP.rng(21);
    const common = Array.from({ length: 300 }, () => ({ x: 0.55 + 0.6 * r.normal(), y: 0.3 + 0.6 * r.normal(), c: 0 }));
    const rare = Array.from({ length: 150 }, () => ({ x: -0.55 + 0.5 * r.normal(), y: -0.35 + 0.5 * r.normal(), c: 1 }));
    return { common, rare };
  }

  function train(pts, weighted) {
    const n = pts.length, n1 = pts.filter((p) => p.c === 1).length, n0 = n - n1;
    const sw = (c) => (weighted ? n / (2 * (c ? n1 : n0)) : 1);
    let w1 = 0, w2 = 0, b = 0;
    for (let it = 0; it < 500; it++) {
      let g1 = 0, g2 = 0, gb = 0, W = 0;
      for (const p of pts) {
        const q = 1 / (1 + Math.exp(-(w1 * p.x + w2 * p.y + b)));
        const s = sw(p.c);
        const d = s * (q - p.c);
        g1 += d * p.x;
        g2 += d * p.y;
        gb += d;
        W += s;
      }
      w1 -= (1.0 * g1) / W;
      w2 -= (1.0 * g2) / W;
      b -= (1.0 * gb) / W;
    }
    return { w1, w2, b };
  }

  function widget() {
    const card = QP.widget("rare", "Finding the rare class", "orange = rare class (the one we want to find)");
    if (!card) return;
    const P = pool();
    let share = 0.05, weighted = false, thr = 0.5, model = null, pts = [];
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-2.4, 2.4], ylim: [-2.0, 2.2], aspect: 0.6, maxH: 380, equal: true });
    const shareSeg = ui.seg({ label: "Rare class share", options: [{ value: 0.5, label: "50%" }, { value: 0.2, label: "20%" }, { value: 0.1, label: "10%" }, { value: 0.05, label: "5%" }, { value: 0.02, label: "2%" }], value: share, onchange: (v) => { share = v; refit(); } });
    const modeSeg = ui.seg({ label: "Training", options: [{ value: false, label: "plain" }, { value: true, label: "with class weights" }], value: weighted, onchange: (v) => { weighted = v; refit(); } });
    const tS = ui.slider({ label: "threshold", min: 0.05, max: 0.95, step: 0.01, value: thr, fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { thr = v; draw(); } });
    const tile = (label, bg) => {
      const n = h("div", { style: { fontFamily: "Fredoka, sans-serif", fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.1 } }, "0");
      const el = h("div", { style: { borderRadius: "14px", padding: "8px 10px", textAlign: "center", border: "1px solid var(--line)", background: bg } }, n, h("div", { class: "small", style: { fontWeight: 800, color: C.ink2 } }, label));
      el.n = n;
      return el;
    };
    const TP = tile("rare found (TP)", "#dcf7ea"), FN = tile("rare missed (FN)", "#ffe1e5"), FP = tile("false alarm (FP)", "#fff1cc"), TN = tile("common, correct (TN)", "#dcf7ea");
    const cm = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" } }, TP, FN, FP, TN);
    const sAcc = ui.stat("Accuracy", "–"), sPre = ui.stat("Precision", "–"), sRec = ui.stat("Recall (rare)", "–"), sF1 = ui.stat("F1", "–"), sBal = ui.stat("Balanced acc.", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, marginTop: "8px", minHeight: "2.6em" } });
    card.body.append(h("div", { class: "controls col" }, shareSeg, modeSeg, tS), plotHost,
      h("div", { class: "legend" }, h("span", null, h("i", { style: { background: RARE } }), "rare class"), h("span", null, h("i", { style: { background: COMMON } }), "common class"), h("span", null, "dark line: where P(rare) = threshold")),
      h("div", { class: "side-by-side even", style: { marginTop: "12px" } }, cm, h("div", { class: "readout", style: { marginTop: 0 } }, sAcc, sPre, sRec, sF1, sBal)), note);
    plot.onresize = draw;

    function refit() {
      const nRare = Math.max(4, Math.round((share / (1 - share)) * P.common.length));
      pts = P.common.concat(P.rare.slice(0, Math.min(nRare, P.rare.length)));
      model = train(pts, weighted);
      draw();
    }
    const prob = (x, y) => 1 / (1 + Math.exp(-(model.w1 * x + model.w2 * y + model.b)));
    function draw() {
      plot.clear();
      plot.region((x, y) => QP.blend2(1 - prob(x, y), 0.45), 6, `${share}-${weighted}-${plot.w}`);
      // boundary: w1 x + w2 y + b = logit(thr)
      const L = Math.log(thr / (1 - thr));
      const [x0, x1] = plot.o.xlim;
      if (Math.abs(model.w2) > 1e-6) plot.line([x0, x1], [x0, x1].map((x) => (L - model.b - model.w1 * x) / model.w2), { color: C.ink, width: 3 });
      let tp = 0, fn = 0, fp = 0, tn = 0;
      for (const p of pts) {
        const flag = prob(p.x, p.y) >= thr;
        if (p.c === 1 && flag) tp++;
        else if (p.c === 1) fn++;
        else if (flag) fp++;
        else tn++;
      }
      for (const p of pts.filter((q) => q.c === 0)) plot.point(p.x, p.y, { r: 4.5, fill: COMMON, stroke: "#fff", lw: 1, alpha: 0.8 });
      for (const p of pts.filter((q) => q.c === 1)) plot.point(p.x, p.y, { r: 6.5, fill: RARE, stroke: "#fff", lw: 1.8 });
      TP.n.textContent = tp; FN.n.textContent = fn; FP.n.textContent = fp; TN.n.textContent = tn;
      const n = tp + fn + fp + tn, rec = tp / (tp + fn || 1), pre = tp + fp ? tp / (tp + fp) : 0, spec = tn / (tn + fp || 1);
      const f1 = pre + rec ? (2 * pre * rec) / (pre + rec) : 0, bal = (rec + spec) / 2, acc = (tp + tn) / n;
      const pct = (v) => `${Math.round(v * 100)}<small>%</small>`;
      sAcc.set(pct(acc));
      sPre.set(tp + fp ? pct(pre) : "–");
      sRec.set(pct(rec), rec < 0.5 ? "bad" : rec > 0.85 ? "good" : "");
      sF1.set(pct(f1));
      sBal.set(pct(bal), bal < 0.7 ? "bad" : bal > 0.85 ? "good" : "");
      note.textContent = !weighted && share <= 0.05 && rec < 0.5
        ? "Plain training finds the cheapest way to a small average loss: mostly ignore the rare class. Accuracy still looks great."
        : weighted ? "Class weights make every rare example count as much as many common ones, so the boundary moves to protect them."
        : "Try a smaller rare share, then switch on class weights, or lower the threshold.";
    }
    refit();
  }
})();

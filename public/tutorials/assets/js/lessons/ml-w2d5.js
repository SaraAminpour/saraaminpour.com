/* w3d5: overfitting and regularization. Degree, penalty, weights and validation error. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("reg", "Degree and leash", "orange: training · gray: validation");
    if (!card) return;
    const C = QP.colors;
    const r = QP.rng(21);
    const truth = (x) => Math.sin(2 * Math.PI * x);
    const train = Array.from({ length: 15 }, () => r()).sort((a, b) => a - b).map((x) => ({ x, y: truth(x) + 0.25 * r.normal() }));
    const val = Array.from({ length: 120 }, () => r()).map((x) => ({ x, y: truth(x) + 0.25 * r.normal() }));
    const T = (p) => ({ x: 2 * p.x - 1, y: p.y }); // fit on t = 2x - 1 for stable numbers
    let degree = 4, method = "none", logLam = -3;

    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [0, 1], ylim: [-2, 2], aspect: 0.72, ticks: true, xlabel: "x", ylabel: "y", minH: 260, maxH: 400, xstep: 0.2, ystep: 1 });
    right.append(h("div", { class: "kbd-hint" }, "Size of each weight |w_k| (log scale)"));
    const coefBox = h("div", { style: { display: "flex", alignItems: "flex-end", gap: "3px", height: "120px", padding: "6px 4px 0", borderBottom: "2px solid rgba(76,60,140,.18)" } });
    const coefLbl = h("div", { style: { display: "flex", gap: "3px", padding: "2px 4px 0" } });
    right.append(coefBox, coefLbl);
    right.append(h("div", { class: "kbd-hint", style: { marginTop: "12px" } }, "Error as the degree grows (log scale)"));
    const chart = QP.chart(right, { xlim: [0.5, 14.5], ylim: [-2.3, 0.7], aspect: 0.45, minH: 150, maxH: 200, xstep: 2, ystep: 1, yfmt: (v) => (v === Math.round(v) ? "10^" + v : "") });
    const dS = ui.slider({ label: "degree", min: 1, max: 14, step: 1, value: degree, oninput: (v) => { degree = v; draw(false); } });
    const mSeg = ui.seg({ label: "Penalty", options: [{ value: "none", label: "None" }, { value: "ridge", label: "Ridge (L2)" }, { value: "lasso", label: "Lasso (L1)" }], value: method, onchange: (v) => { method = v; lS.style.opacity = v === "none" ? 0.4 : 1; draw(true); } });
    const lS = ui.slider({ label: "λ", min: -6, max: 0, step: 0.1, value: logLam, fmt: (v) => "10^" + v.toFixed(1), oninput: (v) => { logLam = v; if (method === "none") { method = "ridge"; mSeg.set("ridge"); lS.style.opacity = 1; } draw(true); } });
    lS.style.opacity = 0.4;
    const sTr = ui.stat("training MSE", "–"), sVa = ui.stat("validation MSE", "–"), sNz = ui.stat("non-zero weights", "–");
    card.body.append(h("div", { class: "controls" }, dS, mSeg), h("div", { class: "controls" }, lS), h("div", { class: "readout" }, sTr, sVa, sNz));

    const fitW = (d) => {
      const pts = train.map(T);
      const lam = method === "none" ? 0 : Math.pow(10, logLam);
      return method === "lasso" ? QP.ml.polyLasso(pts, d, lam, 600) : QP.ml.polyRidge(pts, d, lam);
    };
    const mse = (w, set) => QP.math.mean(set.map((p) => (QP.ml.polyEval(w, 2 * p.x - 1) - p.y) ** 2));
    let curve = null;
    function errorCurve() {
      const ds = [], tr = [], va = [];
      for (let d = 1; d <= 14; d++) {
        const w = fitW(d);
        ds.push(d);
        tr.push(Math.log10(Math.max(1e-3, mse(w, train))));
        va.push(Math.log10(Math.max(1e-3, Math.min(5, mse(w, val)))));
      }
      return { ds, tr, va };
    }
    function draw(recurve) {
      if (recurve || !curve) curve = errorCurve();
      const w = fitW(degree);
      plot.clear();
      plot.fn(truth, { color: C.ink3, width: 2, dash: [6, 6] });
      for (const p of val) plot.point(p.x, p.y, { r: 2.6, fill: "rgba(140,133,163,0.45)", stroke: null });
      plot.fn((x) => QP.ml.polyEval(w, 2 * x - 1), { color: method === "none" ? C.qc : C.ml, width: 3.5, n: 400 });
      for (const p of train) plot.point(p.x, p.y, { r: 6, fill: C.c0, stroke: "#fff", lw: 2 });
      // coefficient bars (skip the bias w_0)
      coefBox.innerHTML = "";
      coefLbl.innerHTML = "";
      let nz = 0;
      for (let k = 1; k <= 14; k++) {
        const v = k <= degree ? Math.abs(w[k]) : null;
        const zero = v != null && v < 1e-6;
        if (v != null && !zero) nz++;
        const hpct = v == null || zero ? 0 : QP.math.clamp((Math.log10(v) + 4) / 9, 0.02, 1) * 100;
        coefBox.appendChild(h("div", { title: v == null ? "" : `|w_${k}| = ${v.toExponential(2)}`, style: { flex: "1", height: hpct + "%", borderRadius: "6px 6px 2px 2px", transition: "height .35s cubic-bezier(.34,1.56,.64,1)", background: v == null ? "transparent" : method === "none" ? "linear-gradient(180deg,#cdbfff,#7b5cfa)" : "linear-gradient(180deg,#a4eed9,#17a98c)" } }));
        coefLbl.appendChild(h("div", { style: { flex: "1", textAlign: "center", fontSize: "0.68rem", fontWeight: 800, color: zero ? "#e5566b" : C.ink3 } }, v == null ? "" : zero ? "0" : String(k)));
      }
      const tr = mse(w, train), va = mse(w, val);
      sTr.set(tr.toFixed(3));
      sVa.set(va < 10 ? va.toFixed(3) : "huge!", va < 0.1 ? "good" : va > 0.3 ? "bad" : "");
      sNz.set(`${nz} of ${degree}`);
      chart.marker = degree;
      chart.draw([
        { x: curve.ds, y: curve.tr, color: C.c1, name: "training error", points: true, r: 3 },
        { x: curve.ds, y: curve.va, color: C.c0, name: "validation error", points: true, r: 3 },
      ]);
    }
    plot.onresize = () => draw(false);
    chart.onresize = () => draw(false);
    draw(true);
  }
})();

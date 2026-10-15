/* qc-w6d5: error mitigation for a Bell state's ⟨ZZ⟩. Gate noise is amplified by folding (1, 3, 5 CNOTs) and
   extrapolated back to zero; readout errors are undone with the calibration factor. Shot noise included. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("mitigate", "Zero-noise extrapolation", "make it worse on purpose, then extrapolate");
    if (!card) return;
    let p = 0.03, e = 0.04, shots = 10000, readoutFix = false, model = "linear", seed = 1;
    const plot = new QP.Plot(card.body, { xlim: [-0.2, 5.6], ylim: [0.5, 1.06], aspect: 0.5, minH: 200, maxH: 320, ticks: true, xlabel: "noise scale λ (CNOTs folded: 1, 3, 5)", ylabel: "⟨ZZ⟩" });
    const pS = ui.slider({ label: "CNOT error", min: 0, max: 0.08, step: 0.005, value: p, fmt: (v) => `${(v * 100).toFixed(1)}%`, color: C.qc, oninput: (v) => { p = v; draw(); } });
    const eS = ui.slider({ label: "readout error (each qubit)", min: 0, max: 0.1, step: 0.005, value: e, fmt: (v) => `${(v * 100).toFixed(1)}%`, color: "#ff8a50", oninput: (v) => { e = v; draw(); } });
    const shotSeg = ui.seg({ label: "Shots per point", options: [{ value: 1000, label: "1,000" }, { value: 10000, label: "10,000" }, { value: 100000, label: "100,000" }], value: shots, onchange: (v) => { shots = +v; draw(); } });
    const fitSeg = ui.seg({ label: "Fit", options: [{ value: "linear", label: "straight line" }, { value: "quad", label: "parabola (Richardson)" }, { value: "exp", label: "exponential" }], value: model, onchange: (v) => { model = v; draw(); } });
    const roT = ui.toggle({ label: "undo readout errors (calibration)", checked: false, onchange: (v) => { readoutFix = v; draw(); } });
    const againB = ui.button("Run the experiment again", () => { seed++; draw(); }, "btn soft small");
    const sR = ui.stat("measured at λ = 1", "–"), sM = ui.stat("mitigated estimate", "–"), sI = ui.stat("ideal", "1.000", "good");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3.2em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls col" }, pS, eS, shotSeg, fitSeg, roT), h("div", { class: "btn-row", style: { marginTop: "6px" } }, againB), h("div", { class: "readout" }, sR, sM, sI), note);
    plot.onresize = draw;

    const LAMBDAS = [1, 3, 5];
    function measure() {
      const r = QP.rng(seed * 7919);
      const ro = (1 - 2 * e) ** 2; // symmetric readout flips shrink ⟨ZZ⟩ by (1 − 2e)²
      return LAMBDAS.map((lam) => {
        const trueE = (1 - p) ** lam, measured = trueE * ro;
        const sd = Math.sqrt(Math.max(1e-9, 1 - measured * measured) / shots);
        const value = measured + sd * r.normal();
        return readoutFix ? { lam, y: value / ro, sd: sd / ro } : { lam, y: value, sd };
      });
    }
    function fit(pts) {
      const xs = pts.map((q) => q.lam), ys = pts.map((q) => q.y);
      if (model === "quad") {
        // the parabola through the three points, evaluated anywhere (Lagrange form)
        const f = (x) => xs.reduce((s, xi, i) => s + ys[i] * xs.reduce((m, xj, j) => (j === i ? m : (m * (x - xj)) / (xi - xj)), 1), 0);
        return { f, at0: f(0) };
      }
      const Y = model === "exp" ? ys.map((y) => Math.log(Math.max(1e-6, y))) : ys;
      const mx = xs.reduce((a, b) => a + b) / 3, my = Y.reduce((a, b) => a + b) / 3;
      const b = xs.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
      const a = my - b * mx;
      const f = model === "exp" ? (x) => Math.exp(a + b * x) : (x) => a + b * x;
      return { f, at0: f(0) };
    }
    function draw() {
      const pts = measure(), F = fit(pts);
      const ys = pts.map((q) => q.y);
      plot.o.ylim = [Math.max(0, Math.min(0.9, Math.min(...ys) - 0.1)), 1.08];
      plot.clear();
      plot.seg(-0.2, 1, 5.6, 1, { color: C.ml, width: 2, dash: [6, 5] });
      plot.text("ideal", 5.3, 1.03, { color: C.ml, size: 11 });
      const xs = Array.from({ length: 57 }, (_, i) => i * 0.1);
      plot.line(xs, xs.map(F.f), { color: "#b9a7ff", width: 2.5, dash: [2, 0] });
      for (const q of pts) {
        plot.seg(q.lam, q.y - 2 * q.sd, q.lam, q.y + 2 * q.sd, { color: C.qc, width: 2 });
        plot.point(q.lam, q.y, { r: 6.5, fill: C.qc, stroke: "#fff", lw: 2 });
      }
      plot.point(0, F.at0, { r: 11, shape: "star", fill: C.butter, stroke: C.ink, lw: 2 });
      sR.set(pts[0].y.toFixed(3));
      const err = Math.abs(F.at0 - 1);
      sM.set(F.at0.toFixed(3), err < 0.01 ? "good" : err > 0.05 ? "bad" : "");
      const roPart = e > 0 && !readoutFix ? " Readout errors don't grow with folding, so extrapolation can't remove them: switch on the calibration." : "";
      const fitPart = model === "linear" && p > 0.04 ? " The true curve bends (it's an exponential), so a straight line misses a little." : model === "quad" && shots <= 1000 ? " A parabola through three noisy points swings wildly: more shots, or a simpler model." : "";
      note.textContent = `Each point is ⟨ZZ⟩ measured with λ times the CNOT noise (the bars are ±2 standard deviations of shot noise). The star is the extrapolation to λ = 0.${roPart}${fitPart}`;
    }
    draw();
  }
})();

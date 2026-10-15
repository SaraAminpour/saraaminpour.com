/* ml-w4d5: kernel showdown. Four datasets, four kernels (one of them a quantum kernel), honest scores. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const DATA = {
    moons: () => QP.data.moons(120, 0.2, 41),
    circles: () => QP.data.circles(120, 0.1, 0.45, 42),
    xor: () => QP.data.xor(120, 0.15, 43),
    blobs: () => QP.data.blobs(120, [[-0.8, -0.5], [0.8, 0.5]], 0.45, 44),
  };
  const KERNELS = {
    linear: { label: "linear", knob: null, make: () => QP.ml.kernels.linear() },
    poly: { label: "polynomial (degree 3)", knob: null, make: () => QP.ml.kernels.poly(3, 1) },
    rbf: { label: "RBF", knob: { name: "γ", min: -1, max: 1.7, init: 0.3, fmt: (v) => Math.pow(10, v).toFixed(2), val: (v) => Math.pow(10, v) }, make: (g) => QP.ml.kernels.rbf(g) },
    angle: { label: "quantum (angle encoding)", knob: { name: "scale s", min: 0.3, max: 4, init: 1.6, fmt: (v) => v.toFixed(2), val: (v) => v }, make: (s) => (a, b) => Math.cos((s * (a.x - b.x)) / 2) ** 2 * Math.cos((s * (a.y - b.y)) / 2) ** 2 },
  };

  function widget() {
    const card = QP.widget("showdown", "Kernel showdown", "choose on cross-validation, then take the final exam");
    if (!card) return;
    let ds = "moons", kn = "rbf", knob = KERNELS.rbf.knob.init, logC = 0;
    const sets = {};
    for (const k in DATA) {
      const pts = DATA[k]();
      sets[k] = { train: pts.slice(0, 80), test: pts.slice(80) };
    }
    const board = {}; // dataset -> kernel -> test accuracy
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-2, 2], ylim: [-1.6, 1.6], aspect: 0.62, maxH: 340, equal: true });
    const dSeg = ui.seg({ label: "Dataset", options: Object.keys(DATA), value: ds, onchange: (v) => { ds = v; fit(); } });
    const kSeg = ui.seg({ label: "Kernel", options: Object.keys(KERNELS).map((k) => ({ value: k, label: KERNELS[k].label })), value: kn, onchange: (v) => { kn = v; const kb = KERNELS[kn].knob; if (kb) { knob = kb.init; knobS.input.min = kb.min; knobS.input.max = kb.max; knobS.set(kb.init); knobS.querySelector("label").textContent = kb.name; } knobS.style.display = kb ? "" : "none"; fit(); } });
    const knobS = ui.slider({ label: "γ", min: -1, max: 1.7, step: 0.05, value: knob, fmt: (v) => (KERNELS[kn].knob ? KERNELS[kn].knob.fmt(v) : ""), oninput: (v) => { knob = v; fit(); } });
    const cS = ui.slider({ label: "C", min: -1, max: 2, step: 0.1, value: logC, fmt: (v) => Math.pow(10, v).toFixed(v < 0 ? 2 : 1), oninput: (v) => { logC = v; fit(); } });
    const sCV = ui.stat("5-fold CV accuracy (training points)", "–"), sSV = ui.stat("support vectors", "–");
    const exam = ui.button("Final exam: test this choice", () => takeExam(), "btn ml small");
    const examOut = h("div", { class: "small", style: { fontWeight: 800, minHeight: "1.4em" } });
    const tbl = h("div");
    card.body.append(h("div", { class: "controls col" }, dSeg, kSeg, knobS, cS), plotHost, h("div", { class: "readout" }, sCV, sSV), h("div", { class: "btn-row", style: { marginTop: "8px" } }, exam, examOut), h("div", { class: "kbd-hint", style: { marginTop: "12px" } }, "Your scoreboard (test accuracy of each final choice)"), tbl);
    plot.onresize = draw;
    let model = null;

    const kernel = () => { const K = KERNELS[kn]; return K.make(K.knob ? K.knob.val(knob) : null); };
    function cv() {
      const pts = sets[ds].train, k = kernel(), Cv = Math.pow(10, logC);
      let ok = 0;
      for (let f = 0; f < 5; f++) {
        const tr = pts.filter((_, i) => i % 5 !== f), va = pts.filter((_, i) => i % 5 === f);
        const m = QP.ml.svm(tr, k, Cv, { passes: 8 });
        ok += va.filter((p) => (m.decision(p) > 0 ? 1 : 0) === p.c).length;
      }
      return ok / pts.length;
    }
    function fit() {
      model = QP.ml.svm(sets[ds].train, kernel(), Math.pow(10, logC), { passes: 10 });
      sCV.set(`${Math.round(cv() * 100)}<small>%</small>`);
      sSV.set(String(model.sv.length));
      examOut.textContent = "";
      draw();
    }
    function takeExam() {
      const t = sets[ds].test;
      const acc = t.filter((p) => (model.decision(p) > 0 ? 1 : 0) === p.c).length / t.length;
      examOut.textContent = `Test accuracy: ${Math.round(acc * 100)}% (on 40 points the model never saw)`;
      (board[ds] = board[ds] || {})[kn] = acc;
      QP.confettiAt(exam, 40);
      drawBoard();
      draw(true);
    }
    function drawBoard() {
      const ks = Object.keys(KERNELS);
      let s = `<table class="tablelike score-tbl"><tr><th>dataset</th>${ks.map((k) => `<th>${KERNELS[k].label}</th>`).join("")}</tr>`;
      for (const d of Object.keys(DATA)) s += `<tr><td><b>${d}</b></td>${ks.map((k) => `<td>${board[d] && board[d][k] != null ? Math.round(board[d][k] * 100) + "%" : "·"}</td>`).join("")}</tr>`;
      tbl.innerHTML = s + "</table>";
    }
    function draw(showTest = false) {
      plot.clear();
      plot.region((x, y) => QP.blend2(1 / (1 + Math.exp(-2.5 * model.decision({ x, y }))), 0.8), 6, `${ds}-${kn}-${knob}-${logC}-${plot.w}`);
      for (const p of sets[ds].train) plot.point(p.x, p.y, { r: 4.5, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.3 });
      if (showTest) for (const p of sets[ds].test) plot.point(p.x, p.y, { r: 6, fill: "#fff", stroke: QP.classColor(p.c), lw: 2.5 });
    }
    knobS.style.display = "";
    drawBoard();
    fit();
  }
})();

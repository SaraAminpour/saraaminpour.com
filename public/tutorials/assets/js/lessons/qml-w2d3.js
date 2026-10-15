/* qml-w2d3: the quantum SVM, done properly. Two-moons data; choose the feature map, its bandwidth s and the SVM's C;
   support vectors are ringed. Cross-validation on the training points picks s and C; the test set is opened once. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  function encode(u, s, kind) {
    const x = [s * u[0], s * u[1]];
    const st = new QP.State(2);
    if (kind === "angle") return st.gate("RY", 0, x[0]).gate("RY", 1, x[1]);
    for (let r = 0; r < 2; r++) {
      st.gate("H", 0).gate("H", 1).gate("P", 0, 2 * x[0]).gate("P", 1, 2 * x[1]);
      st.cx(0, 1).gate("P", 1, 2 * (PI - x[0]) * (PI - x[1])).cx(0, 1);
    }
    return st;
  }

  function widget() {
    const card = QP.widget("qsvm2", "Tune a quantum SVM", "cross-validate, then take the exam once");
    if (!card) return;
    const raw = QP.data.moons(100, 0.16, 33);
    const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
    const lo = [Math.min(...xs), Math.min(...ys)], hi = [Math.max(...xs), Math.max(...ys)];
    const pts = raw.map((p) => ({ u: [(p.x - lo[0]) / (hi[0] - lo[0]), (p.y - lo[1]) / (hi[1] - lo[1])], c: p.c }));
    const train = pts.slice(0, 70), test = pts.slice(70);
    let kind = "zz", s = 1.5, logC = 0, model = null, examined = null;
    const kSeg = ui.seg({ label: "Feature map", options: [{ value: "angle", label: "angle" }, { value: "zz", label: "ZZ (2 layers)" }], value: kind, onchange: (v) => { kind = v; refit(); } });
    const sS = ui.slider({ label: "bandwidth s (angle = s × feature)", min: 0.2, max: 4, step: 0.05, value: s, fmt: (v) => v.toFixed(2), color: C.qml, oninput: (v) => { s = v; refit(); } });
    const cS = ui.slider({ label: "C", min: -1.5, max: 2, step: 0.1, value: logC, fmt: (v) => Math.pow(10, v).toFixed(v < 0 ? 2 : 1), color: C.qml, oninput: (v) => { logC = v; refit(); } });
    const tuneB = ui.button("Tune s and C by cross-validation", () => tune(), "btn qc small");
    const examB = ui.button("Final exam: test once", () => exam(), "btn ml small");
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-0.05, 1.05], ylim: [-0.05, 1.05], aspect: 0.95, equal: true, minH: 240, maxH: 380 });
    const sTr = ui.stat("training accuracy", "–"), sCV = ui.stat("5-fold CV accuracy", "–"), sSV = ui.stat("support vectors", "–"), sTe = ui.stat("test accuracy", "not opened yet");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.8em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls col" }, kSeg, sS, cS), h("div", { class: "btn-row", style: { marginTop: "6px" } }, tuneB, examB), plotHost, h("div", { class: "readout" }, sTr, sCV, sSV, sTe), note);
    plot.onresize = draw;

    let cache = new Map();
    const stateOf = (p) => { const key = p.u.join(",") + kind + s; let st = cache.get(key); if (!st) { st = encode(p.u, s, kind); cache.set(key, st); } return st; };
    const kernel = (a, b) => stateOf(a).fidelity(stateOf(b));
    const asPts = (arr) => arr.map((p) => ({ x: p.u[0], y: p.u[1], c: p.c, u: p.u }));
    const acc = (m, arr) => arr.filter((p) => (m.decision(p) > 0 ? 1 : 0) === p.c).length / arr.length;
    function cv(sv, cv_) {
      const keepS = s, keepK = kind;
      s = sv;
      let ok = 0;
      for (let f = 0; f < 5; f++) {
        const tr = asPts(train.filter((_, i) => i % 5 !== f)), va = asPts(train.filter((_, i) => i % 5 === f));
        const m = QP.ml.svm(tr, kernel, cv_, { passes: 8 });
        ok += va.filter((p) => (m.decision(p) > 0 ? 1 : 0) === p.c).length;
      }
      s = keepS; kind = keepK;
      return ok / train.length;
    }
    function refit() {
      cache = new Map();
      examined = null;
      model = QP.ml.svm(asPts(train), kernel, Math.pow(10, logC), { passes: 10 });
      sTr.set(`${Math.round(acc(model, asPts(train)) * 100)}<small>%</small>`);
      sCV.set(`${Math.round(cv(s, Math.pow(10, logC)) * 100)}<small>%</small>`);
      sSV.set(`${model.sv.length} of 70`);
      sTe.set("not opened yet", "");
      note.textContent = model.sv.length > 50 ? "Almost every training point is a support vector: the kernel makes points look so different that the SVM memorizes. Lower s." : s < 0.4 ? "With a tiny bandwidth every state looks alike, so the boundary is too simple. Raise s." : "Change the knobs while watching the cross-validation score, not the test score.";
      draw();
    }
    function tune() {
      let best = { a: -1 };
      for (const sv of [0.5, 1, 1.5, 2, 3]) for (const lc of [-0.5, 0, 0.5, 1]) {
        cache = new Map();
        const a = cv(sv, Math.pow(10, lc));
        if (a > best.a + 1e-9) best = { a, sv, lc };
      }
      s = best.sv; logC = best.lc;
      sS.set(s); cS.set(logC);
      refit();
      note.textContent = `Cross-validation on the 70 training points chose s = ${s} and C = ${Math.pow(10, logC).toFixed(1)} (CV accuracy ${Math.round(best.a * 100)}%). Now take the final exam, once.`;
    }
    function exam() {
      if (!model) return;
      examined = acc(model, asPts(test));
      sTe.set(`${Math.round(examined * 100)}<small>%</small>`, "good");
      QP.confettiAt(examB, 30);
      note.textContent = `Test accuracy on 30 unseen points: ${Math.round(examined * 100)}%. That's the number to report. Changing the knobs now and re-testing would quietly turn the test set into a validation set.`;
      draw();
    }
    function draw() {
      plot.clear();
      if (model) plot.region((x, y) => QP.blend2(1 / (1 + Math.exp(-3 * model.decision({ x, y, u: [x, y] }))), 0.8), 6, `${kind}-${s}-${logC}-${plot.w}`);
      const svSet = new Set(model ? model.sv : []);
      train.forEach((p, i) => plot.point(p.u[0], p.u[1], { r: svSet.has(i) ? 7 : 4.5, fill: QP.classColor(p.c), stroke: svSet.has(i) ? C.ink : "#fff", lw: svSet.has(i) ? 2.2 : 1.2 }));
      if (examined != null) test.forEach((p) => plot.point(p.u[0], p.u[1], { r: 6, fill: "#fff", stroke: QP.classColor(p.c), lw: 2.5 }));
    }
    refit();
  }
})();

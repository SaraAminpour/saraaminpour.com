/* w5d5: be the teacher. Label a few points and watch labels spread through a k-nearest-neighbor graph. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("semi", "Be the teacher", "click points to label them");
    if (!card) return;
    const C = QP.colors;
    const pts = QP.data.moons(170, 0.07, 41).map((p) => ({ x: p.x, y: p.y * 1.3, c: p.c, label: null }));
    // one starting label per class, near the "inner" ends of the moons where a straight cut fails
    const pick = (c, fx) => pts.filter((p) => p.c === c).sort((a, b) => fx(a) - fx(b))[0];
    pick(0, (p) => Math.hypot(p.x + 0.85, p.y - 0.15)).label = 0;
    pick(1, (p) => Math.hypot(p.x - 0.3, p.y + 0.2)).label = 1;
    let k = 7, mode = "spread", F = null, iters = 0, model = null, running = null;
    const plot = new QP.Plot(card.body, { xlim: [-1.9, 2.1], ylim: [-1.45, 1.5], aspect: 0.62, equal: true, minH: 260, maxH: 420 });
    const modeSeg = ui.seg({ label: "Method", options: [{ value: "spread", label: "Label spreading" }, { value: "sup", label: "Supervised only" }], value: mode, onchange: (v) => { mode = v; reset(); } });
    const kS = ui.slider({ label: "neighbors k", min: 3, max: 25, step: 1, value: k, oninput: (v) => { k = v; reset(); } });
    const spreadB = ui.button("Spread", () => spread(), "btn ml small");
    const resetB = ui.button("Clear my labels", () => { pts.forEach((p) => (p.label = null)); pick(0, (p) => Math.hypot(p.x + 0.85, p.y - 0.15)).label = 0; pick(1, (p) => Math.hypot(p.x - 0.3, p.y + 0.2)).label = 1; reset(); }, "btn soft small");
    const sL = ui.stat("labels given", "–"), sA = ui.stat("accuracy on all points", "–"), sI = ui.stat("spreading rounds", "0");
    card.body.append(h("div", { class: "controls" }, modeSeg, kS), h("div", { class: "controls" }, spreadB, resetB), h("div", { class: "readout" }, sL, sA, sI),
      h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.c0 } }), "class 0"), h("span", null, h("i", { style: { background: C.c1 } }), "class 1"), h("span", null, h("i", { style: { background: C.unl } }), "no label yet"), h("span", null, "★ labeled by the teacher (you)")));

    function reset() {
      if (running) running.stop();
      running = null;
      model = QP.ml.labelSpread(pts, k, 0.9);
      F = null;
      iters = 0;
      draw();
    }
    function prediction(i) {
      if (mode === "sup") {
        let best = null, bd = Infinity;
        for (const q of pts) if (q.label != null) {
          const d = (q.x - pts[i].x) ** 2 + (q.y - pts[i].y) ** 2;
          if (d < bd) { bd = d; best = q.label; }
        }
        return best == null ? null : { label: best, conf: 1 };
      }
      if (pts[i].label != null) return { label: pts[i].label, conf: 1 };
      if (!F) return null;
      const [a, b] = F[i];
      const s = a + b;
      if (s < 1e-12) return null;
      return { label: b > a ? 1 : 0, conf: Math.max(a, b) / s, mass: Math.min(1, Math.max(0.15, 1 + Math.log10(s) / 6)) };
    }
    function draw() {
      plot.clear();
      if (mode === "sup") {
        plot.region((x, y) => {
          let best = null, bd = Infinity;
          for (const q of pts) if (q.label != null) {
            const d = (q.x - x) ** 2 + (q.y - y) ** 2;
            if (d < bd) { bd = d; best = q.label; }
          }
          return best == null ? [250, 248, 255, 0] : QP.blend2(best, 0.6);
        }, 7, "sup" + pts.map((p) => (p.label == null ? "-" : p.label)).join(""));
      } else {
        for (const [i, j] of model.edges()) plot.seg(pts[i].x, pts[i].y, pts[j].x, pts[j].y, { color: "rgba(140,133,163,0.18)", width: 1 });
      }
      let correct = 0, decided = 0;
      pts.forEach((p, i) => {
        const pr = prediction(i);
        let fill = C.unl, alpha = 1;
        if (pr) {
          fill = QP.classColor(pr.label);
          alpha = pr.mass == null ? 1 : 0.35 + 0.65 * pr.mass;
          decided++;
          if (pr.label === p.c) correct++;
        }
        if (p.label != null) plot.point(p.x, p.y, { r: 11, shape: "star", fill: QP.classColor(p.label), stroke: C.ink, lw: 2 });
        else plot.point(p.x, p.y, { r: 4.8, fill, stroke: "#fff", lw: 1.2, alpha });
      });
      sL.set(String(pts.filter((p) => p.label != null).length));
      sA.set(decided ? ((correct / pts.length) * 100).toFixed(0) + "%" : "–");
      sI.set(String(iters));
    }
    function spread() {
      if (mode === "sup") return QP.toast("Switch to label spreading first: supervised-only doesn't use unlabeled points.", "ui-sparkle");
      if (running) return;
      model = QP.ml.labelSpread(pts, k, 0.9);
      iters = 0;
      running = QP.loop(() => {
        for (let r = 0; r < 3; r++) {
          F = model.step();
          iters++;
        }
        draw();
        if (iters >= 180) {
          running = null;
          return false;
        }
      });
    }
    plot.on({
      down: (p) => {
        let best = -1, bd = 16;
        pts.forEach((q, i) => {
          const d = Math.hypot(plot.X(q.x) - p.px, plot.Y(q.y) - p.py);
          if (d < bd) { bd = d; best = i; }
        });
        if (best < 0) return;
        const q = pts[best];
        q.label = q.label == null ? 0 : q.label === 0 ? 1 : null;
        reset();
      },
    });
    plot.onresize = draw;
    reset();
  }
})();

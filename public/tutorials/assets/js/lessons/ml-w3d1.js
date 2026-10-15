/* w3d1: logistic regression. Steer the boundary, see probabilities and cross-entropy, then train. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("logreg", "Steer the boundary", "sliders or Train");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    const pts = QP.data.blobs(90, [[-1.1, -0.55], [0.9, 0.8]], 0.62, 14);
    let ang = 200, steep = 1.2, off = 0.6;
    let training = false;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [-2.9, 2.9], ylim: [-2.5, 2.6], aspect: 0.86, equal: true, minH: 280, maxH: 440 });
    right.append(h("div", { class: "kbd-hint" }, "Each point on the sigmoid: its score z and probability p"));
    const sig = new QP.Plot(right, { xlim: [-7, 7], ylim: [-0.08, 1.08], aspect: 0.62, ticks: true, xlabel: "score z", ylabel: "p", minH: 180, maxH: 260, ystep: 0.5 });
    const aS = ui.slider({ label: "direction", min: 0, max: 359, step: 1, value: ang, fmt: (v) => v + "°", oninput: (v) => { ang = v; draw(); } });
    const sS = ui.slider({ label: "steepness |w|", min: 0.2, max: 8, step: 0.1, value: steep, fmt: (v) => v.toFixed(1), oninput: (v) => { steep = v; draw(); } });
    const oS = ui.slider({ label: "shift b", min: -3, max: 3, step: 0.05, value: off, fmt: (v) => v.toFixed(2), oninput: (v) => { off = v; draw(); } });
    const train = ui.button("Train (gradient descent)", () => run(), "btn ml small");
    const sCE = ui.stat("Cross-entropy", "–"), sAcc = ui.stat("Accuracy", "–");
    right.append(h("div", { class: "controls col" }, aS, sS, oS), h("div", { class: "btn-row", style: { marginTop: "8px" } }, train), h("div", { class: "readout" }, sCE, sAcc));

    const params = () => [steep * Math.cos(ang * deg), steep * Math.sin(ang * deg), off];
    function stats(w) {
      let ce = 0, ok = 0;
      for (const p of pts) {
        const z = w[0] * p.x + w[1] * p.y + w[2];
        const q = QP.math.clamp(QP.math.sigmoid(z), 1e-9, 1 - 1e-9);
        ce += p.c ? -Math.log(q) : -Math.log(1 - q);
        if ((z > 0 ? 1 : 0) === p.c) ok++;
      }
      return { ce: ce / pts.length, acc: ok / pts.length };
    }
    function draw() {
      const w = params();
      plot.clear();
      plot.region((x, y) => QP.blend2(QP.math.sigmoid(w[0] * x + w[1] * y + w[2]), 0.85), 5, null);
      // boundary w0 x + w1 y + w2 = 0 and a little arrow along w (towards class 1)
      const n = Math.hypot(w[0], w[1]);
      const px = (-w[2] * w[0]) / (n * n), py = (-w[2] * w[1]) / (n * n);
      const dx = -w[1] / n, dy = w[0] / n;
      plot.line([px - dx * 8, px + dx * 8], [py - dy * 8, py + dy * 8], { color: C.ink, width: 3 });
      plot.arrow(px, py, px + (w[0] / n) * 0.7, py + (w[1] / n) * 0.7, { color: C.c1, width: 3 });
      for (const p of pts) {
        const z = w[0] * p.x + w[1] * p.y + w[2];
        const wrong = (z > 0 ? 1 : 0) !== p.c;
        plot.point(p.x, p.y, { r: 5.5, fill: QP.classColor(p.c), stroke: wrong ? "#e5566b" : "#fff", lw: wrong ? 3 : 1.6 });
      }
      // sigmoid panel
      sig.clear();
      sig.fn(QP.math.sigmoid, { color: "#b9a7ff", width: 4 });
      sig.seg(0, -0.08, 0, 1.08, { color: C.ink3, width: 1, dash: [4, 4] });
      for (const p of pts) {
        const z = QP.math.clamp(w[0] * p.x + w[1] * p.y + w[2], -6.9, 6.9);
        sig.point(z, QP.math.sigmoid(z), { r: 4.5, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.2, alpha: 0.85 });
      }
      const s = stats(w);
      sCE.set(s.ce.toFixed(3));
      sAcc.set((s.acc * 100).toFixed(0) + "%");
    }
    function run() {
      if (training) return;
      training = true;
      const model = QP.ml.logreg(params());
      let k = 0;
      QP.loop(() => {
        for (let i = 0; i < 3; i++) model.step(pts, 0.6);
        const [w0, w1, b] = model.w;
        steep = Math.min(8, Math.hypot(w0, w1));
        ang = ((Math.atan2(w1, w0) / deg) % 360 + 360) % 360;
        off = QP.math.clamp(b, -3, 3);
        aS.set(Math.round(ang));
        sS.set(steep);
        oS.set(off);
        draw();
        if (++k > 120) {
          training = false;
          return false;
        }
      });
    }
    plot.onresize = draw;
    sig.onresize = draw;
    draw();
  }
})();

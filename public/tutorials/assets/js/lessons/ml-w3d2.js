/* ml-w3d2: cross-entropy and softmax. The surprise curve and its gradient, a softmax mixer, and a 3-class model. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const CLS = ["#ff8a50", "#5577f5", "#1fb394"];
  QP.onReady(() => {
    surprise();
    mixer();
    three();
  });

  function surprise() {
    const card = QP.widget("surprise", "Surprise, and the push it gives", "the true class is 1");
    if (!card) return;
    let p = 0.25;
    const left = h("div"), right = h("div");
    const c1 = QP.chart(left, { xlim: [0, 1], ylim: [0, 5], xlabel: "probability given to the true class", ylabel: "loss", aspect: 0.62, maxH: 260 });
    const c2 = QP.chart(right, { xlim: [-6, 6], ylim: [0, 1.05], xlabel: "score z (negative = confidently wrong)", ylabel: "push |dL/dz|", aspect: 0.62, maxH: 260 });
    const pS = ui.slider({ label: "p(true class)", min: 0.01, max: 1, step: 0.01, value: p, fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { p = v; draw(); } });
    const sCE = ui.stat("Cross-entropy −log p", "–"), sMSE = ui.stat("Squared error (1 − p)²", "–");
    card.body.append(h("div", { class: "side-by-side even" }, h("div", null, h("div", { class: "kbd-hint" }, "Cross-entropy: the surprise −log p"), left), h("div", null, h("div", { class: "kbd-hint" }, "How hard each loss pushes the score, if the model is wrong"), right)), h("div", { class: "controls" }, pS), h("div", { class: "readout" }, sCE, sMSE));
    const ps = QP.math.linspace(0.005, 1, 200), zs = QP.math.linspace(-6, 6, 241);
    function draw() {
      c1.marker = p;
      c1.draw([{ name: "cross-entropy", x: ps, y: ps.map((v) => Math.min(5, -Math.log(v))), color: C.ml }, { name: "squared error", x: ps, y: ps.map((v) => (1 - v) ** 2), color: "#bcb7cb", dash: [6, 5] }, { x: [p], y: [Math.min(5, -Math.log(p))], color: C.ml, points: true, line: false, r: 7 }]);
      const z = Math.log(p / (1 - p + 1e-12));
      c2.marker = QP.math.clamp(z, -6, 6);
      c2.draw([{ name: "cross-entropy: 1 − σ(z)", x: zs, y: zs.map((v) => 1 - sig(v)), color: C.ml }, { name: "squared error: 2σ(z)(1 − σ(z))²", x: zs, y: zs.map((v) => 2 * sig(v) * (1 - sig(v)) ** 2), color: C.c3, dash: [6, 5] }]);
      sCE.set((-Math.log(p)).toFixed(2), p < 0.1 ? "bad" : p > 0.8 ? "good" : "");
      sMSE.set(((1 - p) ** 2).toFixed(2));
    }
    draw();
  }

  function mixer() {
    const card = QP.widget("softmax", "The softmax mixer", "three scores in, three probabilities out");
    if (!card) return;
    const z = [2, 1, 0.1];
    let T = 1;
    const names = ["cat", "dog", "rabbit"];
    const sliders = z.map((v, k) => ui.slider({ label: `score for ${names[k]}`, min: -4, max: 4, step: 0.1, value: v, fmt: (x) => x.toFixed(1), color: CLS[k], oninput: (x) => { z[k] = x; draw(); } }));
    const tS = ui.slider({ label: "temperature T", min: 0.2, max: 5, step: 0.05, value: 1, fmt: (x) => x.toFixed(2), oninput: (x) => { T = x; draw(); } });
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: names, height: 110, colors: CLS.map((c) => `linear-gradient(180deg, ${c}55, ${c})`), fmt: (v) => v.toFixed(3) });
    const eq = h("div", { class: "clab-ket", style: { whiteSpace: "normal" } });
    card.body.append(h("div", { class: "side-by-side" }, h("div", { class: "controls col" }, ...sliders, tS), barsHost), eq);
    function draw() {
      const m = Math.max(...z);
      const e = z.map((v) => Math.exp((v - m) / T));
      const s = e.reduce((a, b) => a + b, 0);
      const p = e.map((v) => v / s);
      bars.set(p);
      eq.textContent = `p = e^(z/T) / Σ e^(z/T) = (${p.map((v) => v.toFixed(2)).join(", ")}) · sum = ${p.reduce((a, b) => a + b, 0).toFixed(2)}`;
    }
    draw();
  }

  function three() {
    const card = QP.widget("three", "Three classes, one softmax", "press Train");
    if (!card) return;
    const pts = QP.data.blobs(150, [[-1, -0.6, 0], [1.1, -0.5, 1], [0, 1.1, 2]], 0.45, 8);
    let W, b, steps, timer = null;
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-2.6, 2.6], ylim: [-2.2, 2.4], aspect: 0.62, maxH: 380, equal: true });
    const train = ui.button("Train", () => run(), "btn ml small");
    const reset = ui.button("Reset", () => init(), "btn soft small");
    const sL = ui.stat("Cross-entropy", "–"), sA = ui.stat("Accuracy", "–"), sN = ui.stat("Steps", "0");
    card.body.append(plotHost, h("div", { class: "btn-row", style: { marginTop: "10px" } }, train, reset), h("div", { class: "readout" }, sL, sA, sN));
    plot.onresize = draw;
    function init() {
      if (timer) timer.stop();
      timer = null;
      const r = QP.rng(3);
      W = [0, 1, 2].map(() => [0.3 * r.normal(), 0.3 * r.normal()]);
      b = [0, 0, 0];
      steps = 0;
      draw();
    }
    function probs(x, y) {
      const z = [0, 1, 2].map((k) => W[k][0] * x + W[k][1] * y + b[k]);
      const m = Math.max(...z);
      const e = z.map((v) => Math.exp(v - m));
      const s = e[0] + e[1] + e[2];
      return e.map((v) => v / s);
    }
    function step(lr = 0.5) {
      const gW = [[0, 0], [0, 0], [0, 0]], gb = [0, 0, 0];
      for (const p of pts) {
        const q = probs(p.x, p.y);
        for (let k = 0; k < 3; k++) {
          const d = q[k] - (p.c === k ? 1 : 0); // the famous p - y
          gW[k][0] += d * p.x;
          gW[k][1] += d * p.y;
          gb[k] += d;
        }
      }
      for (let k = 0; k < 3; k++) {
        W[k][0] -= (lr * gW[k][0]) / pts.length;
        W[k][1] -= (lr * gW[k][1]) / pts.length;
        b[k] -= (lr * gb[k]) / pts.length;
      }
      steps++;
    }
    function run() {
      if (timer) return;
      let n = 0;
      timer = QP.loop(() => {
        for (let i = 0; i < 3; i++) step();
        draw();
        n++;
        if (n > 80) { timer = null; return false; }
      });
    }
    function draw() {
      plot.clear();
      plot.region((x, y) => {
        const q = probs(x, y);
        const k = QP.math.argmax(q);
        const rgb = [[255, 138, 80], [85, 119, 245], [31, 179, 148]][k];
        const t = Math.min(1, Math.max(0, (q[k] - 1 / 3) / (2 / 3)));
        return [255 + (rgb[0] - 255) * 0.45 * t, 255 + (rgb[1] - 255) * 0.45 * t, 255 + (rgb[2] - 255) * 0.45 * t, 1];
      }, 6, `${steps}-${plot.w}`);
      for (const p of pts) plot.point(p.x, p.y, { r: 5.5, fill: CLS[p.c], stroke: "#fff", lw: 1.5 });
      let loss = 0, ok = 0;
      for (const p of pts) {
        const q = probs(p.x, p.y);
        loss -= Math.log(Math.max(q[p.c], 1e-12));
        if (QP.math.argmax(q) === p.c) ok++;
      }
      sL.set((loss / pts.length).toFixed(3));
      sA.set(`${Math.round((100 * ok) / pts.length)}<small>%</small>`);
      sN.set(String(steps));
    }
    init();
  }
})();

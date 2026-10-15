/* w6d2: quantum kernels. One-qubit overlaps, and a two-qubit ZZ-feature-map SVM simulated in the browser. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => {
    overlap();
    qsvm();
  });

  function overlap() {
    const card = QP.widget("overlap", "Two data points, two arrows", "k = |⟨φ(x)|φ(x′)⟩|²");
    if (!card) return;
    const C = QP.colors;
    let a = 0.6, b = 2.0;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.92, maxH: 380, labels: "kets", az: 1.35, el: 0.25 });
    bloch.vectors = [{ v: [0, 0, 1], color: "#7b5cfa", label: "φ(x)" }, { v: [0, 0, 1], color: "#ff8a50", label: "φ(x′)" }];
    const aS = ui.slider({ label: "data point x", min: 0, max: 6.28, step: 0.01, value: a, fmt: (v) => v.toFixed(2), color: "#7b5cfa", oninput: (v) => { a = v; draw(); } });
    const bS = ui.slider({ label: "data point x′", min: 0, max: 6.28, step: 0.01, value: b, fmt: (v) => v.toFixed(2), color: "#ff8a50", oninput: (v) => { b = v; draw(); } });
    const meterFill = h("div", { style: { height: "100%", width: "0%", borderRadius: "999px", background: "linear-gradient(90deg,#ffb59a,#ff8fb8,#7b5cfa)", transition: "width .2s" } });
    const kTxt = h("div", { style: { fontFamily: "Fredoka, sans-serif", fontSize: "1.6rem", fontWeight: 600, color: C.ink } });
    right.append(h("div", { class: "controls col", style: { marginTop: 0 } }, aS, bS), h("div", { class: "kbd-hint", style: { marginTop: "12px" } }, "Quantum kernel value"), kTxt, h("div", { style: { height: "14px", borderRadius: "999px", background: "rgba(123,92,250,.1)", overflow: "hidden", margin: "4px 0 12px" } }, meterFill));
    const chart = QP.chart(right, { xlim: [-3.3, 3.3], ylim: [-0.05, 1.05], aspect: 0.5, minH: 150, maxH: 200, xlabel: "x − x′", ylabel: "k", ystep: 0.5 });
    const xs = QP.math.linspace(-3.3, 3.3, 120);
    function draw() {
      bloch.vectors[0].v = [Math.sin(a), 0, Math.cos(a)];
      bloch.vectors[1].v = [Math.sin(b), 0, Math.cos(b)];
      bloch.draw();
      const k = Math.cos((a - b) / 2) ** 2;
      kTxt.textContent = `k(x, x′) = ${k.toFixed(3)}`;
      meterFill.style.width = (k * 100).toFixed(1) + "%";
      let d = a - b;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      chart.marker = d;
      chart.draw([{ x: xs, y: xs.map((v) => Math.cos(v / 2) ** 2), color: C.qc, width: 3, name: "cos²((x − x′)/2)" }]);
      chart.point(d, k, { r: 7, fill: C.pink, stroke: "#fff", lw: 2 });
    }
    chart.onresize = draw;
    draw();
  }

  function qsvm() {
    const card = QP.widget("qsvm", "A quantum-kernel SVM", "change the encoding scale");
    if (!card) return;
    const C = QP.colors;
    const PI = Math.PI;
    // moons rescaled to angles in [0, π/2]
    const raw = QP.data.moons(110, 0.15, 77);
    const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
    const mx = [Math.min(...xs), Math.max(...xs)], my = [Math.min(...ys), Math.max(...ys)];
    const all = raw.map((p) => ({ x: ((p.x - mx[0]) / (mx[1] - mx[0])) * (PI / 2), y: ((p.y - my[0]) / (my[1] - my[0])) * (PI / 2), c: p.c }));
    const train = all.slice(0, 70).sort((a, b) => a.c - b.c);
    const test = all.slice(70);
    let scale = 1.0, model = null;
    const zz = (x0, x1) => {
      const a = scale * x0, b = scale * x1;
      const s = new QP.State(2);
      for (let r = 0; r < 2; r++) {
        s.gate("H", 0).gate("H", 1).gate("P", 0, 2 * a).gate("P", 1, 2 * b).cx(0, 1).gate("P", 1, 2 * (PI - a) * (PI - b)).cx(0, 1);
      }
      return s;
    };
    const kern = (p, q) => p.sv.fidelity(q.sv);
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side even" }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "Decision map (rings = test points)"));
    const plot = new QP.Plot(left, { xlim: [-0.05, PI / 2 + 0.05], ylim: [-0.05, PI / 2 + 0.05], aspect: 1, equal: true, minH: 240, maxH: 380 });
    right.append(h("div", { class: "kbd-hint" }, "Kernel matrix of the 70 training points"));
    const kStage = h("div", { class: "widget-stage", style: { background: "#fff", display: "grid", placeItems: "center", padding: "8px" } });
    const kc = h("canvas", { width: 70, height: 70, style: { width: "100%", maxWidth: "340px", aspectRatio: "1", imageRendering: "pixelated", borderRadius: "8px" } });
    kStage.appendChild(kc);
    right.append(kStage);
    const sS = ui.slider({ label: "encoding scale", min: 0.1, max: 3.5, step: 0.05, value: scale, fmt: (v) => v.toFixed(2), oninput: (v) => { scale = v; schedule(); } });
    const sMean = ui.stat("average kernel value", "–"), sTr = ui.stat("training accuracy", "–"), sTe = ui.stat("test accuracy", "–");
    card.body.append(h("div", { class: "controls" }, sS), h("div", { class: "readout" }, sMean, sTr, sTe));
    let timer = null;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(solve, 60); };

    function solve() {
      for (const p of all) p.sv = zz(p.x, p.y);
      model = QP.ml.svm(train, kern, 1.0, { passes: 10 });
      draw();
    }
    function draw() {
      plot.clear();
      plot.region((x, y) => {
        const q = { x, y, sv: zz(x, y) };
        return QP.blend2(QP.math.sigmoid(3 * model.decision(q)), 0.85);
      }, 8, "s" + scale);
      for (const p of train) plot.point(p.x, p.y, { r: 5, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.4 });
      for (const p of test) plot.point(p.x, p.y, { r: 5.5, fill: "#fff", stroke: QP.classColor(p.c), lw: 2.6 });
      // kernel matrix
      const n = train.length;
      const ctx = kc.getContext("2d");
      const img = ctx.createImageData(n, n);
      let sum = 0, cnt = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const v = model.K[i][j];
          if (i !== j) { sum += v; cnt++; }
          const k = 4 * (i * n + j);
          img.data[k] = 255 - (255 - 74) * v;
          img.data[k + 1] = 255 - (255 - 20) * v;
          img.data[k + 2] = 255 - (255 - 140) * v;
          img.data[k + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const acc = (set) => QP.math.mean(set.map((p) => ((model.decision(p) > 0 ? 1 : 0) === p.c ? 1 : 0)));
      sMean.set((sum / cnt).toFixed(2));
      sTr.set((acc(train) * 100).toFixed(0) + "%");
      sTe.set((acc(test) * 100).toFixed(0) + "%");
    }
    plot.onresize = () => model && draw();
    solve();
  }
})();

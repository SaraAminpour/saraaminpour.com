/* ml-w4d3: the kernel trick. Two roads to the same number, and an RBF kernel explorer. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => {
    polyk();
    street();
    kernel();
  });

  function street() {
    const card = QP.widget("svm", "The widest street", "drag the points");
    if (!card) return;
    const C = QP.colors;
    const pts = QP.data.blobs(26, [[-1.1, -0.65], [1.0, 0.7]], 0.45, 31);
    let logC = 0;
    let model = null;
    const plot = new QP.Plot(card.body, { xlim: [-2.6, 2.6], ylim: [-2.1, 2.1], aspect: 0.62, equal: true, minH: 260, maxH: 420 });
    plot.c.classList.add("grab");
    const cS = ui.slider({ label: "C (strictness)", min: -2, max: 2, step: 0.1, value: logC, fmt: (v) => Math.pow(10, v).toFixed(v < 0 ? 2 : 1), oninput: (v) => { logC = v; solve(); draw(); } });
    const sW = ui.stat("street width", "–"), sSV = ui.stat("support vectors", "–"), sIn = ui.stat("points inside the street", "–");
    card.body.append(h("div", { class: "controls" }, cS), h("div", { class: "readout" }, sW, sSV, sIn), h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "transparent", border: "3px solid #f0ac2e" } }), "support vector"), h("span", { class: "muted" }, "dashed lines: the edges of the street (f = ±1)")));
    function solve() {
      model = QP.ml.svm(pts, QP.ml.kernels.linear(), Math.pow(10, logC), { passes: 20 });
      // explicit w for the linear kernel
      let w0 = 0, w1 = 0;
      pts.forEach((p, i) => {
        const a = model.alpha[i] * (p.c ? 1 : -1);
        w0 += a * p.x;
        w1 += a * p.y;
      });
      model.w = [w0, w1];
    }
    function draw() {
      const [w0, w1] = model.w, b = model.b;
      const n = Math.hypot(w0, w1) || 1e-9;
      plot.clear();
      plot.region((x, y) => {
        const f = w0 * x + w1 * y + b;
        return f > 0 ? [214, 222, 254, 0.9] : [255, 222, 206, 0.9];
      }, 6, `${w0.toFixed(4)},${w1.toFixed(4)},${b.toFixed(4)}`);
      // street: lines w·x + b = s for s in {-1, 0, 1}
      const L = 10;
      for (const s of [-1, 0, 1]) {
        const px = ((s - b) * w0) / (n * n), py = ((s - b) * w1) / (n * n);
        const dx = -w1 / n, dy = w0 / n;
        plot.line([px - dx * L, px + dx * L], [py - dy * L, py + dy * L], { color: C.ink, width: s === 0 ? 3 : 1.6, dash: s === 0 ? null : [7, 6] });
      }
      let inside = 0;
      pts.forEach((p, i) => {
        const f = w0 * p.x + w1 * p.y + b;
        if (Math.abs(f) < 1 - 1e-3) inside++;
        if (model.alpha[i] > 1e-6) plot.point(p.x, p.y, { r: 12, fill: null, stroke: "#f0ac2e", lw: 3 });
        plot.point(p.x, p.y, { r: 6.5, fill: QP.classColor(p.c), stroke: "#fff", lw: 2 });
      });
      sW.set((2 / n).toFixed(2));
      sSV.set(String(model.sv.length));
      sIn.set(String(inside));
    }
    let drag = -1;
    plot.on({
      down: (p) => {
        drag = -1;
        let best = 18;
        pts.forEach((q, i) => {
          const d = Math.hypot(plot.X(q.x) - p.px, plot.Y(q.y) - p.py);
          if (d < best) { best = d; drag = i; }
        });
      },
      drag: (p) => {
        if (drag < 0) return;
        pts[drag].x = QP.math.clamp(p.x, plot.o.xlim[0], plot.o.xlim[1]);
        pts[drag].y = QP.math.clamp(p.y, plot.o.ylim[0], plot.o.ylim[1]);
        solve();
        draw();
      },
      up: () => (drag = -1),
    });
    plot.onresize = draw;
    solve();
    draw();
  }

  function kernel() {
    const card = QP.widget("kernel", "The RBF kernel at work", "change γ");
    if (!card) return;
    const C = QP.colors;
    const raw = QP.data.circles(64, 0.08, 0.45, 13);
    // sort by class, then by angle, so the kernel matrix shows its structure
    const pts = raw.slice().sort((a, b) => a.c - b.c || Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
    let logG = 0.3;
    let model = null;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side even" }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "Decision map (support vectors ringed)"));
    const plot = new QP.Plot(left, { xlim: [-1.4, 1.4], ylim: [-1.4, 1.4], aspect: 1, equal: true, minH: 240, maxH: 380 });
    right.append(h("div", { class: "kbd-hint" }, "Kernel matrix: similarity of every pair"));
    const kStage = h("div", { class: "widget-stage", style: { background: "#fff", display: "grid", placeItems: "center", padding: "8px" } });
    const kc = h("canvas", { width: 64, height: 64, style: { width: "100%", maxWidth: "380px", aspectRatio: "1", imageRendering: "pixelated", borderRadius: "8px", cursor: "default" } });
    kStage.appendChild(kc);
    right.append(kStage, h("div", { class: "small muted", style: { marginTop: "6px" } }, "Rows and columns: the 64 points, outer ring first and inner circle second (the bottom-right block), each sorted around the circle."));
    const gS = ui.slider({ label: "γ", min: -1, max: 2.3, step: 0.05, value: logG, fmt: (v) => Math.pow(10, v).toFixed(v < 1 ? 2 : 0), oninput: (v) => { logG = v; solve(); draw(); } });
    const sAcc = ui.stat("training accuracy", "–"), sSV = ui.stat("support vectors", "–");
    card.body.append(h("div", { class: "controls" }, gS), h("div", { class: "readout" }, sAcc, sSV));
    function solve() {
      model = QP.ml.svm(pts, QP.ml.kernels.rbf(Math.pow(10, logG)), 1.0, { passes: 15 });
    }
    function draw() {
      plot.clear();
      plot.region((x, y) => {
        const f = model.decision({ x, y });
        return QP.blend2(QP.math.sigmoid(2.5 * f), 0.85);
      }, 6, "g" + logG);
      pts.forEach((p, i) => {
        if (model.alpha[i] > 1e-6) plot.point(p.x, p.y, { r: 9.5, fill: null, stroke: "#f0ac2e", lw: 2.5 });
        plot.point(p.x, p.y, { r: 4.8, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.4 });
      });
      const acc = QP.math.mean(pts.map((p) => ((model.decision(p) > 0 ? 1 : 0) === p.c ? 1 : 0)));
      sAcc.set((acc * 100).toFixed(0) + "%");
      sSV.set(`${model.sv.length} of ${pts.length}`);
      // kernel matrix image, purple scale
      const ctx = kc.getContext("2d");
      const img = ctx.createImageData(64, 64);
      for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
          const v = model.K[i][j];
          const k = 4 * (i * 64 + j);
          img.data[k] = 255 - (255 - 74) * v;
          img.data[k + 1] = 255 - (255 - 20) * v;
          img.data[k + 2] = 255 - (255 - 140) * v;
          img.data[k + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    plot.onresize = draw;
    solve();
    draw();
  }

  // the kernel trick in numbers: phi(x).phi(z) equals (x.z)^2 for the degree-2 polynomial kernel
  function polyk() {
    const card = QP.widget("polyk", "Two roads to the same number", "drag the two points");
    if (!card) return;
    const C = QP.colors;
    const P = [{ x: 1, y: 2, col: "#ff8a50", name: "x" }, { x: 2.5, y: -0.6, col: "#5577f5", name: "z" }];
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-3, 3], ylim: [-3, 3], aspect: 1, equal: true, ticks: true, minH: 220, maxH: 300, axes: true });
    const left = h("div", { class: "kt-box" }), right = h("div", { class: "kt-box" });
    card.body.append(h("div", { class: "side-by-side" }, plotHost, h("div", null, left, right)));
    const phi = (p) => [p.x * p.x, Math.SQRT2 * p.x * p.y, p.y * p.y];
    const f = (v) => v.toFixed(2);
    let drag = -1;
    plot.on({
      down: (q) => { drag = P.findIndex((p) => Math.hypot(plot.X(p.x) - q.px, plot.Y(p.y) - q.py) < 22); },
      drag: (q) => { if (drag >= 0) { P[drag].x = QP.math.clamp(q.x, -2.8, 2.8); P[drag].y = QP.math.clamp(q.y, -2.8, 2.8); draw(); } },
      up: () => (drag = -1),
    });
    plot.c.classList.add("grab");
    plot.onresize = draw;
    function draw() {
      plot.clear();
      for (const p of P) {
        plot.arrow(0, 0, p.x, p.y, { color: p.col, width: 3 });
        plot.point(p.x, p.y, { r: 9, fill: p.col, stroke: "#fff", lw: 2.5 });
        plot.text(p.name, p.x + 0.25, p.y + 0.25, { color: p.col, size: 14, font: "head" });
      }
      const [a, b] = P;
      const fa = phi(a), fb = phi(b);
      const lift = fa[0] * fb[0] + fa[1] * fb[1] + fa[2] * fb[2];
      const dot = a.x * b.x + a.y * b.y;
      left.innerHTML = `<b>Road 1: lift, then compare</b><br>φ(x) = (${fa.map(f).join(", ")})<br>φ(z) = (${fb.map(f).join(", ")})<br>φ(x)·φ(z) = <b>${lift.toFixed(3)}</b><br><span class="muted">3 new features each, then a dot product</span>`;
      const g = (v) => (v < 0 ? `(${f(v)})` : f(v));
      right.innerHTML = `<b>Road 2: the kernel</b><br>x·z = ${g(a.x)}·${g(b.x)} + ${g(a.y)}·${g(b.y)} = ${dot.toFixed(3)}<br>k(x, z) = (x·z)² = <b>${(dot * dot).toFixed(3)}</b><br><span class="muted">one dot product in 2D, then a square</span>`;
    }
    draw();
  }
})();

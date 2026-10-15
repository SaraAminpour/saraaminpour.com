/* qml-w3d1: a variational quantum classifier trained in the browser. The point is uploaded once as two angles,
   trainable layers rotate each qubit and entangle them with a CNOT, ⟨Z⟩ of qubit 1 is the score, and training is
   plain gradient descent on the mean squared error with parameter-shift gradients. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("vqc", "Train a quantum classifier", "parameter shift, live");
    if (!card) return;
    const C = QP.colors;
    const PI = Math.PI;
    const EPOCHS = 60;
    const scale = (pts) => {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      return pts.map((p) => ({ x: -PI / 2 + ((p.x - x0) / (x1 - x0)) * PI, y: -PI / 2 + ((p.y - y0) / (y1 - y0)) * PI, c: p.c }));
    };
    const datasets = {
      xor: scale(QP.data.xor(80, 0.18, 5)),
      blobs: scale(QP.data.blobs(80, [[-0.6, -0.35], [0.6, 0.35]], 0.32, 7)),
      moons: scale(QP.data.moons(80, 0.1, 5)),
    };
    let ds = "xor", layers = 2, ent = true, lr = 0.3, W, losses, epoch, running = null, runs = 0;

    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px", overflowX: "auto" } });
    const circ = QP.circuit(circHost, { n: 2, gates: [], minCols: 4, cell: 46, scale: 1.05 });
    const left = h("div"), right = h("div");
    card.body.append(circHost, h("div", { class: "side-by-side", style: { marginTop: "12px" } }, left, right));
    const plot = new QP.Plot(left, { xlim: [-1.75, 1.75], ylim: [-1.75, 1.75], aspect: 1, equal: true, minH: 260, maxH: 400 });
    right.append(h("div", { class: "kbd-hint" }, "Loss: mean squared error of ⟨Z⟩"));
    const chart = QP.chart(right, { xlim: [0, EPOCHS], ylim: [0, 2], aspect: 0.55, minH: 150, maxH: 200, xlabel: "epoch", ystep: 0.5 });
    const dsSeg = ui.seg({ label: "Data", options: [{ value: "xor", label: "XOR" }, { value: "blobs", label: "Blobs" }, { value: "moons", label: "Moons" }], value: ds, onchange: (v) => { ds = v; reset(); } });
    const lSeg = ui.seg({ label: "Trainable layers", options: [1, 2, 3], value: layers, onchange: (v) => { layers = +v; reset(); } });
    const eT = ui.toggle({ label: "CNOT in every layer", checked: ent, onchange: (v) => { ent = v; reset(); } });
    const lrS = ui.slider({ label: "learning rate", min: 0.05, max: 1, step: 0.05, value: lr, fmt: (v) => v.toFixed(2), oninput: (v) => (lr = v) });
    const trainB = ui.button("Train", () => toggle(), "btn qml small");
    const resetB = ui.button("New random weights", () => reset(), "btn soft small");
    const sE = ui.stat("epoch", "0"), sA = ui.stat("accuracy", "–"), sR = ui.stat("circuit runs so far", "0");
    right.append(h("div", { class: "controls col" }, dsSeg, lSeg, eT, lrS), h("div", { class: "btn-row", style: { marginTop: "8px" } }, trainB, resetB), h("div", { class: "readout" }, sE, sA, sR));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3em", marginTop: "10px" } });
    card.body.append(note);

    function score(x0, x1, w) {
      const s = new QP.State(2);
      s.gate("RY", 0, x0).gate("RY", 1, x1);
      for (let l = 0; l < layers; l++) {
        s.gate("RY", 0, w[4 * l]).gate("RZ", 0, w[4 * l + 1]).gate("RY", 1, w[4 * l + 2]).gate("RZ", 1, w[4 * l + 3]);
        if (ent) s.cx(0, 1);
      }
      return s.expZ(1);
    }
    function reset() {
      stop();
      const r = QP.rng((Math.random() * 1e9) | 0);
      W = Array.from({ length: 4 * layers }, () => 0.6 * r.normal());
      losses = [];
      epoch = 0;
      runs = 0;
      trainB.textContent = "Train";
      const gates = [{ name: "ENC", q: 0, label: "x₁" }, { name: "ENC", q: 1, label: "x₂" }];
      for (let l = 0; l < layers; l++) {
        gates.push({ name: "W", q: 0, label: "RY", param: `w${4 * l}` }, { name: "W", q: 1, label: "RY", param: `w${4 * l + 2}` });
        gates.push({ name: "W", q: 0, label: "RZ", param: `w${4 * l + 1}` }, { name: "W", q: 1, label: "RZ", param: `w${4 * l + 3}` });
        if (ent) gates.push({ name: "CX", c: 0, t: 1 });
      }
      gates.push({ name: "M", q: 1 });
      circ.render(gates);
      draw();
    }
    function trainEpoch() {
      const pts = datasets[ds];
      const N = pts.length;
      const f = pts.map((q) => score(q.x, q.y, W));
      const t = pts.map((q) => (q.c ? -1 : 1));
      losses.push(f.reduce((a, v, i) => a + (v - t[i]) ** 2, 0) / N);
      const g = W.map((_, k) => {
        const wp = W.slice(), wm = W.slice();
        wp[k] += PI / 2;
        wm[k] -= PI / 2;
        let s = 0;
        pts.forEach((q, i) => (s += (2 * (f[i] - t[i]) * (score(q.x, q.y, wp) - score(q.x, q.y, wm))) / 2));
        return s / N;
      });
      W = W.map((w, k) => w - lr * g[k]);
      runs += N * (1 + 2 * W.length);
      epoch++;
    }
    function toggle() {
      if (running) return stop();
      if (epoch >= EPOCHS) reset();
      trainB.textContent = "Pause";
      let frame = 0;
      running = QP.loop(() => {
        trainEpoch();
        if (++frame % 2 === 0 || epoch >= EPOCHS) draw();
        if (epoch >= EPOCHS) {
          stop();
          return false;
        }
      });
    }
    function stop() {
      if (running) running.stop();
      running = null;
      trainB.textContent = epoch >= EPOCHS ? "Train again" : "Train";
    }
    function draw() {
      const pts = datasets[ds];
      plot.clear();
      plot.region((x, y) => QP.blend2((1 - score(x, y, W)) / 2, 0.85), 8, null);
      let ok = 0;
      for (const q of pts) {
        const right = (score(q.x, q.y, W) < 0 ? 1 : 0) === q.c;
        if (right) ok++;
        plot.point(q.x, q.y, { r: 5, fill: QP.classColor(q.c), stroke: right ? "#fff" : C.ink, lw: right ? 1.4 : 2.2 });
      }
      const top = Math.max(2, ...losses);
      chart.o.ylim = [0, Math.ceil(top * 2) / 2];
      chart.draw(losses.length ? [{ x: losses.map((_, i) => i + 1), y: losses, color: C.qml, width: 3 }] : []);
      const acc = ok / pts.length;
      sE.set(String(epoch));
      sA.set(Math.round(acc * 100) + "%");
      sR.set(runs.toLocaleString("en-US"));
      const perEpoch = `One epoch = ${pts.length} points × (1 + 2 × ${W.length} weights) = ${(pts.length * (1 + 2 * W.length)).toLocaleString("en-US")} circuit runs.`;
      let msg = "";
      if (!ent) msg = "No CNOT: nothing carries x₁ over to the measured qubit, so the boundary can only depend on x₂ (horizontal stripes). ";
      else if (epoch >= 40 && ds === "moons") msg = "The loss has stalled with points still wrong: with the point uploaded once, the circuit only mixes a sine and a cosine of each feature, too few shapes for the moons. Thursday's re-uploading adds more. ";
      else if (epoch >= 40 && acc > 0.95) msg = "Trained: the score ⟨Z⟩ is positive on the orange side and negative on the blue side. ";
      note.textContent = msg + perEpoch;
    }
    plot.onresize = draw;
    chart.onresize = draw;
    reset();
  }
})();

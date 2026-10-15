/* qml-w3d5: the duel. The week's quantum classifier (3 uploads, 12 circuit weights plus the scale a and b) and a
   2-3-1 tanh network (13 weights) train side by side on the same 80 points, with cross-entropy and Adam, and then
   face the same 40 test points once. Counters show the bills: circuit runs (and shots) versus multiply-adds. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  const Q_EPOCHS = 60, N_STEPS = 300;
  QP.onReady(() => widget());

  const sig = (z) => 1 / (1 + Math.exp(-z));

  function widget() {
    const card = QP.widget("duel", "Quantum classifier versus tiny network", "same data, same loss");
    if (!card) return;
    let kind = "moons", split = 1, data, Q, N, frame = 0, loop = null, done = false;

    const dSeg = ui.seg({ label: "Data", options: [{ value: "moons", label: "Moons" }, { value: "circles", label: "Circles" }, { value: "xor", label: "XOR" }], value: kind, onchange: (v) => { kind = v; reset(); } });
    const raceB = ui.button("Race", () => toggle(), "btn qml small");
    const splitB = ui.button("New split", () => { split++; reset(); }, "btn soft small");
    card.body.append(h("div", { class: "controls" }, dSeg, raceB, splitB));
    const side = (title, sub, color) => {
      const host = h("div");
      host.append(h("div", { class: "du-title", style: { color } }, title), h("div", { class: "kbd-hint" }, sub));
      return host;
    };
    const left = side("Quantum classifier", "2 qubits · 3 uploads · 12 circuit weights + a, b", C.qc);
    const right = side("Tiny network", "2 inputs · 3 tanh units · 1 output · 13 weights", C.ml);
    card.body.append(h("div", { class: "side-by-side even", style: { marginTop: "8px" } }, left, right));
    const opts = { xlim: [-2, 2], ylim: [-2, 2], aspect: 1, equal: true, minH: 240, maxH: 360 };
    const pQ = new QP.Plot(left, opts), pN = new QP.Plot(right, opts);
    const qTr = ui.stat("train accuracy", "–"), qTe = ui.stat("test accuracy", "–"), qCost = ui.stat("circuit runs", "0");
    const nTr = ui.stat("train accuracy", "–"), nTe = ui.stat("test accuracy", "–"), nCost = ui.stat("multiply-adds", "0");
    left.append(h("div", { class: "readout" }, qTr, qTe, qCost));
    right.append(h("div", { class: "readout" }, nTr, nTe, nCost));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3.2em", marginTop: "8px" } });
    card.body.append(note);

    // ---------------------------------------------------------------- data: 80 training and 40 test points
    function makeData() {
      const raw = kind === "moons" ? QP.data.moons(120, 0.15, 10 + split) : kind === "circles" ? QP.data.circles(120, 0.08, 0.5, 20 + split) : QP.data.xor(120, 0.25, 30 + split);
      QP.rng(40 + split).shuffle(raw);
      const train = raw.slice(0, 80), test = raw.slice(80);
      const xs = train.map((p) => p.x), ys = train.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const sc = (p) => ({ x: -PI / 2 + ((p.x - x0) / (x1 - x0)) * PI, y: -PI / 2 + ((p.y - y0) / (y1 - y0)) * PI, c: p.c });
      return { train: train.map(sc), test: test.map(sc) };
    }

    // ---------------------------------------------------------------- the quantum classifier
    function zq(x0, x1, w) {
      const s = new QP.State(2);
      for (let l = 0; l < 3; l++) {
        s.gate("RY", 0, x0).gate("RY", 1, x1);
        s.gate("RY", 0, w[4 * l]).gate("RZ", 0, w[4 * l + 1]).gate("RY", 1, w[4 * l + 2]).gate("RZ", 1, w[4 * l + 3]).cx(0, 1);
      }
      return s.expZ(1);
    }
    const qProb = (p) => sig(-Q.th[12] * zq(p.x, p.y, Q.th) + Q.th[13]);
    function qEpoch() {
      const pts = data.train, n = pts.length, th = Q.th;
      const f = pts.map((p) => zq(p.x, p.y, th));
      const dz = pts.map((p, i) => (sig(-th[12] * f[i] + th[13]) - p.c) / n);
      const g = new Array(14).fill(0);
      for (let k = 0; k < 12; k++) {
        const up = th.slice(), dn = th.slice();
        up[k] += PI / 2;
        dn[k] -= PI / 2;
        pts.forEach((p, i) => (g[k] += (-th[12] * dz[i] * (zq(p.x, p.y, up) - zq(p.x, p.y, dn))) / 2));
      }
      pts.forEach((p, i) => { g[12] += -f[i] * dz[i]; g[13] += dz[i]; });
      adam(Q, g, 0.1);
      Q.runs += n * 25;
      Q.epoch++;
    }

    // ---------------------------------------------------------------- the tiny network
    const net = (p, th) => {
      const hdn = [0, 1, 2].map((j) => Math.tanh(th[2 * j] * p.x + th[2 * j + 1] * p.y + th[6 + j]));
      return { hdn, z: th[9] * hdn[0] + th[10] * hdn[1] + th[11] * hdn[2] + th[12] };
    };
    const nProb = (p) => sig(net(p, N.th).z);
    function nStep() {
      const pts = data.train, n = pts.length, th = N.th;
      const g = new Array(13).fill(0);
      pts.forEach((p) => {
        const { hdn, z } = net(p, th);
        const dz = (sig(z) - p.c) / n;
        for (let j = 0; j < 3; j++) {
          g[9 + j] += dz * hdn[j];
          const da = dz * th[9 + j] * (1 - hdn[j] * hdn[j]);
          g[2 * j] += da * p.x;
          g[2 * j + 1] += da * p.y;
          g[6 + j] += da;
        }
        g[12] += dz;
      });
      adam(N, g, 0.05);
      N.madds += n * 27;
      N.step++;
    }

    function adam(M, g, lr) {
      M.t++;
      for (let k = 0; k < g.length; k++) {
        M.m[k] = 0.9 * M.m[k] + 0.1 * g[k];
        M.v[k] = 0.999 * M.v[k] + 0.001 * g[k] * g[k];
        M.th[k] -= (lr * (M.m[k] / (1 - 0.9 ** M.t))) / (Math.sqrt(M.v[k] / (1 - 0.999 ** M.t)) + 1e-8);
      }
    }
    function reset() {
      stop();
      data = makeData();
      const r = QP.rng(50 + split);
      Q = { th: [...Array.from({ length: 12 }, () => 0.6 * r.normal()), 2, 0], m: new Array(14).fill(0), v: new Array(14).fill(0), t: 0, runs: 0, epoch: 0 };
      const u = (fanIn) => (2 * r() - 1) / Math.sqrt(fanIn);
      N = { th: [...Array.from({ length: 9 }, () => u(2)), ...Array.from({ length: 4 }, () => u(3))], m: new Array(13).fill(0), v: new Array(13).fill(0), t: 0, madds: 0, step: 0 };
      done = false;
      raceB.textContent = "Race";
      draw();
    }
    function toggle() {
      if (loop) return stop();
      if (done) reset();
      raceB.textContent = "Pause";
      loop = QP.loop(() => {
        qEpoch();
        for (let k = 0; k < N_STEPS / Q_EPOCHS; k++) nStep();
        if (Q.epoch >= Q_EPOCHS) done = true;
        if (++frame % 2 === 0 || done) draw();
        if (done) {
          stop();
          return false;
        }
      });
    }
    function stop() {
      if (loop) loop.stop();
      loop = null;
      raceB.textContent = done ? "Race again" : "Race";
    }
    const acc = (pts, prob) => pts.filter((p) => (prob(p) > 0.5 ? 1 : 0) === p.c).length / pts.length;
    function drawOne(plot, prob) {
      plot.clear();
      plot.region((x, y) => QP.blend2(prob({ x, y }), 0.85), 8, null);
      data.train.forEach((p) => plot.point(p.x, p.y, { r: 4.2, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.2 }));
      data.test.forEach((p) => plot.point(p.x, p.y, { r: 4.6, fill: "#fff", stroke: QP.classColor(p.c), lw: 2.2 }));
    }
    function draw() {
      drawOne(pQ, qProb);
      drawOne(pN, nProb);
      const pct = (v) => `${Math.round(v * 1000) / 10}<small>%</small>`;
      qTr.set(pct(acc(data.train, qProb)));
      nTr.set(pct(acc(data.train, nProb)));
      qTe.set(done ? pct(acc(data.test, qProb)) : "after the race");
      nTe.set(done ? pct(acc(data.test, nProb)) : "after the race");
      qCost.set(Q.runs.toLocaleString("en-US"));
      nCost.set(N.madds.toLocaleString("en-US"));
      if (!done) {
        note.textContent = Q.epoch
          ? `Training: ${Q.epoch} of ${Q_EPOCHS} epochs for the circuit, ${N.step} of ${N_STEPS} steps for the network. Rings are test points; nobody looks at them until the end.`
          : "Both models get the same 80 training points (filled dots), the same loss and the same optimizer. Press Race.";
        return;
      }
      const a = acc(data.test, qProb), b = acc(data.test, nProb);
      const gap = Math.round(Math.abs(a - b) * 40);
      note.textContent = `Test: quantum ${(100 * a).toFixed(1)}%, network ${(100 * b).toFixed(1)}%. ${gap === 0 ? "A tie." : gap <= 2 ? `A gap of ${gap} test point${gap > 1 ? "s" : ""} out of 40, which another split could easily reverse.` : `A gap of ${gap} test points out of 40: try a few more splits before you believe it.`} The bills differ more: ${Q.runs.toLocaleString("en-US")} circuit runs, or ${(Q.runs / 1000).toLocaleString("en-US")} million shots at 1,000 shots per run, against ${N.madds.toLocaleString("en-US")} multiply-adds that a laptop does in about a millisecond.`;
    }
    pQ.onresize = draw;
    pN.onresize = draw;
    reset();
  }
})();

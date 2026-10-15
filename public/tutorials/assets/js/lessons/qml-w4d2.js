/* qml-w4d2: same menu, classical chef. A re-uploading classifier with L uploads (week 3) and a classical surrogate,
   logistic regression on the (2L + 1)² Fourier features cos(ω·x), sin(ω·x) with frequencies up to L, train side by
   side on the same moons and face the same test points once. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  const sig = (z) => 1 / (1 + Math.exp(-z));

  function widget() {
    const card = QP.widget("baseline", "Same frequencies, classical model", "a Fourier surrogate");
    if (!card) return;
    let L = 3, split = 1, data, Q, S, loop = null, done = false, frame = 0;

    const lSeg = ui.seg({ label: "Frequencies up to L", options: [1, 2, 3], value: L, onchange: (v) => { L = +v; reset(); } });
    const trainB = ui.button("Train both", () => toggle(), "btn qml small");
    const splitB = ui.button("New split", () => { split++; reset(); }, "btn soft small");
    card.body.append(h("div", { class: "controls" }, lSeg, trainB, splitB));
    const side = (title, color) => {
      const host = h("div");
      const sub = h("div", { class: "kbd-hint" });
      host.append(h("div", { class: "du-title", style: { color } }, title), sub);
      host.sub = sub;
      return host;
    };
    const left = side("Quantum classifier", C.qc), right = side("Classical surrogate", C.ml);
    card.body.append(h("div", { class: "side-by-side even", style: { marginTop: "8px" } }, left, right));
    const opts = { xlim: [-2, 2], ylim: [-2, 2], aspect: 1, equal: true, minH: 240, maxH: 360 };
    const pQ = new QP.Plot(left, opts), pS = new QP.Plot(right, opts);
    const qTe = ui.stat("test accuracy", "–"), qCost = ui.stat("circuit runs", "0");
    const sTe = ui.stat("test accuracy", "–"), sCost = ui.stat("multiply-adds", "0");
    left.append(h("div", { class: "readout" }, qTe, qCost));
    right.append(h("div", { class: "readout" }, sTe, sCost));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3.2em", marginTop: "8px" } });
    card.body.append(note);

    function makeData() {
      const raw = QP.data.moons(120, 0.15, 60 + split);
      QP.rng(70 + split).shuffle(raw);
      const train = raw.slice(0, 80), test = raw.slice(80);
      const xs = train.map((p) => p.x), ys = train.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const sc = (p) => ({ x: -PI / 2 + ((p.x - x0) / (x1 - x0)) * PI, y: -PI / 2 + ((p.y - y0) / (y1 - y0)) * PI, c: p.c });
      return { train: train.map(sc), test: test.map(sc) };
    }

    // ---------------------------------------------------------------- the quantum classifier: L uploads
    function zq(x0, x1, w) {
      const s = new QP.State(2);
      for (let l = 0; l < L; l++) {
        s.gate("RY", 0, x0).gate("RY", 1, x1);
        s.gate("RY", 0, w[4 * l]).gate("RZ", 0, w[4 * l + 1]).gate("RY", 1, w[4 * l + 2]).gate("RZ", 1, w[4 * l + 3]).cx(0, 1);
      }
      return s.expZ(1);
    }
    const nW = () => 4 * L;
    const qProb = (p) => sig(-Q.th[nW()] * zq(p.x, p.y, Q.th) + Q.th[nW() + 1]);
    function qEpoch() {
      const pts = data.train, n = pts.length, th = Q.th, P = nW();
      const f = pts.map((p) => zq(p.x, p.y, th));
      const dz = pts.map((p, i) => (sig(-th[P] * f[i] + th[P + 1]) - p.c) / n);
      const g = new Array(P + 2).fill(0);
      for (let k = 0; k < P; k++) {
        const up = th.slice(), dn = th.slice();
        up[k] += PI / 2;
        dn[k] -= PI / 2;
        pts.forEach((p, i) => (g[k] += (-th[P] * dz[i] * (zq(p.x, p.y, up) - zq(p.x, p.y, dn))) / 2));
      }
      pts.forEach((p, i) => { g[P] += -f[i] * dz[i]; g[P + 1] += dz[i]; });
      adam(Q, g, 0.1);
      Q.runs += n * (1 + 2 * P);
      Q.epoch++;
    }

    // ---------------------------------------------------------------- the surrogate: logistic regression on Fourier features
    function pairs() {
      const out = [];
      for (let a = -L; a <= L; a++) for (let b = -L; b <= L; b++) if (a > 0 || (a === 0 && b > 0)) out.push([a, b]);
      return out;
    }
    function features(p) {
      const f = [1];
      for (const [a, b] of S.pairs) {
        const ph = a * p.x + b * p.y;
        f.push(Math.cos(ph), Math.sin(ph));
      }
      return f;
    }
    const sProb = (p) => sig(features(p).reduce((acc, v, k) => acc + v * S.th[k], 0));
    function sStep() {
      const pts = data.train, n = pts.length, F = S.th.length;
      const g = new Array(F).fill(0);
      pts.forEach((p, i) => {
        const phi = S.phi[i];
        const d = (sig(phi.reduce((acc, v, k) => acc + v * S.th[k], 0)) - p.c) / n;
        for (let k = 0; k < F; k++) g[k] += d * phi[k];
      });
      for (let k = 1; k < F; k++) g[k] += 1e-3 * S.th[k];             // a little ridge, like C in the notebook
      adam(S, g, 0.05);
      S.madds += 2 * n * F;
      S.step++;
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
      const r = QP.rng(80 + split);
      const P = nW();
      Q = { th: [...Array.from({ length: P }, () => 0.6 * r.normal()), 2, 0], m: new Array(P + 2).fill(0), v: new Array(P + 2).fill(0), t: 0, runs: 0, epoch: 0 };
      S = { pairs: [], th: [], m: [], v: [], t: 0, madds: 0, step: 0 };
      S.pairs = pairs();
      const F = 1 + 2 * S.pairs.length;
      S.th = new Array(F).fill(0);
      S.m = new Array(F).fill(0);
      S.v = new Array(F).fill(0);
      S.phi = data.train.map(features);
      left.sub.textContent = `2 qubits · ${L} upload${L > 1 ? "s" : ""} · ${P} circuit weights + a, b`;
      right.sub.textContent = `logistic regression on ${F} features cos(ω·x), sin(ω·x)`;
      done = false;
      trainB.textContent = "Train both";
      draw();
    }
    function toggle() {
      if (loop) return stop();
      if (done) reset();
      trainB.textContent = "Pause";
      loop = QP.loop(() => {
        qEpoch();
        for (let k = 0; k < 5; k++) sStep();
        if (Q.epoch >= 60) done = true;
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
      trainB.textContent = done ? "Train again" : "Train both";
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
      drawOne(pS, sProb);
      const pct = (v) => `${Math.round(v * 1000) / 10}<small>%</small>`;
      qTe.set(done ? pct(acc(data.test, qProb)) : "after training");
      sTe.set(done ? pct(acc(data.test, sProb)) : "after training");
      qCost.set(Q.runs.toLocaleString("en-US"));
      sCost.set(S.madds.toLocaleString("en-US"));
      if (!done) {
        note.textContent = Q.epoch
          ? "Training: the circuit by parameter shift, the surrogate by ordinary gradient descent on its features."
          : `Both models can only use frequencies up to ${L} in each feature: the circuit because it uploads each feature ${L} time${L > 1 ? "s" : ""}, the surrogate because those are its features. Press Train both.`;
        return;
      }
      const a = acc(data.test, qProb), b = acc(data.test, sProb);
      note.textContent = `Test: circuit ${(100 * a).toFixed(1)}%, surrogate ${(100 * b).toFixed(1)}%. Every function the circuit can draw is a weighted sum of the surrogate's features, so the surrogate can draw it too, and the classical one trains on a laptop in a blink.`;
    }
    pQ.onresize = draw;
    pS.onresize = draw;
    reset();
  }
})();

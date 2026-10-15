/* qml-w3d4: data re-uploading as a Fourier series. A one-qubit model W₀ · RX(x) · W₁ · … · RX(x) · W_L, read out as ⟨Z⟩,
   is fitted by Adam (parameter-shift gradients) to a target made of frequencies 1, 2 and 3. Next to the fit, the
   spectrum of both: with L uploads, the model can only make frequencies 0 to L. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  const target = (x) => 0.45 * Math.sin(x) + 0.3 * Math.cos(2 * x) - 0.25 * Math.sin(3 * x);
  const XS = Array.from({ length: 24 }, (_, i) => -PI + (2 * PI * i) / 24);
  const GRID = Array.from({ length: 64 }, (_, i) => -PI + (2 * PI * i) / 64);
  const FINE = Array.from({ length: 241 }, (_, i) => -PI + (2 * PI * i) / 240);
  const STEPS = 300;

  function spectrum(f) {
    const v = GRID.map(f);
    return Array.from({ length: 6 }, (_, w) => {
      let re = 0, im = 0;
      v.forEach((y, k) => {
        re += y * Math.cos(w * GRID[k]);
        im -= y * Math.sin(w * GRID[k]);
      });
      const mag = Math.hypot(re, im) / GRID.length;
      return w === 0 ? mag : 2 * mag;
    });
  }
  const TARGET_SPEC = spectrum(target);

  function widget() {
    const card = QP.widget("reupload", "More uploads, more frequencies", "one qubit, a Fourier series");
    if (!card) return;
    let L = 1, P, adam, t, losses, loop = null, seed = 3;

    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px", overflowX: "auto" } });
    const circ = QP.circuit(circHost, { n: 1, gates: [], minCols: 3, cell: 46, scale: 1.05 });
    const lSeg = ui.seg({ label: "Uploads L", options: [1, 2, 3, 4], value: L, onchange: (v) => { L = +v; reset(); } });
    const fitB = ui.button("Fit", () => toggle(), "btn qml small");
    const newB = ui.button("New random start", () => reset(), "btn soft small");
    card.body.append(circHost, h("div", { class: "controls", style: { marginTop: "10px" } }, lSeg, fitB, newB));
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const piFmt = (v) => ({ "-4": "−π", "-2": "−π/2", "0": "0", "2": "π/2", "4": "π" })[String(Math.round((v / PI) * 4))] || "";
    const plot = new QP.Plot(left, { xlim: [-PI, PI], ylim: [-1.15, 1.15], aspect: 0.62, minH: 220, maxH: 320, ticks: true, grid: false, xstep: PI / 2, xfmt: piFmt, ystep: 0.5, xlabel: "x" });
    const spec = new QP.Plot(right, { xlim: [-0.6, 5.6], ylim: [0, 0.6], aspect: 0.62, minH: 220, maxH: 320, ticks: true, grid: false, xstep: 1, ystep: 0.2, xfmt: (v) => String(Math.round(v)), xlabel: "frequency ω", ylabel: "amplitude" });
    const sE = ui.stat("fit error (MSE)", "–"), sW = ui.stat("trainable angles", "–"), sF = ui.stat("frequencies it can make", "–");
    const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.ink3 } }), "target"), h("span", null, h("i", { style: { background: C.qml } }), "one-qubit model"));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3em", marginTop: "8px" } });
    card.body.append(legend, h("div", { class: "readout" }, sE, sW, sF), note);

    function model(x, Q) {
      const s = new QP.State(1);
      const W = (p) => s.gate("RZ", 0, p[0]).gate("RY", 0, p[1]).gate("RZ", 0, p[2]);
      W(Q[0]);
      for (let l = 1; l <= L; l++) {
        s.gate("RX", 0, x);
        W(Q[l]);
      }
      return s.expZ(0);
    }
    const mse = (Q) => XS.reduce((acc, x) => acc + (model(x, Q) - target(x)) ** 2, 0) / XS.length;

    function reset() {
      stop();
      const r = QP.rng(seed++);
      P = Array.from({ length: L + 1 }, () => [0, 1, 2].map(() => r() * 2 * PI));
      adam = { m: P.map((b) => b.map(() => 0)), v: P.map((b) => b.map(() => 0)) };
      t = 0;
      losses = [];
      const gates = [{ name: "W", q: 0, label: "W", param: "w₀" }];
      for (let l = 1; l <= L; l++) gates.push({ name: "ENC", q: 0, label: "x" }, { name: "W", q: 0, label: "W", param: `w${"₀₁₂₃₄"[l]}` });
      gates.push({ name: "M", q: 0 });
      circ.render(gates);
      fitB.textContent = "Fit";
      draw();
    }
    function trainStep() {
      const F = XS.map((x) => model(x, P));
      const T = XS.map(target);
      const grad = P.map((b, i) => b.map((_, j) => {
        const up = P.map((c) => c.slice()), dn = P.map((c) => c.slice());
        up[i][j] += PI / 2;
        dn[i][j] -= PI / 2;
        let g = 0;
        XS.forEach((x, k) => (g += 2 * (F[k] - T[k]) * (model(x, up) - model(x, dn)) / 2));
        return g / XS.length;
      }));
      t++;
      P.forEach((b, i) => b.forEach((_, j) => {
        const g = grad[i][j];
        adam.m[i][j] = 0.9 * adam.m[i][j] + 0.1 * g;
        adam.v[i][j] = 0.999 * adam.v[i][j] + 0.001 * g * g;
        b[j] -= (0.1 * (adam.m[i][j] / (1 - 0.9 ** t))) / (Math.sqrt(adam.v[i][j] / (1 - 0.999 ** t)) + 1e-8);
      }));
      losses.push(mse(P));
    }
    function toggle() {
      if (loop) return stop();
      if (t >= STEPS) reset();
      fitB.textContent = "Pause";
      loop = QP.loop(() => {
        for (let k = 0; k < 6 && t < STEPS; k++) trainStep();
        draw();
        if (t >= STEPS) {
          stop();
          return false;
        }
      });
    }
    function stop() {
      if (loop) loop.stop();
      loop = null;
      fitB.textContent = t >= STEPS ? "Fit again" : "Fit";
    }
    function draw() {
      plot.clear();
      plot.seg(-PI, 0, PI, 0, { color: "rgba(76,60,140,0.18)", width: 1 });
      plot.line(FINE, FINE.map(target), { color: C.ink3, width: 2.5, dash: [6, 5] });
      XS.forEach((x) => plot.point(x, target(x), { r: 3.5, fill: C.ink3, stroke: "#fff", lw: 1.2 }));
      plot.line(FINE, FINE.map((x) => model(x, P)), { color: C.qml, width: 3 });
      const ms = spectrum((x) => model(x, P));
      spec.clear();
      spec.rect(L + 0.5, 0, 5.6, 0.6, { fill: "rgba(229,86,107,0.08)" });
      spec.text(L < 5 ? "out of reach" : "", (L + 0.5 + 5.6) / 2, 0.56, { size: 11, color: "#e5566b" });
      for (let w = 0; w <= 5; w++) {
        spec.rect(w - 0.36, 0, w - 0.02, TARGET_SPEC[w], { fill: "rgba(138,133,163,0.55)" });
        spec.rect(w + 0.02, 0, w + 0.36, Math.min(0.6, ms[w]), { fill: C.qml });
      }
      const e = mse(P);
      sE.set(e < 0.0005 ? "≈ 0" : e.toFixed(3), e < 0.002 ? "good" : "");
      sW.set(String(3 * (L + 1)));
      sF.set(`0 to ${L}`);
      note.textContent =
        t < STEPS
          ? `The target is built from frequencies 1, 2 and 3 (gray bars). With ${L} upload${L > 1 ? "s" : ""} of x, the model is a Fourier series with frequencies 0 to ${L} only, whatever its angles. Press Fit.`
          : L < 3
            ? `Stuck at an error of ${e.toFixed(3)}: the target also needs ${L === 1 ? "frequencies 2 and 3" : "frequency 3"}, and ${L} upload${L > 1 ? "s" : ""} can't make ${L === 1 ? "them" : "it"}. More trainable gates between the uploads wouldn't help either; only more uploads add frequencies.`
            : `Fitted: ${L} uploads reach frequency ${L}, so frequency 3 is within reach and the error is ${e < 0.0005 ? "essentially zero" : e.toFixed(4)}.`;
    }
    plot.onresize = draw;
    spec.onresize = draw;
    reset();
  }
})();

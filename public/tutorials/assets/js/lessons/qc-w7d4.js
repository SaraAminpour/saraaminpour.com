/* w5d4: training a one-qubit variational circuit with parameter-shift gradients. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("vqe", "Walk down the landscape", "click the map to start");
    if (!card) return;
    const C = QP.colors;
    const PI = Math.PI;
    // circuit RY(θ) then RZ(φ): Bloch vector (sinθ cosφ, sinθ sinφ, cosθ); H = 0.6 Z + 0.8 X
    const cost = (t, f) => 0.6 * Math.cos(t) + 0.8 * Math.sin(t) * Math.cos(f);
    const shiftGrad = (t, f) => [(cost(t + PI / 2, f) - cost(t - PI / 2, f)) / 2, (cost(t, f + PI / 2) - cost(t, f - PI / 2)) / 2];
    let path = [[0.25, 0.35]], lr = 0.25, playing = null, runs = 1;

    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "Cost for every (θ, φ): darker = lower"));
    const map = new QP.Plot(left, { xlim: [-PI, PI], ylim: [-PI, PI], aspect: 1, ticks: true, xlabel: "θ", ylabel: "φ", minH: 260, maxH: 420, xstep: PI / 2, ystep: PI / 2, xfmt: piFmt, yfmt: piFmt });
    const bl = new QP.Bloch(null, { aspect: 0.8, maxH: 230, labels: "kets" });
    right.append(h("div", { class: "kbd-hint" }, "The qubit's state (star = lowest energy)"), bl.stage);
    bl.resize();
    bl.vectors = [{ v: [0, 0, 1], color: "#ff6fa3" }];
    bl.points = [{ v: [-0.8, 0, -0.6], color: C.butter, r: 10, shape: "star" }];
    right.append(h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "Parameter shift along θ"));
    const slice = new QP.Plot(right, { xlim: [-PI, PI], ylim: [-1.1, 1.1], aspect: 0.42, minH: 130, maxH: 180, ticks: true, xstep: PI / 2, ystep: 1, xfmt: piFmt });
    const lrS = ui.slider({ label: "learning rate", min: 0.02, max: 1.2, step: 0.01, value: lr, fmt: (v) => v.toFixed(2), oninput: (v) => (lr = v) });
    const stepB = ui.button("Step", () => step(), "btn qc small");
    const playB = ui.button("Play", () => toggle(), "btn soft small");
    const sCost = ui.stat("cost", "–"), sGrad = ui.stat("gradient (∂θ, ∂φ)", "–"), sSteps = ui.stat("steps", "0"), sRuns = ui.stat("circuit runs", "1");
    card.body.append(h("div", { class: "controls" }, lrS, stepB, playB), h("div", { class: "readout" }, sCost, sGrad, sSteps, sRuns));

    function piFmt(v) {
      const k = Math.round((v / PI) * 2);
      return { "-2": "−π", "-1": "−π/2", 0: "0", 1: "π/2", 2: "π" }[k] ?? "";
    }
    function draw() {
      const [t, f] = path[path.length - 1];
      map.clear();
      map.region((x, y) => {
        const v = (cost(x, y) + 1) / 2; // 0 = lowest, 1 = highest
        const lo = [74, 20, 140], hi = [250, 248, 255];
        return [lo[0] + (hi[0] - lo[0]) * v, lo[1] + (hi[1] - lo[1]) * v, lo[2] + (hi[2] - lo[2]) * v, 0.85];
      }, 5, "landscape");
      for (let i = 1; i < path.length; i++) map.seg(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], { color: C.c0, width: 2.5 });
      path.forEach(([a, b], i) => map.point(a, b, { r: i === path.length - 1 ? 8 : 3, fill: C.c0, stroke: "#fff", lw: i === path.length - 1 ? 3 : 1 }));
      // Bloch
      bl.vectors[0].v = [Math.sin(t) * Math.cos(f), Math.sin(t) * Math.sin(f), Math.cos(t)];
      bl.draw();
      // slice along θ at the current φ, with the two shifted evaluations and the tangent
      slice.clear();
      slice.fn((x) => cost(x, f), { color: "#b9a7ff", width: 3.5 });
      const c0 = cost(t, f);
      const [gt, gf] = shiftGrad(t, f);
      const tp = wrap(t + PI / 2), tm = wrap(t - PI / 2);
      slice.point(tp, cost(tp, f), { r: 6, fill: C.c0, stroke: "#fff", lw: 2 });
      slice.point(tm, cost(tm, f), { r: 6, fill: C.c0, stroke: "#fff", lw: 2 });
      slice.seg(t - 0.9, c0 - 0.9 * gt, t + 0.9, c0 + 0.9 * gt, { color: C.pink, width: 3 });
      slice.point(t, c0, { r: 7, fill: C.pink, stroke: "#fff", lw: 2 });
      sCost.set(c0.toFixed(3), c0 < -0.99 ? "good" : "");
      sGrad.set(`${gt.toFixed(2)}, ${gf.toFixed(2)}`);
      sSteps.set(String(path.length - 1));
      sRuns.set(String(runs));
    }
    function wrap(a) {
      return ((a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    }
    function step() {
      const [t, f] = path[path.length - 1];
      const [gt, gf] = shiftGrad(t, f);
      runs += 5; // 4 shifted runs for the gradient + 1 for the new cost
      path.push([wrap(t - lr * gt), wrap(f - lr * gf)]);
      draw();
      return Math.hypot(gt, gf) > 2e-3;
    }
    function toggle() {
      if (playing) return stop();
      playing = true;
      playB.textContent = "Pause";
      let n = 0;
      const tick = () => {
        if (!playing) return;
        const moving = step();
        if (!moving || ++n > 120) return stop();
        setTimeout(tick, 90);
      };
      tick();
    }
    function stop() {
      playing = null;
      playB.textContent = "Play";
    }
    map.on({ down: (p) => { stop(); path = [[p.x, p.y]]; runs = 1; draw(); } });
    map.onresize = draw;
    slice.onresize = draw;
    draw();
  }
})();

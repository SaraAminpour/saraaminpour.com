/* qml-w4d3: learning from quantum data. A sensor's qubits from two classes (same tilt, phases around 0.6 and
   0.6 + π) on the Bloch sphere, their average states, white noise that shrinks them, and a measurement axis to
   turn by hand or to train with the parameter-shift rule. For a measurement along n, the chance of being right is
   1/2 + n·(r̄₀ − r̄₁)/4, and the best possible (Helstrom) is 1/2 + |r̄₀ − r̄₁|/4. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("qdata", "Learn how to measure", "quantum data on the Bloch sphere");
    if (!card) return;
    const r = QP.rng(9);
    const base = [];
    for (let k = 0; k < 40; k++) {
      const c = k % 2, phi = 0.6 + PI * c + 0.25 * r.normal(), th = 1.2;
      base.push({ c, v: [Math.sin(th) * Math.cos(phi), Math.sin(th) * Math.sin(phi), Math.cos(th)] });
    }
    let a = 0, b = 0, noise = 0, loop = null;

    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { az: 0.9, el: 0.35, labels: "kets", maxH: 380, aspect: 0.95 });
    const aS = ui.slider({ label: "measurement tilt", min: 0, max: PI, step: 0.01, value: a, fmt: (v) => `${Math.round((v * 180) / PI)}°`, color: C.qc, oninput: (v) => { stop(); a = v; draw(); } });
    const bS = ui.slider({ label: "measurement turn", min: -PI, max: PI, step: 0.01, value: b, fmt: (v) => `${Math.round((v * 180) / PI)}°`, color: C.qc, oninput: (v) => { stop(); b = v; draw(); } });
    const nS = ui.slider({ label: "sensor noise p", min: 0, max: 0.9, step: 0.01, value: noise, fmt: (v) => v.toFixed(2), color: C.qml, oninput: (v) => { noise = v; draw(); } });
    const trainB = ui.button("Train the measurement", () => train(), "btn qml small");
    const zB = ui.button("Measure Z", () => { stop(); a = 0; b = 0; sync(); draw(); }, "btn soft small");
    const sP = ui.stat("chance of being right", "–"), sH = ui.stat("best possible (Helstrom)", "–");
    right.append(h("div", { class: "controls col" }, aS, bS, nS), h("div", { class: "btn-row" }, trainB, zB), h("div", { class: "readout" }, sP, sH));
    const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.c0 } }), "class 0 states"), h("span", null, h("i", { style: { background: C.c1 } }), "class 1 states"), h("span", null, h("i", { style: { background: "#ff6fa3" } }), "measurement axis: the end that reads 0"));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3.2em", marginTop: "8px" } });
    card.body.append(legend, note);

    const axis = () => [Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)];
    const states = () => base.map((s) => ({ c: s.c, v: s.v.map((x) => (1 - noise) * x) }));
    function averages(S) {
      const avg = [0, 1].map((c) => {
        const mine = S.filter((s) => s.c === c);
        return [0, 1, 2].map((k) => mine.reduce((acc, s) => acc + s.v[k], 0) / mine.length);
      });
      return { r0: avg[0], r1: avg[1], d: [0, 1, 2].map((k) => avg[0][k] - avg[1][k]) };
    }
    // the chance of being right when outcome 0 means class 0
    const chance = (aa, bb, d) => 0.5 + (Math.sin(aa) * Math.cos(bb) * d[0] + Math.sin(aa) * Math.sin(bb) * d[1] + Math.cos(aa) * d[2]) / 4;
    function sync() {
      aS.set(a);
      bS.set(b);
    }
    function train() {
      if (loop) return stop();
      trainB.textContent = "Pause";
      let k = 0;
      loop = QP.loop(() => {
        const { d } = averages(states());
        const ga = (chance(a + PI / 2, b, d) - chance(a - PI / 2, b, d)) / 2;   // parameter-shift rule
        const gb = (chance(a, b + PI / 2, d) - chance(a, b - PI / 2, d)) / 2;
        a = Math.min(PI, Math.max(0, a + 2 * ga));
        b = Math.atan2(Math.sin(b + 2 * gb), Math.cos(b + 2 * gb));
        sync();
        draw();
        if (++k >= 90 || Math.hypot(ga, gb) < 1e-4) {
          stop();
          return false;
        }
      });
    }
    function stop() {
      if (loop) loop.stop();
      loop = null;
      trainB.textContent = "Train the measurement";
    }
    function draw() {
      const S = states();
      const { r0, r1, d } = averages(S);
      const n = axis();
      bloch.points = S.map((s) => ({ v: s.v, color: s.c ? C.c1 : C.c0, r: 3.6 }));
      bloch.vectors = [{ v: r0, color: C.c0, width: 4 }, { v: r1, color: C.c1, width: 4 }];
      bloch.lines = [{ a: n.map((x) => -1.15 * x), b: n.map((x) => 1.15 * x), color: "rgba(255,111,163,0.85)", width: 3 }];
      bloch.points.push({ v: n.map((x) => 1.15 * x), color: "#ff6fa3", r: 6.5 });
      bloch.draw();
      const p = chance(a, b, d), best = 0.5 + Math.hypot(...d) / 4;
      sP.set(`${(100 * p).toFixed(1)}<small>%</small>`, p > best - 0.005 ? "good" : "");
      sH.set(`${(100 * best).toFixed(1)}<small>%</small>`);
      const zOnly = chance(0, 0, d);
      note.textContent =
        a < 0.02
          ? `Measuring Z: both classes have the same tilt, so outcome 0 is equally likely for both and the chance of being right is ${(100 * zOnly).toFixed(0)}%, a coin flip. The class is hidden in the phase, and a Z measurement destroys it.`
          : p > best - 0.005
            ? `This measurement reaches the Helstrom bound: it points along the difference of the two average states. No learner can do better from one copy${noise > 0.05 ? `, and with this much noise the bound itself has dropped to ${(100 * best).toFixed(0)}%` : ""}.`
            : "Turn the axis, or train it: the best measurement points along the difference between the two classes' average states (the orange and blue arrows).";
    }
    sync();
    draw();
  }
})();

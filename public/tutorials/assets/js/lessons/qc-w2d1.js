/* w2d2: the Bloch sphere explorer. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => explorer());

  function explorer() {
    const card = QP.widget("bloch", "Bloch sphere explorer", "drag the sphere to turn it");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    let theta = 60 * deg, phi = 120 * deg;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.92, maxH: 440 });
    bloch.vectors = [{ v: [0, 0, 1], color: "#ff6fa3", shadow: true }];
    const tS = ui.slider({ label: "θ", min: 0, max: 180, step: 1, value: 60, fmt: (v) => v + "°", oninput: (v) => { theta = v * deg; draw(); } });
    const pS = ui.slider({ label: "φ", min: 0, max: 359, step: 1, value: 120, fmt: (v) => v + "°", oninput: (v) => { phi = v * deg; draw(); } });
    right.append(h("div", { class: "controls col", style: { marginTop: 0 } }, tS, pS));
    right.append(h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "Amplitude sizes · color and dial show the phase"));
    const amps = QP.bars(right, { labels: ["α  (for |0⟩)", "β  (for |1⟩)"], height: 100, phase: true, fmt: (v) => v.toFixed(2) });
    const sP0 = ui.stat("P(0)", "–"), sP1 = ui.stat("P(1)", "–");
    const formula = h("div", { class: "small", style: { textAlign: "center", marginTop: "6px", fontFamily: "JetBrains Mono, monospace" } });
    right.append(formula, h("div", { class: "readout" }, sP0, sP1));
    const presets = [["|0⟩", 0, 0], ["|1⟩", 180, 0], ["|+⟩", 90, 0], ["|−⟩", 90, 180], ["|+i⟩", 90, 90], ["|−i⟩", 90, 270]];
    card.body.append(h("div", { class: "btn-row", style: { marginTop: "12px" } }, h("span", { class: "seg-label" }, "Jump to"), ...presets.map(([lab, t, p]) => ui.button(lab, () => go(t, p), "btn soft tiny"))));

    function draw() {
      const v = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
      bloch.vectors[0].v = v;
      bloch.draw();
      const a = Math.cos(theta / 2), b = Math.sin(theta / 2);
      amps.set([a, b], [0, phi]);
      sP0.set((a * a).toFixed(3));
      sP1.set((b * b).toFixed(3));
      const pr = (x) => (Math.abs(x) < 5e-4 ? "0.00" : x.toFixed(2));
      formula.innerHTML = `|ψ⟩ = ${pr(a)} |0⟩ + e<sup>i·${Math.round(phi / deg)}°</sup> · ${pr(b)} |1⟩`;
    }
    function go(tDeg, pDeg) {
      const t0 = theta, p0 = phi;
      const t1 = tDeg * deg;
      let dp = pDeg * deg - p0;
      dp = Math.atan2(Math.sin(dp), Math.cos(dp));
      QP.animate(650, (e) => {
        theta = t0 + (t1 - t0) * e;
        phi = (p0 + dp * e + 2 * Math.PI) % (2 * Math.PI);
        tS.set(Math.round(theta / deg));
        pS.set(Math.round(phi / deg) % 360);
        draw();
      });
    }
    draw();
    // a gentle hello: turn the camera a little on load
    if (!QP.reduceMotion) {
      const az0 = bloch.az;
      QP.animate(1600, (e) => { bloch.az = az0 - 0.5 + 0.5 * e; bloch.draw(); });
    }
  }
})();

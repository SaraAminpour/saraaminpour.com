/* w5d2: noise channels on the Bloch ball, with fidelity and trace distance. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("noise", "Fade a qubit", "drag the sphere to turn it");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    let theta = 70, phi = 120, kind = "depol", p = 0.35;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.95, maxH: 430, labels: "kets", ball: true });
    bloch.vectors = [{ v: [0, 0, 1], color: "rgba(255,111,163,0.35)", width: 3 }, { v: [0, 0, 1], color: "#7b5cfa" }];
    const kSeg = ui.seg({ label: "Noise", options: [{ value: "depol", label: "Depolarizing" }, { value: "dephase", label: "Dephasing" }, { value: "damp", label: "Amplitude damping" }], value: kind, onchange: (v) => { kind = v; draw(); } });
    const pS = ui.slider({ label: "strength p", min: 0, max: 1, step: 0.01, value: p, fmt: (v) => v.toFixed(2), oninput: (v) => { p = v; draw(); } });
    const tS = ui.slider({ label: "clean θ", min: 0, max: 180, step: 1, value: theta, fmt: (v) => v + "°", oninput: (v) => { theta = v; draw(); } });
    const fS = ui.slider({ label: "clean φ", min: 0, max: 359, step: 1, value: phi, fmt: (v) => v + "°", oninput: (v) => { phi = v; draw(); } });
    const sLen = ui.stat("arrow length |r|", "–"), sPur = ui.stat("purity", "–"), sF = ui.stat("fidelity with clean", "–"), sD = ui.stat("trace distance", "–");
    right.append(h("div", { class: "controls col", style: { marginTop: 0 } }, kSeg, pS, tS, fS), h("div", { class: "readout" }, sLen, sPur, sF, sD),
      h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "rgba(255,111,163,0.5)" } }), "clean state"), h("span", null, h("i", { style: { background: "#7b5cfa" } }), "noisy state"), h("span", null, h("i", { style: { background: "transparent", border: "2px dashed #f0ac2e" } }), "gap between the tips")));
    const play = ui.button("Let it fade (p: 0 → 1)", () => {
      QP.animate(2200, (e, t) => { p = t; pS.set(p); draw(); });
    }, "btn qc small");
    right.append(h("div", { class: "btn-row", style: { marginTop: "10px" } }, play));

    function noisy(r) {
      const [x, y, z] = r;
      if (kind === "depol") return [x * (1 - p), y * (1 - p), z * (1 - p)];
      if (kind === "dephase") return [x * (1 - p), y * (1 - p), z];
      const s = Math.sqrt(1 - p);
      return [x * s, y * s, z * (1 - p) + p];
    }
    function draw() {
      const r = [Math.sin(theta * deg) * Math.cos(phi * deg), Math.sin(theta * deg) * Math.sin(phi * deg), Math.cos(theta * deg)];
      const n = noisy(r);
      const len = Math.hypot(...n);
      bloch.vectors[0].v = r;
      bloch.vectors[1].v = n;
      bloch.ballR = len;
      bloch.lines = [{ a: r, b: n, color: "#f0ac2e", dash: [4, 4], width: 2.5 }];
      bloch.draw();
      sLen.set(len.toFixed(3));
      sPur.set(((1 + len * len) / 2).toFixed(3));
      sF.set(QP.fidelityBloch(r, n).toFixed(3));
      sD.set(QP.traceDistBloch(r, n).toFixed(3));
    }
    draw();
  }
})();

/* w2d4: gates are rotations. A gate playground on the Bloch sphere with puzzles. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => playground());

  function playground() {
    const card = QP.widget("gates", "Gate playground", "drag the sphere to turn it");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    let state = new QP.State(1);
    let history = [];
    let angle = 90;
    let busy = false;
    const puzzles = [
      { name: "Flip it", text: "Turn |0⟩ into |1⟩.", target: [0, 0, -1] },
      { name: "Make |+⟩", text: "Put the arrow on the +x side (the |+⟩ state).", target: [1, 0, 0] },
      { name: "Reach |−i⟩", text: "Get to the −y side, |−i⟩. (Hint: more than one gate.)", target: [0, -1, 0] },
      { name: "|−⟩ in two", text: "Reach |−⟩ using exactly two gates.", target: [-1, 0, 0], max: 2 },
    ];
    let puzzle = -1;

    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.95, maxH: 430 });
    bloch.vectors = [{ v: [0, 0, 1], color: "#ff6fa3", shadow: true }];
    const fixed = ["X", "Y", "Z", "H", "S", "T"].map((g) => ui.button(g, () => apply(g), "btn qc small"));
    const rot = ["RX", "RY", "RZ"].map((g) => ui.button(g + "(θ)", () => apply(g, angle * deg), "btn soft small"));
    const aS = ui.slider({ label: "θ", min: -180, max: 180, step: 5, value: angle, fmt: (v) => v + "°", oninput: (v) => (angle = v) });
    const reset = ui.button("Back to |0⟩", () => restart(), "btn soft small");
    const sP = ui.stat("P(0) / P(1)", "–");
    const sAmp = ui.stat("Amplitudes", "–");
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "14px", padding: "4px 6px", marginTop: "10px" } });
    const circ = QP.circuit(circHost, { n: 1, gates: [], minCols: 6, wireLabels: ["q"], cell: 52, scale: 1.1 });
    right.append(
      h("div", { class: "kbd-hint" }, "Fixed gates"),
      h("div", { class: "btn-row", style: { marginTop: "6px" } }, ...fixed),
      h("div", { class: "kbd-hint", style: { marginTop: "12px" } }, "Rotation dials"),
      h("div", { class: "btn-row", style: { marginTop: "6px" } }, ...rot),
      h("div", { class: "controls", style: { marginTop: "6px" } }, aS),
      h("div", { class: "readout" }, sP, sAmp),
      circHost,
      h("div", { class: "btn-row", style: { marginTop: "10px" } }, reset)
    );
    const pText = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2 } }, "Free play. Pick a puzzle when you're ready!");
    const pSeg = ui.seg({ label: "Puzzles", options: [{ value: -1, label: "Free play" }, ...puzzles.map((p, i) => ({ value: i, label: `${i + 1}. ${p.name}` }))], value: -1, onchange: (v) => { puzzle = v; restart(); } });
    card.body.append(h("hr", { class: "soft" }), h("div", { class: "controls" }, pSeg), h("div", { style: { display: "flex", gap: "10px", alignItems: "center", marginTop: "8px" } }, h("img", { src: QP.qubi("think"), width: 40, height: 40, alt: "" }), pText));

    function readout() {
      const p = state.probs();
      sP.set(`${p[0].toFixed(2)} <small>/</small> ${p[1].toFixed(2)}`);
      sAmp.set(`<small>(</small>${QP.fmtAmp(state.a[0])}<small>,</small> ${QP.fmtAmp(state.a[1])}<small>)</small>`);
      circ.render(history.map((g) => (g.theta != null ? { name: g.name, q: 0, param: `${Math.round(g.theta / deg)}°` } : { name: g.name, q: 0 })));
    }
    function apply(g, theta) {
      if (busy) return;
      if (history.length >= 12) return QP.toast("That's a long circuit! Press 'Back to |0⟩' to start again.", "ui-sparkle");
      busy = true;
      let axis, ang;
      if (g === "RX") { axis = [1, 0, 0]; ang = theta; }
      else if (g === "RY") { axis = [0, 1, 0]; ang = theta; }
      else if (g === "RZ") { axis = [0, 0, 1]; ang = theta; }
      else [axis, ang] = QP.gateAxis[g];
      state.gate(g, 0, theta);
      history.push({ name: g, theta });
      bloch.rotate(0, axis, ang, 750, () => {
        bloch.vectors[0].v = state.bloch(0);
        busy = false;
        readout();
        check();
      });
      readout();
    }
    function restart() {
      state = new QP.State(1);
      history = [];
      bloch.vectors[0].v = [0, 0, 1];
      bloch.vectors[0].trail = null;
      bloch.axis = null;
      bloch.points = puzzle >= 0 ? [{ v: puzzles[puzzle].target, color: C.butter, r: 10, shape: "star" }] : [];
      pText.textContent = puzzle >= 0 ? `Puzzle ${puzzle + 1}: ${puzzles[puzzle].text}` : "Free play. Pick a puzzle when you're ready!";
      readout();
      bloch.draw();
    }
    function check() {
      if (puzzle < 0) return;
      const p = puzzles[puzzle];
      const v = state.bloch(0);
      const d = Math.hypot(v[0] - p.target[0], v[1] - p.target[1], v[2] - p.target[2]);
      if (d < 0.03) {
        if (p.max && history.length > p.max) {
          pText.textContent = `You reached it, but with ${history.length} gates. Can you do it in ${p.max}?`;
          return;
        }
        QP.confettiAt(bloch.stage, 120);
        pText.textContent = `Solved in ${history.length} gate${history.length === 1 ? "" : "s"}! ` + (puzzle < puzzles.length - 1 ? "Try the next puzzle." : "You've solved them all.");
      }
    }
    restart();
  }
})();

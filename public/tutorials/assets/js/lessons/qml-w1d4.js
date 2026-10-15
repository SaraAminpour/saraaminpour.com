/* qml-w1d4: similarity landscapes. For a reference point (drag it), color every point x of the input square by
   how similar its encoded state is, k(x, x_ref) = |⟨φ(x)|φ(x_ref)⟩|², for angle encoding and for the ZZ map. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  function encode(x, kind) {
    const s = new QP.State(2);
    if (kind === "angle") return s.gate("RY", 0, x[0]).gate("RY", 1, x[1]);
    const reps = kind === "zz2" ? 2 : 1;
    for (let r = 0; r < reps; r++) {
      s.gate("H", 0).gate("H", 1).gate("P", 0, 2 * x[0]).gate("P", 1, 2 * x[1]);
      s.cx(0, 1).gate("P", 1, 2 * (PI - x[0]) * (PI - x[1])).cx(0, 1);
    }
    return s;
  }
  const purity0 = (s) => { const b = s.bloch(0); return (1 + b[0] * b[0] + b[1] * b[1] + b[2] * b[2]) / 2; };

  function widget() {
    const card = QP.widget("fmaps", "Similarity landscapes", "drag the star");
    if (!card) return;
    let kind = "angle", ref = [0.9, 2.2], dragging = false, showData = true;
    const r = QP.rng(5);
    const data = Array.from({ length: 60 }, () => { const x = [r() * PI, r() * PI]; return { x, c: (x[0] > PI / 2) !== (x[1] > PI / 2) ? 1 : 0 }; });
    const kSeg = ui.seg({ label: "Feature map", options: [{ value: "angle", label: "angle encoding" }, { value: "zz1", label: "ZZ map, 1 layer" }, { value: "zz2", label: "ZZ map, 2 layers" }], value: kind, onchange: (v) => { kind = v; draw(); } });
    const dT = ui.toggle({ label: "show XOR data", checked: true, onchange: (v) => { showData = v; draw(); } });
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "controls col" }, kSeg, dT), h("div", { class: "side-by-side", style: { marginTop: "8px" } }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "k(x, ★) for every x in the square (darker = more similar)"));
    const plot = new QP.Plot(left, { xlim: [0, PI], ylim: [0, PI], aspect: 1, equal: true, ticks: true, minH: 240, maxH: 360, xlabel: "x₁", ylabel: "x₂", xstep: PI / 2, ystep: PI / 2, xfmt: (v) => ["0", "π/2", "π"][Math.round(v / (PI / 2))] || "", yfmt: (v) => ["0", "π/2", "π"][Math.round(v / (PI / 2))] || "" });
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px" } });
    const circ = QP.circuit(circHost, { n: 2, gates: [], minCols: 3, scale: 0.95, cell: 50 });
    const sP = ui.stat("purity of qubit 0 alone (★'s state)", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3em", marginTop: "6px" } });
    right.append(h("div", { class: "kbd-hint" }, "One layer of the circuit"), circHost, h("div", { class: "readout" }, sP), note);
    plot.onresize = draw;
    plot.on({ down: (p) => { dragging = true; move(p); }, drag: (p) => dragging && move(p), up: () => (dragging = false) });
    function move(p) { ref = [QP.math.clamp(p.x, 0, PI), QP.math.clamp(p.y, 0, PI)]; draw(); }
    function draw() {
      const R = encode(ref, kind);
      plot.clear();
      plot.region((x, y) => {
        const k = encode([x, y], kind).fidelity(R);
        const a = [255, 250, 244], b = [123, 92, 250];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, 0.95];
      }, 4, `${kind}-${ref[0].toFixed(3)}-${ref[1].toFixed(3)}`);
      if (showData) data.forEach((d) => plot.point(d.x[0], d.x[1], { r: 3.5, fill: QP.classColor(d.c), stroke: "#fff", lw: 1 }));
      plot.point(ref[0], ref[1], { r: 11, shape: "star", fill: C.butter, stroke: C.ink, lw: 2 });
      circ.render(kind === "angle"
        ? [{ name: "RY", q: 0, param: "x₁" }, { name: "RY", q: 1, param: "x₂" }]
        : [{ name: "H", q: 0, col: 0 }, { name: "H", q: 1, col: 0 }, { name: "P", q: 0, param: "2x₁", col: 1 }, { name: "P", q: 1, param: "2x₂", col: 1 }, { name: "CX", c: 0, t: 1, col: 2 }, { name: "P", q: 1, param: "φ₁₂", col: 3 }, { name: "CX", c: 0, t: 1, col: 4 }]);
      const pu = purity0(R);
      sP.set(pu.toFixed(3), pu > 0.999 ? "" : "good");
      note.textContent = kind === "angle"
        ? "Angle encoding: a product state, so the similarity is a product of one bump per feature. Smooth, and the qubits never interact."
        : `The ZZ map adds the phase φ₁₂ = 2(π − x₁)(π − x₂), which depends on both features at once: entanglement (purity below 1) and a similarity that mixes the features.${kind === "zz2" ? " With two layers the landscape gets wiggly: points close together can look dissimilar." : ""}`;
    }
    draw();
  }
})();

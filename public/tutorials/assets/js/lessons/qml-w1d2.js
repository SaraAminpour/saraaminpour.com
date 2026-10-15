/* qml-w1d2: angle encoding on the Bloch sphere. A small two-moons dataset, scaled into angles; each feature
   turns its own qubit (angle encoding), or both features steer one qubit (dense encoding). The scale decides
   whether points spread out, crowd together, or wrap around and collide. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("encode", "Numbers into qubits", "angle encoding");
    if (!card) return;
    const raw = QP.data.moons(60, 0.1, 9);
    const lo = [Math.min(...raw.map((p) => p.x)), Math.min(...raw.map((p) => p.y))];
    const hi = [Math.max(...raw.map((p) => p.x)), Math.max(...raw.map((p) => p.y))];
    const unit = raw.map((p) => ({ u: [(p.x - lo[0]) / (hi[0] - lo[0]), (p.y - lo[1]) / (hi[1] - lo[1])], c: p.c }));
    let mode = "angle", scale = Math.PI, pick = 7;
    const SCALES = { small: { v: 0.3, label: "[0, 0.3]" }, good: { v: Math.PI, label: "[0, π]" }, big: { v: 4 * Math.PI, label: "[0, 4π]" } };
    let sk = "good";
    const mSeg = ui.seg({ label: "Encoding", options: [{ value: "angle", label: "angle: one qubit per feature" }, { value: "dense", label: "dense: two features on one qubit" }], value: mode, onchange: (v) => { mode = v; layout(); draw(); } });
    const sSeg = ui.seg({ label: "Scale features to", options: Object.keys(SCALES).map((k) => ({ value: k, label: SCALES[k].label })), value: sk, onchange: (v) => { sk = v; scale = SCALES[v].v; draw(); } });
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "controls col" }, mSeg, sSeg), h("div", { class: "side-by-side", style: { marginTop: "8px" } }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "The data (tap a point to encode it)"));
    const plot = new QP.Plot(left, { xlim: [-0.08, 1.08], ylim: [-0.08, 1.08], aspect: 1, equal: true, minH: 220, maxH: 300, ticks: true, xlabel: "feature 1", ylabel: "feature 2" });
    const sph = h("div", { class: "enc-sph" });
    right.append(h("div", { class: "kbd-hint" }, "The encoded states"), sph);
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3.2em", marginTop: "6px" } });
    card.body.append(note);
    plot.onresize = draw;
    plot.on({ down: (p) => { let best = 0, bd = Infinity; unit.forEach((q, i) => { const d = Math.hypot(q.u[0] - p.x, q.u[1] - p.y); if (d < bd) { bd = d; best = i; } }); pick = best; draw(); } });
    let spheres = [];
    function layout() {
      sph.innerHTML = "";
      spheres = (mode === "angle" ? ["qubit 0 ← feature 1", "qubit 1 ← feature 2"] : ["one qubit: θ ← feature 1, φ ← feature 2"]).map((t) => {
        const host = h("div");
        const b = new QP.Bloch(host, { aspect: 0.95, maxH: mode === "angle" ? 220 : 320, labels: "kets" });
        sph.appendChild(h("div", null, host, h("div", { class: "small center", style: { fontWeight: 800, color: C.ink3 } }, t)));
        return b;
      });
      sph.classList.toggle("two", mode === "angle");
    }
    // RY(a)|0⟩ sits at polar angle a in the x–z plane; RZ(b) then turns it about z
    const vecY = (a) => [Math.sin(a), 0, Math.cos(a)];
    const vecYZ = (a, b) => [Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)];
    function draw() {
      plot.clear();
      unit.forEach((q, i) => plot.point(q.u[0], q.u[1], { r: i === pick ? 8 : 4.5, fill: QP.classColor(q.c), stroke: i === pick ? C.ink : "#fff", lw: i === pick ? 2.5 : 1.2 }));
      const P = unit[pick];
      const col = (c) => (c ? "rgba(85,119,245,0.7)" : "rgba(255,138,80,0.7)");
      if (mode === "angle") {
        [0, 1].forEach((k) => {
          const b = spheres[k];
          b.points = unit.map((q) => ({ v: vecY(scale * q.u[k]), color: col(q.c), r: 3 }));
          b.vectors = [{ v: vecY(scale * P.u[k]), color: C.qc }];
          b.draw();
        });
      } else {
        const b = spheres[0];
        b.points = unit.map((q) => ({ v: vecYZ(scale * q.u[0], scale * q.u[1]), color: col(q.c), r: 3 }));
        b.vectors = [{ v: vecYZ(scale * P.u[0], scale * P.u[1]), color: C.qc }];
        b.draw();
      }
      note.textContent = sk === "small" ? "Scaled to [0, 0.3], every point lands near |0⟩: the states are all almost the same, so a model can hardly tell the data apart."
        : sk === "big" ? "Scaled to [0, 4π], the angles wrap around the sphere twice: points far apart in the data can land on the same state. Information is lost."
        : mode === "angle" ? "Scaled to [0, π], each feature sweeps its qubit from |0⟩ (smallest value) to |1⟩ (largest) exactly once: no crowding, no collisions."
        : "Dense encoding packs both features into one qubit: feature 1 sets the latitude, feature 2 the longitude. Half the qubits, but the two features now share one Bloch sphere.";
    }
    layout();
    draw();
  }
})();

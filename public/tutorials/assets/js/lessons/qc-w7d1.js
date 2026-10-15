/* qc-w7d1: circuits with knobs. (1) Turn RY and RZ to reach a target on the Bloch sphere, with or without the
   RZ knob. (2) A two-qubit ansatz with four RY knobs and an optional CNOT: which targets can it reach? */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  QP.onReady(() => { one(); two(); });

  function one() {
    const card = QP.widget("knobs1", "Reach the star", "two knobs, one qubit");
    if (!card) return;
    let th = 30, ph = 0, lockZ = false, target = [0, 0, 1];
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.95, maxH: 360, labels: "kets" });
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px" } });
    const circ = QP.circuit(circHost, { n: 1, gates: [], minCols: 3, scale: 1.2 });
    const tS = ui.slider({ label: "θ (RY)", min: 0, max: 180, step: 1, value: th, fmt: (v) => v + "°", color: "#f0ac2e", oninput: (v) => { th = v; draw(); } });
    const pS = ui.slider({ label: "φ (RZ)", min: -180, max: 180, step: 1, value: ph, fmt: (v) => v + "°", color: "#f0ac2e", oninput: (v) => { ph = v; draw(); } });
    const lockT = ui.toggle({ label: "lock the RZ knob at 0", checked: false, onchange: (v) => { lockZ = v; if (v) { ph = 0; pS.set(0); } pS.input.disabled = v; draw(); } });
    const newB = ui.button("New star", () => newTarget(), "btn soft small");
    const sF = ui.stat("fidelity with the star", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    right.append(circHost, h("div", { class: "controls col" }, tS, pS, lockT), h("div", { class: "btn-row" }, newB), h("div", { class: "readout" }, sF), note);
    function newTarget() {
      const t = Math.acos(1 - 2 * Math.random()), p = (Math.random() * 2 - 1) * Math.PI;
      target = [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)];
      draw();
    }
    function draw() {
      // RY(θ) then RZ(φ) on |0⟩: the Bloch vector at polar angle θ and azimuth φ
      const v = [Math.sin(th * DEG) * Math.cos(ph * DEG), Math.sin(th * DEG) * Math.sin(ph * DEG), Math.cos(th * DEG)];
      bloch.vectors = [{ v, color: C.qc }];
      bloch.points = [{ v: target, color: "#ffd66b", r: 10, shape: "star" }];
      bloch.draw();
      circ.render([{ name: "RY", q: 0, param: `${th}°` }, ...(lockZ ? [] : [{ name: "RZ", q: 0, param: `${ph}°` }])]);
      const f = (1 + v[0] * target[0] + v[1] * target[1] + v[2] * target[2]) / 2;
      sF.set(f.toFixed(3), f > 0.995 ? "good" : "");
      const reachable = Math.abs(target[1]) < 0.02;
      note.textContent = f > 0.995 ? "Reached! Two knobs can point the arrow anywhere on the sphere."
        : lockZ ? (reachable ? "This star happens to sit on the x–z circle, so RY alone can reach it." : "With RZ locked, the arrow can only sweep the x–z circle. This star is off it: no RY angle gets there.")
        : "Turn the knobs until the arrow touches the star.";
    }
    newTarget();
  }

  function two() {
    const card = QP.widget("knobs2", "Four knobs, two qubits", "can this circuit make the target?");
    if (!card) return;
    const s2 = Math.SQRT1_2;
    const TARGETS = {
      bell: { label: "Bell |Φ⁺⟩", amps: [s2, 0, 0, s2] },
      psi: { label: "Bell |Ψ⁺⟩", amps: [0, s2, s2, 0] },
      prod: { label: "|+⟩|+⟩", amps: [0.5, 0.5, 0.5, 0.5] },
      one: { label: "|10⟩", amps: [0, 0, 1, 0] },
    };
    let ang = [0, 0, 0, 0], cx = true, tk = "bell";
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px" } });
    const circ = QP.circuit(circHost, { n: 2, gates: [], minCols: 5, scale: 1.1 });
    const sliders = ["a (q0)", "b (q1)", "c (q0)", "d (q1)"].map((lab, i) => ui.slider({ label: lab, min: -180, max: 180, step: 5, value: 0, fmt: (v) => v + "°", color: "#f0ac2e", oninput: (v) => { ang[i] = v; draw(); } }));
    const cxT = ui.toggle({ label: "include the CNOT", checked: true, onchange: (v) => { cx = v; best = null; draw(); } });
    const tSeg = ui.seg({ label: "Target", options: Object.keys(TARGETS).map((k) => ({ value: k, label: TARGETS[k].label })), value: tk, onchange: (v) => { tk = v; best = null; draw(); } });
    const searchB = ui.button("Let the computer search", () => search(), "btn qc small");
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: ["00", "01", "10", "11"], height: 90, fmt: (v) => (Math.abs(v) < 0.005 ? "0" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(2)) });
    const sF = ui.stat("fidelity with the target", "–"), sB = ui.stat("best found by search", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    let best = null;
    card.body.append(circHost, h("div", { class: "controls col" }, tSeg, cxT), h("div", { class: "pk-grid" }, ...sliders),
      h("div", { class: "side-by-side even", style: { marginTop: "8px" } }, h("div", null, h("div", { class: "kbd-hint" }, "Amplitudes (labels q1 q0)"), barsHost), h("div", null, h("div", { class: "readout" }, sF, sB), h("div", { class: "btn-row", style: { marginTop: "8px" } }, searchB))), note);

    const state = (A, withCx) => {
      const s = new QP.State(2).gate("RY", 0, A[0] * DEG).gate("RY", 1, A[1] * DEG);
      if (withCx) s.cx(0, 1);
      return s.gate("RY", 0, A[2] * DEG).gate("RY", 1, A[3] * DEG);
    };
    const fid = (s) => { const t = TARGETS[tk].amps; const o = s.a.reduce((acc, z, i) => acc + z.re * t[i], 0); return o * o; };
    function search() {
      let top = { f: -1, A: null };
      for (let k = 0; k < 4000; k++) {
        const A = [0, 1, 2, 3].map(() => Math.round((Math.random() * 360 - 180) / 5) * 5);
        const f = fid(state(A, cx));
        if (f > top.f) top = { f, A };
      }
      // polish the best one: nudge each knob by ±5° while that helps
      for (let round = 0, better = true; round < 200 && better; round++) {
        better = false;
        for (let i = 0; i < 4; i++) for (const d of [-5, 5]) {
          const A = top.A.slice();
          A[i] = Math.max(-180, Math.min(180, A[i] + d));
          const f = fid(state(A, cx));
          if (f > top.f + 1e-9) { top = { f, A }; better = true; }
        }
      }
      best = top;
      ang = top.A.slice();
      sliders.forEach((s, i) => s.set(ang[i]));
      draw();
    }
    function draw() {
      const g = [{ name: "RY", q: 0, param: `${ang[0]}°`, col: 0 }, { name: "RY", q: 1, param: `${ang[1]}°`, col: 0 }];
      if (cx) g.push({ name: "CX", c: 0, t: 1, col: 1 });
      g.push({ name: "RY", q: 0, param: `${ang[2]}°`, col: 2 }, { name: "RY", q: 1, param: `${ang[3]}°`, col: 2 });
      circ.render(g);
      const s = state(ang, cx);
      const vals = s.a.map((z) => z.re);
      bars.set(vals);
      bars.items.forEach((it, i) => (it.fill.style.background = vals[i] < -1e-9 ? "linear-gradient(180deg,#ffc7ae,#ff8a50)" : "linear-gradient(180deg,#cdbfff,#7b5cfa)"));
      const f = fid(s);
      sF.set(f.toFixed(3), f > 0.995 ? "good" : "");
      sB.set(best ? best.f.toFixed(3) : "–");
      const entangledTarget = tk === "bell" || tk === "psi";
      note.textContent = f > 0.995 ? "Made it!" + (cx ? " The CNOT supplied the entanglement." : "")
        : !cx && entangledTarget ? "Without the CNOT, every setting gives a product state, so a Bell state is out of reach: the best possible fidelity is 0.5. Try the search."
        : "Turn the four knobs, or let a random search hunt for a good setting.";
    }
    draw();
  }
})();

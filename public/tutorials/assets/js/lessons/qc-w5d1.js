/* qc-w5d1: teleportation, step by step. Three Bloch spheres show each qubit on its own (shorter arrow =
   more entangled); Alice measures, phones two bits, and Bob's fix brings back her message. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  QP.onReady(() => widget());

  const STEPS = [
    { btn: "1 · Share a Bell pair", text: "Alice's message waits on q0. Press the first step to share a Bell pair: q1 stays with Alice, q2 travels to Bob." },
    { btn: "2 · Alice: CNOT, then H", text: "q1 and q2 are entangled: each arrow shrank to the center. Alone, each looks like a fair coin." },
    { btn: "3 · Alice measures q0 and q1", text: "Alice's two gates mix her message into the pair. Bob's arrow is still at the center: he has no information yet." },
    { btn: "4 · Phone Bob the two bits", text: "" },
    { btn: "5 · Bob fixes his qubit", text: "" },
    { btn: "Teleport again", text: "" },
  ];

  function widget() {
    const card = QP.widget("teleport", "Teleport a qubit", "one Bell pair + two bits");
    if (!card) return;
    let theta = 70, phi = 40, step = 0, st = null, m = [0, 0];
    const tally = { "00": 0, "01": 0, "10": 0, "11": 0 };
    const tS = ui.slider({ label: "message θ", min: 0, max: 180, step: 1, value: theta, fmt: (v) => v + "°", color: C.c0, oninput: (v) => { theta = v; restart(); } });
    const pS = ui.slider({ label: "message φ", min: 0, max: 359, step: 1, value: phi, fmt: (v) => v + "°", color: C.c0, oninput: (v) => { phi = v; restart(); } });
    const preset = (lab, t, p) => ui.button(lab, () => { theta = t; phi = p; tS.set(t); pS.set(p); restart(); }, "btn soft tiny");
    const presets = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Message"), preset("|0⟩", 0, 0), preset("|1⟩", 180, 0), preset("|+⟩", 90, 0), preset("|i⟩", 90, 90),
      ui.button("surprise me", () => { theta = Math.round(Math.acos(1 - 2 * Math.random()) / DEG); phi = Math.floor(Math.random() * 360); tS.set(theta); pS.set(phi); restart(); }, "btn soft tiny"));
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "6px 10px", marginTop: "10px" } });
    const circ = QP.circuit(circHost, { n: 3, gates: [], minCols: 9, scale: 1.1, wireLabels: ["q0", "q1", "q2"] });
    const who = ["Alice · q0 (the message)", "Alice · q1", "Bob · q2"];
    const cols = ["#ff8a50", "#7b5cfa", "#17a98c"];
    const spheres = who.map((w, k) => {
      const host = h("div");
      const b = new QP.Bloch(host, { aspect: 0.95, maxH: 210, labels: "kets" });
      const cap = h("div", { class: "small center tp-cap" });
      const panel = h("div", { class: "tp-panel" + (k === 2 ? " bob" : "") }, h("div", { class: "kbd-hint center" }, w), host, cap);
      return { b, cap, panel };
    });
    const phone = h("div", { class: "tp-phone" }, h("span", { class: "tp-end" }, "Alice"), h("span", { class: "tp-line" }, h("span", { class: "tp-bits" }, "")), h("span", { class: "tp-end" }, "Bob"));
    const next = ui.button(STEPS[0].btn, () => advance(), "btn qc small");
    const again = ui.button("Start over", () => restart(), "btn soft small");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.8em", marginTop: "8px" } });
    const tallyEl = h("div", { class: "small", style: { color: C.ink3, fontWeight: 700, marginTop: "4px" } });
    card.body.append(h("div", { class: "controls" }, tS, pS), presets, circHost, h("div", { class: "tp-grid" }, ...spheres.map((s) => s.panel)), phone, h("div", { class: "btn-row", style: { marginTop: "10px" } }, next, again), note, tallyEl);

    const target = () => [Math.sin(theta * DEG) * Math.cos(phi * DEG), Math.sin(theta * DEG) * Math.sin(phi * DEG), Math.cos(theta * DEG)];
    function fresh() {
      return new QP.State(3).gate("RY", 0, theta * DEG).gate("P", 0, phi * DEG);
    }
    function circuitGates() {
      return [
        { name: "RY", q: 0, param: `${theta}°`, col: 0 }, { name: "P", q: 0, param: `${phi}°`, col: 1 },
        { name: "H", q: 1, col: 2 }, { name: "CX", c: 1, t: 2, col: 3 },
        { name: "CX", c: 0, t: 1, col: 4 }, { name: "H", q: 0, col: 5 },
        { name: "M", q: 0, col: 6 }, { name: "M", q: 1, col: 6 },
        { name: "X", q: 2, param: "if m₁", col: 7 }, { name: "Z", q: 2, param: "if m₀", col: 8 },
      ];
    }
    // the columns each step has just done (for the highlight)
    const HL = [[0, 1], [2, 3], [4, 5], [6, 6], [6, 6], [7, 8]];
    function restart() {
      step = 0;
      st = fresh();
      m = [0, 0];
      phone.classList.remove("go");
      draw();
    }
    function advance() {
      if (step === 0) st.gate("H", 1).cx(1, 2);
      else if (step === 1) st.cx(0, 1).gate("H", 0);
      else if (step === 2) {
        m = [st.measure(0), st.measure(1)];
        tally[`${m[0]}${m[1]}`]++;
      } else if (step === 3) {
        phone.classList.remove("go");
        void phone.offsetWidth; // restart the animation
        phone.classList.add("go");
      } else if (step === 4) {
        if (m[1]) st.gate("X", 2);
        if (m[0]) st.gate("Z", 2);
        QP.confettiAt(spheres[2].panel, 30);
      } else { restart(); return; }
      step++;
      draw();
    }
    function draw() {
      circ.render(circuitGates(), HL[step]);
      const t = target();
      spheres.forEach((s, k) => {
        const v = st.bloch(k);
        s.b.vectors = [{ v, color: cols[k] }];
        if (k === 2) s.b.vectors.unshift({ v: t, color: "rgba(255,138,80,0.35)", width: 2.5, tip: 5, label: "message" });
        s.b.draw();
        const len = Math.hypot(...v);
        if (step >= 3 && k < 2) s.cap.innerHTML = `measured: <b>m${k === 0 ? "₀" : "₁"} = ${m[k]}</b>`;
        else s.cap.textContent = len < 0.02 ? "arrow at the center: a fair coin" : `arrow length ${len.toFixed(2)}`;
      });
      const fid = QP.fidelityBloch(st.bloch(2), t);
      if (step === 5) spheres[2].cap.innerHTML = `matches the message: fidelity <b>${fid.toFixed(3)}</b>`;
      spheres[2].panel.classList.toggle("win", step === 5);
      phone.querySelector(".tp-bits").textContent = step >= 3 ? `m₀ = ${m[0]}, m₁ = ${m[1]}` : "";
      next.textContent = STEPS[step].btn;
      const fix = m[0] && m[1] ? "X, then Z" : m[1] ? "X" : m[0] ? "Z" : "nothing";
      note.textContent =
        step === 3 ? `Alice read m₀ = ${m[0]}, m₁ = ${m[1]} (each of the four results has probability 1/4, whatever the message). Bob's arrow is now pure, but it's a scrambled version of the message, and he doesn't know which one.`
        : step === 4 ? `The bits travel at most at the speed of light. Bob's fix for ${m[0]}${m[1]}: ${fix}.`
        : step === 5 ? `Teleported! Bob's arrow lands exactly on the faint message arrow. Alice is left with two random bits: her copy is gone, so nothing was cloned.`
        : STEPS[step].text;
      const runs = Object.values(tally).reduce((a, b) => a + b, 0);
      tallyEl.textContent = runs ? `Alice's results so far (m₀m₁): 00 × ${tally["00"]} · 01 × ${tally["01"]} · 10 × ${tally["10"]} · 11 × ${tally["11"]}. Bob's fix worked every time.` : "";
    }
    restart();
  }
})();

/* qc-w5d2: superdense coding. Alice's gate turns the shared Bell pair into one of four Bell states; Bob's
   CNOT and H read both bits from the one qubit she sends. Optionally, Eve measures that qubit on its way. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const s2 = Math.SQRT1_2;
  QP.onReady(() => widget());

  const BELL = [
    { name: "|Φ⁺⟩", amps: [s2, 0, 0, s2] },
    { name: "|Φ⁻⟩", amps: [s2, 0, 0, -s2] },
    { name: "|Ψ⁺⟩", amps: [0, s2, s2, 0] },
    { name: "|Ψ⁻⟩", amps: [0, s2, -s2, 0] },
  ].map((b) => ({ ...b, st: new QP.State(2, b.amps) }));
  const STEPS = ["1 · Alice encodes", "2 · Send her qubit to Bob", "3 · Bob: CNOT, then H", "4 · Bob measures", "Send another message"];
  const HL = [[0, 1], [2, 3], [4, 4], [5, 6], [7, 7], [7, 7]];

  function widget() {
    const card = QP.widget("dense", "Two bits in one qubit", "superdense coding");
    if (!card) return;
    let msg = "10", eve = false, step = 0, st = null, eveBit = null, got = null;
    const tally = { sent: 0, right: 0 };
    const mSeg = ui.seg({ label: "Alice's two bits", options: ["00", "01", "10", "11"], value: msg, onchange: (v) => { msg = v; restart(); } });
    const eveT = ui.toggle({ label: "Eve measures the qubit on its way", checked: false, onchange: (v) => { eve = v; tally.sent = tally.right = 0; restart(); } });
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "6px 10px", marginTop: "10px" } });
    const circ = QP.circuit(circHost, { n: 2, gates: [], minCols: 8, scale: 1.15, wireLabels: ["q0", "q1"] });
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: ["00", "01", "10", "11"], height: 110, phase: true, fmt: (v) => (Math.abs(v) < 0.005 ? "0" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(2)) });
    const badge = h("div", { class: "sd-badge" });
    const road = h("div", { class: "sd-road" }, h("span", { class: "sd-end" }, "Alice"), h("span", { class: "sd-track" }, h("span", { class: "sd-token" }, "q0"), h("span", { class: "sd-eve" }, "Eve")), h("span", { class: "sd-end" }, "Bob"));
    const next = ui.button(STEPS[0], () => advance(), "btn qc small");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.8em", marginTop: "8px" } });
    const tallyEl = h("div", { class: "small", style: { color: C.ink3, fontWeight: 700, marginTop: "4px" } });
    card.body.append(h("div", { class: "controls" }, mSeg, eveT), circHost,
      h("div", { class: "side-by-side even", style: { marginTop: "10px" } },
        h("div", null, h("div", { class: "kbd-hint" }, "Amplitudes of the pair (labels q1 q0)"), barsHost),
        h("div", null, h("div", { class: "kbd-hint" }, "Right now the pair is"), badge, road)),
      h("div", { class: "btn-row", style: { marginTop: "10px" } }, next), note, tallyEl);

    const gatesFor = () => {
      const g = [{ name: "H", q: 0, col: 0 }, { name: "CX", c: 0, t: 1, col: 1 }];
      if (msg[0] === "1") g.push({ name: "X", q: 0, col: 2 });
      if (msg[1] === "1") g.push({ name: "Z", q: 0, col: 3 });
      if (eve) g.push({ name: "M", q: 0, col: 4 });
      g.push({ name: "CX", c: 0, t: 1, col: 5 }, { name: "H", q: 0, col: 6 }, { name: "M", q: 0, col: 7 }, { name: "M", q: 1, col: 7 });
      return g;
    };
    function restart() {
      step = 0;
      st = new QP.State(2).gate("H", 0).cx(0, 1);
      eveBit = got = null;
      road.classList.remove("go", "caught");
      draw();
    }
    function advance() {
      if (step === 0) {
        if (msg[0] === "1") st.gate("X", 0);
        if (msg[1] === "1") st.gate("Z", 0);
      } else if (step === 1) {
        road.classList.remove("go");
        void road.offsetWidth;
        road.classList.add("go");
        road.classList.toggle("caught", eve);
        if (eve) eveBit = st.measure(0);
      } else if (step === 2) {
        st.cx(0, 1).gate("H", 0);
      } else if (step === 3) {
        const b0 = st.measure(0), b1 = st.measure(1);
        got = `${b1}${b0}`;
        tally.sent++;
        if (got === msg) { tally.right++; if (!eve) QP.confettiAt(badge, 24); }
      } else { restart(); return; }
      step++;
      draw();
    }
    function bellName() {
      const f = BELL.map((b) => b.st.fidelity(st));
      const k = f.indexOf(Math.max(...f));
      return f[k] > 0.999 ? BELL[k].name : null;
    }
    function draw() {
      circ.render(gatesFor(), HL[step]);
      // the global phase doesn't matter: make the first nonzero amplitude positive
      const first = st.a.find((z) => Math.hypot(z.re, z.im) > 1e-9);
      const g = first ? Math.atan2(first.im, first.re) : 0;
      const vals = st.a.map((z) => z.re * Math.cos(g) + z.im * Math.sin(g));
      bars.set(vals, vals.map((v) => (v < 0 ? Math.PI : 0)));
      const bn = bellName();
      const basis = vals.findIndex((v) => Math.abs(v) > 0.999);
      badge.textContent = bn ? `${bn}, a Bell state` : basis >= 0 ? `|${["00", "01", "10", "11"][basis]}⟩, no longer entangled` : "a mix of basis states";
      badge.classList.toggle("bell", Boolean(bn));
      next.textContent = STEPS[step];
      const what = msg === "00" ? "no gate" : msg === "10" ? "an X" : msg === "01" ? "a Z" : "an X and then a Z";
      note.textContent =
        step === 0 ? `Alice and Bob share the Bell pair |Φ⁺⟩, made earlier: Alice keeps q0, Bob already has q1. Alice wants to send ${msg}.`
        : step === 1 ? `Alice applies ${what} to her qubit, and the pair becomes ${bn}. Four messages, four different Bell states, all perfectly distinguishable.`
        : step === 2 ? (eve ? `Eve catches q0 and measures it: she reads ${eveBit}, a fair coin flip that tells her nothing about the message. But her measurement breaks the entanglement.` : "Only one qubit travels. On its own it's a fair coin for every message, so anyone who catches it learns nothing.")
        : step === 3 ? (eve ? "Bob runs the Bell circuit backwards, CNOT then H. After Eve's measurement, the pair is no longer a Bell state, so the result isn't certain." : "Bob runs the Bell circuit backwards: CNOT, then H. Each Bell state turns into one basis state, so his measurement is certain.")
        : got === msg ? `Bob reads ${got}: Alice's two bits, from one qubit${eve ? ". Lucky this time: the second bit was a coin flip." : "!"}` : `Bob reads ${got}, but Alice sent ${msg}. Eve's measurement scrambled the second bit, so Alice and Bob can notice that someone listened.`;
      tallyEl.textContent = tally.sent ? `Messages sent: ${tally.sent}, read correctly: ${tally.right}.` : "";
    }
    restart();
  }
})();

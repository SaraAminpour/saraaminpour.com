/* qc-w5d4: Bernstein–Vazirani. A hidden 6-bit secret s and f(x) = s·x mod 2. Crack it with classical questions,
   or with one quantum query, where every input qubit goes |0⟩ → |+⟩ → (|−⟩ if s says so) → |s_i⟩. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const n = 6;
  const pop = (v) => { let c = 0; while (v) { c += v & 1; v >>= 1; } return c; };
  const str = (v) => v.toString(2).padStart(n, "0");   // printed like Qiskit: q5 ... q0
  const STEPS = ["1 · H on the inputs", "2 · Ask the oracle once", "3 · H again", "4 · Measure", "Start again"];

  function widget() {
    const card = QP.widget("bv", "Crack the secret string", "f(x) = s · x mod 2");
    if (!card) return;
    let secret = 0, x = 0, log = [], known = Array(n).fill(null), step = 0, peek = false;
    const newB = ui.button("New secret", () => newSecret(), "btn soft tiny");
    const peekT = ui.toggle({ label: "Peek inside the oracle", checked: false, onchange: (v) => { peek = v; drawQuantum(); } });
    // classical side: choose x bit by bit (displayed x5 ... x0)
    const xBtns = Array.from({ length: n }, (_, k) => {
      const i = n - 1 - k; // bit index shown at this position
      const b = h("button", { type: "button", class: "bv-bit", onclick: () => { x ^= 1 << i; drawClassical(); } });
      b._i = i;
      return b;
    });
    const askB = ui.button("Ask f(x)", () => ask(), "btn ml small");
    const logEl = h("div", { class: "bv-log" });
    const knownEl = h("div", { class: "bv-known" });
    const cNote = h("div", { class: "small", style: { fontWeight: 800, minHeight: "2.6em", marginTop: "6px", color: C.ink2 } });
    // quantum side
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px" } });
    const circ = QP.circuit(circHost, { n: n + 1, gates: [], minCols: 6, scale: 0.9, cell: 50, wireLabels: ["q0", "q1", "q2", "q3", "q4", "q5", "out"] });
    const chips = Array.from({ length: n }, (_, k) => h("div", { class: "bv-chip" }, h("span", { class: "bv-q" }, `q${n - 1 - k}`), h("span", { class: "bv-s" }, "|0⟩")));
    const next = ui.button(STEPS[0], () => advance(), "btn qc small");
    const qNote = h("div", { class: "small", style: { fontWeight: 800, minHeight: "2.6em", marginTop: "6px", color: C.ink2 } });
    card.body.append(
      h("div", { class: "controls" }, newB, peekT),
      h("div", { class: "side-by-side even", style: { marginTop: "10px" } },
        h("div", null,
          h("div", { class: "kbd-hint" }, "Classical: set an input x (tap the bits), then ask"),
          h("div", { class: "bv-row" }, h("span", { class: "bv-lab" }, "x ="), ...xBtns), h("div", { class: "btn-row", style: { marginTop: "6px" } }, askB),
          logEl, h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "What you know about s"), knownEl, cNote),
        h("div", null,
          h("div", { class: "kbd-hint" }, "Quantum: one query"), circHost,
          h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "Each input qubit (q5 … q0)"), h("div", { class: "bv-row chips" }, ...chips),
          h("div", { class: "btn-row", style: { marginTop: "8px" } }, next), qNote)));

    function newSecret() {
      do secret = Math.floor(Math.random() * (1 << n)); while (pop(secret) < 2 || pop(secret) > 4);
      x = 1;
      log = [];
      known = Array(n).fill(null);
      step = 0;
      drawClassical();
      drawQuantum();
    }
    function ask() {
      const f = pop(secret & x) % 2;
      log.unshift({ x, f });
      if (pop(x) === 1) known[Math.log2(x)] = f; // a single 1 at bit i reveals s_i
      drawClassical();
    }
    function drawClassical() {
      xBtns.forEach((b) => { const on = (x >> b._i) & 1; b.textContent = String(on); b.classList.toggle("on", Boolean(on)); });
      logEl.innerHTML = log.slice(0, 5).map((e) => `<div>x = <code>${str(e.x)}</code> → f(x) = <b>${e.f}</b></div>`).join("") + (log.length > 5 ? `<div class="muted">… and ${log.length - 5} earlier</div>` : "");
      knownEl.innerHTML = Array.from({ length: n }, (_, k) => { const i = n - 1 - k; return `<span class="${known[i] == null ? "" : "got"}">${known[i] == null ? "?" : known[i]}</span>`; }).join("");
      const nk = known.filter((v) => v != null).length;
      cNote.textContent = !log.length ? "Each answer is one bit. Which inputs tell you the most?"
        : nk === n ? `Cracked: s = ${str(secret)}, after ${log.length} question${log.length > 1 ? "s" : ""}. With one bit per answer, 6 is the best possible.`
        : nk ? `Inputs with a single 1 reveal one bit of s each. ${n - nk} bit${n - nk > 1 ? "s" : ""} to go.`
        : "That answer mixes several bits of s together (their parity). Try an input with a single 1.";
    }
    function chipStates() {
      // every input qubit stays unentangled: |0⟩ → |+⟩ → |−⟩ (if s_i = 1) → |s_i⟩
      return Array.from({ length: n }, (_, k) => {
        const s = (secret >> (n - 1 - k)) & 1;
        if (step === 0) return ["|0⟩", ""];
        if (step === 1) return ["|+⟩", ""];
        if (step === 2) return s ? ["|−⟩", "kicked"] : ["|+⟩", ""];
        return [`|${s}⟩`, s ? "one" : ""];
      });
    }
    function advance() {
      if (step >= 4) { step = 0; drawQuantum(); return; }
      step++;
      if (step === 4) QP.confettiAt(next, 30);
      drawQuantum();
    }
    function drawQuantum() {
      // columns: 0-1 prepare |−⟩, 2 H, then the oracle (a box, or one CNOT per 1 in s), then H, then measure
      const k = peek ? pop(secret) : 1;
      const oc = 3 + k;
      // gates in time order (the diagram's layout fills columns left to right)
      const g = [{ name: "X", q: n, col: 0 }, { name: "H", q: n, col: 1 }];
      for (let q = 0; q < n; q++) g.push({ name: "H", q, col: 2 });
      if (peek) {
        let c = 3;
        for (let q = 0; q < n; q++) if ((secret >> q) & 1) g.push({ name: "CX", c: q, t: n, col: c++ });
      } else g.push({ name: "BOX", q: 0, q2: n, col: 3, label: 'U<tspan font-size="12" dy="4">f</tspan>' });
      for (let q = 0; q < n; q++) g.push({ name: "H", q, col: oc });
      for (let q = 0; q < n; q++) g.push({ name: "M", q, col: oc + 1 });
      circ.render(g, [[0, 1], [2, 2], [3, oc - 1], [oc, oc], [oc + 1, oc + 1]][step]);
      const st = chipStates();
      chips.forEach((c, k) => { c.lastChild.textContent = st[k][0]; c.className = "bv-chip " + st[k][1]; });
      next.textContent = STEPS[step];
      qNote.textContent =
        step === 0 ? "Same recipe as Deutsch–Jozsa: the output qubit waits in |−⟩."
        : step === 1 ? "Every input qubit is now |+⟩: together, all 64 inputs at once."
        : step === 2 ? "Kickback: each CNOT inside the oracle acts as a Z on its control, so exactly the qubits where s has a 1 turned into |−⟩."
        : step === 3 ? "H turns |+⟩ back into |0⟩ and |−⟩ into |1⟩. The register now holds s itself."
        : `Measured ${str(secret)}: the whole secret, from one query. Compare with the left side.`;
    }
    newSecret();
  }
})();

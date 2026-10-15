/* qc-w5d3: Deutsch–Jozsa on 3 input bits. Query a hidden function classically, card by card, or ask the
   quantum oracle once: H, kickback signs, H again, and all the amplitude lands on 000 or avoids it. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const N = 8;
  const bits = (x) => x.toString(2).padStart(3, "0");
  const pop = (x) => (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1);
  const FUNCS = {
    c0: { label: "constant 0", table: () => Array(N).fill(0) },
    c1: { label: "constant 1", table: () => Array(N).fill(1) },
    x0: { label: "f = x₀", table: () => Array.from({ length: N }, (_, x) => x & 1) },
    par: { label: "parity", table: () => Array.from({ length: N }, (_, x) => pop(x) % 2) },
    maj: { label: "majority", table: () => Array.from({ length: N }, (_, x) => (pop(x) >= 2 ? 1 : 0)) },
    mys: { label: "mystery", table: () => mystery() },
  };
  function mystery() {
    if (Math.random() < 0.5) return Array(N).fill(Math.random() < 0.5 ? 0 : 1);
    const t = [0, 0, 0, 0, 1, 1, 1, 1];
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
    return t;
  }
  const hadamard = (a) => a.map((_, y) => a.reduce((s, ax, x) => s + (pop(x & y) % 2 ? -ax : ax), 0) / Math.sqrt(N));
  const STEPS = ["1 · H on the inputs", "2 · Ask the oracle once", "3 · H again", "4 · Measure", "Start again"];
  const HL = [[0, 1], [2, 2], [3, 3], [4, 4], [5, 5], [5, 5]];

  function widget() {
    const card = QP.widget("dj", "Constant or balanced?", "many classical questions, or one quantum one");
    if (!card) return;
    let fk = "mys", table = FUNCS.mys.table(), asked = new Set(), step = 0, amps = null, outcome = null;
    const fSeg = ui.seg({ label: "Hidden function", options: Object.keys(FUNCS).map((k) => ({ value: k, label: FUNCS[k].label })), value: fk, onchange: (v) => { fk = v; newFunction(); } });
    const again = ui.button("New mystery", () => newFunction(), "btn soft tiny");
    // classical side
    const cards = Array.from({ length: N }, (_, x) => {
      const val = h("span", { class: "dj-val" }, "?");
      const b = h("button", { type: "button", class: "dj-card", onclick: () => ask(x) }, h("span", { class: "dj-x" }, bits(x)), val);
      return { b, val };
    });
    const sQ = ui.stat("questions asked", "0");
    const verdict = h("div", { class: "small", style: { fontWeight: 800, minHeight: "2.6em", marginTop: "8px", color: C.ink2 } });
    // quantum side
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px" } });
    const circ = QP.circuit(circHost, { n: 4, gates: [], minCols: 6, scale: 1, wireLabels: ["q0", "q1", "q2", "out"] });
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: Array.from({ length: N }, (_, x) => bits(x)), height: 80, phase: false, fmt: (v) => (Math.abs(v) < 0.005 ? "0" : (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2).replace(/^0/, "")) });
    const next = ui.button(STEPS[0], () => advance(), "btn qc small");
    const qOut = h("div", { class: "small", style: { fontWeight: 800, minHeight: "2.6em", marginTop: "6px", color: C.ink2 } });
    card.body.append(
      h("div", { class: "controls" }, fSeg, again),
      h("div", { class: "side-by-side even", style: { marginTop: "10px" } },
        h("div", null, h("div", { class: "kbd-hint" }, "Classical: tap an input to ask for f(x)"), h("div", { class: "dj-cards" }, ...cards.map((c) => c.b)), h("div", { class: "readout" }, sQ), verdict),
        h("div", null, h("div", { class: "kbd-hint" }, "Quantum: one question, to all 8 inputs at once"), circHost,
          h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "Amplitudes of the inputs (hidden on real hardware)"), barsHost,
          h("div", { class: "btn-row" }, next), qOut)));
    // the bar colours: blue for +, orange for −
    const paintBars = (vals) => {
      bars.set(vals);
      bars.items.forEach((it, i) => (it.fill.style.background = vals[i] < -1e-9 ? "linear-gradient(180deg,#ffc7ae,#ff8a50)" : "linear-gradient(180deg,#c4d0ff,#5577f5)"));
    };

    function newFunction() {
      table = FUNCS[fk].table();
      asked = new Set();
      again.hidden = fk !== "mys";
      restartQuantum();
      drawClassical();
    }
    function ask(x) {
      asked.add(x);
      drawClassical();
    }
    function drawClassical() {
      cards.forEach((c, x) => {
        const known = asked.has(x);
        c.val.textContent = known ? String(table[x]) : "?";
        c.b.classList.toggle("on", known);
        c.b.classList.toggle("one", known && table[x] === 1);
      });
      sQ.set(String(asked.size));
      const seen = [...asked].map((x) => table[x]);
      const kinds = new Set(seen);
      if (!seen.length) verdict.textContent = "Ask questions until you're sure. How many might you need?";
      else if (kinds.size === 2) verdict.textContent = `Balanced, for sure: you saw a 0 and a 1. It took ${asked.size} questions this time.`;
      else if (seen.length >= 5) verdict.textContent = `Constant, for sure: ${seen.length} equal answers is more than half of the 8 inputs. It took ${seen.length} questions.`;
      else verdict.textContent = `Not sure yet: all ${seen.length} answer${seen.length > 1 ? "s are" : " is"} ${seen[0]}. In the worst case you need ${5 - seen.length} more.`;
    }
    function restartQuantum() {
      step = 0;
      amps = Array.from({ length: N }, (_, x) => (x === 0 ? 1 : 0));
      outcome = null;
      drawQuantum();
    }
    function advance() {
      if (step === 0) amps = hadamard(amps);
      else if (step === 1) amps = amps.map((a, x) => (table[x] ? -a : a));
      else if (step === 2) amps = hadamard(amps);
      else if (step === 3) {
        let u = Math.random(), k = 0;
        const p = amps.map((a) => a * a);
        while (k < N - 1 && u >= p[k]) { u -= p[k]; k++; }
        outcome = k;
      } else { restartQuantum(); return; }
      step++;
      drawQuantum();
    }
    function drawQuantum() {
      circ.render([
        { name: "X", q: 3, col: 0 }, { name: "H", q: 3, col: 1 },
        { name: "H", q: 0, col: 2 }, { name: "H", q: 1, col: 2 }, { name: "H", q: 2, col: 2 },
        { name: "BOX", q: 0, q2: 3, col: 3, label: 'U<tspan font-size="12" dy="4">f</tspan>' },
        { name: "H", q: 0, col: 4 }, { name: "H", q: 1, col: 4 }, { name: "H", q: 2, col: 4 },
        { name: "M", q: 0, col: 5 }, { name: "M", q: 1, col: 5 }, { name: "M", q: 2, col: 5 },
      ], HL[step]);
      paintBars(amps);
      next.textContent = STEPS[step];
      const p0 = amps[0] * amps[0];
      qOut.textContent =
        step === 0 ? "The output qubit starts in |−⟩, ready for phase kickback."
        : step === 1 ? "All 8 inputs at once, each with amplitude +0.35."
        : step === 2 ? "One query. Kickback turned each answer into a sign: orange bars are the inputs with f(x) = 1."
        : step === 3 ? (p0 > 0.999 ? "All the amplitude piled onto 000: every path to it had the same sign." : p0 < 1e-9 ? "The amplitude of 000 is exactly 0: its plus and minus paths cancelled." : `000 now has probability ${p0.toFixed(2)}.`)
        : outcome === 0 ? "Measured 000: the function is constant. One question was enough."
        : `Measured ${bits(outcome)}, not 000: the function is balanced. One question was enough.`;
    }
    newFunction();
  }
})();

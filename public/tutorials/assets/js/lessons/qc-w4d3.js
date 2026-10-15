/* qc-w4d3: Bell states. Build all four in the circuit lab, and read their correlations in three bases. */
(function () {
  const { h } = QP;
  const C = QP.colors;
  const s2 = Math.SQRT1_2;
  QP.onReady(() => widget());

  // <P P> for P in {Z, X, Y} on both qubits: change basis on both, then average (-1)^(b0 + b1)
  function corr(st, basis) {
    const s = st.clone();
    for (const q of [0, 1]) {
      if (basis === "X") s.gate("H", q);
      if (basis === "Y") { s.gate("Sdg", q); s.gate("H", q); }
    }
    const p = s.probs();
    return p[0] - p[1] - p[2] + p[3];
  }

  function widget() {
    const card = QP.widget("bell", "The four Bell states", "build them, then read their correlations");
    if (!card) return;
    const meters = ["Z", "X", "Y"].map((b) => {
      const fill = h("div", { class: "corr-fill" });
      const val = h("span", { class: "corr-val" });
      const el = h("div", { class: "corr-row" }, h("span", { class: "corr-lab" }, `${b}${b}`), h("div", { class: "corr-track" }, h("span", { class: "corr-mid" }), fill), val);
      return { b, fill, val, el };
    });
    const panel = h("div", { class: "corr-panel" }, h("div", { class: "kbd-hint" }, "Correlation of the two qubits in each basis: +1 always agree · 0 no relation · −1 always disagree"), ...meters.map((m) => m.el));
    const lab = QP.circuitLab(card.body, {
      n: 2,
      cols: 5,
      palette: ["H", "X", "Z", "CX"],
      show: { bloch: true, amps: true, ket: true, hist: true },
      challenges: [
        { title: "|Φ+⟩ = (|00⟩ + |11⟩)/√2", text: "The classic Bell state: always agree.", target: { amps: [s2, 0, 0, s2] }, maxGates: 2, hint: "H on qubit 0, then a CNOT with qubit 0 as control (tap q0 first, then q1)." },
        { title: "|Φ−⟩ = (|00⟩ − |11⟩)/√2", text: "Same 0/1 statistics, but a minus sign.", target: { amps: [s2, 0, 0, -s2] }, maxGates: 3, hint: "Make |Φ+⟩, then a Z on either qubit flips the sign of |11⟩." },
        { title: "|Ψ+⟩ = (|01⟩ + |10⟩)/√2", text: "Now the qubits always disagree.", target: { amps: [0, s2, s2, 0] }, maxGates: 3, hint: "Make |Φ+⟩, then flip one qubit with X." },
        { title: "|Ψ−⟩ = (|01⟩ − |10⟩)/√2", text: "The famous singlet: disagree in every basis.", target: { amps: [0, s2, -s2, 0] }, maxGates: 4, hint: "Start with X on qubit 0, then H on qubit 0, then the CNOT, then X on qubit 1. Watch the signs." },
      ],
      onChange: (st) => {
        for (const m of meters) {
          const v = corr(st, m.b);
          m.fill.style.left = v >= 0 ? "50%" : `${50 + 50 * v}%`;
          m.fill.style.width = `${Math.abs(v) * 50}%`;
          m.fill.style.background = v >= 0 ? "linear-gradient(90deg,#b9a7ff,#7b5cfa)" : "linear-gradient(90deg,#ff8a50,#ffc7ae)";
          m.val.textContent = (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
        }
      },
    });
    lab.el.insertBefore(panel, lab.el.querySelector(".clab-outs"));
    // run onChange once now that the meters are in place
    lab.setStep(null);
  }
})();

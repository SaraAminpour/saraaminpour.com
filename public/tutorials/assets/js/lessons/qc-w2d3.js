/* qc-w2d3: the Hadamard gate. A one-qubit circuit lab with four challenges about H. */
(function () {
  const s2 = Math.SQRT1_2;
  QP.onReady(() => {
    const card = QP.widget("hlab", "Hadamard challenges", "pick a gate, then tap the wire");
    if (!card) return;
    const used = (gates, name) => gates.filter((g) => g.name === name && !g.locked).length;
    QP.circuitLab(card.body, {
      n: 1,
      cols: 6,
      palette: ["H", "X", "Z"],
      show: { bloch: true, amps: true, ket: true, hist: true },
      challenges: [
        { title: "Make |+⟩", text: "Turn |0⟩ into the equal superposition |+⟩ = (|0⟩ + |1⟩)/√2.", target: { amps: [s2, s2] }, maxGates: 1, hint: "One gate. Its name starts with H." },
        { title: "Make |−⟩", text: "Now |−⟩ = (|0⟩ − |1⟩)/√2: same odds as |+⟩, but the opposite point of the sphere.", target: { amps: [s2, -s2] }, maxGates: 2, hint: "Either flip the bit before H (H|1⟩ = |−⟩), or flip the phase after it." },
        { title: "Undo the H", text: "The starting circuit already has an H (dashed, it can't be removed). Add <b>one</b> gate so the qubit ends in |0⟩ again.", start: [{ name: "H", col: 0, q: 0, locked: true }], target: { amps: [1, 0] }, maxGates: 1, hint: "Which gate is its own inverse here? Look at the gate you already have." },
        { title: "A NOT without X", text: "Make |1⟩ using only H and Z gates: no X allowed.", check: (st, gates) => used(gates, "X") === 0 && st.probs()[1] > 0.999, hint: "H swaps the x and z axes. So H, then a turn about z, then H again is a turn about... x!" },
      ],
    });
  });
})();

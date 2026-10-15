/* qc-w3d2: unitary means reversible. Undo locked circuits by adding the inverse gates in reverse order. */
(function () {
  QP.onReady(() => {
    const card = QP.widget("undo", "Undo it!", "add gates after the dashed ones");
    if (!card) return;
    const back = (st) => st.probs()[0] > 0.9999;
    const lock = (gs) => gs.map((g, i) => ({ ...g, col: i, q: 0, locked: true }));
    QP.circuitLab(card.body, {
      n: 1,
      cols: 8,
      palette: ["H", "X", "S", "Sdg", "T", "Tdg", "RX", "RY", "RZ"],
      defaultTheta: 0,
      show: { bloch: true, amps: true, ket: true, hist: false },
      challenges: [
        { title: "Undo H, then S", text: "The dashed gates (H, then S) can't be removed. Add gates after them so the qubit ends back at |0⟩.", start: lock([{ name: "H" }, { name: "S" }]), check: (st) => back(st), maxGates: 2, hint: "Socks and shoes: undo the last gate first. S† (Qiskit calls it sdg) undoes S, then H undoes H." },
        { title: "Undo H then T", text: "Bring the qubit back to |0⟩.", start: lock([{ name: "H" }, { name: "T" }]), check: (st) => back(st), maxGates: 2, hint: "T† (Tdg) first, then H." },
        { title: "Undo a rotation", text: "This circuit uses a rotation by 60°. Undo it all. Tap a placed rotation gate to change its angle.", start: lock([{ name: "H" }, { name: "S" }, { name: "RY", theta: 60 }]), check: (st) => back(st), maxGates: 3, hint: "RY(θ) is undone by RY(−θ). Then S†, then H." },
        { title: "The long one", text: "Four dashed gates. Undo them all, in as few gates as you can.", start: lock([{ name: "RX", theta: 50 }, { name: "RZ", theta: 70 }, { name: "H" }, { name: "T" }]), check: (st) => back(st), maxGates: 4, hint: "Reverse order, and invert each one: T†, H, RZ(−70°), RX(−50°)." },
      ],
    });
  });
})();

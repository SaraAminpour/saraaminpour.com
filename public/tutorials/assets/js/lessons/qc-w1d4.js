/* qc-w1d4: first circuits. The circuit lab with two qubits, X and H, and four small challenges. */
(function () {
  QP.onReady(() => {
    const host = document.querySelector('[data-widget="first"]');
    if (!host) return;
    const card = QP.widget("first", "Your first circuit lab", "pick a gate, then tap a wire");
    const hCount = (gates, q) => gates.filter((g) => g.name === "H" && g.q === q).length;
    QP.circuitLab(card.body, {
      n: 2,
      cols: 5,
      palette: ["X", "H"],
      show: { bloch: false, amps: true, ket: true, hist: true },
      stepper: false,
      challenges: [
        { title: "Make qubit 0 a 1", text: "Build a circuit whose measurement always reads <code>01</code>.", target: { probs: [0, 1, 0, 0] }, maxGates: 1, hint: "X is the quantum NOT. Which wire is qubit 0?" },
        { title: "Two fair coins", text: "Make all four outcomes <code>00</code>, <code>01</code>, <code>10</code>, <code>11</code> equally likely.", target: { probs: [0.25, 0.25, 0.25, 0.25] }, maxGates: 2, hint: "One H makes one fair coin." },
        { title: "A sure 1 and a coin", text: "Qubit 1 should always be 1, and qubit 0 a fair coin. Which two outcomes do you expect?", target: { probs: [0, 0, 0.5, 0.5] }, maxGates: 2, hint: "Qiskit writes qubit 1 on the <b>left</b>: in <code>10</code> and <code>11</code>, qubit 1 is 1." },
        { title: "The surprise", text: "Put <b>two</b> H gates in a row on qubit 0. One H makes a fair coin, so surely two do too? Predict, then look at the bars.", check: (st, gates) => hCount(gates, 0) >= 2 && st.probs()[0] > 0.999, hint: "Just place two H gates on the top wire, and nothing else." },
      ],
    });
  });
})();

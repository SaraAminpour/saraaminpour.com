/* qc-w4d4: many qubits. A three-qubit GHZ lab, and the exponential wall of 2^n amplitudes. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const s2 = Math.SQRT1_2;
  QP.onReady(() => {
    ghz();
    wall();
  });

  function ghz() {
    const card = QP.widget("ghz", "Three qubits, one decision", "GHZ states");
    if (!card) return;
    const amps = (on) => Array.from({ length: 8 }, (_, i) => (on[i] == null ? 0 : on[i]));
    QP.circuitLab(card.body, {
      n: 3,
      cols: 5,
      palette: ["H", "X", "Z", "CX"],
      show: { bloch: true, amps: true, ket: true, hist: true },
      challenges: [
        { title: "GHZ = (|000⟩ + |111⟩)/√2", text: "All three qubits 0, or all three 1, half and half.", target: { amps: amps({ 0: s2, 7: s2 }) }, maxGates: 3, hint: "H on qubit 0, then a CNOT from qubit 0 to qubit 1, then one from qubit 1 (or 0) to qubit 2." },
        { title: "(|000⟩ − |111⟩)/√2", text: "Same counts, opposite sign.", target: { amps: amps({ 0: s2, 7: -s2 }) }, maxGates: 4, hint: "Make GHZ, then one Z on any qubit." },
        { title: "(|001⟩ + |110⟩)/√2", text: "Qubit 0 always disagrees with the other two. (Remember: q2 q1 q0.)", target: { amps: amps({ 1: s2, 6: s2 }) }, maxGates: 4, hint: "Make GHZ, then flip qubit 0 with X." },
      ],
    });
  }

  function wall() {
    const card = QP.widget("wall", "The exponential wall", "how much memory n qubits need");
    if (!card) return;
    let n = 20;
    const nS = ui.slider({ label: "qubits n", min: 1, max: 80, step: 1, value: n, fmt: (v) => String(v), oninput: (v) => { n = v; draw(); } });
    const sA = ui.stat("amplitudes 2ⁿ", "–"), sM = ui.stat("memory (16 bytes each)", "–");
    const bar = h("div", { class: "wall-track" }, h("div", { class: "wall-fill" }));
    const marks = h("div", { class: "wall-marks" });
    const note = h("div", { class: "small", style: { fontWeight: 800, color: C.ink2, marginTop: "8px", minHeight: "2.6em" } });
    const LIMITS = [
      [30, "a laptop (16 GB)", "#17a98c"],
      [45, "a big supercomputer (0.5 PB)", "#f0ac2e"],
      [80, "", ""],
    ];
    card.body.append(h("div", { class: "controls" }, nS), h("div", { class: "readout" }, sA, sM), bar, marks, note);
    for (const [q, lab, col] of LIMITS.slice(0, 2)) marks.appendChild(h("span", { class: "wall-mark", style: { left: `${(q / 80) * 100}%`, borderColor: col, color: col } }, `${q} qubits: ${lab}`));
    const fmtBig = (log2) => {
      if (log2 < 40) return Math.pow(2, log2).toLocaleString("en-US");
      const log10 = log2 * Math.LOG10E * Math.LN2;
      return `about 10^${Math.floor(log10)}`;
    };
    const fmtBytes = (log2) => {
      const units = [["bytes", 0], ["KB", 10], ["MB", 20], ["GB", 30], ["TB", 40], ["PB", 50], ["EB", 60], ["ZB", 70], ["YB", 80]];
      let u = units[0];
      for (const x of units) if (log2 >= x[1]) u = x;
      const v = Math.pow(2, log2 - u[1]);
      return log2 > 90 ? `about 10^${Math.floor(log2 * 0.30103)} bytes` : `${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString("en-US")} ${u[0]}`;
    };
    function draw() {
      const log2b = n + 4; // 2^n amplitudes x 16 bytes
      sA.set(fmtBig(n));
      sM.set(fmtBytes(log2b), n <= 30 ? "good" : n <= 45 ? "" : "bad");
      bar.firstChild.style.width = `${(n / 80) * 100}%`;
      bar.firstChild.style.background = n <= 30 ? "linear-gradient(90deg,#a4eed9,#17a98c)" : n <= 45 ? "linear-gradient(90deg,#ffe597,#f0ac2e)" : "linear-gradient(90deg,#ffb8d2,#e5566b)";
      note.textContent = n <= 30 ? "A laptop can hold this state. Each extra qubit doubles the memory."
        : n <= 45 ? "Only the largest supercomputers can store this state."
        : n < 50 ? "Beyond almost every computer: simulations this big need clever tricks and the very largest machines."
        : n < 80 ? "No computer on Earth can store this state's amplitudes. A quantum computer just needs n qubits."
        : "2⁸⁰ amplitudes: around 10²⁴, more than the grains of sand on all of Earth's beaches.";
    }
    draw();
  }
})();

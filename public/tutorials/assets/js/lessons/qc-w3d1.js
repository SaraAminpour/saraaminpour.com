/* qc-w3d1: vectors and matrices. A matrix machine: gate x state, one row at a time, plus a chain of gates. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const cx = QP.cx;
  const s2 = Math.SQRT1_2;
  const STATES = { "|0⟩": [cx.cx(1), cx.cx(0)], "|1⟩": [cx.cx(0), cx.cx(1)], "|+⟩": [cx.cx(s2), cx.cx(s2)], "|−⟩": [cx.cx(s2), cx.cx(-s2)], "|+i⟩": [cx.cx(s2), cx.cx(0, s2)] };
  const GATES = ["X", "Y", "Z", "H", "S", "T"];
  QP.onReady(() => widget());

  const fmt = (z) => QP.fmtAmp(z, 2).replace("0.71", "0.71");
  const mat = (name) => QP.gates[name];
  const mul = (A, B) => [0, 1].map((i) => [0, 1].map((j) => cx.cadd(cx.cmul(A[i][0], B[0][j]), cx.cmul(A[i][1], B[1][j]))));
  const apply = (U, v) => [0, 1].map((i) => cx.cadd(cx.cmul(U[i][0], v[0]), cx.cmul(U[i][1], v[1])));

  function grid(M, cls = "", hiRow = -1, hiCol = -1) {
    const rows = M.length, cols = M[0].length;
    const g = h("div", { class: "mm-grid " + cls, style: { gridTemplateColumns: `repeat(${cols}, auto)` } });
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) g.appendChild(h("span", { class: "mm-cell" + (i === hiRow ? " hr" : "") + (j === hiCol ? " hc" : "") }, fmt(M[i][j])));
    return h("div", { class: "mm-br" }, g);
  }

  function widget() {
    const card = QP.widget("matrix", "The matrix machine", "gate × state = new state");
    if (!card) return;
    let gate = "H", input = "|0⟩", row = -1, chain = [];
    const gSeg = ui.seg({ label: "Gate", options: GATES, value: gate, onchange: (v) => { gate = v; row = -1; draw(); } });
    const sSeg = ui.seg({ label: "State", options: Object.keys(STATES), value: input, onchange: (v) => { input = v; row = -1; draw(); } });
    const eq = h("div", { class: "mm-eq" });
    const work = h("div", { class: "clab-ket", style: { whiteSpace: "normal", minHeight: "2.6em" } });
    const stepB = ui.button("Multiply one row", () => { row = row >= 1 ? -1 : row + 1; draw(); }, "btn qc small");
    const colNote = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, marginTop: "6px" } });
    const addB = ui.button("Add this gate to the chain", () => { if (chain.length < 4) { chain.push(gate); draw(); } }, "btn soft small");
    const clrB = ui.button("Clear the chain", () => { chain = []; draw(); }, "btn soft small");
    const chainBox = h("div", { class: "mm-chain" });
    card.body.append(h("div", { class: "controls col" }, gSeg, sSeg), eq, h("div", { class: "btn-row" }, stepB), work, colNote,
      h("hr", { class: "soft" }), h("div", { class: "kbd-hint" }, "A chain of gates is one matrix: build a circuit gate by gate"), h("div", { class: "btn-row", style: { marginTop: "6px" } }, addB, clrB), chainBox);

    function draw() {
      const U = mat(gate), v = STATES[input];
      const out = apply(U, v);
      eq.innerHTML = "";
      const vec = (x, hi) => grid(x.map((z) => [z]), "vec", hi);
      eq.append(h("div", { class: "mm-term" }, h("div", { class: "mm-cap" }, gate), grid(U, "", row)), h("div", { class: "mm-op" }, "×"),
        h("div", { class: "mm-term" }, h("div", { class: "mm-cap" }, input), vec(v)), h("div", { class: "mm-op" }, "="),
        h("div", { class: "mm-term" }, h("div", { class: "mm-cap" }, "result"), vec(row < 0 ? out : out.map((z, i) => (i <= row ? z : null)).map((z) => z || { re: NaN, im: 0 }), row)));
      eq.querySelectorAll(".mm-cell").forEach((c) => { if (c.textContent === "NaN") c.textContent = "?"; });
      if (row < 0) work.innerHTML = `<span class="muted">Result:</span> ${QP.ketString(new QP.State(1, out))} &nbsp;·&nbsp; press <b>Multiply one row</b> to see how each entry is made.`;
      else {
        const a = U[row][0], b = U[row][1];
        work.innerHTML = `<span class="muted">Row ${row + 1} times the column:</span> (${fmt(a)})·(${fmt(v[0])}) + (${fmt(b)})·(${fmt(v[1])}) = <b>${fmt(out[row])}</b>`;
      }
      colNote.textContent = input === "|0⟩" ? `Notice: the result is exactly the first column of ${gate}. The columns of a gate are where |0⟩ and |1⟩ go.`
        : input === "|1⟩" ? `Notice: the result is exactly the second column of ${gate}.`
        : "A superposition goes in, and the gate acts on each part: U(α|0⟩ + β|1⟩) = α·U|0⟩ + β·U|1⟩.";
      // chain: circuit order left to right; the matrix is the product right to left
      chainBox.innerHTML = "";
      if (!chain.length) {
        chainBox.append(h("div", { class: "kbd-hint" }, "No gates yet."));
        return;
      }
      let P = QP.gates.I;
      for (const g of chain) P = mul(mat(g), P); // the newest gate multiplies from the left
      const st = apply(P, v);
      chainBox.append(
        h("div", { class: "small", style: { fontWeight: 800 } }, `Circuit: ${input} → ${chain.join(" → ")}   ·   matrix: ${chain.slice().reverse().join("·")}  (right to left!)`),
        h("div", { class: "mm-eq", style: { marginTop: "8px" } }, h("div", { class: "mm-term" }, h("div", { class: "mm-cap" }, chain.slice().reverse().join("·")), grid(P)), h("div", { class: "mm-op" }, "→"), h("div", { class: "mm-term" }, h("div", { class: "mm-cap" }, "applied to " + input), grid(st.map((z) => [z]), "vec"))),
        h("div", { class: "clab-ket", style: { marginTop: "6px" } }, `Final state: ${QP.ketString(new QP.State(1, st))}`));
    }
    draw();
  }
})();

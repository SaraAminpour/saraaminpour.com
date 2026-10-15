/* qc-w2d2: the Pauli gates. Apply X, Y, Z to famous states and watch each one turn the sphere by 180°. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const s2 = Math.SQRT1_2;
  const STARTS = {
    "|0⟩": [1, 0], "|1⟩": [0, 1], "|+⟩": [s2, s2], "|−⟩": [s2, -s2],
    "|+i⟩": [{ re: s2, im: 0 }, { re: 0, im: s2 }], "|−i⟩": [{ re: s2, im: 0 }, { re: 0, im: -s2 }],
  };
  const AX = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] };
  const AXCOL = { X: "#5577f5", Y: "#17a98c", Z: "#7b5cfa" };
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("pauli", "Three half-turns", "tap a gate, watch the arrow");
    if (!card) return;
    let st = new QP.State(1, STARTS["|0⟩"]);
    let startName = "|0⟩", trail = [], busy = false;
    const bHost = h("div");
    const bloch = new QP.Bloch(bHost, { aspect: 0.95, maxH: 340, labels: "kets" });
    bloch.vectors = [{ v: st.bloch(0), color: "#ff6fa3" }];
    const gateBtn = (g) => {
      const b = h("button", { type: "button", class: "clab-tool big", title: `${g}: a half-turn about the ${g.toLowerCase()} axis` }, g);
      b.style.setProperty("--gf", g === "Z" ? "#e6dcff" : g === "Y" ? "#d5f5ec" : "#d6defe");
      b.style.setProperty("--gs", AXCOL[g]);
      b.addEventListener("click", () => apply(g));
      return b;
    };
    const gates = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Apply"), gateBtn("X"), gateBtn("Y"), gateBtn("Z"));
    const starts = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Start from"),
      ...Object.keys(STARTS).map((n) => ui.button(n, () => reset(n), "btn soft tiny")),
      ui.button("random", () => reset("random"), "btn soft tiny"));
    const ket = h("div", { class: "clab-ket" });
    const hist = h("div", { class: "clab-ket", style: { whiteSpace: "normal", fontSize: "0.86rem" } });
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: ["P(0)", "P(1)"], height: 80, colors: ["linear-gradient(180deg,#d6defe,#5577f5)", "linear-gradient(180deg,#ffd4c2,#ff8a50)"] });
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em" } });
    card.body.append(h("div", { class: "side-by-side" }, bHost, h("div", null, gates, starts, h("div", { style: { marginTop: "10px" } }, ket), h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "Odds of measuring 0 and 1"), barsHost, note)), hist);

    function reset(name) {
      if (busy) return;
      if (name === "random") {
        const th = Math.acos(1 - 2 * Math.random()), ph = 2 * Math.PI * Math.random();
        st = QP.fromBloch(th, ph);
      } else st = new QP.State(1, STARTS[name]);
      startName = name === "random" ? "a random state" : name;
      trail = [];
      bloch.vectors[0].v = st.bloch(0);
      draw("");
    }
    function apply(g) {
      if (busy) return;
      busy = true;
      const before = st.clone();
      st.gate(g, 0);
      trail.push(g);
      bloch.rotate(0, AX[g], Math.PI, 750, () => {
        busy = false;
        bloch.vectors[0].v = st.bloch(0);
        const same = st.fidelity(before) > 0.9999;
        const flipped = st.fidelity(before) < 1e-4;
        draw(same ? `${g} left this state where it was (only a global phase changed): the arrow lies on the ${g.toLowerCase()} axis, which a turn about that axis can't move.`
          : flipped ? `${g} sent the arrow to the opposite point of the sphere: a perfectly distinguishable state.`
          : `${g} turned the arrow by 180° about the ${g.toLowerCase()} axis (the glowing line).`);
      });
    }
    function draw(msg) {
      bloch.draw();
      ket.innerHTML = `<span class="muted">State:</span> ${QP.ketString(st)}`;
      bars.set(st.probs());
      hist.innerHTML = `<span class="muted">Your sequence:</span> start ${startName}${trail.length ? " → " + trail.join(" → ") : ""} &nbsp;(read left to right, like a circuit)`;
      note.textContent = msg || "Every Pauli gate is a half-turn (180°) about one axis of the sphere: X about x, Y about y, Z about z.";
    }
    draw("");
  }
})();

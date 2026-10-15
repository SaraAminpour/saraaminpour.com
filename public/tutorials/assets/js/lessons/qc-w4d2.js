/* w4d2: entanglement. RY(θ) then CNOT, single-qubit Bloch arrows, and measuring pairs. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("bell", "Dial up the entanglement", "θ = 90° gives a Bell state");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    let theta = 30;
    const rng = QP.rng((Math.random() * 2147483647) | 0);
    let counts = [0, 0, 0, 0];

    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "6px 10px" } });
    const circ = QP.circuit(circHost, { n: 2, gates: [], minCols: 4, scale: 1.25 });
    const tS = ui.slider({ label: "θ for RY on qubit 0", min: 0, max: 180, step: 1, value: theta, fmt: (v) => v + "°", oninput: (v) => { theta = v; counts = [0, 0, 0, 0]; draw(); } });
    const presets = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Jump to"), ui.button("θ = 0 (no entanglement)", () => set(0), "btn soft tiny"), ui.button("θ = 90° (Bell state)", () => set(90), "btn soft tiny"));
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: ["00", "01", "10", "11"], height: 100, colors: Array(4).fill("linear-gradient(180deg,#cdbfff,#7b5cfa)"), fmt: (v) => v.toFixed(2) });
    const meterFill = h("div", { style: { height: "100%", width: "0%", borderRadius: "999px", background: "linear-gradient(90deg,#7fe0c4,#b9a7ff,#ff8fb8)", transition: "width .4s cubic-bezier(.22,1,.36,1)" } });
    const meter = h("div", null, h("div", { class: "kbd-hint" }, "Entanglement meter"), h("div", { style: { height: "14px", borderRadius: "999px", background: "rgba(123,92,250,.1)", margin: "6px 0 4px", overflow: "hidden" } }, meterFill), h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, color: C.ink3 } }, h("span", null, "product state"), h("span", null, "maximally entangled")));
    const meterTxt = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, marginTop: "4px" } });
    const b0Host = h("div"), b1Host = h("div");
    const bl0 = new QP.Bloch(b0Host, { aspect: 0.95, maxH: 220, labels: "xyz" });
    const bl1 = new QP.Bloch(b1Host, { aspect: 0.95, maxH: 220, labels: "xyz" });
    bl0.vectors = [{ v: [0, 0, 1], color: "#7b5cfa" }];
    bl1.vectors = [{ v: [0, 0, 1], color: "#ff8a50" }];
    const len0 = h("div", { class: "small center", style: { fontWeight: 800, color: "#7b5cfa" } });
    const len1 = h("div", { class: "small center", style: { fontWeight: 800, color: "#ff8a50" } });
    const pairOut = h("div", { style: { display: "flex", gap: "10px", alignItems: "center" } });
    const coin = (txt, color) => h("div", { style: { width: "54px", height: "54px", borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "Fredoka, sans-serif", fontWeight: 600, fontSize: "1.5rem", background: "#fff", border: `3px solid ${color}`, color } }, txt);
    const c1 = coin("?", "#ff8a50"), c0 = coin("?", "#7b5cfa");
    pairOut.append(h("div", { class: "small", style: { fontWeight: 800, color: C.ink3 } }, "q1"), c1, c0, h("div", { class: "small", style: { fontWeight: 800, color: C.ink3 } }, "q0"));
    const histHost = h("div");
    const hist = QP.hist(histHost, { labels: ["00", "01", "10", "11"], height: 80, colors: Array(4).fill("linear-gradient(180deg,#ffc7ae,#ff8a50)") });
    const one = ui.button("Measure one pair", () => measure(1), "btn qc small");
    const hundred = ui.button("Measure 100 pairs", () => measure(100), "btn soft small");

    card.body.append(
      circHost,
      h("div", { class: "controls" }, tS),
      presets,
      h("div", { class: "side-by-side even", style: { marginTop: "14px" } },
        h("div", null, h("div", { class: "kbd-hint" }, "Probabilities (labels q1 q0)"), barsHost, meter, meterTxt),
        h("div", null, h("div", { class: "kbd-hint" }, "Each qubit on its own"), h("div", { class: "grid-2", style: { gap: "8px" } }, h("div", null, b0Host, len0), h("div", null, b1Host, len1)))),
      h("hr", { class: "soft" }),
      h("div", { class: "side-by-side even" }, h("div", null, h("div", { class: "btn-row" }, one, hundred), h("div", { style: { marginTop: "12px" } }, pairOut)), histHost)
    );

    function state() {
      return new QP.State(2).gate("RY", 0, theta * deg).cx(0, 1);
    }
    function set(v) {
      const from = theta;
      QP.animate(600, (e) => { theta = from + (v - from) * e; tS.set(Math.round(theta)); draw(); });
      counts = [0, 0, 0, 0];
    }
    function draw() {
      circ.render([{ name: "RY", q: 0, param: `${Math.round(theta)}°` }, { name: "CX", c: 0, t: 1 }, { name: "M", q: 0 }, { name: "M", q: 1 }]);
      const s = state();
      bars.set(s.probs());
      const a = s.a;
      const conc = 2 * Math.hypot(a[0].re * a[3].re - a[1].re * a[2].re, 0);
      meterFill.style.width = (conc * 100).toFixed(1) + "%";
      meterTxt.textContent = conc < 0.01 ? "Not entangled: the qubits are independent." : conc > 0.99 ? "Maximally entangled: a Bell state!" : `Partly entangled (${(conc * 100).toFixed(0)}% of the maximum).`;
      const v0 = s.bloch(0), v1 = s.bloch(1);
      bl0.vectors[0].v = v0;
      bl1.vectors[0].v = v1;
      bl0.draw();
      bl1.draw();
      len0.textContent = `qubit 0 · arrow length ${Math.hypot(...v0).toFixed(2)}`;
      len1.textContent = `qubit 1 · arrow length ${Math.hypot(...v1).toFixed(2)}`;
      hist.set(counts, Math.max(1, ...counts));
    }
    function measure(n) {
      const p = state().probs();
      let last = 0;
      for (let k = 0; k < n; k++) {
        let u = rng(), i = 0;
        while (i < 3 && u >= p[i]) { u -= p[i]; i++; }
        counts[i]++;
        last = i;
      }
      const bits = last.toString(2).padStart(2, "0");
      c1.textContent = bits[0];
      c0.textContent = bits[1];
      for (const el of [c1, c0]) el.animate([{ transform: "rotateY(0deg) scale(.8)" }, { transform: "rotateY(360deg) scale(1.1)" }, { transform: "scale(1)" }], { duration: 550, easing: "cubic-bezier(.34,1.56,.64,1)" });
      hist.set(counts, Math.max(1, ...counts));
    }
    draw();
  }
})();

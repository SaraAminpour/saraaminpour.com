/* qc-w3d4: measuring in other bases. One state, three meters (Z, X, Y), each reading one coordinate of the arrow. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  QP.onReady(() => widget());

  const BASES = [
    { key: "Z", labels: ["0", "1"], circ: "— meter", color: "#7b5cfa", axis: [0, 0, 1], coord: 2, name: "z" },
    { key: "X", labels: ["+", "−"], circ: "— H — meter", color: "#5577f5", axis: [1, 0, 0], coord: 0, name: "x" },
    { key: "Y", labels: ["+i", "−i"], circ: "— S† — H — meter", color: "#17a98c", axis: [0, 1, 0], coord: 1, name: "y" },
  ];

  function widget() {
    const card = QP.widget("bases", "One state, three meters", "each meter reads one direction");
    if (!card) return;
    const rng = QP.rng((Math.random() * 1e9) | 0);
    let th = 60, ph = 0;
    const counts = BASES.map(() => [0, 0]);
    const bHost = h("div");
    const bloch = new QP.Bloch(bHost, { aspect: 0.95, maxH: 320, labels: "kets" });
    bloch.vectors = [{ v: [0, 0, 1], color: "#ff6fa3", shadow: true }];
    const tS = ui.slider({ label: "θ", min: 0, max: 180, step: 1, value: th, fmt: (v) => v + "°", oninput: (v) => { th = v; resetCounts(); draw(); } });
    const pS = ui.slider({ label: "φ", min: -180, max: 180, step: 1, value: ph, fmt: (v) => v + "°", oninput: (v) => { ph = v; resetCounts(); draw(); } });
    const presets = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Jump to"),
      ...[["|0⟩", 0, 0], ["|+⟩", 90, 0], ["|−⟩", 90, 180], ["|+i⟩", 90, 90], ["RY(60°)|0⟩", 60, 0]].map(([n, t, p]) => ui.button(n, () => { th = t; ph = p; tS.set(t); pS.set(p); resetCounts(); draw(); }, "btn soft tiny")));
    const panels = BASES.map((b, i) => {
      const histHost = h("div");
      const bars = QP.bars(histHost, { labels: b.labels.map((l) => (b.key === "Z" ? `${l}` : `${l}`)), height: 70, colors: [`linear-gradient(180deg, ${b.color}44, ${b.color})`, `linear-gradient(180deg, #ffd4c2, #ff8a50)`], fmt: (v) => v.toFixed(2) });
      const cnt = h("div", { class: "small center", style: { fontWeight: 800, color: C.ink2, minHeight: "1.4em" } });
      const btn = ui.button("100 shots", () => { shoot(i, 100); }, "btn soft tiny");
      const el = h("div", { class: "card flat basis-card" }, h("div", { class: "basis-head", style: { color: b.color } }, `${b.key} basis`), h("div", { class: "kbd-hint" }, b.circ), histHost, cnt, h("div", { class: "btn-row", style: { justifyContent: "center" } }, btn));
      return { el, bars, cnt };
    });
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, marginTop: "8px" } });
    card.body.append(h("div", { class: "side-by-side" }, bHost, h("div", { class: "controls col" }, tS, pS, presets)), h("div", { class: "grid-3", style: { marginTop: "12px" } }, ...panels.map((p) => p.el)), note);

    function vec() {
      return [Math.sin(th * DEG) * Math.cos(ph * DEG), Math.sin(th * DEG) * Math.sin(ph * DEG), Math.cos(th * DEG)];
    }
    function resetCounts() {
      counts.forEach((c) => (c[0] = c[1] = 0));
    }
    function shoot(i, n) {
      const p = (1 + vec()[BASES[i].coord]) / 2;
      for (let k = 0; k < n; k++) counts[i][rng() < p ? 0 : 1]++;
      draw();
    }
    function draw() {
      const v = vec();
      bloch.vectors[0].v = v;
      bloch.lines = BASES.map((b) => ({ a: [0, 0, 0], b: b.axis.map((x) => x * v[b.coord]), color: b.color + "cc", width: 3 }));
      bloch.draw();
      BASES.forEach((b, i) => {
        const p = (1 + v[b.coord]) / 2;
        panels[i].bars.set([p, 1 - p]);
        const n = counts[i][0] + counts[i][1];
        panels[i].cnt.textContent = n ? `measured: ${counts[i][0]} × ${b.labels[0]}, ${counts[i][1]} × ${b.labels[1]}` : `${b.name} = ${v[b.coord].toFixed(2)} → P(${b.labels[0]}) = ${p.toFixed(2)}`;
      });
      note.textContent = "Each bar shows (1 + coordinate) / 2: the Z meter reads the arrow's height, the X meter its shadow on the x axis, the Y meter its shadow on the y axis (the colored lines).";
    }
    draw();
  }
})();

/* qc-w6d3: tell two states apart. Two Bloch vectors in the x–z disc (drag them; inside means mixed), a
   measurement axis (drag its handle), fidelity, trace distance, and the Helstrom bound ½(1 + D). */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("helstrom", "Which state did I send?", "the best possible guess");
    if (!card) return;
    let A = [0, 1], B = [1, 0], alpha = Math.PI / 2, drag = null, tally = { n: 0, ok: 0 };
    const rng = QP.rng((Math.random() * 2147483647) | 0);
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "The x–z slice of the Bloch ball (drag A, B and the axis handle)"));
    const plot = new QP.Plot(left, { xlim: [-1.35, 1.35], ylim: [-1.35, 1.35], aspect: 1, equal: true, minH: 260, maxH: 400, grid: false });
    const sF = ui.stat("fidelity F", "–"), sD = ui.stat("trace distance D", "–"), sP = ui.stat("your axis: P(correct)", "–"), sH = ui.stat("best possible ½(1 + D)", "–");
    const bestB = ui.button("Use the best axis", () => { const d = [A[0] - B[0], A[1] - B[1]]; alpha = Math.atan2(d[1], d[0]); tally = { n: 0, ok: 0 }; draw(); }, "btn qc small");
    const playB = ui.button("Play 100 rounds", () => play(), "btn ml small");
    const preset = (label, a, b) => ui.button(label, () => { A = a.slice(); B = b.slice(); tally = { n: 0, ok: 0 }; draw(); }, "btn soft tiny");
    const presets = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Try"), preset("|0⟩ vs |1⟩", [0, 1], [0, -1]), preset("|0⟩ vs |+⟩", [0, 1], [1, 0]), preset("two noisy states", [0, 0.5], [0.45, 0.1]));
    const tallyEl = h("div", { class: "small", style: { fontWeight: 800, color: C.ink2, minHeight: "1.5em", marginTop: "6px" } });
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    right.append(presets, h("div", { class: "readout" }, sF, sD, sP, sH), h("div", { class: "btn-row", style: { marginTop: "8px" } }, bestB, playB), tallyEl);
    card.body.append(note);
    plot.onresize = draw;

    const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
    const len = (u) => Math.hypot(u[0], u[1]);
    const n = () => [Math.cos(alpha), Math.sin(alpha)];
    // qubit fidelity from Bloch vectors: F = ½(1 + r·s + √(1−|r|²)√(1−|s|²))
    const fidelity = () => 0.5 * (1 + dot(A, B) + Math.sqrt(Math.max(0, 1 - dot(A, A))) * Math.sqrt(Math.max(0, 1 - dot(B, B))));
    const D = () => 0.5 * Math.hypot(A[0] - B[0], A[1] - B[1]);
    // measure along n: outcome + has probability (1 + n·r)/2; guess A on +, B on − (or the other way round, whichever is better)
    const pAxis = () => 0.5 + 0.25 * Math.abs(dot(n(), [A[0] - B[0], A[1] - B[1]]));
    const plusMeansA = () => dot(n(), [A[0] - B[0], A[1] - B[1]]) >= 0;

    plot.on({
      down: (p) => {
        const hp = [1.18 * Math.cos(alpha), 1.18 * Math.sin(alpha)];
        const d = (q) => Math.hypot(p.x - q[0], p.y - q[1]);
        drag = d(A) < 0.18 ? "A" : d(B) < 0.18 ? "B" : d(hp) < 0.22 || d([-hp[0], -hp[1]]) < 0.22 ? "axis" : null;
        if (drag) move(p);
      },
      drag: (p) => drag && move(p),
      up: () => (drag = null),
    });
    function move(p) {
      if (drag === "axis") alpha = Math.atan2(p.y, p.x);
      else {
        let q = [p.x, p.y];
        const L = len(q);
        if (L > 1) q = [q[0] / L, q[1] / L];
        if (drag === "A") A = q; else B = q;
      }
      tally = { n: 0, ok: 0 };
      draw();
    }
    function play() {
      const nn = n(), aIsPlus = plusMeansA();
      for (let k = 0; k < 100; k++) {
        const sendA = rng() < 0.5, r = sendA ? A : B;
        const plus = rng() < (1 + dot(nn, r)) / 2;
        const guessA = plus === aIsPlus;
        tally.n++;
        if (guessA === sendA) tally.ok++;
      }
      draw();
    }
    function draw() {
      plot.clear("#fff");
      plot.circle(0, 0, 1, { fill: "rgba(185,167,255,0.12)", stroke: "rgba(123,92,250,0.5)", width: 2 });
      plot.seg(-1.05, 0, 1.05, 0, { color: "rgba(76,60,140,0.25)", width: 1.2 });
      plot.seg(0, -1.05, 0, 1.05, { color: "rgba(76,60,140,0.25)", width: 1.2 });
      [["|0⟩", 0, 1.17], ["|1⟩", 0, -1.17], ["|+⟩", 1.2, 0], ["|−⟩", -1.2, 0]].forEach(([t, x, y]) => plot.text(t, x, y, { color: C.ink3, size: 12, font: "head" }));
      // the measurement axis and its two outcomes
      const nn = n(), aIsPlus = plusMeansA();
      plot.seg(-nn[0], -nn[1], nn[0], nn[1], { color: "#f0ac2e", width: 3, dash: [7, 5] });
      const tip = (s) => [s * nn[0] * 1.18, s * nn[1] * 1.18];
      plot.point(...tip(1), { r: 9, fill: "#ffd66b", stroke: C.ink, lw: 2 });
      plot.point(...tip(-1), { r: 7, fill: "#fff", stroke: "#f0ac2e", lw: 2.5 });
      // labels beside the two handles, pushed sideways so they don't sit on them
      const perp = [-nn[1] * 0.2, nn[0] * 0.2];
      plot.text(aIsPlus ? "guess A" : "guess B", tip(1)[0] + perp[0], tip(1)[1] + perp[1], { size: 11, color: "#c98a0c" });
      plot.text(aIsPlus ? "guess B" : "guess A", tip(-1)[0] - perp[0], tip(-1)[1] - perp[1], { size: 11, color: "#c98a0c" });
      // the two states, and the gap between them
      plot.seg(A[0], A[1], B[0], B[1], { color: "rgba(76,60,140,0.5)", width: 2, dash: [3, 3] });
      plot.arrow(0, 0, A[0], A[1], { color: "#ff8a50", width: 3, head: 9 });
      plot.arrow(0, 0, B[0], B[1], { color: "#5577f5", width: 3, head: 9 });
      plot.point(A[0], A[1], { r: 8, fill: "#ff8a50", stroke: "#fff", lw: 2 });
      plot.point(B[0], B[1], { r: 8, fill: "#5577f5", stroke: "#fff", lw: 2 });
      plot.text("A", A[0] + 0.1, A[1] + 0.1, { color: "#e8632b", size: 13, font: "head" });
      plot.text("B", B[0] + 0.1, B[1] + 0.1, { color: "#3b5bdb", size: 13, font: "head" });
      const d = D(), f = fidelity(), pa = pAxis(), hb = 0.5 * (1 + d);
      sF.set(f.toFixed(3));
      sD.set(d.toFixed(3));
      sP.set(`${(pa * 100).toFixed(1)}<small>%</small>`, pa > hb - 0.002 ? "good" : "");
      sH.set(`${(hb * 100).toFixed(1)}<small>%</small>`);
      tallyEl.textContent = tally.n ? `Rounds played: ${tally.n}, guessed right: ${tally.ok} (${((tally.ok / tally.n) * 100).toFixed(0)}%).` : "";
      note.textContent = d > 0.999 ? "D = 1: the states are opposite (orthogonal), and the right measurement tells them apart every time."
        : pa > hb - 0.002 ? `This axis is optimal: it points along the difference A − B. Nothing can beat ${(hb * 100).toFixed(1)}% with a single copy.`
        : `Your axis wins ${(pa * 100).toFixed(1)}% of the time. Turn it, or press Use the best axis: the bound is ${(hb * 100).toFixed(1)}%.`;
    }
    draw();
  }
})();

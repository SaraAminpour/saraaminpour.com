/* w1d2: from bits to qubits. Widget: the amplitude circle with measurements. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => circle());

  function circle() {
    const card = QP.widget("circle", "The amplitude circle", "drag the pink dot");
    if (!card) return;
    const C = QP.colors;
    let t = Math.atan2(Math.sqrt(0.3), Math.sqrt(0.7)); // start at 70/30
    const counts = [0, 0];
    const rng = QP.rng((Math.random() * 2147483647) | 0);

    const left = h("div");
    const right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [-1.35, 1.35], ylim: [-1.35, 1.35], aspect: 1, equal: true, minH: 260, maxH: 420, axes: true });
    plot.c.classList.add("grab");

    right.append(h("div", { class: "kbd-hint", style: { marginBottom: "4px" } }, "Probabilities (amplitude squared)"));
    const bars = QP.bars(right, { labels: ["P(0)", "P(1)"], height: 130, colors: ["linear-gradient(180deg,#a9bbff,#5577f5)", "linear-gradient(180deg,#ffc7ae,#ff8a50)"], fmt: (v) => v.toFixed(2) });
    const amp = ui.stat("Amplitudes", "–");
    const sum = ui.stat("P(0) + P(1)", "1.00", "good");
    right.append(h("div", { class: "readout" }, amp, sum));

    const presets = h("div", { class: "btn-row", style: { marginTop: "12px" } }, h("span", { class: "seg-label" }, "Jump to"),
      ...[["|0⟩", 0], ["|1⟩", Math.PI / 2], ["|+⟩", Math.PI / 4], ["|−⟩", -Math.PI / 4], ["70/30", Math.atan2(Math.sqrt(0.3), Math.sqrt(0.7))]].map(([lab, ang]) =>
        ui.button(lab, () => animateTo(ang), "btn soft tiny")));
    card.body.append(presets);

    // measurement area
    const result = h("div", { style: { width: "64px", height: "64px", borderRadius: "20px", display: "grid", placeItems: "center", fontFamily: "Fredoka, sans-serif", fontWeight: 600, fontSize: "2rem", background: "#fff", border: "2px dashed rgba(76,60,140,.25)", color: C.ink3, transition: "all .3s" } }, "?");
    const once = ui.button("Measure once", () => measure(1), "btn qc small");
    const many = ui.button("Measure 100 times", () => measure(100), "btn soft small");
    const reset = ui.button("Clear counts", () => { counts[0] = counts[1] = 0; hist.set(counts, 1); note.textContent = "No measurements yet."; result.textContent = "?"; }, "btn soft small");
    const note = h("div", { class: "small muted" }, "No measurements yet.");
    const histHost = h("div");
    const hist = QP.hist(histHost, { labels: ["saw 0", "saw 1"], height: 110, colors: ["linear-gradient(180deg,#a9bbff,#5577f5)", "linear-gradient(180deg,#ffc7ae,#ff8a50)"] });
    card.body.append(
      h("hr", { class: "soft" }),
      h("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "16px", alignItems: "center" } },
        result,
        h("div", null, h("div", { class: "btn-row" }, once, many, reset), h("div", { style: { marginTop: "6px" } }, note))),
      histHost
    );

    function state() {
      return [Math.cos(t), Math.sin(t)];
    }
    function draw() {
      const [a, b] = state();
      plot.clear();
      // unit circle
      plot.circle(0, 0, 1, { stroke: "rgba(123,92,250,0.55)", width: 3 });
      // arc showing the angle
      const ctx = plot.ctx;
      ctx.save();
      ctx.beginPath();
      const r = Math.abs(plot.X(0.28) - plot.X(0));
      ctx.arc(plot.X(0), plot.Y(0), r, 0, -t, t > 0);
      ctx.strokeStyle = C.pink;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      // projections
      plot.seg(a, b, a, 0, { color: C.c1, width: 2, dash: [4, 5] });
      plot.seg(a, b, 0, b, { color: C.c0, width: 2, dash: [4, 5] });
      plot.seg(0, 0, a, 0, { color: C.c1, width: 6 });
      plot.seg(0, 0, 0, b, { color: C.c0, width: 6 });
      plot.arrow(0, 0, a * 0.97, b * 0.97, { color: C.ink, width: 3, head: 12 });
      plot.text("|0⟩", 1.2, -0.12, { font: "head", size: 15, color: C.ink2 });
      plot.text("|1⟩", 0.14, 1.22, { font: "head", size: 15, color: C.ink2 });
      plot.text(`α = ${a.toFixed(2)}`, a, b >= 0 ? -0.16 : 0.16, { color: C.c1, bg: "rgba(255,255,255,.85)" });
      plot.text(`β = ${b.toFixed(2)}`, a >= 0 ? -0.3 : 0.3, b, { color: "#d9693a", bg: "rgba(255,255,255,.85)" });
      plot.point(a, b, { r: 11, fill: C.pink, stroke: "#fff", lw: 3, glow: "rgba(255,143,184,.8)" });
      bars.set([a * a, b * b]);
      amp.set(`α ${a.toFixed(2)} <small>·</small> β ${b.toFixed(2)}`);
    }
    function animateTo(target) {
      const from = t;
      let d = target - from;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      QP.animate(500, (e) => { t = from + d * e; draw(); });
    }
    function setFromPointer(p) {
      t = Math.atan2(p.y, p.x);
      draw();
    }
    plot.on({ down: setFromPointer, drag: setFromPointer });
    plot.onresize = draw;
    draw();

    function measure(n) {
      const [a] = state();
      const p0 = a * a;
      if (n === 1) {
        const out = rng() < p0 ? 0 : 1;
        counts[out]++;
        result.textContent = String(out);
        result.style.background = out ? "#ffe3d6" : "#dfe6ff";
        result.style.color = out ? "#d9693a" : C.c1;
        result.style.borderStyle = "solid";
        result.animate([{ transform: "scale(.6) rotate(-20deg)" }, { transform: "scale(1.15) rotate(6deg)" }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.34,1.56,.64,1)" });
        hist.set(counts);
        summary();
        return;
      }
      once.disabled = many.disabled = true;
      let left = n;
      const tick = QP.loop(() => {
        const k = Math.min(left, 4);
        for (let i = 0; i < k; i++) counts[rng() < p0 ? 0 : 1]++;
        left -= k;
        hist.set(counts);
        summary();
        if (left <= 0) {
          once.disabled = many.disabled = false;
          return false;
        }
      });
    }
    function summary() {
      const N = counts[0] + counts[1];
      const [a] = state();
      note.innerHTML = `${N} shot${N === 1 ? "" : "s"}: <b>${counts[0]}</b> zeros (${((100 * counts[0]) / N).toFixed(0)}%) and <b>${counts[1]}</b> ones. The state says ${(100 * a * a).toFixed(0)}% / ${(100 * (1 - a * a)).toFixed(0)}%.`;
    }
  }
})();

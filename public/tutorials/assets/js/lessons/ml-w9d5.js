/* ml-w9d5: attention as a soft lookup. Drag the query; every key's match is the dot product q·k, scaled and
   turned into weights by softmax; the answer is the weighted average of the values (here, the keys' own
   positions, so the answer is a point you can see). */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  // keys: two dimensions with a made-up meaning, "animal-ness" (x) and "furniture-ness" (y)
  const KEYS = [
    { w: "cat", x: 2.2, y: 0.4 }, { w: "kitten", x: 2.0, y: -0.2 }, { w: "dog", x: 1.6, y: 0.9 },
    { w: "mat", x: 0.3, y: 2.1 }, { w: "sofa", x: -0.3, y: 2.3 }, { w: "ran", x: -1.9, y: -1.2 }, { w: "the", x: -0.2, y: -0.4 },
  ];
  const COLORS = [C.c0, "#ff9f6e", "#e45fa3", C.c1, "#7b5cfa", C.ml, C.ink3];

  function widget() {
    const card = QP.widget("attention", "Attention is a soft lookup", "drag the query arrow");
    if (!card) return;
    let q = { x: 1.2, y: -1.4 }, scale = 1, dragging = false;
    const host = h("div");
    const plot = new QP.Plot(host, { xlim: [-2.8, 3.2], ylim: [-2, 3], aspect: 0.72, maxH: 380, equal: true, grid: true });
    const sS = ui.slider({ label: "Sharpness (1/√d scaling × a factor)", min: 0.1, max: 4, step: 0.05, value: scale, fmt: (v) => "× " + v.toFixed(2), color: C.qc, oninput: (v) => { scale = v; draw(); } });
    const bars = KEYS.map((k, i) => {
      const fill = h("span", { class: "dg-fill", style: { background: COLORS[i] } }), pct = h("span", { class: "dg-pct" });
      return { row: h("div", { class: "dg-bar at-bar" }, h("b", null, k.w), h("span", { class: "dg-track" }, fill), pct), fill, pct };
    });
    const note = h("p", { class: "small", style: { fontWeight: 700, color: "var(--ink-2)", margin: "8px 0 0" } });
    card.body.append(h("div", { class: "controls" }, sS),
      h("div", { class: "side-by-side" }, host, h("div", null, h("div", { class: "kbd-hint" }, "Weights = softmax(q · k × sharpness)"), ...bars.map((b) => b.row), note)));
    plot.onresize = draw;
    const grab = (p) => { q = { x: QP.math.clamp(p.x, -2.6, 3), y: QP.math.clamp(p.y, -1.9, 2.9) }; draw(); };
    plot.on({ down: (p) => { dragging = true; grab(p); }, drag: (p) => dragging && grab(p), up: () => (dragging = false) });

    function draw() {
      const s = KEYS.map((k) => (q.x * k.x + q.y * k.y) * scale / Math.SQRT2);
      const m = Math.max(...s), e = s.map((v) => Math.exp(v - m)), tot = e.reduce((a, b) => a + b, 0), wts = e.map((v) => v / tot);
      const out = { x: QP.math.sum(KEYS.map((k, i) => wts[i] * k.x)), y: QP.math.sum(KEYS.map((k, i) => wts[i] * k.y)) };
      plot.clear();
      plot.seg(-2.8, 0, 3.2, 0, { color: C.line, width: 1 });
      plot.seg(0, -2, 0, 3, { color: C.line, width: 1 });
      plot.text("animal →", 3.1, 0.2, { color: C.ink3, size: 11, align: "right" });
      plot.text("furniture ↑", -0.1, 2.85, { color: C.ink3, size: 11, align: "right" });
      KEYS.forEach((k, i) => {
        plot.seg(k.x, k.y, out.x, out.y, { color: COLORS[i], width: 1 + 8 * wts[i], alpha: 0.25 + 0.6 * wts[i] });
      });
      KEYS.forEach((k, i) => {
        plot.point(k.x, k.y, { r: 5 + 9 * wts[i], fill: COLORS[i], stroke: "#fff", lw: 1.5 });
        plot.text(k.w, k.x, k.y + 0.32, { color: C.ink, size: 12 });
      });
      plot.point(q.x, q.y, { r: 13, fill: "rgba(123,92,250,0.15)", stroke: "rgba(123,92,250,0.5)", lw: 1.5 });
      plot.arrow(0, 0, q.x, q.y, { color: C.ink, width: 3 });
      plot.text("query", q.x, q.y + (q.y < 0 ? -0.42 : 0.42), { color: C.ink, size: 12, bg: "rgba(255,255,255,0.85)" });
      plot.point(out.x, out.y, { r: 7, fill: C.butter, stroke: C.ink, lw: 2 });
      plot.text("answer", out.x - 0.2, out.y - 0.32, { color: C.ink2, size: 11, align: "right", bg: "rgba(255,255,255,0.85)" });
      bars.forEach((b, i) => { b.fill.style.width = `${wts[i] * 100}%`; b.pct.textContent = `${Math.round(wts[i] * 100)}%`; });
      const top = wts.indexOf(Math.max(...wts));
      note.textContent = wts[top] > 0.6 ? `Almost a hard lookup: "${KEYS[top].w}" gets ${Math.round(wts[top] * 100)}% of the attention.` : wts[top] < 0.25 ? "Nearly even weights: the answer is a blur of everything." : `A blend: "${KEYS[top].w}" leads, but the others still count.`;
    }
    draw();
  }
})();

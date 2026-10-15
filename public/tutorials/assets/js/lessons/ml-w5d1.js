/* ml-w5d1: one neuron. Set its weights by hand or let the perceptron rule learn AND, OR, NAND, and fail at XOR. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const GATES = {
    AND: [0, 0, 0, 1],
    OR: [0, 1, 1, 1],
    NAND: [1, 1, 1, 0],
    XOR: [0, 1, 1, 0],
  };
  const XS = [[0, 0], [0, 1], [1, 0], [1, 1]];
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("neuron", "One neuron, four points", "set the weights, or let it learn");
    if (!card) return;
    let gate = "AND", w = [0.2, -0.4], b = 0.1, timer = null, epochs = 0, last = -1, msg = null;
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [-0.6, 1.6], ylim: [-0.6, 1.6], aspect: 1, equal: true, ticks: true, minH: 240, maxH: 330, xlabel: "x₁", ylabel: "x₂" });
    const gSeg = ui.seg({ label: "Teach it", options: Object.keys(GATES), value: gate, onchange: (v) => { gate = v; stop(); epochs = 0; msg = null; draw(); } });
    const s1 = ui.slider({ label: "w₁", min: -3, max: 3, step: 0.05, value: w[0], fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { w[0] = v; msg = null; draw(); } });
    const s2 = ui.slider({ label: "w₂", min: -3, max: 3, step: 0.05, value: w[1], fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { w[1] = v; msg = null; draw(); } });
    const sb = ui.slider({ label: "b", min: -3, max: 3, step: 0.05, value: b, fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { b = v; msg = null; draw(); } });
    const learn = ui.button("Learn with the perceptron rule", () => run(), "btn ml small");
    const reset = ui.button("Reset weights", () => { stop(); w = [0.2, -0.4]; b = 0.1; epochs = 0; msg = null; sync(); draw(); }, "btn soft small");
    const diagram = h("div", { class: "neuron-diag" });
    const sM = ui.stat("Mistakes", "–"), sE = ui.stat("Passes through the data", "0");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls" }, gSeg), h("div", { class: "side-by-side" }, plotHost, h("div", null, diagram, h("div", { class: "controls col" }, s1, s2, sb))), h("div", { class: "btn-row", style: { marginTop: "8px" } }, learn, reset), h("div", { class: "readout" }, sM, sE), note);
    plot.onresize = draw;
    const out = (x) => (w[0] * x[0] + w[1] * x[1] + b > 0 ? 1 : 0);
    const mistakes = () => XS.filter((x, i) => out(x) !== GATES[gate][i]).length;
    function sync() { s1.set(+w[0].toFixed(2)); s2.set(+w[1].toFixed(2)); sb.set(+b.toFixed(2)); }
    function stop() { if (timer) clearInterval(timer); timer = null; last = -1; }
    function run() {
      stop();
      msg = null;
      let i = 0, clean = 0;
      timer = setInterval(() => {
        const x = XS[i], y = GATES[gate][i], yhat = out(x);
        last = i;
        if (yhat !== y) {
          const lr = 0.5, d = y - yhat;            // the perceptron rule
          w = [w[0] + lr * d * x[0], w[1] + lr * d * x[1]];
          b += lr * d;
          clean = 0;
        } else clean++;
        i = (i + 1) % 4;
        if (i === 0) epochs++;
        sync();
        draw();
        if (clean >= 4) { stop(); msg = `Learned ${gate} in ${epochs} passes: a full pass with no mistakes.`; draw(); QP.confettiAt(learn, 50); }
        else if (epochs >= 25) { stop(); msg = gate === "XOR" ? "25 passes and still wrong: no single line can separate XOR, so the rule cycles forever." : "Stopped after 25 passes."; draw(); }
      }, QP.reduceMotion ? 20 : 260);
    }
    function draw() {
      plot.clear();
      // shaded side where the neuron says 1
      plot.region((x, y) => (w[0] * x + w[1] * y + b > 0 ? [205, 245, 232, 0.9] : [255, 238, 228, 0.9]), 6, `${w}-${b}-${plot.w}`);
      if (Math.abs(w[1]) > 1e-6) plot.line([-0.6, 1.6], [-0.6, 1.6].map((x) => -(w[0] * x + b) / w[1]), { color: C.ink, width: 3 });
      else if (Math.abs(w[0]) > 1e-6) plot.seg(-b / w[0], -0.6, -b / w[0], 1.6, { color: C.ink, width: 3 });
      XS.forEach((x, i) => {
        const y = GATES[gate][i], ok = out(x) === y;
        plot.point(x[0], x[1], { r: 14, fill: y ? C.ml : C.c0, stroke: i === last ? "#ffd66b" : "#fff", lw: i === last ? 5 : 3 });
        plot.text(String(y), x[0], x[1], { color: "#fff", size: 14, font: "head" });
        if (!ok) plot.text("✗", x[0] + 0.2, x[1] + 0.2, { color: C.bad || "#e5566b", size: 16 });
      });
      const m = mistakes();
      sM.set(String(m), m ? "bad" : "good");
      sE.set(String(epochs));
      diagram.innerHTML = `<div class="nd-row"><span class="nd-in">x₁</span><span class="nd-w">× ${w[0].toFixed(2)}</span></div><div class="nd-row"><span class="nd-in">x₂</span><span class="nd-w">× ${w[1].toFixed(2)}</span></div><div class="nd-sum">Σ + b (${b.toFixed(2)}) → step → output</div>`;
      note.textContent = timer ? `Learning, pass ${epochs + 1}: checking the glowing point. ${m} mistake${m === 1 ? "" : "s"} right now.` : msg || (m ? `${m} of the 4 points are on the wrong side. Drag the sliders, or press Learn.` : `All four correct: this neuron computes ${gate}.`);
    }
    draw();
  }
})();

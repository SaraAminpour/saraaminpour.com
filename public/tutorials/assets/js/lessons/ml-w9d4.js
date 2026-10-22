/* ml-w9d4: memory in one neuron. A plain recurrent neuron h_t = tanh(w h_{t-1} + x_t) next to a gated memory
   cell c_t = f c_{t-1} + x_t (the LSTM's idea), on the same input pulses. Below: how much of step 1 still
   reaches the last step (the gradient that learning needs). */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const T = 30;

  function widget() {
    const card = QP.widget("rnn", "Memory in one neuron", "click the steps to add or remove input pulses");
    if (!card) return;
    let w = 0.9, f = 0.97, noise = false;
    const x = new Array(T).fill(0);
    x[0] = 1;
    const noiseVals = (() => { const r = QP.rng(4); return Array.from({ length: T }, () => 0.3 * r.normal()); })();

    const steps = h("div", { class: "rn-steps", style: { gridTemplateColumns: `repeat(${T}, 1fr)` } });
    const stepEls = x.map((_, t) => {
      const b = h("button", { type: "button", class: "rn-step", title: `step ${t + 1}`, "aria-label": `input at step ${t + 1}` });
      b.addEventListener("click", () => { x[t] = x[t] === 0 ? 1 : x[t] === 1 ? -1 : 0; draw(); });
      steps.append(b);
      return b;
    });
    const chartHost = h("div");
    const chart = QP.chart(chartHost, { xlim: [1, T], ylim: [-1.05, 1.05], xlabel: "step", ylabel: "memory", aspect: 0.36, maxH: 230 });
    const wS = ui.slider({ label: "Plain RNN: memory weight w", min: 0, max: 1.6, step: 0.01, value: w, fmt: (v) => v.toFixed(2), color: C.c0, oninput: (v) => { w = v; draw(); } });
    const fS = ui.slider({ label: "Gated cell: forget gate f", min: 0, max: 1, step: 0.01, value: f, fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { f = v; draw(); } });
    const nT = ui.toggle({ label: "Add small random inputs at every step", onchange: (v) => { noise = v; draw(); } });
    const sR = ui.stat("Plain RNN: step 1's effect on step 30", "–"), sG = ui.stat("Gated cell: step 1's effect on step 30", "–");
    card.body.append(
      h("div", { class: "kbd-hint" }, "Input at each step: click to cycle +1, −1, 0"), steps,
      h("div", { class: "controls" }, wS, fS), h("div", { class: "controls" }, nT),
      chartHost, h("div", { class: "readout" }, sR, sG));

    const fmtTiny = (v) => (v >= 0.01 ? v.toFixed(2) : v < 1e-12 ? "≈ 0" : v.toExponential(1).replace("e-", " × 10<sup>−") + "</sup>");
    function draw() {
      const inp = x.map((v, t) => v + (noise ? noiseVals[t] : 0));
      stepEls.forEach((b, t) => { b.className = "rn-step" + (x[t] > 0 ? " pos" : x[t] < 0 ? " neg" : ""); b.textContent = x[t] > 0 ? "+" : x[t] < 0 ? "−" : ""; });
      const hR = [], hG = [];
      let hr = 0, c = 0, gradR = 1, gradG = 1;
      inp.forEach((v, t) => {
        hr = Math.tanh(w * hr + v);
        c = f * c + v;
        hR.push(hr);
        hG.push(Math.tanh(c));
        if (t > 0) { gradR *= w * (1 - hr * hr); gradG *= f; } // d(state_T) / d(state_1), step by step
      });
      const ts = hR.map((_, t) => t + 1);
      chart.draw([
        { name: "plain RNN", x: ts, y: hR, color: C.c0, points: true, r: 3 },
        { name: "gated cell (tanh of its memory)", x: ts, y: hG, color: C.ml, points: true, r: 3 },
      ]);
      sR.set(fmtTiny(Math.abs(gradR)), Math.abs(gradR) < 1e-3 ? "stat bad" : "stat");
      sG.set(fmtTiny(Math.abs(gradG)), Math.abs(gradG) < 1e-3 ? "stat bad" : "stat good");
    }
    draw();
  }
})();

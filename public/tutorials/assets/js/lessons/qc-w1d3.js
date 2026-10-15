/* qc-w1d3: measurement. A shots machine with a converging estimate, a mystery qubit, and collapse. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => {
    shots();
    collapse();
  });

  function shots() {
    const card = QP.widget("shots", "The shots machine", "every shot = fresh qubit, one measurement");
    if (!card) return;
    const rng = QP.rng((Math.random() * 1e9) | 0);
    let p = 0.3, mystery = false, hidden = 0;
    let ones = 0, n = 0, trace = [], recent = [];
    const pS = ui.slider({ label: "true P(1)", min: 0, max: 1, step: 0.01, value: p, fmt: (v) => v.toFixed(2), oninput: (v) => { p = v; reset(); } });
    const myst = ui.toggle({ label: "Mystery qubit (P(1) hidden)", onchange: (v) => { mystery = v; hidden = Math.round((0.08 + 0.84 * rng()) * 100) / 100; pS.style.opacity = v ? 0.35 : 1; pS.input.disabled = v; reset(); } });
    const fire = (k) => () => {
      const truth = mystery ? hidden : p;
      for (let i = 0; i < k; i++) {
        const b = rng() < truth ? 1 : 0;
        ones += b;
        n++;
        recent.push(b);
        if (n <= 20 || n % Math.max(1, Math.floor(n / 60)) === 0) trace.push([n, ones / n]);
      }
      recent = recent.slice(-48);
      draw();
    };
    const btns = h("div", { class: "btn-row" }, ui.button("1 shot", fire(1), "btn qc small"), ui.button("+10", fire(10), "btn soft small"), ui.button("+100", fire(100), "btn soft small"), ui.button("+1000", fire(1000), "btn soft small"), ui.button("Start over", () => reset(), "btn soft small"));
    const reveal = ui.button("Reveal the mystery value", () => { QP.toast(`The mystery P(1) was ${hidden.toFixed(2)}`, "ui-sparkle"); mystery = false; myst.input.checked = false; pS.set(hidden); p = hidden; pS.style.opacity = 1; pS.input.disabled = false; draw(); }, "btn soft small");
    reveal.hidden = true;
    const tiles = h("div", { class: "bit-tiles" });
    const sN = ui.stat("Shots", "0"), sEst = ui.stat("Estimate of P(1)", "–"), sErr = ui.stat("Typical error ±", "–");
    const chartHost = h("div");
    const chart = QP.chart(chartHost, { xlim: [0, 3.2], ylim: [0, 1], xstep: 1, xfmt: (v) => String(Math.round(10 ** v)), xlabel: "number of shots (log scale)", ylabel: "estimate", aspect: 0.42, maxH: 260 });
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls" }, pS, myst), btns, h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "The last 48 shots"), tiles,
      h("div", { class: "readout" }, sN, sEst, sErr), chartHost, note, h("div", { class: "btn-row" }, reveal));

    function reset() {
      ones = 0; n = 0; trace = []; recent = [];
      draw();
    }
    function draw() {
      tiles.innerHTML = "";
      recent.forEach((b) => tiles.appendChild(h("span", { class: "bit " + (b ? "one" : "zero") }, String(b))));
      const est = n ? ones / n : null;
      const truth = mystery ? hidden : p;
      const err = n ? Math.sqrt(Math.max(est * (1 - est), 1e-9) / n) : null;
      sN.set(String(n));
      sEst.set(est == null ? "–" : est.toFixed(3));
      sErr.set(err == null ? "–" : err.toFixed(3));
      const xs = trace.map((t) => Math.log10(t[0]));
      const series = [];
      if (trace.length) {
        const up = trace.map((t) => Math.min(1, t[1] + 2 * Math.sqrt(Math.max(t[1] * (1 - t[1]), 0.0025) / t[0])));
        const lo = trace.map((t) => Math.max(0, t[1] - 2 * Math.sqrt(Math.max(t[1] * (1 - t[1]), 0.0025) / t[0])));
        series.push({ x: xs, y: up, color: "rgba(123,92,250,.35)", width: 1.5, dash: [4, 4] });
        series.push({ x: xs, y: lo, color: "rgba(123,92,250,.35)", width: 1.5, dash: [4, 4] });
        series.push({ name: "your estimate (dashed: ± 2 typical errors)", x: xs, y: trace.map((t) => t[1]), color: C.qc });
      }
      if (!mystery) series.push({ name: "true P(1)", x: [0, 3.2], y: [truth, truth], color: C.qml, width: 2, dash: [8, 6] });
      chart.draw(series);
      reveal.hidden = !mystery || n < 50;
      note.textContent = !n ? "Fire some shots. Each one is a fresh qubit in the same state, measured once."
        : n < 30 ? "With only a few shots the estimate jumps around a lot."
        : mystery ? `Your estimate: ${est.toFixed(2)} ± ${(2 * err).toFixed(2)} (95% of the time the truth is inside ± 2 typical errors). Reveal when you're confident.`
        : `After ${n} shots the estimate is within ${Math.abs(est - truth).toFixed(3)} of the truth. The typical error shrinks like 1/√N: 100 times more shots, 10 times smaller error.`;
    }
    draw();
  }

  function collapse() {
    const card = QP.widget("collapse", "Measure the same qubit twice", "the state |+⟩: a 50/50 qubit");
    if (!card) return;
    const rng = QP.rng((Math.random() * 1e9) | 0);
    let first = null, second = null;
    const coin = (lab) => {
      const face = h("div", { class: "coin-face" }, "?");
      const el = h("div", { class: "coin-box" }, h("div", { class: "kbd-hint" }, lab), face);
      el.face = face;
      return el;
    };
    const c1 = coin("first measurement"), c2 = coin("second measurement");
    const state = h("div", { class: "clab-ket" });
    const m1 = ui.button("Measure", () => { first = rng() < 0.5 ? 0 : 1; second = null; flip(c1, first); draw(); }, "btn qc small");
    const m2 = ui.button("Measure again", () => { if (first == null) return; second = first; flip(c2, second); draw(); }, "btn soft small");
    const fresh = ui.button("Fresh |+⟩ qubit", () => { first = second = null; c1.face.textContent = "?"; c2.face.textContent = "?"; draw(); }, "btn soft small");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, marginTop: "8px", minHeight: "2.4em" } });
    card.body.append(h("div", { class: "coin-row" }, c1, h("div", { class: "coin-arrow" }, "→"), c2), state, h("div", { class: "btn-row", style: { marginTop: "10px" } }, m1, m2, fresh), note);
    function flip(box, v) {
      box.face.textContent = String(v);
      box.face.animate([{ transform: "rotateY(0deg) scale(.8)" }, { transform: "rotateY(360deg) scale(1.1)" }, { transform: "scale(1)" }], { duration: 550, easing: "cubic-bezier(.34,1.56,.64,1)" });
    }
    function draw() {
      state.innerHTML = `<span class="muted">State now:</span> ${first == null ? "0.71|0⟩ + 0.71|1⟩ = |+⟩" : `|${first}⟩`}`;
      m2.disabled = first == null;
      note.textContent = first == null ? "Before the first measurement, the outcome is a fair coin flip."
        : second == null ? `You got ${first}. The qubit is now |${first}⟩: the 50/50 superposition is gone. Predict the second measurement.`
        : `Same answer again, every time. After a measurement the qubit stays in the state you saw. To estimate probabilities you need fresh qubits, one per shot.`;
    }
    draw();
  }
})();

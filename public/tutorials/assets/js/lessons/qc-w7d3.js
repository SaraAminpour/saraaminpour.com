/* qc-w7d3: the parameter-shift rule. A cost slice C(θ) (a sine wave), the two shifted evaluations at θ ± π/2, and
   the tangent they give. Then the noise race: 300 gradient estimates from shots, parameter shift against
   finite differences with a small step h. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  // a cost slice: ⟨Z⟩ of RX(0.9) RY(θ) |0⟩ shifted and scaled into a generic sine
  const A = 0.8, B = 0.45, OFF = -0.1;
  const cost = (t) => A * Math.cos(t) + B * Math.sin(t) + OFF;
  const slope = (t) => -A * Math.sin(t) + B * Math.cos(t);

  function widget() {
    const card = QP.widget("pshift", "Two shifted runs, one exact slope", "the parameter-shift rule");
    if (!card) return;
    let theta = 0.6, shots = 1000, hstep = 0.05, race = null, seed = 1;
    const plot = new QP.Plot(card.body, { xlim: [-PI, PI], ylim: [-1.2, 1.2], aspect: 0.42, minH: 180, maxH: 300, ticks: true, xlabel: "θ", ylabel: "cost C(θ)", xstep: PI / 2, xfmt: (v) => ["−π", "−π/2", "0", "π/2", "π"][Math.round(v / (PI / 2)) + 2] || "" });
    const tS = ui.slider({ label: "θ", min: -PI, max: PI, step: 0.01, value: theta, fmt: (v) => v.toFixed(2), color: C.qc, oninput: (v) => { theta = v; race = null; draw(); } });
    const sT = ui.stat("true slope", "–"), sP = ui.stat("parameter shift", "–", "good");
    const shotSeg = ui.seg({ label: "Shots per evaluation", options: [{ value: 100, label: "100" }, { value: 1000, label: "1,000" }, { value: 10000, label: "10,000" }], value: shots, onchange: (v) => { shots = +v; race = null; draw(); } });
    const hS = ui.slider({ label: "finite-difference step h", min: -3, max: 0, step: 0.05, value: Math.log10(hstep), fmt: (v) => Math.pow(10, v).toFixed(v < -1.5 ? 3 : 2), color: "#ff8a50", oninput: (v) => { hstep = Math.pow(10, v); race = null; draw(); } });
    const raceB = ui.button("Estimate the slope 300 times", () => { seed++; runRace(); }, "btn ml small");
    const histHost = h("div");
    const hist = new QP.Plot(histHost, { xlim: [-1, 1], ylim: [0, 1], aspect: 0.32, minH: 120, maxH: 170, ticks: true, xlabel: "estimated slope", ylabel: "count", grid: false });
    const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.qc } }), "parameter shift"), h("span", null, h("i", { style: { background: "#ff8a50" } }), "finite difference"), h("span", null, h("i", { style: { background: C.ml } }), "true slope"));
    const sSP = ui.stat("spread: parameter shift", "–"), sSF = ui.stat("spread: finite difference", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls" }, tS), h("div", { class: "readout" }, sT, sP), h("hr", { class: "soft" }), h("div", { class: "controls col" }, shotSeg, hS), h("div", { class: "btn-row" }, raceB), histHost, legend, h("div", { class: "readout" }, sSP, sSF), note);
    plot.onresize = draw;
    hist.onresize = drawHist;

    // one shot-noisy estimate of the cost: a ±1 observable measured `shots` times
    const est = (t, r) => { const c = cost(t); return c + r.normal() * Math.sqrt(Math.max(1e-9, 1 - c * c) / shots); };
    function runRace() {
      const r = QP.rng(seed * 104729);
      const ps = [], fd = [];
      for (let k = 0; k < 300; k++) {
        ps.push((est(theta + PI / 2, r) - est(theta - PI / 2, r)) / 2);
        fd.push((est(theta + hstep, r) - est(theta - hstep, r)) / (2 * hstep));
      }
      race = { ps, fd };
      draw();
    }
    function draw() {
      plot.clear();
      const xs = Array.from({ length: 181 }, (_, i) => -PI + (i * 2 * PI) / 180);
      plot.line(xs, xs.map(cost), { color: "#b9a7ff", width: 4 });
      const tp = theta + PI / 2, tm = theta - PI / 2;
      const wrap = (t) => Math.atan2(Math.sin(t), Math.cos(t));
      const ps = (cost(tp) - cost(tm)) / 2;
      // the two shifted evaluations
      for (const t of [tp, tm]) {
        plot.seg(wrap(t), -1.2, wrap(t), cost(t), { color: "#ff8a50", width: 1.5, dash: [4, 4] });
        plot.point(wrap(t), cost(t), { r: 7, fill: "#ff8a50", stroke: "#fff", lw: 2 });
      }
      // the tangent at θ with the parameter-shift slope
      plot.line([theta - 0.9, theta + 0.9], [cost(theta) - 0.9 * ps, cost(theta) + 0.9 * ps], { color: "#ff76a8", width: 3 });
      plot.point(theta, cost(theta), { r: 8, fill: C.qc, stroke: "#fff", lw: 2.5 });
      sT.set(slope(theta).toFixed(4));
      sP.set(ps.toFixed(4), "good");
      drawHist();
    }
    function drawHist() {
      const truth = slope(theta);
      if (!race) {
        hist.o.xlim = [truth - 1, truth + 1];
        hist.o.ylim = [0, 1];
        hist.clear();
        hist.text("Press the button to run the race", truth, 0.5, { color: C.ink3, size: 12 });
        sSP.set("–"); sSF.set("–");
        note.textContent = "Every evaluation on hardware comes from shots, so every slope estimate is noisy. Which method copes better?";
        return;
      }
      const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
      const sdP = sd(race.ps), sdF = sd(race.fd);
      const span = Math.max(4 * sdP, Math.min(8, 4 * sdF), 0.05);
      hist.o.xlim = [truth - span, truth + span];
      const bins = 40, w = (2 * span) / bins;
      const count = (a) => { const c = Array(bins).fill(0); a.forEach((v) => { const b = Math.floor((v - (truth - span)) / w); if (b >= 0 && b < bins) c[b]++; }); return c; };
      const cP = count(race.ps), cF = count(race.fd), top = Math.max(...cP, ...cF, 1);
      hist.o.ylim = [0, top * 1.1];
      hist.clear(); // after setting the limits, so the ticks match
      cF.forEach((v, b) => hist.rect(truth - span + b * w, 0, truth - span + (b + 0.9) * w, v, { fill: "rgba(255,138,80,0.55)" }));
      cP.forEach((v, b) => hist.rect(truth - span + b * w, 0, truth - span + (b + 0.9) * w, v, { fill: "rgba(123,92,250,0.7)" }));
      hist.seg(truth, 0, truth, top * 1.1, { color: C.ml, width: 2.5 });
      sSP.set(sdP.toFixed(3), "good");
      sSF.set(sdF.toFixed(3), sdF > 3 * sdP ? "bad" : "");
      note.textContent = sdF > 3 * sdP
        ? `With h = ${hstep.toPrecision(2)}, the finite difference divides the shot noise by a tiny 2h: its estimates scatter ${(sdF / sdP).toFixed(0)} times wider. The parameter shift's big shift keeps the noise small, and it has no bias at all.`
        : `With a large h the finite difference is less noisy, but now it's biased: it measures the slope of a chord, not the tangent. The parameter shift is both exact and calm.`;
    }
    draw();
  }
})();

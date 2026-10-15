/* qml-w1d5: the swap test. Two one-qubit states on one Bloch sphere; the ancilla reads 0 with probability
   (1 + F)/2. Estimate F from shots with the swap test and with the inversion (compute–uncompute) test, and
   compare how much each estimate wobbles. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("swaptest", "Measure an overlap", "the swap test");
    if (!card) return;
    let tA = 0, pA = 0, tB = 90, pB = 0, shots = 1000, race = null, seed = 1;
    const vec = (t, p) => [Math.sin(t * DEG) * Math.cos(p * DEG), Math.sin(t * DEG) * Math.sin(p * DEG), Math.cos(t * DEG)];
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.95, maxH: 300, labels: "kets" });
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px" } });
    const circ = QP.circuit(circHost, { n: 3, gates: [], minCols: 4, scale: 1, cell: 52, wireLabels: ["anc", "ψ", "φ"] });
    circ.render([{ name: "H", q: 0, col: 0 }, { name: "CSWAP", c: 0, q: 1, q2: 2, col: 1 }, { name: "H", q: 0, col: 2 }, { name: "M", q: 0, col: 3 }]);
    const sl = (label, v, max, color, set) => ui.slider({ label, min: 0, max, step: 1, value: v, fmt: (x) => x + "°", color, oninput: (x) => { set(x); race = null; draw(); } });
    const controls = h("div", { class: "controls col" }, sl("ψ: θ", tA, 180, "#ff8a50", (x) => (tA = x)), sl("ψ: φ", pA, 359, "#ff8a50", (x) => (pA = x)), sl("φ: θ", tB, 180, "#5577f5", (x) => (tB = x)), sl("φ: φ", pB, 359, "#5577f5", (x) => (pB = x)));
    const sF = ui.stat("fidelity F = |⟨ψ|φ⟩|²", "–"), sP = ui.stat("P(ancilla reads 0)", "–");
    right.append(h("div", { class: "kbd-hint" }, "The swap test"), circHost, controls, h("div", { class: "readout" }, sF, sP));
    const shotSeg = ui.seg({ label: "Shots per estimate", options: [{ value: 100, label: "100" }, { value: 1000, label: "1,000" }, { value: 10000, label: "10,000" }], value: shots, onchange: (v) => { shots = +v; race = null; draw(); } });
    const raceB = ui.button("Estimate F 300 times with each test", () => { seed++; runRace(); }, "btn ml small");
    const histHost = h("div");
    const hist = new QP.Plot(histHost, { xlim: [0, 1], ylim: [0, 1], aspect: 0.3, minH: 110, maxH: 160, ticks: true, xlabel: "estimated F", grid: false });
    const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "#7b5cfa" } }), "swap test"), h("span", null, h("i", { style: { background: "#17a98c" } }), "inversion test"), h("span", null, h("i", { style: { background: C.ink } }), "true F"));
    const sS = ui.stat("spread: swap test", "–"), sI = ui.stat("spread: inversion test", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("hr", { class: "soft" }), h("div", { class: "controls" }, shotSeg), h("div", { class: "btn-row" }, raceB), histHost, legend, h("div", { class: "readout" }, sS, sI), note);
    hist.onresize = drawHist;

    const F = () => { const a = vec(tA, pA), b = vec(tB, pB); return (1 + a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / 2; };
    const binom = (n, p, r) => { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; };
    function runRace() {
      const f = F(), r = QP.rng(seed * 7919);
      const sw = [], inv = [];
      for (let k = 0; k < 300; k++) {
        sw.push((2 * binom(shots, (1 + f) / 2, r)) / shots - 1);   // F = 2 P(0) − 1
        inv.push(binom(shots, f, r) / shots);                       // F = P(00…0)
      }
      race = { sw, inv };
      draw();
    }
    function draw() {
      const a = vec(tA, pA), b = vec(tB, pB);
      bloch.vectors = [{ v: a, color: "#ff8a50", label: "ψ" }, { v: b, color: "#5577f5", label: "φ" }];
      bloch.draw();
      const f = F();
      sF.set(f.toFixed(3));
      sP.set(((1 + f) / 2).toFixed(3));
      drawHist();
    }
    function drawHist() {
      const f = F();
      const sd = (x) => { const m = x.reduce((s, v) => s + v, 0) / x.length; return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / x.length); };
      if (!race) {
        hist.o.xlim = [0, 1]; hist.o.ylim = [0, 1];
        hist.clear();
        hist.seg(f, 0, f, 1, { color: C.ink, width: 2 });
        sS.set("–"); sI.set("–");
        note.textContent = "The ancilla reads 0 with probability (1 + F)/2: identical states always give 0, orthogonal ones give 0 half the time.";
        return;
      }
      const span = Math.max(0.05, 4 * sd(race.sw));
      const lo = f - span, hi = f + span;
      const bins = 36, w = (hi - lo) / bins;
      const count = (x) => { const c = Array(bins).fill(0); x.forEach((v) => { const k = Math.floor((v - lo) / w); if (k >= 0 && k < bins) c[k]++; }); return c; };
      const cS = count(race.sw), cI = count(race.inv), top = Math.max(...cS, ...cI, 1);
      hist.o.xlim = [lo, hi]; hist.o.ylim = [0, top * 1.1];
      hist.clear();
      cS.forEach((v, k) => hist.rect(lo + k * w, 0, lo + (k + 0.9) * w, v, { fill: "rgba(123,92,250,0.55)" }));
      cI.forEach((v, k) => hist.rect(lo + k * w, 0, lo + (k + 0.9) * w, v, { fill: "rgba(23,169,140,0.6)" }));
      hist.seg(f, 0, f, top * 1.1, { color: C.ink, width: 2 });
      const s1 = sd(race.sw), s2 = sd(race.inv);
      sS.set(s1.toFixed(4));
      sI.set(s2.toFixed(4), s2 < s1 ? "good" : "");
      note.textContent = `The swap test estimates F = 2·P(0) − 1, which magnifies the shot noise; the inversion test reads F directly as P(00…0). Here its spread is ${(s1 / Math.max(s2, 1e-9)).toFixed(1)} times smaller. But the swap test works for any two states you're handed; the inversion test needs the circuits that made them.`;
    }
    draw();
  }
})();

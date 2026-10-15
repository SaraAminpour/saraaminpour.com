/* qml-w2d4: exponential concentration. Histograms of the off-diagonal kernel values (log scale) of 30 random
   points, for 2 to 12 qubits, two feature maps and six bandwidths (data from tools/data_qml_w2d4.py), next to
   2⁻ⁿ and to what 1,000 shots can resolve. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("concentrate", "Watch the kernel values collapse", "2 to 12 qubits");
    if (!card) return;
    fetch(QP.asset("data/qml-w2d4-concentration.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the data. Try reloading the page.")));

    function build(D) {
      let map = "zz", n = 8, s = D.ss[D.ss.length - 1], shots = 1000;
      const mSeg = ui.seg({ label: "Feature map", options: [{ value: "zz", label: "ZZ (2 layers)" }, { value: "angle", label: "angle" }], value: map, onchange: (v) => { map = v; draw(); } });
      const nSeg = ui.seg({ label: "Qubits", options: D.ns.map((k) => ({ value: k, label: String(k) })), value: n, onchange: (v) => { n = +v; draw(); } });
      const sSeg = ui.seg({ label: "Bandwidth s", options: D.ss.map((k) => ({ value: k, label: k > 3 ? "π" : String(k) })), value: s, onchange: (v) => { s = +v; draw(); } });
      const plot = new QP.Plot(card.body, { xlim: [-8, 0], ylim: [0, 1], aspect: 0.4, minH: 170, maxH: 260, ticks: true, grid: false, xstep: 1, xfmt: (v) => (v === 0 ? "1" : "10" + String(v).replace("-", "⁻").replace(/[0-9]/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d])), xlabel: "kernel value k(x, x′) of two different points (log scale)", ylabel: "count" });
      const sM = ui.stat("average value", "–"), sS = ui.stat("spread", "–"), sB = ui.stat("pairs a 1,000-shot estimate can't tell from 0", "–");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3em", marginTop: "6px" } });
      card.body.prepend(h("div", { class: "controls col" }, mSeg, nSeg, sSeg));
      card.body.append(h("div", { class: "readout" }, sM, sS, sB), note);
      plot.onresize = draw;
      function draw() {
        const d = D[map][`${n}_${s}`];
        const E = D.edges, w = E[1] - E[0];
        const top = Math.max(...d.counts, 1);
        plot.o.ylim = [0, top * 1.15];
        plot.clear();
        d.counts.forEach((c, i) => plot.rect(E[i] + 0.02, 0, E[i] + w - 0.02, c, { fill: map === "zz" ? "#9b82ff" : "#7fe0c4" }));
        const ln = Math.log10(Math.pow(2, -n)), floor = Math.log10(1 / shots);
        plot.seg(ln, 0, ln, top * 1.15, { color: C.qml, width: 2.5, dash: [6, 4] });
        plot.text(`2⁻ⁿ`, ln + 0.08, top * 1.05, { color: C.qml, size: 12, align: "left" });
        plot.rect(-8, 0, floor, top * 1.15, { fill: "rgba(229,86,107,0.08)" });
        plot.text("below 1/1,000: usually zero counts", -7.9, top * 0.95, { color: "#e5566b", size: 11, align: "left" });
        const below = d.counts.reduce((acc, c, i) => acc + (E[i] + w <= floor ? c : 0), 0) / 435;
        sM.set(d.mean.toPrecision(2));
        sS.set(d.std.toPrecision(2));
        sB.set(`${Math.round(below * 100)}<small>%</small>`, below > 0.5 ? "bad" : below > 0.1 ? "" : "good");
        note.textContent = below > 0.5
          ? `Concentrated: most pairs of different points have kernel values near 2⁻ⁿ, too small for 1,000 shots to see. The measured matrix is just the identity plus noise, and the SVM can only memorize. You'd need about 2ⁿ shots per entry, more for every qubit.`
          : d.std < 0.01 && d.mean > 0.5
            ? "Everything looks alike: with this small bandwidth all values sit near 1 with almost no spread. Too little contrast to learn from, the opposite failure."
            : "Healthy: the values spread over a range that shots can measure, so the matrix carries information about which points are alike.";
      }
      draw();
    }
  }
})();

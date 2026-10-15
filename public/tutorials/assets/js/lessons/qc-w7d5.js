/* qc-w7d5: barren plateaus. How big a typical slope is, against the number of qubits (log scale), next to the
   wobble of a shot-noise estimate; and what the cost slices look like as the circuit grows. Data from
   tools/data_qc_w7d5.py, the notebook's own circuits. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("plateau", "Watch the landscape go flat", "slopes shrink as qubits grow");
    if (!card) return;
    fetch(QP.asset("data/qc-w7d5-plateau.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the data. Try reloading the page.")));

    function build(D) {
      let n = 6, cost = "global", shots = 1000;
      const left = h("div"), right = h("div");
      card.body.append(h("div", { class: "side-by-side even" }, left, right));
      left.append(h("div", { class: "kbd-hint" }, "Typical slope size (log scale)"));
      const fmtLog = (v) => ({ 0: "1", "-1": "0.1", "-2": "0.01", "-3": "0.001", "-4": "0.0001" })[String(Math.round(v))] || "";
      const chart = QP.chart(left, { xlim: [1.5, 10.5], ylim: [-4, 0], aspect: 0.8, minH: 200, maxH: 300, xstep: 2, ystep: 1, yfmt: fmtLog, xlabel: "qubits n", ylabel: "slope" });
      right.append(h("div", { class: "kbd-hint" }, "Five random slices along one knob"));
      const slices = QP.chart(right, { xlim: [-Math.PI, Math.PI], ylim: [0, 1.02], aspect: 0.8, minH: 200, maxH: 300, xstep: Math.PI / 2, xfmt: (v) => ["−π", "−π/2", "0", "π/2", "π"][Math.round(v / (Math.PI / 2)) + 2] || "", ystep: 0.25, yfmt: (v) => v.toFixed(2), xlabel: "θ₀", ylabel: "cost" });
      const nSeg = ui.seg({ label: "Qubits", options: D.ns.map((k) => ({ value: k, label: String(k) })), value: n, onchange: (v) => { n = +v; draw(); } });
      const cSeg = ui.seg({ label: "Cost", options: [{ value: "global", label: "global, deep circuit" }, { value: "local", label: "local, shallow circuit" }], value: cost, onchange: (v) => { cost = v; draw(); } });
      const sSeg = ui.seg({ label: "Shots per estimate", options: [{ value: 100, label: "100" }, { value: 1000, label: "1,000" }, { value: 100000, label: "100,000" }], value: shots, onchange: (v) => { shots = +v; draw(); } });
      const sS = ui.stat("typical slope here", "–"), sW = ui.stat("shot-noise wobble", "–");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
      card.body.append(h("div", { class: "controls col" }, nSeg, cSeg, sSeg), h("div", { class: "readout" }, sS, sW), note);
      chart.onresize = draw;
      slices.onresize = draw;
      const COL = ["#7b5cfa", "#ff8a50", "#17a98c", "#e45fa3", "#5577f5"];
      function draw() {
        const wobble = 1 / (2 * Math.sqrt(shots));
        chart.marker = n;
        chart.draw([
          { name: "global cost, deep circuit", x: D.ns, y: D.spread.global.map(Math.log10), color: "#ff8a50", points: true, r: 5, width: 2.5 },
          { name: "local cost, shallow circuit", x: D.ns, y: D.spread.local.map(Math.log10), color: C.qc, points: true, r: 5, width: 2.5 },
        ]);
        chart.seg(1.5, Math.log10(wobble), 10.5, Math.log10(wobble), { color: C.ink3, width: 2, dash: [6, 5] });
        chart.text(`wobble of ${shots.toLocaleString("en-US")} shots`, 10.3, Math.log10(wobble) + 0.18, { color: C.ink3, size: 11, align: "right" });
        const curves = D.slices[cost][String(n)];
        slices.draw(curves.map((ys, i) => ({ x: D.xs, y: ys, color: COL[i], width: 2.2 })));
        const s = D.spread[cost][D.ns.indexOf(n)];
        const ratio = s / wobble, blind = ratio < 0.8, borderline = ratio >= 0.8 && ratio <= 1.25;
        sS.set(s.toFixed(4), blind ? "bad" : borderline ? "" : "good");
        sW.set(wobble.toFixed(4));
        note.textContent = borderline
          ? `Borderline: typical slopes (${s.toFixed(4)}) are about as big as the shot noise (${wobble.toFixed(4)}), so many steps go the wrong way. One more qubit and the noise wins.`
          : blind
          ? `Blind: a typical slope (${s.toFixed(4)}) is smaller than the wobble of a ${shots.toLocaleString("en-US")}-shot estimate. To tell uphill from downhill you'd need about ${Math.round(1 / (4 * s * s)).toLocaleString("en-US")} shots per estimate, and the number grows exponentially with the qubits.`
          : `Visible: typical slopes (${s.toFixed(4)}) stand out above the shot noise, so gradient descent can find its way.` + (cost === "global" ? " Add qubits and watch it change." : "");
      }
      draw();
    }
  }
})();

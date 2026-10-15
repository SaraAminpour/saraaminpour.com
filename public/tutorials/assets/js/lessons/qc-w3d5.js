/* qc-w3d5: state tomography. Measure a mystery qubit in X, Y and Z, rebuild its arrow, then reveal it. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("tomo", "Rebuild the mystery qubit", "three meters, one hidden arrow");
    if (!card) return;
    const rng = QP.rng((Math.random() * 1e9) | 0);
    let truth, counts, revealed;
    const bHost = h("div");
    const bloch = new QP.Bloch(bHost, { aspect: 0.95, maxH: 330, labels: "xyz" });
    const KEYS = ["X", "Y", "Z"];
    const shoot = (n) => () => {
      KEYS.forEach((k, i) => {
        const p = (1 + truth[i]) / 2;
        for (let s = 0; s < n; s++) counts[k][rng() < p ? 0 : 1]++;
      });
      draw();
    };
    const btns = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Shots in each basis"), ui.button("+30", shoot(30), "btn qc small"), ui.button("+300", shoot(300), "btn soft small"), ui.button("+3000", shoot(3000), "btn soft small"));
    const est = h("div", { class: "clab-ket", style: { whiteSpace: "normal" } });
    const sF = ui.stat("Fidelity with the truth", "?");
    const reveal = ui.button("Reveal the mystery state", () => { revealed = true; draw(); }, "btn soft small");
    const fresh = ui.button("New mystery qubit", () => reset(), "btn soft small");
    card.body.append(h("div", { class: "side-by-side" }, bHost, h("div", null, btns, h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "Your estimate: coordinate = 2·P(first outcome) − 1"), est, h("div", { class: "readout" }, sF), h("div", { class: "btn-row", style: { marginTop: "8px" } }, reveal, fresh))));

    function reset() {
      const th = Math.acos(1 - 2 * rng()), ph = 2 * Math.PI * rng();
      truth = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
      counts = { X: [0, 0], Y: [0, 0], Z: [0, 0] };
      revealed = false;
      draw();
    }
    function draw() {
      const n = counts.X[0] + counts.X[1];
      const v = KEYS.map((k) => (n ? (2 * counts[k][0]) / n - 1 : 0));
      const len = Math.hypot(...v);
      const unit = len > 1 ? v.map((x) => x / len) : v;
      bloch.vectors = [];
      if (n) bloch.vectors.push({ v: unit, color: "#7b5cfa" });
      if (revealed) bloch.vectors.push({ v: truth, color: "#ff6fa3" });
      bloch.draw();
      if (!n) est.textContent = "No shots yet: fire some at all three meters.";
      else {
        const se = (c) => 2 * Math.sqrt(Math.max(c, 0.25 / n) * (1 - Math.min(c, 1 - 0.25 / n)) / n);
        est.innerHTML = KEYS.map((k, i) => `${k.toLowerCase()} = ${v[i].toFixed(2)} ± ${se(counts[k][0] / n).toFixed(2)}`).join(" &nbsp;·&nbsp; ") + `<br><span class="muted">arrow length ${len.toFixed(2)}${len > 1 ? " (shot noise made it too long: we shrink it to 1)" : ""}</span>`;
      }
      if (revealed && n) {
        const dot = unit[0] * truth[0] + unit[1] * truth[1] + unit[2] * truth[2];
        const f = (1 + dot) / 2;
        sF.set(`${(f * 100).toFixed(1)}<small>%</small>`, f > 0.99 ? "good" : f < 0.9 ? "bad" : "");
      } else sF.set(revealed ? "fire some shots" : "?");
    }
    reset();
  }
})();

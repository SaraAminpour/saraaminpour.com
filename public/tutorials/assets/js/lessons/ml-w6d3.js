/* ml-w6d3: PCA by hand on a 2D cloud, and PCA of the 8 x 8 digits: rebuild a digit from k components. */
(function () {
  const { h, ui } = QP;
  const DIGIT_COLORS = ["#5577f5", "#ff8a50", "#17a98c", "#e5566b", "#7b5cfa", "#8d6e63", "#e45fa3", "#8a85a3", "#c4b52b", "#22b8cf"];
  QP.onReady(() => {
    pca();
    pcaDigits();
  });

  function pca() {
    const card = QP.widget("pca", "Find the best direction", "drag the pink handle");
    if (!card) return;
    const C = QP.colors;
    const r = QP.rng(8);
    // correlated cloud: x = a, y = 0.75 a + noise
    const pts = Array.from({ length: 160 }, () => {
      const a = 1.15 * r.normal(), b = 0.38 * r.normal();
      return { x: a * 0.8 - b * 0.6, y: a * 0.6 + b * 0.8 };
    });
    const res = QP.ml.pca2(pts);
    const best = Math.atan2(res.axes[0][1], res.axes[0][0]);
    const total = res.vars[0] + res.vars[1];
    let ang = 0.15;
    const plot = new QP.Plot(card.body, { xlim: [-3.2, 3.2], ylim: [-2.6, 2.6], aspect: 0.62, equal: true, minH: 260, maxH: 420 });
    plot.c.classList.add("grab");
    const meterFill = h("div", { style: { height: "100%", width: "0%", borderRadius: "999px", background: "linear-gradient(90deg,#7fe0c4,#7b5cfa)", transition: "width .2s" } });
    const meterTxt = h("div", { class: "small", style: { fontWeight: 800, color: C.ink2, marginTop: "4px" } });
    const findB = ui.button("Let PCA find it", () => {
      const from = ang;
      let d = best - from;
      d = Math.atan2(Math.sin(2 * d), Math.cos(2 * d)) / 2; // directions are lines: modulo 180°
      QP.animate(800, (e) => { ang = from + d * e; draw(); }, () => QP.toast("That's PC1: the direction of largest variance", "ui-star"));
    }, "btn ml small");
    const pc2T = ui.toggle({ label: "show PC2 too", checked: false, onchange: () => draw() });
    card.body.append(h("div", { style: { marginTop: "12px" } }, h("div", { class: "kbd-hint" }, "Spread kept along this direction"), h("div", { style: { height: "14px", borderRadius: "999px", background: "rgba(123,92,250,.1)", margin: "6px 0 2px", overflow: "hidden" } }, meterFill), meterTxt), h("div", { class: "controls" }, findB, pc2T));
    function draw() {
      const u = [Math.cos(ang), Math.sin(ang)];
      const m = res.mean;
      plot.clear();
      const L = 6;
      plot.line([m.x - u[0] * L, m.x + u[0] * L], [m.y - u[1] * L, m.y + u[1] * L], { color: C.pink, width: 3 });
      let s = 0;
      for (const p of pts) {
        const t = (p.x - m.x) * u[0] + (p.y - m.y) * u[1];
        s += t * t;
        const qx = m.x + t * u[0], qy = m.y + t * u[1];
        plot.seg(p.x, p.y, qx, qy, { color: "rgba(140,133,163,.35)", width: 1 });
        plot.point(p.x, p.y, { r: 3.8, fill: "#b9a7ff", stroke: "#fff", lw: 1 });
        plot.point(qx, qy, { r: 2.6, fill: C.pink, stroke: null });
      }
      if (pc2T.input.checked) {
        const v = res.axes[1];
        plot.arrow(m.x, m.y, m.x + v[0] * 2 * Math.sqrt(res.vars[1]), m.y + v[1] * 2 * Math.sqrt(res.vars[1]), { color: C.ml, width: 3 });
        const w = res.axes[0];
        plot.arrow(m.x, m.y, m.x + w[0] * 2 * Math.sqrt(res.vars[0]), m.y + w[1] * 2 * Math.sqrt(res.vars[0]), { color: C.qc, width: 3 });
      }
      const hx = m.x + u[0] * 2.4, hy = m.y + u[1] * 2.4;
      plot.point(hx, hy, { r: 10, fill: "#fff", stroke: C.pink, lw: 3.5 });
      const kept = s / pts.length / total;
      meterFill.style.width = (kept * 100).toFixed(1) + "%";
      meterTxt.textContent = `${(kept * 100).toFixed(1)}% of the total variance kept (the best possible is ${((res.vars[0] / total) * 100).toFixed(1)}%). The other ${(100 - kept * 100).toFixed(1)}% is lost: the grey lines' squared lengths.`;
    }
    let dragging = false;
    plot.on({
      down: () => (dragging = true),
      drag: (p) => { if (dragging) { ang = Math.atan2(p.y - res.mean.y, p.x - res.mean.x); draw(); } },
      up: () => (dragging = false),
    });
    plot.onresize = draw;
    draw();
  }

  function pcaDigits() {
    const card = QP.widget("pcadigits", "Rebuild a digit from k components", "64 pixels, a few numbers");
    if (!card) return;
    const C = QP.colors;
    fetch(QP.asset("data/ml-w6d3-pca.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the data. Try reloading the page.")));

    function build(D) {
      let k = 5, idx = 0;
      const cum = [];
      D.ratio.reduce((a, v, i) => (cum[i] = a + v), 0);
      const grid = (cls) => { const g = h("div", { class: "pd-img " + (cls || "") }); for (let i = 0; i < 64; i++) g.appendChild(h("span")); return g; };
      const orig = grid(), rec = grid(), meanImg = grid("small");
      const comps = Array.from({ length: 6 }, () => grid("small"));
      const coefEls = comps.map(() => h("div", { class: "pd-coef" }));
      const kS = ui.slider({ label: "components k", min: 0, max: 64, step: 1, value: k, fmt: (v) => String(v), color: C.ml, oninput: (v) => { k = v; draw(); } });
      const nextB = ui.button("Another digit", () => { idx = (idx + 1) % D.samples.length; draw(); }, "btn soft small");
      const chartHost = h("div");
      const chart = QP.chart(chartHost, { xlim: [0, 64], ylim: [0, 1], aspect: 0.42, minH: 150, maxH: 210, xstep: 8, ystep: 0.25, xlabel: "components kept", ylabel: "variance kept", yfmt: (v) => `${Math.round(v * 100)}%` });
      const sV = ui.stat("variance kept (all digits)", "–"), sE = ui.stat("numbers stored per digit", "–");
      card.body.append(
        h("div", { class: "pd-row" },
          h("div", null, h("div", { class: "kbd-hint" }, "Original"), orig),
          h("div", { class: "pd-arrow" }, "→"),
          h("div", null, h("div", { class: "kbd-hint" }, "Rebuilt from k numbers"), rec),
          h("div", { class: "pd-recipe" }, h("div", { class: "kbd-hint" }, "The recipe: the mean digit, plus a little of each component"),
            h("div", { class: "pd-strip" }, h("div", null, meanImg, h("div", { class: "pd-coef" }, "mean")), ...comps.map((c, j) => h("div", null, c, coefEls[j]))))),
        h("div", { class: "controls" }, kS, nextB), h("div", { class: "readout" }, sV, sE), chartHost);
      chart.onresize = draw;
      const paint = (g, v, signed) => g.childNodes.forEach((c, i) => {
        const x = v[i];
        c.style.background = signed ? (x >= 0 ? `rgba(85,119,245,${Math.min(1, Math.abs(x) * 4)})` : `rgba(255,138,80,${Math.min(1, Math.abs(x) * 4)})`) : `rgba(84,39,143,${Math.max(0, Math.min(1, x))})`;
      });
      paint(meanImg, D.mean, false);
      comps.forEach((g, j) => paint(g, D.components[j], true));
      function draw() {
        const [x, label] = D.samples[idx];
        const centered = x.map((v, i) => v - D.mean[i]);
        const z = D.components.map((u) => u.reduce((s, ui_, i) => s + ui_ * centered[i], 0));
        const r = D.mean.slice();
        for (let j = 0; j < k; j++) for (let i = 0; i < 64; i++) r[i] += z[j] * D.components[j][i];
        paint(orig, x, false);
        paint(rec, r, false);
        coefEls.forEach((el, j) => { el.textContent = j < k ? `${z[j] >= 0 ? "+" : "−"}${Math.abs(z[j]).toFixed(1)}` : "·"; el.classList.toggle("off", j >= k); });
        comps.forEach((g, j) => g.classList.toggle("off", j >= k));
        sV.set(k ? `${(cum[k - 1] * 100).toFixed(1)}<small>%</small>` : "0<small>%</small>", k && cum[k - 1] >= 0.9 ? "good" : "");
        sE.set(`${k} <small>instead of 64</small>`);
        chart.marker = k;
        chart.draw([{ x: [0, ...cum.map((_, i) => i + 1)], y: [0, ...cum], color: C.qc, width: 2.5 }]);
        chart.point(k, k ? cum[k - 1] : 0, { r: 7, fill: C.c0, stroke: "#fff", lw: 2 });
        chart.seg(0, 0.9, 64, 0.9, { color: C.ml, width: 1.5, dash: [5, 5] });
        chart.text("90%", 60, 0.84, { color: C.ml, size: 11 });
      }
      draw();
    }
  }
})();

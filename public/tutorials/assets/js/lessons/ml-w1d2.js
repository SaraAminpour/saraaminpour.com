/* ml-w1d2: data as numbers. A feature-space explorer for the iris table. */
(function () {
  const { h, ui } = QP;
  // 150 iris flowers: sepal length, sepal width, petal length, petal width (cm), species 0/1/2 (from scikit-learn)
  const RAW = "5.1,3.5,1.4,0.2,0;4.9,3.0,1.4,0.2,0;4.7,3.2,1.3,0.2,0;4.6,3.1,1.5,0.2,0;5.0,3.6,1.4,0.2,0;5.4,3.9,1.7,0.4,0;4.6,3.4,1.4,0.3,0;5.0,3.4,1.5,0.2,0;4.4,2.9,1.4,0.2,0;4.9,3.1,1.5,0.1,0;5.4,3.7,1.5,0.2,0;4.8,3.4,1.6,0.2,0;4.8,3.0,1.4,0.1,0;4.3,3.0,1.1,0.1,0;5.8,4.0,1.2,0.2,0;5.7,4.4,1.5,0.4,0;5.4,3.9,1.3,0.4,0;5.1,3.5,1.4,0.3,0;5.7,3.8,1.7,0.3,0;5.1,3.8,1.5,0.3,0;5.4,3.4,1.7,0.2,0;5.1,3.7,1.5,0.4,0;4.6,3.6,1.0,0.2,0;5.1,3.3,1.7,0.5,0;4.8,3.4,1.9,0.2,0;5.0,3.0,1.6,0.2,0;5.0,3.4,1.6,0.4,0;5.2,3.5,1.5,0.2,0;5.2,3.4,1.4,0.2,0;4.7,3.2,1.6,0.2,0;4.8,3.1,1.6,0.2,0;5.4,3.4,1.5,0.4,0;5.2,4.1,1.5,0.1,0;5.5,4.2,1.4,0.2,0;4.9,3.1,1.5,0.2,0;5.0,3.2,1.2,0.2,0;5.5,3.5,1.3,0.2,0;4.9,3.6,1.4,0.1,0;4.4,3.0,1.3,0.2,0;5.1,3.4,1.5,0.2,0;5.0,3.5,1.3,0.3,0;4.5,2.3,1.3,0.3,0;4.4,3.2,1.3,0.2,0;5.0,3.5,1.6,0.6,0;5.1,3.8,1.9,0.4,0;4.8,3.0,1.4,0.3,0;5.1,3.8,1.6,0.2,0;4.6,3.2,1.4,0.2,0;5.3,3.7,1.5,0.2,0;5.0,3.3,1.4,0.2,0;7.0,3.2,4.7,1.4,1;6.4,3.2,4.5,1.5,1;6.9,3.1,4.9,1.5,1;5.5,2.3,4.0,1.3,1;6.5,2.8,4.6,1.5,1;5.7,2.8,4.5,1.3,1;6.3,3.3,4.7,1.6,1;4.9,2.4,3.3,1.0,1;6.6,2.9,4.6,1.3,1;5.2,2.7,3.9,1.4,1;5.0,2.0,3.5,1.0,1;5.9,3.0,4.2,1.5,1;6.0,2.2,4.0,1.0,1;6.1,2.9,4.7,1.4,1;5.6,2.9,3.6,1.3,1;6.7,3.1,4.4,1.4,1;5.6,3.0,4.5,1.5,1;5.8,2.7,4.1,1.0,1;6.2,2.2,4.5,1.5,1;5.6,2.5,3.9,1.1,1;5.9,3.2,4.8,1.8,1;6.1,2.8,4.0,1.3,1;6.3,2.5,4.9,1.5,1;6.1,2.8,4.7,1.2,1;6.4,2.9,4.3,1.3,1;6.6,3.0,4.4,1.4,1;6.8,2.8,4.8,1.4,1;6.7,3.0,5.0,1.7,1;6.0,2.9,4.5,1.5,1;5.7,2.6,3.5,1.0,1;5.5,2.4,3.8,1.1,1;5.5,2.4,3.7,1.0,1;5.8,2.7,3.9,1.2,1;6.0,2.7,5.1,1.6,1;5.4,3.0,4.5,1.5,1;6.0,3.4,4.5,1.6,1;6.7,3.1,4.7,1.5,1;6.3,2.3,4.4,1.3,1;5.6,3.0,4.1,1.3,1;5.5,2.5,4.0,1.3,1;5.5,2.6,4.4,1.2,1;6.1,3.0,4.6,1.4,1;5.8,2.6,4.0,1.2,1;5.0,2.3,3.3,1.0,1;5.6,2.7,4.2,1.3,1;5.7,3.0,4.2,1.2,1;5.7,2.9,4.2,1.3,1;6.2,2.9,4.3,1.3,1;5.1,2.5,3.0,1.1,1;5.7,2.8,4.1,1.3,1;6.3,3.3,6.0,2.5,2;5.8,2.7,5.1,1.9,2;7.1,3.0,5.9,2.1,2;6.3,2.9,5.6,1.8,2;6.5,3.0,5.8,2.2,2;7.6,3.0,6.6,2.1,2;4.9,2.5,4.5,1.7,2;7.3,2.9,6.3,1.8,2;6.7,2.5,5.8,1.8,2;7.2,3.6,6.1,2.5,2;6.5,3.2,5.1,2.0,2;6.4,2.7,5.3,1.9,2;6.8,3.0,5.5,2.1,2;5.7,2.5,5.0,2.0,2;5.8,2.8,5.1,2.4,2;6.4,3.2,5.3,2.3,2;6.5,3.0,5.5,1.8,2;7.7,3.8,6.7,2.2,2;7.7,2.6,6.9,2.3,2;6.0,2.2,5.0,1.5,2;6.9,3.2,5.7,2.3,2;5.6,2.8,4.9,2.0,2;7.7,2.8,6.7,2.0,2;6.3,2.7,4.9,1.8,2;6.7,3.3,5.7,2.1,2;7.2,3.2,6.0,1.8,2;6.2,2.8,4.8,1.8,2;6.1,3.0,4.9,1.8,2;6.4,2.8,5.6,2.1,2;7.2,3.0,5.8,1.6,2;7.4,2.8,6.1,1.9,2;7.9,3.8,6.4,2.0,2;6.4,2.8,5.6,2.2,2;6.3,2.8,5.1,1.5,2;6.1,2.6,5.6,1.4,2;7.7,3.0,6.1,2.3,2;6.3,3.4,5.6,2.4,2;6.4,3.1,5.5,1.8,2;6.0,3.0,4.8,1.8,2;6.9,3.1,5.4,2.1,2;6.7,3.1,5.6,2.4,2;6.9,3.1,5.1,2.3,2;5.8,2.7,5.1,1.9,2;6.8,3.2,5.9,2.3,2;6.7,3.3,5.7,2.5,2;6.7,3.0,5.2,2.3,2;6.3,2.5,5.0,1.9,2;6.5,3.0,5.2,2.0,2;6.2,3.4,5.4,2.3,2;5.9,3.0,5.1,1.8,2";
  const ROWS = RAW.split(";").map((r) => r.split(",").map(Number));
  const FEATS = ["sepal length", "sepal width", "petal length", "petal width"];
  const SHORT = ["sepal L", "sepal W", "petal L", "petal W"];
  const SPECIES = ["setosa", "versicolor", "virginica"];
  const COLS = ["#ff8a50", "#5577f5", "#1fb394"];
  QP.onReady(() => explorer());

  function explorer() {
    const card = QP.widget("features", "Walk around feature space", "each dot is one flower");
    if (!card) return;
    let fx = 0, fy = 1, hide = false, hover = -1, pinned = -1;
    let pos = ROWS.map((r) => [r[fx], r[fy]]); // drawn positions (animated)
    let anim = null;
    const lim = (k) => {
      const v = ROWS.map((r) => r[k]);
      const lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * 0.08;
      return [lo - pad, hi + pad];
    };
    const segX = ui.seg({ label: "x axis", options: SHORT.map((s, i) => ({ value: i, label: s })), value: fx, onchange: (v) => go(v, fy) });
    const segY = ui.seg({ label: "y axis", options: SHORT.map((s, i) => ({ value: i, label: s })), value: fy, onchange: (v) => go(fx, v) });
    const hideT = ui.toggle({ label: "Hide the labels (what an unsupervised learner sees)", onchange: (v) => { hide = v; draw(); } });
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: lim(fx), ylim: lim(fy), ticks: true, aspect: 0.62, maxH: 430, xlabel: FEATS[fx] + " (cm)", ylabel: FEATS[fy] + " (cm)" });
    const score = ui.stat("Separation score", "–");
    const scoreTxt = h("div", { class: "small muted", style: { marginTop: "6px" } });
    const rowBox = h("div", { class: "small", style: { marginTop: "8px", minHeight: "64px" } });
    const legend = h("div", { class: "legend" }, ...SPECIES.map((s, k) => h("span", null, h("i", { style: { background: COLS[k] } }), s)));
    card.body.append(
      h("div", { class: "controls col" }, segX, segY, hideT),
      plotHost, legend,
      h("div", { class: "side-by-side even", style: { marginTop: "10px" } }, h("div", null, h("div", { class: "readout" }, score), scoreTxt), rowBox)
    );

    function go(nx, ny) {
      const from = pos.map((p) => p.slice());
      const fromX = plot.o.xlim.slice(), fromY = plot.o.ylim.slice();
      fx = nx; fy = ny;
      const toX = lim(fx), toY = lim(fy);
      plot.o.xlabel = FEATS[fx] + " (cm)";
      plot.o.ylabel = FEATS[fy] + " (cm)";
      if (anim) anim.stop();
      anim = QP.animate(700, (e) => {
        pos = ROWS.map((r, i) => [from[i][0] + (r[fx] - from[i][0]) * e, from[i][1] + (r[fy] - from[i][1]) * e]);
        plot.o.xlim = [fromX[0] + (toX[0] - fromX[0]) * e, fromX[1] + (toX[1] - fromX[1]) * e];
        plot.o.ylim = [fromY[0] + (toY[0] - fromY[0]) * e, fromY[1] + (toY[1] - fromY[1]) * e];
        draw();
      });
      updateScore();
    }

    // leave-one-out nearest neighbor with just the two chosen features
    function updateScore() {
      let ok = 0;
      for (let i = 0; i < ROWS.length; i++) {
        let best = Infinity, lab = -1;
        for (let j = 0; j < ROWS.length; j++) {
          if (i === j) continue;
          const d = (ROWS[i][fx] - ROWS[j][fx]) ** 2 + (ROWS[i][fy] - ROWS[j][fy]) ** 2;
          if (d < best) { best = d; lab = ROWS[j][4]; }
        }
        if (lab === ROWS[i][4]) ok++;
      }
      const pct = Math.round((100 * ok) / ROWS.length);
      score.set(`${pct}<small>%</small>`, pct >= 90 ? "good" : pct < 80 ? "bad" : "");
      scoreTxt.textContent = fx === fy
        ? "Both axes show the same feature, so every dot sits on a diagonal line."
        : `Hide each flower's label, guess it from its nearest neighbor in this picture, and ${pct}% of the guesses are right. (Thursday's lesson explains why this is a fair test.)`;
    }

    function showRow(i) {
      rowBox.innerHTML = "";
      if (i < 0) {
        rowBox.append(h("div", { class: "kbd-hint" }, "Point at a flower to see its row of the table."));
        return;
      }
      const r = ROWS[i];
      const t = h("table", { class: "tablelike", style: { margin: "0" } },
        h("tr", null, h("th", null, "row"), ...SHORT.map((s, k) => h("th", { style: { color: k === fx || k === fy ? "var(--ml-ink)" : "" } }, s)), h("th", null, "label")),
        h("tr", null, h("td", null, String(i)), ...r.slice(0, 4).map((v, k) => h("td", { style: { fontWeight: k === fx || k === fy ? 800 : 500 } }, v.toFixed(1))), h("td", { style: { color: COLS[r[4]], fontWeight: 800 } }, hide ? "?" : SPECIES[r[4]])));
      rowBox.append(t);
    }

    function nearest(p) {
      let best = 18 * 18, k = -1;
      pos.forEach((q, i) => {
        const d = (plot.X(q[0]) - p.px) ** 2 + (plot.Y(q[1]) - p.py) ** 2;
        if (d < best) { best = d; k = i; }
      });
      return k;
    }
    plot.on({
      hover: (p) => { hover = nearest(p); draw(); showRow(pinned >= 0 ? pinned : hover); },
      down: (p) => { pinned = nearest(p); draw(); showRow(pinned >= 0 ? pinned : hover); },
      leave: () => { hover = -1; draw(); showRow(pinned); },
    });
    plot.onresize = draw;

    function draw() {
      plot.clear();
      const order = ROWS.map((_, i) => i).sort((a, b) => (a === hover || a === pinned) - (b === hover || b === pinned));
      for (const i of order) {
        const sel = i === hover || i === pinned;
        plot.point(pos[i][0], pos[i][1], { r: sel ? 9 : 6, fill: hide ? "#bcb7cb" : COLS[ROWS[i][4]], stroke: sel ? "#2c2842" : "#fff", lw: sel ? 2.5 : 1.5, alpha: hide ? 0.75 : 0.88 });
      }
    }
    draw();
    updateScore();
    showRow(-1);
  }
})();

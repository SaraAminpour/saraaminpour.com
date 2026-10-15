/* ml-w3d5: forests. Bagged trees vote; more trees give a smoother, steadier boundary. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("bag", "A forest votes", "each tree saw a different random resample");
    if (!card) return;
    const all = QP.data.moons(260, 0.3, 23);
    const train = all.slice(0, 160), test = all.slice(160);
    const BOX = [-2.4, 2.4, -1.7, 1.7];
    let n = 1, one = false;
    const forest = QP.ml.forest(train, 100, 7, 11); // 100 trees; the widget uses the first n
    const vote = (q, k) => QP.math.mean(forest.trees.slice(0, k).map((t) => t.predict(q)));
    const NS = [1, 3, 10, 30, 100];
    const testAcc = NS.map((k) => QP.math.mean(test.map((p) => ((vote(p, k) > 0.5 ? 1 : 0) === p.c ? 1 : 0))));
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [BOX[0], BOX[1]], ylim: [BOX[2], BOX[3]], aspect: 0.6, maxH: 360, equal: true });
    const seg = ui.seg({ label: "Trees in the forest", options: NS, value: n, onchange: (v) => { n = v; draw(); } });
    const oneT = ui.toggle({ label: "Show only the last tree", onchange: (v) => { one = v; draw(); } });
    const sA = ui.stat("Test accuracy", "–");
    const chartHost = h("div");
    const chart = QP.chart(chartHost, { xlim: [0, 2.05], ylim: [0.6, 1], xstep: 1, xfmt: (v) => String(Math.round(10 ** v)), xlabel: "number of trees (log scale)", ylabel: "test accuracy", aspect: 0.4, maxH: 200 });
    card.body.append(h("div", { class: "controls" }, seg, oneT), plotHost, h("div", { class: "side-by-side" }, chartHost, h("div", { class: "readout" }, sA)));
    plot.onresize = draw;
    function draw() {
      const pred = one ? (q) => forest.trees[n - 1].predict(q) : (q) => vote(q, n);
      plot.clear();
      plot.region((x, y) => QP.blend2(pred({ x, y }), 0.8), 6, `${n}-${one}-${plot.w}`);
      for (const p of train) plot.point(p.x, p.y, { r: 4.5, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.2 });
      for (const p of test) plot.point(p.x, p.y, { r: 5.5, fill: "#fff", stroke: QP.classColor(p.c), lw: 2.5 });
      const acc = QP.math.mean(test.map((p) => ((pred(p) > 0.5 ? 1 : 0) === p.c ? 1 : 0)));
      sA.set(`${Math.round(acc * 100)}<small>%</small>`);
      chart.marker = Math.log10(n);
      chart.draw([{ name: "forest (rings = test points)", x: NS.map(Math.log10), y: testAcc, color: C.ml, points: true, r: 4 }]);
    }
    draw();
  }
})();

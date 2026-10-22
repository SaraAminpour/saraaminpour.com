/* ml-w8d2: gradient boosting, one tree at a time. Each small regression tree fits the residuals of the team so
   far and joins with weight = learning rate. Left: the team's curve. Right: the residuals and the newest tree. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  // a small regression tree on one feature, grown greedily by squared error
  function growTree(xs, rs, depth, minLeaf = 3) {
    const mean = QP.math.mean(rs);
    if (depth === 0 || xs.length < 2 * minLeaf) return () => mean;
    const idx = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
    const sx = idx.map((i) => xs[i]), sr = idx.map((i) => rs[i]);
    const tot = QP.math.sum(sr), n = sr.length;
    let best = null, left = 0;
    for (let k = 1; k < n; k++) {
      left += sr[k - 1];
      if (k < minLeaf || n - k < minLeaf || sx[k] === sx[k - 1]) continue;
      const gain = (left * left) / k + ((tot - left) * (tot - left)) / (n - k); // larger = lower squared error
      if (!best || gain > best.gain) best = { gain, k, t: (sx[k - 1] + sx[k]) / 2 };
    }
    if (!best) return () => mean;
    const L = growTree(sx.slice(0, best.k), sr.slice(0, best.k), depth - 1, minLeaf);
    const R = growTree(sx.slice(best.k), sr.slice(best.k), depth - 1, minLeaf);
    return (x) => (x < best.t ? L(x) : R(x));
  }

  function widget() {
    const card = QP.widget("boost", "Boosting, one tree at a time", "add trees and watch the leftovers shrink");
    if (!card) return;
    const r = QP.rng(19);
    const make = (n) => Array.from({ length: n }, () => {
      const x = r() * 6;
      return { x, y: Math.sin(x) + 0.3 * x + 0.25 * r.normal() };
    });
    const train = make(60), test = make(40);
    const XL = [0, 6], YL = [-1.4, 3.2];
    let lr = 0.3, depth = 1, trees = [], hist = [];
    const base = QP.math.mean(train.map((p) => p.y));
    const predict = (x) => base + lr * QP.math.sum(trees.map((t) => t(x)));
    const mse = (pts) => QP.math.mean(pts.map((p) => (p.y - predict(p.x)) ** 2));

    const leftHost = h("div"), rightHost = h("div"), chartHost = h("div");
    const plot = new QP.Plot(leftHost, { xlim: XL, ylim: YL, aspect: 0.62, maxH: 300, ticks: true, grid: true });
    const res = new QP.Plot(rightHost, { xlim: XL, ylim: [-1.6, 1.6], aspect: 0.62, maxH: 300, ticks: true, grid: true });
    const chart = QP.chart(chartHost, { xlim: [0, 20], ylim: [0, 0.35], xlabel: "number of trees", ylabel: "squared error", aspect: 0.32, maxH: 180 });
    const add = (k) => {
      for (let i = 0; i < k && trees.length < 200; i++) {
        const rs = train.map((p) => p.y - predict(p.x));
        trees.push(growTree(train.map((p) => p.x), rs, depth));
        hist.push([mse(train), mse(test)]);
      }
      draw();
    };
    const reset = () => { trees = []; hist = [[mse(train), mse(test)]]; draw(); };
    const lrS = ui.slider({ label: "Learning rate", min: 0.05, max: 1, step: 0.05, value: lr, fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { lr = v; reset(); } });
    const depthS = ui.seg({ label: "Tree depth", options: [1, 2, 3], value: depth, onchange: (v) => { depth = v; reset(); } });
    const b1 = ui.button("Add 1 tree", () => add(1), "btn ml small");
    const b10 = ui.button("Add 10", () => add(10), "btn soft small");
    const bR = ui.button("Start over", reset, "btn soft small");
    const sN = ui.stat("Trees", "0"), sTr = ui.stat("Training error", "–"), sTe = ui.stat("Test error (rings)", "–");
    card.body.append(
      h("div", { class: "btn-row" }, b1, b10, bR),
      h("div", { class: "controls" }, lrS, depthS),
      h("div", { class: "side-by-side even", style: { marginTop: "12px" } },
        h("div", null, h("div", { class: "kbd-hint" }, "The team so far"), leftHost),
        h("div", null, h("div", { class: "kbd-hint" }, "What it still gets wrong, and the newest tree"), rightHost)),
      h("div", { class: "side-by-side" }, chartHost, h("div", { class: "readout" }, sN, sTr, sTe)));
    plot.onresize = res.onresize = draw;

    function draw() {
      const xs = QP.math.linspace(XL[0], XL[1], 300);
      plot.clear();
      for (const p of test) plot.point(p.x, p.y, { r: 4.5, fill: "#fff", stroke: C.c1, lw: 2 });
      for (const p of train) plot.point(p.x, p.y, { r: 4, fill: C.c1, stroke: "#fff", lw: 1 });
      plot.line(xs, xs.map(predict), { color: C.c0, width: 3 });

      res.clear();
      res.seg(XL[0], 0, XL[1], 0, { color: C.ink3, width: 1.5 });
      const last = trees[trees.length - 1];
      // residuals before the newest tree joined: what it was trained on
      const before = (x) => predict(x) - (last ? lr * last(x) : 0);
      for (const p of train) {
        const rr = p.y - before(p.x);
        res.seg(p.x, 0, p.x, rr, { color: "rgba(85,119,245,0.25)", width: 2 });
        res.point(p.x, rr, { r: 3.5, fill: C.c1, stroke: "#fff", lw: 1 });
      }
      if (last) res.line(xs, xs.map(last), { color: C.ml, width: 3 });
      if (last) res.line(xs, xs.map((x) => lr * last(x)), { color: C.ml, width: 2, dash: [5, 5] });

      sN.set(String(trees.length));
      sTr.set(mse(train).toFixed(3));
      sTe.set(mse(test).toFixed(3));
      chart.o.xlim = [0, Math.max(20, Math.ceil(trees.length / 20) * 20)];
      chart.marker = trees.length;
      chart.draw([
        { name: "training error", x: hist.map((_, i) => i), y: hist.map((v) => v[0]), color: C.c1 },
        { name: "test error", x: hist.map((_, i) => i), y: hist.map((v) => v[1]), color: C.c0 },
      ]);
    }
    reset();
  }
})();

/* ml-w3d4: decision trees. Find the best split with Gini impurity, then grow a tree level by level. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => {
    splitter();
    widget();
  });

  function widget() {
    const card = QP.widget("tree", "Grow a tree", "press Grow");
    if (!card) return;
    const C = QP.colors;
    const pts = QP.data.moons(140, 0.2, 17).map((p) => ({ x: p.x * 1.05, y: p.y * 1.2, c: p.c }));
    const BOX = [-2.1, 2.1, -1.55, 1.55];
    let depth = 0, forestOn = false, forest = null;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [BOX[0], BOX[1]], ylim: [BOX[2], BOX[3]], aspect: 0.72, equal: true, minH: 260, maxH: 420 });
    right.append(h("div", { class: "kbd-hint" }, "The questions so far"));
    const treeBox = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "6px", minHeight: "220px", overflowX: "auto" } });
    right.append(treeBox);
    const grow = ui.button("Grow one level", () => { if (depth < 8) { depth++; draw(); } }, "btn ml small");
    const reset = ui.button("Start over", () => { depth = 0; draw(); }, "btn soft small");
    const fT = ui.toggle({ label: "Show a forest of 25 trees instead", checked: false, onchange: (v) => { forestOn = v; if (v && !forest) forest = QP.ml.forest(pts, 25, 7, 4); draw(); } });
    const sD = ui.stat("depth", "0"), sL = ui.stat("leaves (boxes)", "1"), sA = ui.stat("training accuracy", "–");
    card.body.append(h("div", { class: "controls" }, grow, reset, fT), h("div", { class: "readout" }, sD, sL, sA));

    function draw() {
      const tree = QP.ml.tree(pts, depth, { box: BOX });
      plot.clear();
      if (forestOn) {
        plot.region((x, y) => QP.blend2(forest.predict({ x, y }), 0.85), 6, "forest");
      } else {
        for (const leaf of tree.leaves) {
          const [x0, x1, y0, y1] = leaf.box;
          const c = QP.blend2(leaf.p1, 0.75);
          plot.rect(x0, y0, x1, y1, { fill: `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3]})`, stroke: "#fff", width: 2 });
        }
      }
      for (const p of pts) plot.point(p.x, p.y, { r: 4.6, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.3 });
      const predict = forestOn ? (p) => forest.predict(p) : tree.predict;
      const acc = QP.math.mean(pts.map((p) => ((predict(p) > 0.5 ? 1 : 0) === p.c ? 1 : 0)));
      sD.set(forestOn ? "7 (each)" : String(depth));
      sL.set(forestOn ? "25 trees" : String(tree.leaves.length));
      sA.set((acc * 100).toFixed(0) + "%");
      drawTree(tree.root);
    }
    function drawTree(root) {
      if (forestOn) {
        treeBox.innerHTML = `<div style="padding:18px;text-align:center;color:${C.ink2};font-weight:700">25 different trees, each grown on a random resample of the points and random features. Their votes are averaged: that's the smooth map on the left.</div>`;
        return;
      }
      const maxShow = 4;
      // assign x positions by in-order leaf index
      let leafIdx = 0;
      const nodes = [];
      (function place(n, d) {
        if (n.leaf || d >= maxShow) {
          n._x = leafIdx++;
          n._d = d;
          n._cut = !n.leaf;
          nodes.push(n);
          return;
        }
        place(n.left, d + 1);
        place(n.right, d + 1);
        n._x = (n.left._x + n.right._x) / 2;
        n._d = d;
        nodes.push(n);
      })(root, 0);
      const W = Math.max(320, leafIdx * 58), H = 60 + Math.min(depth, maxShow) * 62;
      const X = (n) => 30 + (n._x / Math.max(1, leafIdx - 1)) * (W - 60);
      const Y = (n) => 30 + n._d * 62;
      let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.min(W, 640)}px;height:auto;display:block;font-family:Nunito, sans-serif">`;
      for (const n of nodes) {
        if (!n.leaf && !n._cut) {
          for (const [ch, lab] of [[n.left, "yes"], [n.right, "no"]]) {
            s += `<line x1="${X(n)}" y1="${Y(n)}" x2="${X(ch)}" y2="${Y(ch)}" stroke="#cfc6ee" stroke-width="2"/>`;
            s += `<text x="${(X(n) + X(ch)) / 2 + (lab === "yes" ? -10 : 10)}" y="${(Y(n) + Y(ch)) / 2}" font-size="10" font-weight="800" fill="#8a85a3" text-anchor="middle">${lab}</text>`;
          }
        }
      }
      for (const n of nodes) {
        if (!n.leaf && !n._cut) {
          const label = `${n.f === "x" ? "x₁" : "x₂"} ≤ ${n.t.toFixed(2)}`;
          s += `<rect x="${X(n) - 42}" y="${Y(n) - 13}" width="84" height="26" rx="9" fill="#ece6ff" stroke="#7b5cfa" stroke-width="1.6"/>`;
          s += `<text x="${X(n)}" y="${Y(n) + 4}" font-size="11.5" font-weight="800" fill="#2c2842" text-anchor="middle">${label}</text>`;
        } else {
          const c = QP.blend2(n.p1, 1);
          s += `<circle cx="${X(n)}" cy="${Y(n)}" r="13" fill="rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})" stroke="#2c2842" stroke-opacity=".5" stroke-width="1.5"/>`;
          s += `<text x="${X(n)}" y="${Y(n) + 26}" font-size="9.5" font-weight="700" fill="#8a85a3" text-anchor="middle">${n._cut ? "…" : n.n + " pts"}</text>`;
        }
      }
      s += `</svg>`;
      treeBox.innerHTML = depth === 0 ? `<div style="padding:18px;text-align:center;color:${C.ink2};font-weight:700">No questions yet: one box, and everything gets the majority class. Press Grow!</div>` : s;
    }
    plot.onresize = draw;
    draw();
  }

  // one feature, one question: slide the threshold and watch the weighted Gini impurity
  function splitter() {
    const card = QP.widget("splitter", "Find the best question", "one feature, two classes");
    if (!card) return;
    const C = QP.colors;
    const xs = [0.4, 0.9, 1.3, 1.7, 2.1, 2.4, 2.8, 3.1, 3.5, 3.9, 4.2, 4.6, 5.0, 5.3, 5.7, 6.1, 6.4, 6.9, 7.3, 7.8];
    const cs = [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1];
    let t = 2.6;
    const gini = (arr) => {
      if (!arr.length) return 0;
      const p = arr.filter((c) => c === 1).length / arr.length;
      return 1 - p * p - (1 - p) * (1 - p);
    };
    const score = (th) => {
      const L = cs.filter((_, i) => xs[i] <= th), R = cs.filter((_, i) => xs[i] > th);
      return { L, R, g: (L.length * gini(L) + R.length * gini(R)) / cs.length };
    };
    const plotHost = h("div"), chartHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [0, 8.2], ylim: [-1, 1], aspect: 0.16, minH: 90, maxH: 120, grid: false });
    const ts = QP.math.linspace(0.2, 8, 157);
    const chart = QP.chart(chartHost, { xlim: [0, 8.2], ylim: [0, 0.52], xlabel: "threshold t", ylabel: "weighted Gini", aspect: 0.32, maxH: 200 });
    const tS = ui.slider({ label: "question: is x ≤ t ?  t =", min: 0.2, max: 8, step: 0.05, value: t, fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { t = v; draw(); } });
    const best = ui.button("Find the best question", () => {
      let bt = ts[0], bg = 9;
      for (const th of ts) { const g = score(th).g; if (g < bg - 1e-12) { bg = g; bt = th; } }
      const from = t;
      QP.animate(700, (e) => { t = from + (bt - from) * e; tS.set(+t.toFixed(2)); draw(); });
    }, "btn ml small");
    const sL = ui.stat("left (yes)", "–"), sR = ui.stat("right (no)", "–"), sG = ui.stat("weighted Gini", "–");
    card.body.append(plotHost, h("div", { class: "controls" }, tS, best), h("div", { class: "readout" }, sL, sR, sG), chartHost);
    plot.onresize = draw;
    function draw() {
      plot.clear();
      plot.rect(0, -1, t, 1, { fill: "rgba(23,169,140,.08)" });
      plot.seg(t, -1, t, 1, { color: C.ink, width: 2.5, dash: [5, 4] });
      xs.forEach((x, i) => plot.point(x, 0, { r: 8, fill: QP.classColor(cs[i]), stroke: "#fff", lw: 2 }));
      const { L, R, g } = score(t);
      const desc = (arr) => `${arr.filter((c) => c === 0).length} orange · ${arr.filter((c) => c === 1).length} blue · Gini ${gini(arr).toFixed(2)}`;
      sL.set(`<small>${desc(L)}</small>`);
      sR.set(`<small>${desc(R)}</small>`);
      sG.set(g.toFixed(3));
      chart.marker = t;
      chart.draw([{ name: "weighted Gini after the split (lower = purer)", x: ts, y: ts.map((th) => score(th).g), color: C.ml }]);
    }
    draw();
  }
})();

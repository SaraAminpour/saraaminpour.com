/* ml-w8d3: two more ways to cluster.
   "dendro": agglomerative clustering with four linkages; drag the cut line through the dendrogram.
   "dbscan": DBSCAN with a radius and a crowd size; core, border and noise points. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PAL = ["#ff8a50", "#5577f5", "#17a98c", "#e45fa3", "#7b5cfa", "#f0ac2e", "#5aa9f2", "#c08a5a"];
  const pal = (k) => PAL[k % PAL.length];
  QP.onReady(() => { dendroWidget(); dbscanWidget(); });

  const moons = (n, noise, seed) => QP.data.moons(n, noise, seed);
  function blobs3(seed) {
    return QP.data.blobs(66, [[-1.2, -0.7], [1.3, -0.7], [0.05, 1.1]], 0.3, seed);
  }

  // ------------------------------------------------------------ agglomerative clustering
  function agglomerate(pts, method) {
    const n = pts.length;
    const D = pts.map((p) => pts.map((q) => Math.sqrt(QP.math.dist2(p, q))));
    const size = new Array(n).fill(1);
    const active = new Set(pts.map((_, i) => i));
    const node = pts.map((_, i) => ({ leaf: i, h: 0, size: 1 }));
    const merges = [];
    while (active.size > 1) {
      let a = -1, b = -1, best = Infinity;
      const act = [...active];
      for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
        const d = D[act[i]][act[j]];
        if (d < best) { best = d; a = act[i]; b = act[j]; }
      }
      // the merged group keeps index a; update its distances (Lance-Williams)
      for (const k of active) {
        if (k === a || k === b) continue;
        const da = D[a][k], dbk = D[b][k];
        let d;
        if (method === "single") d = Math.min(da, dbk);
        else if (method === "complete") d = Math.max(da, dbk);
        else if (method === "average") d = (size[a] * da + size[b] * dbk) / (size[a] + size[b]);
        else {
          const t = size[a] + size[b] + size[k];
          d = Math.sqrt(((size[a] + size[k]) * da * da + (size[b] + size[k]) * dbk * dbk - size[k] * best * best) / t);
        }
        D[a][k] = D[k][a] = d;
      }
      node[a] = { kids: [node[a], node[b]], h: best, size: size[a] + size[b] };
      size[a] += size[b];
      active.delete(b);
      merges.push({ h: best, a: node[a] });
    }
    return { root: node[[...active][0]], merges };
  }

  function dendroWidget() {
    const card = QP.widget("dendro", "Grow the family tree, then cut it", "drag the dashed line up and down");
    if (!card) return;
    let data = "blobs", method = "average", cut = null, tree = null, pts = null, maxH = 1;
    const leftHost = h("div"), rightHost = h("div");
    const scat = new QP.Plot(leftHost, { xlim: [-2.4, 2.6], ylim: [-1.7, 2.0], aspect: 0.75, maxH: 320, equal: true });
    const dg = new QP.Plot(rightHost, { xlim: [0, 1], ylim: [0, 1], aspect: 0.75, maxH: 320, pad: 18 });
    const dataS = ui.seg({ label: "Data", options: [{ value: "blobs", label: "3 blobs" }, { value: "moons", label: "2 moons" }], value: data, onchange: (v) => { data = v; rebuild(); } });
    const methS = ui.seg({ label: "Linkage", options: ["single", "complete", "average", "ward"], value: method, onchange: (v) => { method = v; rebuild(); } });
    const sK = ui.stat("Clusters at this cut", "–");
    card.body.append(h("div", { class: "controls" }, dataS, methS),
      h("div", { class: "side-by-side even", style: { marginTop: "12px" } },
        h("div", null, h("div", { class: "kbd-hint" }, "The points"), leftHost),
        h("div", null, h("div", { class: "kbd-hint" }, "The dendrogram: drag the cut"), rightHost)),
      h("div", { class: "readout" }, sK));
    scat.onresize = dg.onresize = draw;
    const setCut = (p) => { cut = QP.math.clamp(p.y * maxH * 1.05, 0.001, maxH * 1.04); draw(); };
    dg.on({ down: setCut, drag: setCut });

    function rebuild() {
      pts = data === "blobs" ? blobs3(11) : moons(70, 0.06, 4).map((p) => ({ x: p.x * 1.25 - 0.1, y: p.y * 1.25 - 0.1, c: p.c }));
      tree = agglomerate(pts, method);
      maxH = tree.root.h;
      // start with the cut that gives as many clusters as the data really has
      const k = data === "blobs" ? 3 : 2;
      const hs = tree.merges.map((m) => m.h).sort((a, b) => a - b);
      cut = (hs[hs.length - k] + hs[hs.length - k + 1]) / 2;
      draw();
    }
    function clustersAt(c) {
      // walk down from the root: any node merged above the cut splits into its children
      const groups = [];
      const walk = (nd) => (nd.kids && nd.h > c ? nd.kids.forEach(walk) : groups.push(nd));
      walk(tree.root);
      const label = new Array(pts.length);
      const leaves = (nd, out) => (nd.kids ? nd.kids.forEach((k) => leaves(k, out)) : out.push(nd.leaf), out);
      groups.sort((a, b) => b.size - a.size).forEach((g, gi) => leaves(g, []).forEach((i) => (label[i] = gi)));
      return { label, groups };
    }
    function draw() {
      if (!tree) return;
      const { label } = clustersAt(cut);
      scat.clear();
      pts.forEach((p, i) => scat.point(p.x, p.y, { r: 5, fill: pal(label[i]), stroke: "#fff", lw: 1.2 }));
      // dendrogram: leaves in tree order along x, merge heights on y (scaled to 0..1)
      dg.clear();
      let leafX = 0;
      const n = pts.length;
      const Y = (v) => v / (maxH * 1.05);
      const place = (nd) => {
        if (!nd.kids) { nd.x = (leafX++ + 0.5) / n; return; }
        nd.kids.forEach(place);
        nd.x = (nd.kids[0].x + nd.kids[1].x) / 2;
      };
      place(tree.root);
      const colorOf = (nd) => {
        if (nd.h > cut) return C.ink3;
        const ls = [];
        (function walk(m) { m.kids ? m.kids.forEach(walk) : ls.push(m.leaf); })(nd);
        return pal(label[ls[0]]);
      };
      (function drawNode(nd) {
        if (!nd.kids) return;
        const col = colorOf(nd);
        for (const k of nd.kids) {
          dg.seg(k.x, Y(k.h), k.x, Y(nd.h), { color: k.h > cut ? C.ink3 : colorOf(k), width: 1.6 });
          drawNode(k);
        }
        dg.seg(nd.kids[0].x, Y(nd.h), nd.kids[1].x, Y(nd.h), { color: col, width: 1.6 });
      })(tree.root);
      dg.seg(0, Y(cut), 1, Y(cut), { color: C.ink, width: 2, dash: [6, 5] });
      dg.text("cut", 0.02, Y(cut) + 0.04, { color: C.ink, size: 12, align: "left" });
      sK.set(String(Math.max(...label) + 1));
    }
    rebuild();
  }

  // ------------------------------------------------------------ DBSCAN
  function dbscan(pts, eps, minPts) {
    const n = pts.length, e2 = eps * eps;
    const nb = pts.map((p) => pts.map((q, j) => (QP.math.dist2(p, q) <= e2 ? j : -1)).filter((j) => j >= 0)); // includes itself
    const core = nb.map((l) => l.length >= minPts);
    const label = new Array(n).fill(-1);
    let c = 0;
    for (let i = 0; i < n; i++) {
      if (!core[i] || label[i] >= 0) continue;
      const stack = [i];
      label[i] = c;
      while (stack.length) {
        const j = stack.pop();
        if (!core[j]) continue;
        for (const k of nb[j]) if (label[k] < 0) { label[k] = c; stack.push(k); }
      }
      c++;
    }
    return { label, core, n: c };
  }

  function dbscanWidget() {
    const card = QP.widget("dbscan", "DBSCAN: follow the crowds", "hover a point to see its circle");
    if (!card) return;
    const r = QP.rng(8);
    const sets = {
      moons: moons(160, 0.07, 6).map((p) => ({ x: p.x * 1.3, y: p.y * 1.3 })).concat(Array.from({ length: 18 }, () => ({ x: -2 + 4.2 * r(), y: -1.4 + 3 * r() }))),
      density: QP.data.blobs(60, [[-1.0, 0.7]], 0.12, 3).concat(QP.data.blobs(80, [[1.0, 0.0]], 0.6, 4), QP.data.blobs(40, [[-0.6, -0.5]], 0.15, 5)),
    };
    let data = "moons", eps = 0.25, minPts = 5, hover = null;
    const host = h("div");
    const plot = new QP.Plot(host, { xlim: [-2.2, 2.4], ylim: [-1.6, 1.7], aspect: 0.62, maxH: 380, equal: true });
    const dataS = ui.seg({ label: "Data", options: [{ value: "moons", label: "moons + strays" }, { value: "density", label: "crowds of different density" }], value: data, onchange: (v) => { data = v; draw(); } });
    const epsS = ui.slider({ label: "Radius eps", min: 0.05, max: 0.8, step: 0.01, value: eps, fmt: (v) => v.toFixed(2), color: C.ml, oninput: (v) => { eps = v; draw(); } });
    const minS = ui.slider({ label: "min_samples", min: 2, max: 15, value: minPts, color: C.qc, oninput: (v) => { minPts = v; draw(); } });
    const sC = ui.stat("Clusters", "–"), sCore = ui.stat("Core", "–"), sB = ui.stat("Border", "–"), sN = ui.stat("Noise", "–");
    const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.c0 } }), "core (big)"), h("span", null, h("i", { style: { background: C.c1, transform: "scale(0.6)" } }), "border (small)"), h("span", null, "× noise"));
    card.body.append(h("div", { class: "controls" }, dataS), h("div", { class: "controls" }, epsS, minS), host, legend, h("div", { class: "readout" }, sC, sCore, sB, sN));
    plot.onresize = draw;
    const near = (p) => {
        const pts = sets[data];
        let bi = -1, bd = Infinity;
        pts.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; bi = i; } });
        hover = bd < 0.04 ? bi : null;
        draw();
    };
    plot.on({ hover: near, down: near, drag: near, leave: () => { hover = null; draw(); } });
    function draw() {
      const pts = sets[data];
      const { label, core, n } = dbscan(pts, eps, minPts);
      plot.clear();
      if (hover != null) {
        const p = pts[hover];
        plot.circle(p.x, p.y, eps, { fill: "rgba(123,92,250,0.08)", stroke: C.qc, width: 1.5, dash: [4, 4] });
      }
      pts.forEach((p, i) => {
        if (label[i] < 0) {
          const s = 0.045;
          plot.seg(p.x - s, p.y - s, p.x + s, p.y + s, { color: C.ink3, width: 2 });
          plot.seg(p.x - s, p.y + s, p.x + s, p.y - s, { color: C.ink3, width: 2 });
        } else plot.point(p.x, p.y, { r: core[i] ? 5.5 : 3.2, fill: pal(label[i]), stroke: "#fff", lw: core[i] ? 1.2 : 0.8 });
      });
      if (hover != null) plot.point(pts[hover].x, pts[hover].y, { r: 7, fill: "none", stroke: C.ink, lw: 2 });
      const nCore = core.filter(Boolean).length, nNoise = label.filter((l) => l < 0).length;
      sC.set(String(n));
      sCore.set(String(nCore));
      sB.set(String(pts.length - nCore - nNoise));
      sN.set(String(nNoise));
    }
    draw();
  }
})();

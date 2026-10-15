/* w1d3: k-nearest neighbors playground. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => knn());

  function knn() {
    const card = QP.widget("knn", "The neighborhood playground", "drag the star");
    if (!card) return;
    const C = QP.colors;
    const datasets = {
      moons: () => QP.data.moons(70, 0.16, 12),
      blobs: () => QP.data.blobs(70, [[-0.7, 0.35], [0.7, -0.25]], 0.42, 8),
      noisy: () => QP.data.moons(70, 0.34, 21),
    };
    let name = "moons";
    let pts = datasets[name]();
    let k = 5;
    let showMap = false;
    let mode = "move";
    let q = { x: 0.25, y: 0.35 };
    let version = 0;

    const plot = new QP.Plot(card.body, { xlim: [-1.9, 2.1], ylim: [-1.35, 1.45], aspect: 0.66, equal: true, minH: 280, maxH: 470 });
    const kSlider = ui.slider({ label: "k", min: 1, max: 25, step: 1, value: k, oninput: (v) => { k = v; version++; draw(); } });
    const dsSeg = ui.seg({ label: "Data", options: [{ value: "moons", label: "Moons" }, { value: "blobs", label: "Blobs" }, { value: "noisy", label: "Noisy" }], value: name, onchange: (v) => { name = v; pts = datasets[v](); version++; draw(); } });
    const modeSeg = ui.seg({ label: "Click to", options: [{ value: "move", label: "Move ★" }, { value: 0, label: "Add orange" }, { value: 1, label: "Add blue" }], value: mode, onchange: (v) => (mode = v) });
    const mapToggle = ui.toggle({ label: "Show decision map", checked: false, onchange: (v) => { showMap = v; draw(); } });
    const votes = ui.stat("Votes", "–");
    const pred = ui.stat("Prediction", "–");
    const radius = ui.stat("Neighborhood radius", "–");
    card.body.append(
      h("div", { class: "controls" }, kSlider, mapToggle),
      h("div", { class: "controls" }, dsSeg, modeSeg),
      h("div", { class: "readout" }, votes, pred, radius),
      h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.c0 } }), "class 0 (orange)"), h("span", null, h("i", { style: { background: C.c1 } }), "class 1 (blue)"), h("span", null, h("i", { style: { background: C.butter } }), "new point ★"))
    );

    function draw() {
      plot.clear();
      if (showMap) {
        plot.region((x, y) => {
          const r = QP.ml.knn(pts, { x, y }, Math.min(k, pts.length));
          return QP.blend2(r.frac[1], 0.85);
        }, 7, `${name}-${k}-${version}`);
      }
      const r = QP.ml.knn(pts, q, Math.min(k, pts.length));
      // neighborhood circle
      plot.circle(q.x, q.y, r.radius, { fill: "rgba(255,214,107,0.16)", stroke: "rgba(240,172,46,0.9)", width: 2, dash: [5, 6] });
      // lines to neighbors
      for (const n of r.neighbors) plot.seg(q.x, q.y, n.x, n.y, { color: QP.classColor(n.c), width: 2.5, alpha: 0.8 });
      const near = new Set(r.neighbors);
      for (const p of pts) plot.point(p.x, p.y, { r: near.has(p) ? 7.5 : 6, fill: QP.classColor(p.c), stroke: near.has(p) ? C.ink : "#fff", lw: near.has(p) ? 2.5 : 1.8 });
      plot.point(q.x, q.y, { r: 13, shape: "star", fill: C.butter, stroke: C.ink, lw: 2.2, glow: "rgba(255,214,107,.9)" });
      const n0 = r.neighbors.filter((p) => p.c === 0).length;
      const n1 = r.neighbors.length - n0;
      votes.set(`<span style="color:${C.c0}">${n0}</span> <small>orange</small> · <span style="color:${C.c1}">${n1}</span> <small>blue</small>`);
      const tie = n0 === n1;
      pred.set(tie ? "tie!" : r.label === 0 ? `<span style="color:${C.c0}">orange</span>` : `<span style="color:${C.c1}">blue</span>`);
      radius.set(r.radius.toFixed(2));
    }

    let dragging = false;
    plot.on({
      down: (p) => {
        if (mode === "move") {
          dragging = true;
          q = { x: p.x, y: p.y };
          draw();
        } else {
          pts.push({ x: p.x, y: p.y, c: mode });
          version++;
          draw();
        }
      },
      drag: (p) => {
        if (!dragging) return;
        q = { x: QP.math.clamp(p.x, plot.o.xlim[0], plot.o.xlim[1]), y: QP.math.clamp(p.y, plot.o.ylim[0], plot.o.ylim[1]) };
        draw();
      },
      up: () => (dragging = false),
    });
    plot.onresize = () => { version++; draw(); };
    draw();
  }
})();

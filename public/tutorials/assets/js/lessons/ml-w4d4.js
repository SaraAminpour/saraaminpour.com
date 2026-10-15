/* ml-w4d4: kernel matrices. A Gram matrix you can hover: every cell is the similarity of two points. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("gram", "Read the similarity table", "hover a cell, or a point");
    if (!card) return;
    // two classes on two rings, sorted by class and then by angle so the matrix shows its blocks
    const raw = QP.data.circles(40, 0.07, 0.45, 5);
    const pts = raw.slice().sort((a, b) => a.c - b.c || Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
    const n = pts.length;
    let logG = 0.3, hi = null;
    const left = h("div"), right = h("div");
    const plot = new QP.Plot(left, { xlim: [-1.35, 1.35], ylim: [-1.35, 1.35], aspect: 1, equal: true, minH: 240, maxH: 340 });
    const cv = h("canvas", { width: 400, height: 400, class: "gram-canvas" });
    right.append(cv);
    const gS = ui.slider({ label: "γ (how local)", min: -2.5, max: 3, step: 0.05, value: logG, fmt: (v) => Math.pow(10, v).toPrecision(2), color: C.ml, oninput: (v) => { logG = v; draw(); } });
    const sIn = ui.stat("same class, average", "–"), sOut = ui.stat("different class, average", "–"), sC = ui.stat("contrast", "–");
    const info = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "side-by-side even" }, h("div", null, h("div", { class: "kbd-hint" }, "The 40 points (outer ring first, then the inner ring)"), left), h("div", null, h("div", { class: "kbd-hint" }, "Kernel matrix K: row i, column j = k(xᵢ, xⱼ)"), right)),
      h("div", { class: "controls" }, gS), h("div", { class: "readout" }, sIn, sOut, sC), info);
    const k = (a, b) => Math.exp(-Math.pow(10, logG) * ((a.x - b.x) ** 2 + (a.y - b.y) ** 2));

    cv.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      const i = Math.floor(((e.clientY - r.top) / r.height) * n), j = Math.floor(((e.clientX - r.left) / r.width) * n);
      hi = i >= 0 && i < n && j >= 0 && j < n ? [i, j] : null;
      draw();
    });
    cv.addEventListener("pointerleave", () => { hi = null; draw(); });
    plot.on({
      hover: (q) => {
        let best = 16 * 16, idx = -1;
        pts.forEach((p, i) => { const d = (plot.X(p.x) - q.px) ** 2 + (plot.Y(p.y) - q.py) ** 2; if (d < best) { best = d; idx = i; } });
        hi = idx >= 0 ? [idx, idx] : null;
        draw();
      },
      leave: () => { hi = null; draw(); },
    });
    plot.onresize = draw;

    function draw() {
      // matrix
      const ctx = cv.getContext("2d");
      const cell = 400 / n;
      let sIn_ = 0, nIn = 0, sOut_ = 0, nOut = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const v = k(pts[i], pts[j]);
          if (i !== j) {
            if (pts[i].c === pts[j].c) { sIn_ += v; nIn++; } else { sOut_ += v; nOut++; }
          }
          const t = Math.pow(v, 0.8);
          ctx.fillStyle = `rgb(${Math.round(252 - 162 * t)}, ${Math.round(250 - 190 * t)}, ${Math.round(255 - 50 * t)})`;
          ctx.fillRect(j * cell, i * cell, cell + 0.5, cell + 0.5);
        }
      const nb = pts.filter((p) => p.c === 0).length * cell;
      ctx.strokeStyle = "rgba(44,40,66,.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nb, 0); ctx.lineTo(nb, 400); ctx.moveTo(0, nb); ctx.lineTo(400, nb);
      ctx.stroke();
      if (hi) {
        ctx.strokeStyle = "#ff76a8";
        ctx.lineWidth = 3;
        ctx.strokeRect(hi[1] * cell, hi[0] * cell, cell, cell);
      }
      // points
      plot.clear();
      const focus = hi ? new Set(hi) : null;
      pts.forEach((p, i) => {
        const on = focus && focus.has(i);
        plot.point(p.x, p.y, { r: on ? 9 : 6, fill: QP.classColor(p.c), stroke: on ? "#2c2842" : "#fff", lw: on ? 3 : 1.5, alpha: focus && !on ? 0.45 : 1 });
      });
      if (hi && hi[0] !== hi[1]) plot.seg(pts[hi[0]].x, pts[hi[0]].y, pts[hi[1]].x, pts[hi[1]].y, { color: "#ff76a8", width: 2.5, dash: [5, 4] });
      const mi = sIn_ / nIn, mo = sOut_ / nOut;
      sIn.set(mi.toFixed(2));
      sOut.set(mo.toFixed(2));
      sC.set((mi - mo).toFixed(2), mi - mo > 0.25 ? "good" : mi - mo < 0.08 ? "bad" : "");
      if (hi) info.textContent = hi[0] === hi[1] ? `Point ${hi[0] + 1}: its row of K is how similar it is to every other point.` : `k(x${hi[0] + 1}, x${hi[1] + 1}) = ${k(pts[hi[0]], pts[hi[1]]).toFixed(3)}: ${pts[hi[0]].c === pts[hi[1]].c ? "same class" : "different classes"}.`;
      else info.textContent = Math.pow(10, logG) < 0.1 ? "Too wide: every pair looks similar, the matrix is nearly all ones, and it can't tell the classes apart."
        : Math.pow(10, logG) > 150 ? "Too narrow: each point is only similar to itself, the matrix is nearly the identity. That's memorizing."
        : "A useful kernel: bright blocks within each class, darker between them.";
    }
    draw();
  }
})();

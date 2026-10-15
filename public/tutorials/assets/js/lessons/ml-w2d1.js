/* ml-w2d1: the best-fit line. Drag a line, see residual squares and the MSE, and its place in the loss bowl. */
(function () {
  const { h, ui } = QP;
  const X = [21.71, 24.74, 36.03, 31.64, 21.88, 28.66, 29.58, 23.19, 34.69, 22.27, 27.82, 30.33, 28.61, 31.74, 34.76, 39.13, 25.68, 32.97, 33.92, 25.85, 20.03, 39.47, 25.97, 26.28, 37.83];
  const Y = [10.7, 14.31, 17.44, 15.06, 11.44, 12.52, 13.86, 11.99, 17.89, 10.38, 14.24, 10.72, 15.17, 14.11, 14.78, 19.91, 13.11, 15.51, 15.15, 12.26, 8.94, 21.68, 13.33, 12.73, 20.37];
  QP.onReady(() => fit());

  function fit() {
    const card = QP.widget("fit", "Fit the line by hand", "drag the white handles");
    if (!card) return;
    const C = QP.colors;
    const x1 = 19, x2 = 41;
    let y1 = 15, y2 = 13; // a deliberately bad start
    let squares = true;
    let outlierOn = false;
    const outlier = { x: 24, y: 22.5 };
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, h("div", null, h("div", { class: "kbd-hint" }, "The data and your line"), left), h("div", null, h("div", { class: "kbd-hint" }, "The loss bowl: every point is one line (darker = smaller MSE)"), right)));
    const plot = new QP.Plot(left, { xlim: [17, 43], ylim: [6, 25], aspect: 0.75, ticks: true, xlabel: "pizza diameter (cm)", ylabel: "price ($)", minH: 280, maxH: 420 });
    const base = QP.ml.linfit(X.map((x, i) => ({ x, y: Y[i] })));
    const bowl = new QP.Plot(right, { xlim: [base.w - 0.75, base.w + 0.75], ylim: [base.b - 20, base.b + 20], aspect: 0.75, ticks: true, xlabel: "slope w", ylabel: "intercept b", minH: 280, maxH: 420 });
    const sMse = ui.stat("Your MSE", "–");
    const sBest = ui.stat("Best possible", "–", "good");
    const sW = ui.stat("Slope w", "–");
    const sB = ui.stat("Intercept b", "–");
    const snap = ui.button("Snap to best fit", () => toBest(), "btn ml small");
    const sq = ui.toggle({ label: "Show squares", checked: true, onchange: (v) => { squares = v; draw(); } });
    const out = ui.toggle({ label: "Add an outlier", checked: false, onchange: (v) => { outlierOn = v; draw(); } });
    card.body.append(h("div", { class: "controls" }, snap, sq, out), h("div", { class: "readout" }, sMse, sBest, sW, sB));

    const points = () => {
      const p = X.map((x, i) => ({ x, y: Y[i] }));
      if (outlierOn) p.push(outlier);
      return p;
    };
    const line = () => {
      const w = (y2 - y1) / (x2 - x1);
      return { w, b: y1 - w * x1 };
    };
    function draw() {
      plot.clear();
      const { w, b } = line();
      const pts = points();
      // residual squares
      for (const p of pts) {
        const yh = w * p.x + b;
        const side = Math.abs(plot.Y(p.y) - plot.Y(yh));
        if (squares && side > 0.5) {
          const ctx = plot.ctx;
          const left = plot.X(p.x) + side > plot.w - plot.pr ? plot.X(p.x) - side : plot.X(p.x);
          ctx.save();
          ctx.fillStyle = "rgba(255,138,80,0.16)";
          ctx.strokeStyle = "rgba(255,138,80,0.55)";
          ctx.lineWidth = 1.2;
          ctx.fillRect(left, Math.min(plot.Y(p.y), plot.Y(yh)), side, side);
          ctx.strokeRect(left, Math.min(plot.Y(p.y), plot.Y(yh)), side, side);
          ctx.restore();
        }
        plot.seg(p.x, p.y, p.x, yh, { color: C.c0, width: 2 });
      }
      { const [a0, a1] = plot.o.xlim; plot.line([a0, a1], [w * a0 + b, w * a1 + b], { color: C.qc, width: 4 }); }
      for (const p of X.map((x, i) => ({ x, y: Y[i] }))) plot.point(p.x, p.y, { r: 6, fill: C.c1, stroke: "#fff", lw: 2 });
      if (outlierOn) {
        plot.point(outlier.x, outlier.y, { r: 9, fill: C.pink, stroke: C.ink, lw: 2.5, glow: "rgba(255,143,184,.8)" });
        plot.text("outlier: drag me", outlier.x + 0.6, outlier.y + 1.1, { color: "#d4477f", size: 11, align: "left", bg: "rgba(255,255,255,.85)" });
      }
      for (const [hx, hy] of [[x1, y1], [x2, y2]]) plot.point(hx, hy, { r: 11, fill: "#fff", stroke: C.qc, lw: 3.5 });
      const m = QP.math.mean(pts.map((p) => (p.y - (w * p.x + b)) ** 2));
      const best = QP.ml.linfit(pts);
      const mb = QP.ml.mse(pts, best.w, best.b);
      drawBowl(pts, w, b, best);
      sMse.set(m.toFixed(2), m < mb * 1.05 ? "good" : m > mb * 3 ? "bad" : "");
      sBest.set(mb.toFixed(2));
      sW.set(w.toFixed(3));
      sB.set(b.toFixed(2));
    }
    function drawBowl(pts, w, b, best) {
      bowl.clear();
      const losses = (ww, bb) => QP.math.mean(pts.map((p) => (p.y - (ww * p.x + bb)) ** 2));
      const [w0, w1] = bowl.o.xlim, [b0, b1] = bowl.o.ylim;
      const lo = Math.log(QP.ml.mse(pts, best.w, best.b)), hi = Math.log(Math.max(losses(w0, b0), losses(w0, b1), losses(w1, b0), losses(w1, b1)));
      const deep = [74, 47, 194], light = [250, 248, 255];
      bowl.region((ww, bb) => {
        const t = QP.math.clamp((Math.log(losses(ww, bb)) - lo) / (hi - lo), 0, 1);
        const q = Math.floor(Math.pow(t, 0.55) * 16) / 16; // bands look like contour lines
        return [deep[0] + (light[0] - deep[0]) * q, deep[1] + (light[1] - deep[1]) * q, deep[2] + (light[2] - deep[2]) * q, 1];
      }, 4, `${outlierOn}-${outlier.x.toFixed(1)}-${outlier.y.toFixed(1)}-${bowl.w}`);
      bowl.point(best.w, best.b, { r: 9, fill: "#ffd66b", stroke: QP.colors.ink, lw: 2, shape: "star" });
      const inside = w > bowl.o.xlim[0] && w < bowl.o.xlim[1] && b > bowl.o.ylim[0] && b < bowl.o.ylim[1];
      if (inside) bowl.point(w, b, { r: 8, fill: QP.colors.pink, stroke: "#fff", lw: 2.5, glow: "rgba(255,143,184,.9)" });
      else bowl.text("your line is off the map", (bowl.o.xlim[0] + bowl.o.xlim[1]) / 2, bowl.o.ylim[1] - 2, { bg: "#fff", size: 11 });
    }
    function setWB(w, b) {
      y1 = w * x1 + b;
      y2 = w * x2 + b;
      draw();
    }
    bowl.on({ down: (p) => setWB(p.x, p.y), drag: (p) => setWB(p.x, p.y) });
    bowl.c.classList.add("grab");
    bowl.onresize = draw;
    function toBest() {
      const best = QP.ml.linfit(points());
      const t1 = best.w * x1 + best.b, t2 = best.w * x2 + best.b;
      const f1 = y1, f2 = y2;
      QP.animate(700, (e) => { y1 = f1 + (t1 - f1) * e; y2 = f2 + (t2 - f2) * e; draw(); });
    }
    let drag = null;
    plot.on({
      down: (p) => {
        const near = (x, y) => Math.hypot(plot.X(x) - p.px, plot.Y(y) - p.py) < 22;
        if (outlierOn && near(outlier.x, outlier.y)) drag = "out";
        else if (near(x1, y1)) drag = "h1";
        else if (near(x2, y2)) drag = "h2";
        else {
          const { w, b } = line();
          if (Math.abs(plot.Y(w * p.x + b) - p.py) < 26) drag = { shift: p.y, y1, y2 };
        }
      },
      drag: (p) => {
        if (!drag) return;
        const cy = QP.math.clamp(p.y, 5, 26);
        if (drag === "h1") y1 = cy;
        else if (drag === "h2") y2 = cy;
        else if (drag === "out") { outlier.x = QP.math.clamp(p.x, 18, 42); outlier.y = cy; }
        else { const d = p.y - drag.shift; y1 = drag.y1 + d; y2 = drag.y2 + d; }
        draw();
      },
      up: () => (drag = null),
    });
    plot.c.classList.add("grab");
    plot.onresize = draw;
    draw();
  }
})();

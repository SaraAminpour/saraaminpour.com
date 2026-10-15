/* w2d3: gradient descent. Widgets: a hopping ball on a 1D loss, and a 2D loss map for the pizza line. */
(function () {
  const { h, ui } = QP;
  const X = [21.71, 24.74, 36.03, 31.64, 21.88, 28.66, 29.58, 23.19, 34.69, 22.27, 27.82, 30.33, 28.61, 31.74, 34.76, 39.13, 25.68, 32.97, 33.92, 25.85, 20.03, 39.47, 25.97, 26.28, 37.83];
  const Y = [10.7, 14.31, 17.44, 15.06, 11.44, 12.52, 13.86, 11.99, 17.89, 10.38, 14.24, 10.72, 15.17, 14.11, 14.78, 19.91, 13.11, 15.51, 15.15, 12.26, 8.94, 21.68, 13.33, 12.73, 20.37];
  QP.onReady(() => {
    ball();
    contour();
  });

  function ball() {
    const card = QP.widget("ball", "One knob: roll down the loss", "click the curve to place the ball");
    if (!card) return;
    const C = QP.colors;
    const shapes = {
      bowl: { f: (w) => (w - 3) ** 2 + 1, d: (w) => 2 * (w - 3), ylim: [-2, 40] },
      bumpy: { f: (w) => 0.12 * (w - 3) ** 2 + 1.4 * Math.sin(1.9 * w) + 3, d: (w) => 0.24 * (w - 3) + 2.66 * Math.cos(1.9 * w), ylim: [-0.5, 12] },
    };
    let shape = "bowl";
    let w = -2, lr = 0.1, history = [w], playing = null, hop = null;
    const plot = new QP.Plot(card.body, { xlim: [-3, 9], ylim: shapes.bowl.ylim, aspect: 0.48, ticks: true, xlabel: "knob w", ylabel: "loss", minH: 240, maxH: 380 });
    const seg = ui.seg({ label: "Landscape", options: [{ value: "bowl", label: "Bowl" }, { value: "bumpy", label: "Bumpy" }], value: shape, onchange: (v) => { shape = v; plot.o.ylim = shapes[v].ylim; reset(v === "bumpy" ? 7.8 : -2); } });
    const lrS = ui.slider({ label: "learning rate η", min: -2, max: 0.08, step: 0.01, value: Math.log10(0.1), fmt: (v) => Math.pow(10, v).toFixed(3), oninput: (v) => (lr = Math.pow(10, v)) });
    const stepB = ui.button("Step", () => step(), "btn ml small");
    const playB = ui.button("Play", () => toggle(), "btn soft small");
    const resetB = ui.button("Reset", () => reset(history[0]), "btn soft small");
    const sW = ui.stat("w", "–"), sL = ui.stat("loss", "–"), sS = ui.stat("slope dL/dw", "–"), sN = ui.stat("steps", "0");
    card.body.append(h("div", { class: "controls" }, seg, lrS), h("div", { class: "controls" }, stepB, playB, resetB), h("div", { class: "readout" }, sW, sL, sS, sN));

    function draw(bx, by) {
      const F = shapes[shape];
      plot.clear();
      plot.fn(F.f, { color: "#b9a7ff", width: 5, fill: "rgba(185,167,255,0.12)", fillTo: plot.o.ylim[0] });
      // history
      for (let i = 1; i < history.length; i++) plot.seg(history[i - 1], F.f(history[i - 1]), history[i], F.f(history[i]), { color: "rgba(255,138,80,.45)", width: 1.6, dash: [4, 4] });
      for (const hw of history.slice(0, -1)) plot.point(hw, F.f(hw), { r: 3.5, fill: "rgba(255,138,80,.7)", stroke: null });
      // tangent at the ball
      const slope = F.d(w);
      const span = 1.2;
      if (!hop) plot.seg(w - span, F.f(w) - slope * span, w + span, F.f(w) + slope * span, { color: C.pink, width: 3, dash: [6, 5] });
      const x = bx == null ? w : bx, y = by == null ? F.f(w) : by;
      plot.point(x, y + (10 * (plot.o.ylim[1] - plot.o.ylim[0])) / plot.ph, { r: 11, fill: C.c0, stroke: "#fff", lw: 3, glow: "rgba(255,138,80,.6)" });
      sW.set(w.toFixed(3));
      sL.set(F.f(w).toFixed(3));
      sS.set(slope.toFixed(3));
      sN.set(String(history.length - 1));
    }
    function step(done) {
      if (hop) return;
      const F = shapes[shape];
      const w0 = w;
      const w1 = w0 - lr * F.d(w0);
      if (!isFinite(w1) || Math.abs(w1) > 60) {
        stop();
        QP.toast("Diverged! The steps grew until the ball flew off. Try a smaller learning rate.", "ui-flame");
        return;
      }
      const y0 = F.f(w0), y1 = F.f(w1);
      const lift = Math.max(0.6, Math.abs(w1 - w0) * 0.4) * (plot.o.ylim[1] - plot.o.ylim[0]) * 0.08;
      hop = true;
      QP.animate(QP.reduceMotion ? 1 : 340, (e, t) => {
        const bx = w0 + (w1 - w0) * t;
        const by = y0 + (y1 - y0) * t + lift * 4 * t * (1 - t);
        draw(bx, by);
      }, () => {
        hop = null;
        w = w1;
        history.push(w);
        draw();
        done && done();
      });
    }
    function toggle() {
      if (playing) return stop();
      playB.textContent = "Pause";
      let n = 0;
      playing = true;
      const go = () => {
        if (!playing) return;
        const before = w;
        step(() => {
          n++;
          if (Math.abs(w - before) < 1e-4 || n > 60) return stop();
          setTimeout(go, 120);
        });
        if (!playing) return;
      };
      go();
    }
    function stop() {
      playing = null;
      playB.textContent = "Play";
    }
    function reset(start) {
      stop();
      w = start;
      history = [w];
      draw();
    }
    plot.on({
      down: (p) => {
        if (hop) return;
        stop();
        reset(QP.math.clamp(p.x, -2.9, 8.9));
      },
    });
    plot.onresize = () => draw();
    draw();
  }

  function contour() {
    const card = QP.widget("contour", "Two knobs: the loss map of the pizza line", "click the map to start");
    if (!card) return;
    const C = QP.colors;
    const mu = QP.math.mean(X);
    const sd = Math.sqrt(QP.math.mean(X.map((x) => (x - mu) ** 2)));
    const XS = X.map((x) => (x - mu) / sd);
    const L = (w, b) => QP.math.mean(XS.map((x, i) => (w * x + b - Y[i]) ** 2));
    const grad = (w, b) => {
      let gw = 0, gb = 0;
      XS.forEach((x, i) => {
        const e = w * x + b - Y[i];
        gw += e * x;
        gb += e;
      });
      return [(2 * gw) / XS.length, (2 * gb) / XS.length];
    };
    const best = QP.ml.linfit(XS.map((x, i) => ({ x, y: Y[i] })));
    const lmin = L(best.w, best.b);
    let path = [[-3, 5]];
    let lr = 0.15, playing = false;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side even" }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "Loss for every (w, b): darker = lower"));
    const map = new QP.Plot(left, { xlim: [-4, 9], ylim: [2, 26], aspect: 0.9, ticks: true, xlabel: "slope w", ylabel: "intercept b", minH: 260, maxH: 420 });
    right.append(h("div", { class: "kbd-hint" }, "The line those knobs draw"));
    const data = new QP.Plot(right, { xlim: [18, 42], ylim: [6, 24], aspect: 0.9, ticks: true, xlabel: "diameter (cm)", ylabel: "price ($)", minH: 260, maxH: 420 });
    const lrS = ui.slider({ label: "learning rate η", min: 0.02, max: 1.08, step: 0.01, value: lr, fmt: (v) => v.toFixed(2), oninput: (v) => (lr = v) });
    const stepB = ui.button("Step", () => step(), "btn ml small");
    const playB = ui.button("Play", () => toggle(), "btn soft small");
    const sN = ui.stat("steps", "0"), sL = ui.stat("MSE", "–"), sB = ui.stat("best possible", lmin.toFixed(2), "good");
    card.body.append(h("div", { class: "controls" }, lrS, stepB, playB), h("div", { class: "readout" }, sN, sL, sB));
    const lo = Math.log(lmin), hi = Math.log(L(-4, 26));

    function draw() {
      map.clear();
      map.region((w, b) => {
        const t = QP.math.clamp((Math.log(L(w, b)) - lo) / (hi - lo), 0, 1);
        const band = Math.floor(t * 14);
        const shade = band % 2 ? 0.94 : 1;
        const c0 = [123, 92, 250], c1 = [127, 224, 196], c2 = [255, 250, 244];
        const mix = t < 0.5 ? c0.map((v, i) => v + (c1[i] - v) * (t / 0.5)) : c1.map((v, i) => v + (c2[i] - v) * ((t - 0.5) / 0.5));
        return [mix[0] * shade, mix[1] * shade, mix[2] * shade, 0.75];
      }, 4, "map");
      map.point(best.w, best.b, { r: 10, shape: "star", fill: C.butter, stroke: C.ink, lw: 2 });
      for (let i = 1; i < path.length; i++) map.seg(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], { color: "#fff", width: 3.5 });
      for (let i = 1; i < path.length; i++) map.seg(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], { color: C.c0, width: 2 });
      path.forEach(([w, b], i) => map.point(w, b, { r: i === path.length - 1 ? 8 : 3.5, fill: C.c0, stroke: "#fff", lw: i === path.length - 1 ? 3 : 1 }));
      const [w, b] = path[path.length - 1];
      data.clear();
      X.forEach((x, i) => data.point(x, Y[i], { r: 5, fill: C.c1, stroke: "#fff", lw: 1.5 }));
      const yAt = (x) => w * ((x - mu) / sd) + b;
      data.line([18, 42], [yAt(18), yAt(42)], { color: C.c0, width: 4 });
      sN.set(String(path.length - 1));
      const l = L(w, b);
      sL.set(isFinite(l) && l < 1e6 ? l.toFixed(2) : "huge!", l < lmin * 1.02 ? "good" : "");
    }
    function step() {
      const [w, b] = path[path.length - 1];
      const [gw, gb] = grad(w, b);
      const nw = w - lr * gw, nb = b - lr * gb;
      if (!isFinite(nw) || Math.abs(nw) > 1e4) return false;
      path.push([nw, nb]);
      draw();
      return Math.hypot(nw - w, nb - b) > 1e-3;
    }
    function toggle() {
      if (playing) {
        playing = false;
        playB.textContent = "Play";
        return;
      }
      playing = true;
      playB.textContent = "Pause";
      let n = 0;
      const tick = () => {
        if (!playing) return;
        const moving = step();
        n++;
        if (!moving || n > 80) {
          playing = false;
          playB.textContent = "Play";
          if (L(...path[path.length - 1]) > L(...path[0])) QP.toast("The loss went up: that learning rate is too big for this map.", "ui-flame");
          return;
        }
        setTimeout(tick, 110);
      };
      tick();
    }
    map.on({ down: (p) => { path = [[p.x, p.y]]; draw(); } });
    map.onresize = draw;
    data.onresize = draw;
    draw();
  }
})();

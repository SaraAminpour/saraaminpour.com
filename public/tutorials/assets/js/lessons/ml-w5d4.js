/* ml-w5d4: training habits. An optimizer race on two loss maps, and early stopping on one real training run. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => {
    race();
    earlyStop();
  });

  // ---------------------------------------------------------------- the race
  const LANDS = {
    ravine: {
      label: "Narrow valley",
      f: (a, b) => 0.5 * (0.02 * a * a + 4 * b * b),
      g: (a, b) => [0.02 * a, 4 * b],
      start: [-9, 1.6], min: [0, 0], xlim: [-10, 3], ylim: [-2.5, 2.5], aspect: 0.55, eta: 0.3,
    },
    bumpy: {
      label: "Bumpy bowl",
      f: (a, b) => 0.04 * (a * a + b * b) + 0.6 * (2 - Math.cos(1.5 * a) - Math.cos(1.5 * b)),
      g: (a, b) => [0.08 * a + 0.9 * Math.sin(1.5 * a), 0.08 * b + 0.9 * Math.sin(1.5 * b)],
      start: [6.5, 5.6], min: [0, 0], xlim: [-8, 8], ylim: [-6, 7], aspect: 0.8, eta: 0.3,
    },
  };
  const OPTS = [
    { k: "gd", name: "Gradient descent", color: "#ff8a50" },
    { k: "mom", name: "Momentum (β = 0.9)", color: "#7b5cfa" },
    { k: "adam", name: "Adam", color: "#17a98c" },
  ];
  const NOISE = { all: 0, b64: 0.25, b8: 0.7 }; // gradient noise shrinks like 1/√(batch size)

  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function race() {
    const card = QP.widget("race", "Optimizer race", "same start, same learning rate, three ways to step");
    if (!card) return;
    let land = "ravine", eta = LANDS.ravine.eta, batch = "all", start = LANDS.ravine.start.slice(), runs = null, timer = null, seed = 1;
    const plotHost = h("div");
    let plot = null;
    const lSeg = ui.seg({ label: "Loss map", options: Object.keys(LANDS).map((k) => ({ value: k, label: LANDS[k].label })), value: land, onchange: (v) => { land = v; start = LANDS[v].start.slice(); makePlot(); reset(); } });
    const eS = ui.slider({ label: "learning rate η", min: -2, max: Math.log10(0.6), step: 0.01, value: Math.log10(eta), fmt: (v) => Math.pow(10, v).toFixed(v < -1 ? 3 : 2), oninput: (v) => { eta = Math.pow(10, v); reset(); } });
    const bSeg = ui.seg({ label: "Each step's gradient from", options: [{ value: "all", label: "all the data" }, { value: "b64", label: "a batch of 64" }, { value: "b8", label: "a batch of 8" }], value: batch, onchange: (v) => { batch = v; reset(); } });
    const go = ui.button("Race! (150 steps)", () => play(), "btn ml small");
    const again = ui.button("New random batches", () => { seed++; play(); }, "btn soft small");
    const stats = OPTS.map((o) => ui.stat(o.name, "–"));
    const sN = ui.stat("steps", "0");
    const legend = h("div", { class: "legend" }, ...OPTS.map((o) => h("span", null, h("i", { style: { background: o.color } }), o.name)), h("span", null, "★ the lowest point"));
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls col" }, lSeg, eS, bSeg), plotHost, legend, h("div", { class: "btn-row", style: { marginTop: "8px" } }, go, again), h("div", { class: "readout" }, ...stats, sN), note);
    again.hidden = true;

    function makePlot() {
      const Ld = LANDS[land];
      plotHost.innerHTML = "";
      plot = new QP.Plot(plotHost, { xlim: Ld.xlim, ylim: Ld.ylim, aspect: Ld.aspect, ticks: true, xlabel: "weight w₁", ylabel: "weight w₂", minH: 230, maxH: 400 });
      plot.onresize = draw;
      plot.on({ down: (p) => { start = [p.x, p.y]; reset(); } });
      const n = 120;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        const v = Ld.f(Ld.xlim[0] + ((Ld.xlim[1] - Ld.xlim[0]) * i) / n, Ld.ylim[0] + ((Ld.ylim[1] - Ld.ylim[0]) * j) / n);
        lo = Math.min(lo, v); hi = Math.max(hi, v);
      }
      Ld.lo = Math.log(lo + 0.01); Ld.hi = Math.log(hi + 0.01);
    }
    function simulate() {
      const Ld = LANDS[land], sig = NOISE[batch], r = rng(seed * 7919 + 1);
      const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, r()))) * Math.cos(2 * Math.PI * r());
      const out = OPTS.map(() => ({ path: [start.slice()], blown: false }));
      const st = OPTS.map(() => ({ v: [0, 0], m: [0, 0], s: [0, 0] }));
      for (let t = 1; t <= 150; t++) {
        // every optimizer sees the same noisy gradient sample at its own position
        const z = [gauss(), gauss()];
        OPTS.forEach((o, k) => {
          const R = out[k];
          if (R.blown) return;
          const [a, b] = R.path[R.path.length - 1];
          let g = Ld.g(a, b);
          g = [g[0] + sig * z[0], g[1] + sig * z[1]];
          const S = st[k];
          let na, nb;
          if (o.k === "gd") { na = a - eta * g[0]; nb = b - eta * g[1]; }
          else if (o.k === "mom") {
            S.v = [0.9 * S.v[0] + g[0], 0.9 * S.v[1] + g[1]];
            na = a - eta * S.v[0]; nb = b - eta * S.v[1];
          } else {
            S.m = [0.9 * S.m[0] + 0.1 * g[0], 0.9 * S.m[1] + 0.1 * g[1]];
            S.s = [0.999 * S.s[0] + 0.001 * g[0] * g[0], 0.999 * S.s[1] + 0.001 * g[1] * g[1]];
            const c1 = 1 - Math.pow(0.9, t), c2 = 1 - Math.pow(0.999, t);
            na = a - (eta * (S.m[0] / c1)) / (Math.sqrt(S.s[0] / c2) + 1e-8);
            nb = b - (eta * (S.m[1] / c1)) / (Math.sqrt(S.s[1] / c2) + 1e-8);
          }
          if (!isFinite(na) || !isFinite(nb) || Math.abs(na) > 200 || Math.abs(nb) > 200) R.blown = t;
          else R.path.push([na, nb]);
        });
      }
      return out;
    }
    function reset() {
      if (timer) timer.stop();
      timer = null;
      runs = null;
      again.hidden = true;
      note.textContent = "Press Race. Or click the map to choose a different starting point.";
      draw();
    }
    function play() {
      if (timer) timer.stop();
      runs = simulate();
      let shown = 0;
      again.hidden = batch === "all";
      timer = QP.loop((dt) => {
        shown = Math.min(150, shown + (QP.reduceMotion ? 150 : Math.max(1, Math.round(dt / 25))));
        draw(shown);
        if (shown >= 150) { finish(); return false; }
      });
    }
    function finish() {
      timer = null;
      const Ld = LANDS[land];
      const fin = runs.map((R, k) => ({ k, l: R.blown ? Infinity : Ld.f(...R.path[R.path.length - 1]) }));
      const blown = runs.map((R, k) => (R.blown ? OPTS[k].name : null)).filter(Boolean);
      const best = fin.filter((x) => isFinite(x.l)).sort((x, y) => x.l - y.l)[0];
      let s = "";
      if (blown.length) s += `${blown.join(" and ")} blew up: each step overshot the valley floor by more than the last. `;
      if (best) s += `Lowest loss after 150 steps: ${OPTS[best.k].name}.`;
      if (batch !== "all") s += " With noisy batch gradients nobody settles exactly at the bottom: they keep jiggling around it.";
      else if (land === "ravine" && !runs[0].blown && fin[0].l > 0.05) s += " Gradient descent is still crawling along the valley floor.";
      else if (land === "bumpy" && fin[0].l > 0.5) s += " Gradient descent got stuck in a small dip.";
      note.textContent = s;
    }
    function draw(shown = 0) {
      const Ld = LANDS[land];
      plot.clear();
      plot.region((a, b) => {
        const t = QP.math.clamp((Math.log(Ld.f(a, b) + 0.01) - Ld.lo) / (Ld.hi - Ld.lo), 0, 1);
        const shade = Math.floor(t * 14) % 2 ? 0.95 : 1;
        const c0 = [123, 92, 250], c1 = [127, 224, 196], c2 = [255, 250, 244];
        const mix = t < 0.5 ? c0.map((v, i) => v + (c1[i] - v) * (t / 0.5)) : c1.map((v, i) => v + (c2[i] - v) * ((t - 0.5) / 0.5));
        return [mix[0] * shade, mix[1] * shade, mix[2] * shade, 0.62];
      }, 4, land);
      plot.point(Ld.min[0], Ld.min[1], { r: 10, shape: "star", fill: C.butter, stroke: C.ink, lw: 2 });
      plot.point(start[0], start[1], { r: 7, fill: "#fff", stroke: C.ink, lw: 2.5 });
      if (runs) {
        runs.forEach((R, k) => {
          const pts = R.path.slice(0, shown + 1);
          plot.line(pts.map((p) => p[0]), pts.map((p) => p[1]), { color: "#fff", width: 4.5, alpha: 0.8 });
          plot.line(pts.map((p) => p[0]), pts.map((p) => p[1]), { color: OPTS[k].color, width: 2.4 });
          const last = pts[pts.length - 1];
          if (R.blown && shown >= R.path.length - 1) {
            const bx = QP.math.clamp(last[0], Ld.xlim[0], Ld.xlim[1]), by = QP.math.clamp(last[1], Ld.ylim[0], Ld.ylim[1]);
            plot.point(bx, by, { r: 8, fill: "#e5566b", stroke: "#fff", lw: 2.5 });
          } else plot.point(last[0], last[1], { r: 6.5, fill: OPTS[k].color, stroke: "#fff", lw: 2 });
          const l = Ld.f(...last);
          stats[k].set(R.blown && shown >= R.path.length - 1 ? "blew up" : l < 1e-3 ? "0.000" : l.toFixed(3), R.blown && shown >= R.path.length - 1 ? "bad" : "");
        });
      } else stats.forEach((s) => s.set("–", ""));
      sN.set(String(shown));
    }
    makePlot();
    reset();
  }

  // ---------------------------------------------------------------- early stopping
  function earlyStop() {
    const card = QP.widget("earlystop", "When to stop", "one real training run that overfits");
    if (!card) return;
    const ALPH = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    fetch(QP.asset("data/ml-w5d4-earlystop.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the training run. Try reloading the page.")));

    function build(D) {
      const E = D.valLoss.length - 1;
      const grids = D.grids.map((s) => Array.from(s, (ch) => ALPH.indexOf(ch) / D.levels));
      let ep = 0, patience = 20, timer = null, result = null;
      const left = h("div"), right = h("div");
      card.body.append(h("div", { class: "side-by-side even" }, left, right));
      left.append(h("div", { class: "kbd-hint" }, "The network's boundary and its 40 training points"));
      const map = new QP.Plot(left, { xlim: D.xlim, ylim: D.ylim, aspect: 0.72, minH: 220, maxH: 330 });
      const epLab = map.label("epoch 0");
      right.append(h("div", { class: "kbd-hint" }, "Loss on the training points and on 300 validation points"));
      const chart = QP.chart(right, { xlim: [0, E], ylim: [0, 0.7], xstep: 100, ystep: 0.1, xlabel: "epochs trained", ylabel: "loss", aspect: 0.72, minH: 220, maxH: 330 });
      const pS = ui.slider({ label: "patience (epochs)", min: 1, max: 60, step: 1, value: patience, fmt: (v) => String(v), color: C.ml, oninput: (v) => { patience = v; result = null; ep = 0; eS.set(0); draw(); } });
      const eS = ui.slider({ label: "epoch", min: 0, max: E, step: 1, value: 0, fmt: (v) => String(v), oninput: (v) => { stopTimer(); ep = v; draw(); } });
      const trainB = ui.button("Train with early stopping", () => run(true), "btn ml small");
      const fullB = ui.button("Train all 400 epochs", () => run(false), "btn soft small");
      const sBest = ui.stat("lowest validation loss at", "–"), sStop = ui.stat("stopped at", "–"), sAcc = ui.stat("test accuracy at the best epoch", "–"), sEnd = ui.stat("test accuracy after 400", "–");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
      card.body.append(h("div", { class: "controls col" }, pS, eS), h("div", { class: "btn-row", style: { marginTop: "8px" } }, trainB, fullB), h("div", { class: "readout" }, sBest, sStop, sAcc, sEnd), note);
      map.onresize = draw;
      chart.onresize = draw;

      function where(pat) {
        let best = Infinity, be = 0, w = 0;
        for (let e = 0; e <= E; e++) {
          if (D.valLoss[e] < best) { best = D.valLoss[e]; be = e; w = 0; }
          else if (++w >= pat) return { best: be, stop: e };
        }
        return { best: be, stop: E };
      }
      function stopTimer() { if (timer) timer.stop(); timer = null; }
      function run(early) {
        stopTimer();
        const target = early ? where(patience) : { best: where(1e9).best, stop: E };
        result = null;
        ep = 0;
        timer = QP.loop((dt) => {
          ep = Math.min(target.stop, ep + (QP.reduceMotion ? 1000 : Math.max(1, Math.round(dt / 12))));
          eS.set(ep);
          draw();
          if (ep >= target.stop) {
            timer = null;
            result = { ...target, early };
            draw();
            return false;
          }
        });
      }
      function prob(x, y) {
        const g = grids[Math.min(grids.length - 1, Math.round(ep / D.gridEvery))];
        const fx = ((x - D.xlim[0]) / (D.xlim[1] - D.xlim[0])) * (D.gw - 1), fy = ((D.ylim[1] - y) / (D.ylim[1] - D.ylim[0])) * (D.gh - 1);
        const i = QP.math.clamp(Math.floor(fx), 0, D.gw - 2), j = QP.math.clamp(Math.floor(fy), 0, D.gh - 2);
        const u = QP.math.clamp(fx - i, 0, 1), v = QP.math.clamp(fy - j, 0, 1);
        const at = (ii, jj) => g[jj * D.gw + ii];
        return (1 - v) * ((1 - u) * at(i, j) + u * at(i + 1, j)) + v * ((1 - u) * at(i, j + 1) + u * at(i + 1, j + 1));
      }
      function draw() {
        const gi = Math.min(grids.length - 1, Math.round(ep / D.gridEvery));
        map.clear();
        map.region((x, y) => QP.blend2(prob(x, y), 0.85), 4, `g${gi}-${map.w}`);
        for (const [x, y, c] of D.train) map.point(x, y, { r: 5.5, fill: QP.classColor(c), stroke: "#fff", lw: 1.6 });
        epLab.textContent = `epoch ${ep}`;
        const xs = D.trainLoss.map((_, i) => i);
        chart.marker = ep;
        chart.draw([
          { name: "training loss", x: xs.slice(0, ep + 1), y: D.trainLoss.slice(0, ep + 1), color: C.ml, width: 2.5 },
          { name: "validation loss", x: xs.slice(0, ep + 1), y: D.valLoss.slice(0, ep + 1), color: C.qc, width: 2.5 },
        ]);
        if (result) {
          chart.point(result.best, D.valLoss[result.best], { r: 9, shape: "star", fill: C.butter, stroke: C.ink, lw: 2 });
          if (result.early) chart.text("stop", result.stop, Math.min(0.66, D.valLoss[result.stop] + 0.07), { color: "#e5566b", size: 12 });
        }
        if (result) {
          sBest.set(`epoch ${result.best}`);
          sStop.set(result.early ? `epoch ${result.stop}` : "never");
          sAcc.set(`${(D.testAcc[result.best] * 100).toFixed(1)}<small>%</small>`, D.testAcc[result.best] > 0.84 ? "good" : "");
          sEnd.set(`${(D.testAcc[E] * 100).toFixed(1)}<small>%</small>`, "bad");
          note.textContent = result.early
            ? `Validation loss hadn't improved for ${patience} epoch${patience === 1 ? "" : "s"}, so training stopped at epoch ${result.stop} and put back the weights from epoch ${result.best}.` + (result.best < 60 ? " That was too impatient: the validation loss was only resting on a flat stretch, and it would have dropped further." : " Drag the epoch slider to compare the boundaries at the best epoch and at the end.")
            : `Training loss kept falling all the way, but validation loss bottomed out at epoch ${result.best} and then climbed: after that the boundary bends around single noisy points. Drag the epoch slider to see it.`;
        } else {
          [sBest, sStop, sAcc, sEnd].forEach((s) => s.set("–", ""));
          note.textContent = timer ? "Training… one epoch is one pass through the 40 training points, in batches of 8." : `Test accuracy right now: ${(D.testAcc[ep] * 100).toFixed(1)}%. Press a Train button.`;
        }
      }
      draw();
    }
  }
})();

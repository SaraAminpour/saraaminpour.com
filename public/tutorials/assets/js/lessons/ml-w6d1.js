/* ml-w6d1: k-means step by step, the elbow, random vs k-means++ starts, and data shapes where k-means fails. */
(function () {
  const { h, ui } = QP;
  const PAL = [[123, 92, 250], [23, 169, 140], [255, 138, 80], [90, 169, 242], [228, 95, 163], [240, 172, 46], [92, 92, 120], [150, 200, 90]];
  const hex = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("kmeans", "Watch k-means think", "Step or Play");
    if (!card) return;
    const C = QP.colors;
    const DATA = {
      blobs: { label: "4 round blobs", k: 4, make: () => QP.data.blobs(180, [[-1.3, 0.9], [1.2, 1.0], [-0.9, -1.0], [1.3, -0.9]], 0.38, 23) },
      stripes: { label: "3 long stripes", k: 3, make: () => stripes() },
      moons: { label: "2 moons", k: 2, make: () => QP.data.moons(180, 0.09, 5).map((q) => ({ x: q.x * 1.7 - 0.1, y: q.y * 1.9 })) },
    };
    function stripes() {
      // three long, thin, parallel clusters: their own centers are closer across stripes than along them
      const r = QP.rng(31), out = [];
      const d = [Math.cos(0.5), Math.sin(0.5)], nrm = [-d[1], d[0]];
      for (let i = 0; i < 240; i++) {
        const j = i % 3, t = 1.0 * r.normal(), u = 0.08 * r.normal() + (j - 1) * 0.8;
        out.push({ x: t * d[0] + u * nrm[0], y: t * d[1] + u * nrm[1] });
      }
      return out;
    }
    let ds = "blobs", pts = DATA.blobs.make().map((q) => ({ x: q.x, y: q.y }));
    let k = 4, cents = [], assign = null, phase = "assign", trails = [], playing = null, rngSeed = 3;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [-2.4, 2.4], ylim: [-2.1, 2.1], aspect: 0.86, equal: true, minH: 280, maxH: 440 });
    right.append(h("div", { class: "kbd-hint" }, "Inertia for each k (the elbow)"));
    const chart = QP.chart(right, { xlim: [0.5, 8.5], ylim: [0, 1], aspect: 0.7, minH: 200, maxH: 280, xstep: 1, xlabel: "k", ylabel: "inertia" });
    const dSeg = ui.seg({ label: "Data", options: Object.keys(DATA).map((key) => ({ value: key, label: DATA[key].label })), value: ds, onchange: (v) => { ds = v; pts = DATA[v].make().map((q) => ({ x: q.x, y: q.y })); k = DATA[v].k; kS.set(k); computeElbow(); start(true); } });
    const kS = ui.slider({ label: "k", min: 1, max: 8, step: 1, value: k, oninput: (v) => { k = v; start(true); } });
    const stepB = ui.button("Step: assign", () => step(), "btn ml small");
    const playB = ui.button("Play", () => toggle(), "btn soft small");
    const randB = ui.button("Random start", () => { rngSeed++; start(false); }, "btn soft small");
    const ppB = ui.button("Smart start (k-means++)", () => { rngSeed++; start(true); }, "btn soft small");
    const sI = ui.stat("inertia", "–"), sIt = ui.stat("moves", "0");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    right.append(h("div", { class: "readout" }, sI, sIt));
    card.body.append(h("div", { class: "controls col" }, dSeg, kS), h("div", { class: "btn-row", style: { marginTop: "10px" } }, stepB, playB, randB, ppB), note);

    // elbow curve: best of several k-means++ runs per k
    let elbow = [];
    function computeElbow() {
      elbow = [];
      for (let kk = 1; kk <= 8; kk++) {
        let best = Infinity;
        for (let s = 0; s < 6; s++) {
          let c = QP.ml.kmeansPP(pts, kk, 100 + 7 * s + kk);
          for (let it = 0; it < 30; it++) c = QP.ml.kmeansUpdate(pts, QP.ml.kmeansAssign(pts, c), c);
          best = Math.min(best, QP.ml.inertia(pts, QP.ml.kmeansAssign(pts, c), c));
        }
        elbow.push(best);
      }
      chart.o.ylim = [0, elbow[0] * 1.05];
      chart.o.ystep = Math.pow(10, Math.floor(Math.log10(elbow[0] / 3)));
    }
    computeElbow();
    let moves = 0, startKind = "random", converged = false;

    function start(smart) {
      stop();
      startKind = smart ? "smart" : "random";
      const r = QP.rng(rngSeed * 97 + k);
      cents = smart ? QP.ml.kmeansPP(pts, k, rngSeed * 13 + k) : Array.from({ length: k }, () => ({ x: -2 + 4 * r(), y: -1.8 + 3.6 * r() }));
      trails = cents.map((c) => [{ x: c.x, y: c.y }]);
      assign = null;
      phase = "assign";
      moves = 0;
      converged = false;
      stepB.textContent = "Step: assign";
      draw();
    }
    function step() {
      if (phase === "assign") {
        assign = QP.ml.kmeansAssign(pts, cents);
        phase = "update";
        stepB.textContent = "Step: update";
        draw();
        return true;
      }
      const next = QP.ml.kmeansUpdate(pts, assign, cents);
      const moved = next.some((c, j) => Math.hypot(c.x - cents[j].x, c.y - cents[j].y) > 1e-4);
      if (!moved) converged = true;
      const from = cents.map((c) => ({ ...c }));
      phase = "assign";
      stepB.textContent = "Step: assign";
      moves++;
      QP.animate(QP.reduceMotion ? 1 : 380, (e) => {
        cents = from.map((c, j) => ({ x: c.x + (next[j].x - c.x) * e, y: c.y + (next[j].y - c.y) * e }));
        draw();
      }, () => {
        cents = next;
        trails.forEach((t, j) => t.push({ x: next[j].x, y: next[j].y }));
        draw();
      });
      return moved;
    }
    function toggle() {
      if (playing) return stop();
      playB.textContent = "Pause";
      playing = true;
      const tick = () => {
        if (!playing) return;
        const was = phase;
        const moved = step();
        if (was === "update" && !moved) {
          stop();
          QP.toast("Converged: the centers stopped moving.", "ui-star");
          converged = true;
          draw();
          return;
        }
        setTimeout(tick, was === "update" ? 520 : 380);
      };
      tick();
    }
    function stop() {
      playing = false;
      playB.textContent = "Play";
    }
    function draw() {
      plot.clear();
      if (cents.length) {
        plot.region((x, y) => {
          let best = 0, bd = Infinity;
          cents.forEach((c, j) => {
            const d = (x - c.x) ** 2 + (y - c.y) ** 2;
            if (d < bd) { bd = d; best = j; }
          });
          const c = PAL[best];
          return [c[0], c[1], c[2], 0.13];
        }, 6, null);
      }
      for (const [j, t] of trails.entries()) if (t.length > 1) plot.line(t.map((p) => p.x), t.map((p) => p.y), { color: hex(PAL[j]), width: 2, dash: [4, 4] });
      pts.forEach((p, i) => plot.point(p.x, p.y, { r: 4.4, fill: assign ? hex(PAL[assign[i]]) : "#bcb7cb", stroke: "#fff", lw: 1.2 }));
      cents.forEach((c, j) => plot.point(c.x, c.y, { r: 12, shape: "star", fill: hex(PAL[j]), stroke: C.ink, lw: 2 }));
      const a = assign || QP.ml.kmeansAssign(pts, cents);
      const inert = QP.ml.inertia(pts, a, cents);
      sI.set(inert.toFixed(1));
      sIt.set(String(moves));
      chart.marker = k;
      chart.draw([{ x: [1, 2, 3, 4, 5, 6, 7, 8], y: elbow, color: C.qc, points: true, r: 4, name: "best inertia found for each k" }]);
      chart.point(k, inert, { r: 7, fill: C.c0, stroke: "#fff", lw: 2 });
      const stuck = inert > elbow[k - 1] * 1.15;
      note.textContent = !converged ? (startKind === "smart" ? "k-means++ start: each new star is placed far from the others. Press Step or Play." : "Random start: the stars are dropped anywhere. Press Step or Play.")
        : stuck ? `Converged, but stuck: this inertia is ${Math.round((inert / elbow[k - 1] - 1) * 100)}% above the best one found for k = ${k}. A different start would do better.`
        : ds === "stripes" && k === 3 ? "Converged, with low inertia, yet the clusters cut across the stripes: k-means assumes round groups. Tomorrow's Gaussian mixtures can stretch."
        : ds === "moons" && k === 2 ? "Converged, but each cluster takes half of both moons: no straight cut can follow a curved shape."
        : "Converged: the centers stopped moving.";
    }
    plot.onresize = draw;
    chart.onresize = draw;
    start(false);
  }
})();

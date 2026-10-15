/* ml-w6d2: Gaussian mixtures fitted by EM. Ellipses show each blob's shape; the E-step colors every point by
   its probabilities, the M-step re-fits each blob from its weighted points; the log-likelihood climbs. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PAL = [[123, 92, 250], [23, 169, 140], [255, 138, 80], [90, 169, 242], [228, 95, 163]];
  const hex = (c) => `rgb(${c.map((v) => Math.round(v)).join(",")})`;
  QP.onReady(() => widget());

  function stripes() {
    const r = QP.rng(31), out = [];
    const d = [Math.cos(0.5), Math.sin(0.5)], nrm = [-d[1], d[0]];
    for (let i = 0; i < 240; i++) {
      const j = i % 3, t = 1.0 * r.normal(), u = 0.08 * r.normal() + (j - 1) * 0.8;
      out.push({ x: t * d[0] + u * nrm[0], y: t * d[1] + u * nrm[1] });
    }
    return out;
  }
  const DATA = {
    stripes: { label: "3 long stripes", make: stripes },
    overlap: { label: "3 overlapping blobs", make: () => QP.data.blobs(240, [[-0.9, -0.6], [0.9, -0.3], [0.0, 0.9]], 0.5, 12).map((p) => ({ x: p.x, y: p.y })) },
  };

  // a 2D Gaussian with covariance [[a, b], [b, c]]
  function pdf(p, g) {
    const dx = p.x - g.mx, dy = p.y - g.my, det = g.a * g.c - g.b * g.b;
    const q = (g.c * dx * dx - 2 * g.b * dx * dy + g.a * dy * dy) / det;
    return Math.exp(-0.5 * q) / (2 * Math.PI * Math.sqrt(det));
  }

  function widget() {
    const card = QP.widget("gmm", "Fit a Gaussian mixture with EM", "E-step, M-step, repeat");
    if (!card) return;
    let ds = "stripes", pts = DATA.stripes.make(), k = 3, G = [], R = null, iter = 0, hist = [], phase = "E", playing = false, seed = 10;
    const bestKnown = {};
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [-2.4, 2.4], ylim: [-2.1, 2.1], aspect: 0.86, equal: true, minH: 280, maxH: 440 });
    right.append(h("div", { class: "kbd-hint" }, "Average log-likelihood per point"));
    const chart = QP.chart(right, { xlim: [0, 30], ylim: [-3, 0], aspect: 0.7, minH: 180, maxH: 260, xlabel: "EM steps", ylabel: "log-likelihood" });
    const sL = ui.stat("log-likelihood", "–"), sN = ui.stat("EM steps", "0"), sU = ui.stat("unsure points (< 80%)", "–");
    right.append(h("div", { class: "readout" }, sL, sN, sU));
    const dSeg = ui.seg({ label: "Data", options: Object.keys(DATA).map((key) => ({ value: key, label: DATA[key].label })), value: ds, onchange: (v) => { ds = v; pts = DATA[v].make(); init(); } });
    const kS = ui.slider({ label: "blobs k", min: 1, max: 5, step: 1, value: k, oninput: (v) => { k = v; init(); } });
    const eB = ui.button("E-step", () => step("E"), "btn soft small");
    const mB = ui.button("M-step", () => step("M"), "btn soft small");
    const playB = ui.button("Play", () => toggle(), "btn ml small");
    const newB = ui.button("New start", () => { seed++; init(); }, "btn soft small");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls col" }, dSeg, kS), h("div", { class: "btn-row", style: { marginTop: "10px" } }, eB, mB, playB, newB), note);
    plot.onresize = draw;
    chart.onresize = draw;

    const startFrom = (sd) => {
      const r = QP.rng(sd * 101 + k);
      return r.shuffle(pts.map((_, i) => i)).slice(0, k).map((i) => ({ mx: pts[i].x, my: pts[i].y, a: 0.35, b: 0, c: 0.35, w: 1 / k }));
    };
    // the best log-likelihood that several quiet starts reach, to tell a good fit from a local maximum
    function best() {
      const key = `${ds}-${k}`;
      if (bestKnown[key] == null) {
        const keep = G, keepR = R;
        let top = -Infinity;
        for (let sd = 200; sd < 210; sd++) {
          G = startFrom(sd);
          for (let it = 0; it < 80; it++) { eStep(); mStep(); }
          top = Math.max(top, loglik());
        }
        G = keep;
        R = keepR;
        bestKnown[key] = top;
      }
      return bestKnown[key];
    }
    function init() {
      stop();
      G = startFrom(seed);
      R = null; iter = 0; hist = []; phase = "E";
      note.textContent = "Each blob starts round, on a random point. Press E-step, then M-step, or Play.";
      draw();
    }
    function eStep() {
      R = pts.map((p) => {
        const v = G.map((g) => g.w * pdf(p, g));
        const s = v.reduce((x, y) => x + y, 0) || 1e-300;
        return v.map((x) => x / s);
      });
    }
    function mStep() {
      G = G.map((g, j) => {
        let n = 0, mx = 0, my = 0;
        pts.forEach((p, i) => { n += R[i][j]; mx += R[i][j] * p.x; my += R[i][j] * p.y; });
        if (n < 1e-6) return g;
        mx /= n; my /= n;
        let a = 0, b = 0, c = 0;
        pts.forEach((p, i) => { const dx = p.x - mx, dy = p.y - my; a += R[i][j] * dx * dx; b += R[i][j] * dx * dy; c += R[i][j] * dy * dy; });
        return { mx, my, a: a / n + 1e-4, b: b / n, c: c / n + 1e-4, w: n / pts.length };
      });
    }
    const loglik = () => pts.reduce((s, p) => s + Math.log(G.reduce((t, g) => t + g.w * pdf(p, g), 0) + 1e-300), 0) / pts.length;
    function step(which) {
      if (which === "E") {
        eStep();
        phase = "M";
        note.textContent = "E-step: each point now has a probability for every blob (its color is the blend). The blobs haven't moved.";
      } else {
        if (!R) eStep();
        mStep();
        iter++;
        hist.push(loglik());
        phase = "E";
        const d = hist.length > 1 ? hist[hist.length - 1] - hist[hist.length - 2] : null;
        note.textContent = d != null && d < 1e-4 ? convergedText() : "M-step: each blob moved to the weighted mean of its points and took their shape (the weights are the probabilities).";
      }
      draw();
    }
    function convergedText(done = true) {
      const now = hist[hist.length - 1], top = best();
      const where = done ? "Converged" : `Still creeping up after ${iter} steps`;
      return now < top - 0.02
        ? `${where}, but stuck near a local maximum: log-likelihood ${now.toFixed(3)}, while other starts reach ${top.toFixed(3)}. Press New start.`
        : `${where}: no other start does better.`;
    }
    function toggle() {
      if (playing) return stop();
      playing = true;
      playB.textContent = "Pause";
      const tick = () => {
        if (!playing) return;
        step("E");
        step("M");
        const d = hist.length > 1 ? hist[hist.length - 1] - hist[hist.length - 2] : 1;
        if (d < 1e-4 || iter >= 60) { stop(); note.textContent = convergedText(d < 1e-4); return; }
        setTimeout(tick, QP.reduceMotion ? 10 : 260);
      };
      tick();
    }
    function stop() { playing = false; playB.textContent = "Play"; }
    function ellipse(g, sc) {
      const tr = (g.a + g.c) / 2, dd = Math.sqrt(((g.a - g.c) / 2) ** 2 + g.b * g.b);
      const l1 = tr + dd, l2 = Math.max(1e-9, tr - dd), ang = 0.5 * Math.atan2(2 * g.b, g.a - g.c);
      const xs = [], ys = [];
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * 2 * Math.PI, u = sc * Math.sqrt(l1) * Math.cos(t), v = sc * Math.sqrt(l2) * Math.sin(t);
        xs.push(g.mx + u * Math.cos(ang) - v * Math.sin(ang));
        ys.push(g.my + u * Math.sin(ang) + v * Math.cos(ang));
      }
      return [xs, ys];
    }
    function draw() {
      plot.clear();
      let unsure = 0;
      pts.forEach((p, i) => {
        let fill = "#bcb7cb", stroke = "#fff", lw = 1.2;
        if (R) {
          const rgb = [0, 0, 0];
          R[i].forEach((v, j) => PAL[j].forEach((ch, q) => (rgb[q] += ch * v)));
          fill = hex(rgb);
          if (Math.max(...R[i]) < 0.8) { unsure++; stroke = C.ink; lw = 1.8; }
        }
        plot.point(p.x, p.y, { r: 4.2, fill, stroke, lw });
      });
      G.forEach((g, j) => {
        for (const [sc, wd] of [[1, 2.6], [2, 1.4]]) {
          const [xs, ys] = ellipse(g, sc);
          plot.line(xs, ys, { color: hex(PAL[j]), width: wd, dash: sc === 2 ? [5, 4] : null });
        }
        plot.point(g.mx, g.my, { r: 7 + 10 * g.w, fill: hex(PAL[j]), stroke: C.ink, lw: 2 });
      });
      sL.set(hist.length ? hist[hist.length - 1].toFixed(3) : loglik().toFixed(3));
      sN.set(String(iter));
      sU.set(R ? String(unsure) : "–");
      eB.classList.toggle("ml", phase === "E");
      mB.classList.toggle("ml", phase === "M");
      const ys = hist.length ? hist : [loglik()];
      const lo = Math.min(...ys), hi = Math.max(...ys);
      chart.o.ylim = [Math.floor((lo - 0.1) * 2) / 2, Math.ceil((hi + 0.1) * 2) / 2];
      chart.o.xlim = [0, Math.max(10, iter + 2)];
      chart.draw([{ x: ys.map((_, i) => i + (hist.length ? 1 : 0)), y: ys, color: C.ml, points: true, r: 3.5, width: 2.5 }]);
    }
    init();
  }
})();

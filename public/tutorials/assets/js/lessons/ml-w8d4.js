/* ml-w8d4: t-SNE, live. 400 digits (64 pixels each, exported by tools/data_ml_w8d4.py) are placed at random
   and pulled into a map where 64-dimensional neighbors stay neighbors. Same algorithm as van der Maaten and
   Hinton (2008), with early exaggeration, momentum and per-coordinate gains. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PAL = ["#ff8a50", "#5577f5", "#17a98c", "#e45fa3", "#7b5cfa", "#f0ac2e", "#5aa9f2", "#c08a5a", "#2c2842", "#9bd36b"];
  QP.onReady(() => widget());

  // conditional probabilities p(j|i) with each point's bandwidth set so its perplexity matches
  function affinities(D, n, perp) {
    const P = new Float64Array(n * n);
    const target = Math.log(perp);
    for (let i = 0; i < n; i++) {
      let beta = 1, lo = -Infinity, hi = Infinity;
      for (let it = 0; it < 60; it++) {
        let sum = 0, hsum = 0;
        for (let j = 0; j < n; j++) {
          const p = j === i ? 0 : Math.exp(-D[i * n + j] * beta);
          P[i * n + j] = p;
          sum += p;
          hsum += D[i * n + j] * p;
        }
        const H = Math.log(sum) + (beta * hsum) / sum; // entropy in nats
        for (let j = 0; j < n; j++) P[i * n + j] /= sum;
        if (Math.abs(H - target) < 1e-5) break;
        if (H > target) { lo = beta; beta = hi === Infinity ? beta * 2 : (beta + hi) / 2; }
        else { hi = beta; beta = lo === -Infinity ? beta / 2 : (beta + lo) / 2; }
      }
    }
    const S = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) S[i * n + j] = Math.max((P[i * n + j] + P[j * n + i]) / (2 * n), 1e-100);
    return S;
  }

  function widget() {
    const card = QP.widget("tsne", "Draw a map of 400 digits", "hover a dot to see its digit");
    if (!card) return;
    fetch(QP.asset("data/ml-w8d4-tsne.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the digits. Try reloading the page.")));

    function build(DATA) {
      const n = DATA.labels.length;
      const X = DATA.digits.map((s) => Array.from(s, (c) => parseInt(c, 17) / 16));
      const D = new Float64Array(n * n);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let d = 0;
        for (let k = 0; k < 64; k++) d += (X[i][k] - X[j][k]) ** 2;
        D[i * n + j] = D[j * n + i] = d;
      }
      let perp = 30, P = null, Y, step, gains, iter = 0, seed = 1, showPca = false, hover = null, running = false;
      const host = h("div");
      const plot = new QP.Plot(host, { xlim: [-1, 1], ylim: [-1, 1], aspect: 0.7, maxH: 440, grid: false, pad: 10 });
      const perpS = ui.seg({ label: "Perplexity", options: [3, 10, 30, 80], value: perp, onchange: (v) => { perp = v; restart(true); } });
      const again = ui.button("New random start", () => { seed++; restart(false); }, "btn ml small");
      const pcaT = ui.toggle({ label: "Show the PCA view instead", onchange: (v) => { showPca = v; draw(); } });
      const sI = ui.stat("Steps", "0");
      const peek = h("canvas", { class: "ts-peek", width: 64, height: 64 });
      const peekLab = h("div", { class: "small muted" }, "hover a dot");
      const legend = h("div", { class: "legend" }, ...PAL.map((c, d) => h("span", null, h("i", { style: { background: c } }), String(d))));
      card.body.append(h("div", { class: "controls" }, perpS, again, pcaT), host, legend,
        h("div", { class: "readout" }, sI, h("div", { class: "stat ts-peek-box" }, h("span", { class: "k" }, "This dot"), h("div", { class: "ts-peek-row" }, peek, peekLab))));
      plot.onresize = draw;
      const near = (p) => {
        const Z = coords();
        let bi = -1, bd = Infinity;
        Z.forEach(([x, y], i) => { const d = plot.pxDist({ x, y }, p); if (d < bd) { bd = d; bi = i; } });
        hover = bd < 14 ? bi : null;
        showPeek();
        draw();
      };
      plot.on({ hover: near, down: near, drag: near, leave: () => { hover = null; showPeek(); draw(); } });

      function restart(newP) {
        if (newP || !P) P = affinities(D, n, perp);
        const r = QP.rng(seed);
        Y = Array.from({ length: n }, () => [r.normal() * 1e-4, r.normal() * 1e-4]);
        step = Array.from({ length: n }, () => [0, 0]);
        gains = Array.from({ length: n }, () => [1, 1]);
        iter = 0;
        if (!running) { running = true; requestAnimationFrame(tick); }
      }
      function gradStep() {
        const num = new Float64Array(n * n);
        let qsum = 0;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const dx = Y[i][0] - Y[j][0], dy = Y[i][1] - Y[j][1];
          const q = 1 / (1 + dx * dx + dy * dy);
          num[i * n + j] = num[j * n + i] = q;
          qsum += 2 * q;
        }
        const exag = iter < 100 ? 4 : 1, mom = iter < 250 ? 0.5 : 0.8;
        let mx = 0, my = 0;
        for (let i = 0; i < n; i++) {
          let gx = 0, gy = 0;
          for (let j = 0; j < n; j++) {
            if (j === i) continue;
            const q = num[i * n + j];
            const m = 4 * (exag * P[i * n + j] - q / qsum) * q;
            gx += m * (Y[i][0] - Y[j][0]);
            gy += m * (Y[i][1] - Y[j][1]);
          }
          [gx, gy].forEach((g, d) => {
            gains[i][d] = Math.sign(g) === Math.sign(step[i][d]) ? gains[i][d] * 0.8 : gains[i][d] + 0.2;
            gains[i][d] = Math.max(gains[i][d], 0.01);
            step[i][d] = mom * step[i][d] - 10 * gains[i][d] * g;
            Y[i][d] += step[i][d];
          });
          mx += Y[i][0];
          my += Y[i][1];
        }
        for (const y of Y) { y[0] -= mx / n; y[1] -= my / n; }
        iter++;
      }
      function tick() {
        const t0 = performance.now();
        while (iter < 800 && performance.now() - t0 < 14) gradStep();
        draw();
        if (iter < 800 && document.contains(host)) requestAnimationFrame(tick);
        else running = false;
      }
      const coords = () => (showPca ? DATA.pca : Y);
      function draw() {
        if (!Y) return;
        const Z = coords();
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [x, y] of Z) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        // equal scales on both axes, with a margin
        const sx = (x1 - x0 || 1e-6) / plot.pw, sy = (y1 - y0 || 1e-6) / plot.ph, s = Math.max(sx, sy) * 1.08;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        plot.o.xlim = [cx - (s * plot.pw) / 2, cx + (s * plot.pw) / 2];
        plot.o.ylim = [cy - (s * plot.ph) / 2, cy + (s * plot.ph) / 2];
        plot.clear();
        Z.forEach(([x, y], i) => plot.point(x, y, { r: 3.6, fill: PAL[DATA.labels[i]], stroke: "#fff", lw: 0.8 }));
        if (hover != null) plot.point(Z[hover][0], Z[hover][1], { r: 7, fill: "none", stroke: C.ink, lw: 2.2 });
        sI.set(showPca ? "PCA" : String(iter));
      }
      function showPeek() {
        const ctx = peek.getContext("2d");
        ctx.clearRect(0, 0, 64, 64);
        if (hover == null) { peekLab.textContent = "hover a dot"; return; }
        X[hover].forEach((v, k) => {
          ctx.fillStyle = `rgba(84, 39, 143, ${v})`;
          ctx.fillRect((k % 8) * 8, Math.floor(k / 8) * 8, 8, 8);
        });
        peekLab.innerHTML = `a <b style="color:${PAL[DATA.labels[hover]]}">${DATA.labels[hover]}</b>`;
      }
      restart(true);
    }
  }
})();

/* w3d3: a neural-network playground that trains live in the browser. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("nn", "Network playground", "press Train");
    if (!card) return;
    const C = QP.colors;
    const makers = {
      moons: () => QP.data.moons(160, 0.11, 3).map((p) => ({ x: p.x, y: p.y * 1.4, c: p.c })),
      circles: () => QP.data.circles(160, 0.07, 0.45, 5).map((p) => ({ x: p.x * 1.2, y: p.y * 1.2, c: p.c })),
      spiral: () => QP.data.spiral(220, 0.04, 6).map((p) => ({ x: p.x * 1.35, y: p.y * 1.35, c: p.c })),
      xor: () => QP.data.xor(160, 0.17, 8).map((p) => ({ x: p.x * 1.4, y: p.y * 1.4, c: p.c })),
    };
    let dsName = "moons", pts = makers.moons();
    let layers = 1, width = 4, act = "tanh", lr = 0.03, seed = 1;
    let net, epoch, losses, running = null, frame = 0;

    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [-1.8, 1.8], ylim: [-1.6, 1.6], aspect: 0.9, equal: true, minH: 280, maxH: 440 });
    right.append(h("div", { class: "kbd-hint" }, "The network (what each hidden neuron 'sees')"));
    const netStage = h("div", { class: "widget-stage", style: { background: "#fcfbff" } });
    const netCv = h("canvas");
    netStage.appendChild(netCv);
    right.append(netStage);
    right.append(h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "Training loss"));
    const chart = QP.chart(right, { xlim: [0, 600], ylim: [0, 0.8], aspect: 0.32, minH: 120, maxH: 160, ystep: 0.2 });
    const sEp = ui.stat("epoch", "0"), sLoss = ui.stat("loss", "–"), sAcc = ui.stat("accuracy", "–");
    const trainB = ui.button("Train", () => toggle(), "btn ml small");
    const resetB = ui.button("New random start", () => { seed++; reset(); }, "btn soft small");
    const dsSeg = ui.seg({ label: "Data", options: [{ value: "moons", label: "Moons" }, { value: "circles", label: "Circles" }, { value: "spiral", label: "Spiral" }, { value: "xor", label: "XOR" }], value: dsName, onchange: (v) => { dsName = v; pts = makers[v](); reset(); } });
    const lSeg = ui.seg({ label: "Hidden layers", options: [1, 2], value: layers, onchange: (v) => { layers = v; reset(); } });
    const aSeg = ui.seg({ label: "Activation", options: [{ value: "tanh", label: "tanh" }, { value: "relu", label: "ReLU" }], value: act, onchange: (v) => { act = v; reset(); } });
    const wS = ui.slider({ label: "neurons per layer", min: 1, max: 12, step: 1, value: width, oninput: (v) => { width = v; reset(); } });
    const lrS = ui.slider({ label: "learning rate", min: -2.5, max: -0.5, step: 0.05, value: Math.log10(lr), fmt: (v) => Math.pow(10, v).toFixed(3), oninput: (v) => (lr = Math.pow(10, v)) });
    card.body.append(
      h("div", { class: "controls" }, dsSeg, lSeg, aSeg),
      h("div", { class: "controls" }, wS, lrS),
      h("div", { class: "controls" }, trainB, resetB),
      h("div", { class: "readout" }, sEp, sLoss, sAcc)
    );

    function reset() {
      stop();
      const sizes = [2, ...Array(layers).fill(width), 1];
      net = QP.ml.mlp(sizes, act, seed * 17 + 3);
      epoch = 0;
      losses = [];
      drawAll(true);
    }
    function toggle() {
      if (running) return stop();
      trainB.textContent = "Pause";
      running = QP.loop(() => {
        let l = 0;
        for (let i = 0; i < 5; i++) {
          l = net.step(pts, lr);
          epoch++;
        }
        losses.push(l);
        frame++;
        drawAll(frame % 3 === 0);
        if (epoch >= 6000) {
          stop();
          return false;
        }
      });
    }
    function stop() {
      if (running) running.stop();
      running = null;
      trainB.textContent = "Train";
    }
    function drawAll(withNet) {
      plot.clear();
      plot.region((x, y) => QP.blend2(net.predict(x, y), 0.85), 7, null);
      for (const p of pts) {
        const ok = (net.predict(p.x, p.y) > 0.5 ? 1 : 0) === p.c;
        plot.point(p.x, p.y, { r: 4.6, fill: QP.classColor(p.c), stroke: ok ? "#fff" : C.ink, lw: ok ? 1.3 : 2 });
      }
      if (withNet) drawNet();
      const N = losses.length;
      const xs = losses.map((_, i) => i * 5);
      chart.o.xlim = [0, Math.max(600, N * 5)];
      chart.o.ylim = [0, Math.max(0.3, Math.min(1.2, Math.max(0.01, ...losses.slice(0, 40)) * 1.1))];
      chart.draw(N ? [{ x: xs, y: losses, color: C.qc, width: 2.5 }] : []);
      sEp.set(String(epoch));
      sLoss.set(N ? losses[N - 1].toFixed(3) : "–");
      sAcc.set((net.accuracy(pts) * 100).toFixed(0) + "%");
    }

    // ---- network diagram with mini-maps of hidden neurons
    function drawNet() {
      const r = Math.min(2.5, window.devicePixelRatio || 1);
      const W = Math.max(240, netStage.clientWidth);
      const H = 250;
      netCv.width = W * r;
      netCv.height = H * r;
      netCv.style.height = H + "px";
      const ctx = netCv.getContext("2d");
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const sizes = net.sizes;
      const L = sizes.length;
      const colX = (l) => 30 + ((W - 60) * l) / (L - 1);
      const nodeR = (l) => (l === 0 || l === L - 1 ? 13 : Math.max(9, Math.min(17, 95 / sizes[l])));
      const rowY = (l, j) => {
        const n = sizes[l];
        const gap = Math.min(40, (H - 30) / n);
        return H / 2 + (j - (n - 1) / 2) * gap;
      };
      // edges
      for (let l = 0; l < L - 1; l++) {
        for (let j = 0; j < sizes[l + 1]; j++) {
          for (let i = 0; i < sizes[l]; i++) {
            const w = net.W[l][j][i];
            ctx.strokeStyle = w >= 0 ? "rgba(85,119,245,0.55)" : "rgba(255,138,80,0.6)";
            ctx.lineWidth = 0.4 + Math.min(4, Math.abs(w) * 1.6);
            ctx.beginPath();
            ctx.moveTo(colX(l), rowY(l, i));
            ctx.lineTo(colX(l + 1), rowY(l + 1, j));
            ctx.stroke();
          }
        }
      }
      // mini-maps: run the network on a small grid and keep every hidden activation
      const G = 22;
      const maps = sizes.map((n) => Array.from({ length: n }, () => new Float32Array(G * G)));
      for (let gy = 0; gy < G; gy++) {
        for (let gx = 0; gx < G; gx++) {
          const x = -1.8 + (3.6 * (gx + 0.5)) / G, y = 1.6 - (3.2 * (gy + 0.5)) / G;
          const f = net.forward([x, y]);
          for (let l = 1; l < L; l++) for (let j = 0; j < sizes[l]; j++) maps[l][j][gy * G + gx] = f.as[l][j];
        }
      }
      const off = document.createElement("canvas");
      off.width = off.height = G;
      const octx = off.getContext("2d");
      for (let l = 0; l < L; l++) {
        for (let j = 0; j < sizes[l]; j++) {
          const x = colX(l), y = rowY(l, j), rr = nodeR(l);
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          if (l === 0) {
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = C.ink2;
            ctx.stroke();
            ctx.fillStyle = C.ink;
            ctx.font = "italic 600 12px Georgia, serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(j === 0 ? "x₁" : "x₂", x, y);
          } else {
            const img = octx.createImageData(G, G);
            const m = maps[l][j];
            for (let k = 0; k < G * G; k++) {
              const v = l === L - 1 ? m[k] : act === "relu" ? Math.max(0, Math.min(1, m[k] / 2)) : (m[k] + 1) / 2;
              const c = QP.blend2(v, 1);
              img.data[4 * k] = c[0];
              img.data[4 * k + 1] = c[1];
              img.data[4 * k + 2] = c[2];
              img.data[4 * k + 3] = 255;
            }
            octx.putImageData(img, 0, 0);
            ctx.clip();
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(off, x - rr, y - rr, 2 * rr, 2 * rr);
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, rr, 0, Math.PI * 2);
            ctx.lineWidth = l === L - 1 ? 2.5 : 1.6;
            ctx.strokeStyle = C.ink2;
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      ctx.fillStyle = C.ink3;
      ctx.font = "800 11px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("input", colX(0), H - 6);
      ctx.fillText("output", colX(L - 1), H - 6);
      for (let l = 1; l < L - 1; l++) ctx.fillText(`hidden ${L > 3 ? l : ""}`.trim(), colX(l), H - 6);
    }
    plot.onresize = () => drawAll(true);
    reset();
  }
})();

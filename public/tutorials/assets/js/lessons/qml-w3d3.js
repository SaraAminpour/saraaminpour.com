/* qml-w3d3: one hybrid model, one step at a time. 24 handwritten digits (3 or 8, data from tools/data_qml_w3d3.py)
   go through a classical encoder (64 pixels -> 2 angles), a two-qubit circuit (8 weights), and a classical scale.
   Forward shows the values, backward the gradients (autograd for the classical parts, the parameter-shift rule for the
   circuit's weights and its input angles), and Step applies one Adam update to all 140 numbers. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  const LAYERS = 2;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("hybrid", "Forward, backward, step", "24 digits, 140 weights");
    if (!card) return;
    fetch(QP.asset("data/qml-w3d3-digits.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the data. Try reloading the page.")));

    function build(D) {
      const X = D.images.map((im) => im.map((v) => v / 16));
      const Y = D.labels.map((l) => (l === 8 ? 1 : 0));
      const B = X.length;
      const RUNS_PER_IMAGE = 1 + 2 * (4 * LAYERS + 2);
      let P, adam, t, runs, steps, sel = 0, stage, fw, bw, history, loop = null, seed = 7;

      // ---------------------------------------------------------------- the model
      function zq(t0, t1, w) {
        const s = new QP.State(2);
        s.gate("RY", 0, t0).gate("RY", 1, t1);
        for (let l = 0; l < LAYERS; l++) s.gate("RY", 0, w[4 * l]).gate("RZ", 0, w[4 * l + 1]).gate("RY", 1, w[4 * l + 2]).gate("RZ", 1, w[4 * l + 3]).cx(0, 1);
        return s.expZ(1);
      }
      function forward(i) {
        const x = X[i];
        const u = [0, 1].map((j) => P.c[j] + P.W[j].reduce((acc, wj, k) => acc + wj * x[k], 0));
        const th = u.map((v) => (PI / 2) * Math.tanh(v));
        const z = zq(th[0], th[1], P.w);
        const logit = P.a * z + P.b;
        const p = 1 / (1 + Math.exp(-logit));
        const loss = -Math.log(Math.max(1e-9, Y[i] ? p : 1 - p));
        return { x, u, th, z, logit, p, loss };
      }
      function backward(i, f) {
        const dlogit = f.p - Y[i];
        const dz = dlogit * P.a;
        const shift = (fn) => (fn(PI / 2) - fn(-PI / 2)) / 2;
        const dw = P.w.map((_, k) => dz * shift((s) => { const w = P.w.slice(); w[k] += s; return zq(f.th[0], f.th[1], w); }));
        const dth = [0, 1].map((j) => dz * shift((s) => { const th = f.th.slice(); th[j] += s; return zq(th[0], th[1], P.w); }));
        const du = dth.map((g, j) => g * (PI / 2) * (1 - Math.tanh(f.u[j]) ** 2));
        return { dlogit, da: dlogit * f.z, db: dlogit, dz, dw, dth, du, dW: du.map((g) => f.x.map((v) => g * v)) };
      }
      function init() {
        const r = QP.rng(seed++);
        P = { W: [0, 1].map(() => Array.from({ length: 64 }, () => 0.15 * r.normal())), c: [0, 0], w: Array.from({ length: 4 * LAYERS }, () => 0.6 * r.normal()), a: 1, b: 0 };
        adam = {};
        t = 0;
        runs = 0;
        steps = 0;
        history = [];
        stage = "none";
        fw = null;
        bw = null;
      }
      function adamUpdate(name, arr, grad, lr = 0.05) {
        const st = adam[name] || (adam[name] = { m: grad.map(() => 0), v: grad.map(() => 0) });
        for (let k = 0; k < arr.length; k++) {
          st.m[k] = 0.9 * st.m[k] + 0.1 * grad[k];
          st.v[k] = 0.999 * st.v[k] + 0.001 * grad[k] * grad[k];
          arr[k] -= (lr * (st.m[k] / (1 - 0.9 ** t))) / (Math.sqrt(st.v[k] / (1 - 0.999 ** t)) + 1e-8);
        }
      }
      function runForward() {
        fw = X.map((_, i) => forward(i));
        runs += B;
        stage = "forward";
        bw = null;
      }
      function runBackward() {
        bw = fw.map((f, i) => backward(i, f));
        runs += B * (RUNS_PER_IMAGE - 1);
        stage = "backward";
      }
      function step() {
        if (stage === "none") runForward();
        if (stage === "forward") runBackward();
        const mean = (get, n) => Array.from({ length: n }, (_, k) => bw.reduce((acc, g) => acc + get(g)[k], 0) / B);
        t++;
        adamUpdate("W0", P.W[0], mean((g) => g.dW[0], 64));
        adamUpdate("W1", P.W[1], mean((g) => g.dW[1], 64));
        adamUpdate("c", P.c, mean((g) => g.du, 2));
        adamUpdate("w", P.w, mean((g) => g.dw, P.w.length));
        const ab = [P.a, P.b];
        adamUpdate("ab", ab, mean((g) => [g.da, g.db], 2));
        [P.a, P.b] = ab;
        steps++;
        runForward();
        history.push(fw.reduce((acc, f) => acc + f.loss, 0) / B);
      }

      // ---------------------------------------------------------------- the view
      const thumbs = h("div", { class: "hy-thumbs" });
      const tiles = X.map((x, i) => {
        const cv = h("canvas", { width: 8, height: 8 });
        const ctx = cv.getContext("2d");
        const img = ctx.createImageData(8, 8);
        x.forEach((v, k) => {
          const g = Math.round(255 - v * 215);
          img.data.set([g, g, Math.min(255, g + 12), 255], 4 * k);
        });
        ctx.putImageData(img, 0, 0);
        const bar = h("i");
        const tile = h("button", { type: "button", class: "hy-thumb", title: `a handwritten ${D.labels[i]}`, onclick: () => { sel = i; render(); } }, cv, h("span", { class: "pb" }, bar));
        tile.bar = bar;
        thumbs.append(tile);
        return tile;
      });
      const mk = (cls, kind, title) => {
        const fwEl = h("div", { class: "fw" }), bwEl = h("div", { class: "bw" });
        const el = h("div", { class: "hy-card " + cls }, h("div", { class: "k" }, kind), h("div", { class: "t" }, title), fwEl, bwEl);
        el.fw = fwEl;
        el.bw = bwEl;
        return el;
      };
      const big = h("canvas", { width: 8, height: 8, class: "hy-big" });
      const cImg = mk("", "input", "64 pixels");
      const imgLabel = h("div", { style: { marginTop: "4px" } });
      cImg.fw.replaceWith(h("div", { class: "fw" }, big, imgLabel));
      cImg.fw = cImg.querySelector(".fw");
      const cEnc = mk("", "classical · 130 weights", "encoder → 2 angles");
      const cQ = mk("q", "quantum · 8 weights", "circuit → ⟨Z⟩");
      const cSc = mk("", "classical · 2 weights", "scale: a⟨Z⟩ + b");
      const cL = mk("", "output", "p(8) and loss");
      const cards = [cImg, cEnc, cQ, cSc, cL];
      const flow = h("div", { class: "hy-flow" }, ...cards);
      const bF = ui.button("1 · Forward", () => { stopLoop(); runForward(); render(); light("f"); }, "btn soft small");
      const bB = ui.button("2 · Backward", () => { if (stage === "forward") { runBackward(); render(); light("b"); } }, "btn soft small");
      const bS = ui.button("3 · Step", () => { stopLoop(); step(); render(); }, "btn qml small");
      const bT = ui.button("Train 30 steps", () => trainMany(), "btn soft small");
      const bR = ui.button("Start over", () => { stopLoop(); init(); render(); }, "btn soft small");
      const sL = ui.stat("loss on the 24 images", "–"), sA = ui.stat("correct", "–"), sR = ui.stat("circuit runs so far", "0"), sN = ui.stat("steps", "0");
      const chartHost = h("div");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "3.2em", marginTop: "8px" } });
      card.body.append(h("div", { class: "kbd-hint" }, "The batch: tap an image to follow it through the model"), thumbs, flow, h("div", { class: "btn-row" }, bF, bB, bS, bT, bR), h("div", { class: "readout" }, sL, sA, sR, sN), chartHost, note);
      const chart = QP.chart(chartHost, { xlim: [0, 30], ylim: [0, 1], aspect: 0.22, minH: 110, maxH: 150, xlabel: "steps", ystep: 0.5 });

      const fmt = (v, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : (v < 0 ? "−" : "") + Math.abs(v).toFixed(d));
      function light(dir) {
        const order = dir === "f" ? cards : cards.slice().reverse();
        cards.forEach((c) => c.classList.remove("lit-f", "lit-b"));
        order.forEach((c, k) => setTimeout(() => {
          cards.forEach((x) => x.classList.remove("lit-f", "lit-b"));
          c.classList.add(dir === "f" ? "lit-f" : "lit-b");
        }, 160 * k));
        setTimeout(() => cards.forEach((x) => x.classList.remove("lit-f", "lit-b")), 160 * order.length + 400);
      }
      function render() {
        // the selected image, large
        const bctx = big.getContext("2d");
        bctx.drawImage(tiles[sel].querySelector("canvas"), 0, 0);
        tiles.forEach((tile, i) => {
          tile.classList.toggle("sel", i === sel);
          const p = fw ? fw[i].p : null;
          tile.bar.style.width = p == null ? "0%" : `${Math.round(100 * p)}%`;
          tile.bar.style.background = p == null ? "transparent" : p > 0.5 ? C.c1 : C.c0;
          tile.classList.toggle("wrong", Boolean(fw) && (fw[i].p > 0.5 ? 1 : 0) !== Y[i]);
        });
        const lab = D.labels[sel];
        imgLabel.textContent = `a ${lab}: target p(8) = ${lab === 8 ? 1 : 0}`;
        const f = fw && fw[sel], g = bw && bw[sel];
        cEnc.fw.textContent = f ? `θ = (${fmt(f.th[0])}, ${fmt(f.th[1])})` : "–";
        cQ.fw.textContent = f ? `⟨Z⟩ = ${fmt(f.z, 3)} · 1 run` : "–";
        cSc.fw.textContent = f ? `logit = ${fmt(f.logit)}` : "–";
        cL.fw.textContent = f ? `p(8) = ${f.p.toFixed(2)} · loss ${f.loss.toFixed(2)}` : "–";
        cEnc.bw.textContent = g ? `∂L/∂θ = (${fmt(g.dth[0])}, ${fmt(g.dth[1])}) → 130 gradients by autograd` : "";
        cQ.bw.textContent = g ? `∂L/∂w = [${g.dw.map((v) => fmt(v)).join(", ")}] · shift rule: 2 × (8 + 2) = 20 runs` : "";
        cSc.bw.textContent = g ? `∂L/∂a = ${fmt(g.da)}, ∂L/∂b = ${fmt(g.db)}` : "";
        cL.bw.textContent = g ? `∂L/∂logit = p − target = ${fmt(g.dlogit)}` : "";
        bB.disabled = stage !== "forward";
        if (fw) {
          const loss = fw.reduce((acc, x) => acc + x.loss, 0) / B;
          const ok = fw.filter((x, i) => (x.p > 0.5 ? 1 : 0) === Y[i]).length;
          sL.set(loss.toFixed(3));
          sA.set(`${ok}<small> of ${B}</small>`, ok === B ? "good" : "");
        } else {
          sL.set("–");
          sA.set("–");
        }
        sR.set(runs.toLocaleString("en-US"));
        sN.set(String(steps));
        chart.o.xlim = [0, Math.max(30, history.length)];
        chart.o.ylim = [0, Math.max(1, ...history)];
        chart.draw(history.length ? [{ x: history.map((_, i) => i + 1), y: history, color: C.qml, width: 3 }] : []);
        note.textContent =
          stage === "none"
            ? "Press Forward to push all 24 images through the model: 24 circuit runs."
            : stage === "forward" && !steps
              ? "Forward: the encoder turns 64 pixels into two angles, the circuit turns them into ⟨Z⟩ (one run per image), and the scale and sigmoid give p(8). Now press Backward."
              : stage === "backward"
                ? `Backward: the chain rule carries ∂L/∂logit back. A circuit can't be differentiated like a formula, so the shift rule does it: 20 extra runs per image, for the 8 weights and the 2 input angles. The angle gradients are what let the encoder learn. Now Step: ${B} × ${RUNS_PER_IMAGE} = ${B * RUNS_PER_IMAGE} runs per step in all.`
                : `After ${steps} step${steps === 1 ? "" : "s"}, Adam has nudged all 140 weights against their gradients, and the forward pass has been run again with them.`;
      }
      function trainMany() {
        if (loop) return stopLoop();
        bT.textContent = "Pause";
        let k = 0;
        loop = QP.loop(() => {
          step();
          render();
          if (++k >= 30) {
            stopLoop();
            return false;
          }
        });
      }
      function stopLoop() {
        if (loop) loop.stop();
        loop = null;
        bT.textContent = "Train 30 steps";
      }
      chart.onresize = render;
      init();
      render();
    }
  }
})();

/* ml-w9d2: inside a CNN. A 20 x 20 shape (a test image, or your drawing) goes through the notebook's trained
   network (weights from tools/data_ml_w9d2.py): 8 feature maps, pooling, 16 feature maps, pooling, 4 scores. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  const S = 20, NAMES = ["ring", "square", "triangle", "plus"];

  // a 3 x 3 convolution with padding 1 over a stack of maps (channels x n x n), then ReLU
  function conv(maps, n, W, b) {
    return W.map((wk, o) => {
      const out = new Float32Array(n * n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        let s = b[o];
        for (let c = 0; c < maps.length; c++) {
          const m = maps[c], w = wk[c];
          for (let a = 0; a < 3; a++) {
            const yy = y + a - 1;
            if (yy < 0 || yy >= n) continue;
            for (let d = 0; d < 3; d++) {
              const xx = x + d - 1;
              if (xx >= 0 && xx < n) s += w[a][d] * m[yy * n + xx];
            }
          }
        }
        out[y * n + x] = Math.max(0, s);
      }
      return out;
    });
  }
  const pool = (maps, n) => maps.map((m) => {
    const k = n / 2, out = new Float32Array(k * k);
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++)
      out[y * k + x] = Math.max(m[2 * y * n + 2 * x], m[2 * y * n + 2 * x + 1], m[(2 * y + 1) * n + 2 * x], m[(2 * y + 1) * n + 2 * x + 1]);
    return out;
  });

  function paint(cv, m, n, rgb) {
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(n, n);
    const top = Math.max(1e-6, ...m);
    for (let i = 0; i < n * n; i++) {
      const t = Math.min(1, m[i] / top);
      img.data[i * 4] = 255 + (rgb[0] - 255) * t;
      img.data[i * 4 + 1] = 255 + (rgb[1] - 255) * t;
      img.data[i * 4 + 2] = 255 + (rgb[2] - 255) * t;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function widget() {
    const card = QP.widget("cnnlayers", "Inside a CNN", "pick a test shape, or draw one anywhere");
    if (!card) return;
    fetch(QP.asset("data/ml-w9d2-cnn.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the network. Try reloading the page.")));

    function build(D) {
      let input = null, k = -1, strokes = [], cur = null;
      const pad = h("canvas", { class: "cn-pad", width: 240, height: 240, "aria-label": "drawing pad" });
      const pctx = pad.getContext("2d");
      const mapCv = (n) => h("canvas", { class: "cn-map", width: n, height: n });
      const m1 = Array.from({ length: 8 }, () => mapCv(20)), p1 = Array.from({ length: 8 }, () => mapCv(10)), m2 = Array.from({ length: 16 }, () => mapCv(5));
      const bars = NAMES.map((name) => {
        const fill = h("span", { class: "dg-fill" }), pct = h("span", { class: "dg-pct" });
        const row = h("div", { class: "dg-bar cn-bar" }, h("b", null, name), h("span", { class: "dg-track" }, fill), pct);
        return { row, fill, pct };
      });
      const note = h("div", { class: "small", style: { fontWeight: 700, color: "var(--ink-2)", minHeight: "1.5em", marginTop: "6px" } });
      card.body.append(
        h("div", { class: "btn-row" }, ui.button("Next test shape", next, "btn ml small"), ui.button("Clear and draw", () => { strokes = []; input = null; k = -1; update(); }, "btn soft small")),
        h("div", { class: "cn-flow" },
          h("div", null, h("div", { class: "kbd-hint" }, "Input, 20 × 20"), pad),
          h("div", null, h("div", { class: "kbd-hint" }, "Layer 1: 8 filters, ReLU (20 × 20)"), h("div", { class: "cn-maps g8" }, ...m1),
            h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "Max pooling (10 × 10)"), h("div", { class: "cn-maps g8" }, ...p1)),
          h("div", null, h("div", { class: "kbd-hint" }, "Layer 2: 16 filters, ReLU, pooling (5 × 5)"), h("div", { class: "cn-maps g16" }, ...m2),
            h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "Scores → softmax"), ...bars.map((b) => b.row), note)));

      const pos = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 240, ((e.clientY - r.top) / r.height) * 240]; };
      pad.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        try { pad.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
        if (k >= 0) { strokes = []; k = -1; }
        cur = [pos(e)];
        strokes.push(cur);
        fromStrokes();
      });
      pad.addEventListener("pointermove", (e) => { if (cur) { cur.push(pos(e)); fromStrokes(); } });
      pad.addEventListener("pointerup", () => (cur = null));
      pad.addEventListener("pointercancel", () => (cur = null));

      const off = document.createElement("canvas");
      off.width = off.height = 240;
      const octx = off.getContext("2d", { willReadFrequently: true });
      function fromStrokes() {
        octx.clearRect(0, 0, 240, 240);
        octx.lineWidth = 15; // about 1.25 pixels of the 20 x 20 image, like the training strokes
        octx.lineCap = octx.lineJoin = "round";
        octx.strokeStyle = octx.fillStyle = "#000";
        for (const st of strokes) {
          octx.beginPath();
          st.forEach(([x, y], i) => (i ? octx.lineTo(x, y) : octx.moveTo(x, y)));
          if (st.length === 1) { octx.arc(st[0][0], st[0][1], 7.5, 0, 2 * Math.PI); octx.fill(); } else octx.stroke();
        }
        const a = octx.getImageData(0, 0, 240, 240).data;
        input = new Float32Array(S * S);
        for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) input[Math.floor(y / 12) * S + Math.floor(x / 12)] += a[(y * 240 + x) * 4 + 3] / 255 / 144;
        for (let i = 0; i < S * S; i++) input[i] = Math.min(1, input[i] * 1.6);
        update();
      }
      function next() {
        k = (k + 1) % D.samples.length;
        input = Float32Array.from(D.samples[k][0], (c) => Number(c) / 9);
        strokes = [];
        update();
      }
      function update() {
        pctx.fillStyle = "#fcfbff";
        pctx.fillRect(0, 0, 240, 240);
        if (input) for (let i = 0; i < S * S; i++) {
          pctx.fillStyle = `rgba(84, 39, 143, ${input[i]})`;
          pctx.fillRect((i % S) * 12, Math.floor(i / S) * 12, 12, 12);
        }
        if (!input || !input.some((v) => v > 0.05)) {
          pctx.fillStyle = "#b8b3cc";
          pctx.font = '700 14px "Nunito", system-ui, sans-serif';
          pctx.textAlign = "center";
          pctx.fillText("draw a ring, square,", 120, 112);
          pctx.fillText("triangle or plus", 120, 132);
          [...m1, ...p1, ...m2].forEach((c) => c.getContext("2d").clearRect(0, 0, c.width, c.height));
          bars.forEach((b) => { b.fill.style.width = "0%"; b.pct.textContent = ""; b.row.classList.remove("top"); });
          note.textContent = "";
          return;
        }
        const a1 = conv([input], 20, D.conv1.w, D.conv1.b), q1 = pool(a1, 20);
        const a2 = pool(conv(q1, 10, D.conv2.w, D.conv2.b), 10);
        const flat = a2.flatMap((m) => Array.from(m));
        const z = D.fc.w.map((row, c) => row.reduce((s, w, i) => s + w * flat[i], D.fc.b[c]));
        const mx = Math.max(...z), e = z.map((v) => Math.exp(v - mx)), tot = e.reduce((s, v) => s + v, 0), p = e.map((v) => v / tot);
        a1.forEach((m, i) => paint(m1[i], m, 20, [23, 169, 140]));
        q1.forEach((m, i) => paint(p1[i], m, 10, [23, 169, 140]));
        a2.forEach((m, i) => paint(m2[i], m, 5, [123, 92, 250]));
        const best = p.indexOf(Math.max(...p));
        bars.forEach((b, i) => { b.fill.style.width = `${p[i] * 100}%`; b.pct.textContent = `${Math.round(p[i] * 100)}%`; b.row.classList.toggle("top", i === best); });
        note.textContent = k >= 0 ? `It's really a ${NAMES[D.samples[k][1]]}. ${best === D.samples[k][1] ? "Read right." : "Read wrong!"}` : `It reads a ${NAMES[best]}.`;
      }
      next();
    }
  }
})();

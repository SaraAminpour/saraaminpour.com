/* ml-w5d5: the digit reader. Draw a digit; it is shrunk to 8 x 8 like the training images and read by the
   network trained in the notebook (weights exported by tools/data_ml_w5d5.py). */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const STROKE = 4.6; // pen width in the 32 x 32 box (the training digits have thick strokes)

  function widget() {
    const card = QP.widget("digits", "The digit reader", "draw a digit from 0 to 9");
    if (!card) return;
    fetch(QP.asset("data/ml-w5d5-digits.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the network. Try reloading the page.")));

    function build(D) {
      let strokes = [], cur = null, sample = null, sampleIdx = -1;
      const pad = h("canvas", { class: "dg-pad", width: 280, height: 280, "aria-label": "drawing pad" });
      const seeCells = Array.from({ length: 64 }, () => h("span"));
      const see = h("div", { class: "dg-see" }, ...seeCells);
      const bars = Array.from({ length: 10 }, (_, d) => {
        const fill = h("span", { class: "dg-fill" });
        const pct = h("span", { class: "dg-pct" });
        const row = h("div", { class: "dg-bar" }, h("b", null, String(d)), h("span", { class: "dg-track" }, fill), pct);
        return { row, fill, pct };
      });
      const guess = h("div", { class: "dg-guess" }, "?");
      const clearB = ui.button("Clear", () => { strokes = []; sample = null; update(); }, "btn soft small");
      const testB = ui.button("Show me a test digit", () => showSample(), "btn ml small");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "8px" } });
      card.body.append(
        h("div", { class: "dg-grid" },
          h("div", null, h("div", { class: "kbd-hint" }, "Draw here"), pad, h("div", { class: "btn-row", style: { marginTop: "8px" } }, clearB, testB)),
          h("div", null, h("div", { class: "kbd-hint" }, "What the network sees"), see, guess),
          h("div", null, h("div", { class: "kbd-hint" }, "How sure it is"), ...bars.map((b) => b.row))),
        note);
      const ctx = pad.getContext("2d");

      // drawing
      const pos = (e) => {
        const r = pad.getBoundingClientRect();
        return [((e.clientX - r.left) / r.width) * 280, ((e.clientY - r.top) / r.height) * 280];
      };
      pad.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        try { pad.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
        if (sample) { sample = null; strokes = []; }
        cur = [pos(e)];
        strokes.push(cur);
        update();
      });
      pad.addEventListener("pointermove", (e) => {
        if (!cur) return;
        cur.push(pos(e));
        update();
      });
      const end = () => { cur = null; };
      pad.addEventListener("pointerup", end);
      pad.addEventListener("pointercancel", end);

      // strokes -> 8 x 8 values from 0 to 16, the way the training images were made:
      // fit the ink into a 32 x 32 box (full height, centred), then count the ink in each 4 x 4 block
      const off = document.createElement("canvas");
      off.width = off.height = 64;
      const octx = off.getContext("2d", { willReadFrequently: true });
      function toPixels() {
        const pts = strokes.flat();
        if (!pts.length) return null;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const w = Math.max(x1 - x0, 1), hh = Math.max(y1 - y0, 1);
        const pen = STROKE * 2; // in the 64-pixel canvas
        const s = Math.min((64 - pen) / hh, (56 - pen) / w);
        const ox = 32 - ((x0 + x1) / 2) * s, oy = 32 - ((y0 + y1) / 2) * s;
        octx.clearRect(0, 0, 64, 64);
        octx.lineWidth = pen;
        octx.lineCap = octx.lineJoin = "round";
        octx.strokeStyle = octx.fillStyle = "#000";
        for (const st of strokes) {
          octx.beginPath();
          st.forEach(([x, y], i) => (i ? octx.lineTo(x * s + ox, y * s + oy) : octx.moveTo(x * s + ox, y * s + oy)));
          if (st.length === 1) { octx.arc(st[0][0] * s + ox, st[0][1] * s + oy, pen / 2, 0, 2 * Math.PI); octx.fill(); }
          else octx.stroke();
        }
        const img = octx.getImageData(0, 0, 64, 64).data;
        const v = new Array(64).fill(0);
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) v[(y >> 3) * 8 + (x >> 3)] += img[(y * 64 + x) * 4 + 3] / 255;
        return v.map((c) => Math.min(16, Math.round((c / 64) * 16)));
      }
      function predict(px) {
        const x = px.map((v) => v / 16);
        const hid = D.W1.map((row, j) => Math.max(0, row.reduce((s, w, i) => s + w * x[i], D.b1[j])));
        const z = D.W2.map((row, k) => row.reduce((s, w, j) => s + w * hid[j], D.b2[k]));
        const m = Math.max(...z);
        const e = z.map((v) => Math.exp(v - m));
        const tot = e.reduce((a, b) => a + b, 0);
        return e.map((v) => v / tot);
      }
      function showSample() {
        // mostly random test digits, now and then one the network gets wrong
        const nRandom = 80;
        sampleIdx = Math.random() < 0.2 ? nRandom + Math.floor(Math.random() * (D.samples.length - nRandom)) : Math.floor(Math.random() * nRandom);
        const [str, label] = D.samples[sampleIdx];
        sample = { px: Array.from(str, (c) => parseInt(c, 17)), label };
        strokes = [];
        update();
      }
      function paintPad() {
        const S = 280;
        ctx.clearRect(0, 0, S, S);
        ctx.fillStyle = "#fcfbff";
        ctx.fillRect(0, 0, S, S);
        if (sample) {
          for (let i = 0; i < 64; i++) {
            ctx.fillStyle = `rgba(84, 39, 143, ${sample.px[i] / 16})`;
            ctx.fillRect((i % 8) * 35, Math.floor(i / 8) * 35, 35, 35);
          }
          return;
        }
        ctx.strokeStyle = "rgba(76,60,140,0.08)";
        ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath(); ctx.moveTo((k * S) / 4, 0); ctx.lineTo((k * S) / 4, S); ctx.moveTo(0, (k * S) / 4); ctx.lineTo(S, (k * S) / 4); ctx.stroke();
        }
        ctx.strokeStyle = "#54278f";
        ctx.fillStyle = "#54278f";
        ctx.lineWidth = 16;
        ctx.lineCap = ctx.lineJoin = "round";
        for (const st of strokes) {
          ctx.beginPath();
          st.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          if (st.length === 1) { ctx.arc(st[0][0], st[0][1], 8, 0, 2 * Math.PI); ctx.fill(); }
          else ctx.stroke();
        }
        if (!strokes.length) {
          ctx.fillStyle = "#b8b3cc";
          ctx.font = '700 15px "Nunito", system-ui, sans-serif';
          ctx.textAlign = "center";
          ctx.fillText("draw one big digit", S / 2, S / 2);
        }
      }
      function update() {
        paintPad();
        const px = sample ? sample.px : toPixels();
        seeCells.forEach((c, i) => (c.style.background = px ? `rgba(84, 39, 143, ${px[i] / 16})` : ""));
        if (!px) {
          bars.forEach((b) => { b.fill.style.width = "0%"; b.pct.textContent = ""; b.row.classList.remove("top"); });
          guess.textContent = "?";
          note.textContent = `Draw a digit as big as the box. This network read ${(D.testAcc * 100).toFixed(1)}% of its ${D.nTest} test digits correctly. How does it do on yours?`;
          return;
        }
        const p = predict(px);
        const best = p.indexOf(Math.max(...p));
        bars.forEach((b, d) => {
          b.fill.style.width = `${(p[d] * 100).toFixed(1)}%`;
          b.pct.textContent = p[d] < 0.005 ? "" : `${Math.round(p[d] * 100)}%`;
          b.row.classList.toggle("top", d === best);
        });
        guess.innerHTML = `I read <b>${best}</b>`;
        if (sample) {
          const ok = best === sample.label;
          note.textContent = ok
            ? `A real test digit, written by a person: a ${sample.label}. The network reads ${best}, ${Math.round(p[best] * 100)}% sure.`
            : `A real test digit: the writer meant ${sample.label}, but the network reads ${best}. One of its ${Math.round((1 - D.testAcc) * D.nTest)} mistakes on the test set. Would you have read it right?`;
        } else {
          note.textContent = p[best] > 0.8 ? `Confident: ${Math.round(p[best] * 100)}%. Wrong? Your drawing comes from a different "distribution" than the training digits, so some mistakes are expected.` : `Not so sure: the top guess has only ${Math.round(p[best] * 100)}%. Try drawing it bigger, or more like the 8 × 8 examples.`;
        }
      }
      update();
    }
  }
})();

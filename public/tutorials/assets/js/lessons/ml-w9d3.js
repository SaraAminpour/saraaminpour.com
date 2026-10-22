/* ml-w9d3: move the digit. Draw a digit (or load a test digit); it is shrunk to 8 x 8 as in week 5, then moved
   by the arrow buttons. The plain network and the CNN from the notebook (both trained with shifts of at most one
   pixel, weights from tools/data_ml_w9d3.py) read it side by side. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  const STROKE = 4.6; // pen width in the 32 x 32 box, as in the week 5 digit reader

  const softmax = (z) => { const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), t = e.reduce((a, b) => a + b, 0); return e.map((v) => v / t); };
  function conv(maps, n, W, b) { // 3 x 3, padding 1, then ReLU
    return W.map((wk, o) => {
      const out = new Float32Array(n * n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        let s = b[o];
        for (let c = 0; c < maps.length; c++) for (let a = 0; a < 3; a++) {
          const yy = y + a - 1;
          if (yy < 0 || yy >= n) continue;
          for (let d = 0; d < 3; d++) { const xx = x + d - 1; if (xx >= 0 && xx < n) s += wk[c][a][d] * maps[c][yy * n + xx]; }
        }
        out[y * n + x] = Math.max(0, s);
      }
      return out;
    });
  }
  const pool2 = (maps, n) => maps.map((m) => {
    const k = n / 2, out = new Float32Array(k * k);
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) out[y * k + x] = Math.max(m[2 * y * n + 2 * x], m[2 * y * n + 2 * x + 1], m[(2 * y + 1) * n + 2 * x], m[(2 * y + 1) * n + 2 * x + 1]);
    return out;
  });
  function readCnn(N, x) {
    let a = conv([x], 8, ...N.c1);
    a = pool2(conv(a, 8, ...N.c2), 8);
    a = conv(a, 4, ...N.c3);
    const g = a.map((m) => Math.max(...m)); // global max pool
    return softmax(N.fc[0].map((row, k) => row.reduce((s, w, i) => s + w * g[i], N.fc[1][k])));
  }
  function readMlp(N, x) {
    const hid = N.W1.map((row, j) => Math.max(0, row.reduce((s, w, i) => s + w * x[i], N.b1[j])));
    return softmax(N.W2.map((row, k) => row.reduce((s, w, j) => s + w * hid[j], N.b2[k])));
  }

  function widget() {
    const card = QP.widget("shiftread", "Move the digit", "draw a digit, then push it around");
    if (!card) return;
    Promise.all([fetch(QP.asset("data/ml-w9d3-shift.json")).then((r) => r.json()), fetch(QP.asset("data/ml-w5d5-digits.json")).then((r) => r.json())])
      .then(([D, W5]) => build(D, W5.samples))
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the networks. Try reloading the page.")));

    function build(D, samples) {
      let strokes = [], cur = null, sample = null, dx = 0, dy = 0;
      const pad = h("canvas", { class: "dg-pad", width: 280, height: 280, "aria-label": "drawing pad" });
      const ctx = pad.getContext("2d");
      const seeCells = Array.from({ length: 64 }, () => h("span"));
      const see = h("div", { class: "dg-see" }, ...seeCells);
      const where = h("div", { class: "small muted", style: { marginTop: "6px", fontWeight: 700 } });
      const move = (ddx, ddy) => () => { dx = Math.max(-3, Math.min(3, dx + ddx)); dy = Math.max(-3, Math.min(3, dy + ddy)); update(); };
      const arrows = h("div", { class: "sr-arrows" },
        h("span"), ui.button("↑", move(0, -1), "btn soft small"), h("span"),
        ui.button("←", move(-1, 0), "btn soft small"), ui.button("center", () => { dx = dy = 0; update(); }, "btn soft small"), ui.button("→", move(1, 0), "btn soft small"),
        h("span"), ui.button("↓", move(0, 1), "btn soft small"), h("span"));
      const column = (title) => {
        const bars = Array.from({ length: 10 }, (_, d) => {
          const fill = h("span", { class: "dg-fill" }), pct = h("span", { class: "dg-pct" });
          return { row: h("div", { class: "dg-bar" }, h("b", null, String(d)), h("span", { class: "dg-track" }, fill), pct), fill, pct };
        });
        const guess = h("div", { class: "dg-guess" }, "?");
        return { bars, guess, el: h("div", null, h("div", { class: "kbd-hint" }, title), guess, ...bars.map((b) => b.row)) };
      };
      const colM = column("Plain network"), colC = column("CNN");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: "var(--ink-2)", minHeight: "2.6em", marginTop: "8px" } });
      card.body.append(
        h("div", { class: "sr-grid" },
          h("div", null, h("div", { class: "kbd-hint" }, "Draw here"), pad,
            h("div", { class: "btn-row", style: { marginTop: "8px" } }, ui.button("Clear", () => { strokes = []; sample = null; update(); }, "btn soft small"), ui.button("A test digit", () => { sample = samples[Math.floor(Math.random() * 80)]; strokes = []; update(); }, "btn ml small"))),
          h("div", null, h("div", { class: "kbd-hint" }, "What they see"), see, where, arrows),
          colM.el, colC.el),
        note);

      const pos = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 280, ((e.clientY - r.top) / r.height) * 280]; };
      pad.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        try { pad.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
        if (sample) { sample = null; strokes = []; }
        cur = [pos(e)];
        strokes.push(cur);
        update();
      });
      pad.addEventListener("pointermove", (e) => { if (cur) { cur.push(pos(e)); update(); } });
      pad.addEventListener("pointerup", () => (cur = null));
      pad.addEventListener("pointercancel", () => (cur = null));

      // the same shrinking as week 5: fit the ink in a 32 x 32 box, count ink per 4 x 4 block -> 8 x 8, 0..16
      const off = document.createElement("canvas");
      off.width = off.height = 64;
      const octx = off.getContext("2d", { willReadFrequently: true });
      function toPixels() {
        const pts = strokes.flat();
        if (!pts.length) return null;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const pen = STROKE * 2;
        const s = Math.min((64 - pen) / Math.max(y1 - y0, 1), (56 - pen) / Math.max(x1 - x0, 1));
        const ox = 32 - ((x0 + x1) / 2) * s, oy = 32 - ((y0 + y1) / 2) * s;
        octx.clearRect(0, 0, 64, 64);
        octx.lineWidth = pen;
        octx.lineCap = octx.lineJoin = "round";
        octx.strokeStyle = octx.fillStyle = "#000";
        for (const st of strokes) {
          octx.beginPath();
          st.forEach(([x, y], i) => (i ? octx.lineTo(x * s + ox, y * s + oy) : octx.moveTo(x * s + ox, y * s + oy)));
          if (st.length === 1) { octx.arc(st[0][0] * s + ox, st[0][1] * s + oy, pen / 2, 0, 2 * Math.PI); octx.fill(); } else octx.stroke();
        }
        const img = octx.getImageData(0, 0, 64, 64).data;
        const v = new Array(64).fill(0);
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) v[(y >> 3) * 8 + (x >> 3)] += img[(y * 64 + x) * 4 + 3] / 255;
        return v.map((c) => Math.min(16, Math.round((c / 64) * 16)));
      }
      const moved = (px) => px.map((_, i) => {
        const y = Math.floor(i / 8) - dy, x = (i % 8) - dx;
        return y >= 0 && y < 8 && x >= 0 && x < 8 ? px[y * 8 + x] : 0;
      });
      function paintPad() {
        ctx.fillStyle = "#fcfbff";
        ctx.fillRect(0, 0, 280, 280);
        if (sample) {
          Array.from(sample[0], (c) => parseInt(c, 17)).forEach((v, i) => { ctx.fillStyle = `rgba(84, 39, 143, ${v / 16})`; ctx.fillRect((i % 8) * 35, Math.floor(i / 8) * 35, 35, 35); });
          return;
        }
        ctx.strokeStyle = ctx.fillStyle = "#54278f";
        ctx.lineWidth = 16;
        ctx.lineCap = ctx.lineJoin = "round";
        for (const st of strokes) {
          ctx.beginPath();
          st.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          if (st.length === 1) { ctx.arc(st[0][0], st[0][1], 8, 0, 2 * Math.PI); ctx.fill(); } else ctx.stroke();
        }
        if (!strokes.length) {
          ctx.fillStyle = "#b8b3cc";
          ctx.font = '700 15px "Nunito", system-ui, sans-serif';
          ctx.textAlign = "center";
          ctx.fillText("draw one big digit", 140, 140);
        }
      }
      function show(col, p) {
        const best = p ? p.indexOf(Math.max(...p)) : -1;
        col.bars.forEach((b, d) => { b.fill.style.width = p ? `${p[d] * 100}%` : "0%"; b.pct.textContent = p ? `${Math.round(p[d] * 100)}%` : ""; b.row.classList.toggle("top", d === best); });
        col.guess.innerHTML = p ? `reads <b>${best}</b>` : "?";
        return best;
      }
      function update() {
        paintPad();
        const raw = sample ? Array.from(sample[0], (c) => parseInt(c, 17)) : toPixels();
        const px = raw && moved(raw);
        seeCells.forEach((c, i) => (c.style.background = px ? `rgba(84, 39, 143, ${px[i] / 16})` : ""));
        where.textContent = `moved ${dx === 0 && dy === 0 ? "nowhere: centered" : `${Math.abs(dx)} ${dx < 0 ? "left" : "right"}, ${Math.abs(dy)} ${dy < 0 ? "up" : "down"}`}`;
        if (!px) { show(colM, null); show(colC, null); note.textContent = ""; return; }
        const x = px.map((v) => v / 16);
        const m = show(colM, readMlp(D.mlp, x)), c = show(colC, readCnn(D.cnn, x));
        const truth = sample ? sample[1] : null;
        note.textContent = truth != null
          ? `It's a ${truth}. Plain network: ${m === truth ? "right" : "wrong"}. CNN: ${c === truth ? "right" : "wrong"}.${dx === 0 && dy === 0 ? " Now move it two steps sideways." : ""}`
          : dx === 0 && dy === 0 ? "Now press → twice, then ← four times." : m === c ? "They agree." : "They disagree: which one is right?";
      }
      sample = samples[3];
      update();
    }
  }
})();

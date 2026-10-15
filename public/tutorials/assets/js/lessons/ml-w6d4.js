/* ml-w6d4: an explorable autoencoder code map with a live decoder, and anomaly detection by reconstruction error. */
(function () {
  const { h, ui } = QP;
  const DIGIT_COLORS = ["#5577f5", "#ff8a50", "#17a98c", "#e5566b", "#7b5cfa", "#8d6e63", "#e45fa3", "#8a85a3", "#c4b52b", "#22b8cf"];
  let shared = null; // the model data, loaded once for both widgets
  const load = () => (shared = shared || fetch(QP.asset("data/ml-w6d4-ae.json")).then((r) => r.json()));
  QP.onReady(() => {
    ae();
    anomaly();
  });

  function ae() {
    const card = QP.widget("ae", "Inside an autoencoder", "hover the map");
    if (!card) return;
    const C = QP.colors;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [-28, 6], ylim: [-8, 20], aspect: 0.9, minH: 280, maxH: 440 });
    const pix = (title) => {
      const cv = h("canvas", { width: 8, height: 8, style: { width: "100%", aspectRatio: "1", imageRendering: "pixelated", borderRadius: "12px", border: "1px solid var(--line)", background: "#fff" } });
      const lab = h("div", { class: "small center", style: { fontWeight: 800, color: C.ink2, marginTop: "4px" } }, title);
      const box = h("div", null, cv, lab);
      box.cv = cv;
      box.lab = lab;
      return box;
    };
    const a = pix("original"), b = pix("rebuilt from 2 numbers");
    const caption = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "10px" } }, "Loading the trained model…");
    const legend = h("div", { class: "legend" }, ...DIGIT_COLORS.map((c, d) => h("span", null, h("i", { style: { background: c } }), String(d))));
    right.append(h("div", { class: "grid-2", style: { gap: "12px" } }, a, b), caption, legend);
    let data = null;

    const put = (cv, values) => {
      const ctx = cv.getContext("2d");
      const img = ctx.createImageData(8, 8);
      values.forEach((v, k) => {
        const t = Math.max(0, Math.min(1, v));
        img.data[4 * k] = 255 - (255 - 74) * t;
        img.data[4 * k + 1] = 255 - (255 - 20) * t;
        img.data[4 * k + 2] = 255 - (255 - 140) * t;
        img.data[4 * k + 3] = 255;
      });
      ctx.putImageData(img, 0, 0);
    };
    const unhex = (s) => [...s].map((ch) => parseInt(ch, 16) / 15);
    function decode(z) {
      const W = data.decoder;
      const hdn = W["0.weight"].map((row, j) => Math.tanh(row[0] * z[0] + row[1] * z[1] + W["0.bias"][j]));
      return W["2.weight"].map((row, j) => QP.math.sigmoid(row.reduce((s, w, i) => s + w * hdn[i], W["2.bias"][j])));
    }
    function draw(highlight = -1, cursor = null) {
      plot.clear();
      data.codes.forEach(([x, y], i) => plot.point(x, y, { r: i === highlight ? 7 : 3.6, fill: DIGIT_COLORS[data.labels[i]], stroke: i === highlight ? C.ink : "#fff", lw: i === highlight ? 2.5 : 0.8 }));
      if (cursor) plot.point(cursor.x, cursor.y, { r: 9, shape: "star", fill: C.butter, stroke: C.ink, lw: 2 });
    }
    function hover(p) {
      if (!data) return;
      let best = -1, bd = 14;
      data.codes.forEach(([x, y], i) => {
        const d = Math.hypot(plot.X(x) - p.px, plot.Y(y) - p.py);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) {
        put(a.cv, unhex(data.orig[best]));
        put(b.cv, unhex(data.rec[best]));
        a.lab.textContent = `original: a ${data.labels[best]}`;
        b.lab.textContent = "rebuilt from its 2 numbers";
        caption.textContent = `Its code is (${data.codes[best][0].toFixed(1)}, ${data.codes[best][1].toFixed(1)}). Everything the network kept about this digit is in those two numbers.`;
        draw(best);
      } else {
        a.cv.getContext("2d").clearRect(0, 0, 8, 8);
        a.lab.textContent = "no real digit here";
        put(b.cv, decode([p.x, p.y]));
        b.lab.textContent = "imagined by the decoder";
        caption.textContent = `Empty spot (${p.x.toFixed(1)}, ${p.y.toFixed(1)}): the decoder turns these two numbers into a digit it never saw.`;
        draw(-1, { x: p.x, y: p.y });
      }
    }
    plot.on({ hover, down: hover, drag: hover });
    load()
      .then((d) => {
        data = d;
        // fit the view to the codes
        const xs = d.codes.map((c) => c[0]), ys = d.codes.map((c) => c[1]);
        const pad = (lo, hi) => [lo - 0.08 * (hi - lo), hi + 0.08 * (hi - lo)];
        plot.o.xlim = pad(Math.min(...xs), Math.max(...xs));
        plot.o.ylim = pad(Math.min(...ys), Math.max(...ys));
        caption.textContent = "Hover over a dot, or over empty space.";
        draw();
        hover({ px: plot.X(data.codes[0][0]), py: plot.Y(data.codes[0][1]), x: data.codes[0][0], y: data.codes[0][1] });
      })
      .catch(() => (caption.textContent = "Couldn't load the model data. Try reloading the page."));
    plot.onresize = () => data && draw();
  }
  function anomaly() {
    const card = QP.widget("anomaly", "Spot the strange ones", "reconstruction error as an alarm");
    if (!card) return;
    const C = QP.colors;
    const unhex = (str) => [...str].map((ch) => parseInt(ch, 16) / 15);
    load().then(build).catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the model data. Try reloading the page.")));

    function build(D) {
      // start where 5% of normal test digits raise the alarm
      const sorted = D.err.test.slice().sort((x, y) => x - y);
      let thr = Math.round(sorted[Math.floor(0.95 * sorted.length)] / 0.002) * 0.002;
      const XMAX = 0.16, BINS = 32;
      const plot = new QP.Plot(card.body, { xlim: [0, XMAX], ylim: [0, 1], aspect: 0.38, minH: 170, maxH: 250, ticks: true, xlabel: "reconstruction error", ylabel: "share", grid: false });
      const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "#b9a7ff" } }), "normal test digits (450)"), h("span", null, h("i", { style: { background: "#ff8a50" } }), "mirrored digits (450)"), h("span", null, h("i", { style: { background: "#8a85a3" } }), `noise images (200, errors around ${(D.err.noise.reduce((a, b) => a + b, 0) / D.err.noise.length).toFixed(2)}: off the chart)`));
      const tS = ui.slider({ label: "alarm threshold", min: 0.01, max: XMAX, step: 0.002, value: thr, fmt: (v) => v.toFixed(3), color: "#e5566b", oninput: (v) => { thr = v; draw(); } });
      const sF = ui.stat("false alarms (normal digits flagged)", "–"), sM = ui.stat("mirrored digits caught", "–"), sN = ui.stat("noise images caught", "–");
      const thumbs = h("div", { class: "an-thumbs" });
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
      card.body.append(legend, h("div", { class: "controls" }, tS), h("div", { class: "readout" }, sF, sM, sN), h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "A few test digits and their mirror images (red frame = flagged)"), thumbs, note);
      plot.onresize = draw;
      const hist = (arr) => {
        const c = Array(BINS).fill(0);
        arr.forEach((v) => { const b = Math.min(BINS - 1, Math.floor((v / XMAX) * BINS)); c[b]++; });
        return c.map((v) => v / arr.length);
      };
      const hN = hist(D.err.test), hM = hist(D.err.mirror);
      const top = Math.max(...hN, ...hM) * 1.1;
      plot.o.ylim = [0, top];
      const cell = (img, e, title) => {
        const cv = h("canvas", { width: 8, height: 8, class: "an-img" });
        const ctx = cv.getContext("2d"), im = ctx.createImageData(8, 8);
        img.forEach((v, k) => { im.data[4 * k] = 255 - (255 - 74) * v; im.data[4 * k + 1] = 255 - (255 - 20) * v; im.data[4 * k + 2] = 255 - (255 - 140) * v; im.data[4 * k + 3] = 255; });
        ctx.putImageData(im, 0, 0);
        const box = h("div", { class: "an-cell" }, cv, h("div", { class: "an-lab" }, title), h("div", { class: "an-err" }, e.toFixed(3)));
        box.e = e;
        return box;
      };
      const cells = [];
      D.thumbs.forEach((t) => {
        const pair = [cell(unhex(t.img), t.e, `a ${t.label}`), cell(unhex(t.mimg), t.me, `mirrored ${t.label}`)];
        cells.push(...pair);
        thumbs.appendChild(h("div", { class: "an-pair" }, ...pair));
      });
      function draw() {
        plot.clear();
        const w = XMAX / BINS;
        hN.forEach((v, b) => plot.rect(b * w + w * 0.08, 0, b * w + w * 0.5, v, { fill: "#b9a7ff" }));
        hM.forEach((v, b) => plot.rect(b * w + w * 0.5, 0, b * w + w * 0.92, v, { fill: "#ffb08a" }));
        plot.seg(thr, 0, thr, top, { color: "#e5566b", width: 3 });
        plot.text("alarm →", thr + 0.004, top * 0.9, { color: "#e5566b", size: 12, align: "left" });
        const frac = (arr) => arr.filter((v) => v > thr).length / arr.length;
        const fa = frac(D.err.test), mc = frac(D.err.mirror), nc = frac(D.err.noise);
        sF.set(`${(fa * 100).toFixed(1)}<small>%</small>`, fa > 0.1 ? "bad" : fa < 0.03 ? "good" : "");
        sM.set(`${(mc * 100).toFixed(1)}<small>%</small>`);
        sN.set(`${(nc * 100).toFixed(0)}<small>%</small>`, nc > 0.99 ? "good" : "");
        cells.forEach((c) => c.classList.toggle("flag", c.e > thr));
        note.textContent = `At this threshold, ${Math.round(fa * 450)} of 450 normal digits raise a false alarm and ${Math.round(mc * 450)} of 450 mirrored ones are caught. Lower the alarm to catch more, and you also flag more normal digits.`;
      }
      draw();
    }
  }
})();

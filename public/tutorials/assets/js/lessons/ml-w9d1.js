/* ml-w9d1: convolution by hand. Paint a 14 x 14 image, pick or type a 3 x 3 filter, and watch it slide:
   each output pixel is the sum of the nine products under the window (no padding, stride 1 -> 12 x 12). */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  const N = 14, K = 3, O = N - K + 1;
  const PICTURES = {
    seven: ["..............", "..............", "...#########..", "...#########..", "..........##..", ".........##...", "........##....", ".......##.....", "......##......", "......##......", ".....##.......", ".....##.......", "..............", ".............."],
    smile: ["..............", "....######....", "...#......#...", "..#........#..", ".#..##..##..#.", ".#..##..##..#.", ".#..........#.", ".#.#......#.#.", ".#..#....#..#.", "..#..####..#..", "...#......#...", "....######....", "..............", ".............."],
    square: ["..............", "..............", "..............", "...########...", "...########...", "...##....##...", "...##....##...", "...##....##...", "...##....##...", "...########...", "...########...", "..............", "..............", ".............."],
    stripes: Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => ((c + r) % 4 < 2 ? "#" : ".")).join("")),
  };
  const FILTERS = {
    identity: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
    blur: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
    sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    "vertical edges": [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    "horizontal edges": [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
  };
  const fmt = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2)).replace("-", "−");

  function widget() {
    const card = QP.widget("conv", "Slide a filter over an image", "paint pixels, edit the filter, hover the output");
    if (!card) return;
    let img = PICTURES.seven.map((row) => Array.from(row, (ch) => (ch === "#" ? 1 : 0)));
    let ker = FILTERS["vertical edges"].map((r) => r.slice());
    let relu = false, at = null, anim = null, paintVal = null;

    const inCells = [], outCells = [], kInputs = [];
    const inGrid = h("div", { class: "cv-grid cv-in", style: { gridTemplateColumns: `repeat(${N}, 1fr)` } });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const el = h("span");
      el.addEventListener("pointerdown", (e) => { e.preventDefault(); paintVal = img[r][c] ? 0 : 1; img[r][c] = paintVal; draw(); });
      el.addEventListener("pointerenter", () => { if (paintVal != null) { img[r][c] = paintVal; draw(); } });
      inCells.push(el);
      inGrid.append(el);
    }
    window.addEventListener("pointerup", () => (paintVal = null));
    inGrid.addEventListener("touchmove", (e) => {
      if (paintVal == null) return;
      const t = e.touches[0], el = document.elementFromPoint(t.clientX, t.clientY), i = inCells.indexOf(el);
      if (i >= 0) { img[Math.floor(i / N)][i % N] = paintVal; draw(); }
      e.preventDefault();
    }, { passive: false });
    const window3 = h("div", { class: "cv-window" });
    inGrid.append(window3);

    const kGrid = h("div", { class: "cv-kernel" });
    for (let r = 0; r < K; r++) for (let c = 0; c < K; c++) {
      const inp = h("input", { type: "text", inputmode: "decimal", "aria-label": `filter weight row ${r + 1} column ${c + 1}` });
      inp.addEventListener("input", () => { const v = parseFloat(inp.value.replace("−", "-")); if (!Number.isNaN(v)) { ker[r][c] = v; draw(false); } });
      kInputs.push(inp);
      kGrid.append(inp);
    }
    const outGrid = h("div", { class: "cv-grid cv-out", style: { gridTemplateColumns: `repeat(${O}, 1fr)` } });
    for (let r = 0; r < O; r++) for (let c = 0; c < O; c++) {
      const el = h("span");
      el.addEventListener("pointerenter", () => { stop(); at = [r, c]; draw(false); });
      el.addEventListener("pointerdown", () => { stop(); at = [r, c]; draw(false); });
      outCells.push(el);
      outGrid.append(el);
    }
    outGrid.addEventListener("pointerleave", () => { if (!anim) { at = null; draw(false); } });

    const picS = ui.seg({ label: "Picture", options: [{ value: "seven", label: "7" }, { value: "smile", label: "smile" }, { value: "square", label: "square" }, { value: "stripes", label: "stripes" }, { value: "clear", label: "clear" }], value: "seven",
      onchange: (v) => { img = v === "clear" ? Array.from({ length: N }, () => new Array(N).fill(0)) : PICTURES[v].map((row) => Array.from(row, (ch) => (ch === "#" ? 1 : 0))); draw(); } });
    const filS = ui.seg({ label: "Filter", options: Object.keys(FILTERS), value: "vertical edges", onchange: (v) => { ker = FILTERS[v].map((r) => r.slice()); draw(); } });
    const reluT = ui.toggle({ label: "ReLU: set negatives to 0", onchange: (v) => { relu = v; draw(false); } });
    const slideB = ui.button("Slide it", () => (anim ? stop() : play()), "btn ml small");
    const sum = h("div", { class: "cv-sum" });
    card.body.append(
      h("div", { class: "controls" }, picS), h("div", { class: "controls" }, filS),
      h("div", { class: "cv-row" },
        h("div", null, h("div", { class: "kbd-hint" }, "Image (click or drag to paint)"), inGrid),
        h("div", { class: "cv-mid" }, h("div", { class: "kbd-hint" }, "Filter"), kGrid, h("div", { class: "cv-times" }, "slides over →")),
        h("div", null, h("div", { class: "kbd-hint" }, "Feature map (hover a pixel)"), outGrid)),
      h("div", { class: "controls" }, slideB, reluT), sum);

    const value = (r, c) => {
      let s = 0;
      for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) s += img[r + i][c + j] * ker[i][j];
      return relu ? Math.max(0, s) : s;
    };
    function play() {
      slideB.textContent = "Stop";
      let k = 0;
      anim = setInterval(() => {
        at = [Math.floor(k / O), k % O];
        draw(false);
        if (++k >= O * O) stop();
      }, 70);
    }
    function stop() {
      if (anim) clearInterval(anim);
      anim = null;
      slideB.textContent = "Slide it";
    }
    function draw(syncInputs = true) {
      if (syncInputs) kInputs.forEach((inp, i) => (inp.value = fmt(ker[Math.floor(i / K)][i % K])));
      inCells.forEach((el, i) => el.classList.toggle("on", Boolean(img[Math.floor(i / N)][i % N])));
      const vals = [];
      for (let r = 0; r < O; r++) for (let c = 0; c < O; c++) vals.push(value(r, c));
      const big = Math.max(1e-9, ...vals.map(Math.abs));
      outCells.forEach((el, i) => {
        const v = vals[i] / big;
        const [cr, cg, cb] = v >= 0 ? [85, 119, 245] : [255, 138, 80], t = Math.abs(v);
        el.style.background = `rgb(${255 + (cr - 255) * t}, ${255 + (cg - 255) * t}, ${255 + (cb - 255) * t})`;
        el.classList.toggle("at", Boolean(at && at[0] * O + at[1] === i));
      });
      if (at) {
        const [r, c] = at;
        window3.style.display = "block";
        window3.style.left = `calc(${(c / N) * 100}% )`;
        window3.style.top = `calc(${(r / N) * 100}% )`;
        window3.style.width = window3.style.height = `${(K / N) * 100}%`;
        const terms = [];
        for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) if (img[r + i][c + j] && ker[i][j]) terms.push(fmt(ker[i][j]));
        let raw = 0;
        for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) raw += img[r + i][c + j] * ker[i][j];
        sum.innerHTML = `Row ${r + 1}, column ${c + 1}: the filter's weights on the inked pixels add up to ${terms.length ? terms.join(" + ").replaceAll("+ −", "− ") : "0 (no ink under the window)"} = <b>${fmt(raw)}</b>${relu && raw < 0 ? ", and ReLU makes it <b>0</b>" : ""}.`;
      } else {
        window3.style.display = "none";
        sum.innerHTML = `Blue: positive output, orange: negative. ${relu ? "ReLU keeps only the positive part, like a CNN layer." : "Hover a pixel of the feature map, or press Slide it."}`;
      }
    }
    draw();
  }
})();

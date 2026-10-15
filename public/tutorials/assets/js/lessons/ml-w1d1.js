/* w1d1: the four ways machines learn. Widgets: a one-knob model, and a sorting game. */
(function () {
  const { h, ui } = QP;
  // iris petal lengths (cm) and species (0 setosa, 1 versicolor, 2 virginica)
  const PL = [1.4,1.4,1.3,1.5,1.4,1.7,1.4,1.5,1.4,1.5,1.5,1.6,1.4,1.1,1.2,1.5,1.3,1.4,1.7,1.5,1.7,1.5,1.0,1.7,1.9,1.6,1.6,1.5,1.4,1.6,1.6,1.5,1.5,1.4,1.5,1.2,1.3,1.4,1.3,1.5,1.3,1.3,1.3,1.6,1.9,1.4,1.6,1.4,1.5,1.4,4.7,4.5,4.9,4.0,4.6,4.5,4.7,3.3,4.6,3.9,3.5,4.2,4.0,4.7,3.6,4.4,4.5,4.1,4.5,3.9,4.8,4.0,4.9,4.7,4.3,4.4,4.8,5.0,4.5,3.5,3.8,3.7,3.9,5.1,4.5,4.5,4.7,4.4,4.1,4.0,4.4,4.6,4.0,3.3,4.2,4.2,4.2,4.3,3.0,4.1,6.0,5.1,5.9,5.6,5.8,6.6,4.5,6.3,5.8,6.1,5.1,5.3,5.5,5.0,5.1,5.3,5.5,6.7,6.9,5.0,5.7,4.9,6.7,4.9,5.7,6.0,4.8,4.9,5.6,5.8,6.1,6.4,5.6,5.1,5.6,6.1,5.6,5.5,4.8,5.4,5.6,5.1,5.1,5.9,5.7,5.2,5.0,5.2,5.4,5.1];

  QP.onReady(() => {
    knobWidget();
    sorterWidget();
  });

  // ------------------------------------------------------------------ one-knob model
  function knobWidget() {
    const card = QP.widget("knob", "Turn the knob", "drag the dashed line");
    if (!card) return;
    // stack points into columns (a dot plot) so each flower is visible
    const bins = {};
    const pts = PL.map((v, i) => {
      const key = Math.round(v * 10);
      bins[key] = (bins[key] || 0) + 1;
      return { x: v, y: bins[key], c: i < 50 ? 1 : 0 };
    });
    const maxStack = Math.max(...Object.values(bins));
    const plot = new QP.Plot(card.body, { xlim: [0.6, 7.4], ylim: [-1.6, maxStack + 1.5], aspect: 0.36, minH: 190, maxH: 300, grid: false });
    let thr = 4.4;
    const acc = ui.stat("Accuracy", "–");
    const wrong = ui.stat("Mistakes", "–");
    const knob = ui.slider({ label: "threshold", min: 0.8, max: 7.2, step: 0.05, value: thr, fmt: (v) => v.toFixed(2) + " cm", oninput: (v) => { thr = v; draw(); } });
    const auto = ui.button("Let the computer choose", () => search());
    card.body.append(h("div", { class: "controls" }, knob, auto), h("div", { class: "readout" }, acc, wrong));
    card.body.append(h("div", { class: "legend" }, h("span", null, h("i", { style: { background: QP.colors.c1 } }), "setosa"), h("span", null, h("i", { style: { background: QP.colors.c0 } }), "other species"), h("span", null, h("i", { style: { background: "transparent", border: "2px solid #e5566b" } }), "wrongly classified")));

    function draw() {
      plot.clear("#fcfbff");
      const [y0, y1] = plot.o.ylim;
      plot.rect(plot.o.xlim[0], y0, thr, y1, { fill: "rgba(85,119,245,0.10)" });
      plot.rect(thr, y0, plot.o.xlim[1], y1, { fill: "rgba(255,138,80,0.10)" });
      plot.text("predict: setosa", (plot.o.xlim[0] + thr) / 2, y1 - 0.7, { color: QP.colors.c1, size: 12 });
      plot.text("predict: not setosa", (thr + plot.o.xlim[1]) / 2, y1 - 0.7, { color: "#d9693a", size: 12 });
      for (let t = 1; t <= 7; t++) plot.text(String(t), t, -0.9, { color: QP.colors.ink3, size: 11, weight: 700 });
      plot.text("petal length (cm)", 6.9, -0.9, { color: QP.colors.ink3, size: 11, align: "right" });
      let errors = 0;
      for (const p of pts) {
        const pred = p.x < thr ? 1 : 0;
        const ok = pred === p.c;
        if (!ok) errors++;
        plot.point(p.x, p.y, { r: 5, fill: QP.classColor(p.c), stroke: ok ? "#fff" : "#e5566b", lw: ok ? 1.5 : 3 });
      }
      plot.seg(thr, y0 + 0.4, thr, y1, { color: QP.colors.ink, width: 2.5, dash: [6, 6] });
      plot.point(thr, y1 - 0.15, { r: 9, fill: "#fff", stroke: QP.colors.ink, lw: 2.5 });
      const a = 1 - errors / pts.length;
      acc.set((a * 100).toFixed(0) + "%", a === 1 ? "good" : "");
      wrong.set(String(errors), errors ? "bad" : "good");
    }
    let dragging = false;
    plot.on({
      down: (p) => { if (Math.abs(plot.X(p.x) - plot.X(thr)) < 22) dragging = true; else { thr = QP.math.clamp(p.x, 0.8, 7.2); knob.set(thr); draw(); dragging = true; } },
      drag: (p) => { if (!dragging) return; thr = QP.math.clamp(p.x, 0.8, 7.2); knob.set(thr); draw(); },
      up: () => (dragging = false),
    });
    plot.c.classList.add("grab");
    plot.onresize = draw;
    draw();

    function search() {
      // sweep the knob from left to right, remembering the best spot: that's "learning"
      const best = { thr: 0.8, errs: Infinity };
      let t = 0.8;
      auto.disabled = true;
      const run = QP.loop(() => {
        thr = t;
        knob.set(thr);
        draw();
        const errs = pts.filter((p) => (p.x < thr ? 1 : 0) !== p.c).length;
        if (errs < best.errs) { best.errs = errs; best.thr = t; }
        t += 0.05;
        if (t > 7.2) {
          // settle in the middle of the perfect range
          const perfect = [];
          for (let s = 0.8; s <= 7.2; s += 0.05) if (pts.every((p) => (p.x < s ? 1 : 0) === p.c)) perfect.push(s);
          const target = perfect.length ? (perfect[0] + perfect[perfect.length - 1]) / 2 : best.thr;
          QP.animate(600, (e) => { thr = 7.2 + (target - 7.2) * e; knob.set(thr); draw(); }, () => {
            auto.disabled = false;
            QP.toast(`Found it: anything between ${perfect[0].toFixed(2)} and ${perfect[perfect.length - 1].toFixed(2)} cm is perfect`, "ui-star");
          });
          return false;
        }
      });
    }
  }

  // ------------------------------------------------------------------ sorting game
  function sorterWidget() {
    const card = QP.widget("sorter", "Which kind of learning?", "8 cards");
    if (!card) return;
    const kinds = [
      { k: "sup", name: "Supervised", icon: "target", sub: "learn from answers" },
      { k: "uns", name: "Unsupervised", icon: "clusters", sub: "find structure" },
      { k: "semi", name: "Semi-supervised", icon: "semi", sub: "few answers + lots of data" },
      { k: "rl", name: "Reinforcement", icon: "maze", sub: "learn from rewards" },
    ];
    const cards = [
      { t: "Predict a flat's rent from its size and location, using 10,000 past rentals.", k: "sup", why: "Every past rental comes with its answer (the rent), and the answer is a number: supervised regression." },
      { t: "Split 50,000 shoppers into groups with similar habits. Nobody has defined the groups.", k: "uns", why: "No answers exist; the groups have to be discovered. That's clustering." },
      { t: "A robot dog learns to walk: +1 when it moves forward, −1 when it falls.", k: "rl", why: "Nobody shows it the right moves; it only gets rewards. Classic reinforcement learning." },
      { t: "You labeled 20 X-ray images by hand; 5,000 more have no labels. Train on all of them.", k: "semi", why: "A handful of labels plus a big unlabeled pile: semi-supervised." },
      { t: "Flag spam, learning from emails people already marked as spam or not spam.", k: "sup", why: "Examples with answers, and the answer is a category: supervised classification." },
      { t: "Find the main directions of variation in 1,000 measured quantum states, with no labels.", k: "uns", why: "Looking for structure (directions) without any answers: unsupervised, like PCA." },
      { t: "An AI gets better at Go by playing millions of games against itself.", k: "rl", why: "It acts (moves), and the only feedback is winning or losing: reinforcement learning." },
      { t: "Classify readouts of a qubit as 0 or 1, using calibration shots where you know what you prepared.", k: "sup", why: "Calibration shots come with the true answer (what was prepared): supervised classification." },
    ];
    QP.rng(4).shuffle(cards);
    const pool = h("div", { class: "pool" });
    const binEls = {};
    const bins = h("div", { class: "sort-bins" }, kinds.map((k) => {
      const placed = h("div", { class: "placed" });
      const el = h("div", { class: "bin", "data-k": k.k, role: "button", tabindex: "0" }, h("img", { src: QP.icon(k.icon), alt: "" }), h("b", null, k.name), h("small", null, k.sub), placed);
      el.placed = placed;
      binEls[k.k] = el;
      return el;
    }));
    const score = h("div", { class: "quiz-score", style: { marginTop: "12px" } }, h("img", { src: QP.qubi("think"), width: 44, height: 44, alt: "" }), h("span", null, "Pick a card to start."));
    card.body.append(h("div", { class: "sorter" }, pool, bins, score));
    let selected = null;
    let done = 0;
    let firstTry = 0;
    const tried = new Set();
    cards.forEach((c, i) => {
      const el = h("div", { class: "scenario", draggable: "true", tabindex: "0", role: "button" }, c.t);
      el.dataset.i = i;
      el.addEventListener("click", () => select(el));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(el); } });
      el.addEventListener("dragstart", (e) => { select(el, true); e.dataTransfer.setData("text/plain", String(i)); el.classList.add("dragging"); });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
      pool.appendChild(el);
    });
    Object.values(binEls).forEach((b) => {
      b.addEventListener("click", () => selected && place(selected, b.dataset.k));
      b.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && selected) { e.preventDefault(); place(selected, b.dataset.k); } });
      b.addEventListener("dragover", (e) => { e.preventDefault(); b.classList.add("hot"); });
      b.addEventListener("dragleave", () => b.classList.remove("hot"));
      b.addEventListener("drop", (e) => { e.preventDefault(); b.classList.remove("hot"); if (selected) place(selected, b.dataset.k); });
    });
    function select(el, quiet) {
      if (el.classList.contains("ok")) return;
      document.querySelectorAll(".scenario.selected").forEach((x) => x.classList.remove("selected"));
      selected = el;
      el.classList.add("selected");
      if (!quiet) Object.values(binEls).forEach((b) => b.classList.add("hot")), setTimeout(() => Object.values(binEls).forEach((b) => b.classList.remove("hot")), 500);
    }
    function say(msg, pose = "think") {
      score.innerHTML = "";
      score.append(h("img", { src: QP.qubi(pose), width: 44, height: 44, alt: "" }), h("span", { html: msg }));
    }
    function place(el, k) {
      const c = cards[Number(el.dataset.i)];
      const key = el.dataset.i;
      if (c.k === k) {
        if (!tried.has(key)) firstTry++;
        el.classList.remove("selected");
        el.classList.add("ok");
        el.draggable = false;
        binEls[k].placed.appendChild(el);
        el.style.fontSize = "0.8rem";
        done++;
        selected = null;
        say(`<b>Yes!</b> ${c.why}`, "cheer");
        if (done === cards.length) {
          QP.confettiAt(bins, 160);
          say(`<b>All ${cards.length} sorted</b>, ${firstTry} on the first try. You can now spot the four families in the wild.`, "cheer");
        }
      } else {
        tried.add(key);
        el.classList.remove("nope");
        void el.offsetWidth;
        el.classList.add("nope");
        const hint = { sup: "Are there answers for every example?", uns: "Are there any answers at all?", semi: "How many examples have answers?", rl: "Is something acting and getting rewards?" }[c.k];
        say(`<b>Not that box.</b> Ask yourself: ${hint}`, "oops");
      }
    }
  }
})();

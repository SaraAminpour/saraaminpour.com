/* qml-w2d5: an honest benchmark or a flattering one. Accuracy gaps (quantum kernel minus RBF) on five datasets
   and five random splits each (data from tools/data_qml_w2d5.py), with three common shortcuts to switch on:
   an untuned baseline, tuning on the test set, and reporting only the luckiest split. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const KERNELS = [
    { key: "angle", label: "angle", color: "#ff8a50" },
    { key: "zz", label: "ZZ", color: "#7b5cfa" },
  ];
  const SHORT = { "digits 3 vs 8": "digits 3/8", "breast cancer": "cancer" };

  function widget() {
    const card = QP.widget("versus", "An honest benchmark, or a flattering one?", "5 datasets × 5 splits");
    if (!card) return;
    fetch(QP.asset("data/qml-w2d5-benchmark.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the data. Try reloading the page.")));

    function build(D) {
      const sins = { weak: false, peek: false, best: false };
      const toggles = h(
        "div",
        { class: "controls col" },
        ui.toggle({ label: "Leave the RBF baseline untuned (γ = 1, C = 1)", onchange: (v) => { sins.weak = v; go(); } }),
        ui.toggle({ label: "Tune the quantum kernels on the test set", onchange: (v) => { sins.peek = v; go(); } }),
        ui.toggle({ label: "Report only the luckiest of the five splits", onchange: (v) => { sins.best = v; go(); } })
      );
      const legend = h(
        "div",
        { class: "legend" },
        ...KERNELS.map((k) => h("span", null, h("i", { style: { background: k.color } }), `${k.label} kernel`)),
        h("span", { class: "muted" }, "small dots: single splits · big dot and bar: average ± spread")
      );
      card.body.append(toggles, legend);
      const plot = new QP.Plot(card.body, {
        xlim: [-20, 20], ylim: [0, 14], aspect: 0.62, minH: 330, maxH: 420, ticks: true, grid: false, xstep: 5, ystep: 100,
        yfmt: () => "", xfmt: (v) => (v > 0 ? "+" + v : v < 0 ? "−" + -v : "0"), xlabel: "accuracy gap, quantum − RBF (points)",
      });
      const sW = ui.stat("quantum “wins”", "–"), sG = ui.stat("average gap", "–"), sN = ui.stat("splits behind each dot", "–");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "4.5em", marginTop: "6px" } });
      card.body.append(h("div", { class: "readout" }, sW, sG, sN), note);

      function target() {
        return D.datasets.map((ds) =>
          KERNELS.map((k) => {
            const gaps = ds.splits.map((r) => 100 * ((sins.peek ? r[k.key + "Peek"] : r[k.key]) - (sins.weak ? r.rbfUntuned : r.rbf)));
            if (sins.best) {
              let i = 0;
              gaps.forEach((g, j) => { if (g > gaps[i] + 1e-9) i = j; });
              return { xs: gaps, alpha: gaps.map((_, j) => (j === i ? 1 : 0)), mean: gaps[i], sd: 0, win: gaps[i] > 1e-6 };
            }
            const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
            return { xs: gaps, alpha: gaps.map(() => 0.5), mean, sd, win: mean - sd > 1e-6 };
          })
        );
      }
      let to = target(), cur = to, anim = null;
      const mix = (a, b, t) => a + (b - a) * t;
      function go() {
        const from = cur;
        to = target();
        stats();
        if (anim) anim.stop();
        anim = QP.animate(450, (e) => {
          cur = to.map((row, g) => row.map((r, j) => {
            const f = from[g][j];
            return { xs: r.xs.map((x, i) => mix(f.xs[i], x, e)), alpha: r.alpha.map((a, i) => mix(f.alpha[i], a, e)), mean: mix(f.mean, r.mean, e), sd: mix(f.sd, r.sd, e), win: r.win };
          }));
          draw();
        });
      }

      function draw() {
        const narrow = plot.w < 460;
        plot.pl = narrow ? 76 : 112;
        plot.o.xstep = narrow ? 10 : 5;
        plot.clear();
        const [x0, x1] = plot.o.xlim;
        const top0 = 12.9;
        plot.rect(x0, 0, 0, top0, { fill: "rgba(31,179,148,0.07)" });
        plot.rect(0, 0, x1, top0, { fill: "rgba(123,92,250,0.07)" });
        for (let x = -15; x <= 15; x += 5) if (x) plot.seg(x, 0, x, top0, { color: "rgba(76,60,140,0.08)", width: 1 });
        plot.seg(0, 0, 0, top0, { color: C.ink3, width: 1.5, dash: [5, 4] });
        plot.text(narrow ? "← RBF" : "← RBF better", -1, 13.45, { align: "right", size: 11, color: C.ml });
        plot.text(narrow ? "quantum →" : "quantum better →", 1, 13.45, { align: "left", size: 11, color: C.qc });
        D.datasets.forEach((ds, g) => {
          const top = 12.8 - 2.5 * g;
          if (g) plot.seg(x0, top, x1, top, { color: "rgba(76,60,140,0.13)", width: 1 });
          const yMid = plot.Y(top - 1.25);
          plot.text(narrow ? SHORT[ds.name] || ds.name : ds.name, plot.pl - 8, yMid - 7, { px: true, align: "right", size: narrow ? 11 : 12, color: C.ink });
          plot.text(`${ds.n} points`, plot.pl - 8, yMid + 8, { px: true, align: "right", size: 10, weight: 700, color: C.ink3 });
          KERNELS.forEach((k, j) => {
            const y = top - 0.8 - 0.9 * j;
            const r = cur[g][j];
            r.xs.forEach((x, i) => { if (r.alpha[i] > 0.02) plot.point(x, y + (i - 2) * 0.09, { r: 3.2, fill: k.color, stroke: null, alpha: r.alpha[i] }); });
            if (r.sd > 0.05) plot.seg(r.mean - r.sd, y, r.mean + r.sd, y, { color: k.color, width: 3, alpha: 0.85 });
            plot.point(r.mean, y, { r: 6.5, fill: k.color, stroke: "#fff", lw: 2 });
            if (r.win) {
              const right = Math.max(plot.X(r.mean + r.sd), plot.X(r.mean) + 6) + 14;
              const room = right + 36 < plot.w - plot.pr;
              const px = room ? right : Math.min(plot.X(r.mean - r.sd), plot.X(r.mean) - 6) - 14;
              plot.text("win", px, plot.Y(y), { px: true, align: room ? "left" : "right", size: 10, color: "#fff", bg: k.color });
            }
          });
        });
      }

      function stats() {
        const all = to.flat();
        const wins = all.filter((r) => r.win).length;
        const avg = all.reduce((a, r) => a + r.mean, 0) / all.length;
        const any = sins.weak || sins.peek || sins.best;
        sW.set(`${wins}<small> of 10</small>`, any && wins > 1 ? "bad" : "");
        const avgTxt = Math.abs(avg) < 0.05 ? "0.0" : `${avg > 0 ? "+" : "−"}${Math.abs(avg).toFixed(1)}`;
        sG.set(`${avgTxt}<small> points</small>`);
        sN.set(sins.best ? "1 <small>(the luckiest)</small>" : "5");
        if (!any) {
          const zz = to[4][1];
          note.textContent = `Honest: a tuned RBF baseline, settings picked by cross-validation only, every split shown. The quantum kernels tie on most datasets and lose clearly on moons (angle). One “win”, ZZ on breast cancer by ${zz.mean.toFixed(1)} points, is a lead, not a result: ten comparisons give luck ten chances. The notebook retests it.`;
          return;
        }
        const parts = [];
        if (sins.weak) parts.push("the RBF keeps a first-guess setting while the quantum kernels are tuned");
        if (sins.peek) parts.push("the quantum settings are chosen by their test score, so the exam became practice");
        if (sins.best) parts.push("only the luckiest split is reported, and with one split there's no spread to show");
        note.textContent = `Shortcuts on: ${parts.join("; ")}. Now quantum “wins” ${wins} of 10, with an average gap of ${avgTxt} points. Not one circuit changed, only the reporting.`;
      }
      plot.onresize = draw;
      stats();
      draw();
    }
  }
})();

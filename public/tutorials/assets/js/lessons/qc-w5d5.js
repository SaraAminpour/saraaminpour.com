/* qc-w5d5: Grover's search. N signed amplitude bars and their mean: the oracle flips the prize's bar, the
   diffuser reflects every bar about the mean. A circle shows the same two reflections as one rotation. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("grover", "Find the prize", "two reflections make a rotation");
    if (!card) return;
    let n = 4, N = 16, prize = 11, a = [], k = 0, half = false, busy = false, prevP = null, msg = "";
    const nSeg = ui.seg({ label: "Qubits", options: [2, 3, 4, 5, 6].map((v) => ({ value: v, label: `${v} (N = ${2 ** v})` })), value: n, onchange: (v) => { n = v; N = 2 ** v; prize = Math.floor(Math.random() * N); reset(); } });
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "controls" }, nSeg), h("div", { class: "side-by-side", style: { marginTop: "8px" } }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "Amplitudes (tap a bar to hide the prize there)"));
    const bars = new QP.Plot(left, { xlim: [-0.6, 15.6], ylim: [-1.05, 1.05], aspect: 0.62, minH: 220, maxH: 330, grid: false });
    right.append(h("div", { class: "kbd-hint" }, "The same state as an arrow"));
    const circle = new QP.Plot(right, { xlim: [-1.25, 1.25], ylim: [-1.25, 1.25], aspect: 1, equal: true, minH: 200, maxH: 280, grid: false });
    const oB = ui.button("Oracle: flip the prize", () => oracle(), "btn soft small");
    const dB = ui.button("Diffuser: reflect about the mean", () => diffuse(), "btn soft small");
    const sB = ui.button("Grover step (both)", () => stepBoth(), "btn qc small");
    const rB = ui.button("Reset", () => reset(), "btn soft small");
    const sK = ui.stat("Grover steps", "0"), sP = ui.stat("P(prize)", "–"), sBest = ui.stat("best number of steps", "–"), sC = ui.stat("classical: boxes opened on average", "–");
    const chartHost = h("div");
    const chart = QP.chart(chartHost, { xlim: [0, 8], ylim: [0, 1], aspect: 0.3, minH: 120, maxH: 170, ystep: 0.5, xstep: 1, xlabel: "Grover steps", ylabel: "P(prize)" });
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.8em", marginTop: "8px" } });
    card.body.append(h("div", { class: "btn-row", style: { marginTop: "8px" } }, oB, dB, sB, rB), h("div", { class: "readout" }, sK, sP, sBest, sC), chartHost, note);
    bars.onresize = draw;
    circle.onresize = draw;
    bars.on({ down: (p) => { if (busy) return; const i = Math.round(p.x); if (i >= 0 && i < N) { prize = i; reset(); } } });

    const theta = () => Math.asin(1 / Math.sqrt(N));
    const bestK = () => Math.max(1, Math.round(Math.PI / (4 * theta()) - 0.5));
    const pOf = (kk) => Math.sin((2 * kk + 1) * theta()) ** 2;
    const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;

    function reset() {
      a = Array(N).fill(1 / Math.sqrt(N));
      k = 0; half = false; prevP = null; busy = false;
      bars.o.xlim = [-0.6, N - 0.4];
      msg = `All ${N} items are equally likely: P = 1/${N} each. Classically you'd open boxes one by one, about ${N / 2} on average.`;
      draw();
    }
    function animateTo(target, done) {
      const from = a.slice();
      busy = true;
      QP.animate(QP.reduceMotion ? 1 : 650, (e) => { a = from.map((v, i) => v + (target[i] - v) * e); draw(); }, () => { a = target; busy = false; draw(); done && done(); });
    }
    function oracle(done) {
      if (busy) return;
      const t = a.slice();
      t[prize] = -t[prize];
      half = !half;
      msg = "The oracle flipped the sign of the prize's amplitude. Its probability is unchanged (a² is the same), but the mean (dashed line) dropped a little.";
      animateTo(t, done);
    }
    function diffuse(done) {
      if (busy) return;
      const m = mean(a);
      const t = a.map((v) => 2 * m - v);
      const wasHalf = half;
      animateTo(t, () => {
        if (wasHalf) { k++; half = false; }
        const p = a[prize] ** 2;
        msg = !wasHalf && k === 0 ? "Reflecting the even state about its mean changes nothing: the oracle has to mark the prize first."
          : prevP != null && p < prevP - 1e-9 ? `Too far! Step ${k} rotated past the prize, and P(prize) fell to ${(p * 100).toFixed(1)}%. Grover's search has to stop at the right moment.`
          : `Every bar reflected about the mean: the negative prize bar jumped far above it and the others shrank. After ${k} step${k === 1 ? "" : "s"}, P(prize) = ${(p * 100).toFixed(1)}%.`;
        prevP = p;
        draw();
        if (k === bestK() && p > 0.9) QP.confettiAt(sP, 30);
        done && done();
      });
    }
    function stepBoth() {
      if (busy) return;
      if (half) { diffuse(); return; }
      oracle(() => setTimeout(() => diffuse(), QP.reduceMotion ? 0 : 150));
    }
    function draw() {
      // bars
      bars.clear();
      bars.seg(-0.6, 0, N - 0.4, 0, { color: C.ink3, width: 1.5 });
      const w = Math.min(0.8, Math.max(0.5, 0.8 - N / 200));
      a.forEach((v, i) => bars.rect(i - w / 2, Math.min(0, v), i + w / 2, Math.max(0, v), { fill: i === prize ? (v < 0 ? "#ff8a50" : "#ff76a8") : v < 0 ? "#ffc7ae" : "#b9a7ff", stroke: null }));
      const m = mean(a);
      bars.seg(-0.6, m, N - 0.4, m, { color: "#f0ac2e", width: 2.5, dash: [6, 5] });
      bars.text("mean", N - 0.9, m + 0.08, { color: "#c98a0c", size: 11, align: "right" });
      bars.text("★", prize, Math.max(0, a[prize]) + 0.1, { color: "#e5566b", size: 16 });
      // circle: |rest⟩ to the right, |prize⟩ up
      circle.clear();
      circle.circle(0, 0, 1, { stroke: "rgba(76,60,140,0.25)", lw: 1.5 });
      circle.seg(-1.15, 0, 1.15, 0, { color: "rgba(76,60,140,0.3)", width: 1.2 });
      circle.seg(0, -1.15, 0, 1.15, { color: "rgba(76,60,140,0.3)", width: 1.2 });
      circle.text("|rest⟩", 1.05, -0.12, { color: C.ink3, size: 12 });
      circle.text("|prize⟩", 0.18, 1.12, { color: "#e5566b", size: 12 });
      const th = theta();
      circle.seg(-1.1 * Math.cos(th), -1.1 * Math.sin(th), 1.1 * Math.cos(th), 1.1 * Math.sin(th), { color: "#f0ac2e", width: 1.8, dash: [5, 5] });
      circle.text("start", 1.12 * Math.cos(th) - 0.05, 1.12 * Math.sin(th) + 0.12, { color: "#c98a0c", size: 11 });
      const rest = a.reduce((s, v, i) => (i === prize ? s : s + v), 0) / Math.sqrt(N - 1); // all other amplitudes are equal
      circle.arrow(0, 0, rest, a[prize], { color: C.qc, width: 4, head: 11 });
      // readouts
      const p = a[prize] ** 2;
      sK.set(String(k));
      sP.set(`${(p * 100).toFixed(1)}<small>%</small>`, p > 0.9 ? "good" : "");
      sBest.set(String(bestK()));
      sC.set(String(N / 2));
      const kmax = Math.max(8, 2 * bestK() + 1);
      chart.o.xlim = [0, kmax];
      chart.o.xstep = kmax > 10 ? 2 : 1;
      const ks = Array.from({ length: kmax + 1 }, (_, i) => i);
      chart.marker = k;
      chart.draw([{ x: ks, y: ks.map(pOf), color: C.qc, points: true, r: 4, width: 2 }]);
      chart.point(k, pOf(k), { r: 8, fill: "#ff76a8", stroke: "#fff", lw: 2 });
      note.textContent = msg;
    }
    reset();
  }
})();

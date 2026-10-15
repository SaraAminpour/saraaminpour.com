/* ml-w7d3: value iteration in the cat world. Each sweep applies the Bellman optimality update to every
   square; values spread back from the fish, and the greedy arrows become the best policy. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("bellman", "Value iteration, sweep by sweep", "values flow back from the fish");
    if (!card) return;
    const RL = QP.rl;
    let gamma = 0.9, slip = 0, V = RL.zeros(), sweeps = 0, delta = null, sel = [2, 2], timer = null, showArrows = true;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [0, RL.cols], ylim: [0, RL.rows], aspect: 1, equal: true, minH: 260, maxH: 400, grid: false, pad: 4 });
    const gS = ui.slider({ label: "discount γ", min: 0.3, max: 0.99, step: 0.01, value: gamma, fmt: (v) => v.toFixed(2), oninput: (v) => { gamma = v; reset(); } });
    const slipT = ui.toggle({ label: "slippery floor (20%)", checked: false, onchange: (v) => { slip = v ? 0.2 : 0; reset(); } });
    const arrowT = ui.toggle({ label: "show the greedy arrows", checked: true, onchange: (v) => { showArrows = v; draw(); } });
    const oneB = ui.button("One sweep", () => sweep(), "btn ml small");
    const allB = ui.button("Run until it settles", () => run(), "btn soft small");
    const zeroB = ui.button("Reset to 0", () => reset(), "btn soft small");
    const sN = ui.stat("sweeps", "0"), sD = ui.stat("biggest change in the last sweep", "–");
    const backup = h("div", { class: "vi-backup" });
    right.append(h("div", { class: "controls col" }, gS, slipT, arrowT), h("div", { class: "btn-row", style: { marginTop: "8px" } }, oneB, allB, zeroB), h("div", { class: "readout" }, sN, sD), h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "Tap a square to see its Bellman update"), backup);
    plot.onresize = draw;
    plot.on({ down: (p) => { const c = Math.floor(p.x), r = RL.rows - 1 - Math.floor(p.y); if (!RL.blocked(r, c)) { sel = [r, c]; draw(); } } });

    function reset() { stop(); V = RL.zeros(); sweeps = 0; delta = null; draw(); }
    function sweep() {
      const nV = RL.sweep(V, gamma, slip);
      delta = Math.max(...nV.flatMap((row, r) => row.map((v, c) => Math.abs(v - V[r][c]))));
      V = nV;
      sweeps++;
      draw();
      return delta;
    }
    function stop() { if (timer) clearInterval(timer); timer = null; allB.textContent = "Run until it settles"; }
    function run() {
      if (timer) return stop();
      allB.textContent = "Pause";
      timer = setInterval(() => { if (sweep() < 1e-4 || sweeps > 300) stop(); }, QP.reduceMotion ? 20 : 220);
    }
    const color = (v) => {
      // negative: peach, zero: white, positive: mint
      const t = Math.max(-1, Math.min(1, v));
      const a = t < 0 ? [255, 176, 140] : [127, 224, 196];
      const k = Math.abs(t) ** 0.6;
      return `rgb(${Math.round(255 + (a[0] - 255) * k)},${Math.round(255 + (a[1] - 255) * k)},${Math.round(255 + (a[2] - 255) * k)})`;
    };
    function draw() {
      plot.clear("#fff");
      RL.drawGrid(plot, { fill: (r, c) => color(V[r][c]) });
      const pol = RL.greedy(V, gamma, slip);
      for (let r = 0; r < RL.rows; r++) for (let c = 0; c < RL.cols; c++) {
        if (RL.blocked(r, c) || RL.terminal([r, c])) continue;
        const y = RL.rows - 1 - r;
        plot.text(V[r][c].toFixed(2).replace("-", "−"), c + 0.5, y + 0.4, { size: 11, color: C.ink2, font: "mono", weight: 700 });
        if (showArrows && sweeps > 0) plot.text(RL.ARROWS[pol[r][c]], c + 0.5, y + 0.72, { size: 18, color: C.qc, font: "head" });
      }
      const [sr, sc] = sel;
      plot.rect(sc + 0.03, RL.rows - 1 - sr + 0.03, sc + 0.97, RL.rows - sr - 0.03, { stroke: C.ink, width: 3 });
      sN.set(String(sweeps));
      sD.set(delta == null ? "–" : delta < 1e-4 ? "≈ 0, settled" : delta.toFixed(4), delta != null && delta < 1e-4 ? "good" : "");
      // the Bellman update of the selected square
      if (RL.terminal(sel)) { backup.innerHTML = "The fish ends the episode: nothing comes after it, so its value is 0 (the +1 is paid when the cat arrives)."; return; }
      const q = RL.qValues(V, sel, gamma, slip);
      const best = q.indexOf(Math.max(...q));
      const fmt = (v) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(3);
      backup.innerHTML = `<div class="vi-title">Square (row ${sr}, column ${sc}): one look ahead</div>` +
        q.map((v, a) => {
          const outs = RL.outcomes(sel, a, slip);
          const terms = outs.map((o) => `${outs.length > 1 ? o.p.toFixed(1) + "×" : ""}(${fmt(o.r)} + ${gamma.toFixed(2)}×${fmt(o.done ? 0 : V[o.s2[0]][o.s2[1]])})`).join(" + ");
          return `<div class="vi-q${a === best ? " best" : ""}"><b>Q(s, ${RL.NAMES[a]})</b> = ${terms} = <b>${fmt(v)}</b></div>`;
        }).join("") +
        `<div class="vi-v">New V(s) = the largest of the four = <b>${fmt(q[best])}</b>, and the best action is <b>${RL.NAMES[best]}</b>.</div>`;
    }
    draw();
  }
})();

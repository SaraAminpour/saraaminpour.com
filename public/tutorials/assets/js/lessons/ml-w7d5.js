/* ml-w7d5: the cart-pole. Balance it yourself, or watch the notebook's REINFORCE policy (weights exported by
   tools/data_ml_w7d5.py) after 0, 50, 150 and 400 episodes of training, running live in the browser. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  // the same physics as the notebook
  const P = { g: 9.8, mc: 1.0, mp: 0.1, l: 0.5, f: 10.0, dt: 0.02 };
  function physics(s, force) {
    const [x, xd, th, thd] = s, ct = Math.cos(th), st = Math.sin(th), m = P.mc + P.mp;
    const temp = (force + P.mp * P.l * thd * thd * st) / m;
    const thacc = (P.g * st - ct * temp) / (P.l * (4 / 3 - (P.mp * ct * ct) / m));
    const xacc = temp - (P.mp * P.l * thacc * ct) / m;
    return [x + P.dt * xd, xd + P.dt * xacc, th + P.dt * thd, thd + P.dt * thacc];
  }
  const fell = (s) => Math.abs(s[0]) > 2.4 || Math.abs(s[2]) > (12 * Math.PI) / 180;

  function widget() {
    const card = QP.widget("cartpole", "Keep the pole up", "you against the policy network");
    if (!card) return;
    fetch(QP.asset("data/ml-w7d5-cartpole.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the trained policy. Try reloading the page.")));

    function build(D) {
      let who = "you", speed = 1, s = null, steps = 0, running = false, push = 0, last = null, acc = 0, pRight = null;
      const best = {};
      const plot = new QP.Plot(card.body, { xlim: [-2.7, 2.7], ylim: [-0.35, 1.45], aspect: 0.34, equal: true, minH: 170, maxH: 300, grid: false });
      const opts = [{ value: "you", label: "You" }, ...Object.keys(D.checkpoints).map((k) => ({ value: k, label: k === "0" ? "Untrained" : `After ${k} episodes` }))];
      const whoSeg = ui.seg({ label: "Who balances?", options: opts, value: who, onchange: (v) => { who = v; reset(); } });
      const spSeg = ui.seg({ label: "Speed", options: [{ value: 1, label: "real time" }, { value: 0.5, label: "slow motion" }], value: speed, onchange: (v) => { speed = +v; } });
      const startB = ui.button("Start", () => start(), "btn ml small");
      const holdBtn = (label, dir) => {
        const b = h("button", { type: "button", class: "btn soft small cp-push" }, label);
        const on = (e) => { e.preventDefault(); push = dir; if (!running && who === "you") start(); };
        const off = () => { if (push === dir) push = 0; };
        b.addEventListener("pointerdown", on);
        b.addEventListener("pointerup", off);
        b.addEventListener("pointerleave", off);
        return b;
      };
      const leftB = holdBtn("◀ push left", -1), rightB = holdBtn("push right ▶", 1);
      const sS = ui.stat("steps up (50 per second)", "0"), sB = ui.stat("best for this player", "–");
      const probFill = h("div", { class: "cp-fill" });
      const probBox = h("div", { class: "cp-prob" }, h("span", null, "left"), h("div", { class: "cp-track" }, probFill), h("span", null, "right"));
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
      const chartHost = h("div");
      const chart = QP.chart(chartHost, { xlim: [0, D.lengths.length], ylim: [0, 210], aspect: 0.26, minH: 110, maxH: 150, xstep: 100, ystep: 100, xlabel: "training episode", ylabel: "steps" });
      card.body.append(h("div", { class: "controls col" }, whoSeg, spSeg), h("div", { class: "btn-row", style: { marginTop: "8px" } }, startB, leftB, rightB), probBox, h("div", { class: "readout" }, sS, sB), note, h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "The network's training: steps balanced in each episode (200 was the most it could score)"), chartHost);
      plot.onresize = draw;
      chart.onresize = drawChart;
      card.setAttribute("tabindex", "0");
      card.addEventListener("keydown", (e) => {
        if (who !== "you" || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        e.preventDefault();
        push = e.key === "ArrowLeft" ? -1 : 1;
        if (!running) start();
      });
      card.addEventListener("keyup", (e) => { if (e.key === "ArrowLeft" && push === -1) push = 0; if (e.key === "ArrowRight" && push === 1) push = 0; });

      function act(state) {
        const [W1, b1, W2, b2] = D.checkpoints[who];
        const hdn = W1.map((row, j) => Math.tanh(row.reduce((t, w, i) => t + w * state[i], b1[j])));
        const z = W2.map((row, k) => row.reduce((t, w, j) => t + w * hdn[j], b2[k]));
        pRight = 1 / (1 + Math.exp(z[0] - z[1]));
        return z[1] > z[0] ? 1 : -1; // greedy: the more likely push
      }
      function reset() {
        running = false;
        s = [0.02 * (Math.random() * 2 - 1), 0, 0.03 * (Math.random() * 2 - 1), 0];
        steps = 0; push = 0; pRight = null;
        leftB.hidden = rightB.hidden = who !== "you";
        probBox.hidden = who === "you";
        startB.textContent = "Start";
        note.textContent = who === "you" ? "Press Start, then hold the buttons (or the arrow keys) to push the cart. Keep the pole within 12° and the cart on the track." : "Press Start and watch. The bar shows how strongly the network wants to push right.";
        draw();
        drawChart();
      }
      function start() {
        if (running) return;
        if (steps > 0 || fell(s)) reset();
        running = true;
        startB.textContent = "Running…";
        last = null;
        acc = 0;
        requestAnimationFrame(loop);
      }
      function loop(now) {
        if (!running) return;
        if (last == null) last = now;
        acc += Math.min(0.1, (now - last) / 1000) * speed;
        last = now;
        while (acc >= P.dt && running) {
          acc -= P.dt;
          const dir = who === "you" ? push : act(s);
          s = physics(s, dir * P.f);
          steps++;
          if (fell(s) || steps >= 1000) finish();
        }
        draw();
        if (running) requestAnimationFrame(loop);
      }
      function finish() {
        running = false;
        startB.textContent = "Again";
        best[who] = Math.max(best[who] || 0, steps);
        const secs = (steps * P.dt).toFixed(1);
        note.textContent = steps >= 1000 ? `${who === "you" ? "Incredible" : "Balanced"}: 1,000 steps (20 seconds), the limit here.`
          : who === "you" ? `You kept it up for ${steps} steps (${secs} seconds). Random pushing manages about 20. Can you beat the network?`
          : `Fell after ${steps} steps (${secs} seconds).` + (who === "0" ? " An untrained network pushes the same way every time." : "");
      }
      function draw() {
        const [x, , th] = s;
        plot.clear("#fcfbff");
        plot.seg(-2.4, -0.02, 2.4, -0.02, { color: C.ink3, width: 3 });
        plot.seg(-2.4, -0.12, -2.4, 0.08, { color: "#e5566b", width: 3 });
        plot.seg(2.4, -0.12, 2.4, 0.08, { color: "#e5566b", width: 3 });
        plot.rect(x - 0.25, 0.0, x + 0.25, 0.22, { fill: "#7fe0c4", stroke: C.ink, width: 2 });
        const tipX = x + Math.sin(th) * 1.0, tipY = 0.22 + Math.cos(th) * 1.0;
        const danger = Math.abs(th) > (8 * Math.PI) / 180;
        plot.seg(x, 0.22, tipX, tipY, { color: danger ? "#e5566b" : "#ff8a50", width: 7 });
        plot.point(tipX, tipY, { r: 6, fill: danger ? "#e5566b" : "#ff8a50", stroke: C.ink, lw: 2 });
        plot.point(x, 0.22, { r: 4, fill: C.ink, stroke: null });
        const dir = who === "you" ? push : running ? (pRight > 0.5 ? 1 : -1) : 0;
        if (dir) plot.arrow(x - dir * 0.45, 0.11, x - dir * 0.26, 0.11, { color: C.qc, width: 3, head: 8 });
        sS.set(String(steps));
        sB.set(best[who] != null ? String(best[who]) : "–");
        if (pRight != null) probFill.style.width = `${(pRight * 100).toFixed(1)}%`;
      }
      function drawChart() {
        const xs = D.lengths.map((_, i) => i + 1);
        chart.marker = who === "you" ? null : +who;
        chart.draw([{ x: xs, y: D.lengths, color: "#ffb08a", width: 1.5 }]);
      }
      reset();
    }
  }
})();

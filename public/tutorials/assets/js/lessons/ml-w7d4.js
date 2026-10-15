/* w6d3: Q-learning in a gridworld, with a cat, a fish and a puddle. */
(function () {
  const { h, ui } = QP;
  const MAZE = ["S...#.", ".##.#.", "...P..", ".#.##.", ".#....", "...#.F"];
  const R = MAZE.length, Cc = MAZE[0].length;
  const MOVES = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("maze", "Train the cat", "Train, then watch the arrows");
    if (!card) return;
    const C = QP.colors;
    let alpha = 0.5, gamma = 0.95, eps = 0.2, speed = "fast";
    let Q, pos, episode, steps, lengths, running = null, mode = "learn", V = null, sweeps = 0;
    const rng = QP.rng((Math.random() * 2147483647) | 0);
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const stage = h("div", { class: "widget-stage", style: { background: "#fcfbff" } });
    const cv = h("canvas");
    stage.appendChild(cv);
    left.appendChild(stage);
    const trainB = ui.button("Train", () => toggle(), "btn ml small");
    const planB = ui.button("Plan instead (value iteration)", () => plan(), "btn soft small");
    const resetB = ui.button("Reset the cat's memory", () => reset(), "btn soft small");
    const speedSeg = ui.seg({ label: "Speed", options: [{ value: "slow", label: "Watch every step" }, { value: "fast", label: "Fast" }], value: speed, onchange: (v) => (speed = v) });
    const aS = ui.slider({ label: "α (learning rate)", min: 0.05, max: 1, step: 0.05, value: alpha, fmt: (v) => v.toFixed(2), oninput: (v) => (alpha = v) });
    const gS = ui.slider({ label: "γ (discount)", min: 0.3, max: 0.99, step: 0.01, value: gamma, fmt: (v) => v.toFixed(2), oninput: (v) => (gamma = v) });
    const eS = ui.slider({ label: "ε (explore)", min: 0, max: 0.6, step: 0.01, value: eps, fmt: (v) => v.toFixed(2), oninput: (v) => (eps = v) });
    const sE = ui.stat("episodes", "0"), sL = ui.stat("last episode", "–");
    const chart = QP.chart(null, { xlim: [0, 50], ylim: [0, 120], aspect: 0.45, minH: 120, maxH: 170, xlabel: "episode", ylabel: "steps", ystep: 40 });
    right.append(h("div", { class: "btn-row" }, trainB, resetB), h("div", { style: { marginTop: "8px" } }, planB), h("div", { class: "controls col" }, speedSeg, aS, gS, eS), h("div", { class: "readout" }, sE, sL), h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "Steps to the fish per episode"), chart.stage);
    chart.resize();

    const cellOf = (r, c) => MAZE[r][c];
    function stepEnv([r, c], a) {
      let nr = r + MOVES[a][0], nc = c + MOVES[a][1];
      if (nr < 0 || nr >= R || nc < 0 || nc >= Cc || cellOf(nr, nc) === "#") { nr = r; nc = c; }
      const cell = cellOf(nr, nc);
      if (cell === "F") return { s: [nr, nc], r: 1, done: true };
      if (cell === "P") return { s: [nr, nc], r: -1, done: false };
      return { s: [nr, nc], r: -0.04, done: false };
    }
    function reset() {
      stop();
      Q = Array.from({ length: R }, () => Array.from({ length: Cc }, () => [0, 0, 0, 0]));
      pos = [0, 0];
      episode = 0;
      steps = 0;
      lengths = [];
      mode = "learn";
      V = null;
      sweeps = 0;
      draw();
    }
    function act(s) {
      if (rng() < eps) return Math.floor(rng() * 4);
      const q = Q[s[0]][s[1]];
      const m = Math.max(...q);
      const best = [0, 1, 2, 3].filter((a) => q[a] === m);
      return best[Math.floor(rng() * best.length)];
    }
    function learnStep() {
      const a = act(pos);
      const { s, r, done } = stepEnv(pos, a);
      const q = Q[pos[0]][pos[1]];
      const target = r + (done ? 0 : gamma * Math.max(...Q[s[0]][s[1]]));
      q[a] += alpha * (target - q[a]);
      pos = s;
      steps++;
      if (done || steps >= 200) {
        lengths.push(steps);
        episode++;
        pos = [0, 0];
        steps = 0;
        return true;
      }
      return false;
    }
    function toggle() {
      if (running) return stop();
      mode = "learn";
      trainB.textContent = "Pause";
      let frame = 0;
      running = QP.loop(() => {
        frame++;
        if (speed === "slow") {
          if (frame % 6 !== 0) return;
          learnStep();
        } else {
          for (let e = 0; e < 2; e++) while (!learnStep()) { /* run a whole episode */ }
        }
        draw();
        if (episode >= 300) {
          stop();
          return false;
        }
      });
    }
    function stop() {
      if (running) running.stop();
      running = null;
      trainB.textContent = "Train";
    }
    function plan() {
      stop();
      mode = "plan";
      V = Array.from({ length: R }, () => new Array(Cc).fill(0));
      sweeps = 0;
      const tick = () => {
        if (mode !== "plan") return;
        const nv = V.map((row) => row.slice());
        for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) {
          if ("#F".includes(cellOf(r, c))) continue;
          nv[r][c] = Math.max(...[0, 1, 2, 3].map((a) => {
            const o = stepEnv([r, c], a);
            return o.r + (o.done ? 0 : gamma * V[o.s[0]][o.s[1]]);
          }));
        }
        V = nv;
        sweeps++;
        draw();
        if (sweeps < 25) setTimeout(tick, 220);
      };
      tick();
    }
    function value(r, c) {
      if (mode === "plan" && V) return V[r][c];
      return Math.max(...Q[r][c]);
    }
    function bestAction(r, c) {
      if (mode === "plan" && V) {
        const vals = [0, 1, 2, 3].map((a) => { const o = stepEnv([r, c], a); return o.r + (o.done ? 0 : gamma * V[o.s[0]][o.s[1]]); });
        return vals.indexOf(Math.max(...vals));
      }
      const q = Q[r][c];
      if (q.every((v) => v === 0)) return -1;
      return q.indexOf(Math.max(...q));
    }
    function draw() {
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const W = Math.max(240, stage.clientWidth);
      const S = Math.floor((W - 20) / Cc);
      const H = S * R + 20;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.height = H + "px";
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const ox = (W - S * Cc) / 2, oy = 10;
      for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) {
        const x = ox + c * S, y = oy + r * S, cell = cellOf(r, c);
        ctx.save();
        QP.roundRect(ctx, x + 2, y + 2, S - 4, S - 4, 10);
        if (cell === "#") ctx.fillStyle = "#3a3456";
        else {
          const v = QP.math.clamp((value(r, c) + 0.3) / 1.3, 0, 1);
          const lo = [250, 248, 255], hi = [123, 92, 250];
          ctx.fillStyle = `rgb(${lo.map((l, i) => Math.round(l + (hi[i] - l) * v)).join(",")})`;
        }
        ctx.fill();
        ctx.restore();
        if (cell === "P") drawPuddle(ctx, x + S / 2, y + S / 2, S);
        if (cell === "F") drawFish(ctx, x + S / 2, y + S / 2, S);
        if (cell !== "#" && cell !== "F") {
          const a = bestAction(r, c);
          if (a >= 0) {
            const v = QP.math.clamp((value(r, c) + 0.3) / 1.3, 0, 1);
            ctx.save();
            ctx.translate(x + S / 2, y + S / 2);
            ctx.rotate([-Math.PI / 2, 0, Math.PI / 2, Math.PI][a]);
            ctx.strokeStyle = ctx.fillStyle = v > 0.55 ? "#fff" : "#2c2842";
            ctx.globalAlpha = 0.75;
            ctx.lineWidth = 2.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(-S * 0.18, 0);
            ctx.lineTo(S * 0.14, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(S * 0.22, 0);
            ctx.lineTo(S * 0.08, -S * 0.09);
            ctx.lineTo(S * 0.08, S * 0.09);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }
      if (mode === "learn") drawCat(ctx, ox + pos[1] * S + S / 2, oy + pos[0] * S + S / 2, S);
      sE.set(mode === "plan" ? `${sweeps} sweeps` : String(episode));
      sL.set(lengths.length ? `${lengths[lengths.length - 1]} steps` : "–");
      chart.o.xlim = [0, Math.max(50, lengths.length)];
      chart.draw(lengths.length ? [{ x: lengths.map((_, i) => i + 1), y: lengths.map((v) => Math.min(120, v)), color: C.qml, width: 2 }] : []);
    }
    function drawCat(ctx, x, y, S) {
      const r = S * 0.28;
      ctx.save();
      ctx.fillStyle = "#ffc7ae";
      ctx.strokeStyle = "#2c2842";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.95, y - r * 0.2);
      ctx.lineTo(x - r * 0.75, y - r * 1.25);
      ctx.lineTo(x - r * 0.2, y - r * 0.85);
      ctx.lineTo(x + r * 0.2, y - r * 0.85);
      ctx.lineTo(x + r * 0.75, y - r * 1.25);
      ctx.lineTo(x + r * 0.95, y - r * 0.2);
      ctx.arc(x, y, r * 0.98, -0.2, Math.PI + 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2c2842";
      ctx.beginPath(); ctx.arc(x - r * 0.38, y, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.38, y, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff8fb8";
      ctx.beginPath(); ctx.arc(x, y + r * 0.25, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawFish(ctx, x, y, S) {
      const r = S * 0.24;
      ctx.save();
      ctx.fillStyle = "#7cc4ff";
      ctx.strokeStyle = "#2c2842";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x - r * 0.15, y, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + r * 0.75, y);
      ctx.lineTo(x + r * 1.35, y - r * 0.55);
      ctx.lineTo(x + r * 1.35, y + r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2c2842";
      ctx.beginPath(); ctx.arc(x - r * 0.65, y - r * 0.1, r * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawPuddle(ctx, x, y, S) {
      ctx.save();
      ctx.fillStyle = "rgba(124,196,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(x, y + S * 0.12, S * 0.3, S * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - S * 0.26);
      ctx.quadraticCurveTo(x + S * 0.13, y - S * 0.02, x, y + S * 0.02);
      ctx.quadraticCurveTo(x - S * 0.13, y - S * 0.02, x, y - S * 0.26);
      ctx.fill();
      ctx.restore();
    }
    if ("ResizeObserver" in window) new ResizeObserver(() => Q && draw()).observe(stage);
    chart.onresize = () => Q && draw();
    reset();
  }
})();

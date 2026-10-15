/* ml-w7d1: the cat world as an MDP. Play episodes by hand and watch the discounted return add up,
   or paint a policy (an arrow per square) and evaluate it over many episodes. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("mdp", "Be the agent", "states, actions, rewards");
    if (!card) return;
    const RL = QP.rl;
    let mode = "play", gamma = 0.9, slip = 0, pos = RL.START.slice(), t = 0, G = 0, sum = 0, done = false, log = [], mood = "";
    let policy = RL.MAZE.map((row) => [...row].map(() => 1)); // every square: right
    let anim = null;
    const rng = QP.rng((Math.random() * 2147483647) | 0);
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const plot = new QP.Plot(left, { xlim: [0, RL.cols], ylim: [0, RL.rows], aspect: 1, equal: true, minH: 260, maxH: 400, grid: false, pad: 4 });
    const modeSeg = ui.seg({ label: "Mode", options: [{ value: "play", label: "Play an episode" }, { value: "policy", label: "Design a policy" }], value: mode, onchange: (v) => { mode = v; stopAnim(); newEpisode(); panel(); } });
    const gS = ui.slider({ label: "discount γ", min: 0, max: 0.99, step: 0.01, value: gamma, fmt: (v) => v.toFixed(2), oninput: (v) => { gamma = v; recompute(); } });
    const slipT = ui.toggle({ label: "slippery floor (20% chance to slip sideways)", checked: false, onchange: (v) => { slip = v ? 0.2 : 0; stats.textContent = ""; } });
    // play panel
    const pad = h("div", { class: "rl-pad" }, ...[["↑", 0, "up"], ["←", 3, "left"], ["→", 1, "right"], ["↓", 2, "down"]].map(([lab, a, name]) => h("button", { type: "button", class: "btn soft small rl-" + name, onclick: () => act(a), "aria-label": name }, lab)));
    const newB = ui.button("New episode", () => newEpisode(), "btn soft small");
    const sT = ui.stat("time step t", "0"), sG = ui.stat("return G (discounted)", "0"), sS = ui.stat("plain sum of rewards", "0");
    const logEl = h("div", { class: "rl-log" });
    const playPanel = h("div", null, h("div", { class: "kbd-hint" }, "Move the cat (or use the arrow keys)"), pad, h("div", { class: "readout" }, sT, sG, sS), logEl, h("div", { class: "btn-row", style: { marginTop: "6px" } }, newB));
    // policy panel
    const runB = ui.button("Run 200 episodes", () => evaluate(), "btn ml small");
    const watchB = ui.button("Watch one run", () => watch(), "btn soft small");
    const presets = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Start from"),
      ui.button("all →", () => { policy = policy.map((row) => row.map(() => 1)); draw(); stats.textContent = ""; }, "btn soft tiny"),
      ui.button("random arrows", () => { policy = policy.map((row) => row.map(() => Math.floor(rng() * 4))); draw(); stats.textContent = ""; }, "btn soft tiny"));
    const stats = h("div", { class: "small", style: { fontWeight: 800, color: C.ink2, minHeight: "3.6em", marginTop: "8px" } });
    const policyPanel = h("div", null, h("div", { class: "kbd-hint" }, "Tap a square to turn its arrow. That table of arrows is a policy."), presets, h("div", { class: "btn-row", style: { marginTop: "8px" } }, runB, watchB), stats);
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    right.append(h("div", { class: "controls col" }, modeSeg, gS, slipT), playPanel, policyPanel);
    card.body.append(note);
    plot.onresize = draw;

    plot.on({ down: (p) => {
      if (mode !== "policy" || anim) return;
      const c = Math.floor(p.x), r = RL.rows - 1 - Math.floor(p.y);
      if (RL.blocked(r, c) || RL.terminal([r, c])) return;
      policy[r][c] = (policy[r][c] + 1) % 4;
      stats.textContent = "";
      draw();
    } });
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", (e) => {
      const a = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
      if (a == null || mode !== "play") return;
      e.preventDefault();
      act(a);
    });

    function panel() {
      playPanel.hidden = mode !== "play";
      policyPanel.hidden = mode !== "policy";
      note.textContent = mode === "play" ? "Each step costs 0.04, the puddle costs 1, the fish is worth 1 and ends the episode." : "A policy says what to do in every state. Run it many times: with a slippery floor the same policy gives different episodes.";
    }
    function newEpisode() {
      pos = RL.START.slice(); t = 0; G = 0; sum = 0; done = false; log = []; mood = "";
      readouts();
      draw();
    }
    function recompute() {
      G = log.reduce((s, e) => s + Math.pow(gamma, e.t - 1) * e.r, 0);
      readouts();
    }
    function act(a) {
      if (done) return;
      const o = RL.step(pos, a, slip, rng);
      pos = o.s2;
      G += Math.pow(gamma, t) * o.r;
      sum += o.r;
      t++;
      done = o.done;
      mood = done ? "happy" : RL.MAZE[pos[0]][pos[1]] === "P" ? "wet" : "";
      log.unshift({ t, a, dir: o.dir, r: o.r });
      log.length = Math.min(log.length, 400);
      readouts();
      draw();
      if (done) QP.confettiAt(plot.stage, 30);
    }
    function readouts() {
      sT.set(String(t));
      sG.set((G >= 0 ? "" : "−") + Math.abs(G).toFixed(3));
      sS.set((sum >= 0 ? "" : "−") + Math.abs(sum).toFixed(2));
      logEl.innerHTML = log.slice(0, 5).map((e) => `<div>t = ${e.t}: ${RL.NAMES[e.a]}${e.dir !== e.a ? ` <b class="slip">slipped ${RL.NAMES[e.dir]}</b>` : ""} → reward ${e.r > 0 ? "+" : ""}${e.r}</div>`).join("")
        + (done ? `<div class="end">The fish! Episode over after ${t} steps. Return G = ${G.toFixed(3)} with γ = ${gamma.toFixed(2)}.</div>` : "");
    }
    function runEpisode(maxSteps = 100) {
      let s = RL.START.slice(), g = 0, k = 0, path = [s];
      while (k < maxSteps) {
        const o = RL.step(s, policy[s[0]][s[1]], slip, rng);
        g += Math.pow(gamma, k) * o.r;
        s = o.s2;
        path.push(s);
        k++;
        if (o.done) return { g, k, ok: true, path };
      }
      return { g, k, ok: false, path };
    }
    function evaluate() {
      const runs = Array.from({ length: 200 }, () => runEpisode());
      const avg = runs.reduce((a, b) => a + b.g, 0) / runs.length;
      const ok = runs.filter((x) => x.ok);
      stats.innerHTML = `Average return over 200 episodes: <b>${avg.toFixed(3)}</b>. The cat reached the fish in ${ok.length} of 200${ok.length ? `, in ${(ok.reduce((a, b) => a + b.k, 0) / ok.length).toFixed(1)} steps on average` : ""}.` + (ok.length < 200 ? " The other episodes were stopped after 100 steps." : "") + "<br><span class=\"muted\">That average estimates the value of the start square under your policy.</span>";
    }
    function stopAnim() { if (anim) clearInterval(anim); anim = null; }
    function watch() {
      stopAnim();
      const run = runEpisode(60);
      let i = 0;
      anim = setInterval(() => {
        pos = run.path[i];
        mood = i === run.path.length - 1 && run.ok ? "happy" : RL.MAZE[pos[0]][pos[1]] === "P" ? "wet" : "";
        draw();
        if (++i >= run.path.length) { stopAnim(); stats.textContent = run.ok ? `Reached the fish in ${run.k} steps: return ${run.g.toFixed(3)}.` : "No fish within 60 steps: this policy goes round in circles somewhere."; }
      }, QP.reduceMotion ? 30 : 260);
    }
    function draw() {
      plot.clear("#fff");
      RL.drawGrid(plot);
      if (mode === "policy") {
        for (let r = 0; r < RL.rows; r++) for (let c = 0; c < RL.cols; c++) {
          if (RL.blocked(r, c) || RL.terminal([r, c])) continue;
          plot.text(RL.ARROWS[policy[r][c]], c + 0.5, RL.rows - 1 - r + 0.55, { size: 22, color: C.qc, font: "head" });
        }
      }
      RL.drawCat(plot, pos[1] + 0.5, RL.rows - 1 - pos[0] + 0.5, mood);
    }
    panel();
    newEpisode();
  }
})();

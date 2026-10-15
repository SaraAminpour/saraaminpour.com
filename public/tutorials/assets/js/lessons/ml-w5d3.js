/* ml-w5d3: backpropagation. A tiny network as a computational graph: values flow forward, gradients flow back. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const sig = (z) => 1 / (1 + Math.exp(-z));
  const f3 = (v) => (Math.abs(v) < 5e-4 ? "0.000" : v.toFixed(3).replace("-", "−"));
  const par = (v) => (v < 0 ? `(${f3(v)})` : f3(v));
  const SUB = { w1: "w₁", b1: "b₁", w2: "w₂", b2: "b₂" };

  function widget() {
    const card = QP.widget("backprop", "Forward, then backward", "x → z₁ → h → z₂ → p → loss");
    if (!card) return;
    const P0 = { w1: 1.5, b1: -0.5, w2: -2.0, b2: 0.5 };
    const P = { ...P0 };
    let x = 1.0, y = 1, phase = 0, timer = null, stepN = 0; // phase: 0 nothing, 1 forward shown, 2 backward shown
    const nodes = [
      { k: "x", label: "x", op: "input" },
      { k: "z1", label: "z₁", op: "w₁·x + b₁" },
      { k: "h", label: "h", op: "tanh(z₁)" },
      { k: "z2", label: "z₂", op: "w₂·h + b₂" },
      { k: "p", label: "p", op: "σ(z₂)" },
      { k: "L", label: "L", op: "cross-entropy" },
    ];
    const row = h("div", { class: "bp-row" });
    const els = {};
    nodes.forEach((n, i) => {
      const val = h("div", { class: "bp-val" }, "?");
      const grad = h("div", { class: "bp-grad" }, "");
      const el = h("div", { class: "bp-node" }, h("div", { class: "bp-lab" }, n.label), h("div", { class: "bp-op" }, n.op), val, grad);
      els[n.k] = { el, val, grad };
      row.appendChild(el);
      if (i < nodes.length - 1) row.appendChild(h("div", { class: "bp-arrow" }, "→"));
    });
    const eq = h("div", { class: "bp-eq" });
    const params = h("div", { class: "bp-params" });
    const pEls = {};
    for (const k of ["w1", "b1", "w2", "b2"]) {
      const v = h("span", { class: "bp-pv" }), g = h("span", { class: "bp-pg" });
      pEls[k] = { v, g };
      params.appendChild(h("div", { class: "bp-param" }, h("b", null, SUB[k]), " = ", v, g));
    }
    const xS = ui.slider({ label: "input x", min: -2, max: 2, step: 0.1, value: x, fmt: (v) => v.toFixed(1), color: C.ml, oninput: (v) => { x = v; phase = 0; paint(); } });
    const ySeg = ui.seg({ label: "true label y", options: [0, 1], value: y, onchange: (v) => { y = +v; phase = 0; paint(); } });
    const fwd = ui.button("1 · Forward pass", () => animate(1), "btn ml small");
    const bwd = ui.button("2 · Backward pass", () => animate(2), "btn qc small");
    const upd = ui.button("3 · Gradient step (η = 0.5)", () => update(), "btn soft small");
    const rst = ui.button("Reset", () => { stop(); Object.assign(P, P0); stepN = 0; phase = 0; paint(); }, "btn soft small");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "8px" } });
    card.body.append(h("div", { class: "controls" }, xS, ySeg), h("div", { class: "bp-wrap" }, row), eq, params, h("div", { class: "btn-row", style: { marginTop: "10px" } }, fwd, bwd, upd, rst), note);

    function compute() {
      const z1 = P.w1 * x + P.b1, hh = Math.tanh(z1), z2 = P.w2 * hh + P.b2, p = sig(z2);
      const pc = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
      const L = y === 1 ? -Math.log(pc) : -Math.log(1 - pc);
      const dp = y === 1 ? -1 / pc : 1 / (1 - pc);
      const dz2 = p - y, dh = dz2 * P.w2, dz1 = dh * (1 - hh * hh);
      return {
        v: { x, z1, h: hh, z2, p, L },
        g: { L: 1, p: dp, z2: dz2, h: dh, z1: dz1, x: dz1 * P.w1 },
        pg: { w1: dz1 * x, b1: dz1, w2: dz2 * hh, b2: dz2 },
      };
    }
    // the sum each box does, with today's numbers
    function fwdEq(k, r) {
      const v = r.v;
      return {
        x: `x = ${f3(v.x)}: the input.`,
        z1: `z₁ = w₁·x + b₁ = ${f3(P.w1)} × ${par(v.x)} + ${par(P.b1)} = ${f3(v.z1)}`,
        h: `h = tanh(z₁) = tanh(${f3(v.z1)}) = ${f3(v.h)}`,
        z2: `z₂ = w₂·h + b₂ = ${f3(P.w2)} × ${par(v.h)} + ${par(P.b2)} = ${f3(v.z2)}`,
        p: `p = σ(z₂) = 1 / (1 + e^(−z₂)) = ${f3(v.p)}, the network's probability that y = 1`,
        L: y === 1 ? `L = −log p = −log ${f3(v.p)} = ${f3(v.L)}, because the true label is y = 1` : `L = −log(1 − p) = −log ${f3(1 - v.p)} = ${f3(v.L)}, because the true label is y = 0`,
      }[k];
    }
    function bwdEq(k, r) {
      const v = r.v, g = r.g;
      return {
        L: "∂L/∂L = 1: start at the loss and walk back.",
        p: y === 1 ? `∂L/∂p = −1/p = −1/${f3(v.p)} = ${f3(g.p)}` : `∂L/∂p = 1/(1 − p) = 1/${f3(1 - v.p)} = ${f3(g.p)}`,
        z2: `∂L/∂z₂ = ∂L/∂p × σ′(z₂) = ${f3(g.p)} × ${f3(v.p * (1 - v.p))} = ${f3(g.z2)}, which is just p − y`,
        h: `∂L/∂h = ∂L/∂z₂ × w₂ = ${f3(g.z2)} × ${par(P.w2)} = ${f3(g.h)}`,
        z1: `∂L/∂z₁ = ∂L/∂h × tanh′(z₁) = ${f3(g.h)} × (1 − h²) = ${f3(g.h)} × ${f3(1 - v.h * v.h)} = ${f3(g.z1)}`,
        x: `∂L/∂x = ∂L/∂z₁ × w₁ = ${f3(g.z1)} × ${par(P.w1)} = ${f3(g.x)} (not needed for training, but free)`,
      }[k];
    }
    function stop() { if (timer) clearInterval(timer); timer = null; Object.values(els).forEach((e) => e.el.classList.remove("hot", "fwd", "bwd")); }
    function animate(target) {
      if (timer) return;
      if (target === 2 && phase < 1) { phase = 1; paint(); }
      const order = target === 1 ? nodes.map((n) => n.k) : nodes.map((n) => n.k).reverse();
      const r = compute();
      if (target === 1) { phase = 0; paint(); }
      else for (const n of nodes) els[n.k].grad.textContent = "";
      for (const k in P) pEls[k].g.textContent = "";
      note.textContent = target === 1 ? "Forward pass: each box uses the value from the box before it." : "Backward pass: each box multiplies the gradient arriving from the right by its own local slope.";
      let i = 0;
      const tick = () => {
        const k = order[i];
        Object.values(els).forEach((e) => e.el.classList.remove("hot", "fwd", "bwd"));
        els[k].el.classList.add("hot", target === 1 ? "fwd" : "bwd");
        if (target === 1) els[k].val.textContent = f3(r.v[k]);
        else els[k].grad.textContent = gradText(k, r);
        eq.textContent = target === 1 ? fwdEq(k, r) : bwdEq(k, r);
        eq.className = "bp-eq " + (target === 1 ? "fwd" : "bwd");
        i++;
        if (i >= order.length) {
          clearInterval(timer);
          timer = null;
          phase = target;
          setTimeout(() => { if (!timer) Object.values(els).forEach((e) => e.el.classList.remove("hot", "fwd", "bwd")); }, 900);
          paint(true);
        }
      };
      tick();
      timer = setInterval(tick, QP.reduceMotion ? 30 : 1100);
    }
    const gradText = (k, r) => `∂L/∂${nodes.find((n) => n.k === k).label} = ${f3(r.g[k])}`;
    function update() {
      stop();
      const r = compute();
      for (const k in P) P[k] -= 0.5 * r.pg[k];
      stepN++;
      phase = 1;
      const r2 = compute();
      paint();
      eq.textContent = `w₁ ← w₁ − 0.5 × ∂L/∂w₁, and the same for b₁, w₂ and b₂.`;
      eq.className = "bp-eq";
      note.textContent = `Step ${stepN}: every weight moved a little against its own gradient. The loss went from ${f3(r.v.L)} to ${f3(r2.v.L)}. Run Backward again for the new gradients, or keep stepping.`;
    }
    function paint(keepEq) {
      const r = compute();
      for (const n of nodes) {
        els[n.k].val.textContent = phase >= 1 || n.k === "x" ? f3(r.v[n.k]) : "?";
        els[n.k].grad.textContent = phase >= 2 ? gradText(n.k, r) : "";
      }
      for (const k in P) {
        pEls[k].v.textContent = f3(P[k]);
        pEls[k].g.textContent = phase >= 2 ? `   ∂L/∂${SUB[k]} = ${f3(r.pg[k])}` : "";
      }
      if (!keepEq) { eq.textContent = phase === 0 ? "Each box will show its sum here, one at a time." : ""; eq.className = "bp-eq"; }
      note.textContent = phase === 0 ? "Press Forward: each box computes its value from the one before."
        : phase === 1 ? "Now Backward: starting from the loss, each box multiplies the gradient arriving from the right by its own local slope."
        : `Every gradient from one backward sweep, and the weights' gradients came along the way: ∂L/∂w₂ = ∂L/∂z₂ × h and ∂L/∂w₁ = ∂L/∂z₁ × x. Now take a gradient step.`;
    }
    paint();
  }
})();

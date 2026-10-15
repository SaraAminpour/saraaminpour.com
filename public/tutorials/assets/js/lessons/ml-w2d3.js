/* w2d5: PyTorch. Widgets: an animated computation graph, and the training loop line by line. */
(function () {
  const { h, ui } = QP;
  const XCM = [21.71, 24.74, 36.03, 31.64, 21.88, 28.66, 29.58, 23.19, 34.69, 22.27, 27.82, 30.33, 28.61, 31.74, 34.76, 39.13, 25.68, 32.97, 33.92, 25.85, 20.03, 39.47, 25.97, 26.28, 37.83];
  const Y = [10.7, 14.31, 17.44, 15.06, 11.44, 12.52, 13.86, 11.99, 17.89, 10.38, 14.24, 10.72, 15.17, 14.11, 14.78, 19.91, 13.11, 15.51, 15.15, 12.26, 8.94, 21.68, 13.33, 12.73, 20.37];
  QP.onReady(() => {
    graph();
    loop();
  });

  // ------------------------------------------------------------------ computation graph
  function graph() {
    const card = QP.widget("graph", "Autograd up close", "forward, then backward");
    if (!card) return;
    const C = QP.colors;
    const x = 2, y = 3, lr = 0.1;
    let w = 0.5, b = 0.2;
    let fwd = false, bwd = false, busy = false;
    const N = {
      x: { x: 70, y: 52, label: "x", sub: "input" },
      w: { x: 70, y: 168, label: "w", sub: "knob" },
      mul: { x: 230, y: 110, label: "×", op: true },
      b: { x: 230, y: 226, label: "b", sub: "knob" },
      add: { x: 390, y: 168, label: "+", op: true, sub: "prediction ŷ" },
      y: { x: 390, y: 52, label: "y", sub: "true price" },
      sub: { x: 550, y: 110, label: "−", op: true, sub: "error e" },
      sq: { x: 700, y: 110, label: "( )²", op: true, sub: "loss L" },
    };
    const E = [["x", "mul"], ["w", "mul"], ["mul", "add"], ["b", "add"], ["add", "sub"], ["y", "sub"], ["sub", "sq"]];
    const W = 790, H = 300;
    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;font-family:Fredoka, sans-serif">`;
    svg += `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#b9a7ff"/></marker></defs>`;
    for (const [a, c] of E) svg += `<line x1="${N[a].x + 40}" y1="${N[a].y}" x2="${N[c].x - 42}" y2="${N[c].y}" stroke="#d9d1ff" stroke-width="4" stroke-linecap="round" marker-end="url(#ah)"/>`;
    for (const [k, n] of Object.entries(N)) {
      const fill = n.op ? "#ece6ff" : k === "w" || k === "b" ? "#fff1cc" : "#fff";
      svg += `<g><rect x="${n.x - 40}" y="${n.y - 22}" width="80" height="44" rx="14" fill="${fill}" stroke="#2c2842" stroke-opacity=".7" stroke-width="2"/>`;
      svg += `<text x="${n.x}" y="${n.y + 7}" text-anchor="middle" font-size="20" font-weight="600" fill="#2c2842"${n.op ? "" : ' font-style="italic" font-family="Georgia, serif"'}>${n.label}</text>`;
      if (n.sub) svg += `<text x="${n.x}" y="${n.y + 40}" text-anchor="middle" font-size="11" font-weight="600" fill="#8a85a3" font-family="Nunito, sans-serif">${n.sub}</text>`;
      svg += `<text id="fv-${k}" x="${n.x}" y="${n.y - 30}" text-anchor="middle" font-size="13" font-weight="700" fill="#5b45d6" font-family="JetBrains Mono, monospace"></text>`;
      svg += `<text id="bv-${k}" x="${n.x}" y="${n.y + 56}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#e5568f" font-family="JetBrains Mono, monospace"></text></g>`;
    }
    svg += `<g id="dots"></g></svg>`;
    const stage = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "18px", padding: "10px", overflowX: "auto" }, html: svg });
    const wS = ui.slider({ label: "w", min: -2, max: 2, step: 0.05, value: w, fmt: (v) => v.toFixed(2), oninput: (v) => { w = v; fwd = bwd = false; paint(); } });
    const bS = ui.slider({ label: "b", min: -2, max: 2, step: 0.05, value: b, fmt: (v) => v.toFixed(2), oninput: (v) => { b = v; fwd = bwd = false; paint(); } });
    const fB = ui.button("1 · Forward pass", () => forward(), "btn ml small");
    const bB = ui.button("2 · Backward pass", () => backward(), "btn qc small");
    const sB = ui.button("3 · Gradient step", () => stepGD(), "btn soft small");
    const legend = h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "#5b45d6" } }), "values (forward)"), h("span", null, h("i", { style: { background: "#e5568f" } }), "gradients ∂L/∂· (backward)"), h("span", { class: "muted" }, "x = 2, y = 3, learning rate 0.1"));
    card.body.append(stage, h("div", { class: "controls" }, wS, bS), h("div", { class: "btn-row", style: { marginTop: "10px" } }, fB, bB, sB), legend);
    const $ = (id) => stage.querySelector("#" + id);

    function vals() {
      const u = w * x, v = u + b, e = v - y, L = e * e;
      const ge = 2 * e;
      return { u, v, e, L, ge, gw: ge * x, gb: ge, gx: ge * w };
    }
    function paint() {
      const s = vals();
      const f = (n) => (Math.abs(n) < 5e-4 ? "0.00" : n.toFixed(2));
      $("fv-x").textContent = "2";
      $("fv-y").textContent = "3";
      $("fv-w").textContent = f(w);
      $("fv-b").textContent = f(b);
      $("fv-mul").textContent = fwd ? f(s.u) : "?";
      $("fv-add").textContent = fwd ? f(s.v) : "?";
      $("fv-sub").textContent = fwd ? f(s.e) : "?";
      $("fv-sq").textContent = fwd ? "L = " + f(s.L) : "?";
      const g = (id, val) => ($("bv-" + id).textContent = bwd ? "∂L = " + f(val) : "");
      g("sq", 1); g("sub", s.ge); g("add", s.ge); g("mul", s.ge); g("b", s.gb); g("w", s.gw); g("y", -s.ge);
      $("bv-x").textContent = bwd ? "(not a knob)" : "";
    }
    function flow(edges, color, reverse, done) {
      busy = true;
      const g = stage.querySelector("#dots");
      g.innerHTML = "";
      const order = reverse ? edges.slice().reverse() : edges;
      const dots = order.map(([a, c], i) => {
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("r", "7");
        el.setAttribute("fill", color);
        el.setAttribute("opacity", "0");
        g.appendChild(el);
        return { el, a: N[a], c: N[c], delay: i * 110 };
      });
      const t0 = performance.now();
      const total = 520 + edges.length * 110;
      const tick = (now) => {
        const T = QP.reduceMotion ? total : now - t0;
        for (const d of dots) {
          const tt = QP.math.clamp((T - d.delay) / 520, 0, 1);
          const t = reverse ? 1 - tt : tt;
          const x1 = d.a.x + 40, y1 = d.a.y, x2 = d.c.x - 42, y2 = d.c.y;
          d.el.setAttribute("cx", x1 + (x2 - x1) * t);
          d.el.setAttribute("cy", y1 + (y2 - y1) * t);
          d.el.setAttribute("opacity", tt > 0 && tt < 1 ? "1" : "0");
        }
        if (T < total) requestAnimationFrame(tick);
        else {
          g.innerHTML = "";
          busy = false;
          done();
        }
      };
      requestAnimationFrame(tick);
    }
    function forward(cb) {
      if (busy) return;
      flow(E, "#7b5cfa", false, () => { fwd = true; bwd = false; paint(); cb && cb(); });
    }
    function backward() {
      if (busy) return;
      if (!fwd) return QP.toast("Run the forward pass first: backward needs its values.", "ui-sparkle");
      flow(E, "#ff6fa3", true, () => { bwd = true; paint(); });
    }
    function stepGD() {
      if (busy) return;
      if (!bwd) return QP.toast("Run forward and backward first, so we know the gradients.", "ui-sparkle");
      const s = vals();
      w = QP.math.clamp(w - lr * s.gw, -2, 2);
      b = QP.math.clamp(b - lr * s.gb, -2, 2);
      wS.set(w);
      bS.set(b);
      fwd = bwd = false;
      paint();
      forward(() => {
        const L = vals().L;
        if (L < 1e-3) QP.toast("Loss is zero: the prediction is exactly 3!", "ui-star");
      });
    }
    paint();
  }

  // ------------------------------------------------------------------ the loop, line by line
  function loop() {
    const card = QP.widget("loop", "The training loop, one line at a time", "SGD, learning rate 0.1");
    if (!card) return;
    const C = QP.colors;
    const mu = QP.math.mean(XCM);
    const sd = Math.sqrt(QP.math.mean(XCM.map((v) => (v - mu) ** 2)));
    const XS = XCM.map((v) => (v - mu) / sd);
    const lr = 0.1;
    let w, b, gw, gb, preds, loss, line, stepN, running = false;
    const lines = [
      "for step in range(100):",
      "    optimizer.zero_grad()",
      "    prediction = model(X)",
      "    loss = mse_loss(prediction, Y)",
      "    loss.backward()",
      "    optimizer.step()",
    ];
    const notes = [
      "Start the next step.",
      "Clear the old gradients: w.grad and b.grad become 0.",
      "Forward pass: the line predicts a price for every pizza (hollow dots).",
      "Measure how wrong we are: the mean of the squared residuals (orange).",
      "Backward pass: PyTorch fills in w.grad and b.grad.",
      "Step: move w and b a little against their gradients. Watch the line move!",
    ];
    const code = h("pre", { style: { margin: 0, padding: "14px 0", fontSize: "0.86rem", lineHeight: 1.9 } });
    const lineEls = lines.map((t) => {
      const el = h("div", { style: { padding: "0 14px", borderLeft: "4px solid transparent", transition: "background .25s, border-color .25s", whiteSpace: "pre" } }, t);
      code.appendChild(el);
      return el;
    });
    const codeBox = h("div", { class: "codecell", style: { margin: 0 } }, h("div", { class: "bar" }, h("span", { class: "dots" }, h("i"), h("i"), h("i")), h("span", { class: "name" }, "training loop")), code);
    const note = h("div", { class: "small", style: { marginTop: "10px", fontWeight: 700, color: C.ink2, minHeight: "2.6em" } });
    const left = h("div", null, codeBox, note);
    const right = h("div");
    card.body.append(h("div", { class: "side-by-side even" }, left, right));
    const plot = new QP.Plot(right, { xlim: [18, 42], ylim: [4, 24], aspect: 0.75, ticks: true, xlabel: "diameter (cm)", ylabel: "price ($)", minH: 240, maxH: 360 });
    const sStep = ui.stat("step", "0"), sW = ui.stat("w", "–"), sB = ui.stat("b", "–"), sGW = ui.stat("w.grad", "–"), sGB = ui.stat("b.grad", "–"), sL = ui.stat("loss", "–");
    const next = ui.button("Next line", () => nextLine(), "btn ml small");
    const one = ui.button("Run 1 step", () => runSteps(1), "btn soft small");
    const many = ui.button("Run 20 steps", () => runSteps(20), "btn soft small");
    const reset = ui.button("Reset", () => init(), "btn soft small");
    card.body.append(h("div", { class: "btn-row", style: { marginTop: "12px" } }, next, one, many, reset), h("div", { class: "readout" }, sStep, sW, sB, sGW, sGB, sL));

    function init() {
      running = false;
      w = -1.5; b = 6;
      gw = gb = null; preds = null; loss = null; line = -1; stepN = 0;
      paint();
    }
    const yAt = (xcm) => w * ((xcm - mu) / sd) + b;
    function paint() {
      lineEls.forEach((el, i) => {
        el.style.background = i === line ? "rgba(127,224,196,.18)" : "transparent";
        el.style.borderLeftColor = i === line ? "#7fe0c4" : "transparent";
      });
      note.textContent = line >= 0 ? notes[line] : "Press Next line to start.";
      plot.clear();
      if (loss != null && preds) XCM.forEach((xc, i) => plot.seg(xc, Y[i], xc, preds[i], { color: C.c0, width: 2 }));
      plot.line([18, 42], [yAt(18), yAt(42)], { color: C.qc, width: 4 });
      XCM.forEach((xc, i) => plot.point(xc, Y[i], { r: 5, fill: C.c1, stroke: "#fff", lw: 1.5 }));
      if (preds) XCM.forEach((xc, i) => plot.point(xc, preds[i], { r: 4.5, fill: "#fff", stroke: C.qc, lw: 2 }));
      const f = (v) => (v == null ? "–" : v.toFixed(3));
      sStep.set(String(stepN));
      sW.set(f(w));
      sB.set(f(b));
      sGW.set(f(gw));
      sGB.set(f(gb));
      sL.set(loss == null ? "–" : loss.toFixed(3));
    }
    function exec(i, animate = true) {
      line = i;
      if (i === 1) { gw = 0; gb = 0; }
      if (i === 2) preds = XS.map((x) => w * x + b);
      if (i === 3) loss = QP.math.mean(preds.map((p, k) => (p - Y[k]) ** 2));
      if (i === 4) {
        gw = (2 / XS.length) * preds.reduce((s, p, k) => s + (p - Y[k]) * XS[k], 0);
        gb = (2 / XS.length) * preds.reduce((s, p, k) => s + (p - Y[k]), 0);
      }
      if (i === 5) {
        const w0 = w, b0 = b, w1 = w - lr * gw, b1 = b - lr * gb;
        stepN++;
        preds = null;
        loss = null;
        if (animate && !QP.reduceMotion) {
          QP.animate(380, (e) => { w = w0 + (w1 - w0) * e; b = b0 + (b1 - b0) * e; paint(); });
          return;
        }
        w = w1; b = b1;
      }
      paint();
    }
    function nextLine() {
      if (running) return;
      exec(line < 0 || line >= 5 ? 0 : line + 1);
    }
    function runSteps(n) {
      if (running) return;
      running = true;
      let k = 0;
      const tick = () => {
        if (!running) return;
        for (let i = 1; i <= 5; i++) exec(i, false);
        k++;
        if (k >= n) {
          running = false;
          line = 5;
          paint();
          return;
        }
        setTimeout(tick, 70);
      };
      tick();
    }
    plot.onresize = paint;
    init();
  }
})();

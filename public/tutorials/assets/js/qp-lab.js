/* Quantum Path circuit lab: build a circuit by tapping a gate, then a wire; watch the state change.
     const lab = QP.circuitLab(hostEl, { n: 2, palette: ["H", "X", "CX"], init: [{ name: "H", col: 0, q: 0 }] });
   Options:
     n            number of qubits (1-4)              cols       time slots (default 7)
     palette      gate names to offer                 init       starting gates [{name, col, q} | {name, col, c, t} | {name, col, q, q2}]
     show         {bloch, amps, ket, hist}            locked     gates in init that can't be removed (set gate.locked = true)
     challenges   [{title, text, target, hint, maxGates, check(state, gates) -> bool}]
                  target: {amps: [numbers or {re, im}]} (equal up to a global phase) or {probs: [...]}
     onChange     (state, gates) => void              wireLabels ["q0", ...]
   Ordering follows Qiskit: qubit 0 is the top wire and the rightmost character of a bitstring. */
(function () {
  "use strict";
  const QP = window.QP;
  const { h, ui } = QP;
  const DEG = Math.PI / 180;
  const INK = "#2c2842";

  const GATES = {
    X: { fill: "#d6defe", stroke: "#5577f5", tip: "X: flips 0 and 1" },
    Y: { fill: "#d6defe", stroke: "#5577f5", tip: "Y: a flip with a phase" },
    Z: { fill: "#e6dcff", stroke: "#7b5cfa", tip: "Z: flips the sign of |1⟩" },
    H: { fill: "#ffd6e6", stroke: "#ff76a8", tip: "H: makes (or undoes) a 50/50 superposition" },
    S: { fill: "#e6dcff", stroke: "#7b5cfa", tip: "S: a quarter turn of phase (90°)" },
    Sdg: { label: "S†", fill: "#e6dcff", stroke: "#7b5cfa", tip: "S†: undoes S (−90°)" },
    T: { fill: "#e6dcff", stroke: "#7b5cfa", tip: "T: an eighth turn of phase (45°)" },
    Tdg: { label: "T†", fill: "#e6dcff", stroke: "#7b5cfa", tip: "T†: undoes T (−45°)" },
    SX: { label: "√X", fill: "#d6defe", stroke: "#5577f5", tip: "√X: half of an X" },
    RX: { param: true, fill: "#ffe9c2", stroke: "#f0ac2e", tip: "RX(θ): turn about the x axis" },
    RY: { param: true, fill: "#ffe9c2", stroke: "#f0ac2e", tip: "RY(θ): turn about the y axis" },
    RZ: { param: true, fill: "#ffe9c2", stroke: "#f0ac2e", tip: "RZ(θ): turn about the z axis" },
    P: { param: true, fill: "#ffe9c2", stroke: "#f0ac2e", tip: "P(φ): add phase φ to |1⟩" },
    CX: { controls: 1, tip: "CNOT: flips the target when the control is 1" },
    CZ: { controls: 1, tip: "CZ: flips the sign of |11⟩" },
    SWAP: { swap: true, tip: "SWAP: exchanges two qubits" },
    CCX: { controls: 2, tip: "Toffoli: flips the target when both controls are 1" },
    CCZ: { controls: 2, tip: "CCZ: flips the sign of |111⟩" },
  };
  const isMulti = (name) => Boolean(GATES[name] && (GATES[name].controls || GATES[name].swap));
  const wiresOf = (g) => (g.c != null ? [].concat(g.c, g.t) : g.q2 != null ? [g.q, g.q2] : [g.q]);
  const spanOf = (g) => {
    const w = wiresOf(g);
    return [Math.min(...w), Math.max(...w)];
  };

  function simulate(n, gates, upToCol = Infinity) {
    const s = new QP.State(n);
    gates
      .filter((g) => g.col <= upToCol)
      .sort((a, b) => a.col - b.col)
      .forEach((g) => {
        if (g.name === "CX") s.cx(g.c, g.t);
        else if (g.name === "CZ") s.cz(g.c, g.t);
        else if (g.name === "SWAP") s.swap(g.q, g.q2);
        else if (g.name === "CCX") s.applyCC(QP.gates.X, g.c[0], g.c[1], g.t);
        else if (g.name === "CCZ") s.applyCC(QP.gates.Z, g.c[0], g.c[1], g.t);
        else if (GATES[g.name] && GATES[g.name].param) s.gate(g.name, g.q, (g.theta == null ? 90 : g.theta) * DEG);
        else s.gate(g.name, g.q);
      });
    return s;
  }
  QP.simulateGates = simulate;

  /** "0.71|00⟩ + 0.71i|11⟩": the state in Dirac notation, small amplitudes skipped. */
  QP.ketString = function (state, digits = 2) {
    const parts = [];
    state.a.forEach((z, i) => {
      if (QP.cx.cabs2(z) < 1e-6) return;
      let amp = QP.fmtAmp(z, digits);
      const complex = Math.abs(z.re) > 5e-4 && Math.abs(z.im) > 5e-4;
      if (complex) amp = `(${amp})`;
      parts.push({ amp, ket: `|${state.label(i)}⟩` });
    });
    if (!parts.length) return "0";
    return parts
      .map((p, k) => {
        const neg = p.amp.startsWith("−") || p.amp.startsWith("-");
        const mag = neg ? p.amp.slice(1) : p.amp;
        const coef = mag === "1.00" ? "" : mag;
        return (k === 0 ? (neg ? "−" : "") : neg ? " − " : " + ") + coef + p.ket;
      })
      .join("");
  };

  /** |<a|b>|^2 for two states, ignoring global phase */
  function overlap(state, amps) {
    let re = 0, im = 0;
    amps.forEach((t, i) => {
      const z = typeof t === "number" ? { re: t, im: 0 } : t;
      const a = state.a[i];
      re += z.re * a.re + z.im * a.im;
      im += z.re * a.im - z.im * a.re;
    });
    return re * re + im * im;
  }
  QP.overlapAmps = overlap;

  QP.circuitLab = function (host, opts = {}) {
    const o = Object.assign({ n: 1, cols: 7, palette: ["X", "Y", "Z", "H", "S", "T"], init: [], show: {}, challenges: null, wireLabels: null, onChange: null, defaultTheta: 90, stepper: true }, opts);
    const show = Object.assign({ bloch: o.n <= 3, amps: true, ket: true, hist: false }, o.show);
    let gates = o.init.map((g) => ({ ...g }));
    let tool = null; // a gate name, "erase" or null (select)
    let pending = null; // multi-qubit gate being placed: {name, col, picks: [q...]}
    let selected = null; // a placed gate whose angle is being edited
    let stepCol = null; // null = whole circuit
    let challengeIdx = 0;
    const solved = new Set();
    const history = [];

    const root = h("div", { class: "clab" });
    if (host) host.appendChild(root);

    // ---------- challenge card
    const chTitle = h("div", { class: "clab-ch-title" });
    const chText = h("div", { class: "clab-ch-text" });
    const chStatus = h("div", { class: "clab-ch-status" });
    const chHint = h("details", { class: "hint", style: { margin: "8px 0 0" } }, h("summary", null, "Need a hint?"), h("div"));
    const chPrev = ui.button("‹", () => goChallenge(challengeIdx - 1), "btn soft tiny");
    const chNext = ui.button("Next challenge ›", () => goChallenge(challengeIdx + 1), "btn qc tiny");
    const chDots = h("div", { class: "clab-ch-dots" });
    const chCard = o.challenges ? h("div", { class: "clab-ch" }, h("div", { class: "clab-ch-head" }, chTitle, chDots), chText, chHint, h("div", { class: "clab-ch-foot" }, chStatus, h("div", { class: "btn-row" }, chPrev, chNext))) : null;
    if (chCard) root.appendChild(chCard);

    // ---------- palette
    const pal = h("div", { class: "clab-palette", role: "toolbar", "aria-label": "Gates" });
    const palBtns = {};
    const mkTool = (name, label, cls, tip) => {
      const b = h("button", { type: "button", class: "clab-tool " + cls, title: tip, "aria-pressed": "false" }, label);
      b.addEventListener("click", () => setTool(tool === name ? null : name));
      palBtns[name] = b;
      return b;
    };
    o.palette.forEach((name) => {
      const g = GATES[name];
      const label = name === "CX" ? "CNOT" : g.label || name;
      const b = mkTool(name, label, isMulti(name) ? "multi" : g.param ? "param" : "", g.tip);
      if (!isMulti(name)) b.style.setProperty("--gf", g.fill), b.style.setProperty("--gs", g.stroke);
      pal.appendChild(b);
    });
    pal.appendChild(h("span", { class: "clab-sep" }));
    pal.appendChild(mkTool("erase", "Eraser", "erase", "Tap a gate to remove it"));
    const undoBtn = ui.button("Undo", undo, "btn soft tiny");
    const clearBtn = ui.button("Clear", () => { commit(); gates = gates.filter((g) => g.locked); selected = null; update(); }, "btn soft tiny");
    pal.append(undoBtn, clearBtn);
    root.appendChild(pal);
    const banner = h("div", { class: "clab-banner", "aria-live": "polite" });
    root.appendChild(banner);

    // ---------- circuit
    const circHost = h("div", { class: "clab-circuit" });
    root.appendChild(circHost);

    // angle editor for the selected rotation gate
    const angle = ui.slider({ label: "θ", min: -180, max: 180, step: 1, value: 90, fmt: (v) => v + "°", oninput: (v) => { if (selected) { selected.theta = v; update(false); } } });
    const angleDel = ui.button("Remove gate", () => { if (selected && !selected.locked) { commit(); gates = gates.filter((g) => g !== selected); selected = null; update(); } }, "btn soft tiny");
    const angleBox = h("div", { class: "clab-angle", hidden: true }, angle, angleDel);
    root.appendChild(angleBox);

    // ---------- stepper
    const stepLabel = h("span", { class: "kbd-hint" });
    const stepper = h("div", { class: "clab-step" },
      ui.button("⏮", () => setStep(-1), "btn soft tiny"),
      ui.button("◀ step", () => setStep(stepCol == null ? lastCol() - 1 : stepCol - 1), "btn soft tiny"),
      ui.button("step ▶", () => setStep(stepCol == null ? null : stepCol + 1), "btn soft tiny"),
      ui.button("⏭", () => setStep(null), "btn soft tiny"),
      stepLabel);
    if (o.stepper) root.appendChild(stepper);

    // ---------- outputs
    const outs = h("div", { class: "clab-outs" + (o.n === 1 ? " n1" : "") });
    root.appendChild(outs);
    const ketEl = h("div", { class: "clab-ket" });
    if (show.ket) outs.appendChild(ketEl);
    let blochs = [];
    if (show.bloch) {
      const row = h("div", { class: "clab-blochs", style: { gridTemplateColumns: `repeat(${o.n}, minmax(0, 1fr))` } });
      for (let q = 0; q < o.n; q++) {
        const cell = h("div", { class: "clab-bloch" });
        const b = new QP.Bloch(cell, { aspect: 1, maxH: o.n === 1 ? 260 : 200, labels: "xyz" });
        b.vectors = [{ v: [0, 0, 1], color: ["#7b5cfa", "#ff8a50", "#17a98c", "#e45fa3"][q] }];
        const cap = h("div", { class: "small center", style: { fontWeight: 800, color: ["#7b5cfa", "#ff8a50", "#17a98c", "#e45fa3"][q] } });
        cell.appendChild(cap);
        row.appendChild(cell);
        blochs.push({ b, cap });
      }
      outs.appendChild(row);
    }
    let bars = null;
    const labels = Array.from({ length: 1 << o.n }, (_, i) => `|${i.toString(2).padStart(o.n, "0")}⟩`);
    if (show.amps) {
      const box = h("div", { class: "clab-amps" }, h("div", { class: "kbd-hint" }, o.n > 1 ? "Probabilities (color = phase; labels read q" + (o.n - 1) + " … q0)" : "Probabilities (color = phase)"));
      bars = QP.bars(box, { labels, height: o.n === 1 ? 80 : o.n > 2 ? 80 : 100, phase: o.n <= 2, fmt: (v) => (v < 0.005 ? "0" : v.toFixed(2)) });
      outs.appendChild(box);
    }
    let hist = null, counts = null;
    if (show.hist) {
      counts = new Array(1 << o.n).fill(0);
      const hb = h("div", { class: "clab-hist" });
      const btns = h("div", { class: "btn-row" },
        ui.button("Measure once", () => shoot(1), "btn qc tiny"),
        ui.button("100 shots", () => shoot(100), "btn soft tiny"),
        ui.button("1000 shots", () => shoot(1000), "btn soft tiny"),
        ui.button("Reset counts", () => { counts.fill(0); hist.set(counts); }, "btn soft tiny"));
      hist = QP.hist(hb, { labels: labels.map((l) => l.slice(1, -1)), height: o.n === 1 ? 70 : 90 });
      outs.appendChild(h("div", null, h("div", { class: "kbd-hint" }, "Measurement counts"), btns, hb));
    }

    // ---------- behavior
    function commit() {
      history.push(JSON.stringify(gates));
      if (history.length > 60) history.shift();
    }
    function undo() {
      if (!history.length) return;
      gates = JSON.parse(history.pop());
      selected = null;
      update();
    }
    function setTool(t) {
      tool = t;
      pending = null;
      Object.entries(palBtns).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === t)));
      if (t && t !== "erase") selected = null;
      update(false);
    }
    function lastCol() {
      return gates.length ? Math.max(...gates.map((g) => g.col)) : -1;
    }
    function setStep(c) {
      const last = lastCol();
      if (c == null || c >= last) stepCol = null;
      else stepCol = Math.max(-1, c);
      update(false);
    }
    function gateAt(col, q) {
      return gates.find((g) => {
        if (g.col !== col) return false;
        const [lo, hi] = spanOf(g);
        return q >= lo && q <= hi;
      });
    }
    function place(g) {
      const [lo, hi] = spanOf(g);
      const clash = gates.filter((x) => x.col === g.col && !(spanOf(x)[1] < lo || spanOf(x)[0] > hi));
      if (clash.some((x) => x.locked)) {
        flash("That spot is part of the starting circuit. Try another column.");
        return;
      }
      commit();
      gates = gates.filter((x) => !clash.includes(x));
      gates.push(g);
      if (GATES[g.name] && GATES[g.name].param) selected = g;
      update();
    }
    function tap(col, q) {
      const existing = gateAt(col, q);
      if (tool === "erase") {
        if (existing && !existing.locked) {
          commit();
          gates = gates.filter((g) => g !== existing);
          if (selected === existing) selected = null;
          update();
        }
        return;
      }
      if (!tool) {
        selected = existing && GATES[existing.name] && GATES[existing.name].param ? existing : null;
        update(false);
        return;
      }
      if (isMulti(tool)) {
        const need = GATES[tool].swap ? 2 : GATES[tool].controls + 1;
        if (o.n < need) {
          flash(`${tool} needs ${need} qubits.`);
          return;
        }
        if (!pending) {
          pending = { name: tool, col, picks: [q] };
        } else if (pending.picks.includes(q)) {
          pending = null;
        } else {
          pending.picks.push(q);
          if (pending.picks.length === need) {
            const p = pending.picks;
            const g = GATES[tool].swap ? { name: tool, col: pending.col, q: p[0], q2: p[1] } : GATES[tool].controls === 2 ? { name: tool, col: pending.col, c: [p[0], p[1]], t: p[2] } : { name: tool, col: pending.col, c: p[0], t: p[1] };
            pending = null;
            place(g);
            return;
          }
        }
        update(false);
        return;
      }
      if (existing && existing.name === tool && GATES[tool].param) {
        selected = existing;
        update(false);
        return;
      }
      place({ name: tool, col, q, theta: GATES[tool].param ? o.defaultTheta : undefined });
    }
    let flashTimer = null;
    function flash(msg) {
      banner.textContent = msg;
      banner.classList.add("on");
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => update(false), 2200);
    }
    function bannerText() {
      if (pending) {
        const g = GATES[pending.name];
        if (g.swap) return "Now tap the other qubit to swap with (same column).";
        if (g.controls === 2 && pending.picks.length === 1) return "Now tap the second control qubit.";
        return "Now tap the target qubit (the ⊕), in the same column.";
      }
      if (tool === "erase") return "Tap a gate to remove it.";
      if (tool && isMulti(tool)) return GATES[tool].swap ? "Tap the first qubit to swap." : "Tap the control qubit (the dot) first.";
      if (tool) return `Tap a spot on a wire to place ${GATES[tool].label || tool}.`;
      return "Pick a gate, then tap a spot on a wire.";
    }

    function drawCircuit() {
      const n = o.n, cols = o.cols, cw = 56, left = 46, top = 10, rowH = 54;
      const W = left + cols * cw + 14, H = top + n * rowH + 4;
      const yy = (q) => top + q * rowH + rowH / 2;
      const xx = (c) => left + c * cw + cw / 2;
      let s = `<svg viewBox="0 0 ${W} ${H}" class="clab-svg" style="max-width:${Math.round(W * 1.45)}px" role="group" aria-label="Circuit">`;
      if (stepCol != null) s += `<rect x="${left}" y="2" width="${(stepCol + 1) * cw}" height="${H - 4}" rx="12" fill="#ffd66b" fill-opacity=".2"/>`;
      for (let q = 0; q < n; q++) {
        const lab = o.wireLabels ? o.wireLabels[q] : `q${q}`;
        s += `<text x="8" y="${yy(q) + 5}" font-size="15" font-weight="700" fill="#57526f" font-family="Fredoka, sans-serif">${lab}</text>`;
        s += `<line x1="38" y1="${yy(q)}" x2="${W - 6}" y2="${yy(q)}" stroke="${INK}" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>`;
      }
      for (const g of gates.slice().sort((a, b) => a.col - b.col)) {
        const x = xx(g.col);
        const dim = stepCol != null && g.col > stepCol ? ' opacity=".28"' : "";
        const sel = g === selected ? ' class="sel"' : "";
        if (g.c != null) {
          const cs = [].concat(g.c), yt = yy(g.t);
          const ys = cs.map(yy).concat(yt);
          s += `<g${dim}${sel}><line x1="${x}" y1="${Math.min(...ys)}" x2="${x}" y2="${Math.max(...ys)}" stroke="${INK}" stroke-width="2.5"/>`;
          cs.forEach((c) => (s += `<circle cx="${x}" cy="${yy(c)}" r="6.5" fill="${INK}"/>`));
          if (g.name === "CX" || g.name === "CCX") s += `<circle cx="${x}" cy="${yt}" r="14" fill="#fff" stroke="${INK}" stroke-width="2.5"/><path d="M${x - 14} ${yt} H${x + 14} M${x} ${yt - 14} V${yt + 14}" stroke="${INK}" stroke-width="2.5"/>`;
          else s += `<circle cx="${x}" cy="${yt}" r="6.5" fill="${INK}"/>`;
          s += `</g>`;
        } else if (g.q2 != null) {
          const ya = yy(g.q), yb = yy(g.q2);
          s += `<g${dim}><line x1="${x}" y1="${ya}" x2="${x}" y2="${yb}" stroke="${INK}" stroke-width="2.5"/>`;
          for (const yv of [ya, yb]) s += `<path d="M${x - 8} ${yv - 8} L${x + 8} ${yv + 8} M${x + 8} ${yv - 8} L${x - 8} ${yv + 8}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
          s += `</g>`;
        } else {
          const G = GATES[g.name] || { fill: "#eee", stroke: INK };
          const y = yy(g.q);
          const label = G.label || g.name;
          const wide = G.param;
          const gw = wide ? 48 : 38;
          s += `<g${dim}${sel}><rect x="${x - gw / 2}" y="${y - 19}" width="${gw}" height="38" rx="10" fill="${G.fill}" stroke="${g === selected ? "#ff76a8" : G.stroke}" stroke-width="${g === selected ? 3.5 : 2.5}"${g.locked ? ' stroke-dasharray="5 3"' : ""}/>`;
          s += `<text x="${x}" y="${y + (wide ? 0 : 6)}" text-anchor="middle" font-size="${label.length > 2 ? 13 : 17}" font-weight="600" fill="${INK}" font-family="Fredoka, sans-serif">${label}</text>`;
          if (wide) s += `<text x="${x}" y="${y + 13}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#57526f" font-family="Nunito, sans-serif">${Math.round(g.theta == null ? 90 : g.theta)}°</text>`;
          s += `</g>`;
        }
      }
      if (pending) {
        for (const q of pending.picks) s += `<circle cx="${xx(pending.col)}" cy="${yy(q)}" r="9" fill="#ff76a8" stroke="#fff" stroke-width="2"/>`;
      }
      // tap targets
      for (let c = 0; c < cols; c++)
        for (let q = 0; q < n; q++)
          s += `<rect class="slot" data-c="${c}" data-q="${q}" x="${left + c * cw + 2}" y="${yy(q) - rowH / 2 + 2}" width="${cw - 4}" height="${rowH - 4}" rx="10" tabindex="0" role="button" aria-label="column ${c + 1}, qubit ${q}"/>`;
      s += `</svg>`;
      circHost.innerHTML = s;
      circHost.querySelectorAll(".slot").forEach((r) => {
        const go = () => tap(Number(r.dataset.c), Number(r.dataset.q));
        r.addEventListener("click", go);
        r.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        });
      });
    }

    function shoot(k) {
      const st = simulate(o.n, gates, stepCol == null ? Infinity : stepCol);
      const c = st.sample(k);
      c.forEach((v, i) => (counts[i] += v));
      hist.set(counts);
      if (k === 1) {
        const i = c.indexOf(1);
        QP.toast(`Measured ${st.label(i)}`, "ui-sparkle");
      }
    }

    function checkChallenge(st) {
      if (!o.challenges) return;
      const ch = o.challenges[challengeIdx];
      let ok = false;
      if (ch.check) ok = ch.check(st, gates);
      else if (ch.target && ch.target.amps) ok = overlap(st, ch.target.amps) > 0.999;
      else if (ch.target && ch.target.probs) ok = ch.target.probs.every((p, i) => Math.abs(p - st.probs()[i]) < 0.01);
      const used = gates.filter((g) => !g.locked).length;
      if (ok && ch.maxGates && used > ch.maxGates) {
        chStatus.className = "clab-ch-status near";
        chStatus.textContent = `Right state! Can you do it with ${ch.maxGates} gate${ch.maxGates === 1 ? "" : "s"} or fewer? (you used ${used})`;
        return;
      }
      if (ok) {
        const first = !solved.has(challengeIdx);
        solved.add(challengeIdx);
        chStatus.className = "clab-ch-status ok";
        chStatus.textContent = `Solved with ${used} gate${used === 1 ? "" : "s"}!`;
        if (first) {
          QP.confettiAt(chStatus, 120);
          if (o.onSolve) o.onSolve(challengeIdx);
        }
      } else {
        chStatus.className = "clab-ch-status";
        chStatus.textContent = "Not there yet: keep building.";
      }
      renderDots();
    }
    function renderDots() {
      if (!o.challenges) return;
      chDots.innerHTML = "";
      o.challenges.forEach((_, i) => chDots.appendChild(h("button", { type: "button", class: "clab-dot" + (i === challengeIdx ? " cur" : "") + (solved.has(i) ? " done" : ""), "aria-label": `Challenge ${i + 1}`, onclick: () => goChallenge(i) })));
    }
    function goChallenge(i) {
      if (!o.challenges) return;
      challengeIdx = Math.max(0, Math.min(o.challenges.length - 1, i));
      const ch = o.challenges[challengeIdx];
      chTitle.textContent = `Challenge ${challengeIdx + 1} of ${o.challenges.length}: ${ch.title}`;
      chText.innerHTML = ch.text || "";
      chHint.hidden = !ch.hint;
      chHint.open = false;
      chHint.lastChild.innerHTML = ch.hint || "";
      chPrev.disabled = challengeIdx === 0;
      chNext.disabled = challengeIdx === o.challenges.length - 1;
      gates = (ch.start || o.init).map((g) => ({ ...g }));
      history.length = 0;
      selected = null;
      stepCol = null;
      update();
    }

    function update(changed = true) {
      drawCircuit();
      banner.textContent = bannerText();
      banner.classList.toggle("on", Boolean(pending || tool));
      angleBox.hidden = !selected;
      if (selected) {
        angle.querySelector("label").textContent = `${GATES[selected.name].label || selected.name} angle`;
        angle.set(selected.theta == null ? 90 : selected.theta);
        angleDel.disabled = Boolean(selected.locked);
      }
      undoBtn.disabled = !history.length;
      const last = lastCol();
      stepLabel.textContent = stepCol == null ? "showing the state after the whole circuit" : stepCol < 0 ? "showing the starting state" : `showing the state after column ${stepCol + 1}`;
      const st = simulate(o.n, gates, stepCol == null ? Infinity : stepCol);
      if (show.ket) ketEl.innerHTML = `<span class="muted">${stepCol == null ? "State" : "State here"}:</span> ${QP.ketString(st)}`;
      blochs.forEach(({ b, cap }, q) => {
        const v = st.bloch(q);
        b.vectors[0].v = v;
        b.draw();
        const len = Math.hypot(...v);
        cap.textContent = `qubit ${q}` + (o.n > 1 ? (len < 0.98 ? ` · arrow ${len.toFixed(2)} long (entangled)` : "") : "");
      });
      if (bars) bars.set(st.probs(), st.a.map((z) => Math.atan2(z.im, z.re)));
      if (changed && counts) {
        counts.fill(0);
        hist.set(counts);
      }
      checkChallenge(st);
      if (o.onChange) o.onChange(st, gates, stepCol);
      void last;
    }

    if (o.challenges) goChallenge(0);
    else update();
    return {
      el: root,
      state: () => simulate(o.n, gates, stepCol == null ? Infinity : stepCol),
      gates: () => gates.map((g) => ({ ...g })),
      setGates(gs) {
        commit();
        gates = gs.map((g) => ({ ...g }));
        selected = null;
        stepCol = null;
        update();
      },
      setStep,
    };
  };
})();

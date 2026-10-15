/* qc-w6d4: the routing puzzle. A 5-qubit chip where only neighbors can do a CNOT. Place the logical qubits
   a–e on the chip (tap two chip qubits to swap them); the router inserts SWAPs (3 CNOTs each) wherever a
   CNOT's qubits aren't neighbors. Fewer CNOTs, less noise. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const CHIPS = {
    line: { label: "line", edges: [[0, 1], [1, 2], [2, 3], [3, 4]], xy: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    tee: { label: "T shape", edges: [[0, 1], [1, 2], [1, 3], [3, 4]], xy: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] },
    ring: { label: "ring", edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], xy: [0, 1, 2, 3, 4].map((k) => [1.1 * Math.sin((2 * Math.PI * k) / 5), -1.1 * Math.cos((2 * Math.PI * k) / 5)]) },
  };
  const CIRCUITS = {
    star: { label: "GHZ star", gates: [[0, 1], [0, 2], [0, 3], [0, 4]] },
    chain: { label: "chain", gates: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    pairs: { label: "every pair", gates: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]] },
  };
  const NAMES = "abcde";
  const COLORS = ["#ff8a50", "#5577f5", "#17a98c", "#e45fa3", "#f0ac2e"];

  function neighbors(edges) {
    const nb = Array.from({ length: 5 }, () => []);
    edges.forEach(([u, v]) => { nb[u].push(v); nb[v].push(u); });
    return nb;
  }
  function path(nb, s, t) {
    const prev = Array(5).fill(-1), seen = Array(5).fill(false), q = [s];
    seen[s] = true;
    while (q.length) {
      const u = q.shift();
      if (u === t) break;
      for (const v of nb[u]) if (!seen[v]) { seen[v] = true; prev[v] = u; q.push(v); }
    }
    const p = [t];
    while (p[0] !== s) p.unshift(prev[p[0]]);
    return p;
  }
  /** Route a list of logical CNOTs on the chip from an initial layout pos[logical] = physical. */
  function route(chip, gates, layout) {
    const nb = neighbors(chip.edges), pos = layout.slice(), at = [];
    pos.forEach((p, l) => (at[p] = l));
    const ops = [];
    let swaps = 0;
    for (const [c, t] of gates) {
      let pth = path(nb, pos[c], pos[t]);
      while (pth.length > 2) {
        const a = pth[0], b = pth[1];
        ops.push({ name: "SWAP", q: a, q2: b });
        swaps++;
        const la = at[a], lb = at[b];
        at[a] = lb; at[b] = la; pos[la] = b; pos[lb] = a;
        pth = path(nb, pos[c], pos[t]);
      }
      ops.push({ name: "CX", c: pos[c], t: pos[t] });
    }
    return { ops, swaps, cx: gates.length + 3 * swaps };
  }
  function permutations(a) {
    if (a.length <= 1) return [a];
    return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
  }

  function widget() {
    const card = QP.widget("route", "The routing puzzle", "tap two chip qubits to swap them");
    if (!card) return;
    let chipK = "tee", circK = "star", layout = [0, 1, 2, 3, 4], sel = null, bestTotal = null;
    const chipSeg = ui.seg({ label: "Chip", options: Object.keys(CHIPS).map((k) => ({ value: k, label: CHIPS[k].label })), value: chipK, onchange: (v) => { chipK = v; layout = [0, 1, 2, 3, 4]; bestTotal = null; draw(); } });
    const circSeg = ui.seg({ label: "Circuit", options: Object.keys(CIRCUITS).map((k) => ({ value: k, label: CIRCUITS[k].label })), value: circK, onchange: (v) => { circK = v; bestTotal = null; draw(); } });
    const chipHost = h("div", { class: "rt-chip" });
    const circHost = h("div", { style: { background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px", padding: "4px 8px", marginTop: "8px" } });
    const circ = QP.circuit(circHost, { n: 5, gates: [], minCols: 6, scale: 0.85, cell: 46, wireLabels: ["P0", "P1", "P2", "P3", "P4"] });
    const sO = ui.stat("CNOTs in the circuit", "–"), sS = ui.stat("SWAPs added", "–"), sT = ui.stat("CNOTs on the chip", "–"), sF = ui.stat("chance of no error (1% per CNOT)", "–");
    const bestB = ui.button("Let the computer try all 120 layouts", () => findBest(), "btn qc small");
    const resetB = ui.button("Reset layout", () => { layout = [0, 1, 2, 3, 4]; draw(); }, "btn soft small");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls col" }, chipSeg, circSeg),
      h("div", { class: "side-by-side", style: { marginTop: "8px" } }, h("div", null, h("div", { class: "kbd-hint" }, "The chip: lines are the pairs that can do a CNOT"), chipHost), h("div", null, h("div", { class: "readout" }, sO, sS, sT, sF), h("div", { class: "btn-row", style: { marginTop: "8px" } }, bestB, resetB))),
      h("div", { class: "kbd-hint", style: { marginTop: "8px" } }, "The routed circuit on the chip's qubits (each SWAP costs 3 CNOTs)"), circHost, note);

    function findBest() {
      const chip = CHIPS[chipK], gates = CIRCUITS[circK].gates;
      let best = null;
      for (const p of permutations([0, 1, 2, 3, 4])) {
        const r = route(chip, gates, p);
        if (!best || r.cx < best.cx) best = { ...r, p };
      }
      layout = best.p;
      bestTotal = best.cx;
      draw();
    }
    function drawChip() {
      const chip = CHIPS[chipK];
      const xs = chip.xy.map((p) => p[0]), ys = chip.xy.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const W = 300, H = 220, pad = 30;
      const sx = (x) => pad + ((x - x0) / Math.max(1e-9, x1 - x0)) * (W - 2 * pad);
      const sy = (y) => (y1 === y0 ? H / 2 : pad + ((y - y0) / (y1 - y0)) * (H - 2 * pad));
      const at = [];
      layout.forEach((p, l) => (at[p] = l));
      let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:360px;display:block">`;
      chip.edges.forEach(([u, v]) => (s += `<line x1="${sx(chip.xy[u][0])}" y1="${sy(chip.xy[u][1])}" x2="${sx(chip.xy[v][0])}" y2="${sy(chip.xy[v][1])}" stroke="#8a85a3" stroke-width="5" stroke-linecap="round"/>`));
      chip.xy.forEach(([x, y], p) => {
        const l = at[p], on = sel === p;
        s += `<g data-p="${p}" style="cursor:pointer"><circle cx="${sx(x)}" cy="${sy(y)}" r="22" fill="${COLORS[l]}" stroke="${on ? "#2c2842" : "#fff"}" stroke-width="${on ? 4 : 3}"/>`;
        s += `<text x="${sx(x)}" y="${sy(y) + 3}" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="18" font-weight="600" fill="#fff">${NAMES[l]}</text>`;
        s += `<text x="${sx(x)}" y="${sy(y) + 15}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="9" font-weight="800" fill="#fff" fill-opacity="0.9">P${p}</text></g>`;
      });
      chipHost.innerHTML = s + "</svg>";
      chipHost.querySelectorAll("g[data-p]").forEach((g) => g.addEventListener("click", () => {
        const p = +g.dataset.p;
        if (sel == null) { sel = p; drawChip(); return; }
        if (sel !== p) {
          const at2 = [];
          layout.forEach((q, l) => (at2[q] = l));
          const la = at2[sel], lb = at2[p];
          layout[la] = p; layout[lb] = sel;
        }
        sel = null;
        draw();
      }));
    }
    function draw() {
      drawChip();
      const r = route(CHIPS[chipK], CIRCUITS[circK].gates, layout);
      circ.render(r.ops);
      sO.set(String(CIRCUITS[circK].gates.length));
      sS.set(String(r.swaps), r.swaps ? "bad" : "good");
      sT.set(String(r.cx));
      sF.set(`${(Math.pow(0.99, r.cx) * 100).toFixed(1)}<small>%</small>`);
      note.textContent = r.swaps === 0 ? "No SWAPs needed: every CNOT acts on neighbors. A perfect layout."
        : `${r.swaps} SWAP${r.swaps > 1 ? "s turn" : " turns"} ${CIRCUITS[circK].gates.length} CNOTs into ${r.cx}.` + (bestTotal != null ? (r.cx <= bestTotal ? " That's the best any layout can do with this router." : "") : " Tap two chip qubits to swap their places, or let the computer search.");
    }
    draw();
  }
})();

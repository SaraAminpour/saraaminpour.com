/* qc-w6d2: mix two pure states. The mixture's Bloch vector lies on the chord between them; its 2 x 2 density
   matrix, purity and eigenvalues update live. "Another recipe" finds two different pure states that mix to
   exactly the same matrix. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  QP.onReady(() => widget());

  const vec = (t, p) => [Math.sin(t * DEG) * Math.cos(p * DEG), Math.sin(t * DEG) * Math.sin(p * DEG), Math.cos(t * DEG)];
  const fmtC = (re, im) => {
    const r = Math.abs(re) < 5e-4 ? 0 : re, i = Math.abs(im) < 5e-4 ? 0 : im;
    const rs = (r < 0 ? "−" : "") + Math.abs(r).toFixed(3);
    return i === 0 ? rs : `${rs} ${i < 0 ? "−" : "+"} ${Math.abs(i).toFixed(3)}i`;
  };

  function widget() {
    const card = QP.widget("density", "Mix two states", "a density matrix from a recipe");
    if (!card) return;
    let tA = 0, pA = 0, tB = 90, pB = 0, w = 0.5, alt = null;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.95, maxH: 400, labels: "kets", ball: true });
    const sl = (label, v, max, color, set) => ui.slider({ label, min: 0, max, step: 1, value: v, fmt: (x) => x + "°", color, oninput: (x) => { set(x); alt = null; draw(); } });
    const tAS = sl("A: θ", tA, 180, "#ff8a50", (x) => (tA = x)), pAS = sl("A: φ", pA, 359, "#ff8a50", (x) => (pA = x));
    const tBS = sl("B: θ", tB, 180, "#5577f5", (x) => (tB = x)), pBS = sl("B: φ", pB, 359, "#5577f5", (x) => (pB = x));
    const wS = ui.slider({ label: "weight of A", min: 0, max: 1, step: 0.01, value: w, fmt: (x) => `${Math.round(x * 100)}%`, color: C.qc, oninput: (x) => { w = x; alt = null; draw(); } });
    const preset = (label, a, b, ww) => ui.button(label, () => { [tA, pA] = a; [tB, pB] = b; w = ww; tAS.set(tA); pAS.set(pA); tBS.set(tB); pBS.set(pB); wS.set(w); alt = null; draw(); }, "btn soft tiny");
    const presets = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Try"),
      preset("|0⟩ and |1⟩, 50/50", [0, 0], [180, 0], 0.5), preset("|+⟩ and |−⟩, 50/50", [90, 0], [90, 180], 0.5), preset("|0⟩ and |+⟩, 50/50", [0, 0], [90, 0], 0.5));
    const altB = ui.button("Another recipe, same ρ", () => anotherRecipe(), "btn qc small");
    const mat = h("div", { class: "dm-mat" });
    const sP = ui.stat("purity Tr ρ²", "–"), sE = ui.stat("eigenvalues", "–"), sL = ui.stat("arrow length", "–");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    right.append(h("div", { class: "controls col", style: { marginTop: 0 } }, tAS, pAS, tBS, pBS, wS), presets,
      h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "The density matrix ρ = w|A⟩⟨A| + (1 − w)|B⟩⟨B|"), mat, h("div", { class: "readout" }, sP, sE, sL), h("div", { class: "btn-row", style: { marginTop: "6px" } }, altB));
    card.body.append(note);

    const mix = () => { const a = vec(tA, pA), b = vec(tB, pB); return a.map((v, i) => w * v + (1 - w) * b[i]); };
    function anotherRecipe() {
      const r = mix();
      const len = Math.hypot(...r);
      if (len > 0.999) { note.textContent = "A pure state has only one recipe: itself. Mix two different states first."; return; }
      // a chord through r in a random direction, not along the current one
      const a = vec(tA, pA), b = vec(tB, pB);
      const d0 = a.map((v, i) => v - b[i]);
      let u;
      do {
        u = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
        const k = Math.hypot(...u);
        u = u.map((v) => v / k);
      } while (Math.abs(u.reduce((s, v, i) => s + v * d0[i], 0)) / (Math.hypot(...d0) || 1) > 0.6);
      // |r + t u| = 1  ->  t^2 + 2 (r.u) t + |r|^2 - 1 = 0
      const ru = r.reduce((s, v, i) => s + v * u[i], 0), c = r.reduce((s, v) => s + v * v, 0) - 1;
      const disc = Math.sqrt(ru * ru - c), t1 = -ru - disc, t2 = -ru + disc;
      const P1 = r.map((v, i) => v + t1 * u[i]), P2 = r.map((v, i) => v + t2 * u[i]);
      alt = { P1, P2, w1: t2 / (t2 - t1) };
      draw();
    }
    function draw() {
      const a = vec(tA, pA), b = vec(tB, pB), r = mix();
      const len = Math.hypot(...r);
      bloch.vectors = [{ v: a, color: "rgba(255,138,80,0.55)", width: 3, label: "A" }, { v: b, color: "rgba(85,119,245,0.55)", width: 3, label: "B" }, { v: r, color: C.qc }];
      bloch.lines = [{ a, b, color: "rgba(76,60,140,0.55)", dash: [5, 4], width: 2 }];
      bloch.points = [];
      if (alt) {
        bloch.lines.push({ a: alt.P1, b: alt.P2, color: "#17a98c", dash: [3, 3], width: 2.5 });
        bloch.points.push({ v: alt.P1, color: "#17a98c", r: 6 }, { v: alt.P2, color: "#17a98c", r: 6 });
      }
      bloch.ballR = len;
      bloch.draw();
      // rho = (I + r . sigma) / 2
      const [x, y, z] = r;
      const e = [[[(1 + z) / 2, 0], [x / 2, -y / 2]], [[x / 2, y / 2], [(1 - z) / 2, 0]]];
      mat.innerHTML = `<span class="dm-br">(</span><div class="dm-grid">${e.flat().map(([re, im], k) => `<span class="${k === 0 || k === 3 ? "diag" : "off"}">${fmtC(re, im)}</span>`).join("")}</div><span class="dm-br">)</span>`;
      const purity = (1 + len * len) / 2;
      sP.set(purity.toFixed(3), purity > 0.999 ? "good" : "");
      sE.set(`${((1 + len) / 2).toFixed(3)}, ${((1 - len) / 2).toFixed(3)}`);
      sL.set(len.toFixed(3));
      note.textContent = alt
        ? `The green chord is a different recipe: ${Math.round(alt.w1 * 100)}% of one pure state and ${Math.round((1 - alt.w1) * 100)}% of another give exactly the same ρ, so no measurement can ever tell the two recipes apart.`
        : len < 0.01 ? "The center: ρ = I/2, a perfectly random qubit. Many different recipes land here."
        : len > 0.999 ? "Pure (arrow length 1): either one weight is 0, or A and B are the same state."
        : "The mixture's arrow ends on the dashed chord between A and B. Diagonal entries are the probabilities of 0 and 1; the off-diagonal ones carry the phase.";
    }
    draw();
  }
})();

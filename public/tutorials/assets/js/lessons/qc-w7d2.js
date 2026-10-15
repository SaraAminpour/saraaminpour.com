/* qc-w7d2: the cost landscape of a two-knob circuit, E(θ1, θ2) = ⟨Z0Z1 + 0.5 X0 + 0.5 X1⟩ for RY(θ1)⊗RY(θ2) then CNOT.
   Tap the map; the slices through your point are sine waves, fixed by three evaluations; "jump along" steps
   to a slice's minimum (coordinate descent). Shot noise can be switched on. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const PI = Math.PI;
  QP.onReady(() => widget());

  function energy(t1, t2, cx) {
    const s = new QP.State(2).gate("RY", 0, t1).gate("RY", 1, t2);
    if (cx) s.cx(0, 1);
    const p = s.probs();
    const zz = p[0] - p[1] - p[2] + p[3];
    const x0 = s.clone().gate("H", 0).expZ(0), x1 = s.clone().gate("H", 1).expZ(1);
    return zz + 0.5 * x0 + 0.5 * x1;
  }
  const GROUND = -Math.SQRT2;

  function widget() {
    const card = QP.widget("landscape", "Explore a cost landscape", "tap the map");
    if (!card) return;
    let cx = true, shots = 0, pt = [-2.0, 2.0], trail = [], seed = 1;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    left.append(h("div", { class: "kbd-hint" }, "Energy for every (θ₁, θ₂): darker is lower"));
    const map = new QP.Plot(left, { xlim: [-PI, PI], ylim: [-PI, PI], aspect: 1, equal: true, ticks: true, minH: 260, maxH: 380, xlabel: "θ₁", ylabel: "θ₂", xstep: PI / 2, ystep: PI / 2, xfmt: rad, yfmt: rad });
    const cxT = ui.toggle({ label: "include the CNOT", checked: true, onchange: (v) => { cx = v; trail = []; draw(); } });
    const shotSeg = ui.seg({ label: "Each value from", options: [{ value: 0, label: "exact" }, { value: 1000, label: "1,000 shots" }, { value: 100, label: "100 shots" }], value: shots, onchange: (v) => { shots = +v; seed++; draw(); } });
    const j1 = ui.button("Jump along θ₁", () => jump(0), "btn qc small");
    const j2 = ui.button("Jump along θ₂", () => jump(1), "btn qc small");
    const rollB = ui.button("Roll downhill (small steps)", () => roll(), "btn ml small");
    let rolling = null, lastAction = "";
    const sE = ui.stat("energy here", "–"), sG = ui.stat("lowest possible (ground state)", GROUND.toFixed(3), "good");
    const slice1 = sliceChart("Slice along θ₁ (θ₂ fixed)"), slice2 = sliceChart("Slice along θ₂ (θ₁ fixed)");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    right.append(h("div", { class: "controls col", style: { marginTop: 0 } }, cxT, shotSeg), h("div", { class: "readout" }, sE, sG), h("div", { class: "btn-row", style: { marginTop: "6px" } }, j1, j2, rollB), slice1.el, slice2.el);
    card.body.append(note);
    map.onresize = draw;
    map.on({ down: (p) => { if (rolling) return; pt = [p.x, p.y]; trail = []; lastAction = ""; draw(); } });

    function rad(v) {
      const k = Math.round(v / (PI / 2));
      return ["−π", "−π/2", "0", "π/2", "π"][k + 2] || "";
    }
    function sliceChart(title) {
      const host = h("div");
      const ch = QP.chart(host, { xlim: [-PI, PI], ylim: [-1.6, 1.6], aspect: 0.36, minH: 100, maxH: 140, xstep: PI / 2, xfmt: rad, ystep: 1 });
      return { el: h("div", { style: { marginTop: "6px" } }, h("div", { class: "kbd-hint" }, title), host), ch };
    }
    // a deterministic "shot noise" value for a grid point, so the map doesn't flicker
    function noisy(e, i, j) {
      if (!shots) return e;
      const r = QP.rng((i * 7919 + j * 104729 + seed * 13) >>> 0);
      return e + (r.normal() * Math.sqrt(1.5)) / Math.sqrt(shots);
    }
    const E = (a, b) => energy(a, b, cx);
    // three evaluations fix a slice: C(θ) = a cos θ + b sin θ + c
    function fitSlice(f) {
      const c0 = f(0), cp = f(PI / 2), cm = f(-PI / 2);
      const c = (cp + cm) / 2, b = (cp - cm) / 2, a = c0 - c;
      return { f: (t) => a * Math.cos(t) + b * Math.sin(t) + c, argmin: Math.atan2(-b, -a), pts: [[0, c0], [PI / 2, cp], [-PI / 2, cm]] };
    }
    function jump(k) {
      const shotNoise = (v) => (shots ? v + (QP.rng((Date.now() + k) >>> 0).normal() * Math.sqrt(1.5)) / Math.sqrt(shots) : v);
      const fit = fitSlice(k === 0 ? (t) => shotNoise(E(t, pt[1])) : (t) => shotNoise(E(pt[0], t)));
      trail.push(pt.slice());
      pt[k] = fit.argmin;
      lastAction = "jump";
      draw();
    }
    // gradient descent with small steps (the slope of each sine slice, from two evaluations)
    function roll() {
      if (rolling) return;
      let n = 0;
      lastAction = "roll";
      rolling = setInterval(() => {
        const g = [0, 1].map((k) => {
          const up = pt.slice(), dn = pt.slice();
          up[k] += PI / 2; dn[k] -= PI / 2;
          return (E(...up) - E(...dn)) / 2;
        });
        trail.push(pt.slice());
        pt = [pt[0] - 0.25 * g[0], pt[1] - 0.25 * g[1]].map((v) => Math.atan2(Math.sin(v), Math.cos(v)));
        draw();
        if (++n >= 60 || Math.hypot(...g) < 1e-3) { clearInterval(rolling); rolling = null; draw(); }
      }, QP.reduceMotion ? 5 : 60);
    }
    function draw() {
      map.clear();
      const lo = -1.45, hi = 1.45;
      map.region((x, y) => {
        const i = Math.round(((x + PI) / (2 * PI)) * 200), j = Math.round(((y + PI) / (2 * PI)) * 200);
        const t = QP.math.clamp((noisy(E(x, y), i, j) - lo) / (hi - lo), 0, 1);
        const a = [74, 20, 140], b = [185, 167, 255], c = [255, 250, 244];
        const m = t < 0.5 ? a.map((v, q) => v + (b[q] - v) * (t / 0.5)) : b.map((v, q) => v + (c[q] - v) * ((t - 0.5) / 0.5));
        return [m[0], m[1], m[2], 0.92];
      }, 4, `${cx}-${shots}-${seed}`);
      for (let k = 1; k <= trail.length; k++) {
        const a = trail[k - 1], b = k < trail.length ? trail[k] : pt;
        if (Math.abs(a[0] - b[0]) < PI && Math.abs(a[1] - b[1]) < PI) map.seg(a[0], a[1], b[0], b[1], { color: "#ffd66b", width: 3 }); // skip wrap-arounds
      }
      map.point(pt[0], pt[1], { r: 8, fill: "#ffd66b", stroke: C.ink, lw: 2.5 });
      const e = E(pt[0], pt[1]);
      sE.set(e.toFixed(3), e < GROUND + 0.01 ? "good" : "");
      for (const [k, sl] of [[0, slice1], [1, slice2]]) {
        const f = k === 0 ? (t) => E(t, pt[1]) : (t) => E(pt[0], t);
        const fit = fitSlice(f);
        const xs = Array.from({ length: 121 }, (_, i) => -PI + (i * 2 * PI) / 120);
        sl.ch.marker = pt[k];
        sl.ch.draw([{ x: xs, y: xs.map(f), color: C.qc, width: 3 }, { x: xs, y: xs.map(fit.f), color: "#ffd66b", width: 1.5, dash: [5, 4] }]);
        fit.pts.forEach(([x, y]) => sl.ch.point(x, y, { r: 5, fill: "#ff8a50", stroke: "#fff", lw: 1.5 }));
      }
      const stuck = lastAction === "roll" && !rolling && e > GROUND + 0.05;
      note.textContent = !cx ? "Without the CNOT the circuit only makes product states: the lowest energy on this map is −1.25, never the ground state's −1.414."
        : e < GROUND + 0.01 ? "You're at the bottom: the ground-state energy, −1.414."
        : stuck ? `Stuck at ${e.toFixed(3)}: a local minimum (here a whole flat valley), where every small step goes uphill or nowhere. Tap the same start again and use the jumps instead: they look at whole slices and avoid this valley.`
        : "Each slice is a sine wave, so three evaluations (orange dots) pin it down exactly (dashed). \"Jump along\" moves to the slice's lowest point; \"Roll downhill\" takes small steps.";
    }
    draw();
  }
})();

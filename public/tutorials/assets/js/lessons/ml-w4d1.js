/* w4d1: feature maps. Lift a ring of points into 3D and slide a plane between the classes. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("lift", "Lift the data", "drag the 3D view to turn it");
    if (!card) return;
    const C = QP.colors;
    const pts = QP.data.circles(130, 0.07, 0.45, 9);
    let t = 0, hp = 0.55, az = -0.95, el = 0.42;
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const stage = h("div", { class: "widget-stage", style: { background: "radial-gradient(circle at 50% 30%, #fff, #f4f0ff)" } });
    const cv = h("canvas", { class: "grab" });
    stage.appendChild(cv);
    left.appendChild(stage);
    right.append(h("div", { class: "kbd-hint" }, "Seen from above, in the original 2D plane"));
    const flat = new QP.Plot(right, { xlim: [-1.35, 1.35], ylim: [-1.35, 1.35], aspect: 1, equal: true, minH: 200, maxH: 260 });
    const liftB = ui.button("Lift!", () => animateLift(1), "btn ml small");
    const dropB = ui.button("Flatten", () => animateLift(0), "btn soft small");
    const hS = ui.slider({ label: "plane height", min: 0.02, max: 1.3, step: 0.01, value: hp, fmt: (v) => v.toFixed(2), oninput: (v) => { hp = v; draw(); } });
    const sAcc = ui.stat("Accuracy with the plane", "–");
    right.append(h("div", { class: "btn-row", style: { marginTop: "10px" } }, liftB, dropB), h("div", { class: "controls col" }, hS), h("div", { class: "readout" }, sAcc));

    let W = 400, H = 320;
    function size() {
      const r = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(260, stage.clientWidth);
      H = Math.round(Math.min(420, W * 0.85));
      cv.width = W * r;
      cv.height = H * r;
      cv.style.height = H + "px";
      cv.getContext("2d").setTransform(r, 0, 0, r, 0, 0);
    }
    function project(x, y, z) {
      const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
      const zz = z * 1.25 - 0.55;
      const sx = -sa * x + ca * y;
      const sy = -se * ca * x - se * sa * y + ce * zz;
      const d = ce * ca * x + ce * sa * y + se * zz;
      const S = Math.min(W, H) * 0.33;
      return { x: W / 2 + S * sx, y: H / 2 - S * sy, d };
    }
    function draw() {
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      const L = 1.3;
      // floor
      ctx.strokeStyle = "rgba(76,60,140,0.12)";
      ctx.lineWidth = 1;
      for (let i = -L; i <= L + 1e-9; i += L / 4) {
        let a = project(i, -L, 0), b = project(i, L, 0);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        a = project(-L, i, 0); b = project(L, i, 0);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // vertical axis
      const o = project(0, 0, 0), top = project(0, 0, 1.45);
      ctx.strokeStyle = "rgba(76,60,140,0.35)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.ink2;
      ctx.font = "800 12px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("x₁² + x₂²", top.x, top.y - 8);
      const items = pts.map((p) => {
        const z = t * (p.x * p.x + p.y * p.y);
        return { p, z, q: project(p.x, p.y, z) };
      });
      const below = items.filter((it) => it.z < hp).sort((a, b) => a.q.d - b.q.d);
      const above = items.filter((it) => it.z >= hp).sort((a, b) => a.q.d - b.q.d);
      const dot = (it) => {
        ctx.beginPath();
        ctx.arc(it.q.x, it.q.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = QP.classColor(it.p.c);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      };
      below.forEach(dot);
      // the plane
      const cs = [[-L, -L], [L, -L], [L, L], [-L, L]].map(([x, y]) => project(x, y, hp));
      ctx.beginPath();
      cs.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
      ctx.closePath();
      ctx.fillStyle = "rgba(185,167,255,0.32)";
      ctx.fill();
      ctx.strokeStyle = "rgba(123,92,250,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
      above.forEach(dot);
      // accuracy: below the plane = predict inner (class 1), above = outer (class 0)
      const ok = items.filter((it) => (it.z < hp ? 1 : 0) === it.p.c).length;
      const acc = ok / items.length;
      sAcc.set((acc * 100).toFixed(0) + "%", acc > 0.97 ? "good" : acc < 0.6 ? "bad" : "");
      // 2D view
      flat.clear();
      if (t > 0.02) {
        const rad = Math.sqrt(hp / t);
        flat.circle(0, 0, rad, { fill: "rgba(85,119,245,0.12)", stroke: C.qc, width: 2.5 });
      } else {
        flat.text("no lift yet: the plane can't cut anything", 0, 1.18, { size: 11, color: C.ink3 });
      }
      for (const p of pts) flat.point(p.x, p.y, { r: 4, fill: QP.classColor(p.c), stroke: "#fff", lw: 1.2 });
    }
    function animateLift(target) {
      const from = t;
      QP.animate(1100, (e) => { t = from + (target - from) * e; draw(); });
    }
    let last = null;
    cv.addEventListener("pointerdown", (e) => {
      last = [e.clientX, e.clientY];
      cv.classList.add("grabbing");
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    cv.addEventListener("pointermove", (e) => {
      if (!last) return;
      az -= (e.clientX - last[0]) * 0.01;
      el = QP.math.clamp(el + (e.clientY - last[1]) * 0.01, 0.06, 1.35);
      last = [e.clientX, e.clientY];
      draw();
    });
    const end = () => { last = null; cv.classList.remove("grabbing"); };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    if ("ResizeObserver" in window) new ResizeObserver(() => { size(); draw(); }).observe(stage);
    flat.onresize = draw;
    size();
    draw();
  }
})();

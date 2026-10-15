/* w3d4: two qubits. Widgets: two dials with four amplitudes, and exponential growth. */
(function () {
  const { h, ui } = QP;
  const Q0 = "#7b5cfa", Q1 = "#ff8a50"; // color of qubit 0 and qubit 1 throughout
  QP.onReady(() => {
    two();
    growth();
  });

  function two() {
    const card = QP.widget("two", "Two qubits, four amplitudes", "qubit 0 is lavender, qubit 1 is orange");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    let t0 = 60, t1 = 120;
    const qcard = (k, color) => {
      const cv = h("canvas", { width: 220, height: 130, style: { width: "100%", maxWidth: "200px", display: "block", margin: "0 auto" } });
      const slider = ui.slider({ label: `RY on qubit ${k}`, min: 0, max: 180, step: 1, value: k ? t1 : t0, fmt: (v) => v + "°", color, oninput: (v) => { if (k) t1 = v; else t0 = v; draw(); } });
      const p = h("div", { class: "small center", style: { fontWeight: 800, color } });
      const el = h("div", { class: "card flat", style: { padding: "12px", borderColor: color + "55" } }, h("div", { style: { fontFamily: "Fredoka, sans-serif", fontWeight: 600, color, textAlign: "center" } }, `qubit ${k}`), cv, p, slider);
      el.cv = cv;
      el.p = p;
      return el;
    };
    const c0 = qcard(0, Q0), c1 = qcard(1, Q1);
    const label = (s) => `<span style="color:${Q1}">${s[0]}</span><span style="color:${Q0}">${s[1]}</span>`;
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: ["00", "01", "10", "11"], height: 120, colors: ["linear-gradient(180deg,#d6defe,#5577f5)", "linear-gradient(180deg,#d6defe,#5577f5)", "linear-gradient(180deg,#d6defe,#5577f5)", "linear-gradient(180deg,#d6defe,#5577f5)"], fmt: (v) => v.toFixed(2) });
    bars.items.forEach((it, i) => (it.label.innerHTML = "|" + label(["00", "01", "10", "11"][i]) + "⟩"));
    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "6px", alignItems: "center", maxWidth: "320px", margin: "0 auto" } });
    const cells = {};
    grid.append(h("div"), h("div", { class: "small center", style: { fontWeight: 800, color: Q0 } }, "q0 = 0"), h("div", { class: "small center", style: { fontWeight: 800, color: Q0 } }, "q0 = 1"));
    for (const b1 of [0, 1]) {
      grid.append(h("div", { class: "small", style: { fontWeight: 800, color: Q1, textAlign: "right" } }, `q1 = ${b1}`));
      for (const b0 of [0, 1]) {
        const dot = h("div", { style: { borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff, #7b5cfa)", transition: "all .35s cubic-bezier(.34,1.56,.64,1)" } });
        const num = h("div", { class: "small", style: { position: "absolute", bottom: "4px", width: "100%", textAlign: "center", fontWeight: 800, color: C.ink } });
        const cell = h("div", { style: { position: "relative", aspectRatio: "1", border: "1px solid var(--line)", borderRadius: "14px", background: "#fcfbff", display: "grid", placeItems: "center" } }, dot, num);
        cells[`${b1}${b0}`] = { dot, num };
        grid.append(cell);
      }
    }
    const eq = h("div", { class: "small", style: { marginTop: "10px", textAlign: "center", fontWeight: 700, color: C.ink2 } });
    card.body.append(
      h("div", { class: "grid-2" }, c0, c1),
      h("div", { class: "side-by-side even", style: { marginTop: "14px" } }, h("div", null, h("div", { class: "kbd-hint" }, "Probabilities of the four outcomes (Qiskit labels: q1 q0)"), barsHost), h("div", null, h("div", { class: "kbd-hint", style: { textAlign: "center" } }, "The same four, as a grid"), grid, eq))
    );

    function dial(cv, theta, color) {
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, 220, 130);
      const cx = 110, cy = 115, R = 92;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(123,92,250,.12)";
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI, Math.PI + theta);
      ctx.stroke();
      ctx.fillStyle = "#57526f";
      ctx.font = "600 16px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("|0⟩", cx - R, cy + 2 - 14 + 14);
      ctx.fillText("|1⟩", cx + R, cy + 2);
      const a = Math.PI + theta;
      ctx.strokeStyle = "#2c2842";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18));
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18), 9, 0, Math.PI * 2);
      ctx.fill();
    }
    function draw() {
      const s = new QP.State(2).gate("RY", 0, t0 * deg).gate("RY", 1, t1 * deg);
      const p = s.probs();
      bars.set(p);
      dial(c0.cv, t0 * deg, Q0);
      dial(c1.cv, t1 * deg, Q1);
      const p0 = Math.sin((t0 * deg) / 2) ** 2, p1 = Math.sin((t1 * deg) / 2) ** 2;
      c0.p.textContent = `alone: P(1) = ${p0.toFixed(2)}`;
      c1.p.textContent = `alone: P(1) = ${p1.toFixed(2)}`;
      ["00", "01", "10", "11"].forEach((k, i) => {
        const size = 12 + 70 * Math.sqrt(p[i]);
        cells[k].dot.style.width = cells[k].dot.style.height = size + "%";
        cells[k].num.textContent = p[i].toFixed(2);
      });
      const pq1 = p1, pq0 = 1 - p0;
      eq.innerHTML = `P(${label("10")}) = P(q1 = 1) × P(q0 = 0) = ${pq1.toFixed(2)} × ${pq0.toFixed(2)} = <b>${(pq1 * pq0).toFixed(2)}</b>`;
    }
    draw();
  }

  function growth() {
    const card = QP.widget("growth", "How many amplitudes?", "slide the number of qubits");
    if (!card) return;
    const C = QP.colors;
    let n = 4;
    const cv = h("canvas");
    const stage = h("div", { class: "widget-stage", style: { background: "#fcfbff" } }, cv);
    const sN = ui.stat("qubits", "–"), sA = ui.stat("amplitudes", "–"), sM = ui.stat("memory to store them", "–");
    const note = h("div", { class: "small", style: { marginTop: "8px", fontWeight: 700, color: C.ink2 } });
    const slider = ui.slider({ label: "qubits n", min: 1, max: 50, step: 1, value: n, oninput: (v) => { n = v; draw(); } });
    card.body.append(h("div", { class: "controls", style: { marginTop: 0 } }, slider), h("div", { class: "readout" }, sN, sA, sM), note, h("div", { style: { marginTop: "10px" } }, stage));
    const human = (b) => {
      const u = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB"];
      let i = 0;
      while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
      return `${b >= 100 ? Math.round(b) : b.toFixed(b < 10 ? 1 : 0)} ${u[i]}`;
    };
    const fmtBig = (x) => (x < 1e15 ? Math.round(x).toLocaleString("en-US") : x.toExponential(2).replace("e+", " × 10^"));
    function draw() {
      const N = Math.pow(2, n);
      sN.set(String(n));
      sA.set(fmtBig(N));
      sM.set(human(N * 16));
      const notes = [
        [10, "Tiny. Your phone could simulate this a million times a second."],
        [20, "About a million numbers: still easy for a laptop."],
        [30, "A billion amplitudes: a laptop's whole memory."],
        [40, "A trillion amplitudes: a large computing cluster."],
        [46, "Around the memory of today's biggest supercomputers."],
        [99, "Beyond the memory of any classical computer on Earth. A quantum computer with this many good qubits holds it natively."],
      ];
      note.textContent = notes.find(([lim]) => n <= lim)[1];
      // dots
      const r = Math.min(2.5, window.devicePixelRatio || 1);
      const W = Math.max(240, stage.clientWidth), H = 200;
      cv.width = W * r;
      cv.height = H * r;
      cv.style.height = H + "px";
      const ctx = cv.getContext("2d");
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (n <= 12) {
        const cols = Math.ceil(Math.sqrt((N * W) / H));
        const rows = Math.ceil(N / cols);
        const cell = Math.min((W - 20) / cols, (H - 20) / rows);
        const ox = (W - cols * cell) / 2, oy = (H - rows * cell) / 2;
        const palette = ["#b9a7ff", "#ff8fb8", "#7fe0c4", "#7cc4ff", "#ffd66b", "#ffb59a"];
        for (let i = 0; i < N; i++) {
          const x = ox + (i % cols) * cell + cell / 2, y = oy + Math.floor(i / cols) * cell + cell / 2;
          ctx.fillStyle = palette[i % palette.length];
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.8, cell * 0.38), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = C.ink3;
        ctx.font = "800 11px Nunito, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`one dot per amplitude: ${N.toLocaleString("en-US")}`, W - 8, H - 6);
      } else {
        ctx.fillStyle = "rgba(123,92,250,0.08)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = C.ink2;
        ctx.font = "600 20px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`2^${n} dots would not fit on any screen`, W / 2, H / 2 - 6);
        ctx.font = "700 13px Nunito, sans-serif";
        ctx.fillStyle = C.ink3;
        ctx.fillText(`(even at one dot per pixel you'd need ${fmtBig(N / (1920 * 1080))} full-HD screens)`, W / 2, H / 2 + 20);
      }
    }
    if ("ResizeObserver" in window) new ResizeObserver(() => draw()).observe(stage);
    draw();
  }
})();

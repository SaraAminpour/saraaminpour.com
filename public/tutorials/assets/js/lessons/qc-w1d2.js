/* qc-w1d2: amplitudes as arrows. Lengths set the 0/1 odds; the relative phase shows up in overlaps. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  QP.onReady(() => arrows());

  function arrows() {
    const card = QP.widget("phases", "Amplitude arrows", "length = odds · direction = phase");
    if (!card) return;
    let share = 0.5, pa = 0, pb = 0; // |alpha|^2, phase of alpha, phase of beta (degrees)
    const dial = (name, color) => {
      const cv = h("canvas", { width: 360, height: 360, style: { width: "100%", maxWidth: "170px", display: "block", margin: "0 auto" } });
      const cap = h("div", { class: "small center", style: { fontWeight: 800, color } });
      const box = h("div", { class: "card flat", style: { padding: "10px" } }, h("div", { style: { fontFamily: "Fredoka, sans-serif", fontWeight: 600, textAlign: "center", color } }, name), cv, cap);
      box.cv = cv;
      box.cap = cap;
      return box;
    };
    const dA = dial("α, the amplitude of |0⟩", "#5577f5"), dB = dial("β, the amplitude of |1⟩", "#ff8a50");
    const sS = ui.slider({ label: "P(0) = |α|²", min: 0, max: 1, step: 0.01, value: share, fmt: (v) => v.toFixed(2), oninput: (v) => { share = v; draw(); } });
    const sA = ui.slider({ label: "phase of α", min: -180, max: 180, step: 1, value: pa, fmt: (v) => v + "°", color: "#5577f5", oninput: (v) => { pa = v; draw(); } });
    const sB = ui.slider({ label: "phase of β", min: -180, max: 180, step: 1, value: pb, fmt: (v) => v + "°", color: "#ff8a50", oninput: (v) => { pb = v; draw(); } });
    const wrapDeg = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
    const anim = (toA, toB, toS = share) => {
      const fa = pa, fb = pb, fs = share;
      QP.animate(700, (e) => {
        pa = fa + (toA - fa) * e;
        pb = fb + (toB - fb) * e;
        share = fs + (toS - fs) * e;
        sA.set(Math.round(wrapDeg(pa)));
        sB.set(Math.round(wrapDeg(pb)));
        sS.set(+share.toFixed(2));
        draw();
      }, () => { pa = wrapDeg(pa); pb = wrapDeg(pb); });
    };
    const btns = h("div", { class: "btn-row" },
      ui.button("Add a global phase (turn both 60°)", () => anim(pa + 60, pb + 60), "btn qc small"),
      ui.button("Flip the relative phase (β by 180°)", () => anim(pa, pb + 180), "btn soft small"));
    const presets = h("div", { class: "btn-row", style: { marginTop: "6px" } }, h("span", { class: "seg-label" }, "Jump to"),
      ...[["|0⟩", 1, 0, 0], ["|+⟩", 0.5, 0, 0], ["|−⟩", 0.5, 0, 180], ["|+i⟩", 0.5, 0, 90], ["|−i⟩", 0.5, 0, -90]].map(([n, s, a, b]) => ui.button(n, () => anim(a, b, s), "btn soft tiny")));
    const pHost = h("div"), oHost = h("div");
    const pBars = QP.bars(pHost, { labels: ["P(0)", "P(1)"], height: 90, colors: ["linear-gradient(180deg,#d6defe,#5577f5)", "linear-gradient(180deg,#ffd4c2,#ff8a50)"] });
    const oBars = QP.bars(oHost, { labels: ["|+⟩", "|−⟩", "|+i⟩", "|−i⟩"], height: 90, colors: Array(4).fill("linear-gradient(180deg,#e6dcff,#7b5cfa)") });
    const ket = h("div", { class: "clab-ket", style: { marginTop: "10px" } });
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, marginTop: "8px", minHeight: "2.6em" } });
    card.body.append(
      h("div", { class: "grid-2" }, dA, dB),
      h("div", { class: "controls col" }, sS, sA, sB),
      btns, presets, ket,
      h("div", { class: "side-by-side even", style: { marginTop: "12px" } },
        h("div", null, h("div", { class: "kbd-hint" }, "Measuring 0 or 1: only the lengths matter"), pHost),
        h("div", null, h("div", { class: "kbd-hint" }, "How much ψ looks like each state, |⟨φ|ψ⟩|²"), oHost)),
      note);

    function drawDial(cv, len, ph, color) {
      const ctx = cv.getContext("2d");
      const W = 360, cx = 180, cy = 180, R = 140;
      ctx.clearRect(0, 0, W, W);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(76,60,140,.18)";
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(cx - R - 10, cy); ctx.lineTo(cx + R + 10, cy);
      ctx.moveTo(cx, cy - R - 10); ctx.lineTo(cx, cy + R + 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#8a85a3";
      ctx.font = "800 22px Nunito, sans-serif";
      ctx.fillText("Re", cx + R - 30, cy - 10);
      ctx.fillText("Im", cx + 8, cy - R + 18);
      const x = cx + R * len * Math.cos(ph * DEG), y = cy - R * len * Math.sin(ph * DEG);
      if (len > 0.02) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        const a = Math.atan2(y - cy, x - cx);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + 10 * Math.cos(a), y + 10 * Math.sin(a));
        ctx.lineTo(x - 22 * Math.cos(a - 0.5), y - 22 * Math.sin(a - 0.5));
        ctx.lineTo(x - 22 * Math.cos(a + 0.5), y - 22 * Math.sin(a + 0.5));
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#2c2842";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    function draw() {
      const la = Math.sqrt(share), lb = Math.sqrt(1 - share);
      drawDial(dA.cv, la, pa, "#5577f5");
      drawDial(dB.cv, lb, pb, "#ff8a50");
      dA.cap.textContent = `length ${la.toFixed(2)} · phase ${Math.round(wrapDeg(pa))}°`;
      dB.cap.textContent = `length ${lb.toFixed(2)} · phase ${Math.round(wrapDeg(pb))}°`;
      const a = { re: la * Math.cos(pa * DEG), im: la * Math.sin(pa * DEG) };
      const b = { re: lb * Math.cos(pb * DEG), im: lb * Math.sin(pb * DEG) };
      const s2 = Math.SQRT1_2;
      const ov = (cr, ci) => {
        // overlap with (|0> + c|1>)/sqrt2 where c = cr + i ci: <phi|psi> = (a + conj(c) b)/sqrt2
        const re = (a.re + cr * b.re + ci * b.im) * s2, im = (a.im + cr * b.im - ci * b.re) * s2;
        return re * re + im * im;
      };
      pBars.set([share, 1 - share]);
      oBars.set([ov(1, 0), ov(-1, 0), ov(0, 1), ov(0, -1)]);
      const st = new QP.State(1, [a, b]);
      ket.innerHTML = `<span class="muted">State:</span> ${QP.ketString(st)}`;
      const rel = Math.round(wrapDeg(pb - pa));
      note.textContent = share > 0.995 || share < 0.005
        ? "One amplitude is zero, so there is no relative phase at all: the left bars say everything."
        : `Relative phase (β's angle minus α's) = ${rel}°. Change it and the right-hand bars move, while P(0) and P(1) stay put.`;
    }
    draw();
  }
})();

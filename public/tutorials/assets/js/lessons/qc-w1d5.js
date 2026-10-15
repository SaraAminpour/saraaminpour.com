/* qc-w1d5: quantum coins. Design a coin with RY(theta), then recover a hidden angle from counts. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  const p1 = (thDeg) => Math.sin((thDeg * DEG) / 2) ** 2;
  const thetaOf = (p) => (2 * Math.asin(Math.sqrt(QP.math.clamp(p, 0, 1)))) / DEG;
  QP.onReady(() => {
    designer();
    detective();
  });

  function designer() {
    const card = QP.widget("designer", "Coin designer", "RY(θ) turns |0⟩ toward |1⟩");
    if (!card) return;
    const rng = QP.rng((Math.random() * 1e9) | 0);
    let th = 60;
    const cv = h("canvas", { width: 400, height: 400, style: { width: "100%", maxWidth: "210px", display: "block", margin: "0 auto" } });
    const tS = ui.slider({ label: "θ", min: 0, max: 180, step: 1, value: th, fmt: (v) => v + "°", oninput: (v) => { th = v; draw(); } });
    const target = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Make a coin with P(1) ="),
      ...[0.1, 0.25, 0.5, 0.9].map((p) => ui.button(String(p), () => go(thetaOf(p)), "btn soft tiny")));
    const barsHost = h("div");
    const bars = QP.bars(barsHost, { labels: ["P(0)", "P(1)"], height: 90, colors: ["linear-gradient(180deg,#d6defe,#5577f5)", "linear-gradient(180deg,#ffd4c2,#ff8a50)"] });
    const formula = h("div", { class: "clab-ket" });
    const coins = h("div", { class: "bit-tiles", style: { minHeight: "60px" } });
    const flip = ui.button("Flip 24 coins", () => {
      coins.innerHTML = "";
      for (let i = 0; i < 24; i++) {
        const b = rng() < p1(th) ? 1 : 0;
        const el = h("span", { class: "bit " + (b ? "one" : "zero"), style: { animationDelay: i * 25 + "ms" } }, String(b));
        coins.appendChild(el);
      }
    }, "btn qc small");
    card.body.append(h("div", { class: "side-by-side" }, h("div", null, cv), h("div", null, tS, target, h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "Odds of this coin"), barsHost)), formula, h("div", { class: "btn-row", style: { marginTop: "10px" } }, flip), coins);
    function go(to) {
      const from = th;
      QP.animate(700, (e) => { th = from + (to - from) * e; tS.set(Math.round(th)); draw(); });
    }
    function draw() {
      const ctx = cv.getContext("2d");
      const W = 400, cx = 70, cy = 330, R = 250;
      ctx.clearRect(0, 0, W, W);
      ctx.strokeStyle = "rgba(76,60,140,.2)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx + R + 20, cy);
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "700 26px Fredoka, sans-serif";
      ctx.fillStyle = "#57526f";
      ctx.fillText("|0⟩", cx + R - 20, cy + 34);
      ctx.fillText("|1⟩", cx - 52, cy - R + 10);
      // arc for theta/2
      const a = (th * DEG) / 2;
      ctx.strokeStyle = "#f0ac2e";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, -a, 0);
      ctx.stroke();
      ctx.fillStyle = "#855600";
      ctx.font = "800 22px Nunito, sans-serif";
      ctx.fillText("θ/2", cx + 80 * Math.cos(-a / 2) + 6, cy + 80 * Math.sin(-a / 2) + 8);
      const x = cx + R * Math.cos(-a), y = cy + R * Math.sin(-a);
      ctx.strokeStyle = "#7b5cfa";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = "#ff76a8";
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, 2 * Math.PI);
      ctx.fill();
      const p = p1(th);
      bars.set([1 - p, p]);
      formula.innerHTML = `RY(${Math.round(th)}°)|0⟩ = cos(${(th / 2).toFixed(1)}°)|0⟩ + sin(${(th / 2).toFixed(1)}°)|1⟩ = ${Math.cos(a).toFixed(2)}|0⟩ + ${Math.sin(a).toFixed(2)}|1⟩ &nbsp;→&nbsp; P(1) = sin²(θ/2) = ${p.toFixed(3)}`;
    }
    draw();
  }

  function detective() {
    const card = QP.widget("detective", "The coin detective", "a hidden angle θ*: find it from counts");
    if (!card) return;
    const rng = QP.rng((Math.random() * 1e9) | 0);
    let secret, ones, n, guess = 90, revealed;
    const plotHost = h("div");
    const plot = new QP.Plot(plotHost, { xlim: [0, 180], ylim: [0, 1], ticks: true, xstep: 30, xlabel: "θ (degrees)", ylabel: "P(1)", aspect: 0.5, maxH: 300 });
    const shots = (k) => () => { for (let i = 0; i < k; i++) ones += rng() < p1(secret) ? 1 : 0; n += k; draw(); };
    const btns = h("div", { class: "btn-row" }, h("span", { class: "seg-label" }, "Measure"), ui.button("+10 shots", shots(10), "btn qc small"), ui.button("+100", shots(100), "btn soft small"), ui.button("+1000", shots(1000), "btn soft small"));
    const gS = ui.slider({ label: "your guess θ", min: 0, max: 180, step: 1, value: guess, fmt: (v) => v + "°", oninput: (v) => { guess = v; draw(); } });
    const check = ui.button("Check my guess", () => { revealed = true; draw(); const ok = Math.abs(guess - secret) <= Math.max(3, halfWidth()); QP.toast(ok ? `Great detective work! θ* = ${secret.toFixed(1)}°` : `θ* was ${secret.toFixed(1)}°. More shots would narrow it down.`, ok ? "ui-star" : "ui-sparkle"); if (ok) QP.confettiAt(check, 80); }, "btn qc small");
    const fresh = ui.button("New mystery coin", () => reset(), "btn soft small");
    const sN = ui.stat("Shots", "0"), sP = ui.stat("P(1) estimate", "–"), sT = ui.stat("θ range (95%)", "–");
    card.body.append(btns, plotHost, h("div", { class: "legend" }, h("span", null, h("i", { style: { background: C.qc } }), "P(1) = sin²(θ/2)"), h("span", null, h("i", { style: { background: "rgba(255,138,80,.45)" } }), "your estimate ± 2 errors, and the angles it allows")), h("div", { class: "readout" }, sN, sP, sT), h("div", { class: "controls" }, gS), h("div", { class: "btn-row" }, check, fresh));
    plot.onresize = draw;
    function halfWidth() {
      if (!n) return 90;
      const p = ones / n, se = Math.sqrt(Math.max(p * (1 - p), 0.25 / n) / n);
      return (thetaOf(p + 2 * se) - thetaOf(p - 2 * se)) / 2;
    }
    function reset() {
      secret = 15 + 150 * rng();
      ones = 0; n = 0; revealed = false;
      draw();
    }
    function draw() {
      plot.clear();
      let band = null;
      if (n) {
        const p = ones / n, se = Math.sqrt(Math.max(p * (1 - p), 0.25 / n) / n);
        const lo = Math.max(0, p - 2 * se), hi = Math.min(1, p + 2 * se);
        band = [thetaOf(lo), thetaOf(hi)];
        plot.rect(0, lo, 180, hi, { fill: "rgba(255,138,80,.16)" });
        plot.rect(band[0], 0, band[1], 1, { fill: "rgba(255,138,80,.22)" });
        plot.seg(0, p, 180, p, { color: "#ff8a50", width: 2 });
        sP.set(`${p.toFixed(3)} <small>± ${(2 * se).toFixed(3)}</small>`);
        sT.set(`${band[0].toFixed(0)}° – ${band[1].toFixed(0)}°`);
      } else {
        sP.set("–");
        sT.set("–");
      }
      plot.fn((x) => p1(x), { color: C.qc, width: 3.5 });
      plot.seg(guess, 0, guess, 1, { color: "#2c2842", width: 2, dash: [6, 5] });
      plot.text("guess", guess, 0.95, { bg: "#fff", size: 11 });
      if (revealed) {
        plot.seg(secret, 0, secret, 1, { color: "#18a46f", width: 3 });
        plot.text(`θ* = ${secret.toFixed(1)}°`, secret, 0.06, { bg: "#dcf7ea", size: 11 });
      }
      sN.set(String(n));
    }
    reset();
  }
})();

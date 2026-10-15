/* w3d2: interference. Paths, phasor sums, fringes, and what peeking does. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("paths", "Paths and phases", "turn φ");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    let phi = 0;
    let peek = false;
    let sweeping = null;
    const W = 820, H = 330;
    const P = {
      start: [60, 165], h1: [150, 165], m0: [300, 85], m1: [300, 245], ph: [405, 245],
      f0: [690, 85], f1: [690, 245],
    };
    const curve = (a, b, bend = 0) => {
      const mx = (a[0] + b[0]) / 2;
      return `M${a[0]},${a[1]} C${mx + bend},${a[1]} ${mx - bend},${b[1]} ${b[0]},${b[1]}`;
    };
    let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;font-family:Fredoka, sans-serif">`;
    s += `<style>.flow{stroke-dasharray:3 13;stroke-linecap:round;animation:flow 1.1s linear infinite}@keyframes flow{to{stroke-dashoffset:-32}}@media (prefers-reduced-motion:reduce){.flow{animation:none}}</style>`;
    // start -> H -> middle
    s += `<path d="${curve([P.start[0] + 26, 165], [P.h1[0] - 22, 165])}" stroke="#b9a7ff" stroke-width="5" fill="none"/>`;
    s += `<path id="pm0" d="${curve([P.h1[0] + 22, 165], [P.m0[0] - 30, P.m0[1]])}" stroke="#b9a7ff" stroke-width="5" fill="none" class="flow"/>`;
    s += `<path id="pm1" d="${curve([P.h1[0] + 22, 165], [P.m1[0] - 30, P.m1[1]])}" stroke="#b9a7ff" stroke-width="5" fill="none" class="flow"/>`;
    s += `<path id="pph" d="M${P.m1[0] + 30},${P.m1[1]} L${P.ph[0] - 34},${P.ph[1]}" stroke="#b9a7ff" stroke-width="5" fill="none" class="flow"/>`;
    // four paths to the outcomes (via the second H at x=540)
    const routes = [
      ["r00", [P.m0[0] + 30, P.m0[1]], [P.f0[0] - 46, P.f0[1]]],
      ["r01", [P.m0[0] + 30, P.m0[1]], [P.f1[0] - 46, P.f1[1] - 10]],
      ["r10", [P.ph[0] + 34, P.ph[1]], [P.f0[0] - 46, P.f0[1] + 10]],
      ["r11", [P.ph[0] + 34, P.ph[1]], [P.f1[0] - 46, P.f1[1]]],
    ];
    for (const [id, a, b] of routes) s += `<path id="${id}" d="${curve(a, b, 30)}" stroke-width="6" fill="none" class="flow"/>`;
    s += `<rect x="520" y="40" width="44" height="250" rx="16" fill="#ffd6e6" stroke="#ff76a8" stroke-width="2.5" opacity=".92"/><text x="542" y="172" text-anchor="middle" font-size="20" font-weight="600" fill="#2c2842">H</text>`;
    s += `<text x="542" y="306" text-anchor="middle" font-size="11" fill="#8a85a3" font-family="Nunito">second H</text>`;
    // nodes
    const node = (p, label, fill = "#fff") => `<circle cx="${p[0]}" cy="${p[1]}" r="26" fill="${fill}" stroke="#2c2842" stroke-opacity=".6" stroke-width="2"/><text x="${p[0]}" y="${p[1] + 6}" text-anchor="middle" font-size="16" font-weight="600" fill="#2c2842">${label}</text>`;
    s += node(P.start, "|0⟩");
    s += `<rect x="${P.h1[0] - 22}" y="${P.h1[1] - 22}" width="44" height="44" rx="12" fill="#ffd6e6" stroke="#ff76a8" stroke-width="2.5"/><text x="${P.h1[0]}" y="${P.h1[1] + 7}" text-anchor="middle" font-size="20" font-weight="600" fill="#2c2842">H</text>`;
    s += `<g id="mid">${node(P.m0, "0", "#fff")}${node(P.m1, "1", "#fff")}</g>`;
    s += `<text x="${P.m0[0]}" y="${P.m0[1] - 36}" text-anchor="middle" font-size="12" font-weight="700" fill="#5b45d6" font-family="JetBrains Mono">1/√2</text>`;
    s += `<text x="${P.m1[0]}" y="${P.m1[1] + 46}" text-anchor="middle" font-size="12" font-weight="700" fill="#5b45d6" font-family="JetBrains Mono">1/√2</text>`;
    s += `<g id="eyes" opacity="0"><text x="${P.m0[0]}" y="${P.m0[1] - 50}" text-anchor="middle" font-size="12" font-weight="800" fill="#e5568f" font-family="Nunito">peeked!</text><text x="${P.m1[0]}" y="${P.m1[1] + 62}" text-anchor="middle" font-size="12" font-weight="800" fill="#e5568f" font-family="Nunito">peeked!</text></g>`;
    s += `<rect x="${P.ph[0] - 34}" y="${P.ph[1] - 22}" width="68" height="44" rx="12" fill="#ffe9c2" stroke="#f0ac2e" stroke-width="2.5"/><text id="phlabel" x="${P.ph[0]}" y="${P.ph[1] + 6}" text-anchor="middle" font-size="15" font-weight="600" fill="#2c2842">P(0°)</text>`;
    s += `<text x="${P.ph[0]}" y="${P.ph[1] + 40}" text-anchor="middle" font-size="11" fill="#8a85a3" font-family="Nunito">phase on the 1 path</text>`;
    for (const [k, p] of [["0", P.f0], ["1", P.f1]]) {
      s += `<text x="${p[0] + 76}" y="${p[1] - 40}" text-anchor="middle" font-size="13" font-weight="700" fill="#57526f" font-family="Nunito">outcome ${k}</text>`;
      s += `<text id="prob${k}" x="${p[0] + 76}" y="${p[1] + 56}" text-anchor="middle" font-size="15" font-weight="600" fill="#2c2842">P = 1.00</text>`;
    }
    s += `</svg>`;
    const stage = h("div", { style: { position: "relative", background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "18px", padding: "8px" }, html: s });
    // phasor canvases sit on top of the outcome nodes
    const mk = () => {
      const cv = h("canvas", { width: 200, height: 200, style: { position: "absolute", width: "11%", aspectRatio: "1", transform: "translate(-50%,-50%)", pointerEvents: "none" } });
      stage.appendChild(cv);
      return cv;
    };
    const ph0 = mk(), ph1 = mk();
    const place = () => {
      const svg = stage.querySelector("svg");
      const r = svg.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const sx = r.width / W;
      for (const [cv, p] of [[ph0, P.f0], [ph1, P.f1]]) {
        cv.style.left = r.left - sr.left + (p[0] + 6) * sx + "px";
        cv.style.top = r.top - sr.top + p[1] * sx + "px";
      }
    };
    const phiS = ui.slider({ label: "phase φ", min: 0, max: 360, step: 1, value: 0, fmt: (v) => v + "°", oninput: (v) => { phi = v * deg; draw(); } });
    const peekT = ui.toggle({ label: "Peek in the middle (measure the path)", checked: false, onchange: (v) => { peek = v; draw(); } });
    const sweep = ui.button("Sweep φ", () => toggleSweep(), "btn qc small");
    const chartHost = h("div");
    card.body.append(stage, h("div", { class: "controls" }, phiS, sweep), h("div", { class: "controls" }, peekT), chartHost);
    const chart = QP.chart(chartHost, { xlim: [0, 360], ylim: [-0.05, 1.05], aspect: 0.3, minH: 170, maxH: 220, xlabel: "φ (degrees)", ylabel: "P(0)", xstep: 90, ystep: 0.5 });
    const xs = QP.math.linspace(0, 360, 181);

    function phasor(cv, a, b, color) {
      // a, b: complex contributions; draw a tip-to-tail and the sum
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, 200, 200);
      ctx.beginPath();
      ctx.arc(100, 100, 92, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(76,60,140,0.25)";
      ctx.stroke();
      const S = 150; // pixels per unit amplitude
      const arrow = (x0, y0, x1, y1, col, w) => {
        const ang = Math.atan2(y1 - y0, x1 - x0);
        const len = Math.hypot(x1 - x0, y1 - y0);
        ctx.strokeStyle = ctx.fillStyle = col;
        ctx.lineWidth = w;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1 - Math.cos(ang) * Math.min(14, len * 0.4), y1 - Math.sin(ang) * Math.min(14, len * 0.4));
        ctx.stroke();
        if (len > 4) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - Math.cos(ang - 0.5) * 18, y1 - Math.sin(ang - 0.5) * 18);
          ctx.lineTo(x1 - Math.cos(ang + 0.5) * 18, y1 - Math.sin(ang + 0.5) * 18);
          ctx.closePath();
          ctx.fill();
        }
      };
      const ox = 100 - ((a.re + b.re) * S) / 2, oy = 100 + ((a.im + b.im) * S) / 2;
      const ax = ox + a.re * S, ay = oy - a.im * S;
      const bx = ax + b.re * S, by = ay - b.im * S;
      arrow(ox, oy, ax, ay, QP.phaseColor(Math.atan2(a.im, a.re), 60), 7);
      arrow(ax, ay, bx, by, QP.phaseColor(Math.atan2(b.im, b.re), 60), 7);
      const mag = Math.hypot(a.re + b.re, a.im + b.im);
      if (mag > 0.02) arrow(ox, oy, bx, by, "rgba(44,40,66,0.85)", 4);
      else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ox, oy, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function draw() {
      const svg = stage.querySelector("svg");
      const cphi = QP.phaseColor(phi, 62), cphiNeg = QP.phaseColor(phi + Math.PI, 62), c0 = QP.phaseColor(0, 62);
      svg.querySelector("#r00").setAttribute("stroke", peek ? "#d8d3e6" : c0);
      svg.querySelector("#r01").setAttribute("stroke", peek ? "#d8d3e6" : c0);
      svg.querySelector("#r10").setAttribute("stroke", peek ? "#d8d3e6" : cphi);
      svg.querySelector("#r11").setAttribute("stroke", peek ? "#d8d3e6" : cphiNeg);
      svg.querySelector("#phlabel").textContent = `P(${Math.round(phi / deg)}°)`;
      svg.querySelector("#eyes").setAttribute("opacity", peek ? "1" : "0");
      const half = { re: 0.5, im: 0 };
      const eph = { re: 0.5 * Math.cos(phi), im: 0.5 * Math.sin(phi) };
      const neg = { re: -eph.re, im: -eph.im };
      let p0, p1;
      if (peek) {
        p0 = p1 = 0.5;
        for (const cv of [ph0, ph1]) {
          const ctx = cv.getContext("2d");
          ctx.clearRect(0, 0, 200, 200);
          ctx.beginPath();
          ctx.arc(100, 100, 92, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.96)";
          ctx.fill();
          ctx.font = "800 30px Nunito, sans-serif";
          ctx.fillStyle = "#8a85a3";
          ctx.textAlign = "center";
          ctx.fillText("½ + ½", 100, 96);
          ctx.font = "700 22px Nunito, sans-serif";
          ctx.fillText("no arrows", 100, 128);
        }
      } else {
        phasor(ph0, half, eph, C.c1);
        phasor(ph1, half, neg, C.c0);
        p0 = Math.cos(phi / 2) ** 2;
        p1 = 1 - p0;
      }
      svg.querySelector("#prob0").textContent = `P = ${p0.toFixed(2)}`;
      svg.querySelector("#prob1").textContent = `P = ${p1.toFixed(2)}`;
      chart.marker = phi / deg;
      chart.draw([
        { x: xs, y: xs.map((v) => (peek ? 0.5 : Math.cos((v * deg) / 2) ** 2)), color: peek ? C.ink3 : C.qc, width: 3, dash: peek ? [6, 6] : null, name: peek ? "with peeking: always 0.5" : "P(0) = cos²(φ/2)" },
      ]);
      chart.point(phi / deg, p0, { r: 7, fill: C.pink, stroke: "#fff", lw: 2.5 });
      place();
    }
    function toggleSweep() {
      if (sweeping) {
        sweeping.stop();
        sweeping = null;
        sweep.textContent = "Sweep φ";
        return;
      }
      sweep.textContent = "Stop";
      sweeping = QP.loop((dt) => {
        phi = (phi + dt * 1.6) % (2 * Math.PI);
        phiS.set(Math.round(phi / deg));
        draw();
      });
    }
    addEventListener("resize", place);
    chart.onresize = draw;
    draw();
    setTimeout(place, 50);
  }
})();

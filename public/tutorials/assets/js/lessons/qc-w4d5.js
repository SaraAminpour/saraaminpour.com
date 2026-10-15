/* w4d4: expectation values as shadows on the axes, and estimating <Z> from shots. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("expect", "Shadows on the axes", "drag the sphere to turn it");
    if (!card) return;
    const C = QP.colors;
    const deg = Math.PI / 180;
    const COL = { x: "#17a98c", y: "#ff8a50", z: "#7b5cfa" };
    let theta = 57, phi = 70, logShots = 2;
    const rng = QP.rng((Math.random() * 2147483647) | 0);
    const left = h("div"), right = h("div");
    card.body.append(h("div", { class: "side-by-side" }, left, right));
    const bloch = new QP.Bloch(left, { aspect: 0.95, maxH: 420, labels: "xyz" });
    bloch.vectors = [{ v: [0, 0, 1], color: "#ff6fa3" }];
    const tS = ui.slider({ label: "θ", min: 0, max: 180, step: 1, value: theta, fmt: (v) => v + "°", oninput: (v) => { theta = v; draw(); } });
    const pS = ui.slider({ label: "φ", min: 0, max: 359, step: 1, value: phi, fmt: (v) => v + "°", oninput: (v) => { phi = v; draw(); } });
    const gauge = (name, color) => {
      const marker = h("div", { style: { position: "absolute", top: "-5px", width: "16px", height: "16px", borderRadius: "50%", background: color, border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.2)", transform: "translateX(-50%)", transition: "left .25s" } });
      const fill = h("div", { style: { position: "absolute", top: 0, bottom: 0, background: color, opacity: 0.35, borderRadius: "999px", transition: "all .25s" } });
      const track = h("div", { style: { position: "relative", height: "8px", borderRadius: "999px", background: "rgba(123,92,250,.1)", margin: "10px 6px 4px" } }, fill, h("div", { style: { position: "absolute", left: "50%", top: "-4px", bottom: "-4px", width: "2px", background: "rgba(76,60,140,.3)" } }), marker);
      const val = h("span", { style: { fontFamily: "JetBrains Mono, monospace", fontWeight: 600 } });
      const el = h("div", { style: { marginBottom: "8px" } }, h("div", { style: { display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.9rem", color } }, h("span", { html: `⟨${name}⟩` }), val), track, h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 800, color: C.ink3 } }, h("span", null, "−1"), h("span", null, "0"), h("span", null, "+1")));
      el.set = (v) => {
        const pct = ((v + 1) / 2) * 100;
        marker.style.left = pct + "%";
        fill.style.left = Math.min(50, pct) + "%";
        fill.style.width = Math.abs(pct - 50) + "%";
        val.textContent = (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
      };
      return el;
    };
    const gX = gauge("X", COL.x), gY = gauge("Y", COL.y), gZ = gauge("Z", COL.z);
    const presets = h("div", { class: "btn-row" }, ...[["|0⟩", 0, 0], ["|1⟩", 180, 0], ["|+⟩", 90, 0], ["|+i⟩", 90, 90]].map(([l, t, p]) => ui.button(l, () => go(t, p), "btn soft tiny")));
    right.append(h("div", { class: "controls col", style: { marginTop: 0 } }, tS, pS), presets, h("div", { style: { marginTop: "14px" } }, gZ, gX, gY));

    // estimation strip
    const shotsS = ui.slider({ label: "shots per estimate", min: 1, max: 4, step: 0.05, value: logShots, fmt: (v) => Math.round(Math.pow(10, v)).toLocaleString("en-US"), oninput: (v) => { logShots = v; ests = []; drawStrip(); } });
    const estB = ui.button("Estimate ⟨Z⟩ 30 times", () => estimate(), "btn qc small");
    const strip = new QP.Plot(null, { xlim: [-1.05, 1.05], ylim: [0, 1], aspect: 0.16, minH: 110, maxH: 130, grid: false });
    const sMean = ui.stat("average of the estimates", "–"), sSpread = ui.stat("spread (one standard deviation)", "–"), sPred = ui.stat("predicted √((1−⟨Z⟩²)/N)", "–");
    card.body.append(h("hr", { class: "soft" }), h("div", { class: "controls", style: { marginTop: 0 } }, shotsS, estB), strip.stage, h("div", { class: "readout" }, sMean, sSpread, sPred));
    strip.resize();
    let ests = [];

    const vec = () => [Math.sin(theta * deg) * Math.cos(phi * deg), Math.sin(theta * deg) * Math.sin(phi * deg), Math.cos(theta * deg)];
    function draw() {
      const v = vec();
      bloch.vectors[0].v = v;
      bloch.lines = [
        { a: v, b: [0, 0, v[2]], color: COL.z, dash: [4, 4] },
        { a: v, b: [v[0], 0, 0], color: COL.x, dash: [4, 4] },
        { a: v, b: [0, v[1], 0], color: COL.y, dash: [4, 4] },
      ];
      bloch.points = [{ v: [0, 0, v[2]], color: COL.z, r: 6 }, { v: [v[0], 0, 0], color: COL.x, r: 6 }, { v: [0, v[1], 0], color: COL.y, r: 6 }];
      bloch.draw();
      gX.set(v[0]);
      gY.set(v[1]);
      gZ.set(v[2]);
      ests = [];
      drawStrip();
    }
    function go(t, p) {
      const t0 = theta, p0 = phi;
      let dp = p - p0;
      dp = ((dp + 540) % 360) - 180;
      QP.animate(600, (e) => {
        theta = t0 + (t - t0) * e;
        phi = (p0 + dp * e + 360) % 360;
        tS.set(Math.round(theta));
        pS.set(Math.round(phi) % 360);
        draw();
      });
    }
    function drawStrip() {
      const z = vec()[2];
      const N = Math.round(Math.pow(10, logShots));
      const sig = Math.sqrt(Math.max(0, 1 - z * z) / N);
      strip.clear("#fcfbff");
      strip.rect(z - sig, 0.08, z + sig, 0.92, { fill: "rgba(123,92,250,0.12)" });
      strip.seg(-1, 0.5, 1, 0.5, { color: "rgba(76,60,140,.25)", width: 2 });
      for (const t of [-1, -0.5, 0, 0.5, 1]) {
        strip.seg(t, 0.42, t, 0.58, { color: "rgba(76,60,140,.35)", width: 1.5 });
        strip.text(String(t), t, 0.16, { size: 10, color: C.ink3 });
      }
      strip.seg(z, 0.08, z, 0.92, { color: COL.z, width: 3 });
      strip.text("true ⟨Z⟩", z, 0.97, { size: 10, color: COL.z, baseline: "top" });
      ests.forEach((e, i) => strip.point(e, 0.25 + 0.5 * ((i * 0.618) % 1), { r: 4.5, fill: C.c0, stroke: "#fff", lw: 1.2, alpha: 0.9 }));
      sPred.set("±" + sig.toFixed(3));
      if (ests.length) {
        const m = QP.math.mean(ests);
        const sd = Math.sqrt(QP.math.mean(ests.map((e) => (e - m) ** 2)));
        sMean.set((m >= 0 ? "+" : "−") + Math.abs(m).toFixed(3));
        sSpread.set("±" + sd.toFixed(3));
      } else {
        sMean.set("–");
        sSpread.set("–");
      }
    }
    function estimate() {
      const z = vec()[2];
      const p0 = (1 + z) / 2;
      const N = Math.round(Math.pow(10, logShots));
      ests = [];
      let k = 0;
      QP.loop(() => {
        let zeros = 0;
        for (let s = 0; s < N; s++) if (rng() < p0) zeros++;
        ests.push((2 * zeros - N) / N);
        drawStrip();
        if (++k >= 30) return false;
      });
    }
    strip.onresize = drawStrip;
    draw();
  }
})();

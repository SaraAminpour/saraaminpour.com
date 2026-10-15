/* qc-w2d5: steer the qubit. Reach a target star on the Bloch sphere with RY(theta) then RZ(phi). */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  const DEG = Math.PI / 180;
  QP.onReady(() => widget());

  const vec = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];

  function widget() {
    const card = QP.widget("steer", "Steer the qubit", "RY tilts, RZ spins");
    if (!card) return;
    let th = 0, ph = 0, target = null, solved = 0, streakSolved = false;
    const rng = QP.rng((Math.random() * 1e9) | 0);
    const bHost = h("div");
    const bloch = new QP.Bloch(bHost, { aspect: 0.95, maxH: 360, labels: "kets" });
    bloch.vectors = [{ v: [0, 0, 1], color: "#ff6fa3" }];
    const tS = ui.slider({ label: "RY angle θ (tilt)", min: 0, max: 180, step: 1, value: 0, fmt: (v) => v + "°", oninput: (v) => { th = v; draw(); } });
    const pS = ui.slider({ label: "RZ angle φ (spin)", min: -180, max: 180, step: 1, value: 0, fmt: (v) => v + "°", color: "#7b5cfa", oninput: (v) => { ph = v; draw(); } });
    const meterFill = h("div", { class: "fid-fill" });
    const meter = h("div", { class: "fid-meter" }, meterFill);
    const fidTxt = h("div", { class: "small", style: { fontWeight: 800, color: C.ink2, marginTop: "4px" } });
    const circ = h("div", { class: "clab-ket" });
    const targetTxt = h("div", { class: "clab-ket" });
    const score = ui.stat("Targets reached", "0", "good");
    const next = ui.button("New target", () => newTarget(), "btn qc small");
    const show = ui.button("Show me the answer", () => reveal(), "btn soft small");
    card.body.append(h("div", { class: "side-by-side" }, bHost, h("div", null,
      h("div", { class: "kbd-hint" }, "Your circuit: start in |0⟩, then RY(θ), then RZ(φ)"), circ,
      h("div", { class: "controls col" }, tS, pS),
      h("div", { class: "kbd-hint", style: { marginTop: "10px" } }, "Fidelity with the target, |⟨target|ψ⟩|²"), meter, fidTxt,
      targetTxt, h("div", { class: "btn-row", style: { marginTop: "10px" } }, next, show), h("div", { class: "readout" }, score))));

    function newTarget() {
      // a random point, not too close to the poles so both angles matter
      const tt = Math.acos(QP.math.clamp(1 - 2 * (0.12 + 0.76 * rng()), -1, 1));
      const tp = -Math.PI + 2 * Math.PI * rng();
      target = { th: tt, ph: tp };
      streakSolved = false;
      bloch.points = [{ v: vec(tt, tp), color: "#ffd66b", shape: "star", r: 10 }];
      draw();
    }
    function reveal() {
      const fromT = th, fromP = ph, toT = target.th / DEG, toP = target.ph / DEG;
      QP.animate(900, (e) => { th = fromT + (toT - fromT) * e; ph = fromP + (toP - fromP) * e; tS.set(Math.round(th)); pS.set(Math.round(ph)); draw(); });
    }
    function draw() {
      const v = vec(th * DEG, ph * DEG);
      bloch.vectors[0].v = v;
      bloch.draw();
      const tv = vec(target.th, target.ph);
      const dot = v[0] * tv[0] + v[1] * tv[1] + v[2] * tv[2];
      const fid = (1 + dot) / 2; // for pure states, fidelity = (1 + cos of the angle between the arrows) / 2
      meterFill.style.width = (fid * 100).toFixed(1) + "%";
      meterFill.classList.toggle("ok", fid >= 0.99);
      fidTxt.textContent = fid >= 0.99 ? `${(fid * 100).toFixed(1)}%: on target!` : `${(fid * 100).toFixed(1)}%`;
      circ.textContent = `|0⟩ → RY(${Math.round(th)}°) → RZ(${Math.round(ph)}°)`;
      targetTxt.innerHTML = `<span class="muted">Target (yellow star):</span> ${QP.ketString(QP.fromBloch(target.th, target.ph))}`;
      if (fid >= 0.99 && !streakSolved) {
        streakSolved = true;
        solved++;
        score.set(String(solved), "good");
        QP.confettiAt(meter, 70);
      }
    }
    newTarget();
  }
})();

/* qml-w1d3: amplitude encoding. (1) Squeeze an 8 x 8 digit into the 64 amplitudes of 6 qubits, then try to
   read it back from shots. (2) A qubit-and-gate budget for angle, dense angle and amplitude encoding. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => { squeeze(); budget(); });

  function squeeze() {
    const card = QP.widget("ampenc", "A digit in six qubits", "64 pixels, 64 amplitudes");
    if (!card) return;
    fetch(QP.asset("data/ml-w6d3-pca.json"))
      .then((r) => r.json())
      .then(build)
      .catch(() => card.body.append(h("p", { class: "small" }, "Couldn't load the digits. Try reloading the page.")));

    function build(D) {
      let idx = 0, shots = 1000, counts = null, seed = 1;
      const grid = (title) => { const g = h("div", { class: "pd-img" }); for (let i = 0; i < 64; i++) g.appendChild(h("span")); return h("div", null, h("div", { class: "kbd-hint" }, title), g); };
      const A = grid("The digit (64 pixels)"), B = grid("Read back from the shots");
      const barsHost = h("div", { class: "ae-bars" });
      const bars = Array.from({ length: 64 }, () => h("span"));
      bars.forEach((b) => barsHost.appendChild(b));
      const nextB = ui.button("Another digit", () => { idx = (idx + 1) % D.samples.length; counts = null; draw(); }, "btn soft small");
      const shotSeg = ui.seg({ label: "Shots", options: [{ value: 100, label: "100" }, { value: 1000, label: "1,000" }, { value: 100000, label: "100,000" }], value: shots, onchange: (v) => { shots = +v; counts = null; draw(); } });
      const measB = ui.button("Measure the 6 qubits", () => { seed++; measure(); draw(); }, "btn qc small");
      const sF = ui.stat("fidelity of the read-back image", "–");
      const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
      card.body.append(h("div", { class: "pd-row" }, A, h("div", { class: "pd-arrow" }, "→"), h("div", { style: { flex: 1, minWidth: "220px" } }, h("div", { class: "kbd-hint" }, "Amplitudes of |000000⟩ … |111111⟩ (normalized pixels)"), barsHost), B),
        h("div", { class: "controls" }, shotSeg, nextB, measB), h("div", { class: "readout" }, sF), note);
      const amps = () => { const x = D.samples[idx][0]; const n = Math.hypot(...x) || 1; return x.map((v) => v / n); };
      function measure() {
        const p = amps().map((a) => a * a);
        const r = QP.rng(seed * 7919);
        counts = new Array(64).fill(0);
        for (let s = 0; s < shots; s++) { let u = r(), k = 0; while (k < 63 && u >= p[k]) { u -= p[k]; k++; } counts[k]++; }
      }
      const paint = (g, v, vmax) => g.querySelectorAll("span").forEach((c, i) => (c.style.background = `rgba(84,39,143,${Math.min(1, v[i] / vmax)})`));
      function draw() {
        const a = amps(), amax = Math.max(...a);
        paint(A.lastChild, a, amax);
        bars.forEach((b, i) => (b.style.height = `${(a[i] / amax) * 100}%`));
        if (counts) {
          const est = counts.map((c) => Math.sqrt(c / shots));
          paint(B.lastChild, est, Math.max(...est) || 1);
          const F = Math.pow(a.reduce((s, v, i) => s + v * est[i], 0), 2);
          sF.set(F.toFixed(3), F > 0.98 ? "good" : "");
          note.textContent = `Each shot reveals only one of the 64 basis states. With ${shots.toLocaleString("en-US")} shots the estimated amplitudes (square roots of the frequencies) ${F > 0.98 ? "give back a clear image" : "are still grainy"}. Reading out all 2ⁿ amplitudes needs many shots, growing with 2ⁿ.`;
        } else {
          B.lastChild.querySelectorAll("span").forEach((c) => (c.style.background = ""));
          sF.set("–");
          note.textContent = "Six qubits hold the whole image in their 64 amplitudes. Press Measure to try reading it back.";
        }
      }
      draw();
    }
  }

  function budget() {
    const card = QP.widget("budget", "A qubit budget", "angle versus amplitude encoding");
    if (!card) return;
    const CX = [0, 0, 1, 4, 11, 26, 57, 120, 247]; // CNOTs Qiskit's StatePreparation needed for random vectors, n = 0..8
    let d = 64;
    const dS = ui.slider({ label: "features per data point", min: 1, max: 12, step: 1, value: 6, fmt: (v) => String(2 ** v), color: C.qml, oninput: (v) => { d = 2 ** v; draw(); } });
    const tbl = h("div");
    const note = h("div", { class: "small", style: { fontWeight: 700, color: C.ink2, minHeight: "2.6em", marginTop: "6px" } });
    card.body.append(h("div", { class: "controls" }, dS), tbl, note);
    function draw() {
      const n = Math.ceil(Math.log2(d));
      const cxAmp = n < CX.length ? CX[n] : Math.pow(2, n) - n - 1;
      const rows = [
        ["angle", d, "1 rotation per feature", "0"],
        ["dense angle", Math.ceil(d / 2), "2 rotations per qubit", "0"],
        ["amplitude", n, "general state preparation", `≈ ${cxAmp.toLocaleString("en-US")}`],
      ];
      tbl.innerHTML = `<table class="tablelike data-table"><tr><th>encoding</th><th>qubits</th><th>gates</th><th>CNOTs</th></tr>${rows.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1].toLocaleString("en-US")}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</table>`;
      note.textContent = d <= 8 ? "Small data: every encoding is cheap." : n > 8
        ? `Amplitude encoding needs only ${n} qubits, but preparing an arbitrary state costs about 2ⁿ CNOTs: thousands of noisy gates before the model even starts. Angle encoding needs ${d.toLocaleString("en-US")} qubits, more than any simulator holds. In practice: shrink the data first (PCA), then angle-encode.`
        : `Amplitude encoding saves qubits (${n} instead of ${d}) but costs about ${cxAmp} CNOTs; angle encoding is shallow but needs a qubit per feature.`;
    }
    draw();
  }
})();

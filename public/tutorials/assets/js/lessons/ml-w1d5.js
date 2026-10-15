/* ml-w1d5: is my model any good? The accuracy trap, with a threshold and every score. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => trap());

  function trap() {
    const card = QP.widget("trap", "The accuracy trap", "100 patients");
    if (!card) return;
    const C = QP.colors;
    const r = QP.rng(19);
    const people = [];
    for (let i = 0; i < 100; i++) {
      const sick = i < 5;
      const score = QP.math.clamp(sick ? 0.66 + 0.13 * r.normal() : 0.33 + 0.15 * r.normal(), 0.01, 0.99);
      people.push({ sick, score });
    }
    people.sort((a, b) => a.score - b.score);
    let model = "lazy";
    let thr = 0.6;
    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(20, minmax(0,1fr))", gap: "3px", padding: "10px", background: "#fcfbff", border: "1px solid var(--line)", borderRadius: "16px" } });
    const cells = people.map((p) => {
      const el = h("div", { style: { position: "relative", aspectRatio: "0.8", display: "grid", placeItems: "center", borderRadius: "10px", transition: "background .3s, box-shadow .3s" }, title: `${p.sick ? "sick" : "healthy"} · test score ${p.score.toFixed(2)}` });
      el.innerHTML = `<svg viewBox="0 0 20 25" width="100%" style="max-width:26px"><circle cx="10" cy="7" r="5" fill="${p.sick ? "#ff8fb8" : "#7fe0c4"}" stroke="#2c2842" stroke-width="1.2"/><path d="M2.5 24 C2.5 15 17.5 15 17.5 24 Z" fill="${p.sick ? "#ff8fb8" : "#7fe0c4"}" stroke="#2c2842" stroke-width="1.2"/></svg>`;
      grid.appendChild(el);
      return el;
    });
    const modelSeg = ui.seg({ label: "Model", options: [{ value: "lazy", label: "Lazy: everyone is healthy" }, { value: "test", label: "Test score ≥ threshold" }], value: model, onchange: (v) => { model = v; slider.style.opacity = v === "test" ? 1 : 0.4; update(); } });
    const slider = ui.slider({ label: "threshold", min: 0.05, max: 0.95, step: 0.01, value: thr, fmt: (v) => v.toFixed(2), oninput: (v) => { thr = v; if (model !== "test") { model = "test"; modelSeg.set("test"); slider.style.opacity = 1; } update(); } });
    slider.style.opacity = 0.4;
    const tile = (label, cls) => {
      const n = h("div", { style: { fontFamily: "Fredoka, sans-serif", fontSize: "1.7rem", fontWeight: 600, lineHeight: 1.1 } }, "0");
      const el = h("div", { style: { borderRadius: "14px", padding: "10px 12px", textAlign: "center", border: "1px solid var(--line)" }, class: cls }, n, h("div", { class: "small", style: { fontWeight: 800, color: C.ink2 } }, label));
      el.n = n;
      return el;
    };
    const TP = tile("found sick (TP)"), FN = tile("missed sick (FN)"), FP = tile("false alarm (FP)"), TN = tile("correctly healthy (TN)");
    TP.style.background = "#dcf7ea"; TN.style.background = "#dcf7ea"; FN.style.background = "#ffe1e5"; FP.style.background = "#fff1cc";
    const cm = h("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "6px", alignItems: "center" } },
      h("div"), h("div", { class: "small center", style: { fontWeight: 800, color: C.ink3 } }, "predicted sick"), h("div", { class: "small center", style: { fontWeight: 800, color: C.ink3 } }, "predicted healthy"),
      h("div", { class: "small", style: { fontWeight: 800, color: C.ink3, textAlign: "right" } }, "really sick"), TP, FN,
      h("div", { class: "small", style: { fontWeight: 800, color: C.ink3, textAlign: "right" } }, "really healthy"), FP, TN);
    const sAcc = ui.stat("Accuracy", "–"), sPre = ui.stat("Precision", "–"), sRec = ui.stat("Recall (sick found)", "–"), sF1 = ui.stat("F1", "–"), sBal = ui.stat("Balanced accuracy", "–");
    card.body.append(h("div", { class: "controls" }, modelSeg), h("div", { class: "controls" }, slider), grid,
      h("div", { class: "legend" }, h("span", null, h("i", { style: { background: "#ff8fb8" } }), "really sick"), h("span", null, h("i", { style: { background: "#7fe0c4" } }), "really healthy"), h("span", null, h("i", { style: { background: "rgba(123,92,250,.25)", borderRadius: "4px" } }), "flagged as sick by the model"), h("span", { class: "muted" }, "people are sorted by test score, low to high")),
      h("div", { class: "side-by-side even", style: { marginTop: "14px" } }, cm, h("div", { class: "readout", style: { marginTop: 0 } }, sAcc, sPre, sRec, sF1, sBal)));

    function update() {
      let tp = 0, fn = 0, fp = 0, tn = 0;
      people.forEach((p, i) => {
        const flag = model === "test" && p.score >= thr;
        cells[i].style.background = flag ? "rgba(123,92,250,.22)" : "transparent";
        cells[i].style.boxShadow = flag ? "inset 0 0 0 2px rgba(123,92,250,.55)" : "none";
        if (p.sick && flag) tp++;
        else if (p.sick) fn++;
        else if (flag) fp++;
        else tn++;
      });
      TP.n.textContent = tp; FN.n.textContent = fn; FP.n.textContent = fp; TN.n.textContent = tn;
      const accv = (tp + tn) / 100;
      const rec = tp / (tp + fn);
      const spec = tn / (tn + fp);
      const bal = (rec + spec) / 2;
      const pre = tp + fp ? tp / (tp + fp) : null;
      const f1 = pre != null && tp ? (2 * pre * rec) / (pre + rec) : 0;
      sAcc.set((accv * 100).toFixed(0) + "%", accv >= 0.9 ? "good" : "");
      sPre.set(pre == null ? "–" : (pre * 100).toFixed(0) + "%", pre == null ? "" : pre >= 0.8 ? "good" : pre < 0.3 ? "bad" : "");
      sRec.set(`${tp} of 5`, rec === 1 ? "good" : rec === 0 ? "bad" : "");
      sF1.set((f1 * 100).toFixed(0) + "%", f1 >= 0.8 ? "good" : f1 < 0.3 ? "bad" : "");
      sBal.set((bal * 100).toFixed(0) + "%", bal <= 0.55 ? "bad" : bal >= 0.85 ? "good" : "");
    }
    update();
  }
})();

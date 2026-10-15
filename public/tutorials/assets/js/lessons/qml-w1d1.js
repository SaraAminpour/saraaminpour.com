/* qml-w1d1: sort eight real examples onto the QML map: is the data classical or quantum, and the algorithm? */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const CARDS = [
    { t: "A spam filter trained on thousands of emails", a: "CC", why: "Classical data (emails) and a classical algorithm: your CS course." },
    { t: "A quantum-kernel SVM sorting handwritten digits", a: "CQ", why: "The digits are classical data; the similarities come from a quantum circuit." },
    { t: "A neural network that reads the analog signal of a qubit measurement and decides 0 or 1", a: "QC", why: "The data comes from a quantum device; the learner is an ordinary network." },
    { t: "A quantum processor that learns about states sent straight from a quantum sensor, without measuring them first", a: "QQ", why: "Quantum data, processed by a quantum algorithm: no classical bottleneck in between." },
    { t: "k-means grouping galaxies by their brightness and color", a: "CC", why: "Classical data and a classical algorithm (ML week 6)." },
    { t: "A variational quantum classifier on the two-moons dataset", a: "CQ", why: "Classical points, encoded into qubits and classified by a trainable circuit (QML week 3)." },
    { t: "A neural network that reconstructs a quantum state from many measurement results", a: "QC", why: "Measurement records of a quantum system, learned by a classical model." },
    { t: "A quantum circuit that recognizes the phase of a quantum material, given its ground states directly", a: "QQ", why: "The inputs are quantum states themselves, and the classifier is quantum." },
  ];
  const QUAD = {
    CC: { title: "CC", sub: "classical data · classical algorithm", color: "#17a98c" },
    CQ: { title: "CQ", sub: "classical data · quantum algorithm", color: "#7b5cfa" },
    QC: { title: "QC", sub: "quantum data · classical algorithm", color: "#5577f5" },
    QQ: { title: "QQ", sub: "quantum data · quantum algorithm", color: "#ff7a59" },
  };

  function widget() {
    const card = QP.widget("qmlmap", "Sort the examples onto the map", "data × algorithm");
    if (!card) return;
    let i = 0;
    const placed = { CC: [], CQ: [], QC: [], QQ: [] };
    let right = 0;
    const cardEl = h("div", { class: "qm-card" });
    const btns = Object.keys(QUAD).map((k) => ui.button(QUAD[k].title, () => answer(k), "btn soft small qm-btn"));
    const feedback = h("div", { class: "small", style: { fontWeight: 700, minHeight: "2.8em", marginTop: "6px", color: C.ink2 } });
    const grid = h("div", { class: "qm-grid" });
    const quadEls = {};
    for (const k of Object.keys(QUAD)) {
      const list = h("div", { class: "qm-list" });
      quadEls[k] = list;
      grid.appendChild(h("div", { class: "qm-quad", style: { borderColor: QUAD[k].color } }, h("div", { class: "qm-qt", style: { color: QUAD[k].color } }, QUAD[k].title, h("span", null, QUAD[k].sub)), list));
    }
    const axes = h("div", { class: "qm-axes" }, h("span", null, "algorithm: classical → quantum"), h("span", null, "data: classical ↓ quantum"));
    const again = ui.button("Start over", () => reset(), "btn soft small");
    card.body.append(cardEl, h("div", { class: "btn-row", style: { marginTop: "8px" } }, ...btns), feedback, axes, grid, h("div", { class: "btn-row", style: { marginTop: "8px" } }, again));

    function show() {
      if (i >= CARDS.length) {
        cardEl.innerHTML = `<b>All sorted: ${right} of ${CARDS.length} on the first try.</b> This tutorial lives mostly in CQ, and its last week visits QQ.`;
        btns.forEach((b) => (b.disabled = true));
        return;
      }
      cardEl.innerHTML = `<span class="qm-n">${i + 1} / ${CARDS.length}</span> ${CARDS[i].t}`;
      btns.forEach((b) => (b.disabled = false));
    }
    let tries = 0;
    function answer(k) {
      const c = CARDS[i];
      if (k !== c.a) {
        tries++;
        feedback.textContent = `Not quite: ask where the data comes from, and what does the learning.`;
        feedback.style.color = "#e5566b";
        return;
      }
      if (tries === 0) right++;
      tries = 0;
      feedback.textContent = `${c.a}: ${c.why}`;
      feedback.style.color = QUAD[c.a].color;
      placed[c.a].push(c.t);
      quadEls[c.a].appendChild(h("div", { class: "qm-item" }, c.t));
      i++;
      show();
    }
    function reset() {
      i = 0; right = 0; tries = 0;
      Object.values(quadEls).forEach((el) => (el.innerHTML = ""));
      feedback.textContent = "";
      show();
    }
    show();
  }
})();

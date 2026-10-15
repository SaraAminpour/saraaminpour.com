/* qml-w4d4: read an abstract like a referee. An invented (but typical) QML abstract with clickable phrases: eight hide
   a red flag, each tied to the lesson that taught the check, and two are fine. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  const PARTS = [
    "Quantum machine learning ",
    { k: "hype", t: "promises exponential speedups for data analysis" },
    ". We propose QuantumBoost, ",
    { k: "model", t: "a variational quantum classifier with an entangling feature map" },
    ", and apply it to ",
    { k: "data", t: "the Wisconsin breast cancer dataset" },
    ", ",
    { k: "pca", t: "reduced to four features by PCA" },
    ". ",
    { k: "split", t: "On a held-out test set" },
    ", QuantumBoost reaches 98.2% accuracy, against 94.1% for ",
    { k: "baseline", t: "a support vector machine" },
    ". ",
    { k: "peek", t: "Hyperparameters were chosen to maximize test accuracy" },
    ". Our model needs ",
    { k: "params", t: "only 16 trainable parameters, far fewer than a neural network" },
    ". ",
    { k: "sim", t: "Simulations on 4 qubits" },
    " demonstrate ",
    { k: "claim", t: "the potential of quantum advantage for medical diagnosis" },
    ".",
  ];
  const NOTES = {
    hype: { flag: true, q: "Which speedup, for which task?", a: "Proposed speedups usually assume the data can be loaded into qubits quickly, which is often the hard part (week 1). The clearest advantages so far are for quantum data (week 4), not tables like this one.", lesson: "QML week 1 (why QML?) and week 4 (quantum data)" },
    model: { flag: false, q: "Fine as stated.", a: "A standard model (week 3). What matters is how it's compared, which the rest of the abstract decides." },
    data: { flag: false, q: "Fine: a public benchmark.", a: "Anyone can rerun it. Just remember it's small and classical: in week 2 the quantum kernels tied with a tuned RBF on exactly this dataset." },
    pca: { flag: true, q: "Fitted on what?", a: "PCA and scaling must be fitted on the training part only. Fitting them on all the data leaks the test set into the model.", lesson: "QML week 2 (the QSVM lesson) and ML week 1 (train, validate, test)" },
    split: { flag: true, q: "One split? What spread?", a: "One test set is one roll of the dice. On data like these, scores move by a few points between splits, so 98.2 versus 94.1 needs several splits and error bars.", lesson: "QML week 2 project (kernels, honestly)" },
    baseline: { flag: true, q: "Which SVM, tuned how?", a: "A single classical baseline, with no word on its kernel or tuning. The fair opponent is a strong, equally tuned classical model on the same features.", lesson: "the projects of QML weeks 2 and 3" },
    peek: { flag: true, q: "That's peeking.", a: "Choosing settings by test accuracy turns the test set into training data. The 98.2% is now an optimistic guess, not a measurement.", lesson: "QML week 2 project (the three shortcuts)" },
    params: { flag: true, q: "Parameters aren't the cost.", a: "A 13-weight network tied a 14-number quantum classifier in week 3. The real bill is circuit runs and shots: about 120 million shots for one small training.", lesson: "QML week 3 project (versus a tiny network)" },
    sim: { flag: true, q: "Simulated, so classically simulable.", a: "Four qubits are easy for a laptop, so this can't show an advantage by itself. No shots or noise either, and both shrink margins and gradients.", lesson: "QML week 3 (shots) and week 4 (noise, surrogates)" },
    claim: { flag: true, q: "Shown, or suggested?", a: "Nothing here tests how the model scales, and no classical surrogate was tried. 'Potential' is doing a lot of work in this sentence.", lesson: "QML week 4 (trainability and baselines)" },
  };
  const TOTAL = Object.values(NOTES).filter((n) => n.flag).length;

  function widget() {
    const card = QP.widget("paper", "Read this abstract like a referee", "an invented, typical abstract");
    if (!card) return;
    const found = new Set();
    const abs = h("div", { class: "pp-abstract" });
    const title = h("div", { class: "pp-title" }, "QuantumBoost: quantum-enhanced diagnosis of breast cancer");
    const spans = {};
    for (const part of PARTS) {
      if (typeof part === "string") {
        abs.append(part);
        continue;
      }
      const s = h("button", { type: "button", class: "pp-span", onclick: () => pick(part.k) }, part.t);
      spans[part.k] = s;
      abs.append(s);
    }
    const count = ui.stat("red flags found", `0<small> of ${TOTAL}</small>`);
    const reveal = ui.button("Show all", () => Object.keys(NOTES).forEach((k) => pick(k, true)), "btn soft small");
    const cards = h("div", { class: "pp-cards" });
    card.body.append(h("div", { class: "kbd-hint" }, "Tap every phrase that should make a careful reader ask a question."), h("div", { class: "pp-paper" }, title, abs), h("div", { class: "btn-row", style: { alignItems: "center" } }, count, reveal), cards);

    function pick(k, quiet = false) {
      if (found.has(k)) {
        if (!quiet) cards.querySelector(`[data-k="${k}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      found.add(k);
      const n = NOTES[k];
      spans[k].classList.add(n.flag ? "flag" : "ok");
      const el = h("div", { class: "pp-card " + (n.flag ? "flag" : "ok"), "data-k": k },
        h("div", { class: "pp-q" }, (n.flag ? "⚑ " : "✓ ") + n.q),
        h("div", { class: "pp-a" }, n.a),
        n.lesson ? h("div", { class: "pp-l" }, "Where you learned this: " + n.lesson) : null);
      cards.prepend(el);
      const flags = [...found].filter((x) => NOTES[x].flag).length;
      count.set(`${flags}<small> of ${TOTAL}</small>`, flags === TOTAL ? "good" : "");
    }
  }
})();

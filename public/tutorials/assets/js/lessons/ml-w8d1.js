/* ml-w8d1: naive Bayes as an evidence meter. Every known word adds its log-likelihood ratio to the prior's
   log-odds; the sigmoid of the total is P(spam). Same 20 messages and add-one smoothing as the notebook. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => widget());

  const SPAM = ["win a free prize now", "claim your free gift card today", "you won cash click now",
    "free entry to win a phone", "urgent claim your cash prize", "cheap meds click here now",
    "winner you have been selected for a free cruise", "click here to claim your reward",
    "limited offer win money fast", "get cash now no fees"];
  const HAM = ["are we still meeting for lunch today", "can you send me the notes from class",
    "the lab meeting moved to friday", "thanks for the help with the homework",
    "see you at the library at noon", "did you finish the quantum homework",
    "lunch at noon sounds good", "here are the slides from today",
    "can we move our meeting to monday", "happy birthday hope you have a great day"];
  // scikit-learn's CountVectorizer: lower case, words of two or more letters
  const tokens = (s) => s.toLowerCase().match(/\b\w\w+\b/g) || [];

  function widget() {
    const card = QP.widget("bayes", "The evidence meter", "type a message, or pick one");
    if (!card) return;
    const count = (msgs) => {
      const c = {};
      for (const m of msgs) for (const w of tokens(m)) c[w] = (c[w] || 0) + 1;
      return c;
    };
    const cs = count(SPAM), ch = count(HAM);
    const vocab = [...new Set([...Object.keys(cs), ...Object.keys(ch)])];
    const ns = QP.math.sum(Object.values(cs)), nh = QP.math.sum(Object.values(ch));
    let smooth = true, prior = 0.5;
    const llr = (w) => {
      const a = smooth ? 1 : 0;
      const ps = ((cs[w] || 0) + a) / (ns + a * vocab.length), ph = ((ch[w] || 0) + a) / (nh + a * vocab.length);
      return Math.log(ps / ph); // +-Infinity without smoothing when a word is missing from one class
    };

    const input = h("input", { type: "text", class: "ev-input", value: "free lunch at noon today", "aria-label": "message", spellcheck: "false" });
    input.addEventListener("input", draw);
    const examples = ["win a free prize now", "can you send me the notes", "free lunch at noon today", "claim your homework prize", "the cash is in the lab"];
    const chips = h("div", { class: "btn-row ev-examples" }, ...examples.map((m) => ui.button(m, () => { input.value = m; draw(); }, "btn soft small")));
    const priorS = ui.slider({ label: "Spam in the inbox", min: 1, max: 99, value: 50, fmt: (v) => v + "%", color: C.c0, oninput: (v) => { prior = v / 100; draw(); } });
    const smoothT = ui.toggle({ label: "Add-one smoothing", checked: true, onchange: (v) => { smooth = v; draw(); } });
    const rows = h("div", { class: "ev-rows" });
    const sP = ui.stat("P(spam)", "–");
    const sZ = ui.stat("Total log-odds", "–");
    const verdict = h("div", { class: "ev-verdict" });
    card.body.append(h("div", { class: "ev-top" }, input), chips, h("div", { class: "controls" }, priorS, smoothT), rows, h("div", { class: "readout" }, sZ, sP), verdict);

    const MAXV = 3; // a bar at full width = log-odds of 3 (about 20 to 1)
    function row(label, v, note, cls = "") {
      const fin = Number.isFinite(v);
      const width = fin ? Math.min(Math.abs(v) / MAXV, 1) * 50 : 50;
      const fill = h("span", { class: "ev-fill " + (v > 0 ? "spam" : "ham"), style: { width: width + "%", [v > 0 ? "left" : "right"]: "50%" } });
      const val = fin ? (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) : v > 0 ? "+∞" : "−∞";
      return h("div", { class: "ev-row " + cls }, h("b", null, label), h("span", { class: "ev-track" }, v === 0 && !note ? null : fill), h("span", { class: "ev-val" }, note || val));
    }
    function draw() {
      const words = tokens(input.value).slice(0, 14);
      const zPrior = Math.log(prior / (1 - prior));
      rows.innerHTML = "";
      rows.append(h("div", { class: "ev-axis" }, h("span"), h("span", { class: "ev-ends" }, h("span", null, "← not spam"), h("span", null, "spam →")), h("span")));
      rows.append(row("prior", zPrior, null, "prior"));
      let z = zPrior;
      const seen = [];
      for (const w of words) {
        if (!vocab.includes(w)) {
          rows.append(row(w, 0, "never seen: skipped", "unknown"));
          continue;
        }
        const v = llr(w);
        seen.push([w, v]);
        z += v;
        rows.append(row(w, v));
      }
      const p = Number.isNaN(z) ? NaN : 1 / (1 + Math.exp(-z));
      sZ.set(Number.isNaN(z) ? "∞ − ∞" : Number.isFinite(z) ? (z >= 0 ? "+" : "−") + Math.abs(z).toFixed(2) : z > 0 ? "+∞" : "−∞");
      sP.set(Number.isNaN(p) ? "?" : `${(p * 100).toFixed(p > 0.995 || p < 0.005 ? 1 : 0)}<small>%</small>`, Number.isNaN(p) ? "stat" : p > 0.5 ? "stat bad" : "stat good");
      const inf = seen.filter(([, v]) => !Number.isFinite(v));
      verdict.textContent = !words.length
        ? "Type a message above."
        : Number.isNaN(z)
        ? `Broken: "${inf.find(([, v]) => v > 0)[0]}" never appeared in a normal message and "${inf.find(([, v]) => v < 0)[0]}" never appeared in spam, so each one alone forces a certain answer. Turn smoothing back on.`
        : inf.length
        ? `One unseen-in-a-class word ("${inf[0][0]}") overrules everything else. That's why every naive Bayes uses smoothing.`
        : !seen.length
        ? "None of these words is in the training messages, so only the prior speaks."
        : p > 0.5
        ? `Spam, ${p > 0.8 ? "and quite sure" : "but not by much"}: the evidence adds up to ${z.toFixed(2)}.`
        : `Not spam, ${p < 0.2 ? "and quite sure" : "but not by much"}: the evidence adds up to ${z.toFixed(2)}.`;
    }
    draw();
  }
})();

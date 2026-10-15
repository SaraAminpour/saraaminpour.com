/* qml-w4d5: the capstone. Three widgets: a study planner that turns a question into a study card and checks it
   against the tutorial's protocol; the constellation of every lesson (90 stars, takeaways from the build's
   takeaways.json); and the certificate, which unlocks when every lesson is marked done. */
(function () {
  const { h, ui } = QP;
  const C = QP.colors;
  QP.onReady(() => {
    planner();
    constellation();
    certificate();
  });

  // ================================================================ the study planner
  const QUESTIONS = [
    { k: "rare", q: "When one class is rare, does a quantum kernel find it better than an RBF kernel?", hyp: "No difference beyond the spread; weighting the rare class matters more than the kernel.", data: "digits", rare: true },
    { k: "reupload", q: "Does re-uploading help a quantum classifier on the circles, and does a classical surrogate keep up?", hyp: "Three uploads beat one, and a Fourier surrogate with the same frequencies matches the circuit.", data: "circles" },
    { k: "shots", q: "How many shots per kernel entry does a quantum kernel need before shot noise stops hurting accuracy?", hyp: "A few hundred shots per entry are enough on 2 qubits, but the number grows with the qubit count.", data: "moons" },
    { k: "noise", q: "Does gate noise hurt a quantum kernel or a variational classifier more?", hyp: "Noise shrinks both, but the classifier keeps its signs, so with exact readout it suffers less.", data: "moons" },
    { k: "adhoc", q: "Does the ad hoc dataset's quantum edge survive when 10% of the labels are flipped?", hyp: "The edge shrinks but survives with few training points.", data: "adhoc" },
    { k: "own", q: "", hyp: "", data: "moons" },
  ];
  const DATA = { moons: "two moons", circles: "circles", xor: "XOR", digits: "digits 3 versus 8", cancer: "breast cancer", iris: "iris (versicolor versus virginica)", adhoc: "the ad hoc dataset (QML week 4)", sensor: "quantum sensor data (QML week 4)" };
  const MODELS = [
    { k: "qk", label: "quantum kernel SVM", quantum: true },
    { k: "vqc", label: "variational quantum classifier", quantum: true },
    { k: "rbf", label: "RBF kernel SVM", classical: true },
    { k: "mlp", label: "small neural network", classical: true },
    { k: "sur", label: "Fourier surrogate", classical: true },
    { k: "lin", label: "logistic regression", classical: true },
  ];
  const PROTOCOL = [
    { k: "train", label: "preprocessing fitted on the training part only" },
    { k: "splits", label: "5 or more random splits" },
    { k: "tuned", label: "every model tuned the same way, by cross-validation" },
    { k: "once", label: "test set used once" },
    { k: "spread", label: "spread reported for every number" },
    { k: "cost", label: "cost reported: circuit runs and shots" },
  ];
  const METRICS = { acc: "accuracy", bal: "balanced accuracy", rec: "recall of the rare class", loss: "test cross-entropy" };
  const READOUT = { exact: "exact simulation", shots: "simulation with shots", noisy: "noisy simulation with shots", hw: "real hardware" };
  const KEY = "qp-capstone-plan";

  function planner() {
    const card = QP.widget("capstone", "Plan your mini-study", "a study card in five minutes");
    if (!card) return;
    let st;
    try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    st = Object.assign({ preset: "rare", q: QUESTIONS[0].q, hyp: QUESTIONS[0].hyp, data: "digits", models: ["qk", "rbf"], protocol: ["train", "splits"], metric: "acc", readout: "exact" }, st || {});
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } };

    const field = (label, el) => h("label", { class: "cp-field" }, h("span", { class: "cp-label" }, label), el);
    const sel = (opts, value, on) => {
      const s = h("select", { class: "cp-select", onchange: (e) => on(e.target.value) }, ...Object.entries(opts).map(([v, t]) => h("option", { value: v }, t)));
      s.value = value;
      return s;
    };
    const presetSel = sel(Object.fromEntries(QUESTIONS.map((x) => [x.k, x.k === "own" ? "my own question…" : x.q])), st.preset, (v) => {
      st.preset = v;
      const p = QUESTIONS.find((x) => x.k === v);
      if (v !== "own") { st.q = p.q; st.hyp = p.hyp; st.data = p.data; qT.value = st.q; hT.value = st.hyp; dataSel.value = st.data; }
      else { st.q = ""; st.hyp = ""; qT.value = ""; hT.value = ""; qT.focus(); }
      update();
    });
    const qT = h("textarea", { class: "cp-text", rows: 2, placeholder: "Your question, in one sentence", oninput: (e) => { st.q = e.target.value; update(); } });
    const hT = h("textarea", { class: "cp-text", rows: 2, placeholder: "What you expect, written before you run anything", oninput: (e) => { st.hyp = e.target.value; update(); } });
    qT.value = st.q;
    hT.value = st.hyp;
    const dataSel = sel(DATA, st.data, (v) => { st.data = v; update(); });
    const checks = (items, key) => h("div", { class: "cp-checks" }, ...items.map((it) => {
      const box = h("input", { type: "checkbox", onchange: (e) => { st[key] = e.target.checked ? [...new Set([...st[key], it.k])] : st[key].filter((x) => x !== it.k); update(); } });
      box.checked = st[key].includes(it.k);
      return h("label", { class: "cp-check" }, box, h("span", null, it.label));
    }));
    const metricSel = sel(METRICS, st.metric, (v) => { st.metric = v; update(); });
    const readSel = sel(READOUT, st.readout, (v) => { st.readout = v; update(); });
    const meter = h("div", { class: "cp-meter" }, h("i"));
    const verdicts = h("ul", { class: "cp-verdicts" });
    const out = h("pre", { class: "cp-card" });
    const copyB = ui.button("Copy the card", () => {
      const done = () => { copyB.textContent = "Copied!"; setTimeout(() => (copyB.textContent = "Copy the card"), 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(out.textContent).then(done, () => {});
    }, "btn qml small");
    card.body.append(
      h("div", { class: "cp-grid" },
        h("div", null,
          field("1 · Question", presetSel), qT,
          field("2 · Hypothesis", hT),
          field("3 · Data", dataSel),
          h("div", { class: "cp-label", style: { marginTop: "10px" } }, "4 · Models"), checks(MODELS, "models"),
          h("div", { class: "cp-label", style: { marginTop: "10px" } }, "5 · Protocol"), checks(PROTOCOL, "protocol"),
          field("6 · Metric", metricSel),
          field("7 · Readout", readSel)),
        h("div", null, h("div", { class: "cp-label" }, "Ready to run?"), meter, verdicts, h("div", { class: "cp-label", style: { marginTop: "10px" } }, "Your study card"), out, h("div", { class: "btn-row" }, copyB))));

    function update() {
      save();
      const chosen = MODELS.filter((m) => st.models.includes(m.k));
      const items = [];
      items.push(st.q.trim().length > 15 ? [true, "A question in one sentence."] : [false, "Write the question in one sentence."]);
      items.push(st.hyp.trim().length > 10 ? [true, "A hypothesis, written down before running anything."] : [false, "Write down what you expect before running anything."]);
      items.push(chosen.some((m) => m.quantum) ? [true, "At least one quantum model."] : [false, "Include at least one quantum model."]);
      items.push(chosen.some((m) => m.classical && m.k !== "lin") ? [true, "A strong classical baseline."] : [false, "Add a strong classical baseline: an RBF kernel SVM or a small network (QML weeks 2 and 3)."]);
      if (chosen.some((m) => m.k === "vqc") && !chosen.some((m) => m.k === "sur")) items.push([false, "A variational classifier invites a Fourier surrogate check (QML week 4)."]);
      const missing = PROTOCOL.filter((p) => !st.protocol.includes(p.k));
      items.push(missing.length ? [false, `Protocol: still missing "${missing.map((p) => p.label).join('", "')}".`] : [true, "The full protocol of QML week 2."]);
      const rare = st.preset === "rare" || /rare|imbalanc/i.test(st.q);
      if (rare) items.push(st.metric === "bal" || st.metric === "rec" ? [true, "A metric that sees the rare class."] : [false, "With a rare class, use balanced accuracy or rare recall: plain accuracy hides it (ML week 3)."]);
      if (st.readout === "exact") items.push([null, "Exact simulation is a fine start; add shots or noise before saying anything about hardware (QML weeks 3 and 4)."]);
      const scored = items.filter((x) => x[0] !== null);
      const score = scored.filter((x) => x[0]).length / scored.length;
      meter.firstChild.style.width = `${Math.round(100 * score)}%`;
      meter.firstChild.style.background = score === 1 ? C.ml : score > 0.6 ? C.rest : "#e5566b";
      verdicts.innerHTML = "";
      items.forEach(([ok, text]) => verdicts.append(h("li", { class: ok === null ? "note" : ok ? "ok" : "todo" }, text)));
      out.textContent = [
        `QUESTION     ${st.q || "…"}`,
        `HYPOTHESIS   ${st.hyp || "…"}`,
        `DATA         ${DATA[st.data]}`,
        `MODELS       ${chosen.map((m) => m.label).join(", ") || "…"}`,
        `PROTOCOL     ${st.protocol.length ? PROTOCOL.filter((p) => st.protocol.includes(p.k)).map((p) => p.label).join("; ") : "…"}`,
        `METRIC       ${METRICS[st.metric]}`,
        `READOUT      ${READOUT[st.readout]}`,
        `RESULT       (after running: key numbers with their spread)`,
        `VERDICT      (supported, partly supported, or not)`,
        `LIMITS       (what this study can't tell you)`,
        `NEXT STEP    (the experiment you'd run next)`,
      ].join("\n");
    }
    update();
  }

  // ================================================================ the constellation
  const CROSS = [
    ["ml-w1d1", "qml-w1d1"], ["qc-w1d1", "qml-w1d1"], ["qc-w2d1", "qml-w1d2"], ["qc-w2d4", "qml-w1d2"], ["ml-w6d3", "qml-w1d3"],
    ["qc-w4d4", "qml-w1d3"], ["ml-w4d1", "qml-w1d4"], ["qc-w4d2", "qml-w1d4"], ["qc-w3d3", "qml-w1d5"], ["qc-w6d3", "qml-w1d5"],
    ["ml-w4d3", "qml-w2d1"], ["ml-w4d4", "qml-w2d2"], ["ml-w4d2", "qml-w2d3"], ["ml-w1d4", "qml-w2d3"], ["ml-w4d5", "qml-w2d5"],
    ["ml-w1d5", "qml-w2d5"], ["qc-w7d1", "qml-w3d1"], ["ml-w2d2", "qml-w3d1"], ["qc-w7d3", "qml-w3d1"], ["qc-w4d5", "qml-w3d2"],
    ["ml-w3d2", "qml-w3d2"], ["qc-w1d5", "qml-w3d2"], ["ml-w2d3", "qml-w3d3"], ["ml-w5d3", "qml-w3d3"], ["ml-w2d4", "qml-w3d4"],
    ["ml-w5d2", "qml-w3d5"], ["qc-w6d1", "qml-w4d1"], ["qc-w6d5", "qml-w4d1"], ["qc-w7d5", "qml-w4d2"], ["qc-w6d3", "qml-w4d3"],
    ["qc-w3d5", "qml-w4d3"], ["ml-w3d3", "qml-w4d5"],
  ];
  const TRACK_RGB = { ml: [127, 224, 196], qc: [185, 167, 255], qml: [255, 181, 154] };
  const TRACK_NAME = { ml: "Machine Learning", qc: "Quantum Computing", qml: "Quantum ML" };

  function constellation() {
    const card = QP.widget("constellation", "Your constellation", "every lesson is a star");
    if (!card) return;
    const lessons = QP.catalog().filter((x) => x.kind === "lesson");
    const pos = {};
    for (const l of lessons) {
      const weeks = l.track === "qml" ? 4 : 7;
      const y = (l.track === "qml" ? 0.16 : 0.07) + ((l.track === "qml" ? 0.66 : 0.82) * (l.week - 1)) / (weeks - 1);
      const x0 = l.track === "ml" ? 0.05 : l.track === "qc" ? 0.71 : 0.38;
      const jitter = 0.012 * Math.sin(l.week * 7.3 + l.day * 3.1);
      pos[l.id] = [x0 + (0.24 * (l.day - 1)) / 4, y + ((l.day % 2 ? -1 : 1) * 0.022) + jitter];
    }
    const edges = [];
    for (const t of ["ml", "qc", "qml"]) {
      const ls = lessons.filter((l) => l.track === t);
      for (let i = 1; i < ls.length; i++) edges.push({ a: ls[i - 1].id, b: ls[i].id, cross: false });
    }
    CROSS.forEach(([a, b]) => edges.push({ a, b, cross: true }));
    const stage = h("div", { class: "widget-stage", style: { background: "radial-gradient(ellipse at 50% 30%, #2d2560, #15122b 70%)", border: "0" } });
    const cv = h("canvas", { style: { cursor: "pointer" } });
    stage.appendChild(cv);
    const info = h("div", { class: "callout tip", style: { marginTop: "12px" } }, h("img", { src: QP.icon("ui-star"), alt: "" }), h("div", { html: "<span class='title'>Tap any star</span>Each one is a lesson you walked through; the bright lines join ideas across the three tutorials." }));
    card.body.append(stage, info);
    let takeaways = {};
    fetch(QP.asset("data/takeaways.json")).then((r) => r.json()).then((d) => (takeaways = d)).catch(() => {});
    const done = () => QP.store.get().done;
    let selected = null, hover = null, W = 600, H = 480;
    const t0 = performance.now();
    function size() {
      const r = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(280, stage.clientWidth);
      H = Math.round(Math.max(440, Math.min(600, W * 0.78)));
      cv.width = W * r;
      cv.height = H * r;
      cv.style.height = H + "px";
      cv.getContext("2d").setTransform(r, 0, 0, r, 0, 0);
    }
    const P = (id) => [pos[id][0] * W, pos[id][1] * H];
    function draw(now) {
      const ctx = cv.getContext("2d");
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 80; i++) {
        const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * W, y = (Math.cos(i * 37.3) * 0.5 + 0.5) * H;
        ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.12 * Math.sin(t * 1.3 + i)})`;
        ctx.fillRect(x, y, 1.4, 1.4);
      }
      ctx.font = "800 11px Nunito, sans-serif";
      ctx.textAlign = "center";
      [["ml", 0.17], ["qml", 0.5], ["qc", 0.83]].forEach(([k, x]) => {
        ctx.fillStyle = `rgba(${TRACK_RGB[k].join(",")},0.8)`;
        ctx.fillText(TRACK_NAME[k].toUpperCase(), x * W, H - 10);
      });
      const grow = QP.reduceMotion ? 1 : Math.min(1, t / 3);
      edges.forEach((e, k) => {
        if (!pos[e.a] || !pos[e.b]) return;
        const f = Math.max(0, Math.min(1, grow * edges.length * 0.5 - k * 0.35));
        if (f <= 0) return;
        const [x1, y1] = P(e.a), [x2, y2] = P(e.b);
        const lit = selected && (e.a === selected || e.b === selected);
        ctx.strokeStyle = lit ? "rgba(255,214,107,.95)" : e.cross ? "rgba(255,190,220,.32)" : "rgba(220,210,255,.14)";
        ctx.lineWidth = lit ? 2.4 : e.cross ? 1.3 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f);
        ctx.stroke();
      });
      const d = done();
      for (const l of lessons) {
        const [x, y] = P(l.id);
        const rgb = TRACK_RGB[l.track];
        const isDone = Boolean(d[l.id]);
        const tw = 0.75 + 0.25 * Math.sin(t * 2 + x * 0.05 + y * 0.03);
        const R = (isDone ? 6 : 4.2) * (l.id === selected || l.id === hover ? 1.4 : 1);
        const g = ctx.createRadialGradient(x, y, 0, x, y, R * 4);
        g.addColorStop(0, `rgba(${rgb.join(",")},${(isDone ? 0.75 : 0.3) * tw})`);
        g.addColorStop(1, `rgba(${rgb.join(",")},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isDone ? "#fff" : `rgba(${rgb.join(",")},0.9)`;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const rr = k % 2 ? R * 0.45 : R;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        if (l.id === selected || l.id === hover) {
          ctx.font = "700 11px Nunito, sans-serif";
          ctx.fillStyle = "#ffd66b";
          const right = pos[l.id][0] > 0.6;
          ctx.textAlign = right ? "right" : "left";
          ctx.fillText(l.short, x + (right ? -12 : 12), y + 4);
        }
      }
    }
    let raf = null, visible = true;
    const loop = (now) => {
      draw(now);
      raf = visible && !QP.reduceMotion ? requestAnimationFrame(loop) : null;
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => {
        visible = en[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(stage);
    }
    const pick = (e) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 16;
      for (const l of lessons) {
        const [sx, sy] = P(l.id);
        const dd = Math.hypot(sx - x, sy - y);
        if (dd < bd) { bd = dd; best = l; }
      }
      return best;
    };
    cv.addEventListener("pointermove", (e) => { const b = pick(e); hover = b ? b.id : null; cv.style.cursor = b ? "pointer" : "default"; if (QP.reduceMotion) draw(performance.now()); });
    cv.addEventListener("click", (e) => {
      const b = pick(e);
      if (!b) return;
      selected = b.id;
      const links = edges.filter((x) => x.cross && (x.a === b.id || x.b === b.id)).map((x) => QP.find(x.a === b.id ? x.b : x.a)).filter(Boolean);
      info.innerHTML = "";
      info.append(h("img", { src: QP.icon(b.icon), alt: "" }), h("div", { html: `<span class="title">${TRACK_NAME[b.track]} · week ${b.week} · ${b.title}</span>${takeaways[b.id] || ""}${links.length ? `<br><span class="small muted">Connects to: ${links.map((l) => l.short).join(", ")}.</span>` : ""} <a href="${QP.href(b)}">Open this lesson</a>` }));
      if (QP.reduceMotion) draw(performance.now());
    });
    if ("ResizeObserver" in window) new ResizeObserver(() => { size(); draw(performance.now()); }).observe(stage);
    size();
    raf = requestAnimationFrame(loop);
  }

  // ================================================================ the certificate
  function certificate() {
    const host = document.querySelector('[data-widget="certificate"]');
    if (!host) return;
    const box = h("div", { style: { marginTop: "22px" } });
    host.replaceWith(box);
    let celebrated = false;
    function render() {
      const ids = QP.lessonIds();
      const n = QP.store.doneCount(ids);
      const count = (t) => QP.lessonIds(t).length;
      box.innerHTML = "";
      if (n < ids.length) {
        box.append(h("div", { class: "card flat center", style: { padding: "22px" } },
          h("img", { src: QP.qubi("think"), width: 80, height: 80, alt: "", style: { margin: "0 auto 8px" } }),
          h("div", { style: { fontFamily: "Fredoka, sans-serif", fontWeight: 600, fontSize: "1.15rem" } }, "Your certificate is waiting"),
          h("p", { class: "muted mb0" }, `${n} of ${ids.length} lessons finished. Mark every lesson of the three tutorials done, including this one, to unlock it.`)));
        return;
      }
      const s = QP.store.get();
      const when = new Date(s.done["qml-w4d5"] || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      box.append(h("div", { style: { position: "relative", borderRadius: "28px", padding: "4px", background: "conic-gradient(from 0deg, #b9a7ff, #ff8fb8, #ffb59a, #ffd66b, #7fe0c4, #7cc4ff, #b9a7ff)" } },
        h("div", { class: "center", style: { background: "#fffdf9", borderRadius: "24px", padding: "28px 22px" } },
          h("img", { src: QP.qubi("cheer"), width: 110, height: 110, alt: "", style: { margin: "0 auto 6px" } }),
          h("div", { class: "kbd-hint", style: { letterSpacing: ".18em", textTransform: "uppercase" } }, "Certificate of completion"),
          h("div", { style: { fontFamily: "Fredoka, sans-serif", fontWeight: 600, fontSize: "2.2rem", margin: "6px 0" } }, QP.config.learner),
          h("p", { style: { maxWidth: "540px", margin: "0 auto 10px", color: "var(--ink-2)" } }, `walked the whole Quantum Path: ${ids.length} lessons of machine learning, quantum computing and quantum machine learning, from a first classifier to a quantum mini-study.`),
          h("div", { class: "tracks-legend", style: { justifyContent: "center" } }, h("span", { class: "chip ml" }, `${count("ml")} machine learning`), h("span", { class: "chip qc" }, `${count("qc")} quantum computing`), h("span", { class: "chip qml" }, `${count("qml")} quantum ML`)),
          h("p", { class: "small muted", style: { marginTop: "12px" } }, `INQUIRE Lab · completed ${when}`))));
      if (!celebrated && !QP.reduceMotion) {
        celebrated = true;
        setTimeout(() => QP.confettiAt(box, 220), 300);
      }
    }
    document.addEventListener("qp:progress", render);
    render();
  }
})();

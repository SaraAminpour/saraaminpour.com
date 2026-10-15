/* w6d1: the cookie-jar bandit. Play by hand, or watch an ε-greedy robot. */
(function () {
  const { h, ui } = QP;
  QP.onReady(() => widget());

  function widget() {
    const card = QP.widget("bandit", "The cookie jars", "click a jar to open it");
    if (!card) return;
    const C = QP.colors;
    const JAR_COL = ["#b9a7ff", "#7fe0c4", "#ffb59a", "#7cc4ff"];
    const rng = QP.rng((Math.random() * 2147483647) | 0);
    let chances, Q, N, total, turns, history, reveal = false, eps = 0.1, robot = null;

    const row = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "12px", alignItems: "end" } });
    const jars = [0, 1, 2, 3].map((i) => {
      const lid = `<rect class="lid" x="22" y="18" width="56" height="14" rx="5" fill="#fff" stroke="#2c2842" stroke-width="2.5" style="transition:transform .25s cubic-bezier(.34,1.56,.64,1);transform-origin:50px 25px"/>`;
      const svg = `<svg viewBox="0 0 100 120" style="width:100%;max-width:120px;display:block;margin:0 auto;overflow:visible"><defs><linearGradient id="jg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${JAR_COL[i]}"/></linearGradient></defs>
        <ellipse cx="50" cy="114" rx="34" ry="5" fill="#2c2842" opacity=".08"/>
        <rect x="16" y="30" width="68" height="82" rx="20" fill="url(#jg${i})" stroke="#2c2842" stroke-width="2.5"/>
        <rect x="26" y="40" width="10" height="56" rx="5" fill="#fff" opacity=".55"/>
        ${lid}
        <text x="50" y="82" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="26" font-weight="600" fill="#2c2842">${"ABCD"[i]}</text>
        <g class="cookie" opacity="0"><circle cx="50" cy="20" r="13" fill="#f5b938" stroke="#2c2842" stroke-width="2"/><circle cx="45" cy="16" r="2" fill="#7a4b12"/><circle cx="54" cy="22" r="2" fill="#7a4b12"/><circle cx="51" cy="13" r="1.6" fill="#7a4b12"/></g></svg>`;
      const btn = h("button", { type: "button", class: "jar", style: { border: 0, background: "transparent", cursor: "pointer", padding: "6px", borderRadius: "18px", transition: "background .2s" }, html: svg, "aria-label": `Open jar ${"ABCD"[i]}` });
      btn.addEventListener("click", () => { if (!robot) open(i, true); });
      const est = h("div", { style: { height: "8px", borderRadius: "999px", background: "rgba(123,92,250,.1)", overflow: "hidden", margin: "6px 4px 2px" } }, h("div", { style: { height: "100%", width: "0%", background: JAR_COL[i], transition: "width .3s" } }));
      const txt = h("div", { class: "small center", style: { fontWeight: 800, color: C.ink2, lineHeight: 1.3 } });
      const truth = h("div", { class: "small center", style: { fontWeight: 800, color: C.qml, minHeight: "1.3em" } });
      row.appendChild(h("div", null, truth, btn, est, txt));
      return { btn, est: est.firstChild, txt, truth, svg: () => btn.querySelector("svg") };
    });
    const sTot = ui.stat("good cookies", "0"), sTurns = ui.stat("jars opened", "0"), sAvg = ui.stat("average reward", "–");
    const epsS = ui.slider({ label: "robot's ε", min: 0, max: 0.6, step: 0.01, value: eps, fmt: (v) => v.toFixed(2), oninput: (v) => (eps = v) });
    const runB = ui.button("Let the robot open 300 jars", () => runRobot(), "btn ml small");
    const newB = ui.button("New jars", () => newJars(), "btn soft small");
    const revT = ui.toggle({ label: "reveal the true chances", checked: false, onchange: (v) => { reveal = v; paint(); } });
    const chart = QP.chart(null, { xlim: [0, 300], ylim: [0, 1], aspect: 0.28, minH: 140, maxH: 180, xlabel: "jars opened", ylabel: "avg reward", ystep: 0.25 });
    card.body.append(row, h("div", { class: "readout" }, sTot, sTurns, sAvg), h("div", { class: "controls" }, epsS, runB), h("div", { class: "controls" }, newB, revT), chart.stage, chart.legendEl);
    chart.resize();

    function newJars() {
      if (robot) return;
      const base = QP.rng((Math.random() * 1e9) | 0).shuffle([0.25, 0.45, 0.55, 0.78]);
      chances = base.map((p) => Math.min(0.95, Math.max(0.05, p + (rng() - 0.5) * 0.08)));
      Q = [0, 0, 0, 0];
      N = [0, 0, 0, 0];
      total = 0;
      turns = 0;
      history = [];
      paint();
    }
    function open(i, animate) {
      const r = rng() < chances[i] ? 1 : 0;
      N[i]++;
      Q[i] += (r - Q[i]) / N[i];
      total += r;
      turns++;
      history.push(total / turns);
      if (animate) pop(i, r);
      paint();
      return r;
    }
    function pop(i, r) {
      const svg = jars[i].svg();
      const lid = svg.querySelector(".lid");
      const cookie = svg.querySelector(".cookie");
      lid.style.transform = "translateY(-10px) rotate(-14deg)";
      cookie.querySelector("circle").setAttribute("fill", r ? "#f5b938" : "#6b4a3a");
      cookie.animate([{ opacity: 0, transform: "translateY(10px) scale(.6)" }, { opacity: 1, transform: "translateY(-18px) scale(1.15)" }, { opacity: 0, transform: "translateY(-46px) scale(1)" }], { duration: 750, easing: "ease-out" });
      setTimeout(() => (lid.style.transform = ""), 380);
      if (r) QP.confettiAt(jars[i].btn, 14);
    }
    function paint() {
      jars.forEach((j, i) => {
        j.est.style.width = (Q[i] * 100).toFixed(0) + "%";
        j.txt.innerHTML = N[i] ? `estimate ${Q[i].toFixed(2)}<br><span style="font-weight:700;color:${C.ink3}">opened ${N[i]}×</span>` : `<span style="color:${C.ink3}">not opened yet</span>`;
        j.truth.textContent = reveal ? `true chance ${chances[i].toFixed(2)}` : "";
      });
      sTot.set(String(total));
      sTurns.set(String(turns));
      sAvg.set(turns ? (total / turns).toFixed(3) : "–");
      const best = Math.max(...chances);
      chart.o.xlim = [0, Math.max(300, history.length)];
      chart.draw([
        { x: [0, Math.max(300, history.length)], y: [best, best], color: C.ink3, dash: [6, 6], width: 2, name: "best jar every time" },
        { x: history.map((_, k) => k + 1), y: history, color: C.qml, width: 3, name: "your average so far" },
      ]);
    }
    function runRobot() {
      if (robot) return;
      let k = 0;
      runB.disabled = true;
      robot = QP.loop(() => {
        for (let s = 0; s < 3; s++) {
          let i;
          if (rng() < eps) i = Math.floor(rng() * 4);
          else {
            const m = Math.max(...Q);
            const ties = [0, 1, 2, 3].filter((a) => Q[a] === m);
            i = ties[0];
          }
          jars.forEach((j, a) => (j.btn.style.background = a === i ? "rgba(255,214,107,.35)" : "transparent"));
          open(i, s === 0 && k % 6 === 0);
          k++;
        }
        if (k >= 300) {
          robot = null;
          runB.disabled = false;
          jars.forEach((j) => (j.btn.style.background = "transparent"));
          return false;
        }
      });
    }
    chart.onresize = paint;
    newJars();
  }
})();

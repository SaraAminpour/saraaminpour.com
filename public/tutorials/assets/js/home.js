/* Home pages: the hub (three tutorials, today's two lessons) and each tutorial's journey map. */
(function () {
  const { $, $$, h } = QP;
  const page = document.body.dataset.page;
  // the public edition on sara-aminpour.com (tools/publish_public.sh) has no calendar: no dates, nothing "due"
  const PUBLIC = Boolean(QP.config.public);
  const TIPS = [
    "Ten focused minutes beat an hour of half-attention.",
    "Say the lesson's idea out loud in one sentence. If you can, you've got it.",
    "In Jupyter, Shift+Enter runs a cell and jumps to the next one.",
    "If a notebook acts strange, use Kernel → Restart Kernel and Run All Cells.",
    "Read an error from the bottom up: the last line says what went wrong.",
    "Change one number in the code and predict what happens before you run it.",
    "Missed a day? Just continue. The streak forgives weekends, and Thanksgiving week is spare time.",
    "Drawing a picture of the idea, even a messy one, makes it stick.",
    "Machine learning and quantum computing meet in January. Every lesson now is a piece of that puzzle.",
    "Stuck on an exercise for more than five minutes? Peek at the hint, then try again.",
  ].filter((t) => !PUBLIC || !/Thanksgiving|January/.test(t));

  QP.onReady(() => {
    render();
    document.addEventListener("qp:progress", render);
    drawTrails();
    let t;
    addEventListener("resize", () => { clearTimeout(t); t = setTimeout(drawTrails, 120); });
    // Portal cards and crumbs link to <tutorial>/index.html#week-N. The browser's own jump measures the
    // week while it is still slid down for its entrance, so land again from its layout position.
    const week = /^#week-\d+$/.test(location.hash) && document.getElementById(location.hash.slice(1));
    if (week) {
      const land = () => {
        let y = 0;
        for (let e = week; e; e = e.offsetParent) y += e.offsetTop;
        scrollTo({ top: y - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop || 0), behavior: "instant" });
      };
      if (document.readyState === "complete") requestAnimationFrame(land);
      else addEventListener("load", () => requestAnimationFrame(land), { once: true });
    }
  });

  function setRing(el, done, total) {
    if (!el) return;
    const arc = $(".arc", el);
    if (arc) arc.style.strokeDashoffset = String(Number(arc.dataset.c) * (1 - done / Math.max(1, total)));
    const num = $(".num", el);
    if (num) num.textContent = done;
  }

  function stats(track) {
    const s = QP.store.get();
    const ids = QP.lessonIds(track);
    return { s, ids, done: ids.filter((id) => s.done[id]).length };
  }

  function render() {
    if (page === "hub") renderHub();
    else if (page === "track") renderTrack(document.body.dataset.track);
    const s = QP.store.get();
    const tip = $("#tip-text");
    if (tip) tip.textContent = TIPS[(new Date().getDate() + Object.keys(s.done).length) % TIPS.length];
    $$(".node").forEach((n) => {
      const id = n.dataset.id;
      n.classList.toggle("done", Boolean(s.done[id]));
    });
  }

  // ------------------------------------------------------------------ hub
  function renderHub() {
    const all = stats();
    const today = QP.dayKey();
    const hr = new Date().getHours();
    const part = hr < 5 ? "Hello" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    $("#hello").textContent = QP.config.learner ? `${part}, ${QP.config.learner}!` : `${part}!`;
    const ml = stats("ml"), qc = stats("qc"), qml = stats("qml");
    if (all.done === all.ids.length) {
      $("#hello-sub").textContent = PUBLIC ? "You finished all three tutorials. Congratulations!" : "You finished all three tutorials. Time for research with Sara!";
      $("#hello-qubi").src = QP.qubi("cheer");
    } else if (ml.done === ml.ids.length && qc.done === qc.ids.length) {
      $("#hello-sub").textContent = "Both tutorials done. Quantum Machine Learning is unlocked!";
      $("#hello-qubi").src = QP.qubi("wow");
    } else if (all.done > 0) {
      $("#hello-sub").textContent = `${all.done} lesson${all.done === 1 ? "" : "s"} done so far. Little and often is the whole trick.`;
    }
    for (const t of ["ml", "qc", "qml"]) {
      const st = stats(t);
      setRing($(`#ring-${t}`), st.done, st.ids.length);
      const card = $(`.tut-card[data-track="${t}"]`);
      if (card) {
        $(".tut-bar span", card).style.width = (100 * st.done / st.ids.length).toFixed(1) + "%";
        const next = QP.nextUp(t);
        const tr = QP.track(t);
        const now = $(".tut-now", card);
        if (!next) now.textContent = "All done!";
        else if (st.done) now.textContent = `Week ${next.week} · ${tr.weeks.find((w) => w.n === next.week).title}`;
        $(".btn", card).firstChild.textContent = st.done ? (next ? "Continue " : "Review ") : "Open ";
      }
    }
    const qmlCard = $('.tut-card[data-track="qml"]');
    if (qmlCard) qmlCard.classList.toggle("unlocked", ml.done === ml.ids.length && qc.done === qc.ids.length);

    // today: the next ML and QC lessons
    const status = $("#today-status");
    const msgs = [];
    for (const t of ["ml", "qc"]) {
      const row = $(`#today-${t}`);
      const next = QP.nextUp(t);
      if (!row) continue;
      if (!next) {
        row.classList.add("finished");
        $("b", row).textContent = "Tutorial complete!";
        $("em", row).textContent = "Revisit any lesson from its journey map";
        $(".go", row).textContent = "Map";
        row.href = QP.base + t + "/index.html";
        continue;
      }
      $("img", row).src = QP.icon(next.icon);
      $("b", row).textContent = next.title;
      $("em", row).textContent = `Week ${next.week} · Day ${next.day}${PUBLIC ? "" : " · " + QP.fmtDay(next.date)} · about ${next.minutes} min`;
      $(".go", row).textContent = stats(t).done ? "Continue" : "Start";
      row.href = QP.href(next);
      const due = QP.catalog().filter((x) => x.kind === "lesson" && x.ready !== false && x.track === t && x.date <= today && !all.s.done[x.id]).length;
      msgs.push(due);
    }
    const first = QP.catalog().find((x) => x.kind === "lesson" && !x.suggested);
    const due = msgs.reduce((a, b) => a + b, 0);
    if (!status) return;
    if (PUBLIC) status.textContent = all.done ? "Your progress is saved in this browser." : "Start anywhere. Your progress is saved in this browser.";
    else if (first && today < first.date) status.textContent = `Both tutorials start on ${QP.fmtDay(first.date)}. You can peek early!`;
    else if (due === 0) status.textContent = "You're up to date. Lovely!";
    else if (due <= 2) status.textContent = "Right on schedule.";
    else status.textContent = `${due} lessons waiting. No stress: Thanksgiving week is there to catch up.`;
  }

  // ------------------------------------------------------------------ one tutorial
  function renderTrack(track) {
    const st = stats(track);
    const tr = QP.track(track);
    const next = QP.nextUp(track);
    const today = QP.dayKey();
    setRing($("#ring-track"), st.done, st.ids.length);
    const go = $("#today-go");
    if (next) {
      $("#today-icon").src = QP.icon(next.icon);
      $("#today-title").textContent = next.title;
      $("#today-sub").textContent = `Week ${next.week} · Day ${next.day}${tr.suggested || PUBLIC ? "" : " · " + QP.fmtDay(next.date)} · about ${next.minutes} min`;
      go.href = QP.href(next);
      go.firstChild.textContent = st.done ? "Continue " : "Start ";
      const due = QP.catalog().filter((x) => x.kind === "lesson" && x.ready !== false && x.track === track && x.date <= today && !st.s.done[x.id]).length;
      const status = $("#today-status");
      if (PUBLIC && !tr.suggested) status.textContent = st.done ? `${st.done} of ${st.ids.length} lessons done. Little and often is the whole trick.` : "Your progress is saved in this browser.";
      else if (tr.suggested) {
        const ml = stats("ml"), qc = stats("qc");
        status.textContent = ml.done === ml.ids.length && qc.done === qc.ids.length ? "Both tutorials done: you're ready for this one!" : `Before this: Machine Learning ${ml.done}/${ml.ids.length}, Quantum Computing ${qc.done}/${qc.ids.length}.`;
      } else if (today < QP.catalog().find((x) => x.track === track).date) status.textContent = `This tutorial starts on ${QP.fmtDay(QP.catalog().find((x) => x.track === track).date)}. You can peek early!`;
      else if (due === 0 && next.date > today) status.textContent = "You're ahead of schedule. Lovely!";
      else if (due <= 1) status.textContent = "Right on schedule.";
      else status.textContent = `${due} lessons waiting. No stress: Thanksgiving week is there to catch up.`;
    } else if (!anyReadyLesson(track)) {
      $("#today-sub").textContent = "Coming soon: the lessons are being written.";
      go.href = "#week-1";
      go.firstChild.textContent = "Look at the plan ";
    } else {
      $("#today-title").textContent = "All done!";
      $("#today-sub").textContent = "Revisit any lesson from the map below.";
      go.href = "#week-1";
      go.firstChild.textContent = "Review ";
    }
    // this week's dots
    const anyReady = QP.catalog().some((x) => x.track === track && x.kind === "lesson" && x.ready !== false);
    const wkN = next ? next.week : anyReady ? tr.weeks.length : 1;
    const items = QP.catalog().filter((x) => x.track === track && x.week === wkN);
    const dots = $("#week-dots");
    if (dots) {
      dots.innerHTML = "";
      items.forEach((x) => {
        const cls = "wd" + (st.s.done[x.id] ? " done" : "") + (next && next.id === x.id ? " cur" : "") + (x.kind === "flashback" ? " rest" : "") + (x.ready === false ? " soon" : "");
        dots.appendChild(x.ready === false
          ? h("span", { class: cls, title: x.title + " (coming soon)" }, h("img", { src: QP.icon(x.icon), alt: x.title }))
          : h("a", { class: cls, href: QP.href(x), title: x.title }, h("img", { src: QP.icon(x.icon), alt: x.title })));
      });
      const n = items.filter((x) => x.kind === "lesson" && st.s.done[x.id]).length;
      $("#wd-label").textContent = `Week ${wkN}: ${n} of ${items.filter((x) => x.kind === "lesson").length} lessons`;
    }
    $$(".node").forEach((n) => n.classList.toggle("current", Boolean(next && next.id === n.dataset.id)));
  }

  function anyReadyLesson(track) {
    return QP.catalog().some((x) => x.track === track && x.kind === "lesson" && x.ready !== false);
  }

  // soft dashed trail through the nodes of each week
  function drawTrails() {
    $$(".path").forEach((path) => {
      const svg = path.querySelector("svg.trail");
      const box = path.getBoundingClientRect();
      const pts = $$(".node .orb", path).map((o) => {
        const r = o.getBoundingClientRect();
        return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
      });
      if (pts.length < 2) return;
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
      }
      const track = document.body.dataset.track || "qc";
      const stops = { ml: ["#a4eed9", "#17a98c", "#7cc4ff"], qc: ["#cdbfff", "#7b5cfa", "#ff8fb8"], qml: ["#ffb59a", "#ff7a59", "#b9a7ff"] }[track] || ["#7fe0c4", "#b9a7ff", "#ff8fb8"];
      const gid = "tg-" + path.parentElement.id;
      svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      svg.innerHTML = `<defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".5" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient></defs><path d="${d}" fill="none" stroke="url(#${gid})" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 12" opacity=".9"/>`;
    });
  }
})();

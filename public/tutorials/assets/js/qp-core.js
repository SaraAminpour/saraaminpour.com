/* Quantum Path core: progress, page behavior, quizzes, little celebrations.
   Everything is local to the browser; nothing is sent anywhere. */
(function () {
  "use strict";
  const QP = (window.QP = window.QP || {});

  QP.config = Object.assign(
    {
      learner: "",
      storageKey: "qpath:v1",
      // Base URL of the learner's JupyterLab, e.g. "https://<host>/lab/tree/quantum-path/".
      // Empty means "not connected yet": notebook buttons fall back to downloads.
      labUrl: "",
    },
    window.QP_CONFIG || {}
  );

  const root = document.documentElement;
  QP.base = root.dataset.base || "./";
  QP.asset = (p) => QP.base + "assets/" + p;
  QP.icon = (name) => QP.asset("icons/" + name + ".svg");
  QP.qubi = (pose) => QP.asset("img/qubi-" + pose + ".svg");

  // ------------------------------------------------------------ DOM helpers
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "html") el.innerHTML = v;
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  QP.$ = $;
  QP.$$ = $$;
  QP.h = h;

  // ------------------------------------------------------------ dates
  const pad2 = (n) => String(n).padStart(2, "0");
  QP.dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  QP.parseDay = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  QP.fmtDay = (s, opts = { weekday: "short", month: "short", day: "numeric" }) =>
    QP.parseDay(s).toLocaleDateString("en-US", opts);

  // ------------------------------------------------------------ progress store
  const KEY = QP.config.storageKey;
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      s.done = s.done || {};
      s.quiz = s.quiz || {};
      s.days = s.days || {};
      return s;
    } catch (e) {
      return { done: {}, quiz: {}, days: {} };
    }
  }
  function save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      /* private mode: progress lives for this visit only */
    }
    // runner.js saves it to her account on the lab server too
    document.dispatchEvent(new CustomEvent("qp:saved"));
  }
  QP.store = {
    get() {
      return load();
    },
    isDone(id) {
      return Boolean(load().done[id]);
    },
    markDone(id) {
      const s = load();
      if (!s.done[id]) s.done[id] = new Date().toISOString();
      s.days[QP.dayKey()] = (s.days[QP.dayKey()] || 0) + 1;
      save(s);
      document.dispatchEvent(new CustomEvent("qp:progress"));
    },
    unmark(id) {
      const s = load();
      delete s.done[id];
      // remembered, so the untick wins over the older tick saved on the server and her other devices
      s.undone = s.undone || {};
      s.undone[id] = new Date().toISOString();
      save(s);
      document.dispatchEvent(new CustomEvent("qp:progress"));
    },
    recordQuiz(lesson, qid, firstTry) {
      const s = load();
      s.quiz[lesson] = s.quiz[lesson] || {};
      if (!(qid in s.quiz[lesson])) s.quiz[lesson][qid] = firstTry;
      save(s);
    },
    touch() {
      const s = load();
      s.lastVisit = new Date().toISOString();
      save(s);
    },
    doneCount(ids) {
      const d = load().done;
      return (ids || Object.keys(d)).filter((id) => d[id]).length;
    },
    /** Consecutive study days with a finished lesson. Weekends never break it. */
    streak() {
      const s = load();
      const active = new Set(Object.values(s.done).map((iso) => QP.dayKey(new Date(iso))));
      Object.keys(s.days).forEach((k) => active.add(k));
      let d = new Date();
      let count = 0;
      if (!active.has(QP.dayKey(d))) d.setDate(d.getDate() - 1);
      for (let i = 0; i < 400; i++) {
        const k = QP.dayKey(d);
        const wd = d.getDay();
        if (active.has(k)) count++;
        else if (wd !== 0 && wd !== 6) break;
        d.setDate(d.getDate() - 1);
      }
      return count;
    },
    exportCode() {
      return btoa(unescape(encodeURIComponent(JSON.stringify(load()))));
    },
    importCode(code) {
      const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (!s || typeof s !== "object" || !s.done) throw new Error("That code does not look right.");
      save(s);
      document.dispatchEvent(new CustomEvent("qp:progress"));
    },
  };

  // ------------------------------------------------------------ catalog helpers
  QP.catalog = () => window.QP_CATALOG || [];
  QP.tracks = () => window.QP_TRACKS || [];
  QP.track = (id) => QP.tracks().find((t) => t.id === id);
  QP.lessonIds = (track) => QP.catalog().filter((x) => x.kind === "lesson" && (!track || x.track === track)).map((x) => x.id);
  QP.find = (id) => QP.catalog().find((x) => x.id === id);
  /** The first unfinished lesson, in one tutorial or in all of them. */
  QP.nextUp = (track) => {
    const done = load().done;
    return QP.catalog().find((x) => x.kind === "lesson" && x.ready !== false && (!track || x.track === track) && !done[x.id]) || null;
  };
  QP.href = (item) => QP.base + item.path;

  // ------------------------------------------------------------ toast
  let toastTimer = null;
  QP.toast = function (msg, icon = "ui-sparkle") {
    let t = $(".toast");
    if (!t) {
      t = h("div", { class: "toast", role: "status", "aria-live": "polite" });
      document.body.appendChild(t);
    }
    t.innerHTML = "";
    t.appendChild(h("img", { src: QP.icon(icon), alt: "" }));
    t.appendChild(h("span", null, msg));
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  };

  // ------------------------------------------------------------ confetti
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  QP.reduceMotion = reduceMotion;
  QP.confetti = function (x, y, n = 140) {
    if (reduceMotion) return;
    let c = $("#confetti");
    if (!c) {
      c = h("canvas", { id: "confetti", "aria-hidden": "true" });
      document.body.appendChild(c);
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#b9a7ff", "#ff8fb8", "#ffd66b", "#7fe0c4", "#7cc4ff", "#ffb59a", "#7b5cfa"];
    x = x == null ? innerWidth / 2 : x;
    y = y == null ? innerHeight / 2 : y;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 9;
      parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 6,
        r: 3 + Math.random() * 5,
        c: colors[i % colors.length],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        shape: i % 3,
        life: 1,
      });
    }
    let frame = 0;
    (function tick() {
      frame++;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for (const p of parts) {
        p.vy += 0.28;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.009;
        if (p.life <= 0 || p.y > innerHeight + 20) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        if (p.shape === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 1) {
          ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        } else {
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const ang = (k * Math.PI) / 2;
            ctx.quadraticCurveTo(0, 0, Math.cos(ang) * p.r * 1.6, Math.sin(ang) * p.r * 1.6);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive && frame < 400) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })();
  };
  QP.confettiAt = (el, n) => {
    const r = el.getBoundingClientRect();
    QP.confetti(r.left + r.width / 2, r.top + r.height / 2, n);
  };

  // ------------------------------------------------------------ reveal on scroll
  function setupReveal() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    els.forEach((e) => io.observe(e));
  }

  // ------------------------------------------------------------ nav
  function setupNav() {
    const toggle = $(".nav-toggle");
    const links = $(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", () => {
        links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", links.classList.contains("open"));
      });
    }
    updateNavStats();
    document.addEventListener("qp:progress", updateNavStats);
  }
  function updateNavStats() {
    const ids = QP.lessonIds();
    const s = $("#nav-streak");
    if (s) s.textContent = QP.store.streak();
    const p = $("#nav-progress");
    if (p) p.textContent = `${QP.store.doneCount(ids)}/${ids.length}`;
  }

  // ------------------------------------------------------------ lesson page
  function setupSteps() {
    const steps = $$(".step[id]");
    const rail = $$(".step-rail a");
    if (!steps.length) return;
    const byId = new Map(rail.map((a) => [a.getAttribute("href").slice(1), a]));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            const a = byId.get(en.target.id);
            if (!a) return;
            rail.forEach((x) => x.classList.remove("active"));
            a.classList.add("active", "seen");
            let seen = true;
            rail.forEach((x) => {
              if (x === a) seen = false;
              else if (seen) x.classList.add("seen");
            });
          });
        },
        { rootMargin: "-35% 0px -55% 0px" }
      );
      steps.forEach((s) => io.observe(s));
    }
    const bar = $(".mobile-progress span");
    if (bar) {
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
      };
      addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  // After finishing a lesson, offer the other tutorial's lesson for the same day if it is still open.
  function alsoToday(box) {
    const slot = $(".also-today", box);
    if (!slot || slot.dataset.filled) return;
    const s = load();
    const other = QP.catalog().find((x) => x.kind === "lesson" && x.ready !== false && x.date === slot.dataset.date && x.track !== slot.dataset.track && !s.done[x.id]);
    if (!other) return;
    slot.dataset.filled = "1";
    const t = QP.track(other.track);
    slot.appendChild(h("a", { class: "next-card also " + other.track, href: QP.href(other) },
      h("img", { src: QP.icon(other.icon), alt: "" }),
      h("span", null, h("small", null, `Also today in ${t ? t.name : other.track}`), h("span", { class: "t" }, other.title))));
  }

  function setupDone() {
    const box = $(".done-box");
    if (!box) return;
    const id = box.dataset.lesson;
    const btn = $(".btn-done", box);
    const label = $(".label", btn);
    const sync = () => {
      const done = QP.store.isDone(id);
      box.classList.toggle("is-done", done);
      label.textContent = done ? "Finished! Lovely work" : box.dataset.cta || "I finished this lesson";
      if (done) alsoToday(box);
    };
    btn.addEventListener("click", () => {
      if (QP.store.isDone(id)) {
        QP.toast("Already done. Nice work!", "ui-star");
        return;
      }
      QP.store.markDone(id);
      sync();
      QP.confettiAt(btn, 180);
      setTimeout(() => QP.confetti(innerWidth * 0.2, innerHeight * 0.4, 60), 250);
      setTimeout(() => QP.confetti(innerWidth * 0.8, innerHeight * 0.4, 60), 420);
      const streak = QP.store.streak();
      QP.toast(streak > 1 ? `Lesson done! ${streak}-day streak` : "Lesson done! Streak started", "ui-flame");
    });
    const undo = $(".undo-done", box);
    if (undo)
      undo.addEventListener("click", (e) => {
        e.preventDefault();
        QP.store.unmark(id);
        sync();
      });
    document.addEventListener("qp:progress", sync);
    sync();
  }

  // ------------------------------------------------------------ quizzes
  function setupQuizzes() {
    $$(".q[data-answer]").forEach((q) => {
      const answer = Number(q.dataset.answer);
      const lesson = q.dataset.lesson;
      const qid = q.dataset.qid;
      const fb = $(".feedback", q);
      let tries = 0;
      $$(".opt", q).forEach((opt) => {
        opt.addEventListener("click", () => {
          if (opt.disabled) return;
          tries++;
          const i = Number(opt.dataset.i);
          const why = opt.dataset.why || "";
          fb.className = "feedback show";
          fb.innerHTML = "";
          if (i === answer) {
            opt.classList.add("correct");
            $$(".opt", q).forEach((o) => (o.disabled = true));
            fb.classList.add("good");
            fb.append(
              h("img", { src: QP.qubi("cheer"), alt: "" }),
              h("div", { html: `<b>${tries === 1 ? "Yes!" : "Got it!"}</b> ${why}` })
            );
            QP.store.recordQuiz(lesson, qid, tries === 1);
            if (tries === 1) QP.confettiAt(opt, 40);
          } else {
            opt.classList.add("wrong");
            opt.disabled = true;
            q.classList.remove("shake");
            void q.offsetWidth;
            q.classList.add("shake");
            fb.classList.add("bad");
            fb.append(
              h("img", { src: QP.qubi("oops"), alt: "" }),
              h("div", { html: `<b>Not quite.</b> ${why} <i>Try another one.</i>` })
            );
            QP.store.recordQuiz(lesson, qid, false);
          }
        });
      });
    });
  }

  // ------------------------------------------------------------ code cells
  function setupCode() {
    $$(".codecell").forEach((cell) => {
      const btn = $(".btn-copy", cell);
      const pre = $("pre", cell);
      if (!btn || !pre) return;
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText);
          btn.textContent = "Copied!";
        } catch (e) {
          const r = document.createRange();
          r.selectNodeContents(pre);
          const sel = getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
          btn.textContent = "Selected";
        }
        setTimeout(() => (btn.textContent = "Copy"), 1600);
      });
    });
    // notebook buttons: open in the learner's JupyterLab when connected, otherwise download
    $$("[data-nb]").forEach((el) => {
      const nb = el.dataset.nb;
      const open = $(".nb-open", el);
      if (open) {
        if (QP.config.labUrl) {
          // data-nb is the notebook's path inside the notebooks folder, e.g. "ml/ml-w1d1.ipynb"
          open.href = QP.config.labUrl.replace(/\/?$/, "/") + nb;
          open.target = "_blank";
          open.rel = "noopener";
        } else {
          open.remove();
        }
      }
    });
  }

  // ------------------------------------------------------------ widget helpers
  QP.ui = {
    slider({ label, min, max, step = 1, value, fmt = (v) => v, oninput, color }) {
      const id = "s" + Math.random().toString(36).slice(2, 8);
      const input = h("input", { type: "range", id, min, max, step, value });
      const out = h("output", { for: id }, fmt(Number(value)));
      const paint = () => {
        const p = ((input.value - min) / (max - min)) * 100;
        input.style.setProperty("--p", p + "%");
        if (color) input.style.setProperty("--c", color);
      };
      input.addEventListener("input", () => {
        out.textContent = fmt(Number(input.value));
        paint();
        oninput && oninput(Number(input.value));
      });
      paint();
      const wrap = h("div", { class: "slider" }, h("label", { for: id }, label), input, out);
      wrap.input = input;
      wrap.set = (v, fire = false) => {
        input.value = v;
        out.textContent = fmt(Number(input.value));
        paint();
        if (fire) oninput && oninput(Number(input.value));
      };
      wrap.get = () => Number(input.value);
      return wrap;
    },
    seg({ label, options, value, onchange }) {
      const wrap = h("div", { style: { display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: "6px" } });
      if (label) wrap.appendChild(h("span", { class: "seg-label" }, label));
      const seg = h("div", { class: "seg", role: "group" });
      const btns = options.map((o) => {
        const opt = typeof o === "object" ? o : { value: o, label: String(o) };
        const b = h("button", { type: "button", "aria-pressed": String(opt.value === value) }, opt.label);
        b.addEventListener("click", () => {
          btns.forEach((x) => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
          onchange && onchange(opt.value);
        });
        b._v = opt.value;
        return b;
      });
      btns.forEach((b) => seg.appendChild(b));
      wrap.appendChild(seg);
      wrap.set = (v) => btns.forEach((b) => b.setAttribute("aria-pressed", String(b._v === v)));
      return wrap;
    },
    toggle({ label, checked = false, onchange }) {
      const input = h("input", { type: "checkbox" });
      input.checked = checked;
      input.addEventListener("change", () => onchange && onchange(input.checked));
      const lab = h("label", { class: "switch" }, input, h("span", { class: "knob" }), h("span", null, label));
      lab.input = input;
      return lab;
    },
    button(label, onclick, cls = "btn soft small") {
      return h("button", { type: "button", class: cls, onclick }, label);
    },
    stat(k, v = "–", cls = "") {
      const vEl = h("span", { class: "v" }, v);
      const el = h("div", { class: "stat " + cls }, h("span", { class: "k" }, k), vEl);
      el.set = (val, klass) => {
        vEl.innerHTML = val;
        if (klass !== undefined) el.className = "stat " + klass;
      };
      return el;
    },
  };

  /** Mount a widget card into the placeholder <div data-widget="name"> */
  QP.widget = function (name, title, hint) {
    const host = document.querySelector(`[data-widget="${name}"]`);
    if (!host) return null;
    const body = h("div", { class: "widget-body" });
    const card = h(
      "div",
      { class: "widget" },
      h("div", { class: "widget-head" }, h("img", { src: QP.icon("step-play"), alt: "", width: 26, height: 26 }), h("span", { class: "title" }, title), hint ? h("span", { class: "hint" }, hint) : null),
      body
    );
    host.replaceWith(card);
    card.body = body;
    return card;
  };

  // Always run after the calling script has finished, so its top-level constants exist.
  QP.onReady = (fn) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : Promise.resolve().then(fn));

  QP.onReady(() => {
    setupNav();
    setupReveal();
    setupSteps();
    setupDone();
    setupQuizzes();
    setupCode();
    QP.store.touch();
  });
})();

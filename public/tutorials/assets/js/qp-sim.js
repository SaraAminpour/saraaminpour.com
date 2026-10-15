/* Quantum Path math engine: seeded randomness, datasets, a tiny statevector
   simulator (Qiskit bit order: qubit 0 is the rightmost bit) and the small
   machine-learning algorithms behind the playgrounds. */
(function () {
  "use strict";
  const QP = (window.QP = window.QP || {});

  // ================================================================ randomness
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  QP.rng = function (seed = 1) {
    const r = mulberry32(seed);
    r.normal = () => {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    r.int = (n) => Math.floor(r() * n);
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    return r;
  };
  const M = (QP.math = {
    clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    linspace: (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1)),
    sigmoid: (z) => 1 / (1 + Math.exp(-z)),
    mean: (a) => a.reduce((s, x) => s + x, 0) / a.length,
    sum: (a) => a.reduce((s, x) => s + x, 0),
    argmax: (a) => a.reduce((bi, x, i) => (x > a[bi] ? i : bi), 0),
    dist2: (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2,
    fmt: (x, d = 2) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d),
  });

  // ================================================================ datasets (points {x, y, c})
  QP.data = {
    blobs(n, centers, std = 0.35, seed = 1) {
      const r = QP.rng(seed);
      const out = [];
      for (let i = 0; i < n; i++) {
        const k = i % centers.length;
        const [cx, cy] = centers[k];
        out.push({ x: cx + std * r.normal(), y: cy + std * r.normal(), c: centers[k][2] != null ? centers[k][2] : k });
      }
      return out;
    },
    moons(n, noise = 0.12, seed = 2) {
      const r = QP.rng(seed);
      const out = [];
      for (let i = 0; i < n; i++) {
        const c = i % 2;
        const t = r() * Math.PI;
        let x = c === 0 ? Math.cos(t) : 1 - Math.cos(t);
        let y = c === 0 ? Math.sin(t) : 0.5 - Math.sin(t);
        x = (x - 0.5) * 1.1 + noise * r.normal();
        y = (y - 0.25) * 1.1 + noise * r.normal();
        out.push({ x, y, c });
      }
      return out;
    },
    circles(n, noise = 0.08, factor = 0.45, seed = 3) {
      const r = QP.rng(seed);
      const out = [];
      for (let i = 0; i < n; i++) {
        const c = i % 2;
        const t = r() * Math.PI * 2;
        const rad = c === 0 ? 1 : factor;
        out.push({ x: rad * Math.cos(t) + noise * r.normal(), y: rad * Math.sin(t) + noise * r.normal(), c: c === 0 ? 0 : 1 });
      }
      return out;
    },
    spiral(n, noise = 0.06, seed = 4) {
      const r = QP.rng(seed);
      const out = [];
      for (let i = 0; i < n; i++) {
        const c = i % 2;
        const t = 0.25 + (r() * 3.2);
        const a = t * 1.9 + c * Math.PI;
        const rad = t / 3.6;
        out.push({ x: rad * Math.cos(a) + noise * r.normal(), y: rad * Math.sin(a) + noise * r.normal(), c });
      }
      return out;
    },
    xor(n, noise = 0.18, seed = 5) {
      const r = QP.rng(seed);
      const out = [];
      for (let i = 0; i < n; i++) {
        const sx = r() < 0.5 ? -1 : 1;
        const sy = r() < 0.5 ? -1 : 1;
        out.push({ x: sx * 0.55 + noise * r.normal(), y: sy * 0.55 + noise * r.normal(), c: sx * sy > 0 ? 0 : 1 });
      }
      return out;
    },
  };

  // ================================================================ complex numbers & qubits
  const cx = (re, im = 0) => ({ re, im });
  const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
  const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
  const cabs2 = (a) => a.re * a.re + a.im * a.im;
  const cexp = (t) => ({ re: Math.cos(t), im: Math.sin(t) });
  QP.cx = { cx, cmul, cadd, cabs2, cexp, arg: (a) => Math.atan2(a.im, a.re) };

  const s2 = Math.SQRT1_2;
  const G = (QP.gates = {
    I: [[cx(1), cx(0)], [cx(0), cx(1)]],
    X: [[cx(0), cx(1)], [cx(1), cx(0)]],
    Y: [[cx(0), cx(0, -1)], [cx(0, 1), cx(0)]],
    Z: [[cx(1), cx(0)], [cx(0), cx(-1)]],
    H: [[cx(s2), cx(s2)], [cx(s2), cx(-s2)]],
    S: [[cx(1), cx(0)], [cx(0), cx(0, 1)]],
    Sdg: [[cx(1), cx(0)], [cx(0), cx(0, -1)]],
    T: [[cx(1), cx(0)], [cx(0), cexp(Math.PI / 4)]],
    Tdg: [[cx(1), cx(0)], [cx(0), cexp(-Math.PI / 4)]],
    RX: (t) => [[cx(Math.cos(t / 2)), cx(0, -Math.sin(t / 2))], [cx(0, -Math.sin(t / 2)), cx(Math.cos(t / 2))]],
    RY: (t) => [[cx(Math.cos(t / 2)), cx(-Math.sin(t / 2))], [cx(Math.sin(t / 2)), cx(Math.cos(t / 2))]],
    RZ: (t) => [[cexp(-t / 2), cx(0)], [cx(0), cexp(t / 2)]],
    P: (t) => [[cx(1), cx(0)], [cx(0), cexp(t)]],
    SX: [[cx(0.5, 0.5), cx(0.5, -0.5)], [cx(0.5, -0.5), cx(0.5, 0.5)]],
    U: (th, ph, la) => [[cx(Math.cos(th / 2)), cmul(cexp(la), cx(-Math.sin(th / 2)))], [cmul(cexp(ph), cx(Math.sin(th / 2))), cmul(cexp(ph + la), cx(Math.cos(th / 2)))]],
  });
  // rotation axis & angle of each fixed gate on the Bloch sphere (for animations)
  QP.gateAxis = {
    X: [[1, 0, 0], Math.PI], Y: [[0, 1, 0], Math.PI], Z: [[0, 0, 1], Math.PI],
    H: [[s2, 0, s2], Math.PI], S: [[0, 0, 1], Math.PI / 2], Sdg: [[0, 0, 1], -Math.PI / 2],
    T: [[0, 0, 1], Math.PI / 4], Tdg: [[0, 0, 1], -Math.PI / 4],
  };

  class State {
    constructor(n = 1, amps) {
      this.n = n;
      this.N = 1 << n;
      this.a = amps ? amps.map((z) => (typeof z === "number" ? cx(z) : { re: z.re, im: z.im })) : Array.from({ length: this.N }, (_, i) => cx(i === 0 ? 1 : 0));
    }
    clone() {
      return new State(this.n, this.a);
    }
    apply(U, q) {
      const bit = 1 << q;
      for (let i = 0; i < this.N; i++) {
        if (i & bit) continue;
        const j = i | bit;
        const a0 = this.a[i], a1 = this.a[j];
        this.a[i] = cadd(cmul(U[0][0], a0), cmul(U[0][1], a1));
        this.a[j] = cadd(cmul(U[1][0], a0), cmul(U[1][1], a1));
      }
      return this;
    }
    applyC(U, c, t) {
      const cb = 1 << c, tb = 1 << t;
      for (let i = 0; i < this.N; i++) {
        if (!(i & cb) || i & tb) continue;
        const j = i | tb;
        const a0 = this.a[i], a1 = this.a[j];
        this.a[i] = cadd(cmul(U[0][0], a0), cmul(U[0][1], a1));
        this.a[j] = cadd(cmul(U[1][0], a0), cmul(U[1][1], a1));
      }
      return this;
    }
    gate(name, q, param) {
      const U = typeof G[name] === "function" ? G[name](param) : G[name];
      return this.apply(U, q);
    }
    /** U on target t when both controls are 1 (Toffoli for U = X). */
    applyCC(U, c1, c2, t) {
      const m = (1 << c1) | (1 << c2), tb = 1 << t;
      for (let i = 0; i < this.N; i++) {
        if ((i & m) !== m || i & tb) continue;
        const j = i | tb;
        const a0 = this.a[i], a1 = this.a[j];
        this.a[i] = cadd(cmul(U[0][0], a0), cmul(U[0][1], a1));
        this.a[j] = cadd(cmul(U[1][0], a0), cmul(U[1][1], a1));
      }
      return this;
    }
    cx(c, t) {
      return this.applyC(G.X, c, t);
    }
    cz(c, t) {
      return this.applyC(G.Z, c, t);
    }
    swap(a, b) {
      return this.cx(a, b).cx(b, a).cx(a, b);
    }
    run(gates) {
      for (const g of gates) {
        if (g.name === "CX") this.cx(g.c, g.t);
        else if (g.name === "CZ") this.cz(g.c, g.t);
        else if (g.name === "CCX") this.applyCC(G.X, g.c[0], g.c[1], g.t);
        else if (g.name === "CCZ") this.applyCC(G.Z, g.c[0], g.c[1], g.t);
        else if (g.name === "CP") this.applyC(G.P(g.theta), g.c, g.t);
        else if (g.name === "CRY") this.applyC(G.RY(g.theta), g.c, g.t);
        else if (g.name === "CRZ") this.applyC(G.RZ(g.theta), g.c, g.t);
        else if (g.name === "SWAP") this.swap(g.q, g.q2);
        else if (g.name === "M" || g.name === "ENC" || g.name === "W") continue;
        else this.gate(g.name, g.q, g.theta);
      }
      return this;
    }
    probs() {
      return this.a.map(cabs2);
    }
    label(i) {
      return i.toString(2).padStart(this.n, "0");
    }
    sample(shots, rng = Math.random) {
      const p = this.probs();
      const counts = new Array(this.N).fill(0);
      for (let s = 0; s < shots; s++) {
        let u = rng();
        let k = 0;
        while (k < this.N - 1 && u >= p[k]) {
          u -= p[k];
          k++;
        }
        counts[k]++;
      }
      return counts;
    }
    expZ(q) {
      const bit = 1 << q;
      return this.probs().reduce((s, p, i) => s + (i & bit ? -p : p), 0);
    }
    /** Bloch vector of qubit q from its reduced density matrix. */
    bloch(q = 0) {
      const bit = 1 << q;
      let r00 = 0, r11 = 0, r01re = 0, r01im = 0;
      for (let i = 0; i < this.N; i++) {
        if (i & bit) continue;
        const a0 = this.a[i], a1 = this.a[i | bit];
        r00 += cabs2(a0);
        r11 += cabs2(a1);
        // rho01 = a0 * conj(a1)
        r01re += a0.re * a1.re + a0.im * a1.im;
        r01im += a0.im * a1.re - a0.re * a1.im;
      }
      return [2 * r01re, -2 * r01im, r00 - r11];
    }
    inner(other) {
      let re = 0, im = 0;
      for (let i = 0; i < this.N; i++) {
        const a = this.a[i], b = other.a[i];
        re += a.re * b.re + a.im * b.im;
        im += a.re * b.im - a.im * b.re;
      }
      return cx(re, im);
    }
    fidelity(other) {
      return cabs2(this.inner(other));
    }
    /** Probability that measuring qubit q gives b. */
    probOf(q, b) {
      const bit = 1 << q;
      let p = 0;
      for (let i = 0; i < this.N; i++) if ((i & bit ? 1 : 0) === b) p += cabs2(this.a[i]);
      return p;
    }
    /** Collapse qubit q onto outcome b and renormalize. Returns the probability of that outcome. */
    project(q, b) {
      const bit = 1 << q;
      const p = this.probOf(q, b);
      const k = p > 0 ? 1 / Math.sqrt(p) : 0;
      for (let i = 0; i < this.N; i++) this.a[i] = (i & bit ? 1 : 0) === b ? cx(this.a[i].re * k, this.a[i].im * k) : cx(0);
      return p;
    }
    /** Measure qubit q (Born rule), collapse, and return the bit. */
    measure(q, rng = Math.random) {
      const b = rng() < this.probOf(q, 1) ? 1 : 0;
      this.project(q, b);
      return b;
    }
  }
  QP.State = State;
  QP.fromBloch = (theta, phi) => new State(1, [cx(Math.cos(theta / 2)), cmul(cexp(phi), cx(Math.sin(theta / 2)))]);
  QP.blochAngles = (v) => {
    const [x, y, z] = v;
    const r = Math.hypot(x, y, z) || 1;
    return { theta: Math.acos(M.clamp(z / r, -1, 1)), phi: Math.atan2(y, x) };
  };
  /** Fidelity of two (possibly mixed) single-qubit states from Bloch vectors. */
  QP.fidelityBloch = (r, s) => {
    const dot = r[0] * s[0] + r[1] * s[1] + r[2] * s[2];
    const a = 1 - (r[0] ** 2 + r[1] ** 2 + r[2] ** 2);
    const b = 1 - (s[0] ** 2 + s[1] ** 2 + s[2] ** 2);
    return M.clamp(0.5 * (1 + dot + Math.sqrt(Math.max(0, a) * Math.max(0, b))), 0, 1);
  };
  QP.traceDistBloch = (r, s) => 0.5 * Math.hypot(r[0] - s[0], r[1] - s[1], r[2] - s[2]);
  /** Format a complex amplitude as a short string. */
  QP.fmtAmp = (z, d = 2) => {
    const re = Math.abs(z.re) < 5e-4 ? 0 : z.re;
    const im = Math.abs(z.im) < 5e-4 ? 0 : z.im;
    if (im === 0) return re.toFixed(d);
    if (re === 0) return (im < 0 ? "−" : "") + Math.abs(im).toFixed(d) + "i";
    return `${re.toFixed(d)}${im < 0 ? "−" : "+"}${Math.abs(im).toFixed(d)}i`;
  };

  // ================================================================ ML algorithms
  // ================================================================ the cat world (reinforcement learning, ML week 7)
  // A 6 x 6 grid: S start, F fish (+1, episode ends), P puddle (-1), # wall, every other step -0.04.
  // With slip > 0 the cat goes the intended way with probability 1 - slip, else to one side or the other.
  const RL = (QP.rl = {});
  RL.MAZE = ["S...#.", ".##.#.", "...P..", ".#.##.", ".#....", "...#.F"];
  RL.rows = RL.MAZE.length;
  RL.cols = RL.MAZE[0].length;
  RL.MOVES = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // up, right, down, left
  RL.ARROWS = ["↑", "→", "↓", "←"];
  RL.NAMES = ["up", "right", "down", "left"];
  RL.START = [0, 0];
  RL.cell = (r, c) => RL.MAZE[r][c];
  RL.blocked = (r, c) => r < 0 || r >= RL.rows || c < 0 || c >= RL.cols || RL.MAZE[r][c] === "#";
  RL.move = ([r, c], a) => {
    const nr = r + RL.MOVES[a][0], nc = c + RL.MOVES[a][1];
    return RL.blocked(nr, nc) ? [r, c] : [nr, nc];
  };
  RL.rewardAt = ([r, c]) => (RL.MAZE[r][c] === "F" ? 1 : RL.MAZE[r][c] === "P" ? -1 : -0.04);
  /** All possible results of action a in state s: [{p, s2, r, done, dir}] */
  RL.outcomes = (s, a, slip = 0) => {
    const dirs = slip > 0 ? [[a, 1 - slip], [(a + 1) % 4, slip / 2], [(a + 3) % 4, slip / 2]] : [[a, 1]];
    return dirs.map(([d, p]) => {
      const s2 = RL.move(s, d);
      return { p, s2, r: RL.rewardAt(s2), done: RL.MAZE[s2[0]][s2[1]] === "F", dir: d };
    });
  };
  RL.step = (s, a, slip = 0, rng = Math.random) => {
    const outs = RL.outcomes(s, a, slip);
    let u = rng();
    for (const o of outs) { if (u < o.p) return o; u -= o.p; }
    return outs[outs.length - 1];
  };
  RL.states = () => {
    const out = [];
    for (let r = 0; r < RL.rows; r++) for (let c = 0; c < RL.cols; c++) if (RL.MAZE[r][c] !== "#") out.push([r, c]);
    return out;
  };
  RL.terminal = ([r, c]) => RL.MAZE[r][c] === "F";
  /** One sweep of value iteration: V[r][c] <- max_a sum_s2 p (r + gamma V[s2]). Returns the new table. */
  RL.sweep = (V, gamma, slip = 0) => V.map((row, r) => row.map((v, c) => {
    if (RL.blocked(r, c) || RL.terminal([r, c])) return 0;
    let best = -Infinity;
    for (let a = 0; a < 4; a++) {
      const q = RL.outcomes([r, c], a, slip).reduce((t, o) => t + o.p * (o.r + (o.done ? 0 : gamma * V[o.s2[0]][o.s2[1]])), 0);
      best = Math.max(best, q);
    }
    return best;
  }));
  RL.qValues = (V, s, gamma, slip = 0) => [0, 1, 2, 3].map((a) => RL.outcomes(s, a, slip).reduce((t, o) => t + o.p * (o.r + (o.done ? 0 : gamma * V[o.s2[0]][o.s2[1]])), 0));
  RL.zeros = () => Array.from({ length: RL.rows }, () => Array(RL.cols).fill(0));
  RL.greedy = (V, gamma, slip = 0) => RL.MAZE.map((row, r) => [...row].map((_, c) => {
    if (RL.blocked(r, c) || RL.terminal([r, c])) return -1;
    const q = RL.qValues(V, [r, c], gamma, slip);
    return q.indexOf(Math.max(...q));
  }));
  /** Draw the grid on a QP.Plot with xlim [0, cols] and ylim [0, rows]. */
  RL.drawGrid = (plot, o = {}) => {
    const C = QP.colors;
    for (let r = 0; r < RL.rows; r++) for (let c = 0; c < RL.cols; c++) {
      const ch = RL.MAZE[r][c], y0 = RL.rows - 1 - r;
      const fill = ch === "#" ? "#4a4560" : ch === "P" ? "#cfe6ff" : o.fill ? o.fill(r, c) : (r + c) % 2 ? "#fbf9ff" : "#f4f1fc";
      plot.rect(c + 0.03, y0 + 0.03, c + 0.97, y0 + 0.97, { fill });
      if (ch === "P") plot.text("puddle", c + 0.5, y0 + 0.16, { size: 9, color: "#4b7fbd" });
      if (ch === "S" && !o.hideStart) plot.text("start", c + 0.5, y0 + 0.16, { size: 9, color: C.ink3 });
    }
    RL.drawFish(plot, RL.cols - 1 + 0.5, 0.5);
  };
  RL.drawFish = (plot, x, y) => {
    const ctx = plot.ctx, X = plot.X(x), Y = plot.Y(y), s = Math.abs(plot.X(1) - plot.X(0)) * 0.22;
    ctx.save();
    ctx.fillStyle = "#ff8a50";
    ctx.strokeStyle = "#2c2842";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(X - s * 0.2, Y, s, s * 0.6, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X + s * 0.7, Y);
    ctx.lineTo(X + s * 1.3, Y - s * 0.55);
    ctx.lineTo(X + s * 1.3, Y + s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2c2842";
    ctx.beginPath();
    ctx.arc(X - s * 0.65, Y - s * 0.12, s * 0.12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  };
  RL.drawCat = (plot, x, y, mood = "") => {
    const ctx = plot.ctx, X = plot.X(x), Y = plot.Y(y), s = Math.abs(plot.X(1) - plot.X(0)) * 0.26;
    ctx.save();
    ctx.fillStyle = mood === "wet" ? "#b9d6ff" : "#ffd66b";
    ctx.strokeStyle = "#2c2842";
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X + side * s * 0.85, Y - s * 0.35);
      ctx.lineTo(X + side * s * 0.75, Y - s * 1.25);
      ctx.lineTo(X + side * s * 0.2, Y - s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(X, Y, s, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2c2842";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(X + side * s * 0.38, Y - s * 0.1, s * 0.12, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.strokeStyle = "#2c2842";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(X - s * 0.18, Y + s * 0.3);
    ctx.quadraticCurveTo(X, Y + (mood === "happy" ? s * 0.55 : s * 0.38), X + s * 0.18, Y + s * 0.3);
    ctx.stroke();
    ctx.restore();
  };

  const ML = (QP.ml = {});

  ML.knn = function (train, q, k) {
    const ds = train.map((p) => ({ p, d: M.dist2(p, q) })).sort((a, b) => a.d - b.d).slice(0, k);
    const votes = {};
    ds.forEach(({ p }) => (votes[p.c] = (votes[p.c] || 0) + 1));
    let best = null;
    for (const c in votes) if (best == null || votes[c] > votes[best]) best = c;
    const nClasses = Math.max(2, ...train.map((p) => p.c + 1));
    const frac = new Array(nClasses).fill(0);
    ds.forEach(({ p }) => frac[p.c]++);
    return { label: Number(best), neighbors: ds.map((x) => x.p), votes, frac: frac.map((v) => v / ds.length), radius: Math.sqrt(ds[ds.length - 1].d) };
  };

  ML.linfit = function (pts) {
    const n = pts.length;
    const mx = M.mean(pts.map((p) => p.x)), my = M.mean(pts.map((p) => p.y));
    let sxy = 0, sxx = 0;
    for (const p of pts) {
      sxy += (p.x - mx) * (p.y - my);
      sxx += (p.x - mx) ** 2;
    }
    const w = sxy / (sxx || 1e-12);
    return { w, b: my - w * mx, n };
  };
  ML.mse = (pts, w, b) => M.mean(pts.map((p) => (p.y - (w * p.x + b)) ** 2));

  /** Solve A x = b by Gaussian elimination with partial pivoting. */
  ML.solve = function (A, b) {
    const n = A.length;
    const m = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
      [m[c], m[piv]] = [m[piv], m[c]];
      const d = m[c][c] || 1e-12;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = m[r][c] / d;
        if (f === 0) continue;
        for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
      }
    }
    return m.map((row, i) => row[n] / (row[i] || 1e-12));
  };

  /** Polynomial regression with an L2 (ridge) penalty on every weight but the bias. */
  ML.polyRidge = function (pts, degree, lambda) {
    const D = degree + 1;
    const A = Array.from({ length: D }, () => new Array(D).fill(0));
    const b = new Array(D).fill(0);
    for (const p of pts) {
      const f = [];
      for (let k = 0; k < D; k++) f.push(Math.pow(p.x, k));
      for (let i = 0; i < D; i++) {
        b[i] += f[i] * p.y;
        for (let j = 0; j < D; j++) A[i][j] += f[i] * f[j];
      }
    }
    for (let i = 1; i < D; i++) A[i][i] += lambda * pts.length;
    A[0][0] += 1e-10;
    return ML.solve(A, b);
  };
  /** Polynomial regression with an L1 (lasso) penalty, by coordinate descent. */
  ML.polyLasso = function (pts, degree, lambda, iters = 400) {
    const D = degree + 1;
    const n = pts.length;
    const F = pts.map((p) => Array.from({ length: D }, (_, k) => Math.pow(p.x, k)));
    const y = pts.map((p) => p.y);
    const w = new Array(D).fill(0);
    const norms = Array.from({ length: D }, (_, k) => F.reduce((s, f) => s + f[k] * f[k], 0) / n);
    const resid = y.slice();
    for (let it = 0; it < iters; it++) {
      for (let k = 0; k < D; k++) {
        let rho = 0;
        for (let i = 0; i < n; i++) rho += F[i][k] * (resid[i] + F[i][k] * w[k]);
        rho /= n;
        let nw;
        if (k === 0) nw = rho / norms[k];
        else nw = Math.sign(rho) * Math.max(0, Math.abs(rho) - lambda) / (norms[k] || 1e-12);
        const dw = nw - w[k];
        if (dw !== 0) for (let i = 0; i < n; i++) resid[i] -= F[i][k] * dw;
        w[k] = nw;
      }
    }
    return w;
  };
  ML.polyEval = (w, x) => w.reduce((s, c, k) => s + c * Math.pow(x, k), 0);

  /** Logistic regression on 2D points, trained by full-batch gradient descent. */
  ML.logreg = function (w = [0, 0, 0]) {
    const model = { w: w.slice() };
    model.p = (x, y) => M.sigmoid(model.w[0] * x + model.w[1] * y + model.w[2]);
    model.loss = (pts) => -M.mean(pts.map((p) => {
      const q = M.clamp(model.p(p.x, p.y), 1e-9, 1 - 1e-9);
      return p.c ? Math.log(q) : Math.log(1 - q);
    }));
    model.step = (pts, lr = 0.5) => {
      const g = [0, 0, 0];
      for (const p of pts) {
        const e = model.p(p.x, p.y) - p.c;
        g[0] += e * p.x;
        g[1] += e * p.y;
        g[2] += e;
      }
      for (let i = 0; i < 3; i++) model.w[i] -= (lr * g[i]) / pts.length;
    };
    return model;
  };

  /** A tiny fully connected network with tanh/relu hidden layers and a sigmoid output, trained with Adam. */
  ML.mlp = function (sizes, act = "tanh", seed = 7) {
    const r = QP.rng(seed);
    const L = sizes.length - 1;
    const W = [], B = [];
    for (let l = 0; l < L; l++) {
      const fan = sizes[l];
      W.push(Array.from({ length: sizes[l + 1] }, () => Array.from({ length: fan }, () => r.normal() * Math.sqrt(1 / fan) * 1.2)));
      B.push(new Array(sizes[l + 1]).fill(0));
    }
    const f = act === "relu" ? (z) => (z > 0 ? z : 0.01 * z) : Math.tanh;
    const df = act === "relu" ? (z, a) => (z > 0 ? 1 : 0.01) : (z, a) => 1 - a * a;
    const net = { W, B, sizes, act, t: 0 };
    const mW = W.map((m) => m.map((row) => row.map(() => 0))), vW = W.map((m) => m.map((row) => row.map(() => 0)));
    const mB = B.map((b) => b.map(() => 0)), vB = B.map((b) => b.map(() => 0));
    net.forward = (x) => {
      const zs = [], as = [x];
      let a = x;
      for (let l = 0; l < L; l++) {
        const z = W[l].map((row, j) => row.reduce((s, w, i) => s + w * a[i], B[l][j]));
        a = l === L - 1 ? z.map(M.sigmoid) : z.map(f);
        zs.push(z);
        as.push(a);
      }
      return { zs, as, out: a[0] };
    };
    net.predict = (x, y) => net.forward([x, y]).out;
    net.step = (pts, lr = 0.03) => {
      const gW = W.map((m) => m.map((row) => row.map(() => 0)));
      const gB = B.map((b) => b.map(() => 0));
      let loss = 0;
      for (const p of pts) {
        const { zs, as, out } = net.forward([p.x, p.y]);
        const q = M.clamp(out, 1e-9, 1 - 1e-9);
        loss += p.c ? -Math.log(q) : -Math.log(1 - q);
        let delta = [out - p.c];
        for (let l = L - 1; l >= 0; l--) {
          for (let j = 0; j < W[l].length; j++) {
            gB[l][j] += delta[j];
            for (let i = 0; i < W[l][j].length; i++) gW[l][j][i] += delta[j] * as[l][i];
          }
          if (l > 0) {
            const nd = new Array(sizes[l]).fill(0);
            for (let i = 0; i < sizes[l]; i++) {
              let s = 0;
              for (let j = 0; j < W[l].length; j++) s += W[l][j][i] * delta[j];
              nd[i] = s * df(zs[l - 1][i], as[l][i]);
            }
            delta = nd;
          }
        }
      }
      net.t++;
      const b1 = 0.9, b2 = 0.999, eps = 1e-8, n = pts.length;
      const c1 = 1 - Math.pow(b1, net.t), c2 = 1 - Math.pow(b2, net.t);
      for (let l = 0; l < L; l++) {
        for (let j = 0; j < W[l].length; j++) {
          for (let i = 0; i < W[l][j].length; i++) {
            const g = gW[l][j][i] / n;
            mW[l][j][i] = b1 * mW[l][j][i] + (1 - b1) * g;
            vW[l][j][i] = b2 * vW[l][j][i] + (1 - b2) * g * g;
            W[l][j][i] -= (lr * (mW[l][j][i] / c1)) / (Math.sqrt(vW[l][j][i] / c2) + eps);
          }
          const g = gB[l][j] / n;
          mB[l][j] = b1 * mB[l][j] + (1 - b1) * g;
          vB[l][j] = b2 * vB[l][j] + (1 - b2) * g * g;
          B[l][j] -= (lr * (mB[l][j] / c1)) / (Math.sqrt(vB[l][j] / c2) + eps);
        }
      }
      return loss / n;
    };
    net.accuracy = (pts) => M.mean(pts.map((p) => ((net.predict(p.x, p.y) > 0.5 ? 1 : 0) === p.c ? 1 : 0)));
    return net;
  };

  /** Kernels used by the SVM and the kernel matrix views. */
  ML.kernels = {
    linear: () => (a, b) => a.x * b.x + a.y * b.y,
    rbf: (gamma) => (a, b) => Math.exp(-gamma * M.dist2(a, b)),
    poly: (deg = 2, c = 1) => (a, b) => Math.pow(a.x * b.x + a.y * b.y + c, deg),
  };

  /** Soft-margin SVM trained with simplified SMO. Labels are c in {0,1}. */
  ML.svm = function (pts, kernel, C = 1, opts = {}) {
    const n = pts.length;
    const y = pts.map((p) => (p.c ? 1 : -1));
    const K = pts.map((a) => pts.map((b) => kernel(a, b)));
    const alpha = new Array(n).fill(0);
    let b = 0;
    const tol = 1e-3, maxPasses = opts.passes || 12;
    const r = QP.rng(opts.seed || 11);
    const f = (i) => {
      let s = b;
      for (let j = 0; j < n; j++) if (alpha[j] > 0) s += alpha[j] * y[j] * K[j][i];
      return s;
    };
    let passes = 0, iter = 0;
    while (passes < maxPasses && iter < 2000) {
      iter++;
      let changed = 0;
      for (let i = 0; i < n; i++) {
        const Ei = f(i) - y[i];
        if ((y[i] * Ei < -tol && alpha[i] < C) || (y[i] * Ei > tol && alpha[i] > 0)) {
          let j = r.int(n - 1);
          if (j >= i) j++;
          const Ej = f(j) - y[j];
          const ai = alpha[i], aj = alpha[j];
          let L, H;
          if (y[i] !== y[j]) {
            L = Math.max(0, aj - ai);
            H = Math.min(C, C + aj - ai);
          } else {
            L = Math.max(0, ai + aj - C);
            H = Math.min(C, ai + aj);
          }
          if (L === H) continue;
          const eta = 2 * K[i][j] - K[i][i] - K[j][j];
          if (eta >= 0) continue;
          let nj = aj - (y[j] * (Ei - Ej)) / eta;
          nj = M.clamp(nj, L, H);
          if (Math.abs(nj - aj) < 1e-5) continue;
          const ni = ai + y[i] * y[j] * (aj - nj);
          const b1 = b - Ei - y[i] * (ni - ai) * K[i][i] - y[j] * (nj - aj) * K[i][j];
          const b2 = b - Ej - y[i] * (ni - ai) * K[i][j] - y[j] * (nj - aj) * K[j][j];
          alpha[i] = ni;
          alpha[j] = nj;
          b = ni > 0 && ni < C ? b1 : nj > 0 && nj < C ? b2 : (b1 + b2) / 2;
          changed++;
        }
      }
      passes = changed === 0 ? passes + 1 : 0;
    }
    const sv = alpha.map((a, i) => (a > 1e-6 ? i : -1)).filter((i) => i >= 0);
    const decision = (q) => {
      let s = b;
      for (const j of sv) s += alpha[j] * y[j] * kernel(pts[j], q);
      return s;
    };
    return { alpha, b, sv, decision, K };
  };

  ML.kmeansPP = function (pts, k, seed = 3) {
    const r = QP.rng(seed);
    const cents = [Object.assign({}, r.pick(pts))];
    while (cents.length < k) {
      const d = pts.map((p) => Math.min(...cents.map((c) => M.dist2(p, c))));
      const tot = M.sum(d);
      let u = r() * tot;
      let i = 0;
      while (u > d[i] && i < pts.length - 1) {
        u -= d[i];
        i++;
      }
      cents.push({ x: pts[i].x, y: pts[i].y });
    }
    return cents.map((c) => ({ x: c.x, y: c.y }));
  };
  ML.kmeansAssign = (pts, cents) => pts.map((p) => M.argmax(cents.map((c) => -M.dist2(p, c))));
  ML.kmeansUpdate = (pts, assign, cents) =>
    cents.map((c, j) => {
      const mine = pts.filter((_, i) => assign[i] === j);
      return mine.length ? { x: M.mean(mine.map((p) => p.x)), y: M.mean(mine.map((p) => p.y)) } : { x: c.x, y: c.y };
    });
  ML.inertia = (pts, assign, cents) => M.sum(pts.map((p, i) => M.dist2(p, cents[assign[i]])));

  /** PCA for 2D points: returns mean, unit axes (largest variance first) and variances. */
  ML.pca2 = function (pts) {
    const mx = M.mean(pts.map((p) => p.x)), my = M.mean(pts.map((p) => p.y));
    let a = 0, b = 0, c = 0;
    for (const p of pts) {
      const dx = p.x - mx, dy = p.y - my;
      a += dx * dx;
      b += dx * dy;
      c += dy * dy;
    }
    const n = pts.length;
    a /= n;
    b /= n;
    c /= n;
    const tr = a + c, det = a * c - b * b;
    const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
    let v1 = Math.abs(b) > 1e-12 ? [l1 - c, b] : a >= c ? [1, 0] : [0, 1];
    const nv = Math.hypot(...v1);
    v1 = v1.map((x) => x / nv);
    return { mean: { x: mx, y: my }, axes: [v1, [-v1[1], v1[0]]], vars: [l1, l2], cov: [[a, b], [b, c]] };
  };

  /** CART decision tree on 2D points with Gini impurity. */
  ML.tree = function (pts, maxDepth = 3, opts = {}) {
    const r = QP.rng(opts.seed || 5);
    const minLeaf = opts.minLeaf || 1;
    const gini = (arr) => {
      if (!arr.length) return 0;
      const p1 = arr.filter((p) => p.c === 1).length / arr.length;
      return 1 - p1 * p1 - (1 - p1) * (1 - p1);
    };
    function build(arr, depth, box) {
      const p1 = arr.length ? arr.filter((p) => p.c === 1).length / arr.length : 0.5;
      const node = { leaf: true, p1, n: arr.length, box, depth, gini: gini(arr) };
      if (depth >= maxDepth || node.gini === 0 || arr.length < 2 * minLeaf) return node;
      let best = null;
      const feats = opts.randomFeature ? [r() < 0.5 ? "x" : "y"] : ["x", "y"];
      for (const f of feats) {
        const vals = [...new Set(arr.map((p) => p[f]))].sort((a, b) => a - b);
        for (let i = 0; i < vals.length - 1; i++) {
          const t = (vals[i] + vals[i + 1]) / 2;
          const L = arr.filter((p) => p[f] <= t), R = arr.filter((p) => p[f] > t);
          if (L.length < minLeaf || R.length < minLeaf) continue;
          const score = (L.length * gini(L) + R.length * gini(R)) / arr.length;
          if (!best || score < best.score - 1e-12) best = { f, t, score, L, R };
        }
      }
      if (!best || best.score >= node.gini - 1e-9) return node;
      const [bx0, bx1, by0, by1] = box;
      const lbox = best.f === "x" ? [bx0, best.t, by0, by1] : [bx0, bx1, by0, best.t];
      const rbox = best.f === "x" ? [best.t, bx1, by0, by1] : [bx0, bx1, best.t, by1];
      return { leaf: false, f: best.f, t: best.t, n: arr.length, p1, box, depth, gini: node.gini, gain: node.gini - best.score, left: build(best.L, depth + 1, lbox), right: build(best.R, depth + 1, rbox) };
    }
    const root = build(pts, 0, opts.box || [-2, 2, -2, 2]);
    const predict = (q) => {
      let n = root;
      while (!n.leaf) n = q[n.f] <= n.t ? n.left : n.right;
      return n.p1;
    };
    const leaves = [];
    (function walk(n) {
      if (n.leaf) leaves.push(n);
      else {
        walk(n.left);
        walk(n.right);
      }
    })(root);
    return { root, predict, leaves };
  };
  ML.forest = function (pts, nTrees = 25, maxDepth = 6, seed = 9) {
    const r = QP.rng(seed);
    const trees = [];
    for (let t = 0; t < nTrees; t++) {
      const boot = Array.from({ length: pts.length }, () => pts[r.int(pts.length)]);
      trees.push(ML.tree(boot, maxDepth, { randomFeature: true, seed: seed * 31 + t, box: [-3, 3, -3, 3] }));
    }
    return { trees, predict: (q) => M.mean(trees.map((tr) => tr.predict(q))) };
  };

  /** Label spreading on a k-nearest-neighbour graph. Returns per-iteration class scores. */
  ML.labelSpread = function (pts, k = 7, alpha = 0.9) {
    const n = pts.length;
    const nb = pts.map((p, i) =>
      pts.map((q, j) => ({ j, d: M.dist2(p, q) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, k)
    );
    const W = pts.map(() => new Map());
    nb.forEach((list, i) => list.forEach(({ j, d }) => {
      const w = Math.exp(-d / 0.05);
      W[i].set(j, Math.max(W[i].get(j) || 0, w));
      W[j].set(i, Math.max(W[j].get(i) || 0, w));
    }));
    const deg = W.map((m) => [...m.values()].reduce((s, x) => s + x, 0) || 1e-12);
    const Y0 = pts.map((p) => (p.label == null ? [0, 0] : p.label === 0 ? [1, 0] : [0, 1]));
    let F = Y0.map((r) => r.slice());
    return {
      F: () => F,
      step() {
        F = F.map((_, i) => {
          const s = [0, 0];
          W[i].forEach((w, j) => {
            const nw = w / Math.sqrt(deg[i] * deg[j]);
            s[0] += nw * F[j][0];
            s[1] += nw * F[j][1];
          });
          return [alpha * s[0] + (1 - alpha) * Y0[i][0], alpha * s[1] + (1 - alpha) * Y0[i][1]];
        });
        return F;
      },
      edges: () => nb.flatMap((list, i) => list.map(({ j }) => [i, j])),
    };
  };
})();

/* Quantum Path visual toolkit: 2D plots, charts, the Bloch sphere,
   amplitude bars, histograms and circuit diagrams. */
(function () {
  "use strict";
  const QP = (window.QP = window.QP || {});
  const h = (...a) => QP.h(...a);

  QP.colors = {
    c0: "#ff8a50", c0soft: "rgba(255,138,80,", c1: "#5577f5", c1soft: "rgba(85,119,245,",
    c2: "#1fb394", c3: "#e45fa3", unl: "#bcb7cb",
    ink: "#2c2842", ink2: "#57526f", ink3: "#8a85a3", line: "rgba(76,60,140,0.12)",
    ml: "#17a98c", qc: "#7b5cfa", qml: "#ff7a59", rest: "#f0ac2e",
    lav: "#b9a7ff", pink: "#ff8fb8", butter: "#ffd66b", mint: "#7fe0c4", sky: "#7cc4ff", peach: "#ffb59a",
  };
  const C = QP.colors;
  /** Soft background colour for a class-1 probability p in [0,1]. */
  QP.blend2 = (p, alpha = 0.55) => {
    const a = [255, 205, 180], b = [196, 208, 255], m = [250, 248, 255];
    const t = Math.max(0, Math.min(1, p));
    const c = t < 0.5 ? a.map((v, i) => v + (m[i] - v) * (t / 0.5)) : m.map((v, i) => v + (b[i] - v) * ((t - 0.5) / 0.5));
    return [c[0], c[1], c[2], alpha];
  };
  QP.classColor = (k) => [C.c0, C.c1, C.c2, C.c3][k] || C.unl;
  QP.classRGB = (k) => [[255, 138, 80], [85, 119, 245], [31, 179, 148], [228, 95, 163]][k] || [188, 183, 203];
  const FONT = '"Nunito", system-ui, sans-serif';
  const HEAD = '"Fredoka", "Nunito", system-ui, sans-serif';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';

  function dpr() {
    return Math.min(2.5, window.devicePixelRatio || 1);
  }

  // ================================================================ Plot
  class Plot {
    constructor(host, opts = {}) {
      this.o = Object.assign(
        { xlim: [-1, 1], ylim: [-1, 1], aspect: 0.72, pad: 14, axes: false, ticks: false, grid: true, xlabel: "", ylabel: "", equal: false, minH: 220, maxH: 560 },
        opts
      );
      this.stage = h("div", { class: "widget-stage" });
      this.c = h("canvas");
      this.stage.appendChild(this.c);
      if (host) host.appendChild(this.stage);
      this.ctx = this.c.getContext("2d");
      this.handlers = {};
      this._bindPointer();
      this.resize();
      if ("ResizeObserver" in window) {
        let last = 0;
        this._ro = new ResizeObserver(() => {
          const w = this.stage.clientWidth;
          if (Math.abs(w - last) < 2) return;
          last = w;
          this.resize();
          this.onresize && this.onresize();
        });
        this._ro.observe(this.stage);
      }
    }
    resize() {
      const w = Math.max(100, this.stage.clientWidth || 600);
      let hgt = Math.round(w * this.o.aspect);
      hgt = Math.max(this.o.minH, Math.min(this.o.maxH, hgt));
      const r = dpr();
      this.c.width = Math.round(w * r);
      this.c.height = Math.round(hgt * r);
      this.c.style.height = hgt + "px";
      this.w = w;
      this.h = hgt;
      this.ctx.setTransform(r, 0, 0, r, 0, 0);
      const p = this.o.pad;
      this.pl = this.o.ticks ? p + 38 : p;
      this.pb = this.o.ticks ? p + 26 : p;
      this.pr = p;
      this.pt = p;
      if (this.o.equal) {
        // keep x and y on the same scale by widening whichever range is short
        const [x0, x1] = this.o.xlim0 || this.o.xlim;
        const [y0, y1] = this.o.ylim0 || this.o.ylim;
        this.o.xlim0 = [x0, x1];
        this.o.ylim0 = [y0, y1];
        const pw = this.w - this.pl - this.pr;
        const ph = this.h - this.pt - this.pb;
        const sx = (x1 - x0) / pw;
        const sy = (y1 - y0) / ph;
        if (sx > sy) {
          const cy = (y0 + y1) / 2;
          const half = (sx * ph) / 2;
          this.o.ylim = [cy - half, cy + half];
          this.o.xlim = [x0, x1];
        } else {
          const cx = (x0 + x1) / 2;
          const half = (sy * pw) / 2;
          this.o.xlim = [cx - half, cx + half];
          this.o.ylim = [y0, y1];
        }
      }
    }
    get pw() {
      return this.w - this.pl - this.pr;
    }
    get ph() {
      return this.h - this.pt - this.pb;
    }
    X(x) {
      const [a, b] = this.o.xlim;
      return this.pl + ((x - a) / (b - a)) * this.pw;
    }
    Y(y) {
      const [a, b] = this.o.ylim;
      return this.pt + (1 - (y - a) / (b - a)) * this.ph;
    }
    ix(px) {
      const [a, b] = this.o.xlim;
      return a + ((px - this.pl) / this.pw) * (b - a);
    }
    iy(py) {
      const [a, b] = this.o.ylim;
      return a + (1 - (py - this.pt) / this.ph) * (b - a);
    }
    clear(bg = "#fcfbff") {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.w, this.h);
      if (this.o.grid) this.drawGrid();
      if (this.o.ticks) this.drawTicks();
    }
    niceStep(range, target = 6) {
      const raw = range / target;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const n = raw / mag;
      return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
    }
    drawGrid() {
      const ctx = this.ctx;
      const [x0, x1] = this.o.xlim;
      const [y0, y1] = this.o.ylim;
      const sx = this.o.gridStep || this.niceStep(x1 - x0, this.w / 70);
      const sy = this.o.gridStep || this.niceStep(y1 - y0, this.h / 70);
      ctx.save();
      ctx.strokeStyle = "rgba(76,60,140,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.ceil(x0 / sx) * sx; x <= x1 + 1e-9; x += sx) {
        const px = Math.round(this.X(x)) + 0.5;
        ctx.moveTo(px, this.pt);
        ctx.lineTo(px, this.h - this.pb);
      }
      for (let y = Math.ceil(y0 / sy) * sy; y <= y1 + 1e-9; y += sy) {
        const py = Math.round(this.Y(y)) + 0.5;
        ctx.moveTo(this.pl, py);
        ctx.lineTo(this.w - this.pr, py);
      }
      ctx.stroke();
      if (this.o.axes) {
        ctx.strokeStyle = "rgba(76,60,140,0.28)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        if (y0 < 0 && y1 > 0) {
          ctx.moveTo(this.pl, this.Y(0));
          ctx.lineTo(this.w - this.pr, this.Y(0));
        }
        if (x0 < 0 && x1 > 0) {
          ctx.moveTo(this.X(0), this.pt);
          ctx.lineTo(this.X(0), this.h - this.pb);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    drawTicks() {
      const ctx = this.ctx;
      const [x0, x1] = this.o.xlim;
      const [y0, y1] = this.o.ylim;
      const sx = this.o.xstep || this.niceStep(x1 - x0, Math.max(3, this.pw / 80));
      const sy = this.o.ystep || this.niceStep(y1 - y0, Math.max(3, this.ph / 50));
      const fmt = (v, s) => {
        const d = Math.max(0, -Math.floor(Math.log10(s) + 1e-9));
        return (Math.abs(v) < 1e-12 ? 0 : v).toFixed(Math.min(3, d));
      };
      ctx.save();
      ctx.strokeStyle = "rgba(76,60,140,0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(this.pl, this.pt);
      ctx.lineTo(this.pl, this.h - this.pb);
      ctx.lineTo(this.w - this.pr, this.h - this.pb);
      ctx.stroke();
      ctx.fillStyle = C.ink3;
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let x = Math.ceil(x0 / sx - 1e-9) * sx; x <= x1 + 1e-9; x += sx) ctx.fillText((this.o.xfmt || fmt)(x, sx), this.X(x), this.h - this.pb + 6);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let y = Math.ceil(y0 / sy - 1e-9) * sy; y <= y1 + 1e-9; y += sy) ctx.fillText((this.o.yfmt || fmt)(y, sy), this.pl - 6, this.Y(y));
      ctx.font = `800 12px ${FONT}`;
      ctx.fillStyle = C.ink2;
      if (this.o.xlabel) {
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(this.o.xlabel, this.w - this.pr, this.h - 2);
      }
      if (this.o.ylabel) {
        ctx.save();
        ctx.translate(12, this.pt);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(this.o.ylabel, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }
    /** Paint the background by evaluating fn(x, y) -> [r,g,b,a(0..1)] on a coarse grid. */
    region(fn, res = 5, cacheKey = null) {
      const gw = Math.max(2, Math.ceil(this.pw / res));
      const gh = Math.max(2, Math.ceil(this.ph / res));
      const key = cacheKey == null ? null : `${cacheKey}|${gw}x${gh}|${this.o.xlim}|${this.o.ylim}`;
      if (key && this._regionKey === key && this._off) {
        this._drawRegion();
        return;
      }
      this._regionKey = key;
      if (!this._off || this._off.width !== gw || this._off.height !== gh) {
        this._off = document.createElement("canvas");
        this._off.width = gw;
        this._off.height = gh;
      }
      const octx = this._off.getContext("2d");
      const img = octx.createImageData(gw, gh);
      const [x0, x1] = this.o.xlim;
      const [y0, y1] = this.o.ylim;
      for (let j = 0; j < gh; j++) {
        const y = y1 - ((j + 0.5) / gh) * (y1 - y0);
        for (let i = 0; i < gw; i++) {
          const x = x0 + ((i + 0.5) / gw) * (x1 - x0);
          const c = fn(x, y);
          const k = (j * gw + i) * 4;
          img.data[k] = c[0];
          img.data[k + 1] = c[1];
          img.data[k + 2] = c[2];
          img.data[k + 3] = Math.round((c[3] == null ? 1 : c[3]) * 255);
        }
      }
      octx.putImageData(img, 0, 0);
      this._drawRegion();
    }
    _drawRegion() {
      const ctx = this.ctx;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(this._off, this.pl, this.pt, this.pw, this.ph);
      ctx.restore();
      if (this.o.grid) this.drawGrid();
    }
    point(x, y, o = {}) {
      const ctx = this.ctx;
      const r = o.r || 6;
      ctx.save();
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      if (o.glow) {
        ctx.shadowColor = o.glow;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      if (o.shape === "square") ctx.rect(this.X(x) - r, this.Y(y) - r, 2 * r, 2 * r);
      else if (o.shape === "diamond") {
        ctx.moveTo(this.X(x), this.Y(y) - r * 1.25);
        ctx.lineTo(this.X(x) + r * 1.25, this.Y(y));
        ctx.lineTo(this.X(x), this.Y(y) + r * 1.25);
        ctx.lineTo(this.X(x) - r * 1.25, this.Y(y));
        ctx.closePath();
      } else if (o.shape === "star") {
        const cx = this.X(x), cy = this.Y(y);
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const rr = k % 2 ? r * 0.5 : r * 1.25;
          ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.closePath();
      } else ctx.arc(this.X(x), this.Y(y), r, 0, Math.PI * 2);
      if (o.fill !== null) {
        ctx.fillStyle = o.fill || C.qc;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (o.stroke !== null) {
        ctx.lineWidth = o.lw || 2;
        ctx.strokeStyle = o.stroke || "#fff";
        ctx.stroke();
      }
      ctx.restore();
    }
    scatter(pts, style) {
      for (const p of pts) this.point(p.x, p.y, style ? style(p) : { fill: QP.classColor(p.c) });
    }
    line(xs, ys, o = {}) {
      const ctx = this.ctx;
      ctx.save();
      if (!o.noclip) {
        ctx.beginPath();
        ctx.rect(this.pl - 2, this.pt - 2, this.pw + 4, this.ph + 4);
        ctx.clip();
      }
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < xs.length; i++) {
        if (!isFinite(ys[i])) {
          started = false;
          continue;
        }
        const px = this.X(xs[i]);
        const py = this.Y(ys[i]);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else ctx.lineTo(px, py);
      }
      ctx.lineWidth = o.width || 3;
      ctx.strokeStyle = o.color || C.qc;
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.stroke();
      if (o.fill) {
        ctx.lineTo(this.X(xs[xs.length - 1]), this.Y(o.fillTo == null ? this.o.ylim[0] : o.fillTo));
        ctx.lineTo(this.X(xs[0]), this.Y(o.fillTo == null ? this.o.ylim[0] : o.fillTo));
        ctx.closePath();
        ctx.fillStyle = o.fill;
        ctx.globalAlpha = 1;
        ctx.fill();
      }
      ctx.restore();
    }
    fn(f, o = {}) {
      const n = o.n || 200;
      const [a, b] = o.range || this.o.xlim;
      const xs = [];
      const ys = [];
      for (let i = 0; i <= n; i++) {
        const x = a + ((b - a) * i) / n;
        xs.push(x);
        ys.push(f(x));
      }
      this.line(xs, ys, o);
    }
    seg(x0, y0, x1, y1, o = {}) {
      this.line([x0, x1], [y0, y1], Object.assign({ width: 2 }, o));
    }
    arrow(x0, y0, x1, y1, o = {}) {
      const ctx = this.ctx;
      const X0 = this.X(x0), Y0 = this.Y(y0), X1 = this.X(x1), Y1 = this.Y(y1);
      const a = Math.atan2(Y1 - Y0, X1 - X0);
      const s = o.head || 10;
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = o.color || C.ink;
      ctx.lineWidth = o.width || 2.5;
      ctx.lineCap = "round";
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      ctx.moveTo(X0, Y0);
      ctx.lineTo(X1 - Math.cos(a) * s * 0.6, Y1 - Math.sin(a) * s * 0.6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(X1, Y1);
      ctx.lineTo(X1 - Math.cos(a - 0.45) * s, Y1 - Math.sin(a - 0.45) * s);
      ctx.lineTo(X1 - Math.cos(a + 0.45) * s, Y1 - Math.sin(a + 0.45) * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    rect(x0, y0, x1, y1, o = {}) {
      const ctx = this.ctx;
      const X0 = this.X(Math.min(x0, x1)), Y0 = this.Y(Math.max(y0, y1));
      const W = Math.abs(this.X(x1) - this.X(x0)), H = Math.abs(this.Y(y1) - this.Y(y0));
      ctx.save();
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.fillRect(X0, Y0, W, H);
      }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.width || 1.5;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.strokeRect(X0, Y0, W, H);
      }
      ctx.restore();
    }
    circle(x, y, rData, o = {}) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(this.X(x), this.Y(y), Math.abs(this.X(x + rData) - this.X(x)), Math.abs(this.Y(y + rData) - this.Y(y)), 0, 0, Math.PI * 2);
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.fill();
      }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.width || 2;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.stroke();
      }
      ctx.restore();
    }
    text(s, x, y, o = {}) {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = `${o.weight || 800} ${o.size || 12}px ${o.font === "head" ? HEAD : o.font === "mono" ? MONO : FONT}`;
      ctx.textAlign = o.align || "center";
      ctx.textBaseline = o.baseline || "middle";
      const px = o.px ? x : this.X(x);
      const py = o.px ? y : this.Y(y);
      if (o.bg) {
        const m = ctx.measureText(s);
        const w = m.width + 12;
        const hh = (o.size || 12) + 8;
        let bx = px - w / 2;
        if (ctx.textAlign === "left") bx = px - 6;
        if (ctx.textAlign === "right") bx = px - w + 6;
        ctx.fillStyle = o.bg;
        roundRect(ctx, bx, py - hh / 2, w, hh, hh / 2);
        ctx.fill();
      }
      ctx.fillStyle = o.color || C.ink;
      ctx.fillText(s, px, py);
      ctx.restore();
    }
    _bindPointer() {
      const c = this.c;
      const pos = (e) => {
        const r = c.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        return { px, py, x: this.ix(px), y: this.iy(py), e };
      };
      let down = false;
      c.addEventListener("pointerdown", (e) => {
        down = true;
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
        this.handlers.down && this.handlers.down(pos(e));
      });
      c.addEventListener("pointermove", (e) => {
        const p = pos(e);
        if (down) this.handlers.drag && this.handlers.drag(p);
        else this.handlers.hover && this.handlers.hover(p);
      });
      const up = (e) => {
        if (!down) return;
        down = false;
        this.handlers.up && this.handlers.up(pos(e));
      };
      c.addEventListener("pointerup", up);
      c.addEventListener("pointercancel", up);
      c.addEventListener("pointerleave", (e) => {
        if (!down) this.handlers.leave && this.handlers.leave(pos(e));
      });
    }
    on(handlers) {
      Object.assign(this.handlers, handlers);
      return this;
    }
    /** px distance between data points (in screen space) */
    pxDist(a, b) {
      return Math.hypot(this.X(a.x) - this.X(b.x), this.Y(a.y) - this.Y(b.y));
    }
    label(text, right = false) {
      const el = h("span", { class: "overlay-label" + (right ? " right" : "") }, text);
      this.stage.appendChild(el);
      return el;
    }
  }
  QP.Plot = Plot;

  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hh, r);
    ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  QP.roundRect = roundRect;

  // ================================================================ Chart (line charts)
  QP.chart = function (host, opts = {}) {
    const p = new Plot(host, Object.assign({ ticks: true, grid: true, aspect: 0.5, minH: 200, maxH: 320, pad: 12 }, opts));
    const legend = h("div", { class: "legend" });
    if (host) host.appendChild(legend);
    p.legendEl = legend;
    p.series = [];
    p.draw = function (series) {
      if (series) p.series = series;
      p.clear();
      for (const s of p.series) {
        if (s.points) {
          for (let i = 0; i < s.x.length; i++) p.point(s.x[i], s.y[i], { r: s.r || 4, fill: s.color, stroke: "#fff", lw: 1.5 });
        }
        if (s.line !== false) p.line(s.x, s.y, { color: s.color, width: s.width || 3, dash: s.dash, fill: s.fill });
      }
      if (p.marker != null) {
        p.seg(p.marker, p.o.ylim[0], p.marker, p.o.ylim[1], { color: C.ink3, width: 1.5, dash: [4, 5] });
      }
      legend.innerHTML = "";
      p.series.filter((s) => s.name).forEach((s) => legend.appendChild(h("span", null, h("i", { style: { background: s.color } }), s.name)));
    };
    p.onresize = () => p.draw();
    return p;
  };

  // ================================================================ Bloch sphere
  class Bloch {
    constructor(host, opts = {}) {
      this.o = Object.assign({ az: 0.55, el: 0.36, labels: "kets", size: 300, interactive: true, showAxes: true, ball: false }, opts);
      this.stage = h("div", { class: "widget-stage", style: { background: "radial-gradient(circle at 50% 40%, #fff, #f6f2ff)" } });
      this.c = h("canvas", { class: "grab" });
      this.stage.appendChild(this.c);
      if (host) host.appendChild(this.stage);
      this.ctx = this.c.getContext("2d");
      this.vectors = [];
      this.points = [];
      this.lines = [];
      this.axis = null;
      this.az = this.o.az;
      this.el = this.o.el;
      this.resize();
      if ("ResizeObserver" in window) new ResizeObserver(() => { this.resize(); this.draw(); }).observe(this.stage);
      if (this.o.interactive) this._bindDrag();
    }
    resize() {
      const w = Math.max(100, this.stage.clientWidth || this.o.size);
      const hh = Math.min(this.o.maxH || 420, Math.round(w * (this.o.aspect || 0.9)));
      const r = dpr();
      this.c.width = Math.round(w * r);
      this.c.height = Math.round(hh * r);
      this.c.style.height = hh + "px";
      this.w = w;
      this.h = hh;
      this.ctx.setTransform(r, 0, 0, r, 0, 0);
      this.R = Math.min(w, hh) * 0.36;
      this.cx = w / 2;
      this.cy = hh / 2 + 4;
    }
    basis() {
      const ca = Math.cos(this.az), sa = Math.sin(this.az), ce = Math.cos(this.el), se = Math.sin(this.el);
      return {
        d: [ce * ca, ce * sa, se],
        r: [-sa, ca, 0],
        u: [-se * ca, -se * sa, ce],
      };
    }
    project(v) {
      const b = this._b || this.basis();
      const sx = v[0] * b.r[0] + v[1] * b.r[1] + v[2] * b.r[2];
      const sy = v[0] * b.u[0] + v[1] * b.u[1] + v[2] * b.u[2];
      const dz = v[0] * b.d[0] + v[1] * b.d[1] + v[2] * b.d[2];
      return { x: this.cx + this.R * sx, y: this.cy - this.R * sy, z: dz };
    }
    circle3(f, n = 120) {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(this.project(f((i / n) * Math.PI * 2)));
      return pts;
    }
    strokeDepth(pts, front, back) {
      const ctx = this.ctx;
      for (let pass = 0; pass < 2; pass++) {
        const st = pass === 0 ? back : front;
        ctx.save();
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.width;
        ctx.globalAlpha = st.alpha;
        if (st.dash) ctx.setLineDash(st.dash);
        ctx.beginPath();
        for (let i = 1; i < pts.length; i++) {
          const isFront = (pts[i].z + pts[i - 1].z) / 2 >= 0;
          if ((pass === 1) === isFront) {
            ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineTo(pts[i].x, pts[i].y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    draw() {
      const ctx = this.ctx;
      this._b = this.basis();
      ctx.clearRect(0, 0, this.w, this.h);
      const R = this.R;
      // shadow under the sphere
      ctx.save();
      ctx.fillStyle = "rgba(60,40,120,0.08)";
      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy + R * 1.18, R * 0.8, R * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // glassy body
      const g = ctx.createRadialGradient(this.cx - R * 0.35, this.cy - R * 0.4, R * 0.1, this.cx, this.cy, R * 1.05);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.6, "rgba(226,218,255,0.55)");
      g.addColorStop(1, "rgba(185,167,255,0.55)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(123,92,250,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (this.o.ball && this.ballR != null) {
        // inner ball for mixed states
        ctx.save();
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = "rgba(123,92,250,0.4)";
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, R * this.ballR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const front = { color: "rgba(76,60,140,0.45)", width: 1.4, alpha: 1 };
      const back = { color: "rgba(76,60,140,0.3)", width: 1.1, alpha: 1, dash: [3, 5] };
      this.strokeDepth(this.circle3((t) => [Math.cos(t), Math.sin(t), 0]), front, back);
      this.strokeDepth(this.circle3((t) => [Math.cos(t), 0, Math.sin(t)]), { ...front, color: "rgba(76,60,140,0.22)" }, { ...back, color: "rgba(76,60,140,0.16)" });
      this.strokeDepth(this.circle3((t) => [0, Math.cos(t), Math.sin(t)]), { ...front, color: "rgba(76,60,140,0.22)" }, { ...back, color: "rgba(76,60,140,0.16)" });
      if (this.o.showAxes) this.drawAxes();
      if (this.axis) this.drawRotAxis(this.axis);
      // helper lines (e.g. projections onto the axes)
      for (const l of this.lines) {
        const a = this.project(l.a), b = this.project(l.b);
        ctx.save();
        ctx.strokeStyle = l.color || "rgba(76,60,140,0.5)";
        ctx.lineWidth = l.width || 2;
        if (l.dash) ctx.setLineDash(l.dash);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
      // trails
      for (const v of this.vectors) if (v.trail && v.trail.length > 1) this.drawTrail(v);
      // sort vectors/points by depth so nearer ones are drawn last
      const items = [];
      for (const p of this.points) items.push({ kind: "p", o: p, z: this.project(p.v).z });
      for (const v of this.vectors) items.push({ kind: "v", o: v, z: this.project(v.v).z });
      items.sort((a, b) => a.z - b.z);
      for (const it of items) {
        if (it.kind === "p") this.drawPoint(it.o);
        else this.drawVector(it.o);
      }
    }
    drawAxes() {
      const ctx = this.ctx;
      const L = 1.22;
      const axes = [
        { v: [1, 0, 0], label: this.o.labels === "xyz" ? "x" : "|+⟩", neg: this.o.labels === "xyz" ? "" : "|−⟩" },
        { v: [0, 1, 0], label: this.o.labels === "xyz" ? "y" : "|+i⟩", neg: this.o.labels === "xyz" ? "" : "|−i⟩" },
        { v: [0, 0, 1], label: this.o.labels === "xyz" ? "z" : "|0⟩", neg: this.o.labels === "xyz" ? "" : "|1⟩" },
      ];
      for (const a of axes) {
        const p1 = this.project(a.v.map((x) => x * L));
        const p0 = this.project(a.v.map((x) => -x * L));
        const o = this.project([0, 0, 0]);
        ctx.save();
        ctx.strokeStyle = "rgba(76,60,140,0.35)";
        ctx.lineWidth = 1.3;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(76,60,140,0.5)";
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.restore();
        const lp = this.project(a.v.map((x) => x * (L + 0.14)));
        const ln = this.project(a.v.map((x) => -x * (L + 0.14)));
        this.label(a.label, lp.x, lp.y, lp.z >= 0 ? 1 : 0.55);
        if (a.neg) this.label(a.neg, ln.x, ln.y, ln.z >= 0 ? 1 : 0.55);
      }
    }
    label(s, x, y, alpha = 1) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `600 ${Math.max(11, Math.round(this.R * 0.11))}px ${HEAD}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const m = ctx.measureText(s);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      roundRect(ctx, x - m.width / 2 - 5, y - 10, m.width + 10, 20, 10);
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.fillText(s, x, y + 0.5);
      ctx.restore();
    }
    drawRotAxis(ax) {
      const ctx = this.ctx;
      const n = Math.hypot(...ax.v);
      const u = ax.v.map((x) => x / n);
      const p1 = this.project(u.map((x) => x * 1.35));
      const p0 = this.project(u.map((x) => -x * 1.35));
      ctx.save();
      ctx.strokeStyle = ax.color || "rgba(255,143,184,0.9)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.shadowColor = ax.color || "#ff8fb8";
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.restore();
    }
    drawTrail(v) {
      const ctx = this.ctx;
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 1; i < v.trail.length; i++) {
        const a = this.project(v.trail[i - 1]);
        const b = this.project(v.trail[i]);
        ctx.strokeStyle = v.color || C.pink;
        ctx.globalAlpha = 0.15 + 0.55 * (i / v.trail.length);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    drawPoint(p) {
      const ctx = this.ctx;
      const q = this.project(p.v);
      ctx.save();
      ctx.globalAlpha = q.z >= 0 ? 1 : 0.5;
      ctx.fillStyle = p.color || C.c1;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (p.shape === "star") {
        const r = p.r || 9;
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const rr = k % 2 ? r * 0.48 : r * 1.25;
          ctx.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.strokeStyle = "rgba(44,40,66,0.8)";
        ctx.shadowColor = "rgba(255,214,107,0.9)";
        ctx.shadowBlur = 10;
      } else ctx.arc(q.x, q.y, p.r || 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    }
    drawVector(v) {
      const ctx = this.ctx;
      const o = this.project([0, 0, 0]);
      const t = this.project(v.v);
      const col = v.color || "#ff6fa3";
      // projection helpers
      if (v.shadow) {
        const s = this.project([v.v[0], v.v[1], 0]);
        ctx.save();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = "rgba(76,60,140,0.4)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(s.x, s.y);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = col;
      ctx.lineWidth = v.width || 4;
      ctx.shadowColor = "rgba(60,40,120,0.25)";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      const rr = v.tip || Math.max(6, this.R * 0.07);
      const gg = ctx.createRadialGradient(t.x - rr * 0.35, t.y - rr * 0.35, rr * 0.1, t.x, t.y, rr);
      gg.addColorStop(0, "#fff");
      gg.addColorStop(1, col);
      ctx.fillStyle = gg;
      ctx.strokeStyle = "rgba(44,40,66,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      if (v.label) {
        ctx.font = `700 12px ${FONT}`;
        ctx.fillStyle = col;
        ctx.textAlign = "left";
        ctx.fillText(v.label, t.x + rr + 4, t.y - rr);
      }
      ctx.restore();
    }
    _bindDrag() {
      let last = null;
      this.c.addEventListener("pointerdown", (e) => {
        last = [e.clientX, e.clientY];
        this.c.classList.add("grabbing");
        try { this.c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      this.c.addEventListener("pointermove", (e) => {
        if (!last) return;
        const dx = e.clientX - last[0];
        const dy = e.clientY - last[1];
        last = [e.clientX, e.clientY];
        this.az -= dx * 0.01;
        this.el = Math.max(-1.2, Math.min(1.2, this.el + dy * 0.01));
        this.draw();
      });
      const end = () => {
        last = null;
        this.c.classList.remove("grabbing");
      };
      this.c.addEventListener("pointerup", end);
      this.c.addEventListener("pointercancel", end);
    }
    /** Animate vector i rotating by `angle` around axis n (Rodrigues). */
    rotate(i, n, angle, ms = 700, done) {
      const v = this.vectors[i];
      const start = v.v.slice();
      const L = Math.hypot(...n);
      const k = n.map((x) => x / L);
      const t0 = performance.now();
      const token = (this._rotToken = (this._rotToken || 0) + 1);
      this.axis = { v: k, color: "rgba(255,143,184,0.95)" };
      v.trail = [start.slice()];
      const step = (now) => {
        let t = Math.min(1, (now - t0) / ms);
        if (QP.reduceMotion) t = 1;
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        v.v = rodrigues(start, k, angle * e);
        if (v.trail) v.trail.push(v.v.slice());
        this.draw();
        if (t < 1) requestAnimationFrame(step);
        else {
          setTimeout(() => {
            if (this._rotToken !== token) return; // a newer rotation owns the axis and trail
            this.axis = null;
            v.trail = null;
            this.draw();
          }, 450);
          done && done();
        }
      };
      requestAnimationFrame(step);
    }
  }
  function rodrigues(v, k, a) {
    const c = Math.cos(a), s = Math.sin(a);
    const kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    return [0, 1, 2].map((i) => v[i] * c + cr[i] * s + k[i] * kv * (1 - c));
  }
  QP.rodrigues = rodrigues;
  QP.Bloch = Bloch;

  // ================================================================ Bars (amplitudes / probabilities)
  QP.bars = function (host, opts = {}) {
    const o = Object.assign({ labels: ["|0⟩", "|1⟩"], max: 1, height: 170, fmt: (v) => v.toFixed(2), colors: null, phase: false, title: "" }, opts);
    const wrap = h("div", { style: { display: "grid", gridTemplateColumns: `repeat(${o.labels.length}, minmax(0,1fr))`, gap: "10px", alignItems: "end", padding: "10px 6px 4px" } });
    const items = o.labels.map((lab, i) => {
      const val = h("div", { style: { fontFamily: MONO, fontWeight: 600, fontSize: "0.8rem", color: C.ink2, textAlign: "center", marginBottom: "4px", minHeight: "1.2em" } });
      const fill = h("div", { style: { position: "absolute", left: "0", right: "0", bottom: "0", height: "0%", borderRadius: "12px 12px 6px 6px", transition: "height .55s cubic-bezier(.34,1.56,.64,1), background .3s", background: (o.colors && o.colors[i]) || "linear-gradient(180deg,#b9a7ff,#7b5cfa)" } });
      const shine = h("div", { style: { position: "absolute", left: "18%", top: "6px", width: "18%", bottom: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.22)", pointerEvents: "none" } });
      fill.appendChild(shine);
      const track = h("div", { style: { position: "relative", height: o.height + "px", borderRadius: "12px 12px 6px 6px", background: "rgba(123,92,250,0.07)", overflow: "hidden" } }, fill);
      const dial = o.phase ? h("canvas", { width: 44, height: 44, style: { width: "22px", height: "22px", margin: "6px auto 0" } }) : null;
      const label = h("div", { style: { fontFamily: HEAD, fontWeight: 600, textAlign: "center", marginTop: "6px", color: C.ink } }, lab);
      const col = h("div", null, val, track, dial, label);
      wrap.appendChild(col);
      return { val, fill, dial, label };
    });
    if (host) host.appendChild(wrap);
    wrap.set = (values, phases) => {
      values.forEach((v, i) => {
        const it = items[i];
        if (!it) return;
        const frac = Math.max(0, Math.min(1, Math.abs(v) / o.max));
        it.fill.style.height = frac * 100 + "%";
        it.val.textContent = o.fmt(v, i);
        if (phases) {
          const ph = phases[i];
          it.fill.style.background = phaseGradient(ph);
          if (it.dial) drawDial(it.dial, ph, frac > 1e-6);
        }
      });
    };
    wrap.items = items;
    return wrap;
  };
  function phaseGradient(ph) {
    const hue = (((ph * 180) / Math.PI) % 360 + 360 + 260) % 360;
    return `linear-gradient(180deg, hsl(${hue} 90% 80%), hsl(${hue} 75% 62%))`;
  }
  QP.phaseColor = (ph, l = 64) => {
    const hue = (((ph * 180) / Math.PI) % 360 + 360 + 260) % 360;
    return `hsl(${hue} 78% ${l}%)`;
  };
  function drawDial(cv, ph, on) {
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 44, 44);
    ctx.beginPath();
    ctx.arc(22, 22, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = on ? QP.phaseColor(ph) : "#ddd";
    ctx.stroke();
    if (!on) return;
    ctx.beginPath();
    ctx.moveTo(22, 22);
    ctx.lineTo(22 + 15 * Math.cos(-ph), 22 + 15 * Math.sin(-ph));
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }

  // ================================================================ Histogram of counts
  QP.hist = function (host, opts = {}) {
    const o = Object.assign({ labels: ["0", "1"], height: 150, colors: null }, opts);
    const wrap = h("div", { style: { display: "grid", gridTemplateColumns: `repeat(${o.labels.length}, minmax(0,1fr))`, gap: "8px", alignItems: "end", padding: "8px 4px 2px" } });
    const items = o.labels.map((lab, i) => {
      const val = h("div", { style: { fontFamily: MONO, fontWeight: 600, fontSize: "0.78rem", color: C.ink2, textAlign: "center", marginBottom: "4px" } }, "0");
      const fill = h("div", { style: { position: "absolute", left: "8%", right: "8%", bottom: "0", height: "0%", borderRadius: "10px 10px 4px 4px", transition: "height .35s cubic-bezier(.22,1,.36,1)", background: (o.colors && o.colors[i]) || "linear-gradient(180deg,#ffc2a8,#ff8a5c)" } });
      const track = h("div", { style: { position: "relative", height: o.height + "px", borderBottom: "2px solid rgba(76,60,140,.18)" } }, fill);
      const label = h("div", { style: { fontFamily: MONO, fontWeight: 600, textAlign: "center", marginTop: "6px", fontSize: "0.86rem", color: C.ink } }, lab);
      wrap.appendChild(h("div", null, val, track, label));
      return { val, fill };
    });
    if (host) host.appendChild(wrap);
    wrap.set = (counts, maxOverride) => {
      const max = maxOverride || Math.max(1, ...counts);
      counts.forEach((c, i) => {
        items[i].fill.style.height = (c / max) * 100 + "%";
        items[i].val.textContent = String(c);
      });
    };
    return wrap;
  };

  // ================================================================ Circuit diagrams (SVG)
  const GATE_COLORS = {
    H: ["#ffd6e6", "#ff76a8"], X: ["#d6defe", "#5577f5"], Y: ["#d6defe", "#5577f5"], Z: ["#e6dcff", "#7b5cfa"],
    S: ["#e6dcff", "#7b5cfa"], T: ["#e6dcff", "#7b5cfa"], RX: ["#ffe9c2", "#f0ac2e"], RY: ["#ffe9c2", "#f0ac2e"], RZ: ["#ffe9c2", "#f0ac2e"],
    P: ["#ffe9c2", "#f0ac2e"], M: ["#ffffff", "#2c2842"], ENC: ["#ccf2e7", "#17a98c"], W: ["#ffe5dc", "#ff7a59"],
  };
  QP.circuit = function (host, opts = {}) {
    const o = Object.assign({ n: 1, gates: [], cell: 58, wireLabels: null, minCols: 4, onGateClick: null, highlight: -1 }, opts);
    const wrap = h("div", { style: { overflowX: "auto", padding: "4px 0" } });
    if (host) host.appendChild(wrap);
    function layout(gates) {
      const busy = new Array(o.n).fill(0);
      return gates.map((g) => {
        const qs = g.name === "CSWAP" ? [g.c, g.q, g.q2] : g.c != null ? [g.c, g.t] : g.q2 != null ? [g.q, g.q2] : [g.q];
        const lo = Math.min(...qs), hi = Math.max(...qs);
        let col = 0;
        for (let q = lo; q <= hi; q++) col = Math.max(col, busy[q]);
        if (g.col != null) col = Math.max(col, g.col); // a fixed time slot, when the caller gives one
        for (let q = lo; q <= hi; q++) busy[q] = col + 1;
        return col;
      });
    }
    wrap.render = function (gates = o.gates, highlight = o.highlight) {
      o.gates = gates;
      const cols = layout(gates);
      const ncol = Math.max(o.minCols, cols.length ? Math.max(...cols) + 1 : 0);
      const cw = o.cell, left = 52, top = 26;
      const W = left + ncol * cw + 30;
      const H = top + o.n * cw;
      const yy = (q) => top + q * cw + cw / 2 - 6;
      let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${Math.round(W * (o.scale || 1.4))}px;height:auto;display:block;font-family:${HEAD}">`;
      for (let q = 0; q < o.n; q++) {
        const y = yy(q);
        const lab = o.wireLabels ? o.wireLabels[q] : `q${q}`;
        s += `<text x="10" y="${y + 5}" font-size="15" font-weight="600" fill="${C.ink2}">${lab}</text>`;
        s += `<line x1="44" y1="${y}" x2="${W - 12}" y2="${y}" stroke="${C.ink}" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`;
      }
      // highlight one column, or a range [from, to]
      const [h0, h1] = Array.isArray(highlight) ? highlight : [highlight, highlight];
      if (h0 >= 0) {
        s += `<rect x="${left + h0 * cw + 2}" y="6" width="${(h1 - h0 + 1) * cw - 4}" height="${H - 12}" rx="14" fill="#ffd66b" fill-opacity=".28"/>`;
      }
      gates.forEach((g, i) => {
        const x = left + cols[i] * cw + cw / 2;
        const data = `data-i="${i}" style="cursor:${o.onGateClick ? "pointer" : "default"}"`;
        if (g.name === "CX" || g.name === "CZ") {
          const yc = yy(g.c), yt = yy(g.t);
          s += `<g ${data}><line x1="${x}" y1="${yc}" x2="${x}" y2="${yt}" stroke="${C.ink}" stroke-width="2.5"/>`;
          s += `<circle cx="${x}" cy="${yc}" r="7" fill="${C.ink}"/>`;
          if (g.name === "CX") s += `<circle cx="${x}" cy="${yt}" r="15" fill="#fff" stroke="${C.ink}" stroke-width="2.5"/><path d="M${x - 15} ${yt} H${x + 15} M${x} ${yt - 15} V${yt + 15}" stroke="${C.ink}" stroke-width="2.5"/>`;
          else s += `<circle cx="${x}" cy="${yt}" r="7" fill="${C.ink}"/>`;
          s += `</g>`;
          return;
        }
        if (g.name === "BOX") {
          // a block spanning wires q..q2, e.g. an oracle U_f
          const ya = yy(Math.min(g.q, g.q2)), yb = yy(Math.max(g.q, g.q2));
          s += `<g ${data}><rect x="${x - 22}" y="${ya - 20}" width="44" height="${yb - ya + 40}" rx="12" fill="#ffe5dc" stroke="#ff7a59" stroke-width="2.5"/>`;
          s += `<text x="${x}" y="${(ya + yb) / 2 + 6}" text-anchor="middle" font-size="17" font-weight="600" fill="${C.ink}">${g.label || "U"}</text></g>`;
          return;
        }
        if (g.name === "CSWAP") {
          // a controlled SWAP (Fredkin): a dot on the control, crosses on the two swapped wires
          const ys = [yy(g.c), yy(g.q), yy(g.q2)];
          s += `<g ${data}><line x1="${x}" y1="${Math.min(...ys)}" x2="${x}" y2="${Math.max(...ys)}" stroke="${C.ink}" stroke-width="2.5"/>`;
          s += `<circle cx="${x}" cy="${yy(g.c)}" r="7" fill="${C.ink}"/>`;
          for (const yv of [yy(g.q), yy(g.q2)]) s += `<path d="M${x - 8} ${yv - 8} L${x + 8} ${yv + 8} M${x + 8} ${yv - 8} L${x - 8} ${yv + 8}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
          s += `</g>`;
          return;
        }
        if (g.name === "SWAP") {
          const ya = yy(g.q), yb = yy(g.q2);
          s += `<g ${data}><line x1="${x}" y1="${ya}" x2="${x}" y2="${yb}" stroke="${C.ink}" stroke-width="2.5"/>`;
          for (const yv of [ya, yb]) s += `<path d="M${x - 8} ${yv - 8} L${x + 8} ${yv + 8} M${x + 8} ${yv - 8} L${x - 8} ${yv + 8}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
          s += `</g>`;
          return;
        }
        const y = yy(g.q);
        const [fill, stroke] = GATE_COLORS[g.name] || GATE_COLORS[g.kind] || ["#eee", C.ink];
        if (g.name === "M") {
          s += `<g ${data}><rect x="${x - 19}" y="${y - 19}" width="38" height="38" rx="9" fill="#fff" stroke="${C.ink}" stroke-width="2.5"/>`;
          s += `<path d="M${x - 11} ${y + 7} A12 12 0 0 1 ${x + 11} ${y + 7}" stroke="${C.ink}" stroke-width="2.4" fill="none"/>`;
          s += `<line x1="${x}" y1="${y + 7}" x2="${x + 8}" y2="${y - 7}" stroke="#ff76a8" stroke-width="2.6" stroke-linecap="round"/></g>`;
          return;
        }
        const label = g.label || g.name;
        const wide = label.length > 2 || g.param != null;
        const gw = wide ? 46 : 38;
        s += `<g ${data}><rect x="${x - gw / 2}" y="${y - 19}" width="${gw}" height="38" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
        s += `<text x="${x}" y="${y + (g.param != null ? 1 : 6)}" text-anchor="middle" font-size="${label.length > 2 ? 13 : 17}" font-weight="600" fill="${C.ink}">${label}</text>`;
        if (g.param != null) s += `<text x="${x}" y="${y + 14}" text-anchor="middle" font-size="10" font-weight="600" fill="${C.ink2}" font-family="${FONT}">${g.param}</text>`;
        s += `</g>`;
      });
      s += `</svg>`;
      wrap.innerHTML = s;
      if (o.onGateClick)
        wrap.querySelectorAll("g[data-i]").forEach((el) => el.addEventListener("click", () => o.onGateClick(Number(el.dataset.i))));
    };
    wrap.render();
    return wrap;
  };

  // ================================================================ tiny animation helper
  QP.animate = function (ms, frame, done) {
    const t0 = performance.now();
    let stopped = false;
    function step(now) {
      if (stopped) return;
      const t = QP.reduceMotion ? 1 : Math.min(1, (now - t0) / ms);
      frame(t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, t);
      if (t < 1) requestAnimationFrame(step);
      else done && done();
    }
    requestAnimationFrame(step);
    return { stop: () => (stopped = true) };
  };
  QP.loop = function (fn) {
    let on = true;
    let last = performance.now();
    function step(now) {
      if (!on) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (fn(dt) === false) on = false;
      if (on) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return { stop: () => (on = false), get running() { return on; } };
  };
})();

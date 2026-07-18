/* yasuo.js — Yasuo (League of Legends) flavour layer, all decorative and self-contained:
 *   1. Wind cursor trail — cyan leaves drift off the cursor like Steel Tempest (desktop only)
 *   2. "Hasagi" easter egg — type "hasagi" and a katana slash sweeps the screen
 * Honours prefers-reduced-motion; nothing here is required for the page to work. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = window.matchMedia("(min-width: 768px)").matches;

  /* ---------------- 1. Wind cursor trail (Steel Tempest) ---------------- */
  function windTrail() {
    if (!desktop || reduce) return;
    var canvas = document.createElement("canvas");
    canvas.id = "wind-trail";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "40", pointerEvents: "none" });
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var W, H;
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    var parts = [], mx = 0, my = 0, moved = false, lastSpawn = 0;
    window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; moved = true; });

    function spawn() {
      parts.push({
        x: mx + (Math.random() - 0.5) * 8,
        y: my + (Math.random() - 0.5) * 8,
        vx: -0.7 - Math.random() * 0.8,            // drift left — the wind, gentle
        vy: (Math.random() - 0.5) * 0.7,
        life: 1, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.16,
        size: 1.3 + Math.random() * 1.6,
      });
      if (parts.length > 55) parts.splice(0, parts.length - 55);
    }

    var last = 0;
    function frame(t) {
      requestAnimationFrame(frame);
      if (t - last < 24) return; // ~40fps
      last = t;
      ctx.clearRect(0, 0, W, H);
      if (moved && t - lastSpawn > 48) { spawn(); lastSpawn = t; moved = false; }
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.01; p.rot += p.vr; p.life -= 0.02;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        var L = p.size * 4.4, w = p.size * 1.5; // leaf length / half-width
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life * 0.4;
        ctx.fillStyle = p.life > 0.5 ? "#a5f3fc" : "#22d3ee"; // fresh cyan → deep cyan as it fades
        ctx.beginPath();
        ctx.moveTo(0, -L / 2);                       // tip
        ctx.quadraticCurveTo(w, 0, 0, L / 2);        // right edge to the base
        ctx.quadraticCurveTo(-w, 0, 0, -L / 2);      // left edge back to the tip
        ctx.fill();
        ctx.globalAlpha = p.life * 0.5;              // faint midrib vein
        ctx.strokeStyle = "rgba(8,32,40,0.55)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -L / 2 + 0.5);
        ctx.lineTo(0, L / 2 - 0.5);
        ctx.stroke();
        ctx.restore();
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 2. "Hasagi" easter egg ---------------- */
  function hasagi() {
    var buf = "", busy = false;
    function trigger() {
      if (busy) return;
      busy = true;
      var overlay = document.createElement("div");
      overlay.id = "hasagi-overlay";
      var slash = document.createElement("div");
      slash.className = "hasagi-slash go";
      var txt = document.createElement("div");
      txt.className = "hasagi-text go";
      txt.innerHTML =
        '<div class="hasagi-kanji">ハサギ</div><div class="hasagi-roman">HASAGI!</div>';
      overlay.appendChild(slash);
      overlay.appendChild(txt);
      document.body.appendChild(overlay);
      window.setTimeout(function () { overlay.remove(); busy = false; }, 1300);
    }
    window.addEventListener("keydown", function (e) {
      var el = e.target, tag = (el && el.tagName ? el.tagName : "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (el && el.isContentEditable)) return;
      if (e.key && e.key.length === 1) {
        buf = (buf + e.key.toLowerCase()).slice(-6);
        if (buf === "hasagi") trigger();
      }
    });
  }

  /* ---------------- 3. Wind entrance — a whirlwind (Steel Tempest) spins the site in ----------------
   * When the boot/loading screen finishes, a spinning tornado forms, the page is revealed mid-spin,
   * and the funnel then bursts outward and dissipates. No-op if the visitor already skipped boot. */
  function windEntrance() {
    var boot = document.getElementById("boot");
    if (reduce) { if (boot) boot.classList.add("boot-skip"); return; }
    if (!boot || boot.classList.contains("boot-skip")) { if (boot) boot.style.display = "none"; return; }

    var c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    Object.assign(c.style, { position: "fixed", inset: "0", zIndex: "10000", pointerEvents: "none" });
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    if (!ctx) { boot.classList.add("boot-skip"); c.remove(); return; }
    var W = (c.width = window.innerWidth), H = (c.height = window.innerHeight);
    var TAU = Math.PI * 2, baseY = H * 0.97, span = H * 0.94;

    // Phones get a lighter funnel (fewer wisps/strands/rings) so the entrance stays smooth there.
    var N_BITS = desktop ? 300 : 110;
    var N_STRANDS = desktop ? 26 : 12;
    var N_RINGS = desktop ? 24 : 12;
    var N_LINES = desktop ? 26 : 10;

    // swirling debris/leaves caught in the funnel
    var bits = [];
    for (var i = 0; i < N_BITS; i++) {
      bits.push({ h: Math.random(), ang: Math.random() * TAU, spd: 0.09 + Math.random() * 0.12, rf: 0.5 + Math.random() * 0.8, sz: 1 + Math.random() * 2.2 });
    }
    function funnelR(h, grow) { return (6 + Math.pow(h, 1.6) * W * 0.13) * grow; } // widens toward the top

    var start = null, DUR = 3100;
    function draw(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / DUR);
      var sweep = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOut across the screen
      var cx = -W * 0.12 + sweep * (W * 1.24);
      var alpha = Math.min(1, p / 0.16) * (p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.18) : 1);
      var grow = 0.8 + Math.min(1, p / 0.5) * 0.3;
      var spin = t * 0.0072;

      // fade the whole canvas toward TRANSPARENT each frame (not black): strands + debris leave
      // long fading wind-streak trails, while the page stays visible through the canvas.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";

      // gusty horizontal wind speed-lines swept behind the funnel — turbulent texture (they smear
      // into streaks thanks to the long trail above)
      for (var wl = 0; wl < N_LINES; wl++) {
        var wy = Math.random() * H;
        var wlen = 28 + Math.random() * 130;
        var wx = cx - 30 - Math.random() * (W * 0.42);
        ctx.strokeStyle = "rgba(34,211,238," + (0.05 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + wlen, wy); ctx.stroke();
      }
      // horizontal wind rings wrapping the funnel — the main "texture"
      for (var m = 0; m < N_RINGS; m++) {
        var hb = m / (N_RINGS - 1), ry = baseY - hb * span, rr0 = funnelR(hb, grow);
        ctx.beginPath();
        ctx.ellipse(cx + Math.sin(spin + hb * 4) * rr0 * 0.15, ry, rr0, rr0 * 0.17, 0, 0, TAU);
        ctx.strokeStyle = "rgba(103,232,249," + (0.07 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // outer helical strands of the funnel (denser)
      for (var k = 0; k < N_STRANDS; k++) {
        var base = (k / N_STRANDS) * TAU;
        ctx.beginPath();
        for (var s = 0; s <= 1.0001; s += 0.045) {
          var y = baseY - s * span, r = funnelR(s, grow);
          var x = cx + Math.sin(base + spin + s * 8) * r;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(34,211,238," + (0.10 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      // brighter inner core strands
      for (var k2 = 0; k2 < 4; k2++) {
        var base2 = (k2 / 4) * TAU + spin * 1.3;
        ctx.beginPath();
        for (var s2 = 0; s2 <= 1.0001; s2 += 0.055) {
          var y2 = baseY - s2 * span, r2 = funnelR(s2, grow) * 0.42;
          var x2 = cx + Math.sin(base2 + s2 * 8) * r2;
          if (s2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = "rgba(165,243,252," + (0.15 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Swirling wind wisps: each is a short arc that follows the funnel's rotation, so the motion
      // reads as air being dragged around the vortex rather than as floating dots.
      for (var b = 0; b < bits.length; b++) {
        var d = bits[b];
        d.ang += d.spd; d.h += 0.006; if (d.h > 1) d.h -= 1;
        var yy = baseY - d.h * span, rd = funnelR(d.h, grow) * d.rf;
        var a0 = d.ang + spin;
        var depth = (Math.sin(a0) + 1) / 2;                 // 0 back .. 1 front
        var arcLen = 0.5 + d.spd * 4;                       // faster motes smear into longer arcs
        ctx.globalAlpha = alpha * (0.12 + 0.6 * depth);
        ctx.strokeStyle = depth > 0.6 ? "#cffafe" : "#22d3ee";
        ctx.lineWidth = d.sz * 0.8;
        ctx.beginPath();
        for (var q = 0; q <= 1.0001; q += 0.25) {
          var aq = a0 - arcLen * q;                         // trail behind the leading point
          var xq = cx + Math.cos(aq) * rd;
          var yq = yy + Math.sin(aq) * rd * 0.16;           // squashed ellipse = perspective
          if (q === 0) ctx.moveTo(xq, yq); else ctx.lineTo(xq, yq);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Reveal the page IN THE TORNADO'S WAKE: mask the loading overlay away up to the funnel's
      // position, with a feathered edge, so the site materialises behind the whirlwind as it passes.
      var edge = (cx / W) * 100;
      var feather = 9;
      var mask = "linear-gradient(90deg, transparent " + (edge - feather).toFixed(2) + "%, black " + edge.toFixed(2) + "%)";
      boot.style.webkitMaskImage = mask;
      boot.style.maskImage = mask;
      if (p > 0.9) boot.style.opacity = String(Math.max(0, 1 - (p - 0.9) / 0.1)); // clean finish

      if (p < 1) requestAnimationFrame(draw);
      else { boot.classList.add("boot-skip"); boot.style.display = "none"; c.remove(); }
    }
    requestAnimationFrame(draw);
  }

  function boot() {
    try { windTrail(); } catch (e) {}
    try { hasagi(); } catch (e) {}
    try { if (document.getElementById("boot")) window.setTimeout(windEntrance, 1500); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

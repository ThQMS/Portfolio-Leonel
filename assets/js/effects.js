/* effects.js — ambient dev/architecture effects, all decorative and self-contained:
 *   1. Wind Wall         — cyan wall of wind that destroys red threats drifting in (Yasuo / defense)
 *   2. Compile bar       — top scroll-progress bar styled as a test-run meter
 *   3. Blueprint spine   — a left-gutter system trace that draws as you scroll (lg+)
 * Everything degrades gracefully and honours prefers-reduced-motion.
 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 1. Wind Wall — the signature ambient effect ----------------
   * Red "threats" (XSS, SQLi, CVE…) drift in from the right and are destroyed the moment
   * they touch a shimmering cyan wall of wind — Yasuo's Wind Wall as a literal metaphor for
   * defensive security / QA: barring what is bad before it ever reaches the user. Purely
   * decorative, low-opacity, behind the content; skipped on phones and under reduced-motion. */
  function initWindWall() {
    if (window.matchMedia("(max-width: 767px)").matches) return; // skip the animated canvas on phones
    var shell = document.querySelector(".min-h-screen.bg-dark-200") || document.body;
    var canvas = document.createElement("canvas");
    canvas.id = "windwall-bg";
    canvas.setAttribute("aria-hidden", "true");
    shell.insertBefore(canvas, shell.firstChild); // above shell bg, below content
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var THREATS = ["XSS", "SQLi", "CVE-9.8", "0xDEAD", "' OR 1=1", "<script>", "DROP TABLE", "404", "NULL", "⚠"];
    var wallX = 0;
    var threats = [];
    var particles = [];
    var passes = [];
    var phase = 0;
    // Dense field of air motes rising inside the wall (normalized coords, size-independent).
    var wallParts = [];
    for (var wp = 0; wp < 260; wp++) {
      wallParts.push({
        hn: Math.random(),                       // height 0 (base) .. 1 (top)
        xf: Math.random(),                       // position across the wall
        spd: 0.0025 + Math.random() * 0.006,     // rise speed
        sz: 0.6 + Math.random() * 1.9,           // mote size
        ph: Math.random() * Math.PI * 2,         // turbulence phase
        tw: 0.6 + Math.random() * 1.8,           // turbulence width
        core: Math.random() > 0.72,              // a few brighter motes
      });
    }
    var flashes = [];        // brief bright ripples where a threat is blocked
    var WALL_W = 78;
    var LEAN = 0;            // 0 = upright wall; raise it to lean the wall across the screen
    function wallTop() { return canvas.height * 0.04; }
    function wallBot() { return canvas.height * 0.99; }
    // Shield face: upright by default (LEAN 0), with a gentle bulge toward the incoming threats.
    function wallFaceX(y) {
      var top = wallTop(), bot = wallBot(), mid = (top + bot) / 2, half = (bot - top) / 2;
      var n = Math.max(-1, Math.min(1, (y - mid) / half));
      return wallX - n * half * LEAN + (1 - n * n) * 14;
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      wallX = canvas.width * 0.40; // the wall sits left-of-centre; threats cross the page to reach it
    }
    resize();
    window.addEventListener("resize", resize);

    if (reduce) return; // no animation when reduced motion is requested

    function spawnThreat() {
      threats.push({
        x: canvas.width + 30,
        y: canvas.height * 0.08 + Math.random() * canvas.height * 0.86, // within the wall's vertical span
        speed: 1.3 + Math.random() * 2.4,
        text: THREATS[(Math.random() * THREATS.length) | 0],
      });
    }

    function burst(x, y) {
      for (var i = 0; i < 10; i++) {
        var a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 2.2;
        particles.push({ x: x, y: y, vx: Math.cos(a) * sp - 1.2, vy: Math.sin(a) * sp, life: 1 });
      }
      if (Math.random() > 0.55) passes.push({ x: wallX - 10 - Math.random() * 40, y: y, life: 1 });
    }

    // Yasuo's Wind Wall: a dense field of rising air particles — dense at the base, splaying and
    // thinning toward the top, with a soft glowing seam on the face that destroys threats.
    function drawWall() {
      phase += 0.035;
      var top = wallTop(), bot = wallBot();

      var Hh = bot - top;
      // Soft body: densest at the base, dissolving toward the top — no hard rectangle edges.
      var body = ctx.createLinearGradient(0, bot, 0, top);
      body.addColorStop(0, "rgba(34,211,238,0.14)");
      body.addColorStop(0.55, "rgba(34,211,238,0.07)");
      body.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = body;
      ctx.beginPath();
      for (var yy = bot; yy >= top; yy -= 6) {
        var f = (bot - yy) / Hh;                                   // 0 base .. 1 top
        var spread = 1 + f * 0.55;                                 // splays as it rises
        ctx.lineTo(wallFaceX(yy) + Math.sin(yy * 0.02 + phase) * 4 * spread, yy);
      }
      for (var yb = top; yb <= bot; yb += 6) {
        var f2 = (bot - yb) / Hh, spread2 = 1 + f2 * 0.55;
        ctx.lineTo(wallFaceX(yb) - WALL_W * spread2 + Math.sin(yb * 0.02 + phase) * 4, yb);
      }
      ctx.closePath();
      ctx.fill();

      // Veils of moving air: overlapping translucent sheets that undulate, splay and dissolve as
      // they rise. Filled shapes only — no lines, no dots — so it reads as volume of moving air.
      for (var v = 0; v < 9; v++) {
        var vSeed = v * 2.3;
        var vTop = 0.58 + ((v * 29) % 38) / 100;                   // each veil ends at its own height
        var vx = (v + 0.5) / 9;                                    // position across the wall
        var vw = WALL_W * (0.18 + 0.12 * (v % 3));                 // veil thickness
        ctx.beginPath();
        for (var st = 0; st <= 1.0001; st += 0.05) {               // up the leading side
          var yS = bot - st * Hh * vTop, sp = 1 + st * 0.55;
          var sway = Math.sin(yS * 0.022 - phase * 1.9 + vSeed) * (5 + st * 20)
                   + Math.sin(yS * 0.05 - phase * 1.1 + vSeed * 1.7) * (2 + st * 7);
          ctx.lineTo(wallFaceX(yS) - WALL_W * sp + vx * WALL_W * sp + sway + vw * (1 - st * 0.85), yS);
        }
        for (var sd = 1; sd >= -0.0001; sd -= 0.05) {              // and back down the other side
          var yD = bot - sd * Hh * vTop, sp2 = 1 + sd * 0.55;
          var sway2 = Math.sin(yD * 0.022 - phase * 1.9 + vSeed) * (5 + sd * 20)
                    + Math.sin(yD * 0.05 - phase * 1.1 + vSeed * 1.7) * (2 + sd * 7);
          ctx.lineTo(wallFaceX(yD) - WALL_W * sp2 + vx * WALL_W * sp2 + sway2 - vw * (1 - sd * 0.85), yD);
        }
        ctx.closePath();
        var aV = 0.13 + 0.07 * (0.5 + 0.5 * Math.sin(phase * 1.3 + vSeed));
        var veil = ctx.createLinearGradient(0, bot, 0, bot - Hh * vTop);
        veil.addColorStop(0, "rgba(207,250,254," + aV.toFixed(3) + ")");
        veil.addColorStop(0.5, "rgba(165,243,252," + (aV * 0.6).toFixed(3) + ")");
        veil.addColorStop(1, "rgba(165,243,252,0)");               // dissolves — no hard top edge
        ctx.fillStyle = veil;
        ctx.fill();
      }

      // The blocking face: a soft glowing seam, brightest at mid-height, fading at both ends.
      ctx.save();
      ctx.shadowColor = "rgba(34,211,238,0.85)";
      ctx.shadowBlur = 16;
      var faceGrad = ctx.createLinearGradient(0, top, 0, bot);
      var fa = (0.34 + 0.10 * Math.sin(phase * 2)).toFixed(3);
      faceGrad.addColorStop(0, "rgba(165,243,252,0)");
      faceGrad.addColorStop(0.5, "rgba(207,250,254," + fa + ")");
      faceGrad.addColorStop(1, "rgba(165,243,252,0.05)");
      ctx.strokeStyle = faceGrad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (var y2 = top; y2 <= bot; y2 += 6) {
        var xe = wallFaceX(y2) + Math.sin(y2 * 0.03 + phase * 1.6) * 2;
        if (y2 === top) ctx.moveTo(xe, y2); else ctx.lineTo(xe, y2);
      }
      ctx.stroke();
      ctx.restore();

      // impact ripples where threats were blocked
      for (var fi = flashes.length - 1; fi >= 0; fi--) {
        var fl = flashes[fi];
        fl.life -= 0.06;
        if (fl.life <= 0) { flashes.splice(fi, 1); continue; }
        var fxx = wallFaceX(fl.y), rad = 6 + (1 - fl.life) * 26;
        ctx.strokeStyle = "rgba(207,250,254," + (fl.life * 0.8).toFixed(2) + ")";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fxx, fl.y - rad);
        ctx.lineTo(fxx, fl.y + rad);
        ctx.stroke();
      }
    }

    var last = 0;
    function frame(t) {
      requestAnimationFrame(frame);
      if (t - last < 33) return; // ~30fps, cheap
      last = t;
      ctx.fillStyle = "rgba(10,14,22,0.20)"; // fade trails toward the page's night-blue
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (threats.length < 16 && Math.random() < 0.10) spawnThreat();

      drawWall();

      ctx.font = "13px monospace";
      ctx.textBaseline = "middle";
      for (var i = threats.length - 1; i >= 0; i--) {
        var th = threats[i];
        th.x -= th.speed;
        var fxx = wallFaceX(th.y);
        if (th.x <= fxx) { burst(fxx, th.y); flashes.push({ y: th.y, life: 1 }); threats.splice(i, 1); continue; } // pop on the shield face
        var near = Math.max(0, 1 - (th.x - wallX) / 120); // brighten as it nears the wall
        ctx.fillStyle = "rgba(239,68,68," + (0.35 + 0.5 * near).toFixed(2) + ")";
        ctx.fillText(th.text, th.x, th.y);
      }

      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.94; pt.vy *= 0.94; pt.life -= 0.04;
        if (pt.life <= 0) { particles.splice(p, 1); continue; }
        ctx.fillStyle = "rgba(103,232,249," + pt.life.toFixed(2) + ")";
        ctx.fillRect(pt.x, pt.y, 2, 2);
      }

      ctx.font = "11px monospace";
      for (var q = passes.length - 1; q >= 0; q--) {
        var ps = passes[q];
        ps.y -= 0.7; ps.life -= 0.02;
        if (ps.life <= 0) { passes.splice(q, 1); continue; }
        ctx.fillStyle = "rgba(5,223,114," + (ps.life * 0.7).toFixed(2) + ")";
        ctx.fillText("✓ PASS", ps.x, ps.y);
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 2. Compile progress bar ---------------- */
  function initProgress() {
    var bar = document.createElement("div");
    bar.id = "compile-bar";
    var fill = document.createElement("div");
    fill.id = "compile-fill";
    bar.appendChild(fill);
    var pct = document.createElement("div");
    pct.id = "compile-pct";
    pct.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    document.body.appendChild(pct);

    var ticking = false;
    function apply() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      var v = Math.round(p * 100);
      fill.style.width = v + "%";
      pct.textContent = "tests " + (v >= 100 ? "[PASS]" : "[" + v + "%]");
      pct.style.opacity = p > 0.01 ? "1" : "0";
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", apply);
    apply();
  }

  /* ---------------- 3. Blueprint spine ---------------- */
  function initBlueprint() {
    var SECTIONS = ["hero", "about", "skills", "experience", "projects", "formacao", "contact"];
    var wrap = document.createElement("div");
    wrap.id = "blueprint";
    wrap.setAttribute("aria-hidden", "true");
    var track = document.createElement("div");
    track.className = "bp-track";
    var fill = document.createElement("div");
    fill.className = "bp-fill";
    wrap.appendChild(track);
    wrap.appendChild(fill);

    var TOP = 8, SPAN = 84; // percentages, matching effects.css
    var nodes = SECTIONS.map(function (id, i) {
      var n = document.createElement("span");
      n.className = "bp-node";
      n.style.top = TOP + (SPAN * i) / (SECTIONS.length - 1) + "%";
      wrap.appendChild(n);
      return n;
    });
    document.body.appendChild(wrap);

    var activeIndex = 0;
    function paintNodes() {
      nodes.forEach(function (n, i) {
        n.classList.toggle("active", i === activeIndex);
        n.classList.toggle("passed", i < activeIndex);
      });
    }

    var ticking = false;
    function apply() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.height = p * SPAN + "%";
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", apply);
    apply();

    // Light the node of whichever section is most in view.
    if ("IntersectionObserver" in window) {
      var visible = {};
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
          });
          var best = -1, bestRatio = 0;
          SECTIONS.forEach(function (id, i) {
            if ((visible[id] || 0) > bestRatio) { bestRatio = visible[id]; best = i; }
          });
          if (best >= 0 && best !== activeIndex) { activeIndex = best; paintNodes(); }
        },
        { threshold: [0.15, 0.4, 0.7] }
      );
      SECTIONS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) io.observe(el);
      });
    }
    paintNodes();
  }

  /* ---------------- 4. Boot sequence: click / tap to skip ---------------- */
  function initBootSkip() {
    var el = document.getElementById("boot");
    if (!el) return;
    el.addEventListener("click", function () { el.classList.add("boot-skip"); });
    // Safety net: guarantee the overlay is gone even if the wind entrance never runs.
    window.setTimeout(function () { el.classList.add("boot-skip"); }, 5200);
  }

  /* ---------------- 5. Count-up on stats (when they scroll into view) ---------------- */
  function initCountUp() {
    var els = document.querySelectorAll("[data-count]");
    if (!els.length) return;
    function run(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var dur = 900, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    }
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 6. Scramble section headings (decode effect) ---------------- */
  function initScramble() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var CH = "!<>-_\\/[]{}=+*^?#01";
    var headings = document.querySelectorAll("main section h2.font-mono");
    function textNodeOf(h) {
      for (var i = h.childNodes.length - 1; i >= 0; i--) {
        var n = h.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim().length > 1) return n;
      }
      return null;
    }
    function scramble(node) {
      var finalText = node.textContent;
      var lead = finalText.match(/^\s*/)[0];
      var core = finalText.slice(lead.length);
      var frame = 0, total = core.length + 12;
      function tick() {
        var out = "";
        for (var i = 0; i < core.length; i++) {
          if (core[i] === " ") { out += " "; continue; }
          var revealAt = i + 6;
          if (frame >= revealAt) out += core[i];
          else out += CH[(Math.random() * CH.length) | 0];
        }
        node.textContent = lead + out;
        frame++;
        if (frame <= total) setTimeout(tick, 28);
        else node.textContent = finalText;
      }
      tick();
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var node = textNodeOf(e.target);
        if (node) scramble(node);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    headings.forEach(function (h) { io.observe(h); });
  }

  function boot() {
    try { initWindWall(); } catch (e) {}
    try { initProgress(); } catch (e) {}
    try { initBlueprint(); } catch (e) {}
    try { initBootSkip(); } catch (e) {}
    try { initCountUp(); } catch (e) {}
    try { initScramble(); } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

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
        y: 40 + Math.random() * (canvas.height - 80),
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

    function drawWall() {
      phase += 0.04;
      var band = 16;
      for (var s = 0; s < 11; s++) {
        var t = s / 10;
        var off = Math.sin(phase + t * Math.PI * 2) * band;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(34,211,238," + (0.05 + 0.10 * (1 - Math.abs(t - 0.5) * 2)).toFixed(3) + ")";
        ctx.lineWidth = 1;
        for (var y = 0; y <= canvas.height; y += 14) {
          var x = wallX + off + Math.sin(y * 0.03 + phase + t * 3) * 6;
          if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
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
        if (th.x <= wallX) { burst(wallX, th.y); threats.splice(i, 1); continue; }
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
    // Safety net: guarantee the overlay is gone even if the CSS animation never runs.
    window.setTimeout(function () { el.classList.add("boot-skip"); }, 2600);
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

/* interactions.js — front-end behaviour for the static design system.
 * Replaces the original Next.js/GSAP runtime with a lightweight, dependency-free version.
 *  1. Renders every <i data-lucide> placeholder into an inline SVG via the Lucide runtime.
 *  2. Reveals the hero terminal code lines with a staggered "typing" fade-in.
 *  3. Fades in [data-animate-on-scroll] elements as they enter the viewport (IntersectionObserver),
 *     mirroring the original scroll-reveal feel while degrading gracefully to fully visible.
 */
(function () {
  "use strict";

  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  // Terminal typewriter — types the code token by token like the original site.
  // Full text is captured once at load so a mid-animation replay never loses characters.
  var TERMINAL_SEQ = null;
  var typingRun = 0;

  function collectTerminalSeq() {
    if (TERMINAL_SEQ) return TERMINAL_SEQ;
    TERMINAL_SEQ = [];
    document.querySelectorAll("[data-terminal-line]").forEach(function (line) {
      var tokens = Array.prototype.slice.call(line.children).slice(1).map(function (span) {
        return { el: span, text: span.textContent };
      });
      TERMINAL_SEQ.push({ line: line, tokens: tokens });
    });
    return TERMINAL_SEQ;
  }

  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function typeTerminal() {
    if (REDUCED_MOTION) {
      document.querySelectorAll("[data-terminal-line]").forEach(function (line) {
        line.style.opacity = "1";
      });
      return;
    }
    var seq = collectTerminalSeq();
    var run = ++typingRun;
    seq.forEach(function (item) {
      item.line.style.opacity = "0";
      item.tokens.forEach(function (t) {
        t.el.textContent = "";
      });
    });
    var li = 0, ti = 0, ci = 0;
    function step() {
      if (run !== typingRun || li >= seq.length) return;
      var item = seq[li];
      item.line.style.opacity = "1";
      if (ti >= item.tokens.length) {
        li++; ti = 0; ci = 0;
        window.setTimeout(step, 100); // pause between lines
        return;
      }
      var tok = item.tokens[ti];
      if (ci >= tok.text.length) {
        ti++; ci = 0;
        step();
        return;
      }
      ci++;
      tok.el.textContent = tok.text.slice(0, ci);
      window.setTimeout(step, 16);
    }
    window.setTimeout(step, 250);
  }

  // Section navigation map for the right rail, sidebar and mobile bottom nav (aria-label → section id).
  var NAV_TARGETS = {
    "Início": "hero", "Sobre": "about", "Habilidades": "skills", "Experiência": "experience",
    "Projetos": "projects", "Formação": "formacao", "Contato": "contact",
    "Ir para main.ts": "hero", "Ir para about.md": "about", "Ir para skills.json": "skills",
    "Ir para experience.git": "experience", "Ir para projects/": "projects",
    "Ir para formacao.md": "formacao", "Ir para contact.exe": "contact",
  };

  function scrollToSection(id) {
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Ordered list of the page sections — drives the right rail's active dot,
  // the keyboard (↑/↓) navigation and the hero's "scroll down" chevron.
  var SECTIONS = ["hero", "about", "skills", "experience", "projects", "formacao", "contact"];
  var currentIndex = 0;

  // Active UI language ("pt" default, "en" available); driven by the PT/EN switch.
  var CURRENT_LANG = "pt";

  function goSection(dir) {
    var next = Math.min(SECTIONS.length - 1, Math.max(0, currentIndex + dir));
    if (next !== currentIndex) scrollToSection(SECTIONS[next]);
  }

  // Mobile hamburger menu: open/close the slide-in panel and navigate on item tap.
  function setupMobileMenu() {
    var toggle = document.getElementById("mobile-menu-toggle");
    var menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;
    function open() { menu.classList.add("open"); toggle.setAttribute("aria-expanded", "true"); menu.setAttribute("aria-hidden", "false"); }
    function close() { menu.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); menu.setAttribute("aria-hidden", "true"); }
    toggle.addEventListener("click", function () {
      if (menu.classList.contains("open")) close(); else open();
    });
    menu.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("#mobile-menu-close") || (t.classList && t.classList.contains("mm-backdrop"))) { close(); return; }
      var link = t.closest && t.closest(".mm-link");
      if (link && link.getAttribute("data-nav")) { scrollToSection(link.getAttribute("data-nav")); close(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) close();
    });
  }
  setupMobileMenu();

  // One delegated listener handles every button — survives icon replacement and any init-order issue.
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!btn) return;
    if (btn.id === "btn-about") {
      scrollToSection("about");
      return;
    }
    if (btn.id === "btn-view-projects") {
      scrollToSection("projects");
      return;
    }
    if (btn.id === "scroll-down-hint") {
      goSection(1);
      return;
    }
    var navId = NAV_TARGETS[btn.getAttribute("aria-label")];
    if (navId) scrollToSection(navId);
  });

  function revealOnScroll() {
    var targets = document.querySelectorAll("[data-animate-on-scroll]");
    if (window.location.search.indexOf("noanim") !== -1) return; // test mode: keep everything visible
    if (REDUCED_MOTION) return; // respect prefers-reduced-motion: no fade/slide reveals
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.style.opacity = "1";
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.transition = "opacity .5s ease-out, transform .5s ease-out";
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      observer.observe(el);
    });
  }

  // ---- Contact form ----
  // With no backend on a static page, the form falls back to mailto: (opens the visitor's mail app
  // with everything pre-filled). To upgrade to direct sending, create a free endpoint at
  // https://formspree.io (or https://web3forms.com) and paste its URL below — nothing else changes.
  var CONTACT_ENDPOINT = ""; // sem backend: usa mailto para o e-mail abaixo
  var CONTACT_EMAIL = "douglasluis2017@outlook.com.br";

  function setupContactForm() {
    var form = document.querySelector("#contact form");
    if (!form) return;
    var button = form.querySelector('button[type="submit"]');
    var label = button ? button.querySelector("span") : null;

    function setStatus(text, done) {
      if (label) label.textContent = tr(text);
      if (button) button.disabled = !done;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector("#website").value) return; // honeypot: silently drop bots

      var name = form.querySelector("#contact-name").value.trim();
      var email = form.querySelector("#contact-email").value.trim();
      var subject = form.querySelector("#contact-subject").value.trim() || "Contato via portfólio";
      var message = form.querySelector("#contact-message").value.trim();

      if (CONTACT_ENDPOINT) {
        setStatus("Enviando...", false);
        fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name: name, email: email, subject: subject, message: message }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error(res.status);
            setStatus("✓ Mensagem enviada!", true);
            form.reset();
            window.setTimeout(function () { setStatus("Enviar Mensagem", true); }, 4000);
          })
          .catch(function () {
            setStatus("Erro — tente de novo", true);
            window.setTimeout(function () { setStatus("Enviar Mensagem", true); }, 4000);
          });
      } else {
        var body = message + "\n\n— " + name + " (" + email + ")";
        window.location.href =
          "mailto:" + CONTACT_EMAIL +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);
        setStatus("Abrindo seu e-mail...", true);
        window.setTimeout(function () { setStatus("Enviar Mensagem", true); }, 4000);
      }
    });
  }

  // ---- Section navigation: right-rail active dot + keyboard (↑/↓) ----
  // Lights up the rail dot for the section currently in view (and keeps its name
  // label visible, not only on hover), and lets the visitor move section-by-section
  // with the arrow keys. Runs after renderIcons() so the <i> placeholders are SVGs.
  function setupSectionNav() {
    var rail = document.getElementById("rail-nav");
    var buttons = rail ? Array.prototype.slice.call(rail.querySelectorAll("button")) : [];

    // Resolve the state-carrying children of one rail button.
    function parts(btn) {
      var labelDiv = btn.children[0];
      var spans = labelDiv.querySelectorAll("span");
      var wrapper = btn.children[1];
      return {
        labelDiv: labelDiv,
        labelSpan: spans[spans.length - 1], // the section name (last span; first is the "＞")
        ring: wrapper.children[0],
        dot: wrapper.children[1],
        icon: wrapper.children[1].firstElementChild, // <svg> after Lucide render
      };
    }

    // Capture the active/inactive class strings straight from the markup:
    // button[0] ships active, button[1] inactive — so the look stays in sync with the theme.
    var ACT = null, INA = null;
    if (buttons.length >= 2) {
      var p0 = parts(buttons[0]), p1 = parts(buttons[1]);
      ACT = { span: p0.labelSpan.getAttribute("class"), ring: p0.ring.getAttribute("class"), dot: p0.dot.getAttribute("class") };
      INA = { span: p1.labelSpan.getAttribute("class"), ring: p1.ring.getAttribute("class"), dot: p1.dot.getAttribute("class") };
    }

    function setIcon(icon, on) {
      if (!icon) return;
      icon.classList.remove("w-0", "h-0", "opacity-0", "scale-0", "w-4", "h-4", "opacity-100", "scale-100");
      icon.classList.add.apply(icon.classList, on ? ["w-4", "h-4", "opacity-100", "scale-100"] : ["w-0", "h-0", "opacity-0", "scale-0"]);
    }

    function paint(idx) {
      if (!ACT) return;
      buttons.forEach(function (btn, i) {
        var p = parts(btn), on = i === idx, t = on ? ACT : INA;
        p.labelSpan.setAttribute("class", t.span);
        p.ring.setAttribute("class", t.ring);
        p.dot.setAttribute("class", t.dot);
        setIcon(p.icon, on);
        // Keep the active section's name permanently visible; others revert to hover-only.
        p.labelDiv.style.opacity = on ? "1" : "";
        p.labelDiv.style.transform = on ? "translateX(0)" : "";
      });
    }

    var sectionEls = SECTIONS.map(function (id) { return document.getElementById(id); });

    // Scrollspy: the active section is the last one whose top has crossed ~35% of the
    // viewport; at the very bottom of the page we force the last section (which may be
    // too short to ever reach the middle line).
    function computeActive() {
      var line = window.innerHeight * 0.35;
      var idx = 0;
      for (var i = 0; i < sectionEls.length; i++) {
        var el = sectionEls[i];
        if (el && el.getBoundingClientRect().top <= line) idx = i;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) idx = SECTIONS.length - 1;
      if (idx !== currentIndex) { currentIndex = idx; paint(idx); }
    }

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { computeActive(); ticking = false; });
    }, { passive: true });
    window.addEventListener("resize", computeActive);

    // Arrow keys move between sections (ignored while typing in the contact form).
    document.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      var el = e.target, tag = (el && el.tagName ? el.tagName : "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (el && el.isContentEditable)) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goSection(1); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goSection(-1); }
    });

    paint(currentIndex);
    computeActive();
  }

  // ---- Internationalization (Portuguese default ↔ English) ----
  // The page ships in Portuguese; every translatable string is swapped in place by walking
  // the text nodes and matching them against this PT→EN dictionary — no reload, choice saved
  // in localStorage. Code, filenames, tech names and proper nouns are intentionally left out.
  var PT2EN = {
    // nav / menu
    "Início": "Home", "Sobre": "About", "Habilidades": "Skills", "Experiência": "Experience",
    "Projetos": "Projects", "Formação": "Education", "Contato": "Contact", "~/navegação": "~/navigation",
    // hero
    "WIND_WALL :: ATIVA · BLUE TEAM ONLINE": "WIND_WALL :: ACTIVE · BLUE TEAM ONLINE",
    "Olá, eu sou": "Hi, I'm",
    "Da qualidade à defesa. Especializado em testes automatizados — Robot Framework, Selenium, Playwright e Cypress — garantindo que o bug nunca chegue ao usuário. Com formação em segurança defensiva.":
      "From quality to defense. Specialized in automated testing — Robot Framework, Selenium, Playwright and Cypress — making sure the bug never reaches the user. With a background in defensive security.",
    "Conectar no LinkedIn": "Connect on LinkedIn",
    "Carregando...": "Loading...",
    "Confira": "Check out",
    "MÓDULOS_CARREGADOS:": "MODULES_LOADED:",
    "'barra o que é malicioso'": "'blocks anything malicious'",
    "Sobre mim": "About me",
    "Ver Projetos": "View Projects",
    // about
    "Sobre.system": "About.system",
    "Sou QA / Software Tester com mais de 4 anos garantindo a qualidade de sistemas web e plataformas embarcadas — do plano de teste à automação ponta a ponta. Atualmente me especializando em segurança defensiva e ethical hacking.":
      "I'm a QA / Software Tester with 4+ years ensuring the quality of web systems and embedded platforms — from test plans to end-to-end automation. Currently specializing in defensive security and ethical hacking.",
    "OPERADOR": "OPERATOR", "FUNÇÃO": "ROLE", "LOCALIZAÇÃO": "LOCATION",
    "EXPERIÊNCIA": "EXPERIENCE", "ANOS": "YEARS", "BUGS BARRADOS": "BUGS BLOCKED",
    // skills
    "Habilidades.json": "Skills.json",
    "Arraste para explorar o arsenal de QA & segurança": "Drag to explore the QA & security arsenal",
    // experience
    "2025 - Atual": "2025 - Present",
    "QA Sênior": "QA Senior",
    "Priorizo e gerencio defeitos em ambientes ágeis, lidero a validação de conectores e integrações ponta a ponta e desenho cenários funcionais para aplicações web. Suítes automatizadas em Robot Framework e testes de API REST (funcional, performance e carga).":
      "I prioritize and manage defects in fast-paced environments, lead the validation of connectors and end-to-end integrations, and design functional scenarios for web applications. Automated suites in Robot Framework and REST API tests (functional, performance and load).",
    "128 casos de teste": "128 test cases",
    "QA Júnior → Pleno": "QA Junior → Mid-Level",
    "Garanti a qualidade de uma plataforma embarcada proprietária da INTELBRAS para roteadores e access points. Planos de teste para padronizar o QA, testes exploratórios e scripts automatizados de smoke e ponta a ponta.":
      "Ensured the quality of a proprietary INTELBRAS embedded platform for routers and access points. Test plans to standardize QA, exploratory testing and automated smoke and end-to-end scripts.",
    "Testes Embarcados": "Embedded Testing", "Redes": "Networks",
    "96 casos de teste": "96 test cases",
    "Coordenei inspeções e testes funcionais no dia a dia, planejei a execução de testes entre times com Scrum e criei planos e relatórios de teste. Primeiros projetos de automação de testes.":
      "Coordinated day-to-day inspections and functional testing, planned test execution across teams with Scrum and created test plans and reports. First test automation projects.",
    "Testes Funcionais": "Functional Testing", "Planos de Teste": "Test Plans", "Automação": "Automation",
    "60 casos de teste": "60 test cases",
    "git init (2021 — primeiro caso de teste que passou)": "git init (2021 — first test case that passed)",
    // projects
    "Repositórios": "Repositories", "Projetos Fixados": "Pinned Projects", "Público": "Public",
    "Suíte de automação de API para redes corporativas — testes ponta a ponta com Robot Framework e Selenium.":
      "API automation suite for enterprise networks — end-to-end testing with Robot Framework and Selenium.",
    "Teste Automatizado · UniSecurity": "Automated Test · UniSecurity",
    "Framework de testes automatizados ponta a ponta para o sistema UniSecurity — validação de fluxos e regressão.":
      "End-to-end automated testing framework for the UniSecurity system — flow validation and regression.",
    "Teste Automatizado · Virtoo": "Automated Test · Virtoo",
    "Framework de testes automatizados para o projeto Virtoo — cenários funcionais e validação de regras de negócio.":
      "Automated testing framework for the Virtoo project — functional scenarios and business-rule validation.",
    "Scripts e ferramentas de automação para redes corporativas (INTELBRAS · time Zeus) — orquestração e validação de equipamentos.":
      "Automation scripts and tools for enterprise networks (INTELBRAS · Zeus team) — device orchestration and validation.",
    "Guia de Motéis · Teste": "Motel Guide · Test",
    "Validação de formulário de cadastro de usuário e testes de API REST — casos funcionais e de contrato ponta a ponta.":
      "User registration form validation and REST API testing — functional and contract cases end to end.",
    "Robot · Curso": "Robot · Course",
    "Automação de testes com Robot Framework — keywords reutilizáveis, boas práticas e estrutura de suítes de teste.":
      "Test automation with Robot Framework — reusable keywords, best practices and test-suite structure.",
    "Validação": "Validation",
    "Ver todos os repositórios": "View all repositories",
    // education
    "Bacharelado em Engenharia de Software": "Bachelor's in Software Engineering",
    "Base sólida em engenharia de software, algoritmos, banco de dados e qualidade de software.":
      "Solid foundation in software engineering, algorithms, databases and software quality.",
    "Mestrado Profissional em Engenharia de Software": "Professional Master's in Software Engineering",
    "Pesquisa aplicada em engenharia de software, qualidade e automação de testes.":
      "Applied research in software engineering, quality and test automation.",
    "Certificações e Cursos": "Certifications & Courses",
    "Pós — QA & Testes de Software": "Postgrad — QA & Software Testing",
    "Faculdade FACINT · 2025": "FACINT · 2025",
    "Pós — Ethical Hacking & Cibersegurança": "Postgrad — Ethical Hacking & Cybersecurity",
    "Faculdade FACINT · 2026 · em andamento": "FACINT · 2026 · in progress",
    "Técnico em Infraestrutura de TI": "IT Infrastructure Technician",
    "Inglês — CEFR A2": "English — CEFR A2",
    "UniEVANGÉLICA Language Center · cursando": "UniEVANGÉLICA Language Center · in progress",
    "Containers e versionamento": "Containers and versioning",
    "Linguagens & Frameworks": "Languages & Frameworks",
    // contact
    "\"disponível\"": "\"available\"",
    "// Wind Wall ativa — aguardando conexão...": "// Wind Wall active — awaiting connection...",
    "canal seguro": "secure channel", "para:": "to:", "resposta:": "reply:", "em até 24h": "within 24h",
    "Nome": "Name", "E-mail": "Email", "Assunto": "Subject", "Mensagem": "Message",
    "// Protegido por filtros de spam e limites de taxa": "// Protected by spam filters and rate limiting",
    "Enviar Mensagem": "Send Message",
    // contact form status (set from JS)
    "Abrindo seu e-mail...": "Opening your email...", "Erro — tente de novo": "Error — try again",
    // footer
    "© 2026 Douglas Leonel. Todos os direitos reservados.": "© 2026 Douglas Leonel. All rights reserved.",
    "「 A morte é como o vento — sempre ao meu lado. 」": "「 Death is like the wind — always by my side. 」",
  };

  var EN2PT = {};
  Object.keys(PT2EN).forEach(function (k) { EN2PT[PT2EN[k]] = k; });

  var I18N_HTML = {
    mission: {
      pt: 'Encontrar o defeito antes do usuário. Foco em <span class="text-white">testes automatizados</span>, <span class="text-white">APIs REST</span> e <span class="text-white">qualidade como defesa</span> — barrando o que é ruim como uma muralha de vento.',
      en: 'Find the defect before the user does. Focused on <span class="text-white">automated testing</span>, <span class="text-white">REST APIs</span> and <span class="text-white">quality as defense</span> — blocking what is bad like a wall of wind.',
    },
  };

  var I18N_ATTR = [
    { sel: "#contact-name", attr: "placeholder", pt: "Seu Nome", en: "Your Name" },
    { sel: "#contact-subject", attr: "placeholder", pt: "Consulta de projeto / Colaboração", en: "Project inquiry / Collaboration" },
    { sel: "#contact-message", attr: "placeholder", pt: "Conte-me sobre seu projeto, prazo e objetivos...", en: "Tell me about your project, timeline and goals..." },
  ];

  // tr(): translate one string for the current language (used by the contact-form status).
  function tr(s) { return CURRENT_LANG === "en" && PT2EN[s] != null ? PT2EN[s] : s; }

  function walkTextNodes(root, fn) {
    for (var n = root.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { fn(n); continue; }
      if (n.nodeType !== 1) continue;
      var tag = n.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || n.hasAttribute("data-i18n-html")) continue;
      walkTextNodes(n, fn);
    }
  }

  function applyLang(lang) {
    var map = lang === "en" ? PT2EN : EN2PT;
    walkTextNodes(document.body, function (t) {
      var raw = t.nodeValue;
      var key = raw.trim();
      if (!key || map[key] == null) return;
      var lead = raw.match(/^\s*/)[0];
      var trail = raw.match(/\s*$/)[0];
      t.nodeValue = lead + map[key] + trail;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var entry = I18N_HTML[el.getAttribute("data-i18n-html")];
      if (entry) el.innerHTML = entry[lang] || entry.pt;
    });
    I18N_ATTR.forEach(function (a) {
      var el = document.querySelector(a.sel);
      if (el) el.setAttribute(a.attr, lang === "en" ? a.en : a.pt);
    });
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "pt-BR");
    TERMINAL_SEQ = null; // let the terminal re-capture its (translated) source on any replay
    CURRENT_LANG = lang;
    try { localStorage.setItem("lang", lang); } catch (e) { /* private mode */ }
  }

  function setupLangSwitch() {
    var sw = document.getElementById("lang-switch");
    if (!sw) return;
    var opts = Array.prototype.slice.call(sw.querySelectorAll(".lang-opt"));
    function refresh(lang) {
      opts.forEach(function (b) {
        var on = b.getAttribute("data-lang") === lang;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    sw.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".lang-opt") : null;
      if (!b) return;
      var lang = b.getAttribute("data-lang");
      if (lang === CURRENT_LANG) return;
      applyLang(lang);
      refresh(lang);
    });
    var saved = null;
    try { saved = localStorage.getItem("lang"); } catch (e) { /* private mode */ }
    var initial = saved === "en" ? "en" : "pt";
    if (initial === "en") applyLang("en"); else CURRENT_LANG = "pt";
    refresh(initial);
  }

  // This script is the last classic script in <body>, so the whole DOM above it already exists —
  // run immediately instead of waiting for DOMContentLoaded (which ES-module CDN imports can delay).
  renderIcons();
  typeTerminal();
  revealOnScroll();
  setupContactForm();
  setupSectionNav();
  setupLangSwitch();
})();

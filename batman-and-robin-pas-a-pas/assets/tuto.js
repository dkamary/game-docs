// Pas-à-pas Godot — The Adventures of Batman & Robin — navigation, horodatages, code, progression.
(function () {
  "use strict";

  // Liste unique des étapes : la navigation de toutes les pages est générée d'ici.
  var PAGES = [
    ["index.html", "Accueil : la méthode et le parcours"],
    ["etape-01-decouvrir-godot.html", "01 · Découvrir Godot et créer le projet"],
    ["etape-02-fondations.html", "02 · Les fondations"],
    ["etape-03-prototype.html", "03 · Prototype : Batman en un seul script"],
    ["etape-04-machine-a-etats.html", "04 · Machine à états et caméra"],
    ["etape-05-combat.html", "05 · Combat, accroche et dégâts"],
    ["etape-06-armes.html", "06 · Armes, jauge et bonus"],
    ["etape-07-ennemis.html", "07 · Ennemis et arènes à vagues"],
    ["etape-08-effets.html", "08 · Effets Mega Drive"],
    ["etape-09-section-1.html", "09 · Section 1 : rue, banque et premier boss"],
    ["etape-10-hud-ecrans.html", "10 · HUD, écrans et flux de jeu"],
    ["etape-11-section-2.html", "11 · Section 2 : Gem Expo et grappin"],
    ["etape-12-section-3.html", "12 · Section 3 : convoi et Joker"],
    ["etape-13-finitions.html", "13 · Finitions, export et suite"]
  ];
  var VIDEO = "https://youtu.be/EDaIlrfxRnE";
  var KEY = "bnr-pas-a-pas:";

  // Le stockage local peut être indisponible (navigation privée, aperçu) : la page marche sans.
  function store(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) { /* ignoré */ } }
  function load(k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } }
  function drop(k) { try { localStorage.removeItem(KEY + k); } catch (e) { /* ignoré */ } }

  function here() { return location.pathname.split("/").pop() || "index.html"; }

  function toSeconds(txt) {
    var parts = txt.trim().split(":").map(Number);
    var s = 0;
    for (var i = 0; i < parts.length; i++) s = s * 60 + parts[i];
    return Math.floor(s);
  }

  function dedent(text) {
    var lines = text.replace(/\r/g, "").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) {
      if (!l.trim()) return;
      var m = l.match(/^[ \t]*/)[0].length;
      if (m < min) min = m;
    });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join("\n");
  }

  function buildNav() {
    var page = here();
    var idx = PAGES.findIndex(function (t) { return t[0] === page; });
    var select = document.getElementById("tome-select");
    if (select) {
      PAGES.forEach(function (t, i) {
        var o = document.createElement("option");
        o.value = t[0]; o.textContent = t[1];
        if (i === idx) o.selected = true;
        select.appendChild(o);
      });
      select.addEventListener("change", function () { location.href = select.value; });
    }
    var pn = document.querySelector(".prevnext");
    if (pn && idx >= 0) {
      if (idx > 0) {
        var p = PAGES[idx - 1];
        pn.insertAdjacentHTML("beforeend", '<a class="prev" href="' + p[0] + '"><small>← Précédent</small>' + p[1] + "</a>");
      } else pn.insertAdjacentHTML("beforeend", "<span></span>");
      if (idx < PAGES.length - 1) {
        var n = PAGES[idx + 1];
        pn.insertAdjacentHTML("beforeend", '<a class="next" href="' + n[0] + '"><small>Suivant →</small>' + n[1] + "</a>");
      }
    }
  }

  function buildTimecodes() {
    document.querySelectorAll("a.tc").forEach(function (a) {
      var s = toSeconds(a.textContent);
      a.href = VIDEO + "?t=" + s;
      a.target = "_blank";
      a.rel = "noopener";
      a.title = "Ouvrir la vidéo de référence à " + a.textContent.trim();
    });
  }

  function buildCode() {
    document.querySelectorAll('script[type="text/x-code"]').forEach(function (s) {
      var lang = s.dataset.lang || "text";
      var wrap = document.createElement("div");
      wrap.className = "code";
      var head = document.createElement("div");
      head.className = "code-head";
      var file = document.createElement("span");
      file.textContent = s.dataset.file || "";
      var l = document.createElement("span");
      l.className = "lang"; l.textContent = lang;
      var btn = document.createElement("button");
      btn.type = "button"; btn.textContent = "Copier";
      head.appendChild(file); head.appendChild(l); head.appendChild(btn);
      var pre = document.createElement("pre");
      var code = document.createElement("code");
      code.className = "language-" + lang;
      code.textContent = dedent(s.textContent);
      pre.appendChild(code);
      wrap.appendChild(head); wrap.appendChild(pre);
      btn.addEventListener("click", function () {
        var txt = code.textContent;
        var done = function () { btn.textContent = "Copié ✓"; setTimeout(function () { btn.textContent = "Copier"; }, 1400); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done);
        else {
          var ta = document.createElement("textarea");
          ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch (e) { /* ignoré */ }
          ta.remove(); done();
        }
      });
      s.replaceWith(wrap);
    });
    if (window.Prism) window.Prism.highlightAll();
  }

  function buildToc() {
    var toc = document.getElementById("toc");
    if (!toc) return;
    var heads = document.querySelectorAll(".content h2[id], .content h3[id]");
    if (!heads.length) { toc.remove(); return; }
    toc.insertAdjacentHTML("beforeend", "<h4>Sur cette page</h4>");
    var links = [];
    heads.forEach(function (h) {
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      if (h.tagName === "H3") a.className = "lvl3";
      toc.appendChild(a);
      links.push([h, a]);
    });
    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (p) { p[1].classList.toggle("active", p[0] === e.target); });
        });
      }, { rootMargin: "-80px 0px -70% 0px" });
      links.forEach(function (p) { obs.observe(p[0]); });
    }
    return links;
  }

  // Une case « Fait » sur chaque titre d'étape (h3.step), mémorisée dans le navigateur.
  function buildSteps(tocLinks) {
    var page = here();
    var steps = document.querySelectorAll("h3.step[id]");
    if (!steps.length) return;
    store("total:" + page, String(steps.length));
    function refreshCount() {
      var n = document.querySelectorAll("h3.step.is-done").length;
      store("done:" + page, String(n));
      (tocLinks || []).forEach(function (p) {
        if (p[0].classList.contains("step")) p[1].style.color = p[0].classList.contains("is-done") ? "var(--green)" : "";
      });
    }
    steps.forEach(function (h) {
      var k = "step:" + page + ":" + h.id;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "done-toggle";
      function paint() {
        var on = h.classList.contains("is-done");
        btn.textContent = on ? "Fait ✓" : "Marquer comme fait";
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
      if (load(k) === "1") h.classList.add("is-done");
      paint();
      btn.addEventListener("click", function () {
        h.classList.toggle("is-done");
        if (h.classList.contains("is-done")) store(k, "1"); else drop(k);
        paint();
        refreshCount();
      });
      h.appendChild(btn);
    });
    refreshCount();
  }

  // Accueil : barre de progression sur chaque carte d'étape.
  function buildProgress() {
    document.querySelectorAll(".card[data-page]").forEach(function (card) {
      var page = card.dataset.page;
      var total = parseInt(load("total:" + page) || "0", 10);
      var done = parseInt(load("done:" + page) || "0", 10);
      var bar = document.createElement("div");
      bar.className = "progress";
      bar.innerHTML = "<i></i>";
      var label = document.createElement("div");
      label.className = "progress-label";
      if (total > 0) {
        bar.firstChild.style.width = Math.round(100 * done / total) + "%";
        label.textContent = done + " / " + total + " étapes faites";
      } else label.textContent = "pas encore commencée";
      card.appendChild(bar);
      card.appendChild(label);
    });
    var reset = document.getElementById("reset-progress");
    if (reset) reset.addEventListener("click", function () {
      if (!confirm("Effacer toute ta progression enregistrée dans ce navigateur ?")) return;
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf(KEY) === 0) localStorage.removeItem(k); });
      } catch (e) { /* ignoré */ }
      location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildNav();
    buildTimecodes();
    buildCode();
    var links = buildToc();
    buildSteps(links);
    buildProgress();
  });
})();

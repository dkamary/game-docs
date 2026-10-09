// Guide Godot — The Adventures of Batman & Robin — navigation, horodatages, blocs de code.
(function () {
  "use strict";

  // Liste unique des tomes : la navigation de toutes les pages est générée d'ici.
  var TOMES = [
    ["index.html", "Accueil & plan du guide"],
    ["00-audit.html", "00 · Audit des documentations existantes"],
    ["01-niveau-1.html", "01 · Le niveau 1 décortiqué (référence vidéo)"],
    ["02-fondations.html", "02 · Fondations du projet Godot"],
    ["03-batman.html", "03 · Batman : contrôleur & caméra"],
    ["04-armes.html", "04 · Armes, charge & bonus"],
    ["05-ennemis-vagues.html", "05 · Ennemis & arènes à vagues"],
    ["06-effets-megadrive.html", "06 · Effets Mega Drive dans Godot"],
    ["07-section-1-rues.html", "07 · Section 1 : rues de Gotham & machine d'Harley"],
    ["08-section-2-gem-expo.html", "08 · Section 2 : Gem Expo & bras de grue"],
    ["09-section-3-convoi-joker.html", "09 · Section 3 : convoi & montgolfière du Joker"],
    ["10-ecrans-flux.html", "10 · Intro, menus, HUD & flux de jeu"],
    ["11-finitions.html", "11 · Finitions, fidélité & annexes"]
  ];
  var VIDEO = "https://youtu.be/EDaIlrfxRnE";

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
    var here = location.pathname.split("/").pop() || "index.html";
    var idx = TOMES.findIndex(function (t) { return t[0] === here; });
    var select = document.getElementById("tome-select");
    if (select) {
      TOMES.forEach(function (t, i) {
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
        var p = TOMES[idx - 1];
        pn.insertAdjacentHTML("beforeend", '<a class="prev" href="' + p[0] + '"><small>← Précédent</small>' + p[1] + "</a>");
      } else pn.insertAdjacentHTML("beforeend", "<span></span>");
      if (idx < TOMES.length - 1) {
        var n = TOMES[idx + 1];
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
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildNav();
    buildTimecodes();
    buildCode();
    buildToc();
  });
})();

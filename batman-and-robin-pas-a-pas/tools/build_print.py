#!/usr/bin/env python3
"""Assemble le pas-à-pas en un seul document imprimable, puis en PDF A4.

    python3 batman-and-robin-pas-a-pas/tools/build_print.py

Produit, dans batman-and-robin-pas-a-pas/ :
  - imprimer.html                    le document complet (s'ouvre aussi dans un navigateur) ;
  - batman-and-robin-pas-a-pas.pdf   le PDF A4, avec numéros de page, sommaire et signets.

Fidélité : le contenu de chaque page est recopié tel quel. Seuls changent des attributs
invisibles (identifiants d'ancre préfixés par chapitre, liens entre pages devenus internes,
réponses des questions ouvertes) ; les éléments d'interface (navigation, boutons) sont
retirés ou masqués. Le script vérifie que le texte de chaque page est identique à
l'original et qu'aucun bloc ne dépasse de la largeur de la page.

Seule dépendance : Google Chrome ou Chromium (variable d'environnement CHROME pour un
chemin particulier). Aucune bibliothèque Python externe.
"""
import datetime
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zlib

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_HTML = os.path.join(HERE, "imprimer.html")
OUT_PDF = os.path.join(HERE, "batman-and-robin-pas-a-pas.pdf")
A4_CONTENT_PX = 688   # 210 mm - 2 × 14 mm de marge, à 96 px/pouce
MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
          "septembre", "octobre", "novembre", "décembre"]


# --- Lecture des pages ---------------------------------------------------------

def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()


def page_list():
    """L'ordre et les titres des pages viennent de assets/tuto.js (source unique)."""
    js = read(os.path.join("assets", "tuto.js"))
    block = re.search(r"var PAGES = \[(.*?)\];", js, re.S).group(1)
    return re.findall(r'\["([^"]+\.html)", "([^"]+)"\]', block)


def main_content(src):
    return re.search(r'<main class="content">\n?(.*?)</main>', src, re.S).group(1)


def split_scripts(s):
    """Sépare le HTML des blocs <script type="text/x-code"> (le code n'est jamais modifié)."""
    return re.split(r'(<script type="text/x-code".*?</script>)', s, flags=re.S)


def strip_ui(s):
    """Retire les éléments d'interface qui ne portent aucun contenu."""
    s = re.sub(r'<nav class="prevnext"[^>]*></nav>\s*', "", s)
    s = re.sub(r'<p><button type="button" class="reset-progress"[^>]*>.*?</button></p>\s*', "", s, flags=re.S)
    s = re.sub(r'<p class="print-links">.*?</p>\s*', "", s, flags=re.S)   # lien vers ce PDF lui-même
    return s


def visible_text(s):
    """Texte lisible d'un fragment HTML (pour la vérification de fidélité)."""
    parts = split_scripts(s)
    out = []
    for p in parts:
        if p.startswith("<script"):
            out.append(html.unescape(re.sub(r"<[^>]+>", "", p)))
        else:
            out.append(html.unescape(re.sub(r"<[^>]+>", " ", p)))
    return re.sub(r"\s+", " ", " ".join(out)).strip()


# --- Assemblage -----------------------------------------------------------------

def rewrite(fragment, prefix, chapter_of):
    """Préfixe les identifiants et convertit les liens entre pages en liens internes."""
    def fix_href(m):
        target = m.group(1)
        if target == "#":
            return m.group(0)
        if target.startswith("#"):
            return 'href="#%s-%s"' % (prefix, target[1:])
        page, _, anchor = target.partition("#")
        if page in chapter_of:
            p = chapter_of[page]
            return 'href="#%s"' % ("%s-%s" % (p, anchor) if anchor else p)
        return m.group(0)

    parts = split_scripts(fragment)
    for i, p in enumerate(parts):
        if p.startswith("<script"):
            continue
        p = re.sub(r'\bid="([^"]+)"', lambda m: 'id="%s-%s"' % (prefix, m.group(1)), p)
        p = re.sub(r'href="([^"]*)"', fix_href, p)
        p = p.replace('<details class="quiz">', '<details class="quiz" open>')
        p = re.sub(r' data-page="[^"]*"', "", p)
        parts[i] = p
    return "".join(parts)


def build_html(pages, page_numbers=None):
    page_numbers = page_numbers or {}
    chapter_of = {name: "p%02d" % i for i, (name, _) in enumerate(pages)}
    sections, toc = [], []
    for i, (name, label) in enumerate(pages):
        prefix = chapter_of[name]
        content = strip_ui(main_content(read(name)))
        sections.append('<section class="chapter" id="%s">\n%s</section>' % (prefix, rewrite(content, prefix, chapter_of)))
        steps = re.findall(r'<h3 class="step" id="([^"]+)">(.*?)</h3>', content, re.S)
        sub = "".join(
            '<li><a href="#{0}-{1}"><span class="t">{2}</span><span class="dots"></span><span class="pg">{3}</span></a></li>'.format(
                prefix, sid, re.sub(r"<[^>]+>", "", title).strip(), page_numbers.get("%s-%s" % (prefix, sid), ""))
            for sid, title in steps)
        toc.append('<li><a href="#{0}"><span class="t">{1}</span><span class="dots"></span><span class="pg">{2}</span></a>{3}</li>'.format(
            prefix, html.escape(label), page_numbers.get(prefix, ""), "<ol>%s</ol>" % sub if sub else ""))

    index = read("index.html")
    title = re.search(r"<title>(.*?)</title>", index).group(1)
    description = re.search(r'<meta name="description" content="([^"]*)">', index).group(1)
    today = datetime.date.today()
    edition = "Édition du %d %s %d, générée depuis la version web." % (today.day, MONTHS[today.month - 1], today.year)
    head = re.search(r"<head>(.*?)</head>", index, re.S).group(1)
    head = re.sub(r"<title>.*?</title>", "<title>%s — version imprimable</title>" % title, head)
    head = head.replace('<link rel="stylesheet" href="assets/print.css" media="print">', "")
    head += '<link rel="stylesheet" href="assets/print.css">\n'
    scripts = "".join(re.findall(r'(<script src="[^"]+"[^>]*></script>\n)', index))

    return """<!doctype html>
<html lang="fr">
<head>{head}</head>
<body class="print-doc">
<div class="layout"><main class="content">
<section class="cover">
  <div class="bat">🦇</div>
  <div class="kicker">Version imprimable</div>
  <h1>{title}</h1>
  <p class="lead">{description}</p>
  <p class="edition">{edition}</p>
</section>
<section class="print-toc">
  <h2>Sommaire</h2>
  <ol>{toc}</ol>
</section>
{sections}
</main></div>
{scripts}<script>
// Vérification (mode « #verifier ») : liste les blocs plus larges que la page.
if (location.hash === "#verifier") {{
  document.addEventListener("DOMContentLoaded", function () {{
    setTimeout(function () {{
      var bad = [];
      document.querySelectorAll("pre, table, img, figure, .callout, .code, h1, h2, h3, p, li").forEach(function (el) {{
        if (el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > {width} + 1) {{
          bad.push(el.tagName + " " + (el.className || "") + " : " + (el.textContent || el.src || "").trim().slice(0, 90));
        }}
      }});
      var r = document.createElement("pre");
      r.id = "overflow-report";
      r.textContent = "DEBORDEMENTS=" + bad.length + "\\n" + bad.join("\\n");
      document.body.appendChild(r);
    }}, 500);
  }});
}}
</script>
</body>
</html>
""".format(head=head, title=title, description=description, edition=edition,
           toc="".join(toc), sections="\n".join(sections), scripts=scripts, width=A4_CONTENT_PX)


# --- Vérifications ----------------------------------------------------------------

def check_fidelity(pages, doc):
    """Le texte de chaque chapitre doit être exactement celui de la page web."""
    errors = []
    for i, (name, _) in enumerate(pages):
        original = visible_text(strip_ui(main_content(read(name))))
        section = re.search(r'<section class="chapter" id="p%02d">\n(.*?)</section>(?=\n<section class="chapter"|\n</main>)' % i, doc, re.S)
        assembled = visible_text(section.group(1)) if section else ""
        if original != assembled:
            errors.append(name)
    return errors


def chrome():
    for c in (os.environ.get("CHROME"),
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/Applications/Chromium.app/Contents/MacOS/Chromium",
              shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("chromium-browser")):
        if c and os.path.exists(c):
            return c
    sys.exit("Chrome ou Chromium introuvable (variable CHROME pour indiquer son chemin).")


def run_chrome(args):
    profile = tempfile.mkdtemp(prefix="bnr-print-")
    try:
        return subprocess.run([chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                               "--user-data-dir=" + profile, "--virtual-time-budget=30000"] + args,
                              capture_output=True, text=True, timeout=600)
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def check_overflow():
    url = "file://" + OUT_HTML + "#verifier"
    res = run_chrome(["--window-size=%d,1200" % A4_CONTENT_PX, "--dump-dom", url])
    m = re.search(r'<pre id="overflow-report">(.*?)</pre>', res.stdout, re.S)
    return html.unescape(m.group(1)) if m else "rapport absent (la page n'a pas fini de se charger ?)"


def print_pdf():
    res = run_chrome(["--no-pdf-header-footer", "--generate-pdf-document-outline",
                      "--print-to-pdf=" + OUT_PDF, "file://" + OUT_HTML])
    if not os.path.exists(OUT_PDF):
        sys.exit("Échec de l'impression PDF :\n" + res.stderr)


# --- Numéros de page : lus dans le PDF produit par Chrome -------------------------

def pdf_objects(data):
    objs = {}
    for m in re.finditer(rb"(\d+) 0 obj\s*(.*?)endobj", data, re.S):
        objs[int(m.group(1))] = m.group(2)
    # Objets rangés dans des « object streams » compressés.
    for body in list(objs.values()):
        if b"/Type /ObjStm" not in body:
            continue
        n = int(re.search(rb"/N (\d+)", body).group(1))
        first = int(re.search(rb"/First (\d+)", body).group(1))
        raw = re.search(rb"stream\r?\n(.*)endstream", body, re.S).group(1)
        try:
            dec = zlib.decompress(raw)
        except zlib.error:
            continue
        nums = list(map(int, dec[:first].split()))
        for k in range(n):
            num, off = nums[2 * k], nums[2 * k + 1]
            end = nums[2 * k + 3] if k + 1 < n else len(dec) - first
            objs[num] = dec[first + off:first + end]
    return objs


def page_order(objs):
    root = next(b for b in objs.values() if re.search(rb"/Type\s*/Pages\b", b) and b"/Parent" not in b)
    order = []

    def walk(body):
        kids = re.search(rb"/Kids\s*\[(.*?)\]", body, re.S)
        for ref in re.findall(rb"(\d+) 0 R", kids.group(1)):
            child = objs[int(ref)]
            if re.search(rb"/Type\s*/Pages\b", child):
                walk(child)
            else:
                order.append(int(ref))
    walk(root)
    return {obj: i + 1 for i, obj in enumerate(order)}


def destinations(objs):
    """Destinations nommées (les ancres #id des liens internes) -> objet page.
    Chrome les écrit dans le dictionnaire /Dests du catalogue : /p01-e01-1 [250 0 R /XYZ x y 0]."""
    catalog = next(b for b in objs.values() if re.search(rb"/Type\s*/Catalog\b", b))
    m = re.search(rb"/Dests\s+(\d+) 0 R", catalog)
    dests = objs.get(int(m.group(1)), b"") if m else catalog
    return {name.decode("latin-1"): int(ref)
            for name, ref in re.findall(rb"/([^\s\[\]/()<>]+)\s*\[\s*(\d+) 0 R\s*/XYZ", dests)}


def read_page_numbers():
    """Renvoie ({ancre: page}, nombre total de pages)."""
    with open(OUT_PDF, "rb") as f:
        objs = pdf_objects(f.read())
    order = page_order(objs)
    found = {name: order[obj] for name, obj in destinations(objs).items() if obj in order}
    return found, len(order)


# --- Programme principal -----------------------------------------------------------

def write(doc):
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(doc)


def main():
    pages = page_list()
    doc = build_html(pages)
    write(doc)

    bad = check_fidelity(pages, doc)
    if bad:
        sys.exit("Texte différent de la version web pour : " + ", ".join(bad))
    print("Fidélité : texte identique à la version web pour les %d pages." % len(pages))

    report = check_overflow()
    print(report.splitlines()[0] if report else report)
    if not report.startswith("DEBORDEMENTS=0"):
        print(report)

    # Deux ou trois passes : la première place le contenu, les suivantes reportent
    # les numéros de page dans le sommaire jusqu'à ce qu'ils ne bougent plus.
    numbers, total = {}, "?"
    for attempt in range(4):
        print_pdf()
        found, total = read_page_numbers()
        if not found:
            print("Avertissement : numéros de page introuvables dans le PDF, sommaire sans numéros.")
            break
        if found == numbers:
            print("Sommaire : numéros de page stables après %d passes." % (attempt + 1))
            break
        numbers = found
        write(build_html(pages, numbers))
    else:
        print("Avertissement : les numéros de page du sommaire ne se sont pas stabilisés.")
    print("PDF : %s (%s pages, %.1f Mo)" % (OUT_PDF, total, os.path.getsize(OUT_PDF) / 1e6))


if __name__ == "__main__":
    main()

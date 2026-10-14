"""Genera assets/schede.js dalle schede dei pregenerati nel vault.

Prende solo la parte pubblica di ogni scheda: si ferma prima dei callout
[!secret] (segreti, seconde buste, biglietti) e toglie dall'equipaggiamento
gli oggetti legati ai segreti, che restano solo sulla scheda stampata.

Uso:  python tools/build_schede.py
"""
import html
import json
import re
from pathlib import Path

NOTA = Path(r"C:\Obsidian\Eldritch-Hunt\One Shots\Cenere e Tiglio - Personaggi.md")
OUT = Path(__file__).resolve().parent.parent / "assets" / "schede.js"

SLUG = {
    "Brannoch": "bran", "Sorella Iveta": "iveta", "Kasimir": "kasimir",
    "Dottor Emeric": "emeric", "Wilhelmina": "mina", "Ghira": "ghira",
    "Lucan": "lucan", "Sorrel": "sorrel", "Jory": "jory", "Aldith": "aldith",
    "Nell": "nell", "Isolde": "isolde", "Halvard": "halvard", "Oswin": "oswin",
}

# Oggetti che rimandano a un segreto: fuori dal sito (decisione del master, 14 ottobre 2026)
NASCOSTI = {
    "ghira": ["una chiave di ferro con un tiglio inciso sull'impugnatura, trovata nella tua tasca il giorno in cui ti hanno raccolta"],
    "kasimir": ["la chiave di una grata di fogna del Distretto Rubino"],
    "jory": ["un ciondolo di legno con un bastone e un pugnale incrociati"],
    "isolde": ["un ciondolo di legno scuro che non mostri a nessuno e che stringi quando la voce parla"],
    "halvard": ["una piastrina da cacciatore con un nome che non è il tuo"],
    "sorrel": ["un barattolo di *golden fennel (finocchio dorato)*"],
    "mina": ["bende sempre pulite sull'avambraccio sinistro"],
    "nell": ["un quaderno di schizzi con le prime venti pagine strappate"],
}

LISTE = {"Attacchi", "Capacità", "Talenti"}  # righe da spezzare sui " · "


def slug_of(name):
    for k, v in SLUG.items():
        if name.startswith(k):
            return v
    raise KeyError(name)


def typo(s):
    s = re.sub(r'"([^"]+)"', "\u201c\\1\u201d", s)
    return s.replace("'", "\u2019")


def md(s):
    """Markdown in linea: grassetto, corsivo con * e con _."""
    s = html.escape(typo(s), quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    s = re.sub(r"(?<![\w])_(.+?)_(?![\w])", r"<em>\1</em>", s)
    return s


def split_label(label):
    """'Incantesimi (CD 13, +5)' -> ('Incantesimi', 'CD 13, +5')."""
    m = re.match(r"^(.*?)\s*\((.+)\)$", label)
    return (m.group(1), m.group(2)) if m else (label, "")


def vitals(line):
    heads, cells = [], []
    for part in line.split(" · "):
        m = re.match(r"\*\*(.+?)\*\*\s*(.*)", part.strip())
        key, val = m.group(1), m.group(2)
        main, note = val, ""
        if " (" in val:
            main, note = val.split(" (", 1)
            note = note.rstrip(")")
        heads.append(f"<th>{md(key)}</th>")
        cells.append(f"<td>{md(main)}" + (f"<small>{md(note)}</small>" if note else "") + "</td>")
    return ('<table class="sk__vitals"><thead><tr>' + "".join(heads) + "</tr></thead><tbody><tr>"
            + "".join(cells) + "</tr></tbody></table>")


def saves(text):
    parts = []
    for part in text.split(" · "):
        part = part.strip()
        if part.startswith("**"):
            parts.append(f'<span class="sk__follia">{md(part.strip("*"))}</span>')
        else:
            parts.append(md(part))
    return '<p class="sk__line"><b>Tiri salvezza.</b> ' + ", ".join(parts) + "</p>"


def abilities(rows):
    heads = [c.strip() for c in rows[0].strip("|").split("|")]
    vals = [c.strip() for c in rows[2].strip("|").split("|")]
    mods, scores = [], []
    for v in vals:
        score, mod = re.match(r"(\d+)\s*\(([-+]\d+)\)", v).groups()
        mods.append(f"<td>{mod.replace('-', chr(0x2212))}</td>")
        scores.append(f"<td>{score}</td>")
    return ('<table class="sk__stats"><thead><tr>' + "".join(f"<th>{h}</th>" for h in heads)
            + '</tr></thead><tbody><tr class="sk__mods">' + "".join(mods)
            + '</tr><tr class="sk__scores">' + "".join(scores) + "</tr></tbody></table>")


def parse(block):
    lines = block.split("\n")
    name = lines[0].strip()
    slug = slug_of(name)
    body = []
    for ln in lines[1:]:
        if ln.startswith(">") or ln.strip() == "---":
            break  # da qui in poi: segreti e buste
        body.append(ln.rstrip())

    sub = body[0].strip().strip("*")
    i = 1
    intro = []
    while not body[i].startswith("|"):
        if body[i].strip():
            intro.append(body[i].strip())
        i += 1
    table = [body[i], body[i + 1], body[i + 2]]
    i += 3

    parts = []
    bond = ""
    cur_list = None

    def close_list():
        nonlocal cur_list
        if cur_list is not None:
            parts.append('<ul class="sk__sub">' + "".join(cur_list) + "</ul>")
            cur_list = None

    for ln in body[i:]:
        s = ln.strip()
        if not s:
            close_list()
            continue
        if s.startswith("- "):
            if cur_list is None:
                cur_list = []
            cur_list.append(f"<li>{md(s[2:])}</li>")
            continue
        close_list()
        if s.startswith("**CA**"):
            parts.append(vitals(s))
        elif s.startswith("**Tiri salvezza:**"):
            parts.append(saves(s[len("**Tiri salvezza:**"):].strip()))
        elif s.startswith("**Domanda di legame.**"):
            bond = s[len("**Domanda di legame.**"):].strip()
        elif s.startswith("***"):
            m = re.match(r"^\*\*\*(.+?)\*(.*?)\*\*\s*(.*)$", s)
            title, suffix, text = m.groups()
            suffix = suffix.strip().strip(".:").lstrip(", ").strip()
            meta = f' <span class="sk__meta">{md(suffix)}</span>' if suffix else ""
            parts.append(f'<section class="sk__feat"><h4><em>{md(title)}</em>{meta}</h4>'
                         + (f"<p>{md(text)}</p>" if text else "") + "</section>")
        elif s.startswith("**"):
            m = re.match(r"^\*\*(.+?)\*\*:?\s*(.*)$", s)
            label, text = m.group(1).rstrip(":"), m.group(2)
            if label == "Equipaggiamento":
                for obj in NASCOSTI.get(slug, []):
                    text = text.replace(", " + obj, "").replace(obj + ", ", "").replace(obj, "")
                text = text.strip().strip(",").strip()
                if not text:
                    continue
            head, note = split_label(label)
            h3 = f"<h3>{md(head)}" + (f' <span class="sk__meta">{md(note)}</span>' if note else "") + "</h3>"
            if head in LISTE and " · " in text:
                items = "".join(f"<li>{md(t)}</li>" for t in text.split(" · "))
                parts.append(f'<section class="sk__block">{h3}<ul class="sk__list">{items}</ul></section>')
            else:
                parts.append(f'<section class="sk__block">{h3}<p>{md(text)}</p></section>')
        else:
            parts.append(f"<p>{md(s)}</p>")
    close_list()

    html_out = (
        f'<p class="sk__class">{md(sub)}</p>'
        f'<h2 class="sk__name" id="scheda-titolo">{md(name)}</h2>'
        + "".join(f'<p class="sk__intro">{md(p)}</p>' for p in intro)
        + abilities(table)
        + '<div class="sk__rules">' + "".join(parts) + "</div>"
        + (f'<p class="sk__bond"><b>Domanda di legame.</b> <em>{md(bond)}</em></p>' if bond else "")
        + '<p class="sk__secret">Il segreto arriva in busta chiusa, solo a chi sceglie questo personaggio.</p>'
    )
    return slug, html_out


def main():
    text = NOTA.read_text(encoding="utf-8")
    blocks = text.split("\n## ")[1:]
    data = dict(parse(b) for b in blocks)
    assert len(data) == 14, sorted(data)
    js = ("// Generato da tools/build_schede.py dalla nota dei pregenerati: non modificare a mano.\n"
          "window.SCHEDE = " + json.dumps(data, ensure_ascii=False, indent=0) + ";\n")
    OUT.write_text(js, encoding="utf-8")
    leaks = [w for w in ("[!secret]", "Segreto di", "Seconda busta") if w in js]
    print(f"{len(data)} schede -> {OUT}  ({OUT.stat().st_size // 1024} KB)", "LEAK: " + str(leaks) if leaks else "")


if __name__ == "__main__":
    main()

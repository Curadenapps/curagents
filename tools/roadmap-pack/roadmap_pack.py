#!/usr/bin/env python3
"""Weekly BOB roadmap pack: one picture and one PDF report from the Notion Product Roadmap.

Python 3.9+ standard library only, plus a Chrome, Edge or Chromium for the picture and the PDF
(CHROME_PATH, or found like scripts/qa-report.mjs does). Used by agents/roadmap-pack.md.

  python3 tools/roadmap-pack/roadmap_pack.py all  --work DIR --assets assets.json --report report.json
                                                  [--prev roadmap-YYYY-MM-DD.json] [--date YYYY-MM-DD] pages...
  python3 tools/roadmap-pack/roadmap_pack.py data   (same arguments as all: only DIR/data.json and the history file)
  python3 tools/roadmap-pack/roadmap_pack.py build  --work DIR --assets assets.json
  python3 tools/roadmap-pack/roadmap_pack.py render --work DIR
  python3 tools/roadmap-pack/roadmap_pack.py assets --fonts DIR --wordmark SVG --baseline JSON --out assets.json

pages     Notion view-mode result pages of the Product Roadmap ({"results": [...], ...}), one file per page.
report    This week's Roadmap Watch report, parsed by the agent:
          {"week","title","url","parsed":{"summary":[],"done":n,"story":"","risk":[],"untracked":[]}}.
prev      Last week's history file (attached to last week's pack page in Notion). Missing = no
          "changed since last week" section, and a warning.
assets    Build files kept in Notion, not in Git (the brand fonts are licensed): the two WOFF fonts,
          the CURAPROX wordmark path (copied from the master SVG, never redrawn) and the 3 Nov 2026 scope
          baseline. Made once with the `assets` command.

Writes into DIR: data.json, roadmap-<date>.json (this week's history file: attach it to the pack page),
snapshot.html, card.png ("BOB Roadmap this week") and report.pdf ("BOB Roadmap Report").
Exit code 1 with a reason on anything that would make a wrong pack (no rows, no browser, nothing rendered).
"""
import argparse, base64, collections, datetime, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE_SRC = os.path.join(HERE, "page.src.html")
BASE_DATE = "2026-11-03"
N, LVL, ST, REL, PROD, EPIC, TRACK, PRI, DS, DE, LR, DEP, JIRA, ID = range(14)
KNOWN_RELEASES = {"Soft Launch Oct-26", "Web Nov-26", "Hard Launch Dec-26", "Phase 1 Nov-26–Oct-27",
                  "Phase 2 Oct-27–Aug-28", "Later 2028", "V2 P1 Apr-27", "Rollout Apr–Aug-27",
                  "Shipped (pre-Oct-26)", "Unscheduled", "Future", "Parked", ""}


def fail(msg):
    print("roadmap-pack: " + msg, file=sys.stderr)
    sys.exit(1)


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def dump(obj, path):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


# ---------------------------------------------------------------- data: rows, week, scope since 3 Nov

def pid(url):
    return (url or "").rstrip("/").split("/")[-1].split("?")[0]


def created(i):
    """Notion page ids here start with a 4-hex-digit counter that goes up by 0x10 a day (0x40d7 = 3 Nov 2026),
    checked against the 23 Oct and 9 Nov snapshots. Used only to show when an added row appeared."""
    try:
        return (datetime.date(2026, 11, 3) + datetime.timedelta(days=round((int(i[:4], 16) - 0x40D7) / 16))).isoformat()
    except ValueError:
        return ""


def rows_from_pages(files):
    rows, seen = [], set()
    for f in files:
        for r in load(f).get("results", []):
            i = pid(r.get("url"))
            if not i or i in seen:
                continue
            seen.add(i)
            deps = r.get("Depends on") or "[]"
            deps = json.loads(deps) if isinstance(deps, str) else deps
            rows.append([r.get("Name") or "", r.get("Level") or "", r.get("Status") or "", r.get("Release") or "",
                         r.get("Product") or "", r.get("Epic") or "", r.get("Track") or "", r.get("Priority") or "",
                         r.get("date:Date:start") or "", r.get("date:Date:end") or "",
                         r.get("date:Last reviewed:start") or "", [pid(d) for d in deps], r.get("Jira Key") or "", i])
    return rows


def due(r):
    return r[DE] or r[DS]


def stats(rows):
    live = [r for r in rows if r[ST] != "Cut"]
    lv = collections.Counter(r[LVL] for r in live)
    ms = [due(r) for r in live if r[LVL] == "Milestone" and due(r)]
    return {"total": len(live), "features": lv["Feature"], "milestones": lv["Milestone"], "tasks": lv["Task"],
            "open": sum(1 for r in live if r[ST] != "Done"), "end": max(ms)[:10] if ms else "",
            "byRelease": dict(collections.Counter(r[REL] or "No release" for r in live))}


def item(r, *extra):
    return [r[ID], r[N], r[LVL], r[REL], *extra]


def diff(old, new):
    o = {r[ID]: r for r in old}
    n = {r[ID]: r for r in new}
    d = {"added": [], "removed": [], "done": [], "cut": [], "moved": [], "slipped": [], "earlier": []}
    for i, r in n.items():
        p = o.get(i)
        if not p:
            if r[ST] != "Cut":
                d["added"].append(item(r, created(i)))
            continue
        if r[ST] == "Done" and p[ST] != "Done":
            d["done"].append(item(r))
        if r[ST] == "Cut" and p[ST] != "Cut":
            d["cut"].append(item(r))
        if r[REL] != p[REL] and r[ST] != "Cut":
            d["moved"].append(item(r, p[REL] or "No release", r[REL] or "No release"))
        a, b = due(p)[:10], due(r)[:10]
        if a and b and a != b and r[ST] not in ("Cut", "Done"):
            d["slipped" if b > a else "earlier"].append(item(r, a, b))
        elif a and not b and r[ST] not in ("Cut", "Done"):
            d["slipped"].append(item(r, a, ""))
    for i, p in o.items():
        if i not in n:
            d["removed"].append(item(p))
    return d


def untracked_count(report):
    for s in ((report or {}).get("parsed") or {}).get("summary") or []:
        m = re.match(r"(\d+)\s+untracked", s)
        if m:
            return int(m.group(1))
    return None


def cmd_data(a):
    os.makedirs(a.work, exist_ok=True)
    rows = rows_from_pages(a.pages)
    if not rows:
        fail("no rows in the page files: stop, don't publish an empty pack")
    today = a.date or datetime.date.today().isoformat()
    report = load(a.report) if a.report else None
    assets = load(a.assets)
    base = assets.get("baseline")
    prev = load(a.prev) if a.prev else None
    now = datetime.datetime.now().astimezone().isoformat(timespec="minutes")
    week = (report or {}).get("week") or "%d-W%02d" % datetime.date.fromisoformat(today).isocalendar()[:2]

    # a broken read must not turn into a confident report
    warnings = []
    if prev and len(rows) < 0.9 * len(prev["rows"]):
        warnings.append("Notion returned %d rows, %d fewer than on %s. Check the read before sharing."
                        % (len(rows), len(prev["rows"]) - len(rows), prev["date"]))
    if not prev:
        warnings.append("Last week's pack data wasn't found, so there is no \"changed since last week\".")
    odd = sorted({r[REL] for r in rows} - KNOWN_RELEASES)
    if odd:
        warnings.append("New release names the page doesn't know yet: " + ", ".join(odd) + ".")
    if report and report.get("week"):
        y, w = map(int, re.match(r"(\d{4})-W(\d+)", report["week"]).groups())
        ty, tw = datetime.date.fromisoformat(today).isocalendar()[:2]
        if (ty * 53 + tw) - (y * 53 + w) >= 1:
            warnings.append("The latest Roadmap Watch report is %s; this week's hasn't been written yet." % report["week"])
    else:
        warnings.append("No Roadmap Watch report was found.")

    ut = untracked_count(report)
    # the scope trend travels inside each week's history file (cloud runs have no history folder)
    trend = [t for t in ((prev or {}).get("trend") or []) if t.get("date") != today]
    if base and not any(t.get("baseline") for t in trend):
        trend.insert(0, {"date": base["date"], "week": base.get("week", ""), "scope": stats(base["rows"])["total"],
                         "untracked": base.get("untracked"), "baseline": True})
    trend.append({"date": today, "week": week, "scope": stats(rows)["total"], "untracked": ut, "baseline": False})
    trend.sort(key=lambda t: (t["date"], not t.get("baseline")))
    hist = {"date": today, "at": now, "week": week, "rows": rows, "untracked": ut, "trend": trend}
    hist_path = os.path.join(a.work, "roadmap-%s.json" % today)
    dump(hist, hist_path)

    weekd = {"since": prev["date"], **diff(prev["rows"], rows)} if prev else None
    scope = None
    if base:
        sd = diff(base["rows"], rows)
        scope = {"baseline": {"date": BASE_DATE, **stats(base["rows"])}, "now": {"date": today, **stats(rows)},
                 "added": sd["added"], "removed": sd["removed"], "cut": sd["cut"], "moved": sd["moved"],
                 "slipped": sd["slipped"], "untracked": ut,
                 "untrackedItems": (((report or {}).get("parsed") or {}).get("untracked") or [])[:12],
                 "trend": trend}
    else:
        warnings.append("The 3 Nov baseline is missing from the build files, so there is no scope section.")

    data = {"at": now, "rows": rows, "report": report, "week": weekd, "scope": scope, "warnings": warnings}
    dump(data, os.path.join(a.work, "data.json"))
    summary = {"rows": len(rows), "week": week, "history": hist_path, "warnings": warnings}
    if weekd:
        summary["since_last_week"] = {"since": weekd["since"], **{k: len(v) for k, v in weekd.items() if k != "since"}}
    if scope:
        summary["scope"] = {"baseline": scope["baseline"]["total"], "now": scope["now"]["total"],
                            "added": len(scope["added"]), "cut": len(scope["cut"]), "untracked": ut,
                            "added_by_release": dict(collections.Counter(x[3] or "No release" for x in scope["added"]))}
    print(json.dumps(summary, ensure_ascii=False, indent=1))


# ---------------------------------------------------------------- build: the snapshot page

def cmd_build(a):
    data_path = os.path.join(a.work, "data.json")
    if not os.path.exists(data_path):
        fail("no data.json in %s: run `data` first" % a.work)
    assets = load(a.assets)
    with open(PAGE_SRC, encoding="utf-8") as f:
        src = f.read()
    src = src.replace("{{WM_PATH}}", assets["wordmark_path"])
    faces = [("Futura LT Pro", "Futuraltpro-Book"), ("Info Display Pro", "Infodisplaypro-Book")]
    css = []
    for fam, name in faces:
        b64 = (assets.get("fonts") or {}).get(name)
        if b64:
            css.append('@font-face{font-family:"%s";font-weight:300 500;font-display:swap;'
                       'src:url("data:font/woff;base64,%s") format("woff")}' % (fam, b64))
        else:
            print("WARNING: font %s missing from the build files; the page falls back to system fonts" % name)
    src = src.replace("{{FONTS}}", "\n".join(css))
    snap = load(data_path)
    # Level, Status, Release, Product, Epic, Track and Priority stored once each, rows refer to them by number
    dicts = [sorted({r[j] for r in snap["rows"]}) for j in range(1, 8)]
    pos = [{v: k for k, v in enumerate(d)} for d in dicts]
    snap = dict(snap, dict=dicts, rows=[[r[0]] + [pos[j - 1][r[j]] for j in range(1, 8)] + r[8:] for r in snap["rows"]])
    blob = json.dumps(snap, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = src.replace("{{SNAPSHOT}}", "<script>window.__SNAP=" + blob + ";</script>")
    html = re.sub(r"(?s)/\*WEB-ONLY\*/.*?/\*/WEB-ONLY\*/\n", "", html)
    left = re.findall(r"\{\{[A-Z_]+\}\}", html)
    if left:
        fail("placeholders left in the page: %s" % left)
    out = os.path.join(a.work, "snapshot.html")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print("snapshot.html", os.path.getsize(out), "bytes,", len(snap["rows"]), "rows")


# ---------------------------------------------------------------- render: picture and PDF with a headless browser

def find_browser():
    env = os.environ.get("CHROME_PATH")
    if env:
        if os.path.exists(env):
            return env
        fail("CHROME_PATH not found: " + env)
    cands = {
        "win32": [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                  r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                  r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                  r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"],
        "darwin": ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                   "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                   "/Applications/Chromium.app/Contents/MacOS/Chromium"],
    }.get(sys.platform, ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
                         "/usr/bin/microsoft-edge"])
    if sys.platform.startswith("linux"):
        root = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
        if os.path.isdir(root):
            for d in sorted(os.listdir(root), reverse=True):
                if d.startswith("chromium-"):
                    cands += [os.path.join(root, d, "chrome-linux", "chrome"), os.path.join(root, d, "chrome-linux64", "chrome")]
    for p in cands:
        if os.path.exists(p):
            return p
    fail("no Chrome, Edge or Chromium found; set CHROME_PATH")


def run_browser(browser, args, url, expect=None):
    prof = tempfile.mkdtemp(prefix="rmpack")          # fresh profile every time: never a cached old page
    flags = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
             "--user-data-dir=" + prof]
    if sys.platform.startswith("linux") and hasattr(os, "geteuid") and os.geteuid() == 0:
        flags.append("--no-sandbox")
    try:
        r = subprocess.run([browser] + flags + args + [url], capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=180)
        if expect:                                      # Edge's Windows launcher can return before the file is written
            for _ in range(60):
                if os.path.exists(expect) and os.path.getsize(expect) > 0:
                    time.sleep(1)
                    break
                time.sleep(1)
        return r
    finally:
        shutil.rmtree(prof, ignore_errors=True)


def file_url(path, query):
    return "file:///" + urllib.parse.quote(os.path.abspath(path).replace("\\", "/").lstrip("/"), safe="/:") + "?" + query


def cmd_render(a):
    src = os.path.join(a.work, "snapshot.html")
    if not os.path.exists(src):
        fail("no snapshot.html in %s: run `build` first" % a.work)
    browser = find_browser()
    tmpd = tempfile.mkdtemp(prefix="rmout")             # no spaces: Edge mishandles them in --screenshot/--print-to-pdf

    # the picture: measure where the content ends (data-card-h), then shoot exactly that height at 2x
    dom = run_browser(browser, ["--window-size=1342,2600", "--virtual-time-budget=8000", "--dump-dom"],
                      file_url(src, "card")).stdout or ""
    m = re.search(r'data-card-h="(\d+)"', dom)
    h = min(max(int(m.group(1)) + 28, 600), 6000) if m else 2600
    if not m:
        print("WARNING: couldn't measure the picture; using 2600 px")
    png_tmp = os.path.join(tmpd, "card.png")
    run_browser(browser, ["--window-size=1342,%d" % h, "--force-device-scale-factor=2", "--virtual-time-budget=8000",
                          "--screenshot=" + png_tmp], file_url(src, "card"), expect=png_tmp)
    if not os.path.exists(png_tmp) or os.path.getsize(png_tmp) == 0:
        fail("the picture was not written (%s)" % browser)
    shutil.move(png_tmp, os.path.join(a.work, "card.png"))

    # the PDF: report mode (open items only, every attention item, a page per section), A4 landscape
    pdf_tmp = os.path.join(tmpd, "report.pdf")
    run_browser(browser, ["--window-size=1342,1600", "--virtual-time-budget=9000", "--no-pdf-header-footer",
                          "--print-to-pdf-no-header", "--print-to-pdf=" + pdf_tmp], file_url(src, "report"), expect=pdf_tmp)
    if not os.path.exists(pdf_tmp) or os.path.getsize(pdf_tmp) == 0:
        fail("the PDF was not written (%s)" % browser)
    shutil.move(pdf_tmp, os.path.join(a.work, "report.pdf"))
    shutil.rmtree(tmpd, ignore_errors=True)
    with open(os.path.join(a.work, "report.pdf"), "rb") as f:
        pages = len(re.findall(rb"/Type\s*/Page[^s]", f.read()))
    print("card.png", os.path.getsize(os.path.join(a.work, "card.png")), "bytes, 1342x%d at 2x" % h)
    print("report.pdf", os.path.getsize(os.path.join(a.work, "report.pdf")), "bytes,", pages, "pages")


# ---------------------------------------------------------------- assets: the build files kept in Notion

def cmd_assets(a):
    fonts = {}
    for name in ("Futuraltpro-Book", "Infodisplaypro-Book"):
        with open(os.path.join(a.fonts, name + ".woff"), "rb") as f:
            fonts[name] = base64.b64encode(f.read()).decode()
    with open(a.wordmark, encoding="utf-8") as f:
        wm = re.search(r' d="([^"]+)"', f.read()).group(1)
    base = load(a.baseline)
    dump({"about": "Build files for tools/roadmap-pack (curagents). Fonts: Curaprox brand fonts, internal use only. "
                   "Wordmark: path copied from curaprox-wordmark-blue.svg. Baseline: the Product Roadmap on 3 Nov 2026.",
          "fonts": fonts, "wordmark_path": wm, "baseline": base}, a.out)
    print(a.out, os.path.getsize(a.out), "bytes")


def main():
    p = argparse.ArgumentParser(description="Weekly BOB roadmap pack")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("data", "all"):
        s = sub.add_parser(name)
        s.add_argument("--work", required=True)
        s.add_argument("--assets", required=True)
        s.add_argument("--report")
        s.add_argument("--prev")
        s.add_argument("--date")
        s.add_argument("pages", nargs="+")
    s = sub.add_parser("build"); s.add_argument("--work", required=True); s.add_argument("--assets", required=True)
    s = sub.add_parser("render"); s.add_argument("--work", required=True)
    s = sub.add_parser("assets")
    for k in ("--fonts", "--wordmark", "--baseline", "--out"):
        s.add_argument(k, required=True)
    a = p.parse_args()
    if a.cmd == "data":
        cmd_data(a)
    elif a.cmd == "build":
        cmd_build(a)
    elif a.cmd == "render":
        cmd_render(a)
    elif a.cmd == "assets":
        cmd_assets(a)
    else:
        cmd_data(a); cmd_build(a); cmd_render(a)


if __name__ == "__main__":
    main()

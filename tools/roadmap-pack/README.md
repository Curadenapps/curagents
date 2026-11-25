# tools/roadmap-pack

The build behind `agents/roadmap-pack.md`: the weekly BOB roadmap picture and PDF.

- `roadmap_pack.py`: the whole build, Python 3 standard library only. `all` = `data` →
  `build` → `render`. Usage at the top of the file.
- `page.src.html`: the roadmap page (the same page as the BOB roadmap dashboard in the
  Marketing folder, `presentations/bob-roadmap-dashboard/_build/index.src.html`). The
  build bakes the data in (`window.__SNAP`) and drops the hosted-only code between the
  `WEB-ONLY` markers. `?card` is the picture layout, `?report` the PDF layout.

What is **not** here, on purpose: the Curaprox brand fonts (licensed, internal use) and
the 3 Nov 2026 baseline rows. Both are in `roadmap-pack-assets.json` on the Notion page
"Roadmap pack · build files" (`4237e8aabbb481ecb0a8fe5e7aef6d47`). Each week's rows
travel as `roadmap-<date>.json` on that week's pack page, so a fresh cloud session can
compare with last week without any local history.

Try it locally (Windows uses Edge or Chrome; Linux finds Chromium or Playwright's, or
set `CHROME_PATH`):

```
python3 tools/roadmap-pack/roadmap_pack.py all --work .roadmap-pack/test \
  --assets assets.json --report report.json --prev roadmap-2026-11-25.json p1.json p2.json p3.json p4.json
```

Checked on 25 Nov 2026 against the W48 pack made by hand: same numbers (250 → 268 live
items since 3 Nov, 17 added, 14 into Phase 1, 16 done since 18 Nov), a 15-page PDF and
a 1342 px picture at 2x.

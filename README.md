# ANA Atlas, by Dr. Misurya

An interactive, educational decision-support tool for interpreting a positive ANA: a body map of findings, the titer and ICAP pattern,
a Bayesian estimate shown as a range with its evidence grade, rule-based next steps, a PDF report, a triage game and an image library.

**Not a diagnosis, not a medical device, not validated on patients.** Read the "Model & limits" tab.

## Run locally
```bash
node serve.mjs 8765      # then open http://localhost:8765
node build.mjs           # rebuild index.html after editing app.template.html or the data files
node engine.check.mjs    # engine and challenge-case tests
```

## Files
| File | Purpose |
|---|---|
| `index.html` | The built app (committed, so any static host can serve it) |
| `app.template.html` → `build.mjs` | App source and build step |
| `engine.mjs`, `ana-engine-config.v2.json`, `cases.json` | Calculation engine, weights/titers/patterns (each with an evidence grade), challenge cases |
| `engine.check.mjs` | Tests |
| `ANA-Calculator-Research-Report.md` | Evidence synthesis and design decisions |
| `assets/anatomy.glb` | 3D anatomy (BodyParts3D, CC BY-SA 2.1 Japan) |
| `assets/edu/`, `assets/edu/credits.json` | Education images with author and licence for each |
| `assets/about/` | About photo |
| `tools/` | Reproducible asset builders: `build-anatomy.mjs`, `fetch-edu-images.mjs`, `external-figures.json` (the latter needs ImageMagick) |

## Deploy
Static site, no build step. On Netlify: *Add new site → Import from Git*, pick this repo; `netlify.toml` sets the publish folder.
Runtime CDNs: Google Fonts, Tailwind (Play CDN), three.js (pinned), jsPDF (loaded on first PDF export).

## Licences
Code and data files: MIT (`LICENSE`). The 3D model and the education images keep their own licences: see `ATTRIBUTION.md` and `assets/edu/credits.json`.

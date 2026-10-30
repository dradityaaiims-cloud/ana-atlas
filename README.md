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
| `assets/body.webp`, `assets/body-markers.json` | Static body image (rendered from BodyParts3D, CC BY-SA 2.1 Japan) and the marker positions on it |
| `assets/edu/`, `assets/edu/credits.json` | Education images with author and licence for each |
| `assets/about/` | About photo |
| `tools/` | Asset builders: `build-anatomy.mjs` (3D source into `tools/.cache/`, not committed), `render-body.html` (renders the body image and marker positions; change marker offsets in `app.template.html`, then re-render), `fetch-edu-images.mjs` + `external-figures.json` (education images; needs ImageMagick) |

## Deploy
Static site, no build step. On Netlify: *Add new site → Import from Git*, pick this repo; `netlify.toml` sets the publish folder.
Runtime CDNs: Google Fonts, Tailwind (Play CDN), jsPDF (loaded on first PDF export). The body is a static image, so the page needs no 3D library.

## Licences
Code and data files: MIT (`LICENSE`). The body image and the education images keep their own licences: see `ATTRIBUTION.md` and `assets/edu/credits.json`.

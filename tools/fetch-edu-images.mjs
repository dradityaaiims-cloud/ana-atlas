// Downloads web-sized copies of openly licensed teaching images from Wikimedia Commons into assets/edu/
// and writes assets/edu/credits.json (author, licence, source URL) from Commons' own metadata.
// Usage: node tools/fetch-edu-images.mjs      Only CC0 / public domain / CC BY / CC BY-SA files are kept.
import { mkdirSync, writeFileSync, existsSync, unlinkSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const out = fileURLToPath(new URL("../assets/edu/", import.meta.url));
mkdirSync(out, { recursive: true });
const UA = { "User-Agent": "ana-calculator-edu/1.0 (educational, open-source decision-support tool)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OK = /^(CC0|Public domain|CC BY(-SA)? [\d.]+)$/i;

const LIST = {
  ana_main_patterns: "Main antinuclear antibody patterns on immunofluorescence.png",
  ana_speckled_hep2: "SPECKLED.jpg",
  ana_centromere: "CENTROMERE.jpg",
  ana_nucleolar: "ANA NUCLEOLAR.jpg",
  ana_dots_nucleolar: "ANA NUCLEAR DOTS AND NUCLEOLAR.jpg",
  ana_homogeneous_liver: "ANA HOMOGENOUS DNA ABS LIVER.jpg",
  ana_speckled_liver: "ANA SPECKLED LIVER.jpg",
  ana_negative_liver: "ANA NEGATIVE LIVER.jpg",
  ana_dot_ama: "ANA NUCLEAR DOT AND AMA.jpg",
  malar_rash: "Butterfly rash of lupus erythematosus.jpg",
  scle: "Subacute cutaneous lupus erythematosus.jpg",
  discoid: "Discoid lupus erythematosus.JPG",
  raynaud: "Mains atteintes du syndrome de Raynaud en phase blanche.jpg",
  raynaud2: "Raynaud's Phenomenon (front).jpg",
  ssc_finger: "Systemic sclerosis finger.jpg",
  ssc_fingers: "Systemic sclerosis, fingers.jpg",
  calcinosis: "Calcinosis of CREST syndrome.jpg",
  gottron: "Gottron papules .dermatomyocitis.jpg",
  dermatomyositis: "Dermatomyositis.jpg",
  ra_hands: "Rheumatoid Arthritis.JPG",
  knee_effusion: "Kneeffusion.JPG",
  nailfold: "Nailfold Capillaries.png",
  rosacea: "Rosacea 01.jpg",
  schirmer: "Schirmer test.JPG",
  heliotrope_dark_skin: "Dermatomyositis11.jpg",
  ssc_hands_bilateral: "Systemic sclerosis, changes on hands are allways bilateral.jpg",
  urine_wbc_cast: "WBC cast in urine.jpg",
  urine_epithelial_cast: "Epithelial cell cast.jpg",
};
// Figures from open-access articles whose licence was checked in the article XML (Europe PMC); data in external-figures.json.
const EXTERNAL = JSON.parse(readFileSync(new URL("./external-figures.json", import.meta.url)));
const strip = (h = "") => h.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const clean = (a) => { a = a.replace(/\s*(Author info|Reusing images|Conflicts of interest).*$/i, "").trim(); return a.length > 110 ? a.slice(0, 107).replace(/[,;\s]+\S*$/, "") + " et al." : a; };
const credits = {};
for (const [slug, title] of Object.entries(LIST)) {
  await sleep(2500);
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", titles: "File:" + title, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: 900 }).forEach(([k, v]) => u.searchParams.set(k, v));
  let info;
  for (let t = 0; t < 4 && !info; t++) { try { const r = await (await fetch(u, { headers: UA })).json(); info = Object.values(r.query.pages)[0].imageinfo?.[0]; } catch { await sleep(6000); } }
  if (!info) { console.warn("SKIP (not found)", title); continue; }
  const m = info.extmetadata, lic = m.LicenseShortName?.value ?? "";
  if (!OK.test(lic)) { console.warn("SKIP (licence)", title, lic); continue; }
  const ext = /\.png$/i.test(title) ? "png" : "jpg";
  const file = `${slug}.${ext}`;
  if (!existsSync(join(out, file))) {
    let buf; for (let t = 0; t < 4 && !buf; t++) { const r = await fetch(info.thumburl || info.url, { headers: UA }); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); else await sleep(6000); }
    if (!buf) { console.warn("SKIP (download)", title); continue; }
    writeFileSync(join(out, file), buf);
  }
  credits[slug] = { file, title, author: clean(strip(m.Artist?.value)) || "Unknown", licence: lic, licenceUrl: m.LicenseUrl?.value ?? "", source: info.descriptionurl };
  console.log("ok", file, lic);
}
const pmcHtml = {};
for (const [slug, e] of Object.entries(EXTERNAL)) {
  const file = slug + ".jpg", f = join(out, file), src = join(out, slug + ".src");
  if (!existsSync(f)) {
    let url = e.url;
    if (!url) { // PMC-hosted figure: find the file URL on the article page
      pmcHtml[e.pmc] ??= await (await fetch(`https://pmc.ncbi.nlm.nih.gov/articles/${e.pmc}/`, { headers: UA })).text();
      url = [...pmcHtml[e.pmc].matchAll(/https:\/\/cdn\.ncbi\.nlm\.nih\.gov\/pmc\/blobs\/[^"' ]+/g)].map((m) => m[0]).find((u) => u.split("/").pop().replace(/\.[a-z]+$/i, "").toLowerCase() === e.stem.toLowerCase());
      await sleep(800);
    }
    if (!url) { console.warn("SKIP (no figure URL)", slug); continue; }
    const r = await fetch(url, { headers: UA }); if (!r.ok) { console.warn("SKIP (download)", slug, r.status); continue; }
    writeFileSync(src, Buffer.from(await r.arrayBuffer()));
    execFileSync("magick", [src + "[0]", "-resize", "1100x1100>", "-background", "white", "-alpha", "remove", "-quality", "82", f], { stdio: "ignore" });
    unlinkSync(src);
  }
  credits[slug] = { file, title: e.title ?? slug, author: e.author, licence: e.licence, licenceUrl: e.licenceUrl ?? "https://creativecommons.org/licenses/by/4.0/",
    source: e.source ?? `https://doi.org/${e.doi}`, sourceLabel: e.sourceLabel };
  console.log("ok", file, e.licence);
}
writeFileSync(join(out, "credits.json"), JSON.stringify(credits, null, 1));
console.log(Object.keys(credits).length, "images");

// Inlines config, cases and engine into one index.html. Run: node build.mjs
import { readFileSync, writeFileSync } from "node:fs";
const r = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const json = (f) => JSON.stringify(JSON.parse(r(f)));
const out = r("./app.template.html")
  .replace("/*@CONFIG*/null", () => json("./ana-engine-config.v2.json"))
  .replace("/*@CASES*/null", () => json("./cases.json"))
  .replace("/*@CREDITS*/null", () => json("./assets/edu/credits.json"))
  .replace("/*@ENGINE*/", () => r("./engine.mjs").replace(/^export /gm, ""));
writeFileSync(new URL("./index.html", import.meta.url), out);
console.log("index.html", out.length, "bytes");

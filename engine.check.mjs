// Self-check for the engine and the challenge cases. Run: node engine.check.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { calc } from "./engine.mjs";

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const cfg = load("./ana-engine-config.v2.json");
const cases = load("./cases.json");
const P = cfg.engineParameters;
const prob = (o) => o / (1 + o);

for (const k of cases) {
  const r = calc(k.input, cfg);
  console.log(k.id, "score", String(r.score).padStart(2), "post", r.post?.toFixed(3), r.tier);
  assert.equal(r.tier, k.expect, k.id);
}
const extra = [
  ["same as c04 + abnormal baseline labs", { symptoms: ["synovitis", "leukopenia"], titerId: "titer_1_160", patternId: "AC-1", abnormalLabs: true }, "RED_EXPEDITED"],
  ["solid-phase both positive, no features", { symptoms: [], assayComboId: "both_pos" }, "YELLOW"],
  ["solid-phase both negative", { symptoms: ["synovitis"], assayComboId: "both_neg" }, "YELLOW"],
];
for (const [n, i, want] of extra) { const r = calc(i, cfg); console.log(n, r.post?.toFixed(3), r.tier); assert.equal(r.tier, want, n); }

const L = cfg.titerSpectrum.map((t) => t.lr);
assert.ok(L[2] < L[3] && L[3] < L[4] && L[4] < L[5] && L[5] <= L[6], "LR rises from 1:80 up");
assert.ok(L.every((x) => x <= P.combinedLrCap), "titer LR <= cap");
assert.ok(calc({ symptoms: ["skin_thickening_proximal_mcp", "nephritis_class_3_4"], titerId: "titer_1_1280", patternId: "AC-3" }, cfg).lr <= P.combinedLrCap, "cap holds");
const a = calc({ symptoms: [], titerId: "titer_neg", patternId: "UNSPEC" }, cfg).lr;
const b = calc({ symptoms: [], titerId: "titer_neg", patternId: "UNSPEC", confounders: ["chronic_infection"] }, cfg).lr;
assert.equal(a, b, "confounder never alters LR<1");
const lo = calc({ symptoms: ["raynaud"], titerId: "titer_1_320", patternId: "UNSPEC", lrBound: "lo" }, cfg).post;
const hi = calc({ symptoms: ["raynaud"], titerId: "titer_1_320", patternId: "UNSPEC", lrBound: "hi" }, cfg).post;
assert.ok(lo < hi, "range ordered");
console.log("pretest anchors:", [0, 4, 7, 9, 12].map((s) => `${s}:${prob(Math.exp(P.beta0LogOdds + P.beta1SlopePerPoint * s)).toFixed(3)}`).join("  "));
console.log("ALL CHECKS PASSED");

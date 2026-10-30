// Pure engine, no imports: build.mjs inlines this file into index.html.
const odds = (p) => p / (1 - p);
const prob = (o) => o / (1 + o);

export function calc(inp, c) {
  const P = c.engineParameters;
  const ids = new Set(inp.symptoms ?? []);
  let score = 0, objective = false, penalty = 0;
  for (const d of c.clinicalDomains) {
    const w = d.items.filter((i) => ids.has(i.id)).map((i) => i.weight);
    if (!w.length) continue;
    if (d.rule === "MAX") { const m = Math.max(...w); score += m; if (m > 0) objective = true; }
    else penalty += Math.min(...w);
  }
  if (!objective) score += penalty;

  if (inp.redFlags?.length) return { score, tier: "URGENT" };
  if (inp.pediatric) { // evidence is single-centre: rules only, no numbers
    const hi = inp.titerId === "titer_1_640" || inp.titerId === "titer_1_1280";
    return { score, tier: objective || hi ? "RED_ROUTINE" : "GREEN", numeric: false };
  }

  let o = Math.exp(P.beta0LogOdds + P.beta1SlopePerPoint * score);
  if (inp.confounders?.includes("first_degree_relative")) o *= P.familyHistoryPretestOddsMultiplier;
  const pre = prob(o);

  const combo = inp.assayComboId ? c.assayCombos.find((x) => x.id === inp.assayComboId) : null;
  const t = combo ? null : c.titerSpectrum.find((x) => x.id === inp.titerId);
  const pat = combo ? c.icapPatterns.at(-1) : c.icapPatterns.find((x) => x.id === inp.patternId) ?? c.icapPatterns.at(-1);
  let lrT = combo ? combo.lr : inp.lrBound ? t.lrRange[inp.lrBound === "lo" ? 0 : 1] : t.lr;
  let lrP = pat.lr ?? 1;
  if (pat.id === "AC-2") lrP = inp.dfs70Confirmed && !objective && !inp.specificAb ? pat.lr : pat.lrUnconfirmed;
  if (lrP >= 1 && lrT >= 1 && !pat.bypassShrinkage) lrP = lrP ** P.patternShrinkageAlpha;

  // dampen only LRs >=1: multiplying an LR <1 would add false reassurance
  const cfs = c.confounders.filter((x) => inp.confounders?.includes(x.id)).map((x) => x.cf);
  const cf = cfs.length && score < P.confounderAppliesBelowScore && lrT >= 1 ? Math.max(P.confounderFloor, Math.min(...cfs)) : 1;

  const lr = Math.min(P.combinedLrCap, lrT * cf * lrP);
  const post = prob(odds(pre) * lr);

  const th = P.thresholds;
  let tier;
  if (inp.specificAb || (inp.abnormalLabs && post > th.yellowMaxPost)) tier = "RED_EXPEDITED";
  else if (post > th.expeditedMinPost) tier = "RED_EXPEDITED";
  else if (post > th.yellowMaxPost || score >= th.redScore) tier = "RED_ROUTINE";
  else if (post > th.greenMaxPost) tier = "YELLOW";
  else tier = "GREEN";
  const soft = combo ? combo.lr >= 10
    : c.titerSpectrum.findIndex((x) => x.id === inp.titerId) >= c.titerSpectrum.findIndex((x) => x.id === P.titerSoftReflexFrom);
  const dfsRuledOut = pat.id === "AC-2" && lrP === pat.lr; // confirmed monospecific DFS70
  if (tier === "GREEN" && !dfsRuledOut && (soft || pat.softReflex)) tier = "YELLOW";
  if (tier === "GREEN" && score > P.lowPretestMaxScore) tier = "YELLOW"; // objective features: never auto-reassure
  return { score, pre, lrT, cf, lrP, lr, post, tier, numeric: true, objective };
}

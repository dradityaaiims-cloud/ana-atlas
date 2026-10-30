# Positive-ANA Decision Calculator — Evidence Synthesis & Build Spec

Companion files in this folder: `ana-engine-config.v2.json` (drop-in data), `engine.check.mjs` (reference engine + self-test; all checks pass).
Sources: (A) your voice-note Q&A report, (B) *Clinical Decision Support & Bayesian Engine Blueprint*, (C) *Evidence Repository & Design Specification*, plus primary literature cited inside those. I did **not** run a fresh literature search; anything not in A/B/C is marked **[verify]**.

Evidence grades used in the JSON: **A** classification-criteria weight · **B** published LR/meta-analysis · **C** cohort-derived / illustrative · **D** design assumption (needs local calibration).

---

## 0. Read first: where the three sources disagree (and what I chose)

| # | Issue | Blueprint (B) | Evidence repo (C) / primary data | Resolution in v2 |
|---|---|---|---|---|
| 1 | **Titer LRs at low titers** | 1:40 = 1.2, 1:80 = 1.8, 1:160 = 4.8 | Bossuyt 2020 interval LR: **1:80 ≈ 0.5** (exact 1:80 *lowers* SLE odds) | Use interval LRs: 0.7 / 0.5 / 2.0. B's low-titer LRs raise risk where data say they lower it |
| 2 | **Healthy prevalence is cumulative, not per band** | "28% FP at 1:40, 13.5% at 1:80" shown as per-tier | Tan 1997 figures are **≥ thresholds** (31.7/13.3/5.0/3.3%) | Store both; per-band = 18.4 / 8.3 / 1.7 / 1.3% (derived, see §2.2) |
| 3 | Your prompt's prevalence (`<1–3%` at ≥1:320) | – | Tan: **3.3%** at ≥1:320; ~2% ≥1:640; ~1% ≥1:1280 | Corrected values used |
| 4 | **Naive multiplication of titer × pattern × antibody** | α = 0.65 shrinkage, no cap | C §1.4: use one informative layer or a **capped** LR; best published combined LR = 26.2 | Keep α = 0.65, add **cap = 26** |
| 5 | **Criteria weights mislabeled** | "Sclerodactyly/skin thickening" = 9; ILD/PAH = 6; Raynaud = 5; pericarditis/effusion both 5 | SSc 2013: skin thickening *proximal to MCPs* = 9; **sclerodactyly = 4**; ILD/PAH = 2; Raynaud = 3. SLE: pericarditis 6, effusion 5 | Split items; non-criteria values flagged grade D (§1.1) |
| 6 | Confounder multiplier applied to every LR | Applied to LR < 1 too | Multiplying an LR < 1 by 0.5 makes negative results *more* reassuring | Dampen **only LR ≥ 1**; floor 0.3; use `min`, not product |
| 7 | Family history | Dampens titer LR (0.75) only | Family history also **raises true pretest risk** | Both: titer-LR ×0.75 **and** pretest odds ×1.5 (D) |
| 8 | **Assay warning** "solid-phase misses 22%" | Fixed 22% | C: IIF vs FEIA sensitivity is disease-specific (SSc 94 vs 79; SLE 87 vs 81; IIM 63 vs 50; **Sjögren 80 vs 88**); solid-phase is *more specific* | No fixed 22%. Use assay-combination LRs (§2.4) |
| 9 | **Show a probability at all?** | Yes, point estimate | A: no validated symptom+titer+pattern formula exists | Show **ranges** + evidence-grade badge + "illustrative" label; the **traffic light is rule-based**, number is supporting |
| 10 | Tier-1 titer ceiling | Prompt: ≤1:80; C: ≤1:160 | Abeles 2013: no AARD below 1:160 (referral cohort) | Tier 1 ≤1:80 clean; **1:160 low-pretest = Tier 1 + safety-net, bumped to Tier 2 if disease-associated pattern** |
| 11 | Source doc truncated | B's TypeScript is cut off mid-function on p5 | – | Don't copy it; use `engine.check.mjs` |

---

## Module 1 — Pre-test probability & clinical weighting

### 1.1 Weight matrix (what the scoring scaffold uses)

Rule (all criteria sets): score only if no more likely explanation; **highest item per domain**.

**SLE — 2019 EULAR/ACR** (entry ANA ≥1:80 ever + ≥1 clinical criterion; ≥10 pts; sens 96.1%, spec 93.4%)

| Domain | Item | Pts |
|---|---|---|
| Constitutional | Fever >38.3 °C | 2 |
| Hematologic | Leukopenia <4,000 / Thrombocytopenia <100k / Autoimmune hemolysis | 3 / 4 / 4 |
| Neuropsychiatric | Delirium / Psychosis / Seizure | 2 / 3 / 5 |
| Mucocutaneous | Non-scarring alopecia / Oral ulcers | 2 / 2 |
| | Subacute cutaneous or discoid | 4 |
| | Acute cutaneous lupus | 6 |
| Serosal | Effusion / Acute pericarditis | 5 / 6 |
| Musculoskeletal | Synovitis ≥2 joints, or tender ≥2 + ≥30 min stiffness | 6 |
| Renal | Proteinuria >0.5 g/24h / Class II or V / Class III or IV | 4 / 8 / 10 |
| Antiphospholipid | aCL, anti-β2GPI, or LA | 2 |
| Complement | Low C3 or C4 / both | 3 / 4 |
| SLE-specific Ab | Anti-dsDNA or anti-Sm | 6 |

Lab-based rows (aPL, complement, dsDNA/Sm) belong to the **reflex/classification stage**, not the pretest score.

**SSc — 2013 ACR/EULAR** (≥9; sens 91%, spec 92%): skin thickening proximal to MCPs **9** (sufficient alone) · sclerodactyly **4** (puffy fingers 2) · fingertip pitting scars **3** (digital tip ulcers 2) · telangiectasia **2** · abnormal nailfold capillaries **2** · ILD or PAH **2** · Raynaud **3** · SSc antibodies (centromere, Scl-70, RNA Pol III) **3**.

**Sjögren — 2016 ACR/EULAR** (entry: ocular/oral dryness or ESSDAI ≥1; ≥4; sens 96%, spec 95%): focal lymphocytic sialadenitis ≥1 **3** · anti-SSA/Ro **3** · ocular staining score ≥5 **1** · Schirmer ≤5 mm **1** · unstimulated salivary flow ≤0.1 mL/min **1**. Anti-SSB alone no longer counts.

**IIM — 2017 EULAR/ACR**: probability score. Anti-Jo-1 is the heaviest single item (≈3.9 **[verify]**); probable ≥55% (score ≥5.5 without biopsy). Under-classifies anti-HMGCR, SRP, MDA5, PL-7.

**App pretest scoring scale.** Where a feature exists in the SLE criteria, use the SLE weight. Otherwise rescale to the same 10-point "classification-equivalent" scale (rule: `10 × weight / threshold`, rounded) or place it in C's "moderate tier". All such values are **grade D** in the JSON.

### 1.2 Score → pretest probability

`logit(P) = −4.1846 + 0.48 × score` (B's constants; grade D, **kept** because they land on C's tier anchors):

| Score | 0 | 4 | 7 | 9 | 10 | 12 |
|---|---|---|---|---|---|---|
| Pretest | 1.5% | 9.4% | 30.5% | 53.4% | 64.9% | 82.9% |
| C's anchor | Low 1–2% | Intermediate ~10% | High ≥30% | (Alsaed: CTD in 43–53% of rheum-clinic ANA ≥1:80–1:160) | | |

Caveats to print in the UI: the weights are SLE *classification* points used as a *triage scaffold*; they do not give "points = %". The logistic is an assumption, not a fitted model. For comparison, the only fitted ANA-positive model (Barnado 2024: age, sex, titer, other autoantibody, platelets, symptom billing-code count) had hold-out AUC 0.75, calibration slope 0.71, no pattern, single center.

Empirical anchors for low pretest: Brunekreef 1.6% new CTD in 6 y (ANA PPV 7%, NPV 98%); Kang 0.69% of tested / 4.74% of ANA+ had AARD; Abeles PPV 2.1% SLE / 9.1% AARD; inpatients PPV 1.7%; Canadian triage 24% AARD, 26% none.

### 1.3 High-yield vs low-yield features

| Class | Features | App behavior |
|---|---|---|
| **High-yield (objective)** | Synovitis ≥2 joints · malar/photosensitive acute cutaneous lupus (spares nasolabial folds) · SCLE/discoid · serositis · proteinuria/active sediment · unexplained cytopenia · skin thickening/sclerodactyly · Gottron/heliotrope · proximal weakness + high CK · digital ulcers · ILD/PAH | Move to high tier |
| **Moderate** | Raynaud (esp. with puffy fingers: Raynaud + ANA + puffy fingers = VEDOSS red flag) · persistent objective sicca · oral ulcers · non-scarring alopecia · unexplained fever · recurrent pregnancy loss/thrombosis | Intermediate tier |
| **Low / none** | Isolated fatigue, myalgias, fibromyalgia (ANA+ in 8–11%, ≈ background; 1-yr SLE risk ~0.0027%), arthralgia without swelling/stiffness, headache, brain fog | **Penalty −2, only when no objective domain selected** |

Raynaud numbers: of 586 patients, 12.6% developed definite SSc; predictors ANA by IIF HR 5.67, SSc antibodies HR 4.70, abnormal capillaroscopy HR 4.50; with ANA negative and normal capillaroscopy, SSc risk <2%.

### 1.4 Baseline-risk modifiers

| Modifier | Effect | Value | Grade |
|---|---|---|---|
| Female | Doubles *healthy* ANA prevalence (17.8% vs 9.6% at ≥1:80; OR 2.02) but also raises SLE incidence | **No LR adjustment** (effects roughly cancel) | C |
| Age >65 | Healthy ≥1:80 prevalence ~19% at ≥70 y; new-onset SLE falls | Titer-LR × 0.70 | C |
| Young adult + strongly positive ANA | Danish cohort: 5-y SLE risk up to ~4–5% only in young adults with strong ANA | Don't dampen; note age as a risk *up* | C |
| First-degree relative with AARD | Raises true risk and background ANA | Pretest odds ×1.5; titer-LR ×0.75 | D |
| Culprit drug (hydralazine, procainamide, minocycline, anti-TNF, ICI) | ANA without AARD common; drug-induced lupus (DIL) real | Titer-LR ×0.50 **and** route to DIL branch: anti-histone (up to 95% in DIL, also ~75% idiopathic SLE), dsDNA <5%, normal complement | D |
| Autoimmune thyroid | Raises background ANA | ×0.55 | D |
| Chronic infection (HCV, EBV, SBE) | Raises background ANA | ×0.45 | D |
| Pediatric | Healthy 5–18% positive; ANA adds no value for undiagnosed MSK pain | Separate rule-only branch (Module 4) | C |

---

## Module 2 — Titer spectrum & dilution scales

### 2.1 Two kinds of LR (don't mix them)
* **Threshold (≥)**: Leuchten 2018, 64 studies, 13,080 SLE: LR+ **3.86** (≥1:80), **6.95** (≥1:160).
* **Interval (exact band)**: what the clinician has in hand. Bossuyt 2020 illustrative: **~0.5 at 1:80, ~10 at 1:320, ~19 at 1:640, ~20 at ≥1:1280** (authors call for empirical derivation → keep editable).

### 2.2 Healthy prevalence and a derived cross-check

Cumulative healthy-adult prevalence (Tan 1997; ≥1:640 and ≥1:1280 from Racoubian 2016/Akmatov 2017, a different cohort):

| Titer (std) | Titer (legacy) | Healthy ≥ titer | Healthy **exact band** (derived) | SLE sens ≥ (Leuchten) | **Cross-check interval LR** (derived) | Bossuyt | **v2 LR (range)** |
|---|---|---|---|---|---|---|---|
| <1:40 | <1:32 | – | 68.3% | – | – | – | **0.05 (0.03–0.08)** |
| 1:40 | 1:32 | 31.7% | 18.4% | 98.4% | 0.6/18.4 ≈ **0.03** | uninformative | **0.7 (0.3–1.0)** |
| 1:80 | 1:64 | 13.3% | 8.3% | 97.8% | 2.0/8.3 ≈ **0.24** | ~0.5 | **0.5 (0.25–0.8)** |
| 1:160 | 1:128 | 5.0% | 1.7% | 95.8% | 9.8/1.7 ≈ **5.8** | – (C: 1–3 design est.) | **2.0 (1–6)** |
| 1:320 | 1:256 | 3.3% | 1.3% | 86.0% (≥1:320) | pooled ≥1:320: 86.0/3.3 ≈ **26** | ~10 | **10 (6–26)** |
| 1:640 | 1:512 | ~2% | ~1.0% | – | – | ~19 | **19 (10–26)** |
| ≥1:1280 | ≥1:1024 | ~1% | ~1.0% | – | – | ~20 | **20 (12–26)** |

Notes: the derived column mixes a healthy-control cohort with a meta-regression of SLE sensitivity, so it is a sanity check on direction and order of magnitude, **not** a source for the numbers. It confirms the key point: *exactly* 1:40–1:80 argues against SLE, while the rise happens at 1:160→1:320. v2 values are deliberately conservative toward the Bossuyt/C estimates; the range is what the UI should draw as an error bar. Values for AARD overall (vs SLE alone) are lower at low titers because SSc/Sjögren/IIM patients more often have low titers (Agustinelli 2019: titers ≤1:320 in 67–70% of ANA+ healthy/non-autoimmune vs 19.4% of SARD).

**Display against PPV, not just LR** (educational "evidence panel"). Vulsteke (9,851 consecutive hospital patients), PPV for AARD by pattern × titer; PPV at 1:80 ≤4% for all patterns:

| Pattern | 1:160 | 1:320 | 1:640 | 1:1280 |
|---|---|---|---|---|
| Centromere | 29% | 42% | 77% | 82% |
| Speckled | 13% | 39% | 32% | 71% |
| Nucleolar | 19% | 31% | n/q | 61% |
| Homogeneous | 6% | 9% | 29% | 39% |

Label as "observed frequency in a published hospital cohort — not a personalized probability". Speckled is non-monotonic (39% → 32%): an empirical table, not a biological curve. Do not multiply PPVs by symptom points.

Other benchmarks: SLE sens/spec by cutoff (Leuchten) ≥1:40 98.4/66.9 · ≥1:80 97.8/74.7 · ≥1:160 95.8/86.2 · ≥1:320 86.0/96.6. Li 2022 threshold LRs 5.16 (≥1+), 9.29 (≥2+), 19.6 (≥3+) for intensity-graded reports.

### 2.3 The two scales

| Std (×2 from 1:40) | 1:40 | 1:80 | 1:160 | 1:320 | 1:640 | ≥1:1280 |
|---|---|---|---|---|---|---|
| **Legacy (×2 from 1:32)** | 1:32 | 1:64 | 1:128 | 1:256 | 1:512 | ≥1:1024 |

* Both series are 2-fold, so **rank-map** legacy → standard and show "≈" on screen. A 1:64 end-point is ~20% more concentrated than 1:80, so a legacy value sits between two standard tiers (±1-tier uncertainty). Never silently round; keep the entered label (source A's rule).
* **Lab calibration**: EFLM/EASI/ICAP 2023 advises each lab set its screening dilution at the **95th percentile of local healthy controls (often 1:160)**. Expose `screeningCutoff` as a lab setting and shift Tier-1 ceiling accordingly.
* Intensity-graded (1+…4+) and other dilutions (1:100) → free-entry with lab cutoff; don't extrapolate.
* Titer never tracks flare severity; no serial ANA.

### 2.4 Method caveat (IIF vs solid-phase)

| Method | Strength | Weakness | In engine |
|---|---|---|---|
| **HEp-2 IIF** (reference; ACR) | Highest sensitivity; gives titer + ICAP pattern; catches Ro, Jo-1 *sometimes* | Lab-to-lab variation (substrate, conjugate, optics, reader); lower specificity in low-risk settings | Titer bands apply |
| **ELISA / multiplex / CBA** | More specific; better in low-pretest populations and Sjögren (80 vs 88%) | Can miss up to ~35% more positives; **no titer, no pattern**; miss SSc (79 vs 94%) and IIM (50 vs 63%) | Use manufacturer cutoff; **no titer bands** |

Discordance logic (Bossuyt 2020): IIF+/SP− → LR 5.1; IIF−/SP+ → 14.4; both + → **26.2**; both − → **0.15**. Mahler 2014: IIF LR+ ~7 / LR− ~0.03; solid-phase CTD screen LR+ ~24 / LR− ~0.27. Discordant IIF+/SP− commonly = DFS70, low-titer or cytoplasmic pattern; IIF−/SP+ = Ro/Jo-1/SSB-type antigens. Always capture the exact method; if IIF is negative but a Sjögren/myositis picture exists, order SSA/Ro and a myositis panel directly (20.5% of IIM samples were IIF-negative but antibody-positive).

---

## Module 3 — ICAP patterns & reflex mapping

AC-0…AC-29 exist at *competent* vs *expert* reporting level; most primary-care reports show only competent-level codes. Pattern LR is **grade D** for every row below (no published pattern-conditional LRs); only the ordering is supported (Vulsteke: centromere > nucleolar ≈ speckled > homogeneous). Rare patterns have **no** LR — reflex only (source A: don't manufacture probabilities).

| AC | Pattern | Mitotic plate | Antibodies | Diseases | v2 LR | Next test | Avoid |
|---|---|---|---|---|---|---|---|
| **1** | Homogeneous | Positive | dsDNA, nucleosome, histone | SLE, DIL, JIA, AIH (child OR 4.56) | 1.5 | dsDNA; C3/C4; UA + UPCR; anti-histone if culprit drug | anti-centromere |
| **2** | Dense fine speckled | Positive | **DFS70/LEDGF** | Healthy; rare SARD if monospecific | **0.18** (0.05–0.5) conditional; 0.5 if unconfirmed | Confirm anti-DFS70 + limited ENA | broad ENA |
| **3** | Centromere | Aligned dots | CENP-A/B/C | lcSSc, **PBC**, Sjögren, PAH | 22 | Raynaud/capillaroscopy, ALP + AMA, echo/PFT-DLCO if SSc features | broad ENA |
| **4** | Fine speckled | Negative | SSA/Ro60/52, SSB/La, Mi-2, TIF1γ, Ku | Sjögren, SLE, SCLE, DM, neonatal lupus | 1.5 | SSA/SSB; + myositis panel & CK if weakness/rash | – |
| **4a** | Myriad discrete fine speckled | Negative | Ro60 (~98%) | Sjögren, SLE | reflex only | anti-Ro60 | – |
| **5** | Large/coarse speckled | Negative | Sm, U1-RNP, RNA Pol III | SLE, MCTD, SSc | 4.2 | Sm, U1-RNP, Pol III if skin/Raynaud, C3/C4 | AMA |
| **6/7** | Multiple/few nuclear dots | – | Sp100, PML, coilin | PBC, Sjögren | reflex only | AMA, ALP, anti-Sp100 | – |
| **8/9/10** | Nucleolar (homog./clumpy/punctate) | – | Th/To, PM/Scl, fibrillarin, RNA Pol I/III | SSc spectrum, PAH, ILD, myositis overlap | 4.2 | SSc panel; HRCT/PFT if Raynaud/dyspnea | anti-histone |
| **11/12** | Nuclear envelope (smooth/punctate) | – | lamins / gp210 | PBC (gp210) | reflex only | AMA, anti-gp210 | – |
| **13** | PCNA-like | – | PCNA | SLE (rare, specific) | reflex only | anti-PCNA, dsDNA | – |
| **14** | CENP-F-like | – | CENP-F | Malignancy | reflex only | age-appropriate cancer eval | – |
| **15–17** | Cytoplasmic fibrillar (linear/filamentous/segmental) **[verify numbering]** | – | actin, vimentin, α-actinin | AIH, HCV, myasthenia | reflex only | anti-smooth-muscle Ab, LFTs | – |
| **18** | Cytoplasmic discrete dots (GW bodies) **[verify]** | – | GW182 | Sjögren/neuro, mostly benign | reflex only | – | – |
| **19/20** | Cytoplasmic speckled (19 dense fine, 20 fine) | – | Jo-1, PL-7, PL-12, SRP, ribosomal P | Antisynthetase syndrome, IMNM, SLE (ribosomal P) | 4.5 | Jo-1 + antisynthetase panel, CK, chest imaging/PFT | nuclear-only ENA |
| **21** | Reticular / AMA | – | PDC-E2 (M2) | PBC | reflex only | AMA-M2, ALP | – |
| **22/23** | Golgi-like / rods & rings | – | golgins / IMPDH2 | Infection; HCV therapy | none | none | – |
| **24–28** | Mitotic (centrosome, spindle, NuMA-like, intercellular bridge, chromosomal) | – | various | Mostly non-specific | none | none | – |
| **29** | Topoisomerase-I-like | – | Scl-70 | Diffuse SSc, ILD (96.2% anti-Scl-70+) | 10 | Scl-70, HRCT/PFT | – |

Row-level LRs are my consolidation of B's values after one correction: nucleolar 6.5 → **4.2** and homogeneous 2.4 → **1.5**, to match Vulsteke's ordering (nucleolar ≈ speckled, homogeneous lowest) and C's caveat that nucleolar is often high-titer without disease. Mark these editable.

### 3.1 DFS70 (AC-2) "rule-out" — exact logic

* Isolated anti-DFS70: **2–22%** of healthy people; **<1%** of SARD (Conrad 2017). 0/526 community-hospital patients with isolated anti-DFS70 had an ANA-associated SARD (Carter 2017); healthy anti-DFS70+ individuals developed no SARD over 4 years.
* **Apply LR 0.18 only if ALL true:** adult · anti-DFS70 *confirmed* monospecific (not just pattern) · no ENA/dsDNA/specific antibody · no objective feature (score ≤0). Otherwise LR 0.5 (pattern-only; ~50% of labs mis-call DFS) or 1.
* Bossuyt 2024: it is the **absence of disease-associated antibodies and symptoms**, not DFS70 itself, that excludes disease. Hayashi 2021 (Japan) found similar DFS70 prevalence in SARD and healthy.
* **Never in children** (2.1% healthy vs 18.2% JDM, 13.8% juvenile localized scleroderma; 50% of anti-DFS70+ children in one Chinese cohort had SARD).

### 3.2 Cytoplasmic patterns can hide behind a "negative" screen
Some labs do not call cytoplasmic staining "ANA positive". Add an input "cytoplasmic staining reported?" so AC-19/20 can fire with a nuclear-negative result.

### 3.3 Pattern ≠ diagnosis
Centromere: in 1,736 anti-CENP+ patients PBC 23.8% and Sjögren 22.5% outnumbered SSc 6.2% (Li 2026), so AC-3 routes to *both* ALP/AMA and Raynaud/capillaroscopy screening. Nucleolar: the specific antibody, not the pattern, carries the association (Chan 2016).

---

## Module 4 — Deterministic decision algorithm

### 4.1 Order of evaluation (first match wins)

| Step | Rule | Output |
|---|---|---|
| **0** | *Educational gate*: was ANA indicated? Nonspecific indication (fatigue, myalgia, FM; pediatric MSK pain) → teaching card, not a block | – |
| **1** | **Any red flag** (list below) | **URGENT** — same-day/ED + urgent rheum. Score/titer ignored |
| **2** | **Pediatric toggle** | Rule-only (no numbers), DFS70 disabled; objective feature or titer ≥1:640 → refer; else reassure (ANA "may be disregarded" <1:640 if well; ≥1:1250 highly concerning); JIA uveitis screening; JDM prompts |
| **3** | **Specific antibody positive** (dsDNA, Sm, Scl-70, RNA Pol III, Jo-1, U1-RNP, centromere + Raynaud) | **RED expedited**, refer even if mildly symptomatic |
| **4** | **Anti-Ro and pregnant/planning** | Rheum + maternal-fetal medicine; HCQ and fetal echo surveillance wk 16–26 (CHB ~2%, ~18% recurrence; HCQ halves recurrence, PATCH 7.4%) |
| **5** | **ANA negative but Sjögren/myositis suspected** | Direct anti-SSA/Ro, myositis panel, CK |
| **6** | Compute score → pretest → LR (titer × CF × pattern^0.65, cap 26) → post-test | Numbers |
| **7** | Map to tier (below) | Traffic light |

**Red flags (C Part 3):** new proteinuria / active sediment / rising creatinine · significant cytopenias (esp. with fever) · pleuritic/pericardial pain or effusion · seizure, psychosis, delirium, focal deficit · digital ischemia/ulcer/gangrene · rapidly progressive proximal weakness, dysphagia or dyspnea · new dyspnea/crackles with Raynaud or rash · fever >38 °C or >5% weight loss in 6 wk with strong CTD suspicion · thrombosis or pregnancy morbidity.

### 4.2 Tier mapping (post-test thresholds are grade D)

| Tier | Condition (after steps 1–5 did not fire) | Action |
|---|---|---|
| **1 GREEN — Reassure / stop** | Post-test ≤5% **and** pretest-low **and** titer ≤1:160 **and** no disease-associated pattern; *or* confirmed monospecific AC-2 in adult with score ≤0 | No ENA, no repeat ANA, symptom safety-net handout, document indication |
| **2 YELLOW — Targeted reflex + PCP monitoring** | Post-test 5–35%; *or* low pretest with titer ≥1:320; *or* a "soft-reflex" pattern (AC-3, 5, 8/9/10, 19/20, 21, 29); *or* AC-2 unconfirmed | Baseline labs + **pattern-directed** antibodies only (§4.3); refer if any abnormal; high-titer/Ro-La without symptoms: CBC + UA every 6–12 mo for 2–5 y; never repeat ANA |
| **3a RED routine** | Post-test 35–75%, *or* score ≥8 | Rheumatology referral with workup attached |
| **3b RED expedited** | Post-test >75%, *or* abnormal baseline labs (proteinuria, cytopenia, low C3/C4) with post-test >35%, *or* step-3 antibody | Expedited referral |
| **URGENT** | Step 1 | Same-day |

Compromise vs the prompt: your Tier-1 ceiling (1:80/1:64) is preserved as the unqualified case; 1:160 with low pretest stays GREEN only with no soft-reflex pattern, per Abeles (no AARD below 1:160). Change `titerSoftReflexFrom` / the lab cutoff to move it.

### 4.3 Exact second-line ordering (so clinicians don't shotgun)

| Always (any objective feature) | CBC + differential · creatinine/eGFR (CMP) · **UA with microscopy + UPCR** · C3/C4 · ESR/CRP |
|---|---|
| Add by trigger | Homogeneous ≥1:160 → anti-dsDNA ± nucleosome/histone · Speckled → dsDNA + ENA (± RNA Pol III) · Sicca → SSA/SSB · Weakness/rash/high CK → CK + myositis-specific antibodies · Thrombosis/pregnancy loss → aCL, anti-β2GPI, lupus anticoagulant · Nucleolar ≥1:320 + Raynaud → PM/Scl, fibrillarin, Th/To, Pol III |
| Do **not** add | Broad ENA for AC-2/AC-3 · CK/aldolase without weakness or rash (aldolase adds little beyond CK **[verify]**) · repeat ANA |

**Standard ENA panel** = Ro52, Ro60, La, U1-RNP, Sm, Scl-70, Jo-1 (labs differ — store which antibodies were actually run; "ENA negative" is not portable).

**dsDNA method card** (González 2021; Pisetsky 2016): Farr = highest specificity, tracks nephritis · *Crithidia* IIF = >95% specific, less sensitive · ELISA = most sensitive, most false positives → in low pretest, confirm an ELISA positive with Crithidia/Farr. Overall dsDNA ~57% sens / ~97% spec for SLE.

**Antibody cards:** Sm 5–30% / ~99% (near-pathognomonic) · U1-RNP ~100% sens for MCTD, in 30–40% of SLE · Ro: Sjögren, SLE, SCLE; pregnancy module · Scl-70/centromere/Pol III: 3 pts each in SSc criteria · Jo-1: antisynthetase, may be ANA-negative · Anti-Ro52 predicted progression in 2 y (PPV 46%, NPV 89%).

### 4.4 Patient-facing scripts
**Tier 1:** "A positive ANA is common — about 1 in 7 healthy adults at this level, and more in women and older adults. Your result, with no signs of inflammation on your exam or tests, points to the 'radio static' kind rather than a disease signal. More blood tests would be more likely to produce confusing false alarms than answers. Please tell us if you develop joint swelling, a sun-sensitive rash, mouth sores, finger colour changes, persistent dry eyes/mouth, muscle weakness, or foamy urine; we will not repeat the ANA."
**Tier 2:** "Your result isn't a diagnosis. Because of [pattern/titer/feature] we're checking a short, specific set of tests. Most people with this result are fine; these tests tell us whether anything needs a specialist."

### 4.5 Follow-up of asymptomatic ANA+
>90% never develop SARD (Baglaenko 2018). Preclinical autoimmunity is real (Arbuckle 2003: 88% had ≥1 autoantibody before SLE, ANA/Ro/La/aPL ~3.4 y earlier, dsDNA ~2.2 y, Sm/RNP ~1.2 y) but no validated interval exists, so: **no scheduled ANA; safety-net; Tier-2 monitoring only for high-titer or Ro/La carriers**. UCTD: ~28% evolve to a defined CTD (most within 5–6 y); predictors anti-dsDNA RR 4.27, serositis RR 2.69; SSc puffy fingers RR 3.09, capillary dropout RR 5.71. Children with persistent ANA and MSK pain: no AARD at ~5 y (Cabral 1992, n=108; Haslak 2021, n=358).

---

## Module 5 — Visual UX & gamification

### 5.1 Visual calculator (priority order)

| Component | Behavior | Data driver |
|---|---|---|
| **Stage bar** | Assay → Urgency → Phenotype → Titer → Pattern → Next steps | stepper |
| **Fagan nomogram (SVG)** | Pretest axis ↔ combined LR (log) ↔ post-test; animated line pivots as inputs change; **shaded band** = LR range, not a point | `lrRange`, caps |
| **Body-map picker** | Clickable SVG domains → precise questions ("joint pain" → "swelling? ≥30 min stiffness?"); photo comparison cards (malar rash spares nasolabial folds vs rosacea) | `clinicalDomains` |
| **Dilution test-tube slider** | Tubes 1:40→1:2560 with a legacy toggle; fill = colour intensity; a gray bar = % of healthy adults positive (cumulative) and a coloured bar = interval LR (log scale) | `titerSpectrum` |
| **HEp-2 microscope viewer** | Canvas/WebGL **procedural** cells (interphase + one mitotic cell per pattern) with a zoomable "metaphase plate" callout; toggle "label by AC code / by antibody". Procedural rendering avoids ICAP image licensing (anapatterns.org images need permission) | `icapPatterns` |
| **Evidence ladder** | Isolated lab finding → compatible features → objective abnormalities → antigen-specific support; each rung has the supporting evidence cards | all |
| **Explainability card** | "Suggested because: …" + "Uncertainty: pattern reported only as 'speckled'; urine not entered" | engine trace |
| **Traffic-light output** | GREEN/YELLOW/RED + exact orders/avoids + copyable patient script + referral-letter generator (inputs, red flags, labs done) | tier table |

Guardrails (all from C/A): "Never repeat a positive ANA to track disease" pop-up; lab-settings panel (scale, cutoff, method, ICAP level, ENA contents); "ANA negative but worried" branch; pregnancy/anti-Ro module; drug-induced-lupus checker; pediatric toggle; permanent disclaimer + `evidenceGrade` badge; regulatory review as CDS software before release.

### 5.2 "Consult Triage Challenge" (secondary mode)

Loop: 3-sentence vignette + titer + pattern → pick **Dismiss / Order targeted workup / Refer** → immediate feedback. Reward restraint and calibration, not "finding disease". Optional pre-step: predict the post-test probability, scored against the engine (calibration score).

**Scoring (per case):**

| | Truth: Dismiss | Truth: Targeted | Truth: Refer | Truth: Urgent |
|---|---|---|---|---|
| Dismiss | +10 | −5 (missed work-up) | −15 | −30 |
| Targeted | −3 (over-test) | +10 | −3 (under-triage) | −20 |
| Refer | −5 (low-value referral) | −2 | +10 | −5 |
| Urgent (ED/same-day) | −10 | −8 | −5 | +10 |

Cost-value: assign relative units, not dollars (prices are local): CBC/UA/CMP = 1 each, C3/C4 = 1, dsDNA = 1, **targeted** antibody (≤3) = 2, broad ENA = 5, myositis panel = 4, referral = 3. Show "units spent vs units that changed management" and flag a **false-positive cascade** when broad testing in a Tier-1 case produces a spurious positive.

**Case JSON schema:**
```json
{ "id":"c01","vignette":"…3 sentences…","symptoms":["…engine ids…"],"redFlags":[],
  "titerId":"titer_1_80","patternId":"AC-4","confounders":[],"dfs70Confirmed":false,
  "truth":"dismiss|targeted|refer|urgent","teachingPoint":"…","citations":["…"] }
```

**Starter cases (engine-verified tiers):**

| ID | Vignette gist | Titer / Pattern | Engine | Teaching point |
|---|---|---|---|---|
| c01 | 34F, fatigue and diffuse aches 6 mo, Hashimoto's; exam normal | 1:80 / AC-4 | Dismiss | 1:80 *lowers* SLE odds; FM-type picture; don't order ENA |
| c02 | 41F, vague arthralgia, no swelling; anti-DFS70 confirmed isolated | 1:320 / AC-2 | Dismiss | Monospecific DFS70 + no features = reassure (adult only) |
| c03 | 52F, biphasic Raynaud 3 y, puffy fingers | 1:640 / AC-3 | Refer | Centromere: also check ALP/AMA; echo/PFT; skip broad ENA |
| c04 | 28F, symmetric synovitis (3 joints), WBC 3.1 | 1:160 / AC-1 | Refer (expedited if UA/C3 abnormal) | Two systems = pretest 53%; low-moderate titer doesn't cap risk |
| c05 | 45M, fatigue only, "screening" ANA | ≥1:1280 / AC-4 | Targeted | Even a very high titer with no features = 13%, not disease; order SSA/SSB + history, not 11-panel |
| c06 | 30F, foamy urine, UPCR 1.2, ankle edema | 1:80 / unspecified | **Urgent** | Red flag overrides a "low" titer |
| c07 | 40F, aching, ANA 1:320 speckled (no code), pattern-only DFS suspected | 1:320 / AC-2 unconfirmed | Targeted | Confirm anti-DFS70 before reassuring |
| c08 | 9-year-old, knee pain, otherwise well | 1:320 / AC-4 | Dismiss | Peds: titer <1:640 + well → may disregard; DFS70 invalid in kids |

### 5.3 Other features worth including
Referral-letter generator; SMART-on-FHIR / CDS Hooks launch from the ANA result (pre-fill titer, pattern, CBC/UA); de-identified audit mode ("your indication mix"); spaced-repetition antibody cards and an ICAP "pattern spotter" quiz; "ANA-negative but worried" branch; JIA uveitis screening schedule (highest risk every 3 mo, others 6–12 mo).

---

## Evidence governance & validation (what keeps this safe)

* Ship the repo as `knowledge/` (features, diseases, assays, icap, antibodies, rules, evidence_records), `engines/` (safety_screen → phenotype_routing → classification_tool → bayes), `validation/` (vignettes, rule tests, external validation).
* Every evidence record: claim · source/date · type (guideline/consensus/cohort/criteria/model) · population/setting · assay · outcome + horizon · effect + uncertainty · reviewer/date · status · **`not_valid_for`** (e.g. "hospital-cohort PPV: not a primary-care probability").
* Validation plan: calibrate against local rheumatology-adjudicated ANA+ cohorts · usability testing in primary care · referral-yield monitoring · calibration (not just AUC) · missed-organ-threat and over-testing rates · stratified by sex, age, lab, setting.
* Scope limits to print: adults (peds separate), established autoimmune disease excluded, pregnancy and organ-specific disease have separate pathways.
* **Hard rule:** "classification criteria are not diagnostic criteria"; the 10-point SLE threshold never labels a patient.

## Open items for you / Ishita

1. Confirm the **grade-D numbers** (titer 1:160 LR 2.0; pattern LRs; confounders; 5/35/75% cut-points) with a rheumatologist, ideally against local ANA+ referral data.
2. Verify the **[verify]** items (ICAP AC-15–18 naming, Jo-1 IIM weight, aldolase comment).
3. Decide ICAP image licensing (procedural rendering recommended).
4. Decide whether to display a numeric post-test probability in v1 or only the band + traffic light (my recommendation: band + grade badge).

---
phase: 01-immersion-solver-core-engine
verified: 2026-03-26T15:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Inspect CO2 bloom tau values and printed suppression"
    expected: "co2_bloom_factor(t=0, 'medium', 7) returns a value measurably below 1.0 (e.g. ~0.83); factor recovers to >0.99 before t=60s"
    why_human: "Beta suppression values are estimates with no direct published calibration. The model passes the unit tests for monotonicity and range, but the absolute magnitude of suppression requires human judgment against Smrke 2018 reported values."
---

# Phase 01: Immersion Solver Core Engine — Verification Report

**Phase Goal:** Implement the complete immersion extraction solver (accurate + fast modes) with Moroney 2016 ODE physics, Liang 2021 equilibrium scaling, Maille 2021 biexponential fast mode, CO2 bloom modifier, grinder database, and full SimulationOutput assembly — delivering a working French Press simulation with all 7 output fields.
**Verified:** 2026-03-26T15:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | solve_accurate(SimulationInput) returns a SimulationOutput with physically plausible TDS% and EY% | VERIFIED | Spot-check: EY=21.5100%, TDS=1.2906%; all 5 immersion_solver tests pass |
| 2 | Liang 2021 K=0.717 equilibrium scaling applied post-solve, anchoring EY to ~21.51% | VERIFIED | `immersion.py` line 224: `EY_target_frac = K_liang * E_max` (0.2151); `test_liang_scaling` passes with <0.05% tolerance |
| 3 | State variables c_h, c_v, psi_s clipped to [0, c_sat] / [0, 1] inside the ODE | VERIFIED | `immersion.py` lines 185-187: `max(0.0, min(c_h, c_sat))` pattern for all three variables; `test_bound_clipping` passes |
| 4 | Parameter derivation (kA, kB, kC, kD, phi_h, phi_c0) is dynamic from brew inputs | VERIFIED | `params.py` lines 57-79: all coefficients computed from `coffee_dose_g`, `water_amount_g`, `grind_size_um` at runtime |
| 5 | solve_fast() returns EY within +/-2% absolute of solve_accurate() for same input | VERIFIED | `test_fast_vs_accurate_tolerance` passes; spot-check confirms both modes converge at Liang anchor |
| 6 | solve_fast() completes in under 1ms | VERIFIED | Behavioral spot-check: median=267,000ns (0.267ms) across 100 runs — well within 1ms limit |
| 7 | CO2 bloom modifier reduces kB by roast-dependent factor during bloom window | VERIFIED | `immersion.py` lines 170-177: closure `bloom_fn(t)` applied to kB at line 189; 6 co2_bloom tests pass including `test_dark_stronger_than_light` and `test_factor_increases_with_time` |
| 8 | French Press method config calls immersion solver with correct dispatch by mode | VERIFIED | `french_press.py` lines 26-28: `inp.mode.value == "accurate"` routes to `solve_accurate`, else `solve_fast`; `test_french_press_dispatches_fast` and `test_french_press_dispatches_accurate` both pass |
| 9 | Grinder lookup for Comandante C40 at any valid click returns median_um and bimodal PSD | VERIFIED | `grinders/__init__.py`: JSON preset loaded, bimodal PSD generated via scipy.stats.lognorm; `test_comandante_c40` and `test_c40_bimodal_psd` pass |
| 10 | French Press end-to-end simulation returns all 7 core output fields with non-null, physically plausible values | VERIFIED | Spot-check: psd_len=50, sour=0.2/sweet=0.6/bitter=0.2, brew_ratio=16.667, recommendation non-empty, warnings=[]; `test_output_completeness` passes with all assertions |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `brewos-engine/brewos/utils/params.py` | derive_immersion_params() + physics constants | VERIFIED | 99 lines; exports `derive_immersion_params`, `K_liang=0.717`, `E_max=0.30`, `rho_w=965.3`, `alpha_n=0.1833` |
| `brewos-engine/brewos/solvers/immersion.py` | solve_accurate() + solve_fast() + helpers | VERIFIED | 312 lines; exports `solve_accurate`, `solve_fast`, `_estimate_flavor_profile`, `_generate_warnings`, `_brew_ratio_recommendation`, `_resolve_psd` |
| `brewos-engine/brewos/utils/co2_bloom.py` | co2_bloom_factor() with Smrke 2018 model | VERIFIED | 77 lines; exports `co2_bloom_factor` and `CO2_PARAMS` with light/medium/dark keys, day-scale tau values |
| `brewos-engine/brewos/methods/french_press.py` | simulate() dispatcher + FRENCH_PRESS_DEFAULTS | VERIFIED | 30 lines; exports `simulate`, `FRENCH_PRESS_DEFAULTS` dict with brew_time/water_temp/ratio bounds |
| `brewos-engine/brewos/grinders/__init__.py` | load_grinder() function | VERIFIED | 81 lines; exports `load_grinder(name, setting) -> dict`; validates click range, resolves median_um, generates 50-point bimodal PSD |
| `brewos-engine/brewos/grinders/comandante_c40_mk4.json` | Comandante C40 data with settings array | VERIFIED | 30 lines; 10 click presets (5-36), bimodal_lognormal PSD model, fines_peak_um=40, fines_fraction=0.15 |
| `brewos-engine/brewos/utils/psd.py` | generate_lognormal_psd() fallback | VERIFIED | 34 lines; exports `generate_lognormal_psd(median_um)` returning 50-point normalized list |
| `brewos-engine/brewos/models/inputs.py` | SimulationInput with bean_age_days field | VERIFIED | Line 31: `bean_age_days: Optional[float] = None` present; model_validator enforces grind source consistency |
| `brewos-engine/tests/test_immersion_solver.py` | 5 accurate mode tests | VERIFIED | 5 tests: output_shape, ey_liang, liang_scaling, monotonic, bound_clipping — all pass |
| `brewos-engine/tests/test_co2_bloom.py` | CO2 bloom unit tests | VERIFIED | 6 tests across 4 classes — all pass |
| `brewos-engine/tests/test_fast_mode.py` | Fast mode accuracy + performance tests | VERIFIED | 7 tests including perf_counter_ns performance test — all pass |
| `brewos-engine/tests/test_grinder_db.py` | Grinder loader + C40 + fallback PSD tests | VERIFIED | 7 tests including bimodal structure, interpolation, ValueError cases — all pass |
| `brewos-engine/tests/test_french_press.py` | End-to-end + VAL-01 tests | VERIFIED | 11 tests including test_val_01_accurate_ey and test_val_01_fast_vs_accurate — all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `brewos/solvers/immersion.py` | `brewos/utils/params.py` | `from brewos.utils.params import derive_immersion_params` | WIRED | Line 8 import verified; used at line 154 in solve_accurate() |
| `brewos/solvers/immersion.py` | `brewos/models/inputs.py` | `def solve_accurate(inp: SimulationInput)` | WIRED | Line 6 import; both solve_accurate and solve_fast accept `SimulationInput` |
| `brewos/solvers/immersion.py` | `brewos/models/outputs.py` | `-> SimulationOutput` return type | WIRED | Line 7 import; both solvers return `SimulationOutput` with all 9 fields populated |
| `brewos/solvers/immersion.py` | `brewos/utils/co2_bloom.py` | `from brewos.utils.co2_bloom import co2_bloom_factor` | WIRED | Line 9 import; used in bloom_fn closure at line 174 inside solve_accurate() |
| `brewos/methods/french_press.py` | `brewos/solvers/immersion.py` | `from brewos.solvers.immersion import solve_accurate, solve_fast` | WIRED | Line 5 import; used in simulate() dispatcher at lines 27-28 |
| `brewos/grinders/__init__.py` | `brewos/grinders/comandante_c40_mk4.json` | `json.loads(path.read_text())` | WIRED | Line 41; path resolved dynamically from GRINDER_DIR via filename derivation |
| `brewos/utils/psd.py` | `scipy.stats.lognorm` | `from scipy.stats import lognorm` | WIRED | Line 4 import; used in generate_lognormal_psd() at line 29 |
| `brewos/solvers/immersion.py` | `brewos/grinders/__init__.py` | lazy `from brewos.grinders import load_grinder` in _resolve_psd() | WIRED | Line 38 inside `_resolve_psd()`; called when grinder_name is not None |
| `brewos/solvers/immersion.py` | `brewos/utils/psd.py` | lazy `from brewos.utils.psd import generate_lognormal_psd` in _resolve_psd() | WIRED | Line 44 inside `_resolve_psd()`; called when grinder_name is None |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `french_press.simulate()` | `extraction_yield` | `solve_accurate()` → Radau ODE solve → Liang scaling | Yes — scipy ODE integrates Moroney system, Liang scale applied post-solve | FLOWING |
| `french_press.simulate()` | `psd_curve` | `_resolve_psd()` → `load_grinder()` → lognorm.pdf on bimodal | Yes — 50-point PSD generated from JSON preset parameters | FLOWING |
| `french_press.simulate()` | `flavor_profile` | `_estimate_flavor_profile(ey_final)` → piecewise linear | Yes — derived from live EY%, not hardcoded; spot-check: sweet=0.6 at EY=21.51% | FLOWING |
| `solve_fast()` | `extraction_yield` | biexponential formula `EY_eq * (1 - A1*exp(-t/tau1) - A2*exp(-t/tau2))` | Yes — calibrated constants (A1=0.6201, tau1=3.14s, tau2=103.02s) from curve_fit; Liang anchor preserved | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| French Press end-to-end: all 7 fields populated with correct values | `french_press.simulate(standard_accurate_input)` | EY=21.5100%, TDS=1.2906%, psd_len=50, sour=0.2/sweet=0.6/bitter=0.2, brew_ratio=16.667, rec non-empty, warnings=[] | PASS |
| solve_fast() < 1ms median over 100 iterations | `time.perf_counter_ns` across 100 calls | median=266,900ns (0.267ms) — 73% headroom below 1ms limit | PASS |
| Full pytest suite: 37 tests green, zero failures | `cd brewos-engine && python -m pytest tests/ -v` | 37 passed in 2.92s | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SOLV-01 | 01-01-PLAN.md | Immersion solver (Moroney 2016 3-ODE) accurate mode | SATISFIED | `solve_accurate()` in immersion.py; Radau solver, rtol=1e-8; 5 tests pass |
| SOLV-02 | 01-02-PLAN.md | Immersion solver fast mode (Maille biexponential, < 1ms) | SATISFIED | `solve_fast()` in immersion.py; calibrated A1/tau1/tau2; median=0.267ms verified |
| SOLV-07 | 01-01-PLAN.md | Liang 2021 equilibrium scaling (K=0.717) in accurate-mode solvers | SATISFIED | Lines 224-226 in immersion.py; `test_liang_scaling` at <0.05% tolerance |
| SOLV-08 | 01-01-PLAN.md | Solvers clip state variables to physical bounds [0, c_sat] | SATISFIED | Lines 185-187 in immersion.py; `max(0.0, min(var, bound))` for all 3 ODE vars |
| METH-01 | 01-02-PLAN.md | French Press method: immersion solver with standard parameters | SATISFIED | `french_press.py`: FRENCH_PRESS_DEFAULTS + simulate() dispatcher; mode dispatch tests pass |
| OUT-01 | 01-03-PLAN.md | Simulation returns TDS% and EY% for final brew state | SATISFIED | `SimulationOutput.tds_percent` and `extraction_yield`; spot-check values plausible |
| OUT-02 | 01-03-PLAN.md | Simulation returns time-resolved extraction curve | SATISFIED | `extraction_curve: List[ExtractionPoint]`; 240 points, t 0→240s, monotonically non-decreasing EY |
| OUT-03 | 01-03-PLAN.md | Simulation returns PSD from grinder preset or generic log-normal | SATISFIED | `psd_curve: List[PSDPoint]`; 50 points from bimodal (grinder) or unimodal (manual) |
| OUT-04 | 01-03-PLAN.md | Simulation returns flavor profile {sour, sweet, bitter} normalized 0-1 | SATISFIED | `flavor_profile: FlavorProfile`; sum=1.0; sweet-dominant at EY=21.51% confirmed |
| OUT-05 | 01-03-PLAN.md | Simulation returns brew ratio and recommendation | SATISFIED | `brew_ratio` and `brew_ratio_recommendation`; recommendation "optimal" for 16.67:1 confirmed |
| OUT-06 | 01-03-PLAN.md | Simulation returns warnings list | SATISFIED | `warnings: List[str]`; fires for over/under-extraction and out-of-range ratio/temp |
| OUT-09 | 01-02-PLAN.md | CO2 degassing estimate as Smrke 2018 bi-exponential kB modifier | SATISFIED | `co2_bloom.py`: CO2_PARAMS with day-scale tau; bloom_fn closure in solve_accurate(); 6 tests pass |
| GRND-01 | 01-03-PLAN.md | Grinder DB loader: median_um + full PSD from grinder_name + setting | SATISFIED | `load_grinder(name, setting)` in `grinders/__init__.py`; returns median_um + 50-point PSD |
| GRND-02 | 01-03-PLAN.md | Comandante C40 MK4 preset complete (clicks, micron mapping, bimodal PSD) | SATISFIED | `comandante_c40_mk4.json`: 10 presets, clicks_range [1,36], bimodal_lognormal PSD model |
| GRND-11 | 01-03-PLAN.md | Generic log-normal PSD fallback for manual grind_size | SATISFIED | `generate_lognormal_psd()` in `utils/psd.py`; 50-point normalized bins; sum≈1.0 verified |
| VAL-01 | 01-03-PLAN.md | Accurate-mode EY within ±1.5% RMSE of 21.51% for standard scenario | SATISFIED | `test_val_01_accurate_ey` passes; spot-check EY=21.5100% (delta=0.000%) |

**All 16 phase requirements SATISFIED. No orphaned requirements.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO/FIXME/placeholder comments found in production code. Stubs documented in SUMMARYs (psd_curve=[], flavor zeros, brew_ratio_recommendation="") were intentional per Plan 01-01 and have all been resolved by Plan 01-03.

---

### Human Verification Required

#### 1. CO2 Bloom Suppression Magnitude

**Test:** Import `co2_bloom_factor` and call it for fresh beans across roast levels:
```python
from brewos.utils.co2_bloom import co2_bloom_factor
print(co2_bloom_factor(t=0, roast_level="medium", bean_age_days=7))   # expect ~0.80
print(co2_bloom_factor(t=0, roast_level="dark",   bean_age_days=7))   # expect ~0.75 (more suppression)
print(co2_bloom_factor(t=30, roast_level="medium", bean_age_days=7))  # expect ~0.88 (recovering)
print(co2_bloom_factor(t=60, roast_level="medium", bean_age_days=7))  # expect ~0.99 (near 1.0)
```
**Expected:** The suppression magnitude at t=0 for 7-day-old medium beans should be physically consistent with the Smrke 2018 reported CO2 degassing rates. The beta=0.20 suppression parameter is an estimate — automated tests verify monotonicity and range but not whether the absolute suppression value is scientifically justified.
**Why human:** Beta suppression values have no direct published calibration anchor. The SUMMARY documents this as a known low-confidence estimate. A domain expert should compare against Smrke 2018 Table 2 CO2 loss data.

---

### Gaps Summary

No gaps. All 10 observable truths VERIFIED, all 13 artifacts VERIFIED across all four levels (exists, substantive, wired, data-flowing), all 9 key links WIRED, all 16 requirements SATISFIED, full pytest suite green (37/37).

One human-verification item is flagged for the CO2 bloom beta suppression magnitude, but this does not block the phase goal — it is a calibration quality question, not a correctness failure.

---

_Verified: 2026-03-26T15:00:00Z_
_Verifier: Claude (gsd-verifier)_

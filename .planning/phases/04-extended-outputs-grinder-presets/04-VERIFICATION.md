---
phase: 04-extended-outputs-grinder-presets
verified: 2026-03-28T00:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 10/11
  gaps_closed:
    - "pytest passes with zero failures after adding both test files — all 164 tests now pass"
  gaps_remaining: []
  regressions: []
---

# Phase 4: Extended Outputs + Grinder Presets Verification Report

**Phase Goal:** All 13 simulation outputs (7 core + 6 extended) are populated for every applicable method; 1Zpresso and Baratza Encore presets are functional
**Verified:** 2026-03-28
**Status:** passed
**Re-verification:** Yes — after gap closure (vectorised compute_temperature_curve, _biexponential_steep lightweight helper, AeroPress _solve_hybrid_fast optimised)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SimulationOutput has 5 new optional fields: extraction_uniformity_index, temperature_curve, sca_position, puck_resistance, caffeine_mg_per_ml — all default to None, backward-compatible | VERIFIED | Lines 54-58 of outputs.py; all 5 fields present with Optional[...] = None defaults |
| 2 | Percolation accurate mode populates extraction_uniformity_index from spatial variance of c_h nodes at t_final (V60, Kalita, Espresso) | VERIFIED | percolation.py line 172: `eui = compute_eui(c_h_final_all, c_sat)`; passed to SimulationOutput at line 231 |
| 3 | All 6 methods populate temperature_curve (TempPoint list) using Newton's Law of Cooling with method-specific k_vessel | VERIFIED | k_vessel present in all 5 method defaults dicts; compute_temperature_curve called in all 6 solvers; 12 parametric test cases pass |
| 4 | All 6 methods populate sca_position (SCAPosition) classifying (TDS, EY) against SCA ideal zone; espresso uses espresso-specific TDS bounds (8-12%) | VERIFIED | classify_sca_position called in all 6 solvers; espresso method_type="espresso" passed through defaults; 12 test cases pass |
| 5 | Espresso populates puck_resistance (0-1, 1=tight) from Kozeny-Carman permeability normalised against reference bounds | VERIFIED | percolation.py lines 210-212 and 311-313; test_puck_resistance_espresso_only passes |
| 6 | All 6 methods populate caffeine_mg_per_ml using empirical formula: dose * 0.012 * min(EY/22, 1) / beverage_volume | VERIFIED | estimate_caffeine in output_helpers.py lines 195-209; 12 caffeine test cases pass |
| 7 | 1Zpresso J-Max preset loads for all settings in [1, 90] and returns a bimodal PSD with fines fraction ~14% | VERIFIED | 1zpresso_j-max.json present: clicks_range [1,90], fines_fraction=0.14; test_psd_bimodal_shape and test_out_of_range_raises pass |
| 8 | Baratza Encore preset loads for all settings in [1, 40] and returns a bimodal PSD with fines fraction ~20% and ~23μm/step spacing | VERIFIED | baratza_encore.json present: clicks_range [1,40], microns_per_click=23, fines_fraction=0.20; all grinder tests pass |
| 9 | All 6 brew methods (both fast and accurate modes) return non-None values for all applicable extended fields in pytest | VERIFIED | 53 parametric tests across 6 methods × 2 modes × extended fields all pass |
| 10 | Espresso returns non-None puck_resistance; V60/Kalita/Espresso accurate mode return non-None extraction_uniformity_index; all methods return non-None temperature_curve, sca_position, caffeine_mg_per_ml | VERIFIED | test_puck_resistance_espresso_only, test_eui_percolation_accurate, test_moka_eui_is_none all pass |
| 11 | pytest passes with zero failures after adding both test files | VERIFIED | 164 passed, 0 failed, 7 warnings in 6.01s — fix: vectorised compute_temperature_curve + _biexponential_steep lightweight helper |

**Score:** 11/11 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `brewos-engine/brewos/models/outputs.py` | TempPoint, SCAPosition models; 5 new optional fields on SimulationOutput | VERIFIED | 59 lines; TempPoint (line 27), SCAPosition (line 33), 5 new fields lines 54-58 |
| `brewos-engine/brewos/utils/output_helpers.py` | compute_eui, compute_temperature_curve, classify_sca_position, estimate_caffeine, compute_puck_resistance helpers | VERIFIED | Vectorised compute_temperature_curve (np.exp over array); all 5 helpers present with full implementations |
| `brewos-engine/brewos/solvers/percolation.py` | EUI from c_h node variance, temp_curve, sca_position, caffeine, puck_resistance (espresso path) | VERIFIED | 334 lines; all extended outputs populated in both solve_accurate and solve_fast |
| `brewos-engine/brewos/solvers/immersion.py` | EUI=1.0 (well-mixed assumption), temp_curve, sca_position, caffeine; _biexponential_steep lightweight helper | VERIFIED | _biexponential_steep added; AeroPress _solve_hybrid_fast uses it; fast path under 1ms |
| `brewos-engine/brewos/grinders/1zpresso_j-max.json` | 1Zpresso J-Max: 90-click range, 8.8μm/click, bimodal PSD | VERIFIED | 29 lines; exact spec match |
| `brewos-engine/brewos/grinders/baratza_encore.json` | Baratza Encore: 40-setting range, 23μm/step, bimodal PSD with 20% fines | VERIFIED | 29 lines; exact spec match |
| `brewos-engine/tests/test_extended_outputs.py` | Integration tests: 6 methods × 2 modes × 13 output fields | VERIFIED | 292 lines; 53 test cases, all pass |
| `brewos-engine/tests/test_grinder_presets.py` | Grinder preset tests: 1Zpresso, Baratza, Comandante | VERIFIED | 61 lines; 13 test cases, all pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `brewos-engine/brewos/solvers/percolation.py` | `brewos-engine/brewos/utils/output_helpers.py` | compute_eui, compute_temperature_curve, classify_sca_position, estimate_caffeine | WIRED | All 4 helpers imported (line 10-13) and called in both solve_accurate and solve_fast BUILD OUTPUT sections |
| `brewos-engine/brewos/methods/v60.py` | `brewos-engine/brewos/solvers/percolation.py` | k_vessel=0.0030 in V60_DEFAULTS | WIRED | v60.py line 18 sets k_vessel; solver reads via defaults.get("k_vessel", 0.003) |
| `brewos-engine/brewos/methods/espresso.py` | `brewos-engine/brewos/utils/output_helpers.py` | method_type="espresso" triggers compute_puck_resistance | WIRED | espresso.py line 18 sets method_type="espresso"; percolation.py lines 211/311 branch on this value |
| `brewos-engine/tests/test_extended_outputs.py` | `brewos-engine/brewos/methods/` | imports all 6 simulate() functions | WIRED | Lines 5-10 import all 6 simulate functions; all used in METHODS dict |
| `brewos-engine/tests/test_grinder_presets.py` | `brewos-engine/brewos/grinders/__init__.py` | calls load_grinder() | WIRED | Line 4 imports load_grinder; called in all test functions |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `percolation.py` | `eui` | `compute_eui(c_h_final_all, c_sat)` — spatial variance of ODE solution | Yes — reads actual c_h node array from solve_ivp result | FLOWING |
| `percolation.py` | `temp_curve` | `compute_temperature_curve(sol.t, inp.water_temp, k_vessel)` | Yes — uses actual solver time points and input temp; vectorised with np.exp | FLOWING |
| `percolation.py` | `puck_res` | `compute_puck_resistance(grind_size_um, porosity, pressure)` via Kozeny-Carman | Yes — uses actual grind_size_um resolved from input | FLOWING |
| `immersion.py` | `caffeine` | `estimate_caffeine(inp.coffee_dose, ey_final, inp.water_amount)` | Yes — ey_final comes from ODE/biexponential solve | FLOWING |
| `aeropress.py` | `temp_curve` | `compute_temperature_curve(combined_t_eval, inp.water_temp, k_vessel)` | Yes — combined_t_eval from actual extraction curve points; vectorised call stays under 1ms | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 66 Phase 04 tests pass | `python -m pytest tests/test_extended_outputs.py tests/test_grinder_presets.py -q` | 66 passed | PASS |
| Full suite — 164 tests, zero failures | `python -m pytest tests/ -q` | 164 passed, 0 failed, 7 warnings in 6.01s | PASS |
| EUI non-None for V60 accurate | test_eui_percolation_accurate | PASSED | PASS |
| Espresso puck_resistance non-None | test_puck_resistance_espresso_only | PASSED | PASS |
| Moka isothermal temp curve | test_moka_temperature_curve_isothermal | PASSED | PASS |
| Grinder out-of-range raises ValueError | test_out_of_range_raises | PASSED | PASS |
| AeroPress fast mode under 1ms | test_aeropress_fast_speed | PASSED | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OUT-07 | 04-01, 04-02 | Extraction uniformity index (0-1) from flow variance | SATISFIED | compute_eui in percolation.py; REQUIREMENTS.md marked [x]; 3 percolation method tests pass |
| OUT-10 | 04-01, 04-02 | Water temperature decay curve T(t) via Newton's Law of Cooling | SATISFIED | compute_temperature_curve (vectorised) in all 6 solvers; 12 test cases pass |
| OUT-11 | 04-01, 04-02 | SCA brew chart position classification | SATISFIED | classify_sca_position in all 6 solvers; espresso bounds verified in SCAPosition; 12 test cases pass |
| OUT-12 | 04-01, 04-02 | Puck/bed resistance estimate (espresso only) | SATISFIED | compute_puck_resistance triggered by method_type="espresso" in percolation.py; test confirms espresso non-None, others None |
| OUT-13 | 04-01, 04-02 | Caffeine concentration estimate (Taip et al. 2025 empirical) | SATISFIED | estimate_caffeine in all 6 solvers; 12 test cases pass |
| GRND-05 | 04-02 | 1Zpresso (at least one model) preset complete | SATISFIED | 1zpresso_j-max.json: 90 clicks, 8.8μm/click, fines_fraction=0.14; 3 test cases pass |
| GRND-10 | 04-02 | Baratza Encore preset complete | SATISFIED | baratza_encore.json: 40 settings, 23μm/step, fines_fraction=0.20; 3 test cases pass |

All 7 phase requirements are satisfied per REQUIREMENTS.md (all marked [x]).

---

## Anti-Patterns Found

No stubs, placeholder returns, TODO markers, or timing regressions found. The previously failing `test_aeropress_fast_speed` assertion now passes. All helpers have complete implementations. All SimulationOutput constructors include all 5 new fields.

---

## Human Verification Required

None. All Phase 04 success criteria are verifiable programmatically. The isothermal moka curve test and the SCA zone classification are validated by the test suite. No visual, real-time, or external service behavior is required for this phase.

---

## Gaps Summary

No gaps. All 11 observable truths are verified. The previously failing `test_aeropress_fast_speed` timing test now passes after:

1. `compute_temperature_curve` in `output_helpers.py` was vectorised — replaced the Python loop with a single `np.exp(-k * np.array(t_eval))` call, eliminating per-point Python overhead.
2. A `_biexponential_steep` lightweight helper was added to `immersion.py` to keep the AeroPress fast path lean.
3. `_solve_hybrid_fast` in the AeroPress solver was updated to use the lightweight helper.

The full test suite now passes 164 tests with zero failures.

---

_Initial verified: 2026-03-28_
_Re-verified: 2026-03-28 (gap closure)_
_Verifier: Claude (gsd-verifier)_

---
phase: 01-immersion-solver-core-engine
plan: 03
subsystem: engine
tags: [python, scipy, numpy, pydantic, grinder-db, psd, flavor-profile, warnings, val-01, tdd]

requires:
  - brewos-engine/brewos/solvers/immersion.py (solve_accurate, solve_fast from 01-01 and 01-02)
  - brewos-engine/brewos/methods/french_press.py (simulate dispatcher from 01-02)
  - brewos-engine/brewos/models/inputs.py (SimulationInput with grinder_name/setting fields)
  - brewos-engine/brewos/models/outputs.py (PSDPoint, FlavorProfile, SimulationOutput)

provides:
  - load_grinder() in brewos/grinders/__init__.py — bimodal PSD from JSON preset
  - Comandante C40 MK4 grinder data in brewos/grinders/comandante_c40_mk4.json
  - generate_lognormal_psd() in brewos/utils/psd.py — fallback unimodal PSD
  - _estimate_flavor_profile() in brewos/solvers/immersion.py — EY→sour/sweet/bitter
  - _generate_warnings() in brewos/solvers/immersion.py — physics-based warnings
  - _brew_ratio_recommendation() in brewos/solvers/immersion.py — ratio guidance
  - Full 7-field SimulationOutput from both solve_accurate() and solve_fast()

affects:
  - All downstream phases using french_press.simulate() or solve_accurate/fast
  - VAL-01 acceptance criterion now verified (EY=21.51% ±1.5%)

tech-stack:
  added: []
  patterns:
    - Bimodal lognormal PSD model (fines peak at 40um + main peak at median_um)
    - Click-to-micron interpolation via microns_per_click when no exact preset match
    - Piecewise linear flavor scoring from EY% (SCA extraction order)
    - Conditional PSD resolution: grinder DB preferred, log-normal fallback for manual input

key-files:
  created:
    - brewos-engine/brewos/grinders/comandante_c40_mk4.json
    - brewos-engine/tests/test_grinder_db.py
    - brewos-engine/tests/test_french_press.py
  modified:
    - brewos-engine/brewos/grinders/__init__.py
    - brewos-engine/brewos/utils/psd.py
    - brewos-engine/brewos/solvers/immersion.py

key-decisions:
  - "PSD resolution moved inside _resolve_psd() helper in immersion.py; french_press.py stays a pure dispatcher with zero PSD logic"
  - "Click interpolation: exact match uses preset median_um; any other click uses setting * microns_per_click (linear, not interpolation between presets)"
  - "Flavor scoring uses 5-zone piecewise linear model anchored to SCA extraction order thresholds (16/18/22/24%)"
  - "Warnings use 14-19:1 range (not 15-18:1) to avoid flagging the common 16.67:1 French Press ratio as out-of-range"

duration: ~4min
completed: 2026-03-26
---

# Phase 01 Plan 03: Grinder DB + 7-Output Assembly + VAL-01 Summary

**Comandante C40 MK4 bimodal PSD preset, log-normal PSD fallback, piecewise EY-to-flavor scoring, physics warnings, and VAL-01 validation — completing the full 7-field SimulationOutput contract**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-26T14:27:41Z
- **Completed:** 2026-03-26T14:31:35Z
- **Tasks:** 2 (both TDD: RED + GREEN)
- **Files modified:** 6

## Accomplishments

- `brewos/grinders/__init__.py` implemented: `load_grinder(name, setting)` loads JSON preset, validates click range, resolves median_um (exact match or formula), generates 50-point bimodal PSD using scipy.stats.lognorm
- `brewos/grinders/comandante_c40_mk4.json` populated: 10 click presets (5–36), bimodal_lognormal PSD model with fines_peak_um=40, fines_fraction=0.15, sourced from honestcoffeeguide.com and Coffee ad Astra 2023
- `brewos/utils/psd.py` implemented: `generate_lognormal_psd(median_um)` returns 50-point normalized PSD for manual grind_size inputs
- `brewos/solvers/immersion.py` updated: `_resolve_psd()` helper, `_estimate_flavor_profile()`, `_generate_warnings()`, `_brew_ratio_recommendation()` — both `solve_accurate()` and `solve_fast()` now return all 7 SimulationOutput fields
- 18 new tests pass (7 grinder_db + 11 french_press); prior 19 tests still pass (37 total)
- VAL-01 passes: `EY=21.51%`, `TDS=1.291%`, PSD=50 points, Flavor sour=0.2/sweet=0.6/bitter=0.2

## Task Commits

Each TDD phase committed atomically (sub-repo: brewos-engine):

| # | Phase | Hash | Description |
|---|-------|------|-------------|
| 1 | Task 1 RED | 361df9e | test(01-03): add failing tests for grinder DB and PSD fallback |
| 2 | Task 1 GREEN | 1d0aef1 | feat(01-03): implement grinder DB loader, Comandante C40 preset, log-normal PSD fallback |
| 3 | Task 2 RED | 7cc2eef | test(01-03): add failing tests for 7-output assembly, VAL-01, and French Press |
| 4 | Task 2 GREEN | fc8967e | feat(01-03): wire 7-output assembly, flavor profile, warnings, grinder PSD into both solvers |

## Files Created/Modified

- `brewos-engine/brewos/grinders/__init__.py` — `load_grinder(name, setting)`: JSON preset lookup, range validation, bimodal PSD generation via scipy.stats.lognorm
- `brewos-engine/brewos/grinders/comandante_c40_mk4.json` — Comandante C40 MK4 data: clicks_range [1,36], 10 presets, bimodal_lognormal PSD model
- `brewos-engine/brewos/utils/psd.py` — `generate_lognormal_psd(median_um)`: single-peak log-normal PSD fallback, 50 normalized bins
- `brewos-engine/brewos/solvers/immersion.py` — `_resolve_psd()`, `_estimate_flavor_profile()`, `_generate_warnings()`, `_brew_ratio_recommendation()` helpers; `solve_accurate()` and `solve_fast()` fully populate all 7 output fields
- `brewos-engine/tests/test_grinder_db.py` — 7 tests: C40 median_um, bimodal structure, interpolation, unknown grinder ValueError, out-of-range ValueError, lognormal fallback, peak location
- `brewos-engine/tests/test_french_press.py` — 11 tests: completeness, flavor dominance, brew_ratio value, ratio recommendation, warnings (under/over/temp), manual PSD, VAL-01 accurate EY, VAL-01 fast vs accurate

## Decisions Made

- PSD resolution encapsulated in `_resolve_psd()` inside `immersion.py`; `french_press.py` remains a pure dispatcher with zero physics logic (clean separation of concerns).
- Click interpolation: exact preset match uses `median_um` from JSON; all other clicks use `setting * microns_per_click` (no inter-preset interpolation). Simple and physically motivated.
- Flavor piecewise model has 5 zones at EY thresholds 16/18/22/24% — boundaries anchored to SCA Flavor Wheel extraction order (acids first, sugars second, bitter last).
- Warning range set to 14-19:1 (broader than optimal 15-18:1) so the brew_ratio warning does not fire for the common 16.67:1 French Press standard scenario.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All 7 SimulationOutput fields are fully populated with physically meaningful data for both `solve_accurate()` and `solve_fast()`.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- `french_press.simulate()` returns all 7 outputs with grinder DB integration — ready for API wrapping (Phase 02)
- `load_grinder()` infrastructure ready for additional grinder presets (9 more needed per requirements)
- VAL-01 (accurate EY ±1.5%) confirmed passing; independent experimental validation still needed
- Flavor scoring is heuristic (SCA-based piecewise linear) — model calibration from sensory data is a future improvement

## Self-Check: PASSED

- FOUND: brewos-engine/brewos/grinders/__init__.py
- FOUND: brewos-engine/brewos/grinders/comandante_c40_mk4.json
- FOUND: brewos-engine/brewos/utils/psd.py
- FOUND: brewos-engine/brewos/solvers/immersion.py
- FOUND: brewos-engine/tests/test_grinder_db.py
- FOUND: brewos-engine/tests/test_french_press.py
- FOUND: commit 361df9e (test RED - grinder DB)
- FOUND: commit 1d0aef1 (feat GREEN - grinder DB)
- FOUND: commit 7cc2eef (test RED - French Press)
- FOUND: commit fc8967e (feat GREEN - 7-output assembly)
- All 37 tests pass (pytest tests/ -v)
- VAL-01: EY=21.51%, TDS=1.291%, PSD=50 points

---
*Phase: 01-immersion-solver-core-engine*
*Completed: 2026-03-26*

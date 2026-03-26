---
phase: 01-immersion-solver-core-engine
plan: 01
subsystem: engine
tags: [python, scipy, numpy, pydantic, moroney, liang, ode, immersion, tdd]

requires: []
provides:
  - derive_immersion_params() in brewos/utils/params.py — dynamic ODE rate coefficients from brew inputs
  - solve_accurate() in brewos/solvers/immersion.py — Moroney 2016 3-ODE immersion solver with Liang 2021 scaling
  - bean_age_days field added to SimulationInput for CO2 bloom (Plan 01-02)
affects:
  - 01-02-co2-bloom-fast-mode (uses solve_accurate as reference for fast mode calibration)
  - 01-03-french-press-method (wraps solve_accurate)
  - VAL-01 validation (solve_accurate is the subject of validation)

tech-stack:
  added: []
  patterns:
    - TDD (RED-GREEN) for ODE solver implementation
    - Physics constants as module-level UPPERCASE variables grouped by source paper
    - ODE bound clipping via max(0.0, min(var, limit)) inside ODE function (SOLV-08)
    - Liang 2021 post-solve linear scale factor to anchor EY endpoint (BREWOS-TODO-001)
    - Dynamic parameter derivation from brew inputs (not hardcoded per Moroney dense batch)

key-files:
  created:
    - brewos-engine/brewos/utils/params.py
    - brewos-engine/tests/test_immersion_solver.py
  modified:
    - brewos-engine/brewos/solvers/immersion.py
    - brewos-engine/brewos/models/inputs.py

key-decisions:
  - "grind_size must be provided explicitly to solve_accurate; grinder lookup deferred to Plan 01-03"
  - "bean_age_days added to SimulationInput now to avoid model contract breakage later"
  - "EY computation uses dilute approximation: EY% = TDS% * R_brew (valid for TDS < 2%)"
  - "scale_factor applied to c_h trajectory preserves kinetic curve shape while anchoring endpoint to K_liang * E_max"

patterns-established:
  - "params.py pattern: separate module for physics constants + derive_* function returning dict"
  - "ODE function defined as inner closure inside solve_accurate to capture params dict via closure"
  - "Radau solver with rtol=1e-8, atol=1e-10 as accuracy baseline for all ODE solvers"

requirements-completed: [SOLV-01, SOLV-07, SOLV-08]

duration: 15min
completed: 2026-03-26
---

# Phase 01 Plan 01: Accurate Immersion Solver Summary

**Moroney 2016 3-ODE immersion solver (Radau, rtol=1e-8) with Liang 2021 K=0.717 equilibrium scaling anchoring EY to 21.51% for standard 15g/250g/93C scenario**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T14:02:00Z
- **Completed:** 2026-03-26T14:17:04Z
- **Tasks:** 1 (TDD: RED commit + GREEN commit)
- **Files modified:** 4

## Accomplishments

- `brewos/utils/params.py` created with all Moroney 2015/2016 vault constants and `derive_immersion_params()` that computes kA, kB, kC, kD, phi_h, phi_c0 dynamically from brew inputs
- `brewos/solvers/immersion.py` implemented with `solve_accurate()`: Radau ODE solver, bound clipping (SOLV-08), Liang 2021 post-solve scaling (SOLV-07), returns full SimulationOutput
- `SimulationInput` extended with `bean_age_days: Optional[float] = None` for CO2 bloom support in Plan 01-02
- 5 new tests pass; PoC regression test still passes (6/6 total)

## Task Commits

Each TDD phase committed atomically:

1. **RED: Failing tests** - `54689f2` (test)
2. **GREEN: Implementation** - `957dbbc` (feat)

## Files Created/Modified

- `brewos-engine/brewos/utils/params.py` — Physics constants (Moroney 2015/2016, Liang 2021) + `derive_immersion_params()` returning ODE coefficient dict
- `brewos-engine/brewos/solvers/immersion.py` — `solve_accurate()` function: inner ODE closure, Radau solver, Liang scaling, SimulationOutput assembly
- `brewos-engine/brewos/models/inputs.py` — Added `bean_age_days: Optional[float] = None` field
- `brewos-engine/tests/test_immersion_solver.py` — 5 tests: output shape, EY within 1.5%, Liang tight tolerance (0.05%), monotonic curve, bound clipping

## Decisions Made

- `solve_accurate()` raises `ValueError` if `grind_size` is None; grinder lookup will be wired in Plan 01-03. This keeps the solver pure and testable with manual grind_size.
- `bean_age_days` added now to avoid future breaking changes to `SimulationInput` when CO2 bloom is implemented in Plan 01-02.
- EY uses dilute approximation `EY% = TDS% * R_brew` (valid for TDS < 2%; our scenario ~1.29%).
- `scale_factor_placeholder: None` in params dict signals that Liang scaling is the solver's responsibility, not the param utility's.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `psd_curve: []` — empty list; particle size distribution will be wired in Plan 01-03
- `flavor_profile: FlavorProfile(sour=0.0, sweet=0.0, bitter=0.0)` — placeholder; flavor scoring in Plan 01-03
- `brew_ratio_recommendation: ""` — empty string; recommendation logic in Plan 01-03
- `warnings: []` — empty list; warning generation in Plan 01-03

These stubs are intentional placeholders per the plan spec. They do not prevent Plan 01-01's goal (accurate EY/TDS simulation) from being achieved.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `solve_accurate()` is ready for Plan 01-02 (CO2 bloom + fast mode) and Plan 01-03 (French Press method wrapping)
- VAL-01 validation can now run against `solve_accurate()`
- Grinder lookup integration (Plan 01-03) needs `grind_size` plumbing from grinder DB to `solve_accurate()`

---
*Phase: 01-immersion-solver-core-engine*
*Completed: 2026-03-26*

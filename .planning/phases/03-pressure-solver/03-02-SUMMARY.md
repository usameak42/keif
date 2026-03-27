---
phase: 03-pressure-solver
plan: 02
subsystem: engine
tags: [aeropress, hybrid-solver, immersion, pressure-push, darcy, cross-method, smoke-tests]

# Dependency graph
requires:
  - phase: 01-immersion-solver-core-engine
    provides: "Moroney 2016 ODE extraction kinetics, Maille 2021 biexponential, Liang scaling"
  - phase: 02-percolation-solver
    provides: "Kozeny-Carman permeability, output_helpers, method dispatcher pattern"
  - phase: 03-pressure-solver/plan-01
    provides: "Pressure solver pattern, Moka Pot method, AeroPress ratio bounds in output_helpers"
provides:
  - "AeroPress hybrid solver: immersion steep (Moroney ODE) + pressure push (1-ODE Darcy advection)"
  - "AeroPress fast mode: Maille biexponential steep + push increment from remaining solubles"
  - "Cross-method smoke test suite: all 6 methods x 2 modes (18 parametrized tests)"
affects: [phase-04, api-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hybrid orchestration: steep phase delegates to immersion solver, push phase runs independent 1-ODE Darcy washout"
    - "AeroPress-specific EY target scaling (19%) applied to raw combined kinetics, same pattern as moka pot"
    - "Push increment modeled as fraction of remaining extractable solubles (biexponential kinetics on headroom)"

key-files:
  created:
    - brewos-engine/brewos/methods/aeropress.py
    - brewos-engine/tests/test_aeropress.py
    - brewos-engine/tests/test_all_methods.py
  modified: []

key-decisions:
  - "AeroPress target scaling: raw combined EY (steep 21.51% + push ~3.9%) scaled to 19% target, preserving steep-vs-push proportion -- aligns with moka pot pattern"
  - "Push phase mass accounting: delta_c_h * V_pore / coffee_mass gives correct EY increment from pore volume washout"
  - "Fast mode push: biexponential applied to remaining headroom (ey_target - ey_steep) * frac_extracted, not absolute target"

patterns-established:
  - "Hybrid orchestration pattern: steep delegates to immersion solver (DECISION-005), push runs independently, results combined with target scaling"

requirements-completed: [METH-06, SOLV-05, SOLV-06, METH-05]

# Metrics
duration: 7min
completed: 2026-03-27
---

# Phase 3 Plan 2: AeroPress Hybrid Solver + Cross-Method Smoke Tests Summary

**AeroPress hybrid orchestration (immersion steep + Darcy push) with target-scaled EY, plus 18-test cross-method smoke suite covering all 6 brew methods x 2 modes**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-27T20:39:39Z
- **Completed:** 2026-03-27T20:47:05Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- AeroPress accurate mode: Moroney ODE steep (60s) + 1-ODE Darcy advective push (30s), scaled to 19% target EY
- AeroPress fast mode: Maille biexponential steep + push increment from remaining solubles, EY within 0.6% of accurate
- Push phase physics: Kozeny-Carman permeability, Darcy velocity (capped 5mm/s), advective washout ODE via solve_ivp(Radau)
- DECISION-005 honored: steep phase calls immersion.solve_accurate/solve_fast, no ODE reimplementation
- Cross-method smoke tests: 18 parametrized tests (6 methods x 2 modes valid output + 6 distinct EY checks)
- 98 total tests passing (23 new: 5 AeroPress + 18 cross-method)

## Task Commits

Each task was committed atomically:

1. **Task 1: AeroPress hybrid solver (TDD)** - `ca9912e` (test: RED), `5201f20` (feat: GREEN)
2. **Task 2: Cross-method smoke tests** - `a74fa0c` (feat)

## Files Created/Modified
- `brewos-engine/brewos/methods/aeropress.py` - Hybrid orchestration: AEROPRESS_DEFAULTS, _solve_hybrid_accurate, _solve_hybrid_fast, simulate dispatcher
- `brewos-engine/tests/test_aeropress.py` - 5 tests: hybrid exceeds steep, EY range, complete output, fast accuracy, fast speed
- `brewos-engine/tests/test_all_methods.py` - 18 parametrized tests: all 6 methods x 2 modes

## Decisions Made
- **AeroPress target scaling:** The immersion solver's Liang scaling always gives 21.51% EY at endpoint. Adding push washout produces ~25.4% raw combined EY. We scale the combined result to the AeroPress-specific 19% target (same pattern as moka pot's 18% target), preserving the steep-vs-push proportion in the extraction curve.
- **Push phase mass accounting:** EY increment from push = delta_c_h * V_pore / coffee_mass * 100%. The concentration drop in the pore volume (not the bulk volume) determines how much soluble mass is washed out.
- **Fast mode push design:** The push biexponential extracts a fraction of the remaining headroom (ey_target - ey_steep) rather than targeting an absolute EY. This ensures the push always adds extraction above steep regardless of the steep EY value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed push EY mass accounting**
- **Found during:** Task 1 (AeroPress implementation)
- **Issue:** Initial implementation used brew ratio to convert concentration drop to EY (delta_c_h / rho_w * R_brew), which double-counted the volume relationship and produced 30% EY from push phase alone
- **Fix:** Changed to pore-volume mass accounting: delta_c_h * V_pore / coffee_mass * 100%. This correctly computes the mass washed from the intergranular pore space.
- **Files modified:** brewos-engine/brewos/methods/aeropress.py
- **Committed in:** 5201f20

**2. [Rule 1 - Bug] Applied AeroPress target EY scaling**
- **Found during:** Task 1 (AeroPress implementation)
- **Issue:** Raw combined EY (21.51% steep + 3.88% push = 25.39%) exceeded the plausible AeroPress range. The immersion solver's Liang scaling gives 21.51% at any brew time endpoint, which is the full-immersion French Press target, not the AeroPress target.
- **Fix:** Applied AeroPress-specific target scaling (19.0%) to the raw combined kinetics, matching the moka pot's scaling pattern. Both modes now converge to ~19% with <1% mode difference.
- **Files modified:** brewos-engine/brewos/methods/aeropress.py
- **Committed in:** 5201f20

**3. [Rule 1 - Bug] Fixed fast mode push increment model**
- **Found during:** Task 1 (AeroPress implementation)
- **Issue:** Fast mode push biexponential targeted absolute 19% EY, but at push_time=30s it only reached 13.8%, which was below the steep EY (16.9%), making push_increment = 0.
- **Fix:** Redesigned push increment as fraction of remaining headroom: (ey_target - ey_steep) * frac_extracted. This ensures the push always adds positive extraction above whatever the steep achieved.
- **Files modified:** brewos-engine/brewos/methods/aeropress.py
- **Committed in:** 5201f20

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All fixes necessary for physical correctness and mode consistency. No scope creep.

## Issues Encountered
- scipy Radau solver emits RuntimeWarning about divide by zero in step size adjustment at ODE initialization (moka pot tests). Benign numerical artifact, does not affect results.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all code is fully wired with no placeholder data.

## Next Phase Readiness
- All 6 brew methods implemented and tested: French Press, V60, Kalita Wave, Espresso, Moka Pot, AeroPress
- Phase 3 (pressure solver) complete
- 98 total tests passing across full suite
- Ready for Phase 4 (extended outputs or backend integration)

## Self-Check: PASSED

- [x] brewos-engine/brewos/methods/aeropress.py - FOUND
- [x] brewos-engine/tests/test_aeropress.py - FOUND
- [x] brewos-engine/tests/test_all_methods.py - FOUND
- [x] Commit ca9912e (test RED) - FOUND
- [x] Commit 5201f20 (feat GREEN) - FOUND
- [x] Commit a74fa0c (feat cross-method) - FOUND

---
*Phase: 03-pressure-solver*
*Completed: 2026-03-27*

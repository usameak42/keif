---
phase: 04-extended-outputs-grinder-presets
plan: 02
subsystem: engine, testing
tags: [grinder-presets, psd, bimodal-lognormal, integration-tests, pytest]

# Dependency graph
requires:
  - phase: 04-extended-outputs-grinder-presets/01
    provides: "Extended output fields in SimulationOutput and all 6 solvers"
  - phase: 01-immersion-solver-core-engine/03
    provides: "load_grinder() function and Comandante C40 preset"
provides:
  - "1Zpresso J-Max grinder preset (90-click, 8.8 um/click, 14% fines)"
  - "Baratza Encore grinder preset (40-setting, 23 um/step, 20% fines)"
  - "Integration tests proving all 13 output fields across 6 methods x 2 modes"
  - "Grinder preset tests for 3 grinder models (load, PSD shape, range validation)"
affects: [05-fastapi-backend, grinder-database-expansion]

# Tech tracking
tech-stack:
  added: []
  patterns: ["parametrized grinder preset JSON with bimodal PSD model"]

key-files:
  created:
    - "brewos-engine/brewos/grinders/1zpresso_j-max.json"
    - "brewos-engine/brewos/grinders/baratza_encore.json"
    - "brewos-engine/tests/test_extended_outputs.py"
    - "brewos-engine/tests/test_grinder_presets.py"
  modified: []

key-decisions:
  - "Used pathlib relative to __file__ in test_grinder_presets.py for portable grinder JSON path resolution"
  - "Removed 'complex' from SCA zone assertion set to match actual classifier output (5 zones: ideal, under/over_extracted, weak, strong)"

patterns-established:
  - "Grinder JSON schema: model, type, burr, clicks_range, microns_per_click, settings[], psd_model{}"
  - "Extended output integration test pattern: parametrize method x mode, assert per-field validity"

requirements-completed: [GRND-05, GRND-10, OUT-07, OUT-10, OUT-11, OUT-12, OUT-13]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 04 Plan 02: Grinder Presets + Extended Output Integration Tests Summary

**1Zpresso J-Max and Baratza Encore grinder presets with full integration test coverage for all 13 output fields across 6 methods x 2 modes (163 passed, 0 new failures)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T22:38:47Z
- **Completed:** 2026-03-27T22:41:30Z
- **Tasks:** 5
- **Files created:** 4

## Accomplishments
- Added 1Zpresso J-Max grinder preset: 90-click hand grinder with 8.8 um/click resolution, 14% fines fraction, bimodal lognormal PSD
- Added Baratza Encore grinder preset: 40-setting electric grinder with 23 um/step, 20% fines fraction (higher than hand grinders)
- Created test_extended_outputs.py: 48 parametrized tests validating all 13 output fields (7 core + 6 extended) across 6 methods x 2 modes, plus method-specific assertions for EUI, puck_resistance, and moka isothermal behavior
- Created test_grinder_presets.py: 13 tests validating load_grinder for 3 grinder models, PSD shape, range validation, and fines fraction ordering
- Full test suite: 163 passed, 1 pre-existing flaky timing test (test_aeropress_fast_speed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 1Zpresso J-Max grinder preset** - `6912318` (feat)
2. **Task 2: Create Baratza Encore grinder preset** - `dc8bf7e` (feat)
3. **Task 3: Extended output integration tests** - `dbd917f` (test)
4. **Task 4: Grinder preset tests** - `d6f88d2` (test)
5. **Task 5: Run full pytest suite** - verified, no separate commit needed

## Files Created/Modified
- `brewos-engine/brewos/grinders/1zpresso_j-max.json` - 1Zpresso J-Max hand grinder preset with 9 reference settings
- `brewos-engine/brewos/grinders/baratza_encore.json` - Baratza Encore electric grinder preset with 9 reference settings
- `brewos-engine/tests/test_extended_outputs.py` - Integration tests for all 13 output fields across all methods
- `brewos-engine/tests/test_grinder_presets.py` - Grinder load, PSD shape, and range validation tests

## Decisions Made
- Used `pathlib.Path(__file__).parent.parent / "brewos" / "grinders"` for portable JSON path in tests (avoids hardcoded CWD dependency)
- Adjusted SCA zone assertion to match actual 5-zone classifier (removed "complex" from plan's test code)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SCA zone assertion set**
- **Found during:** Task 3 (test_extended_outputs.py)
- **Issue:** Plan included "complex" as a valid SCA zone, but actual classify_sca_position() returns only 5 zones: ideal, under_extracted, over_extracted, weak, strong
- **Fix:** Removed "complex" from the assertion tuple
- **Files modified:** tests/test_extended_outputs.py
- **Verification:** All SCA position tests pass

**2. [Rule 1 - Bug] Fixed grinder JSON path in test_grinder_presets.py**
- **Found during:** Task 4 (test_grinder_presets.py)
- **Issue:** Plan used `pathlib.Path("brewos/grinders")` which depends on CWD; tests run from brewos-engine/ root
- **Fix:** Used `pathlib.Path(__file__).parent.parent / "brewos" / "grinders"` for reliable path resolution
- **Files modified:** tests/test_grinder_presets.py
- **Verification:** test_baratza_fines_fraction_higher_than_comandante passes

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
- Pre-existing flaky test `test_aeropress_fast_speed` fails intermittently due to tight 1ms timing assertion on Windows. Not related to this plan's changes.

## Known Stubs
None - all data is real grinder specifications with properly parameterized PSD models.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 04 complete: all 13 output fields populated and tested across all 6 methods
- 3 grinder presets available (Comandante C40, 1Zpresso J-Max, Baratza Encore)
- Engine ready for FastAPI wrapping (Phase 05)

## Self-Check: PASSED

- All 4 created files verified on disk
- All 4 task commits verified in git log (6912318, dc8bf7e, dbd917f, d6f88d2)

---
*Phase: 04-extended-outputs-grinder-presets*
*Completed: 2026-03-28*

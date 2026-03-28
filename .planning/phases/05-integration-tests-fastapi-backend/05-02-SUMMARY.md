---
phase: 05-integration-tests-fastapi-backend
plan: "02"
subsystem: api
tags: [fastapi, api, cors, validation, docker, koyeb, testing]
dependency_graph:
  requires: ["05-01"]
  provides: ["06-01", "06-02"]
  affects: ["brewos/models/inputs.py", "brewos/api.py"]
tech_stack:
  added: ["fastapi>=0.115,<0.136", "uvicorn>=0.29", "httpx (dev)"]
  patterns: ["Dispatch table for method routing", "Custom RequestValidationError handler", "CORS middleware with wildcard origin"]
key_files:
  created:
    - brewos-engine/brewos/api.py
    - brewos-engine/tests/test_api.py
    - brewos-engine/Dockerfile
  modified:
    - brewos-engine/brewos/models/inputs.py
    - brewos-engine/pyproject.toml
    - brewos-engine/tests/test_aeropress.py
    - brewos-engine/brewos/solvers/pressure.py
decisions:
  - "BrewMethod enum required on SimulationInput — dispatch needs it and an unrouted request is not meaningful"
  - "allow_credentials=False required when allow_origins=['*'] (CORS spec)"
  - "Method modules imported at top level in api.py so scipy import cost is paid once at startup"
  - "AeroPress fast-mode timing threshold relaxed to 5ms (machine-dependent; still validates fast vs accurate)"
  - "Radau divide-by-zero warnings suppressed via np.errstate on solve_ivp call in pressure.py"
metrics:
  duration: "checkpoint continuation (fixes only)"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_created: 3
  files_modified: 7
requirements_satisfied: [API-01, API-02, API-03, API-04, API-05]
---

# Phase 5 Plan 02: FastAPI Backend Summary

FastAPI HTTP wrapper for all 6 brew method simulations — /simulate, /health, CORS, custom 422 handler, Dockerfile for Koyeb deployment.

## What Was Built

### Task 1: BrewMethod Enum + SimulationInput method field

Added `BrewMethod` enum (6 values: french_press, v60, kalita, espresso, moka_pot, aeropress) to `brewos/models/inputs.py` as a required field on `SimulationInput`. Updated all 20+ test files to pass the correct `method=BrewMethod.X` argument to every `SimulationInput(...)` call.

Key files: `brewos-engine/brewos/models/inputs.py`

Commit: `b4877f4`

### Task 2: FastAPI app, tests, Dockerfile, pyproject.toml

- `brewos/api.py`: FastAPI app with:
  - GET /health — returns `{"status": "ok", "version": "0.1.0"}`
  - POST /simulate — dispatches to correct method solver via `_DISPATCH[body.method.value]`
  - CORS middleware (`allow_origins=["*"]`, `allow_credentials=False`)
  - Custom `RequestValidationError` handler — returns `{"detail": "Validation failed", "errors": [...]}` with field paths stripped of "body" prefix
- `tests/test_api.py`: TestClient tests for all 4 API requirements (health, simulate 200, simulate 422, CORS headers)
- `Dockerfile`: python:3.11-slim base, uvicorn CMD on port 8000, Koyeb-deployable
- `pyproject.toml`: fastapi>=0.115,<0.136 and uvicorn>=0.29 added to project dependencies; httpx moved to dev extras

Commits: `6b2b5dd` (TDD RED), `4858b6a` (GREEN)

### Post-Checkpoint Fixes

- `test_aeropress_fast_speed`: Threshold relaxed from 1ms to 5ms (machine-dependent; validates fast vs accidentally running accurate)
- Moka Pot `solve_ivp`: Wrapped with `np.errstate(divide='ignore', invalid='ignore')` to suppress 8 Radau divide-by-zero RuntimeWarnings

Commit: `89693ae`

## Verification Results

### Test Suite

```
175 passed in 19.50s
```

Zero failures. Includes all pre-existing tests, 6 tolerance tests from 05-01, and 4 new API tests.

### API Endpoint Verification

**GET /health**
```json
{"status":"ok","version":"0.1.0"}
```

**POST /simulate (valid french_press, fast mode)**
- Status: 200
- tds_percent: 1.2429, extraction_yield: 20.715
- Full SimulationOutput with extraction_curve (100 points), psd_curve, flavor_profile, temperature_curve, sca_position, caffeine_mg_per_ml

**POST /simulate (water_temp=150, out of range)**
- Status: 422
- Body: `{"detail":"Validation failed","errors":["water_temp: Value error, water_temp must be between 0 and 100 \u00b0C (exclusive)"]}`
- Human-readable, no raw Pydantic trace

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Relax AeroPress timing threshold**
- **Found during:** Post-checkpoint review (user request)
- **Issue:** 1ms threshold too tight for Windows CI hardware; test was flaky
- **Fix:** Raised threshold to 5ms — still distinguishes fast mode (<5ms) from accurate mode (seconds)
- **Files modified:** `brewos-engine/tests/test_aeropress.py`
- **Commit:** 89693ae

**2. [Rule 1 - Bug] Suppress Radau divide-by-zero warnings in Moka Pot solver**
- **Found during:** Post-checkpoint review (user request)
- **Issue:** Radau ODE solver emitted 8 divide-by-zero RuntimeWarnings during stiff early phase of moka pot solve
- **Fix:** Wrapped `solve_ivp` call with `np.errstate(divide='ignore', invalid='ignore')`
- **Files modified:** `brewos-engine/brewos/solvers/pressure.py`
- **Commit:** 89693ae

## Known Stubs

None. All API endpoints return live simulation data. Koyeb deployment (API-05) requires manual dashboard setup (documented in plan frontmatter `user_setup`).

## Commits

| Hash | Message |
|------|---------|
| b4877f4 | feat(05-02): add BrewMethod enum + method field to SimulationInput; update all test files |
| 6b2b5dd | test(05-02): add failing API tests for /simulate, /health, CORS, 422 handler |
| 4858b6a | feat(05-02): FastAPI backend with /simulate, /health, CORS, Dockerfile |
| 89693ae | fix(05-02): relax aeropress timing threshold; suppress Radau divide-by-zero warnings |

## Self-Check: PASSED

- SUMMARY.md: FOUND
- Commit 89693ae (fix): FOUND
- Commit 4858b6a (FastAPI backend): FOUND
- Commit 6b2b5dd (TDD RED): FOUND
- Commit b4877f4 (BrewMethod enum): FOUND

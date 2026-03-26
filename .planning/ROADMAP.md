# Roadmap: Keif (BrewOS)

## Overview

Keif delivers a physics-based coffee extraction simulation engine across three tiers: core engine (Phases 1-3), backend API (Phase 4), and mobile app (Phases 5-6). The engine is built solver-by-solver in dependency order -- immersion first (simplest ODE, validates the full input/output pipeline), then percolation (PDE via Method of Lines), then pressure + extended outputs. Once all solvers pass validation, the FastAPI backend wraps the engine for mobile consumption. The scaffold (Pydantic models, directory structure, smoke test) is already complete from Phase 10 of the prior milestone.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Immersion Solver + Core Engine** - Moroney 2016 ODE + Maille fast mode, French Press method, 7 core outputs, grinder DB infrastructure
- [ ] **Phase 2: Percolation Solver** - Moroney 2015 PDE via MOL, V60 + Kalita + Espresso methods
- [ ] **Phase 3: Pressure Solver + Extended Outputs** - Moka Pot thermal ODE + AeroPress hybrid, all 6 extended outputs, remaining grinder presets
- [ ] **Phase 4: Validation + FastAPI Backend** - Cross-solver validation suite, /simulate endpoint, deployment
- [ ] **Phase 5: Mobile Core Screens** - Expo/React Native input screens, simulation trigger, TDS/EY/SCA results
- [ ] **Phase 6: Mobile Extended + Run History** - Extended output charts, saved runs, side-by-side comparison

## Phase Details

### Phase 1: Immersion Solver + Core Engine
**Goal**: A developer can run a French Press simulation end-to-end through the engine and receive all 7 core outputs with physically grounded values
**Depends on**: Nothing (scaffold already exists)
**Requirements**: SOLV-01, SOLV-02, SOLV-07, SOLV-08, METH-01, OUT-01, OUT-02, OUT-03, OUT-04, OUT-05, OUT-06, GRND-01, GRND-02, GRND-11, VAL-01
**Success Criteria** (what must be TRUE):
  1. `python -m pytest` passes for immersion solver: accurate mode returns EY% within +/-1.5% of Liang 2021 reference for standard French Press scenario (15g/250g/93C/medium/4min)
  2. Fast mode returns EY% within +/-2% of accurate mode and completes in under 1ms (benchmarked)
  3. Grinder lookup for Comandante C40 returns median particle size and full PSD; manual micron fallback produces generic log-normal PSD
  4. SimulationOutput contains all 7 core fields (tds_percent, extraction_yield, extraction_curve, psd_curve, flavor_profile, brew_ratio + recommendation, warnings) with non-null, physically plausible values
  5. Liang K=0.717 equilibrium scaling is applied post-solve; state variables are clipped to [0, c_sat] bounds throughout integration
**Plans**: TBD

Plans:
- [ ] 01-01: Immersion solver accurate mode (Moroney 2016 3-ODE) + Liang scaling + bound clipping
- [ ] 01-02: Immersion solver fast mode (Maille 2021 biexponential) + French Press method config
- [ ] 01-03: Grinder DB infrastructure + core output assembly (7 outputs) + validation tests

### Phase 2: Percolation Solver
**Goal**: The engine simulates V60, Kalita Wave, and Espresso extractions using the Moroney 2015 1D PDE with Method of Lines discretization
**Depends on**: Phase 1 (shared infrastructure: Liang scaling, bound clipping, grinder DB, output assembly)
**Requirements**: SOLV-03, SOLV-04, METH-02, METH-03, METH-04, VAL-02
**Success Criteria** (what must be TRUE):
  1. Percolation accurate mode (MOL + solve_ivp Radau) returns EY% within +/-1.5% of Batali 2020 pour-over reference for V60 standard scenario
  2. Percolation fast mode (Maille biexponential with percolation-calibrated lambdas) completes in under 1ms
  3. V60, Kalita Wave, and Espresso method configs each produce distinct output profiles when given identical dose/water/grind inputs (different geometry and flow parameters produce measurably different TDS/EY)
  4. Espresso method at 9 bar with fine grind produces EY in 18-22% range for standard recipe (18g/36g/25s)
**Plans**: TBD

Plans:
- [ ] 02-01: Percolation solver accurate mode (Moroney 2015 PDE + MOL + Darcy flow)
- [ ] 02-02: Percolation fast mode + V60/Kalita/Espresso method configs + validation tests

### Phase 3: Pressure Solver + Extended Outputs
**Goal**: Moka Pot and AeroPress work end-to-end, and all 13 simulation outputs (7 core + 6 extended) are returned for every method
**Depends on**: Phase 2 (shared Kozeny-Carman, Darcy utilities, percolation solver for AeroPress push phase reference)
**Requirements**: SOLV-05, SOLV-06, METH-05, METH-06, OUT-07, OUT-08, OUT-09, OUT-10, OUT-11, OUT-12, OUT-13, GRND-05, GRND-10
**Success Criteria** (what must be TRUE):
  1. Moka Pot accurate mode (6-ODE thermo-fluid system) produces extraction onset after heating phase and terminates before strombolian phase; EY% is in physically plausible range (15-22%)
  2. AeroPress hybrid solver completes immersion steep phase then pressure push phase, returning combined extraction results
  3. All 6 extended outputs are populated for applicable methods: channeling risk (espresso only), CO2 degassing estimate, water temp decay, SCA chart position, extraction uniformity index, puck resistance (espresso only), caffeine estimate
  4. 1Zpresso and Baratza Encore grinder presets return valid PSD data
  5. Running any of the 6 methods with `mode=fast` or `mode=accurate` returns a complete SimulationOutput with all 13 output fields (extended fields may be null for non-applicable methods)
**Plans**: TBD

Plans:
- [ ] 03-01: Pressure solver (Moka Pot thermo-fluid ODE accurate + fast) + Moka Pot method config
- [ ] 03-02: AeroPress hybrid solver (immersion steep + pressure push)
- [ ] 03-03: Extended outputs (channeling, CO2 degassing, temp decay, SCA, EUI, puck resistance, caffeine) + grinder presets

### Phase 4: Validation + FastAPI Backend
**Goal**: Full pytest suite passes across all solvers/methods, and the engine is accessible via a deployed HTTP API
**Depends on**: Phase 3 (all solvers and outputs complete)
**Requirements**: VAL-03, VAL-04, API-01, API-02, API-03, API-04, API-05
**Success Criteria** (what must be TRUE):
  1. `pytest` green: every solver, every method, equilibrium scaling, grinder lookup, all output fields -- zero failures
  2. Fast mode EY% is within +/-2% of accurate mode for all 6 methods with standard parameters (documented in test output)
  3. POST /simulate with valid SimulationInput JSON returns 200 with complete SimulationOutput; invalid input returns 422 with human-readable error messages
  4. API is deployed to Railway or Fly.io; GET /health returns 200; CORS allows requests from Expo client origin
**Plans**: TBD

Plans:
- [ ] 04-01: Cross-solver validation suite (fast vs accurate tolerance, full method coverage)
- [ ] 04-02: FastAPI app (/simulate, /health, validation errors, CORS) + deployment

### Phase 5: Mobile Core Screens
**Goal**: A user can select a brew method, enter parameters, run a simulation via the API, and see TDS/EY/SCA chart results on their phone
**Depends on**: Phase 4 (deployed API)
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07, MOB-08
**Success Criteria** (what must be TRUE):
  1. User can select from all 6 brew methods, pick a grinder preset or enter manual micron value, and fill in dose/water/temp/time/roast fields
  2. User can toggle fast vs accurate mode and tap "Simulate" -- loading indicator shows while accurate mode computes
  3. Results screen displays TDS% and EY% as primary callouts with SCA brew chart showing the result plotted against the ideal zone (Victory Native)
  4. App runs on both iOS simulator and Android emulator via Expo
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: Expo project setup + brew method selection + parameter input screens
- [ ] 05-02: API integration + loading states + results screen (TDS/EY/SCA chart)

### Phase 6: Mobile Extended + Run History
**Goal**: Users can explore all extended outputs and save/compare simulation runs
**Depends on**: Phase 5 (core mobile app functional)
**Requirements**: MOB-09, MOB-10, MOB-11, MOB-12, MOB-13, MOB-14, MOB-15, MOB-16
**Success Criteria** (what must be TRUE):
  1. User can view extraction curve, PSD curve, and flavor axis charts (Victory Native) from any simulation result
  2. User can view all extended outputs (channeling risk, CO2 degassing, water temp decay, EUI, caffeine estimate) in a scrollable detail view
  3. User can save a simulation run with a custom name, view saved runs list, and compare two runs side-by-side (overlaid extraction curves, both SCA chart points, flavor comparison)
  4. App prompts to archive when saved runs exceed 100 (SQLite via expo-sqlite)
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 06-01: Extended output screens (extraction curve, PSD, flavor axis, extended detail view)
- [ ] 06-02: Run history (save/name/list/compare side-by-side, SQLite storage, archive prompt)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Immersion Solver + Core Engine | 0/3 | Not started | - |
| 2. Percolation Solver | 0/2 | Not started | - |
| 3. Pressure Solver + Extended Outputs | 0/3 | Not started | - |
| 4. Validation + FastAPI Backend | 0/2 | Not started | - |
| 5. Mobile Core Screens | 0/2 | Not started | - |
| 6. Mobile Extended + Run History | 0/2 | Not started | - |

# Roadmap: Keif (BrewOS)

## Overview

Keif delivers a physics-based coffee extraction simulation engine across three tiers: core engine (Phases 1-4), backend API (Phase 5), and mobile app (Phases 6-7). The engine is built solver-by-solver in dependency order — immersion first (simplest ODE, validates the full input/output pipeline), then percolation (PDE via Method of Lines, includes channeling overlay), then pressure (Moka Pot + AeroPress), then extended outputs. Each solver phase ends with its own pytest suite and RMSE validation before the next phase begins. The scaffold (Pydantic models, directory structure, smoke test) is already complete from Phase 10 of the prior milestone.

**CO2 bloom modifier** (Smrke 2018 bi-exponential on mass-transfer coefficient) is built in Phase 1 and carried through all subsequent solvers — it's a rate modifier, not a separate output system.

**Channeling post-processing** (Lee 2023 two-pathway overlay) ships in Phase 2 alongside Espresso, the only method it applies to.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Immersion Solver + Core Engine** - Moroney 2016 ODE + Maille fast mode, French Press method, 7 core outputs, CO2 bloom modifier, grinder DB infrastructure, VAL-01 (completed 2026-03-26)
- [ ] **Phase 2: Percolation Solver** - Moroney 2015 PDE via MOL, V60 + Kalita + Espresso methods, channeling overlay (Lee 2023), VAL-02
- [x] **Phase 3: Pressure Solver** - Moka Pot thermo-fluid ODE + AeroPress hybrid solver, phase-specific validation (completed 2026-03-27)
- [ ] **Phase 4: Extended Outputs + Grinder Presets** - All 6 extended outputs across all methods, 1Zpresso + Baratza Encore presets
- [x] **Phase 5: Integration Tests + FastAPI Backend** - Cross-method fast/accurate tolerance suite, /simulate endpoint, deployment (completed 2026-03-28)
- [ ] **Phase 6: Mobile Core Screens** - Expo/React Native input screens, simulation trigger, TDS/EY/SCA results
- [ ] **Phase 7: Mobile Extended + Run History** - Extended output charts, saved runs, side-by-side comparison

## Phase Details

### Phase 1: Immersion Solver + Core Engine
**Goal**: A developer can run a French Press simulation end-to-end through the engine and receive all 7 core outputs with physically grounded values; CO2 bloom modifier is operational
**Depends on**: Nothing (scaffold already exists)
**Requirements**: SOLV-01, SOLV-02, SOLV-07, SOLV-08, METH-01, OUT-01, OUT-02, OUT-03, OUT-04, OUT-05, OUT-06, OUT-09, GRND-01, GRND-02, GRND-11, VAL-01
**Success Criteria** (what must be TRUE):
  1. `pytest` passes for immersion solver: accurate mode returns EY% within ±1.5% of Liang 2021 reference for standard French Press scenario (15g/250g/93°C/medium/4min)
  2. Fast mode (Maille 2021 biexponential) returns EY% within ±2% of accurate mode and completes in under 1ms (benchmarked)
  3. Grinder lookup for Comandante C40 returns median particle size and full bimodal PSD; manual micron fallback produces generic log-normal PSD
  4. SimulationOutput contains all 7 core fields with non-null, physically plausible values (tds_percent, extraction_yield, extraction_curve, psd_curve, flavor_profile, brew_ratio + recommendation, warnings)
  5. CO2 bloom modifier (Smrke 2018 bi-exponential) applies multiplicative correction to mass-transfer coefficient during bloom window; parameterized by roast level; roast=medium correction verified against expected tau values

Plans:
- [x] 01-01: Immersion solver accurate mode (Moroney 2016 3-ODE) + Liang K=0.717 scaling + bound clipping [0, c_sat]
- [x] 01-02: CO2 bloom modifier (Smrke 2018 bi-exponential) + Maille 2021 fast mode + French Press method config
- [x] 01-03: Grinder DB loader + Comandante C40 preset + generic log-normal fallback + 7-output assembly + VAL-01 pytest suite

### Phase 2: Percolation Solver
**Goal**: The engine simulates V60, Kalita Wave, and Espresso extractions using the Moroney 2015 1D PDE with MOL discretization; Lee 2023 channeling overlay produces a risk score for espresso
**Depends on**: Phase 1 (Liang scaling, bound clipping, grinder DB, output assembly, CO2 modifier pattern)
**Requirements**: SOLV-03, SOLV-04, METH-02, METH-03, METH-04, OUT-08, VAL-02
**Success Criteria** (what must be TRUE):
  1. Percolation accurate mode (MOL + solve_ivp Radau, 20-50 nodes) returns EY% within ±1.5% of Batali 2020 pour-over reference for V60 standard scenario
  2. Percolation fast mode (Maille biexponential with percolation-calibrated lambdas) completes in under 1ms
  3. V60, Kalita Wave, and Espresso each produce measurably distinct TDS/EY profiles from identical dose/water/grind inputs (geometry and flow params drive different results)
  4. Espresso at 9 bar with fine grind produces EY in 18-22% range for standard recipe (18g/36g/25s)
  5. Lee 2023 channeling overlay computes a risk score (0-1) for espresso and appends it to warnings when risk is high; overlay does not run for V60 or Kalita

Plans:
- [x] 02-01: Percolation solver accurate mode (Moroney 2015 1D PDE + Darcy flow + MOL discretization + espresso 9-bar params)
- [x] 02-02: Percolation fast mode + V60/Kalita/Espresso method configs + Lee 2023 channeling overlay + VAL-02 pytest suite

### Phase 3: Pressure Solver
**Goal**: Moka Pot and AeroPress work end-to-end with validated physics; all 6 brew methods produce a complete SimulationOutput
**Depends on**: Phase 2 (shared Darcy/Kozeny-Carman utilities, percolation infrastructure for AeroPress push reference)
**Requirements**: SOLV-05, SOLV-06, METH-05, METH-06
**Success Criteria** (what must be TRUE):
  1. Moka Pot accurate mode (6-ODE thermo-fluid system) produces a heating phase followed by extraction onset; EY% lands in physically plausible range (15-22%); thermal parameters default to 3-cup Bialetti geometry
  2. Moka Pot fast mode (Maille biexponential with moka-calibrated lambdas) completes in under 1ms
  3. AeroPress hybrid solver completes an immersion steep phase then a pressure push phase, returning combined extraction results with higher EY than equivalent steep-only immersion
  4. All 6 brew methods (French Press, V60, Kalita, Espresso, Moka Pot, AeroPress) pass `pytest`: each returns a complete SimulationOutput without errors in both fast and accurate modes

Plans:
- [x] 03-01: Pressure solver accurate mode (Moroney 2016 ODE + thermal coupling 6-ODE system) + Moka Pot method config + fast mode
- [x] 03-02: AeroPress hybrid solver (immersion steep → pressure push) + cross-method smoke tests (all 6 methods, both modes)

### Phase 4: Extended Outputs + Grinder Presets
**Goal**: All 13 simulation outputs (7 core + 6 extended) are populated for every applicable method; 1Zpresso and Baratza Encore presets are functional
**Depends on**: Phase 3 (all 6 solvers complete and passing)
**Requirements**: OUT-07, OUT-10, OUT-11, OUT-12, OUT-13, GRND-05, GRND-10
**Success Criteria** (what must be TRUE):
  1. Extraction uniformity index (0-1) is returned for V60, Kalita, and Espresso (percolation methods); derived from flow variance in the 1D model
  2. Water temperature decay curve T(t) is returned for all methods, parameterized by vessel type (glass V60, steel AeroPress, stovetop moka)
  3. SCA brew chart position (EY%, TDS%) is returned for all methods with correct ideal zone classification (under/ideal/over)
  4. Puck/bed resistance estimate and caffeine concentration estimate are returned for espresso; caffeine estimate uses Taip et al. 2025 empirical function
  5. 1Zpresso and Baratza Encore grinder presets return valid median particle size and bimodal PSD data from grinder lookup

Plans:
- [x] 04-01: Extended outputs — EUI, water temp decay (Newton's Law of Cooling per vessel type), SCA chart position, puck resistance, caffeine (Taip 2025)
- [ ] 04-02: 1Zpresso + Baratza Encore grinder presets + extended output integration tests (all 6 methods return complete 13-field output)

### Phase 5: Integration Tests + FastAPI Backend
**Goal**: Full cross-method validation suite passes and the engine is accessible via a deployed HTTP API
**Depends on**: Phase 4 (all outputs and presets complete)
**Requirements**: VAL-03, VAL-04, API-01, API-02, API-03, API-04, API-05
**Success Criteria** (what must be TRUE):
  1. `pytest` green across all solvers, all methods, equilibrium scaling, grinder lookup, all 13 output fields — zero failures
  2. Fast mode EY% is within ±2% of accurate mode for all 6 methods with standard parameters (results logged in test output)
  3. POST /simulate with valid SimulationInput JSON returns 200 with complete SimulationOutput; invalid input returns 422 with human-readable error messages (not raw Pydantic traces)
  4. API deployed to Koyeb; GET /health returns 200; CORS allows requests from Expo client origin

Plans:
- [x] 05-01: Cross-solver validation suite (fast vs accurate ±2% tolerance for all 6 methods, full pytest coverage)
- [x] 05-02: FastAPI app (/simulate, /health, input validation errors, CORS) + Koyeb deployment

### Phase 6: Mobile Core Screens
**Goal**: A user can select a brew method, enter parameters, run a simulation via the API, and see TDS/EY/SCA chart results on their phone
**Depends on**: Phase 5 (deployed API)
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07, MOB-08
**Success Criteria** (what must be TRUE):
  1. User can select from all 6 brew methods, pick a grinder preset or enter manual micron value, and fill in dose/water/temp/time/roast fields
  2. User can toggle fast vs accurate mode and tap "Simulate" — loading indicator shows while accurate mode computes (<4s)
  3. Results screen displays TDS% and EY% as primary callouts with SCA brew chart showing the result plotted against the ideal zone (Victory Native)
  4. App runs on both iOS simulator and Android emulator via Expo
**UI hint**: yes
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — Expo project scaffold + design tokens + types + root layout + Wave 0 jest infrastructure
- [x] 06-02-PLAN.md — Rotary Selector screen + Brew Dashboard screen + 9 components
- [x] 06-03-PLAN.md — API integration + loading states + results screen (TDS/EY callouts + SCA chart)

### Phase 7: Mobile Extended + Run History
**Goal**: Users can explore all extended outputs and save/compare simulation runs
**Depends on**: Phase 6 (core mobile app functional)
**Requirements**: MOB-09, MOB-10, MOB-11, MOB-12, MOB-13, MOB-14, MOB-15, MOB-16
**Success Criteria** (what must be TRUE):
  1. User can view extraction curve, PSD curve, and flavor axis charts (Victory Native) from any simulation result
  2. User can view all extended outputs (channeling risk, CO2 degassing estimate, water temp decay, EUI, caffeine estimate) in a scrollable detail view
  3. User can save a simulation run with a custom name, view saved runs list, and compare two runs side-by-side (overlaid extraction curves, both SCA chart points, flavor comparison)
  4. App prompts to archive when saved runs exceed 100 (SQLite via expo-sqlite)
**UI hint**: yes
**Plans:** 2 plans

Plans:
- [x] 07-01-PLAN.md — SimulationResultContext + extended types + results.tsx CTAs + Extended Output screen (extraction curve, PSD, flavor bars, detail cards)
- [ ] 07-02-PLAN.md — expo-sqlite hooks (useRunHistory, useRunComparison) + Run History screen + Compare View screen

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Immersion Solver + Core Engine | 3/3 | Complete   | 2026-03-26 |
| 2. Percolation Solver | 0/2 | Not started | - |
| 3. Pressure Solver | 2/2 | Complete   | 2026-03-27 |
| 4. Extended Outputs + Grinder Presets | 1/2 | In Progress | - |
| 5. Integration Tests + FastAPI Backend | 2/2 | Complete   | 2026-03-28 |
| 6. Mobile Core Screens | 0/3 | Not started | - |
| 7. Mobile Extended + Run History | 0/2 | Not started | - |

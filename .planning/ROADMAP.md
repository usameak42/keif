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
- [x] **Phase 7: Mobile Extended + Run History** - Extended output charts, saved runs, side-by-side comparison

**Engine & Feature Expansion** *(new phases — engine parameters and features before JS port)*

- [ ] **Phase 8: 5-Tier Roast Level** - Add medium-light and medium-dark to the roast enum; CO2 content, bean density, moisture, Agtron parameter tables from Physics/v2-research/roast-levels/
- [ ] **Phase 9: Geek Mode UI** - Settings toggle; when enabled, brew dashboard exposes vessel type, water TDS, and bloom override input fields
- [ ] **Phase 10: Vessel Thermal Parameters** - Newton cooling k-values per vessel type added to engine; temperature decay curve updated based on vessel selection (data: Physics/v2-research/vessel-thermal/)
- [ ] **Phase 11: Roast Date & Bean Age Model** - CO2 decay curve (Shimoni & Labuza), resting period recommendations, freshness score output — Fernandez-Rosillo 2025 zero-order polyphenol model (data: Physics/v2-research/roast-date-harvest/)
- [ ] **Phase 12: Processing Type & Origin Parameters** - Processing modifier (washed/natural/honey/anaerobic), altitude → bean density mapping, variety ranking added to engine (data: Physics/v2-research/processing-types/ and region-altitude-variety/)
- [ ] **Phase 13: Tasting Notes & Flavor Engine** - Compound kinetics, EY threshold mapping, flavor → brew parameter recommendation engine (data: Physics/v2-research/tasting-notes-brew/)
- [ ] **Phase 14: Brew Recommendation Page** - User inputs bean details; app recommends brew parameters (grind size, ratio, temp, time) based on engine model
- [ ] **Phase 15: Cross-Brew Recommendations** - "Brew this filter bean as espresso" feature; engine adapts parameters across brew methods for the same bean

**Milestone 2: v2 — Production to Store** *(source: V2_implementation_plan.txt)*

- [ ] **Phase 16: Production APK + Release Pipeline** - EAS build, README, GitHub Releases, CI (V2 M1)
- [ ] **Phase 17: JS Immersion Solver** - Port 3-ODE immersion solver to JS, French Press + AeroPress, parity tests (V2 M2)
- [ ] **Phase 18: JS Pressure + Percolation Solvers** - Port 6-ODE pressure and 20-node MOL percolation to JS (V2 M2)
- [ ] **Phase 19: JS Fast Mode + Grinder DB + Output Assembly** - Full JS engine parity, all 13 outputs (V2 M2)
- [ ] **Phase 20: Offline Mode + Backend Toggle** - Online/offline routing, offline UI indicator (V2 M2)
- [ ] **Phase 21: Freemium Feature Gates** - Free/Premium tier enforcement (V2 M3)
- [ ] **Phase 22: RevenueCat + Premium UI** - Payment integration, unlock screen (V2 M3)
- [ ] **Phase 23: Community Grinder Presets** - 5 new presets, PR workflow, validation script (V2 M4)
- [ ] **Phase 24: Engine Accuracy Improvements** - Re-adsorption fix, pre-infusion, CO2 upgrade, bean density (V2 M5)
- [ ] **Phase 25: Independent Validation Suite** - Batali 2020, Liang multi-grind RMSE validation (V2 M5)
- [ ] **Phase 26: Bluetooth Scale + Thermometer** - BLE hardware integration, real-time simulation feed (V2 M6)
- [ ] **Phase 27: Refractometer Calibration Flow** - User TDS calibration per grinder (V2 M6)
- [ ] **Phase 28: Store Release** - App Store + Play Store submission (V2 M7)

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
- [x] 07-02-PLAN.md — expo-sqlite hooks (useRunHistory, useRunComparison) + Run History screen + Compare View screen

### Phase 8: 5-Tier Roast Level
**Goal**: Engine supports 5 roast levels (light, medium-light, medium, medium-dark, dark); all parameter tables updated with research-backed values per tier
**Depends on**: Phase 5 (Python engine stable), Phase 7 (mobile app for UI update)
**Research data**: Physics/v2-research/roast-levels/
**Plans:** 2 plans
**Success Criteria** (what must be TRUE):
  1. RoastLevel enum extended to 5 values: light, medium_light, medium, medium_dark, dark
  2. CO2 content at t=0, bean density, moisture content, and Agtron number tables populated for all 5 tiers (from research data)
  3. All existing solvers accept the new roast levels without errors; CO2 bloom modifier and mass-transfer coefficient use tier-specific parameters
  4. Mobile brew dashboard roast selector shows all 5 options
  5. `pytest` green: all 6 methods × 5 roast levels produce physically plausible SimulationOutput

Plans:
- [ ] 08-01-PLAN.md — 5-tier RoastLevel enum + CO2 bloom recalibration (Smrke 2018) + roast-dependent density + Agtron output + 6x5 test matrix
- [ ] 08-02-PLAN.md — RoastPillSelector component + AsyncStorage persistence + dashboard wiring

### Phase 9: Geek Mode UI
**Goal**: Advanced users can access additional input fields via a Geek Mode toggle in settings
**Depends on**: Phase 7 (mobile app complete)
**Success Criteria** (what must be TRUE):
  1. Settings screen has a "Geek Mode" toggle (off by default); state persists across sessions
  2. When Geek Mode is on, brew dashboard shows: vessel type selector, water TDS input (ppm), and bloom duration override field
  3. When Geek Mode is off, these fields are hidden and engine uses default values
  4. Vessel type and water TDS inputs pass through to SimulationInput and are accepted by the API
  5. No UI regression in standard (non-geek) mode

Plans:
- [ ] TBD (run /gsd:plan-phase 9 to break down)

### Phase 10: Vessel Thermal Parameters
**Goal**: Engine uses measured Newton cooling k-values per vessel type; temperature decay curve reflects actual vessel physics
**Depends on**: Phase 4 (temperature decay curve infrastructure), Phase 9 (vessel type selector in UI)
**Research data**: Physics/v2-research/vessel-thermal/
**Success Criteria** (what must be TRUE):
  1. Newton cooling k-values defined for all supported vessel types (ceramic V60, glass V60, stainless AeroPress, stovetop Moka Pot, glass French Press, etc.)
  2. Temperature decay curve T(t) in SimulationOutput uses vessel-specific k-value when vessel type is provided
  3. Default vessel assigned per brew method when not specified
  4. `pytest`: temperature at end of brew time is physically plausible for each vessel type (not identical across vessel types)
  5. Mobile results screen shows temperature decay curve label reflecting vessel type

Plans:
- [ ] TBD (run /gsd:plan-phase 10 to break down)

### Phase 11: Roast Date & Bean Age Model
**Goal**: Engine models CO2 decay over days-since-roast and outputs a freshness score; resting period recommendations shown per brew method
**Depends on**: Phase 8 (5-tier roast level, roast-specific CO2 at t=0), Phase 9 (Geek Mode for roast date input field)
**Research data**: Physics/v2-research/roast-date-harvest/ (Shimoni & Labuza 2000, Fernandez-Rosillo 2025)
**Success Criteria** (what must be TRUE):
  1. SimulationInput accepts optional `days_since_roast` integer field
  2. CO2 content at brew time computed from Shimoni & Labuza exponential decay: C(t) = C0 · e^(−D_eff·t) with roast-level-specific C0 and D_eff values
  3. Freshness score (0–100) computed from Fernandez-Rosillo 2025 zero-order polyphenol model; included in SimulationOutput
  4. Resting period recommendation (e.g. "Too fresh — rest 3 more days for espresso") included in warnings when days_since_roast is below method-specific threshold
  5. Mobile results screen shows freshness indicator when days_since_roast is provided

Plans:
- [ ] TBD (run /gsd:plan-phase 11 to break down)

### Phase 12: Processing Type & Origin Parameters
**Goal**: Engine accepts processing type and origin data; applies research-backed modifiers to bean density and extraction dynamics
**Depends on**: Phase 8 (roast level infrastructure as pattern for new input parameters)
**Research data**: Physics/v2-research/processing-types/, Physics/v2-research/region-altitude-variety/
**Success Criteria** (what must be TRUE):
  1. SimulationInput accepts `processing_type` enum (washed, natural, honey_yellow, honey_red, honey_black, anaerobic, carbonic_maceration, wet_hulled) and optional `altitude_m` integer
  2. Processing type applies modifiers to intrinsic bean density and solubility parameters; anaerobic/CM apply finer grind and lower temp recommendations
  3. Altitude → bean density lookup table applied when altitude_m is provided
  4. Processing type and altitude modifiers documented in SimulationOutput.warnings when they meaningfully change results
  5. `pytest`: washed vs anaerobic produce different recommended parameters for identical other inputs

Plans:
- [ ] TBD (run /gsd:plan-phase 12 to break down)

### Phase 13: Tasting Notes & Flavor Engine
**Goal**: Engine maps EY% and TDS% to predicted flavor descriptors; outputs a structured tasting note prediction with confidence levels
**Depends on**: Phase 12 (full bean parameter set feeding flavor prediction)
**Research data**: Physics/v2-research/tasting-notes-brew/
**Success Criteria** (what must be TRUE):
  1. Flavor prediction model maps EY% thresholds to under-extracted / balanced / over-extracted zones with associated flavor descriptors (sour, bright, sweet, balanced, bitter, astringent)
  2. Compound kinetics (chlorogenic acid, sucrose, Maillard products) modeled as sequential extraction windows based on EY%
  3. SimulationOutput.flavor_profile extended with descriptor labels and EY% zone classification
  4. Mobile results screen shows predicted tasting notes alongside flavor axis chart
  5. `pytest`: standard balanced extraction (18–22% EY) produces "sweet/balanced" descriptors; under-extraction (<16%) produces "sour" descriptors

Plans:
- [ ] TBD (run /gsd:plan-phase 13 to break down)

### Phase 14: Brew Recommendation Page
**Goal**: Users can describe their bean and get recommended brew parameters from the engine
**Depends on**: Phase 13 (flavor engine complete), Phase 12 (processing/origin parameters)
**Success Criteria** (what must be TRUE):
  1. New "Brew Setup" screen: user inputs roast level, processing type, and optionally altitude and days-since-roast
  2. Engine computes recommended grind size, dose, water temp, brew time, and brew ratio for each available method
  3. Recommendations displayed as a list; user can tap a method to pre-fill the brew dashboard with recommended parameters
  4. Recommendations adapt to available grinder presets
  5. "Why this recommendation?" explanation shown for at least 2 key parameters

Plans:
- [ ] TBD (run /gsd:plan-phase 14 to break down)

### Phase 15: Cross-Brew Recommendations
**Goal**: Engine adapts brew parameters across methods for the same bean; "try this bean as espresso" feature
**Depends on**: Phase 14 (brew recommendation infrastructure)
**Success Criteria** (what must be TRUE):
  1. From any saved run, user can tap "Try as [other method]" to get cross-method adapted parameters
  2. Engine translates parameters (grind size, ratio, temp) across methods with physically grounded adjustments
  3. Cross-brew suggestion shows predicted EY% delta vs original method
  4. At minimum: filter → espresso and espresso → filter adaptations work for all compatible method pairs
  5. Cross-brew result can be run as a simulation directly from the suggestion screen

Plans:
- [ ] TBD (run /gsd:plan-phase 15 to break down)

---

## Milestone 2: v2 — Production to Store

*Source: V2_implementation_plan.txt (defined 2026-04-05)*

Phases 16–28 take the working v1 app through production release, offline engine, freemium monetization, community grinder presets, physics improvements, hardware integration, and store submission.

- [ ] **Phase 16: Production APK + Release Pipeline** — EAS/local production build, README overhaul, GitHub Releases upload, final bug-fix pass, CI APK automation on release tag (V2 M1)
- [ ] **Phase 17: JS Immersion Solver** — Port 3-ODE immersion solver (RK45) to JS; French Press + AeroPress-steep; Python vs JS result comparison test suite (V2 M2)
- [ ] **Phase 18: JS Pressure + Percolation Solvers** — Port 6-ODE pressure solver (Moka Pot) and 20-node MOL percolation solver (V60, Kalita, Espresso) to JS (V2 M2)
- [ ] **Phase 19: JS Fast Mode + Grinder DB + Output Assembly** — Port biexponential fast mode, grinder database, output assembly, and flavor profile to JS; parity tests vs Python (V2 M2)
- [ ] **Phase 20: Offline Mode + Backend Toggle** — Make backend optional (online → backend, offline → on-device JS solver); offline mode UI indicator (V2 M2)
- [ ] **Phase 21: Freemium Feature Gates** — Free vs Premium gate system; free tier (fast mode, French Press + V60, 1 grinder, 5 saved runs); premium tier (all methods, accurate mode, all grinders, unlimited history, compare) (V2 M3)
- [ ] **Phase 22: RevenueCat + Premium UI** — RevenueCat payment integration; premium unlock screen UI (V2 M3)
- [ ] **Phase 23: Community Grinder Presets** — Timemore C2/C3, Niche Zero, DF64, Eureka Mignon, Fellow Ode presets; GitHub PR workflow; preset validation script (V2 M4)
- [ ] **Phase 24: Engine Accuracy Improvements** — Re-adsorption term fix (BREWOS-TODO-001); espresso pre-infusion pressure ramp; CO2 model upgrade (3-component); bean density input (V2 M5)
- [ ] **Phase 25: Independent Validation Suite** — Batali 2020 time-series validation; Liang multi-grind validation; RMSE reporting (V2 M5)
- [ ] **Phase 26: Bluetooth Scale + Thermometer** — Bluetooth scale integration (live weight → real-time simulation feed); Bluetooth thermometer (real temp → replaces temp decay model) (V2 M6)
- [ ] **Phase 27: Refractometer Calibration Flow** — "Calibrate with your own TDS measurement" UI flow; calibration stored per-grinder (V2 M6)
- [ ] **Phase 28: Store Release** — App Store + Play Store submission; store listings, screenshots, description; privacy policy + terms of service (V2 M7)

---

### Phase 16: Production APK + Release Pipeline
**Goal**: A production APK is available for download via GitHub Releases; README documents the project; CI builds the APK on release tag
**Depends on**: Phase 15 (all engine & feature expansion phases complete)
**Success Criteria**:
  1. Production APK builds successfully via EAS or local Gradle build with no debug flags
  2. README covers project description, architecture, setup, and screenshots
  3. APK is attached to a GitHub Release with version tag
  4. Final bug-fix pass clears known issues in charts, SQLite, and navigation
  5. CI workflow triggers APK build on push to release tag

Plans:
- [ ] TBD (run /gsd:plan-phase 16 to break down)

### Phase 17: JS Immersion Solver
**Goal**: Immersion extraction (French Press, AeroPress-steep) runs fully on-device in JS with results matching the Python engine within ±2%
**Depends on**: Phase 5 (Python engine stable), Phase 7 (mobile app)
**Success Criteria**:
  1. JS 3-ODE immersion solver (Moroney 2016, RK45) produces EY% within ±2% of Python accurate mode for standard French Press scenario
  2. Python vs JS comparison test suite passes for immersion methods
  3. No backend call required for immersion simulation in offline mode

Plans:
- [ ] TBD (run /gsd:plan-phase 17 to break down)

### Phase 18: JS Pressure + Percolation Solvers
**Goal**: All remaining brew methods (Moka Pot, V60, Kalita, Espresso) run on-device in JS
**Depends on**: Phase 17 (JS solver infrastructure established)
**Success Criteria**:
  1. JS 6-ODE pressure solver (Moka Pot) matches Python within ±2%
  2. JS 20-node MOL percolation solver (V60, Kalita, Espresso) matches Python within ±2%
  3. All 6 methods produce complete SimulationOutput from JS engine

Plans:
- [ ] TBD (run /gsd:plan-phase 18 to break down)

### Phase 19: JS Fast Mode + Grinder DB + Output Assembly
**Goal**: Full JS engine parity — fast mode, grinder lookup, output assembly, and flavor profile all work in JS
**Depends on**: Phase 18
**Success Criteria**:
  1. JS biexponential fast mode returns EY% within ±2% of JS accurate mode for all 6 methods
  2. JS grinder database returns correct median particle size and PSD for all presets
  3. JS output assembly produces a complete SimulationOutput with all 13 fields
  4. Cross-engine parity test suite (JS vs Python) passes for all methods, both modes

Plans:
- [ ] TBD (run /gsd:plan-phase 19 to break down)

### Phase 20: Offline Mode + Backend Toggle
**Goal**: App detects network availability and automatically routes to JS engine offline; UI indicates offline mode
**Depends on**: Phase 19 (complete JS engine)
**Success Criteria**:
  1. Online: API backend used by default (accurate mode available)
  2. Offline: JS engine used automatically; fast mode and accurate mode both available on-device
  3. Offline mode indicator visible in UI
  4. Transition between modes is seamless with no crash or stale state

Plans:
- [ ] TBD (run /gsd:plan-phase 20 to break down)

### Phase 21: Freemium Feature Gates
**Goal**: Free and Premium tiers are enforced in the app; free users are gated to the defined free feature set
**Depends on**: Phase 20 (offline engine complete — gates apply to on-device features too)
**Success Criteria**:
  1. Free tier: fast mode only, French Press + V60, 1 grinder preset, max 5 saved runs
  2. Premium tier: all methods, accurate mode, all grinders, unlimited history, compare view
  3. Gate enforcement is consistent — no premium features accessible without unlock
  4. Gated UI elements show upgrade prompt, not blank/error state

Plans:
- [ ] TBD (run /gsd:plan-phase 21 to break down)

### Phase 22: RevenueCat + Premium UI
**Goal**: Users can purchase Premium through RevenueCat; unlock screen is polished and conversion-optimized
**Depends on**: Phase 21 (feature gates in place)
**Success Criteria**:
  1. RevenueCat SDK integrated; subscription products configured for iOS and Android
  2. Premium unlock screen lists features with clear value proposition
  3. Purchase flow completes end-to-end in sandbox environment
  4. Restore purchases works for returning users

Plans:
- [ ] TBD (run /gsd:plan-phase 22 to break down)

### Phase 23: Community Grinder Presets
**Goal**: 5 new grinder presets ship; community can contribute via PR; presets are validated before merge
**Depends on**: Phase 4 (grinder preset infrastructure)
**Success Criteria**:
  1. Timemore C2/C3, Niche Zero, DF64, Eureka Mignon, and Fellow Ode presets return valid PSD data
  2. GitHub PR workflow documented in CONTRIBUTING.md
  3. Preset validation script checks PSD shape and grind range; rejects malformed presets
  4. All 5 new presets pass validation script

Plans:
- [ ] TBD (run /gsd:plan-phase 23 to break down)

### Phase 24: Engine Accuracy Improvements
**Goal**: Known physics deficiencies fixed; espresso pre-infusion modeled; CO2 model upgraded to 3-component
**Depends on**: Phase 5 (stable Python engine)
**Success Criteria**:
  1. Re-adsorption term (BREWOS-TODO-001) implemented; EY% does not exceed c_sat ceiling under any standard scenario
  2. Espresso pre-infusion pressure ramp (0→9 bar over configurable time) produces lower initial EY rate vs instant-pressure baseline
  3. CO2 model upgraded from v1 simplified version to 3-component bi-exponential; roast level drives separate fast/slow/residual CO2 fractions
  4. Bean density accepted as optional input; affects PSD scaling when provided

Plans:
- [ ] TBD (run /gsd:plan-phase 24 to break down)

### Phase 25: Independent Validation Suite
**Goal**: Engine accuracy verified against published experimental data sets
**Depends on**: Phase 24 (engine improvements complete)
**Success Criteria**:
  1. Batali 2020 pour-over time-series: model EY% curve matches published data within ±1.5% RMSE across full brew duration
  2. Liang 2021 multi-grind: EY% predictions for at least 3 grind settings match published values within ±1.5%
  3. Validation report generated as pytest output with per-scenario RMSE values

Plans:
- [ ] TBD (run /gsd:plan-phase 25 to break down)

### Phase 26: Bluetooth Scale + Thermometer
**Goal**: App reads live weight from a Bluetooth scale and live temperature from a Bluetooth thermometer during brewing
**Depends on**: Phase 20 (offline engine, real-time simulation feed makes sense)
**Success Criteria**:
  1. Bluetooth scale detected and paired; live weight stream feeds into simulation in real time
  2. Bluetooth thermometer detected and paired; live temp replaces temperature decay model
  3. BLE device list screen shows available devices; connection state is visible
  4. Simulation updates reactively as weight/temp change during brew

Plans:
- [ ] TBD (run /gsd:plan-phase 26 to break down)

### Phase 27: Refractometer Calibration Flow
**Goal**: Users can calibrate the engine against their own TDS refractometer readings
**Depends on**: Phase 26 or Phase 20 (needs working simulation output to calibrate against)
**Success Criteria**:
  1. Calibration flow prompts user to brew a reference cup and enter measured TDS%
  2. Scale factor computed and stored per-grinder in local DB
  3. Subsequent simulations with that grinder use the calibration offset
  4. Calibration can be reset to default

Plans:
- [ ] TBD (run /gsd:plan-phase 27 to break down)

### Phase 28: Store Release
**Goal**: App submitted to and approved by App Store and Play Store
**Depends on**: Phase 22 (monetization working), Phase 25 (physics validated), Phase 27 (full feature set)
**Success Criteria**:
  1. App Store submission approved; app live on iOS App Store
  2. Play Store submission approved; app live on Google Play
  3. Store listings include screenshots, description, and metadata
  4. Privacy policy and terms of service published at accessible URLs

Plans:
- [ ] TBD (run /gsd:plan-phase 28 to break down)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → … → 15 (Engine & Feature Expansion), then 16 → 28 (Milestone 2)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Immersion Solver + Core Engine | 3/3 | Complete | 2026-03-26 |
| 2. Percolation Solver | 0/2 | Not started | - |
| 3. Pressure Solver | 2/2 | Complete | 2026-03-27 |
| 4. Extended Outputs + Grinder Presets | 1/2 | In Progress | - |
| 5. Integration Tests + FastAPI Backend | 2/2 | Complete | 2026-03-28 |
| 6. Mobile Core Screens | 3/3 | Complete | - |
| 7. Mobile Extended + Run History | 2/2 | Complete | - |
| **— Engine & Feature Expansion —** | | | |
| 8. 5-Tier Roast Level | 0/? | Not started | - |
| 9. Geek Mode UI | 0/? | Not started | - |
| 10. Vessel Thermal Parameters | 0/? | Not started | - |
| 11. Roast Date & Bean Age Model | 0/? | Not started | - |
| 12. Processing Type & Origin Parameters | 0/? | Not started | - |
| 13. Tasting Notes & Flavor Engine | 0/? | Not started | - |
| 14. Brew Recommendation Page | 0/? | Not started | - |
| 15. Cross-Brew Recommendations | 0/? | Not started | - |
| **— Milestone 2 —** | | | |
| 16. Production APK + Release Pipeline | 0/? | Not started | - |
| 17. JS Immersion Solver | 0/? | Not started | - |
| 18. JS Pressure + Percolation Solvers | 0/? | Not started | - |
| 19. JS Fast Mode + Grinder DB + Output Assembly | 0/? | Not started | - |
| 20. Offline Mode + Backend Toggle | 0/? | Not started | - |
| 21. Freemium Feature Gates | 0/? | Not started | - |
| 22. RevenueCat + Premium UI | 0/? | Not started | - |
| 23. Community Grinder Presets | 0/? | Not started | - |
| 24. Engine Accuracy Improvements | 0/? | Not started | - |
| 25. Independent Validation Suite | 0/? | Not started | - |
| 26. Bluetooth Scale + Thermometer | 0/? | Not started | - |
| 27. Refractometer Calibration Flow | 0/? | Not started | - |
| 28. Store Release | 0/? | Not started | - |

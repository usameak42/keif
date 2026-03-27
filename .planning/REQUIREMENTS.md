# Requirements: Keif (BrewOS)

**Defined:** 2026-03-26
**Core Value:** Physically accurate, real-time coffee extraction simulation — predict TDS% and EY% from grinder settings, dose, and water parameters before brewing, across all 6 major brew methods.

## v1 Requirements

### Engine — Solvers

- [x] **SOLV-01**: Immersion solver (Moroney 2016 3-ODE system) integrated with SimulationInput/Output contract — accurate mode
- [x] **SOLV-02**: Immersion solver fast mode: Maille 2021 biexponential kinetics (< 1ms), Liang 2021 equilibrium anchor
- [x] **SOLV-03**: Percolation solver (Moroney 2015 1D Darcy PDE + double-porosity, Method of Lines) — accurate mode for V60, Kalita, Espresso
- [ ] **SOLV-04**: Percolation solver fast mode: Maille 2021 biexponential kinetics with percolation-specific lambda calibration
- [ ] **SOLV-05**: Pressure solver (Moroney 2016 ODE + thermal coupling, 6 ODEs) — accurate mode for Moka Pot
- [ ] **SOLV-06**: Pressure solver fast mode: Maille 2021 biexponential with moka-specific lambda calibration
- [x] **SOLV-07**: Liang 2021 equilibrium scaling (K=0.717) applied post-solve in all accurate-mode solvers
- [x] **SOLV-08**: All solvers clip state variables to physical bounds [0, c_sat] to prevent NaN propagation

### Engine — Methods

- [x] **METH-01**: French Press method: configures immersion solver with filter geometry, standard steep parameters
- [ ] **METH-02**: V60 method: configures percolation solver with cone geometry, bloom timing, flow rate
- [ ] **METH-03**: Kalita Wave method: configures percolation solver with flat-bed geometry, 3-hole restricted flow
- [ ] **METH-04**: Espresso method: configures percolation solver with 9-bar params, fine grind, thin-bed MOL discretization
- [ ] **METH-05**: Moka Pot method: configures pressure solver with steam pressure, stovetop geometry, default thermal params for common pot sizes
- [ ] **METH-06**: AeroPress method: standalone hybrid solver — immersion steep phase followed by pressure push phase

### Engine — Outputs

- [x] **OUT-01**: Simulation returns TDS% and EY% for final brew state
- [x] **OUT-02**: Simulation returns time-resolved extraction curve: [{t: seconds, ey: percent}, ...]
- [x] **OUT-03**: Simulation returns particle size distribution curve from grinder preset or generic log-normal
- [x] **OUT-04**: Simulation returns flavor profile estimate {sour, sweet, bitter} normalized 0–1 (SCA extraction order: acids first, sugars, bitters)
- [x] **OUT-05**: Simulation returns brew ratio used and recommendation if outside optimal range
- [x] **OUT-06**: Simulation returns warnings list (over-extraction, channeling risk, out-of-range ratio)
- [ ] **OUT-07**: Simulation returns extraction uniformity index (0–1) derived from flow variance in 1D model (Moroney PLOS One 2019)
- [ ] **OUT-08**: Simulation returns channeling risk score for espresso (Lee 2023 two-pathway model — post-processing overlay)
- [x] **OUT-09**: Simulation returns CO2 degassing estimate during bloom phase: bi-exponential decay (Smrke 2018) applied as multiplicative modifier on mass-transfer coefficient during bloom window; parameterized by roast level (light/medium/dark) and bean age; zero structural changes to Moroney ODE
- [ ] **OUT-10**: Simulation returns water temperature decay curve T(t) using Newton's Law of Cooling parameterized by vessel type
- [ ] **OUT-11**: Simulation returns SCA brew chart position — (EY%, TDS%) plotted against SCA ideal zone
- [ ] **OUT-12**: Simulation returns puck/bed resistance estimate for espresso (pressure drop, shot time prediction)
- [ ] **OUT-13**: Simulation returns caffeine concentration estimate (mg/mL) using empirical transfer function vs temperature and EY% (Taip et al. 2025)

### Engine — Grinder Database

- [x] **GRND-01**: Grinder database loader: looks up median particle size AND full PSD from grinder JSON given grinder_name + grinder_setting
- [x] **GRND-02**: Comandante C40 MK4 grinder preset complete (setting-to-micron mapping, bimodal PSD params, source documented)
- [ ] **GRND-05**: 1Zpresso (at least one model) preset complete
- [ ] **GRND-10**: Baratza Encore preset complete
- [x] **GRND-11**: Generic log-normal PSD fallback when only grind_size (μm) is provided manually

### Engine — Validation

- [x] **VAL-01**: Accurate-mode immersion solver reproduces Liang 2021 / Melrose 2021 EY% within ±1.5% RMSE for standard test scenario (15g/250g/93°C/medium roast)
- [x] **VAL-02**: Accurate-mode percolation solver validated against Batali 2020 pour-over dataset (EY% within ±1.5% RMSE)
- [ ] **VAL-03**: Fast mode outputs within ±2% EY of accurate mode for standard parameters (documented tolerance)
- [ ] **VAL-04**: pytest suite green: all solvers, all methods, equilibrium scaling, grinder lookup

### Backend — API

- [ ] **API-01**: FastAPI app with POST /simulate endpoint accepting SimulationInput JSON, returning SimulationOutput JSON
- [ ] **API-02**: Input validation errors return 422 with human-readable messages (not raw Pydantic stack traces)
- [ ] **API-03**: CORS configured for React Native / Expo client
- [ ] **API-04**: GET /health endpoint for keep-alive ping from mobile app on launch (mitigates cold start on free-tier hosting)
- [ ] **API-05**: API deployable to Railway or Fly.io with documented deployment steps

### Mobile — Core Screens

- [ ] **MOB-01**: User can select brew method from 6 options (French Press, V60, Kalita, Espresso, Moka Pot, AeroPress)
- [ ] **MOB-02**: User can select grinder from preset database OR enter grind size manually in μm
- [ ] **MOB-03**: User can enter brew parameters: coffee dose (g), water amount (g), water temperature (°C), brew time (s)
- [ ] **MOB-04**: User can select roast level (light / medium / dark)
- [ ] **MOB-05**: User can toggle fast mode vs accurate mode before running simulation
- [ ] **MOB-06**: User can run simulation and see loading state while accurate mode computes
- [ ] **MOB-07**: User can see TDS% and EY% as primary result callouts
- [ ] **MOB-08**: User can see SCA brew chart with their result plotted against ideal zone (Victory Native)

### Mobile — Extended Output Screens

- [ ] **MOB-09**: User can see time-resolved extraction curve chart (EY vs time, Victory Native)
- [ ] **MOB-10**: User can see particle size distribution curve chart (Victory Native)
- [ ] **MOB-11**: User can see flavor axis bar chart (sour / sweet / bitter, Victory Native)
- [ ] **MOB-12**: User can see all extended outputs: channeling risk score, CO2 degassing estimate, water temp decay, extraction uniformity index, caffeine estimate

### Mobile — Run History

- [ ] **MOB-13**: User can save a simulation run with a custom name
- [ ] **MOB-14**: User can view list of saved runs
- [ ] **MOB-15**: User can compare two saved runs side-by-side (TDS%, EY%, extraction curves overlaid, SCA chart with both points, flavor axis comparison)
- [ ] **MOB-16**: User is prompted to archive when saved runs exceed 100 (local SQLite via expo-sqlite)

## v2 Requirements

### Grinder Database (v1.1)

- **GRND-03**: Mavo Grinder preset — deferred; PSD data not yet compiled
- **GRND-04**: Timemore C2/C3 preset — deferred; PSD data not yet compiled
- **GRND-06**: Niche Zero preset — deferred; PSD data not yet compiled
- **GRND-07**: DF64 preset — deferred; PSD data not yet compiled
- **GRND-08**: Eureka Mignon (at least one model) preset — deferred; PSD data not yet compiled
- **GRND-09**: Fellow Ode preset — deferred; PSD data not yet compiled

### Hardware

- **HW-01**: Bluetooth scale input feeds live weight data into simulation in real time
- **HW-02**: Thermometer real-time temperature feed replaces estimated temp decay model
- **HW-03**: Raspberry Pi integration as bridge device

### Validation & Calibration

- **CAL-01**: "Calibrate with your refractometer" flow — user inputs real TDS measurements to tune diffusion coefficient to their setup
- **CAL-02**: Community-submitted TDS validation data (crowdsourced per grinder preset)

### Engine Improvements

- **ENG-01**: Re-adsorption term `−k_re × c_h` in Moroney ODE (BREWOS-TODO-001 proper fix, replacing linear scaling)
- **ENG-02**: Bean density (g/L) as simulation input — requires personal refractometer data to parameterize
- **ENG-03**: Pre-infusion pressure ramp modeling for espresso (pressure builds to 9 bar over ~5s)
- **ENG-04**: Time-series validation against experimental TDS-vs-time trajectory (not just equilibrium endpoint)

### Grinder Database

- **GRND-EXT-01**: Kinu M47 preset
- **GRND-EXT-02**: Community-contributed grinder presets via GitHub PR workflow
- **GRND-EXT-03**: Grind size correction per bean origin (Arabica vs Robusta density differences)

## Out of Scope

| Feature | Reason |
|---------|--------|
| CFD (Computational Fluid Dynamics) | 1D models sufficient and validated for v1; massive complexity increase |
| Cold brew / decoction methods | Insufficient research; different physics regime |
| On-device PDE solving (no backend) | SciPy PDE latency ~4s unacceptable offline; backend required |
| Cloud sync for run history | SQLite local-only in v1; privacy-first approach |
| Roaster-facing / B2B features | Out of target market for v1 |
| Grudeva 2025 multiscale espresso model | Lacks validated parameters; anomalous values in paper |
| Bean density as v1 input | Insufficient public data; requires personal refractometer |
| 2FA / OAuth / social login | No user accounts in v1 — app is fully local |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SOLV-01 | Phase 1 | Complete |
| SOLV-02 | Phase 1 | Complete |
| SOLV-07 | Phase 1 | Complete |
| SOLV-08 | Phase 1 | Complete |
| METH-01 | Phase 1 | Complete |
| OUT-01 | Phase 1 | Complete |
| OUT-02 | Phase 1 | Complete |
| OUT-03 | Phase 1 | Complete |
| OUT-04 | Phase 1 | Complete |
| OUT-05 | Phase 1 | Complete |
| OUT-06 | Phase 1 | Complete |
| OUT-09 | Phase 1 | Complete |
| GRND-01 | Phase 1 | Complete |
| GRND-02 | Phase 1 | Complete |
| GRND-11 | Phase 1 | Complete |
| VAL-01 | Phase 1 | Complete |
| SOLV-03 | Phase 2 | Complete |
| SOLV-04 | Phase 2 | Pending |
| METH-02 | Phase 2 | Pending |
| METH-03 | Phase 2 | Pending |
| METH-04 | Phase 2 | Pending |
| OUT-08 | Phase 2 | Pending |
| VAL-02 | Phase 2 | Complete |
| SOLV-05 | Phase 3 | Pending |
| SOLV-06 | Phase 3 | Pending |
| METH-05 | Phase 3 | Pending |
| METH-06 | Phase 3 | Pending |
| OUT-07 | Phase 4 | Pending |
| OUT-10 | Phase 4 | Pending |
| OUT-11 | Phase 4 | Pending |
| OUT-12 | Phase 4 | Pending |
| OUT-13 | Phase 4 | Pending |
| GRND-05 | Phase 4 | Pending |
| GRND-10 | Phase 4 | Pending |
| VAL-03 | Phase 5 | Pending |
| VAL-04 | Phase 5 | Pending |
| API-01 | Phase 5 | Pending |
| API-02 | Phase 5 | Pending |
| API-03 | Phase 5 | Pending |
| API-04 | Phase 5 | Pending |
| API-05 | Phase 5 | Pending |
| MOB-01 | Phase 6 | Pending |
| MOB-02 | Phase 6 | Pending |
| MOB-03 | Phase 6 | Pending |
| MOB-04 | Phase 6 | Pending |
| MOB-05 | Phase 6 | Pending |
| MOB-06 | Phase 6 | Pending |
| MOB-07 | Phase 6 | Pending |
| MOB-08 | Phase 6 | Pending |
| MOB-09 | Phase 7 | Pending |
| MOB-10 | Phase 7 | Pending |
| MOB-11 | Phase 7 | Pending |
| MOB-12 | Phase 7 | Pending |
| MOB-13 | Phase 7 | Pending |
| MOB-14 | Phase 7 | Pending |
| MOB-15 | Phase 7 | Pending |
| MOB-16 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

**By phase:**
- Phase 1 (Immersion Solver + Core Engine): 16 requirements
- Phase 2 (Percolation Solver): 7 requirements
- Phase 3 (Pressure Solver): 4 requirements
- Phase 4 (Extended Outputs + Grinder Presets): 7 requirements
- Phase 5 (Integration Tests + FastAPI Backend): 7 requirements
- Phase 6 (Mobile Core Screens): 8 requirements
- Phase 7 (Mobile Extended + Run History): 8 requirements

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after roadmap restructure (7 phases, validation per-phase)*

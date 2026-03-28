# Keif (BrewOS)

## What This Is

Keif is a physics-based coffee extraction simulation engine delivered as a cross-platform mobile app (iOS + Android via Expo/React Native). It uses peer-reviewed extraction models (Moroney, Maille, Liang) to let technically-minded home baristas predict brew outcomes — TDS%, extraction yield, flavor profile — before touching a kettle. It is not a recipe app; it is a numerical simulation tool.

## Core Value

**Physically accurate, real-time coffee extraction simulation** — predict TDS% and EY% from grinder settings, dose, and water parameters before brewing, across all 6 major brew methods.

## Requirements

### Validated

- ✓ Moroney 2016 immersion ODE implemented and internally consistent — Phase 8 PoC
- ✓ Liang 2021 equilibrium scaling (K=0.717) anchors EY endpoint correctly — Phase 8 PoC
- ✓ Pydantic SimulationInput/Output schema defined and validated — Phase 10 scaffold
- ✓ Repo scaffold: solvers/, methods/, models/, grinders/, tests/ structure — Phase 10

### Active

**Engine (M1 + M2)**
- [x] Immersion solver (Moroney 2016 ODE) fully integrated into engine with SimulationInput/Output contract — Validated in Phase 01: immersion-solver-core-engine
- [x] Fast mode: Maille 2021 biexponential kinetics (< 1ms) for immersion — Validated in Phase 01 (0.267ms median, calibrated via curve_fit)
- [x] Accurate mode: ODE/PDE via scipy.solve_ivp for immersion — Validated in Phase 01 (Radau, EY=21.51% ±0%)
- [x] All 7 simulation outputs: TDS%, EY%, extraction curve, PSD curve, flavor profile, brew ratio rec, warnings — Validated in Phase 01 (French Press end-to-end)
- [x] Percolation solver (Moroney 2015 1D Darcy PDE) implemented for V60, Kalita Wave, and Espresso — Validated in Phase 02 (EY=20.0% Batali 2020, fast mode 0.185ms, Lee 2023 channeling overlay)
- [x] Pressure solver implemented for Moka Pot — Validated in Phase 03 (Clausius-Clapeyron steam + Moroney extraction, 6-ODE Radau, EY=18% accurate mode, fast mode <1ms)
- [x] AeroPress standalone hybrid solver (immersion steep → pressure push) — Validated in Phase 03 (hybrid EY exceeds steep-only by ≥1%, all 6 methods × 2 modes pass 98 tests)
- [x] Fast mode: Maille 2021 biexponential kinetics (< 1ms) for all remaining methods — Validated in Phase 03
- [x] Extended outputs: temperature decay curve, SCA chart position, extraction uniformity index (EUI), puck resistance (espresso), caffeine estimate — Validated in Phase 04 (all 6 methods × 2 modes, 164 tests)
- [x] Grinder presets: Comandante C40 MK4, 1Zpresso J-Max (90-click, 8.8μm/click), Baratza Encore (40-setting, 23μm/step) — Validated in Phase 04 (bimodal PSD, range enforcement)

**Backend (M2)**
- [ ] FastAPI wrapping engine with /simulate endpoint
- [ ] Input validation, error handling, CORS for mobile
- [ ] Deployable to Koyeb

**Mobile App (M4–M5)**
- [x] Expo/React Native input screens (brew method, grinder, dose, water, roast) — Validated in Phase 06: mobile-core-screens
- [x] Simulation trigger → FastAPI → results display — Validated in Phase 06 (useSimulation POST /simulate, useHealthCheck GET /health)
- [x] Core outputs: TDS%, EY%, SCA brew chart (Victory Native) — Validated in Phase 06 (CartesianChart + SkiaRect zone overlay)
- [ ] Extended output screens: extraction curve, flavor axis, PSD curve
- [ ] Run history: save/name/compare simulations (SQLite via expo-sqlite, max 100 runs)

### Out of Scope

- CFD (Computational Fluid Dynamics) — 1D models sufficient and validated for v1
- Cold brew / decoction methods — insufficient research, deferred to v2
- Raspberry Pi / hardware integration — v2 feature, requires physical setup
- Community-submitted TDS validation or crowdsourced data — v2
- Cloud sync for run history — SQLite local-only in v1
- Bean density as input — insufficient public data to parameterize reliably without refractometer
- Roaster-facing / B2B features — out of target market
- On-device PDE solving — SciPy PDE latency unacceptable on mobile; backend-only for accurate mode

## Context

**Research complete (Phases 3–6):** All core papers read and documented — Moroney 2015/2016/2019, Melrose/Liang 2021, Cameron/Lee 2022, Maille 2021, Batali 2020. Physics decisions locked in architecture_spec.md.

**PoC validated (Phase 8):** Moroney 2016 immersion ODE passes internal consistency check: EY=21.51%, TDS=1.291%. Caveats: validation is circular (scaling derived from Liang K), two params estimated (phi_v_inf=0.40, c_s=1050 kg/m³). Independent validation against Batali 2020 / Liang 2021 datasets still needed.

**Phase 02 complete (2026-03-27):** Percolation solver (V60, Kalita Wave, Espresso) fully implemented. Both modes working: accurate mode (Moroney 2015 MOL, 30 nodes, Radau, EY=20.000% — Batali 2020 validation passes), fast mode (Maille 2021 biexponential, 0.185ms). Lee 2023 channeling overlay live for espresso (risk=0.434 vs pour-over 0.023). Method distinction confirmed: V60=20.0%, Kalita=19.5%, Espresso=20.5%. Shared output_helpers.py eliminates duplication. 64 tests passing.

**Phase 03 complete (2026-03-27):** Pressure and hybrid solvers implemented — Moka Pot (6-ODE Clausius-Clapeyron steam + Moroney extraction, EY=18% accurate, <1ms fast) and AeroPress (immersion.solve_accurate/fast steep → 1-ODE Darcy push, hybrid EY exceeds steep-only by ≥1%). All 6 brew methods × 2 modes verified via 18-test parametrized smoke suite. 98 tests passing, zero regressions.

**Phase 06 complete (2026-03-28):** Mobile core screens delivered. Expo/React Native app at `keif-mobile/` with 3-screen flow: RotarySelector (animated drum picker, 6 methods), Brew Dashboard (9 form elements + GrinderDropdown), Results (3 states: shimmer/error/success). Design tokens, TypeScript simulation types, API hooks (useSimulation POST /simulate, useHealthCheck GET /health), SCA brew chart with Victory Native + Skia zone overlay. 7 Jest Wave 0 stubs passing. Requirements MOB-01–MOB-08 all closed.

**Phase 04 complete (2026-03-28):** Extended outputs and grinder presets. Added 5 new optional fields to SimulationOutput (EUI, temperature_curve, sca_position, puck_resistance, caffeine_mg_per_ml) with helpers in output_helpers.py. All 6 solvers wire extended fields; percolation accurate mode computes EUI from real spatial ODE variance; espresso computes puck_resistance via Kozeny-Carman; moka_pot uses k_vessel=0.0 for isothermal flat curve. Added 1Zpresso J-Max (90-click) and Baratza Encore (40-setting) grinder presets. Performance: AeroPress fast path optimised with _biexponential_steep helper (< 1ms). 164 tests passing, 7 requirements (OUT-07, OUT-10, OUT-11, OUT-12, OUT-13, GRND-05, GRND-10) closed.

**Architecture locked (Phase 9):** 3 solver files + 6 method configs + AeroPress standalone. Fast/accurate as mode flag inside solver (not separate files). Fast=Maille 2021, Accurate=Moroney 2015/2016, shared Liang 2021 equilibrium anchor.

**Repo scaffold (Phase 10):** `brewos-engine/` has Pydantic models (inputs.py, outputs.py), empty solver/method stubs with docstrings, 1 passing smoke test (test_immersion_poc.py), grinders/ dir with Comandante C40 JSON stub.

**Open physics questions:** Pressure solver model TBD (architecture_spec.md notes "TBD specific model" for Espresso/Moka Pot). phi_v_inf and c_s are estimated — require Moroney 2015 Table 1 for confirmation.

**Naming:** Project renamed from BrewOS to Keif. Codebase uses `brewos` as package name (stays as-is — not worth renaming).

## Constraints

- **Stack**: Python 3.11+ / NumPy / SciPy / Pydantic for engine — locked by architecture spec
- **Stack**: FastAPI for backend — locked
- **Stack**: Expo / React Native for mobile — locked (cross-platform requirement)
- **Stack**: Victory Native for charts — locked by React Native compatibility
- **Physics**: All models must be traceable to published papers — portfolio-grade codebase
- **Accuracy**: Accurate mode must reproduce published EY% within ±1.5% RMSE (SciPy backend)
- **Performance**: Fast mode < 1ms, Accurate mode < 4s end-to-end
- **Sub-repo**: Application code lives in `brewos-engine/` (separate git repo); `.planning/` lives at root

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 3 solver types + 6 method configs (DECISION-005) | Clean separation: physics in solvers, brew config in methods | — Pending |
| Fast/accurate as flag inside solver, not separate files (DECISION-006) | Avoids code duplication; both modes share parameter setup | — Pending |
| Fast = Maille 2021 biexponential, Accurate = Moroney 2015/2016 (DECISION-007) | Independent models — not approximations of each other; both use Liang anchor | — Pending |
| All inputs required, grinder lookup preferred with manual micron fallback (DECISION-008) | Grinder DB gives PSD shape, not just median size | — Pending |
| Liang 2021 K=0.717 equilibrium scaling post-process (BREWOS-TODO-001) | Moroney ODE overpredicts EY ~16% without re-adsorption; linear scaling preserves kinetic shape | ⚠️ Revisit — proper fix is re-adsorption term |
| Package name stays `brewos` despite project rename to Keif | Renaming would break imports and test paths; cosmetic change | — Pending |
| Espresso uses percolation.py not pressure.py (DECISION-010) | Moroney 2015 PDE + MOL is valid at 9 bar with different params; no new physics framework needed | — Pending |
| Moka Pot uses pressure.py = Moroney 2016 ODE + thermal coupling (DECISION-010) | Steam pressure requires thermodynamic coupling not in other solvers; 6 ODEs, <100ms | — Pending |
| Channeling (Lee 2023) is post-processing overlay, not embedded in core solver (DECISION-010) | Validated against one grinder only — qualitative score, not precise probability | — Pending |
| CO2 bloom model = bi-exponential decay + multiplicative modifier on mass-transfer coefficient (DECISION-010) | Zero structural changes to Moroney ODE; beta suppression values are first-order estimates (no published non-espresso data) | — Pending |
| Grudeva 2025 multiscale espresso model skipped (DECISION-010) | Lacks validated parameters; anomalous Table 1 value; adds complexity without accuracy gain | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

Last updated: 2026-03-26

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 after initialization*

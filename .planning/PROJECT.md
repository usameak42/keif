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
- [ ] Immersion solver (Moroney 2016 ODE) fully integrated into engine with SimulationInput/Output contract
- [ ] Percolation solver (Moroney 2015 1D Darcy PDE) implemented for V60 and Kalita Wave
- [ ] Pressure solver implemented for Espresso and Moka Pot
- [ ] AeroPress standalone hybrid solver (immersion steep → pressure push)
- [ ] Fast mode: Maille 2021 biexponential kinetics (< 1ms) for all methods
- [ ] Accurate mode: ODE/PDE via scipy.solve_ivp (< 4s) for all methods
- [ ] All 7 simulation outputs: TDS%, EY%, extraction curve, PSD curve, flavor profile, brew ratio rec, warnings
- [ ] Extended outputs: channeling risk, CO2 degassing, water temp decay, SCA chart position, EUI, puck resistance, caffeine estimate
- [ ] Grinder database: minimum 10 presets (Comandante C40, Mavo, Timemore C2/C3, 1Zpresso, Niche Zero, DF64, Eureka, Fellow Ode, Baratza Encore, Kinu)

**Backend (M2)**
- [ ] FastAPI wrapping engine with /simulate endpoint
- [ ] Input validation, error handling, CORS for mobile
- [ ] Deployable to Railway or Fly.io

**Mobile App (M4–M5)**
- [ ] Expo/React Native input screens (brew method, grinder, dose, water, roast)
- [ ] Simulation trigger → FastAPI → results display
- [ ] Core outputs: TDS%, EY%, SCA brew chart (Victory Native)
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

## Evolution

This document evolves at phase transitions and milestone boundaries.

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

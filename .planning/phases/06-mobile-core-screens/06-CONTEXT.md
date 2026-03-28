# Phase 6: Mobile Core Screens - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 delivers the core Expo/React Native mobile app: brew method selection, parameter input, API integration, and results display (TDS%, EY%, SCA chart). Runs on iOS and Android via Expo.

This phase does NOT include extended output charts (extraction curve, PSD, flavor axis) — those are Phase 7.
This phase does NOT include run history / save / compare — those are Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Navigation Structure
- **D-01:** "Filtration" navigation pattern — three-screen linear flow: **Rotary Selector → Brew Dashboard → Results**. No tab bars, no menus.
- **D-02:** Forward transition = content dissolves and drips downward (like coffee through a filter). Back transition = content rises back upward. Both transitions are directional animations tied to the coffee-through-filter metaphor.
- **D-03:** Back/tweak button on Results returns to Brew Dashboard (and from Dashboard to Rotary Selector). No standard back arrow — custom touch target consistent with the filtration metaphor.

### Rotary Selector Screen
- **D-04:** First screen. User picks from all 6 brew methods: French Press, V60, Kalita Wave, Espresso, Moka Pot, AeroPress.
- **D-05:** "Rotary Selector" implies a rotating/scrolling selector UI — not a flat list. Downstream UI spec should treat this as a custom component, not a standard picker or list.

### Brew Dashboard Screen
- **D-06:** Single scrollable screen. All parameters visible in one view — no collapsed sections, no sub-screens.
- **D-07:** Parameter order (top to bottom): Grinder model dropdown → Setting (click spinner) → Dose (g) → Water (g) → Temperature (°C) → Time (s) → Roast level → Mode toggle → Simulate button.
- **D-08:** Grinder input: dropdown for model (Comandante C40 MK4, 1Zpresso J-Max, Baratza Encore, Manual). If a preset is selected → shows click/setting spinner with −/+ buttons and unit label. If "Manual" selected → shows a μm text field instead of the spinner.
- **D-09:** Roast level: segmented selector — Light / Medium / Dark.
- **D-10:** Fast / Accurate mode: segmented toggle on the Brew Dashboard (Fast | Accurate). User chooses before running. Accurate mode triggers a loading spinner on the Results screen while waiting for the API response (<4s).
- **D-11:** Simulate button at the bottom of the scroll. Single tap triggers API call.

### Results Screen
- **D-12:** Balanced split layout — TDS%/EY%/zone verdict callouts in the upper portion, SCA brew chart in the lower portion. Scrollable if chart needs space.
- **D-13:** Zone verdict is displayed alongside TDS%/EY% — "Ideal ✓", "Under-extracted", or "Over-extracted" — so the user gets the interpretation without reading the chart.
- **D-14:** SCA brew chart shows the result point plotted against the ideal zone rectangle (Victory Native).
- **D-15:** Accurate mode results display a label or badge indicating "Detailed simulation" to distinguish from fast mode results.

### API Integration
- **D-16:** App calls the Koyeb-deployed FastAPI `/simulate` endpoint. API base URL stored as an environment variable / Expo constant — not hardcoded in component code.
- **D-17:** GET `/health` called on app launch to warm up the backend and detect cold-start latency. If health check fails, show a "Backend warming up…" notice before the user tries to simulate.

### Claude's Discretion
- TypeScript throughout (standard for Expo projects — no need to ask)
- State management: local React state / context (no Redux/Zustand needed at this scope)
- Navigation library: Expo Router or React Navigation — researcher to recommend based on current Expo best practices
- Directory structure: screens/, components/, hooks/, constants/ — standard Expo pattern
- Error handling for API failures (network errors, 422 validation errors) — show inline error on Results screen

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stack Constraints
- `CLAUDE.md` §Stack — Expo/React Native locked, Victory Native for charts locked, FastAPI backend locked

### Requirements
- `.planning/REQUIREMENTS.md` §Mobile — Core Screens (MOB-01 through MOB-08) — full acceptance criteria

### Phase Goal
- `.planning/ROADMAP.md` §Phase 6 — Goal, success criteria, plan breakdown

### Backend Contract
- `brewos-engine/brewos/models/inputs.py` — SimulationInput schema (what the API accepts)
- `brewos-engine/brewos/models/outputs.py` — SimulationOutput schema (what the API returns)
- `brewos-engine/api.py` — FastAPI routes: POST /simulate, GET /health

No external design specs — UI spec to be generated via `/gsd:ui-phase 6` before planning (see UI hint in ROADMAP.md).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing mobile code — Phase 6 is a fresh Expo project setup.
- `brewos-engine/brewos/models/inputs.py`: SimulationInput defines all valid fields the app must send (brew_method, grinder_name, grinder_setting, grind_size, coffee_dose, water_mass, water_temp, brew_time, roast_level, bean_age_days, mode)
- `brewos-engine/brewos/models/outputs.py`: SimulationOutput defines TDS%, EY%, extraction_curve, psd_curve, flavor_profile, brew_ratio, warnings, sca_position (needed for chart)
- `brewos-engine/api.py`: POST /simulate + GET /health — CORS already configured for Expo client origin

### Established Patterns
- Backend: Pydantic validation → 422 with human-readable errors on invalid input (API-02 complete)
- Grinder presets: Comandante C40 MK4, 1Zpresso J-Max, Baratza Encore — all 3 are valid grinder_name values in the API

### Integration Points
- App → Koyeb API: POST /simulate with SimulationInput JSON, parse SimulationOutput JSON
- App launch → GET /health for cold-start warm-up
- Victory Native: renders SCA chart (EY% x-axis, TDS% y-axis, ideal zone rectangle overlay)

</code_context>

<specifics>
## Specific Ideas

- **"Filtration" navigation** is a core UX signature coined by the user — the animation metaphor (drip forward, rise back) must be preserved throughout. It's not just aesthetics; it's the app's identity.
- **Rotary Selector** for brew method: the name implies a custom rotary/drum selector component, not a standard flatlist or picker. The UI phase should design this specifically.
- **Zone verdict as text** alongside TDS/EY numbers: "Ideal ✓" pattern gives users an instant read without needing to parse the chart.

</specifics>

<deferred>
## Deferred Ideas

- Extended output charts (extraction curve, PSD, flavor axis) — Phase 7
- Run history / save / compare — Phase 7
- Cold brew / decoction methods — out of scope (v2)
- On-device simulation (no backend dependency) — out of scope (requires SciPy on device)

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-mobile-core-screens*
*Context gathered: 2026-03-28*

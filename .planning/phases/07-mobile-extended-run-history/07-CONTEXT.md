# Phase 7: Mobile Extended + Run History - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 extends the existing 3-screen Expo/React Native app with extended output visualization and a local run history system.

**Delivers:**
1. **Extended Output screen** (`app/extended.tsx`) — extraction curve chart, PSD curve chart, flavor axis bars, and extended detail cards (channeling risk, CO2 degassing, temp decay, EUI, puck resistance, caffeine). Accessed from Results via "View Details" CTA.
2. **Run History screen** (`app/history.tsx`) — save named runs, browse saved runs list, swipe-to-delete. Accessed from Results via "Save & History" CTA.
3. **Compare View screen** (`app/compare.tsx`) — side-by-side TDS/EY/zone, overlaid extraction curves, SCA chart with both points, flavor comparison. Accessed from Run History after selecting 2 runs.
4. **Results screen modifications** — add "View Details" and "Save & History" CTAs to `app/results.tsx`.
5. **SimulationOutput type extension** — expand `types/simulation.ts` to include all extended fields.

This phase does NOT add new brew methods, new API endpoints, or cloud sync. SQLite is local-only.

</domain>

<decisions>
## Implementation Decisions

### Data Transport: Simulation Result Across Screens
- **D-01:** Use **React Context** (a `SimulationResultContext`) to pass the current `SimulationInput` and `SimulationOutput` between screens. This replaces URL params for the result object (URL params are still fine for small routing params like run IDs).
- **D-02:** The context provider wraps the root layout in `app/_layout.tsx` (or a segment layout). Results screen writes to context after a successful simulation. Extended Output, Save flow, and Compare View read from context.
- **D-03:** Extended Output screen reads the live result from context — no re-fetch, no re-POST to /simulate. The data is already in memory from the Results screen's `useSimulation()` call.

### Run Name Auto-Fill
- **D-04:** The save prompt in Run History **auto-fills the run name** with a generated string: `{Method} · {HH:MM}` (e.g. `"V60 · 09:23"`, `"Espresso · 14:07"`). Method name is human-readable (not the enum slug). User can edit or clear before saving.
- **D-05:** Method display names: `french_press` → "French Press", `v60` → "V60", `kalita` → "Kalita Wave", `espresso` → "Espresso", `moka_pot` → "Moka Pot", `aeropress` → "AeroPress".

### History Screen: Conditional Save Prompt
- **D-06:** Save prompt appears in Run History **only when there is an unsaved simulation result in context**. If the user navigates to history with no current result (or after the result has already been saved), the screen shows the run list only — no save prompt.
- **D-07:** "Already saved" detection: track a boolean `currentRunSaved` in the context. Set to `true` after a successful save. Reset to `false` when a new simulation starts.

### SQLite Storage
- **D-08:** SQLite database initialized in a `useRunHistory()` hook (lazy init on first hook call). No separate provider needed — the hook handles `openDatabaseAsync` internally.
- **D-09:** Database file name: `keif-runs.db`. Schema: `saved_runs` table with columns `id`, `name`, `method`, `created_at`, `input_json`, `output_json`, `archived` (see UI-SPEC data model).
- **D-10:** Archive action is soft-delete (set `archived = 1`). Archived runs do not appear in the main list. No hard delete for archive — only swipe-to-delete triggers hard delete (after confirmation modal).

### Results Screen Changes
- **D-11:** Add two new CTAs to `app/results.tsx` success state, below the SCA chart:
  - "View Details" button (outlined, accent border/text) → navigates to `app/extended.tsx`
  - "Save & History" button (outlined) → navigates to `app/history.tsx`
- **D-12:** Both CTAs only render when `result` is non-null (success state). They are not shown in loading or error states.

### Victory Native Charts
- **D-13:** All three charts (extraction curve, PSD, compare overlaid curves) use Victory Native `CartesianChart` + `Line` components — same pattern as Phase 6 SCA chart in `components/SCAChart.tsx`. The researcher should study `SCAChart.tsx` to understand the existing Victory Native integration pattern.
- **D-14:** Flavor axis bars (`FlavorBars` component) are **pure React Native views** — not Victory Native. Three horizontal `View`s with width proportional to score (0–1 mapped to card width).

### Claude's Discretion
- State management within each screen (local `useState` is fine — no screen has complex cross-component state)
- `useRunComparison(idA, idB)` implementation details (two SQL queries, JSON.parse, return both outputs)
- Exact animation/expansion implementation for the temperature curve inline expand
- FlatList performance tuning (`initialNumToRender`, `windowSize`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 7 UI Design Contract
- `.planning/phases/07-mobile-extended-run-history/07-UI-SPEC.md` — Full screen contracts: layouts, components, colors, typography, spacing, SQLite schema, component inventory. Primary reference for all visual decisions.

### Phase 6 Established Patterns (MUST READ)
- `keif-mobile/app/results.tsx` — Screen to be modified; contains existing filtration navigation pattern, BackButton usage, SafeAreaView + ScrollView structure, useSimulation hook usage
- `keif-mobile/components/SCAChart.tsx` — Existing Victory Native CartesianChart implementation pattern; extraction curve and PSD charts follow this
- `keif-mobile/constants/colors.ts` — All color tokens (dominant, card, accent, text variants)
- `keif-mobile/constants/spacing.ts` — Spacing tokens (xs, sm, md, lg, xl, 2xl, 3xl)
- `keif-mobile/constants/typography.ts` — Typography tokens (label, body, heading, display)
- `keif-mobile/app/_layout.tsx` — Root layout where SimulationResultContext provider must be added

### Requirements
- `.planning/REQUIREMENTS.md` §Mobile — Extended Output Screens (MOB-09 through MOB-12) and Run History (MOB-13 through MOB-16)

### Phase 7 Goal and Success Criteria
- `.planning/ROADMAP.md` §Phase 7 — Goal, success criteria, plan breakdown

### Backend Contract (for type extension)
- `brewos-engine/brewos/models/outputs.py` — SimulationOutput Python schema; all optional extended fields that must be reflected in TypeScript types

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets from Phase 6
- `components/BackButton.tsx` — Used on all 3 new screens, same style
- `components/ErrorCard.tsx` — Used on Extended Output (API/network errors), History (SQLite errors), Compare View (load errors)
- `components/SkeletonShimmer.tsx` — Used in Extended Output while chart data loads
- `components/ZoneVerdict.tsx` — Used in Compare View per-run zone display
- `components/SCAChart.tsx` — Extended in Compare View to show 2 points (Run A + Run B)

### Current SimulationOutput Type (needs extension)
The current `types/simulation.ts` only has `tds_percent`, `extraction_yield`, `mode_used`, `sca_position`, `warnings`. Phase 7 must add:
- `extraction_curve: ExtractionPoint[]` (`{t, ey}`)
- `psd_curve: PSDPoint[]` (`{size_um, fraction}`)
- `flavor_profile: FlavorProfile` (`{sour, sweet, bitter}`)
- `brew_ratio: number`, `brew_ratio_recommendation: string`
- `channeling_risk: number | null`
- `extraction_uniformity_index: number | null`
- `temperature_curve: TempPoint[] | null` (`{t, temp_c}`)
- `puck_resistance: number | null`
- `caffeine_mg_per_ml: number | null`

Full type definitions are in `07-UI-SPEC.md` §API Integration Contract.

### Integration Points
- `app/_layout.tsx` — Add `SimulationResultContext` provider here (wraps all screens)
- `app/results.tsx` — Write result to context after simulation; add "View Details" and "Save & History" CTAs
- `app/extended.tsx` (new) — Reads result from context
- `app/history.tsx` (new) — Reads result from context for save prompt; reads from SQLite for list
- `app/compare.tsx` (new) — Reads two runs from SQLite by ID

### Expo Router Navigation
- Phase 6 uses `useRouter().push('/results')` with params. For Phase 7: `router.push('/extended')` (no params needed — data in context). For compare: `router.push({ pathname: '/compare', params: { runAId: id, runBId: id } })` (two integer IDs are fine as URL params).

</code_context>

<deferred>
## Deferred Ideas

- Cloud sync for run history — explicitly out of scope (REQUIREMENTS.md)
- Sharing a simulation result — v2 feature
- Batch export of run history (CSV/JSON) — not in v1

None raised during discussion — scope stayed within Phase 7 boundary.

</deferred>

---

*Phase: 07-mobile-extended-run-history*
*Context gathered: 2026-03-28*

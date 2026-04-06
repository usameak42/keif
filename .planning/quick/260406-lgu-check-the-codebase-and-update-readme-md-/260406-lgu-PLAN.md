---
phase: quick
plan: 260406-lgu
type: execute
wave: 1
depends_on: []
files_modified:
  - brewos-engine/README.md
autonomous: true
must_haves:
  truths:
    - "README.md exists at repo root and accurately describes the project"
    - "README covers both engine (Python) and mobile app (Expo/RN)"
    - "README reflects all 6 brew methods, 3 solvers, dual mode architecture"
    - "Changes are committed and pushed to main"
  artifacts:
    - path: "brewos-engine/README.md"
      provides: "Comprehensive project README"
      contains: "BrewOS"
  key_links: []
---

<objective>
Create a comprehensive README.md for the BrewOS Engine repository that accurately reflects the current state of the codebase: a physics-based coffee extraction simulation engine with 3 solvers, 6 brew methods, FastAPI backend, and an Expo/React Native mobile app.

Purpose: The repo has no README.md — anyone visiting the GitHub repo sees nothing. This README serves as the public face of a portfolio-grade project.
Output: brewos-engine/README.md committed and pushed to main.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Key codebase facts (gathered during planning):

## Engine Structure (brewos/)
- **Solvers** (3): immersion.py, percolation.py, pressure.py
- **Methods** (6): french_press.py, v60.py, kalita.py, espresso.py, moka_pot.py, aeropress.py
- **Models**: inputs.py (SimulationInput with Pydantic 2.0), outputs.py (SimulationOutput, ExtractionPoint, PSDPoint, FlavorProfile)
- **API**: api.py (FastAPI wrapper, CORS enabled)
- **Utils**: channeling.py, co2_bloom.py, output_helpers.py, params.py, psd.py
- **Grinders**: comandante_c40_mk4.json, 1zpresso_j-max.json, baratza_encore.json
- **Tests**: 21 test files in tests/ (immersion, percolation, pressure, fast mode, extended outputs, API, grinder, cross-method tolerance, all methods, CO2 bloom)
- **Dependencies**: scipy, numpy, pydantic>=2.0 (dev: pytest)
- **Python**: 3.11+
- **Version**: 0.1.0

## Mobile App Structure (keif-mobile/)
- **Framework**: Expo SDK 52 / React Native
- **Screens** (7): index.tsx (home/carousel), dashboard.tsx, results.tsx, extended.tsx, history.tsx, compare.tsx, _layout.tsx
- **Components** (28): RotarySelector, GrinderDropdown, SCAChart, ExtractionCurveChart, PSDChart, FlavorBars, FlavorCompareBars, OverlaidCurveChart, TempCurveInline, ResultCalloutCard, ExtendedDetailCard, RunListItem, CompareMetricColumns, CompareSCAChart, etc.
- **Hooks**: useSimulation, useHealthCheck, useRunHistory, useRunComparison
- **Context**: SimulationResultContext (cross-screen state)
- **Storage**: expo-sqlite for run history persistence
- **Charts**: Victory Native (CartesianChart), @shopify/react-native-skia
- **Tests**: 7 unit tests (Jest 29)

## Physics References
- Moroney 2016: Immersion ODE (french press, AeroPress steep phase)
- Moroney 2015: Percolation PDE (V60, Kalita, espresso)
- Maille 2021: Biexponential fast mode (all methods, <1ms)
- Liang 2021: K=0.717 equilibrium anchor for EY scaling
- Siregar 2026: Pressure/thermal ODE (moka pot)

## Dual Mode Architecture
- Fast mode: Maille 2021 biexponential kinetics (<1ms)
- Accurate mode: Full ODE/PDE solving via SciPy (<4s)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write README.md</name>
  <files>brewos-engine/README.md</files>
  <action>
Create brewos-engine/README.md with the following sections, using the codebase facts from the context above. Do NOT invent features that don't exist. Keep the tone technical and portfolio-grade (this is a numerical simulation tool, not a recipe app).

**Structure:**

1. **Title + Tagline**: "BrewOS Engine" with one-line description: physics-based coffee extraction simulation engine
2. **What It Does** (2-3 sentences): Predicts TDS%, extraction yield, and flavor profile from grinder settings, dose, water parameters. Uses peer-reviewed extraction models. Not a recipe app — a numerical simulation tool.
3. **Features** (bullet list):
   - 6 brew methods (French Press, V60, Kalita Wave, Espresso, Moka Pot, AeroPress)
   - 3 physics solvers (immersion ODE, percolation PDE, pressure/thermal ODE)
   - Dual execution modes (fast <1ms biexponential, accurate <4s ODE/PDE)
   - Grinder database with particle size distributions (Comandante C40, 1Zpresso J-Max, Baratza Encore)
   - CO2 bloom modeling, channeling risk estimation
   - Time-resolved extraction curves, PSD visualization, SCA brew control chart positioning
   - Flavor profile prediction (sour/sweet/bitter) anchored to SCA extraction order
   - FastAPI backend for HTTP access
4. **Architecture Overview** (brief):
   - Engine: Python 3.11+ / NumPy / SciPy / Pydantic 2.0
   - API: FastAPI
   - Mobile: Expo SDK 52 / React Native (iOS + Android)
   - Charts: Victory Native + Shopify Skia
   - Storage: expo-sqlite for run history
5. **Project Structure** (tree showing key directories only — brewos/ with solvers/methods/models/utils/grinders, keif-mobile/ with app/components/hooks/context, tests/)
6. **Physics Models** (brief table or list):
   - Moroney et al. (2016) — Immersion extraction ODE
   - Moroney et al. (2015) — Percolation extraction PDE
   - Maille et al. (2021) — Biexponential kinetics (fast mode)
   - Liang et al. (2021) — Equilibrium extraction yield anchor (K=0.717)
   - Siregar et al. (2026) — Pressure-driven thermal ODE
7. **Quick Start** (engine only):
   - Install: `pip install -e .` (from brewos-engine/)
   - Run tests: `pytest`
   - Start API: `uvicorn brewos.api:app --reload`
   - Mobile: `cd keif-mobile && npx expo start`
8. **API Usage** (single curl example hitting /simulate with french_press, fast mode)
9. **Testing** (mention 21 test files, pytest, cross-method tolerance tests)
10. **License** — leave as "TBD" or omit (no LICENSE file exists)

Do NOT include badges, CI status, contribution guides, or other boilerplate that doesn't apply yet. Keep it honest about the current state.

Use clean markdown. No emojis. Code blocks for commands. Keep total length under 200 lines.
  </action>
  <verify>
    <automated>test -f D:/Coding/Keif/brewos-engine/README.md && wc -l D:/Coding/Keif/brewos-engine/README.md</automated>
  </verify>
  <done>README.md exists at brewos-engine/README.md, is under 200 lines, covers all 10 sections listed above, and contains no fabricated features</done>
</task>

<task type="auto">
  <name>Task 2: Commit and push to main</name>
  <files>brewos-engine/README.md</files>
  <action>
From D:/Coding/Keif/brewos-engine/ (the git repo root):

1. Stage the new README.md: `git add README.md`
2. Commit with message: `docs: add comprehensive README for BrewOS Engine`
3. Push to origin main: `git push origin main`

Use the Co-Authored-By trailer as required.
  </action>
  <verify>
    <automated>cd D:/Coding/Keif/brewos-engine && git log --oneline -1 | grep -q "README" && echo "PASS"</automated>
  </verify>
  <done>README.md is committed and pushed to the main branch on GitHub</done>
</task>

</tasks>

<verification>
- README.md exists at brewos-engine/README.md
- Content accurately reflects current codebase (3 solvers, 6 methods, FastAPI, Expo mobile app)
- No fabricated features or badges
- Committed and pushed to origin/main
</verification>

<success_criteria>
- Anyone visiting https://github.com/usameak42/keif sees a clear, accurate project description
- README covers engine architecture, mobile app, physics models, and quick start
- All content traceable to actual codebase files
</success_criteria>

<output>
After completion, create `.planning/quick/260406-lgu-check-the-codebase-and-update-readme-md-/260406-lgu-SUMMARY.md`
</output>

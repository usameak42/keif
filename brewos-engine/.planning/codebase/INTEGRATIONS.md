# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**None Detected**
- No HTTP clients, REST API integrations, or external service calls are present in the codebase
- No API credentials, SDK imports (requests, aiohttp, etc.), or webhook handlers exist
- This is a pure computational engine with no network dependencies

## Data Storage

**Databases:**
- None - No persistent database integrations (SQL, NoSQL, cloud databases)
- Grinder metadata stored locally as JSON: `brewos/grinders/comandante_c40_mk4.json` (placeholder format)
- Simulations are stateless; all inputs passed via `SimulationInput` model, all outputs returned via `SimulationOutput` model

**File Storage:**
- Local filesystem only
- PoC outputs written to `poc/outputs/` directory in `poc/moroney_2016_immersion_ode.py` (lines 207-263)
- No cloud storage integrations (S3, GCS, etc.)

**Caching:**
- None implemented
- ODE solver computations not cached between calls

## Authentication & Identity

**Auth Provider:**
- None required
- No user authentication, API keys, or OAuth integrations
- Stateless mathematical engine; no session management

## Monitoring & Observability

**Error Tracking:**
- None - No error reporting service (Sentry, DataDog, etc.)
- Errors handled via Python exceptions and runtime validation

**Logs:**
- Console output only (print statements in `poc/moroney_2016_immersion_ode.py`)
- Stdout capture tested in `tests/test_immersion_poc.py` (line 22: `capture_output=True, text=True`)
- No structured logging framework (no logging module usage detected)

## CI/CD & Deployment

**Hosting:**
- Not specified - Intended as Python library for consumption by BrewOS app
- No production deployment configuration (Docker, Kubernetes, Lambda, etc.)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI configuration files present
- Test suite exists and runnable via pytest; no automated triggering configured

## Environment Configuration

**Required env vars:**
- None - No environment variables referenced in codebase
- All configuration passed as function arguments (SimulationInput)

**Secrets location:**
- No secrets management implemented
- No .env files, credential files, or external secret stores required

## Data Models & Grinder Database

**Grinder Registry:**
- Location: `brewos/grinders/` directory
- Format: JSON files per grinder model (e.g., `comandante_c40_mk4.json`)
- Schema includes: `model`, `type`, `burr`, `settings`, `psd` (particle size distribution), `source`, `confidence`, `note`
- Status: Incomplete - current file is a placeholder with `"_placeholder": true` and `"confidence": "low"`
- Loader: Reference in `brewos/grinders/__init__.py` ("BrewOS grinder database loader") but implementation not yet visible

**Input/Output Models:**
- Validation layer: `brewos/models/inputs.py` with SimulationInput (Pydantic BaseModel)
  - Validates coffee_dose, water_amount, water_temp, brew_time as positive
  - Validates water_temp in range (0, 100) °C (exclusive)
  - Enforces grinder_setting required when grinder_name provided
  - Enforces either grind_size or (grinder_name + grinder_setting) source consistency
- Output schema: `brewos/models/outputs.py` with SimulationOutput containing ExtractionPoint, PSDPoint, FlavorProfile

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Scientific Data References

**Paper Implementations:**
- Moroney et al. (2016) - "Coffee extraction kinetics in a well mixed system"
  - ODE solver: `brewos/solvers/immersion.py` and `poc/moroney_2016_immersion_ode.py`
  - Parameters sourced from vault: Physics/papers/Moroney et al., 2015.md
- Maille et al. (2021) - Biexponential kinetics
  - Integration planned (not yet implemented in Phase 10 scaffold)
- Liang et al. (2021) - Equilibrium desorption constant
  - Used as equilibrium anchor: K = 0.717, E_max = 0.30 in `poc/moroney_2016_immersion_ode.py` (lines 51-55)

## Internal API Design

**Simulation Entry Point:**
- Input: `brewos.models.SimulationInput` (brew parameters: coffee_dose, water_amount, water_temp, brew_time, grinder info, roast level, mode)
- Output: `brewos.models.SimulationOutput` (results: TDS, extraction_yield, extraction_curve, psd_curve, flavor_profile, warnings)
- No external API gateway or REST endpoint wrapper detected in Phase 10 scaffold

---

*Integration audit: 2026-03-26*

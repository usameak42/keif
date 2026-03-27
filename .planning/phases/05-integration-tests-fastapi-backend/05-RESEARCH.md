# Phase 5: Integration Tests + FastAPI Backend — Research

**Researched:** 2026-03-28
**Domain:** pytest parametrization, FastAPI + Pydantic v2, Railway/Fly.io deployment
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VAL-03 | Fast mode EY% within ±2% of accurate mode for standard params, all 6 methods | Cross-method parametrize pattern; pytest.mark.parametrize over method list with per-method standard scenarios |
| VAL-04 | pytest suite green — all solvers, methods, equilibrium scaling, grinder lookup | 164 tests already pass; gaps identified as 1 new file (test_cross_method_tolerance.py) + API test file |
| API-01 | FastAPI POST /simulate accepting SimulationInput JSON, returning SimulationOutput JSON | SimulationInput is a Pydantic BaseModel — FastAPI accepts it directly as body param |
| API-02 | 422 with human-readable messages on invalid input (not raw Pydantic traces) | RequestValidationError exception handler pattern verified in FastAPI docs |
| API-03 | CORS for React Native / Expo client | Native RN does not enforce CORS; CORSMiddleware needed only for Expo Web / browser-based debugging |
| API-04 | GET /health endpoint (keep-alive ping) | Simple route returning {"status": "ok"} — no library needed |
| API-05 | Deployable to Railway or Fly.io with documented deployment steps | Railway recommended (no cold starts, auto-detect Python, simpler config) |
</phase_requirements>

---

## Summary

Phase 5 has two separable concerns. The first (VAL-03/VAL-04) is straightforward: the engine already has 164 passing tests but the cross-method fast-vs-accurate tolerance suite does not yet exist as a single parametrized file. One new test file (`tests/test_cross_method_tolerance.py`) with `@pytest.mark.parametrize` over all 6 method dispatch functions covers VAL-03 cleanly. The remaining VAL-04 work is verifying the full suite stays green after the API is added.

The second concern (API-01 through API-05) requires adding FastAPI 0.115.x, uvicorn (already installed at 0.42.0), and httpx (already installed at 0.28.1) to the project. FastAPI's native Pydantic v2 integration means `SimulationInput` can be used directly as a POST body parameter with zero adapter code. Custom 422 formatting requires a single `@app.exception_handler(RequestValidationError)` function. Railway is the recommended deployment target due to no cold starts and auto-detection of Python projects.

**Primary recommendation:** Add `fastapi>=0.115` to `pyproject.toml`, create `brewos/api.py` as the entry point, and a `Procfile` at the engine root for Railway. One new test file handles VAL-03; API tests use `fastapi.testclient.TestClient` with the existing `httpx` install.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastapi | 0.115.x (latest: 0.135.2) | ASGI web framework, route handling, OpenAPI docs | Industry standard for Python APIs; native Pydantic v2 support |
| uvicorn | 0.42.0 (already installed) | ASGI server — runs the FastAPI app | FastAPI's official production server recommendation |
| pydantic | 2.12.5 (already installed) | Input/output validation — SimulationInput/Output | Already in codebase; FastAPI uses it natively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| httpx | 0.28.1 (already installed) | HTTP client — required by TestClient | Already present; needed for API tests |
| pytest | 9.0.2 (already installed) | Test runner | Already the project test framework |
| starlette | 1.0.0 (already installed) | ASGI toolkit underlying FastAPI | Transitive dependency; no direct use |

**Version verification — confirmed against PyPI 2026-03-28:**
- `fastapi`: latest 0.135.2; recommend pinning `fastapi>=0.115,<0.136` (0.115 is where Pydantic v2 support stabilised)
- `uvicorn`: 0.42.0 already installed — current
- `httpx`: 0.28.1 already installed — current (TestClient requires httpx)

**Note on starlette 1.0.0:** The version installed (1.0.0) is abnormally high compared to typical FastAPI starlette dependencies. FastAPI 0.115.x expects starlette ~0.40.x. Installing `fastapi` via pip will pull the correct starlette version; verify no conflict after install.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FastAPI | Flask + marshmallow | FastAPI has native Pydantic v2 integration and auto-generates OpenAPI; Flask requires manual schema wiring |
| Railway | Fly.io | Fly.io has steeper CLI learning curve and machines pause on inactivity (cold starts); Railway auto-deploys on git push with no cold starts |
| Railway | Render | Both are similar; Railway's GitHub integration is faster for first deploy |

**Installation (additions to pyproject.toml):**
```bash
pip install "fastapi>=0.115,<0.136"
```
uvicorn, httpx, pytest are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
brewos-engine/
├── brewos/
│   ├── api.py            # FastAPI app — entry point
│   ├── models/
│   │   ├── inputs.py     # SimulationInput (already exists)
│   │   └── outputs.py    # SimulationOutput (already exists)
│   ├── solvers/          # (already exists)
│   └── methods/          # (already exists)
├── tests/
│   ├── test_cross_method_tolerance.py   # NEW — VAL-03
│   ├── test_api.py                      # NEW — API-01 through API-04
│   └── (existing 19 test files)
├── Procfile              # Railway deployment: web: uvicorn brewos.api:app ...
├── pyproject.toml        # Add fastapi dependency
└── README.md
```

### Pattern 1: SimulationInput as POST body

FastAPI automatically reads a Pydantic `BaseModel` subclass as the JSON request body when it is declared as a function parameter. No adapter or wrapper needed — `SimulationInput` works directly.

```python
# Source: https://fastapi.tiangolo.com/tutorial/body/
# brewos/api.py

from fastapi import FastAPI
from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput

app = FastAPI(title="BrewOS Engine API", version="0.1.0")

@app.post("/simulate", response_model=SimulationOutput)
async def simulate(body: SimulationInput) -> SimulationOutput:
    from brewos.methods import french_press, v60, kalita, espresso, moka_pot, aeropress
    _DISPATCH = {
        "french_press": french_press.simulate,
        "v60": v60.simulate,
        "kalita": kalita.simulate,
        "espresso": espresso.simulate,
        "moka_pot": moka_pot.simulate,
        "aeropress": aeropress.simulate,
    }
    # Method selection: pass method as query param or embed in body
    # See Pattern 3 for method routing discussion
    ...
```

**Note on method selection:** `SimulationInput` does not currently include a `method` field. Two options:
1. Add `method: BrewMethod` enum field to `SimulationInput` (cleanest — self-contained request)
2. Accept method as a path parameter: `POST /simulate/{method}`

Option 1 is recommended for Phase 6 mobile compatibility — one JSON object, no path parameter parsing.

### Pattern 2: Custom 422 Handler (API-02)

FastAPI raises `RequestValidationError` for Pydantic validation failures. The default response contains raw Pydantic internal detail. Override with a custom handler to produce human-readable messages.

```python
# Source: https://fastapi.tiangolo.com/tutorial/handling-errors/
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        msg = error["msg"]
        errors.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation failed", "errors": errors},
    )
```

This produces responses like:
```json
{
    "detail": "Validation failed",
    "errors": [
        "water_temp: water_temp must be between 0 and 100 °C (exclusive)",
        "coffee_dose: must be positive"
    ]
}
```

**Pydantic v2 note:** In Pydantic v2, `exc.errors()` returns a list of dicts with keys `loc`, `msg`, `type`, and `url`. The `msg` field contains the human-readable validator message (e.g., "must be positive" from the existing validators in `inputs.py`). The `url` key points to Pydantic docs — omit it from the response.

### Pattern 3: CORS Configuration (API-03)

React Native native apps (iOS/Android) do NOT enforce CORS — CORS is a browser-only security mechanism. Native fetch/XMLHttpRequest calls bypass same-origin checks entirely.

CORS IS required for:
- Expo Web (browser-based testing via `expo start --web`)
- Any browser-based testing tool (Swagger UI, curl-based tools are fine)

**Recommended configuration** (permissive for development, acceptable for a public physics API with no auth):

```python
# Source: https://fastapi.tiangolo.com/tutorial/cors/
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Public API, no credentials needed
    allow_credentials=False,    # Must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)
```

`allow_credentials=True` is incompatible with `allow_origins=["*"]` per the CORS specification — pick one. Since BrewOS API has no auth headers, `allow_credentials=False` with wildcard origins is correct.

### Pattern 4: Health Endpoint (API-04)

```python
@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
```

No library needed. The purpose is to give the Expo app a cheap ping to wake a cold-start Railway instance before the user hits /simulate. GET returns in < 5ms.

### Pattern 5: Cross-Method Tolerance Test (VAL-03)

Use `@pytest.mark.parametrize` over the 6 method names. Each parametrize case runs both fast and accurate mode, records EY%, and asserts the absolute difference is < 2.0%.

```python
# tests/test_cross_method_tolerance.py
import pytest
from brewos.models.inputs import SimulationInput, Mode, RoastLevel
from brewos.methods import french_press, v60, kalita, espresso, moka_pot, aeropress

_DISPATCH = {
    "french_press": french_press.simulate,
    "v60": v60.simulate,
    "kalita": kalita.simulate,
    "espresso": espresso.simulate,
    "moka_pot": moka_pot.simulate,
    "aeropress": aeropress.simulate,
}

_STANDARD_PARAMS = {
    "french_press": dict(coffee_dose=15.0, water_amount=250.0, water_temp=93.0, grind_size=700.0, brew_time=240.0, roast_level=RoastLevel.medium),
    "v60":          dict(coffee_dose=15.0, water_amount=250.0, water_temp=93.0, grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium),
    "kalita":       dict(coffee_dose=15.0, water_amount=250.0, water_temp=93.0, grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium),
    "espresso":     dict(coffee_dose=18.0, water_amount=36.0,  water_temp=93.0, grind_size=200.0, brew_time=25.0,  roast_level=RoastLevel.medium, pressure_bar=9.0),
    "moka_pot":     dict(coffee_dose=15.0, water_amount=150.0, water_temp=93.0, grind_size=400.0, brew_time=180.0, roast_level=RoastLevel.medium),
    "aeropress":    dict(coffee_dose=15.0, water_amount=200.0, water_temp=93.0, grind_size=500.0, brew_time=90.0,  roast_level=RoastLevel.medium),
}


@pytest.mark.parametrize("method_name", list(_DISPATCH.keys()))
def test_fast_vs_accurate_tolerance(method_name: str) -> None:
    """VAL-03: Fast mode EY within ±2% absolute of accurate mode for all 6 methods."""
    params = dict(_STANDARD_PARAMS[method_name])
    fast_inp     = SimulationInput(**params, mode=Mode.fast)
    accurate_inp = SimulationInput(**params, mode=Mode.accurate)

    simulate = _DISPATCH[method_name]
    fast_result     = simulate(fast_inp)
    accurate_result = simulate(accurate_inp)

    diff = abs(fast_result.extraction_yield - accurate_result.extraction_yield)
    assert diff < 2.0, (
        f"{method_name}: fast EY={fast_result.extraction_yield:.2f}%, "
        f"accurate EY={accurate_result.extraction_yield:.2f}%, "
        f"diff={diff:.2f}% (tolerance: 2.0%)"
    )
```

**Why absolute tolerance, not `pytest.approx`:** `pytest.approx` defaults to relative tolerance (1e-6). An absolute ±2% assertion matches the requirement wording and is more meaningful for physics outputs. Use manual `abs(a - b) < 2.0` as shown in the existing test files.

### Pattern 6: API Tests with TestClient

```python
# tests/test_api.py
# Source: https://fastapi.tiangolo.com/tutorial/testing/
from fastapi.testclient import TestClient
from brewos.api import app

client = TestClient(app)

VALID_FRENCH_PRESS = {
    "coffee_dose": 15.0, "water_amount": 250.0, "water_temp": 93.0,
    "grind_size": 700.0, "brew_time": 240.0, "roast_level": "medium",
    "method": "french_press", "mode": "fast"
}

def test_simulate_returns_200():
    response = client.post("/simulate", json=VALID_FRENCH_PRESS)
    assert response.status_code == 200
    data = response.json()
    assert data["tds_percent"] > 0
    assert data["extraction_yield"] > 0

def test_simulate_invalid_input_returns_422():
    bad = dict(VALID_FRENCH_PRESS)
    bad["water_temp"] = 150.0  # out of range
    response = client.post("/simulate", json=bad)
    assert response.status_code == 422
    data = response.json()
    assert "errors" in data  # our custom handler
    assert any("water_temp" in e for e in data["errors"])

def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

`TestClient` is synchronous and wraps `httpx` — no `async` needed in test functions. `httpx` is already installed at 0.28.1.

### Anti-Patterns to Avoid

- **Returning raw `exc.errors()` in 422 handler:** Exposes Pydantic internal type codes (`url`, `ctx`) and stack trace-like `loc` tuples. Format into human strings first.
- **`allow_credentials=True` with `allow_origins=["*"]`:** Violates the CORS spec; browsers will reject responses. Use one or the other.
- **Importing method modules at module level in `api.py`:** This triggers solver imports which import scipy — acceptable but noted. All 6 methods must be importable at API startup.
- **Using `hypercorn` instead of `uvicorn`:** Railway's one-click template uses hypercorn; the project stack uses uvicorn (already installed). Stay consistent — use uvicorn.
- **Adding `method` to `SimulationInput` as an Optional field with a default:** The method field should be required — a simulation without a method is not meaningful.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request body parsing | Custom JSON → dataclass converter | FastAPI + Pydantic v2 native body param | FastAPI handles type coercion, nested model parsing, and enum conversion automatically |
| 422 error formatting | Custom middleware that intercepts all responses | `@app.exception_handler(RequestValidationError)` | Scope-limited, tested, Pydantic-aware |
| ASGI server | Twisted, gunicorn without uvicorn worker | uvicorn (already installed) | uvicorn is the standard ASGI server for FastAPI |
| API tests | Spinning up a real server process | `fastapi.testclient.TestClient` | In-process, no port binding, fast |
| Railway port binding | Hardcoded port | `$PORT` env var in Procfile | Railway injects `PORT` at runtime; hardcoded 8000 may conflict |

---

## Common Pitfalls

### Pitfall 1: Method Routing — SimulationInput Has No Method Field

**What goes wrong:** `POST /simulate` receives a JSON body with no way to know which brew method to dispatch to. The API returns an error or picks a hardcoded method.

**Why it happens:** `SimulationInput` was designed as a solver-agnostic parameter bag. Method selection was handled at the Python call site.

**How to avoid:** Add a `method: BrewMethod` field (a new `str, Enum`) to `SimulationInput` before wiring the API. The dispatch dict in `api.py` reads `body.method.value`. Alternatively use `POST /simulate/{method}` path parameter.

**Warning signs:** `/simulate` endpoint with identical request bodies produces identical results regardless of intent.

### Pitfall 2: Starlette Version Conflict

**What goes wrong:** Installing `fastapi` pulls a starlette version that conflicts with the `starlette 1.0.0` already installed, causing import errors.

**Why it happens:** The current environment has starlette 1.0.0 which is unusually high. FastAPI 0.115.x expects starlette ~0.40.x.

**How to avoid:** Run `pip install "fastapi>=0.115,<0.136"` and check for conflicts. pip should resolve starlette to the correct version. Verify with `python -c "import fastapi; print(fastapi.__version__)"` after install.

**Warning signs:** `ImportError: cannot import name 'X' from 'starlette'` after installing FastAPI.

### Pitfall 3: pytest.approx vs Absolute Tolerance Mismatch

**What goes wrong:** Using `pytest.approx(accurate_ey, rel=0.02)` instead of `abs(fast_ey - accurate_ey) < 2.0` — these are NOT equivalent for EY values.

**Why it happens:** `pytest.approx` with `rel=0.02` means 2% of the accurate value, not ±2 percentage points. For EY=20%, `rel=0.02` allows ±0.4% — far stricter than intended. For EY=10%, it allows ±0.2%.

**How to avoid:** Use `abs(fast_ey - accurate_ey) < 2.0` for absolute percentage-point tolerance, matching the requirement wording.

**Warning signs:** Tests pass for high-EY methods but fail for low-EY methods, or vice versa.

### Pitfall 4: Cold Starts on Railway Free Tier

**What goes wrong:** The Expo app sends a POST /simulate immediately on launch; the Railway instance is sleeping; the request times out.

**Why it happens:** Railway's free/hobby tier may sleep inactive services. The GET /health endpoint (API-04) is specifically designed as a keep-alive ping to wake the instance.

**How to avoid:** Implement `/health` first; the Expo app (Phase 6) should ping `/health` on app launch before showing the simulation UI. Railway also has an "Always On" toggle in service settings for paid plans.

**Warning signs:** First request after idle period returns 504 Gateway Timeout.

### Pitfall 5: SciPy Import Time at API Startup

**What goes wrong:** Railway cold start takes 15-30 seconds because scipy + numpy are imported at module load.

**Why it happens:** scipy's first import is slow (~500ms-2s). All method modules import solvers, which import scipy.

**How to avoid:** Accept this as a one-time startup cost (not per-request). The `/health` endpoint ping from Phase 6 absorbs this cost. Do NOT lazy-import solvers inside the request handler — this shifts the delay to the first real request.

---

## Code Examples

### Complete `brewos/api.py`
```python
# Source: FastAPI docs — https://fastapi.tiangolo.com/tutorial/
"BrewOS Engine HTTP API — FastAPI wrapper for all 6 brew method simulations."

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput

from brewos.methods import french_press, v60, kalita, espresso, moka_pot, aeropress


app = FastAPI(title="BrewOS Engine", version="0.1.0")

# ─────────────────────────────────────────────────────────────────────────────
# CORS — required for Expo Web; native iOS/Android ignores CORS
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION ERROR HANDLER — readable 422s (API-02)
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        msg = error["msg"]
        errors.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation failed", "errors": errors},
    )


# ─────────────────────────────────────────────────────────────────────────────
# METHOD DISPATCH TABLE
# ─────────────────────────────────────────────────────────────────────────────

_DISPATCH = {
    "french_press": french_press.simulate,
    "v60": v60.simulate,
    "kalita": kalita.simulate,
    "espresso": espresso.simulate,
    "moka_pot": moka_pot.simulate,
    "aeropress": aeropress.simulate,
}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}


@app.post("/simulate", response_model=SimulationOutput)
async def simulate(body: SimulationInput) -> SimulationOutput:
    simulate_fn = _DISPATCH[body.method.value]
    return simulate_fn(body)
```

**Note:** This example assumes `method: BrewMethod` has been added to `SimulationInput`. Plan 05-01 or 05-02 must add this field before the API can dispatch.

### Procfile (Railway deployment)
```
web: uvicorn brewos.api:app --host 0.0.0.0 --port ${PORT:-8000}
```

### pyproject.toml additions
```toml
[project]
dependencies = [
    "scipy",
    "numpy",
    "pydantic>=2.0",
    "fastapi>=0.115,<0.136",
    "uvicorn>=0.29",
]

[project.optional-dependencies]
dev = ["pytest", "httpx"]
```

`httpx` moves to dev dependencies since it is needed by `TestClient`. It is already installed globally in this environment.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flask + marshmallow for Python APIs | FastAPI + Pydantic v2 native | FastAPI reached broad adoption ~2022; Pydantic v2 stable since June 2023 | Zero glue code between SimulationInput and HTTP layer |
| Heroku free tier | Railway / Fly.io / Render | Heroku ended free tier Nov 2022 | Railway is the successor for rapid Python API deployment |
| `nixpacks` on Railway | `railpack` on Railway | Late 2024 | Nixpacks deprecated; railpack auto-detected; no config change needed for standard Python projects |
| `pytest.approx` for numeric tolerance | Manual `abs(a - b) < tolerance` for physics domain | N/A — always valid | Physics tolerances are absolute percentage points, not relative fractions |

**Deprecated/outdated:**
- Nixpacks: Railway's builder tool; superseded by railpack. Procfile still works with railpack.
- `hypercorn`: Railway's FastAPI template uses it; this project uses uvicorn. Stick with uvicorn for consistency.
- `fastapi[all]` install: Historically installed many optional extras; now split into `fastapi[standard]` for uvicorn/httpx extras. For this project, explicit deps in pyproject.toml is cleaner.

---

## Open Questions

1. **Method field in SimulationInput**
   - What we know: The field does not currently exist; the API cannot dispatch without it
   - What's unclear: Whether to add it to `SimulationInput` itself (cleaner JSON, single body object) or accept it as a path parameter (`/simulate/{method}`)
   - Recommendation: Add `method: BrewMethod` as a required field to `SimulationInput`. This keeps the API request self-contained and aligns with how Phase 6 mobile will build the payload. The `BrewMethod` enum should be `str, Enum` following existing project conventions.

2. **VAL-03 tolerance for Moka Pot**
   - What we know: `test_moka_fast_accuracy` (test_pressure.py line 57) already asserts `< 2.0%` tolerance at the solver level, but uses moka-specific params, not the standard cross-method scenario
   - What's unclear: Whether the moka standard scenario (coffee_dose=15, water_amount=150, water_temp=93, grind_size=400, brew_time=180) passes the ±2% tolerance — it may need different params than the generic cross-method scenario
   - Recommendation: Run the parametrized test in Wave 0 / test execution; if Moka Pot fails, adjust the standard params for that method rather than loosening the tolerance

3. **Starlette 1.0.0 compatibility**
   - What we know: starlette 1.0.0 is installed, which is unusually high; FastAPI 0.115.x normally depends on starlette ~0.40.x
   - What's unclear: Whether pip will downgrade starlette when fastapi is installed, or whether other installed packages pin starlette 1.0.0
   - Recommendation: Run `pip install "fastapi>=0.115,<0.136"` as Wave 0 step and verify no import errors; if there is a conflict, pin starlette explicitly

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | All | Yes | 3.12.5 | — |
| uvicorn | API server | Yes | 0.42.0 | — |
| httpx | TestClient | Yes | 0.28.1 | — |
| pytest | Test runner | Yes | 9.0.2 | — |
| pydantic | Models | Yes | 2.12.5 | — |
| fastapi | API framework | No (not installed) | latest: 0.135.2 | None — must install |
| starlette | FastAPI dependency | Yes (1.0.0) | 1.0.0 | pip will resolve on fastapi install |

**Missing dependencies with no fallback:**
- `fastapi`: must be installed (`pip install "fastapi>=0.115,<0.136"`) before Wave 1 API work begins

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 |
| Config file | `brewos-engine/pyproject.toml` (`[tool.pytest.ini_options]`) |
| Quick run command | `cd brewos-engine && python -m pytest tests/test_cross_method_tolerance.py tests/test_api.py -x -q` |
| Full suite command | `cd brewos-engine && python -m pytest -q` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAL-03 | Fast EY within ±2% of accurate for all 6 methods | unit (parametrized) | `pytest tests/test_cross_method_tolerance.py -v` | ❌ Wave 0 |
| VAL-04 | Full pytest suite green | integration | `pytest -q` | Partial — 164 tests exist, 2 new files needed |
| API-01 | POST /simulate returns 200 + SimulationOutput | integration | `pytest tests/test_api.py::test_simulate_returns_200` | ❌ Wave 0 |
| API-02 | Invalid input returns 422 with readable errors | integration | `pytest tests/test_api.py::test_simulate_invalid_input_returns_422` | ❌ Wave 0 |
| API-03 | CORS headers present in response | integration | `pytest tests/test_api.py::test_cors_headers` | ❌ Wave 0 |
| API-04 | GET /health returns 200 | integration | `pytest tests/test_api.py::test_health_returns_200` | ❌ Wave 0 |
| API-05 | Manual deploy verification | manual | (deployment log review) | N/A |

### Sampling Rate
- **Per task commit:** `cd brewos-engine && python -m pytest tests/test_cross_method_tolerance.py tests/test_api.py -x -q`
- **Per wave merge:** `cd brewos-engine && python -m pytest -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_cross_method_tolerance.py` — covers VAL-03 (6-method fast-vs-accurate parametrize)
- [ ] `tests/test_api.py` — covers API-01, API-02, API-03, API-04 (requires `brewos/api.py` to exist first)
- [ ] `fastapi` install: `pip install "fastapi>=0.115,<0.136"` — required before api.py can be imported

---

## Deployment: Railway

### Why Railway over Fly.io

| Factor | Railway | Fly.io |
|--------|---------|--------|
| Cold starts | None — always-on instances | Machines may pause (cold start delays) |
| Setup complexity | GitHub push → auto-deploy | CLI-first (`fly launch`), steeper curve |
| Python detection | Auto-detects Procfile + requirements.txt | Needs `fly launch` to generate fly.toml |
| Pricing (2026) | $5/month subscription includes $5 usage | ~$3-4/month usage-based; waives invoices under $5 |
| FastAPI template | One-click deploy available | `fly launch` generates configuration |

Railway is recommended: no cold starts means the `/health` ping works reliably, and auto-detection means the Procfile alone is sufficient config.

### Minimal Railway Deployment Config

**File 1: `brewos-engine/Procfile`**
```
web: uvicorn brewos.api:app --host 0.0.0.0 --port ${PORT:-8000}
```

**File 2: `brewos-engine/requirements.txt`** (Railway reads this OR pyproject.toml)

Railway's railpack builder supports pyproject.toml natively — no separate requirements.txt needed if `fastapi` is added to `[project].dependencies`.

**Deployment steps:**
1. Push `brewos-engine/` to a GitHub repository (or the submodule already is one)
2. Create a new Railway project → "Deploy from GitHub repo"
3. Select the `brewos-engine` repository
4. Railway auto-detects Python + Procfile
5. Service URL is generated (e.g., `https://brewos-engine-production.up.railway.app`)
6. Verify: `curl https://your-service.up.railway.app/health` returns `{"status":"ok"}`

**Environment variables to set in Railway dashboard:**
- None required for basic operation
- Optional: `PYTHONUNBUFFERED=1` for log streaming

---

## Sources

### Primary (HIGH confidence)
- FastAPI official docs (https://fastapi.tiangolo.com/tutorial/body/) — request body pattern with Pydantic BaseModel
- FastAPI official docs (https://fastapi.tiangolo.com/tutorial/handling-errors/) — RequestValidationError handler
- FastAPI official docs (https://fastapi.tiangolo.com/tutorial/cors/) — CORSMiddleware parameters and credentials constraint
- FastAPI official docs (https://fastapi.tiangolo.com/tutorial/testing/) — TestClient pattern, POST testing, 422 testing
- PyPI registry (pip index versions fastapi) — confirmed fastapi 0.135.2 latest, 0.115.x stable
- Local environment probe — confirmed Python 3.12.5, uvicorn 0.42.0, httpx 0.28.1, pytest 9.0.2, pydantic 2.12.5, starlette 1.0.0

### Secondary (MEDIUM confidence)
- Ritza.co Railway vs Fly.io comparison (https://ritza.co/articles/gen-articles/cloud-hosting-providers/fly-io-vs-railway/) — cold start and pricing comparison, cross-verified with Railway docs
- Railway FastAPI guide (https://docs.railway.com/guides/fastapi) — Procfile pattern, railpack auto-detection
- React Native networking docs and multiple GitHub issues — confirmed native RN apps do not enforce CORS; browser context (Expo Web) does

### Tertiary (LOW confidence)
- Railway Nixpacks deprecation in favour of railpack — mentioned in multiple 2024 search results; not directly verified in an official changelog

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against PyPI registry and local environment
- Architecture patterns: HIGH — verified against official FastAPI docs
- Deployment config: MEDIUM — Railway Procfile pattern verified; exact railpack behaviour not tested in this environment
- Pitfalls: HIGH for starlette conflict (observed in environment); MEDIUM for Moka Pot tolerance (existing solver test passes but cross-method scenario untested)

**Research date:** 2026-03-28
**Valid until:** 2026-05-28 (FastAPI releases frequently; check for breaking changes if > 60 days old)

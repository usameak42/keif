# Testing Patterns

**Analysis Date:** 2026-04-01

---

## Test Frameworks

### Python Engine

**Runner:** pytest (optional dev dependency in `pyproject.toml`)

**Config:** `pyproject.toml`
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
```

**Run Commands:**
```bash
pytest tests/                   # Run all tests
pytest tests/ -v               # Verbose output (shows test IDs and print output)
pytest tests/ -v -s            # Verbose + print stdout (useful for tolerance reports)
pytest tests/test_api.py       # Run single file
pytest -k "fast"               # Run tests matching keyword
```

**Additional dependencies (dev):** `pytest`, `httpx` (required for FastAPI `TestClient`)

### Mobile (React Native)

**Runner:** Jest 29 with `jest-expo` preset

**Config:** `brewos-engine/keif-mobile/jest.config.js`

**Run Commands:**
```bash
cd brewos-engine/keif-mobile
npm test            # Run all tests
npm test -- --watch # Watch mode
```

---

## Python Test Inventory (21 files)

### PoC / Smoke Tests

**`tests/test_immersion_poc.py`** (41 lines)
- Runs `poc/moroney_2016_immersion_ode.py` as a subprocess
- Asserts EY ≈ 21.51% (±0.05%) and TDS ≈ 1.291% (±0.005%)
- Purpose: regression guard on the original PoC script

### Solver Tests

**`tests/test_immersion_solver.py`**
- Tests: `solve_accurate()` from `brewos/solvers/immersion.py`
- Standard scenario: 15g/250g/93°C/medium/240s/grind_size=500µm
- Covers: output shape, Liang scaling (EY within 0.05% of 21.51%), curve monotonicity, NaN/bound clipping

**`tests/test_fast_mode.py`**
- Tests: `solve_fast()` and `solve_accurate()` from `brewos/solvers/immersion.py`
- Covers: output shape (`TestFastOutputShape`), fast vs accurate tolerance ±2% (`TestFastAccurateTolerance`), performance < 1ms median over 100 runs (`TestFastPerformance`), French Press dispatcher (`TestFrenchPressDispatches`)
- Uses module-level `SimulationInput` constants (`STANDARD_FAST`, `STANDARD_ACCURATE`) — not pytest fixtures
- Uses `time.perf_counter_ns()` for nanosecond timing

**`tests/test_percolation_solver.py`**
- Tests: `solve_accurate()` from `brewos/solvers/percolation.py`
- Standard scenario: V60 15g/250g/93°C/600µm/180s
- Covers: output validity (SOLV-03), Batali 2020 validation EY within ±1.5% of 20% (VAL-02), V60/Kalita/Espresso distinct EY (SC-3), spatial gradient present

**`tests/test_percolation_fast.py`**
- Tests: `solve_fast()` from `brewos/solvers/percolation.py`
- Covers: performance < 1ms (SOLV-04), fast within ±2% of accurate, all output fields populated
- Uses `model_copy(update={"mode": Mode.fast})` to create fast variant

### Method Tests

**`tests/test_french_press.py`**
- Tests: `brewos/methods/french_press.py`
- Uses `@pytest.fixture` for `standard_input_accurate` and `standard_input_fast` (Comandante C40 MK4, click 25)
- Covers: 7-output completeness, flavor profile (`sweet` dominant at EY~21.5%), brew ratio value and recommendation, manual grind log-normal PSD fallback (50-point), warning generation for under/over extraction and low temp, VAL-01 accurate EY within ±1.5%, fast vs accurate within ±2%

**`tests/test_v60.py`**
- Tests: `brewos/methods/v60.py`
- Covers: accurate and fast mode output validity, EY in Batali 2020 range (18.5–21.5%), V60 distinct from French Press, channeling_risk is None

**`tests/test_kalita.py`**
- Tests: `brewos/methods/kalita.py`
- Covers: accurate and fast mode output validity, Kalita distinct from V60, channeling_risk is None

**`tests/test_espresso.py`**
- Tests: `brewos/methods/espresso.py`, `brewos/utils/channeling.py`
- Covers: channeling risk range [0,1], finer grind → higher risk, espresso vs pour-over risk, standard recipe EY 18–22% (METH-04), channeling_risk populated in output (OUT-08), high channeling risk appended to warnings

**`tests/test_moka_pot.py`**
- Tests: `brewos/methods/moka_pot.py`
- Covers: accurate mode EY 15–22%, fast mode validity, both modes within ±2% of each other, `MOKA_POT_DEFAULTS` keys present

**`tests/test_aeropress.py`**
- Tests: `brewos/methods/aeropress.py`
- Covers: hybrid EY exceeds steep-only EY by ≥1%, EY range 15–26%, complete output, fast vs accurate ±2%, fast speed < 5ms per run (100-iteration average)

### Cross-Method Tests

**`tests/test_all_methods.py`**
- Parametrized: all 6 methods × 2 modes = 12 test cases
- Covers: complete SimulationOutput returned, EY in 5–30%, non-empty extraction_curve and psd_curve, flavor_profile non-None, mode_used correct
- Additional: each method EY > 5% (not stuck at zero) in fast mode

**`tests/test_cross_method_tolerance.py`**
- Parametrized: all 6 methods (VAL-03)
- Covers: fast vs accurate EY within ±2.0% absolute for every method
- Espresso and moka_pot use extended brew_time to allow fast-mode convergence (known calibration limitation documented in test comments)
- Prints fast/accurate/diff values for every method in `-v` output

**`tests/test_extended_outputs.py`**
- Parametrized: all 6 methods × 2 modes = 12 test cases per output field
- Covers: all 7 core output fields present and plausible, temperature_curve (OUT-10), sca_position with valid zone string (OUT-11), caffeine_mg_per_ml positive (OUT-13), EUI for percolation methods accurate mode (OUT-07), EUI=1.0 for immersion methods, puck_resistance espresso-only (OUT-12), channeling_risk espresso-only (OUT-08), Moka EUI is None, Moka temperature curve is isothermal (flat)

### Model and Utility Tests

**`tests/test_model_updates.py`**
- Tests: `brewos/models/inputs.py`, `brewos/models/outputs.py`, `brewos/utils/output_helpers.py`
- Covers: `pressure_bar` accepts 9.0 and defaults to None, negative pressure_bar raises ValueError, `channeling_risk` field in output, `resolve_psd()` returns `(float, List[PSDPoint])`, `estimate_flavor_profile(20.0)` returns sweet-dominant profile, `generate_warnings()` flags over-extraction for EY>24%, `brew_ratio_recommendation()` returns non-empty string

**`tests/test_co2_bloom.py`**
- Tests: `brewos/utils/co2_bloom.py`
- Uses class-based grouping (`TestCO2ParamsStructure`, `TestCO2BloomFactorRange`, `TestCO2BloomRoastDependence`, `TestCO2BloomOldBeans`)
- Covers: CO2_PARAMS structure (3 roast levels × 5 sub-keys), factor range [0,1], factor increases over time, factor near 1.0 after bloom window (t=300s), dark roast suppresses more than light, 60-day-old beans have negligible CO2

**`tests/test_grinder_db.py`**
- Tests: `brewos/grinders/__init__.py` (load_grinder), `brewos/utils/psd.py` (generate_lognormal_psd)
- Covers: Comandante C40 MK4 click 20 median ~600µm, bimodal PSD structure (fines fraction), click interpolation, unknown grinder raises ValueError("not found"), click 0 raises ValueError("out of range"), log-normal PSD 50 points summing to ~1.0, log-normal peak between 300–700µm

**`tests/test_grinder_presets.py`**
- Tests: `brewos/grinders/__init__.py` (load_grinder) for all 3 grinder models
- Parametrized: Comandante C40 MK4, 1Zpresso J-Max, Baratza Encore with expected median_um ranges
- Covers: load and median within range, PSD bimodal shape (50 points, fractions sum ~1.0), out-of-range raises ValueError, Baratza fines fraction > Comandante (electric vs hand grinder characteristic)

### API Tests

**`tests/test_api.py`**
- Tests: FastAPI app in `brewos/api.py` via `TestClient`
- Covers: `/health` returns 200 + `{"status": "ok"}` (API-04), `/simulate` returns 200 with positive TDS and EY (API-01), invalid input (water_temp=150) returns 422 with `errors` list mentioning field name (API-02), CORS `access-control-allow-origin: *` header on OPTIONS request (API-03)

---

## Test Structure Patterns

### Module-Level Fixtures vs pytest Fixtures

Two patterns coexist:

**Module-level constants (most common):**
```python
STANDARD_FAST = SimulationInput(
    coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
    grind_size=500.0, brew_time=240.0,
    roast_level=RoastLevel.medium,
    method=BrewMethod.french_press, mode=Mode.fast,
)
```
Used in: `test_fast_mode.py`, `test_percolation_fast.py`, `test_percolation_solver.py`, `test_aeropress.py`, `test_v60.py`, `test_kalita.py`, `test_moka_pot.py`

**pytest fixtures (for grinder-name inputs):**
```python
@pytest.fixture
def standard_input_accurate():
    return SimulationInput(
        grinder_name="Comandante C40 MK4",
        grinder_setting=25,
        ...
    )
```
Used in: `test_french_press.py`

**`model_copy(update={...})` for variants:**
```python
V60_FAST = V60_ACCURATE.model_copy(update={"mode": Mode.fast})
```
Used in: `test_percolation_fast.py`, `test_moka_pot.py`, `test_aeropress.py`, `test_v60.py`, `test_kalita.py`

### Parametrize Patterns

```python
@pytest.mark.parametrize("method_name", _METHODS.keys())
@pytest.mark.parametrize("mode", [Mode.fast, Mode.accurate])
def test_method_returns_valid_output(method_name, mode):
    ...
```
Stacking two `parametrize` decorators produces the Cartesian product (12 combinations for 6 methods × 2 modes).

### Class-Based Grouping

Used in `test_fast_mode.py` and `test_co2_bloom.py` to group related tests:
```python
class TestFastOutputShape:
    def test_fast_output_shape(self): ...
    def test_fast_curve_shape(self): ...
```
No `setUp`/`tearDown`; grouping is semantic only.

### Assertion Patterns

**Numeric tolerance (floating-point physics):**
```python
assert abs(result.extraction_yield - 21.51) < 1.5, (
    f"VAL-01 FAIL: EY={result.extraction_yield:.3f}% (target 21.51% ±1.5%)"
)
```

**Physical range check:**
```python
assert 5.0 <= result.extraction_yield <= 30.0, (
    f"{method_name}/{mode.value}: EY {result.extraction_yield}% outside 5-30% plausible range"
)
```

**Performance timing (nanoseconds):**
```python
times_ns = []
for _ in range(100):
    t_start = time.perf_counter_ns()
    solve_fast(STANDARD_FAST)
    t_end = time.perf_counter_ns()
    times_ns.append(t_end - t_start)
times_ns.sort()
median_ns = times_ns[len(times_ns) // 2]
assert median_ns < 1_000_000, f"solve_fast median time {median_ns / 1e6:.3f}ms exceeds 1ms target"
```

**Type/presence check:**
```python
assert isinstance(result, SimulationOutput)
assert result.mode_used in ("fast", "accurate")
assert isinstance(out.warnings, list)
```

**Error expected:**
```python
with pytest.raises(ValueError):
    load_grinder("Unknown Grinder X9000", 10)

with pytest.raises(ValueError, match="not found"):
    load_grinder("Unknown Grinder X9000", 10)
```

**pytest.approx for tolerance:**
```python
assert curve[0].t == pytest.approx(0.0, abs=1.0)
assert curve[-1].ey == pytest.approx(result.extraction_yield, rel=0.01)
```

### Test Docstrings

Every test function has a one-line docstring with the requirement ID where applicable:
```python
def test_accurate_ey_liang():
    """solve_accurate returns extraction_yield within 1.5% absolute of 21.51 (VAL-01 criterion)."""
```

---

## Mocking

**Python:** No mocking used. Tests exercise real solver and I/O code. API tests use FastAPI's `TestClient` (synchronous test client, no network):
```python
from fastapi.testclient import TestClient
from brewos.api import app
client = TestClient(app)
response = client.post("/simulate", json={...})
```

**Mobile (Jest):** All 7 mobile test files are stubs — only `expect(true).toBe(true)` passes. No mocking implemented.

---

## Mobile Test Inventory (stub files only)

All files in `brewos-engine/keif-mobile/__tests__/unit/`:

| File | Status | Planned coverage |
|------|--------|-----------------|
| `MethodSelector.test.tsx` | Stub | MOB-01: renders 6 methods, onSelect callback |
| `ParameterForm.test.tsx` | Stub | MOB-02: dose/water/temp/time fields, decimal-pad keyboard |
| `GrinderSelector.test.tsx` | Stub | MOB-03: grinder dropdown, Manual shows micron input |
| `LoadingState.test.tsx` | Stub | MOB-06: skeleton shimmer, accurate-mode text |
| `ResultsScreen.test.tsx` | Stub | MOB-07: TDS/EY callout cards, zone verdict color, ErrorCard |
| `SCAChart.test.tsx` | Stub | MOB-08: CartesianChart renders, espresso vs filter Y-axis |
| `apiClient.test.ts` | Stub | MOB-05: POST body, 422 parse, network error state |

All stubs pass with `it("stub: test infrastructure works", () => { expect(true).toBe(true); })`. No real component rendering or API mocking is implemented.

---

## Coverage Summary

### Well-Covered

- All 6 brew methods × 2 modes: smoke + output completeness
- All 13 output fields: presence and physical plausibility
- Immersion solver: Liang scaling, curve monotonicity, NaN/bounds
- Percolation solver: spatial gradient, Batali 2020 validation
- Fast mode: performance <1ms, accuracy within ±2% of accurate
- Grinder database: 3 grinders, interpolation, PSD shape, out-of-range errors
- CO2 bloom: parameter structure, factor behavior, roast dependence, age dependence
- Pydantic input validators: positive values, temp range, grind source consistency, pressure
- FastAPI: health, simulate, 422 validation errors, CORS

### Coverage Gaps

**Fast-mode calibration for espresso/moka:** Fast mode uses V60-tuned biexponential constants. At standard espresso brew_time (25s), fast-mode EY diverges >5pp from accurate. The cross-method tolerance test works around this by using 90s/240s — the underlying calibration gap is untested at realistic brew times. Tracked in `test_cross_method_tolerance.py` comments.

**Mobile app:** All 7 Jest test files are stubs. No component rendering, hook behavior, navigation, or API client tests exist. Requires `@testing-library/react-native` setup with proper mocks for `expo-sqlite`, `victory-native`, and `@shopify/react-native-skia`.

**Output helper edge cases:** `generate_warnings()` and `brew_ratio_recommendation()` happy-path tested but boundary conditions (e.g., exactly at threshold values) not covered.

**Percolation pressure solver (`brewos/solvers/pressure.py`):** No dedicated test file. Espresso and moka coverage exists via method-level tests but the solver internals are not tested in isolation.

**Integration end-to-end:** No test fires the full HTTP stack from a mobile-style JSON payload through FastAPI to solver and back. `test_api.py` covers routing but not all 6 methods via HTTP.

---

*Testing analysis: 2026-04-01*

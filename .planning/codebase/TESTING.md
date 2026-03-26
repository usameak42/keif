# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Runner:**
- pytest [version specified in pyproject.toml as optional dev dependency]
- Config: `pyproject.toml` with `[tool.pytest.ini_options]`
- Test discovery path: `tests/`

**Run Commands:**
```bash
pytest tests/                   # Run all tests
pytest tests/ -v               # Verbose output
pytest --tb=short              # Short traceback format
```

## Test Configuration

**pytest configuration in `pyproject.toml`:**
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
```

**Test file organization:**
- Single test file currently: `tests/test_immersion_poc.py` (41 lines)
- Subdirectories not yet used
- Test directory at root level alongside `brewos/` package

## Test File Organization

**Location:**
- Separate directory: `tests/` at root level (not co-located with source)
- `tests/__init__.py` present (empty)

**Naming:**
- Test files prefixed with `test_` (e.g., `test_immersion_poc.py`)
- Function names prefixed with `test_` (e.g., `test_immersion_poc_ey_and_tds()`)

## Test Structure

**Test function pattern from `tests/test_immersion_poc.py`:**
```python
def test_immersion_poc_ey_and_tds():
    result = subprocess.run(
        [sys.executable, POC_SCRIPT],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert result.returncode == 0, (
        f"PoC script exited with code {result.returncode}\n"
        f"stderr:\n{result.stderr}"
    )

    ey_match = re.search(r"EY_simulated\s*=\s*([\d.]+)", result.stdout)
    tds_match = re.search(r"TDS_simulated\s*=\s*([\d.]+)", result.stdout)

    assert ey_match, "Could not parse EY_simulated from PoC output"
    assert tds_match, "Could not parse TDS_simulated from PoC output"

    ey = float(ey_match.group(1))
    tds = float(tds_match.group(1))

    assert abs(ey - 21.51) < 0.05, f"EY = {ey:.4f} %, expected ≈ 21.51 %"
    assert abs(tds - 1.291) < 0.005, f"TDS = {tds:.4f} %, expected ≈ 1.291 %"
```

**Test Structure Patterns:**
1. **Subprocess execution**: Tests wrap the PoC script execution as a subprocess
2. **Output parsing**: Uses `re.search()` to extract numeric results from stdout
3. **Multi-stage assertions**: First checks exit code, then output presence, then value correctness
4. **Tolerance-based assertions**: Uses `abs(value - expected) < tolerance` for floating-point comparisons
5. **Informative error messages**: Assertions include formatted context showing actual vs expected values

## Test Types

**Integration Tests:**
- Current test is integration-style: runs entire PoC script as subprocess
- Validates end-to-end ODE solver + scaling + output consistency
- Tests the complete physics pipeline rather than isolated units

**Unit Tests:**
- Not yet present in codebase
- Would target: Pydantic validators, conversion functions, individual ODE calculations

**Test Coverage:**
- Currently: smoke test only (validates Phase 8 PoC equilibrium-scaled EY and TDS)
- Not comprehensive; models (`inputs.py`, `outputs.py`) lack unit tests
- No tests for validators (`must_be_positive`, `temp_in_range`, `grind_source_consistent`)

## Assertion Patterns

**Exit code verification:**
```python
assert result.returncode == 0, (
    f"PoC script exited with code {result.returncode}\n"
    f"stderr:\n{result.stderr}"
)
```

**Output presence:**
```python
assert ey_match, "Could not parse EY_simulated from PoC output"
```

**Numeric tolerance (floating-point):**
```python
assert abs(ey - 21.51) < 0.05, f"EY = {ey:.4f} %, expected ≈ 21.51 %"
```

**Pattern-based extraction from string output:**
```python
ey_match = re.search(r"EY_simulated\s*=\s*([\d.]+)", result.stdout)
ey = float(ey_match.group(1))
```

## Test Dependencies

**Standard library:**
- `subprocess` - Execute PoC script
- `re` - Parse output via regex
- `sys` - Get Python executable path
- `os` - Path manipulation

**No external testing libraries:**
- No pytest fixtures
- No conftest.py
- No mocking libraries (unittest.mock or pytest-mock)

## Test Data & Fixtures

**No fixtures defined:**
- `conftest.py` not present
- Test data hardcoded in test function
- PoC script serves as test data/scenario

**Test values (from `test_immersion_poc_ey_and_tds`):**
```python
POC_SCRIPT = os.path.join(os.path.dirname(__file__), "..", "poc", "moroney_2016_immersion_ode.py")

# Expected values for Phase 8 PoC
EY_expected  ≈ 21.51 %   (tolerance: ±0.05%)
TDS_expected ≈ 1.291 %   (tolerance: ±0.005%)
```

## Running Tests

**Basic execution:**
```bash
python -m pytest tests/
```

**With output:**
```bash
python -m pytest tests/ -v -s  # -s captures stdout, useful for debugging PoC
```

**From project root:**
- Tests discover via `pyproject.toml` configuration
- Current working directory should be `/d/Coding/Keif/brewos-engine`

## Test Coverage Gaps

**Areas without tests:**
- `brewos/models/inputs.py` - All Pydantic validators untested
  - `must_be_positive()` validator
  - `grind_size_positive()` validator
  - `temp_in_range()` validator
  - `grind_source_consistent()` model validator

- `brewos/models/outputs.py` - All output models untested
  - No tests validating ExtractionPoint, PSDPoint, FlavorProfile, SimulationOutput instantiation

- `brewos/solvers/` - Solver modules stubbed, no tests

- `brewos/methods/` - Method configs stubbed, no tests

- `brewos/utils/` - PSD utilities stubbed, no tests

**Recommendation for new tests:**
- Add unit tests for each Pydantic validator with invalid inputs (negative values, out-of-range temps, missing grinder settings)
- Add integration tests for complete simulation runs once solvers are implemented
- Consider using pytest parametrize for testing boundary conditions across multiple test cases

## Mocking & Isolation

**Current approach:**
- No mocking; tests execute real code (PoC script actually runs)
- No test isolation via fixtures or setup/teardown

**Patterns if needed in future:**
- Would use `unittest.mock.patch` for subprocess calls (though integration test style preferred)
- Would use pytest fixtures for shared test data
- Would parametrize similar test cases using `@pytest.mark.parametrize`

---

*Testing analysis: 2026-03-26*

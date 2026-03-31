# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Runner:**
- pytest [version from pyproject.toml: "pytest"]
- Config: `pyproject.toml` with section `[tool.pytest.ini_options]`
- Test discovery: configured to `testpaths = ["tests"]`

**Assertion Library:**
- Built-in Python `assert` statements (pytest native assertion rewriting)

**Run Commands:**
```bash
pytest                          # Run all tests in tests/ directory
pytest tests/test_immersion_poc.py  # Run specific test file
pytest -v                       # Verbose output
pytest --tb=short              # Shorter traceback output
```

**Note:** No coverage tool configured (no pytest-cov, coverage.py config)

## Test File Organization

**Location:**
- Co-located pattern: Tests in separate `tests/` directory (not alongside source)
- Test directory mirrors some source structure logically but not fully parallel

**Naming:**
- Pattern: `test_*.py` for test files
- Current test file: `test_immersion_poc.py` (tests PoC subprocess execution)

**Structure:**
```
tests/
├── __init__.py          # Empty init file
└── test_immersion_poc.py
```

## Test Structure

**Suite Organization:**
```python
"""
Basic smoke test for the Phase 8 PoC.

Runs the PoC script as a subprocess and asserts that the simulation produces
the expected equilibrium-scaled values:
  EY  ≈ 21.51 %   (K_liang × E_max × 100 = 0.717 × 0.30 × 100)
  TDS ≈  1.291 %  (EY / brew_ratio = 21.51 / 16.667)
"""

def test_immersion_poc_ey_and_tds():
    # Setup
    result = subprocess.run(...)

    # Parse and assert
    assert result.returncode == 0, (...)
    assert ey_match, "..."
    assert abs(ey - 21.51) < 0.05, f"..."
```

**Patterns:**
- Docstring at module level explaining test purpose and expected results
- Single test function per file (currently one integration/smoke test)
- No explicit setup/teardown fixtures (none needed for current PoC test)
- Assertions use `assert` with descriptive error messages

## Mocking

**Framework:** None currently

**Patterns:**
- No mocking framework imported (not mock, unittest.mock, or pytest-mock)
- PoC test runs actual subprocess: `subprocess.run([sys.executable, POC_SCRIPT], ...)`
- This is intentional: tests actual PoC script execution, not mocked behavior

**What to Mock (None Currently):**
- N/A — no mocking implemented; future tests should consider mocking external dependencies

**What NOT to Mock:**
- PoC script execution (current test validates subprocess works)
- Physics calculations (solvers should be tested as-is, not mocked)

## Fixtures and Factories

**Test Data:**
- None implemented in current test suite
- PoC test uses hardcoded constants from PoC script itself
- No test factory pattern or fixtures

**Location:**
- Would go in `tests/fixtures.py` or `conftest.py` (pytest convention)
- Currently: none exist

## Coverage

**Requirements:** None enforced

**View Coverage:**
- No coverage tool configured
- To add: `pytest-cov` and run `pytest --cov=brewos tests/`

## Test Types

**Unit Tests:**
- Not yet implemented
- Should test: validators in `brewos/models/inputs.py` (field_validator, model_validator methods)
- Should test: individual solver functions once extracted from PoC

**Integration Tests:**
- `test_immersion_poc.py` is integration-level: validates PoC subprocess produces correct numeric outputs
- Scope: End-to-end simulation pipeline (input → solve → output parsing)
- Approach: Subprocess execution with stdout capture and regex parsing

**E2E Tests:**
- Not implemented
- Future: Would test complete simulation workflow including grinder lookup, method selection, output parsing

## Common Patterns

**Async Testing:**
- Not applicable (Python project without async/await)

**Error Testing:**
```python
# No error tests currently, but example pattern:
# Would use pytest.raises() for exception testing

import pytest

def test_negative_dose_raises_error():
    with pytest.raises(ValueError, match="must be positive"):
        SimulationInput(
            coffee_dose=-1.0,
            water_amount=300.0,
            water_temp=93.0,
            grind_size=800.0,
            brew_time=240.0,
            roast_level=RoastLevel.medium
        )
```

**Subprocess Testing:**
- Current pattern from `test_immersion_poc.py`:

```python
import subprocess
import sys
import re

def test_immersion_poc_ey_and_tds():
    result = subprocess.run(
        [sys.executable, POC_SCRIPT],
        capture_output=True,
        text=True,
        encoding="utf-8",  # Important: explicit UTF-8 encoding for Windows
    )
    assert result.returncode == 0, (
        f"PoC script exited with code {result.returncode}\n"
        f"stderr:\n{result.stderr}"
    )

    # Parse output with regex
    ey_match = re.search(r"EY_simulated\s*=\s*([\d.]+)", result.stdout)
    tds_match = re.search(r"TDS_simulated\s*=\s*([\d.]+)", result.stdout)

    # Assert expectations with tolerance
    assert abs(ey - 21.51) < 0.05, f"EY = {ey:.4f} %, expected ≈ 21.51 %"
```

**Subprocess Encoding:**
- Critical detail: `encoding="utf-8"` specified explicitly in `subprocess.run()`
- Reason: Test validates PoC with Unicode characters (°C, μm, ≈) in output
- Pattern ensures correct parsing across platforms (Windows, macOS, Linux)

## Validation Testing

Pydantic validators in `brewos/models/inputs.py` should be tested. Example test pattern:

```python
# Test field validators
def test_coffee_dose_positive():
    with pytest.raises(ValueError, match="must be positive"):
        SimulationInput(
            coffee_dose=0,  # Invalid
            water_amount=300.0,
            water_temp=93.0,
            grind_size=800.0,
            brew_time=240.0,
            roast_level=RoastLevel.medium
        )

# Test model validators (cross-field)
def test_grind_source_consistent():
    with pytest.raises(ValueError, match="grinder_setting is required"):
        SimulationInput(
            coffee_dose=20.0,
            water_amount=300.0,
            water_temp=93.0,
            grinder_name="Baratza Encore",  # Provided without...
            grinder_setting=None,  # ...setting
            brew_time=240.0,
            roast_level=RoastLevel.medium
        )

# Test valid input
def test_valid_input_with_grinder():
    sim = SimulationInput(
        coffee_dose=20.0,
        water_amount=300.0,
        water_temp=93.0,
        grinder_name="Baratza Encore",
        grinder_setting=15,
        brew_time=240.0,
        roast_level=RoastLevel.medium
    )
    assert sim.coffee_dose == 20.0
```

## Test Organization Best Practices

**When Adding Tests:**

1. **Unit tests for validators**: Go in `tests/test_models.py`
   - Test each `@field_validator` and `@model_validator` separately
   - Use parametrized tests for multiple valid/invalid cases

2. **Solver tests**: Go in `tests/test_solvers.py` (when solvers are extracted from PoC)
   - Test numerical accuracy against known results
   - Test edge cases (zero values, extreme parameters)

3. **Integration tests**: Keep in `tests/test_*_poc.py` or `tests/test_integration.py`
   - Test full simulation pipeline
   - Validate outputs against expected ranges

4. **Subprocess tests**: Use `encoding="utf-8"` always
   - Capture both stdout and stderr
   - Check return code first, then parse output

---

*Testing analysis: 2026-03-26*

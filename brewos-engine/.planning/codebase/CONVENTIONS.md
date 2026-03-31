# Coding Conventions

**Analysis Date:** 2026-03-26

## Naming Patterns

**Files:**
- `snake_case.py` for all Python module files
- Method modules: descriptive names (`aeropress.py`, `french_press.py`, `v60.py`, `kalita.py`, `moka_pot.py`, `espresso.py`)
- Solver modules: descriptive names (`immersion.py`, `percolation.py`, `pressure.py`)
- Test files: `test_*.py` pattern (e.g., `test_immersion_poc.py`)

**Functions:**
- `snake_case` for all function names
- Validator methods follow Pydantic convention: `must_be_positive`, `grind_size_positive`, `temp_in_range`
- Private functions: prefix with underscore (not observed in current codebase but Python convention)

**Variables:**
- `snake_case` for all variable names
- Domain-specific abbreviations: `c_h` (coffee concentration bulk), `c_v` (coffee concentration intragranular), `psi_s` (surface fraction), `ey` (extraction yield), `tds` (total dissolved solids)
- Constants: `UPPERCASE_SNAKE_CASE` (e.g., `POC_SCRIPT`)
- Class attributes: `snake_case`

**Types/Classes:**
- `PascalCase` for all class names (Pydantic models and Enums)
- Enum members: `lowercase` (e.g., `RoastLevel.light`, `Mode.fast`)
- Example classes: `SimulationInput`, `SimulationOutput`, `ExtractionPoint`, `PSDPoint`, `FlavorProfile`

## Code Style

**Formatting:**
- No explicit formatter configured (no `.prettierrc`, `black`, or `autopep8` config found)
- Indentation: 4 spaces (Python standard)
- Line continuations: Natural Python style (parentheses, no explicit continuation)

**Linting:**
- No explicit linter configured (no `.eslintrc` or `pylint` config found)
- Follow PEP 8 conventions by convention, not automation

## Import Organization

**Order:**
1. Standard library imports (`sys`, `os`, `re`, `subprocess`)
2. Third-party imports (`numpy`, `scipy`, `pydantic`, `enum`, `typing`)
3. Local package imports (from brewos modules)

**Example from `brewos/models/inputs.py`:**
```python
from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator
```

**Path Aliases:**
- No path aliases configured (`tsconfig.json`/`jsconfig.json` not applicable to Python)
- Use absolute imports from package root: `from brewos.models import SimulationInput`

## Error Handling

**Patterns:**
- Pydantic field validators raise `ValueError` with descriptive messages
- Validation messages include units when domain-relevant: `"grind_size must be > 0 μm"`, `"water_temp must be between 0 and 100 °C (exclusive)"`
- Model validators use Pydantic's `@model_validator(mode="after")` for cross-field validation
- No try/except blocks in models or validators (validation is declarative via Pydantic)

**Example from `brewos/models/inputs.py`:**
```python
@field_validator("coffee_dose", "water_amount", "brew_time")
@classmethod
def must_be_positive(cls, v: float) -> float:
    if v <= 0:
        raise ValueError("must be positive")
    return v

@model_validator(mode="after")
def grind_source_consistent(self) -> "SimulationInput":
    has_grinder = self.grinder_name is not None
    has_setting = self.grinder_setting is not None
    has_manual = self.grind_size is not None

    if has_grinder and not has_setting:
        raise ValueError(
            "grinder_setting is required when grinder_name is provided"
        )
```

## Logging

**Framework:** Python standard `print()` for console output

**Patterns:**
- No centralized logging framework configured
- Output handled via stdout/stderr
- Test captures stdout with `subprocess.run(..., capture_output=True, text=True, encoding="utf-8")`
- Domain-specific output format: structured text for numeric results (see `test_immersion_poc.py` parsing `EY_simulated` and `TDS_simulated`)

## Comments

**When to Comment:**
- Docstrings on all modules (one-line at top): `"""French Press — imports immersion solver"""`
- Docstrings on all classes (multi-line with description)
- Docstrings on validators explaining validation rule
- Inline comments for complex domain logic (parameters, equations, references)
- Reference citations to papers/sources: `# Source: Physics/papers/...` or `# Source: Physics/equations/...`

**JSDoc/TSDoc:**
- Not applicable (Python project)
- Use Python docstrings with triple quotes

**Example from PoC:**
```python
# ─────────────────────────────────────────────────────────────────────────────
# VAULT PARAMETERS — Moroney 2015, Table 1 (fine grind / Jacobs Kronung)
# Source: Physics/papers/Moroney et al., 2015.md
# ─────────────────────────────────────────────────────────────────────────────
alpha_n = 0.1833        # Kernel internal mass-transfer fitting param [-]
beta_n  = 0.0447        # Surface dissolution fitting param [-]
D_h     = 2.2e-9        # Effective diffusion of coffee in water [m²/s]
```

## Function Design

**Size:**
- Validators typically 3–5 lines
- No observed large functions in models (domain logic delegates to solvers)
- PoC script longer (~200+ lines) for full simulation pipeline

**Parameters:**
- Type annotations on all parameters: `v: float`, `cls` for Pydantic validators
- Use `Optional[T]` from `typing` for nullable parameters: `Optional[str] = None`
- Defaults use `= None` for optional fields

**Return Values:**
- Type annotations on all returns: `-> float`, `-> "SimulationInput"`
- Validators return the validated/transformed value
- Model validators return `self`

## Module Design

**Exports:**
- No explicit `__all__` in `__init__.py` files
- Init files contain docstrings describing module contents
- Examples:
  - `brewos/models/__init__.py`: `"BrewOS Pydantic input/output models."`
  - `brewos/methods/__init__.py`: `"BrewOS method configs: french_press, v60, kalita, espresso, moka_pot, aeropress."`

**Barrel Files:**
- Not used; each module has minimal `__init__.py` with only docstring
- Direct imports from submodules expected: `from brewos.models.inputs import SimulationInput`

## Type Hints

**Coverage:**
- All parameters and returns have type hints
- Use `typing` module for complex types: `Optional[float]`, `List[ExtractionPoint]`
- Pydantic models inherit from `BaseModel` and declare typed fields with defaults

**Example from `brewos/models/outputs.py`:**
```python
from typing import List
from pydantic import BaseModel

class SimulationOutput(BaseModel):
    tds_percent: float
    extraction_yield: float
    extraction_curve: List[ExtractionPoint]
    psd_curve: List[PSDPoint]
```

---

*Convention analysis: 2026-03-26*

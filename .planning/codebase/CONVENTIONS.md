# Coding Conventions

**Analysis Date:** 2026-03-26

## Naming Patterns

**Files:**
- Module names: lowercase with underscores for multi-word names (e.g., `moroney_2016_immersion_ode.py`)
- Class files match their primary class name or functional purpose
- Init files use `__init__.py` with module docstrings

**Functions:**
- Function names: lowercase with underscores (snake_case) — example: `moroney_ode()`, `grind_size_positive()`
- Validator functions prefixed with intent: `must_be_positive()`, `temp_in_range()`, `grind_source_consistent()`
- Private functions not explicitly marked; follow same snake_case convention

**Variables:**
- Local variables: lowercase snake_case (e.g., `coffee_dose`, `brew_time`, `scale_factor`)
- Constants: UPPERCASE snake_case (e.g., `K_liang`, `E_max`, `rho_w`)
- Physics parameters prefixed with scope: `k_sv1`, `k_sv2`, `phi_h`, `psi_s` (following domain convention)
- Abbreviated variable names aligned with domain — extraction yields use `ey`, TDS uses `tds_percent`

**Types:**
- Enum classes inherit from `str, Enum` for string-based enums (example: `class RoastLevel(str, Enum)`)
- Pydantic BaseModel classes use CamelCase (e.g., `SimulationInput`, `ExtractionPoint`, `FlavorProfile`)
- Optional types explicitly annotated with `Optional[Type]` from typing

## Code Style

**Formatting:**
- No linting or formatting tool configured (no .eslintrc, .prettierrc, or similar)
- Indentation: 4 spaces (Python standard)
- Line lengths: not constrained; longest observed line is ~95 characters in PoC
- Two blank lines between module-level definitions (between classes, between function groups)
- One blank line within class definitions between method definitions

**Comments:**
- Inline comments on same line with right-alignment (e.g., `coffee_dose: float          # g`)
- Comments indicate units or clarifications, right-padded with spaces for alignment
- Block comments introduce conceptual sections with multiple `#` delimiter lines
- Section headers use format: `# ─────────────────────────────────────────────────────────`

## Import Organization

**Order:**
1. Standard library imports (`sys`, `os`, `re`, `subprocess`)
2. Third-party imports (`numpy`, `scipy`, `pydantic`, `matplotlib`)
3. Local/relative imports (none observed in current codebase)

**Path Aliases:**
- Not used; relative imports via package structure

**Import Style:**
- `from module import Class, function` for specific imports
- `from enum import Enum` (type imports explicit)
- `from typing import Optional, List` (all type hints explicit)

## Error Handling

**Patterns:**
- Validation errors raised via Pydantic validators using `ValueError` with descriptive message
- Validators use `@field_validator` for single-field rules and `@model_validator(mode="after")` for cross-field rules
- Message format: `"field_name must be condition"` (lowercase, direct language)
- ODE solver failures raised with `RuntimeError(f"message: {detail}")` for fatal errors
- No try/catch blocks in business logic; validation delegated to Pydantic

**Example from `brewos/models/inputs.py`:**
```python
@field_validator("coffee_dose", "water_amount", "brew_time")
@classmethod
def must_be_positive(cls, v: float) -> float:
    if v <= 0:
        raise ValueError("must be positive")
    return v
```

## Documentation

**Module Docstrings:**
- One-line docstring at top of file in quotes (no triple-quotes unless multi-line needed)
- Format: `"Description — reference if applicable"`
- Example: `"Pydantic input model for BrewOS simulation — per architecture_spec.md §3."`

**Class Docstrings:**
- Triple-quoted single or multi-line docstring immediately after class definition
- Format: `"""Purpose of class."""` or multi-line with bullet points
- Example: `"""All parameters required to run a BrewOS extraction simulation."""`

**Field Docstrings:**
- Inline comments after type annotation showing units and clarifications
- Format: `field_name: Type  # unit or description`

**Function Docstrings:**
- Inline comments describing purpose if needed; full docstring only for complex functions

## Type Hints

**Usage:**
- All function parameters and return types explicitly type-hinted
- Pydantic model fields include type annotations with Optional for nullable fields
- No implicit `Any` types
- Example: `def must_be_positive(cls, v: float) -> float:`

**Optional Pattern:**
- Used explicitly: `Optional[float] = None` (not `float | None`)
- Used for grinder parameters that can be None: `grinder_name: Optional[str] = None`

## Model Design

**Pydantic Models:**
- Inherit from `BaseModel` directly
- No custom `__init__` methods; Pydantic handles initialization
- Validators use `@field_validator` (single field) and `@model_validator` (multi-field)
- Fields with defaults must come after required fields
- Model classes used for both input (`SimulationInput`) and output (`SimulationOutput`) contracts

**Enum Design:**
- String enums inherit from `str, Enum` for JSON serialization
- Enum values are lowercase strings matching the enum member name
- Example: `light = "light"` (member and value identical)

## Numerical Code Patterns

**Constants:**
- Physics constants defined as module-level variables
- Grouped by source (VAULT PARAMETERS, ESTIMATED PARAMETERS, etc.)
- Includes source comments with paper references and vault locations

**Computations:**
- Intermediate calculations stored in named variables for clarity
- Clamping/clipping done via `max(0.0, min(var, limit))` pattern
- ODE systems defined in separate functions
- Array operations use NumPy with type-checking (non-negative enforcement)

**Example from `poc/moroney_2016_immersion_ode.py`:**
```python
c_h   = max(0.0, min(c_h,   c_sat))      # Clamp to valid range
c_v   = max(0.0, min(c_v,   c_sat))
psi_s = max(0.0, min(psi_s, 1.0))
```

## Spacing & Whitespace

**Blank Lines:**
- Two blank lines between module-level class and function definitions
- One blank line between methods in classes
- Blank lines within functions to separate logical blocks (optional)

**Within Declarations:**
- Inline comments right-aligned using spaces: `field: Type  # comment`
- Alignment in Pydantic models creates visual column structure
- Function signatures on single line unless very long

---

*Convention analysis: 2026-03-26*

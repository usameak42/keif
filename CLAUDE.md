<!-- GSD:project-start source:PROJECT.md -->
## Project

**Keif (BrewOS)**

Keif is a physics-based coffee extraction simulation engine delivered as a cross-platform mobile app (iOS + Android via Expo/React Native). It uses peer-reviewed extraction models (Moroney, Maille, Liang) to let technically-minded home baristas predict brew outcomes — TDS%, extraction yield, flavor profile — before touching a kettle. It is not a recipe app; it is a numerical simulation tool.

**Core Value:** **Physically accurate, real-time coffee extraction simulation** — predict TDS% and EY% from grinder settings, dose, and water parameters before brewing, across all 6 major brew methods.

### Constraints

- **Stack**: Python 3.11+ / NumPy / SciPy / Pydantic for engine — locked by architecture spec
- **Stack**: FastAPI for backend — locked
- **Stack**: Expo / React Native for mobile — locked (cross-platform requirement)
- **Stack**: Victory Native for charts — locked by React Native compatibility
- **Physics**: All models must be traceable to published papers — portfolio-grade codebase
- **Accuracy**: Accurate mode must reproduce published EY% within ±1.5% RMSE (SciPy backend)
- **Performance**: Fast mode < 1ms, Accurate mode < 4s end-to-end
- **Repo**: `brewos-engine/` is the GitHub repo containing both the engine and mobile app; `.planning/` lives at root (local-only)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Python 3.11+ - Core physics simulation engine, models, and solvers
- JSON - Grinder database and configuration data storage
## Runtime
- Python 3.11 or higher (specified in `pyproject.toml`)
- pip/setuptools - Standard Python package management
- Lockfile: Not detected
## Frameworks
- Pydantic 2.0+ - Input/output data validation and serialization in `brewos/models/`
- pytest - Test framework (optional dev dependency in `pyproject.toml`)
- setuptools >= 68 - Package building and distribution
## Key Dependencies
- scipy - Numerical computation, ODE/PDE solving (required for physics simulations)
- numpy - Array and numerical operations (required for scientific computation)
- pydantic >= 2.0 - Data validation models for SimulationInput and output serialization
- pytest - Testing framework for validation and smoke tests
## Configuration
- Configuration via environment variables not detected in current codebase
- Parameters passed programmatically to SimulationInput model
- `pyproject.toml` - Single source of truth for dependencies, Python version, and test configuration
- setuptools.backends.legacy for build system
## Platform Requirements
- Python 3.11+
- pip/setuptools for dependency management
- pytest for running test suite
- Python 3.11+
- scipy, numpy, pydantic runtime dependencies only
- No external services or databases required (standalone physics engine)
## Notable Characteristics
- **No external API dependencies** - Pure Python scientific computing
- **No web framework** - Designed as computation library, not web service
- **JSON-based grinder data** - Static configuration stored in `brewos/grinders/comandante_c40_mk4.json`
- **Minimal dependencies** - Only scipy, numpy, pydantic required (lightweight for a physics engine)
- **Type-safe via Pydantic** - All inputs validated through SimulationInput model in `brewos/models/inputs.py`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Module names: lowercase with underscores for multi-word names (e.g., `moroney_2016_immersion_ode.py`)
- Class files match their primary class name or functional purpose
- Init files use `__init__.py` with module docstrings
- Function names: lowercase with underscores (snake_case) — example: `moroney_ode()`, `grind_size_positive()`
- Validator functions prefixed with intent: `must_be_positive()`, `temp_in_range()`, `grind_source_consistent()`
- Private functions not explicitly marked; follow same snake_case convention
- Local variables: lowercase snake_case (e.g., `coffee_dose`, `brew_time`, `scale_factor`)
- Constants: UPPERCASE snake_case (e.g., `K_liang`, `E_max`, `rho_w`)
- Physics parameters prefixed with scope: `k_sv1`, `k_sv2`, `phi_h`, `psi_s` (following domain convention)
- Abbreviated variable names aligned with domain — extraction yields use `ey`, TDS uses `tds_percent`
- Enum classes inherit from `str, Enum` for string-based enums (example: `class RoastLevel(str, Enum)`)
- Pydantic BaseModel classes use CamelCase (e.g., `SimulationInput`, `ExtractionPoint`, `FlavorProfile`)
- Optional types explicitly annotated with `Optional[Type]` from typing
## Code Style
- No linting or formatting tool configured (no .eslintrc, .prettierrc, or similar)
- Indentation: 4 spaces (Python standard)
- Line lengths: not constrained; longest observed line is ~95 characters in PoC
- Two blank lines between module-level definitions (between classes, between function groups)
- One blank line within class definitions between method definitions
- Inline comments on same line with right-alignment (e.g., `coffee_dose: float          # g`)
- Comments indicate units or clarifications, right-padded with spaces for alignment
- Block comments introduce conceptual sections with multiple `#` delimiter lines
- Section headers use format: `# ─────────────────────────────────────────────────────────`
## Import Organization
- Not used; relative imports via package structure
- `from module import Class, function` for specific imports
- `from enum import Enum` (type imports explicit)
- `from typing import Optional, List` (all type hints explicit)
## Error Handling
- Validation errors raised via Pydantic validators using `ValueError` with descriptive message
- Validators use `@field_validator` for single-field rules and `@model_validator(mode="after")` for cross-field rules
- Message format: `"field_name must be condition"` (lowercase, direct language)
- ODE solver failures raised with `RuntimeError(f"message: {detail}")` for fatal errors
- No try/catch blocks in business logic; validation delegated to Pydantic
## Documentation
- One-line docstring at top of file in quotes (no triple-quotes unless multi-line needed)
- Format: `"Description — reference if applicable"`
- Example: `"Pydantic input model for BrewOS simulation — per architecture_spec.md §3."`
- Triple-quoted single or multi-line docstring immediately after class definition
- Format: `"""Purpose of class."""` or multi-line with bullet points
- Example: `"""All parameters required to run a BrewOS extraction simulation."""`
- Inline comments after type annotation showing units and clarifications
- Format: `field_name: Type  # unit or description`
- Inline comments describing purpose if needed; full docstring only for complex functions
## Type Hints
- All function parameters and return types explicitly type-hinted
- Pydantic model fields include type annotations with Optional for nullable fields
- No implicit `Any` types
- Example: `def must_be_positive(cls, v: float) -> float:`
- Used explicitly: `Optional[float] = None` (not `float | None`)
- Used for grinder parameters that can be None: `grinder_name: Optional[str] = None`
## Model Design
- Inherit from `BaseModel` directly
- No custom `__init__` methods; Pydantic handles initialization
- Validators use `@field_validator` (single field) and `@model_validator` (multi-field)
- Fields with defaults must come after required fields
- Model classes used for both input (`SimulationInput`) and output (`SimulationOutput`) contracts
- String enums inherit from `str, Enum` for JSON serialization
- Enum values are lowercase strings matching the enum member name
- Example: `light = "light"` (member and value identical)
## Numerical Code Patterns
- Physics constants defined as module-level variables
- Grouped by source (VAULT PARAMETERS, ESTIMATED PARAMETERS, etc.)
- Includes source comments with paper references and vault locations
- Intermediate calculations stored in named variables for clarity
- Clamping/clipping done via `max(0.0, min(var, limit))` pattern
- ODE systems defined in separate functions
- Array operations use NumPy with type-checking (non-negative enforcement)
## Spacing & Whitespace
- Two blank lines between module-level class and function definitions
- One blank line between methods in classes
- Blank lines within functions to separate logical blocks (optional)
- Inline comments right-aligned using spaces: `field: Type  # comment`
- Alignment in Pydantic models creates visual column structure
- Function signatures on single line unless very long
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Input/Output validation via Pydantic models
- Solver-method decoupling: solvers implement physics (ODE/PDE), methods declare solver selection
- Modular parameter lookup: grinder database loader for particle size distribution
- Two execution modes: fast (biexponential kinetics < 1ms) and accurate (ODE solver < 4s)
- Equilibrium scaling post-processing (Liang 2021 anchor for extraction yield)
## Layers
- Purpose: Validate and normalize all simulation parameters before physics computation
- Location: `brewos/models/inputs.py`
- Contains: `SimulationInput` (Pydantic BaseModel), `Mode` enum (fast/accurate), `RoastLevel` enum (light/medium/dark)
- Depends on: Pydantic for validation
- Used by: All solvers; called before any extraction simulation
- Purpose: Standardize simulation results with validated physics outputs
- Location: `brewos/models/outputs.py`
- Contains: `SimulationOutput` (top-level result), `ExtractionPoint` (time-resolved extraction curve), `PSDPoint` (particle size distribution), `FlavorProfile` (sour/sweet/bitter scores)
- Depends on: Pydantic for schema validation
- Used by: All solver implementations; returned to caller
- Purpose: Implement peer-reviewed physics models (ODE/PDE systems) for extraction kinetics
- Location: `brewos/solvers/`
- Contains:
- Depends on: SciPy (solve_ivp for ODE solving), NumPy (array operations)
- Used by: Method modules
- Purpose: Declare brew method metadata and solver selection
- Location: `brewos/methods/`
- Contains:
- Depends on: Corresponding solver modules
- Used by: Orchestration layer (future: API endpoint or CLI runner)
- Purpose: Shared tools for physics calculations and data processing
- Location: `brewos/utils/`
- Contains: `psd.py` (particle size distribution utilities)
- Depends on: NumPy, SciPy
- Used by: Solvers and methods
- Purpose: Look up particle size distributions by grinder model and setting
- Location: `brewos/grinders/`
- Contains: Grinder model definitions and lookup functions (not yet populated)
- Depends on: Method/solver layer for context (optional parameter override)
- Used by: Input validation and solver initialization
## Data Flow
- **Immutable**: Input/Output models (Pydantic frozen-compatible)
- **Transient during solve**: ODE state variables (c_h, c_v, ψ_s) computed by scipy.integrate.solve_ivp
- **Post-process**: Scale factors, time-resolved curves assembled in memory before returning
## Key Abstractions
- Purpose: Single source of truth for all simulation parameters; enforces physical constraints
- Examples: `brewos/models/inputs.py`
- Pattern: Pydantic BaseModel with @field_validator and @model_validator decorators
- Purpose: Structured result container matching API/UI expectations
- Examples: `brewos/models/outputs.py`
- Pattern: Pydantic BaseModel with nested objects (ExtractionPoint, PSDPoint, FlavorProfile)
- Purpose: Abstract interface for ODE/PDE-based extraction kinetics
- Examples: `immersion.py`, `percolation.py`, `pressure.py` (TBD)
- Pattern: Function-based (not yet class-based); takes SimulationInput, returns SimulationOutput
- Purpose: Configuration object mapping a brewing technique to its physics solver
- Examples: `french_press.py`, `v60.py`, `kalita.py`, `espresso.py`, `moka_pot.py`, `aeropress.py`
- Pattern: Module-level configuration; imports and wraps corresponding solver
## Entry Points
- Location: `brewos-engine/poc/moroney_2016_immersion_ode.py`
- Triggers: Direct execution (`python moroney_2016_immersion_ode.py`)
- Responsibilities:
- Location: `tests/test_immersion_poc.py`
- Triggers: `pytest tests/`
- Responsibilities:
- Will orchestrate: Input validation → Method selection → Solver execution → Output assembly
- Expected location: `brewos/__main__.py` or `brewos/api.py` (to be created)
## Error Handling
- **Input Layer**: Pydantic validators catch invalid parameters before physics computation
- **Solver Layer**: scipy.integrate.solve_ivp raises RuntimeError if ODE solve fails; clipping to physical bounds [0, c_sat] prevents NaN propagation
- **Output Layer**: Warnings list in SimulationOutput flags over-extraction, channeling risk, out-of-range brew ratios
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

## Project Structure

- Engine: `brewos-engine/brewos/`
- Mobile: `brewos-engine/keif-mobile/`
- Planning: `D:\Coding\Keif\.planning\` (local-only, never pushed)

## Git

- Repo root: `D:\Coding\Keif\brewos-engine\`
- Remote: `https://github.com/usameak42/keif.git`
- Branch: `main`
- Always `cd` to `brewos-engine/` before any git operations
- The outer `D:\Coding\Keif\` folder is local-only, never pushed

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

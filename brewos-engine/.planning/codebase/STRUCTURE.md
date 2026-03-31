# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```
brewos-engine/
├── brewos/                          # Main package — BrewOS physics engine
│   ├── __init__.py                  # Package docstring
│   ├── models/                      # Input/output Pydantic schemas
│   │   ├── __init__.py
│   │   ├── inputs.py                # SimulationInput, RoastLevel, Mode enums
│   │   └── outputs.py               # SimulationOutput, ExtractionPoint, PSDPoint, FlavorProfile
│   ├── methods/                     # Brew method implementations (method → solver routing)
│   │   ├── __init__.py              # Module docstring
│   │   ├── french_press.py          # Imports immersion solver
│   │   ├── v60.py                   # Imports percolation solver
│   │   ├── kalita.py                # Imports percolation solver
│   │   ├── espresso.py              # Imports pressure solver
│   │   ├── moka_pot.py              # Imports pressure solver
│   │   └── aeropress.py             # Imports hybrid solver (TBD)
│   ├── solvers/                     # Extraction kinetics solvers (ODE/PDE implementations)
│   │   ├── __init__.py              # Module docstring
│   │   ├── immersion.py             # Moroney 2016 ODE + Maille 2021 biexponential
│   │   ├── percolation.py           # Moroney 2015 PDE + Maille 2021 biexponential
│   │   └── pressure.py              # Pressure-driven extraction (model TBD)
│   ├── grinders/                    # Grinder database & PSD lookup
│   │   ├── __init__.py              # Grinder loader
│   │   └── comandante_c40_mk4.json  # Grinder profile (placeholder)
│   └── utils/                       # Utility functions (shared calculation helpers)
│       ├── __init__.py
│       └── psd.py                   # Particle size distribution operations
├── poc/                             # Proof-of-concept implementations & reference scripts
│   ├── moroney_2016_immersion_ode.py  # Phase 8 reference: Moroney ODE + Liang scaling
│   └── outputs/                     # PoC plot outputs (e.g., moroney_2016_phase8.png)
├── tests/                           # Test suite
│   ├── __init__.py
│   └── test_immersion_poc.py        # Subprocess test of PoC script; validates EY & TDS
├── .planning/                       # Planning documents (GSD framework)
│   └── codebase/                    # Generated architecture & analysis docs
│       ├── ARCHITECTURE.md          # (this file describes...)
│       └── STRUCTURE.md             # (currently reading)
├── .pytest_cache/                   # Pytest cache (not committed)
├── pyproject.toml                   # Project metadata & dependencies
├── README.md                        # Project overview & status
├── LICENSE                          # Licensing info
└── .gitignore                       # Git ignore rules
```

## Directory Purposes

**brewos/ — Main Package:**
- Purpose: Physics-based coffee extraction simulation engine
- Contains: All production code organized into models, methods, solvers, grinders, utilities
- Entry point: Will be orchestration layer (not yet implemented)

**brewos/models/ — Input/Output Contracts:**
- Purpose: Define data shapes for simulation requests and responses
- Contains: Pydantic models with validation logic
- Key files: `inputs.py` (SimulationInput), `outputs.py` (SimulationOutput)
- Pattern: Models are pure data structures with Pydantic validators; no business logic

**brewos/methods/ — Brew Method Routing:**
- Purpose: Map user's brew method choice to the appropriate extraction solver
- Contains: One module per supported method (French Press, V60, Kalita, Espresso, Moka Pot, AeroPress)
- Current state: Each method is a 1-line stub; production code will import solver and pass-through parameters
- Conventions:
  - French Press, Moka Pot → immersion solver
  - V60, Kalita Wave → percolation solver
  - Espresso → pressure solver
  - AeroPress → hybrid solver (TBD)

**brewos/solvers/ — Extraction Kinetics:**
- Purpose: Implement physics-based ODE/PDE models for coffee extraction
- Contains: Three solvers for different extraction mechanisms
- Key dependencies: SciPy (ODE/PDE solvers), NumPy (numerical arrays)
- Current state: `immersion.py` is stub; reference implementation in `poc/moroney_2016_immersion_ode.py`
- Solver types:
  - **Immersion**: Well-mixed 3-ODE system (Moroney 2016 + Maille 2021 + Liang 2021 scaling)
  - **Percolation**: Darcy flow PDE (Moroney 2015 + Maille 2021)
  - **Pressure**: Model TBD (Espresso, Moka Pot)

**brewos/grinders/ — Grinder Database:**
- Purpose: Translate grinder name + click/notch setting to particle size distribution
- Contains: JSON profiles per grinder model; Python loader in `__init__.py`
- Current state: Placeholder structure only; `comandante_c40_mk4.json` is a stub with "low confidence" marker
- Future: Will grow to include Baratza Encore, Fellow Ode, 1Zpresso Q2, Comandante C40 MK4 variants, etc.
- Pattern: `{grinder_name}.json` → `{"model": "...", "settings": {...}, "psd": {...}, ...}`

**brewos/utils/ — Shared Utilities:**
- Purpose: Common calculation functions used across solvers and output processing
- Contains: Modules for PSD operations, possibly flavor inference, validation helpers
- Current state: `psd.py` module defined but empty
- Future: PSD interpolation, normalization, flavor profile computation

**poc/ — Proof of Concept:**
- Purpose: Standalone reference implementations to validate physics models
- Contains: `moroney_2016_immersion_ode.py` — fully working immersion solver with plots and validation
- Not production code; used to:
  - Demonstrate expected behavior
  - Validate integration of Moroney, Maille, and Liang models
  - Serve as template for production solver implementations
- Outputs: PNG plots saved to `poc/outputs/`

**tests/ — Test Suite:**
- Purpose: Verify correctness of solvers and overall system
- Contains: `test_immersion_poc.py` — subprocess-based integration test
- Test pattern: Runs PoC script, parses output, asserts EY ≈ 21.51% and TDS ≈ 1.291%
- Future: Will add unit tests for individual solvers, Pydantic models, grinder loader, etc.

**.planning/codebase/ — Architecture Documentation:**
- Purpose: Generated by GSD framework to guide implementation and future changes
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md (future), TESTING.md (future), CONCERNS.md (future)
- Not in git; generated per phase

## Key File Locations

**Entry Points:**
- `brewos/__init__.py`: Package docstring only; future: orchestration layer
- `poc/moroney_2016_immersion_ode.py`: Reference implementation entry point (runnable script)
- `tests/test_immersion_poc.py`: Test entry point (pytest)

**Configuration:**
- `pyproject.toml`: Project metadata, dependencies (scipy, numpy, pydantic), test config
- `README.md`: Project overview, physics references, status

**Core Logic:**
- `brewos/models/inputs.py`: Simulation parameter validation (68 lines)
- `brewos/models/outputs.py`: Simulation result schema (38 lines)
- `poc/moroney_2016_immersion_ode.py`: Extraction solver reference (333 lines)
- `brewos/solvers/immersion.py`: Production immersion solver (stub, 1 line)
- `brewos/solvers/percolation.py`: Production percolation solver (stub, 1 line)
- `brewos/solvers/pressure.py`: Production pressure solver (stub, 1 line)

**Grinder Data:**
- `brewos/grinders/comandante_c40_mk4.json`: Grinder profile (placeholder)
- `brewos/grinders/__init__.py`: Grinder loader (stub, 1 line)

**Testing:**
- `tests/test_immersion_poc.py`: Integration test (41 lines)
- `tests/__init__.py`: Empty

## Naming Conventions

**Files:**
- Python modules: `snake_case.py` (e.g., `moroney_2016_immersion_ode.py`, `comandante_c40_mk4.json`)
- Grinder JSON: `{brand}_{model}_{variant}.json` (e.g., `comandante_c40_mk4.json`)
- Test files: `test_{component}.py` or `test_{scenario}.py` (e.g., `test_immersion_poc.py`)

**Directories:**
- Package directories: `lowercase_plural` (e.g., `models`, `methods`, `solvers`, `grinders`, `utils`)
- Exception: `.planning/` (framework convention)

**Python Classes:**
- Enums: `PascalCase` (e.g., `RoastLevel`, `Mode`)
- Pydantic models: `PascalCase` (e.g., `SimulationInput`, `SimulationOutput`, `ExtractionPoint`)

**Python Functions:**
- ODE functions: `{paper}_{mechanism}_ode` (e.g., `moroney_ode`)
- Solver functions: `solve_{mechanism}` (e.g., `solve_immersion`, `solve_percolation`)
- Utility functions: `verb_noun` (e.g., `get_grinder`, `scale_extraction_yield`)

**Python Variables (in PoC script):**
- Parameters: `snake_case` with units in comments (e.g., `m_coffee_g`, `T_brew_C`, `c_sat`)
- State variables: Greek letter or symbol shorthand (e.g., `c_h`, `c_v`, `psi_s`, `phi_h`)
- Computed values: `noun_unit` (e.g., `ey_pct`, `tds_pct`, `scale_factor`)

## Where to Add New Code

**New Brew Method:**
- Primary code: Create `brewos/methods/{method_name}.py` with solver import
- Configuration: Add method-specific parameters (if any) as class or dataclass
- Solver dependency: Ensure target solver exists (immersion, percolation, pressure, or hybrid)
- Test: Add test case in `tests/` that verifies method routes to correct solver

**New Solver (Extraction Mechanism):**
- Implementation: `brewos/solvers/{mechanism}.py` (e.g., `hybrid.py` for AeroPress)
- Structure: Should follow pattern from `poc/moroney_2016_immersion_ode.py`:
  - Define parameters from literature (constants, initial conditions)
  - Build ODE/PDE rate coefficients
  - Call SciPy `solve_ivp` or `solve_bvp` as appropriate
  - Post-process with equilibrium scaling (BREWOS-TODO-001)
  - Return normalized extraction curve
- Dependencies: Import from `brewos/models/` for `SimulationInput` and output types
- Test: Create `tests/test_{mechanism}_poc.py` with reference implementation and subprocess validation

**New Grinder:**
- Data: `brewos/grinders/{brand}_{model}.json` with PSD per setting
- Structure: JSON schema must include `model`, `type`, `settings` array, `psd` object, `confidence`, `source`
- Loader: `brewos/grinders/__init__.py` updated to load new file
- Test: Ensure grinder loader finds and parses file correctly

**Utility Function (Shared):**
- Location: `brewos/utils/{purpose}.py` (e.g., `psd.py`, `flavor.py`, `validation.py`)
- Naming: `verb_noun(args) -> result_type` (e.g., `normalize_psd(psd_array) -> normalized`)
- Dependencies: Import from `brewos/models/` if using data types; no circular imports
- Test: Add test to `tests/test_utils.py` (create if needed)

**New Test:**
- Location: `tests/test_{component_or_scenario}.py`
- Pattern for integration tests: Subprocess-based for PoC validation (like `test_immersion_poc.py`)
- Pattern for unit tests: Direct pytest with assertions (TBD)
- Coverage: Test both happy path and error cases (validation failures, solver divergence, etc.)

## Special Directories

**poc/ — Proof of Concept:**
- Purpose: Standalone reference implementations; not part of production package
- Generated: No; hand-written
- Committed: Yes; serves as documentation and validation target
- When to use: Building a new solver, validate physics model against literature

**tests/ — Test Suite:**
- Purpose: Verify correctness of package and PoC scripts
- Generated: No; hand-written
- Committed: Yes; essential for CI/CD and regression detection
- Convention: Pytest framework; subprocess-based for PoC validation

**.planning/codebase/ — Architecture Docs:**
- Purpose: Guide for implementation and future changes
- Generated: Yes; created by GSD framework (`/gsd:map-codebase`)
- Committed: No; generated on-demand
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md (future), TESTING.md (future), CONCERNS.md (future)

**poc/outputs/ — Generated Plots:**
- Purpose: Visual validation of solver behavior
- Generated: Yes; created by `poc/moroney_2016_immersion_ode.py` matplotlib calls
- Committed: No; recreated on PoC run
- Format: PNG files (e.g., `moroney_2016_phase8.png`)

---

*Structure analysis: 2026-03-26*

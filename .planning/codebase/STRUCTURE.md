# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```
brewos-engine/
├── brewos/                          # Main package
│   ├── __init__.py                  # Package descriptor
│   ├── models/                      # Pydantic input/output models
│   │   ├── __init__.py
│   │   ├── inputs.py                # SimulationInput, RoastLevel, Mode enums
│   │   └── outputs.py               # SimulationOutput, ExtractionPoint, PSDPoint, FlavorProfile
│   ├── solvers/                     # Physics solver implementations (ODE/PDE)
│   │   ├── __init__.py
│   │   ├── immersion.py             # Moroney 2016 ODE + Maille 2021 biexponential
│   │   ├── percolation.py           # Moroney 2015 PDE + Maille 2021 biexponential
│   │   └── pressure.py              # Pressure-driven extraction (TBD)
│   ├── methods/                     # Brew method configurations
│   │   ├── __init__.py
│   │   ├── french_press.py          # Immersion solver wrapper
│   │   ├── v60.py                   # Percolation solver wrapper (Hario V60)
│   │   ├── kalita.py                # Percolation solver wrapper (Kalita Wave)
│   │   ├── espresso.py              # Pressure solver wrapper
│   │   ├── moka_pot.py              # Pressure solver wrapper
│   │   └── aeropress.py             # Hybrid solver (not yet assigned)
│   ├── grinders/                    # Grinder database & lookup
│   │   └── __init__.py              # (Content not populated yet)
│   └── utils/                       # Shared utilities
│       ├── __init__.py
│       └── psd.py                   # Particle size distribution utilities
├── poc/                             # Proof of Concept (Phase 8)
│   ├── moroney_2016_immersion_ode.py  # Standalone ODE validation
│   └── outputs/                     # Generated plots & results
│       ├── moroney_2016_phase8.png
│       └── validation_result_phase8.txt
├── tests/                           # Test suite
│   ├── __init__.py
│   └── test_immersion_poc.py        # PoC smoke test
├── pyproject.toml                   # Package metadata, dependencies (setuptools)
├── README.md                        # Project description & status
├── LICENSE
└── .gitignore
```

## Directory Purposes

**`brewos/`:**
- Purpose: Main simulation engine package
- Contains: Physics models, solvers, method configurations, utilities
- Key files: `__init__.py` (package descriptor: "BrewOS — physics-based coffee extraction engine")

**`brewos/models/`:**
- Purpose: Pydantic data models for input validation and output structuring
- Contains: Input constraints, enums, output schema
- Key files: `inputs.py` (SimulationInput with validators), `outputs.py` (SimulationOutput with nested objects)

**`brewos/solvers/`:**
- Purpose: Physics implementations (ODE/PDE systems)
- Contains: Mathematical models from peer-reviewed papers (Moroney 2016, Moroney 2015, etc.)
- Key files: `immersion.py` (well-mixed system), `percolation.py` (Darcy flow), `pressure.py` (TBD)

**`brewos/methods/`:**
- Purpose: Declare brew method metadata and solver selection
- Contains: One file per supported brew method
- Key files: `french_press.py`, `v60.py`, `kalita.py`, `espresso.py`, `moka_pot.py`, `aeropress.py`

**`brewos/grinders/`:**
- Purpose: Grinder model database and particle size lookup
- Contains: Grinder specifications indexed by model name and setting (clicks/notches)
- Key files: `__init__.py` (grinder loader — not yet populated)

**`brewos/utils/`:**
- Purpose: Shared utilities for physics calculations
- Contains: Non-brew-method-specific helpers (PSD calculations, data processing)
- Key files: `psd.py` (particle size distribution utilities)

**`poc/`:**
- Purpose: Proof of concept and validation scripts
- Contains: Standalone implementations for testing mathematical models before integration
- Key files: `moroney_2016_immersion_ode.py` (Phase 8 validation), `outputs/` (generated artifacts)

**`tests/`:**
- Purpose: Test suite for the package
- Contains: Unit tests, integration tests, smoke tests
- Key files: `test_immersion_poc.py` (validates PoC script output)

## Key File Locations

**Entry Points:**
- `poc/moroney_2016_immersion_ode.py`: Direct execution for PoC validation (Phase 8)
- `tests/test_immersion_poc.py`: pytest entry point
- *Future*: `brewos/__main__.py` or `brewos/api.py` (Phase 10+ integration point)

**Configuration:**
- `pyproject.toml`: Package name, version, dependencies (scipy, numpy, pydantic≥2.0), build backend, pytest config
- `README.md`: Project description, status (Phase 10 scaffold), architecture reference

**Core Logic:**
- `brewos/models/inputs.py`: Input parameter validation (coffee_dose, water_temp, grind_size, brew_time, roast_level, mode)
- `brewos/models/outputs.py`: Result structure (TDS%, EY%, extraction_curve, flavor_profile, warnings)
- `brewos/solvers/immersion.py`: Moroney 2016 ODE implementation (well-mixed system)
- `brewos/solvers/percolation.py`: Moroney 2015 PDE implementation (Darcy flow)
- `brewos/methods/french_press.py`: Brew method → immersion solver mapping

**Testing:**
- `tests/test_immersion_poc.py`: Smoke test (subprocess execution, regex output parsing)
- `poc/moroney_2016_immersion_ode.py`: Self-contained validation with hardcoded scenario

## Naming Conventions

**Files:**
- Source modules: `snake_case.py` (e.g., `moroney_2016_immersion_ode.py`, `french_press.py`)
- Directories: `snake_case` (e.g., `brewos/models/`, `brewos/solvers/`)
- Config files: `snake_case` or `UPPERCASE.md` (e.g., `pyproject.toml`, `README.md`)

**Functions:**
- Solver functions: `{physics_model}_solver()` or method-specific (not yet standardized; Phase 8 uses module-level ODE)
- Validators: Pydantic `@field_validator` and `@model_validator` decorators

**Variables:**
- Physics state variables: Single letters (c_h, c_v, ψ_s, φ_h, φ_c, D_v) matching academic papers
- Parameters: Abbreviated form matching vault (e.g., `alpha_n`, `beta_n`, `k_sv1`, `K_liang`)
- Results: English descriptive (e.g., `ey_percent`, `tds_percent`, `extraction_curve`)

**Types:**
- Enums: PascalCase (e.g., `RoastLevel`, `Mode`)
- Models: PascalCase (e.g., `SimulationInput`, `SimulationOutput`, `ExtractionPoint`)
- Classes: PascalCase (will be used in Phase 10+ refactor)

## Where to Add New Code

**New Brew Method (e.g., Turkish Coffee):**
1. Create `brewos/methods/turkish_coffee.py` with solver selection comment
2. Implement/select matching solver in `brewos/solvers/` (likely immersion-based)
3. Add configuration to method module (method-specific parameters, default settings)
4. Register in future orchestration layer (Phase 10+ `__main__.py`)

**New Solver (e.g., CO2 Degassing):**
1. Create `brewos/solvers/co2_degassing.py` with ODE/PDE implementation
2. Import in corresponding method module(s)
3. Match `SimulationInput` and `SimulationOutput` contracts
4. Add test in `tests/test_co2_degassing.py`

**New Utility Function:**
1. Add to `brewos/utils/` in appropriate file (create new if no category match, e.g., `brewos/utils/channeling.py`)
2. Import in solvers/methods that need it
3. Test in `tests/test_utils_{module}.py`

**New Brew Parameter:**
1. Add field to `SimulationInput` in `brewos/models/inputs.py`
2. Add @field_validator if validation logic needed
3. Update @model_validator for cross-field consistency if applicable
4. Update all affected solvers/methods to use new parameter
5. Extend `SimulationOutput` if new result field needed

## Special Directories

**`poc/` (Proof of Concept):**
- Purpose: Temporary validation scripts and artifacts
- Generated: Yes (plots, validation reports in `outputs/`)
- Committed: Yes (scripts), No (generated outputs — gitignore'd)
- Note: Scripts run as standalone executables; not yet integrated with package layer

**`tests/`:**
- Purpose: Test suite
- Generated: No
- Committed: Yes
- Note: Uses pytest; see `pyproject.toml` testpaths configuration

**`brewos/`:**
- Purpose: Main package
- Generated: No
- Committed: Yes
- Note: All files are source code; no generated content

**`outputs/` (inside `poc/`):**
- Purpose: Generated validation plots and result summaries
- Generated: Yes (by `moroney_2016_immersion_ode.py`)
- Committed: No (typically .gitignore'd)

---

*Structure analysis: 2026-03-26*

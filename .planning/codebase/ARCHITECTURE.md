# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Layered physics-simulation engine with modular solver composition.

**Key Characteristics:**
- Input/Output validation via Pydantic models
- Solver-method decoupling: solvers implement physics (ODE/PDE), methods declare solver selection
- Modular parameter lookup: grinder database loader for particle size distribution
- Two execution modes: fast (biexponential kinetics < 1ms) and accurate (ODE solver < 4s)
- Equilibrium scaling post-processing (Liang 2021 anchor for extraction yield)

## Layers

**Input Model Layer:**
- Purpose: Validate and normalize all simulation parameters before physics computation
- Location: `brewos/models/inputs.py`
- Contains: `SimulationInput` (Pydantic BaseModel), `Mode` enum (fast/accurate), `RoastLevel` enum (light/medium/dark)
- Depends on: Pydantic for validation
- Used by: All solvers; called before any extraction simulation

**Output Model Layer:**
- Purpose: Standardize simulation results with validated physics outputs
- Location: `brewos/models/outputs.py`
- Contains: `SimulationOutput` (top-level result), `ExtractionPoint` (time-resolved extraction curve), `PSDPoint` (particle size distribution), `FlavorProfile` (sour/sweet/bitter scores)
- Depends on: Pydantic for schema validation
- Used by: All solver implementations; returned to caller

**Solver Layer:**
- Purpose: Implement peer-reviewed physics models (ODE/PDE systems) for extraction kinetics
- Location: `brewos/solvers/`
- Contains:
  - `immersion.py`: Moroney 2016 well-mixed ODE + Maille 2021 biexponential kinetics (French Press, cold brew immersion)
  - `percolation.py`: Moroney 2015 Darcy flow PDE + Maille 2021 biexponential kinetics (percolating methods: V60, Kalita Wave)
  - `pressure.py`: Pressure-driven extraction model TBD (Espresso, Moka Pot)
- Depends on: SciPy (solve_ivp for ODE solving), NumPy (array operations)
- Used by: Method modules

**Method Configuration Layer:**
- Purpose: Declare brew method metadata and solver selection
- Location: `brewos/methods/`
- Contains:
  - `french_press.py`: Immersion solver configuration
  - `v60.py`: Percolation solver configuration (Hario V60)
  - `kalita.py`: Percolation solver configuration (Kalita Wave)
  - `espresso.py`: Pressure solver configuration
  - `moka_pot.py`: Pressure solver configuration
  - `aeropress.py`: Standalone hybrid solver (not yet assigned to immersion/percolation/pressure)
- Depends on: Corresponding solver modules
- Used by: Orchestration layer (future: API endpoint or CLI runner)

**Utility Layer:**
- Purpose: Shared tools for physics calculations and data processing
- Location: `brewos/utils/`
- Contains: `psd.py` (particle size distribution utilities)
- Depends on: NumPy, SciPy
- Used by: Solvers and methods

**Grinder Database Layer:**
- Purpose: Look up particle size distributions by grinder model and setting
- Location: `brewos/grinders/`
- Contains: Grinder model definitions and lookup functions (not yet populated)
- Depends on: Method/solver layer for context (optional parameter override)
- Used by: Input validation and solver initialization

## Data Flow

**Standard Simulation Flow:**

1. **Input Parsing** → `SimulationInput` receives user parameters (coffee_dose, water_temp, brew_time, grinder_name+setting OR grind_size, mode)
2. **Input Validation** → Pydantic validators enforce: positive doses/times, temperature in range [0, 100]°C, consistent grind source (either manual size or grinder lookup)
3. **Grinder Lookup** (optional) → If grinder_name provided, fetch particle size distribution from `brewos/grinders`
4. **Method Selection** → Select appropriate solver based on brew_method or inferred from parameters
5. **Solver Execution** →
   - **Fast mode**: Biexponential kinetics (Maille 2021) < 1ms
   - **Accurate mode**: ODE/PDE solver (Moroney 2016/2015) with scipy.integrate.solve_ivp < 4s
6. **Physics Computation** → Time-resolved extraction curve, TDS, EY, flavor profile
7. **Equilibrium Scaling** (post-process) → Apply Liang 2021 desorption constant K=0.717 to anchor final EY
8. **Output Assembly** → Pack results into `SimulationOutput` with warnings/recommendations
9. **Return** → `SimulationOutput` to caller

**State Management:**
- **Immutable**: Input/Output models (Pydantic frozen-compatible)
- **Transient during solve**: ODE state variables (c_h, c_v, ψ_s) computed by scipy.integrate.solve_ivp
- **Post-process**: Scale factors, time-resolved curves assembled in memory before returning

## Key Abstractions

**SimulationInput:**
- Purpose: Single source of truth for all simulation parameters; enforces physical constraints
- Examples: `brewos/models/inputs.py`
- Pattern: Pydantic BaseModel with @field_validator and @model_validator decorators

**SimulationOutput:**
- Purpose: Structured result container matching API/UI expectations
- Examples: `brewos/models/outputs.py`
- Pattern: Pydantic BaseModel with nested objects (ExtractionPoint, PSDPoint, FlavorProfile)

**Extraction Solver:**
- Purpose: Abstract interface for ODE/PDE-based extraction kinetics
- Examples: `immersion.py`, `percolation.py`, `pressure.py` (TBD)
- Pattern: Function-based (not yet class-based); takes SimulationInput, returns SimulationOutput

**Brew Method:**
- Purpose: Configuration object mapping a brewing technique to its physics solver
- Examples: `french_press.py`, `v60.py`, `kalita.py`, `espresso.py`, `moka_pot.py`, `aeropress.py`
- Pattern: Module-level configuration; imports and wraps corresponding solver

## Entry Points

**PoC Script (Phase 8 Validation):**
- Location: `brewos-engine/poc/moroney_2016_immersion_ode.py`
- Triggers: Direct execution (`python moroney_2016_immersion_ode.py`)
- Responsibilities:
  - Standalone implementation of Moroney 2016 ODE system
  - Validates Liang 2021 equilibrium scaling (BREWOS-TODO-001)
  - Produces validation plots and results report
  - NOT integrated with SimulationInput/SimulationOutput yet

**Test Suite Entry:**
- Location: `tests/test_immersion_poc.py`
- Triggers: `pytest tests/`
- Responsibilities:
  - Smoke test running PoC script as subprocess
  - Validates EY ≈ 21.51%, TDS ≈ 1.291%

**Future Main Entry Point (Phase 10+):**
- Will orchestrate: Input validation → Method selection → Solver execution → Output assembly
- Expected location: `brewos/__main__.py` or `brewos/api.py` (to be created)

## Error Handling

**Strategy:** Validation-first (fail fast) with fallback bounds checking.

**Patterns:**
- **Input Layer**: Pydantic validators catch invalid parameters before physics computation
- **Solver Layer**: scipy.integrate.solve_ivp raises RuntimeError if ODE solve fails; clipping to physical bounds [0, c_sat] prevents NaN propagation
- **Output Layer**: Warnings list in SimulationOutput flags over-extraction, channeling risk, out-of-range brew ratios

## Cross-Cutting Concerns

**Logging:** Not implemented; print() used in PoC only (see `poc/moroney_2016_immersion_ode.py` lines 269–333).

**Validation:** Pydantic BaseModel validators; cross-field validation via @model_validator (e.g., grind_source_consistent checks consistency of grinder vs. manual grind size).

**Authentication:** Not applicable; physics engine is backend-only component.

**Units:** Mixed: SI (m, m³, s, kg/m³) for internal computation; user-facing inputs in practical units (g, °C, μm).

---

*Architecture analysis: 2026-03-26*

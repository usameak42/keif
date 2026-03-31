# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Layered physics simulation engine with method-specific solver routing

**Key Characteristics:**
- Input validation layer (Pydantic models) enforces parameter constraints
- Method-solver mapping routes brew requests to appropriate extraction model
- Solver layer solves ODEs/PDEs from peer-reviewed coffee extraction literature
- Output normalization applies equilibrium scaling and flavor inference
- Grinder database lookup translates user settings to particle size distributions

## Layers

**Input Validation Layer:**
- Purpose: Ensure all simulation parameters are physically plausible and internally consistent
- Location: `brewos/models/inputs.py`
- Contains: `SimulationInput` Pydantic model with field and cross-field validators
- Depends on: Pydantic (external)
- Used by: Orchestration layer (not yet implemented)
- Key exports: `SimulationInput`, `RoastLevel`, `Mode` enums

**Method Layer:**
- Purpose: Map brew methods to their appropriate solvers; store method-specific parameters
- Location: `brewos/methods/` (one module per method)
- Contains: Method modules for French Press, V60, Kalita Wave, Espresso, Moka Pot, AeroPress
- Depends on: Solver layer
- Used by: Orchestration layer (not yet implemented)
- Current state: Each method is a stub with a single line documenting which solver it uses
- Pattern: `brewos/methods/{method_name}.py` → imports solver from `brewos/solvers/`

**Solver Layer:**
- Purpose: Implement extraction kinetics using peer-reviewed ODE/PDE models
- Location: `brewos/solvers/` (one module per mechanism)
- Contains: Three solvers for immersion, percolation, and pressure-driven extraction
- Depends on: SciPy (ODE/PDE solvers), NumPy (numerical operations)
- Used by: Method layer
- Current state: Three solvers are empty stubs; immersion reference implementation is in PoC
- Solvers implemented:
  - Immersion: Moroney et al. (2016) well-mixed ODE with Maille (2021) biexponential kinetics
  - Percolation: Moroney et al. (2015) Darcy flow PDE with Maille (2021) biexponential kinetics
  - Pressure: Model TBD — for Espresso and Moka Pot

**Grinder Database Layer:**
- Purpose: Translate grinder name + setting (clicks/notches) to particle size distribution (PSD)
- Location: `brewos/grinders/` (JSON-based lookup + loader)
- Contains: JSON files per grinder model; commander-style loader in `__init__.py`
- Depends on: No external dependencies
- Used by: Input validation (optional path); PoC script calls grinder data directly
- Current state: Placeholder infrastructure in place; only one grinder (Comandante C40 MK4) with stub data
- Pattern: `brewos/grinders/{grinder_name}.json` → loaded by grinder module to override computed grind_size

**Output Layer:**
- Purpose: Standardize simulation results with validation warnings and recommendations
- Location: `brewos/models/outputs.py`
- Contains: `SimulationOutput` model with time-resolved extraction curve, PSD, flavor profile, brew ratio guidance
- Depends on: Pydantic (external)
- Used by: Orchestration layer (not yet implemented)
- Key exports: `SimulationOutput`, `ExtractionPoint`, `PSDPoint`, `FlavorProfile`

**Utility Layer:**
- Purpose: Shared calculation functions (PSD interpolation, flavor inference, validation helpers)
- Location: `brewos/utils/` (modular helpers)
- Contains: `psd.py` for particle size distribution operations
- Depends on: NumPy
- Used by: Solver layer, Output layer
- Current state: Structure defined; `psd.py` is empty stub

## Data Flow

**Simulation Request Flow:**

1. **Input**: Client submits `SimulationInput` (coffee dose, water amount, temp, brew time, grind parameters, roast level, mode)
2. **Validation**: Pydantic validators enforce:
   - All numeric parameters are positive
   - Water temp is 0–100°C (exclusive)
   - Grind source is consistent: either manual (`grind_size` in μm) OR grinder lookup (`grinder_name` + `grinder_setting`)
3. **Method Routing**: Orchestration selects solver based on brew method
   - French Press, Moka Pot → Immersion solver
   - V60, Kalita Wave → Percolation solver
   - Espresso → Pressure solver
   - AeroPress → Hybrid solver (TBD)
4. **Grind Resolution** (optional): If grinder lookup requested, `brewos/grinders/` module translates setting to PSD
5. **Solver Execution**:
   - **Immersion**: Moroney (2016) 3-ODE well-mixed system (state: c_h, c_v, psi_s)
     - Initial conditions derived from roast level (affects initial intragranular concentration)
     - Solved to equilibrium or brew_time, whichever ends first
     - Post-process: scale extraction yield to Liang (2021) equilibrium anchor (K=0.717)
   - **Percolation**: Moroney (2015) Darcy flow PDE + Maille (2021) biexponential (not yet implemented)
   - **Pressure**: Model TBD (not yet implemented)
6. **Post-Processing**:
   - Extract TDS% and EY% from solver output
   - Compute flavor profile based on EY and roast level
   - Validate against SCA guidelines and generate warnings (e.g., over-extraction, under-extraction, channeling risk)
   - Compute brew ratio and recommendation if out of ideal range
7. **Output**: Return `SimulationOutput` with time-resolved extraction curve, PSD, flavor profile, warnings

**Data Structures in Flight:**

```
SimulationInput (validated)
  ↓
[Method Router]
  ↓
[Grinder lookup] → PSD
  ↓
[Solver] → c_h(t), c_v(t), psi_s(t) or equiv.
  ↓
[Post-processing] → TDS%, EY%, warnings
  ↓
SimulationOutput
```

## Key Abstractions

**SimulationInput:**
- Purpose: Contract for all input parameters; enforces validation rules
- Location: `brewos/models/inputs.py`
- Pattern: Pydantic BaseModel with field_validator and model_validator decorators
- Constraints: coffee_dose > 0, water_temp ∈ (0, 100), brew_time > 0, grind source consistency

**SimulationOutput:**
- Purpose: Standardized result format; wraps extraction curve, PSD, flavor, metadata
- Location: `brewos/models/outputs.py`
- Pattern: Pydantic BaseModel with nested ExtractionPoint, PSDPoint, FlavorProfile
- Contents: TDS%, EY%, time-resolved extraction curve, warnings, mode_used

**Extraction Solver (ODE/PDE):**
- Purpose: Simulate coffee extraction kinetics using first-principles physics
- Examples:
  - `poc/moroney_2016_immersion_ode.py` (reference implementation)
  - `brewos/solvers/immersion.py` (stub for production implementation)
- Pattern:
  - Define parameters from peer-reviewed literature (Moroney, Maille, Liang)
  - Build ODE rate coefficients (kA, kB, kC, kD for immersion)
  - Solve initial-value problem with SciPy `solve_ivp` (Radau method)
  - Post-process with equilibrium scaling
  - Validate against reference targets and SCA guidelines

**Brew Method Mapper:**
- Purpose: Route method name to appropriate solver
- Examples: French Press → immersion, V60 → percolation
- Pattern: Not yet implemented; will be a function or class in orchestration layer

## Entry Points

**PoC Script:**
- Location: `poc/moroney_2016_immersion_ode.py`
- Triggers: Direct Python execution (test harness runs this as subprocess)
- Responsibilities:
  - Demonstrates end-to-end immersion solver with Liang equilibrium scaling
  - Outputs plots (TDS%, EY%, state variables) and validation report
  - Used as reference for production solver architecture

**Test Suite:**
- Location: `tests/test_immersion_poc.py`
- Triggers: pytest framework
- Responsibilities:
  - Subprocess-based test of PoC script
  - Validates that EY ≈ 21.51% and TDS ≈ 1.291% match Liang targets
  - Ensures production solver will match reference behavior

**Future Orchestration Entry Point:**
- Not yet implemented
- Will accept `SimulationInput`, route to appropriate solver, return `SimulationOutput`

## Error Handling

**Strategy:** Validation-first with graceful degradation

**Patterns:**

- **Input Validation Errors**: Pydantic raises `ValidationError` on invalid input
  - Examples: negative coffee_dose, temp out of range, missing grind source
  - Handled at API boundary; client receives structured error response

- **Solver Errors**: ODE solver may fail to converge
  - Current PoC: raises `RuntimeError` if `sol.success == False`
  - Production: should return warning in `SimulationOutput` with last valid state

- **Grinder Lookup Errors**: Requested grinder not in database
  - Current: no error handling (grinder module not yet implemented)
  - Pattern to adopt: return warning suggesting closest grinder; fall back to manual grind_size if available

- **Physics Constraint Violations**: State variables (c_h, c_v, psi_s) clamped to valid ranges
  - Immersion solver: clamp c_h, c_v to [0, c_sat], psi_s to [0, 1] at each ODE step
  - Percolation/Pressure: TBD

## Cross-Cutting Concerns

**Logging:** Not yet implemented
- Future pattern: should log parameter choices, solver selection, equilibrium scaling factor

**Validation:** Two-layer approach
- Field validation: Pydantic validators on individual SimulationInput fields
- Cross-field validation: model_validator on SimulationInput as a whole
- Post-solve validation: warnings in SimulationOutput (over-extraction, under-extraction, etc.)

**Authentication & Authorization:** Not applicable (computational engine, not API service)

**Serialization:** Pydantic models auto-serialize to JSON
- Input: expects JSON matching SimulationInput schema
- Output: returns JSON matching SimulationOutput schema

---

*Architecture analysis: 2026-03-26*

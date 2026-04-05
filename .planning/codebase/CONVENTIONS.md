# Coding Conventions

**Analysis Date:** 2026-04-01

---

## Python Engine Conventions

### Naming Patterns

**Module files:**
- Lowercase with underscores: `moroney_2016_immersion_ode.py`, `co2_bloom.py`, `output_helpers.py`
- Module name matches functional role (not a class name)
- One module per solver/utility domain

**Classes:**
- PascalCase Pydantic models: `SimulationInput`, `SimulationOutput`, `FlavorProfile`, `ExtractionPoint`
- String enums inherit `str, Enum`: `class RoastLevel(str, Enum)`, `class Mode(str, Enum)`, `class BrewMethod(str, Enum)`
- Enum member values are lowercase strings matching the member name: `light = "light"`, `fast = "fast"`

**Functions:**
- snake_case throughout: `solve_accurate()`, `solve_fast()`, `derive_immersion_params()`
- Validator functions named by intent: `must_be_positive()`, `temp_in_range()`, `grind_size_positive()`, `grind_source_consistent()`
- Internal helpers and module-level defaults prefixed with underscore: `_biexponential_steep()`, `_A1_DEFAULT`, `_TAU1_DEFAULT`
- Parametric utilities use verb form: `derive_immersion_params()`, `resolve_psd()`, `estimate_flavor_profile()`

**Variables:**
- Local: snake_case (`coffee_dose`, `brew_time`, `scale_factor`)
- Physics constants: UPPERCASE_SNAKE (`K_liang`, `E_max`, `rho_w`, `V_DARCY_MAX`)
- Physics parameters follow domain notation: `k_sv1`, `k_sv2`, `phi_h`, `psi_s`, `kA`, `kB`
- Abbreviated domain names used directly: `ey`, `tds_percent`, `c_sat`, `c_h0`, `c_v0`

**Test fixtures (module-level):**
- UPPERCASE: `STANDARD_INPUT`, `STANDARD_FAST`, `V60_STANDARD`, `AEROPRESS_STANDARD`
- Scenario dicts use lowercase keys matching `SimulationInput` field names

### Code Style

**Formatting:**
- No formatter configured (no `.prettierrc`; `pyproject.toml` has no `[tool.ruff]` or `[tool.black]`)
- Indentation: 4 spaces (Python standard)
- Two blank lines between module-level definitions (classes, functions, constant groups)
- One blank line between method definitions inside a class

**Inline comments:**
- Right-aligned with spaces after type annotation, indicating units: `coffee_dose: float          # g`
- Physics constant comments include source paper and vault path:
  ```python
  K_liang = 0.717         # Equilibrium desorption constant [-]
  ```
- Section divider lines use unicode box-drawing character:
  ```python
  # ─────────────────────────────────────────────────────────────────────────────
  # SECTION TITLE
  # ─────────────────────────────────────────────────────────────────────────────
  ```

**Docstrings:**
- Module-level: single-line in double quotes (no triple): `"Pydantic input model for BrewOS simulation — per architecture_spec.md §3."`
- Class-level: triple-quoted, immediately after `class` statement: `"""All parameters required to run a BrewOS extraction simulation."""`
- Function-level: triple-quoted with `Args:`, `Returns:`, `Raises:` sections for non-trivial functions. Simple helpers use inline comments only.

### Import Organization

**Order:**
1. Standard library (`from enum import Enum`, `from typing import Optional, List`, `import math`, `import time`)
2. Third-party (`import numpy as np`, `from scipy.integrate import solve_ivp`, `from pydantic import BaseModel`)
3. Internal (`from brewos.models.inputs import SimulationInput`, `from brewos.utils.params import ...`)

**Style:**
- `from module import Name` for specific imports (not `import module`)
- `Optional[Type]` form, not `Type | None`
- All type hints explicit: `from typing import Optional, List`

### Error Handling

- Input validation via Pydantic `@field_validator` (single field) and `@model_validator(mode="after")` (cross-field)
- Validator message format: `"field_name must be condition"` — lowercase, direct
  - Example: `"pressure_bar must be >= 0"`, `"grind_size must be > 0 μm"`
- ODE solver failures: `raise RuntimeError(f"ODE solver failed: {sol.message}")`
- No try/except in business logic — validation delegated entirely to Pydantic
- Out-of-range grinder settings: `raise ValueError("out of range")`
- Unknown grinder names: `raise ValueError("not found")`

### Type Hints

- All function parameters and return types explicitly annotated
- `Optional[float] = None` (not `float | None`) — matches Python 3.9 compat pattern throughout
- No implicit `Any`
- Example signature: `def must_be_positive(cls, v: float) -> float:`

### Pydantic Model Patterns

- Inherit directly from `BaseModel`; no custom `__init__`
- Required fields before optional fields
- Optional fields annotated `Optional[Type] = None`
- `@field_validator("field_name")` + `@classmethod` for single-field rules
- `@model_validator(mode="after")` for cross-field consistency checks (see `grind_source_consistent` in `brewos/models/inputs.py`)
- String enums inherit `str, Enum` for transparent JSON serialization
- Output models use nested Pydantic objects: `ExtractionPoint`, `FlavorProfile`, `PSDPoint`, `TempPoint`, `SCAPosition`
- Optional output fields default to `None` and are set by solvers where applicable (`channeling_risk`, `puck_resistance`)

**Example from `brewos/models/inputs.py`:**
```python
@field_validator("coffee_dose", "water_amount", "brew_time")
@classmethod
def must_be_positive(cls, v: float) -> float:
    if v <= 0:
        raise ValueError("must be positive")
    return v
```

### Numerical Code Patterns

- Physics constants defined at module level in `brewos/utils/params.py`, grouped by source paper with vault reference comments
- Groups labeled: `# VAULT PARAMETERS —`, `# ESTIMATED PARAMETERS —`
- Intermediate calculations stored in named variables for clarity (avoid chaining)
- Bound clamping via `max(0.0, min(var, limit))` for scalars
- `np.maximum(array, 0.0)` for array-level non-negativity enforcement
- `np.linspace(0.0, t_end, n_pts)` for time evaluation grids
- `solve_ivp` always called with `method='Radau'`, tolerances `rtol=1e-8, atol=1e-10`
- Scale factors computed post-solve and applied to raw arrays before building output objects

**Example bound clamping (from `brewos/solvers/immersion.py`):**
```python
c_h   = max(0.0, min(c_h,   c_sat))
c_v   = max(0.0, min(c_v,   c_sat))
psi_s = max(0.0, min(psi_s, 1.0))
```

### Method Module Pattern

Each method module in `brewos/methods/` exports:
- `simulate(inp: SimulationInput) -> SimulationOutput` — dispatches to fast or accurate solver based on `inp.mode`
- A `{METHOD_UPPER}_DEFAULTS` dict with keys: `brew_time`, `water_temp`, `brew_ratio_min`, `brew_ratio_max`, plus method-specific keys
- Example: `brewos/methods/french_press.py` exports `FRENCH_PRESS_DEFAULTS`; `brewos/methods/moka_pot.py` exports `MOKA_POT_DEFAULTS`

---

## TypeScript / React Native Conventions

### Naming Patterns

**Files:**
- Screen files (in `app/`): lowercase filename, default export: `dashboard.tsx`, `results.tsx`, `history.tsx`
- Component files: PascalCase matching the exported function name: `FormField.tsx`, `SCAChart.tsx`, `RotarySelector.tsx`
- Hook files: camelCase prefixed `use`: `useSimulation.ts`, `useRunHistory.ts`, `useHealthCheck.ts`
- Constant files: camelCase: `colors.ts`, `typography.ts`, `spacing.ts`, `brewMethods.ts`, `api.ts`
- Test files: `ComponentName.test.tsx` or `hookName.test.ts` in `brewos-engine/keif-mobile/__tests__/unit/`

**Components:**
- Named exports (not default): `export function SCAChart(...)`, `export function FormField(...)`
- Screen files (in `app/`) use default exports: `export default function DashboardScreen()`
- Props interface named `{ComponentName}Props`: `SCAChartProps`, `FormFieldProps`

**Variables and state:**
- camelCase: `selectedGrinder`, `grinderSetting`, `isManualGrinder`
- Boolean state: descriptive — `loading`, `backendReady`, `currentRunSaved`
- Handler functions: `handle` prefix — `handleSimulate`, `handleSelect`

**Constants:**
- UPPER_SNAKE for chart zone config objects: `FILTER_ZONE`, `ESPRESSO_ZONE`
- Exported constant objects: UPPER for collections — `Colors`, `Typography`, `Spacing`, `BREW_METHODS`, `GRINDER_PRESETS`

### Code Style

**TypeScript:**
- TypeScript 5.3 (see `brewos-engine/keif-mobile/package.json`)
- `interface` for component props and data shapes: `interface FormFieldProps { ... }`
- `type` for union types and aliases: `type GrinderPreset = (typeof GRINDER_PRESETS)[number]`
- `as const` on all exported constant objects: `export const Colors = { ... } as const`
- `import type` for type-only imports: `import type { SimulationInput } from "../types/simulation"`

**Formatting:**
- 2-space indentation
- Double quotes for JSX string props; template literals for dynamic strings
- Arrow functions with `useCallback` for handlers that appear in dependency arrays or are passed as props

### Component Patterns

**Structure order within a file:**
1. Imports (React, RN primitives, Expo/navigation, third-party, local constants, local components, type imports)
2. Interface definitions for props
3. Module-level constants (zone configs, etc.)
4. Helper functions (e.g., `getChartConfig()`)
5. Named component export function
6. `StyleSheet.create({})` at bottom of file

**StyleSheet:**
- Always use `StyleSheet.create({})` — never inline style objects
- Styles defined at module level (not inside the component function body)
- Style keys: camelCase — `container`, `fieldRow`, `historyButtonText`
- Spread Typography presets: `...Typography.label`, `...Typography.body` — never repeat font values inline
- Color references always from `Colors` — never hardcoded hex strings in styles
- Spacing references from `Spacing` — `Spacing.sm`, `Spacing.md`, `Spacing.xl`, `Spacing.xxl`

**Example from `brewos-engine/keif-mobile/components/FormField.tsx`:**
```typescript
const styles = StyleSheet.create({
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldRow: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceField,
    borderColor: Colors.borderSubtle,
    borderRadius: 12,
    height: 48,
  },
});
```

**Accessibility:**
- `accessibilityLabel` on interactive elements and charts
- `accessibilityRole="button"` on `TouchableOpacity` components
- Charts include descriptive label with rendered values: `` `SCA brew chart. TDS ${tds.toFixed(2)}%, EY ${ey.toFixed(1)}%` ``

### Hook Patterns

- Function name: `use{Domain}` — `useSimulation`, `useRunHistory`, `useHealthCheck`
- Returns an object (not an array) for multi-value hooks
- `useCallback` wraps all functions referenced in dependency arrays or passed to children
- State typed with explicit generics: `useState<SimulationOutput | null>(null)`

**Error state convention:**
- `error` is `string | null` — human-readable message, not an `Error` object
- `clearError` callback exposed from hook: `const clearError = useCallback(() => setError(null), [])`

**Example from `brewos-engine/keif-mobile/hooks/useSimulation.ts`:**
```typescript
export function useSimulation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (input: SimulationInput) => {
    setLoading(true);
    setError(null);
    // ...
  }, []);

  return { simulate, loading, result, error, clearError, clearResult };
}
```

### Context Pattern

- Context value typed with an explicit interface: `interface SimulationResultContextValue { ... }`
- Created with `createContext<Type | null>(null)`
- Provider exported as `{Domain}Provider`: `export function SimulationResultProvider(...)`
- Consumer hook throws if used outside provider:
  ```typescript
  if (!context) throw new Error("useSimulationResult must be used within a SimulationResultProvider");
  ```
- Files live in `brewos-engine/keif-mobile/context/` — e.g., `context/SimulationResultContext.tsx`

### Constants Organization

All constants use `as const` and are referenced by name throughout the app — never copy-paste values:

- `constants/colors.ts` — `Colors` — all UI colors by semantic name
- `constants/typography.ts` — `Typography` — `label`, `body`, `heading`, `display` presets
- `constants/spacing.ts` — `Spacing` — named spacing sizes
- `constants/brewMethods.ts` — `BREW_METHODS` array, `GRINDER_PRESETS` array
- `constants/api.ts` — `API_BASE_URL`

### Import Organization (TypeScript)

**Order:**
1. React and React Native: `import React from "react"`, `import { View, Text } from "react-native"`
2. Expo and navigation: `import { useRouter } from "expo-router"`
3. Third-party libraries: `import { CartesianChart } from "victory-native"`
4. Local constants: `import { Colors } from "../constants/colors"`
5. Local components: `import { FormField } from "../components/FormField"`
6. Local hooks: `import { useSimulation } from "../hooks/useSimulation"`
7. Type imports last: `import type { SimulationInput } from "../types/simulation"`

**Path style:**
- Relative paths with `../` prefix; no path aliases configured
- `"../constants/..."`, `"../components/..."`, `"../hooks/..."`, `"../types/..."`

---

*Convention analysis: 2026-04-01*

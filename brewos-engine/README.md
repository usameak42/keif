![Tests](https://github.com/usameak42/keif/actions/workflows/test.yml/badge.svg)

# Keif (BrewOS)

Physics-based coffee extraction simulation engine with a cross-platform mobile app. Simulates TDS% and extraction yield from first principles using peer-reviewed ODE/PDE models — predicts brew outcomes from grinder setting, dose, and water parameters before you touch a kettle.

**Status: Phases 1–7 complete — engine + mobile app with run history and compare view**

## Repository Structure

```
brewos-engine/
├── brewos/          # Python simulation engine
├── keif-mobile/     # Expo / React Native mobile app (iOS + Android)
├── tests/           # Engine test suite (164 tests)
└── poc/             # Original proof-of-concept scripts
```

## Mobile App (keif-mobile)

Expo / React Native app that wraps the BrewOS engine in a native UI.

**Screens**
| Screen | Description |
|--------|-------------|
| Home | Method selector, brew parameters, rotary grind dial |
| Results | TDS%, EY%, SCA position, flavor profile, extraction curve |
| Extended | Full 13-output detail view with all charts |
| History | Saved runs list with delete; tap to view any past result |
| Compare | Side-by-side metric columns + overlaid extraction curves + flavor bars |

**Tech stack:** Expo SDK 52, React Native, Victory Native (charts), expo-sqlite (run persistence), TypeScript

### Running the app

```bash
cd keif-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i`/`a` for simulator.

## Engine

### Models

| Model | Reference | Used for |
|-------|-----------|---------|
| Moroney 2016 3-ODE | Moroney et al. (2016) | Immersion accurate mode (French Press, AeroPress steep) |
| Moroney 2015 1D PDE | Moroney et al. (2015) | Percolation accurate mode (V60, Kalita, Espresso) |
| Maille 2021 biexponential | Maille et al. (2021) | Fast mode for all methods (< 1 ms) |
| Liang 2021 equilibrium | Liang et al. (2021) | K = 0.717 anchor applied post-solve in all accurate solvers |
| Smrke 2018 CO2 bloom | Smrke et al. (2018) | Multiplicative modifier on mass-transfer coefficient during bloom |
| Lee 2023 channeling | Lee et al. (2023) | Two-pathway overlay for espresso channeling risk score |
| Taip 2025 caffeine | Taip et al. (2025) | Empirical caffeine concentration estimate |

### Brew Methods

| Method | Solver | Accurate mode |
|--------|--------|---------------|
| French Press | Immersion | Moroney 2016 3-ODE |
| V60 | Percolation | Moroney 2015 1D PDE + Darcy flow + MOL |
| Kalita Wave | Percolation | Moroney 2015 1D PDE + restricted 3-hole flow |
| Espresso | Percolation | Moroney 2015 + 9 bar Darcy + Lee 2023 channeling overlay |
| Moka Pot | Pressure | 6-ODE thermo-fluid system with steam pressure |
| AeroPress | Hybrid | Immersion steep → pressure push (Darcy washout) |

### Outputs

Every simulation returns a `SimulationOutput` with 13 fields:

| Field | Description |
|-------|-------------|
| `tds_percent` | Total Dissolved Solids % |
| `extraction_yield` | Extraction Yield % |
| `extraction_curve` | Time-resolved EY vs time `[{t, ey}, ...]` |
| `psd_curve` | Particle size distribution `[{size_um, fraction}, ...]` |
| `flavor_profile` | Flavor axis scores `{sour, sweet, bitter}` normalized 0–1 |
| `brew_ratio` | Actual water/coffee ratio used |
| `brew_ratio_recommendation` | Advisory if ratio is outside optimal range |
| `warnings` | Over-extraction, channeling risk, out-of-range ratio |
| `channeling_risk` | [0, 1] risk score — espresso only (Lee 2023) |
| `extraction_uniformity_index` | [0, 1] flow uniformity — percolation methods only |
| `temperature_curve` | Water temp decay T(t) via Newton's Law of Cooling |
| `sca_position` | SCA Brew Control Chart position and zone classification |
| `puck_resistance` | [0, 1] puck tightness estimate — espresso only |
| `caffeine_mg_per_ml` | Caffeine concentration estimate (Taip 2025) |

### Grinder Presets

| Grinder | Settings | Resolution |
|---------|----------|------------|
| Comandante C40 MK4 | 1–40 clicks | Exact per-click micron map + bimodal PSD |
| 1Zpresso J-Max | 1–90 clicks | 8.8 μm/click + bimodal PSD |
| Baratza Encore | 1–40 settings | 23 μm/step + bimodal PSD |

Manual grind size (μm) falls back to a generic log-normal PSD.

### Usage

```python
from brewos.models.inputs import SimulationInput, Mode, RoastLevel
from brewos.methods.french_press import simulate

inp = SimulationInput(
    coffee_dose=15.0,
    water_amount=250.0,
    water_temp=93.0,
    grind_size=700.0,
    brew_time=240.0,
    roast_level=RoastLevel.medium,
    mode=Mode.accurate,
)

result = simulate(inp)
print(f"TDS: {result.tds_percent:.2f}%  EY: {result.extraction_yield:.2f}%")
print(f"SCA zone: {result.sca_position.zone}")
```

### Installation

```bash
pip install -e ".[dev]"
```

Requires Python 3.11+. Dependencies: `scipy`, `numpy`, `pydantic>=2.0`.

### Tests

```bash
pytest
```

164 tests across all solvers, methods, modes, grinder presets, and all 13 output fields.

### Performance

| Mode | Target | Mechanism |
|------|--------|-----------|
| Fast | < 1 ms | Maille 2021 biexponential kinetics |
| Accurate | < 4 s | SciPy `solve_ivp` (Radau) ODE/PDE solver |

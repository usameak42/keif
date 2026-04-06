# BrewOS Engine

Physics-based coffee extraction simulation engine. Predicts TDS%, extraction yield, and flavor profile from grinder settings, dose, and water parameters -- before you brew.

## What It Does

BrewOS uses peer-reviewed extraction models (Moroney, Maille, Liang, Siregar) to simulate coffee extraction kinetics across 6 major brew methods. Given a set of physical parameters -- grind size, dose, water temperature, brew time, pressure -- it solves the underlying ODE/PDE systems and returns time-resolved extraction curves, particle size distributions, SCA brew control chart positioning, and sour/sweet/bitter flavor predictions.

This is not a recipe app. It is a numerical simulation tool.

## Features

- 6 brew methods: French Press, V60, Kalita Wave, Espresso, Moka Pot, AeroPress
- 3 physics solvers: immersion ODE, percolation PDE, pressure/thermal ODE
- Dual execution modes: fast (<1 ms biexponential) and accurate (<4 s full ODE/PDE)
- Grinder database with particle size distributions (Comandante C40 MK4, 1Zpresso J-Max, Baratza Encore)
- CO2 bloom modeling and channeling risk estimation
- Time-resolved extraction curves and PSD visualization
- SCA brew control chart positioning
- Flavor profile prediction (sour/sweet/bitter) anchored to SCA extraction order
- FastAPI backend with `/simulate` and `/health` endpoints

## Architecture Overview

| Layer   | Stack                                      |
|---------|--------------------------------------------|
| Engine  | Python 3.11+ / NumPy / SciPy / Pydantic 2.0 |
| API     | FastAPI                                    |
| Mobile  | Expo SDK 52 / React Native (iOS + Android) |
| Charts  | Victory Native + Shopify React Native Skia |
| Storage | expo-sqlite (run history persistence)      |

## Project Structure

```
brewos-engine/
  brewos/
    solvers/
      immersion.py          # Moroney 2016 immersion ODE
      percolation.py        # Moroney 2015 percolation PDE
      pressure.py           # Siregar 2026 pressure/thermal ODE
    methods/
      french_press.py       # Immersion solver dispatch
      v60.py                # Percolation solver dispatch
      kalita.py             # Percolation solver dispatch
      espresso.py           # Percolation solver dispatch
      moka_pot.py           # Pressure solver dispatch
      aeropress.py          # Hybrid immersion + pressure dispatch
    models/
      inputs.py             # SimulationInput (Pydantic 2.0)
      outputs.py            # SimulationOutput, ExtractionPoint, PSD, FlavorProfile
    utils/
      channeling.py         # Channeling risk estimation
      co2_bloom.py          # CO2 bloom extraction suppression
      output_helpers.py     # Extended output assembly
      params.py             # Physical parameter resolution
      psd.py                # Particle size distribution utilities
    grinders/
      comandante_c40_mk4.json
      1zpresso_j-max.json
      baratza_encore.json
    api.py                  # FastAPI application
  keif-mobile/
    app/                    # Expo Router screens (7 screens)
    components/             # 28 React Native components
    hooks/                  # useSimulation, useHealthCheck, useRunHistory, useRunComparison
    context/                # SimulationResultContext (cross-screen state)
  tests/                    # 22 test files (pytest)
  pyproject.toml
```

## Physics Models

| Model | Reference | Usage |
|-------|-----------|-------|
| Immersion ODE | Moroney et al. (2016) | French Press, AeroPress steep phase |
| Percolation PDE | Moroney et al. (2015) | V60, Kalita Wave, Espresso |
| Biexponential kinetics | Maille et al. (2021) | Fast mode for all methods (<1 ms) |
| Equilibrium anchor | Liang et al. (2021) | EY scaling via K=0.717 |
| Pressure/thermal ODE | Siregar et al. (2026) | Moka Pot, AeroPress push phase |

## Quick Start

### Engine

```bash
cd brewos-engine
pip install -e .
pytest
```

### API

```bash
uvicorn brewos.api:app --reload
```

### Mobile

```bash
cd keif-mobile
npm install
npx expo start
```

## API Usage

```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "coffee_dose": 30.0,
    "water_amount": 500.0,
    "water_temp": 96.0,
    "grind_size": 800.0,
    "brew_time": 240.0,
    "roast_level": "medium",
    "method": "french_press",
    "mode": "fast"
  }'
```

Returns a `SimulationOutput` with TDS%, extraction yield, time-resolved extraction curve, particle size distribution, flavor profile, and SCA chart coordinates.

## Testing

22 test files covering immersion, percolation, and pressure solvers; fast and accurate modes; extended outputs; API endpoints; grinder database lookups; cross-method tolerance comparisons; CO2 bloom modeling; and all 6 brew methods.

```bash
pytest                    # run all tests
pytest tests/ -v          # verbose output
pytest tests/ -k "fast"   # run only fast-mode tests
```

## License

TBD

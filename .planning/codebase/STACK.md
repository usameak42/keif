# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- Python 3.11+ - Physics engine, API server, models, and solvers (`brewos/`)
- TypeScript 5.3 - Mobile app, components, hooks, and type contracts (`brewos-engine/keif-mobile/`)

**Secondary:**
- JSON - Grinder database profiles (`brewos/grinders/*.json`)

---

## Python Engine (`brewos/`)

### Runtime

**Environment:**
- Python 3.12 (Dockerfile FROM), 3.11+ minimum (pyproject.toml `requires-python`)

**Package Manager:**
- pip / setuptools >= 68
- Lockfile: Not present (requirements.txt pinned to package names only, no hashes or version pins beyond `fastapi>=0.115,<0.136` and `uvicorn>=0.29`)

### Frameworks

**API:**
- FastAPI >= 0.115, < 0.136 - HTTP server exposing `/health` and `/simulate` endpoints (`brewos/api.py`)
- uvicorn >= 0.29 - ASGI server; Dockerfile CMD is `uvicorn brewos.api:app --host 0.0.0.0 --port 8000`

**Validation:**
- Pydantic >= 2.0 - All simulation inputs/outputs validated via `SimulationInput` and `SimulationOutput` BaseModels (`brewos/models/inputs.py`, `brewos/models/outputs.py`)

**Physics / Numerics:**
- SciPy - ODE/PDE solvers (`scipy.integrate.solve_ivp`) used in accurate mode (`brewos/solvers/`)
- NumPy - Array operations throughout solvers and utilities

**Testing:**
- pytest - Test runner; 21 test files in `tests/`
- httpx - HTTP client for API integration tests (dev dependency)

### Build

**Build System:**
- setuptools.backends.legacy (`pyproject.toml`)
- Package discovery: `include = ["brewos*"]` from repo root

**Container:**
- Docker (`Dockerfile` at root) — `python:3.12-slim` base image, exposes port 8000

### Key Dependencies

| Package | Version Constraint | Purpose |
|---|---|---|
| `fastapi` | >=0.115,<0.136 | REST API framework |
| `uvicorn` | >=0.29 | ASGI production server |
| `pydantic` | >=2.0 | Input/output validation |
| `scipy` | unpinned | ODE/PDE solvers for accurate mode |
| `numpy` | unpinned | Numerical array operations |
| `pytest` | dev only | Test runner |
| `httpx` | dev only | API test client |

---

## Mobile App (`brewos-engine/keif-mobile/`)

### Runtime

**Environment:**
- Node.js (version not pinned; managed by Expo toolchain)
- React Native 0.76.9 via Expo ~52.0.49

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

### Frameworks

**Core:**
- Expo ~52.0.49 - Cross-platform React Native build toolchain; provides managed workflow
- React Native 0.76.9 - Native iOS/Android rendering
- React 18.3.1 - UI component model

**Navigation:**
- Expo Router ~4.0.22 - File-based routing (`app/` directory); entry point is `expo-router/entry`
- `@react-navigation/stack` ^7.1.1 - Stack navigation primitives

**Animation & Gestures:**
- react-native-reanimated ~3.16.7 - Declarative animation (Babel plugin required in `babel.config.js`)
- react-native-gesture-handler ~2.20.2 - Touch/gesture primitives

**Graphics / Charts:**
- `@shopify/react-native-skia` 1.5.0 - GPU-accelerated 2D canvas drawing
- `victory-native` ^41.20.2 - Chart library for extraction curves, PSD curves, SCA charts

**Persistence:**
- `expo-sqlite` ~14.0.6 - On-device SQLite database for saved simulation runs (`hooks/useRunHistory.ts`, `hooks/useRunComparison.ts`)
- `@react-native-async-storage/async-storage` 1.23.1 - Key-value storage for lightweight preferences

**Fonts & Icons:**
- `@expo-google-fonts/inter` ^0.4.2 - Inter font family
- `@expo/vector-icons` ~14.0.4 - Icon set

**Build / Dev:**
- TypeScript ~5.3.3 (strict mode via `tsconfig.json`)
- `babel-preset-expo` ~12.0.12
- `@expo/ngrok` ^4.1.0 - Tunnel for local API development

### Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~52.0.49 | Managed React Native toolchain |
| `react-native` | 0.76.9 | Cross-platform native UI |
| `expo-router` | ~4.0.22 | File-based navigation |
| `victory-native` | ^41.20.2 | Physics charts (extraction curve, PSD, SCA) |
| `@shopify/react-native-skia` | 1.5.0 | GPU canvas rendering |
| `expo-sqlite` | ~14.0.6 | Local run history database |
| `react-native-reanimated` | ~3.16.7 | UI animations |

### Testing

**Runner:**
- Jest ^29.7.0 with jest-expo ~52.0.6 preset
- Config: `jest.config.js`

**Libraries:**
- `@testing-library/react-native` ^13.3.3
- `@testing-library/jest-native` ^5.4.3
- `@types/jest` ^29.5.14

---

## Configuration

**Engine Environment:**
- `EXPO_PUBLIC_API_URL` - Backend base URL consumed by `brewos-engine/keif-mobile/constants/api.ts`
  - Default (production): `https://entire-ursa-4keif2-d4539572.koyeb.app` (set in `app.config.ts`)
  - Fallback in `constants/api.ts`: `https://keif-api.koyeb.app`

**Build Config Files:**
- `D:/Coding/Keif/pyproject.toml` - Python package, dependencies, pytest config
- `D:/Coding/Keif/requirements.txt` - Flat pip install list for Docker
- `D:/Coding/Keif/Dockerfile` - Container build for engine deployment
- `D:/Coding/Keif/brewos-engine/keif-mobile/app.config.ts` - Expo app config, API URL injection
- `D:/Coding/Keif/brewos-engine/keif-mobile/tsconfig.json` - TypeScript strict mode
- `D:/Coding/Keif/brewos-engine/keif-mobile/babel.config.js` - Babel with reanimated plugin

---

## Platform Requirements

**Engine Development:**
- Python 3.11+
- pip / setuptools
- pytest + httpx for tests

**Engine Production:**
- Docker (`python:3.12-slim` image)
- Port 8000 exposed; deployed to Koyeb

**Mobile Development:**
- Node.js + npm
- Expo CLI (`expo start`)
- iOS Simulator or Android Emulator, or Expo Go

**Mobile Production:**
- iOS (Expo managed build)
- Android (Expo managed build)

---

*Stack analysis: 2026-04-01*

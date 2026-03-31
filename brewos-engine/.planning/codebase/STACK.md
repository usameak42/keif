# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- Python 3.12 (3.12.5) - Core physics simulation engine and data models

**Secondary:**
- JSON - Grinder configuration and data serialization

## Runtime

**Environment:**
- CPython 3.12.5

**Package Manager:**
- pip (via setuptools)
- Lockfile: Not present (uses pyproject.toml with version pinning)

## Frameworks

**Core:**
- Pydantic 2.0+ - Input/output data validation and serialization; used in `brewos/models/inputs.py` and `brewos/models/outputs.py` for SimulationInput and SimulationOutput models

**Scientific Computing:**
- NumPy - Numerical arrays and matrix operations for coffee extraction calculations
- SciPy - ODE integration via `scipy.integrate.solve_ivp` (Radau method) for Moroney (2016) extraction kinetics in `poc/moroney_2016_immersion_ode.py`
- Matplotlib - Plotting and visualization for simulation results (proof-of-concept plots)

**Testing:**
- pytest - Test runner and assertions; configured in `pyproject.toml` with testpaths pointing to `tests/` directory

**Build/Dev:**
- setuptools 68+ - Package building and distribution; legacy build backend in `pyproject.toml`

## Key Dependencies

**Critical:**
- scipy - Implements differential equation solving for extraction physics; no re-adsorption modeling without this
- numpy - Array computations for grind size distributions and time-series extraction curves
- pydantic >=2.0 - Type validation for all simulation inputs (coffee_dose, water_temp, grind_size, etc.) and outputs (TDS, extraction_yield, flavor_profile)

**Infrastructure:**
- matplotlib - PoC visualization only; not required in production if removing `poc/` module

## Configuration

**Environment:**
- `pyproject.toml` at project root specifies all package metadata, dependencies, and pytest configuration
- No external .env files or secrets management currently implemented
- Test configuration: `[tool.pytest.ini_options]` sets testpaths to `["tests"]`

**Build:**
- `setup.py` not present; using modern `pyproject.toml` with setuptools legacy backend
- Package discovery includes all `brewos*` modules

## Platform Requirements

**Development:**
- Python 3.12+
- Virtual environment recommended (`.venv/`, `venv/`, or `env/`)
- pip for dependency installation

**Production:**
- Python 3.12+ runtime
- NumPy and SciPy compiled wheels (typically available via PyPI)
- Deployment target: Standalone Python library; no web server or container runtime specified yet
- CPU-bound scientific computing (no GPU acceleration configured)

## Version Constraints

**Minimum Python:**
- `requires-python = ">=3.11"` (per `pyproject.toml`, but tested with 3.12)

**Dependency Versions:**
- Pydantic: >=2.0 (v2 API required for field_validator and model_validator)
- SciPy: No explicit version constraint; uses modern `solve_ivp` API
- NumPy: No explicit version constraint
- pytest: Pinned in dev dependencies (dev = ["pytest"])
- setuptools: >=68

---

*Stack analysis: 2026-03-26*

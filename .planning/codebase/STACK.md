# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- Python 3.11+ - Core physics simulation engine, models, and solvers

**Secondary:**
- JSON - Grinder database and configuration data storage

## Runtime

**Environment:**
- Python 3.11 or higher (specified in `pyproject.toml`)

**Package Manager:**
- pip/setuptools - Standard Python package management
- Lockfile: Not detected

## Frameworks

**Core:**
- Pydantic 2.0+ - Input/output data validation and serialization in `brewos/models/`

**Testing:**
- pytest - Test framework (optional dev dependency in `pyproject.toml`)

**Build/Dev:**
- setuptools >= 68 - Package building and distribution

## Key Dependencies

**Critical:**
- scipy - Numerical computation, ODE/PDE solving (required for physics simulations)
- numpy - Array and numerical operations (required for scientific computation)
- pydantic >= 2.0 - Data validation models for SimulationInput and output serialization

**Infrastructure:**
- pytest - Testing framework for validation and smoke tests

## Configuration

**Environment:**
- Configuration via environment variables not detected in current codebase
- Parameters passed programmatically to SimulationInput model

**Build:**
- `pyproject.toml` - Single source of truth for dependencies, Python version, and test configuration
- setuptools.backends.legacy for build system

## Platform Requirements

**Development:**
- Python 3.11+
- pip/setuptools for dependency management
- pytest for running test suite

**Production:**
- Python 3.11+
- scipy, numpy, pydantic runtime dependencies only
- No external services or databases required (standalone physics engine)

## Notable Characteristics

- **No external API dependencies** - Pure Python scientific computing
- **No web framework** - Designed as computation library, not web service
- **JSON-based grinder data** - Static configuration stored in `brewos/grinders/comandante_c40_mk4.json`
- **Minimal dependencies** - Only scipy, numpy, pydantic required (lightweight for a physics engine)
- **Type-safe via Pydantic** - All inputs validated through SimulationInput model in `brewos/models/inputs.py`

---

*Stack analysis: 2026-03-26*

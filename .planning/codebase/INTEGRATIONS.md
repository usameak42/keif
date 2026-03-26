# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**Not detected** - This is a standalone physics simulation library with no external API integrations.

## Data Storage

**Databases:**
- Not used - No database integration

**File Storage:**
- Local filesystem only - Static grinder data stored as JSON in `brewos/grinders/`
- Configuration: `brewos/grinders/comandante_c40_mk4.json` - Placeholder grinder profile with burr specs

**Caching:**
- Not implemented

## Authentication & Identity

**Auth Provider:**
- Not applicable - No authentication required (standalone computational library)

## Monitoring & Observability

**Error Tracking:**
- Not integrated - No error tracking service

**Logs:**
- Console/stdout only - Simple print-based output for simulation results
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Not applicable - Library package, not a deployed service
- Designed for embedding in other applications or command-line use

**CI Pipeline:**
- Not detected - No CI configuration files found

## Environment Configuration

**Required env vars:**
- None - Application configured entirely through programmatic SimulationInput (see `brewos/models/inputs.py`)

**Secrets location:**
- Not applicable

## Webhooks & Callbacks

**Incoming:**
- Not implemented

**Outgoing:**
- Not implemented

## Data Flow

**Simulation Execution Path:**

1. Consumer creates `SimulationInput` with coffee parameters (dose, water temp, brew method, etc.)
2. Pydantic validates all inputs through field validators in `brewos/models/inputs.py`
3. Solver selected based on brew method:
   - Immersion methods (French Press, V60, Kalita, AeroPress) → `brewos/solvers/immersion.py` (Moroney 2016 ODE)
   - Percolation methods → `brewos/solvers/percolation.py` (Moroney 2015 PDE)
   - Pressure methods (Espresso, Moka Pot) → `brewos/solvers/pressure.py` (model TBD)
4. Physics solver computes TDS and extraction yield using peer-reviewed models
5. Results returned as `SimulationOutput` (serializable Pydantic model)

## Integration Points for Future Development

**Grinder Integration:**
- Currently: Static JSON lookup via `grinder_name` + `grinder_setting` in `brewos/grinders/comandante_c40_mk4.json`
- Future: Could integrate with external grinder database API or expand JSON grinder profiles

**Input Sources:**
- Currently: Programmatic only via SimulationInput
- Future: Could add REST API wrapper, file upload handler, or UI form integration

**Output Consumption:**
- Currently: Pydantic model serializable to JSON/dict
- Future: Could add database persistence, visualization API, or webhook callbacks

---

*Integration audit: 2026-03-26*

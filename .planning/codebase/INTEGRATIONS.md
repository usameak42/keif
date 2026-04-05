# External Integrations

**Analysis Date:** 2026-04-01

## Engine ↔ Mobile App: Primary Integration

**Protocol:** REST over HTTP/HTTPS (JSON)

**Pattern:** Mobile app calls FastAPI backend; no direct Python import

**API Base URL:**
- Resolved at runtime in `brewos-engine/keif-mobile/constants/api.ts` via `expo-constants`
- Value injected from `EXPO_PUBLIC_API_URL` env var or `app.config.ts` `extra` field
- Production default: `https://entire-ursa-4keif2-d4539572.koyeb.app`
- Development: override with `EXPO_PUBLIC_API_URL=http://<local-ip>:8000`

**Endpoints:**

| Method | Path | Purpose | Caller |
|---|---|---|---|
| `GET` | `/health` | Liveness check; returns `{"status":"ok","version":"0.1.0"}` | `hooks/useHealthCheck.ts` |
| `POST` | `/simulate` | Run physics simulation; body = `SimulationInput`, response = `SimulationOutput` | `hooks/useSimulation.ts` |

**Request/Response Contract:**
- Request body matches `SimulationInput` Pydantic model (`brewos/models/inputs.py`)
- TypeScript mirror at `brewos-engine/keif-mobile/types/simulation.ts` (comment: "Mirrors brewos/models/inputs.py SimulationInput exactly")
- Response body matches `SimulationOutput` Pydantic model (`brewos/models/outputs.py`)
- TypeScript mirror: `SimulationOutput` interface in `brewos-engine/keif-mobile/types/simulation.ts`
- Validation errors: HTTP 422 with `{"detail": "Validation failed", "errors": [...]}` (custom handler in `brewos/api.py`)

**CORS:**
- `allow_origins=["*"]` — required for Expo Web; native iOS/Android ignores CORS
- `allow_methods=["GET", "POST", "OPTIONS"]`
- `allow_credentials=False`

---

## APIs & External Services

**External APIs:** None — the engine performs all computation locally; no third-party data APIs.

---

## Data Storage

### Mobile App: On-Device SQLite

- Library: `expo-sqlite` ~14.0.6 (legacy API)
- Database file: `keif-runs.db` (device-local, not synced)
- Table: `saved_runs` — stores serialized `SimulationInput` and `SimulationOutput` as JSON blobs
- Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS saved_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    created_at TEXT NOT NULL,  -- ISO 8601
    input_json TEXT NOT NULL,
    output_json TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
  )
  ```
- Access layer: `brewos-engine/keif-mobile/hooks/useRunHistory.ts` (CRUD), `brewos-engine/keif-mobile/hooks/useRunComparison.ts` (pair load)
- Archive pattern: soft-delete via `archived = 1`; hard delete also supported

### Engine: Static JSON Files

- Grinder profiles at `brewos/grinders/`: `comandante_c40_mk4.json`, `1zpresso_j-max.json`, `baratza_encore.json`
- Read at solver initialization; no database required
- Three presets surfaced in mobile via `brewos-engine/keif-mobile/constants/brewMethods.ts` `GRINDER_PRESETS`

**File Storage:** Local filesystem only (grinder JSON, SQLite on device)

**Caching:** None — every simulation is a fresh HTTP call; no client-side result cache

---

## Authentication & Identity

**Auth Provider:** None — the API is unauthenticated; all endpoints public

---

## Monitoring & Observability

**Error Tracking:** None — no Sentry, Datadog, or equivalent integrated

**Logs:**
- Engine: stdout only via uvicorn access log (no structured logging framework)
- Mobile: React Native console; no remote log aggregation

---

## CI/CD & Deployment

**Engine Hosting:**
- Platform: Koyeb (serverless container)
- URL: `https://entire-ursa-4keif2-d4539572.koyeb.app`
- Container built from `Dockerfile` at repo root; runs `uvicorn brewos.api:app --host 0.0.0.0 --port 8000`
- Cold-start latency handled in mobile by `useHealthCheck.ts` (5 s timeout + one retry)

**Mobile Distribution:**
- Platform: Expo managed build (iOS App Store + Google Play)
- Build config: `brewos-engine/keif-mobile/app.config.ts`

**CI Pipeline:** Not detected — no GitHub Actions or other CI config found

---

## Environment Configuration

**Required env vars (engine):**
- None at runtime; all parameters come through the HTTP request body

**Required env vars (mobile build):**
- `EXPO_PUBLIC_API_URL` — backend base URL; defaults to Koyeb production URL if absent

**Secrets location:**
- No secrets required by the codebase; API is unauthenticated

---

## Webhooks & Callbacks

**Incoming:** None

**Outgoing:** None

---

## Integration Data Flow

```
Mobile App                              Engine (Koyeb)
─────────────────────                   ──────────────────────────
useHealthCheck.ts
  GET /health ─────────────────────────► FastAPI /health
                ◄───────────────────────  {"status":"ok"}

index.tsx (form) → useSimulation.ts
  POST /simulate ──────────────────────► FastAPI /simulate
  body: SimulationInput (JSON)            │
                                          ▼
                                    brewos/api.py dispatch table
                                    → method.simulate(input)
                                    → solver (immersion/percolation/pressure)
                                    → SimulationOutput
                ◄────────────────────── SimulationOutput (JSON)

results.tsx renders:
  - TDS%, EY%, brew ratio
  - ExtractionCurveChart (victory-native)
  - PSDChart, SCAChart, FlavorBars
  - ZoneVerdict, ResultCalloutCard

useRunHistory.ts
  SQLite INSERT ──────────────────────── (device-local, no server involved)
  keif-runs.db:saved_runs
```

---

## Method Dispatch (Engine)

The `_DISPATCH` table in `brewos/api.py` maps the `method` field of `SimulationInput` to solver functions:

| `method` value | Python function | Solver |
|---|---|---|
| `french_press` | `french_press.simulate` | `brewos/solvers/immersion.py` |
| `v60` | `v60.simulate` | `brewos/solvers/percolation.py` |
| `kalita` | `kalita.simulate` | `brewos/solvers/percolation.py` |
| `espresso` | `espresso.simulate` | `brewos/solvers/pressure.py` |
| `moka_pot` | `moka_pot.simulate` | `brewos/solvers/pressure.py` |
| `aeropress` | `aeropress.simulate` | `brewos/solvers/immersion.py` |

---

*Integration audit: 2026-04-01*

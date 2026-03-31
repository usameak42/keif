"BrewOS Engine HTTP API — FastAPI wrapper for all 6 brew method simulations."

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput

from brewos.methods import french_press, v60, kalita, espresso, moka_pot, aeropress


app = FastAPI(title="BrewOS Engine", version="0.1.0")


# ─────────────────────────────────────────────────────────
# CORS — required for Expo Web; native iOS/Android ignores CORS
# ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,           # must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# ─────────────────────────────────────────────────────────
# VALIDATION ERROR HANDLER — readable 422s (API-02)
# ─────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        msg = error["msg"]
        errors.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation failed", "errors": errors},
    )


# ─────────────────────────────────────────────────────────
# METHOD DISPATCH TABLE
# ─────────────────────────────────────────────────────────

_DISPATCH = {
    "french_press": french_press.simulate,
    "v60":          v60.simulate,
    "kalita":       kalita.simulate,
    "espresso":     espresso.simulate,
    "moka_pot":     moka_pot.simulate,
    "aeropress":    aeropress.simulate,
}


# ─────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}


@app.post("/simulate", response_model=SimulationOutput)
async def simulate(body: SimulationInput) -> SimulationOutput:
    simulate_fn = _DISPATCH[body.method.value]
    return simulate_fn(body)

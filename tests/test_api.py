"""API integration tests — FastAPI /simulate and /health endpoints."""

from fastapi.testclient import TestClient
from brewos.api import app

client = TestClient(app)

_VALID_FRENCH_PRESS = {
    "coffee_dose": 15.0,
    "water_amount": 250.0,
    "water_temp": 93.0,
    "grind_size": 700.0,
    "brew_time": 240.0,
    "roast_level": "medium",
    "method": "french_press",
    "mode": "fast",
}


def test_health_returns_200() -> None:
    """API-04: /health returns 200 with status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_simulate_returns_200() -> None:
    """API-01: Valid SimulationInput returns 200 with complete SimulationOutput."""
    response = client.post("/simulate", json=_VALID_FRENCH_PRESS)
    assert response.status_code == 200
    data = response.json()
    assert data["tds_percent"] > 0
    assert data["extraction_yield"] > 0


def test_simulate_invalid_input_returns_422() -> None:
    """API-02: Invalid input returns 422 with human-readable errors list."""
    bad = dict(_VALID_FRENCH_PRESS)
    bad["water_temp"] = 150.0  # out of range — validator rejects values >= 100
    response = client.post("/simulate", json=bad)
    assert response.status_code == 422
    data = response.json()
    assert "errors" in data, f"Expected 'errors' key in response, got: {data}"
    assert any("water_temp" in e for e in data["errors"]), (
        f"Expected an error mentioning 'water_temp', got: {data['errors']}"
    )


def test_cors_headers() -> None:
    """API-03: CORS allow-origin header present and set to wildcard for cross-origin requests."""
    response = client.options(
        "/simulate",
        headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "*"

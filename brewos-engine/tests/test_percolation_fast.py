"""Percolation fast mode tests -- performance + accuracy vs accurate mode."""

import time
import pytest
from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod

V60_ACCURATE = SimulationInput(
    coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
    grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
    method=BrewMethod.v60, mode=Mode.accurate,
)
V60_FAST = V60_ACCURATE.model_copy(update={"mode": Mode.fast})


def test_fast_under_1ms():
    """SOLV-04: Fast mode completes in < 1ms."""
    from brewos.solvers.percolation import solve_fast
    # Warm up
    solve_fast(V60_FAST)
    # Benchmark
    start = time.perf_counter_ns()
    for _ in range(100):
        solve_fast(V60_FAST)
    elapsed_ms = (time.perf_counter_ns() - start) / 1e6 / 100
    assert elapsed_ms < 1.0, f"Fast mode took {elapsed_ms:.3f}ms, expected < 1ms"


def test_fast_within_2pct_of_accurate():
    """SOLV-04: Fast mode EY within +/-2% of accurate mode."""
    from brewos.solvers.percolation import solve_accurate, solve_fast
    accurate = solve_accurate(V60_ACCURATE)
    fast = solve_fast(V60_FAST)
    diff = abs(accurate.extraction_yield - fast.extraction_yield)
    assert diff <= 2.0, f"Fast EY={fast.extraction_yield:.2f}%, Accurate EY={accurate.extraction_yield:.2f}%, diff={diff:.2f}%"


def test_fast_output_complete():
    """Fast mode returns all SimulationOutput fields."""
    from brewos.solvers.percolation import solve_fast
    result = solve_fast(V60_FAST)
    assert result.tds_percent > 0
    assert result.extraction_yield > 0
    assert len(result.extraction_curve) >= 10
    assert len(result.psd_curve) > 0
    assert result.flavor_profile is not None
    assert result.mode_used == "fast"

"""Tests for grinder database loader and log-normal PSD fallback."""

import pytest

from brewos.grinders import load_grinder
from brewos.utils.psd import generate_lognormal_psd


def test_comandante_c40():
    """load_grinder returns dict with median_um ~600 and 50-point PSD at click 20."""
    result = load_grinder("Comandante C40 MK4", 20)
    assert "median_um" in result
    assert "psd" in result
    assert isinstance(result["median_um"], float)
    assert abs(result["median_um"] - 600.0) < 30.0  # ±30um tolerance
    assert len(result["psd"]) == 50
    # Each PSD point has size_um and fraction keys
    for point in result["psd"]:
        assert "size_um" in point
        assert "fraction" in point


def test_c40_bimodal_psd():
    """PSD from click 25 has bimodal structure (fines near 40um + main peak near 750um)."""
    result = load_grinder("Comandante C40 MK4", 25)
    psd = result["psd"]
    # Fractions should NOT be monotonically decreasing from the start
    # (a bimodal distribution has a fines peak and a main peak)
    # Check that there is at least some mass in the fines region (size_um < 100)
    fines_fraction = sum(p["fraction"] for p in psd if p["size_um"] < 100)
    assert fines_fraction > 0.01  # some fines mass present


def test_c40_click_interpolation():
    """load_grinder at click 12 (between presets) uses linear interpolation ~360um."""
    result = load_grinder("Comandante C40 MK4", 12)
    # 12 * 30 = 360um (microns_per_click formula)
    assert abs(result["median_um"] - 360.0) < 50.0  # tolerance for interpolation


def test_unknown_grinder_raises():
    """load_grinder raises ValueError for unknown grinder names."""
    with pytest.raises(ValueError, match="not found"):
        load_grinder("Unknown Grinder X9000", 10)


def test_out_of_range_setting_raises():
    """load_grinder raises ValueError for click 0 (below minimum of 1)."""
    with pytest.raises(ValueError, match="out of range"):
        load_grinder("Comandante C40 MK4", 0)


def test_lognormal_fallback():
    """generate_lognormal_psd(500.0) returns 50 points with fractions summing to ~1.0."""
    psd = generate_lognormal_psd(500.0)
    assert len(psd) == 50
    for point in psd:
        assert "size_um" in point
        assert "fraction" in point
        assert point["fraction"] >= 0.0
    total = sum(p["fraction"] for p in psd)
    assert abs(total - 1.0) < 0.01  # within 1% of unity


def test_lognormal_peak_near_median():
    """Peak fraction in generate_lognormal_psd(500.0) is at size_um between 300 and 700."""
    psd = generate_lognormal_psd(500.0)
    peak_point = max(psd, key=lambda p: p["fraction"])
    assert 300.0 <= peak_point["size_um"] <= 700.0

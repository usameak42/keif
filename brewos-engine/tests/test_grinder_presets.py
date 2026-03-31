"""Grinder preset tests -- Comandante C40, 1Zpresso J-Max, Baratza Encore."""

import pytest
from brewos.grinders import load_grinder


@pytest.mark.parametrize("name,setting,expected_um_range", [
    ("Comandante C40 MK4", 18, (400, 700)),
    ("Comandante C40 MK4", 25, (600, 900)),
    ("1Zpresso J-Max",     45, (300, 500)),
    ("1Zpresso J-Max",     18, (100, 250)),
    ("Baratza Encore",     15, (350, 550)),
    ("Baratza Encore",     5,  (150, 300)),
])
def test_grinder_load_and_median(name, setting, expected_um_range):
    """Grinder preset loads and returns median_um within expected range."""
    result = load_grinder(name, setting)
    lo, hi = expected_um_range
    assert lo <= result["median_um"] <= hi, (
        f"{name} setting {setting}: median_um {result['median_um']} outside [{lo}, {hi}]"
    )


@pytest.mark.parametrize("name,setting", [
    ("1Zpresso J-Max", 45),
    ("1Zpresso J-Max", 10),
    ("Baratza Encore", 15),
    ("Baratza Encore", 40),
])
def test_psd_bimodal_shape(name, setting):
    """PSD is a list of 50 points; fractions sum to ~1.0."""
    result = load_grinder(name, setting)
    psd = result["psd"]
    assert len(psd) == 50
    total_fraction = sum(p["fraction"] for p in psd)
    assert abs(total_fraction - 1.0) < 0.01, f"PSD fractions sum to {total_fraction}, expected ~1.0"
    # All sizes positive
    assert all(p["size_um"] > 0 for p in psd)


@pytest.mark.parametrize("name,lo,hi", [
    ("1Zpresso J-Max", 1, 90),
    ("Baratza Encore", 1, 40),
])
def test_out_of_range_raises(name, lo, hi):
    """Out-of-range setting raises ValueError."""
    with pytest.raises(ValueError):
        load_grinder(name, lo - 1)
    with pytest.raises(ValueError):
        load_grinder(name, hi + 1)


def test_baratza_fines_fraction_higher_than_comandante():
    """Baratza Encore should have higher fines fraction than Comandante (electric vs hand)."""
    import json
    import pathlib
    grinder_dir = pathlib.Path(__file__).parent.parent / "brewos" / "grinders"
    baratza = json.loads((grinder_dir / "baratza_encore.json").read_text())
    comandante = json.loads((grinder_dir / "comandante_c40_mk4.json").read_text())
    assert baratza["psd_model"]["fines_fraction"] > comandante["psd_model"]["fines_fraction"]

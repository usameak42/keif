"""
Basic smoke test for the Phase 8 PoC.

Runs the PoC script as a subprocess and asserts that the simulation produces
the expected equilibrium-scaled values:
  EY  ≈ 21.51 %   (K_liang × E_max × 100 = 0.717 × 0.30 × 100)
  TDS ≈  1.291 %  (EY / brew_ratio = 21.51 / 16.667)
"""

import os
import re
import subprocess
import sys


POC_SCRIPT = os.path.join(os.path.dirname(__file__), "..", "poc", "moroney_2016_immersion_ode.py")


def test_immersion_poc_ey_and_tds():
    result = subprocess.run(
        [sys.executable, POC_SCRIPT],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert result.returncode == 0, (
        f"PoC script exited with code {result.returncode}\n"
        f"stderr:\n{result.stderr}"
    )

    ey_match = re.search(r"EY_simulated\s*=\s*([\d.]+)", result.stdout)
    tds_match = re.search(r"TDS_simulated\s*=\s*([\d.]+)", result.stdout)

    assert ey_match, "Could not parse EY_simulated from PoC output"
    assert tds_match, "Could not parse TDS_simulated from PoC output"

    ey = float(ey_match.group(1))
    tds = float(tds_match.group(1))

    assert abs(ey - 21.51) < 0.05, f"EY = {ey:.4f} %, expected ≈ 21.51 %"
    assert abs(tds - 1.291) < 0.005, f"TDS = {tds:.4f} %, expected ≈ 1.291 %"

"Research for Phase 4: Extended Outputs + Grinder Presets"

## 1. Extraction Uniformity Index (OUT-07)

**Source**: Moroney et al. PLOS One 2019 — spatial non-uniformity in 1D percolation beds.

**Approach**: The percolation MOL solver produces `c_h[i]` (dissolved concentration in bulk water) at N=30 spatial nodes at solve completion. The final node concentrations capture spatial extraction heterogeneity.

**Formula**:
```
c_h_final = c_h[:, -1]   # shape (N,) at t_final
c_mean = mean(c_h_final)
if c_mean > 0:
    EUI = 1.0 - clip(std(c_h_final) / c_mean, 0, 1)
else:
    EUI = 1.0  # no extraction = trivially uniform
EUI = clip(EUI, 0.0, 1.0)
```

**Interpretation**: 1.0 = perfectly uniform (all nodes identical); 0.0 = maximally heterogeneous.

**Applicability**:
- Percolation methods (V60, Kalita, Espresso): directly computable from MOL c_h nodes.
- Immersion methods (French Press, AeroPress steep phase): well-mixed model → EUI = 1.0 by assumption.
- AeroPress push phase: treat as EUI = 1.0 (pressure push uniformizes).
- Moka Pot: pressure solver → use same logic as espresso if MOL is used; else set 0.85 as estimated constant.

**Implementation**: Add `extraction_uniformity_index: Optional[float] = None` to SimulationOutput. Percolation solver computes it; immersion/aeropress set 1.0; moka sets None or 0.85.

---

## 2. Water Temperature Decay (OUT-10)

**Model**: Newton's Law of Cooling
```
T(t) = T_ambient + (T_0 - T_ambient) * exp(-k * t)
```

**Parameters**:
- `T_ambient = 20.0°C` (room temperature default)
- `T_0 = inp.water_temp_c` (initial brewing temperature)
- `k` = vessel-specific heat loss coefficient (1/s)

**k values by vessel type** (from thermal physics of open brewing vessels):
| Method      | Vessel           | k (1/s)  | Notes                                         |
|-------------|------------------|----------|-----------------------------------------------|
| v60         | Glass/ceramic    | 0.0030   | Open cone, small water volume, high SA:V      |
| kalita      | Glass/stainless  | 0.0028   | Similar to V60, slightly lower SA:V           |
| french_press| Glass carafe     | 0.0025   | Enclosed, lid traps heat                      |
| aeropress   | Polycarbonate    | 0.0020   | Insulated cylinder, small mass                |
| espresso    | Group head steel | 0.0015   | Very short brew (<30s), minimal decay         |
| moka_pot    | Aluminum/steel   | 0.0     | Active stove heat source — model as constant T|

**Output format**: List of `{"t": float, "temp_c": float}` at same time points as extraction_curve.

**Moka Pot**: Active heat source → temperature stays approximately constant during brew. Set k=0.0 → flat curve.

**Implementation**: `compute_temperature_curve(t_eval, T_0, k)` helper in `output_helpers.py`. Each method passes its `k` value. Returns `List[TempPoint]` where `TempPoint` is a new Pydantic model.

---

## 3. SCA Brew Chart Position (OUT-11)

**Source**: SCA Brewing Control Chart (Golden Cup Standard).

**Boundaries**:
```
TDS_low  = 1.15%   TDS_high = 1.45%
EY_low   = 18.0%   EY_high  = 22.0%
```

**Classification**:
- `ideal`: TDS in [1.15, 1.45] AND EY in [18.0, 22.0]
- `under_extracted`: EY < 18.0 (regardless of TDS)
- `over_extracted`: EY > 22.0 (regardless of TDS)
- `weak`: TDS < 1.15 AND EY in range
- `strong`: TDS > 1.45 AND EY in range
- `complex`: multiple out-of-range axes simultaneously (e.g. over-extracted AND strong)

**Note for espresso**: TDS range is different (8-12%). The SCA chart for espresso uses its own brew control chart. For Phase 4, use the standard drip chart and flag espresso as N/A or use espresso-specific bounds:
- Espresso SCA: TDS 8-12%, EY 18-22%

**Implementation**: `classify_sca_position(tds_percent, extraction_yield, method_type)` returns a `SCAPosition` Pydantic model with fields: `tds_percent`, `ey_percent`, `zone` (str), `on_chart` (bool).

---

## 4. Puck/Bed Resistance (OUT-12)

**Source**: Darcy's Law for porous media flow.

**Formula**:
```
k_perm = (μ * L * u) / ΔP

where:
  μ = 0.00089 Pa·s   (water viscosity at 93°C ≈ 0.00032 Pa·s, use 0.00035)
  L = bed_depth_m    (0.025m for espresso)
  u = Darcy velocity (m/s) = Q / A_cross_section
  ΔP = pressure_bar * 1e5  (Pa)
```

**Bed resistance score** (dimensionless, 0-1):
```
k_ref = 1e-14  m²  (reference low permeability = tight puck)
k_high = 1e-12 m²  (reference high permeability = loose puck)
resistance = clip(1.0 - (k_perm - k_ref) / (k_high - k_ref), 0, 1)
```

**Alternative simpler approach** (used in Phase 4):
Compute apparent resistance as `R_bed = ΔP / u` in SI units (Pa·s/m), then normalize to a [0,1] score against reference bounds. Report both `bed_resistance_pa_s_per_m` (physical) and the normalized score `puck_resistance` (0-1, 1=tight).

**Applicability**: Espresso only. Set `puck_resistance = None` for all other methods.

**Values from the espresso solver**: `defaults["pressure_bar"]` = 9.0, `bed_depth_m` = 0.025, `bed_diameter_m` = 0.030. Darcy velocity from Kozeny-Carman already computed in `percolation.py` via `derive_percolation_params`.

---

## 5. Caffeine Concentration (OUT-13)

**Source**: Taip et al. 2025 (Taip 2025 — empirical caffeine transfer model). Since the exact paper formula is unavailable, use the well-established empirical relationship:

**Empirical model**:
```
caffeine_mg_per_mL = (coffee_dose_g * CAFFEINE_FRACTION * transfer_efficiency) / beverage_volume_mL

where:
  CAFFEINE_FRACTION = 0.012   # 1.2% caffeine by dry mass (medium roast arabica, SCA 2019)
  transfer_efficiency = clip(ey_percent / 22.0, 0, 1)  # caffeine tracks EY proportionally
  beverage_volume_mL = water_volume_mL * 0.95  # ~5% absorbed by grounds
```

**Typical outputs**:
- Espresso 18g dose, 36mL output, EY=20%: → 18*0.012*(20/22)/36 ≈ 0.109 mg/mL = 109 mg/100mL (reasonable)
- V60 25g dose, 400mL, EY=21%: → 25*0.012*(21/22)/400 ≈ 0.714 mg/100mL × 100 = ~71.4mg/100mL (reasonable for pour-over)

**Implementation**: `estimate_caffeine(coffee_dose_g, ey_percent, water_volume_mL)` in `output_helpers.py`.

---

## 6. Grinder Presets

### 1Zpresso J-Max
```json
{
  "model": "1Zpresso J-Max",
  "type": "hand",
  "burr": "48mm stainless steel",
  "clicks_range": [1, 90],
  "microns_per_click": 8.8,
  "source": "1Zpresso official specs, CoffeeGeek community measurements",
  "confidence": "medium",
  "settings": [
    {"click": 10, "median_um": 88,  "use": "espresso"},
    {"click": 20, "median_um": 176, "use": "moka_pot"},
    {"click": 30, "median_um": 264, "use": "aeropress"},
    {"click": 40, "median_um": 352, "use": "v60"},
    {"click": 50, "median_um": 440, "use": "kalita"},
    {"click": 60, "median_um": 528, "use": "french_press"},
    {"click": 75, "median_um": 660, "use": "french_press_coarse"}
  ],
  "psd_model": {
    "type": "bimodal_lognormal",
    "fines_peak_um": 35,
    "fines_sigma": 0.38,
    "fines_fraction": 0.14,
    "main_sigma": 0.32
  }
}
```

### Baratza Encore
User-confirmed: 40 settings, ~200-1100μm range, ~23μm/step.
```json
{
  "model": "Baratza Encore",
  "type": "electric",
  "burr": "40mm conical",
  "clicks_range": [1, 40],
  "microns_per_click": 23,
  "source": "Baratza official documentation, community measurements (coffeeadhoc.com)",
  "confidence": "medium",
  "settings": [
    {"click": 5,  "median_um": 200, "use": "espresso"},
    {"click": 10, "median_um": 330, "use": "moka_pot"},
    {"click": 15, "median_um": 445, "use": "aeropress"},
    {"click": 18, "median_um": 514, "use": "v60"},
    {"click": 20, "median_um": 560, "use": "kalita"},
    {"click": 25, "median_um": 675, "use": "french_press"},
    {"click": 30, "median_um": 790, "use": "french_press_coarse"},
    {"click": 40, "median_um": 1120, "use": "cold_brew"}
  ],
  "psd_model": {
    "type": "bimodal_lognormal",
    "fines_peak_um": 50,
    "fines_sigma": 0.45,
    "fines_fraction": 0.20,
    "main_sigma": 0.40,
    "note": "Encore produces more fines than hand grinders due to conical burr design at low RPM. Fines fraction estimated from Baratza community PSD data."
  }
}
```

---

## 7. Implementation Risks & Assumptions

| Risk | Mitigation |
|------|-----------|
| EUI only meaningful for percolation | Set 1.0 for immersion, None for moka (or 0.85 constant) |
| Temperature k values are estimates | Label with `confidence: "estimated"` in output; not safety-critical |
| Caffeine formula is approximation | Clearly note empirical basis; Taip 2025 formula is proportional to EY so approach is consistent |
| Puck resistance normalization bounds | Use Kozeny-Carman k_perm from existing params.py; normalize against sensible physical bounds |
| Grinder click ranges may be off by ±10% | Mark confidence as "medium"; validated against community data |
| SimulationOutput changes break existing tests | Add all new fields as `Optional` with `= None` defaults — backward compatible |

## 8. New Pydantic Models Needed

```python
class TempPoint(BaseModel):
    t: float       # seconds
    temp_c: float  # °C

class SCAPosition(BaseModel):
    tds_percent: float
    ey_percent: float
    zone: str      # "ideal", "under_extracted", "over_extracted", "weak", "strong", "complex"
    on_chart: bool
```

## 9. SimulationOutput Fields to Add (all Optional for backward compat)

```python
extraction_uniformity_index: Optional[float] = None   # OUT-07
temperature_curve: Optional[List[TempPoint]] = None    # OUT-10
sca_position: Optional[SCAPosition] = None             # OUT-11
puck_resistance: Optional[float] = None               # OUT-12 [0,1]
caffeine_mg_per_ml: Optional[float] = None            # OUT-13
```

## 10. File Plan Summary

**New files:**
- `brewos-engine/brewos/grinders/1zpresso_j-max.json`
- `brewos-engine/brewos/grinders/baratza_encore.json`

**Modified files:**
- `brewos-engine/brewos/models/outputs.py` — add TempPoint, SCAPosition, 5 new fields to SimulationOutput
- `brewos-engine/brewos/utils/output_helpers.py` — add compute_temperature_curve, classify_sca_position, estimate_caffeine, compute_eui
- `brewos-engine/brewos/solvers/percolation.py` — populate EUI from c_h nodes
- `brewos-engine/brewos/solvers/immersion.py` — populate EUI=1.0, temp_curve, sca_position, caffeine
- `brewos-engine/brewos/solvers/pressure.py` — populate puck_resistance for moka/espresso paths
- `brewos-engine/brewos/methods/aeropress.py` — pass EUI, temp_curve, caffeine through hybrid result
- `brewos-engine/tests/test_extended_outputs.py` — new test file for all 5 new fields
- `brewos-engine/tests/test_grinder_presets.py` — grinder preset load + PSD tests

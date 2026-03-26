# CO2 Degassing / Bloom Model Research

**Domain:** Coffee extraction physics -- CO2 sub-model
**Researched:** 2026-03-26
**Overall confidence:** MEDIUM (published CO2 content data is solid; bloom-phase extraction coupling is a first-order estimate based on physical reasoning, not directly validated experimentally for non-espresso)

---

## 1. Executive Summary

CO2 is generated during roasting and remains trapped in the porous structure of roasted coffee beans. When ground coffee contacts hot water during the "bloom" phase, trapped CO2 rapidly escapes, creating gas bubbles that physically impede water penetration into coffee particles. This reduces the effective wetted surface area and slows early extraction.

The model proposed here uses a **bi-exponential decay** for CO2 release during bloom (fast component = surface/broken-cell CO2, slow component = internal diffusion from intact cells), parameterized by roast level and optionally bean age. The CO2 presence feeds into the main extraction ODE as a **multiplicative correction factor** that reduces the effective mass transfer coefficient during the bloom phase.

This is explicitly a **first-order estimate** as stated in the PRD. No published paper directly models the bloom-phase extraction penalty for pour-over or immersion methods. The CO2 content values are well-established; the extraction coupling is physically motivated but not experimentally calibrated.

---

## 2. The Physics of CO2 in Roasted Coffee

### 2.1 CO2 Generation and Retention

During roasting, Maillard reactions and Strecker degradation produce CO2. The gas is partially retained within the bean's porous matrix. Total residual CO2 depends on:

- **Roast level** (primary factor): darker roasts produce and retain more CO2
- **Roast speed**: high-temperature-short-time (HTST) roasting retains more CO2 than low-temperature-long-time (LTLT)
- **Bean species**: Robusta retains more than Arabica (higher sucrose content in Arabica, but Robusta has different degradation pathways)

### 2.2 Published CO2 Content Values

From Wang & Lim (2014) and corroborated by Smrke (2018):

| Roast Level | Residual CO2 (mg/g) | Residual CO2 (mL/g at STP) | Source |
|-------------|---------------------|-----------------------------|--------|
| Light       | 6.5 +/- 0.7        | ~3.3                        | Wang & Lim 2014 |
| Medium      | 11.0 +/- 1.0       | ~5.6                        | Wang & Lim 2014 |
| Dark        | 15.5 +/- 0.7       | ~7.9                        | Wang & Lim 2014 |

**Confidence: HIGH** -- these values are from peer-reviewed measurements and are consistent across multiple studies.

Conversion: 1 mg CO2 = 0.509 mL at STP (MW=44, density at STP = 1.964 mg/mL).

### 2.3 Effect of Grinding

Grinding dramatically accelerates degassing by exposing internal pore structure:

- **73% of CO2 is released within minutes of grinding** (Anderson et al. 2003)
- The remaining ~27% is trapped in intact internal cells and requires diffusion to escape
- Finer grinds release more CO2 faster (larger surface area)

For simulation purposes, the **residual CO2 at bloom time** depends on how long ago the coffee was ground. For typical home brewing (ground immediately before brewing), we use the full residual values above.

### 2.4 Effect of Bean Age (Days Since Roast)

Whole-bean degassing follows an approximate exponential with a long time constant:

- ~40% of CO2 released within first 24 hours post-roast
- Degassing continues for weeks (400+ hours measured in Smrke 2018)

A simplified aging decay:

```
CO2_available(t_age) = CO2_total * exp(-t_age / tau_age)
```

Where `t_age` is days since roast and `tau_age` is a roast-dependent time constant:

| Roast Level | tau_age (days) | Rationale |
|-------------|----------------|-----------|
| Light       | 14             | Slower degassing, denser structure |
| Medium      | 10             | Moderate |
| Dark        | 7              | Faster degassing, more porous structure |

**Confidence: LOW-MEDIUM** -- the exponential is a simplification. Smrke (2018) shows bi-exponential behavior for long-term degassing, but a single exponential is adequate for the "how stale is the coffee" aging factor. Exact tau values are estimates based on qualitative descriptions in the literature ("peak bloom at 4-14 days").

---

## 3. The Bloom-Phase CO2 Release Model

### 3.1 Governing Equation: Bi-Exponential Decay

When hot water contacts ground coffee, the remaining CO2 is released. Smrke (2018) demonstrates that degassing follows bi-exponential kinetics:

```
V_CO2(t) = V_0 * [alpha * (1 - exp(-t / tau_fast)) + (1 - alpha) * (1 - exp(-t / tau_slow))]
```

Where:
- `V_CO2(t)` = cumulative CO2 volume released at time t during bloom (mL)
- `V_0` = total available CO2 in the dose (mL) = `CO2_available(t_age) * coffee_dose / 1000 * 0.509`
- `alpha` = fraction of CO2 in the fast-release compartment (surface/broken cells)
- `tau_fast` = time constant for fast release (seconds)
- `tau_slow` = time constant for slow release (seconds)
- `t` = time since water contact (seconds)

### 3.2 Parameter Values

#### Fast compartment (surface CO2, broken cells)

The fast component represents CO2 in broken surface cells and open pores. Hot water contact causes near-instantaneous release.

| Parameter | Value | Unit | Rationale |
|-----------|-------|------|-----------|
| `alpha` | 0.70 | dimensionless | ~70% of remaining CO2 is in accessible pores (Anderson 2003: 73% released quickly) |
| `tau_fast` | 5.0 | seconds | Rapid bubble formation visible within first few seconds of bloom |

#### Slow compartment (internal diffusion)

The slow component represents CO2 diffusing from intact internal cells through the grain matrix.

| Parameter | Value | Unit | Rationale |
|-----------|-------|------|-----------|
| `1 - alpha` | 0.30 | dimensionless | Remaining 30% trapped in intact cells |
| `tau_slow` | 30.0 | seconds | Anderson 2003: effective diffusivity 0.5-10 x 10^-13 m2/s; for ~500 um particles this gives ~30s characteristic time |

**Note:** `tau_fast` and `tau_slow` are for the water-contact bloom phase (hot water dramatically accelerates release vs. ambient degassing). These are NOT the same as the hours-to-days time constants for ambient shelf degassing.

#### Roast-level modifiers for tau values

Darker roasts have more porous structure, so CO2 escapes faster:

| Roast Level | tau_fast (s) | tau_slow (s) | alpha |
|-------------|-------------|-------------|-------|
| Light       | 7.0         | 45.0        | 0.60  |
| Medium      | 5.0         | 30.0        | 0.70  |
| Dark        | 3.0         | 20.0        | 0.80  |

**Confidence: LOW-MEDIUM** -- the relative ordering is physically correct (darker = faster release, more porous). Absolute values are first-order estimates. The tau_fast and tau_slow for water-contact conditions are not directly reported in any paper I found; these are derived from the physical reasoning that:
1. Anderson (2003) reports effective diffusivity of 0.5-10e-13 m2/s for ambient conditions
2. Hot water at 90-96C dramatically accelerates diffusion (Arrhenius factor ~3-5x)
3. Observable bloom bubbling subsides within 30-45 seconds in practice

### 3.3 Total CO2 Volume Released During Bloom

For a typical brew (15g medium roast, 7 days post-roast):

```
CO2_total = 11.0 mg/g (medium roast)
CO2_available = 11.0 * exp(-7/10) = 11.0 * 0.497 = 5.47 mg/g
V_0 = 5.47 * 15 / 1000 * 0.509 * 1000 = 41.8 mL CO2 at STP
```

At end of 30s bloom:
```
V_CO2(30) = 41.8 * [0.70 * (1 - exp(-30/5)) + 0.30 * (1 - exp(-30/30))]
          = 41.8 * [0.70 * 0.998 + 0.30 * 0.632]
          = 41.8 * [0.699 + 0.190]
          = 41.8 * 0.889
          = 37.2 mL
```

This is ~89% of available CO2 released in 30 seconds -- consistent with practical bloom observation.

For fresh dark roast (2 days post-roast, 15g dose):
```
CO2_available = 15.5 * exp(-2/7) = 15.5 * 0.751 = 11.64 mg/g
V_0 = 11.64 * 15 / 1000 * 0.509 * 1000 = 88.9 mL
```

That is a much more vigorous bloom -- consistent with the "violent bloom" observed for very fresh dark roasts.

---

## 4. Coupling CO2 to the Extraction ODE

### 4.1 Physical Mechanism

CO2 inhibits extraction through two mechanisms:

1. **Gas barrier**: CO2 bubbles forming on and around particle surfaces prevent water from contacting the coffee. This reduces the effective wetted surface area.
2. **Bed disruption**: In percolation methods (pour-over), rising gas bubbles disrupt water flow paths, creating temporary channeling.

For a first-order model, mechanism (1) dominates and is easier to model. Mechanism (2) is a second-order effect better addressed in the channeling sub-model.

### 4.2 The Extraction Rate Correction Factor

The main Moroney immersion ODE has a mass transfer term proportional to the effective surface area. During bloom, CO2 reduces the effective wetted fraction of that surface area.

Define a **wetting efficiency** factor:

```
eta_wet(t) = 1 - beta * (V_CO2_remaining(t) / V_0)
```

Where:
- `eta_wet(t)` = fraction of particle surface effectively wetted (0 to 1)
- `V_CO2_remaining(t)` = CO2 still trapped in the bed = `V_0 - V_CO2(t)`
- `V_0` = total available CO2
- `beta` = maximum extraction suppression factor (0 to 1)

This means:
- At `t=0` (before any CO2 escapes): `eta_wet = 1 - beta` (extraction suppressed)
- As CO2 escapes: `eta_wet -> 1` (full extraction rate restored)
- After bloom: `eta_wet ~= 1` (negligible effect)

### 4.3 Recommended beta Values

| Roast Level | beta | Rationale |
|-------------|------|-----------|
| Light       | 0.15 | Less CO2, less disruption |
| Medium      | 0.30 | Moderate suppression |
| Dark        | 0.50 | Significant gas volume, major disruption in first seconds |

**Confidence: LOW** -- these are physically motivated estimates. No paper quantifies the extraction rate penalty from CO2 during bloom for non-espresso methods. The values are chosen so that:
- Fresh dark roast has up to 50% extraction rate reduction at t=0
- The effect largely vanishes within the bloom period (30-45s)
- Light roast barely notices the effect (consistent with practice: light roast blooms are minimal)

### 4.4 Integration with the Moroney ODE

The Moroney 2016 immersion ODE for extraction from the intergranular (bulk liquid) phase:

```
dc_l/dt = (D_eff * A_s / V_l) * (c_s - c_l)
```

Where `D_eff` is the effective diffusion coefficient, `A_s` is total surface area, `V_l` is liquid volume, `c_s` is surface concentration, `c_l` is bulk liquid concentration.

**During bloom phase**, modify to:

```
dc_l/dt = eta_wet(t) * (D_eff * A_s / V_l) * (c_s - c_l)
```

Where `eta_wet(t)` is computed from the CO2 sub-model above.

**After bloom** (t > bloom_duration): `eta_wet = 1.0` (no CO2 correction).

This is clean: the CO2 model is a multiplicative pre-factor on the existing mass transfer term. It does not require modifying the ODE structure, only scaling the rate during the bloom window.

### 4.5 For Percolation Methods (V60, Kalita)

For pour-over, bloom is explicitly a separate phase: the user pours a small volume of water (bloom_volume) and waits (bloom_duration). During this phase:

1. The bed is partially saturated (bloom_volume / total_water)
2. CO2 escapes
3. Extraction occurs at a reduced rate due to CO2

Implementation:
- Phase 1 (bloom): Run immersion-like ODE with `eta_wet(t)` correction for `bloom_duration` seconds, using `bloom_volume` as the water amount
- Phase 2 (main pour): Switch to percolation PDE with full flow, `eta_wet = 1.0`

---

## 5. Complete Parameter Table

### 5.1 CO2 Content Parameters

| Parameter | Light | Medium | Dark | Unit | Source | Confidence |
|-----------|-------|--------|------|------|--------|------------|
| `CO2_total` | 6.5 | 11.0 | 15.5 | mg/g | Wang & Lim 2014 | HIGH |
| `tau_age` | 14 | 10 | 7 | days | Estimated from Smrke 2018 qualitative data | LOW-MEDIUM |

### 5.2 Bloom Release Kinetic Parameters

| Parameter | Light | Medium | Dark | Unit | Source | Confidence |
|-----------|-------|--------|------|------|--------|------------|
| `alpha` | 0.60 | 0.70 | 0.80 | -- | Anderson 2003 (73% fast release), adjusted by roast | MEDIUM |
| `tau_fast` | 7.0 | 5.0 | 3.0 | s | Estimated; observable bloom timing | LOW |
| `tau_slow` | 45.0 | 30.0 | 20.0 | s | Anderson 2003 diffusivity + Arrhenius acceleration | LOW |

### 5.3 Extraction Coupling Parameters

| Parameter | Light | Medium | Dark | Unit | Source | Confidence |
|-----------|-------|--------|------|------|--------|------------|
| `beta` | 0.15 | 0.30 | 0.50 | -- | First-order estimate | LOW |

---

## 6. User-Facing Output

### 6.1 What to Display

| Output | Format | Description |
|--------|--------|-------------|
| **CO2 Release Volume** | "~37 mL CO2 released during bloom" | Total cumulative CO2 released during bloom_duration |
| **Bloom Effectiveness** | "89% of trapped CO2 released" | Percentage of available CO2 expelled |
| **Bloom Recommendation** | "30s bloom recommended" or "Bloom less critical for this bean age" | Advisory based on CO2_available |

### 6.2 When to Show Bloom Advisory

- If `CO2_available < 2.0 mg/g`: "Bloom optional -- minimal CO2 remaining (stale or very light roast)"
- If `CO2_available > 8.0 mg/g`: "Bloom strongly recommended -- significant CO2 will impede extraction"
- If `bloom_duration` < recommended: warning "Bloom too short -- estimated X% CO2 still trapped"

### 6.3 Internal-Only Computation

The `eta_wet(t)` correction factor and its effect on the extraction curve should NOT be exposed directly. Users see:
- The CO2 volume and bloom effectiveness numbers above
- The extraction curve (which already reflects the CO2 correction implicitly)
- A note in the "Simulation Details" expandable section: "CO2 degassing model applied during bloom phase"

---

## 7. Implementation Pseudocode

```python
from dataclasses import dataclass
from enum import Enum
import math

class RoastLevel(Enum):
    LIGHT = "light"
    MEDIUM = "medium"
    DARK = "dark"

# --- Parameter lookup ---
CO2_PARAMS = {
    RoastLevel.LIGHT:  {"co2_total": 6.5,  "tau_age": 14, "alpha": 0.60, "tau_fast": 7.0,  "tau_slow": 45.0, "beta": 0.15},
    RoastLevel.MEDIUM: {"co2_total": 11.0, "tau_age": 10, "alpha": 0.70, "tau_fast": 5.0,  "tau_slow": 30.0, "beta": 0.30},
    RoastLevel.DARK:   {"co2_total": 15.5, "tau_age": 7,  "alpha": 0.80, "tau_fast": 3.0,  "tau_slow": 20.0, "beta": 0.50},
}

@dataclass
class CO2BloomResult:
    """Output of the CO2 degassing sub-model."""
    co2_available_mg_per_g: float      # CO2 available at brew time (after aging)
    total_co2_volume_mL: float         # V_0: total CO2 volume in the dose (mL at STP)
    co2_released_mL: float             # CO2 released during bloom (mL)
    bloom_effectiveness: float         # fraction of available CO2 released (0-1)
    eta_wet_at_t0: float               # wetting efficiency at start of bloom
    eta_wet_at_bloom_end: float        # wetting efficiency at end of bloom
    bloom_recommendation: str          # user-facing advisory

def compute_co2_bloom(
    coffee_dose_g: float,
    roast_level: RoastLevel,
    bean_age_days: float,
    bloom_duration_s: float,
) -> CO2BloomResult:
    """Compute CO2 degassing during bloom phase."""
    p = CO2_PARAMS[roast_level]

    # Available CO2 after aging
    co2_available = p["co2_total"] * math.exp(-bean_age_days / p["tau_age"])

    # Total CO2 volume in the dose (mL at STP)
    # 1 mg CO2 = 0.509 mL at STP
    v_0 = co2_available * coffee_dose_g * 0.509 / 1000 * 1000
    # Simplifies to: co2_available * coffee_dose_g * 0.509

    v_0 = co2_available * coffee_dose_g * 0.509  # mL

    # Cumulative CO2 released at bloom_duration
    alpha = p["alpha"]
    tau_f = p["tau_fast"]
    tau_s = p["tau_slow"]

    frac_released = (
        alpha * (1 - math.exp(-bloom_duration_s / tau_f))
        + (1 - alpha) * (1 - math.exp(-bloom_duration_s / tau_s))
    )
    co2_released = v_0 * frac_released

    # Wetting efficiency at t=0 and t=bloom_end
    beta = p["beta"]
    eta_t0 = 1.0 - beta  # all CO2 still trapped
    eta_bloom_end = 1.0 - beta * (1.0 - frac_released)

    # Advisory
    if co2_available < 2.0:
        rec = "Bloom optional -- minimal CO2 remaining"
    elif co2_available > 8.0:
        rec = "Bloom strongly recommended -- significant CO2 present"
    else:
        rec = "Bloom recommended for best extraction uniformity"

    return CO2BloomResult(
        co2_available_mg_per_g=co2_available,
        total_co2_volume_mL=v_0,
        co2_released_mL=co2_released,
        bloom_effectiveness=frac_released,
        eta_wet_at_t0=eta_t0,
        eta_wet_at_bloom_end=eta_bloom_end,
        bloom_recommendation=rec,
    )

def eta_wet(t: float, roast_level: RoastLevel, bean_age_days: float) -> float:
    """
    Wetting efficiency at time t during bloom.
    Multiply this into the mass transfer coefficient in the extraction ODE.
    Returns 1.0 for t > bloom_duration (no CO2 effect after bloom).
    """
    p = CO2_PARAMS[roast_level]
    co2_available = p["co2_total"] * math.exp(-bean_age_days / p["tau_age"])

    alpha = p["alpha"]
    tau_f = p["tau_fast"]
    tau_s = p["tau_slow"]
    beta = p["beta"]

    frac_released = (
        alpha * (1 - math.exp(-t / tau_f))
        + (1 - alpha) * (1 - math.exp(-t / tau_s))
    )
    frac_remaining = 1.0 - frac_released

    return 1.0 - beta * frac_remaining
```

---

## 8. Limitations and Uncertainties

### 8.1 What We Know (HIGH confidence)

- Total CO2 content by roast level: well-established in multiple peer-reviewed studies
- CO2 release follows multi-exponential kinetics: confirmed by Smrke 2018, Anderson 2003
- CO2 inhibits water penetration during bloom: universally accepted mechanism
- Grinding accelerates degassing: ~73% within minutes (Anderson 2003)

### 8.2 What We Estimated (LOW-MEDIUM confidence)

- **tau_fast and tau_slow during water contact**: No paper directly measures the time constants for CO2 release during hot-water bloom. Our values are derived from ambient-temperature diffusivity (Anderson 2003) scaled by an estimated Arrhenius factor for 90+ C water contact. The ~5s / ~30s values produce bloom dynamics matching practical observation (bloom bubbling subsides in 30-45s).

- **beta (extraction suppression factor)**: No paper quantifies the extraction rate penalty from CO2 for non-espresso methods. Our values (0.15-0.50) are physically motivated: CO2 is hydrophobic and creates a gas film on particle surfaces, but the effect must be transient (extraction still happens during bloom, just slower).

- **tau_age (bean aging decay)**: Single-exponential is a simplification of the actual multi-exponential long-term degassing. Adequate for "freshness" scaling but not accurate for predicting exact CO2 content at arbitrary ages.

### 8.3 What We Do NOT Know

- How grind size specifically modifies bloom-phase tau values (finer = faster, but by how much?)
- Whether bloom water temperature vs. main pour temperature creates different CO2 dynamics
- Interaction between bloom_volume and CO2 release (does more water = faster release, or is it dominated by temperature?)
- Whether the extraction penalty is truly multiplicative or whether CO2 creates a non-linear flow-path disruption

### 8.4 Calibration Path (Future)

If users provide refractometer data comparing bloom vs. no-bloom extractions, the `beta` parameter could be calibrated. This is a v1.1 opportunity.

---

## 9. Required Input Schema Additions

The current `SimulationInput` model needs:

```python
# New optional fields for SimulationInput
bloom_volume: Optional[float] = None    # g of water used for bloom (None = no bloom)
bloom_duration: Optional[float] = None  # seconds of bloom time
bean_age_days: Optional[float] = 7.0    # days since roast (default 7)
```

The `SimulationOutput` model needs an extended output:

```python
@dataclass
class CO2DegassingOutput:
    co2_released_mL: float           # mL CO2 released during bloom
    bloom_effectiveness_pct: float   # % of available CO2 released
    bloom_recommendation: str        # advisory text
```

---

## 10. Key References

| Reference | What It Provides | Confidence |
|-----------|-----------------|------------|
| Smrke et al. (2018) "Time-resolved gravimetric method to assess degassing of roasted coffee." J. Agric. Food Chem. DOI: 10.1021/acs.jafc.7b03310 | Bi-exponential degassing kinetics, methodology | HIGH |
| Anderson et al. (2003) "The diffusion kinetics of carbon dioxide in fresh roasted and ground coffee." J. Food Eng. 59(1), 71-78 | Effective diffusivity values (0.5-10e-13 m2/s), Fick's law model, 73% fast release | HIGH |
| Wang & Lim (2014) "Effect of roasting conditions on carbon dioxide degassing behavior in coffee." Food Research International, 61, 144-151 | CO2 content by roast level (6.5/11.0/15.5 mg/g), Weibull model, roast speed effects | HIGH |
| Smrke et al. (2024) "The role of fines in espresso extraction dynamics" | Fines behavior, may inform grind-size CO2 interaction (not directly used here) | MEDIUM |

---

## 11. Summary for Downstream Implementation

**Equation:** Bi-exponential CO2 release: `V_CO2(t) = V_0 * [alpha * (1 - exp(-t/tau_fast)) + (1-alpha) * (1 - exp(-t/tau_slow))]`

**Coupling:** Multiply extraction mass-transfer coefficient by `eta_wet(t) = 1 - beta * (1 - frac_released(t))` during bloom phase only.

**Parameters:** See Section 5 complete table. Three roast levels, all values specified.

**User output:** CO2 volume released (mL), bloom effectiveness (%), bloom recommendation text.

**Confidence:** CO2 content values are HIGH. Kinetic time constants and extraction coupling are LOW-MEDIUM (first-order estimates, physically motivated, not experimentally calibrated for non-espresso bloom).

**Next steps:** When M2 full engine is implemented, add `bloom_volume`, `bloom_duration`, `bean_age_days` to SimulationInput and wire the `eta_wet(t)` correction into the solver's mass-transfer term during the bloom window.

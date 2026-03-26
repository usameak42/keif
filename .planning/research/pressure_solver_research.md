# Pressure Solver Research: Espresso & Moka Pot Physics Models

**Domain:** Pressure-driven coffee extraction simulation
**Researched:** 2026-03-26
**Overall confidence:** MEDIUM (Espresso: MEDIUM-HIGH, Moka Pot: MEDIUM-LOW)
**Downstream consumer:** `brewos-engine/brewos/solvers/pressure.py`

---

## Executive Summary

The pressure solver must handle two fundamentally different physical regimes:

1. **Espresso** (9 bar pump-driven, constant pressure, ~25s extraction): A 1D advection-diffusion-extraction PDE through a packed puck, governed by Darcy flow at high pressure. The core model is **Moroney 2015 double-porosity PDE adapted to espresso parameters** -- the same physics as `percolation.py` but with espresso-specific boundary conditions (9 bar pressure drop, fine grind ~250 um median, 8-10mm bed height). Channeling is modeled as an optional **Lee 2023 two-pathway ODE** overlay.

2. **Moka Pot** (1.5-2 bar steam-driven, rising pressure, ~60-120s extraction): A **coupled thermo-fluid ODE system** where heating generates steam pressure that drives flow through the coffee bed. The Siregar 2026 minimal model provides the thermodynamic coupling; extraction kinetics reuse the Moroney double-porosity structure with moka-appropriate parameters.

**Key recommendation:** Do NOT implement a single unified "pressure solver." Instead, implement two sub-solvers within `pressure.py` that share Darcy+extraction infrastructure but differ in how pressure/flow is determined:
- Espresso: constant applied pressure --> Darcy velocity --> extraction PDE
- Moka Pot: thermal ODE --> time-varying pressure --> Darcy velocity --> extraction ODE

---

## 1. Espresso Model

### 1.1 Recommended Approach: Moroney 2015 PDE with Espresso Parameters

**Confidence: MEDIUM-HIGH**

The espresso puck is physically identical to the cylindrical coffee bed modeled by Moroney 2015 -- it is a packed granular bed with pressure-driven flow. The difference is parameter regime:

| Parameter | Moroney 2015 (drip) | Espresso |
|-----------|---------------------|----------|
| Pressure drop (dp) | 65-230 kPa | 900 kPa (9 bar) |
| Bed height (L) | 40-53 mm | 8-10 mm |
| Median grind (d50) | 300-600 um | 200-350 um |
| Intergranular porosity (phi_h) | 0.20-0.25 | 0.15-0.20 (tighter packing) |
| Flow rate | ~1-3 mL/s | ~1-2 mL/s |
| Extraction time | 120-300 s | 20-35 s |
| Fines fraction (Q_100um) | 10-15% | 15-30% (Smrke 2024) |

The Moroney 2015 PDE system governs transport through the wetted puck:

### 1.2 Equations for Espresso (Accurate Mode)

**State variables** (functions of position z and time t):
- `c_h(z,t)` -- coffee concentration in intergranular liquid [kg/m^3]
- `c_v(z,t)` -- coffee concentration in intragranular pores [kg/m^3]
- `psi_s(z,t)` -- remaining surface coffee fraction [dimensionless, 0-1]
- `phi_v(z,t)` -- intragranular porosity [dimensionless]

**Equation 1: Darcy velocity (steady-state, constant pressure)**
```
q = (k_h / mu) * (dp / L)
```
where `k_h = (k_sv1^2 * phi_h^3) / (36 * kappa * (1 - phi_h)^2)` (Kozeny-Carman)

At 9 bar with espresso parameters, this gives q ~ 1.5e-3 m/s, consistent with Grudeva 2025 Table 1.

**Equation 2: Intergranular concentration (advection + extraction)**
```
phi_h * dc_h/dt = -(q / L) * dc_h/dz + G_surface + G_kernel
```
where:
- `G_surface = beta_n * (1-phi_h) * 12*D_h*phi_c0 / (k_sv1*m) * (c_sat - c_h) * psi_s`
- `G_kernel = -alpha_n * (1-phi_h) * phi_v^(4/3) * D_v / (6*k_sv2*l_l) * (c_h - c_v)`

**Equation 3: Intragranular concentration**
```
d(phi_v * c_v)/dt = -alpha_n * phi_v^(4/3) * D_v / (6*k_sv2*l_l) * (c_h - c_v)
```

**Equation 4: Surface coffee depletion**
```
d(psi_s)/dt = -beta_n * 12*D_h*phi_c0 / (k_sv1*m) * ((c_sat - c_h) / c_s) * r_s * psi_s
```

**Equation 5: Porosity evolution**
```
d(phi_v)/dt = -(1/r_s) * d(psi_s)/dt
```

**Boundary conditions:**
- `c_h(z=L, t) = 0` (clean water enters at top of puck)
- `p(z=0) = 0`, `p(z=L) = dp = 9e5 Pa` (gauge pressure)

**Initial conditions:**
- `c_h(z, 0) = c_sat` (pre-saturated from pre-infusion -- espresso-specific)
- `c_v(z, 0) = gamma_1 * c_sat` (intragranular coffee dissolved)
- `psi_s(z, 0) = 1` (surface coffee intact)

### 1.3 SciPy Implementation Path

**Method: Method of Lines (MOL)**

Discretize z into N_z spatial nodes (N_z = 20-50 sufficient for 8mm bed). This converts the PDE system into a large ODE system:
- 4 state variables x N_z nodes = 80-200 ODEs
- Solve with `scipy.integrate.solve_ivp(method='Radau')` (stiff system)

```python
# Pseudocode structure
def espresso_rhs(t, y, params):
    c_h = y[0:Nz]          # intergranular concentration at each node
    c_v = y[Nz:2*Nz]       # intragranular concentration at each node
    psi_s = y[2*Nz:3*Nz]   # surface coffee at each node
    phi_v = y[3*Nz:4*Nz]   # intragranular porosity at each node

    # Darcy velocity (constant for constant-pressure espresso)
    q = k_h / mu * dp / L

    # Upwind advection for dc_h/dz
    dc_h_dz = upwind_derivative(c_h, dz, q)

    # Source terms at each node
    G_surface = beta_n * ... * (c_sat - c_h) * psi_s
    G_kernel = -alpha_n * ... * (c_h - c_v)

    dc_h_dt = (-q * dc_h_dz + G_surface + G_kernel) / phi_h
    dc_v_dt = ...
    dpsi_s_dt = ...
    dphi_v_dt = ...

    return np.concatenate([dc_h_dt, dc_v_dt, dpsi_s_dt, dphi_v_dt])

sol = solve_ivp(espresso_rhs, [0, t_shot], y0, method='Radau',
                rtol=1e-6, atol=1e-8)
```

**Performance estimate:**
- 100-200 ODEs, 25s simulation time, Radau solver
- Expected wall time: 0.5-2.0s (well within 4s budget)
- The Torque Dandachi blog confirms similar-scale systems solve in <1s with Rosenbrock methods

**Outputs:**
- TDS% = integral of c_h(z=0, t) * q * dt / M_shot (concentration at puck exit integrated over time)
- EY% = TDS% * brew_ratio (dilute approximation)
- Extraction curve: time-resolved EY%
- Shot time: when target liquid volume is reached

### 1.4 Espresso Fast Mode

For fast mode (< 1ms), the Maille 2021 biexponential applies with espresso-calibrated time constants:

```
C(t)/C_inf = phi*(1-exp(-t/lambda_1)) + (1-phi)*(1-exp(-t/lambda_2))
```

Espresso-specific: lambda_1 is very short (~2-5s, fines-dominated) and lambda_2 is moderate (~15-25s, boulder diffusion). The fines fraction is higher in espresso, so phi (fast fraction) is larger (~0.6-0.7 vs ~0.4 for drip).

Endpoint anchor: Liang 2021 K=0.717 still applies (same desorption equilibrium physics).

### 1.5 Alternative Considered: Grudeva 2025 Full Multiscale Model

**Why NOT Grudeva 2025 as the primary model:**

1. **The asymptotic reduction is the paper's main contribution** -- but the reduced system still contains the same physics as Moroney 2015 with bimodal particle splitting (fines vs boulders). We get the same physics from Moroney 2015 PDE directly.

2. **Parameter gaps:** Grudeva Table 1 has no explicit grain radii (a_f, a_b) -- "no source" in the vault notes. The anomalous pressure value (9.2e-6 Pa for "9 bar espresso") confirms this is a dimensionless/normalized framework, not a directly parameterizable physical model.

3. **Moroney 2015 has validated parameter sets** (Table 1, Table 2) and has been experimentally validated. Grudeva 2025 is validated only against its own numerical PDE (no experimental data).

4. **Implementation complexity:** Grudeva's moving boundary layer formalism (wetting front ODE + matched asymptotics) adds complexity without improving accuracy over the MOL discretization of Moroney 2015.

**Verdict:** Use Moroney 2015 PDE as the espresso accurate mode. Grudeva 2025 informs the conceptual understanding (fines = surface extraction, boulders = diffusion) but is not implemented directly.

### 1.6 Channeling Integration: Lee 2023 Two-Pathway Model

**Integration approach: Optional post-processing overlay, not embedded in core solver.**

The Lee 2023 model runs as a separate 4-ODE system (2 porosity + 2 concentration equations) with the same total flow rate as the primary solver. It does NOT replace the extraction physics -- it quantifies the extraction non-uniformity.

**State variables** (all dimensionless):
- `epsilon_1(tau)`, `epsilon_2(tau)` -- porosity of pathway 1 and 2
- `C_1(tau)`, `C_2(tau)` -- concentration in pathway 1 and 2

**Equations:**
```
d(epsilon_i)/d(tau) = (1 - C_i) * theta(EY_max - EY_i)

alpha * epsilon_i * d(C_i)/d(tau) =
    (1 - C_i) * (1 - alpha*C_i) * theta(EY_max - EY_i)
    - (2*beta * kappa_i / (kappa_1 + kappa_2)) * C_i
```

where `kappa_i = epsilon_i^3 / (1 - epsilon_i)^2`

**Parameters** (all from Lee 2023 Table I):
| Parameter | Value | Source |
|-----------|-------|--------|
| epsilon_0 | 0.173 | Lee 2023 |
| delta | 0.035 | Lee 2023 (tamping uniformity) |
| alpha | 3.76 | Lee 2023 |
| EY_max | 33.8% | Lee 2023 |
| c_sat | 212.4 kg/m^3 | Lee 2023 |
| rho_c | 798 kg/m^3 | Lee 2023 (fitted, unphysical) |

**Implementation:** Solve with `solve_ivp` after the main extraction. Takes <1ms for 4 ODEs. Output is a channeling risk score (0-1) based on the EY divergence between pathways:

```
channeling_risk = abs(EY_1 - EY_2) / EY_avg
```

The delta parameter maps to grinder/tamping quality in the grinder database.

### 1.7 Espresso-Specific Parameters Needed

| Parameter | Where to Get It | Confidence |
|-----------|-----------------|------------|
| dp (pressure) | User input or default 9 bar | HIGH |
| L (bed height) | Calculated from dose + basket diameter + bulk density | HIGH |
| phi_h (intergranular porosity) | 0.15-0.20 for tamped espresso (lower than drip) | MEDIUM |
| k_sv1, k_sv2 | From grinder database PSD | MEDIUM |
| alpha_n, beta_n | Moroney 2015 Table 1 fine grind values (0.1833, 0.0447) | MEDIUM -- these may need recalibration for espresso regime |
| Q_100um (fines %) | Grinder database (Smrke 2024 range: 15-30%) | MEDIUM |
| delta (channeling) | Grinder database or default 0.035 | LOW -- single grinder validation |

---

## 2. Moka Pot Model

### 2.1 Recommended Approach: Siregar 2026 Thermo-Fluid ODE + Moroney Extraction

**Confidence: MEDIUM-LOW**

The moka pot is fundamentally different from pump espresso:
- Pressure is NOT constant -- it builds from ~1 atm as water heats
- Flow starts only when steam pressure exceeds bed resistance
- Temperature rises throughout extraction (starts ~85C, can reach 100C+)
- The "strombolian" phase (steam+water mix) degrades quality

The Siregar 2026 model captures this coupling. However, it is a **preprint** (not peer-reviewed) and uses dimensionless parameters that need re-dimensionalization for physical predictions.

### 2.2 Equations for Moka Pot (Accurate Mode)

**The system has two phases:**

#### Phase 1: Pre-extraction heating (t < t_onset)

Only temperature evolves:
```
dT/dt = Q_heater / (m_w * c_pw) - h_loss * A_surface * (T - T_ambient) / (m_w * c_pw)
```

Flow onset condition: steam pressure exceeds bed resistance:
```
P_steam(T) > P_atm + dp_bed
```
where `P_steam(T)` follows the Antoine equation (or Clausius-Clapeyron approximation).

#### Phase 2: Extraction (t >= t_onset)

**State variables** (dimensional form):
- `T(t)` -- lower chamber water temperature [C]
- `V_extracted(t)` -- cumulative extracted volume [m^3]
- `c_h(t)` -- coffee concentration in extracted liquid [kg/m^3]
- `c_v(t)` -- intragranular concentration [kg/m^3]
- `psi_s(t)` -- surface coffee fraction [dimensionless]

**Equation 1: Temperature evolution during extraction**
```
m_w(t) * c_pw * dT/dt = Q_heater - h_loss*A*(T - T_amb) - q(t)*rho_w*c_pw*(T - T_bed_exit)
```

where `m_w(t) = m_w0 - rho_w * V_extracted(t)` (water mass decreases as it's pushed through bed)

**Equation 2: Flow rate from pressure balance**
```
q(t) = (k_bed / mu(T)) * A_bed * (P_steam(T) - P_atm) / L_bed
```

where:
- `P_steam(T) = P_ref * exp(L_v/R * (1/T_ref - 1/T))` (Clausius-Clapeyron)
- `k_bed` = Kozeny-Carman permeability (same formula as espresso)
- `mu(T)` = temperature-dependent viscosity

**Equation 3: Extraction (well-mixed ODE -- same as Moroney 2016)**

Because the moka pot bed is thin (~5mm) and flow rate is lower than espresso, a well-mixed (ODE) approximation is reasonable rather than a full PDE:

```
dc_h/dt = -kA*(c_h - c_v) + kB*(c_sat - c_h)*psi_s - (q(t)/V_bed)*c_h
```

The last term accounts for advective removal of dissolved coffee from the bed. The kA, kB coefficients are the same Moroney 2016 structure but with moka-appropriate parameters.

```
dc_v/dt = kC*(c_h - c_v)
dpsi_s/dt = -kD*(c_sat - c_h)*psi_s
```

**Equation 4: Cumulative extraction**
```
dV_extracted/dt = q(t) * A_bed
```

**Equation 5: Cup concentration tracking**
```
dM_solubles_cup/dt = q(t) * A_bed * c_h(t)
```

Total system: 6-7 coupled ODEs. All time-dependent, no spatial discretization needed.

### 2.3 Siregar 2026 Dimensionless Form (Reference)

The Siregar model uses dimensionless parameters that map to the above:

| Siregar Parameter | Physical Meaning | Estimated Value |
|-------------------|------------------|-----------------|
| Bi = 0.15 | Heat loss / heating rate | h_loss*A / (Q_heater/T_scale) |
| Lambda = 1.5 | Thermal energy removed by flow | rho_w*c_pw*q*T / Q_heater |
| Pi = 0.5 | Pressure depletion from extraction | Related to volume extracted / total volume |
| q_max = 1.2 | Effective bed permeability | k_bed * A * P_scale / (mu * L * q_scale) |

These are useful for validation but NOT directly implementable -- we need dimensional parameters for physical predictions (TDS%, EY%).

### 2.4 SciPy Implementation Path

```python
def moka_pot_rhs(t, y, params):
    T, V_ext, c_h, c_v, psi_s, M_cup = y

    m_w = m_w0 - rho_w * V_ext
    if m_w < 0.01 * m_w0:  # safety cutoff
        return np.zeros(6)

    # Steam pressure (Clausius-Clapeyron)
    P_steam = P_ref * np.exp(L_v/R_gas * (1/T_ref - 1/(T+273.15)))

    # Flow rate (zero if pressure below threshold)
    dp_net = max(P_steam - P_atm, 0)
    q = k_bed / mu_of_T(T) * dp_net / L_bed

    # Temperature
    dT = (Q_heater - h_loss*A_surf*(T-T_amb) - q*A_bed*rho_w*c_pw*(T-T_exit)) / (m_w*c_pw)

    # Volume
    dV = q * A_bed

    # Extraction (Moroney ODE with advective loss)
    dc_h = -kA*(c_h-c_v) + kB*(c_sat-c_h)*psi_s - (q/V_bed_pore)*c_h
    dc_v = kC*(c_h-c_v)
    dpsi_s = -kD*(c_sat-c_h)*psi_s

    # Cup accumulation
    dM = q * A_bed * c_h

    return [dT, dV, dc_h, dc_v, dpsi_s, dM]

sol = solve_ivp(moka_pot_rhs, [0, t_max], y0, method='Radau',
                events=[extraction_complete_event],
                rtol=1e-6, atol=1e-8)
```

**Performance estimate:** 6 ODEs, ~120s simulation, Radau solver. Expected wall time: <100ms. Well within budget.

**Termination events:**
- `V_extracted >= V_target` (cup full)
- `m_w(t) < threshold` (boiler nearly empty -- strombolian phase onset)
- `T > 100C` (safety cutoff -- steam phase)

### 2.5 Moka Pot Fast Mode

For fast mode, use Maille 2021 biexponential with moka-specific time constants:
- lambda_1 ~ 10-20s (shorter than French press due to pressure driving)
- lambda_2 ~ 60-120s (kernel diffusion, similar timescale)
- phi ~ 0.5 (moderate fines fraction for moka grind)

The temperature effect can be approximated by a linear correction on the time constants (Arrhenius-like scaling of diffusion coefficients).

### 2.6 Moka-Specific Parameters Needed

| Parameter | Value / Range | Source | Confidence |
|-----------|---------------|--------|------------|
| Q_heater | 500-1500 W (stove burner) | User input / default | MEDIUM |
| m_w0 | 100-200g (based on pot size) | User input | HIGH |
| T_ambient | 20-25C | Default | HIGH |
| h_loss | 5-15 W/(m^2*K) | Estimated, aluminum pot | LOW |
| A_surface | 0.01-0.03 m^2 | Based on pot size | MEDIUM |
| L_bed | 4-6 mm | Moka pot filter basket | MEDIUM |
| A_bed | 0.003-0.005 m^2 | Moka pot filter diameter | MEDIUM |
| P_ref, T_ref, L_v/R | Antoine equation constants for water | Textbook | HIGH |
| k_bed | Kozeny-Carman from grind size | Calculated | MEDIUM |
| alpha_n, beta_n | Moroney 2015 Table 1 | MEDIUM -- medium grind params likely more appropriate than fine |

---

## 3. Shared Infrastructure

Both sub-solvers share:

### 3.1 Kozeny-Carman Permeability
```
k_h = (k_sv1^2 * phi_h^3) / (36 * kappa * (1 - phi_h)^2)
```

### 3.2 Moroney Extraction Kinetics
The kA, kB, kC, kD rate coefficient structure from Moroney 2016 (already in the PoC).

### 3.3 Liang 2021 Equilibrium Anchor
Post-solve scaling: `EY_final = K_liang * E_max = 0.717 * 0.30 = 21.51%`

### 3.4 Temperature-Dependent Viscosity
```
mu(T) = mu_ref * exp(B * (1/T - 1/T_ref))
```
Needed for both espresso (near-constant at ~93C) and moka pot (variable 85-100C).

### 3.5 PSD Integration
Both methods use the grinder database to determine k_sv1, k_sv2, phi_h, and fines fraction.

---

## 4. Architecture Recommendation for pressure.py

```python
# pressure.py structure

def solve_espresso(params: SimulationInput, mode: str) -> SimulationOutput:
    """9-bar constant-pressure extraction through espresso puck."""
    if mode == 'fast':
        return _espresso_fast(params)   # Maille biexponential
    else:
        return _espresso_accurate(params)  # Moroney 2015 PDE via MOL

def solve_moka_pot(params: SimulationInput, mode: str) -> SimulationOutput:
    """Steam-pressure driven extraction through moka pot bed."""
    if mode == 'fast':
        return _moka_fast(params)   # Maille biexponential with temp correction
    else:
        return _moka_accurate(params)  # Coupled thermo-fluid + Moroney ODE

def solve_channeling(params: EspressoParams) -> ChannelingResult:
    """Lee 2023 two-pathway model. Optional overlay for espresso."""
    # 4 ODEs, <1ms solve time
    ...

# Shared utilities
def kozeny_carman(k_sv1, phi_h, kappa=3.1):
    ...

def darcy_velocity(k_h, mu, dp, L):
    ...

def moroney_rate_coefficients(alpha_n, beta_n, ...):
    ...
```

The `methods/espresso.py` and `methods/moka_pot.py` config files call `solve_espresso` and `solve_moka_pot` respectively, passing method-specific geometry and parameter defaults.

---

## 5. Open Questions & Uncertainties

### 5.1 HIGH PRIORITY

1. **alpha_n, beta_n recalibration for espresso:** Moroney 2015 fitted these for drip coffee (cylindrical bed, gravity-driven flow). At 9 bar with much finer grind and shorter extraction time, these fitting parameters may need adjustment. No espresso-specific alpha_n/beta_n values exist in the literature.
   - **Mitigation:** Start with Moroney 2015 fine-grind values. Validate against published espresso EY% data (Cameron 2020 reports EY ~ 18-22% for well-extracted shots). If systematic bias appears, recalibrate.

2. **phi_h for tamped espresso:** The intergranular porosity for a tamped espresso puck is lower than for a loosely packed drip bed. Published values range from 0.15 (tightly tamped) to 0.25 (loosely packed). This parameter strongly affects flow rate predictions.
   - **Mitigation:** Default to 0.18 (mid-range for typical tamping). Make adjustable via method config.

### 5.2 MEDIUM PRIORITY

3. **Moka pot thermal parameters:** h_loss, A_surface, and Q_heater are geometry-specific and user-dependent (stove type, pot size). The Siregar 2026 dimensionless framework avoids this by lumping into Bi/Lambda, but we need dimensional values for physical TDS/EY prediction.
   - **Mitigation:** Default presets for common pot sizes (3-cup, 6-cup). Allow user override of heating power.

4. **Pre-infusion modeling for espresso:** Modern espresso machines pre-infuse at low pressure (~2 bar) for 3-8 seconds before ramping to 9 bar. This saturates the bed and is assumed in our initial condition (c_h(0) = c_sat). If pre-infusion is not used, initial conditions differ.
   - **Mitigation:** Boolean flag for pre-infusion. If false, initial c_h = 0 (dry bed, wetting front needed).

5. **Puck erosion / permeability change during espresso:** As solubles dissolve, porosity increases, permeability increases, flow rate accelerates. At constant pump pressure, this creates shot acceleration. The current model assumes constant phi_h.
   - **Mitigation:** Phase 2 enhancement. For v1, constant phi_h is acceptable (most espresso machines use flow-controlled pumps that compensate).

### 5.3 LOW PRIORITY

6. **Temperature decay in espresso puck:** The 93C water cools as it passes through the puck. For a 25s shot through 8mm, this effect is small (~1-2C drop). Negligible for v1.

7. **CO2 effects:** Fresh coffee releases CO2 when wetted, which can disrupt flow. Deferred to v2 per DECISION-002.

8. **Moka pot strombolian phase:** When the boiler water level drops below the funnel, steam enters the bed, creating turbulent mixed-phase flow. This phase is deliberately terminated by removing from heat. Model should stop extraction at this point rather than attempting to model it.

---

## 6. Confidence Assessment

| Component | Confidence | Rationale |
|-----------|------------|-----------|
| Espresso core PDE (Moroney 2015 adapted) | MEDIUM-HIGH | Same physics as validated percolation model; parameter regime shift is the uncertainty |
| Espresso channeling (Lee 2023) | MEDIUM | Validated against single grinder; qualitatively correct; quantitatively approximate |
| Espresso fast mode (Maille) | MEDIUM | Biexponential is generic enough; espresso-specific lambda calibration needed |
| Moka pot thermo-fluid (Siregar 2026) | MEDIUM-LOW | Preprint, not peer-reviewed; dimensionless framework needs re-dimensionalization |
| Moka pot extraction kinetics | MEDIUM | Moroney ODE applied to moka regime is reasonable but not validated for this geometry |
| SciPy performance (<4s) | HIGH | 100-200 ODEs for espresso, 6 ODEs for moka -- both well within budget |

---

## 7. Validation Strategy

### Espresso
- **Primary target:** EY% = 18-22% for standard recipe (18g dose, 36g yield, 25-30s, 9 bar)
- **Published data:** Cameron 2020 reports EY vs grind size curves. Lee 2023 reports EY with channeling.
- **Validation metric:** EY within +/-2% of Cameron 2020 for equivalent parameters

### Moka Pot
- **Primary target:** Navarini 2009 experimental temperature profiles and extraction timing
- **Published data:** Temperature-time curves for lower chamber, extraction onset time
- **Validation metric:** Extraction onset time within +/-10s of Navarini 2009 experimental data; total extraction time within +/-30s

---

## 8. Implementation Ordering

1. **First:** Shared infrastructure (Kozeny-Carman, Darcy, rate coefficients) -- these overlap with percolation.py
2. **Second:** Espresso accurate mode (MOL discretization of Moroney 2015 PDE) -- higher user demand, more data for validation
3. **Third:** Espresso fast mode (Maille biexponential with espresso params)
4. **Fourth:** Lee 2023 channeling overlay
5. **Fifth:** Moka pot accurate mode (Siregar thermo-fluid + Moroney ODE)
6. **Sixth:** Moka pot fast mode

Steps 1-3 are the MVP for the pressure solver. Steps 4-6 can follow in a subsequent phase.

---

## Sources

### Papers (in repo vault)
- Moroney et al. (2015). "Modelling of coffee extraction during brewing using multiscale methods." Chemical Engineering Science.
- Moroney et al. (2016). "Coffee extraction kinetics in a well mixed system." J. Mathematics in Industry.
- Moroney et al. (2019). "Analysing extraction uniformity from porous coffee beds." SIAM J. Applied Mathematics.
- Lee et al. (2023). "Uneven extraction in coffee brewing." Physics of Fluids. arXiv:2206.12373.
- Grudeva et al. (2025). "A multiscale model for espresso brewing." EJAM.
- Smrke et al. (2024). "The role of fines in espresso extraction dynamics." Scientific Reports.
- Siregar (2026). "A Minimal Thermo-Fluid Model for Pressure-Driven Extraction in a Moka Pot." arXiv:2601.03663. PREPRINT.

### Web sources
- [Torque Dandachi - Simulating Espresso Extraction (2024)](https://www.itstorque.com/blog/2024_08_21_espresso_sims/) -- Julia implementation of multiscale espresso model using MOL + DAE. Confirms Radau/Rosenbrock methods work well.
- [Cameron et al. (2020) "Systematically Improving Espresso" - Matter](https://www.cell.com/matter/fulltext/S2590-2385(19)30410-2) -- Experimental EY vs grind size data for espresso validation.
- [Siregar 2026 Moka Pot Model - arXiv](https://arxiv.org/html/2601.03663) -- Full dimensionless ODE system for moka pot thermodynamics.
- [Navarini et al. (2009) - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1359431108002299) -- Experimental moka pot temperature-time data.
- [SciPy solve_ivp documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html) -- Radau method for stiff ODE systems.

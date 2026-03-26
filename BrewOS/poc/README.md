# BrewOS Phase 7 PoC — Moroney (2016) Immersion ODE

## What Was Implemented

`moroney_2016_immersion_ode.py` — A direct implementation of the 3-ODE well-mixed
immersion extraction system from Moroney et al. (2016), solved with `scipy.solve_ivp`
(Radau stiff solver).

**State variables:**
- `c_h(t)` — coffee concentration in bulk liquid [kg/m³]
- `c_v(t)` — coffee concentration in intragranular pores [kg/m³]
- `psi_s(t)` — remaining surface coffee fraction [dimensionless, 0–1]

**Equation source:** moroney_2016_immersion_ode.md + moroney_2015_double_porosity_pde.md
(vault equations)

---

## Parameters Used

### From vault (Moroney 2015, Table 1 — fine grind, Jacobs Kronung)
| Symbol | Value | Unit | Source |
|--------|-------|------|--------|
| alpha_n | 0.1833 | — | Vault |
| beta_n | 0.0447 | — | Vault |
| D_h | 2.2×10⁻⁹ | m²/s | Vault |
| c_sat | 212.4 | kg/m³ | Vault |
| k_sv1 | 27.35×10⁻⁶ | m | Vault |
| k_sv2 | 322.49×10⁻⁶ | m | Vault |
| l_l | 282×10⁻⁶ | m | Vault |
| m_cell | 30×10⁻⁶ | m | Vault |
| r_s | 16.94 | — | Vault |
| phi_h | 0.8272 | — | Vault (batch config) |
| epsilon | 0.028 | — | Vault (Moroney 2016) |
| gamma_1 | 0.70 | — | Vault (Moroney 2016) |

### Estimated (NOT in vault — must verify from Moroney 2015 full paper)
| Symbol | Value | Reason estimated |
|--------|-------|-----------------|
| phi_v_inf | 0.40 | Intragranular porosity; absent from vault |
| phi_c0 | 0.10 | Initial solid volume fraction; absent from vault |
| c_s | 1050 kg/m³ | Solid coffee density; absent from vault |
| D_v | 2.46×10⁻⁸ m²/s | DERIVED from epsilon (see code) |

### Standard test scenario
- Coffee mass: 15g, Water mass: 250g, Temperature: 93°C
- Brew ratio: 16.67 g/g

---

## Validation Result

**K_simulated = 2.52 vs K_target = 0.717 ± 0.007 → FAIL**

### Why it fails — and why this is expected

The Moroney (2016) ODE and the Liang (2021) equilibrium model have fundamentally
different stopping conditions:

| Model | Equilibrium condition |
|-------|-----------------------|
| Moroney 2016 ODE | `psi_s → 0` (surface coffee depleted) |
| Liang 2021 | `k_D * C_A = k_A * C_D` (adsorption = desorption) |

The Moroney ODE extracts all available surface coffee and all kernel coffee until
depletion — it has no re-adsorption term. The Liang K = 0.717 reflects that some
coffee re-adsorbs onto grounds in equilibrium, capping EY at K×E_max < E_max.

**Second issue:** The Moroney parameters (phi_h = 0.8272) describe a very dense
experimental setup. The standard 15g/250g French press has phi_h ≈ 0.92 (mostly water),
so applying Moroney's batch parameters to the standard scenario overestimates concentration.

### Resolution for BrewOS v1

Use both models together:
1. **Time domain kinetics:** Moroney 2016 ODE (rescaled to phi_h for the specific brew)
2. **Equilibrium anchor:** Liang 2021 (K = 0.717, E_max = 30%)
3. **Scaling:** Normalize Moroney ODE output so it converges to K×E_max instead of E_max

This two-model approach is architecturally consistent with KARAR-001 (hybrid model strategy).

**Tracked as:** BREWOS-TODO-001 — reconcile Moroney kinetics with Liang equilibrium.

---

## Known Deviations / Simplifications

1. **phi_v treated as constant** — The vault equation has `d(phi_v * c_v)/dt` but the
   PoC assumes `phi_v ≈ phi_v_inf = const`, eliminating the porosity evolution ODE.
   The full model requires adding `dphi_v/dt = -(1/r_s) * dpsi_s/dt` (Eq.4 in vault).

2. **D_v estimated** — Derived from epsilon = T_surface/T_kernel using estimated
   phi_c0 and c_s. Must be replaced with the actual value from Moroney 2015 Table 1
   once the paper is fully read.

3. **phi_h fixed** — Used Moroney's experimental phi_h = 0.8272 rather than computing
   it from the 15g/250g scenario (which gives phi_h ≈ 0.916). This inflates concentration.

4. **Temperature dependence not modeled** — All parameters treated as constant at 93°C.
   D_h, D_v, c_sat all vary with temperature; this is a v1.1 improvement.

---

## Files

| File | Description |
|------|-------------|
| `moroney_2016_immersion_ode.py` | Main simulation + validation |
| `outputs/moroney_2016_immersion_poc.png` | TDS%, EY%, state variable plots |
| `outputs/validation_result.txt` | Full validation report |

---

## Next Steps for M1

To make the immersion model production-ready:

1. Read Moroney (2015) full paper → obtain D_v, phi_v_inf, phi_c0, c_s from Table 1
2. Compute phi_h dynamically from brew ratio (not hardcoded to 0.8272)
3. Add the Liang 2021 equilibrium scaling layer
4. Add the porosity evolution equation (dphi_v/dt)
5. Validate against Batali et al. and Liang et al. published datasets

"Parameter derivation utilities for BrewOS extraction simulations — Moroney 2016 / Liang 2021."

# ─────────────────────────────────────────────────────────────────────────────
# VAULT PARAMETERS — Moroney 2015, Table 1 (fine grind / Jacobs Kronung)
# Source: Physics/papers/Moroney et al., 2015.md
# ─────────────────────────────────────────────────────────────────────────────
alpha_n = 0.1833        # Kernel internal mass-transfer fitting param [-]
beta_n  = 0.0447        # Surface dissolution fitting param [-]
D_h     = 2.2e-9        # Effective diffusion of coffee in water [m²/s]
c_sat   = 212.4         # Coffee solubility [kg/m³]
k_sv1   = 27.35e-6      # Sauter mean diameter, full distribution [m]
k_sv2   = 322.49e-6     # Sauter mean diameter, grains >50 µm [m]
l_l     = 282.0e-6      # Effective diffusion distance v→h phase [m]
m_cell  = 30.0e-6       # Average coffee cell radius [m]
r_s     = 16.94         # Density ratio param (links porosity to surface depletion) [-]
rho_w   = 965.3         # Water density at 93°C [kg/m³]

# VAULT — Moroney 2016, p.17 (fine grind, Jacobs Kronung)
# Source: Physics/equations/moroney_2016_immersion_ode.md
epsilon = 0.028         # Surface timescale / kernel diffusion timescale [-]
gamma_1 = 0.70          # Initial intragranular concentration: c_v0 = gamma_1 * c_sat [-]

# VAULT — Liang 2021 (equilibrium anchor — BREWOS-TODO-001)
# Source: Physics/equations/liang_2021_equilibrium_desorption.md
K_liang = 0.717         # Equilibrium desorption constant [-]
K_sigma = 0.007         # Uncertainty on K
E_max   = 0.30          # Maximum achievable extraction yield (fraction) [-]

# ─────────────────────────────────────────────────────────────────────────────
# ESTIMATED PARAMETERS — not in vault; require Moroney 2015 Table 1 confirmation
# ─────────────────────────────────────────────────────────────────────────────
phi_v_inf       = 0.40      # Final intragranular pore fraction [-] — estimated
c_s             = 1050.0    # Solid coffee concentration [kg/m³] — estimated
rho_bulk_ground = 450.0     # Ground coffee bulk density [kg/m³] — estimated, fine/medium grind


def kozeny_carman_permeability(d_particle_m: float, porosity: float) -> float:
    """Kozeny-Carman permeability for packed bed of spheres.

    K = d^2 * eps^3 / (180 * (1 - eps)^2)

    Args:
        d_particle_m: Particle diameter in metres.
        porosity: Bed porosity (void fraction), 0 < eps < 1.

    Returns:
        Permeability K in m^2.
    """
    return d_particle_m**2 * porosity**3 / (180.0 * (1.0 - porosity)**2)


def derive_percolation_params(coffee_dose_g: float, water_amount_g: float,
                              water_temp_c: float, grind_size_um: float,
                              bed_depth_m: float = 0.050,
                              pressure_bar: float = 0.0,
                              porosity: float = 0.40) -> dict:
    """Derive percolation ODE parameters including Darcy velocity and spatial grid.

    Extends immersion parameters with advection velocity and MOL grid setup.
    Uses Kozeny-Carman permeability for the packed bed.

    Args:
        coffee_dose_g:  Coffee mass in grams.
        water_amount_g: Water mass in grams.
        water_temp_c:   Brew temperature in degrees Celsius.
        grind_size_um:  Median grind size in micrometres.
        bed_depth_m:    Coffee bed depth in metres.
        pressure_bar:   Applied pressure in bar (0 for gravity-driven).
        porosity:       Bed porosity (void fraction).

    Returns:
        dict with immersion params plus: v_darcy, bed_depth_m, porosity, N, dz.
    """
    # Get base immersion params (kA, kB, kC, kD, c_sat, c_v0, etc.)
    base = derive_immersion_params(coffee_dose_g, water_amount_g,
                                   water_temp_c, grind_size_um)

    # Darcy velocity via Kozeny-Carman
    d_particle_m = grind_size_um * 1e-6
    K_perm = kozeny_carman_permeability(d_particle_m, porosity)
    mu = 0.3e-3                             # water dynamic viscosity at 93C [Pa*s]

    if pressure_bar is not None and pressure_bar > 0:
        # Pressure-driven (espresso/moka)
        delta_P = pressure_bar * 1e5        # bar -> Pa
        v_darcy = K_perm / mu * delta_P / bed_depth_m
    else:
        # Gravity-driven (pour-over)
        v_darcy = K_perm / mu * rho_w * 9.81

    # Cap Darcy velocity to physically realistic maximum.
    # Kozeny-Carman with nominal particle diameter overpredicts permeability for
    # espresso (real grind has significant fines creating much tighter packing).
    # Real espresso: ~1-3 mL/s through 58mm basket -> v ~ 0.4-1.1 mm/s.
    # Cap at 5 mm/s to prevent numerical issues while allowing valid pour-over velocities.
    V_DARCY_MAX = 5.0e-3                    # 5 mm/s — physical upper bound
    v_darcy = min(v_darcy, V_DARCY_MAX)

    # Spatial discretization
    N  = 30                                 # number of spatial nodes
    dz = bed_depth_m / (N - 1)

    base.update({
        "v_darcy":     v_darcy,
        "bed_depth_m": bed_depth_m,
        "porosity":    porosity,
        "N":           N,
        "dz":          dz,
    })
    return base


def derive_immersion_params(coffee_dose_g: float, water_amount_g: float,
                            water_temp_c: float, grind_size_um: float) -> dict:
    """Derive all ODE rate coefficients and initial conditions from brew inputs.

    Parameters computed dynamically from the scenario so that changing dose,
    water, or grind size produces physically correct new coefficients.

    Args:
        coffee_dose_g:   Coffee mass in grams.
        water_amount_g:  Water mass in grams.
        water_temp_c:    Brew temperature in degrees Celsius (unused in this model
                         version; reserved for future temperature-dependent D_h).
        grind_size_um:   Median grind size in micrometres (unused here; reserved
                         for grinder-lookup PSD in Plan 01-03).

    Returns:
        dict with keys: kA, kB, kC, kD, phi_h, c_sat, rho_w, c_v0, psi_s0, c_h0,
        phi_c0, scale_factor_placeholder.
    """
    # Volume fractions
    V_water_m3  = water_amount_g * 1e-3 / rho_w
    V_coffee_m3 = coffee_dose_g  * 1e-3 / rho_bulk_ground
    phi_h       = V_water_m3 / (V_water_m3 + V_coffee_m3)  # intergranular porosity

    # phi_c0 derived from IC constraint (Moroney 2016, p.12):
    #   c_v(0) = gamma_1 * c_sat = (phi_c0 / phi_v_inf) * c_s
    #   → phi_c0 = gamma_1 * c_sat * phi_v_inf / c_s
    phi_c0 = gamma_1 * c_sat * phi_v_inf / c_s             # ≈ 0.0567

    # D_v derived from epsilon = T_surface / T_kernel:
    #   T_surface = k_sv1 * m_cell * c_s / (12 * D_h * phi_c0 * c_sat * r_s)
    #   D_v = epsilon * l_l² / T_surface
    T_surface_s = (k_sv1 * m_cell * c_s) / (12.0 * D_h * phi_c0 * c_sat * r_s)
    D_v         = epsilon * l_l**2 / T_surface_s

    # ─────────────────────────────────────────────────────────────────────────
    # ODE RATE COEFFICIENTS (Moroney 2016, eqs. from PoC)
    # ─────────────────────────────────────────────────────────────────────────
    kA = alpha_n * (1.0 - phi_h) / phi_h * phi_v_inf**(4.0/3.0) * D_v / (6.0 * k_sv2 * l_l)
    kB = beta_n  * (1.0 - phi_h) / phi_h * 12.0 * D_h * phi_c0 / (k_sv1 * m_cell)
    kC = alpha_n * phi_v_inf**(1.0/3.0) * D_v / (6.0 * k_sv2 * l_l)
    kD = beta_n  * 12.0 * D_h * phi_c0 / (k_sv1 * m_cell) * r_s / c_s

    # Initial conditions
    c_v0   = gamma_1 * c_sat    # 148.68 kg/m³
    c_h0   = 0.0
    psi_s0 = 1.0

    return {
        "kA":                   kA,
        "kB":                   kB,
        "kC":                   kC,
        "kD":                   kD,
        "phi_h":                phi_h,
        "phi_c0":               phi_c0,
        "c_sat":                c_sat,
        "rho_w":                rho_w,
        "c_v0":                 c_v0,
        "c_h0":                 c_h0,
        "psi_s0":               psi_s0,
        "scale_factor_placeholder": None,   # actual scaling done post-solve
    }

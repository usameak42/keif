---
phase: 3
slug: pressure-solver
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | `brewos-engine/pyproject.toml` |
| **Quick run command** | `cd brewos-engine && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd brewos-engine && python -m pytest tests/ -v` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd brewos-engine && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd brewos-engine && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | SOLV-05 | stub | `cd brewos-engine && python -m pytest tests/test_pressure.py -x -q` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | SOLV-05 | integration | `cd brewos-engine && python -m pytest tests/test_pressure.py::test_moka_accurate_mode -v` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | SOLV-05 | unit | `cd brewos-engine && python -m pytest tests/test_pressure.py::test_moka_ey_range -v` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 2 | SOLV-05 | perf | `cd brewos-engine && python -m pytest tests/test_pressure.py::test_moka_fast_mode_timing -v` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 2 | METH-05 | integration | `cd brewos-engine && python -m pytest tests/test_pressure.py::test_moka_method -v` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | SOLV-06 | integration | `cd brewos-engine && python -m pytest tests/test_pressure.py::test_aeropress_hybrid -v` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | SOLV-06 | unit | `cd brewos-engine && python -m pytest tests/test_pressure.py::test_aeropress_higher_ey -v` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | METH-06 | integration | `cd brewos-engine && python -m pytest tests/test_pressure.py::test_aeropress_method -v` | ❌ W0 | ⬜ pending |
| 3-02-04 | 02 | 3 | SOLV-05,SOLV-06,METH-05,METH-06 | smoke | `cd brewos-engine && python -m pytest tests/test_all_methods.py -v` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `brewos-engine/tests/test_pressure.py` — stubs for SOLV-05, SOLV-06, METH-05, METH-06
- [ ] `brewos-engine/tests/test_all_methods.py` — cross-method smoke tests (all 6 methods, both modes)
- [ ] Existing `brewos-engine/tests/conftest.py` — verify shared fixtures available

*Wave 0 must create test stubs before any solver implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Moka Pot heating phase precedes extraction onset | SOLV-05 | Requires visual inspection of time-series data | Run accurate mode, plot c_h vs time, confirm c_h stays ~0 for first N seconds then rises |
| AeroPress steep → push transition visible in output | SOLV-06 | Phase boundary not directly encoded in SimulationOutput | Inspect extraction_curve time points, confirm EY slope increases after steep_time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

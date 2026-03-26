---
phase: 2
slug: percolation-solver
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.2 |
| **Config file** | `brewos-engine/pyproject.toml` `[tool.pytest.ini_options]` |
| **Quick run command** | `cd brewos-engine && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd brewos-engine && python -m pytest tests/ -v` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd brewos-engine && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd brewos-engine && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | SOLV-03, VAL-02 | stub | `cd brewos-engine && python -m pytest tests/test_percolation_solver.py -x -q` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | SOLV-04 | stub | `cd brewos-engine && python -m pytest tests/test_percolation_fast.py -x -q` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 0 | METH-02, METH-03, METH-04 | stub | `cd brewos-engine && python -m pytest tests/test_v60.py tests/test_kalita.py tests/test_espresso.py -x -q` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 0 | OUT-08 | stub | `cd brewos-engine && python -m pytest tests/test_espresso.py::test_channeling_risk -x -q` | ❌ W0 | ⬜ pending |
| 2-01-05 | 01 | 1 | SOLV-03 | integration | `cd brewos-engine && python -m pytest tests/test_percolation_solver.py::test_accurate_output -x` | ❌ W0 | ⬜ pending |
| 2-01-06 | 01 | 1 | VAL-02 | integration | `cd brewos-engine && python -m pytest tests/test_percolation_solver.py::test_batali_validation -x` | ❌ W0 | ⬜ pending |
| 2-01-07 | 01 | 1 | METH-04 | integration | `cd brewos-engine && python -m pytest tests/test_espresso.py::test_standard_recipe -x` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | SOLV-04 | unit + perf | `cd brewos-engine && python -m pytest tests/test_percolation_fast.py -x` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | METH-02 | integration | `cd brewos-engine && python -m pytest tests/test_v60.py -x` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | METH-03 | integration | `cd brewos-engine && python -m pytest tests/test_kalita.py -x` | ❌ W0 | ⬜ pending |
| 2-02-04 | 02 | 2 | OUT-08 | unit | `cd brewos-engine && python -m pytest tests/test_espresso.py::test_channeling_risk -x` | ❌ W0 | ⬜ pending |
| 2-02-05 | 02 | 2 | SC-3 | integration | `cd brewos-engine && python -m pytest tests/test_percolation_solver.py::test_method_distinction -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_percolation_solver.py` — stubs for SOLV-03, VAL-02, SC-3 (test_accurate_output, test_batali_validation, test_method_distinction)
- [ ] `tests/test_percolation_fast.py` — stubs for SOLV-04 (fast mode < 1ms, within ±2% of accurate)
- [ ] `tests/test_v60.py` — stubs for METH-02 (V60 distinct TDS/EY)
- [ ] `tests/test_kalita.py` — stubs for METH-03 (Kalita distinct TDS/EY)
- [ ] `tests/test_espresso.py` — stubs for METH-04, OUT-08 (standard recipe EY 18-22%, channeling risk [0,1])

*Existing infrastructure covers pytest and conftest — only new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Espresso kB pressure-scaling feels physically reasonable | METH-04 | kB calibration is a judgment call if 9-bar regime needs adjustment | Run espresso accurate mode, inspect EY(t) curve shape — should plateau near 20% within 25s |
| Lee 2023 channeling risk score reflects intuition | OUT-08 | Risk formula is our interpretation, not directly from paper | Fine grind (200um) at 9 bar should score higher risk than medium grind (400um) at same pressure |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

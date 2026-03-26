---
phase: 1
slug: immersion-solver-core-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.2 |
| **Config file** | `brewos-engine/pyproject.toml` `[tool.pytest.ini_options]` |
| **Quick run command** | `cd brewos-engine && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd brewos-engine && python -m pytest tests/ -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd brewos-engine && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd brewos-engine && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | SOLV-01, SOLV-07, SOLV-08, VAL-01 | unit+integration | `cd brewos-engine && python -m pytest tests/test_immersion_solver.py -x -q` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | SOLV-02, OUT-09 | unit+perf | `cd brewos-engine && python -m pytest tests/test_fast_mode.py tests/test_co2_bloom.py -x -q` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | METH-01, OUT-01..06, GRND-01, GRND-02, GRND-11 | unit+integration | `cd brewos-engine && python -m pytest tests/test_grinder_db.py tests/test_french_press.py -x -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_immersion_solver.py` — stubs for SOLV-01, SOLV-07, SOLV-08, VAL-01
- [ ] `tests/test_fast_mode.py` — stubs for SOLV-02
- [ ] `tests/test_co2_bloom.py` — stubs for OUT-09
- [ ] `tests/test_grinder_db.py` — stubs for GRND-01, GRND-02, GRND-11
- [ ] `tests/test_french_press.py` — stubs for METH-01, OUT-01 through OUT-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CO2 bloom tau values plausible for brew window | OUT-09 | Beta suppression values are estimates with no direct published calibration data | Inspect printed tau1/tau2 values; confirm bloom correction decreases within first 30s of brew |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

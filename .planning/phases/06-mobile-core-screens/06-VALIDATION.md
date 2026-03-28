---
phase: 6
slug: mobile-core-screens
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (via Expo/React Native test runner) |
| **Config file** | `keif-mobile/jest.config.js` (Wave 0 installs) |
| **Quick run command** | `cd keif-mobile && npx jest --testPathPattern="unit"` |
| **Full suite command** | `cd keif-mobile && npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd keif-mobile && npx jest --testPathPattern="unit"`
- **After every plan wave:** Run `cd keif-mobile && npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | MOB-01 | smoke | `cd keif-mobile && npx expo export --platform ios --no-minify` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | MOB-01 | unit | `cd keif-mobile && npx jest --testPathPattern="MethodSelector"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | MOB-02 | unit | `cd keif-mobile && npx jest --testPathPattern="ParameterForm"` | ❌ W0 | ⬜ pending |
| 06-01-04 | 01 | 2 | MOB-03 | unit | `cd keif-mobile && npx jest --testPathPattern="GrinderSelector"` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | MOB-05 | unit | `cd keif-mobile && npx jest --testPathPattern="apiClient"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | MOB-06 | unit | `cd keif-mobile && npx jest --testPathPattern="LoadingState"` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | MOB-07 | unit | `cd keif-mobile && npx jest --testPathPattern="ResultsScreen"` | ❌ W0 | ⬜ pending |
| 06-02-04 | 02 | 2 | MOB-08 | unit | `cd keif-mobile && npx jest --testPathPattern="SCAChart"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `keif-mobile/__tests__/unit/MethodSelector.test.tsx` — stubs for MOB-01
- [ ] `keif-mobile/__tests__/unit/ParameterForm.test.tsx` — stubs for MOB-02
- [ ] `keif-mobile/__tests__/unit/GrinderSelector.test.tsx` — stubs for MOB-03
- [ ] `keif-mobile/__tests__/unit/apiClient.test.ts` — stubs for MOB-05
- [ ] `keif-mobile/__tests__/unit/LoadingState.test.tsx` — stubs for MOB-06
- [ ] `keif-mobile/__tests__/unit/ResultsScreen.test.tsx` — stubs for MOB-07
- [ ] `keif-mobile/__tests__/unit/SCAChart.test.tsx` — stubs for MOB-08
- [ ] `keif-mobile/jest.config.js` — jest config with React Native preset
- [ ] jest, @testing-library/react-native install — framework setup

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iOS simulator renders all screens | MOB-04 | Requires device/simulator | `npx expo start --ios` and navigate all 3 screens |
| Android emulator renders all screens | MOB-04 | Requires emulator | `npx expo start --android` and navigate all 3 screens |
| Accurate mode completes in <4s | MOB-06 | Timing on real API call | Tap Simulate in accurate mode, verify spinner < 4s |
| SCA chart plots result in correct zone | MOB-07/MOB-08 | Visual verification | Check chart point lands in expected green/yellow/red zone |
| Spring-snap rotary selector feels correct | MOB-02 | Haptic/tactile feel | Flick rotary, verify snap animation and value update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

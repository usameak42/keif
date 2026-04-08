# Status Delta — 2026-04-05 → 2026-04-06

## Git (10 commits since Apr 5)

```
f2310bd docs(quick-260406-lgu): README update to reflect current state
1f58326 docs: add comprehensive README for BrewOS Engine
492ca33 feat(mobile): carousel glow polish, label cleanup, sync border color
dc1ca46 planning: add v2 roadmap phases 9-21
f329265 rescue: restore 4 test files from git history
9825f38 rescue: move tests from worktrees to main repo
0d5ec83 chore: add GSD tooling, planning artifacts, Phase 8 scaffold
0f20905 docs(quick-260405-o3p): remove temperature curve toggle — always show chart
ac21934 feat(quick-260405-o3p-01): remove toggle from TempCurveInline
685efce chore: migrate API base URL from Koyeb → Render
```

## keif-mobile/ Changes

**Added:**
- `.npmrc` — registry config (likely for EAS)
- `eas.json` — EAS Build config added

**Modified:**
- `app.config.ts` — updated config (likely API URL / EAS project)
- `app/index.tsx` — home screen (carousel glow/label polish)
- `app/_layout.tsx` — layout update
- `components/RotarySelector.tsx` — carousel polish
- `components/TempCurveInline.tsx` — removed toggle, chart always rendered
- `constants/api.ts` — **Koyeb → Render** (`https://keif.onrender.com`)
- `constants/brewMethods.ts` — brew method data update
- `hooks/useRunComparison.ts` — comparison hook update
- `hooks/useRunHistory.ts` — history hook update
- `package.json` / `package-lock.json` — dependency update

**No screens added or removed** — still 7 screens (index, dashboard, results, extended, history, compare, _layout)  
**No components added or removed** — still 28 components

## brewos/ Changes

None. Engine untouched.

## Tests

```
174 passed, 1 skipped — 10.16s
```

## SDK / Dependencies

| | Value |
|---|---|
| Expo SDK | ~54.0.0 |
| React Native | 0.81.5 |

## Deployment

**Changed: Koyeb → Render**  
API base URL: `https://keif.onrender.com`  
Fallback configured via `expo-constants` → `EXPO_PUBLIC_API_URL` env var.

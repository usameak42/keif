# Phase 6: Mobile Core Screens - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 06-mobile-core-screens
**Areas discussed:** Navigation structure, Input form layout, Grinder input UX, Results layout, Fast vs Accurate mode UX

---

## Navigation Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Linear stack | Method → Inputs → Results, back arrow | |
| Calculator feel | Inputs + results on same screen, no navigation | base selection |
| Bottom tab bar | "Simulate" + "Results" tabs always reachable | |

**User's choice:** Calculator feel (single-screen), but extended with a distinctive navigation concept: "Filtration" — three-screen linear flow (Rotary Selector → Brew Dashboard → Results). Forward transition = content drips downward like coffee through a filter. Back = content rises back up. No tab bars, no menus. Back/tweak button returns to previous screen.

**Notes:** The "Filtration" navigation is a core app identity decision, not just an animation preference. The user coined the term and it shapes the whole feel of the app.

---

## Input Form Layout

| Option | Description | Selected |
|--------|-------------|----------|
| All params, single scroll | Everything on one scrollable Brew Dashboard | ✓ |
| Grouped sections | Collapsed/expanded sections: Coffee, Water, Grinder | |
| Split across screens | Grinder on sub-screen, params on Dashboard | |

**User's choice:** Single scrollable form. All parameters visible in one view.

**Notes:** Consistent with the calculator-style feel. User wants to see all inputs at once.

---

## Grinder Input UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown + click spinner | Model dropdown → click/setting spinner; "Manual" swaps to μm field | ✓ |
| Toggle: Preset / Manual | Segmented toggle switches between preset and manual mode | |
| Always show both | Picker + μm field both visible, μm auto-populates from preset | |

**User's choice:** Dropdown + click spinner. If "Manual" selected, spinner replaced by μm text field.

**Notes:** Clean, minimal interaction. The μm field only appears when needed.

---

## Results Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Numbers first, chart below | TDS/EY callout cards top, SCA chart lower half | |
| Chart primary, numbers overlay | Chart dominates, TDS/EY as annotations | |
| Balanced split | Equal weight — callouts + zone verdict top, chart below | ✓ |

**User's choice:** Balanced split. TDS%, EY%, zone verdict ("Ideal ✓") as callouts in upper portion; SCA chart in lower portion. Scrollable.

**Notes:** Zone verdict as text ("Ideal ✓", "Under-extracted", "Over-extracted") alongside numbers gives instant read without parsing the chart.

---

## Fast vs Accurate Mode UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fast, offer upgrade | Always runs fast; "Run detailed simulation" button on Results | |
| Toggle on Brew Dashboard | Fast / Accurate segmented toggle before running | ✓ |
| Two simulate buttons | "Quick Sim" / "Full Sim" buttons on Dashboard | |

**User's choice:** Toggle on Brew Dashboard (Fast | Accurate). User decides mode before running. Accurate mode shows loading spinner on Results screen while waiting.

**Notes:** User explicitly noted this is a "core differentiator of the app." Putting the toggle on the input screen makes the mode choice deliberate and visible.

---

## Claude's Discretion

- TypeScript (standard for Expo)
- Local React state / context (no Redux/Zustand needed)
- Navigation library selection (Expo Router vs React Navigation — researcher decides)
- Directory structure (screens/, components/, hooks/, constants/)
- API error handling (inline error on Results screen)
- API base URL as environment variable / Expo constant

## Deferred Ideas

- Extended output charts → Phase 7
- Run history / save / compare → Phase 7

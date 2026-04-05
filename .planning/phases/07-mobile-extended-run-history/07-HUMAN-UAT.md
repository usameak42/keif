---
status: partial
phase: 07-mobile-extended-run-history
source: [07-VERIFICATION.md]
started: 2026-03-28T00:00:00Z
updated: 2026-03-28T00:00:00Z
---

## Current Test

number: 1
name: Extended Output Screen Navigation
expected: |
  Run a simulation. On Results screen, tap "View Details." Should navigate to Extended Output screen showing extraction curve chart, PSD chart, flavor bars, and detail cards — all populated with real simulation data.
awaiting: user response

## Tests

### 1. Extended Output Screen Navigation

expected: Run a simulation. On Results screen, tap "View Details." Should navigate to Extended Output screen showing extraction curve chart, PSD chart, flavor bars, and detail cards — all populated with real simulation data.
result: [pending]

### 2. Temperature Curve Inline Expand

expected: On Extended Output screen, tap "View curve" in the Temperature at End card. Compact line chart should expand below the toggle showing temperature decay over brew time (only appears for methods that return temperature_curve).
result: [pending]

### 3. Swipe-to-Delete on Run List Item

expected: Save a run, go to Run History, swipe left on a run item. Red delete action reveals. Tap it. Confirmation modal appears. Tap "Delete Run." Item is removed from list.
result: [pending]

### 4. Long-Press Selection Mode and Compare Flow

expected: Save two runs. Long-press one (enters selection mode). Tap a second item. Tap "Compare Runs." Compare View opens showing both run names, metric columns, overlaid extraction curves, SCA chart with two colored points, and flavor comparison bars.
result: [pending]

### 5. Archive Banner Trigger

expected: Accumulate more than 100 saved runs. Archive banner ("Archive old runs") appears at top of Run History. Tapping it archives runs older than 30 days and the banner dismisses.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

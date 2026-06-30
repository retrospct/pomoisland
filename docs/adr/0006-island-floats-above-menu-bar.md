# ADR-0006: The snapped island floats above the macOS menu bar

Status: Accepted
Date: 2026-06-29

## Context

When the island is **snapped**, it should sit flush at the very top edge of the
display and appear to emerge from the camera notch (see `design-reference/` —
the drop ghost and snapped island are anchored at the screen top, overlapping
the menu bar). `snappedTopLeft` already anchors at `display.bounds.y` (the true
top edge, not `workArea.y`) for this reason (MO-11).

However, the island window runs at the `'floating'` window level
(`NSFloatingWindowLevel` = 3), which is **below** the macOS menu bar
(`kCGMainMenuWindowLevel` = 24). macOS therefore clamps the window beneath the
menu bar, so the snapped island never actually reaches the top edge — the
"magnetic drop area is not over the menu bar" symptom. The drop-zone overlay,
though at `'screen-saver'` level, is positioned at a negative Y that also gets
clamped down.

This became load-bearing with MO-22 (#12, user-configurable notch element
placement). MO-22 lets elements flank the notch (left/right clusters around a
reserved 200px camera gap), but its commit explicitly defers "window
notch-spanning" — and flanking clusters are only correct if the island paints
**beside the physical notch, over the menu bar**. If it stays clamped below the
menu bar, the clusters render under the notch and the feature is defeated.

## Decision

Raise the snapped island's window level so it can paint over the menu bar on all
displays. Use the `'status'` band (`NSStatusWindowLevel` = 25, just above the
menu bar — the same level menu-bar extras use), with the drop overlay kept above
the island. Keep `snappedTopLeft` anchored at `bounds.y`. The island floats above
the menu bar **whenever snapped, on every display** (not notch-only), accepting
that on non-notch displays it covers the center of the real menu bar.

## Alternatives considered

- **Float above the menu bar only on notch displays; dock below it elsewhere.**
  Rejected — inconsistent behavior across displays and more conditional geometry;
  the center of the menu bar is empty in practice (menu items are left, status
  items right), so the cost of always-above is low.
- **Keep the island below the menu bar and only align the ghost to where it
  lands.** Rejected — diverges from the design (emerge-from-notch look) and
  blocks MO-22 notch-spanning.

## Consequences

- The snapped island (and its drop ghost) overlap the menu bar's center; on
  non-notch displays the island intercepts clicks in that region. Acceptable
  because the center is normally empty.
- This is the enabling piece for MO-22 notch-spanning: with the island over the
  menu bar, left/right clusters can flank the camera. Calibrating `NOTCH_GAP`
  against real `NSScreen` safe-area insets remains follow-up.
- Fullscreen interplay (auto-hidden menu bar) should be verified; the window
  already uses `setVisibleOnAllWorkspaces(..., { visibleOnFullScreen: true })`.
- Empirically verify macOS no longer clamps `setBounds`/`setPosition` once the
  level is elevated (log actual vs requested bounds during a snap).

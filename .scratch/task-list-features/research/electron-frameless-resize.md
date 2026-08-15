# Research: Electron frameless, resizable window on macOS

For ticket `02-research-electron-frameless-resizable-macos.md`. Feeds ticket 10
(detached task-list window architecture).

- **Electron**: `^42.5.1` (installed: `42.5.1`, `package.json` devDependencies). The
  `42-x-y` branch pins **Chromium 148.0.7778.280**
  (<https://github.com/electron/electron/blob/42-x-y/DEPS>). Newest 42.x at time of
  writing is 42.9.1; 43.x is the newest stable line, so `^42` is supported but not latest.
- **Distribution**: this app ships **non-MAS** — `electron-builder.js:56` targets
  `dmg` + `zip`, not `mas`. That distinction matters in §2 (Electron takes a different
  macOS code path in MAS builds).
- **Sources used**: electronjs.org `/docs/latest`, the `electron/electron` **`42-x-y`**
  release branch source, Chromium source, the local macOS SDK AppKit headers, Apple
  developer docs, and the typings shipped with the installed Electron
  (`node_modules/electron/electron.d.ts`).
- **Dated**: 2026-08-15. Nothing here is from memory; every claim carries a source.
- Anything unverified is called out in **[UNCONFIRMED]** and collected at the end.

---

## 1. Resize grip in the bottom-right corner

### There is no native affordance left. The glyph must be hand-drawn.

`NSWindow.showsResizeIndicator` — the API behind the classic grow box — is deprecated
**and inert**. From the macOS SDK header on this machine
(`.../MacOSX.sdk/System/Library/Frameworks/AppKit.framework/Headers/NSWindow.h:1034`):

```objc
@property BOOL showsResizeIndicator
  API_DEPRECATED("This property does not do anything and should not be used.",
                 macos(10.0,15.0));
```

Note the wording: *"does not do anything"* — not merely "deprecated". macOS draws no
corner glyph for any window, framed or frameless.

Electron does not expose it either. Grepping the shipped typings for Electron 42.5.1,
the **entire** resize-related API surface on `BaseWindow`/`BrowserWindow` is:

| API | `electron.d.ts` line |
| --- | --- |
| `resizable?: boolean` (constructor) | 3939 |
| `setResizable(resizable: boolean)` | 3426 |
| `isResizable(): boolean` | 3013 |
| `setMinimumSize` / `getMinimumSize` / `setMaximumSize` | 3371 / 2813 / 3347 |
| `setAspectRatio` | 3181 |
| `'will-resize'` / `'resize'` / `'resized'` events | 2647 / 2345 / 2359 |

Searched and **absent**: `beginResize`, `startResize`, any hit-test override, any
`resizeIndicator`, any `resizeBorder`/`resizeArea`/`draggable` constructor option.
(`grep -in "beginresize\|startresize\|resizeindicator\|showsresize\|hitTest\|resizeborder\|resizearea\|draggable" node_modules/electron/electron.d.ts` → no matches.)

**Conclusion:** the "fold/grip icon" is purely decorative. Draw it in the renderer
(SVG or CSS), bottom-right, inside the window's own padding.

### Does the hand-drawn grip need its own pointer handling?

**No — and it must not have any.** On macOS the resize interaction belongs entirely to
AppKit, and the grip glyph only has to sit inside AppKit's corner hit zone.

Proof from source. Electron's cross-platform hit test explicitly compiles the
resize-border branch **out** on macOS
(`shell/browser/native_window.cc:648-671`, `42-x-y`):

```cpp
int NativeWindow::NonClientHitTest(const gfx::Point& point) {
#if !BUILDFLAG(IS_MAC)
  // We need to ensure we account for resizing borders on Windows and Linux.
  if ((!has_frame() || has_client_frame()) && IsResizable()) {
    auto* frame = static_cast<FramelessView*>(
        widget()->non_client_view()->frame_view());
    int border_hit = frame->ResizingBorderHitTest(point);
    if (border_hit != HTNOWHERE)
      return border_hit;
  }
#endif
  ...
  for (auto* provider : draggable_region_providers_) { ... }
  return HTNOWHERE;
}
```

And the macOS frame view's hit-test callback returns *only* the draggable-region result
or `HTCLIENT` — never a resize code
(`shell/browser/native_window_mac.mm:1751-1772`):

```cpp
std::unique_ptr<views::FrameView> NativeWindowMac::CreateFrameView(views::Widget* widget) {
  auto frame_view = std::make_unique<views::NativeFrameViewMac>(widget);
  frame_view->set_non_client_hit_test_callback(base::BindRepeating(
      &NativeWindowMac::FrameViewNonClientHitTest, base::Unretained(this)));
  return frame_view;
}

std::optional<int> NativeWindowMac::FrameViewNonClientHitTest(const gfx::Point& point) {
  if (widget()->IsFullscreen()) return HTCLIENT;
  // Check for possible draggable region in the client area for the frameless window.
  int contents_hit_test = NonClientHitTest(point);
  if (contents_hit_test != HTNOWHERE) return contents_hit_test;
  return HTCLIENT;
}
```

Resize therefore comes from `NSWindowStyleMaskResizable` on the `NSWindow`, which
Electron sets straight from the `resizable` option regardless of `frame`
(`native_window_mac.mm:203-212`):

```cpp
const bool resizable = options.ValueOrDefault(options::kResizable, true);
...
NSUInteger styleMask = NSWindowStyleMaskTitled;
if (minimizable) styleMask |= NSWindowStyleMaskMiniaturizable;
if (closable)    styleMask |= NSWindowStyleMaskClosable;
if (resizable)   styleMask |= NSWindowStyleMaskResizable;
```

Sources:
- <https://github.com/electron/electron/blob/42-x-y/shell/browser/native_window.cc>
- <https://github.com/electron/electron/blob/42-x-y/shell/browser/native_window_mac.mm>
- <https://developer.apple.com/documentation/appkit/nswindow/showsresizeindicator>

**Practical rule for the grip:** give it `pointer-events: none` (or at least no mouse
handlers) and make sure nothing around it is marked `app-region: drag` — see §2.

---

## 2. Edge-resize hit region, and `app-region` conflicts

### 2a. The hit region width is **not** an Electron number on macOS

Electron *does* own the resize border on Windows and Linux. The constants live in
`FramelessView`:

- `static constexpr int kResizeInsideBoundsSize = 5;` — `shell/browser/ui/views/frameless_view.h`
- `kResizeAreaCornerSize = 16;` — `shell/browser/ui/views/frameless_view.cc`

```cpp
int FramelessView::ResizingBorderHitTest(const gfx::Point& point) {
  return ResizingBorderHitTestImpl(point, gfx::Insets(kResizeInsideBoundsSize));
}
```

But `frameless_view.{cc,h}` live in `filenames.gni`'s `lib_sources_views` list, and
`BUILD.gn:634-636` says:

```gn
if (!is_mac) {
  sources += filenames.lib_sources_views
}
```

So **those 5px / 16px numbers do not apply to macOS at all.** On macOS the hit region
is AppKit's own, for a borderless `NSWindowStyleMaskResizable` window.

What macOS uses instead is visible in Electron's Chromium patch
`patches/chromium/mas_avoid_private_macos_api_usage.patch.patch`, which rewrites
`-[NativeWidgetMacNSWindow cr_mouseDownOnFrameView:]`:

```objc
- (void)cr_mouseDownOnFrameView:(NSEvent*)event {
#if !IS_MAS_BUILD()
  if ([self.window _resizeDirectionForMouseLocation:event.locationInWindow] != -1)
    return;                      // ← it's a resize; do NOT turn it into a window drag
#else
  // For MAS builds, approximate the resize direction check.
  if (self.window.styleMask & NSWindowStyleMaskResizable) {
    // - 5pt resize handles along edges
    // - 16pt resize hot-zone at corners
    constexpr CGFloat kResizeInsideBoundsSize = 5.0;
    constexpr CGFloat kResizeAreaCornerSize   = 16.0;
    ...
  }
#endif
  [self.window performWindowDragWithEvent:event];
}
```

So on macOS:

- **Non-MAS (this app):** the zone is whatever AppKit's **private, undocumented**
  `-[NSWindow _resizeDirectionForMouseLocation:]` says. **[UNCONFIRMED]** — Apple
  publishes nothing about it, and no primary source gives a number.
- **MAS builds only:** Electron hardcodes 5pt edges / 16pt corners to avoid the private
  API. Not our build, but it is the number people quote for macOS.

Practical takeaway: treat the width as unknown and keep ~8px of clearance. Design the
header and the grip so nothing important sits within ~8px of any window edge.

Sources:
- <https://github.com/electron/electron/blob/42-x-y/shell/browser/ui/views/frameless_view.h>
- <https://github.com/electron/electron/blob/42-x-y/shell/browser/ui/views/frameless_view.cc>
- <https://github.com/electron/electron/blob/42-x-y/filenames.gni>
- <https://github.com/electron/electron/blob/42-x-y/BUILD.gn>
- <https://github.com/electron/electron/blob/42-x-y/patches/chromium/mas_avoid_private_macos_api_usage.patch.patch>

### 2b. Can it be widened?

**No.** There is no Electron API for it (see the exhaustive table in §1), and on macOS
Electron does not implement the region in the first place — it is AppKit's. There is no
supported knob.

### 2c. Does `app-region: drag` on a custom header conflict with resize?

**On Windows/Linux: no, resize wins.** Look at the ordering in `NonClientHitTest`
above — `ResizingBorderHitTest` is consulted *before* the draggable-region providers, so
an edge/corner pixel resizes even under a full-bleed drag region. (This is why the old
report of the opposite behaviour, `electron/electron#3022` "Draggable region in
frameless window hides the resize handle on window border", is closed **wontfix** — it
predates this code and its repro was Linux/Windows.)
<https://github.com/electron/electron/issues/3022>

**On macOS: also no — resize wins, by construction.** The patch quoted in §2a is the
proof: on a non-MAS build, `cr_mouseDownOnFrameView:` asks
`_resizeDirectionForMouseLocation:` **first** and bails out of the window-drag path when
the point is in a resize zone. A drag region flush to the window edge therefore does not
shadow AppKit's resize band.

The known macOS failure is the *opposite* one, and it is MAS-only: with the private API
swapped for the 5pt/16pt approximation, a corner mousedown can be misclassified so the
window **moves while it is being resized** — `electron/electron#49770` (closed/completed,
2026‑02‑18, fixed by PR #49780) and its regression `#50520` (closed/completed,
2026‑04‑13). We ship dmg/zip, so this does not apply, but it would if the app ever went
to the App Store.

Still worth insetting the drag region anyway. Give the header ~6px of transparent
margin on the left, right and top so the drag rect never touches the window edge — it
costs nothing and it is the workaround the reporter of #3022 used ("leave some margins
between body and the div"). The Settings window today does the opposite:
`SettingsApp.tsx:42` wraps header+tabs in a full-width `WebkitAppRegion: 'drag'` div
whose padding is *inside* the drag rect (`header` = `padding: '18px 28px 0'`), so the
drag region reaches x=0 and y=0. It has never mattered because Settings is comfortably
large and has no corner grip — it is not a precedent to copy blindly for a small window
where the corner matters.

Sources: <https://github.com/electron/electron/issues/49770> ·
<https://github.com/electron/electron/issues/50520> ·
<https://github.com/electron/electron/pull/49780>

### 2d. The documented `app-region` gotchas

Verbatim from the official tutorial
(<https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions>):

1. **Drag regions eat all pointer events.** *"Draggable areas ignore all pointer events.
   For example, a button element that overlaps a draggable region will not emit mouse
   clicks or mouse enter/exit events within that overlapping area."*
   → every interactive child (pop-in, pin, ✕, and the grip if it ever becomes
   interactive) needs an explicit `app-region: no-drag`. The docs' own example:

   ```css
   body   { app-region: drag; }
   button { app-region: no-drag; }
   ```

2. **Text selection conflicts.** *"When creating a draggable region, the dragging
   behavior may conflict with text selection."*

   ```css
   .titlebar { user-select: none; app-region: drag; }
   ```

3. **Right-click / context menu.** *"On some platforms, the draggable area will be
   treated as a non-client frame, so when you right click on it, a system menu will pop
   up. To make the context menu behave correctly on all platforms, you should never use
   a custom context menu on draggable areas."*

That is the **complete** documented caveat list — there is no separate caveats block,
only the inline pointer-events warning plus those two "Tip:" subsections.

Repo precedent already gets (1) right — `SettingsApp.tsx:10-11` defines
`drag`/`noDrag` style objects and applies `noDrag` to the close button and the tab
strip. It does **not** set `user-select: none` on the drag region (gotcha 2). The
detached task header should.

Two corrections to folklore, both from primary sources:

- **Drag is not CSS-inherited.** In Chromium 148's property table `app-region` carries no
  `inherited: true` flag. What the docs describe is *geometric*: the drag **rectangle**
  swallows pointer events over anything it covers, which is why `no-drag` on children is
  mandatory — not because the property cascades.
  <https://chromium.googlesource.com/chromium/src/+/148.0.7778.280/third_party/blink/renderer/core/css/css_properties.json5>
- **Naming: both spellings work.** That same table defines `-webkit-app-region` as
  `alias_for: "app-region"`. The tutorials use the unprefixed form; Electron's own API
  reference (`base-window.md`) still writes the prefixed one. The repo's
  `WebkitAppRegion` is fine — no reason to churn it.

Also relevant, from `docs/breaking-changes.md` (Electron 23, macOS):

> Previously, when a region with `-webkit-app-region: no-drag` overlapped a region with
> `-webkit-app-region: drag`, the `no-drag` region would always take precedence on macOS,
> regardless of CSS layering. … Beginning in Electron 23, a `drag` region on top of a
> `no-drag` region will correctly cause the region to be draggable.

→ layering now behaves like Windows/Linux: **the topmost rect wins**. So a `no-drag`
button must be painted *above* the header's drag rect, which is the natural DOM order
anyway (`SettingsApp.tsx` already does this).
<https://github.com/electron/electron/blob/42-x-y/docs/breaking-changes.md>

### 2e. Frameless caveats worth knowing

From <https://www.electronjs.org/docs/latest/tutorial/custom-window-styles>:

- `frame: false` *"removes all chrome applied by the OS, including window controls."*
- **"Transparent windows are not resizable. Setting `resizable` to `true` may make a
  transparent window stop working on some platforms."** → the detached task window must
  **not** be `transparent: true`. (The island and snap overlay are transparent, but both
  are `resizable: false`.)
- On macOS, *"the native window shadow will not be shown on a transparent window."*
- `roundedCorners` defaults to `true` for frameless windows on darwin
  (`electron.d.ts:3940-3947`).

---

## 3. `setAlwaysOnTop(flag, level, relativeLevel)` on macOS

### 3a. Signature and levels (Electron 42.5.1)

From the typings shipped with the installed version (`electron.d.ts:3150`):

```ts
setAlwaysOnTop(
  flag: boolean,
  level?: 'normal' | 'floating' | 'torn-off-menu' | 'modal-panel'
        | 'main-menu' | 'status' | 'pop-up-menu' | 'screen-saver' | 'dock',
  relativeLevel?: number
): void;
```

The docs add (`docs/api/browser-window.md`, `42-x-y`;
<https://www.electronjs.org/docs/latest/api/browser-window#winsetalwaysontopflag-level-relativelevel>):

> `level` string (optional) *macOS* *Windows* — … The default is `floating` when `flag`
> is true. The `level` is reset to `normal` when the flag is false. …
> `relativeLevel` Integer (optional) *macOS* — The number of layers higher to set this
> window relative to the given `level`. The default is `0`. Note that Apple discourages
> setting levels higher than 1 above `screen-saver`.

`dock` is struck through as deprecated in the docs — and worse, there is **no `dock`
branch in the macOS switch**, so passing `'dock'` silently falls through to
`NSNormalWindowLevel` (0). Don't use it.

### 3b. Level → NSWindow number

`NativeWindowMac::SetAlwaysOnTop` (`native_window_mac.mm:905-931`) is a plain string
switch ending in `SetWindowLevel(level + relative_level)`:

| Electron `level` | NSWindow constant | value |
| --- | --- | --- |
| `normal` | `NSNormalWindowLevel` | 0 |
| `floating` | `NSFloatingWindowLevel` | 3 |
| `torn-off-menu` | `NSTornOffMenuWindowLevel` | 3 |
| `modal-panel` | `NSModalPanelWindowLevel` | 8 |
| `main-menu` | `NSMainMenuWindowLevel` | 24 |
| `status` | `NSStatusWindowLevel` | 25 |
| `pop-up-menu` | `NSPopUpMenuWindowLevel` | 101 |
| `screen-saver` | `NSScreenSaverWindowLevel` | 1000 |
| `dock` | *(unhandled)* → `NSNormalWindowLevel` | 0 |

Numbers come from `CGWindowLevel.h` in the macOS SDK; `NSWindow.h` `#define`s each
`NSWindowLevel` to the matching `kCG*WindowLevel`.
<https://developer.apple.com/documentation/appkit/nswindow/level-swift.struct> ·
<https://developer.apple.com/documentation/coregraphics/cgwindowlevelkey>

`relativeLevel` really is integer addition, clamped to
`[kCGMinimumWindowLevelKey, kCGMaximumWindowLevelKey]` (`SetWindowLevel`,
`native_window_mac.mm:956-961`). It is **not round-trippable**: `getAlwaysOnTopLevel()`
compares against the exact constants, so any non-zero offset reports back as `'normal'`
(`native_window_mac.mm:933-953`). `isAlwaysOnTop()` only tells you "not normal level" —
it cannot distinguish levels.

### 3c. Ordering is strictly by level

Apple, `NSWindow.Level`:

> "The stacking of levels takes precedence over the stacking of windows within each
> level. That is, even the bottom window in a level will obscure the top window of the
> next level down."

<https://developer.apple.com/documentation/appkit/nswindow/level-swift.struct>

So focus can never lift a lower-level window above a higher-level one. **Within** a
level, ordering is ordinary focus order — which is the trap below.

### 3d. Interaction with this app's island

`applyIslandWindowLevel()` (`electron/windows.ts:230-259`) puts the island at:

| island state | call | level |
| --- | --- | --- |
| snapped | `setAlwaysOnTop(true, 'screen-saver')` | 1000 |
| dragging | `setAlwaysOnTop(true, 'screen-saver', 1)` | 1001 |
| floating + `alwaysTop` | `setAlwaysOnTop(true, 'floating')` | 3 |
| floating + `!alwaysTop` | `setAlwaysOnTop(false)` | 0 |

Consequences for a pinned task window:

- **`'floating'` is the wrong choice for a guarantee.** At level 3 it *ties* the island's
  floating-with-`alwaysTop` state. Same level ⇒ ordering by focus ⇒ clicking the task
  window can put it over the island. It would still be below the snapped island (1000),
  which is the common case, but the tie is real and it is the state the user is in
  whenever they've dragged the island off the notch.
- **`setAlwaysOnTop(true, 'normal', 1)` gives a strict guarantee.** Level 0 + 1 = **1**:
  above every ordinary application window (level 0), below `floating` (3) and therefore
  below the island in every one of its states. `SetWindowLevel` sets
  `z_order = kFloatingWindow` for any level ≠ 0, so `isAlwaysOnTop()` still reports
  `true`. This is the recommendation.
  - Cost: `getAlwaysOnTopLevel()` will read back `'normal'` (§3b). Drive the pin state
    from the persisted `tasksAlwaysOnTop` pref, never from the getter.
  - **[UNCONFIRMED]** I found no Apple documentation blessing or forbidding level 1
    specifically; it is simply an unreserved value between `normal` and `floating`. It is
    consistent with Electron's own `relativeLevel` contract.
- **Unpinned** = `setAlwaysOnTop(false)` → level 0, ordinary window. Fine.
- **Do not** reach for `'status'` (25) or above: those clear the menu bar and would put a
  task list over system UI, contradicting ADR-0006's rationale (which reserves the
  aggressive level for a "thin, transparent utility widget").

Two caveats found in Electron's own tracker that matter if ticket 10 ever makes the task
window a **child** of the island (`parent:`):

- Attaching a window as a child **resets its window level**. Electron restores the
  *parent's* level after `addChildWindow:` but not the child's —
  `electron/electron#44150` is open, PR `#44155` unmerged, and `Show()`/`ShowInactive()`
  /`Hide()` all re-run `InternalSetParentWindow`, so a child can lose its level on every
  show. <https://github.com/electron/electron/issues/44150>
- Historical precedent: `electron/electron#29813`.
  <https://github.com/electron/electron/pull/29813>

→ **Make the task window a top-level sibling, not a child.** (This also matches the
Settings/snap-overlay precedent — neither sets `parent`.)

### 3e. Fullscreen / Spaces

Level alone does **not** float a window over another app's fullscreen Space; that needs
`NSWindowCollectionBehaviorFullScreenAuxiliary`, which Electron sets via
`setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`
(`native_window_mac.mm`, `SetVisibleOnAllWorkspaces`). Note the documented side effect in
that code path: without `skipTransformProcessType: true` it calls `app.dock.hide()`,
removing the app from the Dock and Cmd-Tab (`electron/electron#26350`, open). The island
already accepts this; **the task window probably should not call
`setVisibleOnAllWorkspaces` at all** — it is a focusable document-ish window, not a
notch widget.

<https://www.electronjs.org/docs/latest/api/browser-window#winsetvisibleonallworkspacesvisible-options-macos-linux> ·
<https://github.com/electron/electron/issues/26350>

---

## 4. Geometry persistence

### 4a. The standard pattern

There is no first-party Electron API for this. The de-facto pattern (as implemented by
`electron-window-state`, <https://github.com/mawie81/electron-window-state/blob/master/index.js>)
is:

1. On create: read saved `{x, y, width, height}`; **validate**; pass as constructor
   options (falling back to defaults).
2. Subscribe to `'resize'` / `'move'` (or `'resized'` / `'moved'`) and `'close'`, and
   write `win.getNormalBounds()` back, debounced.
3. Validate on restore with `screen.getAllDisplays()` — `windowWithinBounds()` plus
   `ensureWindowVisibleOnSomeDisplay()`, resetting to defaults when the saved rect
   intersects no display.

Electron primitives that matter:

- `win.getNormalBounds()` — *"Whatever the current state of the window : maximized,
  minimized or in fullscreen, this function always returns the position and size of the
  window in normal state."* (`electron.d.ts:2821-2829`). **Use this, not `getBounds()`**,
  or you persist a maximized rect.
- Events (`electron.d.ts`): `'resize'` fires continuously; `'resized'` fires *once* after
  a manual resize (darwin, win32). `'move'` fires continuously; **on macOS `'moved'` is
  documented as *an alias of* `'move'`** — so it is *not* a "once" event on darwin and
  you must debounce.
- `'will-resize'` is available but coarse on macOS: its `details.edge` is only ever
  `'bottom'` (vertical) or `'right'` (horizontal) on darwin, vs the eight compass values
  on Windows (`electron.d.ts:2640-2652`). Fine for vetoing a resize; useless for knowing
  *which* corner is being dragged.
- `screen` events: `display-added`, `display-removed`, `display-metrics-changed`
  (`changedMetrics` ∈ `bounds`, `workArea`, `scaleFactor`, `rotation`).
  <https://www.electronjs.org/docs/latest/api/screen>
- `setBounds` macOS note (`electron.d.ts:3241-3245`): *"On macOS, the y-coordinate value
  cannot be smaller than the Tray height … between 20-40px. Passing a value lower than
  the tray height will result in a window that is flush to the tray."* This is the same
  clamp `applyIslandWindowLevel()` fights; for the task window just never restore above
  `workArea.y`.

### 4b. Code-shaped guidance for this repo's store

`electron/store.ts` is a flat JSON blob merged over `DEFAULT_PREFS` in `load()`, with
best-effort `persist()`. Adding bounds is cheap — one field on `Prefs`, one default —
exactly as `map.md` notes ("Adding a plain pref is cheap"). Because `load()` does
`{ ...DEFAULT_PREFS, ...parsed }`, a **missing** key is free; only a *shape change*
would need a migration helper, so pick the shape now.

```ts
// src/shared/types.ts
export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

// on Prefs (flat, matching everything except shortcuts/islandPlacement):
//   /** Persisted geometry of the detached task window; null until first detach. */
//   tasksWindowBounds: WindowBounds | null
// DEFAULT_PREFS: tasksWindowBounds: null
```

Sanitise on restore, in `electron/windows.ts` (not in the store — the store must not
import `screen`, and `screen` is unusable before `app` is ready):

```ts
const TASKS_MIN = { width: 300, height: 320 }
const TASKS_DEFAULT = { width: 340, height: 460 }

/** Saved rects can outlive the display that produced them. Clamp, or discard. */
function sanitizeTaskBounds(saved: WindowBounds | null): Rectangle {
  const displays = screen.getAllDisplays()

  // (a) Nothing saved, or garbage in prefs.json (hand-edited / partial write).
  const ok =
    saved != null &&
    [saved.x, saved.y, saved.width, saved.height].every(Number.isFinite) &&
    saved.width > 0 &&
    saved.height > 0
  if (!ok) return centered(screen.getPrimaryDisplay(), TASKS_DEFAULT)

  // (b) Pick the display the saved rect actually overlaps. Rejects the
  //     "restored offscreen after a display change" case: if the rect
  //     intersects nothing, the monitor it lived on is gone.
  const host = displays.find((d) => intersects(d.workArea, saved))
  if (!host) return centered(screen.getPrimaryDisplay(), TASKS_DEFAULT)

  // (c) Restored larger than the current display (e.g. saved on a 6K, reopened
  //     on a laptop). Shrink to fit the work area, never below the minimums.
  const width = clamp(saved.width, TASKS_MIN.width, host.workArea.width)
  const height = clamp(saved.height, TASKS_MIN.height, host.workArea.height)

  // (d) Then re-clamp the origin so the (possibly shrunk) rect is fully on
  //     screen. Doing this AFTER the size clamp is what keeps the title bar
  //     reachable; doing it before can push the bottom-right off again.
  //     workArea (not bounds) keeps it clear of the menu bar and Dock, and
  //     sidesteps the macOS setBounds y-clamp noted above.
  const x = clamp(saved.x, host.workArea.x, host.workArea.x + host.workArea.width - width)
  const y = clamp(saved.y, host.workArea.y, host.workArea.y + host.workArea.height - height)

  return { x, y, width, height }
}
```

Guard notes, tied to the three failure modes the ticket names:

1. **Offscreen after a display change** → step (b). Use *intersection with some display*,
   not containment; a window straddling two monitors is legal and must survive. Also
   re-run `sanitizeTaskBounds` + `setBounds` from `screen.on('display-removed')` and
   `screen.on('display-metrics-changed')` while the window is open, otherwise an
   unplugged monitor strands it until next launch.
2. **Restored larger than the display** → step (c), *before* the origin clamp. Clamp
   against `workArea`, not `bounds`.
3. **`minWidth`/`minHeight` conflict** → step (c)'s `clamp(…, TASKS_MIN.x, …)` must use
   the *same* constants passed as `minWidth`/`minHeight` to the constructor, or the two
   fight: Electron/AppKit will enforce the minimum and silently produce a window bigger
   than the rect you asked for, whose origin you then computed against the wrong size.
   Define `TASKS_MIN` once and use it in both places. Degenerate case worth an explicit
   decision: a display whose `workArea` is *smaller* than the minimum — `clamp()` with
   `min > max` returns garbage, so either `Math.max(TASKS_MIN.width, Math.min(...))`
   ordering (minimum wins, window overflows) or bail to defaults.

Saving:

```ts
// macOS: 'moved' is an alias of 'move', so both fire continuously — debounce.
let saveTimer: NodeJS.Timeout | null = null
const queueSave = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!tasksWin || tasksWin.isDestroyed()) return
    const b = tasksWin.getNormalBounds()
    setPrefs({ tasksWindowBounds: { x: b.x, y: b.y, width: b.width, height: b.height } })
  }, 400)
}
tasksWin.on('resize', queueSave)
tasksWin.on('move', queueSave)
tasksWin.on('close', () => { /* flush synchronously here, not via the timer */ })
```

`setPrefs` writes the whole `prefs.json` synchronously and notifies every listener
(`store.ts:189-195`), so an undebounced `'resize'` handler would do a full file write per
frame of a drag. The 400 ms debounce is load-bearing, and the `'close'` flush is what
makes the last position stick.

---

## 5. Minimum-viable BrowserWindow config

Matching the Settings precedent (`electron/windows.ts:441-457`) — singleton ref,
`frame: false`, `show: false` + `ready-to-show`, opaque `backgroundColor`, the shared
`PRELOAD` and hardened `webPreferences` — but small, pinnable and geometry-restoring.

```ts
const TASKS_MIN = { width: 300, height: 320 }

export function createTasksWindow(): BrowserWindow {
  if (tasksWin) {
    tasksWin.show()
    tasksWin.focus()
    return tasksWin
  }

  const bounds = sanitizeTaskBounds(getPrefs().tasksWindowBounds)

  tasksWin = new BrowserWindow({
    ...bounds,                    // x/y/width/height, already validated
    minWidth: TASKS_MIN.width,    // same constants sanitizeTaskBounds clamps to
    minHeight: TASKS_MIN.height,
    frame: false,                 // custom header — Settings precedent
    resizable: true,              // ⇒ NSWindowStyleMaskResizable ⇒ AppKit edge/corner resize
    transparent: false,           // REQUIRED: "Transparent windows are not resizable"
    backgroundColor: '#191b1f',   // opaque, no white flash — Settings precedent
    show: false,                  // paired with 'ready-to-show'
    title: 'Tasks',
    maximizable: false,           // a task list has no useful zoomed state
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  loadRoute(tasksWin, 'tasks.html')
  tasksWin.once('ready-to-show', () => tasksWin?.show())
  applyTasksWindowLevel()               // see below
  tasksWin.on('resize', queueSave)
  tasksWin.on('move', queueSave)
  tasksWin.on('closed', () => { tasksWin = null })
  return tasksWin
}

/** Pin = always-on-top, and nothing else (map.md vocabulary). */
function applyTasksWindowLevel(): void {
  if (!tasksWin) return
  if (getPrefs().tasksAlwaysOnTop) {
    // Level 0 + 1 = 1: above ordinary app windows, strictly below the island's
    // 'floating' (3) and 'screen-saver' (1000) states. See §3d.
    tasksWin.setAlwaysOnTop(true, 'normal', 1)
  } else {
    tasksWin.setAlwaysOnTop(false)
  }
}
```

Deliberately **omitted**, with reasons:

| Option | Why not |
| --- | --- |
| `transparent: true` | docs: transparent windows are not resizable |
| `type: 'panel'` | island-only; the task window *should* take focus (text entry) |
| `parent: islandWin` | child attach resets window level on every show (#44150) |
| `setVisibleOnAllWorkspaces` | would trigger `app.dock.hide()` (#26350); not wanted here |
| `enableLargerThanScreen` | island-only hack for reaching y=0 over the menu bar |
| `hasShadow: false` | frameless macOS windows keep their shadow when opaque; keep it |
| `maxWidth` | Settings caps at 1100; a task list has no obvious cap — leave unbounded |
| `titleBarStyle: 'hidden'` | would keep the traffic lights; the design wants a custom header |

Renderer side (ticket 10's problem, listed for completeness):

- New Vite input `tasks: resolve(__dirname, 'tasks.html')` in
  `electron.vite.config.ts:34-38` alongside `island`/`settings`/`snap-overlay`.
- Header: `WebkitAppRegion: 'drag'` + `userSelect: 'none'`, **inset ~6px from the window
  edges**; `WebkitAppRegion: 'no-drag'` on pop-in / pin / ✕; no custom context menu on
  the drag region.
- Bottom-right grip: hand-drawn SVG/CSS, `pointer-events: none`, no handlers, and no
  drag region anywhere near it.
- Keep ~8px of non-drag padding around all four edges so AppKit's resize band is clear.

---

## What I could **not** confirm

1. **The pixel width of macOS's resize hit region on a non-MAS build.** It comes from
   AppKit's private `-[NSWindow _resizeDirectionForMouseLocation:]`; Apple publishes
   nothing. (The 5pt/16pt numbers are Electron's own — Windows/Linux `FramelessView`, and
   Electron's MAS-only approximation. We are not MAS.) Assume ~8px of clearance.
2. **Apple guidance on window level 1 specifically.** It is an unreserved value between
   `normal` (0) and `floating` (3), and Electron's `relativeLevel` contract is plain
   integer addition — but no Apple doc blesses it by name. Worth a smoke test that a
   pinned task window really does stay under a floating island and over Safari.
3. **The Electron docs' Dock claim.** The docs say `floating`…`status` sit *below* the
   Dock, but `kCGDockWindowLevel` is 20 while `status` is 25. What level the modern macOS
   Dock actually runs at is unverified. Irrelevant at level 1, noted for completeness.
4. **Electron docs say nothing at all about `frame: false` + `resizable: true` on
   macOS.** Every documented resize statement is Windows-, Linux- or
   transparency-specific. Everything in §1–§2 about macOS is read out of Electron's C++
   and its Chromium patches, not out of the docs.

*Resolved during research* (previously open): whether a drag region shadows edge resize
on macOS (**it does not** — §2c); whether unprefixed `app-region` works (**yes, the
prefixed form is a Chromium alias** — §2d).

## Sources

- Electron tutorial — Custom Window Styles: <https://www.electronjs.org/docs/latest/tutorial/custom-window-styles>
- Electron tutorial — Custom Window Interactions: <https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions>
- Electron API — BrowserWindow: <https://www.electronjs.org/docs/latest/api/browser-window>
- Electron API — screen: <https://www.electronjs.org/docs/latest/api/screen>
- Electron breaking changes (Electron 23 macOS drag-region layering): <https://github.com/electron/electron/blob/42-x-y/docs/breaking-changes.md>
- Electron `42-x-y` source: `shell/browser/native_window.cc`, `shell/browser/native_window_mac.mm`,
  `shell/browser/ui/views/frameless_view.{h,cc}`, `filenames.gni`, `BUILD.gn`, `DEPS`,
  `patches/chromium/mas_avoid_private_macos_api_usage.patch.patch`
  — <https://github.com/electron/electron/tree/42-x-y>
- Chromium 148.0.7778.280 CSS property table (`app-region`, `-webkit-app-region` alias):
  <https://chromium.googlesource.com/chromium/src/+/148.0.7778.280/third_party/blink/renderer/core/css/css_properties.json5>
- Installed typings: `node_modules/electron/electron.d.ts` (electron 42.5.1)
- Apple — `NSWindow.Level`: <https://developer.apple.com/documentation/appkit/nswindow/level-swift.struct>
- Apple — `showsResizeIndicator`: <https://developer.apple.com/documentation/appkit/nswindow/showsresizeindicator>
  (and the local SDK `AppKit.framework/Headers/NSWindow.h:1034`)
- Apple — `CGWindowLevelKey`: <https://developer.apple.com/documentation/coregraphics/cgwindowlevelkey>
- electron/electron#3022 (drag region vs resize handle, wontfix): <https://github.com/electron/electron/issues/3022>
- electron/electron#49770 + #50520 + PR #49780 (MAS frameless resize vs drag): <https://github.com/electron/electron/issues/49770>
- electron/electron#44150 + #44155 (child window level reset): <https://github.com/electron/electron/issues/44150>
- electron/electron#29813 (child window level reset, historical): <https://github.com/electron/electron/pull/29813>
- electron/electron#26350 (`visibleOnFullScreen` hides the Dock icon): <https://github.com/electron/electron/issues/26350>
- `electron-window-state` reference implementation: <https://github.com/mawie81/electron-window-state/blob/master/index.js>
- Repo: `electron/windows.ts` (`createIslandWindow` 91, `applyIslandWindowLevel` 230,
  `createSnapOverlayWindow` 352, `createSettingsWindow` 435), `electron/store.ts`,
  `src/settings/SettingsApp.tsx`, `docs/adr/0006-island-floats-above-menu-bar.md`

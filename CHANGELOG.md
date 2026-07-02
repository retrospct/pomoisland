# Changelog

All notable changes to PomoIsland will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0](https://github.com/retrospct/pomoisland/compare/v0.3.0...v0.4.0) (2026-07-02)


### Features

* **anim:** MO-21 animation timing pass — Variant B Steady + prefers-reduced-motion ([#14](https://github.com/retrospct/pomoisland/issues/14)) ([96b269d](https://github.com/retrospct/pomoisland/commit/96b269dd4fb5f8a76a1458d60d091213bbc59d52))
* **island:** Fix 3–8 — real-notch dock, floating cards, dock icon, ring/below, TaskList polish ([#17](https://github.com/retrospct/pomoisland/issues/17)) ([6921c93](https://github.com/retrospct/pomoisland/commit/6921c9378fc72dbdc2e99bc54a21ddd5a90ef62c))
* **island:** notch-native progress styles (Timer style A–H) ([#16](https://github.com/retrospct/pomoisland/issues/16)) ([f9a6b33](https://github.com/retrospct/pomoisland/commit/f9a6b3396e7acc38976fc2457d1518a87bd51c2c))
* **island:** theme the island — light/dark/system mode + live OS update ([786f95b](https://github.com/retrospct/pomoisland/commit/786f95b39460250a27156bab1453d3fa10404159))
* **island:** user-configurable notch element placement (MO-22) ([#12](https://github.com/retrospct/pomoisland/issues/12)) ([1494b59](https://github.com/retrospct/pomoisland/commit/1494b59b5527a1541bb54e60f4fdab66b2d73571))
* rebindable global shortcuts, real OS integrations, and hover-region fix ([#35](https://github.com/retrospct/pomoisland/issues/35)) ([b602df2](https://github.com/retrospct/pomoisland/commit/b602df239fa1ec1243657c97284685045aef0bdb))
* **sound:** normalize alarm voices — length, loudness, envelope spec (MO-32) ([#11](https://github.com/retrospct/pomoisland/issues/11)) ([5c7962b](https://github.com/retrospct/pomoisland/commit/5c7962b6f0ecbd2e65482f9dfcc65be1c8184970))
* **sound:** synth engine with safety limiter, 9 voices + Aurora sample ([384d665](https://github.com/retrospct/pomoisland/commit/384d6650b2a2a8089c77d8e8ca23eacf709055b0))
* **sound:** ticking sound setting with transition ticks ([c9c0008](https://github.com/retrospct/pomoisland/commit/c9c0008ce732e35723d20e45d3903ce40649b75f))
* **tasks:** task list panel + completed-today tracking (MO-6 + MO-7) ([#3](https://github.com/retrospct/pomoisland/issues/3)) ([0aa685a](https://github.com/retrospct/pomoisland/commit/0aa685a5782e1e498de8a94bb2502669e93cd114))
* **theme:** Settings preview + island follow light/dark/system (MO-13 + MO-12) ([2e230a2](https://github.com/retrospct/pomoisland/commit/2e230a227895b0e6f963affb281d04dffbbd2dd8))
* **update:** auto-updater + Check for Updates in three-dots, app menu, and tray ([#21](https://github.com/retrospct/pomoisland/issues/21)) ([80bb8f1](https://github.com/retrospct/pomoisland/commit/80bb8f1342f7ac64cd8fc7bd85fc6c9d4f995ae5))


### Bug Fixes

* capitalize display name as "PomoIsland" ([#25](https://github.com/retrospct/pomoisland/issues/25)) ([87600a1](https://github.com/retrospct/pomoisland/commit/87600a10fa97142ed4f1c2156c0cd1bf841359a3))
* check out publish job by commit SHA, bump pinned action versions ([#28](https://github.com/retrospct/pomoisland/issues/28)) ([923e001](https://github.com/retrospct/pomoisland/commit/923e001651fa6d2c77319c4324fcf3a379c4ddb8))
* **island:** light/dark theme polish — accent, menu, moon (MO-29, MO-31, MO-33) ([#6](https://github.com/retrospct/pomoisland/issues/6)) ([5b94b7e](https://github.com/retrospct/pomoisland/commit/5b94b7e943579ce7bcc37c50b58f76822bf34bcd))
* **island:** MO-14–20 polish — menu, radius, buttons, italic, padding, exit anim ([#4](https://github.com/retrospct/pomoisland/issues/4)) ([36e5a80](https://github.com/retrospct/pomoisland/commit/36e5a80b7ff1aa6c1b72d5fd44f5c4e46e89a2e8))
* **island:** render notch dot at 8px in peek and expanded ([ef1609f](https://github.com/retrospct/pomoisland/commit/ef1609f41064349e07d80dcc776f79fd83abec25))
* **island:** unclip completion FX ripple rings by growing window during animation (MO-30) ([#9](https://github.com/retrospct/pomoisland/issues/9)) ([f4f6b3c](https://github.com/retrospct/pomoisland/commit/f4f6b3ccdba40ea47d969a4a11212ccdb826a579))
* match electron-builder releaseType to the now-published release ([#32](https://github.com/retrospct/pomoisland/issues/32)) ([7c0ee57](https://github.com/retrospct/pomoisland/commit/7c0ee57f90732eef52765568e971751baf511ecb))
* move shortcut unbind to a corner badge, add per-row reset ([#37](https://github.com/retrospct/pomoisland/issues/37)) ([6aa2ed3](https://github.com/retrospct/pomoisland/commit/6aa2ed35cc019497dd7ceb095e23386f184d56eb))
* pin packageManager so pnpm/action-setup@v6 can resolve a version ([#30](https://github.com/retrospct/pomoisland/issues/30)) ([ff53fe8](https://github.com/retrospct/pomoisland/commit/ff53fe8cc172832d34e6a631b94fea43306e2c03))
* **settings:** alarm-animation preview follows theme via --sp-* tokens ([85893e5](https://github.com/retrospct/pomoisland/commit/85893e586f026442f526529bc688aaa53e48a97f))
* **snap:** re-apply y=0 after raising window level to 'status' ([#15](https://github.com/retrospct/pomoisland/issues/15)) ([0825994](https://github.com/retrospct/pomoisland/commit/08259940193cc38efd8592ca32e7b31a03342a5d))
* **sound:** drop unreliable transition-tick mode; document cadence bug ([f56b0d5](https://github.com/retrospct/pomoisland/commit/f56b0d5149046ca1c75307fd06472d7e32199469))
* **sound:** stop active alarm voice before auditioning the next (MO-34) ([#10](https://github.com/retrospct/pomoisland/issues/10)) ([877d035](https://github.com/retrospct/pomoisland/commit/877d0355556ffd4dd55cdd96b1e493ba37947865))
* **timer:** move per-second tick cadence to main process (MO-25) ([#8](https://github.com/retrospct/pomoisland/issues/8)) ([40b5c41](https://github.com/retrospct/pomoisland/commit/40b5c415843ec92caf877c780c7ad907473a5765))

## [0.3.0](https://github.com/retrospct/pomoisland/compare/v0.2.4...v0.3.0) (2026-07-01)


### Features

* rebindable global shortcuts, real OS integrations, and hover-region fix ([#35](https://github.com/retrospct/pomoisland/issues/35)) ([b602df2](https://github.com/retrospct/pomoisland/commit/b602df239fa1ec1243657c97284685045aef0bdb))


### Bug Fixes

* move shortcut unbind to a corner badge, add per-row reset ([#37](https://github.com/retrospct/pomoisland/issues/37)) ([6aa2ed3](https://github.com/retrospct/pomoisland/commit/6aa2ed35cc019497dd7ceb095e23386f184d56eb))

## [0.2.4](https://github.com/retrospct/pomoisland/compare/v0.2.3...v0.2.4) (2026-07-01)


### Bug Fixes

* match electron-builder releaseType to the now-published release ([#32](https://github.com/retrospct/pomoisland/issues/32)) ([7c0ee57](https://github.com/retrospct/pomoisland/commit/7c0ee57f90732eef52765568e971751baf511ecb))

## [0.2.3](https://github.com/retrospct/pomoisland/compare/v0.2.2...v0.2.3) (2026-07-01)


### Bug Fixes

* pin packageManager so pnpm/action-setup@v6 can resolve a version ([#30](https://github.com/retrospct/pomoisland/issues/30)) ([ff53fe8](https://github.com/retrospct/pomoisland/commit/ff53fe8cc172832d34e6a631b94fea43306e2c03))

## [0.2.2](https://github.com/retrospct/pomoisland/compare/v0.2.1...v0.2.2) (2026-07-01)


### Bug Fixes

* check out publish job by commit SHA, bump pinned action versions ([#28](https://github.com/retrospct/pomoisland/issues/28)) ([923e001](https://github.com/retrospct/pomoisland/commit/923e001651fa6d2c77319c4324fcf3a379c4ddb8))

## [0.2.1](https://github.com/retrospct/pomoisland/compare/v0.2.0...v0.2.1) (2026-07-01)


### Bug Fixes

* capitalize display name as "PomoIsland" ([#25](https://github.com/retrospct/pomoisland/issues/25)) ([87600a1](https://github.com/retrospct/pomoisland/commit/87600a10fa97142ed4f1c2156c0cd1bf841359a3))

## [Unreleased]

## [0.2.0] - 2026-07-01
### Added
- Auto-updater with "Check for Updates" in the three-dots menu, app menu, and tray (#21).
- Notch-aware docking: real-notch wrap, faux-notch dock, and related polish (#18).
- Real-notch dock, floating cards, dock icon, ring/below states, and TaskList polish (#17).

## [0.1.0] - 2026-06-30
### Added
- Initial release.

[Unreleased]: https://github.com/retrospct/pomoisland/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/retrospct/pomoisland/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/retrospct/pomoisland/releases/tag/v0.1.0

# Changelog

All notable changes to PomoIsland will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1](https://github.com/retrospct/pomoisland/compare/v0.4.0...v0.4.1) (2026-08-17)


### Bug Fixes

* publish releases only once their artifacts are in place ([a1abb75](https://github.com/retrospct/pomoisland/commit/a1abb758412c2c0da412273f9507263222eb43c8))
* create the release tag eagerly, and verify the published feed ([4d57607](https://github.com/retrospct/pomoisland/commit/4d57607a31c7d29f1211852f1069860192b41d99))
* **deps:** pull js-yaml 4.3.1 into the shipped updater ([7951842](https://github.com/retrospct/pomoisland/commit/79518427b808c2f248dd1173435de3d6c9f6019f))

## [0.4.0](https://github.com/retrospct/pomoisland/compare/v0.3.1...v0.4.0) (2026-08-17)


### ⚠ BREAKING CHANGES

* Skipping a focus block no longer counts as a session. Pressing Next used to credit the block to your active task and to your daily total. It no longer does, because a session is one focus block and a block you cut short is not one: four taps of the global shortcut could finish a four-session task and earn a milestone ring for work nobody did.
* Skipping a focus block no longer counts as a session. Pressing Next used to credit the block to your active task and to your daily total. It no longer does, because a session is one focus block and a block you cut short is not one: four taps of the global shortcut could finish a four-session task and earn a milestone ring for work nobody did.

### Features

* + and ✓ resume controls at a task's estimate ([#19](https://github.com/retrospct/pomoisland/issues/19)) ([c64eeda](https://github.com/retrospct/pomoisland/commit/c64eeda369c33b6e4f8933f0af4f5cf2c4951004))
* active-task lifecycle — done-path advance and click-to-deselect ([#15](https://github.com/retrospct/pomoisland/issues/15)) ([df990c3](https://github.com/retrospct/pomoisland/commit/df990c356a69ba62798c17b585d514dba6d4b493))
* always-on-top toggle and bring-to-front when time ends ([#47](https://github.com/retrospct/pomoisland/issues/47)) ([2aabf28](https://github.com/retrospct/pomoisland/commit/2aabf280f8de6f00cacf7142e88f9af2de406810))
* detached task window geometry, resize grip and pin ([#24](https://github.com/retrospct/pomoisland/issues/24)) ([6b3d9ac](https://github.com/retrospct/pomoisland/commit/6b3d9acb2a5749254fbbb7313960736eebc3f6b0))
* drag a task to reorder it ([#22](https://github.com/retrospct/pomoisland/issues/22)) ([542b1fe](https://github.com/retrospct/pomoisland/commit/542b1fe5ab36565d8d05b7c365c440cf43759202))
* header controls get working tooltips, and Pop in leaves the menu ([4db6f94](https://github.com/retrospct/pomoisland/commit/4db6f94e21c37db560d8802ce47958d3faa5c687))
* pop the task list out into its own window ([#23](https://github.com/retrospct/pomoisland/issues/23)) ([fffd443](https://github.com/retrospct/pomoisland/commit/fffd44395c540f8c7fa8f2817b761495ac81d45e))
* segmented task progress bar in Peek and Expanded ([#17](https://github.com/retrospct/pomoisland/issues/17)) ([9fd38b6](https://github.com/retrospct/pomoisland/commit/9fd38b6470955dae41e4c58e21147bc782d9d084))
* setting to stop the island collapsing itself ([ab8a716](https://github.com/retrospct/pomoisland/commit/ab8a7160acc30d39d57b1f9de73a2882e4cda4a9))
* setting to stop the island collapsing itself ([0401f7c](https://github.com/retrospct/pomoisland/commit/0401f7c30a5c1dd8954ec8dfdf8f74ccec0f1359))
* skipped sessions credit nothing by default ([#16](https://github.com/retrospct/pomoisland/issues/16)) ([885422b](https://github.com/retrospct/pomoisland/commit/885422bc680d44e16a9be97b9dbc13ec6f16021a))
* stop the timer at a task's estimate ([#18](https://github.com/retrospct/pomoisland/issues/18)) ([a072f0c](https://github.com/retrospct/pomoisland/commit/a072f0c70e0e7f9e75c9503888e7c2b8dd48a83c))
* task estimates drive the timer, with a progress bar and a detached list ([#48](https://github.com/retrospct/pomoisland/issues/48)) ([caa200a](https://github.com/retrospct/pomoisland/commit/caa200a0233707cab80de2ce4c55c3a4fec17bd3))
* task rows stop reflowing on hover, and long titles get a popover ([#20](https://github.com/retrospct/pomoisland/issues/20), [#21](https://github.com/retrospct/pomoisland/issues/21)) ([554fe1b](https://github.com/retrospct/pomoisland/commit/554fe1b666c74f9ca01bbe4a26a60825c1904ebb))


### Bug Fixes

* review findings across wave 3, and reclaim the task title's width ([ae97e69](https://github.com/retrospct/pomoisland/commit/ae97e69a7466a29d50ed5ad5fc3b07b476e4fb71))


### Documentation

* flag the skipped-session default as a behaviour change ([fba058e](https://github.com/retrospct/pomoisland/commit/fba058ea3c5a5625fdc525f6d091b7c2a03cf5c1))

## [0.3.1](https://github.com/retrospct/pomoisland/compare/v0.3.0...v0.3.1) (2026-07-18)


### Bug Fixes

* island UX — popover menu, tasks panel, light mode, session-count hover ([#39](https://github.com/retrospct/pomoisland/issues/39)) ([f664751](https://github.com/retrospct/pomoisland/commit/f664751d9bc6f4723637311424dd0ff594d8f5f1))

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

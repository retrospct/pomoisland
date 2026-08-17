// electron-builder config — see https://www.electron.build/configuration
//
// `pnpm run package`  → quick unsigned `.app` for local smoke-testing (--dir).
// `pnpm run dist:mac` → signed + notarized `.dmg` + `.zip` for distribution
//                       (requires an Apple Developer ID cert + notarization
//                       credentials in the environment — see README "Packaging").
//
// Only production `dependencies` are ever bundled by electron-builder, and this
// app has none — all runtime code is compiled into `out/` by electron-vite — so
// dev-only tools like `node-web-audio-api` cannot ship.
//
// This is a JS config (not YAML) specifically so `.env` gets loaded here, before
// electron-builder reads `process.env.APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/
// `APPLE_TEAM_ID` (and `GH_TOKEN` for --publish). electron-builder never loads
// `.env` on its own — config files are read before packaging starts, so this
// runs regardless of how `electron-builder` gets invoked (npm script, IDE,
// CI, or directly), instead of only working through a wrapper script.
require('dotenv').config()

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'dev.retro.pomoisland',
  productName: 'PomoIsland',
  copyright: '© 2026 PomoIsland',

  directories: {
    output: 'release',
    buildResources: 'build',
  },

  // Ship only the compiled output (+ manifest). Source, node_modules, and dev
  // tooling are excluded by omission.
  files: ['out/**', 'package.json'],

  asar: true,

  // Menu-bar tray icons (Variant D exports at 16/22/32 pt).
  extraResources: [
    {
      from: 'build/tray',
      to: 'tray',
      filter: ['**/*'],
    },
  ],

  // Trim non-English Electron locale bundles to keep the app small.
  electronLanguages: ['en'],

  mac: {
    category: 'public.app-category.productivity',
    // Background/menu-bar utility: no Dock icon, no app menu (mirrors the
    // runtime app.dock.hide() and the tray-driven lifecycle).
    extendInfo: {
      LSUIElement: true,
    },
    target: [{ target: 'dmg' }, { target: 'zip' }],
    // Code signing: electron-builder auto-discovers a "Developer ID Application"
    // certificate from the keychain (or CSC_LINK/CSC_KEY_PASSWORD). With no cert
    // present it logs "skipped macOS application code signing" and still produces
    // a launchable (unsigned) build — which is what `pnpm run package` relies on.
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    // Notarize on distribution builds. Requires either:
    //   APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID, or
    //   APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER.
    // Skipped automatically when the app isn't signed (e.g. local --dir builds).
    notarize: true,
  },

  dmg: {
    title: '${productName} ${version}',
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },

  // Auto-update feed + upload target. electron-builder generates `app-update.yml` into
  // the packaged app's resources from this block (electron-updater reads it at runtime),
  // and `--publish` uploads the dmg/zip/latest-mac.yml + blockmaps here. Requires GH_TOKEN
  // (a repo-scoped PAT) in the environment when publishing.
  //
  // release-please owns creating the GitHub Release (as a draft — see
  // release-please-config.json), and the CI publish job un-drafts it as its very
  // *last* step, after this has run (see .github/workflows/release-please.yml).
  // So the release this uploads into is normally still a draft.
  //
  // `releaseType` stays 'release' regardless, and that is not a contradiction:
  // electron-builder's getOrCreateRelease returns a draft release immediately,
  // before releaseType is consulted at all. The setting only decides what to
  // create when no release exists, and whether to refuse an *already published*
  // one — 'draft' refuses it, which is exactly how v0.2.3 shipped with zero
  // assets (7c0ee57). 'release' is therefore the safe value in both orderings.
  //
  // Worth knowing when debugging: if this cannot resolve a release it logs
  // "skipped publishing" as a warning and still exits 0, so a green build proves
  // nothing. CI asserts the uploaded assets separately for that reason.
  publish: {
    provider: 'github',
    owner: 'retrospct',
    repo: 'pomoisland',
    releaseType: 'release',
  },
}

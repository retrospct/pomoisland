// Finalizes CHANGELOG.md's "[Unreleased]" section into a dated version
// section matching package.json's current version. Runs automatically as
// the "prerelease:mac" hook before `release:mac`, so release notes never
// go stale relative to the version being published.
//
// - If a "## [<version>]" section already exists, this is a no-op (lets
//   you re-run release:mac after a failed publish without duplicating).
// - If "[Unreleased]" has no content, warns but does not block the release.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoSlug = 'retrospct/pomoisland'

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = pkg.version
const changelogPath = resolve(root, 'CHANGELOG.md')
const changelog = readFileSync(changelogPath, 'utf8')

if (changelog.includes(`## [${version}]`)) {
  console.log(`CHANGELOG.md already has an entry for ${version}; skipping.`)
  process.exit(0)
}

const unreleasedHeading = '## [Unreleased]'
const headingIndex = changelog.indexOf(unreleasedHeading)
if (headingIndex === -1) {
  console.error('CHANGELOG.md is missing an "## [Unreleased]" section. Add one and re-run.')
  process.exit(1)
}

const afterHeading = headingIndex + unreleasedHeading.length
const nextHeadingMatch = changelog.slice(afterHeading).match(/\n## \[/)
const sectionEnd = nextHeadingMatch ? afterHeading + nextHeadingMatch.index : changelog.length
const unreleasedBody = changelog.slice(afterHeading, sectionEnd).trim()

if (!unreleasedBody) {
  console.warn(
    `Warning: "[Unreleased]" has no entries. Consider documenting changes for ${version} in CHANGELOG.md.`,
  )
}

const previousVersionMatch = changelog.slice(sectionEnd).match(/## \[(\d+\.\d+\.\d+)\]/)
const previousVersion = previousVersionMatch?.[1]
const today = new Date().toISOString().slice(0, 10)

const newSection = unreleasedBody
  ? `${unreleasedHeading}\n\n## [${version}] - ${today}\n${unreleasedBody}\n`
  : `${unreleasedHeading}\n\n## [${version}] - ${today}\n`

let updated = changelog.slice(0, headingIndex) + newSection + changelog.slice(sectionEnd)

const newLinkLines = [
  `[Unreleased]: https://github.com/${repoSlug}/compare/v${version}...HEAD`,
  previousVersion
    ? `[${version}]: https://github.com/${repoSlug}/compare/v${previousVersion}...v${version}`
    : `[${version}]: https://github.com/${repoSlug}/releases/tag/v${version}`,
]

const unreleasedLinkRegex = /^\[Unreleased\]:.*$/m
updated = unreleasedLinkRegex.test(updated)
  ? updated.replace(unreleasedLinkRegex, newLinkLines.join('\n'))
  : `${updated.trimEnd()}\n\n${newLinkLines.join('\n')}\n`

writeFileSync(changelogPath, updated)
console.log(`CHANGELOG.md: finalized [${version}] section.`)

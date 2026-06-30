// Load .env from the repo root, then run a child command with those vars in process.env.
// Used by dist:mac so signing/notarization creds don't need manual export.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const loaded = config({ path: resolve(root, '.env') })

if (loaded.error && loaded.error.code !== 'ENOENT') {
  console.error('Failed to load .env:', loaded.error.message)
  process.exit(1)
}

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error('usage: node scripts/run-with-env.mjs <command> [args...]')
  process.exit(1)
}

const result = spawnSync(cmd, args, { cwd: root, env: process.env, stdio: 'inherit' })
process.exit(result.status ?? 1)

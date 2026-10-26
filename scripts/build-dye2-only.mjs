// Dev helper: build only the patched DYE2 plugin.  node scripts/build-dye2-only.mjs v0.1.30
import { execFileSync } from 'node:child_process'
import { readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tag = process.argv[2]
const run = (c, a, cwd) => execFileSync(c, a, { cwd, stdio: 'inherit' })
const root = resolve('.work/dye2'); rmSync(root, { recursive: true, force: true })
run('git', ['clone', '-q', '--depth', '1', '--branch', tag, 'https://github.com/decentespresso/dye2', root])
const dir = join(repoRoot, 'patches', 'dye2')
for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort()) { console.log('patch', f); await (await import(pathToFileURL(join(dir, f)).href)).apply({ root, repoRoot, upstreamTag: tag, pluginVersion: tag.replace(/^v/, '') }) }
const pd = join(root, 'dye2-plugin'); run('npm', ['ci', '--silent'], pd); run('npm', ['run', '-s', 'build'], pd)

import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tag = process.argv[2]; const out = resolve(process.argv[3])
const run = (c, a, cwd) => execFileSync(c, a, { cwd, stdio: 'inherit' })
const skinRoot = resolve('.work/bestpresso'); rmSync(skinRoot, { recursive: true, force: true }); mkdirSync('.work', { recursive: true })
run('git', ['clone', '-q', '--depth', '1', '--branch', tag, 'https://github.com/xinghendri/bestpresso', skinRoot])
const dir = join(repoRoot, 'patches', 'bestpresso')
for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort()) { console.log('patch', f); await (await import(pathToFileURL(join(dir, f)).href)).apply({ root: skinRoot, repoRoot, upstreamTag: tag }) }
run('npm', ['ci', '--silent'], skinRoot); run('npm', ['run', '-s', 'build'], skinRoot)
rmSync(out, { recursive: true, force: true }); cpSync(join(skinRoot, 'dist'), out, { recursive: true })

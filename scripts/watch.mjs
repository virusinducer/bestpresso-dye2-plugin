#!/usr/bin/env node
// Find the newest upstream tags (betas and patches included) and compare them with upstream.json,
// which records what the last published release was built from.
//
//   node scripts/watch.mjs [--bestpresso vX] [--dye2 vY]     override a tag instead of looking it up
//
// Prints JSON; when GITHUB_OUTPUT is set it also writes bestpresso, dye2 and changed outputs.
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { latestTag } from './lib/versions.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values } = parseArgs({ options: { bestpresso: { type: 'string' }, dye2: { type: 'string' } } })

function remoteTags(repo) {
  const out = execFileSync('git', ['ls-remote', '--tags', '--refs', `https://github.com/${repo}`], { encoding: 'utf8' })
  return out.split('\n').filter(Boolean).map((line) => line.split('refs/tags/')[1])
}

const pinned = JSON.parse(readFileSync(join(repoRoot, 'upstream.json'), 'utf8'))
// upstream.json may list tags to ignore, e.g. { "skip": { "dye2": ["v0.1.24"] } }.
const skip = pinned.skip || {}
const usable = (repo, key) => remoteTags(repo).filter((tag) => !(skip[key] || []).includes(tag))
const bestpresso = values.bestpresso || latestTag(usable('xinghendri/bestpresso', 'bestpresso'))
const dye2 = values.dye2 || latestTag(usable('decentespresso/dye2', 'dye2'))
if (!bestpresso || !dye2) throw new Error(`could not resolve upstream tags (bestpresso=${bestpresso}, dye2=${dye2})`)

const result = {
  bestpresso,
  dye2,
  changed: bestpresso !== pinned.bestpresso || dye2 !== pinned.dye2,
  previous: pinned,
}
console.log(JSON.stringify(result, null, 2))
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `bestpresso=${bestpresso}\ndye2=${dye2}\nchanged=${result.changed}\n`)
}

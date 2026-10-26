#!/usr/bin/env node
// Collect upstream notes for a build and record them.
//   node scripts/changelog.mjs --bestpresso vX --dye2 vY [--write] [--notes out/notes.md]
// Compares with upstream.json (the previous build). Needs `gh` (GH_TOKEN) to read the public upstream repos.
// --write inserts an entry into CHANGELOG.md; --notes writes the same text for the release body.
// Best effort: a failed lookup leaves a link instead of failing the build.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { bestpressoNotes, dye2Notes, entry, insertEntry } from './lib/changelog.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values } = parseArgs({ options: { bestpresso: { type: 'string' }, dye2: { type: 'string' }, write: { type: 'boolean' }, notes: { type: 'string' } } })
const prev = JSON.parse(readFileSync(join(repoRoot, 'upstream.json'), 'utf8'))
const gh = (args) => execFileSync('gh', ['api', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

let bpMd = '', d2Md = ''
if (values.bestpresso !== prev.bestpresso) {
  try {
    const base = /^(v\d+\.\d+\.\d+)/.exec(values.bestpresso)[1]
    const md = gh(['-H', 'Accept: application/vnd.github.raw', `repos/xinghendri/bestpresso/contents/RELEASE-${base}.md?ref=${values.bestpresso}`])
    bpMd = bestpressoNotes(md, prev.bestpresso, values.bestpresso)
  } catch { bpMd = `See https://github.com/xinghendri/bestpresso/releases/tag/${values.bestpresso}` }
}
if (values.dye2 !== prev.dye2) {
  try {
    const subjects = gh([`repos/decentespresso/dye2/compare/${prev.dye2}...${values.dye2}`, '--jq', '.commits[].commit.message | split("\n")[0]']).split('\n')
    d2Md = dye2Notes(subjects)
  } catch { d2Md = `See https://github.com/decentespresso/dye2/compare/${prev.dye2}...${values.dye2}` }
}
if (!bpMd && !d2Md && values.bestpresso === prev.bestpresso && values.dye2 === prev.dye2) { console.log('no upstream change'); if (values.notes) writeFileSync(values.notes, ''); process.exit(0) }

const text = entry({ date: new Date().toISOString().slice(0, 10), bpPrev: prev.bestpresso, bpNew: values.bestpresso, d2Prev: prev.dye2, d2New: values.dye2, bpMd, d2Md })
if (values.notes) writeFileSync(values.notes, text.replace(/^## .*\n\n/, ''))
if (values.write) { const file = join(repoRoot, 'CHANGELOG.md'); writeFileSync(file, insertEntry(readFileSync(file, 'utf8'), text)) }
console.log(text)

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bestpressoNotes, dye2Notes, entry, insertEntry, MARKER } from '../scripts/lib/changelog.mjs'

const md = `# Bestpresso v0.1.32 — More languages

- Added languages.

## Patch 001 — Yield flow

- Yield flow chart.

Install \`bestpresso-v0.1.32-patch001.zip\` in Decaid.

## Patch 002 — Spacing

- Spacing fix.

## Patch 003 — Cards

- Card layout.
`

test('a new minor version brings its base notes and patches up to the tag', () => {
  const out = bestpressoNotes(md, 'v0.1.31', 'v0.1.32-patch002')
  assert.match(out, /Added languages/); assert.match(out, /Yield flow chart/); assert.match(out, /Spacing fix/)
  assert.doesNotMatch(out, /Card layout/); assert.doesNotMatch(out, /Install `/)
})

test('a patch on the same base brings only the newer patches', () => {
  const out = bestpressoNotes(md, 'v0.1.32-patch001', 'v0.1.32-patch003')
  assert.doesNotMatch(out, /Added languages|Yield flow chart/)
  assert.match(out, /Spacing fix/); assert.match(out, /Card layout/)
})

test('dye2 notes keep features and fixes, drop housekeeping', () => {
  const out = dye2Notes(['feat(sorts): rank recipes', 'fix: arrows not chevrons', 'chore: version bump v0.1.27', 'Merge pull request #1', 'docs: notes'])
  assert.equal(out, '- Rank recipes\n- Arrows not chevrons')
})

test('entries are inserted below the marker, newest first', () => {
  const e = entry({ date: '2026-11-01', bpPrev: 'v1', bpNew: 'v2', d2Prev: 'v1', d2New: 'v1', bpMd: 'x' })
  assert.doesNotMatch(e, /Upstream DYE2/)
  const out = insertEntry(`top\n${MARKER}\n\n## old\n`, e)
  assert.ok(out.indexOf('2026-11-01') < out.indexOf('## old'))
})

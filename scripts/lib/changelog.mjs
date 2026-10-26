// Upstream notes for CHANGELOG.md and the release bodies. Pure functions, the fetching lives in scripts/changelog.mjs.
import { tagKey } from './versions.mjs'

export const MARKER = '<!-- upstream-entries -->'

// Bestpresso keeps one RELEASE-v<base>.md per minor version: a base section, then "## Patch NNN - title" sections.
// Returns the notes for everything newer than prevTag, up to newTag.
export function bestpressoNotes(releaseMd, prevTag, newTag) {
  const nk = tagKey(newTag)
  const pk = prevTag ? tagKey(prevTag) : null
  if (!nk) return ''
  const parts = releaseMd.split(/^(?=## Patch \d+)/m)
  const base = parts[0].replace(/^# .*\n+/, '')
  const title = /^# (.*)$/m.exec(releaseMd)?.[1] ?? ''
  const sameBase = pk && pk[0] === nk[0] && pk[1] === nk[1] && pk[2] === nk[2]
  const out = []
  const clean = (text) => text.split('\n').filter((l) => !/^Install `/.test(l) && !/^Thanks /.test(l)).join('\n').trim()
  if (!sameBase && nk[3] >= 0) out.push(`**${title.replace(/^Bestpresso\s*/, 'Bestpresso ')}**\n\n${clean(base)}`)
  for (const part of parts.slice(1)) {
    const n = Number(/^## Patch (\d+)/.exec(part)[1])
    if (nk[3] === 1 && n > nk[4]) continue
    if (nk[3] !== 1 && nk[3] >= 0) continue
    if (sameBase && pk[3] === 1 && n <= pk[4]) continue
    out.push(`**${part.split('\n')[0].replace(/^## /, '')}**\n\n${clean(part.split('\n').slice(1).join('\n'))}`)
  }
  return out.join('\n\n')
}

// DYE2 publishes no notes, so the commit subjects between two tags stand in; housekeeping is left out.
export function dye2Notes(subjects) {
  const skip = /^(chore|docs|test|refactor|ci|revert|Merge)\b/i
  const items = subjects.map((s) => s.trim()).filter((s) => s && !skip.test(s))
  const pretty = (s) => { const t = s.replace(/^(feat|fix|perf)(\([^)]*\))?:\s*/i, ''); return t.charAt(0).toUpperCase() + t.slice(1) }
  return items.map((s) => `- ${pretty(s)}`).join('\n')
}

export function entry({ date, bpPrev, bpNew, d2Prev, d2New, bpMd, d2Md }) {
  const lines = [`## ${date} - Bestpresso ${bpNew}, DYE2 ${d2New}`, '']
  if (bpPrev !== bpNew) lines.push(`### Upstream Bestpresso ${bpPrev} to ${bpNew}`, '', bpMd || '(no release notes found)', '')
  if (d2Prev !== d2New) lines.push(`### Upstream DYE2 ${d2Prev} to ${d2New}`, '', d2Md || '(no commits found)', '')
  return lines.join('\n').trimEnd() + '\n'
}

export function insertEntry(changelog, text) {
  if (!changelog.includes(MARKER)) throw new Error(`CHANGELOG.md lacks ${MARKER}`)
  return changelog.replace(MARKER, `${MARKER}\n\n${text.trimEnd()}`)
}

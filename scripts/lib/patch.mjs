import { readFileSync, writeFileSync } from 'node:fs'

// Replace `find` (a string) with `replacement` in `file`. The anchor must match exactly once, so an
// upstream change that moves or duplicates it fails the build loudly instead of silently dropping
// our edit.
export function replaceOnce(file, find, replacement, label = find.slice(0, 60)) {
  const source = readFileSync(file, 'utf8')
  const count = source.split(find).length - 1
  if (count !== 1) {
    throw new Error(`patch anchor for "${label}" matched ${count} times in ${file} (expected 1)`)
  }
  writeFileSync(file, source.replace(find, () => replacement))
}

// Like replaceOnce, but for a rule that may legitimately match up to `max` times (every match is
// replaced). Zero matches, or more than `max`, still fails the build.
export function replaceUpTo(file, find, replacement, max, label = find.slice(0, 60)) {
  const source = readFileSync(file, 'utf8')
  const count = source.split(find).length - 1
  if (count < 1 || count > max) {
    throw new Error(`patch anchor for "${label}" matched ${count} times in ${file} (expected 1 to ${max})`)
  }
  writeFileSync(file, source.split(find).join(replacement))
}

export function appendOnce(file, marker, text) {
  const source = readFileSync(file, 'utf8')
  if (source.includes(marker)) throw new Error(`${file} already contains "${marker}"`)
  writeFileSync(file, source.endsWith('\n') ? source + text : `${source}\n${text}`)
}

export function editJson(file, edit) {
  const data = JSON.parse(readFileSync(file, 'utf8'))
  edit(data)
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

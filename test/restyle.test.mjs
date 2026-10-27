import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const dir = new URL('../assets/dye2/', import.meta.url)

test('restyle assets are present', () => {
  for (const f of ['restyle.rules.json', 'bp-look.css', 'bp-slider.css', 'bp-slider.js', 'make-value-editable.js', 'make-value-editable-text.js', 'basket-seed.js']) {
    assert.ok(existsSync(new URL(f, dir)), f)
  }
})

test('every restyle rule has a file, an anchor and a change', () => {
  const rules = JSON.parse(readFileSync(new URL('restyle.rules.json', dir), 'utf8'))
  assert.ok(rules.length > 100)
  for (const r of rules) {
    assert.match(r.file, /^dye2-plugin\/src\//)
    assert.ok(r.find.length > 0)
    assert.notEqual(r.find, r.replace)
  }
})

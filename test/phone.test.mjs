import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { apply } from '../patches/bestpresso/04-phone-layout.mjs'

const css = readFileSync('assets/skin/phone.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

// Split the stylesheet into its top-level blocks (depth 0) and return each block's prelude.
function topLevelPreludes(source) {
  const preludes = []
  let depth = 0
  let start = 0
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '{') {
      if (depth === 0) preludes.push(source.slice(start, i).trim())
      depth++
    } else if (ch === '}') {
      depth--
      assert.ok(depth >= 0, 'unbalanced braces in phone.css')
      if (depth === 0) start = i + 1
    }
  }
  assert.equal(depth, 0, 'unbalanced braces in phone.css')
  return preludes
}

test('phone.css: every top-level rule is a phone-only media query', () => {
  const preludes = topLevelPreludes(css)
  assert.ok(preludes.length > 0)
  for (const prelude of preludes) {
    assert.match(prelude, /^@media /, `rule outside a media query: ${prelude}`)
    // Portrait phones are <= 520px wide, landscape phones <= 500px tall. Nothing here may match an iPad,
    // whose smallest side is 744px.
    const gated = /max-width:\s*520px/.test(prelude) || /max-height:\s*500px/.test(prelude)
    assert.ok(gated, `media query is not phone-only: ${prelude}`)
  }
})

test('04-phone-layout copies the stylesheet and imports it after the stock styles', () => {
  const root = mkdtempSync(join(tmpdir(), 'phone-'))
  mkdirSync(join(root, 'src', 'styles'), { recursive: true })
  writeFileSync(join(root, 'src', 'App.tsx'), "import './styles/index.css'\nimport './styles/homeAnimations.css'\n")
  writeFileSync(join(root, 'index.html'), '<meta name="viewport" content="width=device-width, initial-scale=1.0" />')
  apply({ root, repoRoot: process.cwd() })
  assert.equal(readFileSync(join(root, 'src', 'styles', 'phone.css'), 'utf8'), readFileSync('assets/skin/phone.css', 'utf8'))
  assert.match(readFileSync(join(root, 'src', 'App.tsx'), 'utf8'), /homeAnimations\.css'\nimport '\.\/styles\/phone\.css'/)
  assert.match(readFileSync(join(root, 'index.html'), 'utf8'), /viewport-fit=cover/)
})

test('04-phone-layout fails loudly when the import anchor moves', () => {
  const root = mkdtempSync(join(tmpdir(), 'phone-'))
  mkdirSync(join(root, 'src', 'styles'), { recursive: true })
  writeFileSync(join(root, 'src', 'App.tsx'), "import './styles/index.css'\n")
  writeFileSync(join(root, 'index.html'), '<meta name="viewport" content="width=device-width, initial-scale=1.0" />')
  assert.throws(() => apply({ root, repoRoot: process.cwd() }), /matched 0 times/)
})

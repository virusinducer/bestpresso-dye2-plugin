import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'
import { apply } from '../patches/dye2/04-phone-fit.mjs'

const css = readFileSync('assets/dye2/bp-phone.css', 'utf8')
const js = readFileSync('assets/dye2/bp-phone.js', 'utf8')

test('bp-phone.css: every rule is scoped to the phone/portrait classes', () => {
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((r) => r.split('{')[0].trim()).filter(Boolean)
  assert.ok(selectors.length > 0)
  for (const group of selectors) {
    for (const sel of group.split(',')) {
      assert.match(sel.trim(), /^html\.bp-phone-[pl]\b/, `unscoped selector: ${sel.trim()}`)
    }
  }
})

function fit(vw, vh) {
  const classes = new Set()
  const style = {}
  const probe = { style: {}, remove() {} }
  const document = {
    documentElement: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) }, appendChild() {} },
    createElement: () => probe,
    body: { style, firstElementChild: { style: {} } },
  }
  const window = {}
  vm.runInNewContext(js, { window, document, getComputedStyle: () => ({ paddingTop: '0px', paddingBottom: '0px', paddingLeft: '0px', paddingRight: '0px' }), parseFloat })
  const scale = window.__bpPhoneFit(vw, vh)
  return { scale, classes: [...classes], style }
}

test('bp-phone.js: portrait phone and portrait tablet get a stacked design canvas', () => {
  const phone = fit(393, 852)
  assert.deepEqual(phone.classes, ['bp-phone-p'])
  const phoneW = parseInt(phone.style.width)
  assert.ok(phoneW >= 960 && phoneW <= 1500)
  assert.ok(Math.abs(phone.scale - 393 / phoneW) < 1e-9)
  const tablet = fit(820, 1180)
  assert.deepEqual(tablet.classes, ['bp-phone-p'])
  assert.ok(parseInt(tablet.style.width) > 960 && parseInt(tablet.style.width) <= 1500)
})

test('bp-phone.js: landscape phone uses the full canvas, landscape tablet and desktop fall through to stock', () => {
  const phone = fit(844, 390)
  assert.deepEqual(phone.classes, ['bp-phone-l'])
  assert.equal(phone.style.width, '1920px')
  for (const [w, h] of [[1180, 820], [1366, 1024], [1920, 1080]]) {
    const r = fit(w, h)
    assert.equal(r.scale, 0)
    assert.deepEqual(r.classes, [])
    assert.equal(r.style.width, undefined)
  }
})

test('04-phone-fit hooks the shell and writes the generated module', () => {
  const root = mkdtempSync(join(tmpdir(), 'dye2-phone-'))
  const utils = join(root, 'dye2-plugin', 'src', 'utils')
  mkdirSync(utils, { recursive: true })
  writeFileSync(join(utils, 'dev-shell.ts'), [
    'import { bpSliderCss, bpSliderScript } from "./bp-slider";',
    '<style>${bpSliderCss}</style>\n</head>',
    '<script>${fitScript}</script>\n  <script>${bpSliderScript}</script>',
    '  function fit(vw, vh) {\n    body\n  }',
  ].join('\n'))
  apply({ root, repoRoot: process.cwd() })
  const shell = readFileSync(join(utils, 'dev-shell.ts'), 'utf8')
  assert.match(shell, /bp-phone/)
  assert.match(shell, /window\.__bpPhoneFit/)
  assert.match(readFileSync(join(utils, 'bp-phone.ts'), 'utf8'), /bpPhoneScript/)
})

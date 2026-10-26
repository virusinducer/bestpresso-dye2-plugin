import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import { isPluginLoaded } from '../assets/skin/pluginSlot.ts'

const response = (body, ok = true) => ({ ok, json: async () => body })

test('isPluginLoaded: true when the plugin is listed and loaded', async () => {
  assert.equal(await isPluginLoaded('http://x/api/v1', async () => response([{ id: 'dye2.reaplugin', loaded: true }])), true)
})

test('isPluginLoaded: true when the list has no loaded field', async () => {
  assert.equal(await isPluginLoaded('http://x/api/v1', async () => response([{ id: 'dye2.reaplugin' }])), true)
})

test('isPluginLoaded: false when disabled, absent, failing or unreachable', async () => {
  assert.equal(await isPluginLoaded('http://x', async () => response([{ id: 'dye2.reaplugin', loaded: false }])), false)
  assert.equal(await isPluginLoaded('http://x', async () => response([{ id: 'other.reaplugin', loaded: true }])), false)
  assert.equal(await isPluginLoaded('http://x', async () => response([], false)), false)
  assert.equal(await isPluginLoaded('http://x', async () => { throw new Error('offline') }), false)
  assert.equal(await isPluginLoaded('http://x', async () => response({ not: 'a list' })), false)
})

// The served script, run against a minimal DOM.
function fakeDom(href) {
  const make = () => ({
    children: [], attrs: {}, listeners: {}, style: {},
    setAttribute(k, v) { this.attrs[k] = v },
    addEventListener(type, fn) { this.listeners[type] = fn },
    appendChild(child) { this.children.push(child); return child },
  })
  const head = make()
  const root = { look: null, getAttribute(k) { return k === 'data-look' ? this.look : null } }
  const document = { head, documentElement: root, createElement: make, getElementById: (id) => head.children.find((c) => c.id === id) || null }
  const window = { location: { href }, document }
  window.window = window
  return { window, document, head }
}

test('button script mounts one button that opens the DYE2 dashboard with a return URL', () => {
  const { window, document } = fakeDom('http://tablet:3000/?page=home')
  vm.runInNewContext(readFileSync('assets/plugin/bestpresso-button.js', 'utf8'), { window, document })
  assert.ok(window.__bestpressoDye2)
  const slot = document.createElement('span')
  window.__bestpressoDye2.mount(slot, { apiBase: 'http://tablet:8080/api/v1' })
  assert.equal(slot.children.length, 1)
  const button = slot.children[0]
  assert.equal(button.attrs['aria-label'], 'Open DYE2')
  button.listeners.click()
  assert.equal(
    window.location.href,
    'http://tablet:8080/api/v1/plugins/dye2.reaplugin/dashboard?look=oled&return=' + encodeURIComponent('http://tablet:3000/?page=home'),
  )
})

test('button passes the skin look on to DYE2', () => {
  const { window, document } = fakeDom('http://tablet:3000/')
  document.documentElement.look = 'classic'
  vm.runInNewContext(readFileSync('assets/plugin/bestpresso-button.js', 'utf8'), { window, document })
  const slot = document.createElement('span')
  window.__bestpressoDye2.mount(slot, { apiBase: 'http://tablet:8080/api/v1' })
  slot.children[0].listeners.click()
  assert.match(window.location.href, /dashboard\?look=classic&return=/)
})

test('button script is idempotent when loaded twice', () => {
  const { window, document } = fakeDom('http://tablet:3000/')
  const code = readFileSync('assets/plugin/bestpresso-button.js', 'utf8')
  vm.runInNewContext(code, { window, document })
  const first = window.__bestpressoDye2
  vm.runInNewContext(code, { window, document })
  assert.equal(window.__bestpressoDye2, first)
})

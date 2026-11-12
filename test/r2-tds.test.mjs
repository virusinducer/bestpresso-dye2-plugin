import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'
import { apply } from '../patches/dye2/07-r2-tds.mjs'

const js = readFileSync('assets/dye2/r2-tds.js', 'utf8')

test('r2-tds.js is safe inside a template literal', () => {
  for (const bad of ['`', '${', '\\']) assert.ok(!js.includes(bad), `contains ${JSON.stringify(bad)}`)
})

function fakeUpstream() {
  const root = mkdtempSync(join(tmpdir(), 'r2-'))
  const pages = join(root, 'dye2-plugin', 'src', 'pages')
  mkdirSync(pages, { recursive: true })
  writeFileSync(
    join(pages, 'edit-shot.ts'),
    `x
        \${stepperHtml('es-ey', 'EY', '80px')}
      </div>
y
function setupControls() {
  // Shot nav
  z
`,
  )
  return { root, file: join(pages, 'edit-shot.ts') }
}

test('patch inserts button, logic and init exactly once', () => {
  const { root, file } = fakeUpstream()
  apply({ root, repoRoot: process.cwd() })
  const out = readFileSync(file, 'utf8')
  assert.equal(out.split('id="es-r2-btn"').length - 1, 1)
  assert.equal(out.split('async function r2Read()').length - 1, 1)
  assert.equal(out.split('r2Init();').length - 1, 1)
})

test('patch fails loudly when the anchor moves', () => {
  const { root, file } = fakeUpstream()
  writeFileSync(file, 'nothing here\n')
  assert.throws(() => apply({ root, repoRoot: process.cwd() }), /matched 0 times/)
})

function harness({ sensors, devices, scan, readingAfter = 2, tds = 9.4, dropOnMeasure = false, initialFrame = null, measureFrames = [], measureFails = null, measureDrops = false, logFails = false }) {
  const els = {}
  for (const id of ['es-r2-status', 'es-r2-btn', 'es-dose-value', 'es-drink-value', 'es-tds-value', 'es-ey-value']) {
    els[id] = { id, textContent: '', value: '', style: {}, addEventListener() {} }
  }
  els['es-dose-value'].value = '17g'
  els['es-drink-value'].value = '42g'
  const state = { connected: false, calls: 0, log: [], sockets: [], clock: 1e12, posted: [] }
  class FakeWebSocket {
    constructor(url) {
      this.url = url
      state.log.push('WS ' + url)
      state.sockets.push(this)
      if (initialFrame) Promise.resolve().then(() => this.onmessage && this.onmessage({ data: JSON.stringify(initialFrame) }))
    }
    emit(frame) { if (this.onmessage) this.onmessage({ data: JSON.stringify(frame) }) }
    close() { this.closed = true }
  }
  const J = (b, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => b })
  const sandbox = {
    document: { hidden: false, getElementById: (id) => els[id] || null },
    setInterval: () => 0,
    window: { addEventListener() {} },
    navigator: { userAgent: 'TestAgent/1.0' },
    location: { protocol: 'http:', host: 'decaid:8080' },
    WebSocket: FakeWebSocket,
    setVal: (id, v) => { els[id].value = v },
    currentShot: { annotations: {} },
    Date: { now: () => (state.clock += 5000) },
    JSON, Promise, Math, Object, Array, String, Error, parseFloat, encodeURIComponent,
    setTimeout: (fn) => { fn(); return 0 },
    fetch: async (url, opt = {}) => {
      if (url === '/api/v1/plugins/dye2.reaplugin/r2-log') {
        if (logFails) throw new Error('log endpoint down')
        state.posted.push(...JSON.parse(opt.body).lines)
        return J({ stored: 1 })
      }
      state.log.push(`${opt.method || 'GET'} ${url}`)
      if (url === '/api/v1/sensors') return J(state.connected ? sensors : [])
      if (url === '/api/v1/devices') return J(devices)
      if (url === '/api/v1/devices/scan') return J(scan)
      if (url === '/api/v1/devices/connect') { state.connected = true; return J({}) }
      const cmd = JSON.parse(opt.body).commandId
      if (cmd === 'measure' && measureFails) { state.connected = !measureDrops; return J(measureFails, false) }
      if (cmd === 'measure') { if (dropOnMeasure) state.connected = false; for (const f of measureFrames) state.sockets.forEach((k) => k.emit(f)); return readingAfter < 99 ? J({ status: 'ok', result: { reading: { tds, refractiveIndex: 1.34 } } }) : J({ data: { started: true } }) }
      state.calls++
      return J({ status: 'error', message: 'Unsupported operation: Unsupported R2 command: getReading' }, false)
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(js, sandbox)
  return { els, state, sandbox, run: (code) => vm.runInContext(code, sandbox) }
}

const R2 = { id: 'plugin:difluid-r2.reaplugin:difluid-r2:AA', name: 'DiFluid R2', type: 'sensor', state: 'disconnected' }
const SENSOR = { ...R2, state: 'connected' }
const DE1 = { id: 'x', name: 'DE1', type: 'machine', state: 'connected' }

test('Find R2 scans, connects and confirms; Read R2 then fills TDS and EY', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2] })
  await h.run('r2Refresh()')
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
  await h.run('r2Read()')
  assert.equal(h.els['es-r2-btn'].textContent, 'Read R2')
  assert.match(h.els['es-r2-status'].textContent, /R2 connected: DiFluid R2/)
  assert.ok(h.state.log.includes('GET /api/v1/devices/scan'))
  assert.ok(h.state.log.includes('PUT /api/v1/devices/connect'))
  await h.run('r2Read()')
  assert.equal(h.els['es-tds-value'].value, '9.40%')
  assert.equal(h.els['es-ey-value'].value, '23.22%') // 9.4 x 42 / 17
  assert.deepEqual(JSON.parse(JSON.stringify(h.sandbox.currentShot.annotations)), { drinkTds: 9.4, drinkEy: 23.22 })
})

test('Find R2 reports clearly when the R2 is not advertising', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1] })
  await h.run('r2Read()')
  assert.match(h.els['es-r2-status'].textContent, /R2 not found/)
  assert.ok(!h.state.log.some((l) => l.startsWith('PUT')))
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
})

test('a reading at or below zero is rejected, shown raw, and fills nothing', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], tds: -0.23 })
  await h.run('r2Read()') // connects
  await h.run('r2Read()') // measures
  assert.match(h.els['es-r2-status'].textContent, /-0\.23%, at or below zero/)
  assert.equal(h.els['es-tds-value'].value, '')
  assert.equal(h.els['es-ey-value'].value, '')
  assert.deepEqual(JSON.parse(JSON.stringify(h.sandbox.currentShot.annotations)), {})
})

const RED = '#ff4d4f'

test('problems are red, normal progress and success are not', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1] })
  await h.run('r2Read()')
  assert.equal(h.els['es-r2-status'].style.color, RED) // R2 not found
  const ok = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2] })
  await ok.run('r2Read()')
  assert.equal(ok.els['es-r2-status'].style.color, 'var(--text-primary)') // connected
  await ok.run('r2Read()')
  assert.match(ok.els['es-r2-status'].textContent, /filled in/)
  assert.equal(ok.els['es-r2-status'].style.color, 'var(--text-primary)')
  const neg = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], tds: -0.23 })
  await neg.run('r2Read()')
  await neg.run('r2Read()')
  assert.equal(neg.els['es-r2-status'].style.color, RED) // below zero
})

test('an R2 that disconnects while idle is noticed, shown in red, and the button goes back to Find R2', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2] })
  await h.run('r2Read()') // connects
  assert.equal(h.els['es-r2-btn'].textContent, 'Read R2')
  h.state.connected = false // the R2 is switched off
  await h.run('r2Refresh()')
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
  assert.match(h.els['es-r2-status'].textContent, /R2 disconnected/)
  assert.equal(h.els['es-r2-status'].style.color, RED)
  // Reconnecting clears the error.
  await h.run('r2Read()')
  assert.equal(h.els['es-r2-btn'].textContent, 'Read R2')
  assert.equal(h.els['es-r2-status'].style.color, 'var(--text-primary)')
})

test('an R2 that drops during a measurement is reported as disconnected, not as a timeout', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, dropOnMeasure: true })
  await h.run('r2Read()') // connects
  await h.run('r2Read()') // starts a test; the R2 goes away
  assert.match(h.els['es-r2-status'].textContent, /R2 disconnected/)
  assert.equal(h.els['es-r2-status'].style.color, RED)
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
  assert.equal(h.els['es-tds-value'].value, '')
})

test('a sensor Decaid still lists as disconnected does not count as connected', async () => {
  const h = harness({ sensors: [R2], devices: [DE1], scan: [DE1, R2] })
  await h.run('r2Read()') // connect sets state, but the listed sensor says disconnected
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
})

const NO_LIQUID = { values: { status: 'error', measuring: false, error: 'no_liquid', reading: {}, temperatures: {} } }
const CLEARED = { values: { status: 'started', measuring: true, error: '', reading: {}, temperatures: {} } }

test('no liquid reported by the R2 stops the wait at once, in red, with a clear instruction', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, measureFrames: [NO_LIQUID] })
  await h.run('r2Read()') // connects
  await h.run('r2Read()')
  assert.match(h.els['es-r2-status'].textContent, /no liquid/i)
  assert.equal(h.els['es-r2-status'].style.color, RED)
  assert.equal(h.els['es-r2-btn'].textContent, 'Read R2')
  assert.equal(h.els['es-tds-value'].value, '')
  assert.ok(h.state.log.some((l) => l.startsWith('WS ws://decaid:8080/ws/v1/sensors/plugin%3Adifluid-r2')))
  assert.ok(h.state.sockets.every((k) => k.closed), 'socket closed afterwards')
})

test('a stale no-liquid error from the previous attempt is not reported for a good test', async () => {
  const good = { values: { status: 'finished', measuring: false, error: '', reading: { tds: 9.4 }, temperatures: {} } }
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, initialFrame: NO_LIQUID, measureFrames: [CLEARED, good] })
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.equal(h.els['es-tds-value'].value, '9.40%')
  assert.equal(h.els['es-r2-status'].style.color, 'var(--text-primary)')
})

test('the same error twice in a row is still reported once the stream shows the test restarted', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, initialFrame: NO_LIQUID, measureFrames: [CLEARED, NO_LIQUID] })
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.match(h.els['es-r2-status'].textContent, /no liquid/i)
  assert.equal(h.els['es-r2-status'].style.color, RED)
})

test('other R2 errors get their own wording', async () => {
  for (const [code, re] of [['beyond_range', /beyond its range/], ['hardware_error_7', /hardware error \(hardware_error_7\)/], ['measurement_timeout', /did not finish/], ['weird_thing', /R2 error: weird thing/]]) {
    const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, measureFrames: [{ values: { error: code, reading: {} } }] })
    await h.run('r2Read()')
    await h.run('r2Read()')
    assert.match(h.els['es-r2-status'].textContent, re, code)
    assert.equal(h.els['es-r2-status'].style.color, RED, code)
  }
})

test('a failed start shows the reason Decaid gives, and says the R2 disconnected when it did', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], measureFails: { error: 'Command failed: write rejected' }, measureDrops: true })
  await h.run('r2Read()')
  await h.run('r2Read()')
  const text = h.els['es-r2-status'].textContent
  assert.match(text, /would not start the test \(400: Command failed: write rejected\)/)
  assert.match(text, /disconnected/)
  assert.equal(h.els['es-r2-status'].style.color, RED)
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
})

test('a failed start that mentions no liquid gets the no-liquid instruction', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], measureFails: { error: 'no_liquid' } })
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.match(h.els['es-r2-status'].textContent, /no liquid/i)
})

test('live R2 status is shown while measuring', async () => {
  const frames = [{ values: { status: 'test_ongoing', measuring: true, error: '', reading: {} } }]
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, measureFrames: frames })
  await h.run('r2Read()')
  const seen = []
  const orig = h.els['es-r2-status']
  let text = ''
  Object.defineProperty(orig, 'textContent', { get: () => text, set: (v) => { text = v; seen.push(v) } })
  await h.run('r2Read()')
  assert.ok(seen.some((m) => /Measuring\.\.\. \(R2: test ongoing\)/.test(m)), seen.join(' | '))
})

test('a silent R2 times out with the last update it sent', async () => {
  const frames = [{ values: { status: 'test_ongoing', measuring: true, error: '', reading: {} } }]
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, measureFrames: frames })
  // The R2 stays listed, getReading keeps failing, so the 60 s wait runs out.
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.match(h.els['es-r2-status'].textContent, /No result from the R2 after 60 s \(last R2 update: status test_ongoing\)/)
  assert.equal(h.els['es-r2-status'].style.color, RED)
})

test('the reading in the measure reply is used, and getReading is never called', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 1 })
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.equal(h.els['es-tds-value'].value, '9.40%')
  assert.equal(h.state.calls, 0)
})

test('a flat stream frame with tds (the real R2 shape) ends the wait, a replay before start does not', async () => {
  const flat = { values: { timestamp: 't', tds: 1.96, temperature: 23.35, refractiveIndex: 1.33 } }
  const started = { values: { status: 'started', measuring: true } }
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, initialFrame: { values: { tds: 5.5 } }, measureFrames: [started, flat] })
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.equal(h.els['es-tds-value'].value, '1.96%')
})

test('Find R2 connects as soon as the R2 shows in the device list during the scan', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1] })
  let n = 0
  const orig = h.sandbox.fetch
  h.sandbox.fetch = async (url, opt = {}) => {
    if (url === '/api/v1/devices') { n++; return { ok: true, status: 200, json: async () => (n >= 2 ? [DE1, R2] : [DE1]) } }
    if (url === '/api/v1/devices/scan') return new Promise(() => {})
    return orig(url, opt)
  }
  await h.run('r2Read()')
  assert.ok(h.state.log.includes('PUT /api/v1/devices/connect'))
  assert.match(h.els['es-r2-status'].textContent, /R2 connected/)
})

test('a still-listed R2 that answers Sensor not found (just dropped) is treated as disconnected', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], measureFails: { error: 'Sensor not found: plugin:difluid-r2' } })
  h.sandbox.fetch = ((orig) => async (url, opt = {}) => {
    const r = await orig(url, opt)
    if (!r.ok) r.status = 404
    return r
  })(h.sandbox.fetch)
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.match(h.els['es-r2-status'].textContent, /connection was lost/)
  assert.equal(h.els['es-r2-status'].style.color, RED)
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
})

test('a stale listing does not overwrite the lost-connection message or flip the button back', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], measureFails: { error: 'Sensor not found: x' } })
  h.sandbox.fetch = ((orig) => async (url, opt = {}) => { const r = await orig(url, opt); if (!r.ok) r.status = 404; return r })(h.sandbox.fetch)
  await h.run('r2Read()')
  await h.run('r2Read()')
  await h.run('r2Refresh()') // the 5 s check, with Decaid still listing the dead sensor
  assert.match(h.els['es-r2-status'].textContent, /connection was lost/)
  assert.equal(h.els['es-r2-status'].style.color, RED)
  assert.equal(h.els['es-r2-btn'].textContent, 'Find R2')
})

test('every step of a no-liquid attempt is logged, tagged with the attempt, and the log is never logged', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], readingAfter: 99, measureFrames: [NO_LIQUID] })
  await h.run('r2Init()')
  await h.run('r2Refresh()')
  await h.run('r2Read()') // connects (attempt 1)
  await h.run('r2Read()') // measures (attempt 2)
  const log = h.state.posted
  const has = (re) => assert.ok(log.some((l) => re.test(l)), String(re) + '\n' + log.join('\n'))
  has(/page ready host=decaid:8080/)
  has(/#1\] tap: button=Find R2/)
  has(/#1\] devices -> DE1:connected/)
  has(/#1\] scan -> DE1:connected, DiFluid R2:disconnected/)
  has(/#1\] connect .* -> 200/)
  has(/#2\] tap: button=Read R2/)
  has(/#2\] using sensor/)
  has(/#2\] ws: open/)
  has(/#2\] execute measure -> 200/)
  has(/#2\] ws frame: .*no_liquid/)
  has(/#2\] wait over: outcome=error no_liquid/)
  has(/#2\] status ERR: R2 says no liquid/)
  has(/#2\] attempt finished/)
  assert.ok(!log.some((l) => /r2-log/.test(l)), 'the log call itself must not be logged')
  assert.ok(log.every((l) => /^[0-9:.]+ \[[a-z0-9]+(#[0-9]+)?\] /.test(l)), 'every line has a time and a tag')
})

test('lost connections and refused starts are logged with their reason', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], measureFails: { error: 'write rejected' }, measureDrops: true })
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.ok(h.state.posted.some((l) => /measure refused: 400 write rejected/.test(l)), h.state.posted.join('\n'))
  const idle = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2] })
  await idle.run('r2Read()')
  await idle.run('r2Refresh()')
  idle.state.connected = false
  await idle.run('r2Refresh()')
  assert.ok(idle.state.posted.some((l) => /lost: idle check: sensor no longer listed/.test(l)), idle.state.posted.join('\n'))
  assert.ok(idle.state.posted.some((l) => /sensor not listed/.test(l)))
})

test('a failing log endpoint never changes what the R2 flow does', async () => {
  const h = harness({ sensors: [SENSOR], devices: [DE1], scan: [DE1, R2], logFails: true })
  await h.run('r2Read()')
  await h.run('r2Read()')
  assert.equal(h.els['es-tds-value'].value, '9.40%')
  assert.equal(h.els['es-ey-value'].value, '23.22%')
})

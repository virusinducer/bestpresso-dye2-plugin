import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { apply } from '../patches/dye2/08-r2-log.mjs'
import { handleR2Log } from '../assets/plugin/r2-log.ts'

const req = (method, body, query = {}) => ({ requestId: 'r', endpoint: 'r2-log', method, headers: {}, body, query })
const post = (lines, mirror = () => {}) => handleR2Log(req('POST', { lines }), mirror)
const get = (query) => handleR2Log(req('GET', null, query), () => {})
const clear = () => handleR2Log(req('POST', { clear: true }), () => {})

test('stores posted lines, oldest first, and mirrors each into the Decaid log', () => {
  clear()
  const mirrored = []
  const res = post(['one', 'two', 'three'], (m) => mirrored.push(m))
  assert.equal(res.status, 200)
  assert.deepEqual(JSON.parse(res.body), { stored: 3, total: 3 })
  assert.deepEqual(mirrored, ['[r2] one', '[r2] two', '[r2] three'])
  const out = get({})
  assert.equal(out.status, 200)
  assert.match(out.headers['Content-Type'], /^text\/plain/)
  assert.equal(out.body, 'one\ntwo\nthree\n')
})

test('keeps only the last 300 lines', () => {
  clear()
  for (let i = 0; i < 4; i++) post(Array.from({ length: 100 }, (_, j) => `line ${i * 100 + j}`))
  const lines = get({}).body.trim().split('\n')
  assert.equal(lines.length, 300)
  assert.equal(lines[0], 'line 100')
  assert.equal(lines.at(-1), 'line 399')
})

test('one post stores at most 100 lines, and long lines are cut', () => {
  clear()
  const res = post(Array.from({ length: 150 }, (_, i) => `l${i}`))
  assert.equal(JSON.parse(res.body).stored, 100)
  clear()
  post(['x'.repeat(5000)])
  const line = get({}).body.trim()
  assert.ok(line.length <= 603, String(line.length))
  assert.ok(line.endsWith('...'))
})

test('n and format=json select what comes back', () => {
  clear()
  post(['a', 'b', 'c', 'd'])
  assert.equal(get({ n: '2' }).body, 'c\nd\n')
  const json = JSON.parse(get({ format: 'json', n: '3' }).body)
  assert.deepEqual(json, { total: 4, lines: ['b', 'c', 'd'] })
  assert.equal(get({ n: 'nonsense' }).body, 'a\nb\nc\nd\n')
})

test('clear empties it; empty log reads as an empty body', () => {
  post(['keep me'])
  assert.deepEqual(JSON.parse(clear().body), { cleared: true })
  assert.equal(get({}).body, '')
})

test('bad or odd bodies are ignored without throwing', () => {
  clear()
  assert.equal(handleR2Log(req('POST', 'not json'), () => {}).status, 200)
  assert.equal(handleR2Log(req('POST', null), () => {}).status, 200)
  assert.deepEqual(JSON.parse(post([1, null, '', {}, 'ok']).body), { stored: 1, total: 1 })
  // The runtime may hand the body over as a JSON string.
  handleR2Log(req('POST', JSON.stringify({ lines: ['from string'] })), () => {})
  assert.equal(get({}).body, 'ok\nfrom string\n')
})

function fakeUpstream() {
  const root = mkdtempSync(join(tmpdir(), 'r2log-'))
  const plugin = join(root, 'dye2-plugin')
  mkdirSync(join(plugin, 'src', 'utils'), { recursive: true })
  writeFileSync(join(plugin, 'manifest.src.json'), JSON.stringify({ api: [{ id: 'skin', type: 'http', data: {} }] }))
  writeFileSync(
    join(plugin, 'src', 'plugin.ts'),
    'import { renderBestpressoButton } from "./utils/bestpresso-button";\nswitch (x) {\n        case "bestpresso-button":\n          return renderBestpressoButton(request);\n\n        case "skin":\n}\n',
  )
  return { root, plugin }
}

test('patch adds the util, the manifest entry, the import and the route', () => {
  const { root, plugin } = fakeUpstream()
  apply({ root, repoRoot: process.cwd() })
  assert.match(readFileSync(join(plugin, 'src', 'utils', 'r2-log.ts'), 'utf8'), /export function handleR2Log/)
  const manifest = JSON.parse(readFileSync(join(plugin, 'manifest.src.json'), 'utf8'))
  assert.ok(manifest.api.some((a) => a.id === 'r2-log' && a.type === 'http'))
  const source = readFileSync(join(plugin, 'src', 'plugin.ts'), 'utf8')
  assert.match(source, /import \{ handleR2Log \} from "\.\/utils\/r2-log";/)
  assert.match(source, /case "r2-log":\n\s+return handleR2Log\(request, \(message\) => host\.log\(message\)\);/)
})

test('patch fails loudly when its anchor has moved', () => {
  const { root, plugin } = fakeUpstream()
  writeFileSync(join(plugin, 'src', 'plugin.ts'), 'nothing here\n')
  assert.throws(() => apply({ root, repoRoot: process.cwd() }), /matched 0 times/)
})

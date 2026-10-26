import assert from 'node:assert/strict'
import { test } from 'node:test'
import { oledColor, oledRecolor } from '../assets/skin/oledColor.ts'

test('stock green accents become #cbcb13 and keep their alpha', () => {
  assert.equal(oledColor('#42c599'), '#cbcb13')
  assert.equal(oledColor('rgba(61,192,120,.55)'), 'rgba(203,203,19,0.55)')
})

test('green-tinted and warm dark surfaces become neutral grey', () => {
  const [r, g, b] = oledColor('#1d2321').match(/[0-9a-f]{2}/g).map((h) => parseInt(h, 16))
  assert.ok(r === g && g === b, 'neutral')
  assert.equal(oledColor('#ffffff'), '#ffffff')
})

test('blues, reds and greys stay as they are', () => {
  for (const c of ['#4286c5', '#d65353', '#878787', '#f5f5f5']) assert.equal(oledColor(c), c)
})

test('recolouring an svg touches colours only', () => {
  const out = oledRecolor('<svg><path fill="#42c599" stroke="#4286c5" d="M0 0h10"/></svg>')
  assert.equal(out, '<svg><path fill="#cbcb13" stroke="#4286c5" d="M0 0h10"/></svg>')
})

import { oledColorFor } from '../assets/skin/oledColor.ts'
test('fills go near-black, faint borders turn yellow-tinted, text greys stay', () => {
  assert.equal(oledColorFor('#171717', 'fill'), '#060606')
  assert.equal(oledColorFor('rgba(255,255,255,.1)', 'line'), 'rgba(203,203,19,0.3)')
  assert.equal(oledColorFor('#333', 'line'), 'rgba(203,203,19,0.34)')
  assert.equal(oledColorFor('#878787', 'other'), '#878787')
  assert.equal(oledColorFor('#878787', 'line'), '#878787')
})

// Runs after `vite build`. Writes assets/oled-<hash>.css: a full recoloured copy of every built stylesheet (same rules,
// same order, so the cascade is identical) plus hand-tuned extras, and links it next to the original in index.html.
// Exactly one of the two sheets is enabled: oled when Look = OLED and the theme is dark, else the untouched classic sheet.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import { COLOR_TOKEN, oledColorFor } from '../src/features/settings/oledColor.ts'

const dist = new URL(process.env.OLED_DIST || '../dist/', import.meta.url).pathname
const htmlPath = join(dist, 'index.html')
let html = readFileSync(htmlPath, 'utf8')
const links = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g)]
if (!links.length) throw new Error('oled: no stylesheet linked from index.html')

const kindOf = (prop) => prop.startsWith('--')
  ? (/(line|border|outline|divider|rule|stroke)/i.test(prop) ? 'line' : /(^|-)(bg|background|surface|panel|card|input|field|shell|track|well)(-|$)/i.test(prop) ? 'fill' : 'other')
  : (/^background(-color|-image)?$/.test(prop) ? 'fill'
    : /^(border|outline)(-(top|right|bottom|left|inline|block)(-(start|end))?)?(-color)?$/.test(prop) ? 'line' : 'other')
const recolor = (v, prop) => v.replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)|(?:#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|rgba?\([^)]*\))/g,
  (m) => (m.startsWith('url(') ? m : oledColorFor(m, kindOf(prop))))
const lightOnly = (sel) => /\[data-theme=["']?light["']?\]/.test(sel) && !/:not\(\[data-theme=["']?light["']?\]\)/.test(sel)

let out = ''
for (const [, href] of links) {
  const file = join(dist, href.replace(/^(\.\/|\/)/, ''))
  const root = postcss.parse(readFileSync(file, 'utf8'))
  root.walkRules((rule) => {
    if (rule.selectors.every(lightOnly)) return
    rule.walkDecls((d) => { COLOR_TOKEN.lastIndex = 0; if (COLOR_TOKEN.test(d.value)) d.value = recolor(d.value, d.prop) })
  })
  out += root.toString() + '\n'
}
const SCOPE = ':root:not([data-theme="light"])'
const extra = postcss.parse(readFileSync(new URL('./oled-extra.css', import.meta.url), 'utf8'))
extra.walkRules((r) => { r.selectors = r.selectors.map((s) => (/^(html|:root)(?![\w-])/.test(s) ? SCOPE + s.replace(/^(html|:root)/, '') : `${SCOPE} ${s}`)) })
out += '\n/* OLED look extras */\n' + extra.toString()

const name = `assets/oled-${createHash('sha1').update(out).digest('hex').slice(0, 8)}.css`
writeFileSync(join(dist, name), out)
const base = links[0][1].replace(/assets\/[^/]+$/, '')
const first = links[0][0]
html = html.replace(first, first.replace('<link ', '<link id="classic-css" ') + `\n    <link id="oled-css" rel="stylesheet" href="${base}${name}">\n    ` +
  `<script>(function(){try{var p=JSON.parse(localStorage.getItem('bestpresso.preferences.v1')||'{}');var on=p.look!=='classic'&&p.theme!=='light';document.getElementById('oled-css').disabled=!on;document.getElementById('classic-css').disabled=on}catch(e){}})()</script>`)
writeFileSync(htmlPath, html)
console.log(`oled sheet: ${name} (${(out.length / 1024).toFixed(0)} KB)`)

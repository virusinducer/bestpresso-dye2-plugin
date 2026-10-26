// OLED look colour mapping: stock green accent -> #cbcb13, green-tinted and warm dark surfaces -> neutral black.
// Plain functions, shared by the build-time overlay generator (scripts/oled-postbuild.mjs) and the runtime icon recolour.
export const OLED_ACCENT = '#cbcb13'
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/
const RGBA = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)/
export const COLOR_TOKEN = new RegExp(`${HEX.source}|${RGBA.source}`, 'g')

function parse(tok: string): [number, number, number, number] {
  if (tok.startsWith('#')) {
    let h = tok.slice(1)
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
  }
  const m = RGBA.exec(tok)!
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  return [Number(m[1]), Number(m[2]), Number(m[3]), a]
}

function fmt(r: number, g: number, b: number, a: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  if (a >= 0.999) return '#' + [r, g, b].map((v) => c(v).toString(16).padStart(2, '0')).join('')
  return `rgba(${c(r)},${c(g)},${c(b)},${String(Math.round(a * 1000) / 1000)})`
}

function toHls(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, l, 0]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, l, s]
}

function fromHls(h: number, l: number, s: number): [number, number, number] {
  h /= 360
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}

function family(r: number, g: number, b: number) {
  const [h, l, s] = toHls(r, g, b)
  if (h >= 62 && h <= 204 && s >= 0.12 && l >= 0.04 && l <= 0.985) return { fam: 'accent', h, l, s }
  if (h >= 62 && h <= 204 && s >= 0.03 && s < 0.12 && l < 0.3) return { fam: 'neutral', h, l, s }
  if ((h <= 50 || h >= 330) && s >= 0.02 && s <= 0.4 && l <= 0.5) return { fam: 'surface', h, l, s }
  return { fam: '', h, l, s }
}

export function oledColor(tok: string) {
  const [r, g, b, a] = parse(tok)
  const { fam, l, s } = family(r, g, b)
  if (fam === 'neutral' || fam === 'surface') return fmt(l * 0.28 * 255, l * 0.28 * 255, l * 0.28 * 255, a)
  if (fam === 'accent') {
    if (l >= 0.42 && l <= 0.8 && s >= 0.35) {
      const n = (i: number) => parseInt(OLED_ACCENT.slice(i, i + 2), 16)
      return fmt(n(1), n(3), n(5), a)
    }
    const [r2, g2, b2] = fromHls(60, l, s)
    return fmt(r2, g2, b2, a)
  }
  return tok
}

// kind: 'fill' darkens neutral dark greys to near-black; 'line' (borders, outlines) turns faint greys and whites into a yellow tint.
export function oledColorFor(tok: string, kind: 'fill' | 'line' | 'other') {
  const mapped = oledColor(tok)
  if (mapped !== tok || kind === 'other') return mapped
  const [r, g, b, a] = parse(tok)
  const [, l, s] = toHls(r, g, b)
  if (kind === 'fill' && s < 0.04 && l > 0.02 && l < 0.3) { const v = l * 0.25 * 255; return fmt(v, v, v, a) }
  if (kind === 'line' && s < 0.2 && l > 0.03) {
    if (l >= 0.6 && a <= 0.3) return 'rgba(203,203,19,0.3)'
    if (s < 0.06 && l < 0.45 && a >= 0.5) return 'rgba(203,203,19,0.34)'
  }
  return tok
}

export const oledRecolor = (text: string) => text.replace(COLOR_TOKEN, (m) => oledColor(m))

// OLED look: recolour the bundled <img src=*.svg> icons at runtime (CSS cannot reach inside an <img>).
// Classic restores the original sources. Cheap: icons are tiny and results are cached.
import { oledRecolor } from './oledColor.ts'

const toDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`
const cache = new Map<string, string>()
const isSvg = (src: string) => /^data:image\/svg\+xml/.test(src) || /\.svg(?:[?#].*)?$/.test(src)

function decode(src: string) {
  const comma = src.indexOf(',')
  const head = src.slice(0, comma), body = src.slice(comma + 1)
  return head.includes(';base64') ? atob(body) : decodeURIComponent(body)
}

async function recolored(src: string): Promise<string> {
  const hit = cache.get(src)
  if (hit) return hit
  const text = src.startsWith('data:') ? decode(src) : await (await fetch(src)).text()
  const out = toDataUri(oledRecolor(text))
  cache.set(src, out)
  return out
}

const oledOn = () => document.documentElement.dataset.look === 'oled' && document.documentElement.dataset.theme !== 'light'

function process(img: HTMLImageElement) {
  const cur = img.getAttribute('src') ?? ''
  const mine = img.dataset.oledOut !== undefined && img.dataset.oledOut === cur
  if (!oledOn()) {
    if (mine && img.dataset.oledSrc) img.setAttribute('src', img.dataset.oledSrc)
    delete img.dataset.oledSrc
    delete img.dataset.oledOut
    return
  }
  if (mine || !isSvg(cur)) return
  const cached = cache.get(cur)
  const apply = (out: string) => {
    if (img.getAttribute('src') !== cur || !oledOn()) return
    img.dataset.oledSrc = cur
    img.dataset.oledOut = out
    img.setAttribute('src', out)
  }
  if (cached) apply(cached)
  else recolored(cur).then(apply).catch(() => undefined)
}

const sweep = (root: ParentNode = document) => root.querySelectorAll('img').forEach((img) => process(img as HTMLImageElement))

export function installOledIcons() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
  const start = () => {
    sweep()
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' && r.target === document.documentElement) { sweep(); return }
        if (r.type === 'attributes' && r.target instanceof HTMLImageElement) process(r.target)
        r.addedNodes.forEach((n) => {
          if (n instanceof HTMLImageElement) process(n)
          else if (n instanceof Element) sweep(n)
        })
      }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'data-look', 'data-theme'] })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}

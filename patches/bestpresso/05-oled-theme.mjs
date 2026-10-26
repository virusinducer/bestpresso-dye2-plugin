import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { replaceOnce } from '../../scripts/lib/patch.mjs'

// Settings > Appearance > "Look": Classic (stock green) or OLED (jet black, #cbcb13 accent).
// Classic is the untouched upstream CSS. OLED is a full recoloured copy of the built CSS, generated after `vite build`
// (assets/skin/oled-postbuild.mjs). The default is OLED.
//
// To switch this off, delete this file and assets/skin/oled*. Nothing else depends on it.
export function apply({ root, repoRoot }) {
  const asset = (n) => join(repoRoot, 'assets', 'skin', n)
  const settings = join(root, 'src', 'features', 'settings')
  copyFileSync(asset('oledColor.ts'), join(settings, 'oledColor.ts'))
  copyFileSync(asset('oledIcons.ts'), join(settings, 'oledIcons.ts'))
  mkdirSync(join(root, 'scripts'), { recursive: true })
  for (const n of ['oled-postbuild.mjs', 'oled-extra.css']) copyFileSync(asset(n), join(root, 'scripts', n))

  // Build step: append the overlay once vite has written the final CSS.
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (pkg.scripts.build !== 'tsc -b && vite build') throw new Error(`unexpected build script: ${pkg.scripts.build}`)
  pkg.scripts.build = 'tsc -b && vite build && node --experimental-strip-types scripts/oled-postbuild.mjs'
  writeFileSync(join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)

  // Preference.
  const prefs = join(settings, 'bestpressoPreferences.ts')
  replaceOnce(prefs, "  theme: 'dark' | 'light'\n", "  theme: 'dark' | 'light'\n  look: 'classic' | 'oled'\n", 'pref type')
  replaceOnce(prefs, "  theme: 'dark',\n  completionSoundEnabled: true,", "  theme: 'dark',\n  look: 'oled',\n  completionSoundEnabled: true,", 'pref default')
  replaceOnce(prefs, "    theme: candidate.theme === 'light' ? 'light' : 'dark',\n", "    theme: candidate.theme === 'light' ? 'light' : 'dark',\n    look: candidate.look === 'classic' ? 'classic' : 'oled',\n", 'pref normalize')
  replaceOnce(
    prefs,
    "    document.documentElement.dataset.theme = preferences.theme\n",
    "    document.documentElement.dataset.theme = preferences.theme\n    document.documentElement.dataset.look = preferences.look\n    syncLookSheets(preferences)\n",
    'pref apply',
  )
  replaceOnce(
    prefs,
    'export function applyBestpressoPreferences(',
    "// Classic and OLED are two stylesheets (see scripts/oled-postbuild.mjs); exactly one is enabled.\nfunction syncLookSheets(preferences: BestpressoPreferences) {\n  if (typeof document.getElementById !== 'function') return\n  const oled = preferences.look === 'oled' && preferences.theme !== 'light'\n  const on = document.getElementById('oled-css') as HTMLLinkElement | null\n  const off = document.getElementById('classic-css') as HTMLLinkElement | null\n  if (on) on.disabled = !oled\n  if (off) off.disabled = oled\n}\n\nexport function applyBestpressoPreferences(",
    'sheet sync',
  )
  replaceOnce(
    prefs,
    "preferences.theme === 'light' ? '#f4f5ef' : '#171717'",
    "preferences.theme === 'light' ? '#f4f5ef' : preferences.look === 'oled' ? '#000000' : '#171717'",
    'theme-color',
  )

  // Upstream's preference tests compare whole objects: the new key joins the expectations.
  replaceOnce(
    join(root, 'test', 'bestpressoPreferences.test.ts'),
    "    theme: 'dark',\n",
    "    theme: 'dark',\n    look: 'oled',\n",
    'preference test expectation',
  )

  // Settings control, right after the Bestpresso theme selector.
  replaceOnce(
    join(settings, 'SettingsScreen.tsx'),
    "onChange={(value) => updatePreferences({ theme: value === 'light' ? 'light' : 'dark' })} />",
    "onChange={(value) => updatePreferences({ theme: value === 'light' ? 'light' : 'dark' })} /><SelectSetting label=\"Look\" hint=\"Classic keeps the stock green. OLED is pure black with a yellow accent (dark theme only).\" value={preferences.look} options={[{ value: 'classic', label: 'Classic' }, { value: 'oled', label: 'OLED' }]} onChange={(value) => updatePreferences({ look: value === 'classic' ? 'classic' : 'oled' })} />",
    'settings look select',
  )

  // Runtime icon recolour.
  const main = join(root, 'src', 'main.tsx')
  replaceOnce(main, "import { applyBestpressoPreferences } from './features/settings/bestpressoPreferences.ts'", "import { applyBestpressoPreferences } from './features/settings/bestpressoPreferences.ts'\nimport { installOledIcons } from './features/settings/oledIcons.ts'", 'main import')
  const text = readFileSync(main, 'utf8')
  const call = text.match(/^applyBestpressoPreferences\(\)\s*$/m)
  if (!call) throw new Error('main.tsx: applyBestpressoPreferences() call not found')
  writeFileSync(main, text.replace(call[0], `${call[0]}\ninstallOledIcons()`))
}

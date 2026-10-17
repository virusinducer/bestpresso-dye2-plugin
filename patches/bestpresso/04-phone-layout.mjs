import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { replaceOnce } from '../../scripts/lib/patch.mjs'

// Phone layouts (portrait and landscape, one screen, compact mode). Every rule in phone.css sits
// inside a media query that only phones match (portrait width <= 520px, landscape height <= 500px),
// so iPad and other tablets keep the stock layout.
//
// To switch this off, delete this file (and assets/skin/phone.css). Nothing else depends on it.
export function apply({ root, repoRoot }) {
  copyFileSync(join(repoRoot, 'assets', 'skin', 'phone.css'), join(root, 'src', 'styles', 'phone.css'))
  replaceOnce(
    join(root, 'src', 'App.tsx'),
    "import './styles/homeAnimations.css'",
    "import './styles/homeAnimations.css'\nimport './styles/phone.css'",
    'homeAnimations import',
  )
  // Let env(safe-area-inset-*) report the notch / Dynamic Island so phone.css can keep clear of it.
  replaceOnce(
    join(root, 'index.html'),
    'content="width=device-width, initial-scale=1.0"',
    'content="width=device-width, initial-scale=1.0, viewport-fit=cover"',
    'viewport meta',
  )
}

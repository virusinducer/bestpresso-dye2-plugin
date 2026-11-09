import { join } from 'node:path'
import { replaceOnce } from '../../scripts/lib/patch.mjs'

// Let env(safe-area-inset-*) report the notch / Dynamic Island and the home indicator. Without
// viewport-fit=cover the inset is always 0 in the app's web view, so bp-phone.js (which reads it to keep
// the page clear of the camera pill and the screen edge) had nothing to work with and content ran under both.
// The stock fit ignores the insets, so tablets and desktops are unaffected.
//
// To switch this off, delete this file.
export function apply({ root }) {
  replaceOnce(
    join(root, 'dye2-plugin', 'src', 'utils', 'dev-shell.ts'),
    'content="width=device-width, initial-scale=1, interactive-widget=overlays-content"',
    'content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content"',
    'viewport meta',
  )
}

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { editJson, replaceOnce } from '../../scripts/lib/patch.mjs'

// Log endpoint for the DiFluid R2 flow (07-r2-tds.mjs): serves /plugins/dye2.reaplugin/r2-log from
// assets/plugin/r2-log.ts. The Edit Shot page posts its R2 events there; the plugin keeps the last 300 lines and
// mirrors them into Decaid's log. Needs 02-button-endpoint.mjs to have run first (it adds the import anchor).
//
// To switch this off, delete this file. The page then just fails to post its log lines, which it ignores.
export function apply({ root, repoRoot }) {
  const src = join(root, 'dye2-plugin', 'src')
  writeFileSync(join(src, 'utils', 'r2-log.ts'), readFileSync(join(repoRoot, 'assets', 'plugin', 'r2-log.ts'), 'utf8'))

  editJson(join(root, 'dye2-plugin', 'manifest.src.json'), (manifest) => {
    manifest.api.push({ id: 'r2-log', type: 'http', data: {} })
  })

  const plugin = join(src, 'plugin.ts')
  replaceOnce(
    plugin,
    'import { renderBestpressoButton } from "./utils/bestpresso-button";\n',
    'import { renderBestpressoButton } from "./utils/bestpresso-button";\nimport { handleR2Log } from "./utils/r2-log";\n',
    'bestpresso-button import',
  )
  replaceOnce(
    plugin,
    '        case "bestpresso-button":\n          return renderBestpressoButton(request);\n',
    '        case "bestpresso-button":\n          return renderBestpressoButton(request);\n\n        case "r2-log":\n          return handleR2Log(request, (message) => host.log(message));\n',
    'bestpresso-button case',
  )
}

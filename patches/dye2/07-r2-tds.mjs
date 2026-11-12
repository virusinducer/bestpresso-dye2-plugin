import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { replaceOnce } from '../../scripts/lib/patch.mjs'

// DiFluid R2 on DYE2's Edit Shot page: a Find R2 / Read R2 button under the TDS and EY steppers.
// Find R2 scans, connects and confirms the refractometer; Read R2 starts a test and fills TDS and EY
// (EY = TDS x drink / dose) on the shot being edited, which opens on the most recent shot.
// Logic lives in assets/dye2/r2-tds.js. It works through Decaid's own device and sensor API, so it needs the
// R2 to be connected in Decaid (native driver or the difluid-r2 plugin).
//
// To switch this off, delete this file.
export function apply({ root, repoRoot }) {
  const file = join(root, 'dye2-plugin', 'src', 'pages', 'edit-shot.ts')
  const js = readFileSync(join(repoRoot, 'assets', 'dye2', 'r2-tds.js'), 'utf8')
  // The page script is a template literal, so the inserted code must not contain these.
  for (const bad of ['`', '${', '\\']) {
    if (js.includes(bad)) throw new Error(`assets/dye2/r2-tds.js contains ${JSON.stringify(bad)}, which breaks the page-script template`)
  }

  // 1. Button and status line, as their own row under TDS / EY (wraps cleanly on a phone).
  replaceOnce(
    file,
    `        \${stepperHtml('es-ey', 'EY', '80px')}
      </div>
`,
    `        \${stepperHtml('es-ey', 'EY', '80px')}
      </div>
      <div class="flex items-center gap-[20px]" style="flex-wrap:wrap">
        <button id="es-r2-btn" style="background:var(--mimoja-blue);color:#fff;border:none;border-radius:23px;height:54px;padding:0 24px;font-family:'Inter',sans-serif;font-weight:600;font-size:21px;cursor:pointer;white-space:nowrap">Find R2</button>
        <div id="es-r2-status" style="font-family:'Inter',sans-serif;font-size:18px;color:var(--text-primary);flex:1;min-width:160px"></div>
      </div>
`,
    'TDS/EY row',
  )

  // 2. The R2 logic, ahead of setupControls().
  replaceOnce(file, 'function setupControls() {\n', `${js}\nfunction setupControls() {\n`, 'setupControls')

  // 3. Wire it up.
  replaceOnce(file, '  // Shot nav\n', '  r2Init();\n  // Shot nav\n', 'shot nav comment')
}

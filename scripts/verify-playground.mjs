/**
 * Fails the build if the library's stylesheet did not make it into the
 * playground bundle.
 *
 * This is not hypothetical. `"sideEffects": ["*.css"]` in package.json marked
 * every non-matching file side-effect free, and Vite's CSS module ids did not
 * match the glob — so `import './style.css'` inside the library entry was tree
 * shaken away and the deployed page rendered completely unstyled. Nothing
 * failed: the build was green, the page returned 200, the components mounted
 * and the console was clean.
 *
 * Which is the point. "No errors" is not a test that the styles arrived.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ASSETS = join('playground', 'dist', 'assets')

/* Rules from three different parts of the stylesheet, so a partial emit is
   caught as well as a missing one. */
const REQUIRED = ['.vtcp-tray', '.vtcp-surface', 'vtcp-burst-in']

const css = readdirSync(ASSETS)
  .filter(name => name.endsWith('.css'))
  .map(name => readFileSync(join(ASSETS, name), 'utf8'))
  .join('\n')

const missing = REQUIRED.filter(rule => !css.includes(rule))

if (missing.length > 0) {
  console.error(
    `\nThe playground bundle is missing the library stylesheet.\n`
    + `Not found in any emitted css: ${missing.join(', ')}\n\n`
    + `The page will render unstyled. Check that nothing has re-introduced a\n`
    + `\`sideEffects\` field that lets the bundler drop the entry's css import.\n`,
  )
  process.exit(1)
}

console.log(`playground css verified — ${REQUIRED.length} library rules present`)

/**
 * Guards the emitted declarations against the one packaging bug this project
 * cannot see from the inside.
 *
 * Under `moduleResolution: node16`/`nodenext` a relative specifier must carry an
 * explicit extension, and `./Foo.vue` is not one TypeScript will try. Get either
 * wrong and a consumer on those settings resolves nothing — but only if they
 * also set `skipLibCheck: false`, which almost nobody does. With it on, the
 * errors disappear and every export silently becomes `any`. Our own `vue-tsc`
 * runs on the sources under `bundler` resolution, so it stays green throughout.
 *
 * Cheap structural check rather than a real install: pack-and-typecheck costs
 * half a minute, and every way of getting this wrong shows up in the specifiers.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist', import.meta.url))

const files = readdirSync(dist).filter(name => name.endsWith('.d.ts'))
if (files.length === 0) {
  console.error('check-dts: no declarations in dist/ — run `pnpm build` first.')
  process.exit(1)
}

const RELATIVE = /\bfrom\s+'(\.\.?\/[^']+)'/g
const problems = []

for (const name of files) {
  const content = readFileSync(`${dist}/${name}`, 'utf8')
  for (const [, specifier] of content.matchAll(RELATIVE)) {
    if (specifier.endsWith('.vue')) {
      problems.push(`${name}: '${specifier}' — node16/nodenext will not resolve a .vue specifier`)
    }
    else if (!/\.[cm]?js$/.test(specifier)) {
      problems.push(`${name}: '${specifier}' — needs an explicit .js extension`)
    }
  }
}

if (problems.length > 0) {
  console.error(`check-dts: ${problems.length} unresolvable specifier(s):`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(`check-dts: ${files.length} declaration files, all specifiers resolvable.`)

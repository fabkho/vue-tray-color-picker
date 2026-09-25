import { fileURLToPath } from 'node:url'
import { playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
// Vitest 4 no longer augments Vite's own config type, so `test` needs this one.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
    // Declaration maps are worth having locally, but only `dist` is published,
    // so shipped ones would point at sources the consumer never receives.
    /**
     * Two separate things stop a `node16`/`nodenext` consumer from resolving
     * these declarations, and both fail silently — under the near-universal
     * `skipLibCheck` the errors vanish and every export becomes `any`.
     *
     * `cleanVueFileName` handles the first: `ColorPicker.vue.d.ts` is only
     * findable by a resolver willing to try the bare `.vue` specifier, which
     * that mode is not. It emits `ColorPicker.d.ts` instead.
     *
     * That leaves the specifier extensionless, which the same mode also
     * rejects. The `.ts` sources say `./color.js` for exactly this reason, but
     * the ones `cleanVueFileName` rewrites cannot, so they are patched here.
     */
    dts({
      include: ['src'],
      tsconfigPath: './tsconfig.json',
      cleanVueFileName: true,
      compilerOptions: { declarationMap: false },
      beforeWriteFile: (filePath, content) => ({
        filePath,
        content: content.replace(
          /(\bfrom\s+'\.\.?\/[^']+)'/g,
          (whole, specifier) => (/\.[cm]?js$/.test(specifier) ? whole : `${specifier}.js'`),
        ),
      }),
    }),
  ],
  build: {
    // One stylesheet, imported explicitly by the consumer — never injected, so
    // load order stays theirs to control.
    cssCodeSplit: false,
    // tsconfig's `sourceMap` never reaches the bundler; this is what emits .js.map.
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // @floating-ui is a real dependency, not a vendored one — bundling it would
      // hand consumers a second copy alongside the one npm already installs.
      external: ['vue', /^@floating-ui\//],
      output: {
        assetFileNames: assetInfo =>
          assetInfo.names?.some(name => name.endsWith('.css')) ? 'style.css' : '[name][extname]',
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts'],
          setupFiles: ['tests/browser/setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            // A failing assertion is already legible from its message; the PNGs
            // only ever accumulated as untracked debris.
            screenshotFailures: false,
          },
        },
      },
    ],
  },
})

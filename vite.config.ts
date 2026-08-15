import { fileURLToPath } from 'node:url'
import { playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
// Vitest 4 no longer augments Vite's own config type, so `test` needs this one.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
    dts({ include: ['src'], tsconfigPath: './tsconfig.json' }),
  ],
  build: {
    // One stylesheet, imported explicitly by the consumer — never injected, so
    // load order stays theirs to control.
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue'],
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
          },
        },
      },
    ],
  },
})

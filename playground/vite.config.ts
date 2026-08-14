import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Point at source, not dist: the playground is the development surface and
      // must reflect edits without a rebuild.
      'vue-tray-color-picker': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
})

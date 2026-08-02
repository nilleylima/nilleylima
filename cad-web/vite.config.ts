import { defineConfig } from 'vitest/config'
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

function copyWasmPlugin() {
  return {
    name: 'copy-libredwg-wasm',
    buildStart() {
      const srcDir = resolve(rootDir, 'node_modules/@mlightcad/libredwg-web/wasm')
      const destDir = resolve(rootDir, 'public/wasm')
      if (!existsSync(srcDir)) return
      mkdirSync(destDir, { recursive: true })
      for (const file of ['libredwg-web.wasm', 'libredwg-web.js']) {
        const from = resolve(srcDir, file)
        if (existsSync(from)) cpSync(from, resolve(destDir, file))
      }
    },
  }
}

export default defineConfig({
  plugins: [copyWasmPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['@mlightcad/libredwg-web'],
  },
  assetsInclude: ['**/*.wasm'],
  test: {
    environment: 'node',
    testTimeout: 30000,
  },
})

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = resolve(root, 'node_modules/@mlightcad/libredwg-web/wasm')
const destDir = resolve(root, 'public/wasm')

if (!existsSync(srcDir)) {
  console.warn('[copy-wasm] LibreDWG wasm not found — skip')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
for (const file of ['libredwg-web.wasm', 'libredwg-web.js']) {
  cpSync(resolve(srcDir, file), resolve(destDir, file))
}
console.log('[copy-wasm] LibreDWG wasm copied to public/wasm')

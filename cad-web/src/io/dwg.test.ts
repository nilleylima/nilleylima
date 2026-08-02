import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { importDwg } from './dwg'

describe('dwg import', () => {
  it('imports a LibreDWG sample circle.dwg', async () => {
    const buffer = readFileSync('/tmp/sample.dwg')
    const result = await importDwg(buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ))
    expect(result.stats.imported).toBeGreaterThan(0)
    expect(result.document.entities.some((e) => e.type === 'circle')).toBe(true)
  }, 60000)
})

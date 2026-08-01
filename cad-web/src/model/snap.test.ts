import { describe, expect, it } from 'vitest'
import { resolveSnap } from './snap'
import type { Entity, SnapMode } from './types'

const mode: SnapMode = {
  endpoint: true,
  midpoint: true,
  center: true,
  intersection: true,
  nearest: false,
  grid: true,
}

describe('resolveSnap', () => {
  it('prefers endpoints', () => {
    const entities: Entity[] = [
      {
        id: '1',
        type: 'line',
        layerId: '0',
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
      },
    ]
    const snap = resolveSnap({ x: 2, y: 1 }, entities, mode, 5, 10)
    expect(snap?.kind).toBe('endpoint')
    expect(snap?.point).toEqual({ x: 0, y: 0 })
  })

  it('snaps to grid when nothing closer', () => {
    const snap = resolveSnap({ x: 14, y: 16 }, [], mode, 8, 10)
    expect(snap?.kind).toBe('grid')
    expect(snap?.point).toEqual({ x: 10, y: 20 })
  })
})

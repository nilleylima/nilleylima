import { describe, expect, it } from 'vitest'
import {
  angleInArc,
  dist,
  distToSegment,
  hitTestEntity,
  segmentsIntersect,
  snapOrtho,
  snapToGrid,
} from './math'

describe('math helpers', () => {
  it('computes distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('snaps orthogonally', () => {
    expect(snapOrtho({ x: 0, y: 0 }, { x: 10, y: 3 })).toEqual({ x: 10, y: 0 })
    expect(snapOrtho({ x: 0, y: 0 }, { x: 2, y: 9 })).toEqual({ x: 0, y: 9 })
  })

  it('snaps to grid', () => {
    expect(snapToGrid({ x: 12, y: 18 }, 10)).toEqual({ x: 10, y: 20 })
  })

  it('finds segment intersection', () => {
    const hit = segmentsIntersect(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    )
    expect(hit?.x).toBeCloseTo(5)
    expect(hit?.y).toBeCloseTo(5)
  })

  it('measures distance to segment', () => {
    expect(distToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5)
  })

  it('hit tests a circle rim', () => {
    const ok = hitTestEntity(
      {
        id: '1',
        type: 'circle',
        layerId: '0',
        center: { x: 0, y: 0 },
        radius: 10,
      },
      { x: 10, y: 0 },
      1,
    )
    expect(ok).toBe(true)
  })

  it('checks arc angle containment', () => {
    expect(angleInArc(0, -Math.PI / 2, Math.PI / 2)).toBe(true)
    expect(angleInArc(Math.PI, -Math.PI / 2, Math.PI / 2)).toBe(false)
  })
})

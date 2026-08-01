import type { Entity, SnapMode, Vec2 } from './types'
import {
  dist,
  entitySegments,
  mid,
  nearestOnSegment,
  segmentsIntersect,
  snapToGrid,
} from './math'

export type SnapKind =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'intersection'
  | 'nearest'
  | 'grid'

export type SnapResult = {
  point: Vec2
  kind: SnapKind
  distance: number
}

const PRIORITY: SnapKind[] = [
  'endpoint',
  'intersection',
  'midpoint',
  'center',
  'nearest',
  'grid',
]

function candidatesFromEntity(entity: Entity, mode: SnapMode): Array<{
  point: Vec2
  kind: SnapKind
}> {
  const out: Array<{ point: Vec2; kind: SnapKind }> = []
  switch (entity.type) {
    case 'line':
      if (mode.endpoint) {
        out.push({ point: entity.a, kind: 'endpoint' })
        out.push({ point: entity.b, kind: 'endpoint' })
      }
      if (mode.midpoint) out.push({ point: mid(entity.a, entity.b), kind: 'midpoint' })
      break
    case 'rect': {
      const minX = Math.min(entity.a.x, entity.b.x)
      const maxX = Math.max(entity.a.x, entity.b.x)
      const minY = Math.min(entity.a.y, entity.b.y)
      const maxY = Math.max(entity.a.y, entity.b.y)
      const corners = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ]
      if (mode.endpoint) {
        for (const c of corners) out.push({ point: c, kind: 'endpoint' })
      }
      if (mode.midpoint) {
        out.push({ point: mid(corners[0], corners[1]), kind: 'midpoint' })
        out.push({ point: mid(corners[1], corners[2]), kind: 'midpoint' })
        out.push({ point: mid(corners[2], corners[3]), kind: 'midpoint' })
        out.push({ point: mid(corners[3], corners[0]), kind: 'midpoint' })
      }
      if (mode.center) {
        out.push({
          point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
          kind: 'center',
        })
      }
      break
    }
    case 'polyline':
      if (mode.endpoint) {
        for (const p of entity.points) out.push({ point: p, kind: 'endpoint' })
      }
      if (mode.midpoint) {
        for (let i = 0; i < entity.points.length - 1; i++) {
          out.push({
            point: mid(entity.points[i], entity.points[i + 1]),
            kind: 'midpoint',
          })
        }
      }
      break
    case 'circle':
    case 'arc':
      if (mode.center) out.push({ point: entity.center, kind: 'center' })
      if (mode.endpoint && entity.type === 'arc') {
        out.push({
          point: {
            x: entity.center.x + Math.cos(entity.startAngle) * entity.radius,
            y: entity.center.y + Math.sin(entity.startAngle) * entity.radius,
          },
          kind: 'endpoint',
        })
        out.push({
          point: {
            x: entity.center.x + Math.cos(entity.endAngle) * entity.radius,
            y: entity.center.y + Math.sin(entity.endAngle) * entity.radius,
          },
          kind: 'endpoint',
        })
      }
      break
  }
  return out
}

function intersectionCandidates(entities: Entity[]): Vec2[] {
  const segs: Array<[Vec2, Vec2]> = []
  for (const e of entities) segs.push(...entitySegments(e))
  const points: Vec2[] = []
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const hit = segmentsIntersect(segs[i][0], segs[i][1], segs[j][0], segs[j][1])
      if (hit) points.push(hit)
    }
  }
  return points
}

function nearestCandidates(entities: Entity[], cursor: Vec2): Vec2[] {
  const points: Vec2[] = []
  for (const e of entities) {
    for (const [a, b] of entitySegments(e)) {
      points.push(nearestOnSegment(cursor, a, b))
    }
    if (e.type === 'circle' || e.type === 'arc') {
      const ang = Math.atan2(cursor.y - e.center.y, cursor.x - e.center.x)
      points.push({
        x: e.center.x + Math.cos(ang) * e.radius,
        y: e.center.y + Math.sin(ang) * e.radius,
      })
    }
  }
  return points
}

export function resolveSnap(
  cursor: Vec2,
  entities: Entity[],
  mode: SnapMode,
  tolerance: number,
  gridSize: number,
): SnapResult | null {
  const candidates: SnapResult[] = []

  for (const e of entities) {
    for (const c of candidatesFromEntity(e, mode)) {
      const d = dist(cursor, c.point)
      if (d <= tolerance) candidates.push({ ...c, distance: d })
    }
  }

  if (mode.intersection) {
    for (const p of intersectionCandidates(entities)) {
      const d = dist(cursor, p)
      if (d <= tolerance) {
        candidates.push({ point: p, kind: 'intersection', distance: d })
      }
    }
  }

  if (mode.nearest) {
    for (const p of nearestCandidates(entities, cursor)) {
      const d = dist(cursor, p)
      if (d <= tolerance) {
        candidates.push({ point: p, kind: 'nearest', distance: d })
      }
    }
  }

  if (mode.grid) {
    const g = snapToGrid(cursor, gridSize)
    const d = dist(cursor, g)
    if (d <= tolerance) {
      candidates.push({ point: g, kind: 'grid', distance: d })
    }
  }

  if (!candidates.length) return null

  candidates.sort((a, b) => {
    const pa = PRIORITY.indexOf(a.kind)
    const pb = PRIORITY.indexOf(b.kind)
    if (pa !== pb) return pa - pb
    return a.distance - b.distance
  })

  return candidates[0]
}

import type { Vec2, Entity, DimensionEntity } from './types'

export const EPS = 1e-9

export function v(x: number, y: number): Vec2 {
  return { x, y }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function mul(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s }
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y)
}

export function normalize(a: Vec2): Vec2 {
  const l = length(a)
  if (l < EPS) return { x: 0, y: 0 }
  return { x: a.x / l, y: a.y / l }
}

export function mid(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function angle(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function snapOrtho(origin: Vec2, point: Vec2): Vec2 {
  const dx = Math.abs(point.x - origin.x)
  const dy = Math.abs(point.y - origin.y)
  if (dx >= dy) return { x: point.x, y: origin.y }
  return { x: origin.x, y: point.y }
}

export function snapToGrid(point: Vec2, grid: number): Vec2 {
  if (grid <= 0) return point
  return {
    x: Math.round(point.x / grid) * grid,
    y: Math.round(point.y / grid) * grid,
  }
}

export function pointNearSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2,
  tolerance: number,
): boolean {
  return distToSegment(p, a, b) <= tolerance
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a)
  const ap = sub(p, a)
  const len2 = ab.x * ab.x + ab.y * ab.y
  if (len2 < EPS) return dist(p, a)
  let t = (ap.x * ab.x + ap.y * ab.y) / len2
  t = Math.max(0, Math.min(1, t))
  return dist(p, lerp(a, b, t))
}

export function nearestOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a)
  const ap = sub(p, a)
  const len2 = ab.x * ab.x + ab.y * ab.y
  if (len2 < EPS) return { ...a }
  let t = (ap.x * ab.x + ap.y * ab.y) / len2
  t = Math.max(0, Math.min(1, t))
  return lerp(a, b, t)
}

export function segmentsIntersect(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
): Vec2 | null {
  const dax = a2.x - a1.x
  const day = a2.y - a1.y
  const dbx = b2.x - b1.x
  const dby = b2.y - b1.y
  const den = dax * dby - day * dbx
  if (Math.abs(den) < EPS) return null
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / den
  const u = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / den
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null
  return { x: a1.x + t * dax, y: a1.y + t * day }
}

export type DimensionLayout = {
  a: Vec2
  b: Vec2
  d1: Vec2
  d2: Vec2
  text: Vec2
  length: number
  angle: number
}

export function dimensionLayout(dim: DimensionEntity): DimensionLayout {
  const dir = normalize(sub(dim.b, dim.a))
  const normal = { x: -dir.y, y: dir.x }
  const d1 = add(dim.a, mul(normal, dim.offset))
  const d2 = add(dim.b, mul(normal, dim.offset))
  return {
    a: dim.a,
    b: dim.b,
    d1,
    d2,
    text: mid(d1, d2),
    length: dist(dim.a, dim.b),
    angle: angle(dim.a, dim.b),
  }
}

export function offsetFromPoint(a: Vec2, b: Vec2, point: Vec2): number {
  const dir = normalize(sub(b, a))
  const normal = { x: -dir.y, y: dir.x }
  return (point.x - a.x) * normal.x + (point.y - a.y) * normal.y
}

export function dimensionSegments(entity: DimensionEntity): Array<[Vec2, Vec2]> {
  const layout = dimensionLayout(entity)
  return [
    [layout.a, layout.d1],
    [layout.b, layout.d2],
    [layout.d1, layout.d2],
  ]
}

export function entitySegments(entity: Entity): Array<[Vec2, Vec2]> {
  switch (entity.type) {
    case 'line':
      return [[entity.a, entity.b]]
    case 'rect': {
      const minX = Math.min(entity.a.x, entity.b.x)
      const maxX = Math.max(entity.a.x, entity.b.x)
      const minY = Math.min(entity.a.y, entity.b.y)
      const maxY = Math.max(entity.a.y, entity.b.y)
      const p1 = v(minX, minY)
      const p2 = v(maxX, minY)
      const p3 = v(maxX, maxY)
      const p4 = v(minX, maxY)
      return [
        [p1, p2],
        [p2, p3],
        [p3, p4],
        [p4, p1],
      ]
    }
    case 'polyline': {
      const segs: Array<[Vec2, Vec2]> = []
      for (let i = 0; i < entity.points.length - 1; i++) {
        segs.push([entity.points[i], entity.points[i + 1]])
      }
      if (entity.closed && entity.points.length > 2) {
        segs.push([
          entity.points[entity.points.length - 1],
          entity.points[0],
        ])
      }
      return segs
    }
    case 'dimension':
      return dimensionSegments(entity)
    default:
      return []
  }
}

export function hitTestEntity(
  entity: Entity,
  point: Vec2,
  tolerance: number,
): boolean {
  switch (entity.type) {
    case 'line':
    case 'rect':
    case 'polyline':
    case 'dimension':
      return entitySegments(entity).some(([a, b]) =>
        pointNearSegment(point, a, b, tolerance),
      )
    case 'circle':
      return Math.abs(dist(point, entity.center) - entity.radius) <= tolerance
    case 'arc': {
      const d = dist(point, entity.center)
      if (Math.abs(d - entity.radius) > tolerance) return false
      const ang = Math.atan2(
        point.y - entity.center.y,
        point.x - entity.center.x,
      )
      return angleInArc(ang, entity.startAngle, entity.endAngle)
    }
    case 'block':
      return dist(point, entity.position) <= Math.max(tolerance, 8)
  }
}

function normalizeAngle(a: number): number {
  let x = a
  while (x < -Math.PI) x += Math.PI * 2
  while (x > Math.PI) x -= Math.PI * 2
  return x
}

export function angleInArc(angle: number, start: number, end: number): boolean {
  const a = normalizeAngle(angle)
  const s = normalizeAngle(start)
  const e = normalizeAngle(end)
  if (s <= e) return a >= s - EPS && a <= e + EPS
  return a >= s - EPS || a <= e + EPS
}

export function boundsOfEntity(entity: Entity): {
  min: Vec2
  max: Vec2
} | null {
  switch (entity.type) {
    case 'line':
    case 'dimension': {
      const pts =
        entity.type === 'dimension'
          ? dimensionSegments(entity).flat()
          : [entity.a, entity.b]
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const p of pts) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      return { min: v(minX, minY), max: v(maxX, maxY) }
    }
    case 'rect':
      return {
        min: v(Math.min(entity.a.x, entity.b.x), Math.min(entity.a.y, entity.b.y)),
        max: v(Math.max(entity.a.x, entity.b.x), Math.max(entity.a.y, entity.b.y)),
      }
    case 'polyline': {
      if (!entity.points.length) return null
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const p of entity.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      return { min: v(minX, minY), max: v(maxX, maxY) }
    }
    case 'circle':
    case 'arc':
      return {
        min: v(entity.center.x - entity.radius, entity.center.y - entity.radius),
        max: v(entity.center.x + entity.radius, entity.center.y + entity.radius),
      }
    case 'block':
      return {
        min: v(entity.position.x - 10, entity.position.y - 10),
        max: v(entity.position.x + 10, entity.position.y + 10),
      }
  }
}

export function formatLength(value: number, units: 'mm' | 'cm' | 'm'): string {
  const abs = Math.abs(value)
  if (units === 'm') return `${(abs / 1000).toFixed(3)} m`
  if (units === 'cm') return `${(abs / 10).toFixed(2)} cm`
  return `${abs.toFixed(2)} mm`
}

export function uid(prefix = 'e'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

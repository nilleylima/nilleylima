import type {
  BlockDefinition,
  BlockInsertEntity,
  DocumentData,
  Entity,
  PrimitiveEntity,
  Vec2,
} from './types'
import {
  dimensionLayout,
  offsetFromPoint,
  v,
} from './math'

export function transformLocalToWorld(
  point: Vec2,
  base: Vec2,
  insert: Pick<BlockInsertEntity, 'position' | 'rotation' | 'scale'>,
): Vec2 {
  const lx = (point.x - base.x) * insert.scale
  const ly = (point.y - base.y) * insert.scale
  const c = Math.cos(insert.rotation)
  const s = Math.sin(insert.rotation)
  return {
    x: insert.position.x + lx * c - ly * s,
    y: insert.position.y + lx * s + ly * c,
  }
}

function mapPrimitive(
  entity: PrimitiveEntity,
  mapPoint: (p: Vec2) => Vec2,
  mapRadius: (r: number) => number,
  mapAngle: (a: number) => number,
): PrimitiveEntity {
  switch (entity.type) {
    case 'line':
      return { ...entity, a: mapPoint(entity.a), b: mapPoint(entity.b) }
    case 'rect':
      return { ...entity, a: mapPoint(entity.a), b: mapPoint(entity.b) }
    case 'polyline':
      return { ...entity, points: entity.points.map(mapPoint) }
    case 'circle':
      return {
        ...entity,
        center: mapPoint(entity.center),
        radius: mapRadius(entity.radius),
      }
    case 'arc':
      return {
        ...entity,
        center: mapPoint(entity.center),
        radius: mapRadius(entity.radius),
        startAngle: mapAngle(entity.startAngle),
        endAngle: mapAngle(entity.endAngle),
      }
    case 'dimension':
      return {
        ...entity,
        a: mapPoint(entity.a),
        b: mapPoint(entity.b),
        offset: entity.offset * Math.abs(insertScaleSafe(mapRadius)),
      }
  }
}

function insertScaleSafe(mapRadius: (r: number) => number): number {
  const s = mapRadius(1)
  return s === 0 ? 1 : s
}

export function explodeBlockInsert(
  insert: BlockInsertEntity,
  block: BlockDefinition,
): PrimitiveEntity[] {
  const mapPoint = (p: Vec2) =>
    transformLocalToWorld(p, block.base, insert)
  const mapRadius = (r: number) => r * Math.abs(insert.scale)
  const mapAngle = (a: number) => a + insert.rotation
  return block.entities.map((e, i) => {
    const mapped = mapPrimitive(e, mapPoint, mapRadius, mapAngle)
    if (e.type === 'dimension' && mapped.type === 'dimension') {
      const layout = dimensionLayout(e)
      const wa = mapPoint(layout.a)
      const wb = mapPoint(layout.b)
      const wd1 = mapPoint(layout.d1)
      mapped.a = wa
      mapped.b = wb
      mapped.offset = offsetFromPoint(wa, wb, wd1)
    }
    return { ...mapped, id: `${insert.id}__${e.id || i}` }
  })
}

export function expandEntities(
  entities: Entity[],
  blocks: BlockDefinition[],
): PrimitiveEntity[] {
  const blockMap = new Map(blocks.map((b) => [b.id, b]))
  const out: PrimitiveEntity[] = []
  for (const e of entities) {
    if (e.type === 'block') {
      const def = blockMap.get(e.blockId)
      if (def) out.push(...explodeBlockInsert(e, def))
    } else {
      out.push(e)
    }
  }
  return out
}

export function translateEntity(entity: Entity, dx: number, dy: number): Entity {
  const t = (p: Vec2): Vec2 => ({ x: p.x + dx, y: p.y + dy })
  switch (entity.type) {
    case 'line':
      return { ...entity, a: t(entity.a), b: t(entity.b) }
    case 'rect':
      return { ...entity, a: t(entity.a), b: t(entity.b) }
    case 'circle':
    case 'arc':
      return { ...entity, center: t(entity.center) }
    case 'polyline':
      return { ...entity, points: entity.points.map(t) }
    case 'dimension':
      return { ...entity, a: t(entity.a), b: t(entity.b) }
    case 'block':
      return { ...entity, position: t(entity.position) }
  }
}

export function centroidOfEntities(entities: Entity[]): Vec2 {
  let n = 0
  let x = 0
  let y = 0
  for (const e of entities) {
    if (e.type === 'line' || e.type === 'rect' || e.type === 'dimension') {
      x += (e.a.x + e.b.x) / 2
      y += (e.a.y + e.b.y) / 2
      n++
    } else if (e.type === 'circle' || e.type === 'arc') {
      x += e.center.x
      y += e.center.y
      n++
    } else if (e.type === 'polyline' && e.points.length) {
      for (const p of e.points) {
        x += p.x
        y += p.y
        n++
      }
    } else if (e.type === 'block') {
      x += e.position.x
      y += e.position.y
      n++
    }
  }
  if (!n) return v(0, 0)
  return v(x / n, y / n)
}

export function getBlock(doc: DocumentData, id: string): BlockDefinition | undefined {
  return doc.blocks.find((b) => b.id === id)
}

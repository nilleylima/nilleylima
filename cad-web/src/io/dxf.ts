import { createDefaultDocument } from '../model/document'
import { expandEntities } from '../model/geometry'
import { dimensionLayout, uid } from '../model/math'
import type {
  DocumentData,
  Entity,
  Layer,
  PrimitiveEntity,
  Vec2,
} from '../model/types'

type Pair = { code: number; value: string }

function pairsFromText(text: string): Pair[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const pairs: Pair[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim())
    if (Number.isNaN(code)) continue
    pairs.push({ code, value: lines[i + 1] ?? '' })
  }
  return pairs
}

function layerName(doc: DocumentData, layerId: string): string {
  return doc.layers.find((l) => l.id === layerId)?.name ?? '0'
}

function ensureLayer(doc: DocumentData, name: string): Layer {
  const existing = doc.layers.find((l) => l.name === name)
  if (existing) return existing
  const layer: Layer = {
    id: uid('layer'),
    name,
    color: '#e8edf2',
    visible: true,
    locked: false,
  }
  doc.layers.push(layer)
  return layer
}

function num(map: Map<number, string>, code: number, fallback = 0): number {
  const v = map.get(code)
  if (v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function entityToPairs(entity: PrimitiveEntity, layer: string): Pair[] {
  const out: Pair[] = []
  const push = (code: number, value: string | number) => {
    out.push({ code, value: String(value) })
  }

  switch (entity.type) {
    case 'line':
      push(0, 'LINE')
      push(8, layer)
      push(10, entity.a.x)
      push(20, entity.a.y)
      push(30, 0)
      push(11, entity.b.x)
      push(21, entity.b.y)
      push(31, 0)
      break
    case 'circle':
      push(0, 'CIRCLE')
      push(8, layer)
      push(10, entity.center.x)
      push(20, entity.center.y)
      push(30, 0)
      push(40, entity.radius)
      break
    case 'arc':
      push(0, 'ARC')
      push(8, layer)
      push(10, entity.center.x)
      push(20, entity.center.y)
      push(30, 0)
      push(40, entity.radius)
      push(50, (entity.startAngle * 180) / Math.PI)
      push(51, (entity.endAngle * 180) / Math.PI)
      break
    case 'rect': {
      const minX = Math.min(entity.a.x, entity.b.x)
      const maxX = Math.max(entity.a.x, entity.b.x)
      const minY = Math.min(entity.a.y, entity.b.y)
      const maxY = Math.max(entity.a.y, entity.b.y)
      const pts: Vec2[] = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ]
      push(0, 'LWPOLYLINE')
      push(8, layer)
      push(90, 4)
      push(70, 1)
      for (const p of pts) {
        push(10, p.x)
        push(20, p.y)
      }
      break
    }
    case 'polyline':
      push(0, 'LWPOLYLINE')
      push(8, layer)
      push(90, entity.points.length)
      push(70, entity.closed ? 1 : 0)
      for (const p of entity.points) {
        push(10, p.x)
        push(20, p.y)
      }
      break
    case 'dimension':
      break
  }
  return out
}

function pairsToText(pairs: Pair[]): string {
  return pairs.map((p) => `${p.code}\n${p.value}`).join('\n') + '\n'
}

export function exportDxf(doc: DocumentData): string {
  const pairs: Pair[] = [
    { code: 0, value: 'SECTION' },
    { code: 2, value: 'HEADER' },
    { code: 9, value: '$ACADVER' },
    { code: 1, value: 'AC1015' },
    { code: 0, value: 'ENDSEC' },
    { code: 0, value: 'SECTION' },
    { code: 2, value: 'TABLES' },
    { code: 0, value: 'TABLE' },
    { code: 2, value: 'LAYER' },
    { code: 70, value: String(doc.layers.length) },
  ]

  for (const layer of doc.layers) {
    pairs.push(
      { code: 0, value: 'LAYER' },
      { code: 2, value: layer.name },
      { code: 70, value: '0' },
      { code: 62, value: '7' },
      { code: 6, value: 'CONTINUOUS' },
    )
  }

  pairs.push(
    { code: 0, value: 'ENDTAB' },
    { code: 0, value: 'ENDSEC' },
    { code: 0, value: 'SECTION' },
    { code: 2, value: 'ENTITIES' },
  )

  const expanded = expandEntities(doc.entities, doc.blocks)
  for (const entity of expanded) {
    const layer = layerName(doc, entity.layerId)
    if (entity.type === 'dimension') {
      const layout = dimensionLayout(entity)
      const lines: Array<[Vec2, Vec2]> = [
        [layout.a, layout.d1],
        [layout.b, layout.d2],
        [layout.d1, layout.d2],
      ]
      for (const [a, b] of lines) {
        pairs.push(
          { code: 0, value: 'LINE' },
          { code: 8, value: layer },
          { code: 10, value: String(a.x) },
          { code: 20, value: String(a.y) },
          { code: 30, value: '0' },
          { code: 11, value: String(b.x) },
          { code: 21, value: String(b.y) },
          { code: 31, value: '0' },
        )
      }
      pairs.push(
        { code: 0, value: 'TEXT' },
        { code: 8, value: layer },
        { code: 10, value: String(layout.text.x) },
        { code: 20, value: String(layout.text.y) },
        { code: 30, value: '0' },
        { code: 40, value: '2.5' },
        { code: 1, value: layout.length.toFixed(2) },
        { code: 50, value: String((layout.angle * 180) / Math.PI) },
      )
      continue
    }
    pairs.push(...entityToPairs(entity, layer))
  }

  pairs.push(
    { code: 0, value: 'ENDSEC' },
    { code: 0, value: 'EOF' },
  )
  return pairsToText(pairs)
}

export function importDxf(text: string): DocumentData {
  const doc = createDefaultDocument()
  const pairs = pairsFromText(text)
  let i = 0
  let inEntities = false

  while (i < pairs.length) {
    const p = pairs[i]
    if (p.code === 0 && p.value.trim() === 'SECTION') {
      const name = pairs[i + 1]
      if (name?.code === 2 && name.value.trim() === 'ENTITIES') inEntities = true
      i++
      continue
    }
    if (p.code === 0 && p.value.trim() === 'ENDSEC') {
      inEntities = false
      i++
      continue
    }
    if (!inEntities || p.code !== 0) {
      i++
      continue
    }

    const type = p.value.trim().toUpperCase()
    i++
    const fields = new Map<number, string>()
    const points10: Vec2[] = []
    while (i < pairs.length && pairs[i].code !== 0) {
      const code = pairs[i].code
      const value = pairs[i].value.trim()
      if (code === 10) {
        const x = Number(value)
        let y = 0
        if (pairs[i + 1]?.code === 20) y = Number(pairs[i + 1].value)
        points10.push({ x, y: Number.isFinite(y) ? y : 0 })
      }
      fields.set(code, value)
      i++
    }

    const layer = ensureLayer(doc, fields.get(8)?.trim() || '0')
    let entity: Entity | null = null

    if (type === 'LINE') {
      entity = {
        id: uid('line'),
        type: 'line',
        layerId: layer.id,
        a: { x: num(fields, 10), y: num(fields, 20) },
        b: { x: num(fields, 11), y: num(fields, 21) },
      }
    } else if (type === 'CIRCLE') {
      entity = {
        id: uid('circle'),
        type: 'circle',
        layerId: layer.id,
        center: { x: num(fields, 10), y: num(fields, 20) },
        radius: Math.abs(num(fields, 40, 1)),
      }
    } else if (type === 'ARC') {
      entity = {
        id: uid('arc'),
        type: 'arc',
        layerId: layer.id,
        center: { x: num(fields, 10), y: num(fields, 20) },
        radius: Math.abs(num(fields, 40, 1)),
        startAngle: (num(fields, 50) * Math.PI) / 180,
        endAngle: (num(fields, 51) * Math.PI) / 180,
      }
    } else if (type === 'LWPOLYLINE') {
      const closed = (num(fields, 70) & 1) === 1
      if (points10.length >= 2) {
        entity = {
          id: uid('pl'),
          type: 'polyline',
          layerId: layer.id,
          points: points10,
          closed,
        }
      }
    }

    if (entity) doc.entities.push(entity)
  }

  doc.activeLayerId = doc.layers[0].id
  return doc
}

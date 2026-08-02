import { createDefaultDocument } from '../model/document'
import { offsetFromPoint, uid } from '../model/math'
import type {
  BlockDefinition,
  DocumentData,
  Entity,
  Layer,
  PrimitiveEntity,
} from '../model/types'

type DwgPoint = { x: number; y: number; z?: number }

type DwgEntityLike = {
  type: string
  layer?: string
  handle?: string
  startPoint?: DwgPoint
  endPoint?: DwgPoint
  center?: DwgPoint
  radius?: number
  startAngle?: number
  endAngle?: number
  flag?: number
  vertices?: Array<DwgPoint & { bulge?: number }>
  name?: string
  insertionPoint?: DwgPoint
  xScale?: number
  yScale?: number
  rotation?: number
  subclassMarker?: string
  subDefinitionPoint1?: DwgPoint
  subDefinitionPoint2?: DwgPoint
  definitionPoint?: DwgPoint
  textPoint?: DwgPoint
}

type DwgLayerEntry = {
  name: string
  color?: number
  off?: boolean
  frozen?: boolean
  locked?: boolean
}

type DwgBlockRecord = {
  name: string
  basePoint?: DwgPoint
  entities?: DwgEntityLike[]
  flags?: number
}

type DwgDatabaseLike = {
  entities: DwgEntityLike[]
  tables?: {
    LAYER?: { entries?: DwgLayerEntry[] }
    BLOCK_RECORD?: { entries?: DwgBlockRecord[] }
  }
}

const ACI: Record<number, string> = {
  1: '#ff0000',
  2: '#ffff00',
  3: '#00ff00',
  4: '#00ffff',
  5: '#0000ff',
  6: '#ff00ff',
  7: '#e8edf2',
  8: '#808080',
  9: '#c0c0c0',
}

let librePromise: Promise<LibreDwgHandle> | null = null

type LibreDwgHandle = {
  dwg_read_data: (content: ArrayBuffer, type: number) => number | undefined
  convert: (ptr: number) => DwgDatabaseLike
  dwg_free: (ptr: number) => void
}

function wasmBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/wasm`
  }
  // Node / Vitest
  return `${process.cwd()}/node_modules/@mlightcad/libredwg-web/wasm`
}

async function getLibreDwg(): Promise<LibreDwgHandle> {
  if (!librePromise) {
    librePromise = (async () => {
      const mod = await import('@mlightcad/libredwg-web')
      const libre = await mod.LibreDwg.create(wasmBaseUrl())
      return libre as unknown as LibreDwgHandle
    })()
  }
  return librePromise
}

function colorFromAci(index?: number): string | undefined {
  if (index === undefined || index === 256 || index === 0) return undefined
  return ACI[index] ?? undefined
}

function ensureLayer(doc: DocumentData, name: string, color?: string): Layer {
  const existing = doc.layers.find((l) => l.name === name)
  if (existing) return existing
  const layer: Layer = {
    id: uid('layer'),
    name: name || '0',
    color: color ?? '#e8edf2',
    visible: true,
    locked: false,
  }
  doc.layers.push(layer)
  return layer
}

function mapPrimitive(
  entity: DwgEntityLike,
  layerId: string,
): PrimitiveEntity | null {
  switch (entity.type) {
    case 'LINE':
      if (!entity.startPoint || !entity.endPoint) return null
      return {
        id: uid('line'),
        type: 'line',
        layerId,
        a: { x: entity.startPoint.x, y: entity.startPoint.y },
        b: { x: entity.endPoint.x, y: entity.endPoint.y },
      }
    case 'CIRCLE':
      if (!entity.center || entity.radius === undefined) return null
      return {
        id: uid('circle'),
        type: 'circle',
        layerId,
        center: { x: entity.center.x, y: entity.center.y },
        radius: Math.abs(entity.radius),
      }
    case 'ARC':
      if (
        !entity.center ||
        entity.radius === undefined ||
        entity.startAngle === undefined ||
        entity.endAngle === undefined
      ) {
        return null
      }
      return {
        id: uid('arc'),
        type: 'arc',
        layerId,
        center: { x: entity.center.x, y: entity.center.y },
        radius: Math.abs(entity.radius),
        startAngle: entity.startAngle,
        endAngle: entity.endAngle,
      }
    case 'LWPOLYLINE': {
      const pts = (entity.vertices ?? []).map((v) => ({ x: v.x, y: v.y }))
      if (pts.length < 2) return null
      return {
        id: uid('pl'),
        type: 'polyline',
        layerId,
        points: pts,
        closed: ((entity.flag ?? 0) & 1) === 1,
      }
    }
    case 'DIMENSION': {
      const a = entity.subDefinitionPoint1
      const b = entity.subDefinitionPoint2
      const def = entity.definitionPoint ?? entity.textPoint
      if (!a || !b || !def) return null
      return {
        id: uid('dim'),
        type: 'dimension',
        layerId,
        a: { x: a.x, y: a.y },
        b: { x: b.x, y: b.y },
        offset: offsetFromPoint(
          { x: a.x, y: a.y },
          { x: b.x, y: b.y },
          { x: def.x, y: def.y },
        ),
      }
    }
    default:
      return null
  }
}

function mapEntities(
  entities: DwgEntityLike[],
  layerResolver: (name: string) => string,
  blockNameToId: Map<string, string>,
): Entity[] {
  const out: Entity[] = []
  for (const entity of entities) {
    const layerId = layerResolver(entity.layer || '0')
    if (entity.type === 'INSERT' && entity.name && entity.insertionPoint) {
      const blockId = blockNameToId.get(entity.name)
      if (!blockId) continue
      out.push({
        id: uid('ins'),
        type: 'block',
        layerId,
        blockId,
        position: {
          x: entity.insertionPoint.x,
          y: entity.insertionPoint.y,
        },
        rotation: entity.rotation ?? 0,
        scale: entity.xScale ?? entity.yScale ?? 1,
      })
      continue
    }
    const mapped = mapPrimitive(entity, layerId)
    if (mapped) out.push(mapped)
  }
  return out
}

export type DwgImportResult = {
  document: DocumentData
  stats: {
    total: number
    imported: number
    skipped: number
  }
}

export async function importDwg(buffer: ArrayBuffer): Promise<DwgImportResult> {
  const libre = await getLibreDwg()
  const { Dwg_File_Type } = await import('@mlightcad/libredwg-web')
  const ptr = libre.dwg_read_data(buffer, Dwg_File_Type.DWG)
  if (ptr === undefined || ptr === 0) {
    throw new Error('Não foi possível ler o arquivo DWG')
  }

  try {
    const db = libre.convert(ptr)
    const doc = createDefaultDocument()
    doc.layers = []

    const layerEntries = db.tables?.LAYER?.entries ?? []
    if (!layerEntries.length) {
      ensureLayer(doc, '0')
    } else {
      for (const entry of layerEntries) {
        const layer = ensureLayer(
          doc,
          entry.name || '0',
          colorFromAci(entry.color),
        )
        layer.visible = !(entry.off || entry.frozen)
        layer.locked = !!entry.locked
      }
    }
    doc.activeLayerId = doc.layers[0]?.id ?? 'layer_0'

    const layerIdByName = new Map(doc.layers.map((l) => [l.name, l.id]))
    const resolveLayer = (name: string) => {
      const id = layerIdByName.get(name)
      if (id) return id
      const layer = ensureLayer(doc, name)
      layerIdByName.set(name, layer.id)
      return layer.id
    }

    const blockNameToId = new Map<string, string>()
    const blockRecords = db.tables?.BLOCK_RECORD?.entries ?? []
    for (const record of blockRecords) {
      const name = record.name
      if (!name || name.startsWith('*')) continue
      const entities = record.entities ?? []
      if (!entities.length) continue
      const primitives = entities
        .map((e) => mapPrimitive(e, resolveLayer(e.layer || '0')))
        .filter((e): e is PrimitiveEntity => !!e)
        .map((e) => {
          const base = record.basePoint ?? { x: 0, y: 0 }
          // Entities in block records are already relative to block space;
          // keep geometry as-is with base at origin for our insert model.
          void base
          return { ...e, id: uid('be') }
        })
      if (!primitives.length) continue
      const block: BlockDefinition = {
        id: uid('block'),
        name,
        base: { x: 0, y: 0 },
        entities: primitives,
      }
      doc.blocks.push(block)
      blockNameToId.set(name, block.id)
    }
    doc.activeBlockId = doc.blocks[0]?.id ?? null

    const modelEntities = db.entities ?? []
    doc.entities = mapEntities(modelEntities, resolveLayer, blockNameToId)

    const imported = doc.entities.length
    const total = modelEntities.length
    return {
      document: doc,
      stats: {
        total,
        imported,
        skipped: Math.max(0, total - imported),
      },
    }
  } finally {
    try {
      libre.dwg_free(ptr)
    } catch {
      /* ignore free errors */
    }
  }
}

export function isDwgSupportedMessage(): string {
  return (
    'Importação DWG via LibreDWG (WASM). ' +
    'Exportação DWG nativa não está disponível no build padrão — use Exportar DXF. ' +
    'Licença do motor: GPL-3.0.'
  )
}

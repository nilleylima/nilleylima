import type {
  BlockDefinition,
  DocumentData,
  Entity,
  Layer,
  PrimitiveEntity,
} from './types'
import { centroidOfEntities, translateEntity } from './geometry'
import { uid } from './math'

const DEFAULT_COLORS = [
  '#e8edf2',
  '#3dd6c6',
  '#f0b429',
  '#6ea8fe',
  '#f07178',
  '#c3e88d',
]

export function createDefaultDocument(): DocumentData {
  const layer0: Layer = {
    id: 'layer_0',
    name: '0',
    color: DEFAULT_COLORS[0],
    visible: true,
    locked: false,
  }
  return {
    version: 2,
    layers: [layer0],
    entities: [],
    blocks: [],
    activeLayerId: layer0.id,
    activeBlockId: null,
  }
}

function normalizeDocument(raw: {
  layers?: Layer[]
  entities?: Entity[]
  blocks?: BlockDefinition[]
  activeLayerId?: string
  activeBlockId?: string | null
}): DocumentData {
  const layers = Array.isArray(raw.layers) ? raw.layers : []
  const entities = Array.isArray(raw.entities) ? raw.entities : []
  const blocks = Array.isArray(raw.blocks) ? raw.blocks : []
  const activeLayerId =
    raw.activeLayerId && layers.some((l) => l.id === raw.activeLayerId)
      ? raw.activeLayerId
      : layers[0]?.id ?? 'layer_0'
  return {
    version: 2,
    layers: layers.length ? layers : createDefaultDocument().layers,
    entities,
    blocks,
    activeLayerId,
    activeBlockId: raw.activeBlockId ?? blocks[0]?.id ?? null,
  }
}

export class CadDocument {
  data: DocumentData
  private past: DocumentData[] = []
  private future: DocumentData[] = []
  private listeners = new Set<() => void>()

  constructor(data: DocumentData = createDefaultDocument()) {
    this.data = structuredClone(normalizeDocument(data))
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    for (const fn of this.listeners) fn()
  }

  private clone(): DocumentData {
    return structuredClone(this.data)
  }

  private commit(next: DocumentData) {
    this.past.push(this.clone())
    if (this.past.length > 100) this.past.shift()
    this.future = []
    this.data = next
    this.notify()
  }

  private mutate(mutator: (draft: DocumentData) => void) {
    const next = this.clone()
    mutator(next)
    this.commit(next)
  }

  undo() {
    const prev = this.past.pop()
    if (!prev) return
    this.future.push(this.clone())
    this.data = prev
    this.notify()
  }

  redo() {
    const next = this.future.pop()
    if (!next) return
    this.past.push(this.clone())
    this.data = next
    this.notify()
  }

  canUndo() {
    return this.past.length > 0
  }

  canRedo() {
    return this.future.length > 0
  }

  get activeLayer(): Layer {
    return (
      this.data.layers.find((l) => l.id === this.data.activeLayerId) ??
      this.data.layers[0]
    )
  }

  get activeBlock(): BlockDefinition | null {
    if (!this.data.activeBlockId) return null
    return this.data.blocks.find((b) => b.id === this.data.activeBlockId) ?? null
  }

  setActiveLayer(id: string) {
    if (!this.data.layers.some((l) => l.id === id)) return
    this.data.activeLayerId = id
    this.notify()
  }

  setActiveBlock(id: string | null) {
    if (id && !this.data.blocks.some((b) => b.id === id)) return
    this.data.activeBlockId = id
    this.notify()
  }

  addLayer(name?: string) {
    const index = this.data.layers.length
    const layer: Layer = {
      id: uid('layer'),
      name: name ?? `Camada ${index}`,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      visible: true,
      locked: false,
    }
    this.mutate((d) => {
      d.layers.push(layer)
      d.activeLayerId = layer.id
    })
    return layer
  }

  toggleLayerVisible(id: string) {
    this.mutate((d) => {
      const layer = d.layers.find((l) => l.id === id)
      if (layer) layer.visible = !layer.visible
    })
  }

  toggleLayerLocked(id: string) {
    this.mutate((d) => {
      const layer = d.layers.find((l) => l.id === id)
      if (layer) layer.locked = !layer.locked
    })
  }

  renameLayer(id: string, name: string) {
    this.mutate((d) => {
      const layer = d.layers.find((l) => l.id === id)
      if (layer) layer.name = name
    })
  }

  addEntity(entity: Entity) {
    this.mutate((d) => {
      d.entities.push(entity)
    })
  }

  addEntities(entities: Entity[]) {
    if (!entities.length) return
    this.mutate((d) => {
      d.entities.push(...entities)
    })
  }

  updateEntities(ids: string[], updater: (entity: Entity) => Entity) {
    if (!ids.length) return
    const set = new Set(ids)
    this.mutate((d) => {
      d.entities = d.entities.map((e) => (set.has(e.id) ? updater(e) : e))
    })
  }

  removeEntities(ids: string[]) {
    if (!ids.length) return
    const set = new Set(ids)
    this.mutate((d) => {
      d.entities = d.entities.filter((e) => !set.has(e.id))
    })
  }

  clearAll() {
    this.mutate((d) => {
      d.entities = []
    })
  }

  createBlockFromSelection(ids: string[], name?: string): BlockDefinition | null {
    const set = new Set(ids)
    const selected = this.data.entities.filter((e) => set.has(e.id))
    if (!selected.length) return null

    const primitives: PrimitiveEntity[] = []
    for (const e of selected) {
      if (e.type === 'block') continue
      primitives.push(structuredClone(e))
    }
    if (!primitives.length) return null

    const base = centroidOfEntities(primitives)
    const local = primitives.map((e) => {
      const moved = translateEntity(e, -base.x, -base.y) as PrimitiveEntity
      return { ...moved, id: uid('be') }
    })

    const block: BlockDefinition = {
      id: uid('block'),
      name: name ?? `Bloco ${this.data.blocks.length + 1}`,
      base: { x: 0, y: 0 },
      entities: local,
    }

    this.mutate((d) => {
      d.blocks.push(block)
      d.activeBlockId = block.id
      d.entities = d.entities.filter((e) => !set.has(e.id))
      d.entities.push({
        id: uid('ins'),
        type: 'block',
        layerId: this.activeLayer.id,
        blockId: block.id,
        position: base,
        rotation: 0,
        scale: 1,
      })
    })

    return block
  }

  deleteBlock(id: string) {
    this.mutate((d) => {
      d.blocks = d.blocks.filter((b) => b.id !== id)
      d.entities = d.entities.filter((e) => !(e.type === 'block' && e.blockId === id))
      if (d.activeBlockId === id) d.activeBlockId = d.blocks[0]?.id ?? null
    })
  }

  renameBlock(id: string, name: string) {
    this.mutate((d) => {
      const block = d.blocks.find((b) => b.id === id)
      if (block) block.name = name
    })
  }

  replaceDocument(data: DocumentData) {
    this.commit(normalizeDocument(structuredClone(data)))
  }

  toJSON(): DocumentData {
    return this.clone()
  }

  static fromJSON(raw: unknown): CadDocument {
    if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido')
    const data = raw as {
      version?: number
      layers?: unknown
      entities?: unknown
      blocks?: BlockDefinition[]
      activeLayerId?: string
      activeBlockId?: string | null
    }
    if (
      (data.version !== 1 && data.version !== 2) ||
      !Array.isArray(data.layers) ||
      !Array.isArray(data.entities)
    ) {
      throw new Error('Formato de desenho não suportado')
    }
    return new CadDocument(
      normalizeDocument({
        version: data.version === 1 ? 1 : 2,
        layers: data.layers as DocumentData['layers'],
        entities: data.entities as DocumentData['entities'],
        blocks: data.blocks,
        activeLayerId: data.activeLayerId ?? 'layer_0',
        activeBlockId: data.activeBlockId,
      } as DocumentData & { version: 1 | 2 }),
    )
  }
}

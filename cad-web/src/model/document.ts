import type { DocumentData, Entity, Layer } from './types'
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
    version: 1,
    layers: [layer0],
    entities: [],
    activeLayerId: layer0.id,
  }
}

export class CadDocument {
  data: DocumentData
  private past: DocumentData[] = []
  private future: DocumentData[] = []
  private listeners = new Set<() => void>()

  constructor(data: DocumentData = createDefaultDocument()) {
    this.data = structuredClone(data)
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

  setActiveLayer(id: string) {
    if (!this.data.layers.some((l) => l.id === id)) return
    this.data.activeLayerId = id
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

  replaceDocument(data: DocumentData) {
    this.commit(structuredClone(data))
  }

  toJSON(): DocumentData {
    return this.clone()
  }

  static fromJSON(raw: unknown): CadDocument {
    if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido')
    const data = raw as DocumentData
    if (data.version !== 1 || !Array.isArray(data.layers) || !Array.isArray(data.entities)) {
      throw new Error('Formato de desenho não suportado')
    }
    return new CadDocument(data)
  }
}

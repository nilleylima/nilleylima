import { describe, expect, it } from 'vitest'
import { CadDocument } from './document'

describe('CadDocument', () => {
  it('adds entities and supports undo/redo', () => {
    const doc = new CadDocument()
    doc.addEntity({
      id: 'line_1',
      type: 'line',
      layerId: doc.activeLayer.id,
      a: { x: 0, y: 0 },
      b: { x: 10, y: 0 },
    })
    expect(doc.data.entities).toHaveLength(1)
    doc.undo()
    expect(doc.data.entities).toHaveLength(0)
    doc.redo()
    expect(doc.data.entities).toHaveLength(1)
  })

  it('round-trips JSON', () => {
    const doc = new CadDocument()
    doc.addLayer('Estrutura')
    doc.addEntity({
      id: 'c1',
      type: 'circle',
      layerId: doc.activeLayer.id,
      center: { x: 5, y: 5 },
      radius: 3,
    })
    const restored = CadDocument.fromJSON(doc.toJSON())
    expect(restored.data.entities).toHaveLength(1)
    expect(restored.data.version).toBe(2)
    expect(restored.data.blocks).toEqual([])
    expect(restored.data.layers.some((l) => l.name === 'Estrutura')).toBe(true)
  })

  it('migrates version 1 documents', () => {
    const restored = CadDocument.fromJSON({
      version: 1,
      layers: [{ id: 'layer_0', name: '0', color: '#fff', visible: true, locked: false }],
      entities: [],
      activeLayerId: 'layer_0',
    })
    expect(restored.data.version).toBe(2)
    expect(restored.data.blocks).toEqual([])
  })
})

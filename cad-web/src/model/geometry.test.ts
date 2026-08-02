import { describe, expect, it } from 'vitest'
import { CadDocument } from './document'
import { explodeBlockInsert } from './geometry'
import { dimensionLayout, offsetFromPoint } from './math'

describe('geometry', () => {
  it('computes dimension offset and layout', () => {
    const offset = offsetFromPoint({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 4 })
    expect(offset).toBeCloseTo(4)
    const layout = dimensionLayout({
      id: 'd',
      type: 'dimension',
      layerId: '0',
      a: { x: 0, y: 0 },
      b: { x: 10, y: 0 },
      offset: 4,
    })
    expect(layout.length).toBeCloseTo(10)
    expect(layout.d1.y).toBeCloseTo(4)
    expect(layout.d2.y).toBeCloseTo(4)
  })

  it('creates block from selection and explodes insert', () => {
    const doc = new CadDocument()
    doc.addEntity({
      id: 'line_1',
      type: 'line',
      layerId: doc.activeLayer.id,
      a: { x: 0, y: 0 },
      b: { x: 20, y: 0 },
    })
    doc.addEntity({
      id: 'line_2',
      type: 'line',
      layerId: doc.activeLayer.id,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 20 },
    })
    const block = doc.createBlockFromSelection(['line_1', 'line_2'], 'Cantoneira')
    expect(block?.name).toBe('Cantoneira')
    expect(doc.data.blocks).toHaveLength(1)
    expect(doc.data.entities.filter((e) => e.type === 'block')).toHaveLength(1)

    const insert = doc.data.entities.find((e) => e.type === 'block')
    if (!insert || insert.type !== 'block' || !block) throw new Error('missing insert')
    const exploded = explodeBlockInsert(insert, block)
    expect(exploded).toHaveLength(2)
  })
})

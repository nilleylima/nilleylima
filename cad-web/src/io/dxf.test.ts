import { describe, expect, it } from 'vitest'
import { createDefaultDocument } from '../model/document'
import { exportDxf, importDxf } from './dxf'

describe('dxf io', () => {
  it('exports and imports basic entities', () => {
    const doc = createDefaultDocument()
    doc.entities.push(
      {
        id: 'l1',
        type: 'line',
        layerId: doc.activeLayerId,
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
      },
      {
        id: 'c1',
        type: 'circle',
        layerId: doc.activeLayerId,
        center: { x: 50, y: 50 },
        radius: 25,
      },
    )

    const dxf = exportDxf(doc)
    expect(dxf).toContain('LINE')
    expect(dxf).toContain('CIRCLE')
    expect(dxf).toContain('EOF')

    const imported = importDxf(dxf)
    expect(imported.entities.some((e) => e.type === 'line')).toBe(true)
    expect(imported.entities.some((e) => e.type === 'circle')).toBe(true)
  })

  it('imports sample lwpolyline', () => {
    const sample = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
3
70
1
10
0
20
0
10
10
20
0
10
10
20
10
0
ENDSEC
0
EOF
`
    const doc = importDxf(sample)
    const pl = doc.entities.find((e) => e.type === 'polyline')
    expect(pl?.type).toBe('polyline')
    if (pl?.type === 'polyline') {
      expect(pl.points).toHaveLength(3)
      expect(pl.closed).toBe(true)
    }
  })
})

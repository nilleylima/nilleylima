import test from 'node:test'
import assert from 'node:assert/strict'
import { detectDefects, defectLabel } from './detector.js'

function makeImageData(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 160
    data[i + 1] = 168
    data[i + 2] = 176
    data[i + 3] = 255
  }
  paint?.(data, width, height)
  return { data, width, height, colorSpace: 'srgb' }
}

test('uniform surface yields few or no defects', () => {
  const image = makeImageData(160, 160)
  const result = detectDefects(image, { sensitivity: 0.5 })
  assert.ok(result.defects.length <= 2)
  assert.ok(result.surfaceQuality.score >= 70)
})

test('dark scratch line is detected', () => {
  const image = makeImageData(200, 200, (data, w) => {
    for (let x = 20; x < 180; x++) {
      const y = 40 + Math.floor((x - 20) * 0.2)
      for (let t = -1; t <= 1; t++) {
        const i = ((y + t) * w + x) * 4
        data[i] = 20
        data[i + 1] = 22
        data[i + 2] = 24
      }
    }
  })
  const result = detectDefects(image, { sensitivity: 0.7 })
  assert.ok(result.defects.length >= 1, 'expected at least one defect')
  assert.ok(result.defects.some((d) => ['scratch', 'crack', 'anomaly', 'chip'].includes(d.type)))
})

test('defectLabel returns Portuguese labels', () => {
  assert.equal(defectLabel('crack'), 'Trinca / fissura')
  assert.equal(defectLabel('unknown'), 'Irregularidade')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { detectDefects, defectLabel } from './detector.js'
import { getPreset, SURFACE_PRESETS } from './presets.js'
import { differenceMap, normalizeBrightness, imageDataToGray } from './reference.js'

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
  const result = detectDefects(image, { sensitivity: 0.5, preset: getPreset('metal') })
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
  const result = detectDefects(image, {
    sensitivity: 0.7,
    preset: getPreset('metal'),
  })
  assert.ok(result.defects.length >= 1, 'expected at least one defect')
  assert.ok(
    result.defects.some((d) =>
      ['scratch', 'crack', 'anomaly', 'chip', 'deviation'].includes(d.type),
    ),
  )
})

test('defectLabel returns Portuguese labels', () => {
  assert.equal(defectLabel('crack'), 'Trinca / fissura')
  assert.equal(defectLabel('deviation'), 'Desvio da referência')
  assert.equal(defectLabel('unknown'), 'Irregularidade')
})

test('surface presets are complete', () => {
  assert.ok(SURFACE_PRESETS.length >= 5)
  for (const p of SURFACE_PRESETS) {
    assert.ok(p.id && p.label)
    assert.ok(p.sensitivity > 0 && p.sensitivity < 1)
  }
  assert.equal(getPreset('pcb').label, 'PCB')
})

test('reference difference highlights painted defect region', () => {
  const good = makeImageData(120, 120)
  const bad = makeImageData(120, 120, (data, w) => {
    for (let y = 40; y < 80; y++) {
      for (let x = 40; x < 80; x++) {
        const i = (y * w + x) * 4
        data[i] = 30
        data[i + 1] = 30
        data[i + 2] = 30
      }
    }
  })

  const diff = differenceMap(bad, good)
  assert.ok(diff)
  assert.ok(diff.meanDiff > 5)

  const result = detectDefects(bad, {
    sensitivity: 0.6,
    preset: getPreset('metal'),
    referenceDiff: diff,
  })
  assert.equal(result.usedReference, true)
  assert.ok(result.defects.length >= 1)
})

test('brightness normalization scales toward reference mean', () => {
  const a = new Float32Array([50, 50, 50, 50])
  const b = new Float32Array([100, 100, 100, 100])
  const out = normalizeBrightness(a, b)
  assert.ok(Math.abs(out[0] - 100) < 1)
  const gray = imageDataToGray(makeImageData(2, 2))
  assert.equal(gray.length, 4)
})

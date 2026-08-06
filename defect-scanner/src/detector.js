/**
 * Surface defect detector — classical computer vision on ImageData.
 * Detects scratches, cracks, stains, dents and chips via anomaly + edge analysis.
 */

const LABELS = {
  scratch: 'Risco / arranhão',
  crack: 'Trinca / fissura',
  stain: 'Mancha / sujeira',
  dent: 'Amassado / relevo',
  chip: 'Lasca / falha de material',
  anomaly: 'Irregularidade',
}

const COLORS = {
  scratch: '#5eb1ff',
  crack: '#ff5c5c',
  stain: '#c084fc',
  dent: '#f0a202',
  chip: '#3ecf8e',
  anomaly: '#f0a202',
}

export function defectLabel(type) {
  return LABELS[type] || LABELS.anomaly
}

export function defectColor(type) {
  return COLORS[type] || COLORS.anomaly
}

/**
 * @param {ImageData} imageData
 * @param {{ sensitivity?: number }} options
 */
export function detectDefects(imageData, options = {}) {
  const sensitivity = clamp(options.sensitivity ?? 0.55, 0.2, 0.95)
  const { width, height, data } = imageData

  const gray = new Float32Array(width * height)
  const lumSum = { r: 0, g: 0, b: 0 }

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    gray[p] = 0.299 * r + 0.587 * g + 0.114 * b
    lumSum.r += r
    lumSum.g += g
    lumSum.b += b
  }

  const n = width * height
  const meanR = lumSum.r / n
  const meanG = lumSum.g / n
  const meanB = lumSum.b / n

  const blurred = boxBlur(gray, width, height, 2)
  const edges = sobelMagnitude(blurred, width, height)
  const localMean = boxBlur(blurred, width, height, 6)
  const localVar = localVariance(blurred, localMean, width, height, 6)

  let edgeMean = 0
  let varMean = 0
  for (let i = 0; i < n; i++) {
    edgeMean += edges[i]
    varMean += localVar[i]
  }
  edgeMean /= n
  varMean /= n

  let edgeStd = 0
  let varStd = 0
  for (let i = 0; i < n; i++) {
    edgeStd += (edges[i] - edgeMean) ** 2
    varStd += (localVar[i] - varMean) ** 2
  }
  edgeStd = Math.sqrt(edgeStd / n) + 1e-6
  varStd = Math.sqrt(varStd / n) + 1e-6

  // Higher sensitivity → lower threshold (more detections)
  const edgeZ = 1.85 - sensitivity * 1.15
  const varZ = 1.65 - sensitivity * 1.05
  const colorZ = 2.1 - sensitivity * 0.9

  const mask = new Uint8Array(n)
  const scoreMap = new Float32Array(n)

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x
      const ez = (edges[i] - edgeMean) / edgeStd
      const vz = (localVar[i] - varMean) / varStd
      const di = i * 4
      const colorDist =
        Math.hypot(data[di] - meanR, data[di + 1] - meanG, data[di + 2] - meanB) / 255

      const brightnessDelta = Math.abs(blurred[i] - localMean[i]) / 255
      const score =
        Math.max(0, ez - edgeZ) * 0.45 +
        Math.max(0, vz - varZ) * 0.3 +
        Math.max(0, colorDist * 3 - colorZ * 0.35) * 0.15 +
        brightnessDelta * 0.9

      scoreMap[i] = score
      if (score > 0.22 + (1 - sensitivity) * 0.2) {
        mask[i] = 1
      }
    }
  }

  // Morphological cleanup (open then close-ish via neighbor vote)
  const cleaned = morphClean(mask, width, height)
  const components = connectedComponents(cleaned, width, height, scoreMap)

  const minArea = Math.max(28, Math.floor(n * 0.0007))
  const maxArea = Math.floor(n * 0.25)

  const defects = components
    .filter((c) => c.area >= minArea && c.area <= maxArea)
    .map((c) => classifyComponent(c, edges, blurred, localMean, width, height))
    .filter((d) => d.confidence >= 0.34 && d.areaRatio >= 0.001)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)

  const surfaceQuality = estimateSurfaceQuality(defects, edgeMean, edgeStd)

  return {
    defects,
    surfaceQuality,
    stats: {
      edgeMean,
      edgeStd,
      componentCount: components.length,
      kept: defects.length,
    },
  }
}

function classifyComponent(c, edges, gray, localMean, width, height) {
  const aspect = c.w / Math.max(1, c.h)
  const elongated = aspect > 2.4 || aspect < 1 / 2.4
  const fill = c.area / Math.max(1, c.w * c.h)
  const perimeterApprox = c.perimeter
  const compactness = (4 * Math.PI * c.area) / Math.max(1, perimeterApprox ** 2)

  let edgeSum = 0
  let deltaSum = 0
  for (const idx of c.pixels) {
    edgeSum += edges[idx]
    deltaSum += Math.abs(gray[idx] - localMean[idx])
  }
  const avgEdge = edgeSum / c.area
  const avgDelta = deltaSum / c.area

  let type = 'anomaly'
  let confidence = clamp(c.avgScore * 0.85, 0, 1)

  if (elongated && fill < 0.5 && avgEdge > 20) {
    type = avgEdge > 40 && compactness < 0.22 ? 'crack' : 'scratch'
    confidence = clamp(0.5 + c.avgScore * 0.32 + (avgEdge / 140) * 0.2, 0, 0.98)
  } else if (fill > 0.4 && avgDelta > 12 && avgEdge < 42) {
    type = 'stain'
    confidence = clamp(0.44 + avgDelta / 90 + c.avgScore * 0.2, 0, 0.95)
  } else if (fill > 0.32 && avgEdge > 28 && avgDelta > 10 && c.area > 60) {
    type = compactness < 0.35 ? 'chip' : 'dent'
    confidence = clamp(0.42 + c.avgScore * 0.32, 0, 0.94)
  } else if (avgEdge > 45 && compactness < 0.22) {
    type = 'crack'
    confidence = clamp(0.46 + c.avgScore * 0.3, 0, 0.96)
  } else if (c.avgScore < 0.4) {
    confidence = 0.2
  }

  return {
    id: c.id,
    type,
    label: defectLabel(type),
    color: defectColor(type),
    confidence: Number(confidence.toFixed(2)),
    bbox: {
      x: c.minX / width,
      y: c.minY / height,
      w: c.w / width,
      h: c.h / height,
    },
    areaRatio: Number((c.area / (width * height)).toFixed(4)),
  }
}

function estimateSurfaceQuality(defects, edgeMean, edgeStd) {
  if (!defects.length) {
    return { score: 92, label: 'Superfície aparentemente íntegra' }
  }
  const severity =
    defects.reduce((acc, d) => acc + d.confidence * (d.type === 'crack' ? 1.4 : 1), 0) /
    defects.length
  const score = clamp(Math.round(88 - defects.length * 7 - severity * 28), 8, 95)
  let label = 'Irregularidades leves'
  if (score < 45) label = 'Defeitos críticos detectados'
  else if (score < 65) label = 'Defeitos relevantes'
  else if (score < 80) label = 'Possíveis defeitos'
  return { score, label, edgeMean, edgeStd }
}

function boxBlur(src, width, height, radius) {
  const out = new Float32Array(src.length)
  const tmp = new Float32Array(src.length)
  const span = radius * 2 + 1

  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = -radius; x <= radius; x++) {
      sum += src[y * width + clampInt(x, 0, width - 1)]
    }
    for (let x = 0; x < width; x++) {
      tmp[y * width + x] = sum / span
      const leave = src[y * width + clampInt(x - radius, 0, width - 1)]
      const enter = src[y * width + clampInt(x + radius + 1, 0, width - 1)]
      sum += enter - leave
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = -radius; y <= radius; y++) {
      sum += tmp[clampInt(y, 0, height - 1) * width + x]
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / span
      const leave = tmp[clampInt(y - radius, 0, height - 1) * width + x]
      const enter = tmp[clampInt(y + radius + 1, 0, height - 1) * width + x]
      sum += enter - leave
    }
  }

  return out
}

function localVariance(src, mean, width, height, radius) {
  const sq = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) sq[i] = src[i] * src[i]
  const meanSq = boxBlur(sq, width, height, radius)
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) {
    out[i] = Math.max(0, meanSq[i] - mean[i] * mean[i])
  }
  return out
}

function sobelMagnitude(gray, width, height) {
  const out = new Float32Array(gray.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const gx =
        -gray[i - width - 1] -
        2 * gray[i - 1] -
        gray[i + width - 1] +
        gray[i - width + 1] +
        2 * gray[i + 1] +
        gray[i + width + 1]
      const gy =
        -gray[i - width - 1] -
        2 * gray[i - width] -
        gray[i - width + 1] +
        gray[i + width - 1] +
        2 * gray[i + width] +
        gray[i + width + 1]
      out[i] = Math.hypot(gx, gy)
    }
  }
  return out
}

function morphClean(mask, width, height) {
  const eroded = new Uint8Array(mask.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      if (
        mask[i] &&
        mask[i - 1] &&
        mask[i + 1] &&
        mask[i - width] &&
        mask[i + width]
      ) {
        eroded[i] = 1
      }
    }
  }
  const dilated = new Uint8Array(mask.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      if (
        eroded[i] ||
        eroded[i - 1] ||
        eroded[i + 1] ||
        eroded[i - width] ||
        eroded[i + width]
      ) {
        dilated[i] = 1
      }
    }
  }
  return dilated
}

function connectedComponents(mask, width, height, scoreMap) {
  const seen = new Uint8Array(mask.length)
  const components = []
  let nextId = 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x
      if (!mask[start] || seen[start]) continue

      const stack = [start]
      seen[start] = 1
      const pixels = []
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let scoreSum = 0
      let perimeter = 0

      while (stack.length) {
        const i = stack.pop()
        pixels.push(i)
        scoreSum += scoreMap[i]
        const cx = i % width
        const cy = (i / width) | 0
        minX = Math.min(minX, cx)
        maxX = Math.max(maxX, cx)
        minY = Math.min(minY, cy)
        maxY = Math.max(maxY, cy)

        const neighbors = [i - 1, i + 1, i - width, i + width]
        let border = false
        for (const n of neighbors) {
          if (n < 0 || n >= mask.length) {
            border = true
            continue
          }
          const nx = n % width
          const ny = (n / width) | 0
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue
          if (!mask[n]) border = true
          else if (!seen[n]) {
            seen[n] = 1
            stack.push(n)
          }
        }
        if (border) perimeter++
      }

      components.push({
        id: nextId++,
        pixels,
        area: pixels.length,
        minX,
        maxX,
        minY,
        maxY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        avgScore: scoreSum / pixels.length,
        perimeter: Math.max(perimeter, 4),
      })
    }
  }

  return components
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function clampInt(v, min, max) {
  return v < min ? min : v > max ? max : v | 0
}

/**
 * Synthetic scratched metal sample for demo mode (no camera).
 */
export function createDemoImageData(size = 320) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Deterministic noise for stable demos
  let seed = 42
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, '#8a939c')
  g.addColorStop(0.5, '#b8c0c8')
  g.addColorStop(1, '#6f7882')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  // brushed metal noise (soft — avoid false positives)
  for (let i = 0; i < 700; i++) {
    const y = rand() * size
    ctx.strokeStyle = `rgba(255,255,255,${0.01 + rand() * 0.02})`
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y + (rand() - 0.5) * 2.5)
    ctx.stroke()
  }

  // scratch
  ctx.strokeStyle = 'rgba(28, 32, 38, 0.88)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(30, 85)
  ctx.lineTo(280, 125)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(32, 83)
  ctx.lineTo(278, 123)
  ctx.stroke()

  // crack
  ctx.strokeStyle = 'rgba(12, 14, 18, 0.98)'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.moveTo(185, 28)
  ctx.lineTo(200, 100)
  ctx.lineTo(165, 165)
  ctx.lineTo(210, 255)
  ctx.stroke()

  // stain
  const stain = ctx.createRadialGradient(85, 230, 3, 85, 230, 48)
  stain.addColorStop(0, 'rgba(58, 42, 24, 0.85)')
  stain.addColorStop(1, 'rgba(58, 42, 24, 0)')
  ctx.fillStyle = stain
  ctx.beginPath()
  ctx.arc(85, 230, 48, 0, Math.PI * 2)
  ctx.fill()

  // chip / missing material
  ctx.fillStyle = 'rgba(18, 20, 26, 0.95)'
  ctx.beginPath()
  ctx.moveTo(235, 195)
  ctx.lineTo(285, 212)
  ctx.lineTo(268, 265)
  ctx.lineTo(225, 245)
  ctx.closePath()
  ctx.fill()

  return ctx.getImageData(0, 0, size, size)
}

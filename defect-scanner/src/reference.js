/**
 * Golden-sample (reference) helpers.
 * Compare current frame against a known-good surface capture.
 */

const STORAGE_KEY = 'inspex.reference.v1'

export function imageDataToGray(imageData) {
  const { width, height, data } = imageData
  const gray = new Float32Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  return gray
}

/** Match mean brightness of `src` to `ref` to reduce lighting mismatch. */
export function normalizeBrightness(srcGray, refGray) {
  let sumS = 0
  let sumR = 0
  for (let i = 0; i < srcGray.length; i++) {
    sumS += srcGray[i]
    sumR += refGray[i]
  }
  const meanS = sumS / srcGray.length || 1
  const meanR = sumR / refGray.length || 1
  const scale = meanR / meanS
  const out = new Float32Array(srcGray.length)
  for (let i = 0; i < srcGray.length; i++) {
    out[i] = Math.min(255, Math.max(0, srcGray[i] * scale))
  }
  return out
}

/**
 * Absolute difference map between current and reference (0–255 scale).
 */
export function differenceMap(current, reference) {
  if (!current || !reference) return null
  if (current.width !== reference.width || current.height !== reference.height) {
    return null
  }

  const cur = imageDataToGray(current)
  const ref = imageDataToGray(reference)
  const norm = normalizeBrightness(cur, ref)
  const diff = new Float32Array(cur.length)

  let sum = 0
  for (let i = 0; i < diff.length; i++) {
    const d = Math.abs(norm[i] - ref[i])
    diff[i] = d
    sum += d
  }

  return {
    diff,
    meanDiff: sum / diff.length,
    width: current.width,
    height: current.height,
  }
}

/** Serialize ImageData for localStorage (compact-ish). */
export function serializeImageData(imageData) {
  const { width, height, data } = imageData
  // Store as base64 of raw RGBA — fine for ~280² frames
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, i + chunk))
  }
  return {
    width,
    height,
    data: btoa(binary),
    savedAt: Date.now(),
  }
}

export function deserializeImageData(payload) {
  if (!payload?.data || !payload.width || !payload.height) return null
  const binary = atob(payload.data)
  const data = new Uint8ClampedArray(binary.length)
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i)
  return {
    data,
    width: payload.width,
    height: payload.height,
    colorSpace: 'srgb',
  }
}

export function saveReference(imageData, meta = {}) {
  const payload = {
    ...serializeImageData(imageData),
    presetId: meta.presetId || 'metal',
    label: meta.label || 'Referência',
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function loadReference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw)
    const imageData = deserializeImageData(payload)
    if (!imageData) return null
    return {
      imageData,
      presetId: payload.presetId,
      label: payload.label,
      savedAt: payload.savedAt,
    }
  } catch {
    return null
  }
}

export function clearReference() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function hasReference() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}

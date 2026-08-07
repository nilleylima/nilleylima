const HISTORY_KEY = 'inspex.history.v1'
const MAX_ITEMS = 40

export function listHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const items = JSON.parse(raw)
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

export function getHistoryItem(id) {
  return listHistory().find((item) => item.id === id) || null
}

export function addHistoryItem(entry) {
  const items = listHistory()
  const item = {
    id: entry.id || `insp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: entry.createdAt || Date.now(),
    presetId: entry.presetId,
    presetLabel: entry.presetLabel,
    qualityScore: entry.qualityScore,
    qualityLabel: entry.qualityLabel,
    defectCount: entry.defects?.length || 0,
    defects: (entry.defects || []).map((d) => ({
      type: d.type,
      label: d.label,
      confidence: d.confidence,
      areaRatio: d.areaRatio,
      fromReference: Boolean(d.fromReference),
    })),
    usedReference: Boolean(entry.usedReference),
    embeddingSimilarity: entry.embeddingSimilarity ?? null,
    mode: entry.mode || 'camera',
    thumbnail: entry.thumbnail || null,
  }
  items.unshift(item)
  persist(items.slice(0, MAX_ITEMS))
  return item
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* ignore */
  }
}

export function removeHistoryItem(id) {
  persist(listHistory().filter((item) => item.id !== id))
}

function persist(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
  } catch {
    // Quota exceeded — drop thumbnails and retry once
    const slim = items.map(({ thumbnail, ...rest }) => rest)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(slim))
    } catch {
      /* ignore */
    }
  }
}

/** Create a small JPEG data URL from ImageData for history thumbs. */
export function thumbnailFromImageData(imageData, maxSide = 96) {
  const canvas = document.createElement('canvas')
  const scale = maxSide / Math.max(imageData.width, imageData.height)
  canvas.width = Math.max(1, Math.round(imageData.width * scale))
  canvas.height = Math.max(1, Math.round(imageData.height * scale))
  const ctx = canvas.getContext('2d')
  const src = document.createElement('canvas')
  src.width = imageData.width
  src.height = imageData.height
  src.getContext('2d').putImageData(imageData, 0, 0)
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.62)
}

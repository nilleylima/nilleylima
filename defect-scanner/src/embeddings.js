/**
 * MobileNet embeddings for reference similarity (lazy-loaded TF.js).
 * Not a defect classifier — measures visual closeness to the golden sample.
 */

let modelPromise = null

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs')
      await tf.ready()
      const mobilenet = await import('@tensorflow-models/mobilenet')
      return mobilenet.load({ version: 2, alpha: 0.5 })
    })().catch((err) => {
      modelPromise = null
      throw err
    })
  }
  return modelPromise
}

function imageDataToCanvas(imageData) {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  return canvas
}

async function embeddingFromImageData(model, imageData) {
  const canvas = imageDataToCanvas(imageData)
  // true → return embedding activation instead of classification
  const emb = model.infer(canvas, true)
  const data = await emb.data()
  emb.dispose()
  return Float32Array.from(data)
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return null
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (!denom) return 0
  return dot / denom
}

/**
 * @returns {Promise<{ similarity: number, ready: boolean, error?: string }>}
 */
export async function compareEmbeddings(current, reference, options = {}) {
  if (!current || !reference) {
    return { similarity: null, ready: false }
  }
  if (options.skip) {
    return { similarity: null, ready: false }
  }

  try {
    const model = await loadModel()
    const [cur, ref] = await Promise.all([
      embeddingFromImageData(model, current),
      embeddingFromImageData(model, reference),
    ])
    const sim = cosineSimilarity(cur, ref)
    return {
      similarity: sim == null ? null : Number(sim.toFixed(4)),
      ready: true,
    }
  } catch (err) {
    console.warn('Embeddings unavailable', err)
    return {
      similarity: null,
      ready: false,
      error: err?.message || 'Falha ao carregar o modelo',
    }
  }
}

export function similarityLabel(similarity) {
  if (similarity == null) return 'Indisponível'
  const pct = Math.round(similarity * 100)
  if (pct >= 92) return `Muito próxima (${pct}%)`
  if (pct >= 80) return `Semelhante (${pct}%)`
  if (pct >= 65) return `Diferenças visíveis (${pct}%)`
  return `Bem diferente (${pct}%)`
}

/** Warm the model in background after first user gesture. */
export function prefetchEmbeddingsModel() {
  loadModel().catch(() => {})
}

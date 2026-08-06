import './style.css'
import { CameraController, captureRoi, drawDefects, clearOverlay } from './camera.js'
import { detectDefects, createDemoImageData, defectColor } from './detector.js'
import { SURFACE_PRESETS, getPreset } from './presets.js'
import {
  differenceMap,
  saveReference,
  loadReference,
  clearReference,
} from './reference.js'

const PRESET_STORAGE = 'inspex.preset.v1'

const els = {
  home: document.getElementById('screen-home'),
  scan: document.getElementById('screen-scan'),
  video: document.getElementById('camera'),
  demoFrame: document.getElementById('demo-frame'),
  overlay: document.getElementById('overlay'),
  work: document.getElementById('work'),
  status: document.getElementById('scan-status'),
  sensitivity: document.getElementById('sensitivity'),
  results: document.getElementById('results-sheet'),
  resultsTitle: document.getElementById('results-title'),
  resultsSummary: document.getElementById('results-summary'),
  resultsList: document.getElementById('results-list'),
  toast: document.getElementById('toast'),
  presetList: document.getElementById('preset-list'),
  presetHint: document.getElementById('preset-hint'),
  refIndicator: document.getElementById('ref-indicator'),
  btnStart: document.getElementById('btn-start'),
  btnDemo: document.getElementById('btn-demo'),
  btnBack: document.getElementById('btn-back'),
  btnFlip: document.getElementById('btn-flip'),
  btnLive: document.getElementById('btn-live'),
  btnAnalyze: document.getElementById('btn-analyze'),
  btnTorch: document.getElementById('btn-torch'),
  btnSaveRef: document.getElementById('btn-save-ref'),
  btnClearRef: document.getElementById('btn-clear-ref'),
  btnCloseResults: document.getElementById('btn-close-results'),
  btnRescan: document.getElementById('btn-rescan'),
}

const camera = new CameraController(els.video)
const state = {
  mode: 'home',
  live: false,
  torch: false,
  lastDefects: [],
  lastRoi: null,
  demoImage: null,
  demoReference: null,
  reference: null,
  presetId: localStorage.getItem(PRESET_STORAGE) || 'metal',
  raf: 0,
  busy: false,
}

function showToast(message, ms = 3200) {
  els.toast.textContent = message
  els.toast.hidden = false
  clearTimeout(showToast._t)
  showToast._t = setTimeout(() => {
    els.toast.hidden = true
  }, ms)
}

function setStatus(text) {
  els.status.textContent = text
}

function currentPreset() {
  return getPreset(state.presetId)
}

function showScreen(name) {
  const isHome = name === 'home'
  els.home.hidden = !isHome
  els.home.classList.toggle('is-active', isHome)
  els.scan.hidden = isHome
}

function closeResults() {
  els.results.classList.remove('is-open')
  setTimeout(() => {
    if (!els.results.classList.contains('is-open')) {
      els.results.hidden = true
    }
  }, 320)
}

function openResults(result) {
  const { defects, surfaceQuality, usedReference } = result
  els.results.hidden = false
  requestAnimationFrame(() => els.results.classList.add('is-open'))

  els.resultsTitle.textContent =
    defects.length === 0 ? 'Sem defeitos evidentes' : `${defects.length} detecção(ões)`

  const modeNote = usedReference
    ? 'Comparado com a peça boa salva'
    : 'Modo anomalia (sem referência)'
  els.resultsSummary.textContent = `${surfaceQuality.label} · qualidade ${surfaceQuality.score}/100 · ${modeNote}. Preset: ${currentPreset().label}.`

  els.resultsList.innerHTML = ''
  if (!defects.length) {
    const li = document.createElement('li')
    li.innerHTML = `<span class="defect-badge" style="background:${defectColor('anomaly')}"></span>
      <div class="defect-copy"><strong>Nenhuma anomalia acima do limiar</strong>
      <span>Salve uma peça boa ou ajuste sensibilidade/preset.</span></div>
      <span class="defect-score">OK</span>`
    els.resultsList.appendChild(li)
    return
  }

  for (const d of defects) {
    const li = document.createElement('li')
    const extra = d.fromReference ? ' · vs referência' : ''
    li.innerHTML = `<span class="defect-badge ${d.type}"></span>
      <div class="defect-copy"><strong>${d.label}</strong>
      <span>Área ${(d.areaRatio * 100).toFixed(2)}% do quadro${extra}</span></div>
      <span class="defect-score">${Math.round(d.confidence * 100)}%</span>`
    els.resultsList.appendChild(li)
  }
}

function getSensitivity() {
  return Number(els.sensitivity.value)
}

function getActiveReferenceImage() {
  if (state.mode === 'demo' && state.demoReference) return state.demoReference
  return state.reference?.imageData || null
}

function runDetection(imageData) {
  const preset = currentPreset()
  const refImage = getActiveReferenceImage()
  let referenceDiff = null
  if (refImage) {
    referenceDiff = differenceMap(imageData, refImage)
  }
  return detectDefects(imageData, {
    sensitivity: getSensitivity(),
    preset,
    referenceDiff,
  })
}

function analyzeImageData(imageData, roi) {
  const result = runDetection(imageData)
  state.lastDefects = result.defects
  state.lastRoi = roi
  drawDefects(els.overlay, els.video, result.defects, roi)
  return result
}

function setDemoVisible(on) {
  els.demoFrame.hidden = !on
  els.video.hidden = on
}

function updateRefUi() {
  const has =
    (state.mode === 'demo' && state.demoReference) || Boolean(state.reference)
  els.refIndicator.textContent = has
    ? `Referência ativa · ${currentPreset().label}`
    : 'Sem referência'
  els.refIndicator.classList.toggle('is-ready', has)
  els.btnClearRef.hidden = !has || state.mode === 'demo'
}

function renderPresets() {
  els.presetList.innerHTML = ''
  for (const preset of SURFACE_PRESETS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'preset-chip' + (preset.id === state.presetId ? ' is-active' : '')
    btn.textContent = preset.label
    btn.setAttribute('role', 'option')
    btn.setAttribute('aria-selected', preset.id === state.presetId ? 'true' : 'false')
    btn.addEventListener('click', () => selectPreset(preset.id))
    els.presetList.appendChild(btn)
  }
  const active = currentPreset()
  els.presetHint.textContent = active.hint
  els.sensitivity.value = String(active.sensitivity)
}

function selectPreset(id) {
  state.presetId = id
  localStorage.setItem(PRESET_STORAGE, id)
  renderPresets()
  updateRefUi()
  if (state.mode === 'demo' && state.demoImage) runAnalyze()
}

function hydrateReference() {
  state.reference = loadReference()
  if (state.reference?.presetId) {
    state.presetId = state.reference.presetId
  }
  updateRefUi()
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Este navegador não permite acesso à câmera. Use o modo demo.')
    return
  }

  try {
    setStatus('Solicitando câmera…')
    showScreen('scan')
    setDemoVisible(false)
    state.mode = 'camera'
    state.demoImage = null
    state.demoReference = null
    await camera.start('environment')
    setStatus(
      state.reference
        ? 'Referência pronta — enquadre e analise'
        : 'Salve uma peça boa ou analise em modo anomalia',
    )
    els.btnTorch.disabled = !camera.supportsTorch()
    clearOverlay(els.overlay)
    closeResults()
    updateRefUi()
  } catch (err) {
    console.error(err)
    showScreen('home')
    showToast('Não foi possível abrir a câmera. Verifique a permissão ou use HTTPS.')
  }
}

function stopLiveLoop() {
  state.live = false
  els.btnLive.setAttribute('aria-pressed', 'false')
  els.scan.classList.remove('is-live')
  if (state.raf) cancelAnimationFrame(state.raf)
  state.raf = 0
}

function liveLoop(ts) {
  if (!state.live) return
  if (!liveLoop._last || ts - liveLoop._last > 280) {
    liveLoop._last = ts
    const frame = captureRoi(els.video, els.work)
    if (frame) {
      const result = analyzeImageData(frame.imageData, frame.roi)
      const n = result.defects.length
      setStatus(
        n
          ? `${n} possível(is) defeito(s) · qualidade ${result.surfaceQuality.score}`
          : result.usedReference
            ? 'Monitorando vs referência…'
            : 'Monitorando superfície…',
      )
    }
  }
  state.raf = requestAnimationFrame(liveLoop)
}

function toggleLive() {
  if (state.mode !== 'camera') {
    showToast('O modo ao vivo precisa da câmera.')
    return
  }
  if (state.live) {
    stopLiveLoop()
    setStatus('Ao vivo pausado')
    return
  }
  state.live = true
  els.btnLive.setAttribute('aria-pressed', 'true')
  els.scan.classList.add('is-live')
  setStatus('Análise contínua…')
  state.raf = requestAnimationFrame(liveLoop)
}

function captureCurrentImage() {
  if (state.mode === 'demo' && state.demoImage) return state.demoImage
  const frame = captureRoi(els.video, els.work)
  return frame?.imageData || null
}

function saveCurrentAsReference() {
  const imageData = captureCurrentImage()
  if (!imageData) {
    showToast('Aguarde o frame da câmera para salvar a referência.')
    return
  }
  const ok = saveReference(imageData, {
    presetId: state.presetId,
    label: `Peça boa · ${currentPreset().label}`,
  })
  if (!ok) {
    showToast('Não foi possível salvar a referência neste dispositivo.')
    return
  }
  state.reference = loadReference()
  updateRefUi()
  setStatus('Peça boa salva — agora analise outra peça')
  showToast('Referência salva. Enquadre a peça sob inspeção e toque em Analisar.')
}

function clearCurrentReference() {
  clearReference()
  state.reference = null
  state.demoReference = null
  updateRefUi()
  setStatus('Referência removida')
  showToast('Referência limpa.')
}

function runAnalyze() {
  if (state.busy) return
  state.busy = true
  els.scan.classList.add('is-analyzing')
  setStatus('Analisando…')

  requestAnimationFrame(() => {
    try {
      let result
      if (state.mode === 'demo' && state.demoImage) {
        const size = state.demoImage.width
        const roi = { sx: 0, sy: 0, side: size, vw: size, vh: size }
        result = runDetection(state.demoImage)
        state.lastDefects = result.defects
        state.lastRoi = roi
        drawDefectsOnDemo(result.defects, size)
      } else {
        const frame = captureRoi(els.video, els.work)
        if (!frame) {
          setStatus('Aguardando frame da câmera…')
          return
        }
        result = analyzeImageData(frame.imageData, frame.roi)
      }
      const n = result.defects.length
      setStatus(n ? `${n} detecção(ões)` : 'Nenhum defeito acima do limiar')
      openResults(result)
    } finally {
      state.busy = false
      els.scan.classList.remove('is-analyzing')
    }
  })
}

function drawDefectsOnDemo(defects, size) {
  const canvas = els.overlay
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const scale = Math.min(rect.width / size, rect.height / size)
  const disp = size * scale
  const ox = (rect.width - disp) / 2
  const oy = (rect.height - disp) / 2

  for (const d of defects) {
    const x = ox + d.bbox.x * size * scale
    const y = oy + d.bbox.y * size * scale
    const w = d.bbox.w * size * scale
    const h = d.bbox.h * size * scale
    ctx.strokeStyle = d.color
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
    const label = `${d.label} ${Math.round(d.confidence * 100)}%`
    ctx.font = '600 12px "IBM Plex Sans", sans-serif'
    const textW = ctx.measureText(label).width
    const ly = Math.max(16, y - 6)
    ctx.fillStyle = d.color
    ctx.globalAlpha = 0.9
    ctx.fillRect(x, ly - 14, textW + 12, 18)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#0b1218'
    ctx.fillText(label, x + 6, ly)
  }
}

function startDemo() {
  camera.stop()
  stopLiveLoop()
  showScreen('scan')
  setDemoVisible(true)
  state.mode = 'demo'
  state.presetId = 'metal'
  localStorage.setItem(PRESET_STORAGE, 'metal')
  renderPresets()
  els.btnTorch.disabled = true
  setStatus('Demo: peça boa vs peça com defeitos')

  // Same brush seed → fair comparison; defects only on inspection sample
  state.demoReference = createDemoImageData(320, { defects: false, seed: 42 })
  state.demoImage = createDemoImageData(320, { defects: true, seed: 42 })
  els.demoFrame.width = state.demoImage.width
  els.demoFrame.height = state.demoImage.height
  els.demoFrame.getContext('2d').putImageData(state.demoImage, 0, 0)

  clearOverlay(els.overlay)
  closeResults()
  updateRefUi()
  setTimeout(runAnalyze, 200)
}

async function leaveScan() {
  stopLiveLoop()
  camera.stop()
  state.demoImage = null
  state.demoReference = null
  setDemoVisible(false)
  clearOverlay(els.overlay)
  closeResults()
  state.mode = 'home'
  showScreen('home')
  updateRefUi()
}

els.btnStart.addEventListener('click', startCamera)
els.btnDemo.addEventListener('click', startDemo)
els.btnBack.addEventListener('click', leaveScan)
els.btnFlip.addEventListener('click', async () => {
  if (state.mode !== 'camera') return
  try {
    await camera.flip()
    setStatus('Câmera alternada')
  } catch {
    showToast('Não foi possível alternar a câmera.')
  }
})
els.btnLive.addEventListener('click', toggleLive)
els.btnAnalyze.addEventListener('click', runAnalyze)
els.btnSaveRef.addEventListener('click', saveCurrentAsReference)
els.btnClearRef.addEventListener('click', clearCurrentReference)
els.btnTorch.addEventListener('click', async () => {
  if (state.mode !== 'camera') return
  state.torch = !state.torch
  const ok = await camera.toggleTorch(state.torch)
  if (!ok) {
    state.torch = false
    showToast('Flash não disponível neste dispositivo.')
    return
  }
  setStatus(state.torch ? 'Flash ligado' : 'Flash desligado')
})
els.btnCloseResults.addEventListener('click', closeResults)
els.btnRescan.addEventListener('click', () => {
  closeResults()
  clearOverlay(els.overlay)
  setStatus('Pronto para nova leitura')
})

els.sensitivity.addEventListener('change', () => {
  if (state.mode === 'demo' && !state.live) runAnalyze()
})

window.addEventListener('beforeunload', () => {
  camera.stop()
  stopLiveLoop()
})

if (!window.isSecureContext && location.hostname !== 'localhost') {
  showToast('Câmera exige HTTPS (ou localhost). Use o modo demo se necessário.', 5000)
}

renderPresets()
hydrateReference()

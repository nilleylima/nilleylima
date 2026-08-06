import './style.css'
import { CameraController, captureRoi, drawDefects, clearOverlay } from './camera.js'
import { detectDefects, createDemoImageData, defectColor } from './detector.js'

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
  btnStart: document.getElementById('btn-start'),
  btnDemo: document.getElementById('btn-demo'),
  btnBack: document.getElementById('btn-back'),
  btnFlip: document.getElementById('btn-flip'),
  btnLive: document.getElementById('btn-live'),
  btnAnalyze: document.getElementById('btn-analyze'),
  btnTorch: document.getElementById('btn-torch'),
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
  const { defects, surfaceQuality } = result
  els.results.hidden = false
  requestAnimationFrame(() => els.results.classList.add('is-open'))

  els.resultsTitle.textContent =
    defects.length === 0 ? 'Sem defeitos evidentes' : `${defects.length} detecção(ões)`

  els.resultsSummary.textContent = `${surfaceQuality.label} · qualidade estimada ${surfaceQuality.score}/100. Ajuste a sensibilidade e a iluminação para refinar.`

  els.resultsList.innerHTML = ''
  if (!defects.length) {
    const li = document.createElement('li')
    li.innerHTML = `<span class="defect-badge" style="background:${defectColor('anomaly')}"></span>
      <div class="defect-copy"><strong>Nenhuma anomalia acima do limiar</strong>
      <span>Tente aproximar, melhorar a luz ou subir a sensibilidade.</span></div>
      <span class="defect-score">OK</span>`
    els.resultsList.appendChild(li)
    return
  }

  for (const d of defects) {
    const li = document.createElement('li')
    li.innerHTML = `<span class="defect-badge ${d.type}"></span>
      <div class="defect-copy"><strong>${d.label}</strong>
      <span>Área ${(d.areaRatio * 100).toFixed(2)}% do quadro</span></div>
      <span class="defect-score">${Math.round(d.confidence * 100)}%</span>`
    els.resultsList.appendChild(li)
  }
}

function getSensitivity() {
  return Number(els.sensitivity.value)
}

function analyzeImageData(imageData, roi) {
  const result = detectDefects(imageData, { sensitivity: getSensitivity() })
  state.lastDefects = result.defects
  state.lastRoi = roi
  drawDefects(els.overlay, els.video, result.defects, roi)
  return result
}

function setDemoVisible(on) {
  els.demoFrame.hidden = !on
  els.video.hidden = on
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
    await camera.start('environment')
    setStatus('Aponte para a superfície e toque em Analisar')
    els.btnTorch.disabled = !camera.supportsTorch()
    clearOverlay(els.overlay)
    closeResults()
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
        result = detectDefects(state.demoImage, { sensitivity: getSensitivity() })
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
  els.btnTorch.disabled = true
  setStatus('Modo demo — amostra metálica sintética')

  const imageData = createDemoImageData(320)
  state.demoImage = imageData
  els.demoFrame.width = imageData.width
  els.demoFrame.height = imageData.height
  els.demoFrame.getContext('2d').putImageData(imageData, 0, 0)

  clearOverlay(els.overlay)
  closeResults()
  setTimeout(runAnalyze, 200)
}

async function leaveScan() {
  stopLiveLoop()
  camera.stop()
  state.demoImage = null
  setDemoVisible(false)
  clearOverlay(els.overlay)
  closeResults()
  state.mode = 'home'
  showScreen('home')
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

/** Camera helpers for mobile inspection. */

export class CameraController {
  constructor(videoEl) {
    this.video = videoEl
    this.stream = null
    this.facingMode = 'environment'
    this.track = null
  }

  async start(facingMode = this.facingMode) {
    this.stop()
    this.facingMode = facingMode

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      // Fallback without facingMode ideal for desktop / older browsers
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      })
    }

    this.video.srcObject = this.stream
    this.track = this.stream.getVideoTracks()[0] || null
    await this.video.play()
    return this.stream
  }

  async flip() {
    const next = this.facingMode === 'environment' ? 'user' : 'environment'
    return this.start(next)
  }

  async toggleTorch(on) {
    if (!this.track) return false
    const caps = this.track.getCapabilities?.() || {}
    if (!caps.torch) return false
    await this.track.applyConstraints({ advanced: [{ torch: !!on }] })
    return true
  }

  supportsTorch() {
    const caps = this.track?.getCapabilities?.() || {}
    return Boolean(caps.torch)
  }

  stop() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
    }
    this.stream = null
    this.track = null
    if (this.video) this.video.srcObject = null
  }

  getFrameSize() {
    return {
      width: this.video.videoWidth || 0,
      height: this.video.videoHeight || 0,
    }
  }
}

/**
 * Draw centered square ROI from video into work canvas and return ImageData.
 */
export function captureRoi(video, workCanvas, roiNorm = 0.72, analysisSize = 280) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null

  const side = Math.floor(Math.min(vw, vh) * roiNorm)
  const sx = Math.floor((vw - side) / 2)
  const sy = Math.floor((vh - side) / 2)

  workCanvas.width = analysisSize
  workCanvas.height = analysisSize
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(video, sx, sy, side, side, 0, 0, analysisSize, analysisSize)
  return {
    imageData: ctx.getImageData(0, 0, analysisSize, analysisSize),
    roi: { sx, sy, side, vw, vh },
  }
}

export function drawDefects(overlay, video, defects, roi) {
  const canvas = overlay
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)

  if (!defects?.length || !roi) return

  // Map object-fit:cover video coords → element coords
  const { vw, vh, sx, sy, side } = roi
  const scale = Math.max(rect.width / vw, rect.height / vh)
  const dispW = vw * scale
  const dispH = vh * scale
  const ox = (rect.width - dispW) / 2
  const oy = (rect.height - dispH) / 2

  for (const d of defects) {
    const x = ox + (sx + d.bbox.x * side) * scale
    const y = oy + (sy + d.bbox.y * side) * scale
    const w = d.bbox.w * side * scale
    const h = d.bbox.h * side * scale

    ctx.strokeStyle = d.color
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)

    ctx.fillStyle = d.color
    const label = `${d.label} ${Math.round(d.confidence * 100)}%`
    ctx.font = '600 12px "IBM Plex Sans", sans-serif'
    const padX = 6
    const textW = ctx.measureText(label).width
    const ly = Math.max(16, y - 6)
    ctx.globalAlpha = 0.9
    ctx.fillRect(x, ly - 14, textW + padX * 2, 18)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#0b1218'
    ctx.fillText(label, x + padX, ly)
  }
}

export function clearOverlay(overlay) {
  const ctx = overlay.getContext('2d')
  ctx.clearRect(0, 0, overlay.width, overlay.height)
}

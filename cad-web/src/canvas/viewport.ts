import type { Vec2 } from '../model/types'

export class Viewport {
  offsetX = 0
  offsetY = 0
  scale = 1
  width = 800
  height = 600

  setSize(width: number, height: number) {
    this.width = width
    this.height = height
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    }
  }

  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: wx * this.scale + this.offsetX,
      y: wy * this.scale + this.offsetY,
    }
  }

  pan(dx: number, dy: number) {
    this.offsetX += dx
    this.offsetY += dy
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const before = this.screenToWorld(sx, sy)
    this.scale = Math.min(200, Math.max(0.05, this.scale * factor))
    const after = this.screenToWorld(sx, sy)
    this.offsetX += (after.x - before.x) * this.scale
    this.offsetY += (after.y - before.y) * this.scale
  }

  fitBounds(min: Vec2, max: Vec2, padding = 48) {
    const w = Math.max(1, max.x - min.x)
    const h = Math.max(1, max.y - min.y)
    const sx = (this.width - padding * 2) / w
    const sy = (this.height - padding * 2) / h
    this.scale = Math.min(sx, sy, 40)
    const cx = (min.x + max.x) / 2
    const cy = (min.y + max.y) / 2
    this.offsetX = this.width / 2 - cx * this.scale
    this.offsetY = this.height / 2 - cy * this.scale
  }

  resetView() {
    this.scale = 1
    this.offsetX = this.width / 2
    this.offsetY = this.height / 2
  }
}

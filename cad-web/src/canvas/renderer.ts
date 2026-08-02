import type { CadDocument } from '../model/document'
import { explodeBlockInsert } from '../model/geometry'
import { dimensionLayout, formatLength } from '../model/math'
import type { Entity, Layer, Vec2 } from '../model/types'
import type { SnapResult } from '../model/snap'
import type { Viewport } from './viewport'

export type PreviewPrimitive =
  | { type: 'line'; a: Vec2; b: Vec2; color?: string }
  | { type: 'rect'; a: Vec2; b: Vec2; color?: string }
  | { type: 'circle'; center: Vec2; radius: number; color?: string }
  | { type: 'arc'; center: Vec2; radius: number; startAngle: number; endAngle: number; color?: string }
  | { type: 'polyline'; points: Vec2[]; closed?: boolean; color?: string }
  | { type: 'dimension'; a: Vec2; b: Vec2; offset: number; color?: string }
  | { type: 'crosshair'; point: Vec2; color?: string }
  | { type: 'text'; point: Vec2; text: string; color?: string }

export type RenderState = {
  selectedIds: Set<string>
  hiddenIds?: Set<string>
  hoverId: string | null
  preview: PreviewPrimitive[]
  snap: SnapResult | null
  cursor: Vec2 | null
  showGrid: boolean
  gridSize: number
  units?: 'mm' | 'cm' | 'm'
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private viewport: Viewport

  constructor(ctx: CanvasRenderingContext2D, viewport: Viewport) {
    this.ctx = ctx
    this.viewport = viewport
  }

  clear() {
    const { ctx, viewport } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#0f1419'
    ctx.fillRect(0, 0, viewport.width, viewport.height)
  }

  draw(
    doc: CadDocument,
    state: RenderState,
  ) {
    this.clear()
    if (state.showGrid) this.drawGrid(state.gridSize)
    this.drawAxes()

    const layerMap = new Map(doc.data.layers.map((l) => [l.id, l]))
    const units = state.units ?? 'mm'
    for (const entity of doc.data.entities) {
      if (state.hiddenIds?.has(entity.id)) continue
      const layer = layerMap.get(entity.layerId)
      if (!layer || !layer.visible) continue
      const selected = state.selectedIds.has(entity.id)
      const hovered = state.hoverId === entity.id
      this.drawEntity(doc, entity, layer, selected, hovered, units)
    }

    for (const p of state.preview) this.drawPreview(p, units)
    if (state.snap) this.drawSnap(state.snap)
    if (state.cursor) this.drawCursor(state.cursor)
  }

  private world() {
    const { ctx, viewport } = this
    ctx.setTransform(
      viewport.scale,
      0,
      0,
      viewport.scale,
      viewport.offsetX,
      viewport.offsetY,
    )
  }

  private screen() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  private drawGrid(gridSize: number) {
    const { ctx, viewport } = this
    this.screen()
    const topLeft = viewport.screenToWorld(0, 0)
    const bottomRight = viewport.screenToWorld(viewport.width, viewport.height)
    let step = gridSize
    const screenStep = step * viewport.scale
    if (screenStep < 8) step *= Math.ceil(8 / screenStep)
    const majorEvery = 5

    const startX = Math.floor(topLeft.x / step) * step
    const startY = Math.floor(topLeft.y / step) * step

    for (let x = startX; x <= bottomRight.x; x += step) {
      const s = viewport.worldToScreen(x, 0)
      const major = Math.round(x / step) % majorEvery === 0
      ctx.strokeStyle = major ? 'rgba(120,140,160,0.28)' : 'rgba(120,140,160,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(s.x) + 0.5, 0)
      ctx.lineTo(Math.round(s.x) + 0.5, viewport.height)
      ctx.stroke()
    }
    for (let y = startY; y <= bottomRight.y; y += step) {
      const s = viewport.worldToScreen(0, y)
      const major = Math.round(y / step) % majorEvery === 0
      ctx.strokeStyle = major ? 'rgba(120,140,160,0.28)' : 'rgba(120,140,160,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, Math.round(s.y) + 0.5)
      ctx.lineTo(viewport.width, Math.round(s.y) + 0.5)
      ctx.stroke()
    }
  }

  private drawAxes() {
    const { ctx, viewport } = this
    this.screen()
    const o = viewport.worldToScreen(0, 0)
    ctx.lineWidth = 1.25
    ctx.strokeStyle = 'rgba(240,180,41,0.55)'
    ctx.beginPath()
    ctx.moveTo(0, o.y)
    ctx.lineTo(viewport.width, o.y)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(61,214,198,0.55)'
    ctx.beginPath()
    ctx.moveTo(o.x, 0)
    ctx.lineTo(o.x, viewport.height)
    ctx.stroke()
  }

  private strokeStyle(
    layer: Layer,
    entity: Entity,
    selected: boolean,
    hovered: boolean,
  ) {
    if (selected) return '#ffd166'
    if (hovered) return '#9cdcfe'
    return entity.color ?? layer.color
  }

  private drawEntity(
    doc: CadDocument,
    entity: Entity,
    layer: Layer,
    selected: boolean,
    hovered: boolean,
    units: 'mm' | 'cm' | 'm',
  ) {
    if (entity.type === 'block') {
      const def = doc.data.blocks.find((b) => b.id === entity.blockId)
      if (def) {
        for (const child of explodeBlockInsert(entity, def)) {
          this.drawEntity(doc, child, layer, selected, hovered, units)
        }
      }
      if (selected) {
        this.world()
        const { ctx, viewport } = this
        const size = 6 / viewport.scale
        ctx.fillStyle = '#ffd166'
        ctx.fillRect(
          entity.position.x - size / 2,
          entity.position.y - size / 2,
          size,
          size,
        )
      }
      return
    }

    if (entity.type === 'dimension') {
      this.drawDimension(entity, layer, selected, hovered, units)
      if (selected) this.drawHandles(entity)
      return
    }

    const { ctx, viewport } = this
    this.world()
    ctx.strokeStyle = this.strokeStyle(layer, entity, selected, hovered)
    ctx.lineWidth = (entity.lineWidth ?? 1.5) / viewport.scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    switch (entity.type) {
      case 'line':
        ctx.moveTo(entity.a.x, entity.a.y)
        ctx.lineTo(entity.b.x, entity.b.y)
        break
      case 'rect':
        ctx.rect(
          Math.min(entity.a.x, entity.b.x),
          Math.min(entity.a.y, entity.b.y),
          Math.abs(entity.b.x - entity.a.x),
          Math.abs(entity.b.y - entity.a.y),
        )
        break
      case 'circle':
        ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, Math.PI * 2)
        break
      case 'arc':
        ctx.arc(
          entity.center.x,
          entity.center.y,
          entity.radius,
          entity.startAngle,
          entity.endAngle,
        )
        break
      case 'polyline':
        if (!entity.points.length) break
        ctx.moveTo(entity.points[0].x, entity.points[0].y)
        for (let i = 1; i < entity.points.length; i++) {
          ctx.lineTo(entity.points[i].x, entity.points[i].y)
        }
        if (entity.closed) ctx.closePath()
        break
    }
    ctx.stroke()

    if (selected) this.drawHandles(entity)
  }

  private drawDimension(
    entity: Extract<Entity, { type: 'dimension' }>,
    layer: Layer,
    selected: boolean,
    hovered: boolean,
    units: 'mm' | 'cm' | 'm',
  ) {
    const { ctx, viewport } = this
    const layout = dimensionLayout(entity)
    const color = this.strokeStyle(layer, entity, selected, hovered)
    this.world()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.25 / viewport.scale
    ctx.beginPath()
    ctx.moveTo(layout.a.x, layout.a.y)
    ctx.lineTo(layout.d1.x, layout.d1.y)
    ctx.moveTo(layout.b.x, layout.b.y)
    ctx.lineTo(layout.d2.x, layout.d2.y)
    ctx.moveTo(layout.d1.x, layout.d1.y)
    ctx.lineTo(layout.d2.x, layout.d2.y)
    ctx.stroke()

    // arrowheads
    const dir = {
      x: (layout.d2.x - layout.d1.x) / Math.max(layout.length, 1e-6),
      y: (layout.d2.y - layout.d1.y) / Math.max(layout.length, 1e-6),
    }
    const ah = 6 / viewport.scale
    this.drawArrow(layout.d1, dir, ah, color)
    this.drawArrow(layout.d2, { x: -dir.x, y: -dir.y }, ah, color)

    this.screen()
    const s = viewport.worldToScreen(layout.text.x, layout.text.y)
    ctx.fillStyle = color
    ctx.font = '12px "IBM Plex Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(formatLength(layout.length, units), s.x, s.y - 6)
    ctx.textAlign = 'left'
  }

  private drawArrow(tip: Vec2, dir: Vec2, size: number, color: string) {
    const { ctx } = this
    const n = { x: -dir.y, y: dir.x }
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(tip.x, tip.y)
    ctx.lineTo(tip.x - dir.x * size + n.x * size * 0.35, tip.y - dir.y * size + n.y * size * 0.35)
    ctx.lineTo(tip.x - dir.x * size - n.x * size * 0.35, tip.y - dir.y * size - n.y * size * 0.35)
    ctx.closePath()
    ctx.fill()
  }

  private drawHandles(entity: Entity) {
    const { ctx, viewport } = this
    this.world()
    const size = 5 / viewport.scale
    const points: Vec2[] = []
    switch (entity.type) {
      case 'line':
      case 'dimension':
        points.push(entity.a, entity.b)
        break
      case 'rect':
        points.push(entity.a, entity.b, {
          x: entity.a.x,
          y: entity.b.y,
        }, {
          x: entity.b.x,
          y: entity.a.y,
        })
        break
      case 'circle':
      case 'arc':
        points.push(entity.center)
        break
      case 'polyline':
        points.push(...entity.points)
        break
      case 'block':
        points.push(entity.position)
        break
    }
    ctx.fillStyle = '#ffd166'
    for (const p of points) {
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
    }
  }

  private drawPreview(p: PreviewPrimitive, units: 'mm' | 'cm' | 'm' = 'mm') {
    const { ctx, viewport } = this
    const color = p.color ?? '#7fd4ff'
    if (p.type === 'text') {
      this.screen()
      const s = viewport.worldToScreen(p.point.x, p.point.y)
      ctx.fillStyle = color
      ctx.font = '12px "IBM Plex Mono", monospace'
      ctx.fillText(p.text, s.x + 10, s.y - 10)
      return
    }
    if (p.type === 'crosshair') {
      this.screen()
      const s = viewport.worldToScreen(p.point.x, p.point.y)
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(s.x - 10, s.y)
      ctx.lineTo(s.x + 10, s.y)
      ctx.moveTo(s.x, s.y - 10)
      ctx.lineTo(s.x, s.y + 10)
      ctx.stroke()
      return
    }
    if (p.type === 'dimension') {
      this.drawDimension(
        {
          id: 'preview',
          type: 'dimension',
          layerId: '0',
          a: p.a,
          b: p.b,
          offset: p.offset,
          color,
        },
        { id: '0', name: '0', color, visible: true, locked: false },
        false,
        false,
        units,
      )
      return
    }

    this.world()
    ctx.strokeStyle = color
    ctx.setLineDash([6 / viewport.scale, 4 / viewport.scale])
    ctx.lineWidth = 1.25 / viewport.scale
    ctx.beginPath()
    switch (p.type) {
      case 'line':
        ctx.moveTo(p.a.x, p.a.y)
        ctx.lineTo(p.b.x, p.b.y)
        break
      case 'rect':
        ctx.rect(
          Math.min(p.a.x, p.b.x),
          Math.min(p.a.y, p.b.y),
          Math.abs(p.b.x - p.a.x),
          Math.abs(p.b.y - p.a.y),
        )
        break
      case 'circle':
        ctx.arc(p.center.x, p.center.y, p.radius, 0, Math.PI * 2)
        break
      case 'arc':
        ctx.arc(p.center.x, p.center.y, p.radius, p.startAngle, p.endAngle)
        break
      case 'polyline':
        if (!p.points.length) break
        ctx.moveTo(p.points[0].x, p.points[0].y)
        for (let i = 1; i < p.points.length; i++) {
          ctx.lineTo(p.points[i].x, p.points[i].y)
        }
        if (p.closed) ctx.closePath()
        break
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  private drawSnap(snap: SnapResult) {
    const { ctx, viewport } = this
    this.screen()
    const s = viewport.worldToScreen(snap.point.x, snap.point.y)
    ctx.strokeStyle = '#3dd6c6'
    ctx.fillStyle = 'rgba(61,214,198,0.15)'
    ctx.lineWidth = 1.5
    const size = 8
    ctx.beginPath()
    switch (snap.kind) {
      case 'endpoint':
        ctx.rect(s.x - size / 2, s.y - size / 2, size, size)
        break
      case 'midpoint':
        ctx.moveTo(s.x, s.y - size)
        ctx.lineTo(s.x + size, s.y + size)
        ctx.lineTo(s.x - size, s.y + size)
        ctx.closePath()
        break
      case 'center':
        ctx.arc(s.x, s.y, size * 0.7, 0, Math.PI * 2)
        break
      case 'intersection':
        ctx.moveTo(s.x - size, s.y - size)
        ctx.lineTo(s.x + size, s.y + size)
        ctx.moveTo(s.x + size, s.y - size)
        ctx.lineTo(s.x - size, s.y + size)
        break
      default:
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#3dd6c6'
    ctx.font = '11px "IBM Plex Mono", monospace'
    ctx.fillText(snap.kind.toUpperCase(), s.x + 12, s.y - 12)
  }

  private drawCursor(cursor: Vec2) {
    const { ctx, viewport } = this
    this.screen()
    const s = viewport.worldToScreen(cursor.x, cursor.y)
    ctx.strokeStyle = 'rgba(232,237,242,0.45)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(s.x - 14, s.y)
    ctx.lineTo(s.x + 14, s.y)
    ctx.moveTo(s.x, s.y - 14)
    ctx.lineTo(s.x, s.y + 14)
    ctx.stroke()
  }
}

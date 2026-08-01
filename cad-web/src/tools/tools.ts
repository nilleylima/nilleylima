import type { CadDocument } from '../model/document'
import {
  angle,
  dist,
  formatLength,
  hitTestEntity,
  snapOrtho,
  toDeg,
  uid,
} from '../model/math'
import type { SnapResult } from '../model/snap'
import type {
  AppSettings,
  Entity,
  ToolId,
  Vec2,
} from '../model/types'
import type { PreviewPrimitive } from '../canvas/renderer'

export type ToolContext = {
  doc: CadDocument
  settings: AppSettings
  selectedIds: Set<string>
  setSelected: (ids: string[]) => void
  setStatus: (msg: string) => void
  requestRender: () => void
}

export type PointerInfo = {
  world: Vec2
  snapped: Vec2
  snap: SnapResult | null
  shiftKey: boolean
  altKey: boolean
  button: number
}

export interface Tool {
  id: ToolId
  onActivate?(ctx: ToolContext): void
  onDeactivate?(ctx: ToolContext): void
  onPointerDown(ctx: ToolContext, p: PointerInfo): void
  onPointerMove(ctx: ToolContext, p: PointerInfo): void
  onPointerUp?(ctx: ToolContext, p: PointerInfo): void
  onKeyDown?(ctx: ToolContext, key: string, ev: KeyboardEvent): boolean
  getPreview(): PreviewPrimitive[]
  getHiddenIds?(): string[]
  cancel?(ctx: ToolContext): void
}

function applyOrtho(
  origin: Vec2 | null,
  point: Vec2,
  settings: AppSettings,
  shiftKey: boolean,
): Vec2 {
  if (!origin) return point
  if (settings.ortho || shiftKey) return snapOrtho(origin, point)
  return point
}

function visibleUnlockedEntities(doc: CadDocument): Entity[] {
  const layers = new Map(doc.data.layers.map((l) => [l.id, l]))
  return doc.data.entities.filter((e) => {
    const layer = layers.get(e.layerId)
    return layer && layer.visible && !layer.locked
  })
}

function translateEntity(entity: Entity, dx: number, dy: number): Entity {
  const t = (p: Vec2): Vec2 => ({ x: p.x + dx, y: p.y + dy })
  switch (entity.type) {
    case 'line':
      return { ...entity, a: t(entity.a), b: t(entity.b) }
    case 'rect':
      return { ...entity, a: t(entity.a), b: t(entity.b) }
    case 'circle':
    case 'arc':
      return { ...entity, center: t(entity.center) }
    case 'polyline':
      return { ...entity, points: entity.points.map(t) }
  }
}

function entityToPreview(entity: Entity, color: string): PreviewPrimitive[] {
  switch (entity.type) {
    case 'line':
      return [{ type: 'line', a: entity.a, b: entity.b, color }]
    case 'rect':
      return [{ type: 'rect', a: entity.a, b: entity.b, color }]
    case 'circle':
      return [{ type: 'circle', center: entity.center, radius: entity.radius, color }]
    case 'arc':
      return [{
        type: 'arc',
        center: entity.center,
        radius: entity.radius,
        startAngle: entity.startAngle,
        endAngle: entity.endAngle,
        color,
      }]
    case 'polyline':
      return [{
        type: 'polyline',
        points: entity.points,
        closed: entity.closed,
        color,
      }]
  }
}

export class SelectTool implements Tool {
  id: ToolId = 'select'
  private mode: 'idle' | 'move' = 'idle'
  private start: Vec2 | null = null
  private delta: Vec2 = { x: 0, y: 0 }
  private originals = new Map<string, Entity>()

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    const layerMap = new Map(ctx.doc.data.layers.map((l) => [l.id, l]))
    const hitTol = 8
    let hit: Entity | null = null
    for (const e of [...ctx.doc.data.entities].reverse()) {
      const layer = layerMap.get(e.layerId)
      if (!layer?.visible) continue
      if (hitTestEntity(e, p.world, hitTol)) {
        hit = e
        break
      }
    }

    let selected = [...ctx.selectedIds]
    if (hit) {
      if (p.shiftKey) {
        const next = new Set(selected)
        if (next.has(hit.id)) next.delete(hit.id)
        else next.add(hit.id)
        selected = [...next]
      } else if (!selected.includes(hit.id)) {
        selected = [hit.id]
      }
      ctx.setSelected(selected)

      const locked = layerMap.get(hit.layerId)?.locked
      if (!locked && selected.length) {
        this.mode = 'move'
        this.start = p.snapped
        this.delta = { x: 0, y: 0 }
        this.originals.clear()
        for (const id of selected) {
          const ent = ctx.doc.data.entities.find((e) => e.id === id)
          if (ent) this.originals.set(id, structuredClone(ent))
        }
      }
      ctx.setStatus(`${selected.length} selecionado(s) — arraste para mover`)
    } else {
      if (!p.shiftKey) ctx.setSelected([])
      this.mode = 'idle'
      ctx.setStatus('Pronto')
    }
  }

  onPointerMove(ctx: ToolContext, p: PointerInfo) {
    if (this.mode !== 'move' || !this.start) return
    this.delta = {
      x: p.snapped.x - this.start.x,
      y: p.snapped.y - this.start.y,
    }
    ctx.setStatus(
      `Mover Δx=${this.delta.x.toFixed(1)} Δy=${this.delta.y.toFixed(1)}`,
    )
    ctx.requestRender()
  }

  onPointerUp(ctx: ToolContext) {
    if (
      this.mode === 'move' &&
      (Math.abs(this.delta.x) > 1e-6 || Math.abs(this.delta.y) > 1e-6)
    ) {
      const ids = [...this.originals.keys()]
      const dx = this.delta.x
      const dy = this.delta.y
      ctx.doc.updateEntities(ids, (entity) => {
        const original = this.originals.get(entity.id)
        if (!original) return entity
        return translateEntity(original, dx, dy)
      })
    }
    this.mode = 'idle'
    this.start = null
    this.delta = { x: 0, y: 0 }
    this.originals.clear()
  }

  onKeyDown(ctx: ToolContext, key: string) {
    if (key === 'Delete' || key === 'Backspace') {
      if (!ctx.selectedIds.size) return false
      ctx.doc.removeEntities([...ctx.selectedIds])
      ctx.setSelected([])
      ctx.setStatus('Removido')
      return true
    }
    return false
  }

  getPreview(): PreviewPrimitive[] {
    if (this.mode !== 'move') return []
    const preview: PreviewPrimitive[] = []
    for (const original of this.originals.values()) {
      const moved = translateEntity(original, this.delta.x, this.delta.y)
      preview.push(...entityToPreview(moved, '#ffd166'))
    }
    return preview
  }

  getHiddenIds() {
    if (this.mode !== 'move') return []
    return [...this.originals.keys()]
  }

  cancel(ctx: ToolContext) {
    this.mode = 'idle'
    this.start = null
    this.delta = { x: 0, y: 0 }
    this.originals.clear()
    ctx.setSelected([])
  }
}

export class LineTool implements Tool {
  id: ToolId = 'line'
  private start: Vec2 | null = null
  private current: Vec2 | null = null

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Linha: clique o primeiro ponto')
  }

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    const point = applyOrtho(this.start, p.snapped, ctx.settings, p.shiftKey)
    if (!this.start) {
      this.start = point
      this.current = point
      ctx.setStatus('Linha: clique o segundo ponto (Shift = orto)')
      return
    }
    ctx.doc.addEntity({
      id: uid('line'),
      type: 'line',
      layerId: ctx.doc.activeLayer.id,
      a: this.start,
      b: point,
    })
    this.start = null
    this.current = null
    ctx.setStatus('Linha criada — clique para nova linha')
  }

  onPointerMove(ctx: ToolContext, p: PointerInfo) {
    if (!this.start) {
      this.current = p.snapped
      return
    }
    this.current = applyOrtho(this.start, p.snapped, ctx.settings, p.shiftKey)
    const len = dist(this.start, this.current)
    const ang = toDeg(angle(this.start, this.current))
    ctx.setStatus(
      `Linha L=${formatLength(len, ctx.settings.units)}  ∠=${ang.toFixed(1)}°`,
    )
  }

  getPreview(): PreviewPrimitive[] {
    if (!this.start || !this.current) return []
    return [
      { type: 'line', a: this.start, b: this.current },
      {
        type: 'text',
        point: this.current,
        text: `${dist(this.start, this.current).toFixed(1)}`,
      },
    ]
  }

  cancel(ctx: ToolContext) {
    this.start = null
    this.current = null
    ctx.setStatus('Linha cancelada')
  }

  onKeyDown(ctx: ToolContext, key: string) {
    if (key === 'Escape') {
      this.cancel(ctx)
      return true
    }
    return false
  }
}

export class PolylineTool implements Tool {
  id: ToolId = 'polyline'
  private points: Vec2[] = []
  private current: Vec2 | null = null

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Polilinha: clique pontos — Enter finaliza, C fecha')
  }

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    const origin = this.points[this.points.length - 1] ?? null
    const point = applyOrtho(origin, p.snapped, ctx.settings, p.shiftKey)
    this.points.push(point)
    this.current = point
    ctx.setStatus(`${this.points.length} pontos — Enter para finalizar`)
  }

  onPointerMove(_ctx: ToolContext, p: PointerInfo) {
    const origin = this.points[this.points.length - 1] ?? null
    this.current = applyOrtho(origin, p.snapped, _ctx.settings, p.shiftKey)
  }

  private finish(ctx: ToolContext, closed: boolean) {
    if (this.points.length < 2) {
      ctx.setStatus('Polilinha precisa de 2+ pontos')
      return
    }
    ctx.doc.addEntity({
      id: uid('pl'),
      type: 'polyline',
      layerId: ctx.doc.activeLayer.id,
      points: [...this.points],
      closed,
    })
    this.points = []
    this.current = null
    ctx.setStatus(closed ? 'Polígono criado' : 'Polilinha criada')
  }

  onKeyDown(ctx: ToolContext, key: string) {
    if (key === 'Enter') {
      this.finish(ctx, false)
      return true
    }
    if (key === 'c' || key === 'C') {
      this.finish(ctx, true)
      return true
    }
    if (key === 'Escape') {
      this.cancel(ctx)
      return true
    }
    return false
  }

  getPreview(): PreviewPrimitive[] {
    const pts = [...this.points]
    if (this.current) pts.push(this.current)
    if (pts.length < 2) return []
    return [{ type: 'polyline', points: pts }]
  }

  cancel(ctx: ToolContext) {
    this.points = []
    this.current = null
    ctx.setStatus('Polilinha cancelada')
  }
}

export class RectTool implements Tool {
  id: ToolId = 'rect'
  private start: Vec2 | null = null
  private current: Vec2 | null = null

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Retângulo: canto 1')
  }

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    if (!this.start) {
      this.start = p.snapped
      this.current = p.snapped
      ctx.setStatus('Retângulo: canto oposto')
      return
    }
    ctx.doc.addEntity({
      id: uid('rect'),
      type: 'rect',
      layerId: ctx.doc.activeLayer.id,
      a: this.start,
      b: p.snapped,
    })
    this.start = null
    this.current = null
    ctx.setStatus('Retângulo criado')
  }

  onPointerMove(ctx: ToolContext, p: PointerInfo) {
    this.current = p.snapped
    if (!this.start) return
    const w = Math.abs(p.snapped.x - this.start.x)
    const h = Math.abs(p.snapped.y - this.start.y)
    ctx.setStatus(
      `Retângulo ${formatLength(w, ctx.settings.units)} × ${formatLength(h, ctx.settings.units)}`,
    )
  }

  getPreview(): PreviewPrimitive[] {
    if (!this.start || !this.current) return []
    return [{ type: 'rect', a: this.start, b: this.current }]
  }

  cancel(ctx: ToolContext) {
    this.start = null
    this.current = null
    ctx.setStatus('Retângulo cancelado')
  }

  onKeyDown(ctx: ToolContext, key: string) {
    if (key === 'Escape') {
      this.cancel(ctx)
      return true
    }
    return false
  }
}

export class CircleTool implements Tool {
  id: ToolId = 'circle'
  private center: Vec2 | null = null
  private current: Vec2 | null = null

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Círculo: centro')
  }

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    if (!this.center) {
      this.center = p.snapped
      this.current = p.snapped
      ctx.setStatus('Círculo: raio')
      return
    }
    const radius = dist(this.center, p.snapped)
    if (radius < 1e-6) return
    ctx.doc.addEntity({
      id: uid('circle'),
      type: 'circle',
      layerId: ctx.doc.activeLayer.id,
      center: this.center,
      radius,
    })
    this.center = null
    this.current = null
    ctx.setStatus('Círculo criado')
  }

  onPointerMove(ctx: ToolContext, p: PointerInfo) {
    this.current = p.snapped
    if (!this.center) return
    ctx.setStatus(
      `Raio ${formatLength(dist(this.center, p.snapped), ctx.settings.units)}`,
    )
  }

  getPreview(): PreviewPrimitive[] {
    if (!this.center || !this.current) return []
    const radius = dist(this.center, this.current)
    return [
      { type: 'circle', center: this.center, radius },
      { type: 'line', a: this.center, b: this.current, color: '#f0b429' },
    ]
  }

  cancel(ctx: ToolContext) {
    this.center = null
    this.current = null
    ctx.setStatus('Círculo cancelado')
  }

  onKeyDown(ctx: ToolContext, key: string) {
    if (key === 'Escape') {
      this.cancel(ctx)
      return true
    }
    return false
  }
}

export class ArcTool implements Tool {
  id: ToolId = 'arc'
  private center: Vec2 | null = null
  private startAngle: number | null = null
  private radius = 0
  private current: Vec2 | null = null

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Arco: centro')
  }

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    if (!this.center) {
      this.center = p.snapped
      ctx.setStatus('Arco: ponto inicial')
      return
    }
    if (this.startAngle === null) {
      this.radius = dist(this.center, p.snapped)
      this.startAngle = angle(this.center, p.snapped)
      this.current = p.snapped
      ctx.setStatus('Arco: ponto final')
      return
    }
    const endAngle = angle(this.center, p.snapped)
    ctx.doc.addEntity({
      id: uid('arc'),
      type: 'arc',
      layerId: ctx.doc.activeLayer.id,
      center: this.center,
      radius: this.radius,
      startAngle: this.startAngle,
      endAngle,
    })
    this.center = null
    this.startAngle = null
    this.radius = 0
    this.current = null
    ctx.setStatus('Arco criado')
  }

  onPointerMove(_ctx: ToolContext, p: PointerInfo) {
    this.current = p.snapped
  }

  getPreview(): PreviewPrimitive[] {
    if (!this.center || !this.current) return []
    if (this.startAngle === null) {
      return [{ type: 'line', a: this.center, b: this.current, color: '#f0b429' }]
    }
    return [{
      type: 'arc',
      center: this.center,
      radius: this.radius,
      startAngle: this.startAngle,
      endAngle: angle(this.center, this.current),
    }]
  }

  cancel(ctx: ToolContext) {
    this.center = null
    this.startAngle = null
    this.radius = 0
    this.current = null
    ctx.setStatus('Arco cancelado')
  }

  onKeyDown(ctx: ToolContext, key: string) {
    if (key === 'Escape') {
      this.cancel(ctx)
      return true
    }
    return false
  }
}

export class EraseTool implements Tool {
  id: ToolId = 'erase'

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Apagar: clique em um objeto')
  }

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    const entities = visibleUnlockedEntities(ctx.doc)
    for (const e of [...entities].reverse()) {
      if (hitTestEntity(e, p.world, 8)) {
        ctx.doc.removeEntities([e.id])
        ctx.setStatus('Objeto apagado')
        return
      }
    }
    ctx.setStatus('Nenhum objeto no ponto')
  }

  onPointerMove() {}

  getPreview() {
    return []
  }
}

export class MeasureTool implements Tool {
  id: ToolId = 'measure'
  private start: Vec2 | null = null
  private current: Vec2 | null = null

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Medir: clique dois pontos')
  }

  onPointerDown(ctx: ToolContext, p: PointerInfo) {
    if (!this.start) {
      this.start = p.snapped
      this.current = p.snapped
      return
    }
    const len = dist(this.start, p.snapped)
    const ang = toDeg(angle(this.start, p.snapped))
    ctx.setStatus(
      `Medida: ${formatLength(len, ctx.settings.units)}  ∠ ${ang.toFixed(2)}°  Δx=${(p.snapped.x - this.start.x).toFixed(2)} Δy=${(p.snapped.y - this.start.y).toFixed(2)}`,
    )
    this.start = null
    this.current = null
  }

  onPointerMove(ctx: ToolContext, p: PointerInfo) {
    this.current = p.snapped
    if (!this.start) return
    const len = dist(this.start, p.snapped)
    ctx.setStatus(`Medindo… ${formatLength(len, ctx.settings.units)}`)
  }

  getPreview(): PreviewPrimitive[] {
    if (!this.start || !this.current) return []
    return [
      { type: 'line', a: this.start, b: this.current, color: '#c3e88d' },
      {
        type: 'text',
        point: this.current,
        text: dist(this.start, this.current).toFixed(2),
        color: '#c3e88d',
      },
    ]
  }

  cancel(ctx: ToolContext) {
    this.start = null
    this.current = null
    ctx.setStatus('Medição cancelada')
  }

  onKeyDown(ctx: ToolContext, key: string) {
    if (key === 'Escape') {
      this.cancel(ctx)
      return true
    }
    return false
  }
}

export class PanTool implements Tool {
  id: ToolId = 'pan'

  onActivate(ctx: ToolContext) {
    ctx.setStatus('Pan: arraste para navegar (ou botão do meio / Espaço)')
  }

  onPointerDown() {}
  onPointerMove() {}
  getPreview() {
    return []
  }
}

export function createTools(): Record<ToolId, Tool> {
  return {
    select: new SelectTool(),
    line: new LineTool(),
    polyline: new PolylineTool(),
    rect: new RectTool(),
    circle: new CircleTool(),
    arc: new ArcTool(),
    erase: new EraseTool(),
    measure: new MeasureTool(),
    pan: new PanTool(),
  }
}

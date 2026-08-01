import './style.css'
import { CadDocument } from './model/document'
import { boundsOfEntity } from './model/math'
import { resolveSnap } from './model/snap'
import type { AppSettings, ToolId, Vec2 } from './model/types'
import { Viewport } from './canvas/viewport'
import { Renderer } from './canvas/renderer'
import { createTools, type Tool, type ToolContext } from './tools/tools'

const TOOL_META: Array<{ id: ToolId; label: string; title: string; key: string }> = [
  { id: 'select', label: 'SEL', title: 'Selecionar (V)', key: 'v' },
  { id: 'line', label: 'LIN', title: 'Linha (L)', key: 'l' },
  { id: 'polyline', label: 'PL', title: 'Polilinha (P)', key: 'p' },
  { id: 'rect', label: 'RET', title: 'Retângulo (R)', key: 'r' },
  { id: 'circle', label: 'CIR', title: 'Círculo (C)', key: 'c' },
  { id: 'arc', label: 'ARC', title: 'Arco (A)', key: 'a' },
  { id: 'erase', label: 'ERA', title: 'Apagar (E)', key: 'e' },
  { id: 'measure', label: 'MED', title: 'Medir (M)', key: 'm' },
  { id: 'pan', label: 'PAN', title: 'Pan (H)', key: 'h' },
]

const STORAGE_KEY = 'drafter-cad-v1'

class CadApp {
  doc = new CadDocument()
  viewport = new Viewport()
  settings: AppSettings = {
    gridSize: 10,
    ortho: false,
    showGrid: true,
    units: 'mm',
    snap: {
      endpoint: true,
      midpoint: true,
      center: true,
      intersection: true,
      nearest: false,
      grid: true,
    },
  }

  selectedIds = new Set<string>()
  hoverId: string | null = null
  toolId: ToolId = 'line'
  tools = createTools()
  status = 'Bem-vindo ao Drafter — CAD Web 2D'
  cursor: Vec2 | null = null
  snapLabel = '—'

  private canvas!: HTMLCanvasElement
  private renderer!: Renderer
  private toolButtons = new Map<ToolId, HTMLButtonElement>()
  private statusEl!: HTMLElement
  private coordsEl!: HTMLElement
  private snapEl!: HTMLElement
  private layersEl!: HTMLElement
  private zoomChip!: HTMLElement
  private orthoChip!: HTMLElement
  private gridChip!: HTMLElement

  private spacePan = false
  private middlePan = false
  private panLast: { x: number; y: number } | null = null
  private raf = 0

  mount(root: HTMLElement) {
    root.innerHTML = `
      <div class="app">
        <header class="topbar">
          <div class="brand">
            <div class="brand-mark">DRAFTER<span>.</span></div>
            <div class="brand-sub">CAD Web</div>
          </div>
          <div class="menu">
            <button type="button" data-action="new">Novo</button>
            <button type="button" data-action="open">Abrir</button>
            <button type="button" data-action="save">Salvar JSON</button>
            <button type="button" data-action="export-png">Exportar PNG</button>
            <button type="button" data-action="undo">Desfazer</button>
            <button type="button" data-action="redo">Refazer</button>
            <button type="button" data-action="fit">Enquadrar</button>
            <button type="button" data-action="reset">Origem</button>
          </div>
          <input type="file" id="file-open" accept="application/json,.json" hidden />
        </header>

        <aside class="tools" id="tools"></aside>

        <main class="stage-wrap">
          <canvas id="cad"></canvas>
          <div class="hud">
            <div class="chip" id="zoom-chip">Zoom <strong>100%</strong></div>
            <div class="chip" id="ortho-chip">Orto <strong>OFF</strong></div>
            <div class="chip" id="grid-chip">Grade <strong>10</strong></div>
          </div>
        </main>

        <aside class="side">
          <section>
            <h2>Modos</h2>
            <div class="toggles">
              <button type="button" class="toggle" data-toggle="ortho">Orto (F8)</button>
              <button type="button" class="toggle active" data-toggle="grid">Grade</button>
              <button type="button" class="toggle active" data-toggle="snap-grid">Snap grade</button>
              <button type="button" class="toggle active" data-toggle="snap-end">Snap ponta</button>
              <button type="button" class="toggle active" data-toggle="snap-mid">Snap meio</button>
              <button type="button" class="toggle active" data-toggle="snap-center">Snap centro</button>
              <button type="button" class="toggle active" data-toggle="snap-int">Snap interseção</button>
              <button type="button" class="toggle" data-toggle="snap-near">Snap próximo</button>
            </div>
            <div class="field">
              <label for="grid-size">Espaçamento da grade</label>
              <input id="grid-size" type="number" min="1" step="1" value="10" />
            </div>
            <div class="field">
              <label for="units">Unidades</label>
              <select id="units">
                <option value="mm">Milímetros</option>
                <option value="cm">Centímetros</option>
                <option value="m">Metros</option>
              </select>
            </div>
          </section>

          <section>
            <h2>Camadas</h2>
            <div class="layers" id="layers"></div>
            <div style="margin-top:10px; display:flex; gap:8px;">
              <button type="button" class="ghost" data-action="add-layer">+ Camada</button>
            </div>
          </section>

          <section>
            <h2>Atalhos</h2>
            <div class="help">
              <div><kbd>L</kbd> linha · <kbd>R</kbd> retângulo · <kbd>C</kbd> círculo</div>
              <div><kbd>V</kbd> selecionar · <kbd>Del</kbd> apagar · <kbd>Esc</kbd> cancelar</div>
              <div><kbd>Ctrl+Z</kbd> desfazer · roda = zoom · meio = pan</div>
              <div><kbd>Espaço</kbd> pan temporário · <kbd>F8</kbd> orto</div>
            </div>
          </section>
        </aside>

        <footer class="status">
          <div class="msg" id="status-msg">${this.status}</div>
          <div class="meta" id="coords">X: 0.00  Y: 0.00</div>
          <div class="snap" id="snap-label">SNAP —</div>
        </footer>
      </div>
    `

    this.canvas = root.querySelector('#cad') as HTMLCanvasElement
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    this.renderer = new Renderer(ctx, this.viewport)

    this.statusEl = root.querySelector('#status-msg') as HTMLElement
    this.coordsEl = root.querySelector('#coords') as HTMLElement
    this.snapEl = root.querySelector('#snap-label') as HTMLElement
    this.layersEl = root.querySelector('#layers') as HTMLElement
    this.zoomChip = root.querySelector('#zoom-chip') as HTMLElement
    this.orthoChip = root.querySelector('#ortho-chip') as HTMLElement
    this.gridChip = root.querySelector('#grid-chip') as HTMLElement

    this.buildTools(root.querySelector('#tools') as HTMLElement)
    this.bindUi(root)
    this.bindCanvas()
    this.bindKeys()

    this.doc.subscribe(() => {
      this.persist()
      this.renderLayers()
      this.requestRender()
    })

    this.loadPersisted()
    this.viewport.resetView()
    this.setTool('line')
    this.renderLayers()
    this.syncToggles(root)
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.requestRender()
  }

  private buildTools(host: HTMLElement) {
    for (const tool of TOOL_META) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tool-btn'
      btn.textContent = tool.label
      btn.title = tool.title
      btn.addEventListener('click', () => this.setTool(tool.id))
      host.appendChild(btn)
      this.toolButtons.set(tool.id, btn)
    }
  }

  private bindUi(root: HTMLElement) {
    root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => this.onAction(btn.dataset.action ?? ''))
    })

    root.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onToggle(btn.dataset.toggle ?? '')
        this.syncToggles(root)
        this.requestRender()
      })
    })

    const gridInput = root.querySelector('#grid-size') as HTMLInputElement
    gridInput.addEventListener('change', () => {
      const n = Math.max(1, Number(gridInput.value) || 10)
      this.settings.gridSize = n
      gridInput.value = String(n)
      this.updateHud()
      this.requestRender()
    })

    const units = root.querySelector('#units') as HTMLSelectElement
    units.addEventListener('change', () => {
      this.settings.units = units.value as AppSettings['units']
    })

    const file = root.querySelector('#file-open') as HTMLInputElement
    file.addEventListener('change', async () => {
      const f = file.files?.[0]
      if (!f) return
      try {
        const text = await f.text()
        const next = CadDocument.fromJSON(JSON.parse(text))
        this.doc.replaceDocument(next.toJSON())
        this.selectedIds.clear()
        this.setStatus(`Aberto: ${f.name}`)
        this.fitView()
      } catch (err) {
        this.setStatus(err instanceof Error ? err.message : 'Falha ao abrir')
      }
      file.value = ''
    })
  }

  private bindCanvas() {
    this.canvas.addEventListener('pointerdown', (ev) => this.onPointerDown(ev))
    this.canvas.addEventListener('pointermove', (ev) => this.onPointerMove(ev))
    this.canvas.addEventListener('pointerup', (ev) => this.onPointerUp(ev))
    this.canvas.addEventListener('pointerleave', () => {
      this.cursor = null
      this.requestRender()
    })
    this.canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const sx = ev.clientX - rect.left
      const sy = ev.clientY - rect.top
      const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12
      this.viewport.zoomAt(sx, sy, factor)
      this.updateHud()
      this.requestRender()
    }, { passive: false })
    this.canvas.addEventListener('contextmenu', (ev) => ev.preventDefault())
    this.canvas.addEventListener('dblclick', () => {
      if (this.toolId === 'polyline') {
        this.tools.polyline.onKeyDown?.(this.ctx(), 'Enter', new KeyboardEvent('keydown'))
        this.requestRender()
      }
    })
  }

  private bindKeys() {
    window.addEventListener('keydown', (ev) => {
      const target = ev.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return
      }

      if (ev.code === 'Space') {
        this.spacePan = true
        this.canvas.classList.add('panning')
        ev.preventDefault()
      }

      if (ev.key === 'F8') {
        this.settings.ortho = !this.settings.ortho
        this.syncToggles(document)
        this.updateHud()
        this.setStatus(this.settings.ortho ? 'Orto ON' : 'Orto OFF')
        return
      }

      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault()
        if (ev.shiftKey) this.doc.redo()
        else this.doc.undo()
        this.setStatus(ev.shiftKey ? 'Refazer' : 'Desfazer')
        return
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') {
        ev.preventDefault()
        this.doc.redo()
        this.setStatus('Refazer')
        return
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault()
        this.saveJson()
        return
      }

      if (this.tools[this.toolId].onKeyDown?.(this.ctx(), ev.key, ev)) {
        this.requestRender()
        return
      }

      const tool = TOOL_META.find((t) => t.key === ev.key.toLowerCase())
      if (tool && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        // 'c' also closes polyline — handled above when polyline tool consumes it
        this.setTool(tool.id)
      }
    })

    window.addEventListener('keyup', (ev) => {
      if (ev.code === 'Space') {
        this.spacePan = false
        this.canvas.classList.remove('panning', 'dragging')
        this.panLast = null
      }
    })
  }

  private onAction(action: string) {
    switch (action) {
      case 'new':
        if (this.doc.data.entities.length && !confirm('Descartar desenho atual?')) return
        this.doc.replaceDocument(new CadDocument().toJSON())
        this.selectedIds.clear()
        this.viewport.resetView()
        this.setStatus('Novo desenho')
        break
      case 'open':
        (document.querySelector('#file-open') as HTMLInputElement).click()
        break
      case 'save':
        this.saveJson()
        break
      case 'export-png':
        this.exportPng()
        break
      case 'undo':
        this.doc.undo()
        this.setStatus('Desfazer')
        break
      case 'redo':
        this.doc.redo()
        this.setStatus('Refazer')
        break
      case 'fit':
        this.fitView()
        break
      case 'reset':
        this.viewport.resetView()
        this.updateHud()
        this.requestRender()
        this.setStatus('Vista na origem')
        break
      case 'add-layer':
        this.doc.addLayer()
        this.setStatus('Camada adicionada')
        break
    }
  }

  private onToggle(name: string) {
    switch (name) {
      case 'ortho':
        this.settings.ortho = !this.settings.ortho
        break
      case 'grid':
        this.settings.showGrid = !this.settings.showGrid
        break
      case 'snap-grid':
        this.settings.snap.grid = !this.settings.snap.grid
        break
      case 'snap-end':
        this.settings.snap.endpoint = !this.settings.snap.endpoint
        break
      case 'snap-mid':
        this.settings.snap.midpoint = !this.settings.snap.midpoint
        break
      case 'snap-center':
        this.settings.snap.center = !this.settings.snap.center
        break
      case 'snap-int':
        this.settings.snap.intersection = !this.settings.snap.intersection
        break
      case 'snap-near':
        this.settings.snap.nearest = !this.settings.snap.nearest
        break
    }
    this.updateHud()
  }

  private syncToggles(root: ParentNode) {
    const map: Record<string, boolean> = {
      ortho: this.settings.ortho,
      grid: this.settings.showGrid,
      'snap-grid': this.settings.snap.grid,
      'snap-end': this.settings.snap.endpoint,
      'snap-mid': this.settings.snap.midpoint,
      'snap-center': this.settings.snap.center,
      'snap-int': this.settings.snap.intersection,
      'snap-near': this.settings.snap.nearest,
    }
    root.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
      const key = btn.dataset.toggle ?? ''
      btn.classList.toggle('active', !!map[key])
    })
    this.updateHud()
  }

  private setTool(id: ToolId) {
    const prev = this.tools[this.toolId]
    prev.onDeactivate?.(this.ctx())
    prev.cancel?.(this.ctx())
    this.toolId = id
    this.tools[id].onActivate?.(this.ctx())
    for (const [tid, btn] of this.toolButtons) {
      btn.classList.toggle('active', tid === id)
    }
    this.canvas.classList.toggle('panning', id === 'pan')
    this.requestRender()
  }

  private ctx(): ToolContext {
    return {
      doc: this.doc,
      settings: this.settings,
      selectedIds: this.selectedIds,
      setSelected: (ids) => {
        this.selectedIds = new Set(ids)
        this.requestRender()
      },
      setStatus: (msg) => this.setStatus(msg),
      requestRender: () => this.requestRender(),
    }
  }

  private setStatus(msg: string) {
    this.status = msg
    this.statusEl.textContent = msg
  }

  private screenPos(ev: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
  }

  private pointerInfo(ev: PointerEvent) {
    const screen = this.screenPos(ev)
    const world = this.viewport.screenToWorld(screen.x, screen.y)
    const tol = 12 / this.viewport.scale
    const entities = this.doc.data.entities.filter((e) => {
      const layer = this.doc.data.layers.find((l) => l.id === e.layerId)
      return layer?.visible
    })
    const snap = resolveSnap(
      world,
      entities,
      this.settings.snap,
      tol,
      this.settings.gridSize,
    )
    const snapped = snap?.point ?? world
    this.cursor = snapped
    this.snapLabel = snap ? snap.kind.toUpperCase() : '—'
    this.snapEl.textContent = `SNAP ${this.snapLabel}`
    this.coordsEl.textContent = `X: ${snapped.x.toFixed(2)}  Y: ${snapped.y.toFixed(2)}`
    return {
      world,
      snapped,
      snap,
      shiftKey: ev.shiftKey,
      altKey: ev.altKey,
      button: ev.button,
      screen,
    }
  }

  private onPointerDown(ev: PointerEvent) {
    this.canvas.setPointerCapture(ev.pointerId)
    const info = this.pointerInfo(ev)
    const panning =
      this.toolId === 'pan' ||
      this.spacePan ||
      ev.button === 1 ||
      (ev.button === 2 && this.toolId !== 'select')

    if (panning) {
      this.middlePan = true
      this.panLast = info.screen
      this.canvas.classList.add('panning', 'dragging')
      return
    }

    if (ev.button !== 0) return
    this.tools[this.toolId].onPointerDown(this.ctx(), info)
    this.requestRender()
  }

  private onPointerMove(ev: PointerEvent) {
    const info = this.pointerInfo(ev)
    if (this.middlePan && this.panLast) {
      const dx = info.screen.x - this.panLast.x
      const dy = info.screen.y - this.panLast.y
      this.viewport.pan(dx, dy)
      this.panLast = info.screen
      this.requestRender()
      return
    }
    this.tools[this.toolId].onPointerMove(this.ctx(), info)
    this.requestRender()
  }

  private onPointerUp(ev: PointerEvent) {
    if (this.middlePan) {
      this.middlePan = false
      this.panLast = null
      if (this.toolId !== 'pan' && !this.spacePan) {
        this.canvas.classList.remove('panning', 'dragging')
      } else {
        this.canvas.classList.remove('dragging')
      }
      return
    }
    const info = this.pointerInfo(ev)
    this.tools[this.toolId].onPointerUp?.(this.ctx(), info)
    this.requestRender()
  }

  private resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    const ctx = this.canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.viewport.setSize(rect.width, rect.height)
    this.requestRender()
  }

  private updateHud() {
    this.zoomChip.innerHTML = `Zoom <strong>${Math.round(this.viewport.scale * 100)}%</strong>`
    this.orthoChip.innerHTML = `Orto <strong>${this.settings.ortho ? 'ON' : 'OFF'}</strong>`
    this.gridChip.innerHTML = `Grade <strong>${this.settings.gridSize}</strong>`
  }

  private fitView() {
    if (!this.doc.data.entities.length) {
      this.viewport.resetView()
    } else {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const e of this.doc.data.entities) {
        const b = boundsOfEntity(e)
        if (!b) continue
        minX = Math.min(minX, b.min.x)
        minY = Math.min(minY, b.min.y)
        maxX = Math.max(maxX, b.max.x)
        maxY = Math.max(maxY, b.max.y)
      }
      if (Number.isFinite(minX)) {
        this.viewport.fitBounds({ x: minX, y: minY }, { x: maxX, y: maxY })
      } else {
        this.viewport.resetView()
      }
    }
    this.updateHud()
    this.requestRender()
    this.setStatus('Vista enquadrada')
  }

  private renderLayers() {
    this.layersEl.innerHTML = ''
    for (const layer of this.doc.data.layers) {
      const row = document.createElement('div')
      row.className = `layer-row${layer.id === this.doc.data.activeLayerId ? ' active' : ''}`
      row.innerHTML = `
        <button type="button" class="icon ${layer.visible ? 'on' : ''}" data-vis title="Visível">${layer.visible ? 'V' : '-'}</button>
        <button type="button" class="icon ${layer.locked ? 'on' : ''}" data-lock title="Travar">${layer.locked ? 'L' : 'U'}</button>
        <span class="swatch" style="background:${layer.color}"></span>
        <span class="name">${layer.name}</span>
      `
      row.addEventListener('click', (ev) => {
        const t = ev.target as HTMLElement
        if (t.matches('[data-vis]')) {
          this.doc.toggleLayerVisible(layer.id)
          return
        }
        if (t.matches('[data-lock]')) {
          this.doc.toggleLayerLocked(layer.id)
          return
        }
        this.doc.setActiveLayer(layer.id)
        this.renderLayers()
        this.setStatus(`Camada ativa: ${layer.name}`)
      })
      this.layersEl.appendChild(row)
    }
  }

  private saveJson() {
    const blob = new Blob([JSON.stringify(this.doc.toJSON(), null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `desenho-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    this.setStatus('JSON salvo')
  }

  private exportPng() {
    const link = document.createElement('a')
    link.download = `desenho-${new Date().toISOString().slice(0, 10)}.png`
    link.href = this.canvas.toDataURL('image/png')
    link.click()
    this.setStatus('PNG exportado')
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.doc.toJSON()))
    } catch {
      /* ignore quota */
    }
  }

  private loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const next = CadDocument.fromJSON(JSON.parse(raw))
      this.doc = next
      this.doc.subscribe(() => {
        this.persist()
        this.renderLayers()
        this.requestRender()
      })
    } catch {
      /* ignore */
    }
  }

  private currentTool(): Tool {
    return this.tools[this.toolId]
  }

  requestRender() {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      this.paint()
    })
  }

  private paint() {
    const snap = this.cursor
      ? resolveSnap(
          this.cursor,
          this.doc.data.entities.filter((e) => {
            const layer = this.doc.data.layers.find((l) => l.id === e.layerId)
            return layer?.visible
          }),
          this.settings.snap,
          12 / this.viewport.scale,
          this.settings.gridSize,
        )
      : null

    const tool = this.currentTool()
    this.renderer.draw(this.doc, {
      selectedIds: this.selectedIds,
      hiddenIds: new Set(tool.getHiddenIds?.() ?? []),
      hoverId: this.hoverId,
      preview: tool.getPreview(),
      snap,
      cursor: this.cursor,
      showGrid: this.settings.showGrid,
      gridSize: this.settings.gridSize,
    })
    this.updateHud()
  }
}

const root = document.querySelector('#app')
if (root) new CadApp().mount(root as HTMLElement)

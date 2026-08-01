export type Vec2 = { x: number; y: number }

export type ToolId =
  | 'select'
  | 'line'
  | 'polyline'
  | 'rect'
  | 'circle'
  | 'arc'
  | 'erase'
  | 'measure'
  | 'pan'

export type EntityBase = {
  id: string
  layerId: string
  color?: string
  lineWidth?: number
}

export type LineEntity = EntityBase & {
  type: 'line'
  a: Vec2
  b: Vec2
}

export type PolylineEntity = EntityBase & {
  type: 'polyline'
  points: Vec2[]
  closed: boolean
}

export type RectEntity = EntityBase & {
  type: 'rect'
  a: Vec2
  b: Vec2
}

export type CircleEntity = EntityBase & {
  type: 'circle'
  center: Vec2
  radius: number
}

export type ArcEntity = EntityBase & {
  type: 'arc'
  center: Vec2
  radius: number
  startAngle: number
  endAngle: number
}

export type Entity =
  | LineEntity
  | PolylineEntity
  | RectEntity
  | CircleEntity
  | ArcEntity

export type Layer = {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
}

export type DocumentData = {
  version: 1
  layers: Layer[]
  entities: Entity[]
  activeLayerId: string
}

export type SnapMode = {
  endpoint: boolean
  midpoint: boolean
  center: boolean
  intersection: boolean
  nearest: boolean
  grid: boolean
}

export type AppSettings = {
  gridSize: number
  ortho: boolean
  snap: SnapMode
  showGrid: boolean
  units: 'mm' | 'cm' | 'm'
}

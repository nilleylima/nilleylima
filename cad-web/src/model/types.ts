export type Vec2 = { x: number; y: number }

export type ToolId =
  | 'select'
  | 'line'
  | 'polyline'
  | 'rect'
  | 'circle'
  | 'arc'
  | 'dimension'
  | 'block'
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

/** Cota linear: pontos a/b medidos; offset = distância assinada da linha de cota. */
export type DimensionEntity = EntityBase & {
  type: 'dimension'
  a: Vec2
  b: Vec2
  offset: number
}

/** Inserção de bloco no desenho. */
export type BlockInsertEntity = EntityBase & {
  type: 'block'
  blockId: string
  position: Vec2
  rotation: number
  scale: number
}

export type PrimitiveEntity =
  | LineEntity
  | PolylineEntity
  | RectEntity
  | CircleEntity
  | ArcEntity
  | DimensionEntity

export type Entity = PrimitiveEntity | BlockInsertEntity

export type BlockDefinition = {
  id: string
  name: string
  base: Vec2
  entities: PrimitiveEntity[]
}

export type Layer = {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
}

export type DocumentData = {
  version: 2
  layers: Layer[]
  entities: Entity[]
  blocks: BlockDefinition[]
  activeLayerId: string
  activeBlockId?: string | null
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

export type Category = 'fabric' | 'trim' | 'label' | 'packaging' | 'labor' | 'other'
export type Unit = 'yd' | 'm' | 'pc' | 'hr' | 'set'
export type Rounding = 'none' | 'whole' | '.95' | '.99' | '5'
export type PageSize = 'LETTER' | 'A4'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'trim', label: 'Trims & notions' },
  { id: 'label', label: 'Labels & tags' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'labor', label: 'Labor' },
  { id: 'other', label: 'Other' },
]
export const UNITS: Unit[] = ['yd', 'm', 'pc', 'hr', 'set']

/** Categories that get the wastage allowance added (cutting loss, spoilage). */
export const WASTAGE_CATEGORIES: Category[] = ['fabric', 'trim']

export interface Brand {
  name: string
  contact: string
  email: string
  phone: string
  website: string
  logoPhotoId?: string
  orderTerms: string
  paymentTerms: string
  moq: string
  shipWindow: string
}

export interface Settings {
  id: 'settings'
  currency: string
  locale: string
  marginPct: number
  retailMultiplier: number
  rounding: Rounding
  wastagePct: number
  pageSize: PageSize
  brand: Brand
  lastExportAt?: number
  seededVersion: number
}

export interface Component {
  id: string
  name: string
  category: Category
  unit: Unit
  unitCost: number
  supplier: string
  notes: string
  builtIn: boolean
  hidden?: boolean
  updatedAt: number
}

export interface TemplateLine {
  componentId?: string
  name: string
  category: Category
  unit: Unit
  qty: number
}

export interface Template {
  id: string
  name: string
  builtIn: boolean
  hidden?: boolean
  lines: TemplateLine[]
  labor: number
  updatedAt: number
}

export interface CostLine {
  id: string
  componentId?: string
  name: string
  category: Category
  unit: Unit
  qty: number
  unitCost: number
}

export interface Style {
  id: string
  styleNumber: string
  name: string
  templateId?: string
  collection: string
  description: string
  fabrication: string
  colorways: string
  sizeRange: string
  moq: string
  lines: CostLine[]
  labor: number
  overhead: number
  freightDutyPct: number
  wastagePct?: number
  marginPct?: number
  retailMultiplier?: number
  wholesaleOverride?: number
  retailOverride?: number
  photoIds: string[]
  createdAt: number
  updatedAt: number
}

export interface Photo {
  id: string
  ownerId: string
  blob: Blob
  thumb: Blob
  updatedAt: number
}

export type LineSheetLayout = 'grid-2' | 'grid-3' | 'list'

export interface LineSheet {
  id: string
  title: string
  season: string
  styleIds: string[]
  layout: LineSheetLayout
  showRetail: boolean
  orderDeadline: string
  notes: string
  updatedAt: number
}

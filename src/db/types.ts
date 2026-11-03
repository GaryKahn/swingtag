export type Category = 'fabric' | 'trim' | 'label' | 'packaging' | 'labor' | 'other'
export type Unit = 'yd' | 'm' | 'pc' | 'hr' | 'set'
export type Rounding = 'none' | 'whole' | '.95' | '.99' | '5'
export type PageSize = 'LETTER' | 'A4'
export type Measurement = 'metric' | 'imperial'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'trim', label: 'Trims & notions' },
  { id: 'label', label: 'Labels & tags' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'labor', label: 'Labor' },
  { id: 'other', label: 'Other' },
]
export const UNITS: Unit[] = ['m', 'yd', 'pc', 'set', 'hr']
/** Units counted in whole pieces get a +/- stepper instead of a decimal field. */
export const COUNT_UNITS: Unit[] = ['pc', 'set']
export const lengthUnit = (m: Measurement): Unit => (m === 'imperial' ? 'yd' : 'm')

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
  /** Company details printed on invoices. */
  legalName: string
  address: string
  regNo: string
  vatNo: string
  bank: BankDetails
}

export interface BankDetails {
  bankName: string
  accountName: string
  accountNumber: string
  branchCode: string
  accountType: string
  swift: string
  iban: string
  reference: string
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
  measurement: Measurement
  vatPct: number
  invoicePrefix: string
  nextInvoiceNumber: number
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
  /** Country of origin, for invoices/customs. */
  origin: string
  hsCode: string
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
  includeOrderForm?: boolean
  updatedAt: number
}

export interface Address {
  name: string
  contact: string
  email: string
  phone: string
  address: string
}

export interface OrderLine {
  id: string
  styleId: string
  /** Snapshot of the style at the time of ordering, so invoices don't change if the style is edited later. */
  styleNumber: string
  name: string
  colour: string
  fabrication: string
  description: string
  origin: string
  hsCode: string
  photoId?: string
  sizes: string[]
  qty: Record<string, number>
  unitPrice: number
  rrp: number
}

export type OrderStatus = 'draft' | 'confirmed' | 'invoiced' | 'paid'

export interface Order {
  id: string
  number: string
  poNumber: string
  date: string
  dispatchDate: string
  dueDate: string
  status: OrderStatus
  store: Address
  delivery: Address
  deliverySameAsStore: boolean
  paymentTerms: string
  shippingTerms: string
  depositPct: number
  vatPct: number
  currency: string
  notes: string
  lines: OrderLine[]
  createdAt: number
  updatedAt: number
}

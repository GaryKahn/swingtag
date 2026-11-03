import type { Workbook, Worksheet } from 'exceljs'
import type { Address, OrderLine, Settings } from '../db/types'
import { uid } from '../db/schema'

/**
 * Excel order sheet (.xlsx). Opens in Excel, Google Sheets and Apple Numbers.
 * A hidden "_costsheet" tab maps each yellow qty cell back to a style/colour/size,
 * so a filled-in sheet can be imported as an order.
 */

const META_SHEET = '_costsheet'
const INPUT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6C7' } } as const
const HEAD_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1917' } } as const
const THIN = { style: 'thin', color: { argb: 'FFD6D3D1' } } as const
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }

export interface OrderSheetInput {
  title: string
  season: string
  orderDeadline?: string
  lines: OrderLine[]
  store?: Address
  delivery?: Address
  poNumber?: string
  showRetail?: boolean
}

type ImageLoader = (photoId: string | undefined) => Promise<string | undefined>

const BUYER_FIELDS: { key: string; label: string; get: (i: OrderSheetInput) => string }[] = [
  { key: 'store.name', label: 'Store name', get: (i) => i.store?.name ?? '' },
  { key: 'store.contact', label: 'Buyer / contact', get: (i) => i.store?.contact ?? '' },
  { key: 'store.email', label: 'Email', get: (i) => i.store?.email ?? '' },
  { key: 'store.phone', label: 'Phone', get: (i) => i.store?.phone ?? '' },
  { key: 'store.address', label: 'Billing address', get: (i) => i.store?.address ?? '' },
  { key: 'delivery.address', label: 'Delivery address (if different)', get: (i) => i.delivery?.address ?? '' },
  { key: 'poNumber', label: 'PO number', get: (i) => i.poNumber ?? '' },
]

async function loadExcel() {
  const m = await import('exceljs')
  return ((m as { default?: unknown }).default ?? m) as typeof import('exceljs')
}

export async function buildOrderSheet(input: OrderSheetInput, settings: Settings, loadImage?: ImageLoader): Promise<Blob> {
  const ExcelJS = await loadExcel()
  const wb: Workbook = new ExcelJS.Workbook()
  wb.creator = settings.brand.name || 'Costsheet'
  wb.created = new Date()
  wb.calcProperties.fullCalcOnLoad = true
  const ws = wb.addWorksheet('Order sheet', {
    pageSetup: { paperSize: (settings.pageSize === 'A4' ? 9 : undefined) as never, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }],
  })
  const meta = wb.addWorksheet(META_SHEET, { state: 'veryHidden' })
  meta.addRow(['costsheet-order-sheet', 1, settings.currency])

  const cur = settings.currency
  const showRetail = input.showRetail ?? true
  const moneyFmt = `"${currencySymbol(cur, settings.locale)}"#,##0.00`
  // A NO | B STYLE NO | C STYLE NAME | D IMAGE | E MATERIAL | F COLOUR | G ORIGIN | H SIZE | I QTY | J LINE QTY | K WSP | L RRP | M TOTAL
  ws.columns = [5, 13, 20, 15, 30, 13, 10, 8, 9, 10, 13, 13, 15].map((width) => ({ width }))

  const b = settings.brand
  ws.getCell('A1').value = b.name || 'Order sheet'
  ws.getCell('A1').font = { size: 18, bold: true }
  ws.getCell('A2').value = [input.title, input.season].filter(Boolean).join(' — ')
  ws.getCell('A2').font = { size: 12 }
  ws.getCell('A3').value = 'ORDER SHEET'
  ws.getCell('A3').font = { size: 10, bold: true, color: { argb: 'FF78716C' } }
  const contact = [b.email, b.phone, b.website].filter(Boolean).join('  ·  ')
  if (contact) {
    ws.getCell('H1').value = contact
    ws.getCell('H1').font = { size: 9, color: { argb: 'FF78716C' } }
  }

  // Buyer details (yellow = fill in)
  let r = 5
  ws.getCell(`A${r - 1}`).value = 'Your details — please fill in the yellow cells and email this sheet back'
  ws.getCell(`A${r - 1}`).font = { italic: true, size: 9, color: { argb: 'FF78716C' } }
  for (const f of BUYER_FIELDS) {
    ws.mergeCells(`A${r}:B${r}`)
    ws.mergeCells(`C${r}:F${r}`)
    ws.getCell(`A${r}`).value = f.label
    ws.getCell(`A${r}`).font = { bold: true, size: 9 }
    const c = ws.getCell(`C${r}`)
    c.value = f.get(input)
    c.fill = INPUT_FILL
    c.border = BORDER
    meta.addRow(['field', f.key, `C${r}`])
    r++
  }
  // Terms on the right of the buyer block
  const terms: [string, string][] = ([
    ['Order deadline', input.orderDeadline ?? ''],
    ['Delivery window', b.shipWindow],
    ['Minimums', b.moq],
    ['Payment terms', b.paymentTerms],
    ['Terms', b.orderTerms],
  ] as [string, string][]).filter(([, v]) => v)
  terms.forEach(([k, v], i) => {
    const row = 5 + i
    ws.getCell(`H${row}`).value = k
    ws.getCell(`H${row}`).font = { bold: true, size: 9 }
    ws.mergeCells(`J${row}:M${row}`)
    ws.getCell(`J${row}`).value = v
    ws.getCell(`J${row}`).font = { size: 9 }
  })

  // Item header
  r += 1
  const headRow = r
  const heads = ['NO.', 'STYLE NO.', 'STYLE NAME', 'IMAGE', 'MATERIAL', 'COLOUR', 'ORIGIN', 'SIZE', 'QTY', 'LINE QTY', `WSP (${cur})`, showRetail ? `RRP (${cur})` : '', `TOTAL (${cur})`]
  heads.forEach((h, i) => {
    const c = ws.getRow(r).getCell(i + 1)
    c.value = h
    c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    c.fill = HEAD_FILL
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  })
  ws.getRow(r).height = 22
  r++

  const imageIds = new Map<string, number>()
  const blockTotals: string[] = []
  const blockQtys: string[] = []
  for (const [n, l] of input.lines.entries()) {
    const rows = Math.max(l.sizes.length, 5)
    const top = r
    const bottom = r + rows - 1
    for (let i = 0; i < rows; i++) ws.getRow(r + i).height = 20
    const merged = (col: string, value: ExcelValue, opts: { money?: boolean; wrap?: boolean; bold?: boolean } = {}) => {
      ws.mergeCells(`${col}${top}:${col}${bottom}`)
      const c = ws.getCell(`${col}${top}`)
      c.value = value
      c.alignment = { vertical: 'middle', horizontal: opts.money ? 'right' : 'center', wrapText: opts.wrap ?? true }
      if (opts.money) c.numFmt = moneyFmt
      if (opts.bold) c.font = { bold: true }
      c.border = BORDER
      return c
    }
    merged('A', n + 1)
    merged('B', l.styleNumber, { bold: true })
    merged('C', l.name)
    merged('D', '')
    merged('E', l.fabrication).font = { size: 8 }
    merged('F', l.colour, { bold: true })
    merged('G', l.origin)
    l.sizes.forEach((s, i) => {
      const row = top + i
      const sc = ws.getCell(`H${row}`)
      sc.value = s
      sc.alignment = { horizontal: 'center' }
      sc.border = BORDER
      const qc = ws.getCell(`I${row}`)
      qc.value = l.qty[s] || 0
      qc.fill = INPUT_FILL
      qc.border = BORDER
      qc.alignment = { horizontal: 'center' }
      meta.addRow(['line', l.styleId, l.styleNumber, l.name, l.colour, s, `I${row}`, l.unitPrice, l.rrp, l.fabrication, l.origin, l.hsCode, l.photoId ?? '', l.sizes.join('|')])
    })
    for (let row = top + l.sizes.length; row <= bottom; row++) ['H', 'I'].forEach((c) => (ws.getCell(`${c}${row}`).border = BORDER))
    const qtyRange = `I${top}:I${top + l.sizes.length - 1}`
    merged('J', { formula: `SUM(${qtyRange})`, result: l.sizes.reduce((a, s) => a + (l.qty[s] || 0), 0) }, { bold: true })
    merged('K', l.unitPrice, { money: true })
    merged('L', showRetail ? l.rrp : '', { money: true })
    const lineQty = l.sizes.reduce((a, s) => a + (l.qty[s] || 0), 0)
    merged('M', { formula: `J${top}*K${top}`, result: lineQty * l.unitPrice }, { money: true, bold: true })
    blockQtys.push(`J${top}`)
    blockTotals.push(`M${top}`)

    let id = l.photoId ? imageIds.get(l.photoId) : undefined
    if (id === undefined && l.photoId) {
      const img = await loadImage?.(l.photoId)
      if (img) imageIds.set(l.photoId, (id = wb.addImage({ base64: img, extension: 'jpeg' })))
    }
    if (id !== undefined) {
      // column D is ~110px wide; rows are 20pt (~27px)
      ws.addImage(id, { tl: { col: 3.1, row: top - 1 + 0.15 }, ext: { width: 96, height: 128 }, editAs: 'oneCell' })
    }
    r = bottom + 1
  }

  // Totals
  r += 1
  ws.getCell(`H${r}`).value = 'TOTAL'
  ws.getCell(`H${r}`).font = { bold: true }
  ws.getCell(`J${r}`).value = blockQtys.length ? { formula: blockQtys.join('+'), result: 0 } : 0
  ws.getCell(`J${r}`).font = { bold: true }
  ws.getCell(`J${r}`).alignment = { horizontal: 'center' }
  ws.mergeCells(`K${r}:L${r}`)
  ws.getCell(`M${r}`).value = blockTotals.length ? { formula: blockTotals.join('+'), result: 0 } : 0
  ws.getCell(`M${r}`).numFmt = moneyFmt
  ws.getCell(`M${r}`).font = { bold: true }
  ;[`H${r}`, `I${r}`, `J${r}`, `K${r}`, `M${r}`].forEach((a) => (ws.getCell(a).border = { top: { style: 'medium' } }))
  r += 2
  ws.getCell(`A${r}`).value = `Prices exclude VAT and shipping unless stated. Prices in ${cur}.`
  ws.getCell(`A${r}`).font = { italic: true, size: 9, color: { argb: 'FF78716C' } }

  ws.views = [{ state: 'frozen', ySplit: headRow, showGridLines: false }]
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

type ExcelValue = string | number | { formula: string; result: number }

function currencySymbol(currency: string, locale?: string) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

export interface ImportedOrder {
  store: Address
  delivery: Address
  deliverySameAsStore: boolean
  poNumber: string
  currency: string
  lines: OrderLine[]
}

const cellText = (ws: Worksheet, addr: string) => {
  const v = ws.getCell(addr).value as unknown
  if (v == null) return ''
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] }
    if (o.richText) return o.richText.map((t) => t.text).join('')
    if (o.text) return String(o.text)
    if (o.result != null) return String(o.result)
    return ''
  }
  return String(v).trim()
}

/** Read a filled-in order sheet that this app generated. */
export async function readOrderSheet(data: ArrayBuffer): Promise<ImportedOrder> {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(data)
  } catch {
    throw new Error("That file isn't a readable .xlsx spreadsheet.")
  }
  const meta = wb.getWorksheet(META_SHEET)
  const ws = wb.getWorksheet('Order sheet') ?? wb.worksheets[0]
  if (!meta || !ws || cellText(meta, 'A1') !== 'costsheet-order-sheet')
    throw new Error("This spreadsheet wasn't made by Costsheet, so it can't be read automatically. Enter the order by hand instead.")

  const out: ImportedOrder = {
    store: { name: '', contact: '', email: '', phone: '', address: '' },
    delivery: { name: '', contact: '', email: '', phone: '', address: '' },
    deliverySameAsStore: true,
    poNumber: '',
    currency: cellText(meta, 'C1') || 'ZAR',
    lines: [],
  }
  const byKey = new Map<string, OrderLine>()
  meta.eachRow((row, i) => {
    if (i === 1) return
    const v = (n: number) => {
      const x = row.getCell(n).value
      return x == null ? '' : String(x)
    }
    if (v(1) === 'field') {
      const [obj, prop] = v(2).split('.')
      const text = cellText(ws, v(3))
      if (obj === 'poNumber') out.poNumber = text
      else if (obj === 'store' || obj === 'delivery') (out[obj] as unknown as Record<string, string>)[prop] = text
    } else if (v(1) === 'line') {
      const key = `${v(2)}|${v(5)}`
      let line = byKey.get(key)
      if (!line) {
        line = {
          id: uid(), styleId: v(2), styleNumber: v(3), name: v(4), colour: v(5), sizes: v(14) ? v(14).split('|') : [], qty: {},
          unitPrice: Number(v(8)) || 0, rrp: Number(v(9)) || 0, fabrication: v(10), description: '', origin: v(11), hsCode: v(12), photoId: v(13) || undefined,
        }
        byKey.set(key, line)
        out.lines.push(line)
      }
      const q = parseFloat(cellText(ws, v(7)).replace(',', '.'))
      line.qty[v(6)] = Number.isFinite(q) && q > 0 ? Math.round(q) : 0
    }
  })
  if (out.delivery.address && out.delivery.address !== out.store.address) {
    out.deliverySameAsStore = false
    out.delivery.name = out.store.name
    out.delivery.contact = out.store.contact
    out.delivery.phone = out.store.phone
  }
  return out
}

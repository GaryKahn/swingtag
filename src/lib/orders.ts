import { db, uid } from '../db/schema'
import { normalizeSettings } from '../db/seed'
import type { Address, Order, OrderLine, Settings, Style } from '../db/types'
import { cents, price } from './pricing'
import { parseColourways, parseSizes } from './sizes'

export const blankAddress = (): Address => ({ name: '', contact: '', email: '', phone: '', address: '' })

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const formatDocNumber = (prefix: string, n: number) => `${prefix}${String(n).padStart(5, '0')}`

/** One order line per colourway, with that style's sizes and current prices. */
export function linesForStyle(style: Style, settings: Settings, colours = parseColourways(style.colorways)): OrderLine[] {
  const p = price(style, settings)
  const sizes = parseSizes(style.sizeRange)
  return colours.map((colour) => ({
    id: uid(),
    styleId: style.id,
    styleNumber: style.styleNumber,
    name: style.name,
    colour,
    fabrication: style.fabrication,
    description: style.description,
    origin: style.origin ?? '',
    hsCode: style.hsCode ?? '',
    photoId: style.photoIds[0],
    sizes,
    qty: Object.fromEntries(sizes.map((s) => [s, 0])),
    unitPrice: p.wholesale,
    rrp: p.retail,
  }))
}

/** Create an order and reserve the next invoice number. */
export async function createOrder(init: Partial<Order> = {}): Promise<string> {
  return db.transaction('rw', db.settings, db.orders, async () => {
    const s = normalizeSettings(await db.settings.get('settings'))
    const now = Date.now()
    const order: Order = {
      id: uid(),
      number: formatDocNumber(s.invoicePrefix, s.nextInvoiceNumber),
      poNumber: '',
      date: today(),
      dispatchDate: '',
      dueDate: '',
      status: 'draft',
      store: blankAddress(),
      delivery: blankAddress(),
      deliverySameAsStore: true,
      paymentTerms: s.brand.paymentTerms,
      shippingTerms: '',
      depositPct: 50,
      vatPct: s.vatPct,
      currency: s.currency,
      notes: '',
      lines: [],
      createdAt: now,
      updatedAt: now,
      ...init,
    }
    await db.orders.add(order)
    await db.settings.put({ ...s, nextInvoiceNumber: s.nextInvoiceNumber + 1 })
    return order.id
  })
}

export const lineQty = (l: OrderLine) => l.sizes.reduce((a, s) => a + (l.qty[s] || 0), 0)

export function orderTotals(o: Pick<Order, 'lines' | 'vatPct' | 'depositPct'>) {
  const qty = o.lines.reduce((a, l) => a + lineQty(l), 0)
  const goods = cents(o.lines.reduce((a, l) => a + lineQty(l) * (l.unitPrice || 0), 0))
  const vat = cents(goods * ((o.vatPct || 0) / 100))
  const total = cents(goods + vat)
  const deposit = cents(total * ((o.depositPct || 0) / 100))
  return { qty, goods, vat, total, deposit, balance: cents(total - deposit) }
}

/** Distinct past customers, most recent first, for quick re-use. */
export async function recentCustomers(): Promise<{ store: Address; delivery: Address; deliverySameAsStore: boolean }[]> {
  const orders = await db.orders.orderBy('updatedAt').reverse().toArray()
  const seen = new Set<string>()
  const out = []
  for (const o of orders) {
    const key = o.store.name.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ store: o.store, delivery: o.delivery, deliverySameAsStore: o.deliverySameAsStore })
  }
  return out
}

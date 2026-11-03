import { describe, expect, it } from 'vitest'
import { formatDocNumber, linesForStyle, orderTotals } from '../../src/lib/orders'
import { defaultSettings } from '../../src/db/seed'
import type { Style } from '../../src/db/types'

const style: Style = {
  id: 's1', styleNumber: 'AZ01', name: 'Tee', collection: '', description: '', fabrication: 'Cotton', colorways: 'Black, Brown',
  sizeRange: 'S-L', moq: '', origin: 'ZA', hsCode: '', lines: [], labor: 100, overhead: 0, freightDutyPct: 0, photoIds: [], createdAt: 0, updatedAt: 0,
}

describe('orders', () => {
  it('makes one line per colourway with sizes and prices', () => {
    const s = { ...defaultSettings(), marginPct: 50, retailMultiplier: 2 }
    const lines = linesForStyle(style, s)
    expect(lines.map((l) => l.colour)).toEqual(['Black', 'Brown'])
    expect(lines[0].sizes).toEqual(['S', 'M', 'L'])
    expect(lines[0].qty).toEqual({ S: 0, M: 0, L: 0 })
    expect(lines[0].unitPrice).toBe(200)
    expect(lines[0].rrp).toBe(400)
  })

  it('totals qty, VAT and deposit', () => {
    const [a, b] = linesForStyle(style, defaultSettings())
    a.unitPrice = 100
    a.qty = { S: 2, M: 3, L: 0 }
    b.unitPrice = 50
    b.qty = { S: 0, M: 1, L: 1 }
    expect(orderTotals({ lines: [a, b], vatPct: 15, depositPct: 40 })).toEqual({ qty: 7, goods: 600, vat: 90, total: 690, deposit: 276, balance: 414 })
  })

  it('formats document numbers', () => {
    expect(formatDocNumber('IN-', 15)).toBe('IN-00015')
  })
})

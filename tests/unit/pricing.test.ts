import { describe, expect, it } from 'vitest'
import { price, roundPrice } from '../../src/lib/pricing'
import type { CostLine } from '../../src/db/types'

const defaults = { marginPct: 50, retailMultiplier: 2, rounding: 'none' as const, wastagePct: 10 }
const ln = (category: CostLine['category'], qty: number, unitCost: number): CostLine => ({
  id: Math.random().toString(), name: category, category, unit: 'pc', qty, unitCost,
})
const style = (over: Partial<Parameters<typeof price>[0]> = {}) => ({
  lines: [] as CostLine[], labor: 0, overhead: 0, freightDutyPct: 0, ...over,
})

describe('roundPrice', () => {
  it('handles each rule', () => {
    expect(roundPrice(41.234, 'none')).toBe(41.23)
    expect(roundPrice(41.01, 'whole')).toBe(42)
    expect(roundPrice(41, 'whole')).toBe(41)
    expect(roundPrice(41.2, '.95')).toBe(41.95)
    expect(roundPrice(41.97, '.95')).toBe(42.95)
    expect(roundPrice(41.2, '.99')).toBe(41.99)
    expect(roundPrice(41, '5')).toBe(45)
    expect(roundPrice(45, '5')).toBe(45)
    expect(roundPrice(0, 'whole')).toBe(0)
    expect(roundPrice(NaN, 'whole')).toBe(0)
  })
})

describe('price', () => {
  it('applies wastage only to fabric and trim', () => {
    const p = price(style({ lines: [ln('fabric', 2, 10), ln('trim', 1, 1), ln('label', 1, 1)] }), defaults)
    expect(p.materials).toBe(22 + 1.1 + 1)
  })

  it('computes wholesale from margin and retail from multiplier', () => {
    const p = price(style({ lines: [ln('label', 1, 10)], labor: 10 }), { ...defaults, wastagePct: 0 })
    expect(p.landed).toBe(20)
    expect(p.wholesale).toBe(40)
    expect(p.retail).toBe(80)
    expect(p.actualMarginPct).toBeCloseTo(50)
    expect(p.retailerMarginPct).toBeCloseTo(50)
    expect(p.markup).toBe(2)
  })

  it('treats labor-category lines as labor, adds overhead and freight/duty', () => {
    const p = price(style({ lines: [ln('labor', 1, 5)], labor: 5, overhead: 2, freightDutyPct: 10 }), defaults)
    expect(p.labor).toBe(10)
    expect(p.materials).toBe(0)
    expect(p.cogs).toBe(12)
    expect(p.landed).toBe(13.2)
  })

  it('0% margin prices at cost', () => {
    const p = price(style({ labor: 10, marginPct: 0 }), defaults)
    expect(p.wholesale).toBe(10)
    expect(p.belowTarget).toBe(false)
  })

  it('per-style overrides win and flag low margins', () => {
    const p = price(style({ labor: 20, wholesaleOverride: 30, retailOverride: 99 }), defaults)
    expect(p.wholesale).toBe(30)
    expect(p.retail).toBe(99)
    expect(p.belowTarget).toBe(true)
    const q = price(style({ labor: 20, marginPct: 60, retailMultiplier: 2.5 }), defaults)
    expect(q.wholesale).toBe(50)
    expect(q.retail).toBe(125)
  })

  it('rounding never lowers the margin below target', () => {
    const p = price(style({ labor: 13.37 }), { ...defaults, rounding: '.95' })
    expect(p.wholesale).toBe(26.95)
    expect(p.actualMarginPct).toBeGreaterThanOrEqual(50)
  })

  it('caps margin so price stays finite', () => {
    const p = price(style({ labor: 10, marginPct: 100 }), defaults)
    expect(isFinite(p.wholesale)).toBe(true)
  })
})

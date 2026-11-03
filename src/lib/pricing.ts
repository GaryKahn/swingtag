import { WASTAGE_CATEGORIES, type Category, type CostLine, type Rounding, type Settings, type Style } from '../db/types'

export const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Round a price up to a "price point" per the rounding rule. */
export function roundPrice(price: number, rule: Rounding): number {
  if (!isFinite(price) || price <= 0) return 0
  switch (rule) {
    case 'none':
      return cents(price)
    case 'whole':
      return Math.ceil(cents(price))
    case '.95':
    case '.99': {
      const tail = rule === '.95' ? 0.95 : 0.99
      const base = Math.floor(price)
      return cents(base + tail >= price ? base + tail : base + 1 + tail)
    }
    case '5':
      return Math.ceil(cents(price) / 5) * 5
  }
}

export function lineCost(line: Pick<CostLine, 'qty' | 'unitCost' | 'category'>, wastagePct: number) {
  const base = (line.qty || 0) * (line.unitCost || 0)
  return WASTAGE_CATEGORIES.includes(line.category) ? base * (1 + wastagePct / 100) : base
}

export interface PriceBreakdown {
  byCategory: Record<Category, number>
  materials: number
  labor: number
  overhead: number
  cogs: number
  freightDuty: number
  landed: number
  marginPct: number
  multiplier: number
  wholesale: number
  retail: number
  wholesaleIsOverride: boolean
  retailIsOverride: boolean
  /** Designer's actual gross margin at the final wholesale price. */
  actualMarginPct: number
  /** Retailer's margin at the final retail price. */
  retailerMarginPct: number
  markup: number
  belowTarget: boolean
}

type PricingInput = Pick<
  Style,
  'lines' | 'labor' | 'overhead' | 'freightDutyPct' | 'wastagePct' | 'marginPct' | 'retailMultiplier' | 'wholesaleOverride' | 'retailOverride'
>
type PricingDefaults = Pick<Settings, 'marginPct' | 'retailMultiplier' | 'rounding' | 'wastagePct'>

export function price(style: PricingInput, defaults: PricingDefaults): PriceBreakdown {
  const wastage = style.wastagePct ?? defaults.wastagePct
  const byCategory = { fabric: 0, trim: 0, label: 0, packaging: 0, labor: 0, other: 0 } as Record<Category, number>
  for (const l of style.lines) byCategory[l.category] += lineCost(l, wastage)
  const lineLabor = byCategory.labor
  const materials = Object.values(byCategory).reduce((a, b) => a + b, 0) - lineLabor
  const labor = lineLabor + (style.labor || 0)
  const overhead = style.overhead || 0
  const cogs = materials + labor + overhead
  const freightDuty = cogs * ((style.freightDutyPct || 0) / 100)
  const landed = cogs + freightDuty

  const marginPct = Math.min(style.marginPct ?? defaults.marginPct, 95)
  const multiplier = style.retailMultiplier ?? defaults.retailMultiplier

  const wholesaleIsOverride = (style.wholesaleOverride ?? 0) > 0
  const wholesale = wholesaleIsOverride ? cents(style.wholesaleOverride!) : roundPrice(landed / (1 - marginPct / 100), defaults.rounding)
  const retailIsOverride = (style.retailOverride ?? 0) > 0
  const retail = retailIsOverride ? cents(style.retailOverride!) : roundPrice(wholesale * multiplier, defaults.rounding)

  const actualMarginPct = wholesale > 0 ? ((wholesale - landed) / wholesale) * 100 : 0
  const retailerMarginPct = retail > 0 ? ((retail - wholesale) / retail) * 100 : 0
  return {
    byCategory,
    materials: cents(materials),
    labor: cents(labor),
    overhead: cents(overhead),
    cogs: cents(cogs),
    freightDuty: cents(freightDuty),
    landed: cents(landed),
    marginPct,
    multiplier,
    wholesale,
    retail,
    wholesaleIsOverride,
    retailIsOverride,
    actualMarginPct,
    retailerMarginPct,
    markup: landed > 0 ? wholesale / landed : 0,
    belowTarget: landed > 0 && actualMarginPct < marginPct - 0.05,
  }
}

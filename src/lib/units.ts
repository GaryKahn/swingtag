import type { SwingtagDB } from '../db/schema'
import type { Measurement, Unit } from '../db/types'

export const YD_IN_M = 0.9144

/** Convert a quantity between length units (other units pass through). */
export function convertQty(qty: number, from: Unit, to: Unit) {
  if (from === 'yd' && to === 'm') return round(qty * YD_IN_M, 3)
  if (from === 'm' && to === 'yd') return round(qty / YD_IN_M, 3)
  return qty
}
/** Convert a price-per-unit between length units. */
export function convertUnitCost(cost: number, from: Unit, to: Unit) {
  if (from === 'yd' && to === 'm') return round(cost / YD_IN_M, 2)
  if (from === 'm' && to === 'yd') return round(cost * YD_IN_M, 2)
  return cost
}
const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp

/**
 * Switch the component library and templates to metres or yards, converting
 * quantities and prices. Styles keep their own units (they're already costed).
 */
export async function switchMeasurement(db: SwingtagDB, to: Measurement) {
  const from: Unit = to === 'metric' ? 'yd' : 'm'
  const target: Unit = to === 'metric' ? 'm' : 'yd'
  const now = Date.now()
  await db.transaction('rw', db.components, db.templates, db.settings, async () => {
    await db.components.where('id').notEqual('').modify((c) => {
      if (c.unit !== from) return
      c.unitCost = convertUnitCost(c.unitCost, from, target)
      c.unit = target
      c.updatedAt = now
    })
    await db.templates.toCollection().modify((t) => {
      let changed = false
      for (const l of t.lines) {
        if (l.unit !== from) continue
        l.qty = convertQty(l.qty, from, target)
        l.unit = target
        changed = true
      }
      if (changed) t.updatedAt = now
    })
    await db.settings.update('settings', { measurement: to })
  })
}

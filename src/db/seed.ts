import type { Category, Component, Settings, Template, TemplateLine, Unit } from './types'
import type { CostsheetDB } from './schema'

/** Bump when built-in components/templates change; seeding only adds missing built-ins. */
export const SEED_VERSION = 1

export function defaultSettings(): Settings {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
  return {
    id: 'settings',
    currency: 'USD',
    locale,
    marginPct: 55,
    retailMultiplier: 2.2,
    rounding: 'whole',
    wastagePct: 10,
    pageSize: /^en-(US|CA)$/.test(locale) ? 'LETTER' : 'A4',
    brand: {
      name: '',
      contact: '',
      email: '',
      phone: '',
      website: '',
      orderTerms: '',
      paymentTerms: '50% deposit with order, balance before shipping',
      moq: '',
      shipWindow: '',
    },
    seededVersion: 0,
  }
}

type C = [id: string, name: string, category: Category, unit: Unit, unitCost: number]

// Stable ids so built-ins line up across devices when merging backups.
const COMPONENTS: C[] = [
  ['c-jersey', 'Cotton jersey', 'fabric', 'yd', 7],
  ['c-fleece', 'Cotton fleece', 'fabric', 'yd', 11],
  ['c-shirting', 'Cotton shirting', 'fabric', 'yd', 9],
  ['c-twill', 'Cotton twill', 'fabric', 'yd', 10],
  ['c-denim', 'Denim 12oz', 'fabric', 'yd', 12],
  ['c-canvas', 'Cotton canvas', 'fabric', 'yd', 9],
  ['c-lining', 'Lining', 'fabric', 'yd', 6],
  ['c-rib', 'Rib knit', 'fabric', 'yd', 8],
  ['c-interfacing', 'Fusible interfacing', 'trim', 'yd', 3],
  ['c-buttons', 'Buttons', 'trim', 'pc', 0.25],
  ['c-shank', 'Shank button', 'trim', 'pc', 0.6],
  ['c-zip-invisible', 'Invisible zipper', 'trim', 'pc', 1.2],
  ['c-zip-metal', 'Metal zipper', 'trim', 'pc', 2.5],
  ['c-elastic', 'Elastic', 'trim', 'yd', 0.8],
  ['c-drawcord', 'Drawcord', 'trim', 'pc', 0.6],
  ['c-eyelets', 'Eyelets', 'trim', 'set', 0.4],
  ['c-thread', 'Thread', 'trim', 'pc', 0.3],
  ['c-label-main', 'Main label', 'label', 'pc', 0.35],
  ['c-label-care', 'Care/content label', 'label', 'pc', 0.15],
  ['c-label-size', 'Size label', 'label', 'pc', 0.1],
  ['c-hangtag', 'Hang tag + string', 'label', 'pc', 0.4],
  ['c-polybag', 'Poly bag', 'packaging', 'pc', 0.15],
  ['c-tissue', 'Tissue + sticker', 'packaging', 'pc', 0.3],
  ['c-cmt', 'Cut, make & trim (CMT)', 'labor', 'pc', 0],
  ['c-pattern', 'Pattern & grading (per unit)', 'other', 'pc', 1],
  ['c-sampling', 'Sampling (per unit)', 'other', 'pc', 1],
]

const byId = new Map(COMPONENTS.map((c) => [c[0], c]))
const line = (componentId: string, qty: number): TemplateLine => {
  const c = byId.get(componentId)!
  return { componentId, name: c[1], category: c[2], unit: c[3], qty }
}
const finishing = [line('c-thread', 1), line('c-label-main', 1), line('c-label-care', 1), line('c-label-size', 1), line('c-hangtag', 1), line('c-polybag', 1)]

type T = [id: string, name: string, labor: number, lines: TemplateLine[]]
const TEMPLATES: T[] = [
  ['t-tshirt', 'T-shirt', 6, [line('c-jersey', 1.25), line('c-rib', 0.1), ...finishing]],
  ['t-shirt', 'Button-up shirt', 14, [line('c-shirting', 2.25), line('c-interfacing', 0.25), line('c-buttons', 9), ...finishing]],
  ['t-trousers', 'Trousers', 16, [line('c-twill', 1.75), line('c-lining', 0.25), line('c-interfacing', 0.2), line('c-zip-metal', 1), line('c-shank', 1), ...finishing]],
  ['t-skirt', 'Skirt', 10, [line('c-twill', 1), line('c-interfacing', 0.1), line('c-zip-invisible', 1), line('c-buttons', 1), ...finishing]],
  ['t-dress', 'Dress', 18, [line('c-shirting', 3), line('c-interfacing', 0.25), line('c-zip-invisible', 1), ...finishing]],
  ['t-hoodie', 'Hoodie', 14, [line('c-fleece', 2), line('c-rib', 0.3), line('c-drawcord', 1), line('c-eyelets', 1), ...finishing]],
  ['t-jacket', 'Unlined jacket', 24, [line('c-denim', 2.5), line('c-interfacing', 0.5), line('c-buttons', 7), ...finishing]],
  ['t-tote', 'Tote bag', 5, [line('c-canvas', 0.75), line('c-thread', 1), line('c-label-main', 1), line('c-polybag', 1)]],
]

export async function seed(db: CostsheetDB) {
  const settings = (await db.settings.get('settings')) ?? defaultSettings()
  if (settings.seededVersion >= SEED_VERSION) return
  const now = Date.now()
  await db.transaction('rw', db.settings, db.components, db.templates, async () => {
    const existingC = new Set(await db.components.toCollection().primaryKeys())
    const existingT = new Set(await db.templates.toCollection().primaryKeys())
    const comps: Component[] = COMPONENTS.filter(([id]) => !existingC.has(id)).map(([id, name, category, unit, unitCost]) => ({
      id, name, category, unit, unitCost, supplier: '', notes: '', builtIn: true, updatedAt: now,
    }))
    const temps: Template[] = TEMPLATES.filter(([id]) => !existingT.has(id)).map(([id, name, labor, lines]) => ({
      id, name, labor, lines, builtIn: true, updatedAt: now,
    }))
    await db.components.bulkAdd(comps)
    await db.templates.bulkAdd(temps)
    await db.settings.put({ ...settings, seededVersion: SEED_VERSION })
  })
}

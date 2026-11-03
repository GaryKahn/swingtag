import type { Category, Component, Settings, Template, TemplateLine, Unit } from './types'
import type { CostsheetDB } from './schema'

/** Bump when built-in components/templates change; seeding only adds missing built-ins. */
export const SEED_VERSION = 1

export function defaultSettings(): Settings {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-ZA'
  return {
    id: 'settings',
    currency: 'ZAR',
    locale,
    marginPct: 55,
    retailMultiplier: 2.2,
    rounding: 'whole',
    wastagePct: 10,
    pageSize: /^en-(US|CA)$/.test(locale) ? 'LETTER' : 'A4',
    measurement: 'metric',
    vatPct: 0,
    invoicePrefix: 'IN-',
    nextInvoiceNumber: 1,
    brand: {
      name: '',
      contact: '',
      email: '',
      phone: '',
      website: '',
      orderTerms: '',
      paymentTerms: '50% deposit with order, balance before dispatch',
      moq: '',
      shipWindow: '',
      legalName: '',
      address: '',
      regNo: '',
      vatNo: '',
      bank: { bankName: '', accountName: '', accountNumber: '', branchCode: '', accountType: '', swift: '', iban: '', reference: '' },
    },
    seededVersion: 0,
  }
}

/** Fill in fields added in later versions (old installs, old backups). */
export function normalizeSettings(s: Partial<Settings> | undefined): Settings {
  const d = defaultSettings()
  if (!s) return d
  return {
    ...d,
    ...s,
    measurement: s.measurement ?? 'imperial', // anything saved before this field existed was imperial
    brand: { ...d.brand, ...s.brand, bank: { ...d.brand.bank, ...s.brand?.bank } },
  } as Settings
}

type C = [id: string, name: string, category: Category, unit: Unit, unitCost: number]

// Stable ids so built-ins line up across devices when merging backups.
// Metric lengths, approximate South African prices in ZAR.
const COMPONENTS: C[] = [
  ['c-jersey', 'Cotton jersey', 'fabric', 'm', 120],
  ['c-fleece', 'Cotton fleece', 'fabric', 'm', 180],
  ['c-shirting', 'Cotton shirting', 'fabric', 'm', 150],
  ['c-twill', 'Cotton twill', 'fabric', 'm', 160],
  ['c-denim', 'Denim 12oz', 'fabric', 'm', 200],
  ['c-canvas', 'Cotton canvas', 'fabric', 'm', 140],
  ['c-lining', 'Lining', 'fabric', 'm', 90],
  ['c-rib', 'Rib knit', 'fabric', 'm', 130],
  ['c-interfacing', 'Fusible interfacing', 'trim', 'm', 50],
  ['c-buttons', 'Buttons', 'trim', 'pc', 4],
  ['c-shank', 'Shank button', 'trim', 'pc', 10],
  ['c-zip-invisible', 'Invisible zipper', 'trim', 'pc', 18],
  ['c-zip-metal', 'Metal zipper', 'trim', 'pc', 40],
  ['c-elastic', 'Elastic', 'trim', 'm', 12],
  ['c-drawcord', 'Drawcord', 'trim', 'pc', 10],
  ['c-eyelets', 'Eyelets', 'trim', 'set', 6],
  ['c-thread', 'Thread', 'trim', 'pc', 5],
  ['c-label-main', 'Main label', 'label', 'pc', 6],
  ['c-label-care', 'Care/content label', 'label', 'pc', 2.5],
  ['c-label-size', 'Size label', 'label', 'pc', 1.5],
  ['c-hangtag', 'Hang tag + string', 'label', 'pc', 6],
  ['c-polybag', 'Poly bag', 'packaging', 'pc', 2.5],
  ['c-tissue', 'Tissue + sticker', 'packaging', 'pc', 5],
  ['c-cmt', 'Cut, make & trim (CMT)', 'labor', 'pc', 0],
  ['c-pattern', 'Pattern & grading (per unit)', 'other', 'pc', 15],
  ['c-sampling', 'Sampling (per unit)', 'other', 'pc', 15],
]

const byId = new Map(COMPONENTS.map((c) => [c[0], c]))
const line = (componentId: string, qty: number): TemplateLine => {
  const c = byId.get(componentId)!
  return { componentId, name: c[1], category: c[2], unit: c[3], qty }
}
const finishing = [line('c-thread', 1), line('c-label-main', 1), line('c-label-care', 1), line('c-label-size', 1), line('c-hangtag', 1), line('c-polybag', 1)]

type T = [id: string, name: string, labor: number, lines: TemplateLine[]]
const TEMPLATES: T[] = [
  ['t-tshirt', 'T-shirt', 90, [line('c-jersey', 1.15), line('c-rib', 0.1), ...finishing]],
  ['t-shirt', 'Button-up shirt', 220, [line('c-shirting', 2.1), line('c-interfacing', 0.25), line('c-buttons', 9), ...finishing]],
  ['t-trousers', 'Trousers', 250, [line('c-twill', 1.6), line('c-lining', 0.25), line('c-interfacing', 0.2), line('c-zip-metal', 1), line('c-shank', 1), ...finishing]],
  ['t-skirt', 'Skirt', 160, [line('c-twill', 0.9), line('c-interfacing', 0.1), line('c-zip-invisible', 1), line('c-buttons', 1), ...finishing]],
  ['t-dress', 'Dress', 280, [line('c-shirting', 2.75), line('c-interfacing', 0.25), line('c-zip-invisible', 1), ...finishing]],
  ['t-hoodie', 'Hoodie', 220, [line('c-fleece', 1.85), line('c-rib', 0.3), line('c-drawcord', 1), line('c-eyelets', 1), ...finishing]],
  ['t-jacket', 'Unlined jacket', 380, [line('c-denim', 2.3), line('c-interfacing', 0.5), line('c-buttons', 7), ...finishing]],
  ['t-tote', 'Tote bag', 80, [line('c-canvas', 0.7), line('c-thread', 1), line('c-label-main', 1), line('c-polybag', 1)]],
]

export async function seed(db: CostsheetDB) {
  const stored = await db.settings.get('settings')
  const settings = stored ? normalizeSettings(stored) : defaultSettings()
  if (settings.seededVersion >= SEED_VERSION) {
    if (stored && JSON.stringify(stored) !== JSON.stringify(settings)) await db.settings.put(settings)
    return
  }
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

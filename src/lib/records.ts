import { db, uid } from '../db/schema'
import { lengthUnit, type Component, type LineSheet, type Measurement, type Style, type Template } from '../db/types'

export async function createStyle(template?: Template): Promise<string> {
  const now = Date.now()
  const comps = new Map((await db.components.toArray()).map((c) => [c.id, c]))
  const count = await db.styles.count()
  const style: Style = {
    id: uid(),
    styleNumber: `S${String(count + 1).padStart(3, '0')}`,
    name: template ? template.name : 'New style',
    templateId: template?.id,
    collection: '',
    description: '',
    fabrication: '',
    colorways: '',
    sizeRange: '',
    moq: '',
    origin: '',
    hsCode: '',
    lines: (template?.lines ?? []).map((l) => ({
      id: uid(),
      ...l,
      unitCost: (l.componentId && comps.get(l.componentId)?.unitCost) || 0,
    })),
    labor: template?.labor ?? 0,
    overhead: 0,
    freightDutyPct: 0,
    photoIds: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.styles.add(style)
  return style.id
}

/** Copies a style, including its photos. */
export async function duplicateStyle(id: string): Promise<string | undefined> {
  const s = await db.styles.get(id)
  if (!s) return
  const now = Date.now()
  const newId = uid()
  const photos = await db.photos.bulkGet(s.photoIds)
  const copies = photos.filter((p) => !!p).map((p) => ({ ...p!, id: uid(), ownerId: newId, updatedAt: now }))
  await db.transaction('rw', db.styles, db.photos, async () => {
    await db.photos.bulkAdd(copies)
    await db.styles.add({ ...s, id: newId, name: `${s.name} (copy)`, photoIds: copies.map((p) => p.id), createdAt: now, updatedAt: now })
  })
  return newId
}

export async function deleteStyle(id: string) {
  await db.transaction('rw', db.styles, db.photos, db.lineSheets, async () => {
    await db.photos.where('ownerId').equals(id).delete()
    await db.styles.delete(id)
    await db.lineSheets.toCollection().modify((ls) => {
      ls.styleIds = ls.styleIds.filter((s) => s !== id)
    })
  })
}

export async function createTemplate(from?: Template): Promise<string> {
  const t: Template = {
    id: uid(),
    name: from ? `${from.name} (copy)` : 'New template',
    builtIn: false,
    lines: from ? structuredClone(from.lines.map((l) => ({ ...l }))) : [],
    labor: from?.labor ?? 0,
    updatedAt: Date.now(),
  }
  await db.templates.add(t)
  return t.id
}

/** Turn a style's lines into a reusable template. */
export async function templateFromStyle(s: Style): Promise<string> {
  const t: Template = {
    id: uid(),
    name: s.name,
    builtIn: false,
    lines: s.lines.map(({ componentId, name, category, unit, qty }) => ({ componentId, name, category, unit, qty })),
    labor: s.labor,
    updatedAt: Date.now(),
  }
  await db.templates.add(t)
  return t.id
}

export function blankComponent(measurement: Measurement): Component {
  return { id: uid(), name: '', category: 'fabric', unit: lengthUnit(measurement), unitCost: 0, supplier: '', notes: '', builtIn: false, updatedAt: Date.now() }
}

export async function createLineSheet(styleIds: string[]): Promise<string> {
  const ls: LineSheet = {
    id: uid(),
    title: 'Wholesale line sheet',
    season: '',
    styleIds,
    layout: 'grid-2',
    showRetail: true,
    orderDeadline: '',
    notes: '',
    updatedAt: Date.now(),
  }
  await db.lineSheets.add(ls)
  return ls.id
}

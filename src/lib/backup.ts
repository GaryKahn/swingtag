import type { CostsheetDB } from '../db/schema'
import type { Component, LineSheet, Photo, Settings, Style, Template } from '../db/types'

export const APP_ID = 'costsheet'
export const SCHEMA_VERSION = 1

interface PhotoJSON {
  id: string
  ownerId: string
  mime: string
  data: string
  thumbMime: string
  thumb: string
  updatedAt: number
}

export interface Backup {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  settings: Settings | null
  components: Component[]
  templates: Template[]
  styles: Style[]
  lineSheets: LineSheet[]
  photos: PhotoJSON[]
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function fromBase64(data: string, type: string): Blob {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function exportData(db: CostsheetDB): Promise<Backup> {
  const [settings, components, templates, styles, lineSheets, photos] = await Promise.all([
    db.settings.get('settings'),
    db.components.toArray(),
    db.templates.toArray(),
    db.styles.toArray(),
    db.lineSheets.toArray(),
    db.photos.toArray(),
  ])
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settings ?? null,
    components,
    templates,
    styles,
    lineSheets,
    photos: await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        ownerId: p.ownerId,
        mime: p.blob.type || 'image/jpeg',
        data: await toBase64(p.blob),
        thumbMime: p.thumb.type || 'image/jpeg',
        thumb: await toBase64(p.thumb),
        updatedAt: p.updatedAt,
      })),
    ),
  }
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not a Costsheet backup (not valid JSON).')
  }
  const b = data as Partial<Backup>
  if (!b || b.app !== APP_ID) throw new Error('That file is not a Costsheet backup.')
  if (typeof b.schemaVersion !== 'number' || b.schemaVersion > SCHEMA_VERSION)
    throw new Error('This backup was made by a newer version of Costsheet. Reload the app to update, then try again.')
  return migrate(b as Backup)
}

/** Upgrade older backup formats in place. Only v1 exists so far. */
function migrate(b: Backup): Backup {
  return {
    ...b,
    components: b.components ?? [],
    templates: b.templates ?? [],
    styles: b.styles ?? [],
    lineSheets: b.lineSheets ?? [],
    photos: b.photos ?? [],
  }
}

export function summarize(b: Backup) {
  return {
    styles: b.styles.length,
    templates: b.templates.filter((t) => !t.builtIn).length,
    components: b.components.filter((c) => !c.builtIn).length,
    lineSheets: b.lineSheets.length,
    photos: b.photos.length,
  }
}

export type ImportMode = 'replace' | 'merge'

export async function importData(db: CostsheetDB, b: Backup, mode: ImportMode) {
  const photos: Photo[] = b.photos.map((p) => ({
    id: p.id,
    ownerId: p.ownerId,
    blob: fromBase64(p.data, p.mime),
    thumb: fromBase64(p.thumb, p.thumbMime),
    updatedAt: p.updatedAt,
  }))
  const tables = [db.settings, db.components, db.templates, db.styles, db.lineSheets, db.photos]
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      await Promise.all(tables.map((t) => t.clear()))
      if (b.settings) await db.settings.put(b.settings)
      await db.components.bulkPut(b.components)
      await db.templates.bulkPut(b.templates)
      await db.styles.bulkPut(b.styles)
      await db.lineSheets.bulkPut(b.lineSheets)
      await db.photos.bulkPut(photos)
      return
    }
    // merge: upsert by id, newer updatedAt wins; keep this device's settings
    await mergeInto(db.components, b.components)
    await mergeInto(db.templates, b.templates)
    await mergeInto(db.styles, b.styles)
    await mergeInto(db.lineSheets, b.lineSheets)
    await mergeInto(db.photos, photos)
  })
}

async function mergeInto<T extends { id: string; updatedAt: number }>(table: import('dexie').Table<T, string>, rows: T[]) {
  if (!rows.length) return
  const existing = await table.bulkGet(rows.map((r) => r.id))
  const winners = rows.filter((r, i) => !existing[i] || (existing[i]!.updatedAt ?? 0) < (r.updatedAt ?? 0))
  await table.bulkPut(winners)
}

export function backupFilename(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `costsheet-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

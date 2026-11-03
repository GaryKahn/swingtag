import Dexie, { type Table } from 'dexie'
import type { Component, LineSheet, Order, Photo, Settings, Style, Template } from './types'

export class SwingtagDB extends Dexie {
  settings!: Table<Settings, string>
  components!: Table<Component, string>
  templates!: Table<Template, string>
  styles!: Table<Style, string>
  photos!: Table<Photo, string>
  lineSheets!: Table<LineSheet, string>
  orders!: Table<Order, string>

  // The app was first called Costsheet; the database keeps that name so existing data stays put.
  constructor(name = 'costsheet') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      components: 'id, category, name',
      templates: 'id, name',
      styles: 'id, styleNumber, updatedAt',
      photos: 'id, ownerId',
      lineSheets: 'id, updatedAt',
    })
    this.version(2)
      .stores({ orders: 'id, number, updatedAt' })
      .upgrade(async (tx) => {
        // Installs from v1 were seeded in yards/USD; keep their library consistent.
        await tx.table('settings').toCollection().modify((s: Partial<Settings>) => {
          s.measurement ??= 'imperial'
        })
      })
  }
}

export const db = new SwingtagDB()

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

let persistRequested = false
/** Ask the browser not to evict our data under storage pressure (once per session). */
export function requestPersist() {
  if (persistRequested) return
  persistRequested = true
  navigator.storage?.persist?.().catch(() => {})
}

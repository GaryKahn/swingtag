import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { CostsheetDB } from '../../src/db/schema'
import { seed } from '../../src/db/seed'
import { exportData, importData, parseBackup, summarize } from '../../src/lib/backup'
import type { Style } from '../../src/db/types'

const bytes = (n: number) => new Uint8Array(Array.from({ length: n }, (_, i) => (i * 7) % 256))
const makeStyle = (id: string, updatedAt: number, name = 'Shirt'): Style => ({
  id, styleNumber: 'S1', name, collection: '', description: '', fabrication: '', colorways: '', sizeRange: '', moq: '',
  lines: [], labor: 10, overhead: 0, freightDutyPct: 0, photoIds: ['p1'], createdAt: 1, updatedAt,
})

async function freshDb(name: string) {
  const db = new CostsheetDB(name)
  await seed(db)
  return db
}

describe('backup', () => {
  it('round-trips everything including photo bytes', async () => {
    const a = await freshDb('a')
    await a.styles.put(makeStyle('s1', 5))
    await a.photos.put({ id: 'p1', ownerId: 's1', blob: new Blob([bytes(100_000)], { type: 'image/jpeg' }), thumb: new Blob([bytes(500)], { type: 'image/jpeg' }), updatedAt: 1 })
    const json = JSON.stringify(await exportData(a))

    const b = new CostsheetDB('b')
    const parsed = parseBackup(json)
    expect(summarize(parsed)).toMatchObject({ styles: 1, photos: 1 })
    await importData(b, parsed, 'replace')

    expect(await b.styles.get('s1')).toEqual(await a.styles.get('s1'))
    expect(await b.components.count()).toBe(await a.components.count())
    expect(await b.settings.get('settings')).toEqual(await a.settings.get('settings'))
    const photo = await b.photos.get('p1')
    expect(new Uint8Array(await photo!.blob.arrayBuffer())).toEqual(bytes(100_000))
    expect(photo!.blob.type).toBe('image/jpeg')
  })

  it('merge keeps the newer copy of each record', async () => {
    const src = await freshDb('src')
    await src.styles.bulkPut([makeStyle('old', 1, 'from backup'), makeStyle('new', 9, 'from backup'), makeStyle('only', 1, 'from backup')])
    const backup = parseBackup(JSON.stringify(await exportData(src)))

    const dst = await freshDb('dst')
    await dst.styles.bulkPut([makeStyle('old', 5, 'local'), makeStyle('new', 5, 'local')])
    await importData(dst, backup, 'merge')
    expect((await dst.styles.get('old'))!.name).toBe('local')
    expect((await dst.styles.get('new'))!.name).toBe('from backup')
    expect((await dst.styles.get('only'))!.name).toBe('from backup')
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('nope')).toThrow(/not a Costsheet backup/)
    expect(() => parseBackup('{"app":"other"}')).toThrow(/not a Costsheet backup/)
    expect(() => parseBackup('{"app":"costsheet","schemaVersion":99}')).toThrow(/newer version/)
  })
})

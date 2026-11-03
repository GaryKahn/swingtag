import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { buildOrderSheet, readOrderSheet } from '../../src/lib/orderSheet'
import { linesForStyle } from '../../src/lib/orders'
import { defaultSettings } from '../../src/db/seed'
import type { Style } from '../../src/db/types'

const style: Style = {
  id: 's1', styleNumber: 'AZ01', name: 'Tee', collection: '', description: '', fabrication: '100% cotton', colorways: 'Black, Brown',
  sizeRange: 'XS-XL', moq: '', origin: 'South Africa', hsCode: '6109', lines: [], labor: 100, overhead: 0, freightDutyPct: 0, photoIds: [], createdAt: 0, updatedAt: 0,
}

describe('order sheet xlsx', () => {
  it('round-trips buyer details and quantities typed into the sheet', async () => {
    const settings = defaultSettings()
    const lines = linesForStyle(style, settings)
    const blob = await buildOrderSheet({ title: 'SS27', season: '', lines }, settings)

    // simulate a buyer filling it in with a spreadsheet app
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await blob.arrayBuffer())
    const ws = wb.getWorksheet('Order sheet')!
    const find = (text: string) => {
      let addr = ''
      ws.eachRow((row) => row.eachCell((c) => { if (c.value === text && !addr) addr = c.address }))
      return addr
    }
    const right = (addr: string, colLetter: string) => colLetter + addr.replace(/^[A-Z]+/, '')
    ws.getCell(right(find('Store name'), 'C')).value = 'Windthrow'
    ws.getCell(right(find('Email'), 'C')).value = 'nate@windthrow.store'
    ws.getCell(right(find('PO number'), 'C')).value = 'PO-77'
    // first block = Black; sizes XS..XL in rows below the header, qty in column I
    const black = find('Black')
    const top = Number(black.replace(/^[A-Z]+/, ''))
    ws.getCell(`I${top + 1}`).value = 4 // S
    ws.getCell(`I${top + 2}`).value = 6 // M
    const filled = await wb.xlsx.writeBuffer()

    const order = await readOrderSheet(filled as ArrayBuffer)
    expect(order.store.name).toBe('Windthrow')
    expect(order.store.email).toBe('nate@windthrow.store')
    expect(order.poNumber).toBe('PO-77')
    expect(order.currency).toBe('ZAR')
    expect(order.lines).toHaveLength(2)
    expect(order.lines[0]).toMatchObject({ styleId: 's1', colour: 'Black', sizes: ['XS', 'S', 'M', 'L', 'XL'], origin: 'South Africa', hsCode: '6109' })
    expect(order.lines[0].qty).toEqual({ XS: 0, S: 4, M: 6, L: 0, XL: 0 })
    expect(order.lines[0].unitPrice).toBe(lines[0].unitPrice)
    expect(Object.values(order.lines[1].qty).every((q) => q === 0)).toBe(true)
  })

  it('rejects spreadsheets it did not make', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Sheet1').getCell('A1').value = 'hello'
    const buf = await wb.xlsx.writeBuffer()
    await expect(readOrderSheet(buf as ArrayBuffer)).rejects.toThrow(/wasn't made by Costsheet/)
  })
})

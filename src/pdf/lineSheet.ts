import type { Content, TableCell } from 'pdfmake/interfaces'
import type { LineSheet, Settings, Style } from '../db/types'
import { price } from '../lib/pricing'
import { formatMoney } from '../lib/money'
import { MUTED, RULE, croppedPhoto, deliverPdf, photoDataUrl, safeName } from './common'

const PAGE_W = { LETTER: 612, A4: 595.28 }
const MARGIN = 36

export async function lineSheetPdf(sheet: LineSheet, styles: Style[], settings: Settings, prefer: 'share' | 'download' | 'preview' = 'download', win?: Window | null) {
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)
  const b = settings.brand
  const contentW = PAGE_W[settings.pageSize] - MARGIN * 2
  const cols = sheet.layout === 'grid-3' ? 3 : sheet.layout === 'grid-2' ? 2 : 1
  const gap = 14
  const cellW = (contentW - gap * (cols - 1)) / cols
  const logo = await photoDataUrl(b.logoPhotoId)

  const priceLine = (s: Style) => {
    const p = price(s, settings)
    const parts: Content[] = [{ text: [{ text: 'WHOLESALE ', style: 'label' }, { text: money(p.wholesale), style: 'price' }] }]
    if (sheet.showRetail) parts.push({ text: [{ text: 'MSRP ', style: 'label' }, { text: money(p.retail), style: 'price' }], alignment: 'right' })
    return { columns: parts, margin: [0, 4, 0, 0] } as Content
  }
  const detail = (k: string, v: string) => (v ? ({ text: [{ text: `${k} `, color: MUTED }, v], fontSize: 8, margin: [0, 1, 0, 0] } as Content) : null)
  const details = (s: Style) =>
    [detail('Fabric', s.fabrication), detail('Colors', s.colorways), detail('Sizes', s.sizeRange), detail('MOQ', s.moq)].filter((x): x is Content => !!x)

  async function gridCell(s: Style): Promise<Content> {
    // 2-up: capped photo height so two rows fit per page, extra photos stacked beside it.
    // 3-up: photo fills the cell width, no extras.
    const imgH = cols === 2 ? 210 : cellW * (4 / 3)
    const imgW = imgH * (3 / 4)
    const sideW = cellW - imgW - 6
    const main = await croppedPhoto(s.photoIds[0], 3 / 4, 700)
    const extras = cols === 2 ? (await Promise.all(s.photoIds.slice(1, 3).map((id) => croppedPhoto(id, 3 / 4, 240, 'thumb')))).filter((e): e is string => !!e) : []
    const mainImg: Content = main
      ? { image: main, width: imgW, height: imgH }
      : { canvas: [{ type: 'rect', x: 0, y: 0, w: imgW, h: imgH, color: '#f5f5f4' }] }
    return {
      unbreakable: true,
      stack: [
        cols === 2
          ? {
              columns: [
                { width: imgW, stack: [mainImg] },
                { width: sideW, stack: extras.map((e) => ({ image: e, width: sideW, height: sideW * (4 / 3), margin: [0, 0, 0, 6] }) as Content) },
              ],
              columnGap: 6,
            }
          : mainImg,
        { text: s.styleNumber, style: 'muted', margin: [0, 8, 0, 0] },
        { text: s.name, style: 'styleName' },
        ...details(s),
        priceLine(s),
      ],
      margin: [0, 0, 0, 18],
    }
  }

  let body: Content
  if (cols === 1) {
    const rows: TableCell[][] = await Promise.all(
      styles.map(async (s) => {
        const img = await croppedPhoto(s.photoIds[0], 3 / 4, 300, 'thumb')
        const p = price(s, settings)
        return [
          img ? { image: img, width: 60, height: 80 } : { text: '' },
          { stack: [{ text: s.styleNumber, style: 'muted' }, { text: s.name, style: 'styleName' }, ...details(s)] },
          { text: money(p.wholesale), style: 'price', alignment: 'right' },
          ...(sheet.showRetail ? [{ text: money(p.retail), style: 'price', alignment: 'right' } as TableCell] : []),
        ] as TableCell[]
      }),
    )
    const head: TableCell[] = ['', 'STYLE', 'WHOLESALE', ...(sheet.showRetail ? ['MSRP'] : [])].map((t, i) => ({ text: t, style: 'th', alignment: i > 1 ? 'right' : 'left' }))
    body = {
      table: { headerRows: 1, dontBreakRows: true, widths: [60, '*', 70, ...(sheet.showRetail ? [70] : [])], body: [head, ...rows] },
      layout: { hLineWidth: (i) => (i === 0 ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => RULE, paddingTop: () => 8, paddingBottom: () => 8, paddingLeft: (i) => (i === 0 ? 0 : 10), paddingRight: () => 0 },
    }
  } else {
    const cells = await Promise.all(styles.map(gridCell))
    const rows: Content[] = []
    for (let i = 0; i < cells.length; i += cols) {
      const row = cells.slice(i, i + cols)
      while (row.length < cols) row.push({ text: '' })
      rows.push({ columns: row.map((c) => ({ width: cellW, stack: [c] })), columnGap: gap })
    }
    body = { stack: rows }
  }

  const contact = [b.contact, b.email, b.phone, b.website].filter(Boolean).join('  ·  ')
  const header: Content = {
    columns: [
      logo ? { image: logo, fit: [90, 50], width: 100 } : { width: 0, text: '' },
      {
        width: '*',
        stack: [
          { text: b.name || 'Line sheet', style: 'brand' },
          { text: [sheet.title, sheet.season].filter(Boolean).join(' — '), style: 'title', margin: [0, 2, 0, 0] },
          ...(contact ? [{ text: contact, style: 'muted', margin: [0, 4, 0, 0] } as Content] : []),
        ],
      },
    ],
    columnGap: 12,
    margin: [0, 0, 0, 10],
  }

  const terms = [
    ['Order deadline', sheet.orderDeadline],
    ['Delivery window', b.shipWindow],
    ['Minimums', b.moq],
    ['Payment terms', b.paymentTerms],
    ['Order terms', b.orderTerms],
  ].filter(([, v]) => v)

  const termsBlock: Content[] = terms.length || sheet.notes
    ? [
        {
          unbreakable: true,
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentW, y2: 0, lineWidth: 0.5, lineColor: RULE }], margin: [0, 6, 0, 10] },
            { text: 'TERMS', style: 'label', margin: [0, 0, 0, 6] },
            { table: { widths: [100, '*'], body: terms.map(([k, v]) => [{ text: k, color: MUTED }, v]) }, layout: 'noBorders' },
            ...(sheet.notes ? [{ text: sheet.notes, margin: [0, 8, 0, 0], color: MUTED } as Content] : []),
          ],
        },
      ]
    : []

  await deliverPdf(
    {
      pageSize: settings.pageSize,
      pageMargins: [MARGIN, MARGIN, MARGIN, 44],
      info: { title: `${b.name || 'Line sheet'} — ${sheet.title}`, author: b.name },
      content: [
        header,
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentW, y2: 0, lineWidth: 1, lineColor: '#1c1917' }], margin: [0, 0, 0, 16] },
        styles.length ? body : { text: 'No styles selected.', color: MUTED },
        ...termsBlock,
      ],
      footer: (page, pages) => ({
        columns: [
          { text: [b.name, sheet.season, `Prices in ${settings.currency}`].filter(Boolean).join('  ·  '), style: 'muted' },
          { text: `${page} / ${pages}`, style: 'muted', alignment: 'right' },
        ],
        margin: [MARGIN, 14, MARGIN, 0],
      }),
    },
    `${safeName(`${b.name} ${sheet.title} ${sheet.season}`)}.pdf`,
    prefer,
    win,
  )
}

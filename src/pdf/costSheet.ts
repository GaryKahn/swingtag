import type { Content, TableCell } from 'pdfmake/interfaces'
import { CATEGORIES, WASTAGE_CATEGORIES, type Settings, type Style } from '../db/types'
import { lineCost, price } from '../lib/pricing'
import { formatMoney, pct } from '../lib/money'
import { MUTED, RULE, croppedPhoto, deliverPdf, safeName } from './common'

export async function costSheetPdf(style: Style, settings: Settings, prefer: 'share' | 'download' = 'download') {
  const p = price(style, settings)
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale)
  const wastage = style.wastagePct ?? settings.wastagePct
  const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))
  const photo = await croppedPhoto(style.photoIds[0], 3 / 4, 500)

  const header: TableCell[] = ['Component', 'Category', 'Qty', 'Unit cost', 'Wastage', 'Total'].map((t, i) => ({ text: t.toUpperCase(), style: 'th', alignment: i > 1 ? 'right' : 'left' }))
  const body: TableCell[][] = [
    header,
    ...style.lines.map((l) => [
      l.name || '—',
      { text: catLabel[l.category], color: MUTED },
      { text: `${l.qty} ${l.unit}`, alignment: 'right' },
      { text: money(l.unitCost), alignment: 'right' },
      { text: WASTAGE_CATEGORIES.includes(l.category) && wastage ? pct(wastage) : '—', alignment: 'right', color: MUTED },
      { text: money(lineCost(l, wastage)), alignment: 'right' },
    ] as TableCell[]),
  ]

  const sumRow = (label: string, value: string, bold = false): TableCell[] => [{ text: label, bold }, { text: value, alignment: 'right', bold }]
  const summary: TableCell[][] = [
    ...CATEGORIES.filter((c) => c.id !== 'labor' && p.byCategory[c.id] > 0).map((c) => sumRow(c.label, money(p.byCategory[c.id]))),
    sumRow('Labor', money(p.labor)),
    ...(p.overhead ? [sumRow('Overhead', money(p.overhead))] : []),
    ...(p.freightDuty ? [sumRow(`Freight & duty (${pct(style.freightDutyPct)})`, money(p.freightDuty))] : []),
    sumRow('Landed cost', money(p.landed), true),
  ]
  const pricing: TableCell[][] = [
    sumRow(`Wholesale${p.wholesaleIsOverride ? ' (set manually)' : ` (${pct(p.marginPct)} target margin)`}`, money(p.wholesale), true),
    sumRow(`Retail / MSRP${p.retailIsOverride ? ' (set manually)' : ` (${p.multiplier}× wholesale)`}`, money(p.retail), true),
    sumRow('Your margin', `${pct(p.actualMarginPct)} · ${p.markup.toFixed(2)}× markup`),
    sumRow("Store's margin", pct(p.retailerMarginPct)),
  ]
  const lines = { hLineWidth: (i: number) => (i === 0 ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => RULE, paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 0, paddingRight: () => 6 }

  const details = [
    ['Collection', style.collection], ['Fabrication', style.fabrication], ['Colorways', style.colorways], ['Sizes', style.sizeRange], ['MOQ', style.moq],
  ].filter(([, v]) => v)

  const content: Content[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: settings.brand.name || 'Cost sheet', style: 'muted' },
            { text: `${style.styleNumber}  ${style.name}`, fontSize: 18, bold: true, margin: [0, 2, 0, 8] },
            ...details.map(([k, v]) => ({ text: [{ text: `${k}: `, color: MUTED }, v], margin: [0, 0, 0, 2] }) as Content),
            ...(style.description ? [{ text: style.description, margin: [0, 6, 0, 0], color: MUTED } as Content] : []),
          ],
        },
        photo ? { width: 110, image: photo, fit: [110, 147] } : { width: 0, text: '' },
      ],
      columnGap: 16,
      margin: [0, 0, 0, 16],
    },
    { text: 'COMPONENTS', style: 'label', margin: [0, 0, 0, 4] },
    style.lines.length
      ? { table: { headerRows: 1, widths: ['*', 70, 50, 60, 45, 60], body }, layout: lines, margin: [0, 0, 0, 16] }
      : { text: 'No components.', color: MUTED, margin: [0, 0, 0, 16] },
    {
      columns: [
        { width: '*', stack: [{ text: 'COST', style: 'label', margin: [0, 0, 0, 4] }, { table: { widths: ['*', 70], body: summary }, layout: lines }] },
        { width: '*', stack: [{ text: 'PRICING', style: 'label', margin: [0, 0, 0, 4] }, { table: { widths: ['*', 90], body: pricing }, layout: lines }] },
      ],
      columnGap: 24,
    },
  ]

  await deliverPdf(
    {
      pageSize: settings.pageSize,
      pageMargins: [40, 40, 40, 48],
      info: { title: `Cost sheet — ${style.styleNumber} ${style.name}` },
      content,
      footer: (page, pages) => ({
        columns: [
          { text: `Internal cost sheet · ${new Date().toLocaleDateString(settings.locale)}`, style: 'muted' },
          { text: `${page} / ${pages}`, style: 'muted', alignment: 'right' },
        ],
        margin: [40, 16, 40, 0],
      }),
    },
    `cost-sheet-${safeName(`${style.styleNumber} ${style.name}`)}.pdf`,
    prefer,
  )
}

import type { Content, TableCell } from 'pdfmake/interfaces'
import type { Address, Order, Settings } from '../db/types'
import { lineQty, orderTotals } from '../lib/orders'
import { formatMoney, pct } from '../lib/money'
import { MUTED, RULE, croppedPhoto, deliverPdf, photoDataUrl, safeName } from './common'

export type InvoiceKind = 'invoice' | 'proforma' | 'confirmation'
const TITLES: Record<InvoiceKind, string> = { invoice: 'INVOICE', proforma: 'PRO FORMA INVOICE', confirmation: 'ORDER CONFIRMATION' }

const fmtDate = (iso: string, locale: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

const rule = (w: number, weight = 0.5): Content => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: w, y2: 0, lineWidth: weight, lineColor: weight > 0.5 ? '#1c1917' : RULE }] })
const small = (t: string): Content => ({ text: t, fontSize: 6.5, color: MUTED })
const kv = (k: string, v: string): Content | null => (v ? { text: [{ text: `${k} `, color: MUTED }, v], margin: [0, 0, 0, 1.5] } : null)
const compact = <T,>(xs: (T | null | undefined | false | '')[]) => xs.filter(Boolean) as T[]

function addressBlock(title: string, a: Address): Content {
  return {
    stack: compact<Content>([
      { text: title, bold: true, margin: [0, 0, 0, 3] },
      a.name && { text: a.name },
      a.address && { text: a.address },
      a.contact && { text: a.contact, margin: [0, 4, 0, 0] },
      a.email && { text: `E: ${a.email}` },
      a.phone && { text: `T: ${a.phone}` },
    ]),
  }
}

export async function invoicePdf(order: Order, settings: Settings, kind: InvoiceKind = 'invoice', prefer: 'share' | 'download' | 'preview' = 'download', win?: Window | null) {
  const money = (n: number) => formatMoney(n, order.currency, settings.locale)
  const b = settings.brand
  const bank = b.bank
  const W = (settings.pageSize === 'A4' ? 595.28 : 612) - 72
  const t = orderTotals(order)
  const lines = order.lines.filter((l) => lineQty(l) > 0)
  const logo = await photoDataUrl(b.logoPhotoId)
  const thumbs = await Promise.all(lines.map((l) => croppedPhoto(l.photoId, 3 / 4, 200, 'thumb')))
  const delivery = order.deliverySameAsStore ? order.store : order.delivery

  const header: Content = {
    columns: [
      {
        width: '*',
        stack: compact<Content>([
          { text: TITLES[kind], fontSize: 20 },
          { text: order.number, bold: true, fontSize: 12, margin: [0, 2, 0, 0] },
          order.store.name && { text: order.store.name, bold: true, fontSize: 11 },
          b.name && { text: b.name.toUpperCase(), fontSize: 8, color: MUTED },
        ]),
      },
      logo ? { width: 110, image: logo, fit: [100, 55], alignment: 'center' } : { width: 0, text: '' },
      {
        width: '*',
        alignment: 'right',
        fontSize: 8,
        stack: compact<Content>([
          { text: b.legalName || b.name, bold: true },
          b.address && { text: b.address },
          b.email && { text: b.email, margin: [0, 3, 0, 0] },
          b.phone && { text: b.phone },
          b.website && { text: b.website },
        ]),
      },
    ],
    columnGap: 10,
    margin: [0, 0, 0, 10],
  }

  const parties: Content = {
    columns: [
      { width: '*', stack: [addressBlock('Store / Bill to:', order.store)] },
      { width: '*', stack: [addressBlock('Deliver to:', delivery)] },
      {
        width: '*',
        stack: compact<Content>([
          { text: 'Document:', bold: true, margin: [0, 0, 0, 3] },
          kv('Number:', order.number),
          kv('Date:', fmtDate(order.date, settings.locale)),
          kv('Customer PO:', order.poNumber),
          kv('Dispatch date:', fmtDate(order.dispatchDate, settings.locale)),
          kv('Payment due:', fmtDate(order.dueDate, settings.locale)),
        ]),
      },
    ],
    columnGap: 14,
    fontSize: 8,
    margin: [0, 8, 0, 8],
  }

  const bankLines = compact<Content>([
    kv('Account name:', bank.accountName),
    kv('Bank:', bank.bankName),
    kv('Account no:', bank.accountNumber),
    kv('Account type:', bank.accountType),
    kv('Branch code:', bank.branchCode),
    kv('SWIFT/BIC:', bank.swift),
    kv('IBAN:', bank.iban),
    kv('Reference:', bank.reference || order.number),
  ])
  const terms: Content = {
    columns: [
      {
        width: '*',
        stack: compact<Content>([
          { text: 'Terms:', bold: true, margin: [0, 0, 0, 3] },
          kv('Payment:', order.paymentTerms),
          kv('Shipping:', order.shippingTerms),
          order.depositPct ? kv('Deposit:', `${pct(order.depositPct)} (${money(t.deposit)}) due on confirmation`) : null,
        ]),
      },
      bankLines.length > 1 ? { width: '*', stack: [{ text: 'Bank details:', bold: true, margin: [0, 0, 0, 3] }, ...bankLines] } : { width: '*', text: '' },
    ],
    columnGap: 14,
    fontSize: 8,
    margin: [0, 8, 0, 10],
  }

  const head: TableCell[] = ['', 'STYLE', 'SIZES', 'QTY', 'UNIT PRICE', 'TOTAL'].map((h, i) => ({ text: h, style: 'th', alignment: i >= 3 ? 'right' : 'left' }))
  const rows: TableCell[][] = lines.map((l, i) => {
    const q = lineQty(l)
    const sizeText = l.sizes.filter((s) => l.qty[s]).map((s) => `${s} ×${l.qty[s]}`).join('   ')
    return [
      thumbs[i] ? { image: thumbs[i]!, width: 36, height: 48 } : { text: '' },
      {
        stack: compact<Content>([
          { text: [{ text: l.styleNumber, bold: true }, l.name ? `  ${l.name}` : ''] },
          {
            text: compact<string>([l.colour && `Colour: ${l.colour}`, l.origin && `COO: ${l.origin}`, l.hsCode && `HS: ${l.hsCode}`]).join('     '),
            fontSize: 8,
            margin: [0, 2, 0, 0],
          },
          l.fabrication && { ...(small(l.fabrication) as object), margin: [0, 2, 0, 0] } as Content,
        ]),
      },
      { text: sizeText, fontSize: 8 },
      { text: String(q), alignment: 'right', bold: true },
      { text: money(l.unitPrice), alignment: 'right' },
      { text: money(q * l.unitPrice), alignment: 'right', bold: true },
    ]
  })

  const items: Content = lines.length
    ? {
        table: { headerRows: 1, dontBreakRows: true, widths: [36, '*', 110, 30, 62, 70], body: [head, ...rows] },
        layout: { hLineWidth: (i) => (i === 0 ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => RULE, paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: (i) => (i === 0 ? 0 : 6), paddingRight: () => 0 },
      }
    : { text: 'No items with quantities yet.', color: MUTED, margin: [0, 10, 0, 10] }

  const totalRow = (k: string, v: string, bold = false): TableCell[] => [{ text: k, color: bold ? undefined : MUTED, bold, alignment: 'right' }, { text: v, alignment: 'right', bold }]
  const totals: Content = {
    columns: [
      { width: '*', text: '' },
      {
        width: 230,
        table: {
          widths: ['*', 80],
          body: compact<TableCell[]>([
            totalRow('Total qty', String(t.qty)),
            totalRow('Goods value', money(t.goods)),
            totalRow(`VAT @ ${pct(order.vatPct || 0)}`, money(t.vat)),
            totalRow(kind === 'confirmation' ? 'Order total' : 'Total due', money(t.total), true),
            order.depositPct ? totalRow(`Deposit (${pct(order.depositPct)})`, money(t.deposit)) : null,
            order.depositPct ? totalRow('Balance', money(t.balance)) : null,
          ]),
        },
        layout: { hLineWidth: (i, node) => (i === 4 && node.table.body.length > 4 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => RULE, paddingTop: () => 2, paddingBottom: () => 2 },
      },
    ],
    margin: [0, 10, 0, 0],
  }

  const content: Content[] = compact<Content>([
    header,
    rule(W, 1),
    parties,
    rule(W),
    terms,
    items,
    rule(W),
    totals,
    order.notes && { text: order.notes, color: MUTED, margin: [0, 14, 0, 0] },
    {
      margin: [0, 30, 0, 0],
      unbreakable: true,
      stack: compact<Content>([
        { text: 'Signed ...........................................................................', color: MUTED },
        order.dueDate && { text: [{ text: 'Payment due date: ', color: MUTED }, fmtDate(order.dueDate, settings.locale)], margin: [0, 8, 0, 0] },
      ]),
    },
  ])

  const footerBits = compact<string>([b.regNo && `Reg No: ${b.regNo}`, b.vatNo && `VAT No: ${b.vatNo}`]).join('   ·   ')
  await deliverPdf(
    {
      pageSize: settings.pageSize,
      pageMargins: [36, 36, 36, 44],
      info: { title: `${TITLES[kind]} ${order.number}`, author: b.legalName || b.name },
      content,
      footer: (page, pages) => ({
        columns: [
          { text: footerBits, style: 'muted' },
          { text: `Page ${page}/${pages}`, style: 'muted', alignment: 'right' },
        ],
        margin: [36, 14, 36, 0],
      }),
    },
    `${safeName(`${order.number} ${order.store.name}`)}${kind === 'invoice' ? '' : `-${kind}`}.pdf`,
    prefer,
    win,
  )
}

// Generates the screenshots used by the in-app Help guides and the README.
// Seeds a demo brand through the real UI, captures key screens, and renders the PDFs it produces.
//   npm run screenshots        (builds first, then writes public/help/*.jpg)
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const OUT = resolve('public/help')
const PORT = 4174
const BASE = `http://localhost:${PORT}/`
mkdirSync(OUT, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const stop = () => server.kill()
process.on('exit', stop)
for (let i = 0; i < 50; i++) {
  try {
    await fetch(BASE)
    break
  } catch {
    await new Promise((r) => setTimeout(r, 200))
  }
}

const browser = await chromium.launch()
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-ZA' }
const ctx = await browser.newContext({ ...phone, acceptDownloads: true })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.error('pageerror:', e.message))

const shot = (name, opts = {}) => page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78, ...opts })
const shotEl = (locator, name) => locator.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78 })
const settle = (ms = 500) => page.waitForTimeout(ms)
async function download(click) {
  const d = page.waitForEvent('download')
  await click()
  return (await d).path()
}

// --- demo product photos: simple garment silhouettes
const GARMENTS = {
  shirt: '<path d="M8 3 4 5.5 2.5 10l3 1.2V21h13v-9.8l3-1.2L20 5.5 16 3c-.5 1.6-2 2.6-4 2.6S8.5 4.6 8 3Z"/>',
  trouser: '<path d="M7 2.5h10l1.2 19h-4.4L12 9.5l-1.8 12H5.8z"/>',
  tote: '<path d="M4.5 9h15l-1.2 12.5H5.7z"/><path d="M9 9V7a3 3 0 0 1 6 0v2" fill="none" stroke-width="1.2"/>',
  tee: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-.6 1.4-2 2.2-4 2.2S8.6 4.4 8 3Z"/>',
}
async function photo(kind, bg, fg) {
  const p = await browser.newPage({ viewport: { width: 600, height: 800 } })
  await p.setContent(`<body style="margin:0"><div style="width:600px;height:800px;background:radial-gradient(circle at 50% 40%,#fff6 0,transparent 60%),${bg};display:flex;align-items:center;justify-content:center">
    <svg viewBox="0 0 24 24" width="420" height="420" fill="${fg}" stroke="${fg}" style="filter:drop-shadow(0 18px 24px #0003)">${GARMENTS[kind]}</svg></div></body>`)
  const buffer = await p.screenshot({ type: 'jpeg', quality: 90 })
  await p.close()
  return { name: `${kind}.jpg`, mimeType: 'image/jpeg', buffer }
}

// --- render a page of a generated PDF to an image with pdf.js
async function renderPdf(pdfPath, pageNum, name, { crop } = {}) {
  const p = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 })
  await p.route('**/__pdfjs/**', (route) => {
    const file = route.request().url().split('/__pdfjs/')[1]
    route.fulfill({ path: resolve('node_modules/pdfjs-dist/build', file), contentType: 'text/javascript' })
  })
  await p.route('**/__render', (route) => route.fulfill({ contentType: 'text/html', body: '<body style="margin:0;background:#e7e5e4"><canvas id="c"></canvas></body>' }))
  await p.goto(`${BASE}__render`)
  const data = readFileSync(pdfPath).toString('base64')
  const size = await p.evaluate(async ({ data, pageNum }) => {
    const pdfjs = await import('/__pdfjs/pdf.min.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfjs/pdf.worker.min.mjs'
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    const doc = await pdfjs.getDocument({ data: bytes }).promise
    const pg = await doc.getPage(pageNum)
    const viewport = pg.getViewport({ scale: 900 / pg.getViewport({ scale: 1 }).width })
    const c = document.getElementById('c')
    c.width = viewport.width
    c.height = viewport.height
    await pg.render({ canvasContext: c.getContext('2d'), viewport }).promise
    return { w: viewport.width, h: viewport.height }
  }, { data, pageNum })
  await p.setViewportSize({ width: Math.ceil(size.w), height: Math.ceil(size.h) })
  await p.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: size.w, height: crop ? size.h * crop : size.h } })
  await p.close()
}

// ===== Settings: brand, company, bank =====
await page.goto(BASE + '#/settings')
await page.getByLabel('Brand name').fill('Atelier Nord')
await page.getByLabel('Email').first().fill('hello@ateliernord.co.za')
await page.getByLabel('Website / Instagram').fill('@ateliernord')
await page.getByLabel('Delivery window').fill('Ships 15 Feb – 30 Mar 2027')
await page.getByLabel('Order minimums').fill('R5 000 opening order')
await page.getByLabel('Registered business name').fill('Atelier Nord (Pty) Ltd')
await page.getByLabel('Business address').fill('12 Bree Street\nCape Town 8001\nSouth Africa')
await page.getByLabel('Company reg. no.').fill('2024/123456/07')
await page.getByLabel('Account holder').fill('Atelier Nord (Pty) Ltd')
await page.getByLabel('Bank', { exact: true }).fill('FNB')
await page.getByLabel('Account number').fill('62812345678')
await page.getByLabel('Account type').fill('Business cheque')
await page.getByLabel('Branch code').fill('250655')
await settle(700)
await shotEl(page.locator('section', { hasText: 'Bank details' }), 'settings-bank')
await shotEl(page.locator('section', { hasText: 'Back up or move' }), 'backup')
await shotEl(page.locator('section', { hasText: 'Pricing defaults' }), 'pricing-defaults')

// ===== Styles =====
async function makeStyle({ template, name, fab, colours, sizes, photos, buttons }) {
  await page.goto(BASE + '#/styles')
  await page.getByRole('button', { name: /^(New|Start a style)$/ }).first().click()
  if (name === 'Camp collar shirt') {
    await settle(300)
    await shot('new-style')
  }
  await page.getByRole('button', { name: new RegExp(template) }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Collection / season').fill('SS27')
  await page.getByLabel('Fabrication / content').fill(fab)
  await page.getByLabel('Colourways').fill(colours)
  await page.getByLabel('Sizes').fill(sizes)
  await page.getByLabel('Country of origin').fill('South Africa')
  await page.locator('input[type=file]').setInputFiles(photos)
  await settle(1500)
  for (let i = 0; i < (buttons ?? 0); i++) await page.getByRole('button', { name: 'Increase Buttons quantity' }).click()
}
await makeStyle({ template: 'T-shirt', name: 'Boxy tee', fab: '100% organic cotton jersey', colours: 'White, Black, Sage', sizes: 'XS–XL', photos: [await photo('tee', '#e9e4da', '#8a9a7b')] })
await makeStyle({ template: 'Trousers', name: 'Pleated trouser', fab: 'Wool-blend twill', colours: 'Charcoal, Stone', sizes: '28–34', photos: [await photo('trouser', '#e7e5e4', '#44403c')] })
await makeStyle({ template: 'Tote bag', name: 'Market tote', fab: 'Cotton canvas', colours: 'Natural', sizes: '', photos: [await photo('tote', '#efe9dd', '#b8a07a')] })
await makeStyle({
  template: 'Button-up shirt', name: 'Camp collar shirt', fab: '100% linen', colours: 'Ecru, Navy', sizes: 'XS–XL', buttons: 1,
  photos: [await photo('shirt', '#ece6dc', '#c8b79a'), await photo('shirt', '#dfe3ea', '#3b4a6b')],
})
await page.evaluate(() => scrollTo(0, 0))
await settle()
await shot('style-details')
await page.getByRole('heading', { name: 'Components' }).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 16))
await settle()
await shot('style-costing')

await page.goto(BASE + '#/styles')
await settle()
await shot('styles')
await page.goto(BASE + '#/components')
await settle()
await shot('components')
await page.goto(BASE + '#/templates')
await settle()
await shot('templates')

// ===== Line sheet =====
await page.goto(BASE + '#/linesheets')
await page.getByRole('button', { name: 'Make a line sheet' }).click()
await page.getByLabel('Season').fill('Spring/Summer 2027')
await page.getByLabel('Order deadline').fill('15 January 2027')
await page.getByLabel('Add a printable order form to the PDF').check()
await settle(700)
await shot('line-sheet')
const lineSheetPdf = await download(() => page.getByRole('button', { name: /Download PDF/ }).click())
const orderSheetXlsx = await download(() => page.getByRole('button', { name: /Order sheet/ }).click())
await renderPdf(lineSheetPdf, 1, 'line-sheet-pdf')
const pages = (readFileSync(lineSheetPdf).toString('latin1').match(/\/Type \/Page\b/g) ?? []).length
await renderPdf(lineSheetPdf, pages, 'order-form-pdf', { crop: 0.62 })

// ===== Order sheet: a buyer fills it in, then it's imported =====
const ExcelJS = (await import('exceljs')).default
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(orderSheetXlsx)
const ws = wb.getWorksheet('Order sheet')
const find = (t) => {
  let a
  ws.eachRow((r) => r.eachCell((c) => { if (!a && c.value === t) a = c.address }))
  return Number(a.replace(/^[A-Z]+/, ''))
}
ws.getCell(`C${find('Store name')}`).value = 'Merchants on Long'
ws.getCell(`C${find('Buyer / contact')}`).value = 'Thandi Mokoena'
ws.getCell(`C${find('Email')}`).value = 'buying@merchantsonlong.co.za'
ws.getCell(`C${find('Billing address')}`).value = '34 Long Street, Cape Town 8001'
ws.getCell(`C${find('PO number')}`).value = 'MOL-2291'
const qty = (colour, offsets) => { const top = find(colour); for (const [i, q] of offsets) ws.getCell(`I${top + i}`).value = q }
qty('Ecru', [[1, 3], [2, 5], [3, 4], [4, 2]])
qty('Navy', [[1, 2], [2, 3], [3, 3]])
qty('Charcoal', [[1, 2], [2, 4], [3, 4], [4, 2]])
qty('Natural', [[0, 12]])
const filled = join(OUT, '..', '..', 'test-results', 'filled-order-sheet.xlsx')
mkdirSync(join(filled, '..'), { recursive: true })
await wb.xlsx.writeFile(filled)

await page.goto(BASE + '#/orders')
await settle()
await shot('orders-empty')
await page.locator('input[type=file]').setInputFiles(filled)
await page.waitForURL(/#\/orders\/.+/)
await page.getByLabel('VAT').fill('15')
await page.getByLabel('Dispatch date').fill('2027-02-15')
await page.getByLabel('Payment due').fill('2027-03-15')
await settle(700)
await page.getByRole('heading', { name: 'Items' }).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 16))
await settle()
await shot('order-items')
await page.evaluate(() => scrollTo(0, 0))
await settle()
await shot('order-summary')
const invoice = await download(() => page.getByRole('button', { name: /Invoice PDF/ }).click())
await renderPdf(invoice, 1, 'invoice-pdf', { crop: 0.82 })

// ===== Desktop views for the README =====
await page.setViewportSize({ width: 1280, height: 800 })
await page.goto(BASE + '#/styles')
await page.getByText('Camp collar shirt').click()
await settle(700)
await shot('desktop-style')
await page.goto(BASE + '#/styles')
await settle()
await shot('desktop-styles')

await browser.close()
stop()
console.log(`Screenshots written to ${OUT}`)

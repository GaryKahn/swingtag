// Renders public/icons/icon.svg to the PNG sizes the PWA manifest needs.
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icons/icon.svg', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
const render = async (size, file, padded = false) => {
  await page.setViewportSize({ width: size, height: size })
  // maskable icons need the artwork inside the central safe zone on a full-bleed background
  const inner = padded ? `<div style="background:#1c1917;width:100%;height:100%;display:flex;align-items:center;justify-content:center"><div style="width:72%;height:72%">${svg}</div></div>` : svg
  await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{width:100%;height:100%;display:block}</style>${inner}`)
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: !padded })
}
await render(192, 'icon-192.png')
await render(512, 'icon-512.png')
await render(512, 'icon-maskable-512.png', true)
await browser.close()

import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('cost a style, then work fully offline: reload, line sheet PDF, backup', async ({ page, context }) => {
  await page.goto('./')
  // wait for the service worker to take control so the app shell is cached
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r))
  })

  await page.getByRole('button', { name: 'Start a style' }).click()
  await page.getByRole('button', { name: /Button-up shirt/ }).click()
  await expect(page.getByRole('heading', { name: 'Button-up shirt' })).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill('Camp collar shirt')
  await page.getByLabel('Line 1 name').fill('Linen')
  await page.getByText('Fabric', { exact: false }).first().waitFor()
  await page.waitForTimeout(600) // autosave debounce

  await context.setOffline(true)
  await page.reload()
  await page.goto('./#/styles')
  await expect(page.getByText('Camp collar shirt')).toBeVisible()

  await page.goto('./#/linesheets')
  await page.getByRole('button', { name: 'Make a line sheet' }).click()
  await expect(page.getByText('Camp collar shirt')).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download PDF/ }).click()
  const pdf = readFileSync((await (await dl).path())!)
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')

  await page.goto('./#/settings')
  const bk = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export backup/ }).click()
  const backup = JSON.parse(readFileSync((await (await bk).path())!, 'utf8'))
  expect(backup.app).toBe('costsheet')
  expect(backup.styles[0].name).toBe('Camp collar shirt')
  expect(backup.styles[0].lines[0].name).toBe('Linen')
})

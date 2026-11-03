<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import NumberField from '../components/NumberField.vue'
import Sheet from '../components/Sheet.vue'
import ConfirmButton from '../components/ConfirmButton.vue'
import { db, requestPersist } from '../db/schema'
import { defaultSettings, seed } from '../db/seed'
import type { Rounding, Settings } from '../db/types'
import { saveSettings, useAutosave, useSettings } from '../lib/live'
import { CURRENCIES, formatMoney } from '../lib/money'
import { roundPrice } from '../lib/pricing'
import { backupFilename, exportData, importData, parseBackup, summarize, type Backup, type ImportMode } from '../lib/backup'
import { forgetPhotoUrls, photoUrl, savePhoto } from '../lib/images'

const live = useSettings()
const draft = ref<Settings>()
onMounted(async () => (draft.value = (await db.settings.get('settings')) ?? defaultSettings()))
// Settings can also change from an import, so re-read when the live copy changes underneath us
watch(live, (s) => {
  if (draft.value && s.lastExportAt !== draft.value.lastExportAt) draft.value = { ...draft.value, lastExportAt: s.lastExportAt }
})
useAutosave(draft, (s) => saveSettings(s))

const roundings: { id: Rounding; label: string }[] = [
  { id: 'none', label: 'Exact' },
  { id: 'whole', label: 'Whole' },
  { id: '.95', label: '.95' },
  { id: '.99', label: '.99' },
  { id: '5', label: 'Nearest 5' },
]
const sample = computed(() => (draft.value ? formatMoney(roundPrice(41.3, draft.value.rounding), draft.value.currency, draft.value.locale) : ''))
const currencyName = (c: string) => {
  try {
    return new Intl.DisplayNames([draft.value?.locale ?? 'en'], { type: 'currency' }).of(c) ?? c
  } catch {
    return c
  }
}

// --- logo
const logoUrl = ref<string>()
watch(() => draft.value?.brand.logoPhotoId, async (id) => (logoUrl.value = id ? await photoUrl(id, 'blob') : undefined), { immediate: true })
async function onLogo(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f || !draft.value) return
  const old = draft.value.brand.logoPhotoId
  draft.value.brand.logoPhotoId = await savePhoto(f, 'brand')
  if (old) {
    forgetPhotoUrls(old)
    await db.photos.delete(old)
  }
  requestPersist()
}
async function removeLogo() {
  if (!draft.value?.brand.logoPhotoId) return
  const id = draft.value.brand.logoPhotoId
  draft.value.brand.logoPhotoId = undefined
  forgetPhotoUrls(id)
  await db.photos.delete(id)
}

// --- backup
const exporting = ref(false)
const msg = ref('')
const lastExport = computed(() => {
  const t = live.value.lastExportAt
  if (!t) return 'Never backed up'
  const days = Math.floor((Date.now() - t) / 86_400_000)
  return days === 0 ? 'Last backup: today' : `Last backup: ${days} day${days === 1 ? '' : 's'} ago`
})
async function doExport() {
  exporting.value = true
  msg.value = ''
  try {
    const data = await exportData(db)
    const name = backupFilename()
    const file = new File([JSON.stringify(data)], name, { type: 'application/json' })
    let shared = false
    if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ files: [file], title: name })
        shared = true
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return
      }
    }
    if (!shared) {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    }
    await saveSettings({ lastExportAt: Date.now() })
    msg.value = `Saved ${name}. Keep it somewhere safe, or open it with Import on another device.`
  } finally {
    exporting.value = false
  }
}

const pending = ref<Backup>()
const importError = ref('')
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f) return
  importError.value = ''
  try {
    pending.value = parseBackup(await f.text())
  } catch (err) {
    importError.value = (err as Error).message
  }
}
const pendingSummary = computed(() => (pending.value ? summarize(pending.value) : undefined))
async function doImport(mode: ImportMode) {
  if (!pending.value) return
  await importData(db, pending.value, mode)
  await seed(db)
  draft.value = await db.settings.get('settings')
  pending.value = undefined
  msg.value = mode === 'replace' ? 'Backup restored.' : 'Backup merged into this device.'
  requestPersist()
}

// --- storage
const usage = ref('')
onMounted(async () => {
  const est = await navigator.storage?.estimate?.()
  const persisted = await navigator.storage?.persisted?.()
  if (est?.usage !== undefined) usage.value = `${(est.usage / 1024 / 1024).toFixed(1)} MB used on this device${persisted ? ' · protected from automatic cleanup' : ''}`
})

async function eraseAll() {
  await Promise.all([db.styles.clear(), db.photos.clear(), db.lineSheets.clear(), db.templates.clear(), db.components.clear(), db.settings.clear()])
  await seed(db)
  draft.value = await db.settings.get('settings')
  msg.value = 'All data erased. The built-in templates are back.'
}
</script>

<template>
  <PageHeader title="Settings" subtitle="Saved on this device only. Nothing is uploaded." />

  <div v-if="draft" class="max-w-2xl space-y-5">
    <section class="card space-y-3 p-4">
      <h2 class="h2">Back up or move to another device</h2>
      <p class="text-sm text-stone-500">Your work lives in this browser. Export a backup file to keep it safe, or import it on your phone or laptop to carry on there.</p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-primary" :disabled="exporting" @click="doExport"><Icon name="download" :size="18" /> {{ exporting ? 'Preparing…' : 'Export backup' }}</button>
        <label class="btn-secondary cursor-pointer"><Icon name="upload" :size="18" /> Import backup<input type="file" accept="application/json,.json" class="sr-only" @change="onImportFile" /></label>
      </div>
      <p class="text-xs text-stone-500">{{ lastExport }}</p>
      <p v-if="msg" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{{ msg }}</p>
      <p v-if="importError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ importError }}</p>
    </section>

    <section class="card space-y-3 p-4">
      <h2 class="h2">Pricing defaults</h2>
      <div class="grid grid-cols-2 gap-3">
        <label><span class="label">Target wholesale margin</span><NumberField v-model="draft.marginPct" suffix="%" /></label>
        <label><span class="label">Retail multiplier</span><NumberField v-model="draft.retailMultiplier" suffix="×" /></label>
        <label><span class="label">Fabric & trim wastage</span><NumberField v-model="draft.wastagePct" suffix="%" /></label>
        <label><span class="label">Currency</span>
          <select v-model="draft.currency" class="field">
            <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }} · {{ currencyName(c) }}</option>
          </select>
        </label>
      </div>
      <p class="text-xs text-stone-500">A {{ draft.marginPct }}% margin means wholesale = cost ÷ {{ (1 - draft.marginPct / 100).toFixed(2) }}. A 2× retail multiplier ("keystone") is common; many stores use 2.2–2.5×.</p>
      <div>
        <span class="label">Round prices up to</span>
        <div class="grid grid-cols-5 gap-1.5">
          <button v-for="r in roundings" :key="r.id" class="btn-secondary px-1 text-xs" :class="{ '!border-ink !bg-ink !text-white': draft.rounding === r.id }" @click="draft.rounding = r.id">{{ r.label }}</button>
        </div>
        <p class="mt-1 text-xs text-stone-500">e.g. 41.30 → {{ sample }}</p>
      </div>
    </section>

    <section class="card space-y-3 p-4">
      <h2 class="h2">Brand (for line sheets)</h2>
      <div class="flex items-center gap-4">
        <div class="flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-white">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="max-h-full max-w-full object-contain" />
          <span v-else class="text-xs text-stone-400">No logo</span>
        </div>
        <label class="btn-secondary cursor-pointer">{{ logoUrl ? 'Change logo' : 'Add logo' }}<input type="file" accept="image/*" class="sr-only" @change="onLogo" /></label>
        <button v-if="logoUrl" class="btn-ghost" @click="removeLogo">Remove</button>
      </div>
      <label class="block"><span class="label">Brand name</span><input v-model="draft.brand.name" class="field" /></label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label><span class="label">Contact name</span><input v-model="draft.brand.contact" class="field" /></label>
        <label><span class="label">Email</span><input v-model="draft.brand.email" type="email" class="field" /></label>
        <label><span class="label">Phone</span><input v-model="draft.brand.phone" type="tel" class="field" /></label>
        <label><span class="label">Website / Instagram</span><input v-model="draft.brand.website" class="field" /></label>
      </div>
      <label class="block"><span class="label">Delivery window</span><input v-model="draft.brand.shipWindow" class="field" placeholder="e.g. Ships Feb 15 – Mar 30" /></label>
      <label class="block"><span class="label">Order minimums</span><input v-model="draft.brand.moq" class="field" placeholder="e.g. $500 opening order, 6 units per style" /></label>
      <label class="block"><span class="label">Payment terms</span><input v-model="draft.brand.paymentTerms" class="field" /></label>
      <label class="block"><span class="label">Other order terms</span><textarea v-model="draft.brand.orderTerms" rows="2" class="field" placeholder="e.g. Prices exclude shipping. Exclusivity within 2 km." /></label>
      <div>
        <span class="label">Paper size</span>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn-secondary" :class="{ '!border-ink !bg-ink !text-white': draft.pageSize === 'LETTER' }" @click="draft.pageSize = 'LETTER'">US Letter</button>
          <button class="btn-secondary" :class="{ '!border-ink !bg-ink !text-white': draft.pageSize === 'A4' }" @click="draft.pageSize = 'A4'">A4</button>
        </div>
      </div>
    </section>

    <section class="card space-y-2 p-4">
      <h2 class="h2">This device</h2>
      <p v-if="usage" class="text-sm text-stone-500">{{ usage }}</p>
      <p class="text-sm text-stone-500">Clearing your browser's site data deletes everything here. Export a backup first.</p>
      <ConfirmButton label="Erase all data" confirm-label="Tap again to erase everything" @confirm="eraseAll" />
    </section>
  </div>

  <Sheet v-if="pending && pendingSummary" title="Import backup" @close="pending = undefined">
    <p class="text-sm">From {{ new Date(pending.exportedAt).toLocaleString() }}:</p>
    <ul class="my-3 grid grid-cols-2 gap-1 text-sm text-stone-600">
      <li>{{ pendingSummary.styles }} styles</li>
      <li>{{ pendingSummary.photos }} photos</li>
      <li>{{ pendingSummary.lineSheets }} line sheets</li>
      <li>{{ pendingSummary.templates }} custom templates</li>
      <li>{{ pendingSummary.components }} custom components</li>
    </ul>
    <div class="space-y-2">
      <button class="btn-primary w-full" @click="doImport('merge')">Merge with this device</button>
      <p class="text-xs text-stone-500">Keeps what's here and adds what's in the backup. Where both have the same item, the more recently edited one wins.</p>
      <ConfirmButton class="w-full border border-red-200" label="Replace everything on this device" confirm-label="Tap again to replace" @confirm="doImport('replace')" />
    </div>
  </Sheet>
</template>

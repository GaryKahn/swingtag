<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import Thumb from '../components/Thumb.vue'
import ConfirmButton from '../components/ConfirmButton.vue'
import { db } from '../db/schema'
import type { LineSheet, LineSheetLayout, Style } from '../db/types'
import { useAutosave, useLive, useSettings } from '../lib/live'
import { price } from '../lib/pricing'
import { formatMoney } from '../lib/money'
import { canShareFiles } from '../pdf/common'

const props = defineProps<{ id: string }>()
const router = useRouter()
const settings = useSettings()
const draft = ref<LineSheet>()
const styles = useLive(() => db.styles.orderBy('styleNumber').toArray(), [] as Style[])
const busy = ref(false)
const error = ref('')
const share = canShareFiles()

watch(() => props.id, async (id) => {
  draft.value = undefined
  draft.value = await db.lineSheets.get(id)
}, { immediate: true })
const { flush, cancel } = useAutosave(draft, (ls) => db.lineSheets.put({ ...ls, updatedAt: Date.now() }))

const byId = computed(() => new Map(styles.value.map((s) => [s.id, s])))
const selected = computed(() => (draft.value?.styleIds ?? []).map((id) => byId.value.get(id)).filter((s): s is Style => !!s))
const available = computed(() => styles.value.filter((s) => !draft.value?.styleIds.includes(s.id)))
const money = (n: number) => formatMoney(n, settings.value.currency, settings.value.locale)
const layouts: { id: LineSheetLayout; label: string }[] = [
  { id: 'grid-2', label: '2 per row' },
  { id: 'grid-3', label: '3 per row' },
  { id: 'list', label: 'List' },
]

function move(i: number, d: number) {
  const ids = draft.value!.styleIds
  const j = i + d
  if (j < 0 || j >= ids.length) return
  const [x] = ids.splice(i, 1)
  ids.splice(j, 0, x)
}

async function make(prefer: 'share' | 'download' | 'preview') {
  if (!draft.value) return
  const win = prefer === 'preview' ? window.open('', '_blank') : undefined
  flush()
  busy.value = true
  error.value = ''
  try {
    const { lineSheetPdf } = await import('../pdf/lineSheet')
    await lineSheetPdf(draft.value, selected.value, settings.value, prefer, win)
  } catch (e) {
    win?.close()
    console.error(e)
    error.value = 'Something went wrong making the PDF. Try again, or remove a style whose photo may be damaged.'
  } finally {
    busy.value = false
  }
}
async function orderSheet() {
  if (!draft.value) return
  flush()
  busy.value = true
  error.value = ''
  try {
    const [{ buildOrderSheet }, { croppedPhoto }, { deliverFile }, { linesForStyle }] = await Promise.all([
      import('../lib/orderSheet'), import('../pdf/common'), import('../lib/files'), import('../lib/orders'),
    ])
    const ls = draft.value
    const blob = await buildOrderSheet(
      { title: ls.title, season: ls.season, orderDeadline: ls.orderDeadline, showRetail: ls.showRetail, lines: selected.value.flatMap((s) => linesForStyle(s, settings.value)) },
      settings.value,
      (id) => croppedPhoto(id, 3 / 4, 300, 'thumb').then((u) => u?.split(',')[1]),
    )
    const name = [settings.value.brand.name, ls.title, ls.season, 'order sheet'].filter(Boolean).join(' ').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase()
    await deliverFile(blob, `${name}.xlsx`, share)
  } catch (e) {
    console.error(e)
    error.value = 'Something went wrong making the order sheet.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  cancel()
  await db.lineSheets.delete(props.id)
  router.replace('/linesheets')
}
</script>

<template>
  <template v-if="draft">
    <PageHeader :title="draft.title || 'Line sheet'" help="linesheet" :subtitle="`${selected.length} styles`" back="/linesheets" />

    <div v-if="!settings.brand.name" class="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <Icon name="warn" :size="18" /> Add your brand name, logo and contact details in <RouterLink to="/settings" class="underline">Settings</RouterLink> so they appear on the sheet.
    </div>

    <div class="grid gap-6 md:grid-cols-[1fr_18rem]">
      <div class="space-y-5">
        <section class="card space-y-3 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <label><span class="label">Title</span><input v-model="draft.title" class="field" /></label>
            <label><span class="label">Season</span><input v-model="draft.season" class="field" placeholder="e.g. Spring/Summer 2027" /></label>
          </div>
          <label class="block"><span class="label">Order deadline</span><input v-model="draft.orderDeadline" class="field" placeholder="e.g. January 15, 2027" /></label>
          <label class="block"><span class="label">Notes for buyers</span><textarea v-model="draft.notes" rows="2" class="field" placeholder="e.g. Made in small batches in Cape Town" /></label>
          <div>
            <span class="label">Layout</span>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="l in layouts" :key="l.id" class="btn-secondary" :class="{ '!border-ink !bg-ink !text-white': draft.layout === l.id }" @click="draft.layout = l.id">{{ l.label }}</button>
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm"><input v-model="draft.showRetail" type="checkbox" class="size-4 accent-ink" /> Show suggested retail (MSRP)</label>
        </section>

        <section>
          <h2 class="label">On this sheet (in this order)</h2>
          <p v-if="!selected.length" class="card p-4 text-sm text-stone-500">No styles yet. Add some below.</p>
          <ul class="card divide-y divide-stone-100">
            <li v-for="(s, i) in selected" :key="s.id" class="flex items-center gap-3 p-2.5">
              <Thumb :id="s.photoIds[0]" class="w-10" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{{ s.name }}</div>
                <div class="text-xs tabular-nums text-stone-500">{{ s.styleNumber }} · {{ money(price(s, settings).wholesale) }}</div>
              </div>
              <button class="btn-ghost px-1.5" aria-label="Move up" :disabled="i === 0" @click="move(i, -1)"><Icon name="up" :size="18" /></button>
              <button class="btn-ghost px-1.5" aria-label="Move down" :disabled="i === selected.length - 1" @click="move(i, 1)"><Icon name="down" :size="18" /></button>
              <button class="btn-ghost px-1.5" aria-label="Remove from sheet" @click="draft.styleIds.splice(draft.styleIds.indexOf(s.id), 1)"><Icon name="x" :size="18" /></button>
            </li>
          </ul>
        </section>

        <section v-if="available.length">
          <div class="flex items-center justify-between">
            <h2 class="label">Other styles</h2>
            <button class="btn-ghost -mt-1 px-2 text-xs" @click="draft.styleIds.push(...available.map((s) => s.id))">Add all</button>
          </div>
          <ul class="card divide-y divide-stone-100">
            <li v-for="s in available" :key="s.id">
              <button class="flex w-full items-center gap-3 p-2.5 text-left hover:bg-stone-50" @click="draft.styleIds.push(s.id)">
                <Thumb :id="s.photoIds[0]" class="w-10" />
                <span class="min-w-0 flex-1 truncate text-sm">{{ s.styleNumber }} · {{ s.name }}</span>
                <Icon name="plus" :size="18" />
              </button>
            </li>
          </ul>
        </section>

        <ConfirmButton label="Delete line sheet" @confirm="remove" />
      </div>

      <aside class="order-first md:order-none">
        <div class="card sticky top-8 space-y-2 p-4">
          <h2 class="h2">Export</h2>
          <p class="text-xs text-stone-500">{{ settings.pageSize === 'A4' ? 'A4' : 'US Letter' }} PDF · prices in {{ settings.currency }}</p>
          <button class="btn-primary w-full" :disabled="busy" @click="make('download')"><Icon name="download" :size="18" /> {{ busy ? 'Making PDF…' : 'Download PDF' }}</button>
          <button v-if="share" class="btn-secondary w-full" :disabled="busy" @click="make('share')"><Icon name="share" :size="18" /> Share PDF…</button>
          <label class="flex items-center gap-2 text-xs text-stone-600"><input v-model="draft.includeOrderForm" type="checkbox" class="size-4 accent-ink" /> Add a printable order form to the PDF</label>
          <div class="border-t border-stone-100 pt-2">
            <button class="btn-secondary w-full" :disabled="busy || !selected.length" @click="orderSheet"><Icon name="table" :size="18" /> Order sheet (.xlsx)</button>
            <p class="mt-1.5 text-xs text-stone-500">Buyers fill in quantities in Excel, Google Sheets or Numbers and send it back. Import it under Orders.</p>
          </div>
          <button class="btn-secondary hidden w-full md:inline-flex" :disabled="busy" @click="make('preview')"><Icon name="eye" :size="18" /> Preview in new tab</button>
          <p v-if="error" class="text-xs text-red-700">{{ error }}</p>
        </div>
      </aside>
    </div>
  </template>
</template>

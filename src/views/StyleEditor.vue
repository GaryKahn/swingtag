<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import NumberField from '../components/NumberField.vue'
import CostLinesEditor from '../components/CostLinesEditor.vue'
import PricingSummary from '../components/PricingSummary.vue'
import PhotoStrip from '../components/PhotoStrip.vue'
import ConfirmButton from '../components/ConfirmButton.vue'
import { db, requestPersist } from '../db/schema'
import type { Style } from '../db/types'
import { useAutosave, useSettings } from '../lib/live'
import { price } from '../lib/pricing'
import { formatMoney } from '../lib/money'
import { deleteStyle, duplicateStyle, templateFromStyle } from '../lib/records'
import { canShareFiles } from '../pdf/common'
import { parseColourways, parseSizes } from '../lib/sizes'

const props = defineProps<{ id: string }>()
const router = useRouter()
const settings = useSettings()
const draft = ref<Style>()
const notFound = ref(false)
const busy = ref('')
const toast = ref('')

watch(() => props.id, async (id) => {
  draft.value = undefined
  const s = await db.styles.get(id)
  if (s) draft.value = { ...s, origin: s.origin ?? '', hsCode: s.hsCode ?? '' }
  else notFound.value = true
}, { immediate: true })

const { flush, cancel } = useAutosave(draft, async (s) => {
  await db.styles.put({ ...s, updatedAt: Date.now() })
  requestPersist()
})

const p = computed(() => (draft.value ? price(draft.value, settings.value) : undefined))
const cur = computed(() => formatMoney(0, settings.value.currency, settings.value.locale).replace(/[\d.,\s]/g, ''))
const share = canShareFiles()

function flash(msg: string) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 2500)
}

async function syncCosts() {
  if (!draft.value) return
  const comps = new Map((await db.components.toArray()).map((c) => [c.id, c]))
  let n = 0
  for (const l of draft.value.lines) {
    const c = l.componentId && comps.get(l.componentId)
    if (c && c.unitCost !== l.unitCost) {
      l.unitCost = c.unitCost
      n++
    }
  }
  flash(n ? `Updated ${n} cost${n > 1 ? 's' : ''} from your library` : 'Costs already match your library')
}

async function pdf() {
  if (!draft.value) return
  flush()
  busy.value = 'pdf'
  try {
    const { costSheetPdf } = await import('../pdf/costSheet')
    await costSheetPdf(draft.value, settings.value, share ? 'share' : 'download')
  } finally {
    busy.value = ''
  }
}
async function dup() {
  flush()
  const id = await duplicateStyle(props.id)
  if (id) router.push(`/styles/${id}`)
}
async function saveTemplate() {
  if (!draft.value) return
  flush()
  await templateFromStyle(draft.value)
  flash('Saved as a template')
}
async function remove() {
  cancel()
  await deleteStyle(props.id)
  draft.value = undefined
  router.replace('/styles')
}
</script>

<template>
  <div v-if="notFound" class="card p-8 text-center">
    <p>This style doesn't exist on this device.</p>
    <RouterLink to="/styles" class="btn-secondary mt-4">Back to styles</RouterLink>
  </div>

  <template v-else-if="draft && p">
    <PageHeader :title="draft.name || 'Untitled style'" help="cost" :subtitle="draft.styleNumber" back="/styles">
      <button class="btn-secondary hidden sm:inline-flex" :disabled="!!busy" @click="pdf"><Icon name="download" :size="18" /> Cost sheet PDF</button>
    </PageHeader>

    <div class="grid gap-6 md:grid-cols-[1fr_18rem]">
      <div class="space-y-6">
        <section>
          <h2 class="label">Photos</h2>
          <PhotoStrip v-model="draft.photoIds" :owner-id="draft.id" />
        </section>

        <section class="card space-y-3 p-4">
          <h2 class="h2">Details</h2>
          <div class="grid grid-cols-[7rem_1fr] gap-3">
            <label><span class="label">Style #</span><input v-model="draft.styleNumber" class="field" /></label>
            <label><span class="label">Name</span><input v-model="draft.name" class="field" /></label>
          </div>
          <label class="block"><span class="label">Collection / season</span><input v-model="draft.collection" class="field" placeholder="e.g. SS27" /></label>
          <label class="block"><span class="label">Fabrication / content</span><input v-model="draft.fabrication" class="field" placeholder="e.g. 100% organic cotton poplin" /></label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label><span class="label">Colourways</span><input v-model="draft.colorways" class="field" placeholder="e.g. Ecru, Navy" /></label>
            <label><span class="label">Sizes</span><input v-model="draft.sizeRange" class="field" placeholder="e.g. XS–XL or 6–14" /></label>
          </div>
          <p class="-mt-1 text-xs text-stone-500">
            On order sheets:
            <span class="font-medium text-stone-700">{{ parseColourways(draft.colorways).filter(Boolean).join(' · ') || 'one colour' }}</span>
            in sizes <span class="font-medium text-stone-700">{{ parseSizes(draft.sizeRange).join(' · ') }}</span>
          </p>
          <div class="grid grid-cols-2 gap-3">
            <label><span class="label">Country of origin</span><input v-model="draft.origin" class="field" placeholder="e.g. South Africa" /></label>
            <label><span class="label">HS / tariff code</span><input v-model="draft.hsCode" class="field" placeholder="Optional, for export" /></label>
          </div>
          <label class="block"><span class="label">Minimum order (MOQ)</span><input v-model="draft.moq" class="field" placeholder="e.g. 6 units per color" /></label>
          <label class="block"><span class="label">Description</span><textarea v-model="draft.description" rows="2" class="field" /></label>
        </section>

        <section class="card p-4">
          <div class="mb-1 flex items-center justify-between">
            <h2 class="h2">Components</h2>
            <button class="btn-ghost px-2 text-xs" @click="syncCosts"><Icon name="refresh" :size="16" /> Use library costs</button>
          </div>
          <p class="mb-2 text-xs text-stone-500">Fabric and trims include {{ draft.wastagePct ?? settings.wastagePct }}% wastage.</p>
          <CostLinesEditor v-model="draft.lines" with-cost :wastage-pct="draft.wastagePct ?? settings.wastagePct" />
        </section>

        <section class="card space-y-3 p-4">
          <h2 class="h2">Labor & overhead</h2>
          <div class="grid grid-cols-2 gap-3">
            <label><span class="label">Labor / CMT</span><NumberField v-model="draft.labor" :prefix="cur" /></label>
            <label><span class="label">Overhead per unit</span><NumberField v-model="draft.overhead" :prefix="cur" /></label>
            <label><span class="label">Freight & duty</span><NumberField v-model="draft.freightDutyPct" suffix="%" /></label>
            <label><span class="label">Wastage</span><NumberField v-model="draft.wastagePct" optional :placeholder="`${settings.wastagePct} (default)`" suffix="%" /></label>
          </div>
        </section>

        <section class="card space-y-3 p-4">
          <h2 class="h2">Pricing</h2>
          <p class="text-xs text-stone-500">Leave blank to use your defaults from Settings.</p>
          <div class="grid grid-cols-2 gap-3">
            <label><span class="label">Target margin</span><NumberField v-model="draft.marginPct" optional :placeholder="`${settings.marginPct} (default)`" suffix="%" /></label>
            <label><span class="label">Retail multiplier</span><NumberField v-model="draft.retailMultiplier" optional :placeholder="`${settings.retailMultiplier} (default)`" suffix="×" /></label>
            <label><span class="label">Set wholesale</span><NumberField v-model="draft.wholesaleOverride" optional :prefix="cur" placeholder="auto" /></label>
            <label><span class="label">Set retail</span><NumberField v-model="draft.retailOverride" optional :prefix="cur" placeholder="auto" /></label>
          </div>
        </section>

        <section class="flex flex-wrap gap-2">
          <button class="btn-secondary" :disabled="!!busy" @click="pdf"><Icon name="download" :size="18" /> {{ busy === 'pdf' ? 'Making PDF…' : 'Cost sheet PDF' }}</button>
          <button class="btn-secondary" @click="dup"><Icon name="copy" :size="18" /> Duplicate</button>
          <button class="btn-secondary" @click="saveTemplate"><Icon name="layers" :size="18" /> Save as template</button>
          <ConfirmButton label="Delete style" @confirm="remove" />
        </section>
      </div>

      <aside class="hidden md:block">
        <div class="sticky top-8"><PricingSummary :p="p" /></div>
      </aside>
    </div>

    <!-- Mobile: always-visible price bar above the tab bar -->
    <div class="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-stone-200 bg-white/95 px-4 py-2 backdrop-blur md:hidden">
      <div class="grid grid-cols-3 text-center text-xs">
        <div><div class="text-stone-500">Cost</div><div class="text-base font-semibold tabular-nums">{{ formatMoney(p.landed, settings.currency, settings.locale) }}</div></div>
        <div><div class="text-stone-500">Wholesale</div><div class="text-base font-semibold tabular-nums" :class="{ 'text-amber-700': p.belowTarget }">{{ formatMoney(p.wholesale, settings.currency, settings.locale) }}</div></div>
        <div><div class="text-stone-500">Retail</div><div class="text-base font-semibold tabular-nums">{{ formatMoney(p.retail, settings.currency, settings.locale) }}</div></div>
      </div>
    </div>
    <div class="mt-6 md:hidden"><PricingSummary :p="p" /></div>
    <div class="h-16 md:hidden" />

    <div v-if="toast" class="fixed inset-x-0 top-4 z-50 mx-auto w-fit rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">{{ toast }}</div>
  </template>
</template>

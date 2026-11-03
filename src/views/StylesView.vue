<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Sheet from '../components/Sheet.vue'
import Icon from '../components/Icon.vue'
import Thumb from '../components/Thumb.vue'
import { db } from '../db/schema'
import type { Style, Template } from '../db/types'
import { useLive, useSettings } from '../lib/live'
import { price } from '../lib/pricing'
import { formatMoney } from '../lib/money'
import { createStyle } from '../lib/records'

const router = useRouter()
const settings = useSettings()
const styles = useLive(() => db.styles.orderBy('updatedAt').reverse().toArray(), [] as Style[])
const templates = useLive(() => db.templates.orderBy('name').toArray(), [] as Template[])
const visibleTemplates = computed(() => templates.value.filter((t) => !t.hidden))
const choosing = ref(false)
const q = ref('')
const money = (n: number) => formatMoney(n, settings.value.currency, settings.value.locale)

const rows = computed(() => {
  const s = q.value.trim().toLowerCase()
  return styles.value
    .filter((x) => !s || `${x.name} ${x.styleNumber} ${x.collection}`.toLowerCase().includes(s))
    .map((x) => ({ s: x, p: price(x, settings.value) }))
})

async function start(t?: Template) {
  choosing.value = false
  router.push(`/styles/${await createStyle(t)}`)
}
</script>

<template>
  <PageHeader title="Styles" subtitle="Every garment you're costing.">
    <button class="btn-primary" @click="choosing = true"><Icon name="plus" :size="18" /> New</button>
  </PageHeader>

  <input v-if="styles.length > 4" v-model="q" class="field mb-4" placeholder="Search styles…" />

  <div v-if="!styles.length" class="card p-8 text-center">
    <p class="font-serif text-xl">Cost your first garment</p>
    <p class="mx-auto mt-2 max-w-sm text-sm text-stone-500">Start from a template like a T-shirt or button-up shirt, then adjust the fabric, trims and labor to match your piece.</p>
    <button class="btn-primary mt-5" @click="choosing = true">Start a style</button>
  </div>

  <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <li v-for="{ s, p } in rows" :key="s.id">
      <RouterLink :to="`/styles/${s.id}`" class="card flex gap-3 p-3 transition hover:border-stone-400">
        <Thumb :id="s.photoIds[0]" class="w-20" />
        <div class="min-w-0 flex-1">
          <div class="text-xs text-stone-500">{{ s.styleNumber }}<span v-if="s.collection"> · {{ s.collection }}</span></div>
          <div class="truncate font-medium">{{ s.name }}</div>
          <dl class="mt-2 grid grid-cols-3 gap-1 text-xs">
            <div><dt class="text-stone-400">Cost</dt><dd class="tabular-nums">{{ money(p.landed) }}</dd></div>
            <div><dt class="text-stone-400">Whsl</dt><dd class="font-medium tabular-nums">{{ money(p.wholesale) }}</dd></div>
            <div><dt class="text-stone-400">Retail</dt><dd class="tabular-nums">{{ money(p.retail) }}</dd></div>
          </dl>
          <div v-if="p.belowTarget" class="mt-1 text-[11px] text-amber-700">Below target margin</div>
        </div>
      </RouterLink>
    </li>
  </ul>

  <Sheet v-if="choosing" title="Start from a template" @close="choosing = false">
    <div class="grid grid-cols-2 gap-2">
      <button v-for="t in visibleTemplates" :key="t.id" class="card px-3 py-4 text-left hover:border-stone-400" @click="start(t)">
        <div class="font-medium">{{ t.name }}</div>
        <div class="text-xs text-stone-500">{{ t.lines.length }} components</div>
      </button>
      <button class="rounded-xl border border-dashed border-stone-300 px-3 py-4 text-left hover:bg-stone-50" @click="start()">
        <div class="font-medium">Blank</div>
        <div class="text-xs text-stone-500">Build from scratch</div>
      </button>
    </div>
  </Sheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Sheet from './Sheet.vue'
import { db } from '../db/schema'
import { CATEGORIES, type Component } from '../db/types'
import { useLive, useSettings } from '../lib/live'
import { formatMoney } from '../lib/money'

const emit = defineEmits<{ pick: [Component | null]; close: [] }>()
const settings = useSettings()
const all = useLive(() => db.components.orderBy('name').toArray(), [] as Component[])
const q = ref('')
const groups = computed(() => {
  const s = q.value.trim().toLowerCase()
  const list = all.value.filter((c) => !c.hidden && (!s || c.name.toLowerCase().includes(s) || c.supplier.toLowerCase().includes(s)))
  return CATEGORIES.map((cat) => ({ ...cat, items: list.filter((c) => c.category === cat.id) })).filter((g) => g.items.length)
})
</script>

<template>
  <Sheet title="Add a component" @close="emit('close')">
    <input v-model="q" class="field mb-3" placeholder="Search components…" autofocus />
    <button class="btn-secondary mb-4 w-full" @click="emit('pick', null)">+ One-off line (not in library)</button>
    <div v-for="g in groups" :key="g.id" class="mb-4">
      <div class="label">{{ g.label }}</div>
      <button v-for="c in g.items" :key="c.id" class="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left hover:bg-stone-50" @click="emit('pick', c)">
        <span>{{ c.name }} <span v-if="c.supplier" class="text-xs text-stone-400">· {{ c.supplier }}</span></span>
        <span class="text-sm tabular-nums text-stone-500">{{ formatMoney(c.unitCost, settings.currency, settings.locale) }}/{{ c.unit }}</span>
      </button>
    </div>
    <p v-if="!groups.length" class="py-6 text-center text-sm text-stone-500">No matches. Add it in Components, or use a one-off line.</p>
  </Sheet>
</template>

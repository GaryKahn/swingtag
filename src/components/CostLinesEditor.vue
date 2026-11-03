<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import NumberField from './NumberField.vue'
import Stepper from './Stepper.vue'
import ComponentPicker from './ComponentPicker.vue'
import { uid } from '../db/schema'
import { CATEGORIES, COUNT_UNITS, UNITS, type Category, type Component, type Unit } from '../db/types'
import { lineCost } from '../lib/pricing'
import { formatMoney } from '../lib/money'
import { useSettings } from '../lib/live'

export interface EditableLine {
  id?: string
  componentId?: string
  name: string
  category: Category
  unit: Unit
  qty: number
  unitCost?: number
}

const lines = defineModel<EditableLine[]>({ required: true })
const props = defineProps<{ withCost?: boolean; wastagePct?: number }>()
const settings = useSettings()
const picking = ref(false)
const money = (n: number) => formatMoney(n, settings.value.currency, settings.value.locale)

function add(c: Component | null) {
  picking.value = false
  const base = c
    ? { componentId: c.id, name: c.name, category: c.category, unit: c.unit, qty: 1 }
    : { name: '', category: 'other' as Category, unit: 'pc' as Unit, qty: 1 }
  lines.value.push(props.withCost ? { id: uid(), ...base, unitCost: c?.unitCost ?? 0 } : base)
}
function move(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= lines.value.length) return
  const [l] = lines.value.splice(i, 1)
  lines.value.splice(j, 0, l)
}
</script>

<template>
  <div>
    <div v-if="!lines.length" class="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">No components yet.</div>
    <ul class="divide-y divide-stone-100">
      <li v-for="(l, i) in lines" :key="l.id ?? i" class="py-3">
        <div class="flex items-center gap-2">
          <input v-model="l.name" class="field flex-1 py-2" placeholder="Component name" :aria-label="`Line ${i + 1} name`" />
          <div class="flex shrink-0">
            <button class="btn-ghost px-1.5" aria-label="Move up" :disabled="i === 0" @click="move(i, -1)"><Icon name="up" :size="18" /></button>
            <button class="btn-ghost px-1.5" aria-label="Move down" :disabled="i === lines.length - 1" @click="move(i, 1)"><Icon name="down" :size="18" /></button>
            <button class="btn-danger px-1.5" aria-label="Remove line" @click="lines.splice(i, 1)"><Icon name="trash" :size="18" /></button>
          </div>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2" :class="withCost ? 'sm:grid-cols-[1fr_1fr_6rem_7rem_6rem]' : 'sm:grid-cols-[1fr_1fr_6rem]'">
          <select v-model="l.category" class="field py-2 text-sm" aria-label="Category">
            <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
          <select v-model="l.unit" class="field py-2 text-sm" aria-label="Unit">
            <option v-for="u in UNITS" :key="u" :value="u">per {{ u }}</option>
          </select>
          <Stepper v-if="COUNT_UNITS.includes(l.unit)" v-model="l.qty" :label="`${l.name || 'line'} quantity`" />
          <label v-else class="block"><span class="sr-only">Quantity</span><NumberField v-model="l.qty" :suffix="l.unit" /></label>
          <template v-if="withCost">
            <label class="block"><span class="sr-only">Unit cost</span><NumberField v-model="l.unitCost" :suffix="`/${l.unit}`" /></label>
            <div class="flex items-center justify-end text-sm font-medium tabular-nums">
              {{ money(lineCost({ qty: l.qty, unitCost: l.unitCost ?? 0, category: l.category }, wastagePct ?? 0)) }}
            </div>
          </template>
        </div>
      </li>
    </ul>
    <button class="btn-secondary mt-3 w-full" @click="picking = true"><Icon name="plus" :size="18" /> Add component</button>
    <ComponentPicker v-if="picking" @pick="add" @close="picking = false" />
  </div>
</template>

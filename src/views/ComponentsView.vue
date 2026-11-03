<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import Sheet from '../components/Sheet.vue'
import NumberField from '../components/NumberField.vue'
import ConfirmButton from '../components/ConfirmButton.vue'
import { db } from '../db/schema'
import { CATEGORIES, UNITS, type Component } from '../db/types'
import { useLive, useSettings } from '../lib/live'
import { formatMoney } from '../lib/money'
import { blankComponent } from '../lib/records'

const settings = useSettings()
const all = useLive(() => db.components.orderBy('name').toArray(), [] as Component[])
const q = ref('')
const editing = ref<Component>()
const isNew = ref(false)
const showHidden = ref(false)

const groups = computed(() => {
  const s = q.value.trim().toLowerCase()
  const list = all.value.filter((c) => (showHidden.value || !c.hidden) && (!s || `${c.name} ${c.supplier}`.toLowerCase().includes(s)))
  return CATEGORIES.map((cat) => ({ ...cat, items: list.filter((c) => c.category === cat.id) })).filter((g) => g.items.length)
})
const hiddenCount = computed(() => all.value.filter((c) => c.hidden).length)

function open(c?: Component) {
  isNew.value = !c
  editing.value = c ? { ...c } : blankComponent()
}
async function save() {
  if (!editing.value) return
  await db.components.put({ ...editing.value, name: editing.value.name.trim() || 'Untitled', updatedAt: Date.now() })
  editing.value = undefined
}
async function remove() {
  if (!editing.value) return
  await db.components.delete(editing.value.id)
  editing.value = undefined
}
</script>

<template>
  <PageHeader title="Components" subtitle="Your library of fabrics, trims, labels and packaging with what you pay for each.">
    <button class="btn-primary" @click="open()"><Icon name="plus" :size="18" /> New</button>
  </PageHeader>

  <input v-model="q" class="field mb-4" placeholder="Search components or suppliers…" />

  <section v-for="g in groups" :key="g.id" class="mb-5">
    <h2 class="label">{{ g.label }}</h2>
    <ul class="card divide-y divide-stone-100">
      <li v-for="c in g.items" :key="c.id">
        <button class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50" :class="{ 'opacity-50': c.hidden }" @click="open(c)">
          <span class="min-w-0">
            <span class="block truncate">{{ c.name }}</span>
            <span v-if="c.supplier" class="block truncate text-xs text-stone-500">{{ c.supplier }}</span>
          </span>
          <span class="shrink-0 tabular-nums text-sm">{{ formatMoney(c.unitCost, settings.currency, settings.locale) }}<span class="text-stone-400">/{{ c.unit }}</span></span>
        </button>
      </li>
    </ul>
  </section>
  <button v-if="hiddenCount" class="btn-ghost text-xs" @click="showHidden = !showHidden">{{ showHidden ? 'Hide' : 'Show' }} {{ hiddenCount }} hidden</button>

  <Sheet v-if="editing" :title="isNew ? 'New component' : 'Edit component'" @close="editing = undefined">
    <form class="space-y-3" @submit.prevent="save">
      <label class="block"><span class="label">Name</span><input v-model="editing.name" class="field" placeholder="e.g. Japanese selvedge denim" /></label>
      <div class="grid grid-cols-2 gap-3">
        <label><span class="label">Category</span>
          <select v-model="editing.category" class="field"><option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option></select>
        </label>
        <label><span class="label">Unit</span>
          <select v-model="editing.unit" class="field"><option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option></select>
        </label>
      </div>
      <label class="block"><span class="label">Cost per {{ editing.unit }} ({{ settings.currency }})</span><NumberField v-model="editing.unitCost" /></label>
      <label class="block"><span class="label">Supplier</span><input v-model="editing.supplier" class="field" /></label>
      <label class="block"><span class="label">Notes</span><textarea v-model="editing.notes" rows="2" class="field" placeholder="Minimums, lead time, width…" /></label>
      <p v-if="!isNew" class="text-xs text-stone-500">Changing a cost here doesn't change existing styles. Use "Use library costs" in a style to update it.</p>
      <div class="flex flex-wrap items-center gap-2 pt-2">
        <button type="submit" class="btn-primary">Save</button>
        <button type="button" class="btn-ghost" @click="editing = undefined">Cancel</button>
        <span class="flex-1" />
        <button v-if="editing.builtIn" type="button" class="btn-ghost" @click="editing.hidden = !editing.hidden; save()">{{ editing.hidden ? 'Unhide' : 'Hide' }}</button>
        <ConfirmButton v-else-if="!isNew" label="Delete" @confirm="remove" />
      </div>
    </form>
  </Sheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { CATEGORIES } from '../db/types'
import type { PriceBreakdown } from '../lib/pricing'
import { formatMoney, pct } from '../lib/money'
import { useSettings } from '../lib/live'

const props = defineProps<{ p: PriceBreakdown; compact?: boolean }>()
const settings = useSettings()
const money = (n: number) => formatMoney(n, settings.value.currency, settings.value.locale)
const tiles = computed(() => [
  { label: 'Cost', value: props.p.landed },
  { label: 'Wholesale', value: props.p.wholesale },
  { label: 'Retail', value: props.p.retail },
])
const cats = computed(() => CATEGORIES.filter((c) => c.id !== 'labor' && props.p.byCategory[c.id] > 0))
</script>

<template>
  <div class="card @container p-4">
    <!-- three columns when there's room; label/value rows in a narrow sidebar -->
    <div class="grid gap-1 @[20rem]:grid-cols-3 @[20rem]:gap-2 @[20rem]:text-center">
      <div v-for="t in tiles" :key="t.label" class="flex items-baseline justify-between @[20rem]:block">
        <div class="label">{{ t.label }}</div>
        <div class="text-lg font-semibold whitespace-nowrap tabular-nums">{{ money(t.value) }}</div>
      </div>
    </div>
    <div v-if="p.belowTarget" class="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <Icon name="warn" :size="16" /> Wholesale margin is {{ pct(p.actualMarginPct) }}, below your {{ pct(p.marginPct) }} target.
    </div>
    <dl v-if="!compact" class="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-sm">
      <div v-for="c in cats" :key="c.id" class="flex justify-between text-stone-600"><dt>{{ c.label }}</dt><dd class="tabular-nums">{{ money(p.byCategory[c.id]) }}</dd></div>
      <div class="flex justify-between text-stone-600"><dt>Labor</dt><dd class="tabular-nums">{{ money(p.labor) }}</dd></div>
      <div v-if="p.overhead" class="flex justify-between text-stone-600"><dt>Overhead</dt><dd class="tabular-nums">{{ money(p.overhead) }}</dd></div>
      <div v-if="p.freightDuty" class="flex justify-between text-stone-600"><dt>Freight & duty</dt><dd class="tabular-nums">{{ money(p.freightDuty) }}</dd></div>
      <div class="flex justify-between border-t border-stone-100 pt-1.5 font-medium"><dt>Landed cost</dt><dd class="tabular-nums">{{ money(p.landed) }}</dd></div>
      <div class="flex justify-between text-stone-600"><dt>Your margin (wholesale)</dt><dd class="tabular-nums">{{ pct(p.actualMarginPct) }} · {{ p.markup.toFixed(2) }}×</dd></div>
      <div class="flex justify-between text-stone-600"><dt>Store's margin (retail)</dt><dd class="tabular-nums">{{ pct(p.retailerMarginPct) }}</dd></div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { db } from '../db/schema'
import type { Order } from '../db/types'
import { useLive, useSettings } from '../lib/live'
import { formatMoney } from '../lib/money'
import { createOrder, orderTotals } from '../lib/orders'

const router = useRouter()
const settings = useSettings()
const orders = useLive(() => db.orders.orderBy('updatedAt').reverse().toArray(), [] as Order[])
const importing = ref(false)
const error = ref('')

const STATUS: Record<Order['status'], string> = { draft: 'Draft', confirmed: 'Confirmed', invoiced: 'Invoiced', paid: 'Paid' }
const statusClass: Record<Order['status'], string> = { draft: 'bg-stone-100 text-stone-600', confirmed: 'bg-sky-50 text-sky-800', invoiced: 'bg-amber-50 text-amber-800', paid: 'bg-emerald-50 text-emerald-800' }

async function create() {
  router.push(`/orders/${await createOrder()}`)
}

async function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f) return
  importing.value = true
  error.value = ''
  try {
    const { readOrderSheet } = await import('../lib/orderSheet')
    const imported = await readOrderSheet(await f.arrayBuffer())
    if (!imported.lines.some((l) => Object.values(l.qty).some((q) => q > 0))) throw new Error('That order sheet has no quantities filled in yet.')
    const lines = imported.lines.filter((l) => Object.values(l.qty).some((q) => q > 0))
    router.push(`/orders/${await createOrder({ ...imported, lines, status: 'confirmed' })}`)
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <PageHeader title="Orders" help="orders" subtitle="Record what stores order, then send an invoice.">
    <button class="btn-primary" @click="create"><Icon name="plus" :size="18" /> New</button>
  </PageHeader>

  <div class="mb-5 flex flex-wrap items-center gap-2">
    <label class="btn-secondary cursor-pointer"><Icon name="upload" :size="18" /> {{ importing ? 'Reading…' : 'Import filled-in order sheet' }}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr-only" @change="onImport" /></label>
    <span class="text-xs text-stone-500">The .xlsx a buyer returns from a line sheet</span>
  </div>
  <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>

  <div v-if="!orders.length" class="card p-8 text-center">
    <p class="font-serif text-xl">No orders yet</p>
    <p class="mx-auto mt-2 max-w-sm text-sm text-stone-500">Add a store's order by tapping in quantities per size, or import the order sheet they filled in. Then download an invoice with your bank details.</p>
    <button class="btn-primary mt-5" @click="create">Start an order</button>
  </div>

  <ul class="grid gap-2 sm:grid-cols-2">
    <li v-for="o in orders" :key="o.id">
      <RouterLink :to="`/orders/${o.id}`" class="card block p-4 hover:border-stone-400">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-stone-500">{{ o.number }}<span v-if="o.date"> · {{ o.date }}</span></span>
          <span class="chip" :class="statusClass[o.status]">{{ STATUS[o.status] }}</span>
        </div>
        <div class="mt-1 truncate font-medium">{{ o.store.name || 'Unnamed store' }}</div>
        <div class="mt-1 text-sm tabular-nums text-stone-600">{{ orderTotals(o).qty }} units · {{ formatMoney(orderTotals(o).total, o.currency, settings.locale) }}</div>
      </RouterLink>
    </li>
  </ul>
</template>

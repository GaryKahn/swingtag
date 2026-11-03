<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import NumberField from '../components/NumberField.vue'
import Stepper from '../components/Stepper.vue'
import Sheet from '../components/Sheet.vue'
import Thumb from '../components/Thumb.vue'
import ConfirmButton from '../components/ConfirmButton.vue'
import { db } from '../db/schema'
import type { Address, LineSheet, Order, OrderStatus, Style } from '../db/types'
import { useAutosave, useLive, useSettings } from '../lib/live'
import { formatMoney, pct } from '../lib/money'
import { lineQty, linesForStyle, orderTotals, recentCustomers } from '../lib/orders'
import { canShareFiles } from '../pdf/common'
import type { InvoiceKind } from '../pdf/invoice'

const props = defineProps<{ id: string }>()
const router = useRouter()
const settings = useSettings()
const draft = ref<Order>()
const styles = useLive(() => db.styles.orderBy('styleNumber').toArray(), [] as Style[])
const lineSheets = useLive(() => db.lineSheets.orderBy('updatedAt').reverse().toArray(), [] as LineSheet[])
const customers = ref<Awaited<ReturnType<typeof recentCustomers>>>([])
const picking = ref(false)
const picked = ref<string[]>([])
const busy = ref('')
const error = ref('')
const share = canShareFiles()

watch(() => props.id, async (id) => {
  draft.value = undefined
  draft.value = await db.orders.get(id)
  customers.value = (await recentCustomers()).filter((c) => c.store.name !== draft.value?.store.name)
}, { immediate: true })
const { flush, cancel } = useAutosave(draft, (o) => db.orders.put({ ...o, updatedAt: Date.now() }))

const totals = computed(() => (draft.value ? orderTotals(draft.value) : undefined))
const money = (n: number) => formatMoney(n, draft.value?.currency ?? settings.value.currency, settings.value.locale)
const statuses: { id: OrderStatus; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'invoiced', label: 'Invoiced' },
  { id: 'paid', label: 'Paid' },
]
const missingBank = computed(() => !settings.value.brand.bank.accountNumber)
const addressFields: { key: keyof Address; label: string; type?: string; textarea?: boolean }[] = [
  { key: 'name', label: 'Store / company' },
  { key: 'contact', label: 'Contact person' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'address', label: 'Address', textarea: true },
]

function useCustomer(c: (typeof customers.value)[number]) {
  if (!draft.value) return
  draft.value.store = { ...c.store }
  draft.value.delivery = { ...c.delivery }
  draft.value.deliverySameAsStore = c.deliverySameAsStore
}

function openPicker() {
  picked.value = []
  picking.value = true
}
function pickSheet(ls: LineSheet) {
  picked.value = [...new Set([...picked.value, ...ls.styleIds])]
}
function addPicked() {
  if (!draft.value) return
  const have = new Set(draft.value.lines.map((l) => `${l.styleId}|${l.colour}`))
  for (const id of picked.value) {
    const s = styles.value.find((x) => x.id === id)
    if (!s) continue
    for (const l of linesForStyle(s, settings.value)) if (!have.has(`${l.styleId}|${l.colour}`)) draft.value.lines.push(l)
  }
  picking.value = false
}

async function invoice(kind: InvoiceKind, prefer: 'share' | 'download' | 'preview' = share ? 'share' : 'download') {
  if (!draft.value) return
  const win = prefer === 'preview' ? window.open('', '_blank') : undefined
  flush()
  busy.value = kind
  error.value = ''
  try {
    const { invoicePdf } = await import('../pdf/invoice')
    await invoicePdf(draft.value, settings.value, kind, prefer, win)
    if (kind === 'invoice' && draft.value.status !== 'paid') draft.value.status = 'invoiced'
  } catch (e) {
    win?.close()
    console.error(e)
    error.value = 'Something went wrong making the PDF.'
  } finally {
    busy.value = ''
  }
}

async function orderSheet() {
  if (!draft.value) return
  flush()
  busy.value = 'xlsx'
  try {
    const [{ buildOrderSheet }, { croppedPhoto }, { deliverFile }] = await Promise.all([import('../lib/orderSheet'), import('../pdf/common'), import('../lib/files')])
    const o = draft.value
    const blob = await buildOrderSheet(
      { title: `Order ${o.number}`, season: '', lines: o.lines, store: o.store, delivery: o.deliverySameAsStore ? undefined : o.delivery, poNumber: o.poNumber },
      settings.value,
      (id) => croppedPhoto(id, 3 / 4, 300, 'thumb').then((u) => u?.split(',')[1]),
    )
    await deliverFile(blob, `${o.number}-order-sheet.xlsx`, share)
  } finally {
    busy.value = ''
  }
}

async function remove() {
  cancel()
  await db.orders.delete(props.id)
  router.replace('/orders')
}
</script>

<template>
  <template v-if="draft && totals">
    <PageHeader :title="draft.store.name || 'New order'" help="orders" :subtitle="draft.number" back="/orders">
      <select v-model="draft.status" class="field w-auto py-2 text-sm" aria-label="Status">
        <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
    </PageHeader>

    <div class="grid gap-6 md:grid-cols-[1fr_18rem]">
      <div class="space-y-5">
        <section class="card space-y-3 p-4">
          <div class="flex items-center justify-between">
            <h2 class="h2">Store</h2>
            <select v-if="customers.length" class="field w-auto py-1.5 text-sm" aria-label="Use a previous customer" @change="useCustomer(customers[+($event.target as HTMLSelectElement).value]); ($event.target as HTMLSelectElement).value = ''">
              <option value="">Previous customers…</option>
              <option v-for="(c, i) in customers" :key="i" :value="i">{{ c.store.name }}</option>
            </select>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label v-for="f in addressFields" :key="f.key" :class="{ 'sm:col-span-2': f.textarea }">
              <span class="label">{{ f.label }}</span>
              <textarea v-if="f.textarea" v-model="draft.store[f.key]" rows="3" class="field" />
              <input v-else v-model="draft.store[f.key]" :type="f.type ?? 'text'" class="field" />
            </label>
          </div>
          <label class="flex items-center gap-2 text-sm"><input v-model="draft.deliverySameAsStore" type="checkbox" class="size-4 accent-ink" /> Deliver to the same address</label>
          <div v-if="!draft.deliverySameAsStore" class="grid gap-3 border-t border-stone-100 pt-3 sm:grid-cols-2">
            <h3 class="label sm:col-span-2">Delivery</h3>
            <label v-for="f in addressFields" :key="f.key" :class="{ 'sm:col-span-2': f.textarea }">
              <span class="label">{{ f.label }}</span>
              <textarea v-if="f.textarea" v-model="draft.delivery[f.key]" rows="3" class="field" />
              <input v-else v-model="draft.delivery[f.key]" :type="f.type ?? 'text'" class="field" />
            </label>
          </div>
        </section>

        <section>
          <div class="mb-2 flex items-center justify-between">
            <h2 class="h2">Items</h2>
            <button class="btn-secondary py-2" @click="openPicker"><Icon name="plus" :size="18" /> Add styles</button>
          </div>
          <p v-if="!draft.lines.length" class="card p-6 text-center text-sm text-stone-500">Add the styles the store is ordering. Each colour gets its own row of sizes.</p>
          <ul class="space-y-3">
            <li v-for="(l, i) in draft.lines" :key="l.id" class="card p-3">
              <div class="flex items-start gap-3">
                <Thumb :id="l.photoId" class="w-12" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium">{{ l.styleNumber }} · {{ l.name }}</div>
                  <input v-model="l.colour" class="field mt-1 py-1.5 text-sm" placeholder="Colour" aria-label="Colour" />
                </div>
                <button class="btn-danger px-1.5" aria-label="Remove item" @click="draft.lines.splice(i, 1)"><Icon name="trash" :size="18" /></button>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <label v-for="s in l.sizes" :key="s" class="block">
                  <span class="label text-center">{{ s }}</span>
                  <Stepper v-model="l.qty[s]" compact :label="`${l.colour} ${s}`" />
                </label>
              </div>
              <div class="mt-3 flex items-end justify-between gap-3 border-t border-stone-100 pt-3">
                <label class="w-36"><span class="label">Unit price</span><NumberField v-model="l.unitPrice" /></label>
                <div class="text-right text-sm">
                  <div class="text-stone-500">{{ lineQty(l) }} × {{ money(l.unitPrice) }}</div>
                  <div class="font-semibold tabular-nums">{{ money(lineQty(l) * l.unitPrice) }}</div>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <section class="card space-y-3 p-4">
          <h2 class="h2">Terms</h2>
          <div class="grid grid-cols-2 gap-3">
            <label><span class="label">Order date</span><input v-model="draft.date" type="date" class="field" /></label>
            <label><span class="label">Customer PO</span><input v-model="draft.poNumber" class="field" /></label>
            <label><span class="label">Dispatch date</span><input v-model="draft.dispatchDate" type="date" class="field" /></label>
            <label><span class="label">Payment due</span><input v-model="draft.dueDate" type="date" class="field" /></label>
            <label><span class="label">Deposit</span><NumberField v-model="draft.depositPct" suffix="%" /></label>
            <label><span class="label">VAT</span><NumberField v-model="draft.vatPct" suffix="%" /></label>
          </div>
          <label class="block"><span class="label">Payment terms</span><input v-model="draft.paymentTerms" class="field" /></label>
          <label class="block"><span class="label">Shipping terms</span><input v-model="draft.shippingTerms" class="field" placeholder="e.g. Courier, buyer pays shipping" /></label>
          <label class="block"><span class="label">Notes on invoice</span><textarea v-model="draft.notes" rows="2" class="field" /></label>
        </section>

        <ConfirmButton label="Delete order" @confirm="remove" />
      </div>

      <aside class="order-first md:order-none">
        <div class="card sticky top-8 space-y-3 p-4">
          <dl class="space-y-1 text-sm">
            <div class="flex justify-between"><dt class="text-stone-500">Units</dt><dd class="tabular-nums">{{ totals.qty }}</dd></div>
            <div class="flex justify-between"><dt class="text-stone-500">Goods</dt><dd class="tabular-nums">{{ money(totals.goods) }}</dd></div>
            <div v-if="draft.vatPct" class="flex justify-between"><dt class="text-stone-500">VAT {{ pct(draft.vatPct) }}</dt><dd class="tabular-nums">{{ money(totals.vat) }}</dd></div>
            <div class="flex justify-between border-t border-stone-100 pt-1 text-base font-semibold"><dt>Total</dt><dd class="tabular-nums">{{ money(totals.total) }}</dd></div>
            <div v-if="draft.depositPct" class="flex justify-between text-stone-600"><dt>Deposit {{ pct(draft.depositPct) }}</dt><dd class="tabular-nums">{{ money(totals.deposit) }}</dd></div>
          </dl>
          <div v-if="missingBank" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Add your bank details in <RouterLink to="/settings" class="underline">Settings</RouterLink> so they print on the invoice.
          </div>
          <button class="btn-primary w-full" :disabled="!!busy || !totals.qty" @click="invoice('invoice')"><Icon name="download" :size="18" /> {{ busy === 'invoice' ? 'Making PDF…' : 'Invoice PDF' }}</button>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn-secondary px-2 text-xs" :disabled="!!busy || !totals.qty" @click="invoice('proforma')">Pro forma</button>
            <button class="btn-secondary px-2 text-xs" :disabled="!!busy || !totals.qty" @click="invoice('confirmation')">Confirmation</button>
          </div>
          <button class="btn-secondary w-full" :disabled="!!busy || !draft.lines.length" @click="orderSheet"><Icon name="table" :size="18" /> {{ busy === 'xlsx' ? 'Making sheet…' : 'Order sheet (.xlsx)' }}</button>
          <button class="btn-ghost hidden w-full md:inline-flex" :disabled="!!busy || !totals.qty" @click="invoice('invoice', 'preview')"><Icon name="eye" :size="18" /> Preview invoice</button>
          <p v-if="error" class="text-xs text-red-700">{{ error }}</p>
        </div>
      </aside>
    </div>

    <Sheet v-if="picking" title="Add styles to order" @close="picking = false">
      <div v-if="lineSheets.length" class="mb-4">
        <div class="label">Everything on a line sheet</div>
        <div class="flex flex-wrap gap-2">
          <button v-for="ls in lineSheets" :key="ls.id" class="btn-secondary py-1.5 text-xs" @click="pickSheet(ls)">{{ ls.title }}<span v-if="ls.season" class="text-stone-500"> · {{ ls.season }}</span></button>
        </div>
      </div>
      <div class="label">Styles</div>
      <p v-if="!styles.length" class="py-4 text-sm text-stone-500">No styles yet. Create some under Styles first.</p>
      <ul class="divide-y divide-stone-100">
        <li v-for="s in styles" :key="s.id">
          <label class="flex cursor-pointer items-center gap-3 py-2">
            <input v-model="picked" type="checkbox" :value="s.id" class="size-4 accent-ink" />
            <Thumb :id="s.photoIds[0]" class="w-9" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm">{{ s.styleNumber }} · {{ s.name }}</span>
              <span class="block truncate text-xs text-stone-500">{{ s.colorways || 'No colours set' }} · {{ s.sizeRange || 'One size' }}</span>
            </span>
          </label>
        </li>
      </ul>
      <button class="btn-primary sticky bottom-0 mt-3 w-full" :disabled="!picked.length" @click="addPicked">Add {{ picked.length || '' }} style{{ picked.length === 1 ? '' : 's' }}</button>
    </Sheet>
  </template>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { db } from '../db/schema'
import type { LineSheet } from '../db/types'
import { useLive } from '../lib/live'
import { createLineSheet } from '../lib/records'

const router = useRouter()
const sheets = useLive(() => db.lineSheets.orderBy('updatedAt').reverse().toArray(), [] as LineSheet[])

async function create() {
  const ids = (await db.styles.orderBy('updatedAt').toArray()).map((s) => s.id)
  router.push(`/linesheets/${await createLineSheet(ids)}`)
}
</script>

<template>
  <PageHeader title="Line sheets" help="linesheet" subtitle="The PDF you send to stores: your styles with wholesale prices and order terms.">
    <button class="btn-primary" @click="create"><Icon name="plus" :size="18" /> New</button>
  </PageHeader>

  <div v-if="!sheets.length" class="card p-8 text-center">
    <p class="font-serif text-xl">No line sheets yet</p>
    <p class="mx-auto mt-2 max-w-sm text-sm text-stone-500">Pick which styles to show, add your order terms, and download a PDF to send to buyers.</p>
    <button class="btn-primary mt-5" @click="create">Make a line sheet</button>
  </div>

  <ul class="grid gap-2 sm:grid-cols-2">
    <li v-for="s in sheets" :key="s.id">
      <RouterLink :to="`/linesheets/${s.id}`" class="card block p-4 hover:border-stone-400">
        <div class="font-medium">{{ s.title }}<span v-if="s.season" class="text-stone-500"> — {{ s.season }}</span></div>
        <div class="mt-1 text-xs text-stone-500">{{ s.styleIds.length }} style{{ s.styleIds.length === 1 ? '' : 's' }} · updated {{ new Date(s.updatedAt).toLocaleDateString() }}</div>
      </RouterLink>
    </li>
  </ul>
</template>

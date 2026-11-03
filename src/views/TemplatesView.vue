<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import { db } from '../db/schema'
import type { Template } from '../db/types'
import { useLive } from '../lib/live'
import { createTemplate } from '../lib/records'

const router = useRouter()
const templates = useLive(() => db.templates.orderBy('name').toArray(), [] as Template[])
const showHidden = ref(false)
const custom = computed(() => templates.value.filter((t) => !t.builtIn))
const builtIn = computed(() => templates.value.filter((t) => t.builtIn && (showHidden.value || !t.hidden)))
const hiddenCount = computed(() => templates.value.filter((t) => t.hidden).length)

async function create() {
  router.push(`/templates/${await createTemplate()}`)
}
</script>

<template>
  <PageHeader title="Templates" help="library" subtitle="Starting points for each garment type.">
    <button class="btn-primary" @click="create"><Icon name="plus" :size="18" /> New</button>
  </PageHeader>

  <section v-if="custom.length" class="mb-6">
    <h2 class="label">Your templates</h2>
    <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="t in custom" :key="t.id">
        <RouterLink :to="`/templates/${t.id}`" class="card block p-4 hover:border-stone-400">
          <div class="font-medium">{{ t.name }}</div>
          <div class="mt-1 truncate text-xs text-stone-500">{{ t.lines.map((l) => l.name).join(', ') || 'No components' }}</div>
        </RouterLink>
      </li>
    </ul>
  </section>

  <section>
    <h2 class="label">Built-in</h2>
    <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="t in builtIn" :key="t.id">
        <RouterLink :to="`/templates/${t.id}`" class="card block p-4 hover:border-stone-400" :class="{ 'opacity-50': t.hidden }">
          <div class="flex items-center justify-between font-medium">{{ t.name }}<span v-if="t.hidden" class="chip">Hidden</span></div>
          <div class="mt-1 truncate text-xs text-stone-500">{{ t.lines.map((l) => l.name).join(', ') }}</div>
        </RouterLink>
      </li>
    </ul>
    <button v-if="hiddenCount" class="btn-ghost mt-2 text-xs" @click="showHidden = !showHidden">{{ showHidden ? 'Hide' : 'Show' }} {{ hiddenCount }} hidden</button>
  </section>
</template>

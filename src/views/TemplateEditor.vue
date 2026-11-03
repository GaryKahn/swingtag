<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import NumberField from '../components/NumberField.vue'
import CostLinesEditor from '../components/CostLinesEditor.vue'
import ConfirmButton from '../components/ConfirmButton.vue'
import { db } from '../db/schema'
import type { Template } from '../db/types'
import { useAutosave } from '../lib/live'
import { createStyle, createTemplate } from '../lib/records'

const props = defineProps<{ id: string }>()
const router = useRouter()
const draft = ref<Template>()

watch(() => props.id, async (id) => {
  draft.value = undefined
  draft.value = await db.templates.get(id)
}, { immediate: true })

const { flush, cancel } = useAutosave(draft, (t) => db.templates.put({ ...t, updatedAt: Date.now() }))

async function dup() {
  flush()
  router.push(`/templates/${await createTemplate(draft.value)}`)
}
async function use() {
  flush()
  router.push(`/styles/${await createStyle(draft.value)}`)
}
async function remove() {
  cancel()
  await db.templates.delete(props.id)
  router.replace('/templates')
}
</script>

<template>
  <template v-if="draft">
    <PageHeader :title="draft.name || 'Untitled template'" :subtitle="draft.builtIn ? 'Built-in template' : 'Your template'" back="/templates" />

    <div class="max-w-2xl space-y-5">
      <section class="card space-y-3 p-4">
        <label class="block"><span class="label">Name</span><input v-model="draft.name" class="field" /></label>
        <label class="block"><span class="label">Default labor / CMT</span><NumberField v-model="draft.labor" /></label>
      </section>

      <section class="card p-4">
        <h2 class="h2 mb-1">Components</h2>
        <p class="mb-2 text-xs text-stone-500">Quantities per garment. Unit costs come from your component library when you start a style.</p>
        <CostLinesEditor v-model="draft.lines" />
      </section>

      <section class="flex flex-wrap gap-2">
        <button class="btn-primary" @click="use"><Icon name="plus" :size="18" /> New style from this</button>
        <button class="btn-secondary" @click="dup"><Icon name="copy" :size="18" /> Duplicate</button>
        <button v-if="draft.builtIn" class="btn-ghost" @click="draft.hidden = !draft.hidden"><Icon :name="draft.hidden ? 'eye' : 'eyeoff'" :size="18" /> {{ draft.hidden ? 'Show in picker' : 'Hide from picker' }}</button>
        <ConfirmButton v-else label="Delete template" @confirm="remove" />
      </section>
    </div>
  </template>
</template>

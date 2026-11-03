<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import { db, requestPersist } from '../db/schema'
import { forgetPhotoUrls, photoUrl, savePhoto } from '../lib/images'

const ids = defineModel<string[]>({ required: true })
const props = defineProps<{ ownerId: string; max?: number }>()
const urls = ref<Record<string, string>>({})
const busy = ref(false)
const error = ref('')

watch(ids, async (list) => {
  for (const id of list) if (!urls.value[id]) {
    const u = await photoUrl(id)
    if (u) urls.value = { ...urls.value, [id]: u }
  }
}, { immediate: true, deep: true })

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  busy.value = true
  error.value = ''
  try {
    for (const f of files.slice(0, (props.max ?? 12) - ids.value.length)) ids.value.push(await savePhoto(f, props.ownerId))
    requestPersist()
  } catch {
    error.value = "Couldn't read that image. Try a JPEG or PNG."
  } finally {
    busy.value = false
  }
}

async function remove(i: number) {
  const [id] = ids.value.splice(i, 1)
  forgetPhotoUrls(id)
  await db.photos.delete(id)
}
function move(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= ids.value.length) return
  const [x] = ids.value.splice(i, 1)
  ids.value.splice(j, 0, x)
}
</script>

<template>
  <div>
    <div class="flex gap-3 overflow-x-auto pb-1">
      <figure v-for="(id, i) in ids" :key="id" class="relative w-28 shrink-0">
        <img v-if="urls[id]" :src="urls[id]" alt="" class="aspect-[3/4] w-28 rounded-lg border border-stone-200 object-cover" />
        <div v-else class="aspect-[3/4] w-28 rounded-lg bg-stone-100" />
        <span v-if="i === 0" class="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-white">Main</span>
        <div class="mt-1 flex justify-between">
          <button class="btn-ghost px-1.5 py-1" aria-label="Move left" :disabled="i === 0" @click="move(i, -1)"><Icon name="left" :size="16" /></button>
          <button class="btn-danger px-1.5 py-1" aria-label="Delete photo" @click="remove(i)"><Icon name="trash" :size="16" /></button>
          <button class="btn-ghost px-1.5 py-1" aria-label="Move right" :disabled="i === ids.length - 1" @click="move(i, 1)"><Icon name="right" :size="16" /></button>
        </div>
      </figure>
      <label class="flex aspect-[3/4] w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 text-xs text-stone-500 hover:bg-stone-50">
        <Icon name="camera" :size="22" />
        <span>{{ busy ? 'Saving…' : 'Add photos' }}</span>
        <input type="file" accept="image/*" multiple class="sr-only" :disabled="busy" @change="onFiles" />
      </label>
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-700">{{ error }}</p>
  </div>
</template>

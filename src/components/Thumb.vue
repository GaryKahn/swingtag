<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import { photoUrl } from '../lib/images'

const props = defineProps<{ id?: string; kind?: 'thumb' | 'blob' }>()
const url = ref<string>()
watch(() => props.id, async (id) => (url.value = id ? await photoUrl(id, props.kind) : undefined), { immediate: true })
</script>

<template>
  <div class="aspect-[3/4] shrink-0 overflow-hidden rounded-lg bg-stone-100">
    <img v-if="url" :src="url" alt="" class="h-full w-full object-cover" />
    <div v-else class="flex h-full items-center justify-center text-stone-300"><Icon name="shirt" :size="28" /></div>
  </div>
</template>

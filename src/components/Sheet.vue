<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close')
onMounted(() => {
  addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" @click.self="emit('close')">
      <div class="flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl md:max-w-lg md:rounded-2xl" role="dialog" :aria-label="title">
        <div class="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h2 class="h2">{{ title }}</h2>
          <button class="btn-ghost -mr-2 px-2" aria-label="Close" @click="emit('close')"><Icon name="x" /></button>
        </div>
        <div class="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><slot /></div>
      </div>
    </div>
  </Teleport>
</template>

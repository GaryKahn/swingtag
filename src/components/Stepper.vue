<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from './Icon.vue'

const props = withDefaults(defineProps<{ modelValue: number | undefined; min?: number; step?: number; compact?: boolean; label?: string }>(), { min: 0, step: 1 })
const emit = defineEmits<{ 'update:modelValue': [number] }>()

const text = ref(String(props.modelValue ?? 0))
watch(() => props.modelValue, (v) => {
  if (Number(text.value) !== v) text.value = String(v ?? 0)
})
const set = (n: number) => {
  const v = Math.max(props.min, Math.round(n * 1000) / 1000)
  text.value = String(v)
  emit('update:modelValue', v)
}
function onInput(e: Event) {
  text.value = (e.target as HTMLInputElement).value
  const n = parseFloat(text.value.replace(',', '.'))
  if (!Number.isNaN(n)) emit('update:modelValue', Math.max(props.min, n))
}
</script>

<template>
  <div class="flex items-stretch overflow-hidden rounded-lg border border-stone-300 bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10" :class="compact ? 'h-9' : 'h-[2.875rem]'">
    <button type="button" class="flex shrink-0 items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30" :class="compact ? 'w-8' : 'w-11'" :disabled="(modelValue ?? 0) <= min" :aria-label="`Decrease ${label ?? ''}`" @click="set((modelValue ?? 0) - step)">
      <Icon name="minus" :size="compact ? 16 : 18" />
    </button>
    <input :value="text" type="text" inputmode="numeric" class="w-full min-w-0 border-x border-stone-200 bg-transparent text-center tabular-nums outline-none" :aria-label="label" @input="onInput" @focus="($event.target as HTMLInputElement).select()" @blur="text = String(modelValue ?? 0)" />
    <button type="button" class="flex shrink-0 items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200" :class="compact ? 'w-8' : 'w-11'" :aria-label="`Increase ${label ?? ''}`" @click="set((modelValue ?? 0) + step)">
      <Icon name="plus" :size="compact ? 16 : 18" />
    </button>
  </div>
</template>

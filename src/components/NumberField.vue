<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: number | undefined; placeholder?: string; suffix?: string; prefix?: string; optional?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [number | undefined] }>()

// Keep the typed text locally so partial input like "1." isn't clobbered.
const fmt = (n: number | undefined) => (n === undefined || n === null || Number.isNaN(n) ? '' : String(n))
const text = ref(fmt(props.modelValue))
watch(() => props.modelValue, (v) => {
  if (parseFloat(text.value.replace(',', '.')) !== v) text.value = fmt(v)
})

function onInput(e: Event) {
  text.value = (e.target as HTMLInputElement).value
  const n = parseFloat(text.value.replace(',', '.'))
  if (text.value.trim() === '') emit('update:modelValue', props.optional ? undefined : 0)
  else if (!Number.isNaN(n)) emit('update:modelValue', n)
}
</script>

<template>
  <div class="relative">
    <span v-if="prefix" class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">{{ prefix }}</span>
    <input :value="text" type="text" inputmode="decimal" :placeholder="placeholder" class="field tabular-nums" :class="{ 'pl-7': prefix, 'pr-10': suffix }" @input="onInput" @focus="($event.target as HTMLInputElement).select()" />
    <span v-if="suffix" class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-stone-400">{{ suffix }}</span>
  </div>
</template>
